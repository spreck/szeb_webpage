/**
 * Species Manager
 * 
 * This module provides utility functions for working with species data.
 * It handles species configuration loading, filtering enabled species,
 * and providing consistent access to species properties.
 */

class SpeciesManager {
  constructor(config) {
    this.config = config;
    this.activeSpecies = this.getEnabledSpecies();
  }

  /**
   * Returns a list of all species that are enabled
   * @returns {Object} Object with species keys and their configurations
   */
  getEnabledSpecies() {
    const enabledSpecies = {};
    
    for (const [key, species] of Object.entries(this.config)) {
      if (species.enabled) {
        enabledSpecies[key] = species;
      }
    }
    
    return enabledSpecies;
  }

  /**
   * Gets a specific species configuration by ID
   * @param {string} speciesId - The species identifier
   * @returns {Object|null} The species configuration or null if not found
   */
  getSpecies(speciesId) {
    return this.config[speciesId] || null;
  }

  /**
   * Gets the raster layer name for a species
   * @param {string} speciesId - The species identifier
   * @returns {string|null} The raster layer name or null if not found
   */
  getRasterLayer(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.rasterLayer : null;
  }

  /**
   * Gets the vector layer name for a species
   * @param {string} speciesId - The species identifier
   * @returns {string|null} The vector layer name or null if not found
   */
  getVectorLayer(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.vectorLayer : null;
  }

  /**
   * Gets the background image path for a species
   * @param {string} speciesId - The species identifier
   * @returns {string|null} The background image path or null if not found
   */
  getBackgroundImage(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.backgroundImage : null;
  }

  /**
   * Gets attribute metadata for a species
   * @param {string} speciesId - The species identifier
   * @returns {Object|null} The attribute metadata or null if not found
   */
  getAttributes(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.attributes : null;
  }

  /**
   * Gets display name for a species
   * @param {string} speciesId - The species identifier
   * @returns {string|null} The display name or null if not found
   */
  getDisplayName(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.displayName : null;
  }

  /**
   * Gets scientific name for a species
   * @param {string} speciesId - The species identifier
   * @returns {string|null} The scientific name or null if not found
   */
  getScientificName(speciesId) {
    const species = this.getSpecies(speciesId);
    return species ? species.scientificName : null;
  }

  /**
   * Gets the default species (first enabled species)
   * @returns {string|null} The default species ID or null if none available
   */
  getDefaultSpeciesId() {
    const enabledSpecies = this.getEnabledSpecies();
    const speciesIds = Object.keys(enabledSpecies);
    return speciesIds.length > 0 ? speciesIds[0] : null;
  }

  /**
   * Maps an old raster layer name to a species ID
   * @param {string} rasterLayer - The raster layer name
   * @returns {string|null} The species ID or null if not found
   */
  getSpeciesIdFromRasterLayer(rasterLayer) {
    for (const [key, species] of Object.entries(this.config)) {
      if (species.rasterLayer === rasterLayer) {
        return key;
      }
    }
    return null;
  }
}

// Export the class for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpeciesManager };
}
