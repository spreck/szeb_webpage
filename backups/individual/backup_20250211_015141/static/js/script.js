document.addEventListener("DOMContentLoaded", async function () {
  // ==================================================
  // 1. CONFIGURATION & GLOBAL VARIABLES
  // ==================================================
  const DEBUG = false;
  const ENABLE_SECONDARY_QUERY = false;
  const workspace = "SZEB_sample";
  const geoserverUrl = "http://conescout.duckdns.org/geoserver";

  let mapInitialized = false;
  let map;
  let currentRasterLayer = null;

  // ==================================================
  // 2. UI ELEMENTS & DATA CONFIGURATION
  // ==================================================
  const legendContent = document.getElementById("legend-content");
  const sidebar = document.querySelector(".sidebar");
  const rasterDropdown = document.getElementById("rasterSelect");
  const attributeDropdown = document.getElementById("attributeSelect");
  const clickInfoBody = document.getElementById("clickInfoBody");

  const legendCache = new Map();
  const backgroundImages = {
    SZEBxPsme_raster: "/static/images/DouglasFirCones1_Tom-BrandtCC-BY-ND-2.jpg",
    SZEBxPipo_raster: "/static/images/lake-tahoe-trees-ponderosa.jpg"
  };

  const rasters = {
    SZEBxPsme_raster: {
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
            OperationalPriorityCategory: "Operational Priority"
          }
        }
      }
    },
    SZEBxPipo_raster: {
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
            OperationalPriorityCategory: "Operational Priority"
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
    layers: `${workspace}:SZEBs_raw_boundaries`,
    format: "image/png",
    transparent: true,
    version: "1.1.0",
    errorTileUrl: "path/to/error-tile.png",
    pane: "szebPane"
  });

  const roadsLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
    layers: `${workspace}:Roads_CA_Tiger2022_Merge_ExportFeatures`,
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

  // ----- Map Click Handler: Loads attribute table via React -----
  async function handleMapClick(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    const selectedRaster = rasterDropdown.value;
    const vectorLayer = rasters[selectedRaster].vectorLayer;

    // Show a popup with location and external links
    const popupContent = `
      <div>
        <p>Lat: ${lat}, Lng: ${lng}</p>
        <a href="https://cast.forestseedlingnetwork.org/" target="_blank" class="text-blue-600 hover:text-blue-800">CAST Tool</a><br>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="text-blue-600 hover:text-blue-800">Directions</a>
      </div>
    `;
    L.popup({ maxWidth: 300 })
      .setLatLng(e.latlng)
      .setContent(popupContent)
      .openOn(map);

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
      map.off("click", handleMapClick);
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
    const cacheKey = `${layerName}_${styleName}`;
    if (legendCache.has(cacheKey)) {
      legendContent.innerHTML = legendCache.get(cacheKey);
      return;
    }
    legendContent.innerHTML = "Loading legend...";
    const legendURL = `${geoserverUrl}/wms?REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=${workspace}:${layerName}&STYLE=${styleName}`;
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

    const legendDiv = document.getElementById("legend");
    if (attributeName === "Range") {
      legendDiv.style.display = "none";
    } else {
      legendDiv.style.display = "block";
      await fetchLegendFromGeoServer(rasterName, styleName);
    }
  }

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
    rasterDropdown.value = "SZEBxPsme_raster";
    rebuildAttributeDropdown("SZEBxPsme_raster", "Range");
    await Promise.all([
      updateRasterLayer("SZEBxPsme_raster", "Range"),
      updateSidebarBackground("SZEBxPsme_raster")
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
});
