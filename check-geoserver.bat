@echo off
echo ======================================================
echo CHECKING GEOSERVER CONNECTION
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Check GeoServer status
echo Checking GeoServer status...
docker compose ps geoserver

:: Test GeoServer connection from the app
echo.
echo Testing GeoServer connectivity from Flask app...
docker compose exec cone-app curl -s http://geoserver:8080/geoserver/rest/about/status

:: Check GeoServer logs
echo.
echo Checking GeoServer logs for errors...
docker compose logs --tail=50 geoserver | findstr "ERROR"

:: Checking Nginx proxy configuration
echo.
echo Checking Nginx proxy configuration for GeoServer...
docker compose exec nginx-container cat /etc/nginx/nginx.conf | findstr "geoserver"

echo.
echo ======================================================
echo GeoServer check complete
echo ======================================================
echo.
echo If there were connectivity errors, try:
echo 1. Checking that GeoServer is running
echo 2. Verifying the GEOSERVER_URL environment variable
echo 3. Making sure the nginx configuration is correct
echo.
pause
