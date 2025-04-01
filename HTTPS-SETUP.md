# Setting Up HTTPS for Cone Scouting Tool

This guide explains how to set up HTTPS for your Cone Scouting Tool application.

## Prerequisites

Before you begin, make sure:

1. Your domain name (conescout.duckdns.org) is properly pointed to your server's IP address
2. Ports 80 and 443 are open on your server and not blocked by firewalls
3. Docker and Docker Compose are installed and working correctly

## Option 1: Using the Windows Setup Script (Recommended)

1. Edit the `setup-https.bat` file:
   - Replace `your-email@example.com` with your actual email address

2. Run the setup script by double-clicking `setup-https.bat` or running it from Command Prompt

3. Follow any on-screen instructions

4. Once completed, visit https://conescout.duckdns.org to verify HTTPS is working

## Option 2: Using the Bash Script

1. Edit the `init-letsencrypt.sh` file:
   - Replace `your-email@example.com` with your actual email address

2. Run the script using Git Bash, WSL, or a similar Bash-compatible shell:
   ```bash
   bash init-letsencrypt.sh
   ```

3. Once completed, visit https://conescout.duckdns.org to verify HTTPS is working

## Option 3: Manual Setup

If both scripts fail, you can set up HTTPS manually:

1. Create required directories:
   ```bash
   mkdir -p certbot/conf certbot/www
   ```

2. Download SSL configuration files:
   ```bash
   curl -L https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
   curl -L https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
   ```

3. Start your Docker containers:
   ```bash
   docker-compose up -d
   ```

4. Request Let's Encrypt certificate:
   ```bash
   docker-compose run --rm certbot certonly --webroot -w /var/www/certbot -d conescout.duckdns.org --email your-email@example.com --agree-tos --force-renewal
   ```

5. Reload Nginx to apply the configuration:
   ```bash
   docker-compose exec nginx-container nginx -s reload
   ```

## Troubleshooting

If you encounter issues:

1. Check Docker logs:
   ```bash
   docker-compose logs nginx-container
   docker-compose logs certbot
   ```

2. Make sure your domain resolves correctly:
   ```bash
   ping conescout.duckdns.org
   ```

3. Verify ports 80 and 443 are open:
   ```bash
   # On Windows:
   netstat -an | findstr "80"
   netstat -an | findstr "443"
   ```

4. Check that the required directories and files exist:
   ```bash
   # Directory structure should look like:
   # certbot/
   # ├── conf/
   # │   ├── options-ssl-nginx.conf
   # │   └── ssl-dhparams.pem
   # └── www/
   ```

## Certificate Renewal

Certificates from Let's Encrypt are valid for 90 days. The certbot container is configured to automatically try to renew certificates close to expiration.

## Admin Login

- URL: https://conescout.duckdns.org/admin
- Username: admin
- Default Password: conescout