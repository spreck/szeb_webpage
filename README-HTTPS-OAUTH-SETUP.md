# HTTPS and OAuth2 Setup for Cone Scout Application

This document provides detailed instructions for setting up HTTPS and OAuth2 authentication for the Cone Scout application.

## Overview

This setup provides:
- Secure HTTPS connections using Let's Encrypt certificates
- Google OAuth2 login integration
- Traditional username/password authentication
- Proper proxying for GeoServer through HTTPS

## Prerequisites

1. Docker and Docker Compose installed
2. A registered domain with Duck DNS (conescout.duckdns.org)
3. Google OAuth2 client ID and secret (already set up)

## Implementation Details

### Simplified Nginx Configuration

The key to our implementation is a simplified Nginx configuration that handles:
- HTTP to HTTPS redirection
- Let's Encrypt certificate management
- Proxying requests to the Flask app and GeoServer

```nginx
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;

    # Define upstream for each service
    upstream cone_app {
        server cone-app:8000;
    }

    upstream geoserver {
        server geoserver:8080;
    }

    # HTTP server - redirects to HTTPS and handles Let's Encrypt challenges
    server {
        listen 80;
        server_name conescout.duckdns.org;
        
        # Allow certbot challenges
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Redirect all HTTP traffic to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl;
        server_name conescout.duckdns.org;
        
        # SSL certificates
        ssl_certificate /etc/letsencrypt/live/conescout.duckdns.org/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/conescout.duckdns.org/privkey.pem;
        
        # Flask application
        location / {
            proxy_pass http://cone_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }
        
        # GeoServer
        location /geoserver/ {
            proxy_pass http://geoserver/geoserver/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }
    }
}
```

### Authentication Setup

The authentication system includes:
- Standard login with username/password
- Google OAuth2 integration using Flask-Dance
- Admin role-based access control

### Environment-Based Configuration

All sensitive settings are stored in a `.env` file (not version controlled):
- Database credentials
- Secret keys
- Admin credentials
- OAuth settings

## Maintenance

### SSL Certificate Renewal

Let's Encrypt certificates are valid for 90 days and auto-renew via the certbot container.

### Troubleshooting

Common issues and how to fix them:

1. **502 Bad Gateway**: 
   - Restart the containers: `docker compose restart`
   - Check if GeoServer is running: `docker compose logs geoserver`

2. **SSL Certificate Issues**:
   - Check certificate status: `docker compose exec certbot certbot certificates`
   - Force renewal: `docker compose exec certbot certbot renew --force-renewal`

3. **OAuth Login Failures**:
   - Verify redirect URI in Google console matches `/login/callback/google`
   - Check client_secret file is present and correctly mounted

## Security Considerations

- All sensitive information is stored in environment variables
- Credentials are never stored in the git repository
- HTTPS is enforced for all connections
- OAuth access is limited to email and profile information only
