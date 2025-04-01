FROM postgis/postgis:17-3.5

# Install GDAL runtime and development libraries
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for GDAL and PostgreSQL
ENV GDAL_DATA=/usr/share/gdal
ENV PROJ_LIB=/usr/share/proj
ENV LD_LIBRARY_PATH=/usr/lib:/usr/lib/postgresql:/usr/lib/x86_64-linux-gnu:/usr/local/lib

# Ensure PostGIS raster is preloaded in PostgreSQL
RUN echo "shared_preload_libraries = 'postgis_raster'" >> /var/lib/postgresql/data/postgresql.conf
