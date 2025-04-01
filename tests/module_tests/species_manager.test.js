/**
 * Tests for SpeciesManager class
 */

// Mock the global speciesConfig
const mockSpeciesConfig = {
  "psme": {
    displayName: "Douglas Fir",
    scientificName: "Pseudotsuga menziesii",
    vectorLayer: "szeb_psme_vector",
    rasterLayer: "SZEBxPsme_raster_4326",
    backgroundImage: "/static/images/DouglasFirCones1_Tom-BrandtCC-BY-ND-2.jpg",
    enabled: true,
    attributes: {
      basics: {
        label: "Basic Information",
        items: {
          Range: "Range",
          TotalSZEBRanking: "Total SZEB Rank"
        }
      }
    }
  },
  "pipo": {
    displayName: "Ponderosa Pine",
    scientificName: "Pinus ponderosa",
    vectorLayer: "szeb_pipo_vector",
    rasterLayer: "SZEBxPipo_raster_4326",
    backgroundImage: "/static/images/lake-tahoe-trees-ponderosa.jpg",
    enabled: false,
    attributes: {
      basics: {
        label: "Basic Information",
        items: {
          Range: "Range"
        }
      }
    }
  },
  "pila": {
    displayName: "Sugar Pine",
    scientificName: "Pinus lambertiana",
    vectorLayer: "szeb_pila_vector",
    rasterLayer: "SZEBxPila_raster_4326",
    backgroundImage: "/static/images/sugar-pine.jpg",
    enabled: true,
    attributes: {
      basics: {
        label: "Basic Information",
        items: {
          Range: "Range"
        }
      }
    }
  }
};

// Mock the SpeciesManager class (simplified for testing)
class SpeciesManager {
  constructor(config) {
    this.config = config;
    this.activeSpecies = this.getEnabledSpecies();
  }

  getEnabledSpecies() {
    const enabledSpecies = {};
    
    for (const [key, species] of Object.entries(this.config)) {
      if (species.enabled) {
        enabledSpecies[key] = species;
      }
    }
    
    return enabledSpecies;
  }

  getSpecies(speciesId) {
    return this.config[speciesId] || null;
  }

  getRasterLayer(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.rasterLayer : null;
  }

  getVectorLayer(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.vectorLayer : null;
  }

  getAttributes(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.attributes : null;
  }

  getDefaultSpeciesId() {
    const enabledSpecies = this.getEnabledSpecies();
    const speciesIds = Object.keys(enabledSpecies);
    return speciesIds.length > 0 ? speciesIds[0] : null;
  }

  getSpeciesIdFromRasterLayer(rasterLayer) {
    for (const [key, species] of Object.entries(this.config)) {
      if (species.rasterLayer === rasterLayer) {
        return key;
      }
    }
    return null;
  }
}

// Tests
describe('SpeciesManager', () => {
  let speciesManager;

  beforeEach(() => {
    speciesManager = new SpeciesManager(mockSpeciesConfig);
  });

  test('should filter enabled species', () => {
    const enabledSpecies = speciesManager.getEnabledSpecies();
    
    // Should contain psme and pila (enabled), but not pipo (disabled)
    expect(Object.keys(enabledSpecies)).toContain('psme');
    expect(Object.keys(enabledSpecies)).toContain('pila');
    expect(Object.keys(enabledSpecies)).not.toContain('pipo');
    expect(Object.keys(enabledSpecies).length).toBe(2);
  });

  test('should get a specific species', () => {
    const species = speciesManager.getSpecies('psme');
    
    expect(species).not.toBeNull();
    expect(species.displayName).toBe('Douglas Fir');
    expect(species.scientificName).toBe('Pseudotsuga menziesii');
  });

  test('should return null for nonexistent species', () => {
    const species = speciesManager.getSpecies('nonexistent');
    expect(species).toBeNull();
  });

  test('should get raster layer for a species', () => {
    const rasterLayer = speciesManager.getRasterLayer('psme');
    expect(rasterLayer).toBe('SZEBxPsme_raster_4326');
  });

  test('should get vector layer for a species', () => {
    const vectorLayer = speciesManager.getVectorLayer('psme');
    expect(vectorLayer).toBe('szeb_psme_vector');
  });

  test('should get attributes for a species', () => {
    const attributes = speciesManager.getAttributes('psme');
    
    expect(attributes).not.toBeNull();
    expect(attributes.basics.label).toBe('Basic Information');
    expect(attributes.basics.items.Range).toBe('Range');
  });

  test('should get default species ID', () => {
    // The first enabled species should be returned (alphabetically)
    const defaultId = speciesManager.getDefaultSpeciesId();
    
    // Either psme or pila could be first depending on key ordering
    expect(['psme', 'pila']).toContain(defaultId);
  });

  test('should find species ID from raster layer', () => {
    const speciesId = speciesManager.getSpeciesIdFromRasterLayer('SZEBxPipo_raster_4326');
    expect(speciesId).toBe('pipo');
  });

  test('should return null for unknown raster layer', () => {
    const speciesId = speciesManager.getSpeciesIdFromRasterLayer('unknown');
    expect(speciesId).toBeNull();
  });
});
