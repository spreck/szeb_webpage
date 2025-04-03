# Multi-stage build to handle JavaScript files with Node.js and then create the final Python image
FROM node:18 AS js-builder

WORKDIR /build

# Install Python for the build script
RUN apt-get update && apt-get install -y python3 && ln -sf /usr/bin/python3 /usr/bin/python

# Copy package.json and install dependencies
COPY package.json .
COPY package-lock.json* .
RUN npm install

# Copy JS files and build configs
COPY static/js ./static/js
COPY babel.config.json .
COPY build.py .

# Create the dist directory structure
RUN mkdir -p static/dist/config static/dist/modules static/dist/components

# Run the build script to process JavaScript files
RUN python build.py

# Main stage - Python application
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Install system dependencies for GDAL & PostgreSQL client
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    python3-gdal \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL and PROJ environment variables
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal
ENV GDAL_DATA=/usr/share/gdal
ENV PROJ_LIB=/usr/share/proj

# Copy only the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt && pip install flask-session

# Copy application files
COPY app.py .
COPY routes.py .
COPY routes_auth.py .
COPY css_styles.py .
COPY auth.py .
COPY models.py .
COPY utils/ ./utils/
COPY api/ ./api/

# Copy the templates directory
COPY templates/ ./templates

# Copy static subdirectories
COPY static/css ./static/css
COPY static/images ./static/images
COPY static/js ./static/js

# Copy the built JS files from the build stage
COPY --from=js-builder /build/static/dist ./static/dist

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variable
ENV NAME World

# Run Gunicorn server on port 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]