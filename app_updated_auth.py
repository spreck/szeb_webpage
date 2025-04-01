import os
import logging
from flask import Flask, render_template, redirect, url_for
from flask_wtf.csrf import CSRFProtect
from routes import setup_routes
from models import db, User
from auth_utils import bcrypt, login_manager, create_admin_user
from routes_auth_new import setup_auth_routes
from prometheus_client import Counter, Histogram

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

logger = logging.getLogger(__name__)

def create_app(test_dir=None):
    """Create and configure the Flask application instance."""
    app = Flask(__name__)
    
    # Load configuration from environment variables
    app.secret_key = os.environ.get('SECRET_KEY', 'conescout_secret_key_2023')
    app.config['ENV'] = os.environ.get('FLASK_ENV', 'development')
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    app.config["GEOSERVER_URL"] = os.environ.get('GEOSERVER_URL', "http://conescout.duckdns.org/geoserver")
    app.config["GEOSERVER_WORKSPACE"] = os.environ.get('GEOSERVER_WORKSPACE', "SZEB_sample")
    app.config["GEOSERVER_USER"] = os.environ.get('GEOSERVER_USER', "admin")
    app.config["GEOSERVER_PASS"] = os.environ.get('GEOSERVER_PASS', "geoserver")
    
    # SQLAlchemy configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'sqlite:///users.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Log configuration
    logger.info(f"App configured with GEOSERVER_URL: {app.config['GEOSERVER_URL']}")
    logger.info(f"App configured with GEOSERVER_WORKSPACE: {app.config['GEOSERVER_WORKSPACE']}")
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    
    # Initialize CSRF protection
    csrf = CSRFProtect(app)
    
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
    
    # Create database tables
    with app.app_context():
        db.create_all()
        # Create initial admin user
        create_admin_user(app)
    
    # Register routes
    setup_routes(app)
    setup_auth_routes(app)
    
    # Add 404 handler
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404
    
    # Add 403 (Forbidden) handler
    @app.errorhandler(403)
    def forbidden(e):
        return render_template('403.html'), 403
    
    # Add 500 (Server Error) handler
    @app.errorhandler(500)
    def server_error(e):
        return render_template('500.html'), 500
    
    return app

# Create the Flask application instance for gunicorn to use
app = create_app()

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=True, extra_files=[
        'static/js/script.js',
        'static/js/modules/map-manager.js',
        'static/js/modules/geoserver-config.js',
        'static/js/modules/geoserver-connection.js',
        'templates/index.html',
        'templates/about.html',
        'templates/map.html',
        'static/css/style.css'
    ])
