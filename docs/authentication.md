# Authentication System

## Overview

The Cone Scouting Tool uses Flask-Security-Too for authentication and authorization. This modern, secure authentication system provides robust user management, role-based access control, and enhanced security features.

## Key Features

- **Secure Password Management**: Uses PBKDF2-SHA512 hashing (more secure than bcrypt)
- **Role-Based Access Control**: Granular permissions through role assignments
- **User Management Interface**: Easy administration of users
- **Password Recovery**: Built-in password reset capabilities
- **Session Management**: Configurable session lifetime and security
- **CSRF Protection**: Enhanced cross-site request forgery protection

## Authentication Flow

1. User navigates to a protected page or explicitly to `/login`
2. User enters credentials (email/username and password)
3. System validates credentials and creates a secure session
4. Session is maintained for the configured lifetime (default: 24 hours)
5. Protected routes check for valid session and appropriate role permissions

## User Management

### Accessing User Management

1. Log in with admin credentials
2. Navigate to `/admin`
3. Click the "User Management" button in the top navigation bar

This will take you to the User Management interface at `/admin/users`.

### User Operations

#### Creating Users

1. Click "Add New User" on the User Management page
2. Fill in the required information:
   - **Email**: User's email address (must be unique)
   - **Username**: User's login name (must be unique)
   - **Password**: Initial password
   - **Roles**: Check "Admin" to grant administrative access
   - **Active**: Whether the account is immediately active

#### Editing Users

1. Click "Edit" next to the user you want to modify
2. Update any information as needed
3. Leave password field empty to keep the current password
4. Click "Update User" to save changes

#### Activating/Deactivating Users

- Click "Deactivate" to temporarily disable a user account
- Click "Activate" to re-enable a previously deactivated account

Deactivated users cannot log in, but their data remains in the system.

#### Deleting Users

Click "Delete" to permanently remove a user.

**Note**: You cannot delete your own account, and deletion is permanent.

## Roles and Permissions

The system currently defines these roles:

- **Admin**: Full access to all features, including user management

Additional roles can be added programmatically if needed.

## Configuration

The authentication system is configured in `app.py` using these primary settings:

```python
# Security configuration
app.config['SECURITY_PASSWORD_SALT'] = os.environ.get('SECURITY_PASSWORD_SALT', 'conescout_salt_2023')
app.config['SECURITY_PASSWORD_HASH'] = 'pbkdf2_sha512'
app.config['SECURITY_REGISTERABLE'] = False
app.config['SECURITY_RECOVERABLE'] = True
app.config['SECURITY_CHANGEABLE'] = True

# Session configuration
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours
```

### Environment Variables

For production deployments, set these environment variables:

- `SECRET_KEY`: Flask secret key (should be random and kept confidential)
- `SECURITY_PASSWORD_SALT`: Salt for password hashing
- `ADMIN_EMAIL`: Email for the default admin account
- `ADMIN_USERNAME`: Username for the default admin account
- `ADMIN_PASSWORD`: Password for the default admin account

## Security Best Practices

### Password Policies

Enforce strong passwords by following these guidelines:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and special characters
- No personal information or common dictionary words
- Regular password changes (every 90 days recommended)

### Session Security

- Keep sessions secure by enabling HTTPS in production
- Set appropriate session timeouts based on security requirements
- Use secure and HttpOnly flags for cookies

### Access Control

- Grant admin access only to trusted users
- Regularly audit the user list
- Promptly remove access for users who no longer need it
- Consider implementing the principle of least privilege

## Troubleshooting

### Login Issues

**Problem**: User cannot log in with correct credentials
**Solution**: 
1. Verify the user account is active
2. Check case sensitivity in email/username
3. Reset the password if necessary

**Problem**: "Invalid CSRF token" error
**Solution**:
1. Clear browser cookies and cache
2. Try a different browser

### Account Management Issues

**Problem**: Cannot create a user with specific email/username
**Solution**: Check if the email or username already exists (must be unique)

**Problem**: User doesn't receive password reset email
**Solution**: Email delivery is not configured by default. Configure SMTP settings if needed.

## Upgrading from Previous Version

If upgrading from the previous authentication system:

1. Users need to be migrated to the new schema
2. Passwords will need to be reset (old bcrypt hashes are not compatible)
3. Admin user will be created automatically on first run

## Technical Details

### Database Schema

The authentication system uses these key tables:

- `user`: Stores user information (credentials, status)
- `role`: Stores available roles
- `roles_users`: Junction table connecting users to roles

### Password Hashing

The system uses PBKDF2-SHA512 instead of bcrypt because:
1. It's more resistant to GPU-based attacks
2. It has adjustable iterations to adapt to increasing computing power
3. It's FIPS-compliant for organizations with strict security requirements

### Dependencies

Key Python packages:
- Flask-Security-Too
- Flask-SQLAlchemy
- Flask-Login
- Passlib
- Email-Validator

## Additional Resources

- [Flask-Security-Too Documentation](https://flask-security-too.readthedocs.io/)
- [OWASP Password Storage Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
