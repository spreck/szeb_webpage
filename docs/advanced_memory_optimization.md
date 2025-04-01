# Advanced Memory Optimization

This document provides advanced techniques for optimizing the Cone Scouting Tool in memory-constrained environments (2GB total RAM or less).

## GeoServer Optimization

### Java Virtual Machine (JVM) Settings

Beyond the basic memory settings (`-Xms` and `-Xmx`), consider these optimizations:

```yaml
environment:
  - JAVA_OPTS=-Xms256M -Xmx512M -XX:+UseConcMarkSweepGC -XX:NewRatio=2 -XX:SurvivorRatio=10 -XX:+UseDynamicClassUnloading -XX:ParallelGCThreads=4 -XX:GCTimeRatio=10
```

#### Garbage Collection Tuning

| Parameter | Recommended Setting | Purpose |
|-----------|---------------------|---------|
| `-XX:+UseConcMarkSweepGC` | Enabled | Use Concurrent Mark Sweep collector instead of G1GC for lower pauses |
| `-XX:NewRatio=2` | 2 | Ratio between young and old generation sizes |
| `-XX:SurvivorRatio=10` | 10 | Survivor space size ratio |
| `-XX:+CMSIncrementalMode` | Enabled | Incremental mode for smoother GC pauses |

#### Class Loading Optimization

| Parameter | Recommended Setting | Purpose |
|-----------|---------------------|---------|
| `-XX:+UseDynamicClassUnloading` | Enabled | Allow unloading of unused classes to reclaim memory |

#### Parallelism Control

| Parameter | Recommended Setting | Purpose |
|-----------|---------------------|---------|
| `-XX:ParallelGCThreads=4` | 2-4 | Limit number of threads used for GC |
| `-XX:GCTimeRatio=10` | 10 | Prioritize throughput over latency |

### GeoServer Application Settings

Add these settings to the `GEOSERVER_OPTS` environment variable:

```yaml
- GEOSERVER_OPTS=-DGEOSERVER_CSRF_DISABLED=true -Dorg.geotools.referencing.forceXY=true -DMAX_FEATURES=2000 -DMAX_FILTER_RULES=10 -DGEOSERVER_STARTUP_LOGGING=ERROR -DGEOWEBCACHE_DEFAULT_CACHE_OPTIONS=JAI-PNG-1
```

#### Request Handling

- Reduce the maximum number of concurrent OWS requests to 4
- Set feature limit to 2000 to prevent memory exhaustion
- Configure WMS settings:
  ```xml
  <wms>
    <maxRequestMemory>256</maxRequestMemory>
    <maxRenderingTime>60</maxRenderingTime>
    <maxRenderingErrors>5</maxRenderingErrors>
  </wms>
  ```

## PostGIS Optimization

### Memory Settings

```yaml
environment:
  - POSTGRES_SHARED_BUFFERS=256MB
  - POSTGRES_EFFECTIVE_CACHE_SIZE=384MB
  - POSTGRES_WORK_MEM=16MB
  - POSTGRES_MAINTENANCE_WORK_MEM=64MB
  - POSTGRES_TEMP_BUFFERS=8MB
  - POSTGRES_MAX_CONNECTIONS=32
  - POSTGRES_DEFAULT_STATISTICS_TARGET=50
```

### Connection Management

- Reduce `max_connections` to 32 to limit memory usage per connection
- Consider implementing connection pooling using PgBouncer:
  ```yaml
  pgbouncer:
    image: bitnami/pgbouncer:latest
    environment:
      - POSTGRESQL_HOST=postgis
      - POSTGRESQL_PORT=5432
      - PGBOUNCER_PORT=6432
      - PGBOUNCER_MAX_CLIENT_CONN=50
      - PGBOUNCER_POOL_MODE=transaction
      - PGBOUNCER_DEFAULT_POOL_SIZE=20
    mem_limit: 64M
  ```

### Query Optimization

- Create spatial indexes for all geometry columns:
  ```sql
  CREATE INDEX idx_geom ON your_table USING GIST(geom);
  ```

- Create partial indexes for frequently queried data:
  ```sql
  CREATE INDEX idx_partial ON your_table(attr) WHERE condition;
  ```

- Optimize complex queries by breaking them into smaller operations using temporary tables

### Parallel Query Control

```yaml
environment:
  - POSTGRES_MAX_WORKER_PROCESSES=4
  - POSTGRES_MAX_PARALLEL_WORKERS_PER_GATHER=2
  - POSTGRES_MAX_PARALLEL_WORKERS=4
  - POSTGRES_PARALLEL_SETUP_COST=100
  - POSTGRES_PARALLEL_TUPLE_COST=0.1
```

## Docker Container Optimization

### Resource Allocation

Fine-tune memory allocation for each container:

```yaml
geoserver:
  mem_limit: 768M
  mem_reservation: 512M
  memswap_limit: 768M  # Disable swap
  oom_kill_disable: false
  oom_score_adj: -500  # Lower priority for OOM killer
```

### Memory Management Flags

Add these flags to your `docker-compose up` command:

```bash
docker-compose up -d --memory-swappiness=0
```

Or set in docker-compose.yml:

```yaml
geoserver:
  deploy:
    resources:
      limits:
        memory: 768M
      reservations:
        memory: 512M
```

## Host System Optimization

### Kernel Parameters

If you have access to the host system, consider these settings:

```bash
# Set in /etc/sysctl.conf or equivalent
vm.swappiness=10
vm.min_free_kbytes=65536
vm.vfs_cache_pressure=50
vm.dirty_ratio=10
vm.dirty_background_ratio=5
```

### Docker Daemon Settings

Optimize Docker's memory management:

```json
{
  "default-shm-size": "64M",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 1024,
      "Soft": 512
    }
  }
}
```

## Performance Testing and Monitoring

### Memory Monitoring Tools

- Use `docker stats` to monitor container memory usage in real-time
- Implement Prometheus JMX exporter for GeoServer memory monitoring
- Use PostgreSQL `pg_stat_statements` to identify memory-intensive queries

### Load Testing

Before production deployment, conduct load tests to identify memory bottlenecks:

```bash
# Example using Apache Bench for WMS testing
ab -n 100 -c 10 "http://localhost/geoserver/wms?REQUEST=GetMap&SERVICE=WMS&VERSION=1.1.1&LAYERS=layer_name&STYLES=&FORMAT=image/png&BBOX=-180,-90,180,90&WIDTH=256&HEIGHT=256&SRS=EPSG:4326"
```

## Scaling Strategies for Low-Memory Environments

### Service Prioritization

In extremely memory-constrained environments:

1. Start critical services first, allowing them to stabilize:
   ```bash
   docker-compose up -d postgis
   sleep 30
   docker-compose up -d geoserver
   sleep 30
   docker-compose up -d cone-app
   ```

2. Consider running GeoServer and PostgreSQL on separate hosts if possible

3. Implement application-level caching for frequently accessed data

### Layer Optimization

1. Use simplified geometries for display purposes
2. Implement vector tiles for better client-side rendering
3. Pre-render complex layers as raster tiles
4. Use scale-dependent rendering to simplify features at smaller scales
