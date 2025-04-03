# SLD Editor and GeoServer Integration Continuation Guide

This document provides essential information to continue the work on integrating the SLD Editor v3 with the GeoServer REST API for improved layer management in the SZEB WebGIS platform.

## Current Status and Progress

We've made significant progress in integrating the SLD Editor v3 and enhancing the GeoServer API usage:

1. **SLD Editor v3 Integration**: Created a template-based approach for the SLD Editor page with three main options:
   - Using pre-defined templates
   - Copying styles from existing layers
   - Creating custom styles from scratch

2. **GeoServer API Analysis**: Performed a comprehensive review of the current GeoServer API implementation and identified improvements in:
   - Style management using workspace-specific endpoints
   - RAT attribute detection and styling
   - Vector and raster integration

3. **Implementation Design**: Developed detailed implementation designs for:
   - Enhanced raster upload process with RAT support
   - Vector boundary integration
   - Style template system
   - Layer group creation

## Key Files and Resources

### Implementation Files

- **API Implementation Review**: 
  - `api_implementation_review_part1.md` - Current state and areas for improvement
  - `api_implementation_review_part2.md` - Sample data analysis and improved design
  - `api_implementation_review_part3.md` - Implementation recommendations and SZEB-specific functionality

- **API Reference**: 
  - `geoserver_add_layers_styles_api_reference.md` - Comprehensive reference for GeoServer REST API usage

- **SLD Editor Template**: 
  - `templates/sld_editor_page.html` - Main SLD editor interface
  - `static/js/admin/sld-editor-integration.js` - Integration JavaScript
  - `static/css/sld-editor.css` - Styling for the SLD editor

- **Backend API**: 
  - `api/sld_routes.py` - SLD API endpoints (Blueprint)

### SZEB Sample Data

- **Raster Data**: 
  - Location: `P:\Projects\szeb_geoserver_data_bak\data\converted_rasters`
  - Key files:
    - `SZEBxPipo_raster_4326.tif` - Ponderosa Pine (PIPO) raster
    - `SZEBxPsme_raster_4326.tif` - Douglas Fir (PSME) raster

- **Vector Data**:
  - Location: `P:\Projects\szeb_geoserver_data_bak\data\converted_vectors`
  - Key files:
    - `szeb_pipo_vector_unit_4326.shp` - Vector boundary for PIPO
    - `szeb_psme_vector_unit_4326.shp` - Vector boundary for PSME

- **Style Templates**:
  - Location: `P:\Projects\szeb_geoserver_data_bak\workspaces\SZEB_sample\styles`

### API Reference URLs

- GeoServer REST API:
  - Main Documentation: https://docs.geoserver.org/stable/en/user/rest/index.html
  - Workspaces API: https://docs.geoserver.org/stable/en/user/rest/workspaces.html
  - Datastores API: https://docs.geoserver.org/stable/en/user/rest/stores.html
  - Coveragestores API: http://docs.geoserver.org/latest/en/api/#1.0.0/coveragestores.yaml
  - Layers API: https://docs.geoserver.org/stable/en/user/rest/layers.html
  - Styles API: https://docs.geoserver.org/stable/en/user/rest/styles.html

## Implementation Plan for Next Steps

### 1. Complete the SLD Editor Integration

1. Create a build script for bundling the SLD Editor v3 source:
   - Use the `build-sld-editor.sh` script
   - Ensure the bundled JS is properly referenced in the templates

2. Implement the remaining API endpoints:
   - `get_layer_for_styling`: Retrieve layer information for styling
   - `get_style_templates`: Get compatible templates for a layer
   - `get_existing_styles`: Get existing styles for copying

3. Enhance the SLD editor interface to support:
   - Template-based styling
   - Style copying from existing layers
   - Custom SLD editing

### 2. Improve Raster and RAT Handling

1. Implement the enhanced raster upload process:
   - Automatic RAT attribute detection
   - Style generation for key attributes
   - Support for the specific SZEB attributes

2. Create the style template system:
   - Pre-defined color schemes for different attribute categories
   - Support for copying existing styles
   - User-defined customization options

### 3. Add Vector Integration

1. Implement vector boundary handling:
   - Automatic detection of corresponding vector files
   - Vector outline styling
   - Layer group creation for combined visualization

2. Create layer groups for efficient management:
   - Species-based layer groups
   - Attribute-based layer groups
   - Combined vector-raster layer groups

### 4. Testing and Quality Assurance

1. Test with sample PIPO and PSME data:
   - Verify correct handling of RAT attributes
   - Ensure proper style generation
   - Confirm vector integration

2. Implement error handling and recovery:
   - Robust API request handling
   - Graceful failure recovery
   - User-friendly error messages

## Key Algorithms and Approaches

### 1. RAT Attribute Processing

```python
def get_rat_attributes(workspace, store_name, coverage_name):
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
```

### 2. Style Template System

```python
ATTRIBUTE_COLOR_SCHEMES = {
    "ClimateExposureRiskCategory": {
        "Very Low": "#1A9641",  # Green
        "Low": "#A6D96A",       # Light Green
        "Moderate": "#FFFFBF",  # Yellow
        "High": "#FDAE61",      # Orange
        "Very High": "#D7191C"  # Red
    },
    # Other attribute color schemes...
}

def generate_template_style(template_id, attribute_name, layer_name, workspace):
    """Generate a style from a template"""
    # Select appropriate template
    template_sld = STYLE_TEMPLATES.get(template_id)
    
    if not template_sld:
        raise Exception(f"Template {template_id} not found")
    
    # Customize template with attribute name and color scheme
    attribute_scheme = ATTRIBUTE_COLOR_SCHEMES.get(attribute_name, {})
    # Apply customization...
    
    # Create style in GeoServer
    style_name = f"{layer_name}_{attribute_name}_style"
    create_style(workspace, style_name, customized_sld)
    
    return style_name
```

### 3. Layer Group Creation

```python
def create_layer_group(workspace, group_name, layers, styles=None):
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
```

## Notes on SZEB Data Structure

The SZEB data follows a specific pattern that should be maintained in the implementation:

1. **Species Codes**:
   - PIPO: Ponderosa Pine
   - PSME: Douglas Fir

2. **Key Attributes** (based on style files):
   - ClimateExposureRiskCategory
   - CurrentSupplyCategory
   - FireIntensityRiskCategory
   - LandownerDemandCategory
   - OperationalPriorityCategory
   - ProjectedDemandCategory
   - CombinedRiskCategory (PSME only)

3. **Category Values**:
   - Very Low
   - Low
   - Moderate
   - High
   - Very High

The implementation should respect this structure and provide appropriate styling for each attribute category.

## Conclusion

This continuation guide provides the necessary information to proceed with implementing the SLD Editor integration and GeoServer API enhancements. The goal is to create a robust, user-friendly system for managing SZEB data layers with flexible styling options.

The next phase of work should focus on implementing the improved designs outlined in the API implementation review, completing the SLD Editor integration, and ensuring proper handling of RAT attributes and vector boundaries.
