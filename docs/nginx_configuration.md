# Nginx Configuration Guide

This guide provides detailed information about the Nginx configuration for the Cone Scouting Tool application. It covers both HTTP and HTTPS setups, performance optimization, and troubleshooting.

## Overview

The application uses Nginx as a reverse proxy to:
- Route requests to the appropriate services (Flask app, GeoServer)
- Handle CORS headers
- Manage SSL/TLS certificates
- Provide basic request filtering and security

## Default Configuration

The default Nginx configuration:
- Listens on port 80 (HTTP)
- Proxies requests to the Flask app and GeoServer
- Adds appropriate CORS headers
- Restricts access to metrics endpoints

## HTTP to HTTPS Redirection

When HTTPS is enabled, Nginx is configured to redirect all HTTP traffic to HTTPS automatically:

```nginx
server {
    listen 80;
    server_name conescout.duckdns.org;
    
    location / {
        return 301 https://$host$request_uri;
    }
    
    # Let's Encrypt verification path
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
```

## SSL/TLS Configuration

The HTTPS server block uses certificates from Let's Encrypt:

```nginx
server {
    listen 443 ssl;
    server_name conescout.duckdns.org;
    
    # SSL certificate configuration
    ssl_certificate /etc/letsencrypt/live/conescout.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/conescout.duckdns.org/privkey.pem;
    
    # Other SSL settings and locations...
}
```

## Performance Optimization

### Worker Configuration

The default configuration sets `worker_connections 1024`, which is suitable for most deployments. For high-traffic environments, consider increasing this value:

```nginx
events {
    worker_connections 2048;  # Increased from 1024
}
```

### Caching Configuration

To improve performance, consider adding caching for static assets:

```nginx
# Add to the http section of nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=1g inactive=60m;

# Then in the appropriate location block
location /static/ {
    proxy_cache app_cache;
    proxy_cache_valid 200 60m;
    proxy_pass http://cone-app:8000/static/;
    include proxy_params;
}
```

### Compression Settings

Enable compression to reduce bandwidth usage:

```nginx
# Add to the http section
gzip on;
gzip_comp_level 5;
gzip_min_length 256;
gzip_proxied any;
gzip_vary on;
gzip_types
  application/javascript
  application/json
  application/xml
  text/css
  text/plain
  text/xml;
```

## Security Enhancements

### Recommended SSL Parameters

For improved security, add these SSL parameters to your HTTPS server block:

```nginx
# Modern SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

# HSTS (optional, but recommended)
add_header Strict-Transport-Security "max-age=63072000" always;
```

### Rate Limiting

To protect against abuse, add rate limiting:

```nginx
# Add to the http section
limit_req_zone $binary_remote_addr zone=app_limit:10m rate=10r/s;

# Then in the server block
location / {
    limit_req zone=app_limit burst=20 nodelay;
    proxy_pass http://cone-app:8000;
    include proxy_params;
}
```

## Customizing Server Name

To change the server name:

1. Update the `server_name` directive in nginx.conf
2. If using HTTPS, update the domain in init-letsencrypt.sh
3. Generate new certificates for your domain
4. Update the SSL certificate paths in the HTTPS server block

## HTTPS Setup

### Automatic Setup

For most deployments, use the provided script:

```bash
# Windows
setup-https.bat

# Linux/Mac
./init-letsencrypt.sh
```

This script:
1. Creates a temporary Nginx configuration
2. Obtains initial Let's Encrypt certificates
3. Sets up the final configuration with proper SSL paths

### Manual Certificate Setup

If the automatic setup doesn't work:

1. Generate certificates manually using certbot:
   ```bash
   docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d conescout.duckdns.org
   ```

2. Verify certificates were created:
   ```bash
   docker compose exec nginx-container ls -la /etc/letsencrypt/live/conescout.duckdns.org/
   ```

3. Update the nginx.conf with proper certificate paths if needed:
   ```nginx
   ssl_certificate /etc/letsencrypt/live/conescout.duckdns.org/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/conescout.duckdns.org/privkey.pem;
   ```

4. Reload Nginx:
   ```bash
   docker compose exec nginx-container nginx -s reload
   ```

## Troubleshooting

### Common Issues

#### 502 Bad Gateway

This usually indicates that Nginx can't connect to the upstream services:

1. Check if the Flask app and GeoServer are running:
   ```bash
   docker compose ps
   ```

2. Verify network connectivity between containers:
   ```bash
   docker compose exec nginx-container ping cone-app
   docker compose exec nginx-container ping geoserver
   ```

3. Check Nginx logs:
   ```bash
   docker compose logs nginx-container
   ```

#### SSL Certificate Issues

If you see certificate errors:

1. Verify certificates exist:
   ```bash
   docker compose exec nginx-container ls -la /etc/letsencrypt/live/conescout.duckdns.org/
   ```

2. Check certbot logs:
   ```bash
   docker compose logs certbot
   ```

3. Ensure your domain points to your server's IP address.

#### Permission Denied Errors

If Nginx can't read certificates:

1. Check permissions:
   ```bash
   docker compose exec nginx-container ls -la /etc/letsencrypt/live/
   ```

2. Fix permissions if needed:
   ```bash
   docker compose exec nginx-container chmod -R 755 /etc/letsencrypt/
   ```

## Advanced Configuration

### WebSocket Support

If your application uses WebSockets:

```nginx
location /ws/ {
    proxy_pass http://cone-app:8000/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    include proxy_params;
}
```

### Multiple Upstream Services

For adding more services:

```nginx
# Define new upstream
upstream new_service {
    server new-service-container:8000;
}

# Add location block
location /new-service/ {
    proxy_pass http://new_service/;
    include proxy_params;
}
```

## Memory Optimization

For memory-constrained environments:

```nginx
# Add to the http section
client_body_buffer_size 128k;
client_max_body_size 10m;
client_header_buffer_size 1k;
large_client_header_buffers 2 1k;
client_body_timeout 12;
client_header_timeout 12;
keepalive_timeout 15;
send_timeout 10;
```

## Monitoring

To monitor Nginx performance:

1. Enable the stub_status module:
   ```nginx
   location /nginx_status {
       stub_status on;
       allow 127.0.0.1;        # localhost
       allow 172.23.0.0/16;    # Docker network
       deny all;               # Deny all other
   }
   ```

2. Configure Prometheus to scrape this endpoint:
   ```yaml
   # Add to prometheus.yml
   - job_name: 'nginx'
     static_configs:
       - targets: ['nginx-container:80']
     metrics_path: /nginx_status
   ```

## Custom Error Pages

To add custom error pages:

```nginx
# Add to server block
error_page 404 /custom_404.html;
error_page 500 502 503 504 /custom_50x.html;

location = /custom_404.html {
    root /usr/share/nginx/html;
    internal;
}

location = /custom_50x.html {
    root /usr/share/nginx/html;
    internal;
}
```

## Reference

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
