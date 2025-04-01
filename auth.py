"""
Authentication utilities for the Cone Scouting Tool.
"""

import bcrypt
from functools import wraps
from flask import redirect, url_for, session, request, flash

# Admin authentication settings
ADMIN_USERNAME = "admin"
# Default password: conescout
# Generate with: bcrypt.hashpw(b"conescout", bcrypt.gensalt()).decode('utf-8')
ADMIN_PASSWORD_HASH = "$2b$12$X.qMcFfpRD644N3LrCMEaOQJTFY6BC3XJsEJB5UR/Ha4HiXYTHAl2"

def verify_password(plain_password, hashed_password):
    """
    Verify a password against a bcrypt hash.
    
    Args:
        plain_password (str): The plain text password to verify
        hashed_password (str): The bcrypt hash to check against
        
    Returns:
        bool: True if password matches, False otherwise
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def hash_password(plain_password):
    """
    Generate a bcrypt hash for a password.
    
    Args:
        plain_password (str): The plain text password to hash
        
    Returns:
        str: The bcrypt hash as a string
    """
    return bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def admin_auth_required(f):
    """
    Decorator to require admin authentication for a route.
    
    Use on routes that should only be accessible to authenticated admins.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            # Store the original URL for redirecting back after login
            session['next_url'] = request.url
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated
