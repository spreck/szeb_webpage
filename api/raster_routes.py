import os
import tempfile
import requests
import json
import logging
import traceback
import xml.etree.ElementTree as ET
from functools import wraps
from flask import Blueprint, jsonify, request, current_app, abort
from auth import admin_auth_required

# Create Blueprint
raster_bp = Blueprint('raster_api', __name__, url_prefix='/api')

# Setup logger
logger = logging.getLogger(__name__)

# Generic error handler for API endpoints
def handle_error(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            # Log the error with traceback
            error_type = type(e).__name__
            logger.error(f"Error in {func.__name__}: {str(e)}\n{traceback.format_exc()}")
            
            # Return error response for API endpoints
            status_code = 500
            if hasattr(e, 'status_code'):
                status_code = e.status_code
            return jsonify({
                'status': 'error',
                'message': str(e),
                'error_type': error_type
            }), status_code
    return wrapper

@raster_bp.route('/upload_raster', methods=['POST'])
@admin_auth_required
@handle_error
def upload_raster():
    """
    Upload a raster file to GeoServer.
    
    Expects a multipart/form-data request with:
    - file: The GeoTIFF file
    - aux_file: (optional) The .aux.xml file containing RAT data
    - workspace: The GeoServer workspace name
    - store_name: The name for the new coverage store
    - layer_name: (optional) The name for the layer, defaults to store_name
    """
    try:
        # Check if file was included
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file part in the request'
            }), 400
        
        # Get the raster file
        raster_file = request.files['file']
        if raster_file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Get optional aux.xml file
        aux_file = None
        if 'aux_file' in request.files:
            aux_file = request.files['aux_file']
            if aux_file.filename == '':
                aux_file = None
        
        # Get form parameters
        workspace = request.form.get('workspace')
        store_name = request.form.get('store_name')
        layer_name = request.form.get('layer_name') or store_name
        
        if not workspace or not store_name:
            return jsonify({
                'success': False,
                'message': 'Workspace and store name are required'
            }), 400
        
        # Save the files to a temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save the raster file
            raster_path = os.path.join(temp_dir, raster_file.filename)
            raster_file.save(raster_path)
            
            # If aux file provided, save it with the correct name
            aux_path = None
            if aux_file and aux_file.filename.lower().endswith('.aux.xml'):
                aux_path = os.path.join(temp_dir, os.path.splitext(raster_file.filename)[0] + '.aux.xml')
                aux_file.save(aux_path)
            
            # Upload the raster to GeoServer
            geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
            geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
            geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
            
            # Create the coverage store
            create_store_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores"
            
            # Use file upload approach - first create the store
            store_data = {
                'coverageStore': {
                    'name': store_name,
                    'type': 'GeoTIFF',
                    'enabled': True,
                    'workspace': {
                        'name': workspace
                    }
                }
            }
            
            response = requests.post(
                create_store_url,
                json=store_data,
                auth=(geoserver_user, geoserver_pass)
            )
            
            if not response.ok:
                return jsonify({
                    'success': False,
                    'message': f'Failed to create coverage store: {response.text}'
                }), response.status_code
            
            # Now upload the file to the store
            upload_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/file.geotiff"
            
            with open(raster_path, 'rb') as f:
                response = requests.put(
                    upload_url,
                    data=f,
                    headers={
                        'Content-type': 'application/octet-stream'
                    },
                    auth=(geoserver_user, geoserver_pass)
                )
            
            if not response.ok:
                return jsonify({
                    'success': False,
                    'message': f'Failed to upload raster file: {response.text}'
                }), response.status_code
            
            # Create the layer if a different name is specified
            if layer_name != store_name:
                create_layer_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages"
                
                layer_data = {
                    'coverage': {
                        'name': layer_name,
                        'nativeName': store_name,
                        'title': layer_name,
                        'enabled': True
                    }
                }
                
                response = requests.post(
                    create_layer_url,
                    json=layer_data,
                    auth=(geoserver_user, geoserver_pass)
                )
                
                if not response.ok:
                    return jsonify({
                        'success': False,
                        'message': f'Failed to create layer: {response.text}'
                    }), response.status_code
            
            # Check for RAT data by querying the PAM endpoint
            rat_info = {}
            rat_detected = False
            
            try:
                pam_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages/{layer_name}/pam"
                pam_response = requests.get(
                    pam_url,
                    auth=(geoserver_user, geoserver_pass)
                )
                
                if pam_response.ok:
                    # Parse the XML to extract RAT information
                    rat_info = parse_pam_xml(pam_response.text)
                    rat_detected = bool(rat_info)
            except Exception as e:
                logger.warning(f"Error checking for RAT data: {str(e)}")
                # Continue even if RAT check fails
            
            return jsonify({
                'success': True,
                'message': 'Raster uploaded and published successfully',
                'workspace': workspace,
                'store_name': store_name,
                'layer_name': layer_name,
                'rat_detected': rat_detected,
                'rat_data': rat_info
            })
    except Exception as e:
        logger.error(f"Error uploading raster: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to upload raster: {str(e)}'
        }), 500

@raster_bp.route('/generate_rat_style', methods=['POST'])
@admin_auth_required
@handle_error
def generate_rat_style():
    """
    Generate a style based on RAT data.
    
    Expects JSON with:
    - workspace: GeoServer workspace name
    - store: Coverage store name
    - coverage: Coverage name
    - band: Band index (integer)
    - classification: Column name to use for classification
    - styleName: (optional) Name for the generated style
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['workspace', 'store', 'coverage', 'band', 'classification']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'error': f'Missing required field: {field}'
                }), 400
        
        workspace = data['workspace']
        store = data['store']
        coverage = data['coverage']
        band = data['band']
        classification = data['classification']
        style_name = data.get('styleName')
        
        # Generate style using the RAT API
        geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
        geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
        geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
        
        rat_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{store}/coverages/{coverage}/pam"
        
        # Construct query parameters
        params = {
            'band': band,
            'classification': classification
        }
        
        if style_name:
            params['styleName'] = style_name
            
        # Make the POST request to generate the style
        response = requests.post(
            rat_url,
            params=params,
            auth=(geoserver_user, geoserver_pass)
        )
        
        if not response.ok:
            return jsonify({
                'error': f'Failed to generate style: {response.text}'
            }), response.status_code
        
        # Get the style name from the response Location header
        location = response.headers.get('Location')
        generated_style_name = style_name
        
        if location:
            # Extract style name from the Location URL
            parts = location.split('/')
            generated_style_name = parts[-1]
        
        # Apply the style to the layer
        layer_url = f"{geoserver_url}/rest/layers/{workspace}:{coverage}"
        layer_data = {
            'layer': {
                'defaultStyle': {
                    'name': generated_style_name
                }
            }
        }
        
        response = requests.put(
            layer_url,
            json=layer_data,
            auth=(geoserver_user, geoserver_pass)
        )
        
        if not response.ok:
            return jsonify({
                'error': f'Failed to apply style to layer: {response.text}'
            }), response.status_code
        
        return jsonify({
            'message': 'Style generated and applied successfully',
            'styleName': generated_style_name
        })
        
    except Exception as e:
        logger.error(f"Error generating RAT style: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'error': f'Failed to generate style: {str(e)}'
        }), 500

def parse_pam_xml(xml_text):
    """
    Parse the PAM XML to extract RAT information
    
    Args:
        xml_text (str): XML content from PAM endpoint
        
    Returns:
        dict: Structured RAT data by band
    """
    try:
        # Parse XML
        root = ET.fromstring(xml_text)
        
        # Find all RAT elements
        rat_data = {}
        
        # Find all PAMRasterBand elements
        for band_idx, band_elem in enumerate(root.findall('.//PAMRasterBand')):
            band_index = band_elem.get('band', str(band_idx))
            
            # Find the RAT element within this band
            rat_elem = band_elem.find('./GDALRasterAttributeTable')
            if rat_elem is None:
                continue
                
            # Find all column definitions
            columns = {}
            for col_elem in rat_elem.findall('./FieldDefn'):
                col_index = col_elem.get('index')
                col_name = col_elem.findtext('./Name')
                col_type = col_elem.findtext('./Type')
                col_usage = col_elem.findtext('./Usage')
                
                if col_name:
                    columns[col_name] = {
                        'index': col_index,
                        'type': col_type,
                        'usage': col_usage
                    }
            
            # Find all row values
            rows = []
            for row_elem in rat_elem.findall('./Row'):
                row_index = int(row_elem.get('index', 0))
                row_data = {'value': row_index}
                
                for field_elem in row_elem.findall('./F'):
                    field_index = int(field_elem.get('index', 0))
                    field_value = field_elem.text
                    
                    # Find the column name for this index
                    col_name = None
                    for name, info in columns.items():
                        if info.get('index') == str(field_index):
                            col_name = name
                            break
                    
                    if col_name:
                        # Try to convert numeric values
                        try:
                            if columns[col_name].get('type') == 'Integer':
                                field_value = int(field_value)
                            elif columns[col_name].get('type') == 'Real':
                                field_value = float(field_value)
                        except (ValueError, TypeError):
                            pass  # Keep as string
                        
                        row_data[col_name] = field_value
                
                rows.append(row_data)
            
            # Store the RAT data for this band
            rat_data[band_index] = {
                'columns': columns,
                'rows': rows
            }
        
        return rat_data
    
    except Exception as e:
        logger.error(f"Error parsing PAM XML: {str(e)}\n{traceback.format_exc()}")
        return {}

def register_routes(app):
    """
    Register the raster API routes with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    app.register_blueprint(raster_bp)
