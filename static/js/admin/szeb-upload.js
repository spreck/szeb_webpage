/**
 * SZEB Data Upload JavaScript
 * 
 * This script handles the SZEB species data upload process, including file selection,
 * form submission, progress tracking, and result display.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Form elements
  const uploadForm = document.getElementById('szebUploadForm');
  const speciesCodeSelect = document.getElementById('speciesCode');
  const rasterFileInput = document.getElementById('rasterFile');
  const vectorFileInput = document.getElementById('vectorFile');
  const dbfFileInput = document.getElementById('dbfFile');
  const shxFileInput = document.getElementById('shxFile');
  const prjFileInput = document.getElementById('prjFile');
  const otherFilesInput = document.getElementById('otherFiles');
  const uploadButton = document.getElementById('uploadButton');
  const cancelButton = document.getElementById('cancelButton');
  
  // Display elements
  const rasterFileName = document.getElementById('rasterFileName');
  const vectorFileName = document.getElementById('vectorFileName');
  const dbfFileName = document.getElementById('dbfFileName');
  const shxFileName = document.getElementById('shxFileName');
  const prjFileName = document.getElementById('prjFileName');
  const otherFilesName = document.getElementById('otherFilesName');
  const relatedFilesContainer = document.getElementById('relatedFilesContainer');
  const progressContainer = document.getElementById('progressContainer');
  const uploadProgress = document.getElementById('uploadProgress');
  const statusContainer = document.getElementById('statusContainer');
  const statusMessage = document.getElementById('statusMessage');
  const resultContainer = document.getElementById('resultContainer');
  const resultContent = document.getElementById('resultContent');
  const viewLayerButton = document.getElementById('viewLayerButton');
  
  // File input event listeners
  rasterFileInput.addEventListener('change', function() {
    updateFileName(this, rasterFileName);
  });
  
  vectorFileInput.addEventListener('change', function() {
    updateFileName(this, vectorFileName);
    // Show related files section when vector file is selected
    if (this.files.length > 0) {
      relatedFilesContainer.style.display = 'block';
    } else {
      relatedFilesContainer.style.display = 'none';
    }
  });
  
  dbfFileInput.addEventListener('change', function() {
    updateFileName(this, dbfFileName);
  });
  
  shxFileInput.addEventListener('change', function() {
    updateFileName(this, shxFileName);
  });
  
  prjFileInput.addEventListener('change', function() {
    updateFileName(this, prjFileName);
  });
  
  otherFilesInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      let fileNames = Array.from(this.files).map(file => file.name).join(', ');
      otherFilesName.textContent = fileNames;
    } else {
      otherFilesName.textContent = 'No files selected';
    }
  });
  
  // Species selection change event
  speciesCodeSelect.addEventListener('change', function() {
    updateFileHints();
  });
  
  // Cancel button click event
  cancelButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to cancel the upload process?')) {
      window.location.href = '/admin';
    }
  });
  
  // Form submission event
  uploadForm.addEventListener('submit', function(event) {
    event.preventDefault();
    uploadSzebData();
  });
  
  // View layer button click event
  viewLayerButton.addEventListener('click', function() {
    const layerName = this.getAttribute('data-layer');
    const workspace = document.getElementById('workspace').value;
    if (layerName) {
      window.open(`/?layer=${workspace}:${layerName}`, '_blank');
    }
  });
  
  /**
   * Update file name display when a file is selected
   */
  function updateFileName(input, displayElement) {
    if (input.files.length > 0) {
      displayElement.textContent = input.files[0].name;
    } else {
      displayElement.textContent = 'No file selected';
    }
  }
  
  /**
   * Update file input hints based on selected species
   */
  function updateFileHints() {
    const species = speciesCodeSelect.value;
    if (species) {
      // Reset file inputs
      rasterFileInput.value = '';
      vectorFileInput.value = '';
      rasterFileName.textContent = 'No file selected';
      vectorFileName.textContent = 'No file selected';
      
      // Update file hints
      const rasterHint = species === 'PIPO' ? 
        'SZEBxPipo_raster_4326.tif' : 'SZEBxPsme_raster_4326.tif';
      const vectorHint = species === 'PIPO' ? 
        'szeb_pipo_vector_unit_4326.shp' : 'szeb_psme_vector_unit_4326.shp';
      
      const rasterSmall = rasterFileInput.parentElement.nextElementSibling;
      const vectorSmall = vectorFileInput.parentElement.nextElementSibling;
      
      if (rasterSmall) {
        rasterSmall.textContent = `Upload the ${rasterHint} file.`;
      }
      
      if (vectorSmall) {
        vectorSmall.textContent = `Upload the ${vectorHint} file.`;
      }
    }
  }
  
  /**
   * Upload SZEB data to the server
   */
  function uploadSzebData() {
    // Validate form inputs
    if (!validateForm()) {
      return;
    }
    
    // Create FormData object
    const formData = new FormData(uploadForm);
    
    // Add related vector files if selected
    addRelatedVectorFiles(formData);
    
    // Show progress container
    progressContainer.style.display = 'block';
    uploadProgress.style.width = '0%';
    uploadProgress.textContent = '0%';
    
    // Hide status container if visible
    statusContainer.style.display = 'none';
    
    // Disable form submit button
    uploadButton.disabled = true;
    
    // Create XMLHttpRequest
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', function(event) {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        uploadProgress.style.width = percentComplete + '%';
        uploadProgress.textContent = percentComplete + '%';
        uploadProgress.setAttribute('aria-valuenow', percentComplete);
      }
    });
    
    // Handle response
    xhr.addEventListener('load', function() {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            displaySuccess(response);
          } else {
            displayError(response.message || 'Unknown error occurred during upload.');
          }
        } catch (error) {
          displayError('Invalid response from server.');
        }
      } else {
        displayError(`Server error: ${xhr.status} ${xhr.statusText}`);
      }
      
      // Re-enable form submit button
      uploadButton.disabled = false;
    });
    
    // Handle error
    xhr.addEventListener('error', function() {
      displayError('Network error occurred. Please try again.');
      uploadButton.disabled = false;
    });
    
    // Handle abort
    xhr.addEventListener('abort', function() {
      displayError('Upload was aborted.');
      uploadButton.disabled = false;
    });
    
    // Open and send request
    xhr.open('POST', '/api/szeb/upload_szeb_data');
    xhr.send(formData);
  }
  
  /**
   * Add related vector files to FormData
   */
  function addRelatedVectorFiles(formData) {
    // Add related vector files if selected
    if (dbfFileInput.files.length > 0) {
      formData.append('vector_related_dbf', dbfFileInput.files[0]);
    }
    
    if (shxFileInput.files.length > 0) {
      formData.append('vector_related_shx', shxFileInput.files[0]);
    }
    
    if (prjFileInput.files.length > 0) {
      formData.append('vector_related_prj', prjFileInput.files[0]);
    }
    
    // Add any other selected files
    if (otherFilesInput.files.length > 0) {
      for (let i = 0; i < otherFilesInput.files.length; i++) {
        formData.append(`vector_related_${i}`, otherFilesInput.files[i]);
      }
    }
  }
  
  /**
   * Validate form inputs before submission
   */
  function validateForm() {
    // Check species selection
    if (!speciesCodeSelect.value) {
      displayError('Please select a species.');
      return false;
    }
    
    // Check raster file
    if (rasterFileInput.files.length === 0) {
      displayError('Please select a raster file.');
      return false;
    }
    
    // Check vector file
    if (vectorFileInput.files.length === 0) {
      displayError('Please select a vector boundary file.');
      return false;
    }
    
    // Check workspace
    const workspace = document.getElementById('workspace').value;
    if (!workspace) {
      displayError('Please enter a workspace name.');
      return false;
    }
    
    // Check related files
    if (vectorFileInput.files.length > 0) {
      const vectorFileName = vectorFileInput.files[0].name;
      const baseFileName = vectorFileName.substring(0, vectorFileName.lastIndexOf('.'));
      
      // DBF file is required
      if (dbfFileInput.files.length === 0) {
        displayError(`Please select the .dbf file associated with ${vectorFileName}.`);
        return false;
      }
      
      // SHX file is required
      if (shxFileInput.files.length === 0) {
        displayError(`Please select the .shx file associated with ${vectorFileName}.`);
        return false;
      }
      
      // PRJ file is required
      if (prjFileInput.files.length === 0) {
        displayError(`Please select the .prj file associated with ${vectorFileName}.`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Display success message and results
   */
  function displaySuccess(response) {
    // Set status message
    statusContainer.style.display = 'block';
    statusMessage.className = 'alert alert-success';
    statusMessage.textContent = response.message || 'SZEB data uploaded successfully!';
    
    // Prepare results content
    let resultsHtml = '<h5>Upload Summary:</h5>';
    
    if (response.result) {
      const result = response.result;
      const species = result.species;
      
      resultsHtml += `<p><strong>Species:</strong> ${species}</p>`;
      
      // Raster information
      if (result.raster) {
        resultsHtml += '<h6>Raster Data:</h6>';
        resultsHtml += `<p><strong>Store Name:</strong> ${result.raster.store_name}</p>`;
        resultsHtml += `<p><strong>Coverage Name:</strong> ${result.raster.coverage_name}</p>`;
        
        // List generated styles
        if (result.raster.generated_styles && result.raster.generated_styles.length > 0) {
          resultsHtml += '<p><strong>Generated Styles:</strong></p>';
          resultsHtml += '<ul>';
          result.raster.generated_styles.forEach(style => {
            resultsHtml += `<li>${style.style_name} (Band ${style.band}, Attribute: ${style.attribute})</li>`;
          });
          resultsHtml += '</ul>';
        }
        
        // List copied styles if any
        if (result.raster.copied_styles && result.raster.copied_styles.length > 0) {
          resultsHtml += '<p><strong>Copied Styles:</strong></p>';
          resultsHtml += '<ul>';
          result.raster.copied_styles.forEach(style => {
            resultsHtml += `<li>${style.style_name} (from ${style.template_style})</li>`;
          });
          resultsHtml += '</ul>';
        }
      }
      
      // Vector information
      if (result.vector) {
        resultsHtml += '<h6>Vector Boundary Data:</h6>';
        resultsHtml += `<p><strong>Store Name:</strong> ${result.vector.store_name}</p>`;
        resultsHtml += `<p><strong>Style:</strong> ${result.vector.style_name}</p>`;
        resultsHtml += `<p><strong>Layer Group:</strong> ${result.vector.layer_group}</p>`;
      }
      
      // Layer groups
      if (result.layer_groups && result.layer_groups.length > 0) {
        resultsHtml += '<h6>Created Layer Groups:</h6>';
        resultsHtml += '<ul>';
        result.layer_groups.forEach(group => {
          resultsHtml += `<li>${group.group_name} (Attribute: ${group.attribute})</li>`;
        });
        resultsHtml += '</ul>';
      }
      
      // Set layer name for view button
      if (result.layer_groups && result.layer_groups.length > 0) {
        // Use the first layer group as default for viewing
        viewLayerButton.setAttribute('data-layer', result.layer_groups[0].group_name);
      } else if (result.vector && result.vector.layer_group) {
        // Fall back to the main layer group
        viewLayerButton.setAttribute('data-layer', result.vector.layer_group);
      } else if (result.raster) {
        // Fall back to the raster layer
        viewLayerButton.setAttribute('data-layer', result.raster.coverage_name);
      }
    }
    
    // Display results
    resultContent.innerHTML = resultsHtml;
    resultContainer.style.display = 'block';
    
    // Scroll to result container
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }
  
  /**
   * Display error message
   */
  function displayError(message) {
    statusContainer.style.display = 'block';
    statusMessage.className = 'alert alert-danger';
    statusMessage.textContent = message;
    
    // Scroll to status container
    statusContainer.scrollIntoView({ behavior: 'smooth' });
  }
});
