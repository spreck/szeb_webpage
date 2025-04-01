# Setting Up HTTPS for Your Cone Scouting Tool

This document explains how to enable HTTPS for your Cone Scouting Tool application using Let's Encrypt certificates.

## Prerequisites

- Docker and Docker Compose
- Domain name pointed to your server (conescout.duckdns.org)
- Port 80 and 443 open on your server/firewall

## Steps to Enable HTTPS

1. **Edit init-letsencrypt.sh**
   - Update the email address in the script with your actual email
   - Make sure the domain name is correct (conescout.duckdns.org)

2. **Run the initialization script**
   ```bash
   # Make the script executable (on Linux/Mac)
   chmod +x init-letsencrypt.sh
   
   # On Windows, you might need to use:
   # bash init-letsencrypt.sh
   
   # Run the script
   ./init-letsencrypt.sh
   ```

3. **Restart your services**
   ```bash
   docker compose down
   docker compose up -d
   ```

4. **Test HTTPS**
   - Visit https://conescout.duckdns.org in your browser
   - The site should load securely with a valid SSL certificate

## Certificate Renewal

Certificates from Let's Encrypt are valid for 90 days. The certbot container is configured to automatically try to renew certificates that are close to expiration.

## Troubleshooting

If you encounter issues:

1. Check Docker logs:
   ```bash
   docker compose logs nginx-container
   docker compose logs certbot
   ```

2. Verify your domain points to the correct IP address:
   ```bash
   ping conescout.duckdns.org
   ```

3. Make sure ports 80 and 443 are open and not blocked by a firewall.

4. If you need to force certificate renewal:
   ```bash
   docker compose run --rm certbot renew --force-renewal
   docker compose exec nginx-container nginx -s reload
   ```

## Notes for Windows Users

If you're running on Windows:

1. Make sure to run the init script using Git Bash or another Bash-compatible shell:
   ```bash
   bash init-letsencrypt.sh
   ```

2. You may need to adjust file permissions and paths if you encounter permission errors.
