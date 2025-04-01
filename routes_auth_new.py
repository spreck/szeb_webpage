"""
Authentication routes for the Cone Scouting Tool using Flask-Login.
"""

from flask import render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, current_user, login_required
from models import User, db
from auth_utils import bcrypt, role_required

def setup_auth_routes(app):
    """
    Register authentication-related routes with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        """User login page."""
        # Redirect if user is already logged in
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        
        error = None
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            remember = 'remember' in request.form
            
            user = User.query.filter_by(username=username).first()
            
            if user and bcrypt.check_password_hash(user.password, password):
                login_user(user, remember=remember)
                flash(f'Welcome back, {user.username}!', 'success')
                
                # Redirect to next page if specified
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                return redirect(url_for('index'))
            else:
                error = "Invalid username or password"
        
        return render_template('login.html', error=error)
    
    @app.route('/logout')
    @login_required
    def logout():
        """User logout."""
        logout_user()
        flash('You have been logged out.', 'info')
        return redirect(url_for('index'))
    
    @app.route('/admin/users')
    @role_required('admin')
    def manage_users():
        """Admin page for managing users."""
        users = User.query.all()
        return render_template('manage_users.html', users=users)
    
    @app.route('/admin/users/add', methods=['GET', 'POST'])
    @role_required('admin')
    def add_user():
        """Add a new user."""
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            role = request.form.get('role', 'viewer')
            
            # Basic validation
            if not username or not password:
                flash('Username and password are required.', 'danger')
                return redirect(url_for('add_user'))
            
            if User.query.filter_by(username=username).first():
                flash('Username already exists.', 'danger')
                return redirect(url_for('add_user'))
            
            # Create new user
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            new_user = User(username=username, password=hashed_password, role=role)
            db.session.add(new_user)
            db.session.commit()
            
            flash(f'User {username} has been created.', 'success')
            return redirect(url_for('manage_users'))
        
        return render_template('add_user.html')
    
    @app.route('/admin/users/edit/<int:user_id>', methods=['GET', 'POST'])
    @role_required('admin')
    def edit_user(user_id):
        """Edit an existing user."""
        user = User.query.get_or_404(user_id)
        
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password', '')
            role = request.form.get('role')
            
            # Check if username already exists
            existing_user = User.query.filter_by(username=username).first()
            if existing_user and existing_user.id != user_id:
                flash('Username already exists.', 'danger')
                return redirect(url_for('edit_user', user_id=user_id))
            
            # Update user
            user.username = username
            user.role = role
            
            # Update password if provided
            if password:
                user.password = bcrypt.generate_password_hash(password).decode('utf-8')
            
            db.session.commit()
            flash(f'User {username} has been updated.', 'success')
            return redirect(url_for('manage_users'))
        
        return render_template('edit_user.html', user=user)
    
    @app.route('/admin/users/delete/<int:user_id>', methods=['POST'])
    @role_required('admin')
    def delete_user(user_id):
        """Delete a user."""
        user = User.query.get_or_404(user_id)
        
        # Prevent deleting the last admin
        if user.role == 'admin' and User.query.filter_by(role='admin').count() <= 1:
            flash('Cannot delete the last admin user.', 'danger')
            return redirect(url_for('manage_users'))
        
        # Prevent self-deletion
        if user.id == current_user.id:
            flash('Cannot delete your own account.', 'danger')
            return redirect(url_for('manage_users'))
        
        db.session.delete(user)
        db.session.commit()
        flash(f'User {user.username} has been deleted.', 'success')
        return redirect(url_for('manage_users'))
    
    @app.route('/admin/change_password', methods=['GET', 'POST'])
    @login_required
    def change_password():
        """Change user's password."""
        if request.method == 'POST':
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            confirm_password = request.form.get('confirm_password')
            
            # Validate inputs
            if not bcrypt.check_password_hash(current_user.password, current_password):
                flash('Current password is incorrect.', 'danger')
            elif len(new_password) < 8:
                flash('New password must be at least 8 characters long.', 'danger')
            elif new_password != confirm_password:
                flash('New passwords do not match.', 'danger')
            else:
                # Update password
                current_user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
                db.session.commit()
                flash('Your password has been changed successfully.', 'success')
                return redirect(url_for('index'))
        
        return render_template('change_password.html')
    
    @app.route('/admin/geoserver')
    @role_required('admin')
    def geoserver_admin():
        """Redirect to GeoServer admin interface."""
        geoserver_url = app.config.get('GEOSERVER_URL')
        if not geoserver_url:
            flash('GeoServer URL is not configured.', 'danger')
            return redirect(url_for('index'))
        
        # Redirect to GeoServer admin page
        return redirect(f"{geoserver_url}/web/")
