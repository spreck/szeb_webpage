@echo off
echo Updating to the new authentication system...

echo Creating data directory for SQLite database...
mkdir data 2>nul

echo Copying new files...
copy app_updated_auth.py app.py
copy requirements_updated.txt requirements.txt
copy Dockerfile-updated Dockerfile
copy docker-compose-updated.yml docker-compose.yml

echo Stopping existing containers...
docker-compose down

echo Building and starting containers with new authentication system...
docker-compose up -d --build

echo Update complete!
echo.
echo Default admin credentials:
echo Username: admin
echo Password: conescout
echo.
echo Please change this password after your first login.
echo.
echo Access the application at: http://localhost
echo.
pause
