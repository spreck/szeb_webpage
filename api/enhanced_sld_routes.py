import logging
import traceback
import json
import requests
from functools import wraps
from flask import Blueprint, jsonify, request, current_app, render_template
from auth import admin_auth_required
from api.sld_templates import get_style_template_by_id, get_szeb_template_list, get_basic_template_list

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

# Create Blueprint
enhanced_sld_bp = Blueprint('enhanced_sld_api', __name__, url_prefix='/api/enhanced_sld')

@enhanced_sld_bp.route('/editor', methods=['GET'])
@admin_auth_required
def enhanced_sld_editor_page():
    """
    Render the enhanced SLD Editor page for layer styling.
    """
    # Get query parameters
    layer_name = request.args.get('layer', '')
    workspace = request.args.get('workspace', current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample"))
    feature_type = request.args.get('type', 'vector')  # Default to vector
    
    # Get layer attribute details
    attributes = []
    if layer_name:
        try:
            # Get attributes from layer_for_styling endpoint
            layer_info = get_layer_for_styling_data(layer_name, workspace, feature_type)
            if layer_info and 'layer' in layer_info and 'attributes' in layer_info['layer']:
                attributes = layer_info['layer']['attributes']
                feature_type = layer_info['layer']['type']
        except Exception as e:
            logger.error(f"Error fetching layer attributes: {str(e)}\n{traceback.format_exc()}")
    
    # Render the SLD Editor template with the layer information
    return render_template('sld_editor_page.html',
                          layer_name=layer_name,
                          workspace=workspace,
                          feature_type=feature_type,
                          attributes=attributes,
                          geoserver_url=current_app.config.get("GEOSERVER_URL", ""),
                          geoserver_workspace=workspace)

@enhanced_sld_bp.route('/layer_for_styling', methods=['GET'])
@admin_auth_required
@handle_error
def get_layer_for_styling():
    """Get layer information for styling"""
    layer_name = request.args.get('layer')
    workspace = request.args.get('workspace', current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample"))
    
    if not layer_name:
        return jsonify({
            'success': False,
            'message': 'Layer name is required'
        }), 400
    
    try:
        # Get GeoServer connection details
        geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
        geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
        geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
        
        # Get layer type (vector or raster)
        layer_url = f"{geoserver_url}/rest/layers/{workspace}:{layer_name}.json"
        response = requests.get(
            layer_url,
            auth=(geoserver_user, geoserver_pass)
        )
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'message': f'Failed to get layer information: {response.text}'
            }), response.status_code
        
        layer_data = response.json()
        layer_type = layer_data.get('layer', {}).get('type', 'UNKNOWN')
        
        # Get layer attributes
        attributes = []
        if layer_type == 'RASTER':
            # For raster, get RAT attributes
            pam_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{layer_name}/coverages/{layer_name}/pam"
            response = requests.get(
                pam_url,
                auth=(geoserver_user, geoserver_pass)
            )
            
            if response.status_code == 200:
                from api.raster_routes import parse_pam_xml
                rat_data = parse_pam_xml(response.text)
                
                for band_idx, band_data in rat_data.items():
                    for column_name in band_data.get('columns', {}).keys():
                        attributes.append({
                            'name': column_name,
                            'band': band_idx,
                            'type': 'RAT'
                        })
        else:
            # For vector, get feature type attributes
            featuretype_url = f"{geoserver_url}/rest/workspaces/{workspace}/datastores/{layer_name}/featuretypes/{layer_name}.json"
            response = requests.get(
                featuretype_url,
                auth=(geoserver_user, geoserver_pass)
            )
            
            if response.status_code == 200:
                data = response.json()
                for attr in data.get('featureType', {}).get('attributes', {}).get('attribute', []):
                    if attr['name'] not in ['the_geom', 'geometry']:
                        attributes.append({
                            'name': attr['name'],
                            'type': attr.get('binding', 'STRING')
                        })
        
        return jsonify({
            'success': True,
            'layer': {
                'name': layer_name,
                'workspace': workspace,
                'type': layer_type,
                'attributes': attributes
            }
        })
    except Exception as e:
        logger.error(f"Error getting layer for styling: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to get layer information: {str(e)}'
        }), 500

def get_layer_for_styling_data(layer_name, workspace, feature_type):
    """Helper function to get layer information for styling"""
    # Get GeoServer connection details
    geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
    geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
    geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
    
    # Get layer type (vector or raster)
    layer_url = f"{geoserver_url}/rest/layers/{workspace}:{layer_name}.json"
    response = requests.get(
        layer_url,
        auth=(geoserver_user, geoserver_pass)
    )
    
    if response.status_code != 200:
        return None
    
    layer_data = response.json()
    layer_type = layer_data.get('layer', {}).get('type', feature_type.upper())
    
    # Get layer attributes
    attributes = []
    if layer_type == 'RASTER':
        # For raster, get RAT attributes
        pam_url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{layer_name}/coverages/{layer_name}/pam"
        response = requests.get(
            pam_url,
            auth=(geoserver_user, geoserver_pass)
        )
        
        if response.status_code == 200:
            from api.raster_routes import parse_pam_xml
            rat_data = parse_pam_xml(response.text)
            
            for band_idx, band_data in rat_data.items():
                for column_name in band_data.get('columns', {}).keys():
                    attributes.append({
                        'name': column_name,
                        'band': band_idx,
                        'type': 'RAT'
                    })
    else:
        # For vector, get feature type attributes
        featuretype_url = f"{geoserver_url}/rest/workspaces/{workspace}/datastores/{layer_name}/featuretypes/{layer_name}.json"
        response = requests.get(
            featuretype_url,
            auth=(geoserver_user, geoserver_pass)
        )
        
        if response.status_code == 200:
            data = response.json()
            for attr in data.get('featureType', {}).get('attributes', {}).get('attribute', []):
                if attr['name'] not in ['the_geom', 'geometry']:
                    attributes.append({
                        'name': attr['name'],
                        'type': attr.get('binding', 'STRING')
                    })
    
    return {
        'layer': {
            'name': layer_name,
            'workspace': workspace,
            'type': layer_type,
            'attributes': attributes
        }
    }

@enhanced_sld_bp.route('/style_templates', methods=['GET'])
@admin_auth_required
@handle_error
def get_style_templates():
    """Get compatible style templates for a layer"""
    layer_name = request.args.get('layer')
    layer_type = request.args.get('type', 'VECTOR')
    workspace = request.args.get('workspace', current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample"))
    
    # Get basic templates
    templates = get_basic_template_list(layer_type)
    
    # For raster, add SZEB templates
    if layer_type.upper() == 'RASTER':
        szeb_templates = get_szeb_template_list()
        templates.extend(szeb_templates)
        
        return jsonify({
            'success': True,
            'templates': templates
        })
    else:
        # Get geometry type from the layer for vector layers
        geometry_type = 'POLYGON'  # Default
        
        if layer_name:
            try:
                # Get GeoServer connection details
                geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
                geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
                geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
                
                featuretype_url = f"{geoserver_url}/rest/workspaces/{workspace}/datastores/{layer_name}/featuretypes/{layer_name}.json"
                response = requests.get(
                    featuretype_url,
                    auth=(geoserver_user, geoserver_pass)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    for attr in data.get('featureType', {}).get('attributes', {}).get('attribute', []):
                        if attr['name'] in ['the_geom', 'geometry']:
                            binding = attr.get('binding', '')
                            if 'Point' in binding:
                                geometry_type = 'POINT'
                            elif 'Line' in binding:
                                geometry_type = 'LINE'
                            break
            except Exception as e:
                logger.warning(f"Error determining geometry type: {str(e)}")
        
        return jsonify({
            'success': True,
            'templates': get_basic_template_list(layer_type, geometry_type)
        })

@enhanced_sld_bp.route('/template', methods=['GET'])
@admin_auth_required
@handle_error
def get_style_template():
    """Get a specific style template"""
    template_id = request.args.get('id')
    attribute = request.args.get('attribute')
    
    if not template_id:
        return jsonify({
            'success': False,
            'message': 'Template ID is required'
        }), 400
    
    sld_content = get_style_template_by_id(template_id, attribute)
    
    if not sld_content:
        return jsonify({
            'success': False,
            'message': f'Template {template_id} not found'
        }), 404
    
    return jsonify({
        'success': True,
        'template': {
            'id': template_id,
            'sld': sld_content
        }
    })

@enhanced_sld_bp.route('/existing_styles', methods=['GET'])
@admin_auth_required
@handle_error
def get_existing_styles():
    """Get existing styles that can be used as templates"""
    workspace = request.args.get('workspace', current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample"))
    layer_type = request.args.get('type', 'RASTER')
    
    try:
        # Get GeoServer connection details
        geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
        geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
        geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
        
        # Get all styles in the workspace
        styles_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles.json"
        response = requests.get(
            styles_url,
            auth=(geoserver_user, geoserver_pass)
        )
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'message': f'Failed to get styles: {response.text}'
            }), response.status_code
        
        styles_data = response.json()
        styles = []
        
        if 'styles' in styles_data and 'style' in styles_data['styles']:
            styles = styles_data['styles']['style']
        
        # Filter styles by type if needed
        filtered_styles = []
        
        # Get layers to associate styles with their types
        layers_url = f"{geoserver_url}/rest/layers.json"
        layers_response = requests.get(
            layers_url,
            auth=(geoserver_user, geoserver_pass)
        )
        
        layer_style_map = {}
        if layers_response.status_code == 200:
            layers_data = layers_response.json()
            if 'layers' in layers_data and 'layer' in layers_data['layers']:
                for layer in layers_data['layers']['layer']:
                    layer_info = layer.get('layer', {})
                    default_style = layer_info.get('defaultStyle', {})
                    if default_style:
                        style_name = default_style.get('name')
                        if style_name:
                            layer_style_map[style_name] = {
                                'layer': layer.get('name'),
                                'type': layer_info.get('type')
                            }
        
        for style in styles:
            style_name = style.get('name')
            style_info = {
                'name': style_name,
                'href': style.get('href')
            }
            
            # Add layer type info if available
            if style_name in layer_style_map:
                style_info['layer'] = layer_style_map[style_name]['layer']
                style_info['type'] = layer_style_map[style_name]['type']
                
                # Filter by type if specified
                if layer_type and layer_style_map[style_name]['type'] != layer_type:
                    continue
            
            # Add SZEB category information if it's a SZEB style
            for category in ['ClimateExposureRiskCategory', 'FireIntensityRiskCategory', 
                           'CurrentSupplyCategory', 'LandownerDemandCategory', 
                           'OperationalPriorityCategory', 'CombinedRiskCategory']:
                if category in style_name:
                    style_info['category'] = category
                    break
            
            filtered_styles.append(style_info)
        
        return jsonify({
            'success': True,
            'styles': filtered_styles
        })
    except Exception as e:
        logger.error(f"Error getting existing styles: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to get existing styles: {str(e)}'
        }), 500

@enhanced_sld_bp.route('/copy_style', methods=['POST'])
@admin_auth_required
@handle_error
def copy_style():
    """Copy an existing style to a new style"""
    try:
        data = request.json
        source_style_name = data.get('source')
        target_style_name = data.get('target')
        workspace = data.get('workspace', current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample"))
        attribute_name = data.get('attribute')
        
        if not source_style_name or not target_style_name:
            return jsonify({
                'success': False,
                'message': 'Source and target style names are required'
            }), 400
        
        # Get GeoServer connection details
        geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
        geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
        geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
        
        # 1. Get the source style
        style_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles/{source_style_name}.sld"
        response = requests.get(
            style_url,
            auth=(geoserver_user, geoserver_pass)
        )
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'message': f'Failed to get source style: {response.text}'
            }), response.status_code
        
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
            return jsonify({
                'success': False,
                'message': f'Failed to create target style: {response.text}'
            }), response.status_code
        
        # 5. Upload the modified SLD content
        upload_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles/{target_style_name}"
        response = requests.put(
            upload_url,
            data=sld_content,
            headers={'Content-type': 'application/vnd.ogc.sld+xml'},
            auth=(geoserver_user, geoserver_pass)
        )
        
        if response.status_code not in [200, 201]:
            return jsonify({
                'success': False,
                'message': f'Failed to upload SLD content: {response.text}'
            }), response.status_code
        
        return jsonify({
            'success': True,
            'message': f'Style copied successfully from {source_style_name} to {target_style_name}',
            'style': {
                'name': target_style_name,
                'workspace': workspace
            }
        })
    except Exception as e:
        logger.error(f"Error copying style: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to copy style: {str(e)}'
        }), 500

def register_routes(app):
    """
    Register the enhanced SLD API routes with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    app.register_blueprint(enhanced_sld_bp)
