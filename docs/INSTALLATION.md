# Installation Guide

This guide provides instructions for setting up the Cone Scouting Tool application.

## Prerequisites

Before installing, make sure you have the following prerequisites:

- Docker and Docker Compose
- Git (for cloning the repository)
- Minimum 2GB of RAM (8GB+ recommended for production use)

## System Requirements

### Memory Requirements

The application has been optimized to run in memory-constrained environments:

| Environment | Minimum RAM | Recommended RAM |
|-------------|-------------|-----------------|
| Development | 2GB        | 4GB             |
| Testing     | 4GB        | 8GB             |
| Production  | 8GB        | 16GB+           |

Current memory allocation in the 2GB configuration:
- GeoServer: 768MB
- PostGIS: 768MB
- Flask Application: 256MB
- Nginx & Services: 256MB

### Storage Requirements

- At least 1GB of free disk space for the application
- Additional space for PostGIS data storage (depends on dataset size)
- GeoServer data directory (varies based on your datasets)

## Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/cone-scouting-tool.git
   cd cone-scouting-tool
   ```

2. (Optional) Adjust memory settings in docker-compose.yml if needed:
   ```yaml
   # Example for higher memory environment
   geoserver:
     environment:
       - JAVA_OPTS=-Xms1G -Xmx2G -XX:+UseG1GC
     mem_limit: 2.5G
   
   postgis:
     environment:
       - POSTGRES_SHARED_BUFFERS=1GB
       - POSTGRES_EFFECTIVE_CACHE_SIZE=2GB
     mem_limit: 3G
   ```

3. Build and start the application using Docker Compose:
   ```bash
   # Start core services only
   docker-compose up -d
   
   # Start with monitoring (requires additional memory)
   docker-compose --profile monitoring up -d
   ```

   This will:
   - Build the application container (including JavaScript processing)
   - Start all required services (PostgreSQL, GeoServer, Nginx, etc.)
   - Set up networking between containers

4. The application will be available at http://localhost after a few moments.

## Advanced Installation Options

### Nginx Configuration

For detailed information about Nginx configuration, including HTTP/HTTPS setup, performance optimization, and troubleshooting, refer to the [Nginx Configuration Guide](nginx_configuration.md).

### Staged Service Startup

For extremely memory-constrained environments, consider starting services in stages:

```bash
# Start the database first
docker-compose up -d postgis

# Wait for database initialization
sleep 30  

# Start GeoServer
docker-compose up -d geoserver

# Wait for GeoServer initialization
sleep 30

# Start the web application
docker-compose up -d cone-app nginx-container
```

### Custom JVM Settings

For optimized GeoServer performance, you can modify the Java options:

```yaml
geoserver:
  environment:
    - JAVA_OPTS=-Xms256M -Xmx512M -XX:+UseConcMarkSweepGC -XX:NewRatio=2 -XX:SurvisorRatio=10 -XX:+UseDynamicClassUnloading -XX:ParallelGCThreads=4
```

See [Advanced Memory Optimization](advanced_memory_optimization.md) for detailed JVM tuning options.

## Monitoring Services (Optional)

The application includes Prometheus and Grafana for monitoring, which are disabled by default to conserve memory. To enable monitoring:

```bash
docker-compose --profile monitoring up -d
```

Access Grafana at http://localhost:3000 (default credentials: admin/23vmoWadmin)

## Performance Tuning

### GeoServer Performance

GeoServer memory settings can be adjusted in docker-compose.yml:
```yaml
- JAVA_OPTS=-Xms256M -Xmx512M -XX:+UseG1GC
```

General recommendations:
- Don't allocate more than 4GB for GeoServer heap
- When serving vector data, memory requirements are lower
- For raster data, consider increasing heap size and configure JAI tile cache

### PostGIS Performance

PostGIS settings can be adjusted based on available memory:
```yaml
- POSTGRES_SHARED_BUFFERS=256MB     # Set to 25% of available RAM
- POSTGRES_EFFECTIVE_CACHE_SIZE=512MB # Set to 50% of available RAM
- POSTGRES_WORK_MEM=16MB            # Increase for complex queries
- POSTGRES_MAX_CONNECTIONS=32       # Reduce for lower memory usage
```

For detailed PostgreSQL optimization, see [Advanced Memory Optimization](advanced_memory_optimization.md).

## Development Setup

For local development, you will need:

- Python 3.10+
- Node.js 18+
- GDAL and other dependencies listed in requirements.txt

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Build JavaScript files:
   ```bash
   python build.py
   ```

4. Run the Flask development server:
   ```bash
   python app.py
   ```

The development server will be available at http://localhost:8000.

## Configuration

The application can be configured through the following methods:

1. Environment variables (set in docker-compose.yml)
2. Configuration settings in app.py

### Authentication Configuration

The application uses Flask-Security-Too for secure authentication and user management.

#### Default Admin User

Upon first startup, the system automatically creates an admin user with these credentials:

- **Email**: admin@conescout.local
- **Username**: admin
- **Password**: conescout

**Important**: Change these credentials in production environments!

#### Customizing Default Admin

You can customize the default admin credentials through environment variables:

```yaml
services:
  cone-app:
    environment:
      - ADMIN_EMAIL=your_email@example.com
      - ADMIN_USERNAME=your_username
      - ADMIN_PASSWORD=your_strong_password
```

#### Security Settings

Security configuration can be customized through environment variables:

```yaml
services:
  cone-app:
    environment:
      - SECRET_KEY=your_random_secret_key  # Should be at least 32 characters
      - SECURITY_PASSWORD_SALT=your_password_salt  # Should be unique and secret
```

For more details, see the [Authentication System](authentication.md) documentation.

## Updating JavaScript Files

When you modify JavaScript files in the `static/js` directory, you need to rebuild them:

```bash
python build.py
```

This will process the JavaScript files using Babel and place them in the `static/dist` directory.

## Troubleshooting

### Out of Memory Issues

If you encounter out-of-memory errors:

1. Check container logs for memory-related errors:
   ```bash
   docker-compose logs geoserver
   docker-compose logs postgis
   ```

2. Consider reducing memory allocations further or selectively disabling features:
   - Reduce MAX_FEATURES parameter to limit response sizes
   - Disable unused GeoServer extensions
   - Simplify vector layers

3. Monitor memory usage in real-time:
   ```bash
   docker stats
   ```

4. If possible, increase host system memory or use a server with more RAM.

### Advanced Memory Monitoring

For detailed memory analysis of Java processes:
```bash
docker exec -it geoserver jcmd 1 VM.native_memory summary
```

For PostgreSQL memory usage:
```bash
docker exec -it postgis_container psql -U geoserver -c "SELECT * FROM pg_stat_activity;"
```

For more advanced troubleshooting and optimization techniques, see the [Advanced Memory Optimization](advanced_memory_optimization.md) guide.
