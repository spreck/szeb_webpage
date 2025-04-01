@echo off
echo Setting up HTTPS for Cone Scouting Tool...

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Create directories
echo Creating required directories...
mkdir certbot\conf 2>nul
mkdir certbot\www 2>nul

:: Download SSL config files
echo Downloading SSL configuration files...
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot\conf\options-ssl-nginx.conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot\conf\ssl-dhparams.pem

:: Start services for HTTPS setup
echo Starting services...
docker compose up -d

:: Request certificates
echo Requesting SSL certificates...
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d conescout.duckdns.org --email jasonpwhitney@gmail.com --agree-tos --force-renewal

:: Reload nginx
echo Reloading nginx to apply SSL configuration...
docker compose exec nginx-container nginx -s reload

echo HTTPS setup completed!
echo You should now be able to access your site at https://conescout.duckdns.org:8443
pause
