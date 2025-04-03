# Authentication System Documentation

## Overview

The SZEB Website uses Flask-Security for authentication and authorization. The system includes user and role models, login/logout functionality, and role-based access control.

## Models

Authentication models are defined in `models.py`:

- `User`: Represents application users with fields for email, username, password, and roles
- `Role`: Represents user roles (e.g., admin, editor, viewer)
- `roles_users`: Join table linking users to roles

## Implementation Details

The authentication system is implemented across several files:

- `models.py`: Defines database models for users and roles
- `app.py`: Configures Flask-Security and sets up the user datastore
- `routes_auth.py`: Contains route handlers for authentication-related endpoints
- `auth.py`: Contains utility functions for authentication and authorization

## Configuration

Flask-Security is configured in `app.py` with the following settings:

- Password hashing using PBKDF2 with SHA-512
- User registration disabled (admin creates accounts)
- Password recovery enabled
- Password change enabled
- Email notifications disabled (can be enabled with email configuration)

## Default Admin Account

A default admin account is created on application startup if it doesn't exist:

- Email: admin@conescout.local (configurable via environment variable ADMIN_EMAIL)
- Username: admin (configurable via environment variable ADMIN_USERNAME)
- Password: conescout (configurable via environment variable ADMIN_PASSWORD)

## Docker Configuration

When deploying with Docker, ensure the following files are properly included:

1. `models.py` must be copied into the Docker container
2. Include `models.py` in the volumes section of docker-compose.yml for development

## Common Issues and Fixes

### Missing Models Module

**Issue**: `ModuleNotFoundError: No module named 'models'`

**Fix**: 
1. Add `COPY models.py .` to the Dockerfile
2. Add `- ./models.py:/usr/src/app/models.py` to the volumes in docker-compose.yml

### Circular Imports

**Issue**: `ImportError: cannot import name 'admin_auth_required' from partially initialized module 'routes' (most likely due to a circular import)`

This error occurs when two modules try to import each other, creating a circular dependency that Python cannot resolve.

**Fix**:
1. Move shared decorators and utility functions to separate modules that both can import
2. Rearrange imports to prevent circular dependencies (e.g., move imports inside functions where possible)
3. Create independent modules that don't rely on each other directly

In this project, the circular import was fixed by:
1. Importing `admin_auth_required` directly from `auth.py` in all modules (`enhanced_sld_routes.py`, `raster_routes.py`, `szeb_raster_routes.py`)
2. Creating a separate `handle_error` decorator in each module instead of importing it from `routes.py`
3. Moving route imports to the `setup_routes` function in `routes.py`
4. Removing direct imports from API modules at the bottom of `routes.py`

### Database Connection Issues

**Issue**: `sqlalchemy.exc.OperationalError: connection to server at "postgis" failed: Connection refused`

This typically occurs due to a race condition where the Flask application starts trying to connect to the database before the PostgreSQL server is fully initialized and ready to accept connections.

**Fix**:
Implemented a retry mechanism that attempts to connect to the database multiple times with increasing delays before proceeding:

1. Added a `wait_for_db()` function that attempts to establish a database connection with retries
2. Called this function before performing any database operations in the `create_app()` function
3. Added proper error handling around database operations

If you encounter other database connection errors, check:
1. The PostgreSQL connection string in app.py
2. Network connectivity between the app container and the database container
3. Database credentials in the environment variables
4. PostgreSQL server logs for any startup issues

## Security Recommendations

1. Change the default admin password after first login
2. Use strong, unique passwords for all accounts
3. Consider enabling HTTPS in production environments
4. Regularly update dependencies to address security vulnerabilities
5. Implement rate limiting for login attempts to prevent brute force attacks

## Docker Environment Best Practices

### Database Connectivity

1. **Connection Retry Logic**: Always implement retry logic when connecting to databases in containerized environments due to startup timing issues.

2. **Health Checks**: Consider adding health checks to your Docker Compose configuration to ensure services only start when their dependencies are truly ready.

3. **Connection Pooling**: Configure connection pooling appropriately to handle connection issues gracefully.

4. **Graceful Degradation**: Design the application to function (with reduced capabilities) even when the database is temporarily unavailable.

5. **Logging**: Implement comprehensive logging around database operations to help diagnose issues.

### Container Dependencies

1. **depends_on**: While useful, remember that `depends_on` only waits for containers to start, not for services inside them to be ready.

2. **wait-for-it Scripts**: For more complex environments, consider using wait-for-it or dockerize scripts in entrypoint commands.

3. **Docker Compose Healthcheck**: Use Docker Compose's healthcheck feature to better manage service dependencies.

## Future Enhancements

Potential improvements to the authentication system:

1. Two-factor authentication
2. Password complexity requirements
3. Account lockout after failed login attempts
4. User activity logging
5. OAuth integration for third-party authentication
6. Automated database migration scripts for version upgrades
