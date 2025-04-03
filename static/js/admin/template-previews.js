/**
 * Template Previews Module for SLD Editor
 */

const TemplatePreview = (function() {
  /**
   * Render a preview for the given template
   */
  function renderPreview(container, templateId, attribute, colorRamp) {
    if (!container) return;
    
    if (!templateId) {
      container.innerHTML = '<p class="text-muted">Select a template to see preview</p>';
      return;
    }
    
    // SZEB-specific preview content
    if (templateId.startsWith('szeb_')) {
      renderSzebPreview(container, templateId, attribute);
      return;
    }
    
    // Standard templates preview content
    switch (templateId) {
      case 'simple_point':
        renderSimplePointPreview(container);
        break;
      case 'simple_line':
        renderSimpleLinePreview(container);
        break;
      case 'simple_polygon':
        renderSimplePolygonPreview(container);
        break;
      case 'simple_raster':
        renderSimpleRasterPreview(container, colorRamp);
        break;
      case 'categorized_point':
      case 'categorized_line':
      case 'categorized_polygon':
        renderCategorizedPreview(container, templateId, attribute);
        break;
      case 'classified_raster':
        renderClassifiedRasterPreview(container);
        break;
      case 'rat_categorical':
        renderRatCategoricalPreview(container, attribute);
        break;
      default:
        container.innerHTML = '<p class="text-muted">No preview available for this template</p>';
    }
  }
  
  // Helper functions for rendering specific templates
  function renderSzebPreview(container, templateId, attribute) {
    let categoryMap = {
      'szeb_climate_risk': 'Climate Exposure Risk',
      'szeb_fire_risk': 'Fire Intensity Risk',
      'szeb_supply': 'Current Supply',
      'szeb_demand': 'Landowner Demand',
      'szeb_priority': 'Operational Priority'
    };
    
    const category = categoryMap[templateId] || 'Category';
    
    container.innerHTML = `
      <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="25" height="15" fill="#1A9641" stroke="#000000" stroke-width="1" />
        <text x="45" y="22" font-size="12">Very Low</text>
        <rect x="10" y="35" width="25" height="15" fill="#A6D96A" stroke="#000000" stroke-width="1" />
        <text x="45" y="47" font-size="12">Low</text>
        <rect x="10" y="60" width="25" height="15" fill="#FFFFBF" stroke="#000000" stroke-width="1" />
        <text x="45" y="72" font-size="12">Moderate</text>
        <rect x="10" y="85" width="25" height="15" fill="#FDAE61" stroke="#000000" stroke-width="1" />
        <text x="45" y="97" font-size="12">High</text>
        <rect x="10" y="110" width="25" height="15" fill="#D7191C" stroke="#000000" stroke-width="1" />
        <text x="45" y="122" font-size="12">Very High</text>
      </svg>
      <p class="mt-2">${category} style for SZEB data</p>
    `;
  }
  
  function renderSimplePointPreview(container) {
    container.innerHTML = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="10" fill="#3388ff" stroke="#000000" stroke-width="1" />
      </svg>
      <p>Simple point style</p>
    `;
  }
  
  function renderSimpleLinePreview(container) {
    container.innerHTML = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="10" x2="90" y2="90" stroke="#3388ff" stroke-width="2" />
        <line x1="90" y1="10" x2="10" y2="90" stroke="#3388ff" stroke-width="2" />
      </svg>
      <p>Simple line style</p>
    `;
  }
  
  function renderSimplePolygonPreview(container) {
    container.innerHTML = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="60" height="60" fill="#3388ff" fill-opacity="0.6" stroke="#000000" stroke-width="1" />
      </svg>
      <p>Simple polygon style</p>
    `;
  }
  
  function renderSimpleRasterPreview(container, colorRamp) {
    container.innerHTML = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="blueGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0000FF;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#00FF00;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#FFFF00;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="80" height="80" fill="url(#blueGreen)" />
      </svg>
      <p>Simple raster style with ${colorRamp || 'Blues'} color ramp</p>
    `;
  }
  
  function renderCategorizedPreview(container, templateId, attribute) {
    const symbolType = templateId.split('_')[1] || 'point';
    let previewHtml = '';
    
    if (symbolType === 'point') {
      previewHtml = `
        <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="10" fill="#1A9641" stroke="#000000" stroke-width="1" />
          <text x="40" y="25" font-size="12">Category 1</text>
          <circle cx="20" cy="50" r="10" fill="#A6D96A" stroke="#000000" stroke-width="1" />
          <text x="40" y="55" font-size="12">Category 2</text>
          <circle cx="20" cy="80" r="10" fill="#FDAE61" stroke="#000000" stroke-width="1" />
          <text x="40" y="85" font-size="12">Category 3</text>
          <circle cx="20" cy="110" r="10" fill="#D7191C" stroke="#000000" stroke-width="1" />
          <text x="40" y="115" font-size="12">Category 4</text>
        </svg>
      `;
    } else if (symbolType === 'line') {
      previewHtml = `
        <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
          <line x1="10" y1="20" x2="40" y2="20" stroke="#1A9641" stroke-width="3" />
          <text x="50" y="25" font-size="12">Category 1</text>
          <line x1="10" y1="50" x2="40" y2="50" stroke="#A6D96A" stroke-width="3" />
          <text x="50" y="55" font-size="12">Category 2</text>
          <line x1="10" y1="80" x2="40" y2="80" stroke="#FDAE61" stroke-width="3" />
          <text x="50" y="85" font-size="12">Category 3</text>
          <line x1="10" y1="110" x2="40" y2="110" stroke="#D7191C" stroke-width="3" />
          <text x="50" y="115" font-size="12">Category 4</text>
        </svg>
      `;
    } else { // polygon
      previewHtml = `
        <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="30" height="20" fill="#1A9641" stroke="#000000" stroke-width="1" />
          <text x="50" y="25" font-size="12">Category 1</text>
          <rect x="10" y="40" width="30" height="20" fill="#A6D96A" stroke="#000000" stroke-width="1" />
          <text x="50" y="55" font-size="12">Category 2</text>
          <rect x="10" y="70" width="30" height="20" fill="#FDAE61" stroke="#000000" stroke-width="1" />
          <text x="50" y="85" font-size="12">Category 3</text>
          <rect x="10" y="100" width="30" height="20" fill="#D7191C" stroke="#000000" stroke-width="1" />
          <text x="50" y="115" font-size="12">Category 4</text>
        </svg>
      `;
    }
    
    previewHtml += `<p>Categorized ${symbolType} style using attribute: ${attribute || 'None selected'}</p>`;
    container.innerHTML = previewHtml;
  }
  
  function renderClassifiedRasterPreview(container) {
    container.innerHTML = `
      <svg width="100" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="25" height="15" fill="#FFFFCC" stroke="#000000" stroke-width="1" />
        <text x="45" y="22" font-size="12">0-50</text>
        <rect x="10" y="35" width="25" height="15" fill="#A1DAB4" stroke="#000000" stroke-width="1" />
        <text x="45" y="47" font-size="12">50-100</text>
        <rect x="10" y="60" width="25" height="15" fill="#41B6C4" stroke="#000000" stroke-width="1" />
        <text x="45" y="72" font-size="12">100-150</text>
        <rect x="10" y="85" width="25" height="15" fill="#2C7FB8" stroke="#000000" stroke-width="1" />
        <text x="45" y="97" font-size="12">150-200</text>
        <rect x="10" y="110" width="25" height="15" fill="#253494" stroke="#000000" stroke-width="1" />
        <text x="45" y="122" font-size="12">200-250</text>
      </svg>
      <p>Classified raster style</p>
    `;
  }
  
  function renderRatCategoricalPreview(container, attribute) {
    container.innerHTML = `
      <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="25" height="15" fill="#1A9641" stroke="#000000" stroke-width="1" />
        <text x="45" y="22" font-size="12">Category 1</text>
        <rect x="10" y="35" width="25" height="15" fill="#A6D96A" stroke="#000000" stroke-width="1" />
        <text x="45" y="47" font-size="12">Category 2</text>
        <rect x="10" y="60" width="25" height="15" fill="#FFFFBF" stroke="#000000" stroke-width="1" />
        <text x="45" y="72" font-size="12">Category 3</text>
        <rect x="10" y="85" width="25" height="15" fill="#FDAE61" stroke="#000000" stroke-width="1" />
        <text x="45" y="97" font-size="12">Category 4</text>
        <rect x="10" y="110" width="25" height="15" fill="#D7191C" stroke="#000000" stroke-width="1" />
        <text x="45" y="122" font-size="12">Category 5</text>
      </svg>
      <p>RAT categorical style using attribute: ${attribute || 'None selected'}</p>
    `;
  }
  
  // Public API
  return {
    renderPreview: renderPreview
  };
})();
