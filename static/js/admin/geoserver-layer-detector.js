/**
 * GeoServer Layer Attributes Detector
 * 
 * This script provides functionality to detect attributes from existing GeoServer layers
 * and automatically populate the species attribute configuration form.
 */

class GeoServerLayerDetector {
  constructor() {
    this.geoserverUrl = null;
    this.workspace = null;
    this.init();
  }
  
  /**
   * Initialize the detector
   */
  init() {
    // Get GeoServer URL from configuration
    if (window.geoserverConfig) {
      this.geoserverUrl = window.geoserverConfig.baseUrl;
      this.workspace = window.geoserverConfig.workspace;
    } else {
      // Try to get from meta tags
      const metaGeoserver = document.querySelector('meta[name="geoserver-url"]');
      const metaWorkspace = document.querySelector('meta[name="geoserver-workspace"]');
      
      if (metaGeoserver) {
        this.geoserverUrl = metaGeoserver.getAttribute('content');
      }
      
      if (metaWorkspace) {
        this.workspace = metaWorkspace.getAttribute('content');
      }
    }
    
    if (!this.geoserverUrl) {
      console.error('GeoServer URL not found in configuration or meta tags');
    }
  }
  
  /**
   * Detect attributes from a vector layer
   * @param {string} layerName - The name of the layer
   * @returns {Promise<Object>} - Promise resolving to attributes object
   */
  async detectVectorAttributes(layerName) {
    try {
      if (!this.geoserverUrl || !layerName) {
        throw new Error('GeoServer URL or layer name not provided');
      }
      
      const workspace = this.workspace || 'SZEB_sample';
      
      // Construct WFS GetFeature request URL
      const wfsUrl = `${this.geoserverUrl}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=${workspace}:${layerName}&outputFormat=application/json&count=1`;
      
      // Fetch a sample feature
      const response = await fetch(wfsUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch layer attributes: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('No features found in layer');
      }
      
      // Extract properties from the first feature
      const properties = data.features[0].properties;
      
      // Organize attributes by categories
      return this.organizeAttributes(properties);
      
    } catch (error) {
      console.error('Error detecting vector attributes:', error);
      throw error;
    }
  }
  
  /**
   * Organize attributes into categories
   * @param {Object} properties - The feature properties
   * @returns {Object} - Organized attributes by category
   */
  organizeAttributes(properties) {
    const attributes = {
      basics: {
        label: 'Basic Information',
        items: {}
      },
      risks: {
        label: 'Risk Factors',
        items: {}
      },
      operations: {
        label: 'Operational Factors',
        items: {}
      }
    };
    
    // Helper function to format attribute display name
    const formatDisplayName = (name) => {
      return name
        .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
        .replace(/_/g, ' ')         // Replace underscores with spaces
        .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
        .trim()                     // Trim whitespace
        .split(' ')                 // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
        .join(' ');                 // Join words back together
    };
    
    // Categorize attributes based on name patterns
    for (const [key, value] of Object.entries(properties)) {
      // Skip geometry field and internal IDs
      if (key === 'geometry' || key === 'id' || key === 'fid' || key === 'gid') {
        continue;
      }
      
      const displayName = formatDisplayName(key);
      
      // Categorize by key patterns
      if (key.toLowerCase().includes('risk') || 
          key.toLowerCase().includes('climate') || 
          key.toLowerCase().includes('fire') || 
          key.toLowerCase().includes('exposure')) {
        attributes.risks.items[key] = displayName;
      } 
      else if (key.toLowerCase().includes('demand') || 
               key.toLowerCase().includes('supply') || 
               key.toLowerCase().includes('priority') || 
               key.toLowerCase().includes('operational')) {
        attributes.operations.items[key] = displayName;
      } 
      else {
        // Default to basic information
        attributes.basics.items[key] = displayName;
      }
    }
    
    // Remove empty sections
    for (const [section, data] of Object.entries(attributes)) {
      if (Object.keys(data.items).length === 0) {
        delete attributes[section];
      }
    }
    
    return attributes;
  }
  
  /**
   * Populate form with detected attributes
   * @param {Object} attributes - The detected attributes
   * @param {string} formPrefix - Prefix for form field names (for edit form)
   */
  populateAttributeForm(attributes, formPrefix = '') {
    const attributeSections = document.getElementById(
      formPrefix ? `${formPrefix}AttributeSections` : 'attributeSections'
    );
    
    if (!attributeSections) {
      console.error('Attribute sections container not found');
      return;
    }
    
    // Clear existing attribute sections
    attributeSections.innerHTML = '';
    
    // Add each section
    for (const [sectionKey, sectionData] of Object.entries(attributes)) {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'attribute-section';
      
      // Section header
      sectionDiv.innerHTML = `
        <div class="d-flex justify-content-between">
          <h6>${sectionData.label}</h6>
        </div>
        <div id="${formPrefix}${sectionKey}Attributes">
        </div>
        <button type="button" class="btn btn-sm btn-outline-primary mt-2 add-attribute" data-section="${formPrefix}${sectionKey}">Add Attribute</button>
      `;
      
      attributeSections.appendChild(sectionDiv);
      
      const attributesContainer = document.getElementById(`${formPrefix}${sectionKey}Attributes`);
      
      // Add attributes
      for (const [attrKey, attrLabel] of Object.entries(sectionData.items)) {
        const row = document.createElement('div');
        row.className = 'row attribute-row mb-2';
        row.innerHTML = `
          <div class="col-md-5">
            <input type="text" class="form-control" name="${formPrefix}${sectionKey}.key[]" value="${attrKey}" required>
          </div>
          <div class="col-md-5">
            <input type="text" class="form-control" name="${formPrefix}${sectionKey}.value[]" value="${attrLabel}" required>
          </div>
          <div class="col-md-2">
            <button type="button" class="btn btn-danger btn-sm remove-attribute">Remove</button>
          </div>
        `;
        
        attributesContainer.appendChild(row);
      }
    }
  }
}

// Initialize detector when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.layerDetector = new GeoServerLayerDetector();
  
  // Add event listeners for detect buttons
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('detect-attributes-btn')) {
      const layerField = document.getElementById(event.target.dataset.layerField);
      const formPrefix = event.target.dataset.formPrefix || '';
      
      if (!layerField || !layerField.value) {
        alert('Please enter a layer name first');
        return;
      }
      
      const btn = event.target;
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Detecting...';
      
      window.layerDetector.detectVectorAttributes(layerField.value)
        .then(attributes => {
          window.layerDetector.populateAttributeForm(attributes, formPrefix);
          btn.textContent = 'Detected!';
          setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
          }, 1500);
        })
        .catch(error => {
          alert(`Failed to detect attributes: ${error.message}`);
          btn.textContent = originalText;
          btn.disabled = false;
        });
    }
  });
});
