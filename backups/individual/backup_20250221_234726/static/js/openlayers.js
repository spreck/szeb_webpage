const workspace = "SZEB_sample";
const geoserverUrl = "http://conescout.duckdns.org/geoserver";
const layerName = `${workspace}:roads_ca_4326`;

// WMTS parameters
const params = {
    'REQUEST': 'GetTile',
    'SERVICE': 'WMTS',
    'VERSION': '1.0.0',
    'LAYER': layerName,
    'STYLE': '',
    'TILEMATRIX': 'EPSG:4326:{z}',
    'TILEMATRIXSET': 'EPSG:4326',
    'FORMAT': 'application/vnd.mapbox-vector-tile',
    'TILECOL': '{x}',
    'TILEROW': '{y}'
};

// Construct the WMTS URL
let url = `${geoserverUrl}/gwc/service/wmts?`;
for (const param in params) {
    url += `${param}=${params[param]}&`;
}
url = url.slice(0, -1);

// Define EPSG:4326 resolutions and extent
const resolutions = [
    0.703125, 0.3515625, 0.17578125, 0.087890625,
    0.0439453125, 0.02197265625, 0.010986328125,
    0.0054931640625, 0.00274658203125, 0.001373291015625,
    0.0006866455078125, 0.00034332275390625,
    0.000171661376953125, 0.0000858306884765625,
    0.00004291534423828125, 0.000021457672119140625
];

// Create the vector tile source
const source = new ol.source.VectorTile({
    url: url,
    format: new ol.format.MVT(),
    projection: 'EPSG:4326',
    tileGrid: new ol.tilegrid.WMTS({
        origin: [-180, 90],  // Top-left corner of the world
        resolutions: resolutions,
        matrixIds: Array.from({length: resolutions.length}, (_, i) => `EPSG:4326:${i}`),
        tileSize: 256
    })
});

// Create the vector tile layer
const layer = new ol.layer.VectorTile({
    source: source,
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#0080ff',
            width: 2
        })
    })
});

// Create the map with EPSG:4326 projection
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        }),
        layer
    ],
    view: new ol.View({
        projection: 'EPSG:4326',
        center: [-119.417931, 36.778259], // California coordinates in WGS 84
        zoom: 6,
        maxResolution: resolutions[0]
    })
});

// Set up tooltip functionality
const tooltip = document.getElementById('tooltip');
const tooltipContent = document.getElementById('tooltip-content');
const closeButton = document.getElementById('close-button');
let isPinned = false;

function updateTooltipContent(properties) {
    tooltipContent.innerHTML = Object.entries(properties)
        .filter(([key]) => key !== 'geometry') // Exclude geometry property
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');
}

map.on('pointermove', (evt) => {
    if (isPinned) return;
    
    const feature = map.forEachFeatureAtPixel(evt.pixel, feature => feature);
    
    if (feature) {
        updateTooltipContent(feature.getProperties());
        tooltip.style.left = (evt.originalEvent.clientX + 10) + 'px';
        tooltip.style.top = (evt.originalEvent.clientY + 10) + 'px';
        tooltip.style.display = 'block';
    } else {
        tooltip.style.display = 'none';
    }
});

map.on('click', (evt) => {
    if (isPinned) {
        isPinned = false;
        tooltip.style.display = 'none';
    } else {
        const feature = map.forEachFeatureAtPixel(evt.pixel, feature => feature);
        
        if (feature) {
            updateTooltipContent(feature.getProperties());
            tooltip.style.left = (evt.originalEvent.clientX + 10) + 'px';
            tooltip.style.top = (evt.originalEvent.clientY + 10) + 'px';
            tooltip.style.display = 'block';
            isPinned = true;
        }
    }
});

closeButton.addEventListener('click', () => {
    tooltip.style.display = 'none';
    isPinned = false;
});