/**
 * Species Configuration File
 * 
 * This file contains configuration for all species available in the Cone Scouting Tool.
 * To add a new species, simply add a new entry to the speciesConfig object with the appropriate properties.
 * 
 * Each species entry should have the following structure:
 * {
 *   displayName: "Common Name",          // The display name shown in the dropdown
 *   scientificName: "Scientific name",   // Scientific name (shown in table headers and tooltips)
 *   vectorLayer: "geoserver_vector_name", // Name of the vector layer in GeoServer
 *   rasterLayer: "geoserver_raster_name", // Name of the raster layer in GeoServer
 *   backgroundImage: "/static/images/your-image.jpg", // Path to species background image
 *   enabled: true,                       // Set to false to disable this species
 *   attributes: {                       // Attribute categories and their items
 *     basics: {
 *       label: "Basic Information",      // Section label
 *       items: {                        // Key-value pairs for attributes
 *         Range: "Range", 
 *         ...
 *       }
 *     },
 *     ...
 *   }
 * }
 */

const speciesConfig = {
  // Douglas Fir Configuration
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
          TotalSZEBRanking: "Total SZEB Rank",
          roads_mi: "Roads in Range/SZEB (mi)",
          range_area_km2: "Range Area (ac)"
        }
      },
      risks: {
        label: "Risk Factors",
        items: {
          ClimateExposureRiskCat: "Climate Exposure Risk",
          FireIntensityRiskCat: "Fire Intensity Risk",
          CombinedRiskCategory: "Combined Risk"
        }
      },
      operations: {
        label: "Operational Factors",
        items: {
          LandownerDemandCat: "Landowner Demand",
          ProjectedDemandCat: "Projected Demand",
          CurrentSupplyCat: "Current Supply",
          OperationalPriorityCategory: "Combined Op. Priority"
        }
      }
    }
  },
  
  // Ponderosa Pine Configuration
  "pipo": {
    displayName: "Ponderosa Pine",
    scientificName: "Pinus ponderosa",
    vectorLayer: "szeb_pipo_vector",
    rasterLayer: "SZEBxPipo_raster_4326",
    backgroundImage: "/static/images/lake-tahoe-trees-ponderosa.jpg",
    enabled: true,
    attributes: {
      basics: {
        label: "Basic Information",
        items: {
          Range: "Range",
          TotalSZEBRanking: "Total SZEB Rank",
          roads_mi: "Roads in Range/SZEB (mi)",
          range_area_km2: "Range Area (ac)"
        }
      },
      risks: {
        label: "Risk Factors",
        items: {
          ClimateExposureRiskCat: "Climate Exposure Risk",
          FireIntensityRiskCat: "Fire Intensity Risk",
          CombinedRiskCategory: "Combined Risk"
        }
      },
      operations: {
        label: "Operational Factors",
        items: {
          LandownerDemandCat: "Landowner Demand",
          ProjectedDemandCat: "Projected Demand",
          CurrentSupplyCat: "Current Supply",
          OperationalPriorityCategory: "Combined Op. Priority"
        }
      }
    }
  },
  
  // Example of a disabled species (template for adding new ones)
  "pila": {
    displayName: "Sugar Pine",
    scientificName: "Pinus lambertiana",
    vectorLayer: "szeb_pila_vector",
    rasterLayer: "SZEBxPila_raster_4326",
    backgroundImage: "/static/images/sugar-pine.jpg",
    enabled: false, // Set to true once GeoServer layers are available
    attributes: {
      basics: {
        label: "Basic Information",
        items: {
          Range: "Range",
          TotalSZEBRanking: "Total SZEB Rank",
          roads_mi: "Roads in Range/SZEB (mi)",
          range_area_km2: "Range Area (ac)"
        }
      },
      risks: {
        label: "Risk Factors",
        items: {
          ClimateExposureRiskCat: "Climate Exposure Risk",
          FireIntensityRiskCat: "Fire Intensity Risk",
          CombinedRiskCategory: "Combined Risk"
        }
      },
      operations: {
        label: "Operational Factors",
        items: {
          LandownerDemandCat: "Landowner Demand",
          ProjectedDemandCat: "Projected Demand",
          CurrentSupplyCat: "Current Supply",
          OperationalPriorityCategory: "Combined Op. Priority"
        }
      }
    }
  }
};

// Export the configuration for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { speciesConfig };
}
