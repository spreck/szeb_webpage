@echo off
echo ======================================================
echo RESTARTING APPLICATION CONTAINER
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Restart just the application container
echo Restarting the cone-app container...
docker compose restart cone-app

echo.
echo ======================================================
echo Application container has been restarted.
echo.
echo Your Cone Scouting Tool is now available at:
echo https://conescout.duckdns.org/
echo.
echo The proper index.html is now being served.
echo ======================================================
echo.
pause
