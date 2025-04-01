// script.js
import * as L from 'https://unpkg.com/leaflet@1.7.1/dist/leaflet-src.esm.js';
import { interpolateTurbo } from 'https://cdn.jsdelivr.net/npm/d3-scale-chromatic@3/+esm';

const map = L.map('map').setView([34.5828, -117.4092], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let geojsonLayer;
let geojsonData;
const propertySelector = document.getElementById('propertySelector');
const legend = document.getElementById('legend');

const wmsBaseEPUrl = 'http://localhost:8080/geoserver/EvacuationProjects/ows';
const geojsonLayerUrl = `${wmsBaseEPUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=EvacuationProjects:Adelanto_all_data&outputFormat=application/json`;

fetch(geojsonLayerUrl)
    .then(response => response.json())
    .then(data => {
        geojsonData = data;
        initializePropertySelector(geojsonData.features[0].properties);
        updateMapVisualization(); // Initially update the map visualization
    })
    .catch(error => console.error('Error fetching GeoJSON:', error));

function initializePropertySelector(properties) {
	for (var prop in properties) {
		var option = document.createElement('option');
		option.value = prop;
		option.innerHTML = prop;
		propertySelector.appendChild(option);
	}
	propertySelector.onchange = updateMapVisualization; // Update visualization on property change
}


function updateMapVisualization() {
	if (geojsonLayer) {
		map.removeLayer(geojsonLayer); // Remove existing layer if any
	}

	var selectedProperty = propertySelector.value;
	var values = geojsonData.features.map(feature => feature.properties[selectedProperty]);
	var min = Math.min(...values);
	var max = Math.max(...values);

	updateLegend(min, max); // Update the legend with new min and max values

	geojsonLayer = L.geoJson(geojsonData, {
		pointToLayer: function (feature, latlng) {
			var value = feature.properties[selectedProperty];
			var normalizedValue = (value - min) / (max - min);
			var color = d3.interpolateRainbow(normalizedValue); // Generate color based on value
			return L.circleMarker(latlng, {
				radius: 8,
				fillColor: color,
				color: '#000',
				weight: 1,
				opacity: 1,
				fillOpacity: 0.8
			});
		}
	}).addTo(map);
}


function updateLegend(min, max) {
	var legend = document.getElementById('legend');
	var steps = 10; // Number of gradient steps
	var heightPerStep = 10; // Height of each gradient step
	var svgHeight = steps * heightPerStep;
	var svgWidth = 100; // Width to accommodate text

	var gradient = `<svg width="${svgWidth}" height="${svgHeight}">`;

	// Generate gradient stops and values
	for (let i = 0; i < steps; i++) {
		var value = ((i / (steps - 1)) * (max - min) + min).toFixed(2);
		// Linear interpolation between blue and red
		var color = d3.interpolateRgb("blue", "red")(i / (steps - 1));
		var yPos = i * heightPerStep;
		gradient += `<rect x="0" y="${yPos}" width="20" height="${heightPerStep}" style="fill:${color};"/>`;
		gradient += `<text x="25" y="${yPos + heightPerStep / 2}" alignment-baseline="middle" style="font-size: 12px;">${value}</text>`;
	}

	gradient += `</svg>`;

	legend.innerHTML = `<div><b>Legend</b></div> ${gradient}`;
}
