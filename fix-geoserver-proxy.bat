@echo off
echo ======================================================
echo FIXING GEOSERVER NGINX PROXY FOR HTTPS
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Restart the Nginx container
echo Restarting the Nginx container to apply changes...
docker compose restart nginx-container
timeout /t 5

:: Test the Nginx configuration
echo.
echo Testing Nginx configuration...
docker compose exec nginx-container nginx -t

:: Check if the changes were applied
echo.
echo Checking updated Nginx configuration...
docker compose exec nginx-container cat /etc/nginx/conf.d/ssl.conf | findstr -i "geoserver"

echo.
echo ======================================================
echo Fixes have been applied. Test the following URL:
echo https://conescout.duckdns.org/geoserver/
echo.
echo You should see the GeoServer landing page.
echo If the map displays properly now, the issue has been fixed.
echo ======================================================
pause
