import logging
import traceback
from flask import Blueprint, jsonify, request, current_app, render_template
import requests
from routes import handle_error, admin_auth_required

# Setup logger
logger = logging.getLogger(__name__)

# Create Blueprint
sld_bp = Blueprint('sld_api', __name__, url_prefix='/api/sld')

@sld_bp.route('/editor', methods=['GET'])
@admin_auth_required
def sld_editor_page():
    """
    Render the SLD Editor page for layer styling.
    """
    # Get query parameters
    layer_name = request.args.get('layer', '')
    workspace = request.args.get('workspace', current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample"))
    feature_type = request.args.get('type', 'vector')  # Default to vector
    
    # Get layer attribute details if available
    attributes = []
    if layer_name:
        try:
            # Get attributes from GeoServer
            geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
            geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
            geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
            
            if feature_type == 'vector':
                # For vector layers, get feature type attributes
                url = f"{geoserver_url}/rest/workspaces/{workspace}/datastores/{layer_name.split(':')[-1]}/featuretypes/{layer_name.split(':')[-1]}.json"
                response = requests.get(url, auth=(geoserver_user, geoserver_pass))
                
                if response.status_code == 200:
                    data = response.json()
                    # Extract attribute names
                    attributes = [attribute['name'] for attribute in data['featureType']['attributes']['attribute'] 
                                if attribute['name'] != 'the_geom' and attribute['name'] != 'geometry']
            
            elif feature_type == 'raster':
                # For raster layers, check for RAT data
                url = f"{geoserver_url}/rest/workspaces/{workspace}/coveragestores/{layer_name.split(':')[-1]}/coverages/{layer_name.split(':')[-1]}/pam"
                response = requests.get(url, auth=(geoserver_user, geoserver_pass))
                
                if response.status_code == 200:
                    # Parse RAT information from the response
                    from api.raster_routes import parse_pam_xml
                    rat_data = parse_pam_xml(response.text)
                    # Extract columns from the first band
                    if rat_data and len(rat_data) > 0:
                        first_band = list(rat_data.keys())[0]
                        if 'columns' in rat_data[first_band]:
                            attributes = list(rat_data[first_band]['columns'].keys())
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

@sld_bp.route('/styles', methods=['GET'])
@admin_auth_required
@handle_error
def get_layer_styles():
    """
    Get a list of all available styles from GeoServer.
    """
    try:
        geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
        geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
        geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
        
        # Fetch all styles
        styles_url = f"{geoserver_url}/rest/styles.json"
        response = requests.get(styles_url, auth=(geoserver_user, geoserver_pass))
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'message': f'Failed to fetch styles: {response.text}'
            }), response.status_code
        
        styles_data = response.json()
        styles = []
        
        if 'styles' in styles_data and 'style' in styles_data['styles']:
            styles = styles_data['styles']['style']
        
        # Fetch all layers with their styles
        layers_url = f"{geoserver_url}/rest/layers.json"
        response = requests.get(layers_url, auth=(geoserver_user, geoserver_pass))
        
        layers = []
        if response.status_code == 200:
            layers_data = response.json()
            if 'layers' in layers_data and 'layer' in layers_data['layers']:
                layers = layers_data['layers']['layer']
        
        # Combine layer and style information
        result = {
            'styles': styles,
            'layers': layers
        }
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error fetching styles: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch styles: {str(e)}'
        }), 500

@sld_bp.route('/sld', methods=['GET'])
@admin_auth_required
@handle_error
def get_style_sld():
    """
    Get the SLD content for a given style.
    """
    try:
        style_name = request.args.get('name')
        if not style_name:
            return jsonify({
                'success': False,
                'message': 'Style name is required'
            }), 400
        
        geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
        geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
        geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
        
        # Fetch the SLD content
        sld_url = f"{geoserver_url}/rest/styles/{style_name}.sld"
        response = requests.get(sld_url, auth=(geoserver_user, geoserver_pass))
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'message': f'Failed to fetch SLD: {response.text}'
            }), response.status_code
        
        # Return the SLD content
        return jsonify({
            'success': True,
            'name': style_name,
            'sld': response.text
        })
    except Exception as e:
        logger.error(f"Error fetching SLD: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch SLD: {str(e)}'
        }), 500

@sld_bp.route('/create_or_update', methods=['POST'])
@admin_auth_required
@handle_error
def create_or_update_style():
    """
    Create a new style or update an existing one in GeoServer.
    """
    try:
        data = request.json
        style_name = data.get('name')
        sld_content = data.get('sld')
        layer_name = data.get('layer')
        workspace = data.get('workspace', current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample"))
        
        if not style_name or not sld_content:
            return jsonify({
                'success': False,
                'message': 'Style name and SLD content are required'
            }), 400
        
        geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
        geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
        geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
        
        # Check if style exists
        style_check_url = f"{geoserver_url}/rest/styles/{style_name}.json"
        response = requests.get(style_check_url, auth=(geoserver_user, geoserver_pass))
        style_exists = response.status_code == 200
        
        # Create or update the style
        if style_exists:
            # Update existing style
            style_url = f"{geoserver_url}/rest/styles/{style_name}"
            headers = {'Content-Type': 'application/vnd.ogc.sld+xml'}
            response = requests.put(style_url, data=sld_content, headers=headers, auth=(geoserver_user, geoserver_pass))
        else:
            # Create new style
            style_url = f"{geoserver_url}/rest/styles"
            headers = {'Content-Type': 'application/xml'}
            style_xml = f'<style><name>{style_name}</name><filename>{style_name}.sld</filename></style>'
            response = requests.post(style_url, data=style_xml, headers=headers, auth=(geoserver_user, geoserver_pass))
            
            if response.status_code in [201, 200]:
                # Upload SLD content
                sld_url = f"{geoserver_url}/rest/styles/{style_name}"
                headers = {'Content-Type': 'application/vnd.ogc.sld+xml'}
                response = requests.put(sld_url, data=sld_content, headers=headers, auth=(geoserver_user, geoserver_pass))
        
        if response.status_code not in [200, 201]:
            return jsonify({
                'success': False,
                'message': f'Failed to {"update" if style_exists else "create"} style: {response.text}'
            }), response.status_code
        
        # If layer_name is provided, apply the style to the layer
        if layer_name:
            layer_url = f"{geoserver_url}/rest/layers/{workspace}:{layer_name}"
            layer_data = {
                'layer': {
                    'defaultStyle': {
                        'name': style_name
                    }
                }
            }
            response = requests.put(layer_url, json=layer_data, auth=(geoserver_user, geoserver_pass))
            
            if response.status_code not in [200, 201]:
                return jsonify({
                    'success': True,
                    'message': f'Style {"updated" if style_exists else "created"} successfully, but failed to apply to layer: {response.text}'
                })
        
        return jsonify({
            'success': True,
            'message': f'Style {"updated" if style_exists else "created"} successfully' + (f' and applied to layer {layer_name}' if layer_name else '')
        })
    except Exception as e:
        logger.error(f"Error creating/updating style: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to create/update style: {str(e)}'
        }), 500

@sld_bp.route('/templates', methods=['GET'])
@admin_auth_required
@handle_error
def get_style_templates():
    """
    Get available style templates based on feature type.
    """
    try:
        feature_type = request.args.get('type', 'vector')
        
        # Templates for different feature types
        templates = {
            'vector': {
                'point': [
                    {'name': 'simple_point', 'title': 'Simple Point', 'preview': 'circle'},
                    {'name': 'graduated_point', 'title': 'Graduated Point', 'preview': 'circle_graduated'},
                    {'name': 'categorical_point', 'title': 'Categorical Point', 'preview': 'circle_categorical'}
                ],
                'line': [
                    {'name': 'simple_line', 'title': 'Simple Line', 'preview': 'line'},
                    {'name': 'graduated_line', 'title': 'Graduated Line', 'preview': 'line_graduated'},
                    {'name': 'categorical_line', 'title': 'Categorical Line', 'preview': 'line_categorical'}
                ],
                'polygon': [
                    {'name': 'simple_polygon', 'title': 'Simple Polygon', 'preview': 'polygon'},
                    {'name': 'graduated_polygon', 'title': 'Graduated Polygon', 'preview': 'polygon_graduated'},
                    {'name': 'categorical_polygon', 'title': 'Categorical Polygon', 'preview': 'polygon_categorical'}
                ]
            },
            'raster': [
                {'name': 'simple_raster', 'title': 'Simple Raster', 'preview': 'raster'},
                {'name': 'classified_raster', 'title': 'Classified Raster', 'preview': 'raster_classified'},
                {'name': 'rat_raster', 'title': 'RAT Raster', 'preview': 'raster_rat'}
            ]
        }
        
        # Return templates based on feature type
        if feature_type == 'raster':
            return jsonify({
                'success': True,
                'templates': templates['raster']
            })
        else:
            return jsonify({
                'success': True,
                'templates': templates['vector']
            })
            
    except Exception as e:
        logger.error(f"Error fetching style templates: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch style templates: {str(e)}'
        }), 500

@sld_bp.route('/template', methods=['GET'])
@admin_auth_required
@handle_error
def get_style_template():
    """
    Get a specific style template.
    """
    try:
        template_name = request.args.get('name')
        if not template_name:
            return jsonify({
                'success': False,
                'message': 'Template name is required'
            }), 400
            
        # Define basic SLD templates
        templates = {
            'simple_point': """<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>Simple Point</Name>
    <UserStyle>
      <Name>Simple Point</Name>
      <FeatureTypeStyle>
        <Rule>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#3388ff</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>""",

            'simple_line': """<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>Simple Line</Name>
    <UserStyle>
      <Name>Simple Line</Name>
      <FeatureTypeStyle>
        <Rule>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#3388ff</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>""",

            'simple_polygon': """<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>Simple Polygon</Name>
    <UserStyle>
      <Name>Simple Polygon</Name>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#3388ff</CssParameter>
              <CssParameter name="fill-opacity">0.6</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">0.5</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>""",

            'simple_raster': """<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>Simple Raster</Name>
    <UserStyle>
      <Name>Simple Raster</Name>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>1.0</Opacity>
            <ColorMap type="ramp">
              <ColorMapEntry color="#000000" quantity="0" opacity="0"/>
              <ColorMapEntry color="#0000FF" quantity="50" />
              <ColorMapEntry color="#00FF00" quantity="100" />
              <ColorMapEntry color="#FFFF00" quantity="150" />
              <ColorMapEntry color="#FF0000" quantity="200" />
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>"""
        }
        
        # Check if template exists
        if template_name not in templates:
            return jsonify({
                'success': False,
                'message': f'Template {template_name} not found'
            }), 404
            
        return jsonify({
            'success': True,
            'name': template_name,
            'sld': templates[template_name]
        })
        
    except Exception as e:
        logger.error(f"Error fetching style template: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch style template: {str(e)}'
        }), 500

def register_routes(app):
    """
    Register the SLD API routes with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    app.register_blueprint(sld_bp)
    
    # Also register the main editor page
    app.add_url_rule('/sld_editor', 'sld_editor_page', sld_editor_page)
