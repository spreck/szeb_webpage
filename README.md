# Cone Scouting Tool

A web application for analyzing and visualizing conifer forest seed zones.

## Overview

The Cone Scouting Tool helps foresters and conservation professionals identify and prioritize seed collection zones (SZEBs) for various conifer species. The tool provides interactive maps, attribute visualization, and detailed analysis capabilities.

## Features

- **Interactive Maps**: Visualize seed zones, elevation bands, and road networks
- **Species Selection**: View data for multiple conifer species
- **Attribute Visualization**: Color-coded visualization of various attributes
- **Region of Interest (ROI)**: Upload custom regions for analysis
- **Data Download**: Export vector and raster data for selected areas
- **Admin Interface**: Manage species configurations and application settings

## System Requirements

- **Minimum**: 2GB RAM, 2 CPU cores, 5GB disk space
- **Recommended**: 8GB+ RAM, 4+ CPU cores, 20GB+ disk space
- **Docker and Docker Compose**

See the [System Requirements](docs/system_requirements.md) doc for detailed information.

## Getting Started

See the [Installation Guide](docs/INSTALLATION.md) for setup instructions.

Quick start:
```bash
# Start core services (minimum 2GB RAM required)
docker-compose up -d

# Start with monitoring services (4GB+ RAM recommended)
docker-compose --profile monitoring up -d
```

## Memory-Optimized Configuration

This application has been specifically tuned to run in memory-constrained environments (as low as 2GB total RAM):

- **Optimized JVM Settings**: Custom garbage collection and memory management for GeoServer
- **Efficient PostGIS Configuration**: Tuned database settings to minimize memory usage
- **Container Resource Limits**: Precise memory allocation for each service
- **Performance Tuning**: Settings optimized for best performance with minimal resources
- **Staged Startup**: Option to start services sequentially for better initialization

For detailed optimization information, see [Advanced Memory Optimization](docs/advanced_memory_optimization.md).

## Application Structure

The application consists of:

- Flask backend (Python)
- Leaflet-based interactive map (JavaScript)
- React components for data visualization
- PostgreSQL/PostGIS for data storage
- GeoServer for spatial data services

## Performance Optimization

The application has been optimized to run in memory-constrained environments:

- Memory-efficient GeoServer configuration
- Optimized PostGIS settings
- Selective enabling of features based on available resources
- Monitoring stack (disabled by default)

For larger deployments or datasets, see [System Requirements](docs/system_requirements.md) for tuning options.

## Security Features

- BCrypt password hashing for admin authentication
- CSRF protection for all forms
- Cross-platform file locking for concurrent operations
- Session management and secure cookie handling

## Authentication

The application supports two authentication methods:

- **Standard Login**: Email and password authentication
- **Google OAuth2**: Single sign-on with Google accounts

Admin users can be configured by adding their email addresses to the `ADMIN_EMAILS` environment variable.

## HTTPS Configuration

Secure HTTPS access is configured using Let's Encrypt certificates:

- Automatic certificate generation and renewal
- Nginx SSL configuration with modern cipher settings
- Redirect from HTTP to HTTPS

For detailed setup instructions, see the [HTTPS and OAuth Setup Guide](README-HTTPS-OAUTH-SETUP.md).

## Development

### JavaScript Build System

The application uses Babel to process JavaScript files. When modifying JavaScript code:

1. Edit files in the `static/js` directory
2. Run `python build.py` to process the files
3. Processed files are placed in the `static/dist` directory

The Docker build process automatically handles this for production deployment.

### Password Management

Admin passwords can be changed through the admin interface (/admin/change_password).

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [System Requirements](docs/system_requirements.md)
- [Advanced Memory Optimization](docs/advanced_memory_optimization.md)
- [Nginx Configuration](docs/nginx_configuration.md)
- [HTTPS and OAuth Setup](README-HTTPS-OAUTH-SETUP.md)
- [Admin Interface](docs/admin_interface.md)
- [Adding Species](docs/adding_species.md)
- [Modules](docs/modules.md)
- [Project Structure](docs/project_refactoring.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
