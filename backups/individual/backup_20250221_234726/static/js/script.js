document.addEventListener("DOMContentLoaded", async function () {
  // ==================================================
  // 1. CONFIGURATION & GLOBAL VARIABLES
  // ==================================================
  const DEBUG = true;
  const ENABLE_SECONDARY_QUERY = false;
  const workspace = "SZEB_sample";
  const geoserverUrl = "http://conescout.duckdns.org/geoserver";

  let mapInitialized = false;
  let map;
  let currentRasterLayer = null;
  let roiLayer = null; // New global layer for ROI

  // ==================================================
  // 2. UI ELEMENTS & DATA CONFIGURATION
  // ==================================================
  const legendContent = document.getElementById("legend-content");
  const sidebar = document.querySelector(".sidebar");
  const rasterDropdown = document.getElementById("rasterSelect");
  const attributeDropdown = document.getElementById("attributeSelect");
  const clickInfoBody = document.getElementById("clickInfoBody");

  // New ROI elements
  const roiFileInput = document.getElementById("roiFileInput");
  const uploadRoiButton = document.getElementById("uploadRoiButton");
  const zoomToRoiButton = document.getElementById("zoomToRoiButton");
  zoomToRoiButton.disabled = true;

  const legendCache = new Map();
  const backgroundImages = {
    SZEBxPsme_raster_4326: "/static/images/DouglasFirCones1_Tom-BrandtCC-BY-ND-2.jpg",
    SZEBxPipo_raster_4326: "/static/images/lake-tahoe-trees-ponderosa.jpg"
  };

  const rasters = {
    SZEBxPsme_raster_4326: {
      displayName: "Douglas Fir",
      scientificName: "Pseudotsuga menziesii",
      vectorLayer: "szeb_psme_vector",
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
            OperationalPriorityCategory: "Combined Op. Priority"
          }
        }
      }
    },
    SZEBxPipo_raster_4326: {
      displayName: "Ponderosa Pine",
      scientificName: "Pinus ponderosa",
      vectorLayer: "szeb_pipo_vector",
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
            OperationalPriorityCategory: "Combined Op. Priority"
          }
        }
      }
    }
  };

  // Preload background images
  Object.values(backgroundImages).forEach(src => {
    const img = new Image();
    img.src = src;
  });

  // ==================================================
  // 3. BASE & OVERLAY LAYERS
  // ==================================================
  const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  });

  const aerialLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Imagery &copy; Esri",
      maxZoom: 19
    }
  );

  // Overlay layers (also used in layer controls)
  const szebBoundariesLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
    layers: `${workspace}:szebs_raw_boundaries_4326`,
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    errorTileUrl: "path/to/error-tile.png",
    pane: "szebPane"
  });
  
  const elevationBands = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
    layers: `${workspace}:Elev_bands`,
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    errorTileUrl: "path/to/error-tile.png",
    pane: "szebPane"
  });
  
  const seedZones = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
    layers: `${workspace}:SZEBs`,
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    errorTileUrl: "path/to/error-tile.png",
    pane: "szebPane"
  });

  const roadsLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
    layers: `${workspace}:roads_ca_4326`,
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    errorTileUrl: "path/to/error-tile.png",
    pane: "roadsPane"
  });

  const roadsBufferedLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
    layers: `${workspace}:roads_ca_buffer`,
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    styles: "buffer_outline_blue",
    pane: "bufferedRoadsPane"
  });

  // ==================================================
  // 4. CORE FUNCTIONS & EVENT HANDLERS
  // ==================================================

let persistentPopup; // Global popup instance

async function handleMapClick(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    const selectedRaster = rasterDropdown.value;
    const vectorLayer = rasters[selectedRaster].vectorLayer;

    const mapContainer = document.querySelector('.map-container');
    const tableContainer = document.getElementById('table-container');

    // Construct CAST Tool URL
    const castToolUrl = `https://reforestationtools.org/climate-adapted-seed-tool/cast-v-0-059/?_inputs_&selectedLocationType=%22Seed%20Source%22&lat=${lat}&lon=${lng}`;

    // Generate popup content
    const popupContent = `
      <div>
        <p>Lat: ${lat}, Lng: ${lng}</p>
        <a href="${castToolUrl}" target="_blank" class="text-blue-600 hover:text-blue-800">Climate-Adapted Seed Tool</a><br>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="text-blue-600 hover:text-blue-800">Google Maps Driving Directions</a>
      </div>
    `;

    // Initialize or update the persistent popup
    if (!persistentPopup || !map.hasLayer(persistentPopup)) {
        persistentPopup = L.popup({ maxWidth: 300, autoClose: false, closeOnClick: false })
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(map);

        // Listen for manual close to reset the popup reference
        persistentPopup.on('remove', () => {
            persistentPopup = null;
        });
    } else {
        // Update existing popup content and position
        persistentPopup.setLatLng(e.latlng).setContent(popupContent);
    }

    // Move map/table up if not already moved
    if (!mapContainer.classList.contains('map-container-move-up')) {
        mapContainer.classList.add('map-container-move-up');
    }
    if (!tableContainer.classList.contains('table-move-up')) {
        tableContainer.classList.add('table-move-up');
    }
    map.invalidateSize(); // Recalculate map size

    // Update attribute table content
    clickInfoBody.innerHTML = '<div class="p-4 text-center">Loading attribute data...</div>';

    try {
        const bounds = map.getBounds();
        const size = map.getSize();
        const rasterUrl =
            `${geoserverUrl}/${workspace}/wms?` +
            "service=WMS&" +
            "version=1.1.1&" +
            "request=GetFeatureInfo&" +
            `layers=${workspace}:${selectedRaster}&` +
            `query_layers=${workspace}:${selectedRaster}&` +
            "styles=&" +
            `bbox=${bounds.toBBoxString()}&` +
            `width=${size.x}&` +
            `height=${size.y}&` +
            "srs=EPSG:4326&" +
            "format=image/png&" +
            `x=${Math.floor(e.containerPoint.x)}&` +
            `y=${Math.floor(e.containerPoint.y)}&` +
            "feature_count=50&" +
            "info_format=application/json&" +
            "env=addAttributeTable:true";

        const rasterResp = await fetch(rasterUrl);
        if (!rasterResp.ok) throw new Error("Raster GetFeatureInfo request failed");
        const rasterData = await rasterResp.json();

        if (!rasterData.features || rasterData.features.length === 0) {
            clickInfoBody.innerHTML = '<div class="p-4">No data available at this location.</div>';
            return;
        }

        const grayIndex = rasterData.features[0].properties.GRAY_INDEX;
        if (grayIndex === 0 || grayIndex == null) {
            clickInfoBody.innerHTML = '<div class="p-4">No valid data at this location.</div>';
            return;
        }

        const vectorUrl =
            `${geoserverUrl}/${workspace}/wfs?` +
            "service=WFS&" +
            "version=2.0.0&" +
            "request=GetFeature&" +
            "outputFormat=application/json&" +
            `typeName=${workspace}:${vectorLayer}&` +
            `cql_filter=OBJECTID=${grayIndex}`;

        const vectorResp = await fetch(vectorUrl);
        if (!vectorResp.ok) throw new Error("Vector WFS request failed");
        const vectorData = await vectorResp.json();

        if (!vectorData.features || vectorData.features.length === 0) {
            clickInfoBody.innerHTML = '<div class="p-4">Could not retrieve attribute data.</div>';
            return;
        }

        const properties = vectorData.features[0].properties;
        const rasterConfig = rasters[selectedRaster];

        // Clear existing content and render the React attribute table
        const container = document.createElement("div");
        clickInfoBody.innerHTML = "";
        clickInfoBody.appendChild(container);
        ReactDOM.render(
            React.createElement(AttributeTable, { properties, rasterConfig }),
            container
        );
    } catch (error) {
        console.error("Error retrieving data:", error);
        clickInfoBody.innerHTML =
            '<div class="p-4 text-red-600">Error loading attribute data. Check console for details.</div>';
    }
}

// (Re)attach the map click handler
function attachMapClickHandler() {
    if (map) {
        map.off("click", handleMapClick); // Ensure no duplicate handlers
        map.on("click", handleMapClick);
    }
}


  // ----- Map Initialization -----
  function initMap() {
    if (!mapInitialized) {
      map = L.map("map").setView([38, -122], 8);

      // Create custom panes with proper z-index and pointer-events
      ["rasterPane", "szebPane", "roadsPane", "bufferedRoadsPane"].forEach((paneName) => {
        map.createPane(paneName);
      });
      map.getPane("rasterPane").style.zIndex = 450;
      map.getPane("szebPane").style.zIndex = 500;
      map.getPane("roadsPane").style.zIndex = 550;
      map.getPane("bufferedRoadsPane").style.zIndex = 600;
      ["rasterPane", "szebPane", "roadsPane", "bufferedRoadsPane"].forEach((paneName) => {
        map.getPane(paneName).style.pointerEvents = "none";
      });

      // Add default base layer
      aerialLayer.addTo(map);

      const baseMaps = {
        "OpenStreetMap": osmLayer,
        "Aerial Imagery": aerialLayer
      };
      const overlayLayers = {
        "Seed Zones": seedZones,
        "Elevation Bands": elevationBands,
        "SZEB Boundaries": szebBoundariesLayer,
        "Roads": roadsLayer,
        "Roads with 50m buffer": roadsBufferedLayer
      };
      L.control.layers(baseMaps, overlayLayers, { collapsed: false }).addTo(map);
      L.control.scale({ position: "bottomleft", imperial: true, metric: true }).addTo(map);

      // Attach the map click handler so that attribute queries occur on click
      attachMapClickHandler();

      // Mini map
      const miniMapLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
      });
      new L.Control.MiniMap(miniMapLayer, {
        toggleDisplay: true,
        minimized: false,
        position: "bottomright"
      }).addTo(map);

      if (DEBUG) {
        map.on("layeradd layerremove", function () {
          console.log("Current pane z-indices:");
          ["rasterPane", "szebPane", "roadsPane", "bufferedRoadsPane"].forEach((paneName) => {
            const pane = map.getPane(paneName);
            if (pane) console.log(`${paneName}: z-index ${pane.style.zIndex}`);
          });
        });
        roadsLayer.on("loading", () => console.log("Roads layer loading"));
        roadsLayer.on("load", () => console.log("Roads layer loaded"));
        roadsLayer.on("error", (e) => console.error("Roads layer error:", e));
        roadsBufferedLayer.on("loading", () => console.log("Buffered roads layer loading"));
        roadsBufferedLayer.on("load", () => console.log("Buffered roads layer loaded"));
        roadsBufferedLayer.on("error", (e) => console.error("Buffered roads layer error:", e));
      }
      mapInitialized = true;
    }
    // Ensure proper map sizing
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }

  // ----- Legend & Raster/Sidebar Functions -----
	async function fetchLegendFromGeoServer(layerName, styleName) {
		if (!styleName) {
			legendContent.innerHTML = "Select an attribute";
			return;
		}
		
		const timestamp = new Date().getTime(); // Cache-busting timestamp
		const cacheKey = `${layerName}_${styleName}_${timestamp}`;

		if (legendCache.has(cacheKey)) {
			legendContent.innerHTML = legendCache.get(cacheKey);
			return;
		}

		legendContent.innerHTML = "Loading legend...";
		const legendURL = `${geoserverUrl}/wms?REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=${workspace}:${layerName}&STYLE=${styleName}&_t=${timestamp}`;

		try {
			await new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = legendURL;
			});

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

  const topTenCheckbox = document.getElementById("topTenOnlyCheckbox");

  // Existing updateRasterLayer function with modifications:
  async function updateRasterLayer(rasterName, attributeName) {
    if (!mapInitialized) initMap();
    if (currentRasterLayer) map.removeLayer(currentRasterLayer);

    if (!rasterName) {
      legendContent.innerHTML = "Select an attribute";
      return;
    }

    let styleName = "";
    if (attributeName === "Range") {
      styleName = `${rasterName}_range`;
    } else if (attributeName) {
      styleName = `${rasterName}_b0_${attributeName}`;
    }

    // If the attribute is TotalSZEBRanking or CombinedRiskCategory and the checkbox is checked,
    // update the style name to the top-10 variant.
    if (
      (attributeName === "TotalSZEBRanking" /* || attributeName === "CombinedRiskCategory"*/)  &&
      topTenCheckbox && topTenCheckbox.checked
    ) {
      styleName += "_top10";
    }

    const timestamp = new Date().getTime(); // Cache-busting timestamp

    currentRasterLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
      layers: `${workspace}:${rasterName}`,
      styles: styleName,
      format: "image/png",
      transparent: true,
      version: "1.1.0",
      opacity: 0.65,
      pane: "rasterPane",
      errorTileUrl: "path/to/error-tile.png",
      extraParams: { _t: timestamp } // Force reload with timestamp
    });

    currentRasterLayer.addTo(map);

    const legendDiv = document.getElementById("legend");
    if (attributeName === "Range") {
      legendDiv.style.display = "none";
    } else {
      legendDiv.style.display = "block";
      await fetchLegendFromGeoServer(rasterName, styleName);
    }
  }

  // Event listener to update the layer when the checkbox is toggled
  topTenCheckbox.addEventListener("change", function () {
    const currentRaster = rasterDropdown.value;
    const currentAttribute = attributeDropdown.value;
    updateRasterLayer(currentRaster, currentAttribute);
  });

  function populateRasterDropdown() {
    rasterDropdown.innerHTML = "";
    for (let [key, info] of Object.entries(rasters)) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = info.displayName;
      rasterDropdown.appendChild(opt);
    }
  }

  function rebuildAttributeDropdown(rasterName, keepValue) {
    attributeDropdown.innerHTML = "";
    const sections = rasters[rasterName].attributes;
    for (const [sectionKey, section] of Object.entries(sections)) {
      if (sectionKey !== "basics") {
        const divider = document.createElement("option");
        divider.disabled = true;
        divider.className = "dropdown-divider";
        divider.textContent = "─────────────";
        attributeDropdown.appendChild(divider);
      }
      const header = document.createElement("option");
      header.disabled = true;
      header.className = "dropdown-header";
      header.textContent = section.label;
      attributeDropdown.appendChild(header);
      for (const [attrKey, attrLabel] of Object.entries(section.items)) {
        const opt = document.createElement("option");
        opt.value = attrKey;
        opt.textContent = attrLabel;
        attributeDropdown.appendChild(opt);
      }
    }
    if (keepValue && attributeDropdown.querySelector(`option[value="${keepValue}"]`)) {
      attributeDropdown.value = keepValue;
    } else {
      const firstOption = attributeDropdown.querySelector('option:not([disabled])');
      if (firstOption) attributeDropdown.value = firstOption.value;
    }
  }

  // ==================================================
  // 5. INITIALIZATION & EVENT LISTENERS
  // ==================================================
  populateRasterDropdown();
  let firstLoad = true;
  if (firstLoad) {
    rasterDropdown.value = "SZEBxPsme_raster_4326";
    rebuildAttributeDropdown("SZEBxPsme_raster_4326", "Range");
    await Promise.all([
      updateRasterLayer("SZEBxPsme_raster_4326", "Range"),
      updateSidebarBackground("SZEBxPsme_raster_4326")
    ]);
    firstLoad = false;
  }

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
    await updateRasterLayer(rasterDropdown.value, this.value);
  });

  // Initialize the map when the "Map" tab is activated (or if already active)
  document.getElementById("map-tab").addEventListener("click", function () {
    setTimeout(initMap, 300);
  });
  if (document.getElementById("map-section").classList.contains("show")) {
    initMap();
  }


// ============================
// 6. ROI Upload & Zoom Handlers (UPDATED)
// ============================
try {
    const response = await fetch("/has_roi");
    const result = await response.json();
    if (result.has_roi) {
        zoomToRoiButton.disabled = false;
    }
} catch (error) {
    console.error("Error checking ROI existence:", error);
}

customFileButton.addEventListener("click", () => roiFileInput.click());

roiFileInput.addEventListener("change", function () {
    fileNameDisplay.textContent = this.files.length > 0 ? this.files[0].name : "No file chosen";
});

uploadRoiButton.addEventListener("click", async function () {
    const file = roiFileInput.files[0];
    if (!file) {
        alert("Please select a ROI file.");
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10MB).");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/upload_roi", { method: "POST", body: formData });
        const data = await response.json();
        if (data.status === "success") {
            alert("ROI uploaded successfully.");
            zoomToRoiButton.disabled = false;
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Upload error:", err);
        alert("ROI upload failed.");
    }
});

zoomToRoiButton.addEventListener("click", async function () {
    try {
        const response = await fetch("/get_roi");
        const data = await response.json();
        if (data.status === "success") {
            const geojson = data.geojson;
            if (roiLayer) {
                map.removeLayer(roiLayer);
            }
            roiLayer = L.geoJSON(JSON.parse(geojson), { style: { color: "red", weight: 2 } }).addTo(map);
            map.fitBounds(roiLayer.getBounds());
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Error fetching ROI:", err);
        alert("Failed to retrieve ROI.");
    }
});

document.getElementById("clearRoiLink").addEventListener("click", function (e) {
    e.preventDefault();
    if (roiLayer) {
        map.removeLayer(roiLayer);
        roiLayer = null;
    }
    zoomToRoiButton.disabled = true;
});

// ============================
// 6. DOWNLOAD HANDLERS (VECTOR & RASTER)
// ============================
document.getElementById("downloadVectorBtn").addEventListener("click", function (e) {
    e.preventDefault();

    // Get the selected raster layer from dropdown
    const selectedRaster = rasterDropdown.value;

    // Retrieve the correct vector layer from the rasters object
    const vectorTable = rasters[selectedRaster]?.vectorLayer;

    // Debugging: Log the vector table name
    console.log("Selected Raster:", selectedRaster);
    console.log("Mapped Vector Table:", vectorTable);

    if (!vectorTable) {
        alert("Error: No matching vector dataset found.");
        return;
    }

    // Construct the correct download URL
    const url = `/download_roi_intersection?vector=${encodeURIComponent(vectorTable)}`;

    // Debugging: Log the request URL
    console.log("Downloading from URL:", url);

    // Trigger the download
    window.location.href = url;
});

document.getElementById("downloadCurrentViewBtn").addEventListener("click", function (e) {
    e.preventDefault();

    // Get the selected raster layer
    const selectedRaster = rasterDropdown.value;

    // Retrieve the correct vector layer from the rasters object
    const vectorTable = rasters[selectedRaster]?.vectorLayer;

    // Debugging: Log the selected vector table
    console.log("Selected Raster:", selectedRaster);
    console.log("Mapped Vector Table:", vectorTable);

    if (!vectorTable) {
        alert("Error: No matching vector dataset found.");
        return;
    }

    // Get the current bounding box of the map view
    const bounds = map.getBounds();
    const bbox = `${bounds.getSouthWest().lng},${bounds.getSouthWest().lat},${bounds.getNorthEast().lng},${bounds.getNorthEast().lat}`;

    // Construct the download URL with the bounding box
    const url = `/download_map_view?vector=${encodeURIComponent(vectorTable)}&bbox=${encodeURIComponent(bbox)}`;

    // Debugging: Log the request URL
    console.log("Downloading from URL:", url);

    // Trigger the download
    window.location.href = url;
});


document.getElementById("downloadRasterBtn").addEventListener("click", function (e) {
    e.preventDefault();
    let rasterTable = rasterDropdown.value;

    if (!rasterTable) {
        alert("Please select a valid raster dataset.");
        return;
    }

    // Convert the table name to lowercase before making the request
    rasterTable = rasterTable.toLowerCase();

    const url = `/download_raster_intersection?raster=${encodeURIComponent(rasterTable)}`;
    
    // Debugging: Log the final table name
    console.log("Downloading raster intersection for:", rasterTable);

    window.location.href = url;
});


});
