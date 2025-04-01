// Configuration
const DEBUG = true;
const workspace = "SZEB_sample";
const geoserverUrl = GEOSERVER_URL || "http://conescout.duckdns.org/geoserver";

// Test configurations for probing RAT functionality
const testConfigs = {
  'Standard GetFeatureInfo': {
    info_format: 'application/json'
  },
  'GetFeatureInfo with RAT': {
    info_format: 'application/json',
    env: 'addAttributeTable:true'  // Add vendor option as env parameter
  },
  'GetFeatureInfo with Label': {
    info_format: 'application/json',
    env: 'labelInFeatureInfo:add'  // Try to get colormap labels
  },
  'GetFeatureInfo with Both': {
    info_format: 'application/json',
    env: 'addAttributeTable:true;labelInFeatureInfo:add'  // Try both
  },
  'GetFeatureInfo GeoJSON': {
    info_format: 'application/json',
    env: 'addAttributeTable:true',
    format_options: 'callback:processJson'  // Try format options
  },
  'GetFeatureInfo XML': {
    info_format: 'text/xml',
    env: 'addAttributeTable:true'  // Try XML format
  }
};

// UI Elements
const runAllButton = document.getElementById('runAllTests');
const copyButton = document.getElementById('copyLog');
const clearButton = document.getElementById('clearLog');
const responseLog = document.getElementById('responseLog');
const testStatus = document.getElementById('testStatus');
const coordsDisplay = document.getElementById('selectedCoords');
const rasterSelect = document.getElementById('rasterSelect');
const testTypeSelect = document.getElementById('testType');
// Container for vector lookup results
const vectorResultsContainer = document.getElementById('vectorResults');
// Container for successful queries (make sure this element exists in your HTML)
const successfulQueriesContainer = document.getElementById('successfulQueries');

// Global array to store successful query URLs
let successfulQueries = [];

// Utility functions for saving and displaying successful queries
function saveSuccessfulQuery(queryUrl) {
  successfulQueries.push(queryUrl);
  updateSuccessfulQueriesBox();
}

function updateSuccessfulQueriesBox() {
  if (successfulQueriesContainer) {
    let html = "<ul>";
    successfulQueries.forEach(q => {
      html += `<li>${q}</li>`;
    });
    html += "</ul>";
    successfulQueriesContainer.innerHTML = html;
  }
}

// Store selected coordinates and state
let selectedCoords = null;
let lastFeatureInfo = null;  // Store last GetFeatureInfo response for RAT lookups
let featureColumns = new Map(); // Store feature columns for each layer

// Initialize map
const map = L.map("map").setView([38, -122], 8);
map.createPane("rasterPane");
map.getPane("rasterPane").style.zIndex = 450;

// Add base layer
const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

// Add raster layer
let currentRasterLayer = null;

async function getFeatureTypeInfo(rasterName) {
  // Try to get feature type info using WFS DescribeFeatureType
  const wfsUrl = `${geoserverUrl}/${workspace}/wfs?` +
    'service=WFS' +
    '&version=2.0.0' +
    '&request=DescribeFeatureType' +
    `&typeName=${workspace}:${rasterName}`;

  try {
    const wfsResponse = await fetch(wfsUrl);
    const wfsResponseText = await wfsResponse.text();
    
    logResponse('Feature Type Info - Request URL', wfsUrl);
    logResponse('Feature Type Info - Response Headers', formatJSON(Object.fromEntries(wfsResponse.headers)));
    logResponse('Feature Type Info - Response', wfsResponseText);

    // Then get coverage metadata via WCS
    const wcsUrl = `${geoserverUrl}/${workspace}/wcs?` +
      'service=WCS' +
      '&version=2.0.1' +
      '&request=DescribeCoverage' +
      `&coverageId=${workspace}:${rasterName}`;

    const wcsResponse = await fetch(wcsUrl);
    const wcsResponseText = await wcsResponse.text();
    
    logResponse('Coverage Info - Request URL', wcsUrl);
    logResponse('Coverage Info - Response Headers', formatJSON(Object.fromEntries(wcsResponse.headers)));
    logResponse('Coverage Info - Response', wcsResponseText);

    const parser = new DOMParser();
    const wfsXml = parser.parseFromString(wfsResponseText, 'text/xml');
    const wcsXml = parser.parseFromString(wcsResponseText, 'text/xml');
    
    const fields = [];

    // Extract fields from WFS feature type
    const wfsElements = wfsXml.getElementsByTagName('xsd:element');
    Array.from(wfsElements).forEach(element => {
      const name = element.getAttribute('name');
      const type = element.getAttribute('type')?.split(':').pop();
      if (name && type && name !== 'the_geom') {
        fields.push({ name, type });
      }
    });

    // Extract fields from WCS coverage
    const rangeType = wcsXml.getElementsByTagName('swe:field');
    Array.from(rangeType).forEach(field => {
      const name = field.getAttribute('name');
      if (name && !fields.some(f => f.name === name)) {
        fields.push({ name, type: 'number' });
      }
    });
    
    // Always ensure key field is included for RAT lookups
    if (!fields.some(f => f.name === 'Value')) {
      fields.push({ name: 'Value', type: 'number' });
    }
    
    featureColumns.set(rasterName, fields);
    
    logResponse('Available Fields', formatJSON({ layer: rasterName, fields: fields }));

  } catch (error) {
    logResponse('Feature Type Info - Error', error.message);
    featureColumns.set(rasterName, [
      { name: 'GRAY_INDEX', type: 'number' },
      { name: 'Value', type: 'number' }
    ]);
  }
}

async function updateRasterLayer(rasterName) {
  if (currentRasterLayer) {
    map.removeLayer(currentRasterLayer);
  }
  
  currentRasterLayer = L.tileLayer.wms(`${geoserverUrl}/${workspace}/wms`, {
    layers: `${workspace}:${rasterName}`,
    format: 'image/png',
    transparent: true,
    version: '1.1.0',
    opacity: 0.65,
    pane: 'rasterPane'
  }).addTo(map);

  await getFeatureTypeInfo(rasterName);
}

// Helper Functions
function formatJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

function clearLog() {
  responseLog.textContent = 'Click on the map to start testing...';
  if (vectorResultsContainer) {
    vectorResultsContainer.innerHTML = '';
    vectorResultsContainer.style.border = ""; // Reset flagging style
  }
}

function logResponse(title, content) {
  const timestamp = new Date().toLocaleTimeString();
  responseLog.textContent += `\n\n[${timestamp}] ${title}:\n${content}`;
  responseLog.scrollTop = responseLog.scrollHeight;
}

async function copyToClipboard() {
  const text = responseLog.textContent;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Log copied to clipboard!');
    } catch (err) {
      alert('Failed to copy log. Please try selecting and copying manually.');
    }
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('Log copied to clipboard!');
      } else {
        alert('Failed to copy log. Please try selecting and copying manually.');
      }
    } catch (err) {
      alert('Failed to copy log. Please try selecting and copying manually.');
    }
    document.body.removeChild(textArea);
  }
}

/**
 * Build the GetFeatureInfo URL.
 * If the vendor option for the full RAT is in use, omit the propertyName parameter.
 */
function buildGetFeatureInfoUrl(latlng, containerPoint, testConfig) {
  const rasterName = rasterSelect.value;
  const columns = featureColumns.get(rasterName);
  
  let url = `${geoserverUrl}/${workspace}/wms?` +
    'service=WMS' +
    '&version=1.1.1' +
    '&request=GetFeatureInfo' +
    `&layers=${workspace}:${rasterName}` +
    `&query_layers=${workspace}:${rasterName}` +
    '&styles=' +
    `&bbox=${map.getBounds().toBBoxString()}` +
    `&width=${map.getSize().x}` +
    `&height=${map.getSize().y}` +
    '&srs=EPSG:4326' +
    '&format=image/png' +
    `&x=${Math.floor(containerPoint.x)}` +
    `&y=${Math.floor(containerPoint.y)}` +
    '&feature_count=50';

  Object.entries(testConfig).forEach(([key, value]) => {
    if (key === 'env' && value.includes(';')) {
      const envParams = value.split(';').map(env => encodeURIComponent(env)).join(';');
      url += `&${key}=${envParams}`;
    } else {
      url += `&${key}=${encodeURIComponent(value)}`;
    }
  });

  if (!(testConfig.env && testConfig.env.includes("addAttributeTable:true"))) {
    if (columns && columns.length > 0) {
      const uniqueProperties = [...new Set(columns.map(col => col.name))];
      url += `&propertyName=${uniqueProperties.join(',')}`;
    }
  }
  return url;
}

/**
 * Render the vector lookup results in a table.
 * Expects a GeoJSON FeatureCollection.
 * After building the table, this function flags the result by adding a green border
 * to the container and logging a message.
 */
function renderVectorResults(data) {
  if (!vectorResultsContainer) return;
  if (!data.features || data.features.length === 0) {
    vectorResultsContainer.innerHTML = '<p>No matching vector records found.</p>';
    return;
  }
  
  // Use the keys from the first feature's properties as table headers.
  const headers = Object.keys(data.features[0].properties);
  let tableHTML = '<table border="1" cellspacing="0" cellpadding="5"><thead><tr>';
  headers.forEach(header => {
    tableHTML += `<th>${header}</th>`;
  });
  tableHTML += '</tr></thead><tbody>';
  
  data.features.forEach(feature => {
    tableHTML += '<tr>';
    headers.forEach(header => {
      let value = feature.properties[header];
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      tableHTML += `<td>${value}</td>`;
    });
    tableHTML += '</tr>';
  });
  
  tableHTML += '</tbody></table>';
  vectorResultsContainer.innerHTML = tableHTML;
  // Flag the table as populated by adding a green border
  vectorResultsContainer.style.border = "2px solid green";
  logResponse("Vector Results", `Table populated with ${data.features.length} record(s).`);
}

/**
 * Look up vector attributes for the raster value.
 * Now, we use "OBJECTID" as the field to match the raster’s GRAY_INDEX.
 * Only if the returned GeoJSON contains features (i.e. a populated attribute table)
 * will the query be flagged as successful.
 */
async function lookupVectorAttributes(rasterName, keyValue) {
  let vectorLayer = '';
  if (rasterName.toLowerCase().includes('psme')) {
    vectorLayer = 'szeb_psme_vector';
  } else if (rasterName.toLowerCase().includes('pipo')) {
    vectorLayer = 'szeb_pipo_vector';
  } else {
    logResponse('Vector Lookup', 'No corresponding vector layer found for this raster.');
    return;
  }
  
  // Use "OBJECTID" as the key attribute.
  const vectorAttribute = "OBJECTID";
  const filter = `${vectorAttribute}=${keyValue}`;
  
  const wfsUrl = `${geoserverUrl}/${workspace}/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeName=${workspace}:${vectorLayer}&cql_filter=${encodeURIComponent(filter)}`;
  
  logResponse('Vector Lookup - Request URL', wfsUrl);
  
  try {
    const response = await fetch(wfsUrl);
    const data = await response.json();
    logResponse('Vector Lookup - Response', formatJSON(data));
    // Only save the query as successful if the attribute table is populated
    if (data.features && data.features.length > 0) {
      saveSuccessfulQuery(wfsUrl);
    }
    renderVectorResults(data);
  } catch (err) {
    logResponse('Vector Lookup - Error', err.message);
  }
}

async function runTest(latlng, containerPoint, testName) {
  const testConfig = testConfigs[testName];
  const url = buildGetFeatureInfoUrl(latlng, containerPoint, testConfig);
  
  logResponse(`${testName} - Request URL`, url);

  try {
    const response = await fetch(url);
    logResponse(`${testName} - Response Headers`, formatJSON(Object.fromEntries(response.headers)));

    const contentType = response.headers.get('content-type');
    let responseContent;
    let parsedResponse;
    
    if (contentType && contentType.includes('application/json')) {
      parsedResponse = await response.json();
      responseContent = formatJSON(parsedResponse);
      
      // Save successful raster query (if desired, you could also condition this on the presence of data)
      saveSuccessfulQuery(url);
      
      if (testName === 'Standard GetFeatureInfo') {
        lastFeatureInfo = parsedResponse;
      }
      
      // For the RAT test, extract GRAY_INDEX and trigger vector lookup.
      if (testName === 'GetFeatureInfo with RAT' &&
          parsedResponse.features && parsedResponse.features.length > 0 &&
          parsedResponse.features[0].properties.GRAY_INDEX !== undefined) {
        const keyValue = parsedResponse.features[0].properties.GRAY_INDEX;
        logResponse('Vector Lookup Initiated', `Using key value: ${keyValue}`);
        lookupVectorAttributes(rasterSelect.value, keyValue);
      }
    } else {
      responseContent = await response.text();
    }
    
    logResponse(`${testName} - Response Content`, responseContent);
  } catch (error) {
    logResponse(`${testName} - Error`, error.message);
  }
}

async function runAllTests(latlng, containerPoint) {
  runAllButton.disabled = true;
  testStatus.innerHTML = '<div class="status running">Running tests...</div>';

  try {
    for (const testName of Object.keys(testConfigs)) {
      await runTest(latlng, containerPoint, testName);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    testStatus.innerHTML = '<div class="status complete">All tests complete!</div>';
  } catch (error) {
    testStatus.innerHTML = `<div class="status error">Error: ${error.message}</div>`;
  } finally {
    runAllButton.disabled = false;
  }
}

// Event Listeners
map.on('click', function(e) {
  selectedCoords = {
    latlng: e.latlng,
    containerPoint: e.containerPoint
  };
  
  coordsDisplay.textContent = `Lat: ${e.latlng.lat.toFixed(6)}, Lng: ${e.latlng.lng.toFixed(6)}`;
  runAllButton.disabled = false;

  const testType = testTypeSelect.value;
  runTest(e.latlng, e.containerPoint, testType);
});

runAllButton.addEventListener('click', () => {
  if (selectedCoords) {
    clearLog();
    runAllTests(selectedCoords.latlng, selectedCoords.containerPoint);
  }
});

clearButton.addEventListener('click', clearLog);
copyButton.addEventListener('click', copyToClipboard);
rasterSelect.addEventListener('change', async function() {
  await updateRasterLayer(this.value);
});

// Populate test type dropdown
Object.keys(testConfigs).forEach(testType => {
  const option = document.createElement('option');
  option.value = testType;
  option.textContent = testType;
  testTypeSelect.appendChild(option);
});

// Initialize first raster layer
updateRasterLayer("SZEBxPsme_raster");
