# Git Commands for Creating HTTPS and OAuth PR

You can use these manual commands to create a PR for the HTTPS and OAuth implementation.

## 1. Create a new branch

```bash
# Make sure you're on the main branch first
git checkout main

# Create and switch to a new branch
git checkout -b feature/https-oauth-implementation
```

## 2. Stage the changes

```bash
# Add all modified files
git add .

# If you want to be more specific, you can add files individually
git add app_updated_oauth.py
git add migrations/
git add nginx/conf.d/ssl.conf
git add README.md
git add README-HTTPS-OAUTH-SETUP.md
git add setup-https-and-oauth.bat
git add requirements.txt
```

## 3. Commit your changes

```bash
git commit -m "Implement HTTPS and OAuth authentication"

# Optionally, add more details in the commit body
git commit -m "Implement HTTPS and OAuth authentication" -m "- Added Google OAuth2 login support
- Set up HTTPS with Let's Encrypt
- Created migration system with Flask-Migrate
- Added comprehensive setup documentation
- Cleaned up project directory"
```

## 4. Push to GitHub

```bash
# Push your branch to GitHub
git push -u origin feature/https-oauth-implementation
```

## 5. Create a PR on GitHub

Go to your repository on GitHub and you should see a prompt to create a PR from your newly pushed branch. Alternatively, you can go to:

```
https://github.com/YOUR_USERNAME/REPOSITORY_NAME/pull/new/feature/https-oauth-implementation
```

## PR Description Template

Here's a template for your PR description:

```
# HTTPS and OAuth2 Implementation

This PR adds HTTPS support using Let's Encrypt certificates and implements OAuth2 login with Google.

## Changes Made

- Added Flask-Migrate for database schema management
- Created migration scripts for OAuth columns
- Added Google OAuth2 authentication using Flask-Dance
- Configured Nginx for SSL termination
- Added proper SSL configuration
- Created comprehensive setup documentation
- Cleaned up legacy files and documentation

## Testing Done

- Verified HTTPS certificate issuance
- Tested Google OAuth login flow
- Verified database migrations
- Tested automatic HTTP to HTTPS redirection

## Deployment Instructions

Follow the instructions in README-HTTPS-OAUTH-SETUP.md to deploy these changes.
```
