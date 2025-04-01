/**
 * ROI (Region of Interest) Manager Module
 * 
 * Handles ROI upload, display, and related operations
 * for the Cone Scouting Tool application.
 * 
 * @module RoiManager
 */

class RoiManager {
  /**
   * Creates a new RoiManager instance
   * @param {L.Map} map - The Leaflet map instance
   */
  constructor(map) {
    this.map = map;
    this.roiLayer = null;
    this.roiData = null;
  }

  /**
   * Upload a ROI file to the server
   * @param {File} file - The file to upload
   * @returns {Promise<Object>} The upload result
   */
  async uploadRoi(file) {
    if (!file) {
      throw new Error("No file provided");
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("File too large (max 10MB)");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/upload_roi", { 
      method: "POST", 
      body: formData 
    });
    
    const data = await response.json();
    
    if (data.status !== "success") {
      throw new Error(data.message || "ROI upload failed");
    }
    
    return data;
  }

  /**
   * Check if a ROI exists on the server
   * @returns {Promise<boolean>} True if ROI exists
   */
  async hasRoi() {
    try {
      const response = await fetch("/has_roi");
      const result = await response.json();
      return result.has_roi;
    } catch (error) {
      console.error("Error checking ROI existence:", error);
      return false;
    }
  }

  /**
   * Fetch and display the ROI from the server
   * @returns {Promise<L.GeoJSON>} The ROI layer
   */
  async fetchAndDisplayRoi() {
    try {
      const response = await fetch("/get_roi");
      const data = await response.json();
      
      if (data.status !== "success") {
        throw new Error(data.message || "Failed to retrieve ROI");
      }
      
      // Store the ROI data
      this.roiData = JSON.parse(data.geojson);
      
      // Create and add GeoJSON layer
      return this.displayRoi();
    } catch (error) {
      console.error("Error fetching ROI:", error);
      throw error;
    }
  }

  /**
   * Display the current ROI data on the map
   * @param {Object} options - Styling options for the ROI
   * @returns {L.GeoJSON} The ROI layer
   */
  displayRoi(options = {}) {
    if (!this.roiData) {
      throw new Error("No ROI data available");
    }
    
    // Remove existing ROI layer if any
    this.clearRoi();
    
    // Default styling
    const defaultStyle = { 
      color: "red", 
      weight: 2,
      fillOpacity: 0.1
    };
    
    // Create new ROI layer
    this.roiLayer = L.geoJSON(this.roiData, { 
      style: { ...defaultStyle, ...options }
    }).addTo(this.map);
    
    // Fit map to ROI bounds
    this.map.fitBounds(this.roiLayer.getBounds());
    
    return this.roiLayer;
  }

  /**
   * Clear the ROI from the map
   */
  clearRoi() {
    if (this.roiLayer) {
      this.map.removeLayer(this.roiLayer);
      this.roiLayer = null;
    }
  }

  /**
   * Download vector data with ROI intersection
   * @param {string} vectorTable - The vector table name
   * @returns {string} The download URL
   */
  getVectorDownloadUrl(vectorTable) {
    if (!vectorTable) {
      throw new Error("No vector table specified");
    }
    
    return `/download_roi_intersection?vector=${encodeURIComponent(vectorTable)}`;
  }

  /**
   * Download data from current map view
   * @param {string} vectorTable - The vector table name
   * @returns {string} The download URL
   */
  getCurrentViewDownloadUrl(vectorTable) {
    if (!vectorTable) {
      throw new Error("No vector table specified");
    }
    
    const bounds = this.map.getBounds();
    const bbox = `${bounds.getSouthWest().lng},${bounds.getSouthWest().lat},${bounds.getNorthEast().lng},${bounds.getNorthEast().lat}`;
    
    return `/download_map_view?vector=${encodeURIComponent(vectorTable)}&bbox=${encodeURIComponent(bbox)}`;
  }
}

// Make the class available globally
window.RoiManager = RoiManager;
