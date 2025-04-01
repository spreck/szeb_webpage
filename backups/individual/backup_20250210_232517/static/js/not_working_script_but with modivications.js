document.addEventListener("DOMContentLoaded", function () {
    var map = L.map("map").setView([38, -122], 8); // Default center: California

    // Define base maps
    var osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
    });
    var aerialLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Imagery &copy; Esri",
        maxZoom: 19
    });

    // Set zIndex so base maps are at the bottom
    osmLayer.setZIndex(1);
    aerialLayer.setZIndex(1);

    // Add default basemap
    aerialLayer.addTo(map);

    // Setup baseMaps object for Layer Control
    var baseMaps = {
        "OpenStreetMap": osmLayer,
        "Aerial Imagery": aerialLayer
    };

    var workspace = "SZEB_sample";
    var geoserverUrl = "http://conescout.duckdns.org/geoserver";
    var currentRasterLayer = null;

    // Define raster layers and attributes
    var rasters = {
        "SZEBxPsme_raster": {
            displayName: "Douglas Fir",
            attributes: {
                "CombinedRiskCategory": "Combined Risk",
                "ClimateExposureRiskCat": "Climate Risk",
                "FireIntensityRiskCat": "Fire Risk",
                "LandownerDemandCat": "Landowner Demand",
                "ProjectedDemandCat": "Projected Demand",
                "CurrentSupplyCat": "Current Supply"
            }
        },
        "SZEBxPipo_raster": {
            displayName: "Ponderosa Pine",
            attributes: {
                "CombinedRiskCategory": "Combined Risk",
                "ClimateExposureRiskCat": "Climate Risk",
                "FireIntensityRiskCat": "Fire Risk",
                "LandownerDemandCat": "Landowner Demand",
                "ProjectedDemandCat": "Projected Demand",
                "CurrentSupplyCat": "Current Supply"
            }
        }
    };

    // Overlays above basemap, below raster
    var szebBoundariesLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
        layers: `${workspace}:SZEBs_raw_boundaries`,
        format: "image/png",
        transparent: true,
        version: "1.1.0"
    }).setZIndex(1000);

    var roadsLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
        layers: `${workspace}:Roads_CA_Tiger2022_Merge_ExportFeatures`,
        format: "image/png",
        transparent: true,
        version: "1.1.0"
    }).setZIndex(101);

    var roadsBufferedLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
        layers: `${workspace}:roads_ca_buffer`,
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        styles: "buffer_outline_blue"
    }).setZIndex(102);

    // Add layer control
    var overlayLayers = {
        "SZEB Boundaries": szebBoundariesLayer,
        "Roads": roadsLayer,
        "Buffered Roads (50m)": roadsBufferedLayer
    };
    L.control.layers(baseMaps, overlayLayers, { collapsed: false }).addTo(map);

    // Helper to update sidebar background images
    function updateSidebarBackground(rasterName) {
        const sidebar = document.querySelector('.sidebar');
        if (rasterName === 'SZEBxPsme_raster') {
            sidebar.style.backgroundImage = 'url("/static/images/DouglasFirCones1_Tom-BrandtCC-BY-ND-2.jpg")';
        } else if (rasterName === 'SZEBxPipo_raster') {
            sidebar.style.backgroundImage = 'url("/static/images/lake-tahoe-trees-ponderosa.jpg")';
        } else {
            sidebar.style.backgroundImage = 'none';
        }
        sidebar.style.backgroundSize = 'cover';
        sidebar.style.backgroundPosition = 'center';
        sidebar.style.backgroundRepeat = 'no-repeat';
    }

    // Populate attribute dropdown
    function populateAttributeDropdown(rasterName) {
        let attributeDropdown = document.getElementById("attributeSelect");
        attributeDropdown.innerHTML = '';  // Clear existing options

        if (rasters[rasterName]) {
            Object.entries(rasters[rasterName].attributes).forEach(([value, displayName]) => {
                let option = document.createElement("option");
                option.value = value;
                option.textContent = displayName;
                attributeDropdown.appendChild(option);
            });

            // Set default attribute
            attributeDropdown.value = "CombinedRiskCat";
        }
    }

    // Update displayed raster layer
    function updateRasterLayer(layerName, attribute = null) {
        if (currentRasterLayer) {
            map.removeLayer(currentRasterLayer);
        }
        if (!layerName) {
            document.getElementById("legend-content").innerHTML = "Select an attribute";
            return;
        }
        let styleName = attribute ? `${layerName}_b0_${attribute}` : "";
        currentRasterLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
            layers: `${workspace}:${layerName}`,
            styles: styleName,
            format: "image/png",
            transparent: true,
            version: "1.1.0",
            opacity: 0.65,
            zIndex: 50
        }).addTo(map);

        // Fetch the legend for the sidebar
        fetchLegendFromGeoServer(layerName, styleName);
    }

    // Fetch legend graphic in the sidebar only
    function fetchLegendFromGeoServer(layerName, styleName) {
        let legendContent = document.getElementById("legend-content");
        legendContent.innerHTML = "Loading legend...";

        if (!styleName) {
            legendContent.innerHTML = "Select an attribute";
            return;
        }

        let legendURL = `${geoserverUrl}/wms?REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=${workspace}:${layerName}&STYLE=${styleName}`;
        legendContent.innerHTML = `
            <img 
                src="${legendURL}" 
                alt="Legend Image" 
                onerror="this.onerror=null;this.src='fallback_legend.png';"
            >
        `;
    }

    // Initialize Raster Dropdown
    function populateRasterDropdown() {
        let rasterDropdown = document.getElementById("rasterSelect");
        rasterDropdown.innerHTML = '';  // Clear existing options

        Object.entries(rasters).forEach(([value, info]) => {
            let option = document.createElement("option");
            option.value = value;
            option.textContent = info.displayName;
            rasterDropdown.appendChild(option);
        });

        // On species change
        rasterDropdown.addEventListener("change", function () {
            let selectedRaster = this.value;
            populateAttributeDropdown(selectedRaster);
            updateRasterLayer(selectedRaster, "CombinedRiskCat");
            updateSidebarBackground(selectedRaster);
        });

        // Set default selection: Douglas Fir
        rasterDropdown.value = "SZEBxPsme_raster";
        populateAttributeDropdown("SZEBxPsme_raster");
        updateRasterLayer("SZEBxPsme_raster", "FireIntensityRiskCat");
        updateSidebarBackground("SZEBxPsme_raster");
    }

    // Add event listener for attribute changes
    document.getElementById("attributeSelect").addEventListener("change", function() {
        let selectedRaster = document.getElementById("rasterSelect").value;
        let selectedAttribute = this.value;
        updateRasterLayer(selectedRaster, selectedAttribute);
    });

    // Initialize
    populateRasterDropdown();

    // Optionally remove overlays by default
    map.removeLayer(szebBoundariesLayer);
    map.removeLayer(roadsLayer);
    map.removeLayer(roadsBufferedLayer);

    // Click popup with directions
    map.on("click", function (e) {
        var lat = e.latlng.lat.toFixed(6);
        var lng = e.latlng.lng.toFixed(6);
        var googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        var popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <b>Latitude:</b> ${lat}<br>
                <b>Longitude:</b> ${lng}<br>
                <a href="${googleMapsUrl}" target="_blank">Get Directions</a>
            `)
            .openOn(map);
    });
});