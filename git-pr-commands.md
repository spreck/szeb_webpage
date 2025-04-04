# Git Commands for Creating HTTPS and OAuth PR

Run these commands to create a PR with your HTTPS and OAuth implementation.

## Step 1: Make sure your .gitignore is updated

First, verify your `.gitignore` file includes these entries:
```
# Sensitive credentials
.env
.env.local
.env.*.local
client_secret*.json

# Certificate files
certbot/conf/
certbot/www/

# Archive directory with old files
archive/
```

## Step 2: Create a new branch and add your changes

```bash
# Make sure you're on the main branch first
git checkout main

# Pull the latest changes
git pull

# Create and switch to a new branch
git checkout -b feature/https-oauth

# Add all modified files (excluding those in .gitignore)
git add .

# Commit your changes
git commit -m "Add HTTPS and OAuth support with simplified Nginx configuration"
```

## Step 3: Push the branch and create a PR

```bash
# Push your branch to the remote repository
git push -u origin feature/https-oauth
```

Now go to your GitHub repository page and you should see a prompt to create a pull request from the feature/https-oauth branch.

## Pull Request Description Template

Use this template for your PR description:

```markdown
# HTTPS and OAuth2 Implementation

This PR adds HTTPS support using Let's Encrypt certificates and implements OAuth2 login with Google. The implementation follows a simplified approach focusing on maintainability.

## Changes Made

- Added secure HTTPS support with Let's Encrypt certificates
- Implemented Google OAuth2 authentication using Flask-Dance
- Created simplified Nginx configuration for better maintainability
- Added environment-based credential management
- Updated documentation with implementation details and troubleshooting
- Added proper GeoServer integration through HTTPS

## Security Improvements

- Moved credentials to environment variables
- Added .gitignore rules to prevent credential exposure
- Enforced HTTPS for all traffic
- Limited OAuth scopes to email and profile only

## Testing Done

- Verified HTTPS works correctly with secure certificate
- Tested GeoServer access through HTTPS proxy
- Confirmed the main application interface displays properly
- Verified database schema includes OAuth support

## Notes

The implementation uses a deliberately simplified Nginx configuration for better maintainability and easier troubleshooting.
```
