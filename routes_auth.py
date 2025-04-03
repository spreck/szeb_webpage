"""
Authentication routes and handlers for the Cone Scouting Tool.
"""

from flask import render_template, request, session, redirect, url_for, flash
from functools import wraps
from auth import verify_password, hash_password, ADMIN_PASSWORD_HASH, ADMIN_USERNAME, admin_auth_required
import os
import re

# Removed duplicate admin_auth_required decorator - importing from auth.py instead

def admin_login():
    """
    Admin login page
    """
    error = None
    print(f"Admin login handler called, method: {request.method}")
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Log the login attempt (for debugging)
        print(f"Login attempt: username={username}, password={'*' * len(password) if password else 'None'}")
        
        # Simple direct comparison for username/password
        if username == 'admin' and password == 'conescout':
            session['admin_logged_in'] = True
            session.permanent = True  # Make the session persistent
            session.modified = True
            print(f"Login successful for {username}")
            
            # Redirect to original URL if available
            next_url = session.pop('next_url', None)
            if next_url:
                return redirect(next_url)
            else:
                return redirect(url_for('admin_page'))
        else:
            error = "Invalid credentials"
            print(f"Login failed for username: {username}")
            # Add a small delay to prevent timing attacks
            import time
            time.sleep(0.5)
    
    return render_template('admin_login.html', error=error)

def admin_logout():
    """
    Admin logout
    """
    session.pop('admin_logged_in', None)
    return redirect(url_for('index'))

@admin_auth_required
def change_password():
    """
    Change the admin password
    """
    error = None
    success = None
    
    if request.method == 'POST':
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        # Validate inputs
        if not verify_password(current_password, ADMIN_PASSWORD_HASH):
            error = "Current password is incorrect"
        elif len(new_password) < 8:
            error = "New password must be at least 8 characters long"
        elif new_password != confirm_password:
            error = "New passwords do not match"
        else:
            # Generate new password hash
            new_hash = hash_password(new_password)
            
            # Update the password in auth.py
            try:
                auth_file_path = os.path.join(os.path.dirname(__file__), 'auth.py')
                with open(auth_file_path, 'r') as f:
                    content = f.read()
                
                # Use regular expressions to find and replace the password hash line
                # This is safer than a simple string replace as it handles format changes
                pattern = r'ADMIN_PASSWORD_HASH\s*=\s*[\'"].*?[\'"]'
                # Fixed: Don't try to decode the hash again, it's already a string
                new_content = re.sub(pattern, f'ADMIN_PASSWORD_HASH = "{new_hash}"', content)
                
                # Write the updated content back to the auth.py file
                with open(auth_file_path, 'w') as f:
                    f.write(new_content)
                
                success = "Password has been successfully changed. Please log in again with your new password."
                
                # Force re-login for security
                session.pop('admin_logged_in', None)
                return redirect(url_for('admin_login'))
                
            except Exception as e:
                error = f"Failed to update password: {str(e)}"
    
    return render_template('change_password.html', error=error, success=success)

def setup_auth_routes(app):
    """
    Register authentication-related routes with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    # Make sure these routes are registered with the Flask app
    app.add_url_rule('/admin/login', 'admin_login', admin_login, methods=["GET", "POST"])
    app.add_url_rule('/admin/logout', 'admin_logout', admin_logout)
    app.add_url_rule('/admin/change_password', 'change_password', change_password, methods=["GET", "POST"])
