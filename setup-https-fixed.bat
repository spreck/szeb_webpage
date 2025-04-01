@echo off
echo Setting up HTTPS for Cone Scouting Tool...

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Create required directories
echo Creating required directories...
mkdir certbot\conf 2>nul
mkdir certbot\www 2>nul

:: Step 1: Download SSL configuration files
echo Downloading SSL configuration files...
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot\conf\options-ssl-nginx.conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot\conf\ssl-dhparams.pem

:: Step 2: Stop existing containers
echo Stopping any existing containers...
docker compose down --remove-orphans

:: Step 3: Use the initialization nginx config
echo Copying initialization nginx config...
copy /Y nginx\nginx-init.conf nginx\nginx.conf.temp
copy /Y nginx\nginx.conf nginx\nginx.conf.bak
copy /Y nginx\nginx-init.conf nginx\nginx.conf

:: Step 4: Start services with HTTP only
echo Starting services with HTTP only...
docker compose up -d

:: Step 5: Wait for services to start
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

:: Step 6: Request certificates
echo Requesting SSL certificates...
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d conescout.duckdns.org --email jasonpwhitney@gmail.com --agree-tos --force-renewal --non-interactive

:: Step 7: Restore original nginx config
echo Restoring original nginx config...
copy /Y nginx\nginx.conf.bak nginx\nginx.conf

:: Step 8: Restart nginx
echo Restarting nginx with HTTPS support...
docker compose restart nginx-container

echo HTTPS setup completed!
echo You should now be able to access your site at https://conescout.duckdns.org:8443
pause
