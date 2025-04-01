# GeoServer Integration Architecture

This document outlines the improved GeoServer integration architecture implemented in the SZEB Website application. The redesign focuses on increased flexibility, better error handling, and improved maintainability.

## Overview

The GeoServer integration has been refactored to follow these key principles:

1. **Centralized Configuration:** All GeoServer-related settings are now managed in a central location
2. **Error Resilience:** Comprehensive error handling with retry mechanisms and user feedback
3. **Environmental Configuration:** Settings can be easily configured through environment variables
4. **Caching:** Intelligent caching for improved performance
5. **Health Monitoring:** Automatic health checks for GeoServer availability

## Components

### 1. GeoServer Configuration Module

The `geoserver-config.js` module serves as a central configuration point for all GeoServer-related settings:

- Default configuration values
- Environment variable loading
- Runtime configuration updates
- Access to specific endpoint URLs (WMS, WFS)

```javascript
// Example usage:
const url = window.geoServerConfig.getWmsUrl();
const workspace = window.geoServerConfig.getWorkspace();
```

### 2. GeoServer Connection Manager

The `geoserver-connection.js` module handles all GeoServer communication:

- Connection health checks
- Request retries with exponential backoff
- Response caching
- Standardized error handling
- Event-based notifications

```javascript
// Example usage:
const geoserver = new GeoServerConnection();
const layer = geoserver.getWmsLayer("layer_name");
const features = await geoserver.getFeature("vector_layer", "filter=criteria");
```

### 3. MapManager Integration

The MapManager class has been updated to utilize the GeoServer connection:

- Error notifications with user-friendly messages
- Loading indicators during layer operations
- Flexible layer naming conventions
- Improved legend fetching

## Configuration Options

The GeoServer configuration can be set through several mechanisms:

1. **Environment Variables (Backend):**
   - `GEOSERVER_URL`: Base URL of the GeoServer instance
   - `GEOSERVER_WORKSPACE`: GeoServer workspace name
   - `GEOSERVER_USER`: GeoServer admin username
   - `GEOSERVER_PASS`: GeoServer admin password

2. **HTML Data Attributes:**
   - `data-geoserver-url`: GeoServer URL passed from backend
   - `data-workspace`: GeoServer workspace name

3. **JavaScript Configuration:**
   ```javascript
   window.geoServerConfig.update({
     url: "https://your-geoserver-url.com/geoserver",
     workspace: "your_workspace",
     timeout: 30000, // milliseconds
     retryAttempts: 3
   });
   ```

## Error Handling

The new architecture implements a multi-level error handling approach:

1. **Backend Error Handling:**
   - Structured logging with traceback information
   - Error counter metrics for monitoring
   - User-friendly API error responses
   - Decorator-based error handling for API endpoints

2. **Frontend Error Handling:**
   - Connection failure detection and recovery
   - Automatic retry mechanisms with exponential backoff
   - Visual error notifications to users
   - Detailed console logging for debugging

3. **GeoServer Request Errors:**
   - Fallback strategies for unavailable layers
   - Timeout handling for slow responses
   - Cache utilization when appropriate

## Caching Strategy

The system implements intelligent caching:

- Feature data cached with configurable expiration
- Legend images cached for performance
- Cache invalidation when data changes
- Cache segmentation by request type

## Health Checks

GeoServer health is monitored through:

- Periodic health check polling
- Automatic recovery detection
- Event-based notifications for status changes
- Metrics for monitoring

## Future Improvements

Potential areas for further enhancement:

1. Implement more extensive unit and integration tests
2. Add circuit breaker pattern for better failure isolation
3. Implement more sophisticated caching strategies
4. Add OAuth authentication support for GeoServer
5. Improve performance with WebGL rendering for complex layers
