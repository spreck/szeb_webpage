@echo off
REM Update authentication system script for Windows

echo Updating authentication system...

REM Backup current files
echo Creating backups...
copy app.py app.py.bak
copy models.py models.py.bak
copy docker-compose.yml docker-compose.yml.bak

REM Update the application files
echo Updating application files...
copy app_updated_oauth.py app.py

REM Run database migrations if needed
echo Checking if database migrations are needed...
docker compose exec cone-app flask db migrate -m "Add OAuth fields to User model"
docker compose exec cone-app flask db upgrade

REM Create admin directory if it doesn't exist
if not exist "templates\admin" mkdir templates\admin

REM Restart the application
echo Restarting the application...
docker compose restart cone-app

echo Authentication system updated successfully!
echo Please visit https://conescout.duckdns.org/auth/login to test the new login system.
echo Admin dashboard is available at https://conescout.duckdns.org/admin/
