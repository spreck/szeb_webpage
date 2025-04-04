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

echo Making columns nullable for OAuth users...
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ALTER COLUMN username DROP NOT NULL;"
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ALTER COLUMN password DROP NOT NULL;"
docker compose exec postgis psql -U geoserver -d geoserver_db -c "ALTER TABLE \"user\" ALTER COLUMN fs_uniquifier DROP NOT NULL;"

echo ======================================================
echo Database schema fixed!
echo ======================================================
echo.
echo Now try running Flask migrations:
echo docker compose exec cone-app flask db upgrade
echo.
echo Then restart your services:
echo docker compose restart
echo.
pause
