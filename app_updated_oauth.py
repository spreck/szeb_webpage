import os
import logging
import tempfile
import time
from flask import Flask
from flask_wtf.csrf import CSRFProtect
from flask_session import Session
from flask_security import Security, SQLAlchemyUserDatastore, hash_password
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from prometheus_client import Counter, Histogram
from sqlalchemy import exc as sqlalchemy_exc
from dotenv import load_dotenv
from models import db, User, Role

# Load environment variables from .env file if it exists
load_dotenv()

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

def wait_for_db(db, app, max_retries=30, retry_interval=2):
    """
    Attempt to connect to the database with retries.
    
    Args:
        db: SQLAlchemy database instance
        app: Flask application instance
        max_retries: Maximum number of retry attempts
        retry_interval: Time in seconds between retries
        
    Returns:
        bool: True if connection successful, False otherwise
    """
    logger.info("Attempting to connect to the database...")
    retries = 0
    
    while retries < max_retries:
        try:
            # Try to establish a connection
            with app.app_context():
                db.engine.connect()
                logger.info("Successfully connected to the database!")
                return True
        except sqlalchemy_exc.OperationalError as e:
            retries += 1
            logger.warning(f"Database connection attempt {retries}/{max_retries} failed: {e}")
            logger.info(f"Retrying in {retry_interval} seconds...")
            time.sleep(retry_interval)
    
    logger.error(f"Failed to connect to the database after {max_retries} attempts.")
    return False

def create_app(test_dir=None):
    """Create and configure the Flask application instance."""
    app = Flask(__name__)
    
    # Load configuration from environment variables
    app.secret_key = os.environ.get('SECRET_KEY', 'conescout_secret_key_2023')
    app.config['ENV'] = os.environ.get('FLASK_ENV', 'development')
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    
    # Configure session
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # Session lasts for 24 hours
    app.config['SESSION_FILE_DIR'] = os.environ.get('SESSION_FILE_DIR', tempfile.gettempdir())
    Session(app)  # Initialize the Flask-Session extension
    
    # Configure database
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'SQLALCHEMY_DATABASE_URI', 
        'postgresql://geoserver:23vmoWpostgis@postgis:5432/geoserver_db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Set sensible security defaults
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'conescout_secret_key_2023')
    app.config['SECURITY_PASSWORD_SALT'] = os.environ.get('SECURITY_PASSWORD_SALT', 'conescout_salt_2023')
    app.config['SECURITY_PASSWORD_HASH'] = 'pbkdf2_sha512'  # More secure than bcrypt for this use case
    
    # OAuth configuration
    app.config['OAUTHLIB_INSECURE_TRANSPORT'] = os.environ.get('FLASK_ENV', 'development') == 'development'
    
    # Admin email configuration for auto-assigning admin role
    app.config['ADMIN_EMAILS'] = os.environ.get('ADMIN_EMAILS', '').split(',')
    
    # Disable most Flask-Security features since we're using custom auth
    app.config['SECURITY_REGISTERABLE'] = False
    app.config['SECURITY_RECOVERABLE'] = False
    app.config['SECURITY_TRACKABLE'] = False
    app.config['SECURITY_CHANGEABLE'] = False
    app.config['SECURITY_SEND_REGISTER_EMAIL'] = False
    app.config['SECURITY_SEND_PASSWORD_CHANGE_EMAIL'] = False
    app.config['SECURITY_SEND_PASSWORD_RESET_EMAIL'] = False
    
    # Move Flask-Security routes out of the way
    app.config['SECURITY_URL_PREFIX'] = '/flask_security'
    
    # Set up strict CSRF protection
    app.config['WTF_CSRF_ENABLED'] = True
    app.config['WTF_CSRF_SECRET_KEY'] = os.environ.get('WTF_CSRF_SECRET_KEY', 'conescout_csrf_key_2023')
    
    # GeoServer configuration
    app.config["GEOSERVER_URL"] = os.environ.get('GEOSERVER_URL', "https://conescout.duckdns.org/geoserver")
    app.config["GEOSERVER_WORKSPACE"] = os.environ.get('GEOSERVER_WORKSPACE', "SZEB_sample")
    app.config["GEOSERVER_USER"] = os.environ.get('GEOSERVER_USER', "admin")
    app.config["GEOSERVER_PASS"] = os.environ.get('GEOSERVER_PASS', "geoserver")
    
    # Log configuration
    logger.info(f"App configured with GEOSERVER_URL: {app.config['GEOSERVER_URL']}")
    logger.info(f"App configured with GEOSERVER_WORKSPACE: {app.config['GEOSERVER_WORKSPACE']}")
    
    # Initialize extensions
    db.init_app(app)
    
    # Initialize Flask-Migrate
    migrate = Migrate(app, db)
    
    # Initialize CSRF protection
    csrf = CSRFProtect(app)
    # Add CSRF exempt routes if needed
    csrf.exempt('login_test')
    
    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'
    login_manager.init_app(app)
    
    # Initialize Flask-Bcrypt
    bcrypt = Bcrypt(app)
    
    # Setup user loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Initialize Flask-Security but with minimal configuration
    # We'll use our custom login system for admin auth
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    security = Security(app, user_datastore, register_blueprint=False)
    
    # Wait for database to be ready before proceeding
    if not wait_for_db(db, app):
        logger.error("Could not connect to the database, but continuing app initialization...")
    
    # Create database tables and admin user if they don't exist
    with app.app_context():
        try:
            # Create tables
            db.create_all()
        
            # Create 'admin' role if it doesn't exist
            if not user_datastore.find_role('admin'):
                user_datastore.create_role(name='admin', description='Administrator')
                db.session.commit()
            
            # Create admin user if it doesn't exist
            admin_email = os.environ.get('ADMIN_EMAIL', 'admin@conescout.local')
            admin_password = os.environ.get('ADMIN_PASSWORD', 'conescout')
            
            if not user_datastore.find_user(email=admin_email):
                user_datastore.create_user(
                    email=admin_email,
                    username='admin',  # Set a username for the admin user
                    password=hash_password(admin_password),
                    active=True
                )
                db.session.commit()
                
                # Add admin role to the admin user
                admin_user = user_datastore.find_user(email=admin_email)
                admin_role = user_datastore.find_role('admin')
                user_datastore.add_role_to_user(admin_user, admin_role)
                db.session.commit()
                
                logger.info(f"Created admin user: admin")
        except sqlalchemy_exc.OperationalError as e:
            logger.error(f"Database operation failed: {e}")
            logger.warning("Continuing without initializing database. Some features may not work properly.")
        except Exception as e:
            logger.error(f"Unexpected error during database initialization: {e}")
            logger.warning("Continuing without complete database initialization. Some features may not work properly.")
    
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
    
    # Import routes setup function here to avoid circular imports
    from routes import setup_routes
    
    # Register routes
    setup_routes(app)
    
    # Register authentication routes
    from auth_routes import setup_auth_routes
    setup_auth_routes(app)
    
    # Register admin routes
    from admin_routes import setup_admin_routes
    setup_admin_routes(app)
    
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
