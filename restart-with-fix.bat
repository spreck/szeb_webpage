@echo off
echo ======================================================
echo RESTART WITH IMPROVED CONFIGURATION
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Stop all containers
echo Stopping all containers...
docker compose down

:: Make sure our test files are in place
echo Adding test HTML files...
copy /Y templates\test.html templates\index.html

:: Start the services
echo Starting services with improved configuration...
docker compose up -d

echo.
echo ======================================================
echo Services restarted. Try accessing:
echo  - http://localhost/
echo  - https://conescout.duckdns.org/
echo  - http://localhost/geoserver
echo  - https://conescout.duckdns.org/geoserver
echo ======================================================
echo.
echo If you need more detailed troubleshooting, run:
echo full-debug.bat
echo.
pause
