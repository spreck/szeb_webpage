@echo off
echo ======================================================
echo FULL DEBUG FOR NGINX AND GEOSERVER
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Look at the docker-compose configuration
echo Checking Docker Compose networks...
docker network ls | findstr nginx

:: Check container connectivity
echo.
echo Checking container networking...
docker compose exec nginx-container ping -c 2 geoserver
docker compose exec nginx-container ping -c 2 cone-app

:: Check Nginx configuration
echo.
echo Checking Nginx configuration in container...
docker compose exec nginx-container cat /etc/nginx/nginx.conf | findstr "geoserver"
docker compose exec nginx-container cat /etc/nginx/conf.d/ssl.conf | findstr "geoserver"

:: Check if GeoServer is responding internally
echo.
echo Checking if GeoServer is responding internally...
docker compose exec nginx-container curl -v http://geoserver:8080/geoserver

:: Check Nginx and GeoServer logs
echo.
echo Recent Nginx logs:
docker compose logs --tail=50 nginx-container
echo.
echo Recent GeoServer logs:
docker compose logs --tail=50 geoserver

echo.
echo ======================================================
echo Try visiting these URLs in your browser:
echo  - HTTP: http://localhost/test.html
echo  - HTTPS: https://conescout.duckdns.org/test.html
echo  - Direct GeoServer: http://localhost:8080/geoserver
echo  - Proxied GeoServer (HTTP): http://localhost/geoserver
echo  - Proxied GeoServer (HTTPS): https://conescout.duckdns.org/geoserver
echo ======================================================
echo.
pause
