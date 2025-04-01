"""
Database models for the Cone Scouting Tool.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model with role-based access control."""
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='viewer')  # 'viewer', 'editor', or 'admin'
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def has_role(self, role):
        """Check if user has the specified role."""
        # Admin role has access to everything
        if self.role == 'admin':
            return True
        return self.role == role
