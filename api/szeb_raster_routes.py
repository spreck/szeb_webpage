import os
import tempfile
import requests
import json
import logging
import traceback
import xml.etree.ElementTree as ET
import glob
import zipfile
from functools import wraps
from flask import Blueprint, jsonify, request, current_app, abort
from auth import admin_auth_required

# Create Blueprint
szeb_raster_bp = Blueprint('szeb_raster_api', __name__, url_prefix='/api/szeb')

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

# SZEB-specific attribute color schemes
ATTRIBUTE_COLOR_SCHEMES = {
    "ClimateExposureRiskCategory": {
        "Very Low": "#1A9641",  # Green
        "Low": "#A6D96A",       # Light Green
        "Moderate": "#FFFFBF",  # Yellow
        "High": "#FDAE61",      # Orange
        "Very High": "#D7191C"  # Red
    },
    "FireIntensityRiskCategory": {
        "Very Low": "#1A9641",
        "Low": "#A6D96A",
        "Moderate": "#FFFFBF",
        "High": "#FDAE61",
        "Very High": "#D7191C"
    },
    "CurrentSupplyCategory": {
        "Very Low": "#D7191C",   # Red
        "Low": "#FDAE61",        # Orange
        "Moderate": "#FFFFBF",   # Yellow
        "High": "#A6D96A",       # Light Green
        "Very High": "#1A9641"   # Green
    },
    "LandownerDemandCategory": {
        "Very Low": "#D7191C",
        "Low": "#FDAE61",
        "Moderate": "#FFFFBF",
        "High": "#A6D96A",
        "Very High": "#1A9641"
    },
    "ProjectedDemandCategory": {
        "Very Low": "#D7191C",
        "Low": "#FDAE61",
        "Moderate": "#FFFFBF",
        "High": "#A6D96A",
        "Very High": "#1A9641"
    },
    "OperationalPriorityCategory": {
        "Very Low": "#D7191C",
        "Low": "#FDAE61",
        "Moderate": "#FFFFBF",
        "High": "#A6D96A",
        "Very High": "#1A9641"
    },
    "CombinedRiskCategory": {
        "Very Low": "#1A9641",
        "Low": "#A6D96A",
        "Moderate": "#FFFFBF",
        "High": "#FDAE61",
        "Very High": "#D7191C"
    }
}

@szeb_raster_bp.route('/upload_szeb_data', methods=['POST'])
@admin_auth_required
@handle_error
def upload_szeb_data():
    """
    Upload SZEB raster and vector data (supporting both PIPO and PSME species).
    
    Expects a multipart/form-data request with:
    - raster_file: The GeoTIFF file (SZEBxPipo_raster_4326.tif or SZEBxPsme_raster_4326.tif)
    - vector_file: The vector boundary shapefile (szeb_pipo_vector_unit_4326.shp or szeb_psme_vector_unit_4326.shp)
    - workspace: The GeoServer workspace name
    - species_code: Species code (PIPO or PSME)
    - template_species: (optional) Species to use as a template for styling
    """
    try:
        # Check if files were included
        if 'raster_file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No raster file in the request'
            }), 400
            
        if 'vector_file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No vector file in the request'
            }), 400
        
        # Get the files
        raster_file = request.files['raster_file']
        vector_file = request.files['vector_file']
        
        # Get form parameters
        workspace = request.form.get('workspace', current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample"))
        species_code = request.form.get('species_code')
        template_species = request.form.get('template_species')
        
        if not species_code:
            return jsonify({
                'success': False,
                'message': 'Species code is required'
            }), 400
        
        # Verify species code is valid (PIPO or PSME)
        if species_code.upper() not in ['PIPO', 'PSME']:
            return jsonify({
                'success': False,
                'message': 'Invalid species code. Must be PIPO or PSME.'
            }), 400
        
        # Save the files to a temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save the raster file
            raster_path = os.path.join(temp_dir, raster_file.filename)
            raster_file.save(raster_path)
            
            # Save the vector file and check for associated files
            vector_path = os.path.join(temp_dir, vector_file.filename)
            vector_file.save(vector_path)
            
            # Save any additional vector-related files (.dbf, .shx, etc.)
            vector_base_name = os.path.splitext(vector_file.filename)[0]
            for key in request.files:
                if key.startswith('vector_related_') and key != 'vector_file':
                    related_file = request.files[key]
                    related_path = os.path.join(temp_dir, related_file.filename)
                    related_file.save(related_path)
            
            # Process the SZEB species data
            result = process_szeb_species(
                workspace, 
                species_code.upper(), 
                raster_path, 
                vector_path, 
                template_species.upper() if template_species else None
            )
            
            return jsonify({
                'success': True,
                'message': f'SZEB {species_code} data processed successfully',
                'result': result
            })
    except Exception as e:
        logger.error(f"Error processing SZEB data: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to process SZEB data: {str(e)}'
        }), 500

def process_szeb_species(workspace, species_code, raster_path, vector_path, template_species=None):
    """
    Process a SZEB species dataset with optimized workflow
    
    Args:
        workspace: The GeoServer workspace
        species_code: Species code (e.g., 'PIPO', 'PSME')
        raster_path: Path to the raster file
        vector_path: Path to the vector boundary file
        template_species: Optional species code to use as template for styling
    """
    # Get GeoServer connection details
    geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
    geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
    geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
    
    # 1. Upload raster and automatically generate styles
    logger.info(f"Uploading raster for {species_code}")
    raster_result = upload_raster_with_rat(
        workspace, 
        raster_path, 
        species_code, 
        geoserver_url, 
        geoserver_user, 
        geoserver_pass
    )
    
    # 2. If a template species is provided, copy styles from it
    if template_species:
        logger.info(f"Copying styles from template species {template_species}")
        copied_styles = copy_styles_from_template(
            workspace, 
            template_species, 
            species_code, 
            raster_result['rat_attributes'],
            geoserver_url,
            geoserver_user,
            geoserver_pass
        )
        raster_result['copied_styles'] = copied_styles
    
    # 3. Upload vector boundary
    logger.info(f"Uploading vector boundary for {species_code}")
    vector_result = upload_vector_boundary(
        workspace, 
        vector_path, 
        species_code, 
        raster_result['coverage_name'],
        geoserver_url,
        geoserver_user,
        geoserver_pass
    )
    
    # 4. Create layer groups for each attribute
    logger.info(f"Creating attribute-specific layer groups for {species_code}")
    layer_groups = create_attribute_layer_groups(
        workspace,
        species_code,
        raster_result['generated_styles'],
        vector_result['store_name'],
        geoserver_url,
        geoserver_user,
        geoserver_pass
    )
    
    return {
        'species': species_code,
        'raster': raster_result,
        'vector': vector_result,
        'layer_groups': layer_groups
    }

def upload_raster_with_rat(workspace, raster_file_path, species_code, geoserver_url, geoserver_user, geoserver_pass):
    """Upload a raster file and process its RAT attributes"""
    # Extract base name from file
    file_name = os.path.basename(raster_file_path)
    base_name = os.path.splitext(file_name)[0]
    
    # Create coverage store name following SZEB convention
    store_name = f"SZEBx{species_code}_raster_4326"
    
    # 1. Create coverage store
    create_store_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores"
    store_data = {
        'coverageStore': {
            'name': store_name,
            'type': 'GeoTIFF',
            'enabled': True,
            'workspace': {'name': workspace}
        }
    }
    
    response = requests.post(
        create_store_url,
        json=store_data,
        auth=(geoserver_user, geoserver_pass)
    )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to create coverage store: {response.text}")
    
    # 2. Upload GeoTIFF
    upload_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/file.geotiff"
    with open(raster_file_path, 'rb') as f:
        response = requests.put(
            upload_url,
            data=f,
            headers={'Content-type': 'application/octet-stream'},
            auth=(geoserver_user, geoserver_pass)
        )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to upload raster: {response.text}")
    
    # 3. Create coverage with the same name as the store
    coverage_name = store_name
    create_coverage_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages"
    coverage_data = {
        'coverage': {
            'name': coverage_name,
            'title': f"{species_code} Raster",
            'enabled': True
        }
    }
    
    response = requests.post(
        create_coverage_url,
        json=coverage_data,
        auth=(geoserver_user, geoserver_pass)
    )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to create coverage: {response.text}")
    
    # 4. Get RAT information
    rat_data = get_rat_attributes(workspace, store_name, coverage_name, geoserver_url, geoserver_user, geoserver_pass)
    
    # 5. Generate styles for each RAT attribute
    generated_styles = []
    for band_idx, band_data in rat_data.items():
        for column_name in band_data.get('columns', {}).keys():
            # Check if this is a key SZEB attribute we want to generate a style for
            if column_name in ATTRIBUTE_COLOR_SCHEMES or "Category" in column_name:
                style_name = f"{store_name}_b{band_idx}_{column_name}"
                style_generated = generate_rat_style(
                    workspace, store_name, coverage_name, 
                    band_idx, column_name, style_name,
                    geoserver_url, geoserver_user, geoserver_pass
                )
                
                if style_generated:
                    generated_styles.append({
                        'band': band_idx,
                        'attribute': column_name,
                        'style_name': style_name
                    })
    
    return {
        'store_name': store_name,
        'coverage_name': coverage_name,
        'rat_attributes': rat_data,
        'generated_styles': generated_styles
    }

def get_rat_attributes(workspace, store_name, coverage_name, geoserver_url, geoserver_user, geoserver_pass):
    """Get RAT attributes from a coverage"""
    pam_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages/{coverage_name}/pam"
    response = requests.get(
        pam_url,
        auth=(geoserver_user, geoserver_pass)
    )
    
    if response.status_code != 200:
        return {}
    
    # Parse the PAM XML to extract RAT information
    from api.raster_routes import parse_pam_xml
    return parse_pam_xml(response.text)

def generate_rat_style(workspace, store, coverage, band, classification, style_name, geoserver_url, geoserver_user, geoserver_pass):
    """Generate a style from RAT data"""
    pam_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{store}/coverages/{coverage}/pam"
    params = {
        'band': band,
        'classification': classification,
        'styleName': style_name
    }
    
    response = requests.post(
        pam_url,
        params=params,
        auth=(geoserver_user, geoserver_pass)
    )
    
    # Apply the style to the layer
    if response.status_code in [200, 201, 303]:
        # Get the style name from the Location header
        generated_style_name = style_name
        if 'Location' in response.headers:
            location = response.headers['Location']
            parts = location.split('/')
            generated_style_name = parts[-1]
        
        # Apply the style to the layer
        layer_url = f"{geoserver_url}/rest/layers/{workspace}:{coverage}"
        layer_data = {
            'layer': {
                'defaultStyle': {
                    'name': generated_style_name,
                    'workspace': workspace
                }
            }
        }
        
        style_response = requests.put(
            layer_url,
            json=layer_data,
            auth=(geoserver_user, geoserver_pass)
        )
        
        return style_response.status_code in [200, 201]
    
    return False

def upload_vector_boundary(workspace, shapefile_path, species_code, raster_coverage_name, 
                           geoserver_url, geoserver_user, geoserver_pass):
    """Upload vector boundary that corresponds to a raster layer"""
    # Extract base name from file
    file_name = os.path.basename(shapefile_path)
    base_name = os.path.splitext(file_name)[0]
    
    # Create store name following SZEB convention
    store_name = f"szeb_{species_code.lower()}_vector_unit_4326"
    
    # Zip the shapefile and related files
    shapefile_dir = os.path.dirname(shapefile_path)
    base_name_no_ext = os.path.splitext(file_name)[0]
    related_files = glob.glob(os.path.join(shapefile_dir, f"{base_name_no_ext}.*"))
    
    with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_zip:
        with zipfile.ZipFile(temp_zip, 'w') as zipf:
            for file_path in related_files:
                zipf.write(file_path, os.path.basename(file_path))
        temp_zip_path = temp_zip.name
    
    try:
        # 1. Upload shapefile
        upload_url = f"{geoserver_url}/rest/workspaces/{workspace}/datastores/{store_name}/file.shp"
        with open(temp_zip_path, 'rb') as f:
            response = requests.put(
                upload_url,
                data=f,
                headers={'Content-type': 'application/zip'},
                auth=(geoserver_user, geoserver_pass)
            )
        
        if response.status_code not in [200, 201]:
            raise Exception(f"Failed to upload vector: {response.text}")
        
        # 2. Create a basic outline style for the vector
        style_name = f"{store_name}_outline"
        create_vector_outline_style(workspace, style_name, geoserver_url, geoserver_user, geoserver_pass)
        
        # 3. Apply the style to the layer
        layer_url = f"{geoserver_url}/rest/layers/{workspace}:{store_name}"
        layer_data = {
            'layer': {
                'defaultStyle': {
                    'name': style_name,
                    'workspace': workspace
                }
            }
        }
        response = requests.put(
            layer_url,
            json=layer_data,
            auth=(geoserver_user, geoserver_pass)
        )
        
        # 4. Create a layer group that combines the vector and raster
        create_layer_group(
            workspace,
            f"szeb_{species_code.lower()}_group",
            [raster_coverage_name, store_name],
            None,
            geoserver_url,
            geoserver_user,
            geoserver_pass
        )
        
        return {
            'store_name': store_name,
            'style_name': style_name,
            'layer_group': f"szeb_{species_code.lower()}_group"
        }
    
    finally:
        # Clean up the temporary zip file
        if os.path.exists(temp_zip_path):
            os.unlink(temp_zip_path)

def create_vector_outline_style(workspace, style_name, geoserver_url, geoserver_user, geoserver_pass):
    """Create a basic outline style for vector data"""
    # 1. Create style entry in workspace
    style_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles"
    style_data = {
        'style': {
            'name': style_name,
            'filename': f"{style_name}.sld"
        }
    }
    response = requests.post(
        style_url,
        json=style_data,
        auth=(geoserver_user, geoserver_pass)
    )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to create style entry: {response.text}")
    
    # 2. Upload SLD content
    sld_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" 
    xmlns="http://www.opengis.net/sld" 
    xmlns:ogc="http://www.opengis.net/ogc" 
    xmlns:xlink="http://www.w3.org/1999/xlink" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
    <NamedLayer>
        <Name>Vector Outline</Name>
        <UserStyle>
            <Name>{style_name}</Name>
            <FeatureTypeStyle>
                <Rule>
                    <PolygonSymbolizer>
                        <Fill>
                            <CssParameter name="fill">#FFFFFF</CssParameter>
                            <CssParameter name="fill-opacity">0.0</CssParameter>
                        </Fill>
                        <Stroke>
                            <CssParameter name="stroke">#000000</CssParameter>
                            <CssParameter name="stroke-width">1.0</CssParameter>
                        </Stroke>
                    </PolygonSymbolizer>
                </Rule>
            </FeatureTypeStyle>
        </UserStyle>
    </NamedLayer>
</StyledLayerDescriptor>
'''
    
    sld_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles/{style_name}"
    response = requests.put(
        sld_url,
        data=sld_content,
        headers={'Content-type': 'application/vnd.ogc.sld+xml'},
        auth=(geoserver_user, geoserver_pass)
    )
    
    return response.status_code in [200, 201]

def copy_styles_from_template(workspace, template_species, target_species, rat_attributes, 
                             geoserver_url, geoserver_user, geoserver_pass):
    """Copy styles from template species to target species"""
    
    # Get list of all styles in the workspace
    styles_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles.json"
    response = requests.get(
        styles_url,
        auth=(geoserver_user, geoserver_pass)
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get styles: {response.text}")
    
    styles_data = response.json()
    styles = []
    
    if 'styles' in styles_data and 'style' in styles_data['styles']:
        styles = styles_data['styles']['style']
    
    # For each attribute in the target species, find a matching template style
    copied_styles = []
    for band_idx, band_data in rat_attributes.items():
        for column_name in band_data.get('columns', {}).keys():
            # Check if this is a key SZEB attribute we want to copy a style for
            if column_name in ATTRIBUTE_COLOR_SCHEMES or "Category" in column_name:
                # Look for a template style with the same attribute
                template_style_name = None
                for style in styles:
                    style_name = style.get('name', '')
                    # Match pattern like SZEBxPipo_raster_4326_b0_ClimateExposureRiskCategory
                    if f"SZEBx{template_species}_raster" in style_name and f"_b{band_idx}_{column_name}" in style_name:
                        template_style_name = style_name
                        break
                
                if template_style_name:
                    target_style_name = f"SZEBx{target_species}_raster_4326_b{band_idx}_{column_name}"
                    success = copy_existing_style(
                        workspace,
                        template_style_name,
                        target_style_name,
                        geoserver_url,
                        geoserver_user,
                        geoserver_pass,
                        attribute_name=column_name
                    )
                    
                    if success:
                        copied_styles.append({
                            'band': band_idx,
                            'attribute': column_name,
                            'style_name': target_style_name,
                            'template_style': template_style_name
                        })
    
    return copied_styles

def copy_existing_style(workspace, source_style_name, target_style_name, 
                       geoserver_url, geoserver_user, geoserver_pass, attribute_name=None):
    """Copy an existing style to a new style, optionally modifying the attribute name"""
    
    # 1. Get the source style
    style_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles/{source_style_name}.sld"
    response = requests.get(
        style_url,
        auth=(geoserver_user, geoserver_pass)
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get source style: {response.text}")
    
    # 2. Get the SLD content
    sld_content = response.text
    
    # 3. Modify the attribute name if needed
    if attribute_name:
        # This is a simple string replacement - a more robust approach would use XML parsing
        sld_content = sld_content.replace(
            f'<ogc:PropertyName>{attribute_name}</ogc:PropertyName>',
            f'<ogc:PropertyName>{attribute_name}</ogc:PropertyName>'
        )
    
    # 4. Create the target style
    create_style_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles"
    style_data = {
        'style': {
            'name': target_style_name,
            'filename': f"{target_style_name}.sld"
        }
    }
    response = requests.post(
        create_style_url,
        json=style_data,
        auth=(geoserver_user, geoserver_pass)
    )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to create target style: {response.text}")
    
    # 5. Upload the modified SLD content
    upload_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles/{target_style_name}"
    response = requests.put(
        upload_url,
        data=sld_content,
        headers={'Content-type': 'application/vnd.ogc.sld+xml'},
        auth=(geoserver_user, geoserver_pass)
    )
    
    return response.status_code in [200, 201]

def create_layer_group(workspace, group_name, layers, styles=None, 
                      geoserver_url=None, geoserver_user=None, geoserver_pass=None):
    """Create a layer group combining multiple layers"""
    layer_group_url = f"{geoserver_url}/rest/workspaces/{workspace}/layergroups"
    
    layers_list = []
    for i, layer in enumerate(layers):
        layer_item = {
            "name": f"{workspace}:{layer}"
        }
        if styles and i < len(styles):
            layer_item["style"] = styles[i]
        layers_list.append(layer_item)
    
    layer_group_data = {
        "layerGroup": {
            "name": group_name,
            "mode": "NAMED",
            "title": group_name,
            "layers": {
                "layer": layers_list
            }
        }
    }
    
    response = requests.post(
        layer_group_url,
        json=layer_group_data,
        auth=(geoserver_user, geoserver_pass)
    )
    
    return response.status_code in [200, 201]

def create_attribute_layer_groups(workspace, species_code, styles, vector_store_name,
                                geoserver_url, geoserver_user, geoserver_pass):
    """Create a layer group for each attribute"""
    
    # Group styles by attribute
    attribute_styles = {}
    for style_info in styles:
        attribute = style_info['attribute']
        if attribute not in attribute_styles:
            attribute_styles[attribute] = []
        attribute_styles[attribute].append(style_info)
    
    # Create a layer group for each attribute
    layer_groups = []
    for attribute, style_infos in attribute_styles.items():
        group_name = f"szeb_{species_code.lower()}_{attribute}"
        
        # Add the raster layer with its style
        layers = []
        styles_list = []
        
        for style_info in style_infos:
            layers.append(f"SZEBx{species_code}_raster_4326")
            styles_list.append(style_info['style_name'])
        
        # Add the vector boundary layer
        layers.append(vector_store_name)
        styles_list.append(f"{vector_store_name}_outline")
        
        # Create the layer group
        success = create_layer_group(
            workspace,
            group_name,
            layers,
            styles_list,
            geoserver_url,
            geoserver_user,
            geoserver_pass
        )
        
        if success:
            layer_groups.append({
                'attribute': attribute,
                'group_name': group_name
            })
    
    return layer_groups

def register_routes(app):
    """
    Register the SZEB raster API routes with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    app.register_blueprint(szeb_raster_bp)
