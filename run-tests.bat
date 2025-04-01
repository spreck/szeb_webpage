@echo off
REM Run tests script for SZEB Website

REM Set NODE_ENV to test
set NODE_ENV=test

REM Run JavaScript tests with Jest
echo Running JavaScript module tests...
call npx jest --config jest.config.json tests/module_tests/geoserver_connection.test.js
call npx jest --config jest.config.json tests/module_tests/map_manager.test.js

REM Run Python backend tests
echo Running Python backend tests...
python -m unittest tests/integration_tests/test_geoserver_config.py

echo Tests completed!
