# Cone Scouting Tool Admin Interface

## Overview

The Admin Interface provides a user-friendly way to manage species in the Cone Scouting Tool application without requiring code changes. This document explains how to use the admin interface and its security considerations.

## Access

The admin interface is available at:

```
http://[your-server]/admin
```

### Authentication

The admin interface is protected by authentication. You need to provide:

- **Username**: admin
- **Default Password**: conescout

**Important**: For security reasons, change the default password in production environments.

## Features

### Species Management

The admin interface allows you to:

1. **View All Species**: See a list of all configured species, both enabled and disabled
2. **Add New Species**: Create new species with all required properties
3. **Edit Species**: Modify an existing species configuration
4. **Toggle Species**: Enable or disable a species without deleting it

### Adding a New Species

To add a new species:

1. Click the "Add New Species" button
2. Fill out the form with the following information:
   - **Species ID**: A unique identifier (no spaces, lowercase)
   - **Display Name**: The common name (shown in the dropdown)
   - **Scientific Name**: The binomial name
   - **Vector Layer**: The GeoServer vector layer name
   - **Raster Layer**: The GeoServer raster layer name
   - **Background Image**: Path to the species background image
   - **Status**: Enabled or Disabled
3. Define attribute sections and their items
4. Click "Save Species"

### Editing a Species

To edit an existing species:

1. Find the species card in the list
2. Click the "Edit" button
3. Modify the properties as needed
4. Click "Update Species"

### Toggling a Species

To quickly enable or disable a species:

1. Find the species card in the list
2. Click the "Enable" or "Disable" button depending on the current status

## Attribute Structure

Each species has a structured set of attributes organized into sections:

```
attributes: {
  basics: {
    label: "Basic Information",
    items: {
      Range: "Range",
      TotalSZEBRanking: "Total SZEB Rank",
      ...
    }
  },
  risks: {
    label: "Risk Factors",
    items: {
      ClimateExposureRiskCat: "Climate Exposure Risk",
      ...
    }
  },
  ...
}
```

- **Section Key**: Used internally (e.g., "basics")
- **Section Label**: Displayed in the UI (e.g., "Basic Information")
- **Items**: Key-value pairs of attributes
  - **Key**: Used in GeoServer styles (e.g., "TotalSZEBRanking")
  - **Value**: Displayed in the UI (e.g., "Total SZEB Rank")

## GeoServer Layer Requirements

Before adding a species, ensure the GeoServer layers are set up correctly:

1. **Vector Layer**: A polygon layer with SZEB attributes
2. **Raster Layer**: A rasterized version of the vector data
3. **Styles**: Created for the different attributes (Range, TotalSZEBRanking, etc.)

For detailed information on setting up GeoServer layers, see the [Adding Species](adding_species.md) guide.

## Security Considerations

The admin interface implements several security measures:

1. **Authentication**: Username and password protection
2. **Session Management**: Secure session handling
3. **Password Hashing**: Passwords are stored using BCrypt hashing (industry-standard)
4. **File Locking**: Prevents race conditions during configuration updates
5. **Timing Attack Prevention**: Consistent response timing for failed login attempts

## Changing the Admin Password

To change the admin password:

1. Log in to the admin interface
2. Navigate to `http://[your-server]/admin/change_password`
3. Enter your current password
4. Enter and confirm your new password (minimum 8 characters)
5. Click "Change Password"

The system will automatically update the password hash and redirect you to the login page.

## Password Requirements

For security purposes, passwords should:
- Be at least 8 characters long
- Contain a mix of letters, numbers, and special characters
- Not be easily guessable or commonly used passwords
- Be unique to this application

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Verify you're using the correct username and password
   - Check that cookies are enabled in your browser
   - Clear your browser cache and cookies if you continue to experience issues

2. **Species Not Showing in the Application**:
   - Verify the species is marked as "Enabled"
   - Check that the GeoServer layers exist and are correctly named
   - Verify layer naming conventions match the [Adding Species](adding_species.md) guide

3. **Background Image Not Displaying**:
   - Ensure the image path is correct
   - Verify the image file exists in the specified location
   - Check that the file permissions allow web server access

4. **Error Saving Configuration**:
   - Check the application logs for specific error messages
   - Verify file permissions on the configuration file
   - Ensure the web server has write permissions to the configuration directory

5. **Password Change Failures**:
   - Ensure you're entering the correct current password
   - Make sure your new password meets the minimum requirements
   - Verify that the application has write permissions to the auth.py file

### Getting Help

If you encounter issues not covered here, please contact the application administrator or refer to the following resources:

- Project documentation in the `docs/` directory
- Application logs for error details
