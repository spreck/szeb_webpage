#!/bin/bash

# Update authentication system script
echo "Updating authentication system..."

# Backup current files
echo "Creating backups..."
cp -f app.py app.py.bak
cp -f models.py models.py.bak
cp -f docker-compose.yml docker-compose.yml.bak

# Update the application files
echo "Updating application files..."
cp -f app_updated_oauth.py app.py

# Run database migrations if needed
echo "Checking if database migrations are needed..."
docker compose exec cone-app flask db migrate -m "Add OAuth fields to User model"
docker compose exec cone-app flask db upgrade

# Create admin directory if it doesn't exist
mkdir -p templates/admin

# Restart the application
echo "Restarting the application..."
docker compose restart cone-app

echo "Authentication system updated successfully!"
echo "Please visit https://conescout.duckdns.org/auth/login to test the new login system."
echo "Admin dashboard is available at https://conescout.duckdns.org/admin/"
