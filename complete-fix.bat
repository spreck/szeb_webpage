@echo off
echo ======================================================
echo COMPREHENSIVE FIX FOR NGINX, GEOSERVER, AND LOGIN
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Stop all containers
echo Stopping all containers to apply fixes...
docker compose down

:: Start everything fresh
echo Starting all services with the fixed configuration...
docker compose up -d

:: Wait for services to start
echo Waiting for services to stabilize...
timeout /t 15

:: Check the nginx configuration
echo Checking Nginx configuration...
docker compose exec nginx-container nginx -t

:: Test GeoServer connection
echo Testing GeoServer API access...
curl -k https://conescout.duckdns.org/geoserver/rest/about/status

:: Create a simple test file to verify GeoServer connectivity
echo Create a test HTML to check GeoServer WMS...
echo ^<html^>
echo ^<head^>
echo ^<title^>GeoServer Test^</title^>
echo ^</head^>
echo ^<body^>
echo ^<h1^>GeoServer Test^</h1^>
echo ^<p^>This page tests the GeoServer connection.^</p^>
echo ^<div^>
echo ^<img src="https://conescout.duckdns.org/geoserver/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" alt="WMS GetCapabilities"^>
echo ^</div^>
echo ^</body^>
echo ^</html^>
> templates\geoserver_test.html

echo ======================================================
echo Fixes applied! Please check:
echo.
echo 1. Login page: https://conescout.duckdns.org/auth/login
echo 2. GeoServer connection: https://conescout.duckdns.org/geoserver
echo 3. Map display: Check if the map is now displaying properly
echo.
echo If there are still issues, please check:
echo - Docker container logs: docker compose logs
echo - Nginx logs: docker compose logs nginx-container
echo - GeoServer logs: docker compose logs geoserver
echo ======================================================
pause
