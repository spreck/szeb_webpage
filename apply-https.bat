@echo off
echo Applying HTTPS configuration...

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Restart containers
echo Restarting services...
docker compose down
docker compose up -d

echo ======================================================
echo HTTPS setup complete!
echo ======================================================
echo.
echo Your site is now available at:
echo  - HTTP: http://conescout.duckdns.org (redirects to HTTPS)
echo  - HTTPS: https://conescout.duckdns.org:8443
echo.
echo Admin login:
echo  - URL: https://conescout.duckdns.org:8443/admin
echo  - Username: admin
echo  - Password: conescout
echo.
echo The SSL certificates will automatically renew when needed.
echo ======================================================
pause
