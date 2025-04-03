@echo off
REM Windows batch script to start the application with HTTPS

REM Make sure certificates directory exists
if not exist "certbot\conf\live\conescout.duckdns.org\" (
    echo SSL certificates not found! Please run init-letsencrypt.bat first.
    exit /b 1
)

REM Build and start all services
echo Starting services with HTTPS enabled...
docker compose up --build -d

echo Services started successfully!
echo You can now access the application at:
echo https://conescout.duckdns.org
