@echo off
echo ======================================================
echo CONE SCOUT HTTPS AND OAUTH SETUP
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Rebuild images with updated requirements
echo Building containers with updated requirements...
docker compose build cone-app

:: Run the certificate initialization if needed
IF NOT EXIST certbot\conf\live\conescout.duckdns.org\fullchain.pem (
    echo Initializing SSL certificates...
    docker compose up certbot-init
) ELSE (
    echo SSL certificates already exist.
)

:: Start the database first
echo Starting PostgreSQL...
docker compose up -d postgis
timeout /t 10 /nobreak

:: Start the rest of the services
echo Starting all services...
docker compose up -d

:: Run database migrations
echo Running database migrations...
docker compose exec cone-app flask db upgrade

echo ======================================================
echo HTTPS and OAuth setup complete!
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
echo  - Password: conescout
echo.
echo The SSL certificates will automatically renew when needed.
echo ======================================================
pause
