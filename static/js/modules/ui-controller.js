/**
 * UI Controller Module
 * 
 * Manages UI interactions, form handling, and state management
 * for the Cone Scouting Tool application.
 * 
 * @module UiController
 */

class UiController {
  /**
   * Creates a new UiController instance
   * @param {Object} config - Configuration options
   * @param {SpeciesManager} config.speciesManager - The species manager instance
   * @param {MapManager} config.mapManager - The map manager instance 
   * @param {RoiManager} config.roiManager - The ROI manager instance
   */
  constructor(config) {
    this.speciesManager = config.speciesManager;
    this.mapManager = config.mapManager;
    this.roiManager = config.roiManager;
    
    // DOM elements
    this.elements = {
      rasterDropdown: document.getElementById("rasterSelect"),
      attributeDropdown: document.getElementById("attributeSelect"),
      legendContent: document.getElementById("legend-content"),
      sidebar: document.querySelector(".sidebar"),
      clickInfoBody: document.getElementById("clickInfoBody"),
      topTenCheckbox: document.getElementById("topTenOnlyCheckbox"),
      roiFileInput: document.getElementById("roiFileInput"),
      uploadRoiButton: document.getElementById("uploadRoiButton"),
      zoomToRoiButton: document.getElementById("zoomToRoiButton"),
      customFileButton: document.getElementById("customFileButton"),
      fileNameDisplay: document.getElementById("fileNameDisplay"),
      mapTab: document.getElementById("map-tab"),
      clearRoiLink: document.getElementById("clearRoiLink"),
      downloadVectorBtn: document.getElementById("downloadVectorBtn"),
      downloadCurrentViewBtn: document.getElementById("downloadCurrentViewBtn")
    };
    
    // Initial state
    this.state = {
      currentSpeciesId: null,
      currentAttribute: "Range"
    };
  }

  /**
   * Displays an error message to the user
   * @param {string} message - The error message to display
   * @param {Error} error - Optional Error object with additional details
   */
  showError(message, error = null) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'alert alert-danger alert-dismissible fade show m-3';
    errorContainer.innerHTML = `
      <strong>Error:</strong> ${message}
      ${error ? `<details><pre>${error.toString()}</pre></details>` : ''}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at the top of the content area or map container
    const container = document.querySelector('.map-container') || document.body;
    container.insertBefore(errorContainer, container.firstChild);
    
    // Log to console as well
    console.error(message, error);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      errorContainer.remove();
    }, 10000);
  }

  /**
   * Initialize all UI elements and event listeners
   */
  async initialize() {
    try {
      // Populate species dropdown
      this.populateSpeciesDropdown();
      
      // Get default species
      const defaultSpeciesId = this.speciesManager.getDefaultSpeciesId();
      
      if (!defaultSpeciesId) {
        throw new Error("No enabled species found in configuration");
      }
      
      // Set initial selection
      this.elements.rasterDropdown.value = defaultSpeciesId;
      this.state.currentSpeciesId = defaultSpeciesId;
      
      // Build attribute dropdown
      this.rebuildAttributeDropdown(defaultSpeciesId, "Range");
      
      // Initialize map and sidebar
      await Promise.all([
        this.updateRasterLayer(),
        this.updateSidebarBackground(defaultSpeciesId)
      ]);

      // Check if ROI exists
      try {
        const hasRoi = await this.roiManager.hasRoi();
        this.elements.zoomToRoiButton.disabled = !hasRoi;
      } catch (error) {
        console.error("Error checking ROI existence:", error);
        this.showError("Could not check for existing ROI data", error);
      }
      
      // Attach event listeners
      this.attachEventListeners();
    } catch (error) {
      this.showError("Failed to initialize UI", error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Populate the species dropdown with enabled species
   */
  populateSpeciesDropdown() {
    try {
      const dropdown = this.elements.rasterDropdown;
      if (!dropdown) {
        throw new Error("Species dropdown element not found");
      }
      
      dropdown.innerHTML = '';
      
      const enabledSpecies = this.speciesManager.getEnabledSpecies();
      if (Object.keys(enabledSpecies).length === 0) {
        dropdown.innerHTML = '<option disabled selected>No species available</option>';
        return;
      }
      
      for (const [key, species] of Object.entries(enabledSpecies)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = species.displayName;
        dropdown.appendChild(opt);
      }
    } catch (error) {
      this.showError("Failed to populate species dropdown", error);
    }
  }

  /**
   * Rebuild the attribute dropdown based on selected species
   * @param {string} speciesId - The species identifier
   * @param {string} keepValue - Optional value to keep selected if it exists
   */
  rebuildAttributeDropdown(speciesId, keepValue) {
    try {
      const dropdown = this.elements.attributeDropdown;
      if (!dropdown) {
        throw new Error("Attribute dropdown element not found");
      }
      
      dropdown.innerHTML = '';
      
      const species = this.speciesManager.getSpecies(speciesId);
      if (!species) {
        throw new Error(`Species with ID ${speciesId} not found`);
      }
      
      const sections = species.attributes;
      
      for (const [sectionKey, section] of Object.entries(sections)) {
        if (sectionKey !== 'basics') {
          const divider = document.createElement('option');
          divider.disabled = true;
          divider.className = 'dropdown-divider';
          divider.textContent = '─────────────';
          dropdown.appendChild(divider);
        }
        
        const header = document.createElement('option');
        header.disabled = true;
        header.className = 'dropdown-header';
        header.textContent = section.label;
        dropdown.appendChild(header);
        
        for (const [attrKey, attrLabel] of Object.entries(section.items)) {
          const opt = document.createElement('option');
          opt.value = attrKey;
          opt.textContent = attrLabel;
          dropdown.appendChild(opt);
        }
      }
      
      // Set the dropdown value
      if (keepValue && dropdown.querySelector(`option[value="${keepValue}"]`)) {
        dropdown.value = keepValue;
        this.state.currentAttribute = keepValue;
      } else {
        const firstOption = dropdown.querySelector('option:not([disabled])');
        if (firstOption) {
          dropdown.value = firstOption.value;
          this.state.currentAttribute = firstOption.value;
        }
      }
    } catch (error) {
      this.showError("Failed to build attribute dropdown", error);
    }
  }

  /**
   * Update the raster layer based on current selection
   */
  async updateRasterLayer() {
    try {
      const speciesId = this.state.currentSpeciesId;
      const attributeName = this.state.currentAttribute;
      
      if (!speciesId) {
        throw new Error("No species selected");
      }
      
      const species = this.speciesManager.getSpecies(speciesId);
      if (!species) {
        throw new Error(`Species with ID ${speciesId} not found`);
      }
      
      const rasterLayer = species.rasterLayer;
      const options = {
        topTenOnly: this.elements.topTenCheckbox && this.elements.topTenCheckbox.checked
      };
      
      // Update the raster layer
      await this.mapManager.updateRasterLayer(rasterLayer, attributeName, options);
      
      // Update legend if needed
      const legendDiv = document.getElementById("legend");
      if (legendDiv) {
        if (attributeName === "Range") {
          legendDiv.style.display = "none";
        } else {
          legendDiv.style.display = "block";
          await this.mapManager.fetchLegend(
            rasterLayer, 
            this.getStyleName(rasterLayer, attributeName, options), 
            this.elements.legendContent
          );
        }
      }
    } catch (error) {
      this.showError("Failed to update map layer", error);
    }
  }

  /**
   * Get the GeoServer style name for a layer and attribute
   * @param {string} rasterLayer - The raster layer name
   * @param {string} attributeName - The attribute name
   * @param {Object} options - Additional options
   * @returns {string} The style name
   */
  getStyleName(rasterLayer, attributeName, options = {}) {
    let styleName = '';
    
    if (attributeName === "Range") {
      styleName = `${rasterLayer}_range`;
    } else if (attributeName) {
      styleName = `${rasterLayer}_b0_${attributeName}`;
    }

    if (attributeName === "TotalSZEBRanking" && options.topTenOnly) {
      styleName += '_top10';
    }
    
    return styleName;
  }

  /**
   * Update the sidebar background with species image
   * @param {string} speciesId - The species ID
   */
  async updateSidebarBackground(speciesId) {
    try {
      const species = this.speciesManager.getSpecies(speciesId);
      if (!species || !species.backgroundImage) {
        this.elements.sidebar.style.backgroundImage = "none";
        return;
      }
      
      this.elements.sidebar.classList.add("loading");
      
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = (e) => reject(new Error(`Failed to load image: ${species.backgroundImage}`));
        img.src = species.backgroundImage;
      });
      
      this.elements.sidebar.style.backgroundImage = `url("${species.backgroundImage}")`;
      this.elements.sidebar.style.backgroundSize = "cover";
      this.elements.sidebar.style.backgroundPosition = "center";
      this.elements.sidebar.style.backgroundRepeat = "no-repeat";
    } catch (error) {
      console.error("Background image loading failed:", error);
      this.elements.sidebar.style.backgroundImage = "none";
    } finally {
      this.elements.sidebar.classList.remove("loading");
    }
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    try {
      // Species selection change
      if (this.elements.rasterDropdown) {
        this.elements.rasterDropdown.addEventListener("change", this.handleSpeciesChange.bind(this));
      }
      
      // Attribute selection change
      if (this.elements.attributeDropdown) {
        this.elements.attributeDropdown.addEventListener("change", this.handleAttributeChange.bind(this));
      }
      
      // Top 10% checkbox change
      if (this.elements.topTenCheckbox) {
        this.elements.topTenCheckbox.addEventListener("change", this.handleTopTenChange.bind(this));
      }
      
      // Map tab click
      if (this.elements.mapTab) {
        this.elements.mapTab.addEventListener("click", this.handleMapTabClick.bind(this));
      }
      
      // ROI file input
      if (this.elements.customFileButton && this.elements.roiFileInput) {
        this.elements.customFileButton.addEventListener("click", () => this.elements.roiFileInput.click());
        this.elements.roiFileInput.addEventListener("change", this.handleRoiFileChange.bind(this));
      }
      
      // ROI actions
      if (this.elements.uploadRoiButton) {
        this.elements.uploadRoiButton.addEventListener("click", this.handleRoiUpload.bind(this));
      }
      
      if (this.elements.zoomToRoiButton) {
        this.elements.zoomToRoiButton.addEventListener("click", this.handleZoomToRoi.bind(this));
      }
      
      if (this.elements.clearRoiLink) {
        this.elements.clearRoiLink.addEventListener("click", this.handleClearRoi.bind(this));
      }
      
      // Download actions
      if (this.elements.downloadVectorBtn) {
        this.elements.downloadVectorBtn.addEventListener("click", this.handleDownloadVector.bind(this));
      }
      
      if (this.elements.downloadCurrentViewBtn) {
        this.elements.downloadCurrentViewBtn.addEventListener("click", this.handleDownloadCurrentView.bind(this));
      }
    } catch (error) {
      this.showError("Failed to attach event listeners", error);
    }
  }

  /**
   * Handle species dropdown change
   * @param {Event} event - The change event
   */
  async handleSpeciesChange(event) {
    try {
      const newSpeciesId = event.target.value;
      const oldAttribute = this.state.currentAttribute;
      
      // Update state
      this.state.currentSpeciesId = newSpeciesId;
      
      // Update attribute dropdown
      this.rebuildAttributeDropdown(newSpeciesId, oldAttribute);
      
      // Get final attribute (may change if old attribute doesn't exist in new species)
      this.state.currentAttribute = this.elements.attributeDropdown.value;
      
      // Update display
      await Promise.all([
        this.updateRasterLayer(),
        this.updateSidebarBackground(newSpeciesId)
      ]);
    } catch (error) {
      this.showError("Failed to change species", error);
    }
  }

  /**
   * Handle attribute dropdown change
   * @param {Event} event - The change event
   */
  async handleAttributeChange(event) {
    try {
      // Update state
      this.state.currentAttribute = event.target.value;
      
      // Update raster layer
      await this.updateRasterLayer();
    } catch (error) {
      this.showError("Failed to change attribute", error);
    }
  }

  /**
   * Handle top 10% checkbox change
   */
  async handleTopTenChange() {
    try {
      await this.updateRasterLayer();
    } catch (error) {
      this.showError("Failed to update display", error);
    }
  }

  /**
   * Handle map tab click
   */
  handleMapTabClick() {
    try {
      setTimeout(() => {
        this.mapManager.invalidateSize();
      }, 300);
    } catch (error) {
      this.showError("Failed to resize map", error);
    }
  }

  /**
   * Handle ROI file selection
   * @param {Event} event - The change event
   */
  handleRoiFileChange(event) {
    try {
      this.elements.fileNameDisplay.textContent = event.target.files.length > 0 
        ? event.target.files[0].name 
        : "No file chosen";
    } catch (error) {
      this.showError("Failed to process selected file", error);
    }
  }

  /**
   * Handle ROI upload
   */
  async handleRoiUpload() {
    try {
      const file = this.elements.roiFileInput.files[0];
      if (!file) {
        throw new Error("Please select a ROI file");
      }
      
      // Show loading indicator
      this.elements.uploadRoiButton.disabled = true;
      this.elements.uploadRoiButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
      
      // Upload the file
      await this.roiManager.uploadRoi(file);
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'alert alert-success alert-dismissible fade show m-3';
      successMsg.innerHTML = `
        <strong>Success!</strong> ROI uploaded successfully.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      const container = document.querySelector('.map-container') || document.body;
      container.insertBefore(successMsg, container.firstChild);
      
      // Enable zoom button
      this.elements.zoomToRoiButton.disabled = false;
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        successMsg.remove();
      }, 5000);
    } catch (error) {
      this.showError("ROI upload failed", error);
    } finally {
      // Reset button state
      this.elements.uploadRoiButton.disabled = false;
      this.elements.uploadRoiButton.innerHTML = 'Upload ROI';
    }
  }

  /**
   * Handle zoom to ROI
   */
  async handleZoomToRoi() {
    try {
      // Show loading indicator
      this.elements.zoomToRoiButton.disabled = true;
      this.elements.zoomToRoiButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
      
      await this.roiManager.fetchAndDisplayRoi();
    } catch (error) {
      this.showError("Failed to retrieve ROI", error);
    } finally {
      // Reset button state
      this.elements.zoomToRoiButton.disabled = false;
      this.elements.zoomToRoiButton.innerHTML = 'Zoom to ROI';
    }
  }

  /**
   * Handle clear ROI
   * @param {Event} event - The click event
   */
  handleClearRoi(event) {
    try {
      event.preventDefault();
      this.roiManager.clearRoi();
      this.elements.zoomToRoiButton.disabled = true;
    } catch (error) {
      this.showError("Failed to clear ROI", error);
    }
  }

  /**
   * Handle download vector data
   * @param {Event} event - The click event
   */
  handleDownloadVector(event) {
    try {
      event.preventDefault();
      
      const speciesId = this.state.currentSpeciesId;
      const species = this.speciesManager.getSpecies(speciesId);
      
      if (!species) {
        throw new Error("No species selected");
      }
      
      const vectorTable = species.vectorLayer;
      if (!vectorTable) {
        throw new Error("No matching vector dataset found");
      }
      
      const url = this.roiManager.getVectorDownloadUrl(vectorTable);
      console.log("Downloading from URL:", url);
      window.location.href = url;
    } catch (error) {
      this.showError("Failed to download vector data", error);
    }
  }

  /**
   * Handle download current view
   * @param {Event} event - The click event
   */
  handleDownloadCurrentView(event) {
    try {
      event.preventDefault();
      
      const speciesId = this.state.currentSpeciesId;
      const species = this.speciesManager.getSpecies(speciesId);
      
      if (!species) {
        throw new Error("No species selected");
      }
      
      const vectorTable = species.vectorLayer;
      if (!vectorTable) {
        throw new Error("No matching vector dataset found");
      }
      
      const url = this.roiManager.getCurrentViewDownloadUrl(vectorTable);
      console.log("Downloading from URL:", url);
      window.location.href = url;
    } catch (error) {
      this.showError("Failed to download current view data", error);
    }
  }
}

// Make the class available globally
window.UiController = UiController;
