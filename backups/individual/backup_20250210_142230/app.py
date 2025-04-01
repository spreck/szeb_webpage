import os
import time
import requests
from flask import Flask, request
from prometheus_client import Counter, Histogram, generate_latest
from routes import setup_routes

app = Flask(__name__)

# Development configuration
app.config['ENV'] = 'development'  # Set environment to development
app.config['DEBUG'] = True  # Enable debug mode
app.config['TEMPLATES_AUTO_RELOAD'] = True  # Enable template auto-reload
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable static file caching

# Set default GEOSERVER_URL
app.config["GEOSERVER_URL"] = "http://conescout.duckdns.org/geoserver"

# ------------------------------
# Metrics definitions
# ------------------------------
endpoint_requests = Counter('endpoint_requests', 'Total requests per endpoint', ['endpoint'])
endpoint_latency = Histogram('endpoint_latency_seconds', 'Response time per endpoint', ['endpoint'])
endpoint_clicks = Counter('endpoint_clicks', 'Total clicks per endpoint', ['endpoint'])
species_selection_counter = Counter('species_selections', 'Number of times each species is selected', ['species'])
attribute_selection_counter = Counter('attribute_selections', 'Number of times each attribute is selected', ['attribute'])
species_duration_histogram = Histogram('species_duration_seconds', 'Time spent on each species', ['species'])
attribute_duration_histogram = Histogram('attribute_duration_seconds', 'Time spent on each attribute', ['attribute'])
user_locations = Counter('unique_user_locations', 'Unique user locations', ['latitude', 'longitude'])
error_counter = Counter('endpoint_errors', 'Total errors per endpoint and status code', ['endpoint', 'status_code'])

@app.before_request
def start_timer():
    request.start_time = time.time()

@app.after_request
def track_metrics(response):
    if request.path not in [
        '/metrics',
        '/track_species',
        '/track_attribute',
        '/track_species_duration',
        '/track_attribute_duration'
    ]:
        latency = time.time() - request.start_time
        endpoint_requests.labels(endpoint=request.path).inc()
        endpoint_latency.labels(endpoint=request.path).observe(latency)
        endpoint_clicks.labels(endpoint=request.path).inc()
        client_ip = get_client_ip()
        location = get_location(client_ip)
        user_locations.labels(latitude=location[0], longitude=location[1]).inc()
    return response

def get_client_ip():
    if "X-Forwarded-For" in request.headers:
        return request.headers["X-Forwarded-For"].split(",")[0].strip()
    return request.remote_addr

def get_location(ip):
    try:
        response = requests.get(f'http://ip-api.com/json/{ip}', timeout=5)
        data = response.json()
        if data.get('status') == 'success':
            return [data.get('lat', 0.0), data.get('lon', 0.0)]
    except Exception as e:
        print("Error fetching geolocation:", e)
    return [0.0, 0.0]

# ------------------------------
# Register all routes from routes.py
# ------------------------------
setup_routes(app)

# ------------------------------
# Error Handlers
# ------------------------------
@app.errorhandler(404)
def page_not_found(e):
    error_counter.labels(endpoint=request.path, status_code="404").inc()
    return "404 Not Found", 404

@app.errorhandler(403)
def forbidden(e):
    error_counter.labels(endpoint=request.path, status_code="403").inc()
    return "403 Forbidden", 403

@app.errorhandler(500)
def internal_error(e):
    error_counter.labels(endpoint=request.path, status_code="500").inc()
    return "500 Internal Server Error", 500

if __name__ == "__main__":
    # Development server configuration
    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True,
        use_reloader=True,
        extra_files=[  # Monitor additional files for changes
            'static/js/script.js',
            'templates/index.html',
            'static/css/style.css'
        ]
    )