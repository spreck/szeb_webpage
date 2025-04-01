/**
 * Map Manager Module (Updated Version)
 * 
 * Handles map initialization, layer management, and map-related interactions.
 * Provides an abstraction layer over Leaflet for the application.
 * 
 * @module MapManager
 */

class MapManager {
  /**
   * Creates a new MapManager instance
   * @param {Object} config - Configuration options
   * @param {string} config.mapElementId - ID of the HTML element for the map
   * @param {Array} config.initialView - Initial map center coordinates [lat, lng]
   * @param {number} config.initialZoom - Initial zoom level
   * @param {Object} config.geoserverConfig - GeoServer configuration
   */
  constructor(config) {
    this.config = config || {};
    this.mapElementId = config.mapElementId || "map";
    this.initialView = config.initialView || [38, -122];
    this.initialZoom = config.initialZoom || 8;
    
    // Initialize GeoServer configuration
    if (config.geoserverConfig) {
      window.geoServerConfig.update(config.geoserverConfig);
    }
    
    // Create GeoServer connection
    this.geoserver = new GeoServerConnection(window.geoServerConfig);
    
    // Set up error handling
    this.setupErrorHandling();
    
    // Internal state
    this.map = null;
    this.initialized = false;
    this.currentRasterLayer = null;
    this.legendCache = new Map();
    this.clickHandler = null;
    this.highlightLayer = null;
    
    // Base layers
    this.baseLayers = {
      osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19
      }),
      aerial: L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Imagery © Esri",
          maxZoom: 19
        }
      )
    };
    
    // Error message container
    this.errorContainer = null;
    
    // Loading indicator
    this.loadingIndicator = null;
    
    // Overlay layers will be initialized later
    this.overlayLayers = {};
  }

  /**
   * Set up error handling for GeoServer connection
   * @private
   */
  setupErrorHandling() {
    // Connection error handler
    this.geoserver.addEventListener('connectionError', (error) => {
      console.error("GeoServer connection error:", error);
      this.showError(`Unable to connect to GeoServer. Please try again later. (${error.message})`);
    });
    
    // Connection restored handler
    this.geoserver.addEventListener('connectionRestored', () => {
      console.log("GeoServer connection restored");
      this.hideError();
      // Refresh current layers if any
      if (this.currentRasterLayer && this.map) {
        this.refreshCurrentLayers();
      }
    });
    
    // Request error handler
    this.geoserver.addEventListener('requestError', (error) => {
      console.warn("GeoServer request error:", error);
      // Only show errors for the last request in a sequence
      if (error.attempt === error.maxRetries) {
        this.showError(`Failed to load map data after multiple attempts. (${error.error.message})`);
      }
    });
  }

  /**
   * Show an error message
   * @param {string} message - Error message to display
   * @private
   */
  showError(message) {
    if (!this.errorContainer) {
      this.errorContainer = document.createElement('div');
      this.errorContainer.className = 'map-error-container';
      this.errorContainer.style.cssText = `
        position: absolute;
        top: 10px;
        left: 50px;
        right: 50px;
        z-index: 1000;
        background: rgba(220, 53, 69, 0.9);
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        display: none;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      `;
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.className = 'close';
      closeButton.style.cssText = `
        float: right;
        font-size: 20px;
        font-weight: bold;
        line-height: 20px;
        color: white;
        text-shadow: 0 1px 0 rgba(0,0,0,0.2);
        opacity: 0.8;
        background: transparent;
        border: none;
        cursor: pointer;
      `;
      closeButton.addEventListener('click', () => {
        this.hideError();
      });
      
      this.errorContainer.appendChild(closeButton);
      this.errorMessageElement = document.createElement('span');
      this.errorContainer.appendChild(this.errorMessageElement);
      
      // Add to map container when available
      if (this.map) {
        this.map.getContainer().appendChild(this.errorContainer);
      }
    }
    
    if (this.map && !this.errorContainer.parentNode) {
      this.map.getContainer().appendChild(this.errorContainer);
    }
    
    this.errorMessageElement.textContent = message;
    this.errorContainer.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideError();
    }, 10000);
  }

  /**
   * Hide the error message
   * @private
   */
  hideError() {
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
    }
  }

  /**
   * Show a loading indicator
   * @private
   */
  showLoading() {
    if (!this.loadingIndicator) {
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'map-loading-indicator';
      this.loadingIndicator.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        background: rgba(255, 255, 255, 0.8);
        padding: 15px 20px;
        border-radius: 4px;
        display: none;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      `;
      
      this.loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">Loading map data...</div>
      `;
      
      // Add spinner style
      const style = document.createElement('style');
      style.textContent = `
        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(0, 123, 255, 0.3);
          border-radius: 50%;
          border-top-color: #007bff;
          animation: spin 1s ease-in-out infinite;
          margin: 0 auto 10px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-text {
          font-size: 14px;
          color: #333;
        }
      `;
      document.head.appendChild(style);
    }
    
    if (this.map && !this.loadingIndicator.parentNode) {
      this.map.getContainer().appendChild(this.loadingIndicator);
    }
    
    this.loadingIndicator.style.display = 'block';
  }

  /**
   * Hide the loading indicator
   * @private
   */
  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }
  }

  /**
   * Initializes the map if not already initialized
   * @returns {L.Map} The Leaflet map instance
   */
  initMap() {
    if (this.initialized) {
      return this.map;
    }

    try {
      // Create map instance
      this.map = L.map(this.mapElementId).setView(this.initialView, this.initialZoom);

      // Add error and loading containers to map
      if (this.errorContainer) {
        this.map.getContainer().appendChild(this.errorContainer);
      }
      if (this.loadingIndicator) {
        this.map.getContainer().appendChild(this.loadingIndicator);
      }

      // Create panes with appropriate z-indexes
      this.createMapPanes();
      
      // Add initial base layer
      this.baseLayers.aerial.addTo(this.map);

      // Init overlay layers
      this.initOverlayLayers();
      
      // Add layer controls
      this.addLayerControls();
      
      // Add scale control
      L.control.scale({ position: "bottomleft", imperial: true, metric: true }).addTo(this.map);

      // Setup minimap
      this.addMiniMap();
      
      // Mark as initialized
      this.initialized = true;
      
      // Ensure map renders correctly after initialization
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
      
      return this.map;
    } catch (error) {
      console.error("Map initialization error:", error);
      const mapElement = document.getElementById(this.mapElementId);
      if (mapElement) {
        mapElement.innerHTML = `
          <div class="alert alert-danger m-3">
            <h4>Map Initialization Error</h4>
            <p>There was a problem initializing the map. Please try refreshing the page.</p>
            <p><small>Error details: ${error.message}</small></p>
          </div>
        `;
      }
      throw error;
    }
  }

  /**
   * Creates panes for layer ordering
   * @private
   */
  createMapPanes() {
    const panes = ["rasterPane", "szebPane", "roadsPane", "bufferedRoadsPane", "highlightPane"];
    
    // Create all necessary panes
    panes.forEach((paneName) => {
      this.map.createPane(paneName);
    });
    
    // Set z-indexes for proper layering
    this.map.getPane("rasterPane").style.zIndex = 450;
    this.map.getPane("szebPane").style.zIndex = 500;
    this.map.getPane("highlightPane").style.zIndex = 525;
    this.map.getPane("roadsPane").style.zIndex = 550;
    this.map.getPane("bufferedRoadsPane").style.zIndex = 600;
    
    // Disable pointer events for all overlay panes
    panes.forEach((paneName) => {
      this.map.getPane(paneName).style.pointerEvents = "none";
    });
  }

  /**
   * Initializes overlay layers
   * @private
   */
  initOverlayLayers() {
    try {
      this.overlayLayers = {
        szebBoundaries: this.geoserver.getWmsLayer("szebs_raw_boundaries_4326", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
          errorTileUrl: "/static/images/error-tile.png",
          pane: "szebPane"
        }),
        
        elevationBands: this.geoserver.getWmsLayer("Elev_bands", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
          errorTileUrl: "/static/images/error-tile.png",
          pane: "szebPane"
        }),
        
        seedZones: this.geoserver.getWmsLayer("SZEBs", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
          errorTileUrl: "/static/images/error-tile.png",
          pane: "szebPane"
        }),
        
        roads: this.geoserver.getWmsLayer("roads_ca_4326", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
          errorTileUrl: "/static/images/error-tile.png",
          pane: "roadsPane"
        }),
        
        roadsBuffered: this.geoserver.getWmsLayer("roads_ca_buffer", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
          styles: "buffer_outline_blue",
          pane: "bufferedRoadsPane"
        })
      };
    } catch (error) {
      console.error("Error initializing overlay layers:", error);
      this.showError("Failed to initialize map layers. Please try refreshing the page.");
    }
  }

  /**
   * Adds layer controls to the map
   * @private
   */
  addLayerControls() {
    const baseMaps = {
      "OpenStreetMap": this.baseLayers.osm,
      "Aerial Imagery": this.baseLayers.aerial
    };
    
    const overlayLayers = {
      "Seed Zones": this.overlayLayers.seedZones,
      "Elevation Bands": this.overlayLayers.elevationBands,
      "SZEB Boundaries": this.overlayLayers.szebBoundaries,
      "Roads": this.overlayLayers.roads,
      "Roads with 50m buffer": this.overlayLayers.roadsBuffered
    };
    
    L.control.layers(baseMaps, overlayLayers, { collapsed: false }).addTo(this.map);
  }

  /**
   * Adds a mini map to the main map
   * @private
   */
  addMiniMap() {
    try {
      const miniMapLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19
      });
      
      new L.Control.MiniMap(miniMapLayer, {
        toggleDisplay: true,
        minimized: false,
        position: "bottomright"
      }).addTo(this.map);
    } catch (error) {
      console.warn("MiniMap initialization error:", error);
      // Non-critical component, so just log warning
    }
  }

  /**
   * Sets up a click handler for the map
   * @param {Function} handler - Function to handle map clicks
   */
  setClickHandler(handler) {
    // Remove existing handler if any
    if (this.clickHandler) {
      this.map.off("click", this.clickHandler);
    }
    
    // Set new handler
    this.clickHandler = handler;
    this.map.on("click", this.clickHandler);
  }

  /**
   * Updates the raster layer based on species and attribute selection
   * @param {string} rasterLayerName - The GeoServer raster layer name
   * @param {string} attributeName - The attribute name for styling
   * @param {Object} options - Additional options
   * @returns {L.TileLayer.WMS} The updated raster layer
   */
  updateRasterLayer(rasterLayerName, attributeName, options = {}) {
    // Initialize map if needed
    if (!this.initialized) {
      this.initMap();
    }
    
    // Show loading indicator
    this.showLoading();
    
    try {
      // Remove existing raster layer
      if (this.currentRasterLayer) {
        this.map.removeLayer(this.currentRasterLayer);
      }

      if (!rasterLayerName || !attributeName) {
        this.hideLoading();
        return null;
      }

      // Determine the style name based on attribute and layer naming convention
      let styleName = this.getStyleName(rasterLayerName, attributeName, options);

      // Create new raster layer with timestamp for cache busting
      const timestamp = new Date().getTime();
      
      // Get layer via GeoServer connection
      this.currentRasterLayer = this.geoserver.getWmsLayer(rasterLayerName, {
        styles: styleName,
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        opacity: 0.65,
        pane: "rasterPane",
        errorTileUrl: "/static/images/error-tile.png",
        params: { _t: timestamp }
      });

      // Add layer to map
      this.currentRasterLayer.addTo(this.map);
      
      // Add event listener for when the layer finishes loading
      this.currentRasterLayer.on('load', () => {
        this.hideLoading();
      });
      
      // Add error handler
      this.currentRasterLayer.on('tileerror', (error) => {
        this.hideLoading();
        console.warn("Tile loading error:", error);
      });
      
      // Set timeout to hide loading indicator if layer doesn't load
      setTimeout(() => {
        this.hideLoading();
      }, 10000);
      
      return this.currentRasterLayer;
    } catch (error) {
      this.hideLoading();
      console.error("Error updating raster layer:", error);
      this.showError(`Failed to update map layer. (${error.message})`);
      return null;
    }
  }

  /**
   * Get style name based on layer naming convention
   * @param {string} rasterLayerName - Base layer name
   * @param {string} attributeName - Attribute to visualize
   * @param {Object} options - Additional options
   * @returns {string} Style name
   * @private
   */
  getStyleName(rasterLayerName, attributeName, options = {}) {
    // Support different naming conventions based on layer type
    let styleName = "";
    
    switch (attributeName) {
      case "Range":
        styleName = `${rasterLayerName}_range`;
        break;
        
      case "TotalSZEBRanking":
        styleName = `${rasterLayerName}_b0_${attributeName}`;
        if (options.topTenOnly) {
          styleName += "_top10";
        }
        break;
        
      default:
        // Default naming convention
        styleName = `${rasterLayerName}_b0_${attributeName}`;
    }
    
    return styleName;
  }

  /**
   * Refreshes current layers
   * @private
   */
  refreshCurrentLayers() {
    if (this.currentRasterLayer && this.map.hasLayer(this.currentRasterLayer)) {
      // Force refresh by removing and re-adding the layer
      const currentLayer = this.currentRasterLayer;
      this.map.removeLayer(currentLayer);
      currentLayer.addTo(this.map);
    }
  }

  /**
   * Fetches and caches legend for the current layer/style
   * @param {string} layerName - The GeoServer layer name
   * @param {string} styleName - The style name
   * @param {HTMLElement} container - DOM element to insert legend into
   * @returns {Promise<string>} Promise resolving to legend HTML
   */
  async fetchLegend(layerName, styleName, container) {
    if (!styleName) {
      if (container) {
        container.innerHTML = "Select an attribute";
      }
      return "Select an attribute";
    }

    if (container) {
      container.innerHTML = "Loading legend...";
    }
    
    try {
      // Get legend URL using the GeoServer connection
      const legendURL = await this.geoserver.getLegendUrl(layerName, styleName);
      
      if (!legendURL) {
        throw new Error("Legend not available");
      }
      
      // Create the HTML
      const legendHTML = `<img src="${legendURL}" alt="Legend Image" />`;
      
      if (container) {
        container.innerHTML = legendHTML;
      }
      
      return legendHTML;
    } catch (error) {
      console.error("Legend loading failed:", error);
      
      if (container) {
        container.innerHTML = "Legend unavailable";
      }
      
      return "Legend unavailable";
    }
  }

  /**
   * Highlights a GeoJSON feature on the map
   * @param {Object} geojson - GeoJSON feature to highlight
   * @param {Object} options - Styling options
   * @param {number} duration - Milliseconds to show highlight before removing
   * @returns {L.GeoJSON} The highlight layer
   */
  highlightFeature(geojson, options = {}, duration = 5000) {
    try {
      // Remove existing highlight if any
      if (this.highlightLayer) {
        this.map.removeLayer(this.highlightLayer);
      }

      const defaultStyle = {
        color: "#00f",
        weight: 3,
        opacity: 1,
        fillOpacity: 0,
        className: "highlight-glow"
      };

      const style = { ...defaultStyle, ...options };

      // Create new highlight layer
      this.highlightLayer = L.geoJSON(geojson, {
        style: style,
        pane: "highlightPane"
      }).addTo(this.map);

      // Auto-remove after specified duration
      if (duration > 0) {
        setTimeout(() => {
          if (this.highlightLayer && this.map.hasLayer(this.highlightLayer)) {
            this.map.removeLayer(this.highlightLayer);
            this.highlightLayer = null;
          }
        }, duration);
      }

      return this.highlightLayer;
    } catch (error) {
      console.error("Error highlighting feature:", error);
      return null;
    }
  }

  /**
   * Clears the highlight layer
   */
  clearHighlight() {
    if (this.highlightLayer) {
      this.map.removeLayer(this.highlightLayer);
      this.highlightLayer = null;
    }
  }

  /**
   * Gets the current map bounds
   * @returns {L.LatLngBounds} The current map bounds
   */
  getBounds() {
    return this.map?.getBounds();
  }
  
  /**
   * Gets the map's current size in pixels
   * @returns {L.Point} The map size
   */
  getSize() {
    return this.map?.getSize();
  }
  
  /**
   * Invalidates the map size (useful after container resizing)
   */
  invalidateSize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }
}

// Make the class available globally
window.MapManager = MapManager;
