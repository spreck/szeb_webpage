import os
from flask import Flask
from flask_wtf.csrf import CSRFProtect
from routes import setup_routes
from prometheus_client import Counter, Histogram

def create_app(test_dir=None):
    """Create and configure the Flask application instance."""
    app = Flask(__name__)
    
    # Secret key for session and CSRF protection
    app.secret_key = os.environ.get('SECRET_KEY', 'super_secret_key')
    
    # CSRF protection
    csrf = CSRFProtect(app)
    
    # Configuration
    app.config['ENV'] = os.environ.get('FLASK_ENV', 'development')
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    app.config["GEOSERVER_URL"] = os.environ.get('GEOSERVER_URL', "http://conescout.duckdns.org/geoserver")
    
    # For testing, override the species config path
    if test_dir:
        app.config["SPECIES_CONFIG_DIR"] = test_dir
    
    # Metrics setup
    endpoint_requests = Counter('endpoint_requests', 'Total requests per endpoint', ['endpoint'])
    endpoint_latency = Histogram('endpoint_latency_seconds', 'Response time per endpoint', ['endpoint'])
    endpoint_clicks = Counter('endpoint_clicks', 'Total clicks per endpoint', ['endpoint'])
    species_selection_counter = Counter('species_selections', 'Number of times each species is selected', ['species'])
    attribute_selection_counter = Counter('attribute_selections', 'Number of times each attribute is selected', ['attribute'])
    species_duration_histogram = Histogram('species_duration_seconds', 'Time spent on each species', ['species'])
    attribute_duration_histogram = Histogram('attribute_duration_seconds', 'Time spent on each attribute', ['attribute'])
    user_locations = Counter('unique_user_locations', 'Unique user locations', ['latitude', 'longitude'])
    error_counter = Counter('endpoint_errors', 'Total errors per endpoint and status code', ['endpoint', 'status_code'])
    
    # Register routes
    setup_routes(app)
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=True, extra_files=[
        'static/js/script.js',
        'templates/index.html',
        'templates/about.html',
        'templates/map.html',
        'static/css/style.css',
        'templates/test.html',
        'static/js/test.js',
        'static/css/test.css'
    ])
