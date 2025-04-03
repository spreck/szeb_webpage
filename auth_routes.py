"""
Authentication routes for the Cone Scouting Tool.
Includes both Google OAuth2 and email/password authentication.
"""

import os
import json
from functools import wraps
from flask import Blueprint, redirect, url_for, render_template, request, flash, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from flask_dance.contrib.google import make_google_blueprint, google
from flask_dance.consumer.storage.sqla import SQLAlchemyStorage
from flask_dance.consumer import oauth_authorized, oauth_error
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy import exists
from models import db, User, Role
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField
from wtforms.validators import DataRequired, Email, Length, EqualTo, ValidationError
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()
auth_blueprint = Blueprint("auth", __name__, url_prefix="/auth")

# Define forms
class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Remember Me')
    submit = SubmitField('Log In')

class RegistrationForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    name = StringField('Full Name', validators=[DataRequired(), Length(min=2, max=100)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField('Confirm Password', 
                                     validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Sign Up')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('That email is already registered. Please choose a different one or log in.')

# Setup Google OAuth blueprint
def init_oauth(app):
    # Load client secret from file
    client_secret_file = 'client_secret_509773047187-ug65ufnta7ikjrtjmct8aks6rgs0in4d.apps.googleusercontent.com.json'
    with open(client_secret_file) as f:
        client_info = json.load(f)['web']
    
    # Create Google OAuth blueprint
    google_bp = make_google_blueprint(
        client_id=client_info['client_id'],
        client_secret=client_info['client_secret'],
        scope=["profile", "email"],
        redirect_url="/login/callback/google",
        storage=SQLAlchemyStorage(User, db.session, user=current_user)
    )
    
    app.register_blueprint(google_bp, url_prefix="/login")
    
    # Setup event handlers
    return google_bp

# Admin authorization
def is_admin():
    """Check if current user has admin role"""
    if not current_user.is_authenticated:
        return False
    
    if hasattr(current_user, 'roles'):
        return any(role.name == 'admin' for role in current_user.roles)
    return False

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not is_admin():
            flash('You need admin privileges to access this page.', 'danger')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

# Get configured admin emails
def get_admin_emails():
    """Get list of admin emails from environment variables"""
    admin_emails_str = os.environ.get('ADMIN_EMAILS', '')
    if admin_emails_str:
        return [email.strip() for email in admin_emails_str.split(',')]
    return []

# Routes
@auth_blueprint.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and user.password and bcrypt.check_password_hash(user.password, form.password.data):
            login_user(user, remember=form.remember.data)
            next_page = request.args.get('next')
            flash('Login successful!', 'success')
            return redirect(next_page if next_page else url_for('index'))
        else:
            flash('Login failed. Please check your email and password.', 'danger')
    
    return render_template('login.html', form=form)

@auth_blueprint.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = RegistrationForm()
    if form.validate_on_submit():
        # Hash the password
        hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
        
        # Create new user
        user = User(
            email=form.email.data,
            name=form.name.data,
            username=form.email.data.split('@')[0],  # Use part of email as username
            password=hashed_password
        )
        
        # Check if user should be an admin
        admin_emails = get_admin_emails()
        if form.email.data in admin_emails:
            # Add admin role
            admin_role = Role.query.filter_by(name='admin').first()
            if admin_role:
                user.roles.append(admin_role)
        
        # Save to database
        db.session.add(user)
        db.session.commit()
        
        flash('Your account has been created! You can now log in.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('register.html', form=form)

@auth_blueprint.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@auth_blueprint.route('/google')
def login_google():
    """Redirect to Google OAuth"""
    if not google.authorized:
        return redirect(url_for('google.login'))
    return redirect(url_for('auth.google_callback'))

@auth_blueprint.route('/google/callback')
def google_callback():
    """Handle Google OAuth callback"""
    if not google.authorized:
        flash('Authentication failed. Please try again.', 'danger')
        return redirect(url_for('auth.login'))
    
    # Get user info from Google
    resp = google.get('/oauth2/v2/userinfo')
    if resp.ok:
        google_info = resp.json()
        google_id = google_info.get('id')
        email = google_info.get('email')
        name = google_info.get('name', '')
        
        # Find or create user
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Create a new user
            user = User(
                email=email,
                name=name,
                username=email.split('@')[0],
                oauth_provider='google',
                oauth_id=google_id
            )
            
            # Check if user should be an admin
            admin_emails = get_admin_emails()
            if email in admin_emails:
                # Add admin role
                admin_role = Role.query.filter_by(name='admin').first()
                if admin_role:
                    user.roles.append(admin_role)
            
            db.session.add(user)
            db.session.commit()
        else:
            # Update existing user's OAuth info if they're signing in with Google
            if not user.oauth_id:
                user.oauth_provider = 'google'
                user.oauth_id = google_id
                db.session.commit()
        
        # Log in the user
        login_user(user)
        flash(f'Welcome, {user.name}!', 'success')
        
        return redirect(url_for('index'))
    
    flash('Failed to get user info from Google.', 'danger')
    return redirect(url_for('auth.login'))

# OAuth signal handlers
@oauth_authorized.connect
def google_logged_in(blueprint, token):
    """Called when OAuth login is successful"""
    # We're handling the user creation in the callback route
    # This is just a signal handler
    pass

@oauth_error.connect
def oauth_error_handler(blueprint, error, error_description=None, error_uri=None):
    """Called when OAuth login returns with an error"""
    msg = f"OAuth error from {blueprint.name}: {error}"
    if error_description:
        msg = f"{msg} ({error_description})"
    flash(msg, category="danger")

# Register blueprint and configure
def setup_auth_routes(app):
    """Initialize authentication routes and configuration"""
    app.register_blueprint(auth_blueprint)
    bcrypt.init_app(app)
    google_bp = init_oauth(app)
    return app
