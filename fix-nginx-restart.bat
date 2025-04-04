@echo off
echo ======================================================
echo FIXING NGINX CONFIGURATION AND RESTARTING
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Stop all containers
echo Stopping all containers...
docker compose down

:: Start the services again
echo Starting services with fixed configuration...
docker compose up -d

:: Wait a bit for services to start
echo Waiting for services to start...
timeout /t 15

:: Check container status
echo Checking container status...
docker compose ps

echo.
echo ======================================================
echo Services have been restarted with fixed configuration.
echo.
echo Try accessing:
echo 1. https://conescout.duckdns.org/ for the main site
echo 2. https://conescout.duckdns.org/auth/login for the login page
echo 3. https://conescout.duckdns.org/geoserver for GeoServer
echo.
echo If you see 502 Bad Gateway errors, wait a few more seconds for GeoServer to fully start.
echo ======================================================
echo.
pause
