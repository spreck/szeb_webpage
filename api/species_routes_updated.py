import os
import json
import jsonschema
import time
from filelock import FileLock
from flask import Blueprint, jsonify, request, current_app, abort

# Create Blueprint
species_bp = Blueprint('species_api', __name__, url_prefix='/api')

# Configuration constants
SPECIES_CONFIG_FILE = os.path.join('static', 'js', 'config', 'species_config.js')

# JSON Schema for species validation
SPECIES_SCHEMA = {
    "type": "object",
    "required": ["displayName", "scientificName", "vectorLayer", "rasterLayer", "enabled", "attributes"],
    "properties": {
        "id": {"type": "string"},
        "displayName": {"type": "string"},
        "scientificName": {"type": "string"},
        "vectorLayer": {"type": "string"},
        "rasterLayer": {"type": "string"},
        "backgroundImage": {"type": ["string", "null"]},
        "enabled": {"type": "boolean"},
        "attributes": {
            "type": "object",
            "additionalProperties": {
                "type": "object",
                "required": ["label", "items"],
                "properties": {
                    "label": {"type": "string"},
                    "items": {
                        "type": "object",
                        "additionalProperties": {"type": "string"}
                    }
                }
            }
        }
    }
}

def get_species_config_path():
    """
    Gets the path to the species configuration file.
    Takes into account test environment if configured.
    """
    config_dir = current_app.config.get('SPECIES_CONFIG_DIR', None)
    if config_dir:
        return os.path.join(config_dir, 'species_config.js')
    else:
        return os.path.join(current_app.root_path, SPECIES_CONFIG_FILE)

def get_species_config():
    """
    Reads the species configuration from the JavaScript file
    and converts it to a Python dictionary.
    """
    config_path = get_species_config_path()
    
    try:
        with open(config_path, 'r') as f:
            content = f.read()
        
        # Extract the JSON-like object from the JavaScript file
        start_idx = content.find('const speciesConfig = {')
        end_idx = content.find('};', start_idx)
        if start_idx == -1 or end_idx == -1:
            return {}
            
        json_str = content[start_idx + len('const speciesConfig = '): end_idx + 1]
        
        # Convert to valid JSON by replacing any JavaScript-specific syntax
        json_str = json_str.replace("'", '"')  # Replace single quotes with double quotes
        
        # Handle null values
        json_str = json_str.replace('null', 'null')
        
        return json.loads(json_str)
    except Exception as e:
        current_app.logger.error(f"Error reading species config: {str(e)}")
        return {}

def save_species_config(config):
    """
    Writes the species configuration back to the JavaScript file.
    Uses cross-platform file locking to prevent race conditions.
    """
    config_path = get_species_config_path()
    lock_path = f"{config_path}.lock"
    
    try:
        # Use FileLock for cross-platform locking
        with FileLock(lock_path, timeout=5):
            # We have the lock, now write the config
            # Convert the config to a formatted JSON string
            json_str = json.dumps(config, indent=2)
            
            # Format for JavaScript
            js_str = f"""/**
 * Species Configuration File
 * 
 * This file contains configuration for all species available in the Cone Scouting Tool.
 * To add a new species, simply add a new entry to the speciesConfig object with the appropriate properties.
 * 
 * Each species entry should have the following structure:
 * {{
 *   displayName: "Common Name",          // The display name shown in the dropdown
 *   scientificName: "Scientific name",   // Scientific name (shown in table headers and tooltips)
 *   vectorLayer: "geoserver_vector_name", // Name of the vector layer in GeoServer
 *   rasterLayer: "geoserver_raster_name", // Name of the raster layer in GeoServer
 *   backgroundImage: "/static/images/your-image.jpg", // Path to species background image
 *   enabled: true,                       // Set to false to disable this species
 *   attributes: {{                       // Attribute categories and their items
 *     basics: {{
 *       label: "Basic Information",      // Section label
 *       items: {{                        // Key-value pairs for attributes
 *         Range: "Range", 
 *         ...
 *       }}
 *     }},
 *     ...
 *   }}
 * }}
 */

const speciesConfig = {json_str};

// Export the configuration for use in other files
if (typeof module !== 'undefined' && module.exports) {{
  module.exports = {{ speciesConfig }};
}}"""
            
            with open(config_path, 'w') as f:
                f.write(js_str)
            
        return True
    except Exception as e:
        current_app.logger.error(f"Error saving species config: {str(e)}")
        return False

@species_bp.route('/species', methods=['GET'])
def get_all_species():
    """
    Get all species
    """
    config = get_species_config()
    
    # Convert to list format for API
    species_list = []
    for species_id, species_data in config.items():
        species_data['id'] = species_id
        species_list.append(species_data)
    
    return jsonify(species_list)

@species_bp.route('/species/<species_id>', methods=['GET'])
def get_species(species_id):
    """
    Get a specific species
    """
    config = get_species_config()
    
    if species_id not in config:
        abort(404, description=f"Species with ID {species_id} not found")
    
    species = config[species_id]
    species['id'] = species_id
    
    return jsonify(species)

@species_bp.route('/species', methods=['POST'])
def create_species():
    """
    Create a new species
    """
    try:
        data = request.json
        
        # Validate required fields
        jsonschema.validate(instance=data, schema=SPECIES_SCHEMA)
        
        # Read existing config
        config = get_species_config()
        
        # Generate ID if not provided
        species_id = data.get('id')
        if not species_id:
            species_id = data['displayName'].lower().replace(' ', '_')
            
            # Ensure unique ID
            base_id = species_id
            counter = 1
            while species_id in config:
                species_id = f"{base_id}_{counter}"
                counter += 1
        
        # Verify ID doesn't already exist
        if species_id in config:
            abort(400, description=f"Species with ID {species_id} already exists")
        
        # Remove ID from data for storage
        if 'id' in data:
            del data['id']
            
        # Add to config
        config[species_id] = data
        
        # Save config
        if not save_species_config(config):
            abort(500, description="Failed to save species configuration")
        
        # Return success with the created species
        data['id'] = species_id
        return jsonify(data), 201
        
    except jsonschema.exceptions.ValidationError as e:
        abort(400, description=f"Invalid species data: {str(e)}")
    except Exception as e:
        current_app.logger.error(f"Error creating species: {str(e)}")
        abort(500, description="An unexpected error occurred")

@species_bp.route('/species/<species_id>', methods=['PUT'])
def update_species(species_id):
    """
    Update an existing species
    """
    try:
        data = request.json
        
        # Validate required fields
        jsonschema.validate(instance=data, schema=SPECIES_SCHEMA)
        
        # Read existing config
        config = get_species_config()
        
        # Verify species exists
        if species_id not in config:
            abort(404, description=f"Species with ID {species_id} not found")
        
        # Remove ID from data for storage
        if 'id' in data:
            del data['id']
            
        # Update in config
        config[species_id] = data
        
        # Save config
        if not save_species_config(config):
            abort(500, description="Failed to save species configuration")
        
        # Return success with the updated species
        data['id'] = species_id
        return jsonify(data)
        
    except jsonschema.exceptions.ValidationError as e:
        abort(400, description=f"Invalid species data: {str(e)}")
    except Exception as e:
        current_app.logger.error(f"Error updating species: {str(e)}")
        abort(500, description="An unexpected error occurred")

@species_bp.route('/species/<species_id>/toggle', methods=['PATCH'])
def toggle_species(species_id):
    """
    Toggle a species' enabled status
    """
    try:
        data = request.json
        
        if 'enabled' not in data:
            abort(400, description="Missing 'enabled' field in request")
            
        enabled = bool(data['enabled'])
        
        # Read existing config
        config = get_species_config()
        
        # Verify species exists
        if species_id not in config:
            abort(404, description=f"Species with ID {species_id} not found")
            
        # Update enabled status
        config[species_id]['enabled'] = enabled
        
        # Save config
        if not save_species_config(config):
            abort(500, description="Failed to save species configuration")
        
        # Return success
        return jsonify({'id': species_id, 'enabled': enabled})
        
    except Exception as e:
        current_app.logger.error(f"Error toggling species: {str(e)}")
        abort(500, description="An unexpected error occurred")

def register_routes(app):
    """
    Register the species API routes with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    app.register_blueprint(species_bp)
