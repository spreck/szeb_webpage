# SZEB Website Testing Guide

This document provides instructions for running tests for the SZEB Website application.

## Overview

The testing framework includes:

1. **JavaScript module tests** - Using Jest to test frontend modules
2. **Python backend tests** - Using unittest to test Flask routes and API
3. **Integration tests** - Testing integration between backend and frontend

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+ with pip
- Docker and Docker Compose (for containerized testing)

## Installation

First, install the required dependencies:

```bash
# Install JavaScript dependencies
npm install

# Install Python dependencies
pip install -r tests/requirements.txt
```

## Running Tests

### Using the test scripts

We provide convenient scripts to run all tests:

**Windows:**
```
run-tests.bat
```

**Linux/Mac:**
```bash
chmod +x run-tests.sh
./run-tests.sh
```

### Running individual test suites

**JavaScript module tests:**
```bash
npx jest --config jest.config.json tests/module_tests/geoserver_connection.test.js
npx jest --config jest.config.json tests/module_tests/map_manager.test.js
```

**Python backend tests:**
```bash
python -m unittest tests/integration_tests/test_geoserver_config.py
```

## Running Tests in Docker

To run tests in the Docker environment:

1. First, build and start the containers:
   ```bash
   docker-compose up -d
   ```

2. Run tests inside the container:
   ```bash
   docker-compose exec cone-app python -m unittest discover tests
   docker-compose exec cone-app npx jest --config jest.config.json
   ```

## Test Structure

### JavaScript Tests

- `tests/module_tests/` - Tests for JavaScript modules
  - `geoserver_connection.test.js` - Tests for GeoServer connection functionality
  - `map_manager.test.js` - Tests for map management functionality
  - `species_manager.test.js` - Tests for species configuration management

### Python Tests

- `tests/integration_tests/` - Integration tests for the backend
  - `test_geoserver_config.py` - Tests for GeoServer configuration handling
  - `test_application.py` - End-to-end application tests

## Writing New Tests

### JavaScript Tests

1. Create a new test file in `tests/module_tests/`
2. Use the existing test files as templates
3. Import modules from the test-specific versions (`*.test.js`)
4. Run with Jest: `npx jest --config jest.config.json your_test_file.js`

### Python Tests

1. Create a new test file in `tests/integration_tests/`
2. Extend `unittest.TestCase` for your test class
3. Run with unittest: `python -m unittest tests/integration_tests/your_test_file.py`

## Troubleshooting

- **Module import errors**: Ensure paths in imports are correct and the test-specific module versions are used
- **DOM errors**: The test environment uses jsdom, which simulates a DOM but may have limitations
- **Docker errors**: Make sure the containers are running and properly networked
