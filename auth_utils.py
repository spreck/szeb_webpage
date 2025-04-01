"""
Authentication utilities for the Cone Scouting Tool.
"""

from functools import wraps
from flask import flash, redirect, url_for, abort
from flask_login import current_user, LoginManager, login_required
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()
login_manager = LoginManager()

def role_required(role):
    """
    Decorator to require a specific role for accessing a route.
    
    Args:
        role (str): The required role ('viewer', 'editor', or 'admin')
        
    Returns:
        function: Decorated function that checks user role
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                flash('Please log in to access this page.', 'warning')
                return redirect(url_for('login'))
            
            if not current_user.has_role(role):
                flash('You do not have permission to access this page.', 'danger')
                abort(403)
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Setup login manager
@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# Configure login view
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

# Function to create the initial admin user
def create_admin_user(app):
    """
    Create the initial admin user if it doesn't exist.
    
    Args:
        app: The Flask application instance
    """
    with app.app_context():
        from models import User, db
        
        # Check if admin user exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            # Create admin user with default password 'conescout'
            password_hash = bcrypt.generate_password_hash('conescout').decode('utf-8')
            admin = User(username='admin', password=password_hash, role='admin')
            db.session.add(admin)
            db.session.commit()
            print("Admin user created successfully.")
        else:
            print("Admin user already exists.")
