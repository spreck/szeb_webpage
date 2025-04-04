@echo off
echo ======================================================
echo CHECKING LOGIN TEMPLATE AND SESSION CONFIGURATION
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Check if login template exists
echo Checking if login template exists...
dir templates\login.html

:: Check Flask-Security configuration
echo.
echo Checking Flask session configuration...
docker compose exec cone-app ls -la /usr/src/app/templates

:: Clear session data
echo.
echo Clearing session data...
docker compose exec cone-app rm -rf /tmp/flask_session/*

:: Restarting the app
echo.
echo Restarting the Flask application...
docker compose restart cone-app
timeout /t 5

echo.
echo ======================================================
echo Login template check complete
echo ======================================================
echo.
echo Please try accessing the login page again at:
echo https://conescout.duckdns.org/auth/login
echo.
pause
