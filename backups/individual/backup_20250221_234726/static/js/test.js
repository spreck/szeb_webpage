// GeoServer and Layer Configuration
const workspace = "SZEB_sample";
const geoserverUrl = "http://conescout.duckdns.org/geoserver";
const layerName = `${workspace}:roads_ca_4326`;

// MapLibre Map Initialization
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {
            'roads-mvt': {
                type: 'vector',
                tiles: [
                    `${geoserverUrl}/gwc/service/tms/1.0.0/${layerName}@EPSG%3A3857@pbf/{z}/{x}/{y}.pbf`
                ],
                minzoom: 0,
                maxzoom: 22
            }
        },
        layers: [
            {
                id: 'roads-layer',
                type: 'line',
                source: 'roads-mvt',
                'source-layer': layerName.split(':')[1], // Layer name after the workspace
                paint: {
                    'line-color': '#ff0000',
                    'line-width': 2
                }
            }
        ]
    },
    center: [-119.417931, 36.778259], // California Coordinates
    zoom: 6
});

// Add Navigation Controls (Zoom, Rotate)
map.addControl(new maplibregl.NavigationControl(), 'top-right');

// Popup for Feature Info
const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: false
});

// Show Popup on Hover
map.on('mousemove', 'roads-layer', (e) => {
    map.getCanvas().style.cursor = 'pointer';

    const properties = e.features[0].properties;
    let description = '<strong>Road Information:</strong><br>';
    for (const [key, value] of Object.entries(properties)) {
        description += `${key}: ${value}<br>`;
    }

    popup.setLngLat(e.lngLat)
        .setHTML(description)
        .addTo(map);
});

// Reset cursor on mouse leave
map.on('mouseleave', 'roads-layer', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
});
