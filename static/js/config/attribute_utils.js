/**
 * Attribute Utilities
 * 
 * Helper functions for working with attribute data, formatting, and transformations.
 */

/**
 * Format a numeric value with the appropriate unit
 * @param {number} value - The value to format
 * @param {string} attribute - The attribute name 
 * @returns {string} Formatted value with unit
 */
function formatAttributeValue(value, attribute) {
  if (value === undefined || value === null) {
    return "";
  }
  
  if (typeof value !== 'number' || isNaN(value)) {
    return value.toString();
  }
  
  // Apply specific formatting based on attribute name
  switch (attribute) {
    case 'roads_mi':
    case 'roads_km':
      return Math.round(value).toString();
      
    case 'range_area_km2':
      // Convert km² to acres
      const acres = value * 247.105;
      return Math.round(acres).toLocaleString();
      
    case 'TotalSZEBRanking':
    case 'ClimateExposureRiskCat':
    case 'FireIntensityRiskCat':
    case 'CombinedRiskCategory':
    case 'LandownerDemandCat':
    case 'ProjectedDemandCat': 
    case 'CurrentSupplyCat':
    case 'OperationalPriorityCategory':
      // Keep category values as is
      return value.toString();
      
    default:
      // Default formatting for other numeric values
      return typeof value === 'number' && !isNaN(value) 
        ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
        : value.toString();
  }
}

/**
 * Extract seed zone and elevation band from SZEB string
 * @param {string} szebString - The SZEB string (e.g. "123_4500")
 * @returns {Object} Object with seed zone and elevation band
 */
function parseSZEB(szebString) {
  if (!szebString) {
    return { seedZone: "", elevationBand: "" };
  }
  
  const parts = szebString.split("_");
  return {
    seedZone: parts[0] ? parts[0].trim() : "",
    elevationBand: parts[1] ? parts[1].trim() : ""
  };
}

/**
 * Process raw feature properties into a standardized attribute table format
 * @param {Object} properties - Raw properties from GeoServer
 * @returns {Object} Processed properties with derived values
 */
function processFeatureProperties(properties) {
  const processed = { ...properties };
  
  // Add derived SZEB properties if not already present
  if (properties.SZEB && !properties.SZEB_seed && !properties.SZEB_elev) {
    const { seedZone, elevationBand } = parseSZEB(properties.SZEB);
    processed.SZEB_seed = seedZone;
    processed.SZEB_elev = elevationBand;
  }
  
  // Ensure roads_mi exists (convert from km if needed)
  if (properties.roads_km !== undefined && properties.roads_mi === undefined) {
    processed.roads_mi = properties.roads_km * 0.621371;
  }
  
  return processed;
}

// Export the functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    formatAttributeValue,
    parseSZEB,
    processFeatureProperties
  };
}
