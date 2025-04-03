# GeoServer API Reference for Layer and Style Management

This document provides a comprehensive reference for using the GeoServer REST API specifically for the tasks of:
1. Adding raster layers
2. Adding vector layers
3. Creating and managing styles (including RAT symbolization)
4. Associating styles with layers

## Key API Concepts

### Authentication

All GeoServer REST API calls require authentication. The following pattern is used:

```
curl -u username:password -X METHOD http://geoserver_url/rest/...
```

### Content Types

The GeoServer REST API supports multiple content types:
- `application/xml` or `text/xml` for XML content
- `application/json` for JSON content
- `application/vnd.ogc.sld+xml` for SLD content
- `application/zip` for ZIP packages

## 1. Workspace Management

Workspaces are containers for stores, layers, and styles. Creating or using the correct workspace is essential before adding layers or styles.

### 1.1 List Workspaces

**Request:**
```
GET /rest/workspaces
```

**Example:**
```bash
curl -u admin:geoserver -XGET http://localhost:8080/geoserver/rest/workspaces.json
```

### 1.2 Create a Workspace

**Request:**
```
POST /rest/workspaces
Content-Type: text/xml

<workspace>
  <name>workspace_name</name>
</workspace>
```

**Example:**
```bash
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<workspace><name>SZEB_sample</name></workspace>" \
     http://localhost:8080/geoserver/rest/workspaces
```

## 2. Adding Raster Layers

### 2.1 Create a Coverage Store (Raster Store)

**Request:**
```
POST /rest/workspaces/{workspace}/coveragestores
Content-Type: text/xml

<coverageStore>
  <name>store_name</name>
  <type>GeoTIFF</type>
  <enabled>true</enabled>
</coverageStore>
```

**Example:**
```bash
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<coverageStore><name>example_raster</name><type>GeoTIFF</type><enabled>true</enabled></coverageStore>" \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores
```

### 2.2 Upload Raster Data to a Coverage Store

**Request:**
```
PUT /rest/workspaces/{workspace}/coveragestores/{store}/file.{extension}
Content-Type: application/octet-stream
```

**Example (GeoTIFF):**
```bash
curl -v -u admin:geoserver -XPUT -H "Content-type: application/octet-stream" \
     --data-binary @example.tif \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores/example_raster/file.geotiff
```

### 2.3 Create a Coverage (Raster Layer) from an Existing Store

**Request:**
```
POST /rest/workspaces/{workspace}/coveragestores/{store}/coverages
Content-Type: text/xml

<coverage>
  <name>layer_name</name>
  <title>Layer Title</title>
  <nativeName>native_name</nativeName>
  <srs>EPSG:4326</srs>
  <enabled>true</enabled>
</coverage>
```

**Example:**
```bash
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<coverage><name>example_layer</name><title>Example Layer</title><enabled>true</enabled></coverage>" \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores/example_raster/coverages
```

### 2.4 Access Raster Attribute Table (RAT) Information

**Request:**
```
GET /rest/workspaces/{workspace}/coveragestores/{store}/coverages/{coverage}/pam
```

**Example:**
```bash
curl -v -u admin:geoserver -XGET \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores/example_raster/coverages/example_layer/pam
```

### 2.5 Generate Style from RAT

**Request:**
```
POST /rest/workspaces/{workspace}/coveragestores/{store}/coverages/{coverage}/pam
Parameters:
- band: Band index (integer)
- classification: Column name for classification
- styleName: Optional name for generated style
```

**Example:**
```bash
curl -v -u admin:geoserver -XPOST \
     "http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores/example_raster/coverages/example_layer/pam?band=0&classification=value&styleName=rat_style"
```

## 3. Adding Vector Layers

### 3.1 Create a Data Store (Vector Store)

**Request:**
```
POST /rest/workspaces/{workspace}/datastores
Content-Type: text/xml

<dataStore>
  <name>store_name</name>
  <connectionParameters>
    <entry key="url">file:data/shapefile.shp</entry>
  </connectionParameters>
</dataStore>
```

**Example:**
```bash
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<dataStore><name>vector_store</name><type>Shapefile</type><enabled>true</enabled></dataStore>" \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/datastores
```

### 3.2 Upload a Shapefile

**Request:**
```
PUT /rest/workspaces/{workspace}/datastores/{store}/file.shp
Content-Type: application/zip
```

**Example:**
```bash
curl -v -u admin:geoserver -XPUT -H "Content-type: application/zip" \
     --data-binary @vector_data.zip \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/datastores/vector_store/file.shp
```

### 3.3 Create a Feature Type (Vector Layer) from an Existing Store

**Request:**
```
POST /rest/workspaces/{workspace}/datastores/{store}/featuretypes
Content-Type: text/xml

<featureType>
  <name>layer_name</name>
  <nativeName>native_name</nativeName>
  <title>Layer Title</title>
  <srs>EPSG:4326</srs>
</featureType>
```

**Example:**
```bash
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<featureType><name>vector_layer</name><title>Vector Layer</title></featureType>" \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/datastores/vector_store/featuretypes
```

## 4. Style Management

### 4.1 List All Styles

**Request:**
```
GET /rest/styles
```

**Example:**
```bash
curl -u admin:geoserver -XGET http://localhost:8080/geoserver/rest/styles.json
```

### 4.2 List Styles in a Workspace

**Request:**
```
GET /rest/workspaces/{workspace}/styles
```

**Example:**
```bash
curl -u admin:geoserver -XGET http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/styles.json
```

### 4.3 Get a Specific Style

**Request:**
```
GET /rest/styles/{style}[.sld|.json|.xml]
```

**Example:**
```bash
curl -u admin:geoserver -XGET http://localhost:8080/geoserver/rest/styles/point.sld
```

### 4.4 Create a New Style (Two-Step Process)

**Step 1: Create the style entry**

**Request:**
```
POST /rest/styles
Content-Type: text/xml

<style>
  <name>style_name</name>
  <filename>filename.sld</filename>
</style>
```

**Example:**
```bash
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<style><name>custom_style</name><filename>custom_style.sld</filename></style>" \
     http://localhost:8080/geoserver/rest/styles
```

**Step 2: Upload the SLD content**

**Request:**
```
PUT /rest/styles/{style}
Content-Type: application/vnd.ogc.sld+xml
```

**Example:**
```bash
curl -v -u admin:geoserver -XPUT -H "Content-type: application/vnd.ogc.sld+xml" \
     -d @custom_style.sld \
     http://localhost:8080/geoserver/rest/styles/custom_style
```

### 4.5 Create a New Style in a Single Step (Using ZIP)

**Request:**
```
POST /rest/styles
Content-Type: application/zip
```

**Example:**
```bash
curl -u admin:geoserver -XPOST -H "Content-type: application/zip" \
     --data-binary @style_package.zip \
     http://localhost:8080/geoserver/rest/styles
```

### 4.6 Update an Existing Style

**Request:**
```
PUT /rest/styles/{style}
Content-Type: application/vnd.ogc.sld+xml
```

**Example:**
```bash
curl -u admin:geoserver -XPUT -H "Content-type: application/vnd.ogc.sld+xml" \
     -d @updated_style.sld \
     http://localhost:8080/geoserver/rest/styles/custom_style
```

### 4.7 Delete a Style

**Request:**
```
DELETE /rest/styles/{style}
```

**Example:**
```bash
curl -u admin:geoserver -XDELETE http://localhost:8080/geoserver/rest/styles/custom_style
```

## 5. Associating Styles with Layers

### 5.1 Get Layer Style Information

**Request:**
```
GET /rest/layers/{layer}
```

**Example:**
```bash
curl -u admin:geoserver -XGET http://localhost:8080/geoserver/rest/layers/example_layer.json
```

### 5.2 Update Layer Style

**Request:**
```
PUT /rest/layers/{layer}
Content-Type: application/json

{
  "layer": {
    "defaultStyle": {
      "name": "style_name"
    }
  }
}
```

**Example:**
```bash
curl -u admin:geoserver -XPUT -H "Content-type: application/json" \
     -d '{"layer": {"defaultStyle": {"name": "custom_style"}}}' \
     http://localhost:8080/geoserver/rest/layers/example_layer
```

## 6. Efficient Implementation Approaches

### 6.1 Adding a Raster Layer with RAT-based Styling

For optimal efficiency when adding a raster layer with RAT-based styling, follow this sequence:

1. Create the coverage store
2. Upload the GeoTIFF file
3. Create the coverage (layer)
4. Check RAT information using the PAM endpoint
5. Generate a style using the PAM endpoint with classification parameter
6. Apply the generated style to the layer

**Complete Example:**
```bash
# 1. Create coverage store
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<coverageStore><name>rat_raster</name><type>GeoTIFF</type><enabled>true</enabled></coverageStore>" \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores

# 2. Upload GeoTIFF
curl -v -u admin:geoserver -XPUT -H "Content-type: application/octet-stream" \
     --data-binary @rat_example.tif \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores/rat_raster/file.geotiff

# 3. Create coverage
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<coverage><name>rat_layer</name><title>RAT Example</title><enabled>true</enabled></coverage>" \
     http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores/rat_raster/coverages

# 4. Generate style from RAT (this creates and applies the style in one step)
curl -v -u admin:geoserver -XPOST \
     "http://localhost:8080/geoserver/rest/workspaces/SZEB_sample/coveragestores/rat_raster/coverages/rat_layer/pam?band=0&classification=value&styleName=rat_style"
```

### 6.2 Copying Style from Existing Layer

To copy a style from an existing layer:

1. Get the SLD content from the source style
2. Create a new style with a different name
3. Upload the SLD content to the new style
4. Apply the new style to the target layer

**Complete Example:**
```bash
# 1. Get source style content
curl -u admin:geoserver -XGET http://localhost:8080/geoserver/rest/styles/source_style.sld > source_style.sld

# 2 & 3. Create new style with the same content
curl -v -u admin:geoserver -XPOST -H "Content-type: text/xml" \
     -d "<style><name>copied_style</name><filename>copied_style.sld</filename></style>" \
     http://localhost:8080/geoserver/rest/styles

curl -v -u admin:geoserver -XPUT -H "Content-type: application/vnd.ogc.sld+xml" \
     -d @source_style.sld \
     http://localhost:8080/geoserver/rest/styles/copied_style

# 4. Apply the new style to target layer
curl -u admin:geoserver -XPUT -H "Content-type: application/json" \
     -d '{"layer": {"defaultStyle": {"name": "copied_style"}}}' \
     http://localhost:8080/geoserver/rest/layers/target_layer
```

## 7. Best Practices

### 7.1 Use Appropriate Endpoints

- Use `/coveragestores` for raster data
- Use `/datastores` for vector data
- Use workspace-specific endpoints when working within a workspace

### 7.2 Error Handling

Always check response codes:
- 200/201: Success
- 404: Resource not found
- 403: Unauthorized
- 500: Server error

### 7.3 Content Type Headers

Always specify the correct Content-Type header for your requests:
- Use `application/vnd.ogc.sld+xml` for SLD content
- Use `application/json` or `application/xml` for structured data
- Use `application/zip` for zipped files
- Use `application/octet-stream` for binary files

### 7.4 Performance Considerations

- When uploading large files, consider using compression
- When performing multiple operations, consider batching related requests
- When creating styles, validate the SLD before uploading to avoid server errors

## 8. Improved Approach for Our Project

Based on the GeoServer REST API capabilities, here's the recommended approach for our main tasks:

### 8.1 Adding and Symbolizing Raster Layers

1. **Use the Coverage Store API** to create a store and upload GeoTIFF data in a single step rather than separate operations.
2. **Use the PAM API** to automatically detect and leverage RAT data for styling.
3. **Use style templates** for consistent styling across similar layers.

### 8.2 Style Management

1. **Create styles at the workspace level** for better organization.
2. **Use the direct SLD upload method** rather than separate create-then-upload steps.
3. **Apply styles to layers** using the layer API's style association endpoint.

### 8.3 Vector-Raster Integration

1. When creating vector layers that correspond to rasters, use **consistent naming conventions**.
2. Consider using **style groups** when vector and raster layers need to be displayed together.
3. Use **layer groups** to organize related vector and raster layers.

## 9. Conclusion

This reference document provides comprehensive guidance for using the GeoServer REST API to manage layers and styles specifically for our project's needs. By following these approaches, we can efficiently add raster layers, create and manage styles based on RAT data, and ensure proper integration with vector data.
