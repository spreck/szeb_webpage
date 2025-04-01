/**
 * GeoServer Configuration Module (Test-compatible version)
 * 
 * Centralizes all GeoServer-related configuration settings.
 * Loads settings from environment variables when available.
 */
class GeoServerConfig {
  constructor(options = {}) {
    // Default values
    this.defaults = {
      url: "http://localhost:8080/geoserver",
      workspace: "SZEB_sample",
      username: "admin",
      password: "geoserver",
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      cacheExpiration: 300000, // 5 minutes
      enableHealthCheck: true
    };
    
    // Override defaults with options
    this.config = { ...this.defaults, ...options };
    
    // Skip environment loading in test environment
    if (typeof process !== 'undefined' && process.env && typeof jest === 'undefined') {
      this.loadFromEnvironment();
    }
  }
  
  /**
   * Load configuration from environment variables
   * @private
   */
  loadFromEnvironment() {
    if (process.env.GEOSERVER_URL) {
      this.config.url = process.env.GEOSERVER_URL;
    }
    if (process.env.GEOSERVER_WORKSPACE) {
      this.config.workspace = process.env.GEOSERVER_WORKSPACE;
    }
    if (process.env.GEOSERVER_USERNAME) {
      this.config.username = process.env.GEOSERVER_USERNAME;
    }
    if (process.env.GEOSERVER_PASSWORD) {
      this.config.password = process.env.GEOSERVER_PASSWORD;
    }
    if (process.env.GEOSERVER_TIMEOUT) {
      this.config.timeout = parseInt(process.env.GEOSERVER_TIMEOUT, 10);
    }
    if (process.env.GEOSERVER_RETRY_ATTEMPTS) {
      this.config.retryAttempts = parseInt(process.env.GEOSERVER_RETRY_ATTEMPTS, 10);
    }
    if (process.env.GEOSERVER_CACHE_EXPIRATION) {
      this.config.cacheExpiration = parseInt(process.env.GEOSERVER_CACHE_EXPIRATION, 10);
    }
  }
  
  /**
   * Get the full configuration object
   * @returns {Object} The configuration object
   */
  getConfig() {
    return this.config;
  }
  
  /**
   * Get the GeoServer base URL
   * @returns {string} The GeoServer URL
   */
  getUrl() {
    return this.config.url;
  }
  
  /**
   * Get the GeoServer workspace
   * @returns {string} The workspace name
   */
  getWorkspace() {
    return this.config.workspace;
  }
  
  /**
   * Get the full WMS endpoint URL
   * @returns {string} The WMS URL
   */
  getWmsUrl() {
    return `${this.config.url}/${this.config.workspace}/wms`;
  }
  
  /**
   * Get the full WFS endpoint URL
   * @returns {string} The WFS URL
   */
  getWfsUrl() {
    return `${this.config.url}/${this.config.workspace}/wfs`;
  }
  
  /**
   * Get the credentials for authenticated requests
   * @returns {Object} The username and password
   */
  getCredentials() {
    return {
      username: this.config.username,
      password: this.config.password
    };
  }
  
  /**
   * Get the request timeout in milliseconds
   * @returns {number} Timeout in milliseconds
   */
  getTimeout() {
    return this.config.timeout;
  }
  
  /**
   * Get the number of retry attempts for failed requests
   * @returns {number} Number of retry attempts
   */
  getRetryAttempts() {
    return this.config.retryAttempts;
  }
  
  /**
   * Get the cache expiration time in milliseconds
   * @returns {number} Cache expiration in milliseconds
   */
  getCacheExpiration() {
    return this.config.cacheExpiration;
  }
  
  /**
   * Update the configuration with new values
   * @param {Object} newConfig - New configuration values
   * @returns {GeoServerConfig} This instance for chaining
   */
  update(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this;
  }
}

// Create a singleton instance
const geoServerConfig = new GeoServerConfig();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { geoServerConfig, GeoServerConfig };
} else {
  window.geoServerConfig = geoServerConfig;
}
