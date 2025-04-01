/**
 * Raster Uploader Script
 * 
 * Handles the upload of raster data to GeoServer and the detection/application
 * of RAT (Raster Attribute Table) styles.
 */

class RasterUploader {
  constructor() {
    this.geoserverUrl = null;
    this.workspace = null;
    this.files = [];
    this.auxFile = null;
    this.tifFile = null;
    this.uploadedStore = null;
    this.uploadedLayer = null;
    this.ratData = null;
    
    this.init();
  }
  
  /**
   * Initialize the uploader
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
    
    // Set workspace value
    const workspaceSelect = document.getElementById('workspace');
    if (workspaceSelect && this.workspace) {
      workspaceSelect.value = this.workspace;
    }
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // File selector 
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('rasterFile');
    const removeButton = document.getElementById('removeFile');
    
    if (uploadArea && fileInput) {
      // Click on upload area
      uploadArea.addEventListener('click', () => {
        fileInput.click();
      });
      
      // File selection
      fileInput.addEventListener('change', (event) => {
        this.handleFileSelection(event.target.files);
      });
      
      // Drag and drop
      uploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadArea.classList.add('dragover');
      });
      
      uploadArea.addEventListener('dragleave', (event) => {
        event.preventDefault();
        uploadArea.classList.remove('dragover');
      });
      
      uploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        uploadArea.classList.remove('dragover');
        this.handleFileSelection(event.dataTransfer.files);
      });
      
      // Remove file button
      if (removeButton) {
        removeButton.addEventListener('click', () => {
          this.files = [];
          this.auxFile = null;
          this.tifFile = null;
          fileInput.value = '';
          document.getElementById('fileInfo').style.display = 'none';
          document.getElementById('uploadProgress').style.display = 'none';
        });
      }
    }
    
    // Form submission
    const uploadForm = document.getElementById('rasterUploadForm');
    if (uploadForm) {
      uploadForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.uploadRaster();
      });
    }
    
    // Generate style button
    const generateStyleButton = document.getElementById('generateStyleButton');
    if (generateStyleButton) {
      generateStyleButton.addEventListener('click', () => {
        this.generateRatStyle();
      });
    }
  }
  
  /**
   * Handle file selection
   * @param {FileList} fileList - The selected files
   */
  handleFileSelection(fileList) {
    if (!fileList || fileList.length === 0) {
      return;
    }
    
    // Reset previous selection
    this.files = [];
    this.auxFile = null;
    this.tifFile = null;
    
    // Process files
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      this.files.push(file);
      
      // Look for GeoTIFF and aux.xml files
      if (file.name.toLowerCase().endsWith('.aux.xml')) {
        this.auxFile = file;
      } else if (file.name.toLowerCase().match(/\.(tif|tiff|geotiff)$/)) {
        this.tifFile = file;
      }
    }
    
    // Update UI
    if (this.tifFile) {
      document.getElementById('fileInfo').style.display = 'block';
      document.getElementById('fileName').textContent = this.tifFile.name;
      
      // Convert file size to readable format
      const size = this.tifFile.size;
      let sizeStr;
      if (size < 1024) {
        sizeStr = size + ' bytes';
      } else if (size < 1024 * 1024) {
        sizeStr = (size / 1024).toFixed(1) + ' KB';
      } else {
        sizeStr = (size / (1024 * 1024)).toFixed(1) + ' MB';
      }
      
      document.getElementById('fileSize').textContent = `Size: ${sizeStr}${this.auxFile ? ' (+ aux.xml)' : ''}`;
      
      // Auto-fill store and layer names based on file name
      const baseName = this.tifFile.name.replace(/\.(tif|tiff|geotiff)$/i, '');
      const sanitizedName = baseName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      
      const storeNameInput = document.getElementById('storeName');
      const layerNameInput = document.getElementById('layerName');
      
      if (storeNameInput && !storeNameInput.value) {
        storeNameInput.value = sanitizedName;
      }
      
      if (layerNameInput && !layerNameInput.value) {
        layerNameInput.value = sanitizedName;
      }
    } else {
      document.getElementById('fileInfo').style.display = 'none';
      alert('Please select a GeoTIFF file');
    }
  }
  
  /**
   * Upload raster to GeoServer
   */
  async uploadRaster() {
    try {
      // Validate inputs
      if (!this.tifFile) {
        throw new Error('Please select a GeoTIFF file');
      }
      
      const workspace = document.getElementById('workspace').value;
      const storeName = document.getElementById('storeName').value;
      const layerName = document.getElementById('layerName').value || storeName;
      
      if (!workspace || !storeName) {
        throw new Error('Please fill in all required fields');
      }
      
      // Update UI
      const uploadButton = document.getElementById('uploadButton');
      const progressBar = document.getElementById('uploadProgress');
      const progressIndicator = progressBar.querySelector('.progress-bar');
      
      uploadButton.disabled = true;
      uploadButton.textContent = 'Uploading...';
      progressBar.style.display = 'block';
      progressIndicator.style.width = '0%';
      
      this.showStatus('info', 'Uploading raster file...');
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', this.tifFile);
      if (this.auxFile) {
        formData.append('aux_file', this.auxFile);
      }
      formData.append('workspace', workspace);
      formData.append('store_name', storeName);
      formData.append('layer_name', layerName);
      
      // Upload the file
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload_raster', true);
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          progressIndicator.style.width = `${percentComplete}%`;
        }
      };
      
      // Handle response
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            
            if (response.success) {
              this.uploadedStore = storeName;
              this.uploadedLayer = layerName;
              
              this.showStatus('success', `Raster uploaded successfully! ${response.message || ''}`);
              
              // If RAT was detected, update UI and show RAT info
              if (response.rat_detected) {
                this.ratData = response.rat_data;
                this.displayRatInfo();
              }
            } else {
              throw new Error(response.message || 'Unknown error');
            }
          } catch (error) {
            this.showStatus('error', `Error parsing response: ${error.message}`);
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            throw new Error(response.message || `Server returned status ${xhr.status}`);
          } catch (error) {
            throw new Error(`Upload failed: ${error.message}`);
          }
        }
      };
      
      xhr.onerror = () => {
        this.showStatus('error', 'Network error occurred during upload');
      };
      
      xhr.onloadend = () => {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload Raster';
      };
      
      xhr.send(formData);
      
    } catch (error) {
      this.showStatus('error', error.message);
      document.getElementById('uploadButton').disabled = false;
      document.getElementById('uploadButton').textContent = 'Upload Raster';
    }
  }
  
  /**
   * Display RAT information in the UI
   */
  displayRatInfo() {
    if (!this.ratData) {
      return;
    }
    
    const ratInfo = document.getElementById('ratInfo');
    const ratBandSelect = document.getElementById('ratBand');
    const ratAttributeSelect = document.getElementById('ratAttribute');
    const ratAttributesBody = document.getElementById('ratAttributesBody');
    
    if (!ratInfo || !ratBandSelect || !ratAttributeSelect || !ratAttributesBody) {
      console.error('RAT UI elements not found');
      return;
    }
    
    // Show RAT info panel
    ratInfo.style.display = 'block';
    
    // Clear previous options
    ratBandSelect.innerHTML = '';
    ratAttributeSelect.innerHTML = '';
    ratAttributesBody.innerHTML = '';
    
    // Add band options
    Object.keys(this.ratData).forEach(band => {
      const option = document.createElement('option');
      option.value = band;
      option.textContent = `Band ${band}`;
      ratBandSelect.appendChild(option);
    });
    
    // Add attribute options for the first band
    const firstBand = Object.keys(this.ratData)[0];
    if (firstBand && this.ratData[firstBand].columns) {
      // Find suitable classification columns 
      // (prefer 'Class', 'Category', 'Value', etc.)
      const preferredColumns = ['class', 'category', 'value', 'classification', 'type', 'id'];
      let defaultColumn = null;
      
      Object.keys(this.ratData[firstBand].columns).forEach(column => {
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
        ratAttributeSelect.appendChild(option);
        
        // Check if this is a preferred column
        if (!defaultColumn) {
          const lowerColumn = column.toLowerCase();
          for (const preferred of preferredColumns) {
            if (lowerColumn.includes(preferred)) {
              defaultColumn = column;
              break;
            }
          }
        }
      });
      
      // Select default column if found
      if (defaultColumn) {
        ratAttributeSelect.value = defaultColumn;
      }
      
      // Display attribute values in table
      this.updateRatAttributeTable(firstBand);
    }
    
    // Event listeners for band and attribute changes
    ratBandSelect.addEventListener('change', () => {
      const selectedBand = ratBandSelect.value;
      
      // Update attribute options
      ratAttributeSelect.innerHTML = '';
      
      if (this.ratData[selectedBand] && this.ratData[selectedBand].columns) {
        Object.keys(this.ratData[selectedBand].columns).forEach(column => {
          const option = document.createElement('option');
          option.value = column;
          option.textContent = column;
          ratAttributeSelect.appendChild(option);
        });
      }
      
      // Update attribute table
      this.updateRatAttributeTable(selectedBand);
    });
    
    // Update style name suggestion
    const styleName = document.getElementById('styleName');
    if (styleName) {
      const layerName = this.uploadedLayer || document.getElementById('layerName').value;
      styleName.value = `${layerName}_${firstBand}_${ratAttributeSelect.value}`;
      
      // Update style name when attribute changes
      ratAttributeSelect.addEventListener('change', () => {
        styleName.value = `${layerName}_${ratBandSelect.value}_${ratAttributeSelect.value}`;
      });
    }
  }
  
  /**
   * Update RAT attribute table with values
   * @param {string} band - The band to display
   */
  updateRatAttributeTable(band) {
    const ratAttributesBody = document.getElementById('ratAttributesBody');
    if (!ratAttributesBody || !this.ratData[band]) {
      return;
    }
    
    // Clear table
    ratAttributesBody.innerHTML = '';
    
    // Get column data
    const columns = this.ratData[band].columns || {};
    const rows = this.ratData[band].rows || [];
    
    // Display first 10 rows max
    const displayRows = rows.slice(0, 10);
    
    // Get currently selected attribute
    const selectedAttribute = document.getElementById('ratAttribute').value;
    
    // Create rows
    displayRows.forEach(row => {
      const tr = document.createElement('tr');
      
      // Value column
      const tdValue = document.createElement('td');
      tdValue.textContent = row.value || '';
      tr.appendChild(tdValue);
      
      // Classification column
      const tdClass = document.createElement('td');
      tdClass.textContent = row[selectedAttribute] || '';
      tdClass.className = 'fw-bold';
      tr.appendChild(tdClass);
      
      // Other attributes
      const tdOther = document.createElement('td');
      const otherAttrs = [];
      
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'value' && key !== selectedAttribute && key !== 'histogram') {
          otherAttrs.push(`${key}: ${value}`);
        }
      }
      
      tdOther.textContent = otherAttrs.join(', ');
      tr.appendChild(tdOther);
      
      ratAttributesBody.appendChild(tr);
    });
    
    // Add message if there are more rows
    if (rows.length > 10) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.className = 'text-center text-muted';
      td.textContent = `...and ${rows.length - 10} more rows`;
      tr.appendChild(td);
      ratAttributesBody.appendChild(tr);
    }
  }
  
  /**
   * Generate a RAT-based style
   */
  async generateRatStyle() {
    try {
      if (!this.uploadedStore || !this.uploadedLayer) {
        throw new Error('No raster layer uploaded yet');
      }
      
      const workspace = document.getElementById('workspace').value;
      const band = document.getElementById('ratBand').value;
      const classification = document.getElementById('ratAttribute').value;
      let styleName = document.getElementById('styleName').value;
      
      if (!styleName) {
        styleName = `${this.uploadedLayer}_${band}_${classification}`;
      }
      
      // Update UI
      const generateButton = document.getElementById('generateStyleButton');
      generateButton.disabled = true;
      generateButton.textContent = 'Generating...';
      
      this.showStatus('info', 'Generating RAT style...');
      
      // Generate style using RAT API
      const response = await fetch('/api/generate_rat_style', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspace,
          store: this.uploadedStore,
          coverage: this.uploadedLayer,
          band,
          classification,
          styleName
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.showStatus('success', `Style generated successfully! Style name: ${data.styleName}`);
        
        // Add a "View Layer" button
        const statusDiv = document.getElementById('uploadStatus');
        if (statusDiv) {
          const viewButton = document.createElement('a');
          viewButton.href = `/?layer=${workspace}:${this.uploadedLayer}`;
          viewButton.className = 'btn btn-primary mt-3';
          viewButton.textContent = 'View Layer on Map';
          viewButton.target = '_blank';
          statusDiv.appendChild(viewButton);
        }
      } else {
        throw new Error(data.error || 'Unknown error generating style');
      }
      
    } catch (error) {
      this.showStatus('error', error.message);
    } finally {
      const generateButton = document.getElementById('generateStyleButton');
      generateButton.disabled = false;
      generateButton.textContent = 'Generate RAT Style';
    }
  }
  
  /**
   * Show status message to the user
   * @param {string} type - The type of message (info, success, error)
   * @param {string} message - The message to display
   */
  showStatus(type, message) {
    const statusElement = document.getElementById('uploadStatus');
    if (!statusElement) return;
    
    let alertClass = 'alert-info';
    if (type === 'success') alertClass = 'alert-success';
    if (type === 'error') alertClass = 'alert-danger';
    
    statusElement.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    
    // Scroll to status element
    statusElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Initialize uploader when document is ready
document.addEventListener('DOMContentLoaded', () => {
  window.rasterUploader = new RasterUploader();
});
