# Adding New Species to the Cone Scouting Tool

This guide explains how to add new species to the Cone Scouting Tool application.

## Using the Admin Interface (Recommended)

The easiest way to add or modify species is using the admin interface:

1. Navigate to `http://[your-server]/admin`
2. Click the "Add New Species" button
3. Fill out the form with the required information
4. Click "Save Species"

### Required Fields

* **Species ID** (no spaces): A unique identifier for the species (e.g., "pipo")
* **Display Name**: The common name shown in the dropdown (e.g., "Ponderosa Pine")
* **Scientific Name**: The scientific name (e.g., "Pinus ponderosa")
* **Vector Layer**: The name of the vector layer in GeoServer
* **Raster Layer**: The name of the raster layer in GeoServer
* **Background Image**: Path to a background image for the species

### Adding Attribute Sections

Each species has attribute sections that group related attributes together:

1. The Basic Information section is included by default
2. To add more sections, click "Add New Attribute Section"
3. Enter a section key (no spaces) and display name
4. Add attributes to the section by clicking "Add Attribute"

## Manual Configuration

If you prefer to edit the configuration file directly, follow these steps:

1. Open `static/js/config/species_config.js`
2. Add a new entry to the `speciesConfig` object:

```javascript
"your_species_id": {
  displayName: "Common Name",
  scientificName: "Scientific name",
  vectorLayer: "szeb_species_vector",
  rasterLayer: "SZEBxSpecies_raster_4326",
  backgroundImage: "/static/images/your-species.jpg",
  enabled: true,
  attributes: {
    basics: {
      label: "Basic Information",
      items: {
        Range: "Range",
        TotalSZEBRanking: "Total SZEB Rank",
        roads_mi: "Roads in Range/SZEB (mi)",
        range_area_km2: "Range Area (ac)"
      }
    },
    risks: {
      label: "Risk Factors",
      items: {
        ClimateExposureRiskCat: "Climate Exposure Risk",
        FireIntensityRiskCat: "Fire Intensity Risk",
        CombinedRiskCategory: "Combined Risk"
      }
    }
  }
}
```

## Configuration Structure

Each species entry has the following structure:

| Property | Description |
|----------|-------------|
| displayName | The common name shown in the dropdown |
| scientificName | The scientific name (shown in table headers) |
| vectorLayer | Name of the vector layer in GeoServer |
| rasterLayer | Name of the raster layer in GeoServer |
| backgroundImage | Path to species background image |
| enabled | Set to true to enable, false to disable |
| attributes | Object containing attribute sections |

Each attribute section has:

| Property | Description |
|----------|-------------|
| label | The section display name |
| items | Object with attribute keys and display names |

## GeoServer Layer Setup

Before adding a species, ensure the GeoServer layers are set up correctly:

### Vector Layer Setup

1. Create a new vector layer in GeoServer (typically a polygon layer)
2. The layer name should follow the convention: `szeb_[species_id]_vector` (e.g., `szeb_pipo_vector`)
3. Ensure the layer has all necessary attribute columns that you want to display in the application
4. Make sure the layer is published in the `SZEB_sample` workspace
5. The layer must be in EPSG:4326 projection for proper display on the map

### Raster Layer Setup

1. Create a raster layer based on the vector data
2. The layer name should follow the convention: `SZEBx[SpeciesId]_raster_4326` (e.g., `SZEBxPipo_raster_4326`)
3. Publish the raster layer in the `SZEB_sample` workspace
4. The raster layer should be in EPSG:4326 projection

### Style Configuration

For each attribute you want to visualize on the map, you need to create a style in GeoServer:

1. Base range style: Named `[raster_layer_name]_range` (e.g., `SZEBxPipo_raster_4326_range`)
2. Attribute-specific styles: Named `[raster_layer_name]_b0_[attribute_name]` (e.g., `SZEBxPipo_raster_4326_b0_TotalSZEBRanking`)

For the `TotalSZEBRanking` attribute, you can also create a top 10% style:
- Name it `[raster_layer_name]_b0_TotalSZEBRanking_top10`

These style naming conventions are critical for the application to correctly render the maps.

## Background Images

Background images should be:

1. Placed in the `static/images/` directory
2. Sized appropriately for the sidebar (recommended ~800px wide)
3. Referenced with the correct path: `/static/images/your-image.jpg`
4. Use high-quality, relevant images with proper attribution
5. Optimized for web display (compressed JPG or PNG format)

## Layer Naming Conventions

The application expects specific naming conventions for the layers:

| Layer Type | Convention | Example |
|------------|------------|---------|
| Vector Layer | `szeb_[species_id]_vector` | `szeb_pipo_vector` |
| Raster Layer | `SZEBx[SpeciesId]_raster_4326` | `SZEBxPipo_raster_4326` |
| Range Style | `[raster_layer_name]_range` | `SZEBxPipo_raster_4326_range` |
| Attribute Style | `[raster_layer_name]_b0_[attribute]` | `SZEBxPipo_raster_4326_b0_TotalSZEBRanking` |

## Special Attribute Handling

Certain attributes receive special handling in the application:

### Range Attribute

The `Range` attribute is always displayed using the `[raster_layer_name]_range` style.

### TotalSZEBRanking Attribute

The `TotalSZEBRanking` attribute can be displayed in two ways:
1. Regular view: Uses the `[raster_layer_name]_b0_TotalSZEBRanking` style
2. Top 10% view: Uses the `[raster_layer_name]_b0_TotalSZEBRanking_top10` style when the "Show Top 10% Only" option is selected

## Troubleshooting

If a species doesn't show up in the application:

1. **Enabling Issues:**
   - Check that `enabled` is set to `true` in the configuration
   - Restart the application after making configuration changes

2. **Layer Name Issues:**
   - Verify that the vector and raster layer names match exactly with GeoServer
   - Check for typos or case sensitivity issues in layer names
   - Confirm the layers are published in the correct workspace

3. **GeoServer Issues:**
   - Ensure GeoServer is running and accessible
   - Check that the layers are correctly published and visible in the GeoServer Layer Preview
   - Verify the layers have the correct projection (EPSG:4326)
   - Check GeoServer logs for any errors related to the layers

4. **Style Issues:**
   - Confirm all required styles are created in GeoServer
   - Check style names follow the convention `[raster_layer_name]_b0_[attribute_name]`
   - Verify the styles are correctly applied to the layers

5. **Attribute Issues:**
   - Ensure all required attribute sections are included
   - Verify that attribute keys in the configuration match the actual column names in the data

6. **Console Errors:**
   - Check browser console for any JavaScript errors
   - Look for network errors when loading layers or styles

## Advanced Customization

For more advanced customization, you can modify:

- `static/js/config/attribute_utils.js` - For changing attribute formatting
- `static/js/components/AttributeTable.js` - For customizing the attribute display
- `static/js/modules/map-manager.js` - For modifying map behavior and layer handling

### Adding New Attribute Types

If you need to add a new type of attribute with special handling:

1. Update `attribute_utils.js` to include formatting for the new attribute
2. Modify `map-manager.js` if the attribute requires special rendering behavior
3. Create the appropriate styles in GeoServer
4. Add the attribute to the species configuration

## Need Help?

If you need assistance, please contact the development team at [contact email].
