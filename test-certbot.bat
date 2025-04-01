@echo off
echo Testing Certbot connectivity...

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Run a test
docker compose run --rm certbot certonly --dry-run --webroot -w /var/www/certbot -d conescout.duckdns.org --email jasonpwhitney@gmail.com --agree-tos

pause
