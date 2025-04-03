import os
import requests
import uuid
import zipfile
import tempfile
import json
import geopandas as gpd
import psycopg2
import subprocess  # For running ogr2ogr
import logging
import traceback
from functools import wraps
from flask import render_template, current_app, send_from_directory, request, jsonify, session, Response, abort, redirect, url_for, flash
from prometheus_client import generate_latest, Counter
from api.species_routes import register_routes as register_species_routes
from routes_auth import setup_auth_routes, admin_auth_required
from auth import ADMIN_USERNAME, ADMIN_PASSWORD_HASH, verify_password

# Setup logger
logger = logging.getLogger(__name__)

# Error counter for monitoring
error_counter = Counter('app_errors_total', 'Total errors by type', ['error_type'])

# Generic error handler for API endpoints
def handle_error(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            # Log the error with traceback
            error_type = type(e).__name__
            logger.error(f"Error in {func.__name__}: {str(e)}\n{traceback.format_exc()}")
            
            # Increment error counter
            error_counter.labels(error_type=error_type).inc()
            
            # Return error response for API endpoints
            if request.path.startswith(('/api/', '/upload_', '/get_', '/download_', '/track_', '/generate_')):
                status_code = 500
                if hasattr(e, 'status_code'):
                    status_code = e.status_code
                return jsonify({
                    'status': 'error',
                    'message': str(e),
                    'error_type': error_type
                }), status_code
            
            # Re-raise for non-API routes (will be caught by Flask's error handlers)
            raise
    return wrapper

# Allowed file extensions for ROI uploads.
ALLOWED_EXTENSIONS = {'zip', 'geojson', 'kml', 'kmz', 'gpkg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Global cache for geolocation lookups.
location_cache = {}

def index():
    geoserver_url = current_app.config.get("GEOSERVER_URL", "")
    geoserver_workspace = current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample")
    return render_template("index.html", geoserver_url=geoserver_url, geoserver_workspace=geoserver_workspace)

def about_content():
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('about.html')
    else:
        return abort(403)

def map_content():
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('map.html')
    else:
        return abort(403)

def favicon():
    return send_from_directory(
        os.path.join(current_app.root_path, 'static', 'icons'),
        'favicon.ico', mimetype='image/vnd.microsoft.icon'
    )

def manifest():
    return send_from_directory(
        os.path.join(current_app.root_path, 'static', 'icons'),
        'site.webmanifest'
    )

def icons(filename):
    if filename in ['android-chrome-192x192.png','android-chrome-512x512.png',
                    'apple-touch-icon.png','favicon-16x16.png','favicon-32x32.png']:
        return send_from_directory(os.path.join(current_app.root_path, 'static', 'icons'), filename)
    else:
        return "Not found", 404

def track_species():
    data = request.get_json()
    return "Species tracked", 200

def track_attribute():
    data = request.get_json()
    return "Attribute tracked", 200

def track_species_duration():
    data = request.get_json()
    return "Species duration tracked", 200

def track_attribute_duration():
    data = request.get_json()
    return "Attribute duration tracked", 200

def get_client_ip():
    return request.headers.get("X-Forwarded-For", request.remote_addr).split(",")[0].strip()

def get_location(ip):
    if ip in location_cache:
        return location_cache[ip]
    try:
        response = requests.get(f'http://ip-api.com/json/{ip}', timeout=5)
        data = response.json()
        if data.get('status') == 'success':
            loc = [data.get('lat', 0.0), data.get('lon', 0.0)]
            location_cache[ip] = loc
            return loc
    except Exception as e:
        print("Error fetching geolocation:", e)
    location_cache[ip] = [0.0, 0.0]
    return [0.0, 0.0]

def track_location():
    ip = get_client_ip()
    location = get_location(ip)
    return jsonify({"latitude": location[0], "longitude": location[1]})

def metrics():
    return generate_latest(), 200, {'Content-Type': 'text/plain'}

def test():
    geoserver_url = current_app.config.get("GEOSERVER_URL", "")
    geoserver_workspace = current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample")
    return render_template('test.html', geoserver_url=geoserver_url, geoserver_workspace=geoserver_workspace)

# -------------------------------
# ROI Database Functions (unchanged)
# -------------------------------
def create_roi_table_if_not_exists(conn):
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS roi (
            id serial PRIMARY KEY,
            geom geometry(Polygon, 4326)
        );
    """)
    conn.commit()
    cur.close()

@handle_error
def upload_roi():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file part in the request."}), 400
    file = request.files['file']
    if file.filename == "":
        return jsonify({"status": "error", "message": "No file selected."}), 400
    if not allowed_file(file.filename):
        return jsonify({"status": "error", "message": "File type not allowed."}), 400
    file.seek(0, os.SEEK_END)
    if file.tell() > 10 * 1024 * 1024:
        return jsonify({"status": "error", "message": "File too large. Maximum allowed size is 10MB."}), 400
    file.seek(0)
    try:
        filename = file.filename.lower()
        if filename.endswith('.zip'):
            with tempfile.TemporaryDirectory() as tmpdirname:
                zip_path = os.path.join(tmpdirname, "upload.zip")
                file.save(zip_path)
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(tmpdirname)
                shp_files = [os.path.join(tmpdirname, f) for f in os.listdir(tmpdirname) if f.endswith('.shp')]
                if not shp_files:
                    return jsonify({"status": "error", "message": "No shapefile found in the zip archive."}), 400
                gdf = gpd.read_file(shp_files[0])
        elif filename.endswith('.kmz'):
            with tempfile.TemporaryDirectory() as tmpdirname:
                kmz_path = os.path.join(tmpdirname, "upload.kmz")
                file.save(kmz_path)
                with zipfile.ZipFile(kmz_path, 'r') as zip_ref:
                    zip_ref.extractall(tmpdirname)
                kml_files = [os.path.join(tmpdirname, f) for f in os.listdir(tmpdirname) if f.endswith('.kml')]
                if not kml_files:
                    return jsonify({"status": "error", "message": "No KML file found in the KMZ archive."}), 400
                gdf = gpd.read_file(kml_files[0])
        elif filename.endswith('.gpkg'):
            with tempfile.NamedTemporaryFile(suffix=".gpkg", delete=False) as tmpfile:
                file.save(tmpfile.name)
                gdf = gpd.read_file(tmpfile.name)
            os.remove(tmpfile.name)
        else:
            gdf = gpd.read_file(file)
        
        if gdf.crs is None:
            gdf.set_crs(epsg=4326, inplace=True)
        elif gdf.crs.to_epsg() != 4326:
            gdf = gdf.to_crs(epsg=4326)
        
        geom = gdf.unary_union
        conn = psycopg2.connect(host="postgis", database="roi_db", user="geoserver", password="23vmoWpostgis", port="5432")
        create_roi_table_if_not_exists(conn)
        cur = conn.cursor()
        cur.execute("DELETE FROM roi;")
        geom_json = json.dumps(geom.__geo_interface__)
        cur.execute("INSERT INTO roi (geom) VALUES (ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326));", (geom_json,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "ROI uploaded."})
    except Exception as e:
        print("ROI upload error:", e)
        return jsonify({"status": "error", "message": "Failed to process ROI file."}), 500

@handle_error
def get_roi():
    try:
        conn = psycopg2.connect(host="postgis", database="roi_db", user="geoserver", password="23vmoWpostgis", port="5432")
        cur = conn.cursor()
        cur.execute("SELECT ST_AsGeoJSON(ST_Collect(geom)) FROM roi;")
        result = cur.fetchone()
        cur.close()
        conn.close()
        if result and result[0]:
            return jsonify({"status": "success", "geojson": result[0]})
        else:
            return jsonify({"status": "error", "message": "No ROI found."}), 404
    except Exception as e:
        print("Error retrieving ROI:", e)
        return jsonify({"status": "error", "message": "Failed to retrieve ROI."}), 500

@handle_error
def has_roi():
    try:
        conn = psycopg2.connect(host="postgis", database="roi_db", user="geoserver", password="23vmoWpostgis", port="5432")
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM roi;")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return jsonify({"has_roi": count > 0})
    except Exception as e:
        print("has_roi error:", e)
        return jsonify({"has_roi": False})

def get_roi_geometry():
    try:
        conn = psycopg2.connect(host="postgis", database="roi_db", user="geoserver", password="23vmoWpostgis", port="5432")
        cur = conn.cursor()
        cur.execute("SELECT ST_AsGeoJSON(ST_Collect(geom)) FROM roi;")
        result = cur.fetchone()
        cur.close()
        conn.close()
        if result and result[0]:
            return result[0]
        else:
            return None
    except Exception as e:
        print("Error retrieving ROI geometry:", e)
        return None

@handle_error
def download_roi_intersection():
    vector_table = request.args.get('vector')
    if not vector_table:
        return jsonify({"status": "error", "message": "Vector table not specified."}), 400

    roi_geojson = get_roi_geometry()
    if not roi_geojson:
        return jsonify({"status": "error", "message": "No ROI available."}), 404

    try:
        conn = psycopg2.connect(host="postgis", database="geoserver_db", user="geoserver", password="23vmoWpostgis", port="5432")
        cur = conn.cursor()
        cur.execute("""
            SELECT schemaname, tablename 
            FROM pg_catalog.pg_tables 
            WHERE tablename = %s
            LIMIT 1;
        """, (vector_table,))
        table_info = cur.fetchone()
        if not table_info:
            return jsonify({"status": "error", "message": f"Vector table '{vector_table}' does not exist."}), 400

        schema_name, table_name = table_info
        full_table_name = f'"{schema_name}"."{table_name}"'
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s AND column_name = 'geom';
        """, (vector_table,))
        
        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Geometry column 'geom' not found in table."}), 400

        query = f"""
            SELECT row_to_json(fc)
            FROM (
                SELECT 'FeatureCollection' AS type, array_to_json(array_agg(f)) AS features
                FROM (
                    SELECT 'Feature' AS type,
                           ST_AsGeoJSON(v.geom)::json AS geometry,
                           to_jsonb(v) - 'geom' AS properties
                    FROM {full_table_name} v
                    WHERE ST_Intersects(v.geom, ST_GeomFromGeoJSON(%s))
                ) AS f
            ) AS fc;
        """
        cur.execute(query, (roi_geojson,))
        result = cur.fetchone()
        cur.close()
        conn.close()

        if result and result[0]:
            response = Response(json.dumps(result[0]), mimetype="application/json")
            response.headers["Content-Disposition"] = "attachment; filename=roi_intersection.geojson"
            return response
        else:
            return jsonify({"status": "error", "message": "No intersection data found."}), 404

    except Exception as e:
        print("Intersection download error:", e)
        return jsonify({"status": "error", "message": "Failed to generate intersection data: " + str(e)}), 500

@handle_error
def download_raster_intersection():
    raster_table = request.args.get('raster')
    if not raster_table:
        return jsonify({"status": "error", "message": "Raster table not specified."}), 400

    roi_geojson = get_roi_geometry()
    if not roi_geojson:
        return jsonify({"status": "error", "message": "No ROI available."}), 404

    try:
        conn = psycopg2.connect(
            host="postgis",
            database="geoserver_db",
            user="geoserver",
            password="23vmoWpostgis",
            port="5432"
        )
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM information_schema.tables WHERE table_name = %s;", (raster_table,))
        if not cur.fetchone():
            return jsonify({"status": "error", "message": f"Raster table '{raster_table}' not found."}), 400

        query = f"""
            SELECT ST_AsTIFF(ST_Clip(rast, ST_GeomFromGeoJSON(%s), true))
            FROM {raster_table}
            LIMIT 1;
        """
        cur.execute(query, (roi_geojson,))
        result = cur.fetchone()
        cur.close()
        conn.close()

        if result and result[0]:
            response = Response(result[0], mimetype="image/tiff")
            response.headers["Content-Disposition"] = f"attachment; filename={raster_table}_intersection.tif"
            return response
        else:
            return jsonify({"status": "error", "message": "No raster intersection found."}), 404

    except Exception as e:
        print("Raster intersection download error:", e)
        return jsonify({"status": "error", "message": "Failed to generate raster intersection: " + str(e)}), 500

@handle_error
def download_map_view():
    vector_table = request.args.get("vector")
    bbox = request.args.get("bbox")
    if not vector_table or not bbox:
        return jsonify({"status": "error", "message": "Missing parameters."}), 400

    try:
        minx, miny, maxx, maxy = map(float, bbox.split(","))
        conn = psycopg2.connect(
            host="postgis", database="geoserver_db",
            user="geoserver", password="23vmoWpostgis", port="5432"
        )
        cur = conn.cursor()
        cur.execute("""
            SELECT schemaname, tablename 
            FROM pg_catalog.pg_tables 
            WHERE tablename = %s
            LIMIT 1;
        """, (vector_table,))
        table_info = cur.fetchone()
        if not table_info:
            return jsonify({"status": "error", "message": f"Vector table '{vector_table}' does not exist."}), 400

        schema_name, table_name = table_info
        full_table_name = f'"{schema_name}"."{table_name}"'
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s AND column_name = 'geom';
        """, (vector_table,))
        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Geometry column 'geom' not found in table."}), 400

        query = f"""
            SELECT row_to_json(fc)
            FROM (
                SELECT 'FeatureCollection' AS type, array_to_json(array_agg(f)) AS features
                FROM (
                    SELECT 'Feature' AS type,
                           ST_AsGeoJSON(v.geom)::json AS geometry,
                           to_jsonb(v) - 'geom' AS properties
                    FROM {full_table_name} v
                    WHERE ST_Intersects(v.geom, ST_MakeEnvelope(%s, %s, %s, %s, 4326))
                ) AS f
            ) AS fc;
        """
        cur.execute(query, (minx, miny, maxx, maxy))
        result = cur.fetchone()
        cur.close()
        conn.close()

        if result and result[0]:
            response = Response(json.dumps(result[0]), mimetype="application/json")
            response.headers["Content-Disposition"] = "attachment; filename=map_view.geojson"
            return response
        else:
            return jsonify({"status": "error", "message": "No data found in current view."}), 404

    except Exception as e:
        print("Map view download error:", e)
        return jsonify({"status": "error", "message": f"Failed to generate map view data: {str(e)}"}), 500

# -------------------------------
# New Functions for FeatureServer Import / Add Layer
# -------------------------------

@handle_error
def import_featureserver():
    """
    Endpoint to import an ArcGIS FeatureServer into PostGIS and publish it in GeoServer.
    Expects JSON with:
      - feature_server_url
      - postgis_user
      - postgis_password
      - postgis_db
      - postgis_host
      - geoserver_workspace
      - layer_name
      - geoserver_url
    """
    try:
        data = request.get_json()
        feature_server_url = data['feature_server_url']
        postgis_user = data['postgis_user']
        postgis_password = data['postgis_password']
        postgis_db = data['postgis_db']
        postgis_host = data['postgis_host']
        geoserver_workspace = data['geoserver_workspace']
        layer_name = data['layer_name']
        geoserver_url = data['geoserver_url']

        # Step 1: Import FeatureServer data into PostGIS using ogr2ogr.
        ogr_command = (
            f'ogr2ogr -f "PostgreSQL" '
            f'PG:"dbname={postgis_db} user={postgis_user} password={postgis_password} host={postgis_host}" '
            f'"{feature_server_url}&outFields=*&f=geojson" '
            f'-nln {layer_name} -overwrite -progress'
        )
        subprocess.run(ogr_command, shell=True, check=True)

        # Step 2: Publish the new layer to GeoServer via REST API.
        geoserver_user = "admin"
        geoserver_pass = "23vmoWgeoserver"
        geoserver_publish_url = f"{geoserver_url}/rest/workspaces/{geoserver_workspace}/datastores/{layer_name}/featuretypes"
        publish_payload = {
            "featureType": {
                "name": layer_name,
                "nativeName": layer_name,
                "srs": "EPSG:4326"
            }
        }
        headers = {"Content-Type": "application/json"}
        response = requests.post(geoserver_publish_url, json=publish_payload, auth=(geoserver_user, geoserver_pass), headers=headers)
        if response.status_code in [200, 201]:
            return jsonify({"success": True, "message": "Layer successfully imported into PostGIS and published in GeoServer!"})
        else:
            return jsonify({"success": False, "message": f"Failed to publish to GeoServer: {response.text}"}), 500

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# Admin page handler - auth routes are defined in routes_auth.py

@admin_auth_required
def admin_page():
    """
    Render the admin page for managing species
    """
    geoserver_url = current_app.config.get("GEOSERVER_URL", "")
    geoserver_workspace = current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample")
    return render_template('admin.html', geoserver_url=geoserver_url, geoserver_workspace=geoserver_workspace)

def add_layer_page():
    """
    Render the separate page for adding a new layer.
    """
    geoserver_url = current_app.config.get("GEOSERVER_URL", "")
    return render_template("addlayer.html", geoserver_url=geoserver_url)

@admin_auth_required
def upload_raster_page():
    """
    Render the page for uploading raster data with RAT support.
    """
    geoserver_url = current_app.config.get("GEOSERVER_URL", "")
    geoserver_workspace = current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample")
    return render_template("upload_raster.html", geoserver_url=geoserver_url, geoserver_workspace=geoserver_workspace)

@admin_auth_required
def upload_szeb_page():
    """
    Render the page for uploading SZEB species data.
    """
    geoserver_url = current_app.config.get("GEOSERVER_URL", "")
    geoserver_workspace = current_app.config.get("GEOSERVER_WORKSPACE", "SZEB_sample")
    return render_template("upload_szeb.html", geoserver_url=geoserver_url, geoserver_workspace=geoserver_workspace)


# -------------------------------
# Visitor Tracking & Other Endpoints (unchanged)
# -------------------------------
def create_visitor_tables_if_not_exist(conn):
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(50) NOT NULL,
        user_agent TEXT,
        latitude FLOAT,
        longitude FLOAT,
        country VARCHAR(100),
        region VARCHAR(100),
        city VARCHAR(100),
        first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        visitor_id INTEGER REFERENCES visitors(id),
        endpoint VARCHAR(200) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_id VARCHAR(100)
    );
    """)
    conn.commit()
    cur.close()

def record_visitor(request_obj):
    try:
        ip = get_client_ip()
        user_agent = request_obj.headers.get('User-Agent', 'Unknown')
        location = get_location(ip)
        latitude, longitude = location[0], location[1]
        country = "Unknown"
        region = "Unknown"
        city = "Unknown"
        session_id = session.get('session_id', None)
        if not session_id:
            session_id = str(uuid.uuid4())
            session['session_id'] = session_id
        conn = psycopg2.connect(host="postgis", database="roi_db", user="geoserver", 
                              password="23vmoWpostgis", port="5432")
        create_visitor_tables_if_not_exist(conn)
        cur = conn.cursor()
        cur.execute("SELECT id FROM visitors WHERE ip = %s;", (ip,))
        visitor = cur.fetchone()
        if visitor:
            visitor_id = visitor[0]
            cur.execute("""
            UPDATE visitors 
            SET last_visit = CURRENT_TIMESTAMP,
                user_agent = %s,
                latitude = %s,
                longitude = %s
            WHERE id = %s;
            """, (user_agent, latitude, longitude, visitor_id))
        else:
            cur.execute("""
            INSERT INTO visitors (ip, user_agent, latitude, longitude, country, region, city)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
            """, (ip, user_agent, latitude, longitude, country, region, city))
            visitor_id = cur.fetchone()[0]
        cur.execute("""
        INSERT INTO visits (visitor_id, endpoint, session_id)
        VALUES (%s, %s, %s);
        """, (visitor_id, request_obj.path, session_id))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error recording visitor: {str(e)}")

def get_visitor_stats():
    try:
        conn = psycopg2.connect(host="postgis", database="roi_db", user="geoserver", 
                              password="23vmoWpostgis", port="5432")
        cur = conn.cursor()
        create_visitor_tables_if_not_exist(conn)
        cur.execute("SELECT COUNT(*) FROM visitors;")
        total_visitors = cur.fetchone()[0]
        cur.execute("""
        SELECT COUNT(DISTINCT visitor_id) 
        FROM visits 
        WHERE DATE(timestamp) = CURRENT_DATE;
        """)
        today_visitors = cur.fetchone()[0]
        cur.execute("""
        SELECT DATE(timestamp), COUNT(DISTINCT visitor_id)
        FROM visits
        WHERE timestamp >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp);
        """)
        daily_visitors = cur.fetchall()
        cur.execute("""
        SELECT endpoint, COUNT(*) as visit_count
        FROM visits
        GROUP BY endpoint
        ORDER BY visit_count DESC
        LIMIT 10;
        """)
        popular_endpoints = cur.fetchall()
        cur.execute("""
        SELECT id, ip, latitude, longitude, country, region, city, 
               first_visit, last_visit
        FROM visitors
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND latitude != 0 AND longitude != 0;
        """)
        located_visitors = []
        for row in cur.fetchall():
            located_visitors.append({
                "id": row[0],
                "ip": row[1],
                "lat": row[2],
                "lng": row[3],
                "country": row[4],
                "region": row[5],
                "city": row[6],
                "first_visit": row[7].strftime("%Y-%m-%d %H:%M:%S") if row[7] else None,
                "last_visit": row[8].strftime("%Y-%m-%d %H:%M:%S") if row[8] else None
            })
        cur.close()
        conn.close()
        days = []
        counts = []
        for day, count in daily_visitors:
            days.append(day.strftime("%Y-%m-%d"))
            counts.append(count)
        return {
            "total_visitors": total_visitors,
            "today_visitors": today_visitors,
            "daily_visitors": {
                "days": days,
                "counts": counts
            },
            "popular_endpoints": popular_endpoints,
            "located_visitors": located_visitors
        }
    except Exception as e:
        print(f"Error getting visitor stats: {str(e)}")
        return {
            "total_visitors": 0,
            "today_visitors": 0,
            "daily_visitors": {
                "days": [],
                "counts": []
            },
            "popular_endpoints": [],
            "located_visitors": []
        }

def location_dashboard():
    client_ip = get_client_ip()
    secret_key = "conescout2024"
    if request.args.get('key') == secret_key:
        pass
    elif (client_ip.startswith('127.') or 
          client_ip.startswith('192.168.') or 
          client_ip.startswith('10.') or
          client_ip.startswith('172.')):
        pass
    elif os.environ.get('DASHBOARD_ACCESS', 'restricted') == 'public':
        pass
    else:
        return abort(403, description="Access denied. This dashboard requires proper authentication.")
    
    stats = get_visitor_stats()
    return render_template('dashboard.html', 
                         locations=stats["located_visitors"],
                         total_visitors=stats["total_visitors"],
                         today_visitors=stats["today_visitors"],
                         daily_visitors=stats["daily_visitors"],
                         popular_endpoints=stats["popular_endpoints"])

@handle_error
def generate_style():
    data = request.get_json()
    workspace = data.get("workspace")
    store = data.get("store")
    coverage = data.get("coverage")
    band = data.get("band")
    classification = data.get("classification")
    styleName = data.get("styleName")
    unique_style_name = f"{styleName}_{uuid.uuid4().hex[:8]}"
    geoserver_url = current_app.config.get("GEOSERVER_URL", "http://conescout.duckdns.org/geoserver")
    rat_url = (f"{geoserver_url}/rest/workspaces/{workspace}/"
               f"coveragestores/{store}/coverages/{coverage}/pam?"
               f"band={band}&classification={classification}&styleName={unique_style_name}")
    geoserver_user = current_app.config.get("GEOSERVER_USER", "admin")
    geoserver_pass = current_app.config.get("GEOSERVER_PASS", "geoserver")
    headers = {"Content-Type": "application/vnd.ogc.sld+xml"}
    sld_content = ""
    response = requests.post(rat_url, headers=headers, data=sld_content, auth=(geoserver_user, geoserver_pass))
    if response.status_code in (201, 303):
        return jsonify({"message": f"Style '{unique_style_name}' created successfully.", "styleName": unique_style_name}), response.status_code
    else:
        return jsonify({"error": "Style creation failed.", "status": response.status_code}), response.status_code

# -------------------------------
# Setup Routes
# -------------------------------
# Simple login test route that bypasses CSRF
def login_test():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and verify_password(password, ADMIN_PASSWORD_HASH):
            session['admin_logged_in'] = True
            session.modified = True
            return jsonify({"success": True, "message": "Login successful"})
        else:
            return jsonify({"success": False, "message": "Invalid credentials"}), 401
    else:
        # Generate a CSRF token manually
        from flask_wtf.csrf import generate_csrf
        csrf_token = generate_csrf()
        
        html = f'''
        <html><body>
        <h1>Login Test</h1>
        <form method="POST">
            <input type="hidden" name="csrf_token" value="{csrf_token}">
            <div>Username: <input type="text" name="username" value="admin"></div>
            <div>Password: <input type="password" name="password" value="conescout"></div>
            <div><input type="submit" value="Login"></div>
        </form>
        </body></html>
        '''
        return Response(html, content_type='text/html')

# Direct login bypass for troubleshooting
def direct_login():
    # No authentication here, just set the session directly
    session['admin_logged_in'] = True
    session.modified = True
    return redirect(url_for('admin_page'))

def setup_routes(app):
    app.add_url_rule('/', 'index', index)
    app.add_url_rule('/about_content', 'about_content', about_content)
    app.add_url_rule('/map_content', 'map_content', map_content)
    app.add_url_rule('/favicon.ico', 'favicon', favicon)
    app.add_url_rule('/site.webmanifest', 'manifest', manifest)
    app.add_url_rule('/icons/<path:filename>', 'icons', icons)
    app.add_url_rule('/track_species', 'track_species', track_species, methods=["POST"])
    app.add_url_rule('/track_attribute', 'track_attribute', track_attribute, methods=["POST"])
    app.add_url_rule('/track_species_duration', 'track_species_duration', track_species_duration, methods=["POST"])
    app.add_url_rule('/track_attribute_duration', 'track_attribute_duration', track_attribute_duration, methods=["POST"])
    app.add_url_rule('/track_location', 'track_location', track_location, methods=["POST"])
    app.add_url_rule('/metrics', 'metrics', metrics)
    app.add_url_rule('/test', 'test', test)
    app.add_url_rule('/upload_roi', 'upload_roi', upload_roi, methods=["POST"])
    app.add_url_rule('/get_roi', 'get_roi', get_roi, methods=["GET"])
    app.add_url_rule('/download_roi_intersection', 'download_roi_intersection', download_roi_intersection, methods=["GET"])
    app.add_url_rule('/download_raster_intersection', 'download_raster_intersection', download_raster_intersection, methods=["GET"])
    app.add_url_rule('/generate_style', 'generate_style', generate_style, methods=["POST"])
    app.add_url_rule('/has_roi', 'has_roi', has_roi, methods=["GET"])
    app.add_url_rule('/download_map_view', 'download_map_view', download_map_view, methods=["GET"])
    app.add_url_rule('/dashboard', 'location_dashboard', location_dashboard)
    # Admin page
    app.add_url_rule('/admin', 'admin_page', admin_page)
    
    # Login test route
    app.add_url_rule('/login_test', 'login_test', login_test, methods=["GET", "POST"])
    
    # Direct login bypass
    app.add_url_rule('/direct_login', 'direct_login', direct_login)
    
    # Register auth routes (login, logout, change_password)
    setup_auth_routes(app)
    
    # Layer management endpoints
    app.add_url_rule('/addlayer', 'addlayer', add_layer_page)
    app.add_url_rule('/upload_raster', 'upload_raster_page', upload_raster_page)
    app.add_url_rule('/upload_szeb', 'upload_szeb_page', upload_szeb_page)
    app.add_url_rule('/import_featureserver', 'import_featureserver', import_featureserver, methods=["POST"])
    
    # SLD Editor endpoints
    app.add_url_rule('/sld_editor', 'sld_editor_page', sld_editor_page)
    app.add_url_rule('/api/styles', 'get_layer_styles', get_layer_styles, methods=["GET"])
    app.add_url_rule('/api/styles/sld', 'get_style_sld', get_style_sld, methods=["GET"])
    app.add_url_rule('/api/styles/create_or_update', 'create_or_update_style', create_or_update_style, methods=["POST"])
    
    # Register API routes
    register_species_routes(app)
    
    # Register Raster API routes
    from api.raster_routes import register_routes as register_raster_routes
    register_raster_routes(app)
    return

# End of routes.py
