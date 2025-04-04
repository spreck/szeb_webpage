@echo off
echo ======================================================
echo SIMPLE NGINX CONFIGURATION FIX
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Stop all containers
echo Stopping all containers...
docker compose down

:: Start the services
echo Starting services with simplified configuration...
docker compose up -d

:: Wait for services to start
echo Waiting 20 seconds for services to start...
timeout /t 20

:: Check container status
echo Checking container status...
docker compose ps

echo.
echo ======================================================
echo Services have been restarted with simplified configuration.
echo.
echo Try accessing:
echo 1. https://conescout.duckdns.org/ for the main site
echo 2. https://conescout.duckdns.org/auth/login for the login page
echo 3. https://conescout.duckdns.org/geoserver for GeoServer
echo ======================================================
echo.
pause
