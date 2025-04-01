# Use a Python base image
FROM python:3.9-slim

# Install necessary packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    mdbtools \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the app code and database
COPY app.py /app/
COPY EvacuationDatabase4.accdb /app/

# Install Python dependencies
RUN pip install --no-cache-dir flask flask_cors

# Expose the port
EXPOSE 5001

# Run the application
CMD ["python", "app.py"]
