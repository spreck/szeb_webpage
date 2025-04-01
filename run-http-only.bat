@echo off
echo Starting the site with HTTP only...

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Copy over the HTTP-only nginx config
copy /Y nginx\nginx-init.conf nginx\nginx.conf

:: Start the services
docker compose down --remove-orphans
docker compose up -d

echo Your site should now be available at http://conescout.duckdns.org
echo.
echo When you're ready to try setting up HTTPS again, run setup-https-fixed.bat
pause
