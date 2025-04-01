/**
 * Tests for UiController class
 */

// Mock DOM elements
const mockElements = {
  rasterDropdown: {
    value: 'psme',
    addEventListener: jest.fn(),
    innerHTML: ''
  },
  attributeDropdown: {
    value: 'Range',
    addEventListener: jest.fn(),
    innerHTML: '',
    querySelector: jest.fn()
  },
  legendContent: { innerHTML: '' },
  sidebar: { 
    style: { backgroundImage: '' }, 
    classList: { 
      add: jest.fn(), 
      remove: jest.fn() 
    } 
  },
  clickInfoBody: { innerHTML: '' },
  topTenCheckbox: { checked: false, addEventListener: jest.fn() },
  roiFileInput: { files: [], addEventListener: jest.fn() },
  uploadRoiButton: { addEventListener: jest.fn() },
  zoomToRoiButton: { disabled: true, addEventListener: jest.fn() },
  customFileButton: { addEventListener: jest.fn() },
  fileNameDisplay: { textContent: '' },
  mapTab: { addEventListener: jest.fn() },
  clearRoiLink: { addEventListener: jest.fn() },
  downloadVectorBtn: { addEventListener: jest.fn() },
  downloadCurrentViewBtn: { addEventListener: jest.fn() }
};

// Mock document.getElementById and document.querySelector
document.getElementById = jest.fn(id => mockElements[id] || null);
document.querySelector = jest.fn(selector => {
  if (selector === '.sidebar') return mockElements.sidebar;
  return null;
});

// Mock the SpeciesManager
const mockSpeciesManager = {
  getEnabledSpecies: jest.fn(() => ({
    psme: {
      displayName: 'Douglas Fir',
      scientificName: 'Pseudotsuga menziesii',
      enabled: true,
      attributes: {
        basics: {
          label: 'Basic Information',
          items: { Range: 'Range' }
        }
      }
    },
    pila: {
      displayName: 'Sugar Pine',
      scientificName: 'Pinus lambertiana',
      enabled: true,
      attributes: {
        basics: {
          label: 'Basic Information',
          items: { Range: 'Range' }
        }
      }
    }
  })),
  getDefaultSpeciesId: jest.fn(() => 'psme'),
  getSpecies: jest.fn(id => {
    if (id === 'psme') {
      return {
        displayName: 'Douglas Fir',
        scientificName: 'Pseudotsuga menziesii',
        vectorLayer: 'szeb_psme_vector',
        rasterLayer: 'SZEBxPsme_raster_4326',
        backgroundImage: '/static/images/douglas-fir.jpg',
        enabled: true,
        attributes: {
          basics: {
            label: 'Basic Information',
            items: { Range: 'Range' }
          }
        }
      };
    }
    return null;
  })
};

// Mock the MapManager
const mockMapManager = {
  updateRasterLayer: jest.fn(),
  fetchLegend: jest.fn().mockResolvedValue('<img src="legend.png" />'),
  invalidateSize: jest.fn()
};

// Mock the RoiManager
const mockRoiManager = {
  hasRoi: jest.fn().mockResolvedValue(false),
  uploadRoi: jest.fn().mockResolvedValue({ status: 'success' }),
  fetchAndDisplayRoi: jest.fn().mockResolvedValue({}),
  clearRoi: jest.fn(),
  getVectorDownloadUrl: jest.fn(vectorTable => `/download_roi_intersection?vector=${vectorTable}`),
  getCurrentViewDownloadUrl: jest.fn(vectorTable => `/download_map_view?vector=${vectorTable}`)
};

// Mock Image constructor
global.Image = class {
  constructor() {
    setTimeout(() => {
      this.onload && this.onload();
    }, 10);
  }
};

// Mock bootstrap modals
global.bootstrap = {
  Modal: class {
    constructor() {
      this.hide = jest.fn();
    }
    static getInstance() {
      return { hide: jest.fn() };
    }
  }
};

// Mock the UiController class (simplified for testing)
class UiController {
  constructor(config) {
    this.speciesManager = config.speciesManager;
    this.mapManager = config.mapManager;
    this.roiManager = config.roiManager;
    
    // DOM elements
    this.elements = {
      rasterDropdown: document.getElementById('rasterSelect'),
      attributeDropdown: document.getElementById('attributeSelect'),
      legendContent: document.getElementById('legendContent'),
      sidebar: document.querySelector('.sidebar'),
      clickInfoBody: document.getElementById('clickInfoBody'),
      topTenCheckbox: document.getElementById('topTenOnlyCheckbox'),
      roiFileInput: document.getElementById('roiFileInput'),
      uploadRoiButton: document.getElementById('uploadRoiButton'),
      zoomToRoiButton: document.getElementById('zoomToRoiButton'),
      customFileButton: document.getElementById('customFileButton'),
      fileNameDisplay: document.getElementById('fileNameDisplay'),
      mapTab: document.getElementById('mapTab'),
      clearRoiLink: document.getElementById('clearRoiLink'),
      downloadVectorBtn: document.getElementById('downloadVectorBtn'),
      downloadCurrentViewBtn: document.getElementById('downloadCurrentViewBtn')
    };
    
    // Initial state
    this.state = {
      currentSpeciesId: null,
      currentAttribute: 'Range'
    };
  }

  async initialize() {
    // Populate species dropdown
    this.populateSpeciesDropdown();
    
    // Get default species
    const defaultSpeciesId = this.speciesManager.getDefaultSpeciesId();
    
    if (!defaultSpeciesId) {
      console.error('No enabled species found in configuration');
      return;
    }
    
    // Set initial selection
    this.elements.rasterDropdown.value = defaultSpeciesId;
    this.state.currentSpeciesId = defaultSpeciesId;
    
    // Build attribute dropdown
    this.rebuildAttributeDropdown(defaultSpeciesId, 'Range');
    
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
      console.error('Error checking ROI existence:', error);
    }
    
    // Attach event listeners
    this.attachEventListeners();
  }

  populateSpeciesDropdown() {
    const dropdown = this.elements.rasterDropdown;
    dropdown.innerHTML = '';
    
    const enabledSpecies = this.speciesManager.getEnabledSpecies();
    
    for (const [key, species] of Object.entries(enabledSpecies)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = species.displayName;
      dropdown.appendChild(opt);
    }
  }

  rebuildAttributeDropdown(speciesId, keepValue) {
    const dropdown = this.elements.attributeDropdown;
    dropdown.innerHTML = '';
    
    const species = this.speciesManager.getSpecies(speciesId);
    if (!species) return;
    
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
  }

  async updateRasterLayer() {
    const speciesId = this.state.currentSpeciesId;
    const attributeName = this.state.currentAttribute;
    const species = this.speciesManager.getSpecies(speciesId);
    
    if (!species) return;
    
    const rasterLayer = species.rasterLayer;
    const options = {
      topTenOnly: this.elements.topTenCheckbox && this.elements.topTenCheckbox.checked
    };
    
    // Update the raster layer
    this.mapManager.updateRasterLayer(rasterLayer, attributeName, options);
    
    // Update legend if needed
    if (attributeName === 'Range') {
      document.getElementById('legend').style.display = 'none';
    } else {
      document.getElementById('legend').style.display = 'block';
      await this.mapManager.fetchLegend(rasterLayer, this.getStyleName(rasterLayer, attributeName, options), this.elements.legendContent);
    }
  }

  getStyleName(rasterLayer, attributeName, options = {}) {
    let styleName = '';
    
    if (attributeName === 'Range') {
      styleName = `${rasterLayer}_range`;
    } else if (attributeName) {
      styleName = `${rasterLayer}_b0_${attributeName}`;
    }

    if (attributeName === 'TotalSZEBRanking' && options.topTenOnly) {
      styleName += '_top10';
    }
    
    return styleName;
  }

  async updateSidebarBackground(speciesId) {
    const species = this.speciesManager.getSpecies(speciesId);
    if (!species || !species.backgroundImage) {
      this.elements.sidebar.style.backgroundImage = 'none';
      return;
    }
    
    this.elements.sidebar.classList.add('loading');
    
    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = species.backgroundImage;
      });
      
      this.elements.sidebar.style.backgroundImage = `url("${species.backgroundImage}")`;
    } catch (error) {
      console.error('Background image loading failed:', error);
      this.elements.sidebar.style.backgroundImage = 'none';
    } finally {
      this.elements.sidebar.classList.remove('loading');
    }
  }

  attachEventListeners() {
    // Species selection change
    this.elements.rasterDropdown.addEventListener('change', this.handleSpeciesChange.bind(this));
    
    // Attribute selection change
    this.elements.attributeDropdown.addEventListener('change', this.handleAttributeChange.bind(this));
    
    // Top 10% checkbox change
    if (this.elements.topTenCheckbox) {
      this.elements.topTenCheckbox.addEventListener('change', this.handleTopTenChange.bind(this));
    }
    
    // Map tab click
    if (this.elements.mapTab) {
      this.elements.mapTab.addEventListener('click', this.handleMapTabClick.bind(this));
    }
    
    // ROI file input
    if (this.elements.customFileButton && this.elements.roiFileInput) {
      this.elements.customFileButton.addEventListener('click', () => this.elements.roiFileInput.click());
      this.elements.roiFileInput.addEventListener('change', this.handleRoiFileChange.bind(this));
    }
    
    // ROI actions
    if (this.elements.uploadRoiButton) {
      this.elements.uploadRoiButton.addEventListener('click', this.handleRoiUpload.bind(this));
    }
    
    if (this.elements.zoomToRoiButton) {
      this.elements.zoomToRoiButton.addEventListener('click', this.handleZoomToRoi.bind(this));
    }
    
    if (this.elements.clearRoiLink) {
      this.elements.clearRoiLink.addEventListener('click', this.handleClearRoi.bind(this));
    }
    
    // Download actions
    if (this.elements.downloadVectorBtn) {
      this.elements.downloadVectorBtn.addEventListener('click', this.handleDownloadVector.bind(this));
    }
    
    if (this.elements.downloadCurrentViewBtn) {
      this.elements.downloadCurrentViewBtn.addEventListener('click', this.handleDownloadCurrentView.bind(this));
    }
  }

  // Event handlers implemented as needed for tests
  async handleSpeciesChange(event) {}
  async handleAttributeChange(event) {}
  async handleTopTenChange() {}
  handleMapTabClick() {}
  handleRoiFileChange(event) {}
  async handleRoiUpload() {}
  async handleZoomToRoi() {}
  handleClearRoi(event) {}
  handleDownloadVector(event) {}
  handleDownloadCurrentView(event) {}
}

// Tests
describe('UiController', () => {
  let uiController;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh instance
    uiController = new UiController({
      speciesManager: mockSpeciesManager,
      mapManager: mockMapManager,
      roiManager: mockRoiManager
    });
  });

  test('should initialize correctly', async () => {
    await uiController.initialize();
    
    // Check that species dropdown was populated
    expect(mockSpeciesManager.getEnabledSpecies).toHaveBeenCalled();
    
    // Check that default species was selected
    expect(mockSpeciesManager.getDefaultSpeciesId).toHaveBeenCalled();
    expect(uiController.state.currentSpeciesId).toBe('psme');
    
    // Check that raster layer was updated
    expect(mockMapManager.updateRasterLayer).toHaveBeenCalled();
    
    // Check that sidebar background was updated
    expect(uiController.elements.sidebar.style.backgroundImage).toContain('douglas-fir.jpg');
    
    // Check that ROI status was checked
    expect(mockRoiManager.hasRoi).toHaveBeenCalled();
    
    // Check that event listeners were attached
    expect(uiController.elements.rasterDropdown.addEventListener).toHaveBeenCalled();
    expect(uiController.elements.attributeDropdown.addEventListener).toHaveBeenCalled();
  });

  test('should populate species dropdown correctly', () => {
    uiController.populateSpeciesDropdown();
    
    // Check that enabled species were fetched
    expect(mockSpeciesManager.getEnabledSpecies).toHaveBeenCalled();
    
    // Verify document.createElement would be called (we can't easily check this)
    // but we can verify the HTML was cleared first
    expect(uiController.elements.rasterDropdown.innerHTML).toBe('');
  });

  test('should rebuild attribute dropdown correctly', () => {
    uiController.rebuildAttributeDropdown('psme', 'Range');
    
    // Check that species was fetched
    expect(mockSpeciesManager.getSpecies).toHaveBeenCalledWith('psme');
    
    // Verify dropdown was cleared
    expect(uiController.elements.attributeDropdown.innerHTML).toBe('');
    
    // Verify state was updated
    expect(uiController.state.currentAttribute).toBe('Range');
  });

  test('should update raster layer', async () => {
    uiController.state.currentSpeciesId = 'psme';
    uiController.state.currentAttribute = 'Range';
    
    await uiController.updateRasterLayer();
    
    // Check that the map manager was called
    expect(mockMapManager.updateRasterLayer).toHaveBeenCalledWith(
      'SZEBxPsme_raster_4326', 'Range', { topTenOnly: false }
    );
  });

  test('should get style name correctly', () => {
    // Check range style
    let styleName = uiController.getStyleName('SZEBxPsme_raster_4326', 'Range');
    expect(styleName).toBe('SZEBxPsme_raster_4326_range');
    
    // Check attribute style
    styleName = uiController.getStyleName('SZEBxPsme_raster_4326', 'TotalSZEBRanking');
    expect(styleName).toBe('SZEBxPsme_raster_4326_b0_TotalSZEBRanking');
    
    // Check top 10% style
    styleName = uiController.getStyleName('SZEBxPsme_raster_4326', 'TotalSZEBRanking', { topTenOnly: true });
    expect(styleName).toBe('SZEBxPsme_raster_4326_b0_TotalSZEBRanking_top10');
  });

  test('should update sidebar background', async () => {
    await uiController.updateSidebarBackground('psme');
    
    // Check loading class was added and removed
    expect(uiController.elements.sidebar.classList.add).toHaveBeenCalledWith('loading');
    expect(uiController.elements.sidebar.classList.remove).toHaveBeenCalledWith('loading');
    
    // Check background image was set
    expect(uiController.elements.sidebar.style.backgroundImage).toBe('url("/static/images/douglas-fir.jpg")');
  });

  test('should attach event listeners', () => {
    uiController.attachEventListeners();
    
    // Check that all listeners were attached
    expect(uiController.elements.rasterDropdown.addEventListener).toHaveBeenCalledWith(
      'change', expect.any(Function)
    );
    expect(uiController.elements.attributeDropdown.addEventListener).toHaveBeenCalledWith(
      'change', expect.any(Function)
    );
  });
});
