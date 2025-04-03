# GeoServer API Implementation Review - Part 2: Sample Data Analysis and Improved Design

## 4. Sample Data Analysis

Based on the sample data provided, the following patterns are observed:

### 4.1 Raster Data Pattern

The raster files follow a naming convention such as:
- `SZEBxPipo_raster_4326.tif` - Ponderosa Pine (PIPO) raster
- `SZEBxPsme_raster_4326.tif` - Douglas Fir (PSME) raster

These rasters contain RAT data with multiple attributes that represent different categories and values, including:
- Climate Exposure Risk Categories
- Current Supply Categories
- Fire Intensity Risk Categories
- Landowner Demand Categories
- Operational Priority Categories
- Projected Demand Categories

### 4.2 Vector Data Pattern

The vector shapefiles correspond to the raster boundaries:
- `szeb_pipo_vector_unit_4326.shp` - Vector boundary for PIPO
- `szeb_psme_vector_unit_4326.shp` - Vector boundary for PSME

### 4.3 Style Pattern

The styles follow a naming convention that indicates:
1. The species (PIPO or PSME)
2. The raster name
3. The band index (b0)
4. The attribute being symbolized

For example: `SZEBxPipo_raster_4326_b0_ClimateExposureRiskCategory.xml`

### 4.4 Key Attributes in Sample Data

The sample data indicates several important attributes that need to be symbolized:

**For PIPO rasters:**
- ClimateExposureRiskCategory
- CurrentSupplyCategory (also appears as CurrentSupplyCat)
- FireIntensityRiskCategory
- LandownerDemandCategory (also appears as LandownerDemandCat)
- OperationalPriorityCategory
- ProjectedDemandCategory (also appears as ProjectedDemandCat)
- SZEB_Area_km2
- OrigVal
- Shape_Area
- Shape_Length

**For PSME rasters:**
- ClimateExposureRiskCategory (also appears as ClimateExposureRiskCat)
- CombinedRiskCategory
- CurrentSupplyCategory (also appears as CurrentSupplyCat)
- FireIntensityRiskCategory
- LandownerDemandCategory (also appears as LandownerDemandCat)
- OperationalPriorityCategory
- ProjectedDemandCategory (also appears as ProjectedDemandCat)
- SZEB_area_km2
- OrigVal
- Shape_Area
- Shape_Length

## 5. Improved Implementation Design

### 5.1 Enhanced Raster Upload Process

```python
def upload_raster_with_rat(workspace, raster_file_path, species_code):
    """Upload a raster file and process its RAT attributes"""
    # Extract base name from file
    file_name = os.path.basename(raster_file_path)
    base_name = os.path.splitext(file_name)[0]
    
    # Create coverage store name
    store_name = f"SZEBx{species_code}_raster"
    
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
    rat_data = get_rat_attributes(workspace, store_name, coverage_name)
    
    # 5. Generate styles for each RAT attribute
    generated_styles = []
    for band_idx, band_data in rat_data.items():
        for column_name in band_data.get('columns', {}).keys():
            style_name = f"{store_name}_b{band_idx}_{column_name}"
            style_generated = generate_rat_style(
                workspace, store_name, coverage_name, 
                band_idx, column_name, style_name
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

def generate_rat_style(workspace, store, coverage, band, classification, style_name):
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
    
    return response.status_code in [200, 201, 303]
```

### 5.2 Vector Layer Integration

```python
def upload_vector_boundary(workspace, shapefile_path, species_code, raster_coverage_name):
    """Upload vector boundary that corresponds to a raster layer"""
    # Extract base name from file
    file_name = os.path.basename(shapefile_path)
    base_name = os.path.splitext(file_name)[0]
    
    # Create store name
    store_name = f"szeb_{species_code.lower()}_vector"
    
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
        create_vector_outline_style(workspace, style_name)
        
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
            [raster_coverage_name, store_name]
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

def create_vector_outline_style(workspace, style_name):
    """Create a basic outline style for vector data"""
    # 1. Create style entry
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
    sld_content = f'''
    <?xml version="1.0" encoding="UTF-8"?>
    <StyledLayerDescriptor version="1.0.0" 
        xmlns="http://www.opengis.net/sld" 
        xmlns:ogc="http://www.opengis.net/ogc" 
        xmlns:xlink="http://www.w3.org/1999/xlink" 
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
        <NamedLayer>
            <n>Vector Outline</n>
            <UserStyle>
                <n>{style_name}</n>
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

### 5.3 Complete Integration Process

```python
def process_species_data(workspace, raster_path, vector_path, species_code):
    """Process both raster and vector data for a species"""
    # 1. Upload and process raster
    raster_result = upload_raster_with_rat(workspace, raster_path, species_code)
    
    # 2. Upload and process vector boundary
    vector_result = upload_vector_boundary(
        workspace, vector_path, species_code, 
        raster_result['coverage_name']
    )
    
    # 3. Return combined results
    return {
        'species': species_code,
        'raster': raster_result,
        'vector': vector_result
    }
```
