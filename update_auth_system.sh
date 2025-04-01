#!/bin/bash

echo "Updating to the new authentication system..."

echo "Creating data directory for SQLite database..."
mkdir -p data

echo "Copying new files..."
cp app_updated_auth.py app.py
cp requirements_updated.txt requirements.txt
cp Dockerfile-updated Dockerfile
cp docker-compose-updated.yml docker-compose.yml

echo "Stopping existing containers..."
docker-compose down

echo "Building and starting containers with new authentication system..."
docker-compose up -d --build

echo "Update complete!"
echo ""
echo "Default admin credentials:"
echo "Username: admin"
echo "Password: conescout"
echo ""
echo "Please change this password after your first login."
echo ""
echo "Access the application at: http://localhost"
echo ""
read -p "Press Enter to continue..."
