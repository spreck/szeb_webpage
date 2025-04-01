# Testing Guide for SZEB Website

This document provides an overview of the testing approach, architecture, and best practices for the SZEB Website application.

## Testing Architecture

The SZEB Website uses a multi-layered testing approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test the interaction between components
3. **End-to-End Tests**: Test the entire application from user perspective

### Test Environment

Tests can be run in two environments:

- **Local Environment**: Using local Node.js and Python installations
- **Docker Environment**: Using containerized versions of the application

## JavaScript Testing

JavaScript testing uses Jest as the primary testing framework.

### Key Components Tested

1. **GeoServer Integration**:
   - `GeoServerConfig`: Configuration management for GeoServer settings
   - `GeoServerConnection`: Handles communication with GeoServer, including error handling
   - Health check mechanism to detect GeoServer availability

2. **Map Management**:
   - `MapManager`: Manages Leaflet map initialization and layer handling
   - Layer styling and rendering
   - User interaction with map components

3. **Species Management**:
   - `SpeciesManager`: Manages species configuration and attributes

### Mocking Strategy

The JavaScript tests use several mocking strategies:

1. **Global Mocks**: Set up in `tests/setup.js` for browser environment objects
2. **Service Mocks**: For external services like GeoServer
3. **Test-Specific Module Versions**: Modified versions of modules specifically for testing

## Python Testing

Python testing uses the built-in unittest framework, with possible extension to pytest.

### Key Components Tested

1. **Flask Routes**: Testing API endpoints and HTTP responses
2. **GeoServer Configuration**: Testing the backend handling of GeoServer settings
3. **Authentication**: Testing user authentication and security
4. **Error Handling**: Testing error responses and logging

## Best Practices

### Writing JavaScript Tests

1. **Use Test-Specific Modules**: Import from `*.test.js` files
2. **Mock External Dependencies**: Don't rely on actual GeoServer or other external services
3. **Test Error Cases**: Ensure error handling works correctly
4. **Isolate Tests**: Each test should be independent of others

### Writing Python Tests

1. **Use Test Fixtures**: Set up test data and environment properly
2. **Mock External Services**: Use unittest.mock for external dependencies
3. **Test Both Success and Failure Cases**: Cover all expected behaviors
4. **Check Response Codes and Content**: Verify both HTTP status and response contents

## Continuous Integration

In a CI/CD pipeline, tests would be run automatically as part of the build process:

1. **Build Stage**: 
   - Run JavaScript unit tests
   - Run Python unit tests

2. **Integration Stage**:
   - Build Docker containers
   - Run integration tests in Docker environment

3. **Deployment Stage**:
   - Deploy only if all tests pass

## Performance Testing

For performance-critical components:

1. **Map Rendering**: Test with large datasets to ensure reasonable performance
2. **Layer Loading**: Measure time to load different layers
3. **API Response Times**: Monitor and test API endpoint response times

## Security Testing

Security tests should focus on:

1. **Authentication**: Test login and session management
2. **Authorization**: Test access control for protected routes
3. **Input Validation**: Test handling of malicious inputs
