// Define global mocks for browser environment
global.L = {
  map: jest.fn().mockReturnValue({
    setView: jest.fn().mockReturnThis(),
    createPane: jest.fn(),
    getPane: jest.fn().mockReturnValue({ style: {} }),
    getContainer: jest.fn().mockReturnValue(document.createElement("div")),
    invalidateSize: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    hasLayer: jest.fn().mockReturnValue(true),
    removeLayer: jest.fn()
  }),
  tileLayer: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis()
  }),
  tileLayer: {
    wms: jest.fn().mockReturnValue({
      addTo: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis()
    })
  },
  control: {
    layers: jest.fn().mockReturnValue({
      addTo: jest.fn()
    }),
    scale: jest.fn().mockReturnValue({
      addTo: jest.fn()
    })
  },
  geoJSON: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnThis()
  }),
  Control: {
    MiniMap: jest.fn().mockReturnValue({
      addTo: jest.fn()
    })
  }
};

// Mock fetch API
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: 'test-signal',
  abort: jest.fn()
}));

// Mock URL
global.URL = jest.fn().mockImplementation((url) => ({
  toString: () => url,
  searchParams: {
    append: jest.fn()
  }
}));

// Create DOM elements needed by tests
document.body.innerHTML = `
  <div id="map"></div>
  <div id="legend"></div>
  <select id="rasterSelect"></select>
  <select id="attributeSelect"></select>
`;

// Fix for tests that use setTimeout
jest.useFakeTimers();

// Create a mock GeoServerConfig instance for tests that need it
global.geoServerConfig = {
  getConfig: jest.fn().mockReturnValue({
    url: 'http://test-geoserver.example.com/geoserver',
    workspace: 'test_workspace',
    timeout: 1000,
    retryAttempts: 2,
    cacheExpiration: 60000,
    enableHealthCheck: false
  }),
  getUrl: jest.fn().mockReturnValue('http://test-geoserver.example.com/geoserver'),
  getWorkspace: jest.fn().mockReturnValue('test_workspace'),
  getWmsUrl: jest.fn().mockReturnValue('http://test-geoserver.example.com/geoserver/test_workspace/wms'),
  getWfsUrl: jest.fn().mockReturnValue('http://test-geoserver.example.com/geoserver/test_workspace/wfs'),
  getCredentials: jest.fn().mockReturnValue({ username: 'admin', password: 'geoserver' }),
  getTimeout: jest.fn().mockReturnValue(1000),
  getRetryAttempts: jest.fn().mockReturnValue(2),
  getCacheExpiration: jest.fn().mockReturnValue(60000),
  update: jest.fn()
};
