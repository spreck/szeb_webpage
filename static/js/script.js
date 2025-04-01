/**
 * Main Script for Cone Scouting Tool
 * 
 * This file is the entry point for the application.
 * It initializes the modules and orchestrates their interaction.
 * 
 * @author Original Developer
 * @author Claude (Refactor)
 */

console.log("script.js loaded");

// Debug flag
const DEBUG = true;

// Modules
let speciesManager;
let mapManager;
let roiManager;
let uiController;
let geoServerConnection;

/**
 * Feature info handler for map clicks
 * Retrieves and displays attribute data for the clicked location
 * 
 * @param {Object} e - Leaflet click event
 */
async function handleMapClick(e) {
  const lat = e.latlng.lat.toFixed(6);
  const lng = e.latlng.lng.toFixed(6);
  
  // Get the currently selected species
  const selectedSpeciesId = document.getElementById("rasterSelect").value;
  const species = speciesManager.getSpecies(selectedSpeciesId);
  
  if (!species) {
    console.error("Selected species not found:", selectedSpeciesId);
    return;
  }
  
  const rasterLayer = species.rasterLayer;
  const vectorLayer = species.vectorLayer;

  const mapContainer = document.querySelector('.map-container');
  const tableContainer = document.getElementById('table-container');
  const clickInfoBody = document.getElementById("clickInfoBody");

  // Create CAST tool URL for the clicked location
  const castToolUrl = `https://reforestationtools.org/climate-adapted-seed-tool/cast-v-0-059/?_inputs_&selectedLocationType=%22Seed%20Source%22&lat=${lat}&lon=${lng}`;

  // Create popup content with links to external tools
  const popupContent = `
    <div>
      <p>Lat: ${lat}, Lng: ${lng}</p>
      <a href="${castToolUrl}" target="_blank" class="text-blue-600 hover:text-blue-800">Climate-Adapted Seed Tool</a><br>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="text-blue-600 hover:text-blue-800">Google Maps Driving Directions</a>
    </div>
  `;

  // Create or update persistent popup
  let persistentPopup = L.popup({ maxWidth: 300, autoClose: false, closeOnClick: false })
    .setLatLng(e.latlng)
    .setContent(popupContent)
    .openOn(mapManager.map);

  // Update UI layout for feature info display
  if (!mapContainer.classList.contains('map-container-move-up')) {
    mapContainer.classList.add('map-container-move-up');
  }
  if (!tableContainer.classList.contains('table-move-up')) {
    tableContainer.classList.add('table-move-up');
  }
  mapManager.invalidateSize();

  // Show loading message in the feature info panel
  clickInfoBody.innerHTML = '<div class="p-4 text-center">Loading attribute data...</div>';

  try {
    // Use the GeoServerConnection for feature queries
    const featureInfo = await geoServerConnection.getFeatureInfo(
      rasterLayer,
      e.latlng,
      mapManager.map,
      { env: "addAttributeTable:true" }
    );

    if (!featureInfo.features || featureInfo.features.length === 0) {
      clickInfoBody.innerHTML = '<div class="p-4">No data available at this location.</div>';
      return;
    }

    const grayIndex = featureInfo.features[0].properties.GRAY_INDEX;
    if (grayIndex === 0 || grayIndex == null) {
      clickInfoBody.innerHTML = '<div class="p-4">No valid data at this location.</div>';
      return;
    }

    // Get detailed vector data based on the identified feature
    const vectorData = await geoServerConnection.getFeature(
      vectorLayer,
      `OBJECTID=${grayIndex}`,
      { cacheKey: `vector_${vectorLayer}_${grayIndex}` }
    );

    if (!vectorData.features || vectorData.features.length === 0) {
      clickInfoBody.innerHTML = '<div class="p-4">Could not retrieve attribute data.</div>';
      return;
    }

    // Render attribute table
    const properties = vectorData.features[0].properties;
    const container = document.createElement("div");
    clickInfoBody.innerHTML = "";
    clickInfoBody.appendChild(container);
    
    // Use the AttributeTable component with the current species ID
    ReactDOM.render(
      React.createElement(window.AttributeTable, { properties, speciesId: selectedSpeciesId }),
      container
    );

    // Add SZEB boundary highlight
    try {
      const boundaryData = await geoServerConnection.getFeature(
        "szebs_raw_boundaries_4326",
        `INTERSECTS(the_geom, POINT(${lng} ${lat}))`,
        { cacheKey: `boundary_${lng}_${lat}` }
      );
      
      if (boundaryData.features && boundaryData.features.length > 0) {
        // Highlight the SZEB boundary
        mapManager.highlightFeature(boundaryData, {}, 5000);
      }
    } catch (boundaryError) {
      console.warn("Failed to load SZEB boundary highlight:", boundaryError);
    }

  } catch (error) {
    console.error("Error retrieving data:", error);
    clickInfoBody.innerHTML =
      '<div class="p-4 text-red-600">Error loading attribute data. Check console for details.</div>';
  }
}

/**
 * Initialize application
 * This function is called when the DOM is loaded
 */
async function initApp() {
  try {
    // Initialize GeoServer configuration
    // Get the GeoServer URL from the data attribute or environment
    const geoserverUrl = document.body.getAttribute('data-geoserver-url') || 
                          "http://conescout.duckdns.org/geoserver";
    const workspace = document.body.getAttribute('data-workspace') || 
                      "SZEB_sample";
    
    // Update the global GeoServer configuration
    window.geoServerConfig.update({
      url: geoserverUrl,
      workspace: workspace,
      enableHealthCheck: true
    });
    
    // Initialize GeoServer connection
    geoServerConnection = new GeoServerConnection(window.geoServerConfig);
    
    // Initialize Species Manager
    speciesManager = new SpeciesManager(speciesConfig);
    
    // Initialize Map Manager with GeoServer configuration
    mapManager = new MapManager({
      mapElementId: "map",
      initialView: [38, -122],
      initialZoom: 8,
      geoserverConfig: window.geoServerConfig.getConfig()
    });
    
    // Initialize map - await in case it's async
    const map = await mapManager.initMap();
    
    // Initialize ROI Manager with the map
    roiManager = new RoiManager(map);
    
    // Initialize UI Controller
    uiController = new UiController({
      speciesManager: speciesManager,
      mapManager: mapManager,
      roiManager: roiManager
    });
    
    // Initialize UI - await in case it's async
    await uiController.initialize();
    
    // Set map click handler
    mapManager.setClickHandler(handleMapClick);
    
    if (DEBUG) {
      console.log("Application initialized");
      
      // Expose modules to global scope for debugging
      window.app = {
        speciesManager,
        mapManager,
        roiManager,
        uiController,
        geoServerConnection,
        geoServerConfig: window.geoServerConfig
      };
    }
  } catch (error) {
    console.error("Error initializing application:", error);
    // Display error to user
    const mapElement = document.getElementById("map");
    if (mapElement) {
      mapElement.innerHTML = `
        <div class="alert alert-danger m-3">
          <h4>Application Error</h4>
          <p>There was a problem initializing the application. Please try refreshing the page.</p>
          <p><small>Error details: ${error.message}</small></p>
        </div>
      `;
    }
  }
}

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initApp().catch(err => {
    console.error("Initialization error:", err);
  });
});
