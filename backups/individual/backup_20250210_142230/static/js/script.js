document.addEventListener("DOMContentLoaded", async function () {
  // ============================================
  // 1. CONFIGURATION AND INITIALIZATION
  // ============================================
  // Debug settings and basic configuration
  const DEBUG = true;
  const workspace = "SZEB_sample";
  const geoserverUrl = "http://conescout.duckdns.org/geoserver";

  // Initialize map and create panes
  const map = L.map("map").setView([38, -122], 8);
  map.createPane("rasterPane");
  map.createPane("szebPane");
  map.createPane("roadsPane");
  map.createPane("bufferedRoadsPane");
  
  // Set pane z-indices and pointer events
  map.getPane("rasterPane").style.zIndex = 450;
  map.getPane("szebPane").style.zIndex = 500;
  map.getPane("roadsPane").style.zIndex = 550;
  map.getPane("bufferedRoadsPane").style.zIndex = 600;
  map.getPane("rasterPane").style.pointerEvents = "none";
  map.getPane("szebPane").style.pointerEvents = "none";
  map.getPane("roadsPane").style.pointerEvents = "none";
  map.getPane("bufferedRoadsPane").style.pointerEvents = "none";

  // Debug controls
  if (DEBUG) {
    const zoomDisplay = L.control({ position: "bottomright" });
    zoomDisplay.onAdd = function () {
      const div = L.DomUtil.create("div", "zoom-level-display");
      div.style.background = "white";
      div.style.padding = "5px";
      div.style.border = "2px solid rgba(0,0,0,0.2)";
      return div;
    };
    zoomDisplay.addTo(map);
    map.on("zoomend", function () {
      const zoomLevel = map.getZoom();
      document.querySelector(".zoom-level-display").innerHTML = `Zoom Level: ${zoomLevel}`;
    });
  }

  // ============================================
  // 2. BASE LAYERS AND CONTROLS
  // ============================================
  // Base tile layers
  const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
    errorTileUrl: "path/to/error-tile.png"
  });

  const aerialLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Imagery &copy; Esri",
    maxZoom: 19,
    errorTileUrl: "path/to/error-tile.png"
  });

  // Add initial layers and controls
  aerialLayer.addTo(map);
  L.control.scale({ position: "bottomleft", imperial: true, metric: true }).addTo(map);

  // ============================================
  // 3. RASTER DATA AND CONFIGURATION
  // ============================================
  let currentRasterLayer = null;
  const szebBoundariesLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
    layers: `${workspace}:SZEBs_raw_boundaries`,
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    errorTileUrl: "path/to/error-tile.png",
    pane: "szebPane"
  });

// Update the attributes object in the rasters configuration
const rasters = {
    SZEBxPsme_raster: {
        displayName: "Douglas Fir",
        scientificName: "Pseudotsuga menziesii",
        attributes: {
            basics: {
                label: "Basic Information",
                items: {
                    Range: "Range",
                    TotalSZEBRanking: "Total SZEB Rank",
                    roads_km: "Roads in Range/SZEB (mi)",
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
                    OperationalPriorityCategory: "Operational Priority"
                }
            }
        }
    },
    SZEBxPipo_raster: {
        displayName: "Ponderosa Pine",
        scientificName: "Pinus ponderosa",
        attributes: {
            basics: {
                label: "Basic Information",
                items: {
                    Range: "Range",
                    TotalSZEBRanking: "Total SZEB Rank",
                    roads_km: "Roads in Range/SZEB (mi)",
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
                    OperationalPriorityCategory: "Operational Priority"
                }
            }
        }
    }
};

  // Background images configuration
  const backgroundImages = {
    SZEBxPsme_raster: "/static/images/DouglasFirCones1_Tom-BrandtCC-BY-ND-2.jpg",
    SZEBxPipo_raster: "/static/images/lake-tahoe-trees-ponderosa.jpg"
  };

  // ============================================
  // 4. UI ELEMENTS AND CACHE MANAGEMENT
  // ============================================
  // DOM elements
  const legendContent = document.getElementById("legend-content");
  const sidebar = document.querySelector(".sidebar");
  const rasterDropdown = document.getElementById("rasterSelect");
  const attributeDropdown = document.getElementById("attributeSelect");
  const clickInfoDiv = document.getElementById("clickInfoTable");
  const attributeTable = document.getElementById("attributeTable");

  // Cache and preload management
  const legendCache = new Map();
  const imagePromises = Object.values(backgroundImages).map((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(`Failed to load ${src}`);
      img.src = src;
    });
  });
  Promise.allSettled(imagePromises).catch(console.error);

 // ============================================
  // 5. WMS ROADS LAYERS
  // ============================================
  if (!L.tileLayer.wms) {
    console.error("Leaflet WMS plugin not found. Check that it's included before this script.");
  } else {
    // Road lines layer
	 const roadsLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
		layers: `${workspace}:Roads_CA_Tiger2022_Merge_ExportFeatures`,
		format: "image/png",
		transparent: true,
		version: "1.1.0",
		errorTileUrl: "path/to/error-tile.png",
		pane: "roadsPane"
	  });

    // Buffered roads layer
	const roadsBufferedLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
        layers: `${workspace}:roads_ca_buffer`,
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        styles: "buffer_outline_blue",
		pane: "bufferedRoadsPane"
	  });


    // Make layers available globally for layer control
    window._roadsLayer = roadsLayer;
    window._roadsBufferedLayer = roadsBufferedLayer;

    // Debug logging if enabled
    if (DEBUG) {
      roadsLayer.on("loading", () => console.log("Roads layer loading"));
      roadsLayer.on("load", () => console.log("Roads layer loaded"));
      roadsLayer.on("error", (e) => console.error("Roads layer error:", e));
      
      roadsBufferedLayer.on("loading", () => console.log("Buffered roads layer loading"));
      roadsBufferedLayer.on("load", () => console.log("Buffered roads layer loaded"));
      roadsBufferedLayer.on("error", (e) => console.error("Buffered roads layer error:", e));
    }
  }
  // ============================================
  // 6. CORE FUNCTIONALITY AND EVENT HANDLERS
  // ============================================
  // Legend and layer update functions
  async function fetchLegendFromGeoServer(layerName, styleName) {
    if (!styleName) {
      legendContent.innerHTML = "Select an attribute";
      return;
    }
    const cacheKey = `${layerName}_${styleName}`;
    if (legendCache.has(cacheKey)) {
      legendContent.innerHTML = legendCache.get(cacheKey);
      return;
    }
    legendContent.innerHTML = "Loading legend...";
    const legendURL = `${geoserverUrl}/wms?REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=${workspace}:${layerName}&STYLE=${styleName}`;
    try {
      const loadPromise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = legendURL;
      });
      await loadPromise;
      const legendHTML = `<img src="${legendURL}" alt="Legend Image" />`;
      legendCache.set(cacheKey, legendHTML);
      legendContent.innerHTML = legendHTML;
    } catch (error) {
      console.error("Legend loading failed:", error);
      legendContent.innerHTML = "Legend unavailable";
    }
  }

  async function updateSidebarBackground(rasterName) {
    const imagePath = backgroundImages[rasterName];
    if (!imagePath) {
      sidebar.style.backgroundImage = "none";
      return;
    }
    sidebar.classList.add("loading");
    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = imagePath;
      });
      sidebar.style.backgroundImage = `url("${imagePath}")`;
    } catch (error) {
      console.error("Background image loading failed:", error);
      sidebar.style.backgroundImage = "none";
    } finally {
      sidebar.classList.remove("loading");
    }
    sidebar.style.backgroundSize = "cover";
    sidebar.style.backgroundPosition = "center";
    sidebar.style.backgroundRepeat = "no-repeat";
  }

async function updateRasterLayer(rasterName, attributeName) {
    if (currentRasterLayer) {
        map.removeLayer(currentRasterLayer);
    }
    if (!rasterName) {
        legendContent.innerHTML = "Select an attribute";
        return;
    }
    let styleName = "";
    if (attributeName === "Range") {
        styleName = `${rasterName}_range`;  // Use a specific range style for each species
    } else if (attributeName) {
        styleName = `${rasterName}_b0_${attributeName}`;
    }
    
    currentRasterLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
        layers: `${workspace}:${rasterName}`,
        styles: styleName,
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        opacity: 0.65,
        pane: "rasterPane",
        errorTileUrl: "path/to/error-tile.png"
    });
    currentRasterLayer.addTo(map);
    
    // Hide or show the entire legend div based on attribute
    const legendDiv = document.getElementById("legend");
    if (attributeName === "Range") {
        legendDiv.style.display = "none";
    } else {
        legendDiv.style.display = "block";
        await fetchLegendFromGeoServer(rasterName, styleName);
    }
}

  // Dropdown population functions
  function populateRasterDropdown() {
    rasterDropdown.innerHTML = "";
    for (let [key, info] of Object.entries(rasters)) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = info.displayName;
      rasterDropdown.appendChild(opt);
    }
  }
// Update the dropdown population function
function rebuildAttributeDropdown(rasterName, keepValue) {
    attributeDropdown.innerHTML = "";
    const sections = rasters[rasterName].attributes;
    
    for (const [sectionKey, section] of Object.entries(sections)) {
        if (sectionKey !== "basics") {
            // Add divider before new sections
            const divider = document.createElement("option");
            divider.disabled = true;
            divider.className = "dropdown-divider";
            divider.textContent = "─────────────";
            attributeDropdown.appendChild(divider);
        }
        
        // Add section header
        const header = document.createElement("option");
        header.disabled = true;
        header.className = "dropdown-header";
        header.textContent = section.label;
        attributeDropdown.appendChild(header);
        
        // Add section items
        for (const [attrKey, attrLabel] of Object.entries(section.items)) {
            const opt = document.createElement("option");
            opt.value = attrKey;
            opt.textContent = attrLabel;
            attributeDropdown.appendChild(opt);
        }
    }
    
    // Set the selected value
    if (keepValue && attributeDropdown.querySelector(`option[value="${keepValue}"]`)) {
        attributeDropdown.value = keepValue;
    } else {
        // Default to first non-disabled option
        const firstOption = attributeDropdown.querySelector('option:not([disabled])');
        if (firstOption) {
            attributeDropdown.value = firstOption.value;
        }
    }
}
  // ============================================
  // 7. MAP CONTROLS AND LAYER MANAGEMENT
  // ============================================
  // Layer control setup
  const baseMaps = {
    OpenStreetMap: osmLayer,
    "Aerial Imagery": aerialLayer
  };

  const overlayLayers = {
    "SZEB Boundaries": szebBoundariesLayer,
    "Roads": window._roadsLayer,
    "Roads with 50m buffer": window._roadsBufferedLayer
  };


  L.control.layers(baseMaps, overlayLayers, { collapsed: false }).addTo(map);

  // Initial layer loading
  let firstLoad = true;
  populateRasterDropdown();
  if (firstLoad) {
    rasterDropdown.value = "SZEBxPsme_raster";
    rebuildAttributeDropdown("SZEBxPsme_raster", "Range");
    Promise.all([
      updateRasterLayer("SZEBxPsme_raster", "Range"),
      updateSidebarBackground("SZEBxPsme_raster")
    ]).catch(console.error);
    firstLoad = false;
  }

  // ============================================
  // 8. EVENT LISTENERS AND INTERACTIVE FEATURES
  // ============================================
  // Dropdown event listeners
  rasterDropdown.addEventListener("change", async function () {
    const newRaster = this.value;
    const oldAttribute = attributeDropdown.value;
    rebuildAttributeDropdown(newRaster, oldAttribute);
    const finalAttribute = attributeDropdown.value;
    await Promise.all([
      updateRasterLayer(newRaster, finalAttribute),
      updateSidebarBackground(newRaster)
    ]);
  });

  attributeDropdown.addEventListener("change", async function () {
    const currentRaster = rasterDropdown.value;
    const newAttribute = this.value;
    await updateRasterLayer(currentRaster, newAttribute);
  });

  // Map click handler
map.on("click", async function (e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const selectedRaster = rasterDropdown.value || "SZEBxPsme_raster";
    const selectedLatinName = rasters[selectedRaster]?.scientificName || "Pseudotsuga menziesii";
    const castUrl = `https://reforestationtools.org/climate-adapted-seed-tool/cast-v-0-059/?_inputs_&selectedLocationType=%22Seed%20Source%22&lat=${lat}&lon=${lng}&sp_selected=%22${encodeURIComponent(selectedLatinName)}%22`;
    
    if (!currentRasterLayer) return;
    
    const point = map.latLngToContainerPoint(e.latlng, map.getZoom());
    const size = map.getSize();
    
	const params = {
		request: "GetFeatureInfo",
		service: "WMS",
		srs: "EPSG:4326",
		styles: "",  // Empty style to get raw data
		transparent: true,
		version: "1.1.0",
		format: "image/png",
		bbox: map.getBounds().toBBoxString(),
		height: size.y,
		width: size.x,
		layers: `${workspace}:${selectedRaster}`,
		query_layers: `${workspace}:${selectedRaster}`,
		info_format: "application/json",
		feature_count: 1,  // We only need one feature
		x: point.x,
		y: point.y,
		buffer: 1,  // Small buffer to ensure we get the clicked pixel
		//propertyName: '*'  // Request all properties
	};

    const url = `${geoserverUrl}/${workspace}/wms${L.Util.getParamString(params, "", true)}`;
    let popupHtml = `
        <b>Latitude:</b> ${lat}<br/>
        <b>Longitude:</b> ${lng}<br/>
        <b>Species:</b> ${rasters[selectedRaster]?.displayName || "Douglas Fir"}<br/>
        <a href="${googleMapsUrl}" target="_blank">Get Directions</a><br/>
        <a href="${castUrl}" target="_blank">View CAST Tool</a>
    `;

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("GetFeatureInfo request failed");
        const data = await resp.json();
        
        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties;
            const rasterConfig = rasters[selectedRaster].attributes;
            
            // Build feature info table with sections
            let infoTableHtml = `<h4>Pixel Attributes</h4>`;
            
            // Function to add a section of attributes
            const addSection = (sectionKey, section) => {
                let sectionHtml = `
                    <div class="attribute-section">
                        <h5 class="section-header">${section.label}</h5>
                        <table class="mini-attr-table">
                            <tbody>`;
                
                // Add each attribute in the section
                for (const [attrKey, attrLabel] of Object.entries(section.items)) {
                    if (props.hasOwnProperty(attrKey)) {
                        sectionHtml += `
                            <tr>
                                <td><strong>${attrLabel}</strong></td>
                                <td>${props[attrKey]}</td>
                            </tr>`;
                    }
                }
                
                sectionHtml += `
                            </tbody>
                        </table>
                    </div>`;
                return sectionHtml;
            };

            // Add each section in order
            for (const [sectionKey, section] of Object.entries(rasterConfig)) {
                infoTableHtml += addSection(sectionKey, section);
            }

            // Update the info div with all attributes organized by section
            clickInfoDiv.innerHTML = infoTableHtml;
            
            // Add a summary to the popup
            popupHtml += `<hr/><b>Summary:</b><br/>`;
            if (props.TotalSZEBRanking) {
                popupHtml += `<strong>Total SZEB Rank:</strong> ${props.TotalSZEBRanking}<br/>`;
            }
            if (props.CombinedRiskCategory) {
                popupHtml += `<strong>Combined Risk:</strong> ${props.CombinedRiskCategory}<br/>`;
            }
        }
    } catch (error) {
        console.error("Error retrieving feature info:", error);
        clickInfoDiv.innerHTML = `<div class="error-message">Error retrieving pixel data</div>`;
    }
    
    L.popup().setLatLng(e.latlng).setContent(popupHtml).openOn(map);
});
  // ============================================
  // 9. UTILITIES AND ADDITIONAL FEATURES
  // ============================================
  // Attribute table functions
  async function loadAllRasterAttributes() {
    const html = `
      <thead>
          <tr>
              <th onclick="sortTable(0)">Field1</th>
              <th onclick="sortTable(1)">Field2</th>
          </tr>
      </thead>
      <tbody>
          <tr>
              <td>Sample A</td>
              <td>Data A</td>
          </tr>
          <tr>
              <td>Sample B</td>
              <td>Data B</td>
          </tr>
      </tbody>
    `;
    attributeTable.innerHTML = html;
  }

  window.sortTable = function (colIndex) {
    const table = attributeTable;
    let switching = true;
    let direction = "asc";
    while (switching) {
      switching = false;
      let rows = table.rows;
      for (let i = 1; i < rows.length - 1; i++) {
        let shouldSwitch = false;
        const x = rows[i].getElementsByTagName("TD")[colIndex];
        const y = rows[i + 1].getElementsByTagName("TD")[colIndex];
        if (direction === "asc") {
          if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
            shouldSwitch = true;
            break;
          }
        } else if (direction === "desc") {
          if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
            shouldSwitch = true;
            break;
          }
        }
        if (shouldSwitch) {
          rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
          switching = true;
          break;
        }
      }
      if (!shouldSwitch) {
        if (direction === "asc") {
          direction = "desc";
          switching = true;
        }
      }
    }
  };

  //loadAllRasterAttributes();

  // Mini map setup
  const miniMapLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  });

  const miniMap = new L.Control.MiniMap(miniMapLayer, {
    toggleDisplay: true,
    minimized: false,
    position: "bottomright"
  }).addTo(map);

  // Styles
  const style = document.createElement("style");
  style.textContent = `
    .sidebar.loading {
      position: relative;
    }
    .sidebar.loading::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .zoom-level-display {
      background: white;
      padding: 5px;
      border-radius: 4px;
      box-shadow: 0 1px 5px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif;
      font-size: 12px;
    }
    .mini-attr-table {
      font-family: Arial, sans-serif;
      font-size: 12px;
      width: 100%;
    }
    .mini-attr-table td {
      padding: 4px 6px;
    }
  `;
  document.head.appendChild(style);

  // Debug event listeners
  if (DEBUG) {
    map.on("layeradd layerremove", function () {
      console.log("Current pane z-indices:");
      ["rasterPane", "szebPane", "roadsPane", "bufferedRoadsPane"].forEach((paneName) => {
        const pane = map.getPane(paneName);
        if (pane) {
          console.log(`${paneName}: z-index ${pane.style.zIndex}`);
        }
      });
    });
  }
});