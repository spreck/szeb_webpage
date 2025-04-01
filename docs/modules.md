# Cone Scouting Tool Modules Documentation

## Overview

The Cone Scouting Tool application has been refactored into a modular architecture consisting of several specialized modules. This document provides a comprehensive overview of each module, its responsibilities, and how they work together.

## Module Structure

### 1. Configuration Modules

#### `species_config.js`

This module contains the configuration data for all species available in the application.

**Responsibilities:**
- Store species metadata (display name, scientific name, vector/raster layers)
- Define attribute sections and items for each species
- Control species visibility through enabled flag

**Usage:**
```javascript
// To access the species configuration
const douglasFir = speciesConfig.psme;
console.log(douglasFir.displayName); // "Douglas Fir"
```

#### `species_manager.js`

This class provides methods for accessing and filtering species data.

**Responsibilities:**
- Filter enabled species
- Provide consistent access to species properties
- Get default species
- Map between species IDs and layer names

**Usage:**
```javascript
// Create species manager instance
const speciesManager = new SpeciesManager(speciesConfig);

// Get only enabled species
const enabledSpecies = speciesManager.getEnabledSpecies();

// Get specific species
const douglasFir = speciesManager.getSpecies('psme');

// Get layer names
const rasterLayer = speciesManager.getRasterLayer('psme');
```

#### `attribute_utils.js`

This module provides utility functions for working with attribute data.

**Responsibilities:**
- Format attribute values with appropriate units
- Process and transform attribute data
- Parse SZEB strings

**Usage:**
```javascript
// Format an attribute value
const formattedValue = formatAttributeValue(1234.56, 'roads_mi');
console.log(formattedValue); // "1235"

// Parse a SZEB string
const { seedZone, elevationBand } = parseSZEB('123_4500');
console.log(seedZone); // "123"
console.log(elevationBand); // "4500"

// Process feature properties
const processed = processFeatureProperties(rawProperties);
```

### 2. Component Modules

#### `AttributeTable.js`

A React component for displaying feature attributes in a formatted table.

**Responsibilities:**
- Render feature attributes in a structured format
- Apply appropriate formatting to values
- Display species information in table header

**Usage:**
```javascript
// Render the attribute table
ReactDOM.render(
  React.createElement(AttributeTable, { 
    properties: featureProperties, 
    speciesId: 'psme' 
  }),
  containerElement
);
```

### 3. Core Modules

#### `map-manager.js`

Manages the Leaflet map instance and all map-related operations.

**Responsibilities:**
- Initialize the map with appropriate layers and controls
- Manage layer visibility and styling
- Handle feature highlighting
- Fetch and display legends
- Manage map click events

**Usage:**
```javascript
// Create map manager instance
const mapManager = new MapManager({
  mapElementId: 'map',
  initialView: [38, -122],
  initialZoom: 8,
  geoserverConfig: {...}
});

// Initialize the map
const map = mapManager.initMap();

// Update the raster layer
mapManager.updateRasterLayer('SZEBxPsme_raster_4326', 'TotalSZEBRanking', {
  topTenOnly: true
});

// Highlight a feature
mapManager.highlightFeature(geojsonFeature);
```

#### `roi-manager.js`

Handles Region of Interest (ROI) functionality.

**Responsibilities:**
- Upload ROI files to the server
- Fetch and display ROI from the server
- Generate download URLs for ROI-related data
- Clear ROI display

**Usage:**
```javascript
// Create ROI manager instance
const roiManager = new RoiManager(map);

// Upload a ROI file
await roiManager.uploadRoi(file);

// Fetch and display ROI
await roiManager.fetchAndDisplayRoi();

// Clear ROI
roiManager.clearRoi();

// Get download URL
const url = roiManager.getVectorDownloadUrl('szeb_psme_vector');
```

#### `ui-controller.js`

Manages UI interactions, form handling, and state management.

**Responsibilities:**
- Initialize UI elements
- Handle UI events (dropdown changes, button clicks, etc.)
- Coordinate between other modules
- Manage application state

**Usage:**
```javascript
// Create UI controller instance
const uiController = new UiController({
  speciesManager: speciesManager,
  mapManager: mapManager,
  roiManager: roiManager
});

// Initialize UI
await uiController.initialize();
```

### 4. Admin Modules

#### `species-admin.js`

Provides the functionality for the species administration interface.

**Responsibilities:**
- Load and display species data
- Handle species creation and editing
- Toggle species enabled status
- Submit data to the server API

**Usage:**
This module is loaded automatically on the admin page.

## Integration Between Modules

The modules are integrated in the following way:

1. `script.js` initializes all modules and orchestrates their interaction:
   ```javascript
   // Initialize modules
   const speciesManager = new SpeciesManager(speciesConfig);
   const mapManager = new MapManager({...});
   const map = mapManager.initMap();
   const roiManager = new RoiManager(map);
   const uiController = new UiController({
     speciesManager,
     mapManager,
     roiManager
   });
   
   // Initialize UI
   uiController.initialize();
   
   // Set map click handler
   mapManager.setClickHandler(handleMapClick);
   ```

2. When a map feature is clicked, the click handler uses all modules:
   ```javascript
   async function handleMapClick(e) {
     // Get species from species manager
     const species = speciesManager.getSpecies(selectedSpeciesId);
     
     // Use map manager to highlight the feature
     mapManager.highlightFeature(boundaryData);
     
     // Use React component to render attributes
     ReactDOM.render(
       React.createElement(AttributeTable, { 
         properties, 
         speciesId: selectedSpeciesId 
       }),
       container
     );
   }
   ```

3. The UI controller coordinates actions between modules:
   ```javascript
   async handleSpeciesChange(event) {
     const newSpeciesId = event.target.value;
     this.state.currentSpeciesId = newSpeciesId;
     
     // Use species manager to get species info
     const species = this.speciesManager.getSpecies(newSpeciesId);
     
     // Update UI
     this.rebuildAttributeDropdown(newSpeciesId);
     
     // Use map manager to update the display
     await this.mapManager.updateRasterLayer(
       species.rasterLayer, 
       this.state.currentAttribute
     );
     
     // Update background
     await this.updateSidebarBackground(newSpeciesId);
   }
   ```

## Backend Integration

The frontend modules interact with the backend through:

1. **GeoServer WMS/WFS requests** - For map layers and feature info
2. **Species API endpoints** - For managing species data
3. **ROI endpoints** - For uploading and retrieving ROIs

## Testing

Each module has corresponding test files in the `tests/module_tests/` directory:

- `species_manager.test.js` - Tests for the Species Manager
- `ui_controller.test.js` - Tests for the UI Controller
- More test files for other modules

## Adding New Modules

To add a new module:

1. Create a new JavaScript file in the appropriate directory
2. Define the module's class or functions
3. Make the module available globally if needed
4. Update `index.html` to include the new module
5. Integrate the module in `script.js` or other modules as needed

## Best Practices

When working with modules:

1. **Keep Responsibilities Clear** - Each module should have a specific purpose
2. **Use JSDoc Comments** - Document all functions and classes
3. **Follow Naming Conventions** - Use consistent naming for functions and variables
4. **Write Tests** - Create tests for all new modules
5. **Update Documentation** - Add new modules to this documentation
