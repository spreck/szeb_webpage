# System Requirements and Performance Tuning

This document provides detailed information about system requirements and performance tuning for the Cone Scouting Tool.

## Hardware Requirements

### Memory Requirements

The application has been configured to work with different memory configurations:

| Configuration | Total RAM | Use Case |
|---------------|-----------|----------|
| Minimal       | 2GB       | Development, testing with small datasets |
| Standard      | 8GB       | Testing with moderate datasets |
| Recommended   | 16GB+     | Production with large datasets |

#### Memory Distribution (2GB Configuration)

| Component     | Memory Allocation | Notes |
|---------------|-------------------|-------|
| GeoServer     | 768MB             | Java heap: 512MB max |
| PostGIS       | 768MB             | Shared buffers: 256MB |
| Flask App     | 256MB             | Python application |
| Nginx/Services| 256MB             | Web server and auxiliary services |

### CPU Requirements

For optimal performance:
- Minimum: 2 CPU cores
- Recommended: 4+ CPU cores for production use

### Storage Requirements

- Application code: ~100MB
- Docker images: ~2GB
- PostGIS data: Varies based on dataset size (plan for 10GB+)
- GeoServer data: Varies based on layers (plan for 5GB+)

## Docker Resource Configuration

The application uses resource limits in Docker to prevent any single component from consuming all available system resources.

### Memory Limits

```yaml
geoserver:
  mem_limit: 768M
  mem_reservation: 512M

postgis:
  mem_limit: 768M
  mem_reservation: 512M

cone-app:
  mem_limit: 256M
  mem_reservation: 128M
```

### CPU Limits

```yaml
postgis:
  cpus: '2'
```

## Performance Tuning

### GeoServer Tuning

GeoServer performance is primarily affected by memory settings and cache configuration:

```yaml
# Memory allocation
JAVA_OPTS=-Xms256M -Xmx512M -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+UseStringDeduplication

# Cache settings
GEOWEBCACHE_CACHE_MEMORY=256M
```

#### Advanced JVM Optimization

For extremely memory-constrained environments, consider these additional JVM flags:

```yaml
JAVA_OPTS=-Xms256M -Xmx512M -XX:+UseConcMarkSweepGC -XX:NewRatio=2 -XX:SurvivorRatio=10 -XX:+UseDynamicClassUnloading -XX:ParallelGCThreads=4
```

See [Advanced Memory Optimization](advanced_memory_optimization.md) for detailed explanation.

#### Best Practices:
- Enable only necessary extensions
- Use vector tiles for better performance with large datasets
- Set appropriate MAX_FEATURES limit (currently 2000) to prevent excessive memory usage
- Adjust GeoWebCache settings to optimize tile caching

### PostGIS Tuning

PostGIS performance is controlled through PostgreSQL configuration parameters:

```yaml
# Memory settings
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=512MB
POSTGRES_WORK_MEM=16MB
POSTGRES_MAINTENANCE_WORK_MEM=64MB

# Query planning
POSTGRES_RANDOM_PAGE_COST=2.0
POSTGRES_EFFECTIVE_IO_CONCURRENCY=50
```

#### Advanced PostgreSQL Optimization

For further optimization:

```yaml
POSTGRES_MAX_CONNECTIONS=32
POSTGRES_MAX_WORKER_PROCESSES=4
POSTGRES_MAX_PARALLEL_WORKERS_PER_GATHER=2
POSTGRES_TEMP_BUFFERS=8MB
```

#### Best Practices:
- Use spatial indexes on geometry columns
- Limit query complexity in low-memory environments
- Consider partitioning large tables if needed
- Monitor and optimize slow queries using EXPLAIN ANALYZE

### Monitoring Services

The application includes Prometheus and Grafana for monitoring, but these are disabled by default to conserve memory. Enable them only when:
- You need to debug performance issues
- You have sufficient system memory (4GB+)
- You need to monitor production deployments

To enable monitoring:
```bash
docker-compose --profile monitoring up -d
```

## Scaling Considerations

For larger deployments, consider:

1. **Vertical Scaling**: Increase memory and CPU allocation
   ```yaml
   geoserver:
     mem_limit: 4G
   
   postgis:
     mem_limit: 8G
   ```

2. **Horizontal Scaling**: For high-traffic scenarios, consider:
   - Separate GeoServer and database servers
   - Load balancing across multiple GeoServer instances
   - Read replicas for PostgreSQL

3. **Service Prioritization**:
   In extremely memory-constrained environments, start services in stages:
   ```bash
   # Start database first
   docker-compose up -d postgis
   # Wait for database to initialize
   sleep 30
   # Start GeoServer
   docker-compose up -d geoserver
   # Wait for GeoServer to initialize
   sleep 30
   # Start the web application
   docker-compose up -d cone-app nginx-container
   ```

## Troubleshooting

### Common Memory-Related Issues

1. **Java OutOfMemoryError**
   - Symptoms: GeoServer container crashes or becomes unresponsive
   - Solution: Check GeoServer logs, increase Java heap size if possible, or reduce data complexity

2. **PostgreSQL Connection Failures**
   - Symptoms: "FATAL: remaining connection slots are reserved for..."
   - Solution: Adjust PostgreSQL connection settings or implement connection pooling

3. **Slow Vector Layer Rendering**
   - Symptoms: Map tiles take a long time to load
   - Solution: Simplify geometries, use vector tiles, implement caching

4. **Container OOM (Out of Memory) Kills**
   - Symptoms: Docker containers unexpectedly restart
   - Solution: Check docker logs for OOM messages, adjust container memory limits, or optimize application settings

### Memory Monitoring

Monitor memory usage with:
```bash
# View container memory usage
docker stats

# Check GeoServer memory usage
docker exec -it geoserver jcmd 1 VM.native_memory
```

## Further Reading

For more detailed optimization techniques, see:
- [Advanced Memory Optimization](advanced_memory_optimization.md)
- [GeoServer Production Environment](https://docs.geoserver.org/stable/en/user/production/index.html)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
