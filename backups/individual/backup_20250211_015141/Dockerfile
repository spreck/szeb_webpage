# Use an official Python runtime as a parent image
FROM python:3.9

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy only the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the necessary application files
COPY app.py .
COPY routes.py .
COPY css_styles.py .

# Copy the templates directory
COPY templates/ ./templates

# Copy specific subdirectories of static to exclude large folders
COPY static/css ./static/css
COPY static/images ./static/images
COPY static/js ./static/js

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variable
ENV NAME World

# Run Gunicorn server on port 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
