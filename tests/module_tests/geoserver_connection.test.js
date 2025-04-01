/**
 * GeoServer Connection Test Suite
 * 
 * Tests the GeoServerConnection module functionality
 */

// Import modules (adapt as needed for your test environment)
const { GeoServerConfig } = require('../../static/js/modules/geoserver-config.test');
const { GeoServerConnection } = require('../../static/js/modules/geoserver-connection.test');

// Mock fetch API if testing in Node environment
global.fetch = jest.fn();

describe('GeoServerConnection', () => {
  let config;
  let connection;
  
  beforeEach(() => {
    // Reset mocks and create fresh instances
    fetch.mockReset();
    
    config = new GeoServerConfig({
      url: 'http://test-geoserver.example.com/geoserver',
      workspace: 'test_workspace',
      timeout: 1000,
      retryAttempts: 2
    });
    
    connection = new GeoServerConnection(config);
    
    // Mock Image for legend tests
    global.Image = class {
      constructor() {
        setTimeout(() => {
          this.onload && this.onload();
        }, 10);
      }
    };
  });
  
  describe('checkHealth', () => {
    test('returns true when GeoServer is available', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ about: { version: '2.19.0' } })
      });
      
      const result = await connection.checkHealth();
      
      expect(result).toBe(true);
      expect(connection.isAvailable).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://test-geoserver.example.com/geoserver/rest/about/version.json',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );
    });
    
    test('returns false when GeoServer is unavailable', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      });
      
      const result = await connection.checkHealth();
      
      expect(result).toBe(false);
      expect(connection.isAvailable).toBe(false);
      expect(connection.lastError).toHaveProperty('status', 503);
    });
    
    test('handles network failures gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network failure'));
      
      const result = await connection.checkHealth();
      
      expect(result).toBe(false);
      expect(connection.isAvailable).toBe(false);
      expect(connection.lastError).toHaveProperty('message', 'Network error while checking GeoServer health');
    });
    
    test('triggers events when connection status changes', async () => {
      // Setup event listeners
      const connectionErrorHandler = jest.fn();
      const connectionRestoredHandler = jest.fn();
      
      connection.addEventListener('connectionError', connectionErrorHandler);
      connection.addEventListener('connectionRestored', connectionRestoredHandler);
      
      // Initial state is available
      connection.isAvailable = true;
      
      // First check fails - should trigger connectionError
      fetch.mockResolvedValueOnce({ ok: false, status: 503 });
      await connection.checkHealth();
      
      expect(connectionErrorHandler).toHaveBeenCalledTimes(1);
      expect(connectionRestoredHandler).toHaveBeenCalledTimes(0);
      
      // Second check succeeds - should trigger connectionRestored
      fetch.mockResolvedValueOnce({ ok: true });
      await connection.checkHealth();
      
      expect(connectionErrorHandler).toHaveBeenCalledTimes(1);
      expect(connectionRestoredHandler).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('executeWithRetry', () => {
    test('succeeds on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await connection.executeWithRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    test('retries on failure and succeeds on second attempt', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');
      
      const result = await connection.executeWithRetry(mockFn, { retryDelay: 10 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
    
    test('throws error after all retries fail', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockRejectedValueOnce(new Error('Third attempt failed'));
      
      await expect(connection.executeWithRetry(mockFn, { retries: 2, retryDelay: 10 }))
        .rejects.toThrow('Third attempt failed');
      
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
    
    test('uses cache for repeated requests', async () => {
      const mockFn = jest.fn().mockResolvedValue('cached result');
      
      // First call - should execute the function
      await connection.executeWithRetry(mockFn, { cacheKey: 'test-key' });
      
      // Second call with same cache key - should use cached result
      await connection.executeWithRetry(mockFn, { cacheKey: 'test-key' });
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('getWmsLayer', () => {
    test('creates a WMS layer with correct options', () => {
      // Mock L.TileLayer.wms
      global.L = {
        tileLayer: {
          wms: jest.fn().mockReturnValue({
            on: jest.fn().mockReturnThis()
          })
        }
      };
      
      const layer = connection.getWmsLayer('test_layer', {
        format: 'image/png',
        transparent: true
      });
      
      expect(L.tileLayer.wms).toHaveBeenCalledWith(
        'http://test-geoserver.example.com/geoserver/test_workspace/wms',
        expect.objectContaining({
          layers: 'test_workspace:test_layer',
          format: 'image/png',
          transparent: true
        })
      );
    });
  });
  
  describe('getFeature', () => {
    test('fetches features successfully', async () => {
      const mockGeoJson = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { id: 1 }, geometry: {} }]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeoJson
      });
      
      const result = await connection.getFeature('test_layer', 'id=1');
      
      expect(result).toEqual(mockGeoJson);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('service=WFS'),
        expect.any(Object)
      );
    });
    
    test('handles fetch errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });
      
      await expect(connection.getFeature('test_layer', 'id=1'))
        .rejects.toThrow('WFS request failed with status: 404');
    });
    
    test('handles timeout errors', async () => {
      // Mock AbortController
      global.AbortController = jest.fn().mockImplementation(() => ({
        signal: 'test-signal',
        abort: jest.fn()
      }));
      
      // Mock timeout
      jest.useFakeTimers();
      setTimeout(() => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        fetch.mockRejectedValueOnce(error);
      }, 1100);
      
      const promise = connection.getFeature('test_layer', 'id=1');
      jest.runAllTimers();
      
      await expect(promise).rejects.toThrow('WFS request timed out after 1000ms');
    });
  });
  
  describe('getFeatureInfo', () => {
    test('gets feature info at click location', async () => {
      // Setup map mocks
      const map = {
        getBounds: jest.fn().mockReturnValue({
          toBBoxString: jest.fn().mockReturnValue('-180,-90,180,90')
        }),
        getSize: jest.fn().mockReturnValue({ x: 800, y: 600 }),
        latLngToContainerPoint: jest.fn().mockReturnValue({ x: 400, y: 300 })
      };
      
      // Setup response mock
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [{ properties: { id: 1 } }] })
      });
      
      const result = await connection.getFeatureInfo(
        'test_layer',
        { lat: 0, lng: 0 },
        map
      );
      
      expect(result).toHaveProperty('features');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('REQUEST=GetFeatureInfo'),
        expect.any(Object)
      );
    });
  });
  
  describe('getLegendUrl', () => {
    test('returns a valid legend URL', async () => {
      const url = await connection.getLegendUrl('test_layer', 'test_style');
      
      expect(url).toContain('REQUEST=GetLegendGraphic');
      expect(url).toContain('LAYER=test_workspace:test_layer');
      expect(url).toContain('STYLE=test_style');
    });
    
    test('returns null when style is not provided', async () => {
      const url = await connection.getLegendUrl('test_layer', '');
      
      expect(url).toBeNull();
    });
  });
  
  describe('clearCache', () => {
    test('clears the entire cache', async () => {
      // Fill cache with some items
      connection.cache.set('key1', { data: 'value1', expiration: Date.now() + 10000 });
      connection.cache.set('key2', { data: 'value2', expiration: Date.now() + 10000 });
      
      connection.clearCache();
      
      expect(connection.cache.size).toBe(0);
    });
    
    test('clears specific cache entries by prefix', async () => {
      // Fill cache with some items
      connection.cache.set('prefix1_key1', { data: 'value1', expiration: Date.now() + 10000 });
      connection.cache.set('prefix1_key2', { data: 'value2', expiration: Date.now() + 10000 });
      connection.cache.set('prefix2_key3', { data: 'value3', expiration: Date.now() + 10000 });
      
      connection.clearCache('prefix1_');
      
      expect(connection.cache.size).toBe(1);
      expect(connection.cache.has('prefix2_key3')).toBe(true);
    });
  });
});
