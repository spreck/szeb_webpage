@echo off
echo ======================================================
echo FIXING FLASK-MIGRATE AND DATABASE SCHEMA
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Stop the containers
echo Stopping containers to apply fixes...
docker compose down

:: Start database first
echo Starting database for the fixes...
docker compose up -d postgis
timeout /t 5 /nobreak

:: Fix database schema directly
echo Fixing database schema...
docker compose exec postgis psql -U geoserver -d geoserver_db -f /opt/geoserver_data/fix-database.sql

:: Start the app to initialize migrations
echo Starting app container...
docker compose up -d cone-app
timeout /t 5 /nobreak

:: Initialize Flask-Migrate
echo Initializing Flask-Migrate...
docker compose exec cone-app flask db init
docker compose exec cone-app flask db migrate -m "add oauth columns"
docker compose exec cone-app flask db upgrade

:: Start all services
echo Starting all services...
docker compose up -d

echo ======================================================
echo Setup complete!
echo ======================================================
echo.
echo Your site is now available at:
echo  - HTTP: http://conescout.duckdns.org (redirects to HTTPS)
echo  - HTTPS: https://conescout.duckdns.org
echo.
echo Login options:
echo  - Standard login: https://conescout.duckdns.org/auth/login
echo  - Google OAuth: https://conescout.duckdns.org/auth/google
echo.
echo Admin login:
echo  - URL: https://conescout.duckdns.org/admin
echo  - Username: admin
echo  - Password: (from your .env file)
echo.
pause
