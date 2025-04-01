/**
 * AttributeTable Component
 * 
 * Displays feature attributes in a clean, formatted table
 */

// Define AttributeTable component
const AttributeTable = ({ properties, speciesId }) => {
  // Get species configuration from the manager
  const species = speciesManager.getSpecies(speciesId);
  
  if (!species) {
    return React.createElement("div", { className: "error-message" },
      "Species configuration not found"
    );
  }

  // Process the properties to ensure all derived values are calculated
  const processedProps = processFeatureProperties(properties);
  
  // Define the exact columns we want, in the specified order
  const columns = [
    { key: "SZEB_seed", header: "Seed Zone", derive: (props) => {
      const value = props.SZEB || "";
      const parts = value.split("_");
      return parts[0] ? parts[0].trim() : "";
    }},
    { key: "SZEB_elev", header: "Elevation Band", derive: (props) => {
      const value = props.SZEB || "";
      const parts = value.split("_");
      return parts[1] ? parts[1].trim() : "";
    }},
    { key: "TotalSZEBRanking", header: "Total SZEB Rank" },
    { key: "CombinedRiskCategory", header: "Combined Risk" },
    { key: "ClimateExposureRiskCat", header: "Climate Exposure Risk" },
    { key: "FireIntensityRiskCat", header: "Fire Intensity Risk" },
    { 
      key: "roads_mi", 
      header: "Roads (mi)", 
      derive: (props) => {
        const val = props.roads_mi;
        return (typeof val === "number" && !isNaN(val)) ? Math.round(val) : "";
      }
    }
  ];

  return React.createElement("div", null,
    React.createElement("h4", null,
      species.displayName, " Attributes (",
      React.createElement("i", null, species.scientificName), ")"
    ),
    React.createElement("div", { className: "table-container" },
      React.createElement("table", { className: "mini-attr-table" },
        React.createElement("thead", null,
          React.createElement("tr", null,
            columns.map(col => React.createElement("th", { key: col.key }, col.header))
          )
        ),
        React.createElement("tbody", null,
          React.createElement("tr", null,
            columns.map(col => {
              const value = col.derive ? col.derive(processedProps) : processedProps[col.key];
              return React.createElement("td", { key: col.key }, value !== undefined ? value : "");
            })
          )
        )
      )
    )
  );
};

// Make the component available globally
window.AttributeTable = AttributeTable;
