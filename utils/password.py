"""
Password hashing and verification utilities using bcrypt.
"""

import bcrypt
import os
import base64

# Default password: conescout
# This is a bcrypt hash, not the SHA-256 hash used previously
DEFAULT_PASSWORD_HASH = b'$2b$12$VpqWdD/zs0e7jRZGQgEOHufxMO/SV7y6Wj/Cm56iQPQPY.cHE6ef6'

def hash_password(password):
    """
    Hash a password using bcrypt.
    
    Args:
        password (str): The password to hash
        
    Returns:
        bytes: The bcrypt hash of the password
    """
    if isinstance(password, str):
        password = password.encode('utf-8')
        
    # Generate a salt and hash the password
    salt = bcrypt.gensalt(12)  # Work factor of 12 is a good balance of security and performance
    password_hash = bcrypt.hashpw(password, salt)
    
    return password_hash

def verify_password(password, password_hash):
    """
    Verify a password against a bcrypt hash.
    
    Args:
        password (str): The password to verify
        password_hash (bytes or str): The bcrypt hash to verify against
        
    Returns:
        bool: True if the password matches the hash, False otherwise
    """
    if isinstance(password, str):
        password = password.encode('utf-8')
        
    if isinstance(password_hash, str):
        password_hash = password_hash.encode('utf-8')
        
    try:
        return bcrypt.checkpw(password, password_hash)
    except Exception:
        return False

def generate_password_hash_for_user(username, password):
    """
    Generate a password hash for a user.
    Utility function for creating password hashes for new users.
    
    Args:
        username (str): The username (for logging purposes)
        password (str): The password to hash
        
    Returns:
        str: The password hash in a format suitable for storing in a config file
    """
    hashed = hash_password(password)
    print(f"Password hash for {username}: {hashed}")
    return hashed
