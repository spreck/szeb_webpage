@echo off
echo ======================================================
echo DIRECT GEOSERVER CONNECTION TEST
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Check if GeoServer is directly accessible
echo Testing direct GeoServer connection...
curl -k http://localhost:8080/geoserver

echo.
echo ======================================================
echo Now testing through Nginx proxy...
echo ======================================================
echo.

curl -k https://conescout.duckdns.org/geoserver

echo.
echo ======================================================
echo If both tests show HTML output, your connections are working
echo ======================================================
pause
