# IMPORTANT: ALWAYS READ THIS FILE AND UPDATE BEFORE AND AFTER EVERY TASK, DO NOT COMPLETELY REWRITE THIS FILE, ONLY EDIT AND ADD TO THE BOTTOM OF THE FILE.
# THIS FILE WILL BE USED TO TRACK OUR PROGRESS AND MOVE TO NEW CHATS WHEN REQUIRED

# SZEB Website Implementation Roadmap

## 2023-04-01 (Initial Roadmap)

### Completed Features
- Basic authentication system with Flask-Login, SQLAlchemy, and bcrypt
- Admin interface for managing species
- Integration with GeoServer REST API for layer management
- Layer attribute detection from GeoServer layers
- Style generation and management

### In Progress
- Raster layer upload functionality with RAT (Raster Attribute Table) support
  - Created UI for uploading raster data
  - Implemented backend endpoints for processing uploads
  - Added RAT detection and style generation
  - Connected to GeoServer's RAT-specific REST API endpoints

### Upcoming Tasks
- Testing the raster upload functionality with actual RAT data
- Integrating the SZEB_Website_claude/nginx_evac_app directory into the spreck/szeb_webpage GitHub repository
- Adding documentation for the new raster upload feature
- Implementing automated tests for the new functionality
- Adding support for vector data upload (Shapefiles, GeoJSON)
- Enhancing the UI for better user experience
- Adding progress indicators and better error handling

### Future Enhancements
- Batch processing of multiple rasters
- Integration with external data sources
- Advanced styling options
- User permission management
- Activity logging
- Export functionality for processed data

## 2023-04-02 (Updated Roadmap)

### Completed Features (Updated)
- Raster layer upload functionality with RAT (Raster Attribute Table) support
  - UI for uploading raster data
  - Backend endpoints for processing uploads
  - RAT detection and style generation
  - Connection to GeoServer's RAT-specific REST API endpoints
  - File validation and automatic property detection
  - Style generation based on RAT classification attributes

### In Progress
- Testing the raster upload functionality with real-world RAT data
- Addressing edge cases in RAT parsing and style generation
- Improving error handling and user feedback for upload failures

### Upcoming Tasks (Updated)
1. Complete RAT handling improvements:
   - Add support for multi-band rasters with multiple RATs
   - Implement additional RAT validation and cleanup
   - Create more sophisticated style generation options

2. Vector data upload implementation:
   - Design UI for vector data upload (Shapefiles, GeoJSON, KML)
   - Implement backend endpoints for vector processing
   - Add attribute detection and style generation for vector data
   - Support for coordinate system transformation

3. Integration and Documentation:
   - Create comprehensive documentation for the raster upload feature
   - Prepare for integration into the main GitHub repository
   - Add user guides and admin documentation
   - Create example workflows for common use cases

4. Testing and Quality Assurance:
   - Implement automated tests for the RAT functionality
   - Perform cross-browser testing
   - Test with large datasets to ensure performance
   - Security review of the upload functionality

5. UI/UX Improvements:
   - Enhanced progress indicators during upload
   - Better visualization of RAT attributes
   - Style preview functionality
   - More intuitive navigation between admin features

### Future Enhancements (Updated)
- Batch processing of multiple rasters with queue management
- Integration with external data sources (WMS, WFS)
- Advanced styling options with custom SLD editor
- User role-based permission management
- Detailed activity logging for auditing purposes
- Export functionality for processed data in multiple formats
- Automation API for programmatic data uploads
- Performance optimization for large raster datasets
