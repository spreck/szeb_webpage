@echo off
echo ======================================================
echo COMPREHENSIVE SYSTEM STATUS CHECK
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Check all container statuses
echo Checking all container statuses...
docker compose ps

:: Check database structure
echo.
echo Checking database structure...
docker compose exec postgis psql -U geoserver -d geoserver_db -c "\d \"user\""

:: Check environment variables in the cone-app container
echo.
echo Checking environment variables...
docker compose exec cone-app env | findstr "GEOSERVER"
docker compose exec cone-app env | findstr "SECRET"
docker compose exec cone-app env | findstr "ADMIN"

:: Check HTTPS setup
echo.
echo Checking HTTPS certificates...
docker compose exec nginx-container ls -la /etc/letsencrypt/live/conescout.duckdns.org/

:: Check Nginx configuration
echo.
echo Checking Nginx configuration...
docker compose exec nginx-container nginx -t

:: Verify Flask routes
echo.
echo Checking available Flask routes...
docker compose exec cone-app ls -la /usr/src/app

echo.
echo ======================================================
echo System status check complete
echo ======================================================
echo.
echo Based on the output above:
echo 1. Check that all containers are running
echo 2. Verify database structure includes oauth columns
echo 3. Confirm environment variables are correctly set
echo 4. Ensure SSL certificates are available
echo.
pause
