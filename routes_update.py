# Add this at the end of the setup_routes function in routes.py

    # Register enhanced SLD routes
    from api.enhanced_sld_routes import register_routes as register_enhanced_sld_routes
    register_enhanced_sld_routes(app)
    
    # Register SZEB raster routes
    from api.szeb_raster_routes import register_routes as register_szeb_raster_routes
    register_szeb_raster_routes(app)
