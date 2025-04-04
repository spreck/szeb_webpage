@echo off
echo ======================================================
echo DIRECTLY FIXING DATABASE SCHEMA
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Execute SQL directly on the PostgreSQL container
echo Running SQL to add OAuth columns...
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);"
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(256);"
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS name VARCHAR(255);"
echo.

echo Making columns nullable for OAuth users...
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ALTER COLUMN username DROP NOT NULL;"
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ALTER COLUMN password DROP NOT NULL;"
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ALTER COLUMN fs_uniquifier DROP NOT NULL;"
echo.

echo Restarting services...
docker compose restart
timeout /t 10 /nobreak
echo.

echo Stamping the migration as complete...
docker compose exec cone-app flask db stamp head
echo.

echo ======================================================
echo Database schema fixed! HTTPS and OAuth setup is complete.
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
echo  - Password: conescout (from your .env file)
echo.
pause
