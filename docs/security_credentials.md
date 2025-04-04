# Managing Security Credentials

This document explains how to securely handle credentials and sensitive information for the Cone Scout application.

## Never Commit Credentials to Git

The following sensitive files and information should **NEVER** be committed to the repository:

1. **`.env` file with actual credentials**
2. **Google OAuth client secret files**
3. **SSL certificates and private keys**
4. **Database passwords**
5. **Admin passwords**

## Setting Up Local Credentials

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and replace all placeholder values with real credentials:
   ```
   SECRET_KEY=your_actual_secret_key
   ADMIN_PASSWORD=your_actual_admin_password
   ...
   ```

## Google OAuth Setup

To set up Google OAuth:

1. Go to the [Google Developer Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Set up OAuth consent screen
4. Create OAuth 2.0 credentials (Web application type)
5. Add the following authorized redirect URI:
   ```
   https://yourdomain.com/login/callback/google
   ```
6. Download the client secret JSON file
7. Rename it to `client_secret_[client-id].apps.googleusercontent.com.json`
8. Place it in the project root (it will be ignored by git)

## Securing Production Credentials

For production deployment, use these best practices:

1. **Use environment variables** instead of `.env` files when possible
2. **Generate strong random keys** for all secrets
3. **Don't reuse passwords** across different environments
4. **Rotate credentials** periodically, especially after team member changes
5. **Store production secrets** in a secure vault or credentials manager

## Handling Credentials on Docker

When using Docker:

1. Use Docker secrets or environment variables:
   ```yaml
   environment:
     - SECRET_KEY=${SECRET_KEY}
     - ADMIN_PASSWORD=${ADMIN_PASSWORD}
   ```

2. Or use a `.env` file with docker-compose:
   ```yaml
   env_file:
     - .env.production
   ```

## Emergency Credential Rotation

If credentials are accidentally exposed:

1. Immediately generate new credentials
2. Update all services with the new credentials
3. Revoke the exposed credentials where possible
4. Review access logs for suspicious activity
5. Document the incident and response
