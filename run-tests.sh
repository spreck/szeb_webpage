#!/bin/bash
# Run tests script for SZEB Website

# Set NODE_ENV to test
export NODE_ENV=test

# Run JavaScript tests with Jest
echo "Running JavaScript module tests..."
npx jest --config jest.config.json tests/module_tests/geoserver_connection.test.js
npx jest --config jest.config.json tests/module_tests/map_manager.test.js

# Run Python backend tests
echo "Running Python backend tests..."
python -m unittest tests/integration_tests/test_geoserver_config.py

echo "Tests completed!"
