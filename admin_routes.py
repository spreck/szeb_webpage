"""
Admin routes for the Cone Scouting Tool.
Includes user management and admin assignment functionality.
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from models import db, User, Role
from sqlalchemy import exc
from auth_routes import admin_required
from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, SubmitField, SelectField
from wtforms.validators import DataRequired, Email

admin_blueprint = Blueprint("admin", __name__, url_prefix="/admin")

# Define forms
class UserEditForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    name = StringField('Full Name', validators=[DataRequired()])
    is_admin = BooleanField('Admin Rights')
    active = BooleanField('Active')
    submit = SubmitField('Save Changes')

class UserCreateForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    name = StringField('Full Name', validators=[DataRequired()])
    is_admin = BooleanField('Admin Rights')
    submit = SubmitField('Create User')

# Routes
@admin_blueprint.route("/")
@login_required
@admin_required
def admin_dashboard():
    """Admin dashboard home page"""
    user_count = User.query.count()
    admin_count = User.query.join(User.roles).filter(Role.name == 'admin').count()
    return render_template(
        "admin/dashboard.html", 
        user_count=user_count,
        admin_count=admin_count
    )

@admin_blueprint.route("/users")
@login_required
@admin_required
def list_users():
    """List all users"""
    users = User.query.all()
    return render_template("admin/users.html", users=users)

@admin_blueprint.route("/users/new", methods=["GET", "POST"])
@login_required
@admin_required
def create_user():
    """Create a new user"""
    form = UserCreateForm()
    
    if form.validate_on_submit():
        try:
            # Check if email already exists
            existing_user = User.query.filter_by(email=form.email.data).first()
            if existing_user:
                flash(f"User with email {form.email.data} already exists.", "danger")
                return render_template("admin/user_create.html", form=form)
            
            # Create new user
            new_user = User(
                email=form.email.data,
                name=form.name.data,
                username=form.email.data.split('@')[0],
                active=True
            )
            
            db.session.add(new_user)
            
            # Assign admin role if needed
            if form.is_admin.data:
                admin_role = Role.query.filter_by(name='admin').first()
                if admin_role:
                    new_user.roles.append(admin_role)
            
            db.session.commit()
            flash(f"User {form.email.data} created successfully.", "success")
            return redirect(url_for("admin.list_users"))
            
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            flash(f"Error creating user: {str(e)}", "danger")
    
    return render_template("admin/user_create.html", form=form)

@admin_blueprint.route("/users/<int:user_id>", methods=["GET", "POST"])
@login_required
@admin_required
def edit_user(user_id):
    """Edit a user"""
    user = User.query.get_or_404(user_id)
    
    # Check if user is trying to edit themselves
    if user.id == current_user.id:
        flash("You cannot modify your own admin status. Contact another admin if needed.", "warning")
    
    # Pre-populate the form
    form = UserEditForm(obj=user)
    
    # Check if user is admin for form pre-population
    admin_role = Role.query.filter_by(name='admin').first()
    is_admin = admin_role in user.roles
    form.is_admin.data = is_admin
    
    if form.validate_on_submit():
        try:
            # Update basic info
            user.email = form.email.data
            user.name = form.name.data
            user.active = form.active.data
            
            # Handle admin role (but prevent removing your own admin role)
            if user.id != current_user.id:
                admin_role = Role.query.filter_by(name='admin').first()
                
                # User should be admin but isn't currently
                if form.is_admin.data and admin_role not in user.roles:
                    user.roles.append(admin_role)
                    
                # User shouldn't be admin but currently is
                elif not form.is_admin.data and admin_role in user.roles:
                    user.roles.remove(admin_role)
            
            db.session.commit()
            flash(f"User {user.email} updated successfully.", "success")
            return redirect(url_for("admin.list_users"))
            
        except exc.SQLAlchemyError as e:
            db.session.rollback()
            flash(f"Error updating user: {str(e)}", "danger")
    
    return render_template("admin/user_edit.html", form=form, user=user)

@admin_blueprint.route("/users/<int:user_id>/delete", methods=["POST"])
@login_required
@admin_required
def delete_user(user_id):
    """Delete a user"""
    user = User.query.get_or_404(user_id)
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        flash("You cannot delete your own account.", "danger")
        return redirect(url_for("admin.list_users"))
    
    try:
        email = user.email
        db.session.delete(user)
        db.session.commit()
        flash(f"User {email} deleted successfully.", "success")
    except exc.SQLAlchemyError as e:
        db.session.rollback()
        flash(f"Error deleting user: {str(e)}", "danger")
    
    return redirect(url_for("admin.list_users"))

# Register blueprint
def setup_admin_routes(app):
    """Initialize admin routes"""
    app.register_blueprint(admin_blueprint)
    return app
