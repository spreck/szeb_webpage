/**
 * Enhanced SLD Editor Integration Script for the SZEB WebGIS Platform
 * 
 * This script provides the integration between the SLD Editor v3 component
 * and the admin interface for layer symbolization, focusing on SZEB-specific
 * styling needs.
 */

class EnhancedSLDEditorIntegration {
  constructor() {
    this.geoserverUrl = null;
    this.workspace = null;
    this.layerName = null;
    this.featureType = null;
    this.attributes = [];
    this.editor = null;
    this.currentSLD = null;
    this.selectedStyleName = null;
    this.templateId = null;
    
    this.init();
  }
  
  /**
   * Initialize the SLD Editor integration
   */
  init() {
    // Get configuration from meta tags
    const metaGeoserver = document.querySelector('meta[name="geoserver-url"]');
    const metaWorkspace = document.querySelector('meta[name="geoserver-workspace"]');
    
    if (metaGeoserver) {
      this.geoserverUrl = metaGeoserver.getAttribute('content');
    }
    
    if (metaWorkspace) {
      this.workspace = metaWorkspace.getAttribute('content');
    }
    
    // Get layer information from the page
    const layerNameElement = document.getElementById('layerName');
    if (layerNameElement) {
      this.layerName = layerNameElement.textContent.trim();
    }
    
    const featureTypeElement = document.getElementById('featureType');
    if (featureTypeElement) {
      this.featureType = featureTypeElement.textContent.trim();
    }
    
    const attributesElement = document.getElementById('attributes');
    if (attributesElement) {
      this.attributes = attributesElement.textContent.split(',').map(attr => attr.trim()).filter(attr => attr);
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize the tabs
    this.initializeTabs();
    
    // Load available layers for the existing layer tab
    this.loadAvailableLayers();
    
    // Load available templates for template tab
    this.loadAvailableTemplates();
    
    // Initialize the SLD Editor component
    this.initializeEditor();
    
    console.log('Enhanced SLD Editor Integration initialized');
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Template tab events
    const generateTemplateButton = document.getElementById('generateTemplateStyle');
    if (generateTemplateButton) {
      generateTemplateButton.addEventListener('click', () => {
        this.generateTemplateStyle();
      });
    }
    
    // Existing layer tab events
    const loadExistingStyleButton = document.getElementById('loadExistingStyle');
    if (loadExistingStyleButton) {
      loadExistingStyleButton.addEventListener('click', () => {
        this.loadExistingStyle();
      });
    }
    
    // Save/preview/cancel buttons
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        this.saveStyle();
      });
    }
    
    const previewButton = document.getElementById('previewButton');
    if (previewButton) {
      previewButton.addEventListener('click', () => {
        this.previewStyle();
      });
    }
    
    const cancelButton = document.getElementById('cancelButton');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
          window.location.href = '/admin';
        }
      });
    }
    
    // Template selector change event
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => {
        this.updateTemplateForm();
      });
    }
    
    // Attribute selector change event
    const attributeSelect = document.getElementById('attributeSelect');
    if (attributeSelect) {
      attributeSelect.addEventListener('change', () => {
        this.updateTemplatePreview();
      });
    }
    
    // Color ramp change event
    const colorRampSelect = document.getElementById('colorRamp');
    if (colorRampSelect) {
      colorRampSelect.addEventListener('change', () => {
        this.updateTemplatePreview();
      });
    }
  }
  
  /**
   * Initialize Bootstrap tabs
   */
  initializeTabs() {
    // Set up tab change event listeners
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
      tabEl.addEventListener('shown.bs.tab', event => {
        const tabId = event.target.getAttribute('aria-controls');
        if (tabId === 'custom') {
          // Ensure the editor is properly sized when tab becomes visible
          if (this.editor) {
            this.editor.refresh();
          }
        }
      });
    });
  }
  
  /**
   * Initialize the SLD Editor
   */
  initializeEditor() {
    // Get the container for the editor
    const container = document.getElementById('sldEditorContainer');
    if (!container) {
      console.error('SLD Editor container not found');
      return;
    }
    
    // Check if the SLD Editor is available
    if (typeof SLDEditor === 'undefined') {
      console.error('SLD Editor component not loaded');
      container.innerHTML = '<div class="alert alert-danger">SLD Editor component not loaded. Please check that sld-editor-bundle.js is properly included.</div>';
      return;
    }
    
    // Initialize the editor
    try {
      this.editor = new SLDEditor(container, {
        geoserverUrl: this.geoserverUrl,
        workspace: this.workspace,
        layerName: this.layerName,
        onChange: (sld) => {
          this.currentSLD = sld;
        }
      });
      
      // Set initial empty SLD if no layer is specified
      if (!this.layerName) {
        this.editor.setSLD(this.getEmptySLD());
      }
    } catch (error) {
      console.error('Error initializing SLD Editor', error);
      container.innerHTML = `<div class="alert alert-danger">Failed to initialize SLD Editor: ${error.message}</div>`;
    }
  }
  
  /**
   * Load available layers for the existing layer tab
   */
  async loadAvailableLayers() {
    try {
      const response = await fetch('/api/enhanced_sld/existing_styles?type=' + this.featureType);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch styles: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Unknown error fetching styles');
      }
      
      const existingLayerSelect = document.getElementById('existingLayerSelect');
      if (!existingLayerSelect) {
        return;
      }
      
      // Clear existing options
      existingLayerSelect.innerHTML = '<option value="">-- Select a style --</option>';
      
      // Add style options
      if (data.styles && data.styles.length > 0) {
        // Group styles by layer if possible
        const stylesByLayer = {};
        
        data.styles.forEach(style => {
          const layerName = style.layer || 'Other Styles';
          if (!stylesByLayer[layerName]) {
            stylesByLayer[layerName] = [];
          }
          stylesByLayer[layerName].push(style);
        });
        
        // Create option groups for each layer
        for (const [layerName, styles] of Object.entries(stylesByLayer)) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = layerName;
          
          styles.forEach(style => {
            const option = document.createElement('option');
            option.value = style.name;
            option.textContent = style.name;
            // Add data attributes for additional information
            if (style.category) {
              option.dataset.category = style.category;
              option.textContent = `${style.name} (${style.category})`;
            }
            optgroup.appendChild(option);
          });
          
          existingLayerSelect.appendChild(optgroup);
        }
      } else {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'No styles available';
        existingLayerSelect.appendChild(option);
      }
    } catch (error) {
      console.error('Error loading available styles', error);
      const existingLayerSelect = document.getElementById('existingLayerSelect');
      if (existingLayerSelect) {
        existingLayerSelect.innerHTML = '<option value="">-- Error loading styles --</option>';
      }
    }
  }
  
  /**
   * Load available templates for the template tab
   */
  async loadAvailableTemplates() {
    try {
      const response = await fetch(`/api/enhanced_sld/style_templates?type=${this.featureType}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Unknown error fetching templates');
      }
      
      const templateSelect = document.getElementById('templateSelect');
      if (!templateSelect) {
        return;
      }
      
      // Clear existing options
      templateSelect.innerHTML = '<option value="">-- Select a template --</option>';
      
      // Group templates into categories
      const standardTemplates = [];
      const szebTemplates = [];
      
      data.templates.forEach(template => {
        if (template.id.startsWith('szeb_')) {
          szebTemplates.push(template);
        } else {
          standardTemplates.push(template);
        }
      });
      
      // Add SZEB-specific templates if available
      if (szebTemplates.length > 0) {
        const szebGroup = document.createElement('optgroup');
        szebGroup.label = 'SZEB Templates';
        
        szebTemplates.forEach(template => {
          const option = document.createElement('option');
          option.value = template.id;
          option.textContent = template.name;
          option.title = template.description;
          szebGroup.appendChild(option);
        });
        
        templateSelect.appendChild(szebGroup);
      }
      
      // Add standard templates
      if (standardTemplates.length > 0) {
        const standardGroup = document.createElement('optgroup');
        standardGroup.label = 'Standard Templates';
        
        standardTemplates.forEach(template => {
          const option = document.createElement('option');
          option.value = template.id;
          option.textContent = template.name;
          option.title = template.description;
          standardGroup.appendChild(option);
        });
        
        templateSelect.appendChild(standardGroup);
      }
    } catch (error) {
      console.error('Error loading templates', error);
      const templateSelect = document.getElementById('templateSelect');
      if (templateSelect) {
        templateSelect.innerHTML = '<option value="">-- Error loading templates --</option>';
      }
    }
  }
  
  /**
   * Update the template form based on the selected template
   */
  updateTemplateForm() {
    const templateSelect = document.getElementById('templateSelect');
    const attributeSelect = document.getElementById('attributeSelect');
    const colorRampSelect = document.getElementById('colorRamp');
    const classesInput = document.getElementById('classes');
    
    if (!templateSelect) {
      return;
    }
    
    const selectedTemplate = templateSelect.value;
    this.templateId = selectedTemplate;
    
    // Show/hide attribute selection based on template
    if (attributeSelect) {
      if (selectedTemplate === 'categorized_point' || 
          selectedTemplate === 'categorized_line' || 
          selectedTemplate === 'categorized_polygon' ||
          selectedTemplate === 'rat_categorical' ||
          selectedTemplate.startsWith('szeb_')) {
        attributeSelect.closest('.mb-3').style.display = 'block';
      } else {
        attributeSelect.closest('.mb-3').style.display = 'none';
      }
    }
    
    // Show/hide color ramp selection based on template
    if (colorRampSelect) {
      if (selectedTemplate === 'simple_raster' || 
          selectedTemplate === 'classified_raster') {
        colorRampSelect.closest('.mb-3').style.display = 'block';
      } else {
        colorRampSelect.closest('.mb-3').style.display = 'none';
      }
    }
    
    // Show/hide classes input based on template
    if (classesInput) {
      if (selectedTemplate === 'classified_raster') {
        classesInput.closest('.mb-3').style.display = 'block';
      } else {
        classesInput.closest('.mb-3').style.display = 'none';
      }
    }
    
    // Update the preview
    this.updateTemplatePreview();
  }
  
  /**
   * Update the template preview
   * This uses the template-previews.js utility for rendering previews
   */
  updateTemplatePreview() {
    const templateSelect = document.getElementById('templateSelect');
    const attributeSelect = document.getElementById('attributeSelect');
    const colorRampSelect = document.getElementById('colorRamp');
    const stylePreview = document.getElementById('stylePreview');
    
    if (!templateSelect || !stylePreview || typeof TemplatePreview === 'undefined') {
      return;
    }
    
    const selectedTemplate = templateSelect.value;
    const selectedAttribute = attributeSelect ? attributeSelect.value : '';
    const selectedColorRamp = colorRampSelect ? colorRampSelect.value : 'Blues';
    
    if (!selectedTemplate) {
      stylePreview.innerHTML = '<p class="text-muted">Select a template to see preview</p>';
      return;
    }
    
    // Use the template preview utility to render the preview
    TemplatePreview.renderPreview(
      stylePreview,
      selectedTemplate,
      selectedAttribute,
      selectedColorRamp
    );
  }
  
  /**
   * Generate a style based on the selected template
   */
  async generateTemplateStyle() {
    const templateSelect = document.getElementById('templateSelect');
    const attributeSelect = document.getElementById('attributeSelect');
    
    if (!templateSelect) {
      return;
    }
    
    const selectedTemplate = templateSelect.value;
    if (!selectedTemplate) {
      this.showStatus('error', 'Please select a template');
      return;
    }
    
    // Get attribute if required by the template
    let attribute = null;
    if ((selectedTemplate === 'categorized_point' || 
         selectedTemplate === 'categorized_line' || 
         selectedTemplate === 'categorized_polygon' ||
         selectedTemplate === 'rat_categorical' ||
         selectedTemplate.startsWith('szeb_')) && 
        attributeSelect) {
      if (!attributeSelect.value) {
        this.showStatus('error', 'Please select an attribute for classification');
        return;
      }
      attribute = attributeSelect.value;
    }
    
    try {
      // Fetch the template SLD
      const url = `/api/enhanced_sld/template?id=${encodeURIComponent(selectedTemplate)}` + 
                 (attribute ? `&attribute=${encodeURIComponent(attribute)}` : '');
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Unknown error fetching template');
      }
      
      // Set the template SLD in the editor
      if (this.editor) {
        this.editor.setSLD(data.template.sld);
        this.currentSLD = data.template.sld;
      }
      
      // Generate a name for the new style
      this.selectedStyleName = this.generateStyleName(selectedTemplate, attribute);
      
      // Switch to the custom tab
      const customTab = document.getElementById('custom-tab');
      if (customTab) {
        const tab = new bootstrap.Tab(customTab);
        tab.show();
      }
      
      this.showStatus('success', 'Template style generated successfully. You can now customize it in the editor.');
    } catch (error) {
      console.error('Error generating template style', error);
      this.showStatus('error', `Failed to generate template style: ${error.message}`);
    }
  }
  
  /**
   * Generate a style name based on the template and attribute
   */
  generateStyleName(templateId, attribute) {
    const layerName = this.layerName || 'new_layer';
    let styleName = layerName;
    
    if (templateId.startsWith('szeb_')) {
      const categoryMap = {
        'szeb_climate_risk': 'ClimateExposureRiskCategory',
        'szeb_fire_risk': 'FireIntensityRiskCategory',
        'szeb_supply': 'CurrentSupplyCategory',
        'szeb_demand': 'LandownerDemandCategory',
        'szeb_priority': 'OperationalPriorityCategory'
      };
      
      const category = categoryMap[templateId] || '';
      if (category) {
        if (layerName.includes('_b')) {
          // Use existing band information if present
          const bandMatch = layerName.match(/(_b\d+)/);
          if (bandMatch && bandMatch[1]) {
            styleName = `${layerName}_${category}`;
          } else {
            styleName = `${layerName}_b0_${category}`;
          }
        } else {
          styleName = `${layerName}_b0_${category}`;
        }
      }
    } else if (attribute) {
      // For categorized or custom templates with attribute
      styleName = `${layerName}_${attribute}`;
    } else {
      // For other templates
      styleName = `${layerName}_${templateId.replace(/[^a-z0-9]/gi, '_')}`;
    }
    
    return styleName;
  }
  
  /**
   * Load style from an existing layer
   */
  async loadExistingStyle() {
    const existingLayerSelect = document.getElementById('existingLayerSelect');
    if (!existingLayerSelect || !existingLayerSelect.value) {
      this.showStatus('error', 'Please select a style');
      return;
    }
    
    const styleName = existingLayerSelect.value;
    
    try {
      // Get the style SLD
      const response = await fetch(`/api/sld/sld?name=${encodeURIComponent(styleName)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch style: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Unknown error fetching style');
      }
      
      // Set the style in the editor
      if (this.editor) {
        this.editor.setSLD(data.sld);
        this.currentSLD = data.sld;
      }
      
      // Generate a new name for the copied style
      this.selectedStyleName = `${this.layerName || 'new_layer'}_copy_of_${styleName}`;
      
      // Switch to the custom tab
      const customTab = document.getElementById('custom-tab');
      if (customTab) {
        const tab = new bootstrap.Tab(customTab);
        tab.show();
      }
      
      this.showStatus('success', `Style from ${styleName} loaded successfully. You can now customize it in the editor.`);
    } catch (error) {
      console.error('Error loading existing style', error);
      this.showStatus('error', `Failed to load style: ${error.message}`);
    }
  }
  
  /**
   * Save the current style
   */
  async saveStyle() {
    if (!this.currentSLD) {
      this.showStatus('error', 'No style to save');
      return;
    }
    
    // Generate a style name if not already set
    if (!this.selectedStyleName) {
      this.selectedStyleName = `${this.layerName || 'new_layer'}_style_${Date.now()}`;
    }
    
    // Prompt for style name if needed
    const styleName = prompt('Enter a name for the style:', this.selectedStyleName);
    if (!styleName) {
      return; // User cancelled
    }
    
    try {
      // Save the style
      const response = await fetch('/api/sld/create_or_update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: styleName,
          sld: this.currentSLD,
          layer: this.layerName,
          workspace: this.workspace
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save style: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Unknown error saving style');
      }
      
      this.showStatus('success', data.message);
      this.selectedStyleName = styleName;
      
      // Add button to go back to admin or view the layer
      const statusElement = document.getElementById('statusMessages');
      if (statusElement) {
        const actionButtons = document.createElement('div');
        actionButtons.className = 'mt-3';
        actionButtons.innerHTML = `
          <a href="/admin" class="btn btn-primary me-2">Back to Admin</a>
          ${this.layerName ? `<a href="/?layer=${this.workspace}:${this.layerName}" class="btn btn-success" target="_blank">View Layer on Map</a>` : ''}
        `;
        statusElement.appendChild(actionButtons);
      }
    } catch (error) {
      console.error('Error saving style', error);
      this.showStatus('error', `Failed to save style: ${error.message}`);
    }
  }
  
  /**
   * Preview the current style on the map
   */
  previewStyle() {
    if (!this.layerName) {
      this.showStatus('error', 'No layer specified for preview');
      return;
    }
    
    if (!this.currentSLD) {
      this.showStatus('error', 'No style to preview');
      return;
    }
    
    // For preview, we'll open the map with the layer
    // The actual preview functionality would require additional server-side support
    window.open(`/?layer=${this.workspace}:${this.layerName}`, '_blank');
  }
  
  /**
   * Get an empty SLD template
   */
  getEmptySLD() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>New Style</n>
    <UserStyle>
      <n>New Style</n>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#3388ff</CssParameter>
              <CssParameter name="fill-opacity">0.6</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">0.5</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>`;
  }
  
  /**
   * Show status message to the user
   * @param {string} type - The type of message (info, success, error)
   * @param {string} message - The message to display
   */
  showStatus(type, message) {
    const statusElement = document.getElementById('statusMessages');
    if (!statusElement) return;
    
    let alertClass = 'alert-info';
    if (type === 'success') alertClass = 'alert-success';
    if (type === 'error') alertClass = 'alert-danger';
    
    statusElement.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    
    // Scroll to status element
    statusElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Initialize the SLD Editor integration when document is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sldEditorIntegration = new EnhancedSLDEditorIntegration();
});
