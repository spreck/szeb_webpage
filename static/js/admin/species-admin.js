/**
 * Species Administration Script
 * 
 * Manages the species configuration through the admin interface.
 * Allows adding, editing, and toggling species for the Cone Scouting Tool.
 */

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const speciesList = document.getElementById('speciesList');
  const addSpeciesForm = document.getElementById('addSpeciesForm');
  const editSpeciesForm = document.getElementById('editSpeciesForm');
  const saveSpeciesBtn = document.getElementById('saveSpeciesBtn');
  const updateSpeciesBtn = document.getElementById('updateSpeciesBtn');
  const addAttributeSection = document.getElementById('addAttributeSection');
  const addSectionBtn = document.getElementById('addSectionBtn');

  // Load species data
  loadSpeciesData();

  // Event listeners
  saveSpeciesBtn.addEventListener('click', saveSpecies);
  updateSpeciesBtn.addEventListener('click', updateSpecies);
  addAttributeSection.addEventListener('click', showAddSectionModal);
  addSectionBtn.addEventListener('click', addNewSection);

  // Delegate for dynamically added elements
  document.addEventListener('click', function(event) {
    // Add attribute button
    if (event.target.classList.contains('add-attribute')) {
      const section = event.target.dataset.section;
      addAttribute(section);
    }
    
    // Remove attribute button
    if (event.target.classList.contains('remove-attribute')) {
      const row = event.target.closest('.attribute-row');
      if (row) {
        row.remove();
      }
    }
    
    // Edit species button
    if (event.target.classList.contains('edit-species')) {
      const speciesId = event.target.dataset.id;
      editSpecies(speciesId);
    }
    
    // Toggle species status button
    if (event.target.classList.contains('toggle-species')) {
      const speciesId = event.target.dataset.id;
      const currentStatus = event.target.dataset.status === 'true';
      toggleSpeciesStatus(speciesId, !currentStatus);
    }
  });

  /**
   * Loads species data from the server
   */
  async function loadSpeciesData() {
    try {
      const response = await fetch('/api/species');
      const data = await response.json();
      
      renderSpeciesList(data);
    } catch (error) {
      console.error('Error loading species data:', error);
      speciesList.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            Error loading species data. Please try refreshing the page.
          </div>
        </div>
      `;
    }
  }

  /**
   * Renders the species list
   * @param {Array} species - Array of species objects
   */
  function renderSpeciesList(species) {
    if (!species || species.length === 0) {
      speciesList.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning">
            No species configured yet. Click "Add New Species" to get started.
          </div>
        </div>
      `;
      return;
    }
    
    let html = '';
    
    species.forEach(species => {
      const statusClass = species.enabled ? 'species-enabled' : 'species-disabled';
      const statusBadge = species.enabled ? 
        '<span class="badge bg-success">Enabled</span>' : 
        '<span class="badge bg-danger">Disabled</span>';
      
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card species-card ${statusClass}">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">${species.displayName}</h5>
              ${statusBadge}
            </div>
            <div class="card-body">
              <p class="card-text"><em>${species.scientificName}</em></p>
              <p><strong>Vector Layer:</strong> ${species.vectorLayer}</p>
              <p><strong>Raster Layer:</strong> ${species.rasterLayer}</p>
              
              <h6 class="mt-3">Attributes:</h6>
              <ul class="list-group list-group-flush">
                ${renderAttributeList(species.attributes)}
              </ul>
            </div>
            <div class="card-footer">
              <button class="btn btn-sm btn-primary edit-species" data-id="${species.id}">
                Edit
              </button>
              <button class="btn btn-sm ${species.enabled ? 'btn-warning' : 'btn-success'} toggle-species" 
                      data-id="${species.id}" 
                      data-status="${species.enabled}">
                ${species.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    speciesList.innerHTML = html;
  }

  /**
   * Renders an attribute list for a species card
   * @param {Object} attributes - The attributes object
   * @returns {string} HTML for the attribute list
   */
  function renderAttributeList(attributes) {
    let html = '';
    
    for (const [section, data] of Object.entries(attributes)) {
      html += `
        <li class="list-group-item">
          <strong>${data.label}:</strong> 
          <span class="text-muted">${Object.keys(data.items).length} attributes</span>
        </li>
      `;
    }
    
    return html;
  }

  /**
   * Adds a new attribute input row to a section
   * @param {string} section - The section ID
   */
  function addAttribute(section) {
    const container = document.getElementById(`${section}Attributes`);
    
    const row = document.createElement('div');
    row.className = 'row attribute-row mt-2';
    row.innerHTML = `
      <div class="col-md-5">
        <input type="text" class="form-control" name="${section}.key[]" placeholder="Attribute Key" required>
      </div>
      <div class="col-md-5">
        <input type="text" class="form-control" name="${section}.value[]" placeholder="Display Name" required>
      </div>
      <div class="col-md-2">
        <button type="button" class="btn btn-danger btn-sm remove-attribute">Remove</button>
      </div>
    `;
    
    container.appendChild(row);
  }

  /**
   * Shows the add section modal
   */
  function showAddSectionModal() {
    document.getElementById('sectionKey').value = '';
    document.getElementById('sectionLabel').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('addSectionModal'));
    modal.show();
  }

  /**
   * Adds a new attribute section
   */
  function addNewSection() {
    const key = document.getElementById('sectionKey').value.trim();
    const label = document.getElementById('sectionLabel').value.trim();
    
    if (!key || !label) {
      alert('Both Section Key and Display Name are required');
      return;
    }
    
    const sectionHtml = `
      <div class="attribute-section">
        <div class="d-flex justify-content-between">
          <h6>${label}</h6>
        </div>
        <div id="${key}Attributes">
          <div class="row attribute-row">
            <div class="col-md-5">
              <input type="text" class="form-control" name="${key}.key[]" placeholder="Attribute Key" required>
            </div>
            <div class="col-md-5">
              <input type="text" class="form-control" name="${key}.value[]" placeholder="Display Name" required>
            </div>
            <div class="col-md-2">
              <button type="button" class="btn btn-danger btn-sm remove-attribute">Remove</button>
            </div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-primary mt-2 add-attribute" data-section="${key}">Add Attribute</button>
      </div>
    `;
    
    document.getElementById('attributeSections').insertAdjacentHTML('beforeend', sectionHtml);
    
    // Close the modal
    bootstrap.Modal.getInstance(document.getElementById('addSectionModal')).hide();
  }

  /**
   * Saves a new species
   */
  async function saveSpecies() {
    const formData = new FormData(addSpeciesForm);
    const species = formDataToSpeciesObject(formData);
    
    try {
      const response = await fetch('/api/species', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(species)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save species');
      }
      
      // Show success message and reload data
      alert('Species added successfully');
      bootstrap.Modal.getInstance(document.getElementById('addSpeciesModal')).hide();
      loadSpeciesData();
      addSpeciesForm.reset();
      
    } catch (error) {
      console.error('Error saving species:', error);
      alert('Failed to save species. Please try again.');
    }
  }

  /**
   * Opens the edit species modal
   * @param {string} speciesId - The species ID to edit
   */
  async function editSpecies(speciesId) {
    try {
      const response = await fetch(`/api/species/${speciesId}`);
      const species = await response.json();
      
      // Populate the edit form
      populateEditForm(species);
      
      // Show the modal
      const modal = new bootstrap.Modal(document.getElementById('editSpeciesModal'));
      modal.show();
      
    } catch (error) {
      console.error('Error loading species details:', error);
      alert('Failed to load species details. Please try again.');
    }
  }

  /**
   * Populates the edit form with species data
   * @param {Object} species - The species object
   */
  function populateEditForm(species) {
    // Clear existing form content
    editSpeciesForm.innerHTML = '';
    
    // Add hidden ID field
    const idField = document.createElement('input');
    idField.type = 'hidden';
    idField.id = 'editSpeciesId';
    idField.name = 'speciesId';
    idField.value = species.id;
    editSpeciesForm.appendChild(idField);
    
    // Build the form with the same structure as the add form
    const formHtml = `
      <!-- Basic Information -->
      <h6 class="fw-bold mb-3">Basic Information</h6>
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="editDisplayName">Display Name</label>
            <input type="text" class="form-control" id="editDisplayName" name="displayName" value="${species.displayName}" required>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label for="editScientificName">Scientific Name</label>
            <input type="text" class="form-control" id="editScientificName" name="scientificName" value="${species.scientificName}" required>
          </div>
        </div>
      </div>
      
      <div class="row mt-2">
        <div class="col-md-6">
          <div class="form-group">
            <label for="editEnabled">Status</label>
            <select class="form-select" id="editEnabled" name="enabled">
              <option value="true" ${species.enabled ? 'selected' : ''}>Enabled</option>
              <option value="false" ${!species.enabled ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Layer Information -->
      <h6 class="fw-bold mb-3 mt-4">Layer Information</h6>
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="editVectorLayer">Vector Layer Name</label>
            <input type="text" class="form-control" id="editVectorLayer" name="vectorLayer" value="${species.vectorLayer}" required>
            <small class="form-text text-muted">The name of the vector layer in GeoServer</small>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label for="editRasterLayer">Raster Layer Name</label>
            <input type="text" class="form-control" id="editRasterLayer" name="rasterLayer" value="${species.rasterLayer}" required>
            <small class="form-text text-muted">The name of the raster layer in GeoServer</small>
          </div>
        </div>
      </div>
      
      <div class="row mt-2">
        <div class="col-12">
          <div class="form-group">
            <label for="editBackgroundImage">Background Image URL</label>
            <input type="text" class="form-control" id="editBackgroundImage" name="backgroundImage" value="${species.backgroundImage || ''}">
            <small class="form-text text-muted">Path to the species background image</small>
          </div>
        </div>
      </div>
      
      <!-- Attributes -->
      <h6 class="fw-bold mb-3 mt-4">Attributes</h6>
      <div id="editAttributeSections">
        ${buildAttributeSectionsHtml(species.attributes)}
      </div>
      
      <button type="button" id="editAddAttributeSection" class="btn btn-outline-success mt-3">Add New Attribute Section</button>
    `;
    
    editSpeciesForm.innerHTML = formHtml;
    
    // Add event listener for the add section button
    document.getElementById('editAddAttributeSection').addEventListener('click', () => {
      showAddSectionModal();
      // Store the target form ID for the modal
      document.getElementById('addSectionBtn').dataset.targetForm = 'edit';
    });
  }

  /**
   * Builds HTML for attribute sections in edit form
   * @param {Object} attributes - Attributes object
   * @returns {string} HTML string
   */
  function buildAttributeSectionsHtml(attributes) {
    let html = '';
    
    for (const [sectionKey, sectionData] of Object.entries(attributes)) {
      html += `
        <div class="attribute-section">
          <div class="d-flex justify-content-between">
            <h6>${sectionData.label}</h6>
          </div>
          <div id="edit${sectionKey}Attributes">
      `;
      
      // Add attribute rows
      for (const [attrKey, attrLabel] of Object.entries(sectionData.items)) {
        html += `
          <div class="row attribute-row mb-2">
            <div class="col-md-5">
              <input type="text" class="form-control" name="edit${sectionKey}.key[]" value="${attrKey}" required>
            </div>
            <div class="col-md-5">
              <input type="text" class="form-control" name="edit${sectionKey}.value[]" value="${attrLabel}" required>
            </div>
            <div class="col-md-2">
              <button type="button" class="btn btn-danger btn-sm remove-attribute">Remove</button>
            </div>
          </div>
        `;
      }
      
      html += `
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary mt-2 add-attribute" data-section="edit${sectionKey}">Add Attribute</button>
        </div>
      `;
    }
    
    return html;
  }

  /**
   * Updates an existing species
   */
  async function updateSpecies() {
    const formData = new FormData(editSpeciesForm);
    const species = formDataToSpeciesObject(formData, true);
    const speciesId = document.getElementById('editSpeciesId').value;
    
    try {
      const response = await fetch(`/api/species/${speciesId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(species)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update species');
      }
      
      // Show success message and reload data
      alert('Species updated successfully');
      bootstrap.Modal.getInstance(document.getElementById('editSpeciesModal')).hide();
      loadSpeciesData();
      
    } catch (error) {
      console.error('Error updating species:', error);
      alert('Failed to update species. Please try again.');
    }
  }

  /**
   * Toggles a species' enabled status
   * @param {string} speciesId - The species ID to toggle
   * @param {boolean} newStatus - The new status
   */
  async function toggleSpeciesStatus(speciesId, newStatus) {
    try {
      const response = await fetch(`/api/species/${speciesId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle species status');
      }
      
      // Reload species list
      loadSpeciesData();
      
    } catch (error) {
      console.error('Error toggling species status:', error);
      alert('Failed to update species status. Please try again.');
    }
  }

  /**
   * Converts form data to a species object
   * @param {FormData} formData - Form data to convert
   * @param {boolean} isEdit - Whether this is for edit form
   * @returns {Object} The species object
   */
  function formDataToSpeciesObject(formData, isEdit = false) {
    const prefix = isEdit ? 'edit' : '';
    
    // Basic properties
    const species = {
      id: formData.get(isEdit ? 'speciesId' : 'speciesId'),
      displayName: formData.get(`${prefix}displayName`),
      scientificName: formData.get(`${prefix}scientificName`),
      vectorLayer: formData.get(`${prefix}vectorLayer`),
      rasterLayer: formData.get(`${prefix}rasterLayer`),
      backgroundImage: formData.get(`${prefix}backgroundImage`),
      enabled: formData.get(`${prefix}enabled`) === 'true',
      attributes: {}
    };
    
    // Process attribute sections
    const attributeSections = {};
    const entries = [...formData.entries()];
    
    // Find section keys
    const sectionPattern = new RegExp(`^${prefix}([\\w]+)\\.key\\[\\]$`);
    const sections = new Set();
    
    entries.forEach(([key]) => {
      const match = key.match(sectionPattern);
      if (match) {
        sections.add(match[1]);
      }
    });
    
    // Process each section
    sections.forEach(section => {
      const keys = formData.getAll(`${prefix}${section}.key[]`);
      const values = formData.getAll(`${prefix}${section}.value[]`);
      
      const items = {};
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].trim() && values[i].trim()) {
          items[keys[i].trim()] = values[i].trim();
        }
      }
      
      // Get or infer section label (for edit mode, label is not directly in form)
      let label = section;
      if (section === 'basics') label = 'Basic Information';
      else if (section === 'risks') label = 'Risk Factors';
      else if (section === 'operations') label = 'Operational Factors';
      
      species.attributes[section] = {
        label: label,
        items: items
      };
    });
    
    return species;
  }
});
