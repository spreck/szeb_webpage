/**
 * Map Manager Test Suite
 * 
 * Tests the MapManager functionality and integration with GeoServerConnection
 */

// Import or mock required modules
const { GeoServerConfig } = require('../../static/js/modules/geoserver-config.test');
const { GeoServerConnection } = require('../../static/js/modules/geoserver-connection.test');

// Use a mock for the map-manager module
class MapManager {
  constructor(config) {
    this.config = config || {};
    this.mapElementId = config.mapElementId || "map";
    this.initialView = config.initialView || [38, -122];
    this.initialZoom = config.initialZoom || 8;
    
    // Initialize GeoServer connection
    if (config.geoserverConfig) {
      global.geoServerConfig.update(config.geoserverConfig);
    }
    
    this.geoserver = new GeoServerConnection(global.geoServerConfig);
    
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
    
    this.overlayLayers = {};
  }

  initMap() {
    if (this.initialized) {
      return this.map;
    }

    this.map = L.map(this.mapElementId).setView(this.initialView, this.initialZoom);
    this.createMapPanes();
    this.baseLayers.aerial.addTo(this.map);
    this.initOverlayLayers();
    this.initialized = true;
    return this.map;
  }

  createMapPanes() {
    const panes = ["rasterPane", "szebPane", "roadsPane", "bufferedRoadsPane", "highlightPane"];
    
    panes.forEach((paneName) => {
      this.map.createPane(paneName);
    });
  }

  initOverlayLayers() {
    try {
      this.overlayLayers = {
        szebBoundaries: this.geoserver.getWmsLayer("szebs_raw_boundaries_4326", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
          pane: "szebPane"
        }),
        
        elevationBands: this.geoserver.getWmsLayer("Elev_bands", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
          pane: "szebPane"
        }),
        
        seedZones: this.geoserver.getWmsLayer("SZEBs", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
          pane: "szebPane"
        }),
        
        roads: this.geoserver.getWmsLayer("roads_ca_4326", {
          format: "image/png",
          transparent: true,
          version: "1.1.0",
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
      this.showError && this.showError("Failed to initialize map layers");
    }
  }

  getStyleName(rasterLayerName, attributeName, options = {}) {
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
        styleName = `${rasterLayerName}_b0_${attributeName}`;
    }
    
    return styleName;
  }

  updateRasterLayer(rasterLayerName, attributeName, options = {}) {
    if (!this.initialized) {
      this.initMap();
    }
    
    this.showLoading && this.showLoading();
    
    try {
      if (this.currentRasterLayer) {
        this.map.removeLayer(this.currentRasterLayer);
      }

      if (!rasterLayerName || !attributeName) {
        this.hideLoading && this.hideLoading();
        return null;
      }

      const styleName = this.getStyleName(rasterLayerName, attributeName, options);
      
      this.currentRasterLayer = this.geoserver.getWmsLayer(rasterLayerName, {
        styles: styleName,
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        opacity: 0.65,
        pane: "rasterPane"
      });

      this.currentRasterLayer.addTo(this.map);
      return this.currentRasterLayer;
    } catch (error) {
      this.hideLoading && this.hideLoading();
      this.showError && this.showError(`Failed to update layer: ${error.message}`);
      return null;
    }
  }

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
      const legendURL = await this.geoserver.getLegendUrl(layerName, styleName);
      
      const legendHTML = `<img src="${legendURL}" alt="Legend Image" />`;
      
      if (container) {
        container.innerHTML = legendHTML;
      }
      
      return legendHTML;
    } catch (error) {
      if (container) {
        container.innerHTML = "Legend unavailable";
      }
      
      return "Legend unavailable";
    }
  }

  highlightFeature(geojson, options = {}, duration = 5000) {
    try {
      if (this.highlightLayer) {
        this.map.removeLayer(this.highlightLayer);
      }

      const defaultStyle = {
        color: "#00f",
        weight: 3,
        opacity: 1,
        fillOpacity: 0
      };

      const style = { ...defaultStyle, ...options };

      this.highlightLayer = L.geoJSON(geojson, {
        style: style,
        pane: "highlightPane"
      }).addTo(this.map);

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
      return null;
    }
  }

  showError(message) {
    if (!this.errorContainer) {
      this.errorContainer = document.createElement('div');
      this.errorMessageElement = document.createElement('span');
      this.errorContainer.appendChild(this.errorMessageElement);
      
      if (this.map) {
        this.map.getContainer().appendChild(this.errorContainer);
      }
    }
    
    this.errorMessageElement.textContent = message;
    this.errorContainer.style.display = 'block';
  }

  hideError() {
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
    }
  }

  showLoading() {
    if (!this.loadingIndicator) {
      this.loadingIndicator = document.createElement('div');
      
      if (this.map) {
        this.map.getContainer().appendChild(this.loadingIndicator);
      }
    }
    
    this.loadingIndicator.style.display = 'block';
  }

  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }
  }

  getBounds() {
    return this.map?.getBounds();
  }
  
  getSize() {
    return this.map?.getSize();
  }
  
  invalidateSize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }
}

// Add to global scope for tests
global.MapManager = MapManager;

describe('MapManager', () => {
  let config;
  let mapManager;
  
  beforeEach(() => {
    // Create a fresh DOM environment
    document.body.innerHTML = '<div id="map"></div>';
    
    // Create MapManager instance
    mapManager = new MapManager({
      mapElementId: 'map',
      initialView: [0, 0],
      initialZoom: 5,
      geoserverConfig: {
        url: 'http://example.com/geoserver',
        workspace: 'test_workspace'
      }
    });
  });
  
  describe('constructor', () => {
    test('initializes with default values', () => {
      const defaultMapManager = new MapManager();
      
      expect(defaultMapManager.mapElementId).toBe('map');
      expect(defaultMapManager.initialView).toEqual([38, -122]);
      expect(defaultMapManager.initialZoom).toBe(8);
    });
    
    test('initializes GeoServerConnection', () => {
      expect(mapManager.geoserver).toBeDefined();
      expect(mapManager.geoserver instanceof GeoServerConnection).toBeTruthy();
    });
    
    test('updates GeoServerConfig with provided options', () => {
      expect(global.geoServerConfig.update).toHaveBeenCalledWith({
        url: 'http://example.com/geoserver',
        workspace: 'test_workspace'
      });
    });
  });
  
  describe('initMap', () => {
    test('initializes Leaflet map with correct options', () => {
      const map = mapManager.initMap();
      
      expect(L.map).toHaveBeenCalledWith('map');
      expect(map.setView).toHaveBeenCalledWith([0, 0], 5);
    });
    
    test('initializes map only once', () => {
      mapManager.initMap();
      mapManager.initMap();
      
      expect(L.map).toHaveBeenCalledTimes(1);
    });
    
    test('creates map panes', () => {
      mapManager.initMap();
      
      // Check that all required panes are created
      expect(mapManager.map.createPane).toHaveBeenCalledWith('rasterPane');
      expect(mapManager.map.createPane).toHaveBeenCalledWith('szebPane');
      expect(mapManager.map.createPane).toHaveBeenCalledWith('roadsPane');
      expect(mapManager.map.createPane).toHaveBeenCalledWith('bufferedRoadsPane');
      expect(mapManager.map.createPane).toHaveBeenCalledWith('highlightPane');
    });
    
    test('adds initial base layer', () => {
      mapManager.initMap();
      
      expect(mapManager.baseLayers.aerial.addTo).toHaveBeenCalled();
    });
  });
  
  describe('initOverlayLayers', () => {
    beforeEach(() => {
      mapManager.map = L.map('map');
      mapManager.showError = jest.fn();
    });

    test('initializes overlay layers using GeoServerConnection', () => {
      // Mock getWmsLayer 
      const mockGetWmsLayer = jest.spyOn(mapManager.geoserver, 'getWmsLayer')
        .mockImplementation(() => ({ addTo: jest.fn() }));
      
      mapManager.initOverlayLayers();
      
      expect(mockGetWmsLayer).toHaveBeenCalledWith('szebs_raw_boundaries_4326', expect.any(Object));
      expect(mockGetWmsLayer).toHaveBeenCalledWith('Elev_bands', expect.any(Object));
      expect(mockGetWmsLayer).toHaveBeenCalledWith('SZEBs', expect.any(Object));
      expect(mockGetWmsLayer).toHaveBeenCalledWith('roads_ca_4326', expect.any(Object));
      expect(mockGetWmsLayer).toHaveBeenCalledWith('roads_ca_buffer', expect.any(Object));
      
      mockGetWmsLayer.mockRestore();
    });
    
    test('handles layer initialization errors', () => {
      // Mock getWmsLayer to throw an error
      jest.spyOn(mapManager.geoserver, 'getWmsLayer')
        .mockImplementationOnce(() => {
          throw new Error('Layer initialization failed');
        });
      
      mapManager.initOverlayLayers();
      
      expect(mapManager.showError).toHaveBeenCalled();
    });
  });
  
  describe('getStyleName', () => {
    test('returns correct style name for Range attribute', () => {
      const style = mapManager.getStyleName('test_layer', 'Range');
      expect(style).toBe('test_layer_range');
    });
    
    test('returns correct style name for TotalSZEBRanking attribute', () => {
      const style = mapManager.getStyleName('test_layer', 'TotalSZEBRanking');
      expect(style).toBe('test_layer_b0_TotalSZEBRanking');
    });
    
    test('adds top10 suffix for TotalSZEBRanking with topTenOnly option', () => {
      const style = mapManager.getStyleName('test_layer', 'TotalSZEBRanking', { topTenOnly: true });
      expect(style).toBe('test_layer_b0_TotalSZEBRanking_top10');
    });
    
    test('returns default style name for other attributes', () => {
      const style = mapManager.getStyleName('test_layer', 'OtherAttribute');
      expect(style).toBe('test_layer_b0_OtherAttribute');
    });
  });
  
  describe('updateRasterLayer', () => {
    beforeEach(() => {
      mapManager.map = {
        removeLayer: jest.fn(),
        hasLayer: jest.fn().mockReturnValue(true)
      };
      mapManager.showLoading = jest.fn();
      mapManager.hideLoading = jest.fn();
      mapManager.showError = jest.fn();
      
      // Mock GeoServerConnection methods
      jest.spyOn(mapManager.geoserver, 'getWmsLayer')
        .mockImplementation(() => ({
          addTo: jest.fn().mockReturnThis(),
          on: jest.fn().mockReturnThis()
        }));
    });
    
    test('gets layer from GeoServerConnection and adds it to map', () => {
      const result = mapManager.updateRasterLayer('test_layer', 'test_attribute');
      
      expect(mapManager.showLoading).toHaveBeenCalled();
      expect(mapManager.geoserver.getWmsLayer).toHaveBeenCalledWith('test_layer', expect.objectContaining({
        styles: 'test_layer_b0_test_attribute'
      }));
      expect(result).not.toBeNull();
    });
    
    test('removes existing layer before adding new one', () => {
      mapManager.currentRasterLayer = { on: jest.fn() };
      
      mapManager.updateRasterLayer('test_layer', 'test_attribute');
      
      expect(mapManager.map.removeLayer).toHaveBeenCalledWith(mapManager.currentRasterLayer);
    });
    
    test('handles errors gracefully', () => {
      // Force an error
      jest.spyOn(mapManager.geoserver, 'getWmsLayer')
        .mockImplementationOnce(() => {
          throw new Error('Layer update failed');
        });
      
      const result = mapManager.updateRasterLayer('test_layer', 'test_attribute');
      
      expect(mapManager.hideLoading).toHaveBeenCalled();
      expect(mapManager.showError).toHaveBeenCalled();
      expect(result).toBeNull();
    });
    
    test('does nothing if layer name or attribute is not provided', () => {
      const result = mapManager.updateRasterLayer();
      
      expect(mapManager.hideLoading).toHaveBeenCalled();
      expect(mapManager.geoserver.getWmsLayer).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
  
  describe('fetchLegend', () => {
    beforeEach(() => {
      // Create container for legend
      document.body.innerHTML = '<div id="legend-container"></div>';
      jest.spyOn(mapManager.geoserver, 'getLegendUrl')
        .mockResolvedValue('http://example.com/legend.png');
    });
    
    test('returns early if style name is not provided', async () => {
      const container = document.getElementById('legend-container');
      const result = await mapManager.fetchLegend('test_layer', '', container);
      
      expect(result).toBe('Select an attribute');
      expect(container.innerHTML).toBe('Select an attribute');
    });
    
    test('fetches legend URL and creates HTML', async () => {
      const container = document.getElementById('legend-container');
      
      const result = await mapManager.fetchLegend('test_layer', 'test_style', container);
      
      expect(mapManager.geoserver.getLegendUrl).toHaveBeenCalledWith('test_layer', 'test_style');
      expect(result).toContain('<img src="http://example.com/legend.png"');
      expect(container.innerHTML).toContain('<img src="http://example.com/legend.png"');
    });
    
    test('handles legend loading errors', async () => {
      jest.spyOn(mapManager.geoserver, 'getLegendUrl')
        .mockRejectedValueOnce(new Error('Legend loading failed'));
        
      const container = document.getElementById('legend-container');
      
      const result = await mapManager.fetchLegend('test_layer', 'test_style', container);
      
      expect(result).toBe('Legend unavailable');
      expect(container.innerHTML).toBe('Legend unavailable');
    });
  });
  
  describe('error handling', () => {
    test('showError creates error container if needed', () => {
      mapManager.map = { getContainer: jest.fn().mockReturnValue(document.createElement('div')) };
      mapManager.showError('Test error message');
      
      expect(mapManager.errorContainer).toBeDefined();
      expect(mapManager.errorMessageElement.textContent).toBe('Test error message');
      expect(mapManager.errorContainer.style.display).toBe('block');
    });
    
    test('hideError hides the error container', () => {
      mapManager.errorContainer = document.createElement('div');
      mapManager.hideError();
      
      expect(mapManager.errorContainer.style.display).toBe('none');
    });
    
    test('showLoading creates loading indicator if needed', () => {
      mapManager.map = { getContainer: jest.fn().mockReturnValue(document.createElement('div')) };
      mapManager.showLoading();
      
      expect(mapManager.loadingIndicator).toBeDefined();
      expect(mapManager.loadingIndicator.style.display).toBe('block');
    });
    
    test('hideLoading hides the loading indicator', () => {
      mapManager.loadingIndicator = document.createElement('div');
      mapManager.hideLoading();
      
      expect(mapManager.loadingIndicator.style.display).toBe('none');
    });
  });
});
