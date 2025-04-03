# HTTPS and OAuth2 Setup for Cone Scout Application

This document provides detailed instructions for setting up HTTPS and OAuth2 authentication for the Cone Scout application.

## Prerequisites

1. Docker and Docker Compose installed
2. A registered domain with Duck DNS (conescout.duckdns.org)
3. Google OAuth2 client ID and secret (already set up)

## Setup Steps

### Option 1: Automated Setup

1. Run the automated setup script:

```bash
./setup-https-and-oauth.bat
```

This script will:
- Build containers with updated requirements including Flask-Migrate
- Initialize SSL certificates if needed
- Start the database first to ensure it's ready
- Run database migrations to add OAuth columns
- Start all services in the correct order

### Option 2: Manual Step-by-Step Setup

If you prefer to run the setup manually, follow these steps:

1. **Install Flask-Migrate**:

```bash
# Update the requirements.txt
docker compose build cone-app
```

2. **Generate SSL certificates**:

```bash
# Only run if you don't have certificates yet
docker compose up certbot-init
```

3. **Start the database first**:

```bash
docker compose up -d postgis
# Wait for the database to be ready
sleep 10
```

4. **Start all services**:

```bash
docker compose up -d
```

5. **Run database migrations**:

```bash
docker compose exec cone-app flask db upgrade
```

## Configuration Details

### SSL/HTTPS Configuration

The HTTPS configuration is handled by Nginx and Let's Encrypt certificates:

- Certbot container generates and renews certificates
- Nginx loads certificates from `/etc/letsencrypt/live/conescout.duckdns.org/`
- All HTTP traffic is redirected to HTTPS
- HTTPS port is 443

### OAuth2 Configuration

Google OAuth2 is configured with the following settings:

- Client ID and secret are stored in `client_secret_509773047187-ug65ufnta7ikjrtjmct8aks6rgs0in4d.apps.googleusercontent.com.json`
- Authorized redirect URI: `https://conescout.duckdns.org/login/callback/google`
- Authentication flow is handled by Flask-Dance

## Troubleshooting

### SSL Certificate Issues

If you encounter SSL certificate issues:

1. Check if certificates exist:

```bash
docker compose exec nginx-container ls -la /etc/letsencrypt/live/conescout.duckdns.org/
```

2. Renew certificates if needed:

```bash
docker compose exec certbot certbot renew --force-renewal
docker compose restart nginx-container
```

### OAuth Login Issues

If OAuth login isn't working:

1. Ensure the database schema is correct:

```bash
docker compose exec postgis psql -U geoserver -d geoserver_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='user'"
```

2. Check the OAuth callback URL configuration:

```bash
docker compose exec cone-app cat /usr/src/app/client_secret_509773047187-ug65ufnta7ikjrtjmct8aks6rgs0in4d.apps.googleusercontent.com.json
```

### Database Migration Issues

If migrations fail:

1. Run a manual database update:

```bash
docker compose exec postgis psql -U geoserver -d geoserver_db -c "
ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(256);
ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE \"user\" ALTER COLUMN username DROP NOT NULL;
ALTER TABLE \"user\" ALTER COLUMN password DROP NOT NULL;
ALTER TABLE \"user\" ALTER COLUMN fs_uniquifier DROP NOT NULL;
"
```

## Testing

After setup, test the following:

1. HTTP to HTTPS redirect: `http://conescout.duckdns.org` should redirect to HTTPS
2. Standard login: `https://conescout.duckdns.org/auth/login`
3. Google OAuth login: `https://conescout.duckdns.org/auth/google`
4. Admin panel: `https://conescout.duckdns.org/admin` (using admin/conescout credentials)

## Security Notes

- HTTPS is enforced for all traffic
- OAuth2 uses secure tokens with limited scope (profile and email only)
- Admin routes are protected with role-based authentication
- Database credentials are managed through environment variables
