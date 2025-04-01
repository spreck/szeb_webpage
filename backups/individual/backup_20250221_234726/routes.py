import os
import requests
import uuid
import zipfile
import tempfile
import json
import geopandas as gpd
import psycopg2
from flask import render_template, current_app, send_from_directory, request, jsonify, session, Response
from prometheus_client import generate_latest

# Allowed file extensions for ROI uploads.
ALLOWED_EXTENSIONS = {'zip', 'geojson', 'kml', 'kmz', 'gpkg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Global cache for geolocation lookups.
location_cache = {}

def index():
    geoserver_url = current_app.config.get("GEOSERVER_URL", "")
    return render_template("index.html", geoserver_url=geoserver_url)

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
    return render_template('test.html', geoserver_url=geoserver_url)

# -----------------------------------------
# ROI Database Functions (using "roi_db")
# -----------------------------------------

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
        
        # For simplicity, take the first geometry (or merge all features if desired)
        geom = gdf.unary_union

        # Connect to the ROI database.
        conn = psycopg2.connect(host="postgis", database="roi_db", user="geoserver", password="23vmoWpostgis", port="5432")
        create_roi_table_if_not_exists(conn)
        cur = conn.cursor()
        # Clear any existing ROI (if only one is needed)
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
    # Helper to retrieve ROI geometry (as GeoJSON) from the ROI database.
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

# ----------------------------------------
# Intersection Download Endpoints (using ROI geometry)
# ----------------------------------------

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

        # Ensure the table exists and find its schema
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
        full_table_name = f'"{schema_name}"."{table_name}"'  # Properly quote schema and table names

        # Ensure `geom` column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s AND column_name = 'geom';
        """, (vector_table,))
        
        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Geometry column 'geom' not found in table."}), 400

        # Query for intersection
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


def download_raster_intersection():
    # Get raster table name from request
    raster_table = request.args.get('raster')
    if not raster_table:
        return jsonify({"status": "error", "message": "Raster table not specified."}), 400

    # Retrieve ROI geometry from roi_db
    roi_geojson = get_roi_geometry()  # Fetches geometry as GeoJSON
    if not roi_geojson:
        return jsonify({"status": "error", "message": "No ROI available."}), 404

    try:
        # Connect to the raster database (geoserver_db)
        conn = psycopg2.connect(
            host="postgis",
            database="geoserver_db",
            user="geoserver",
            password="23vmoWpostgis",
            port="5432"
        )
        cur = conn.cursor()

        # Make sure raster table exists
        cur.execute("SELECT 1 FROM information_schema.tables WHERE table_name = %s;", (raster_table,))
        if not cur.fetchone():
            return jsonify({"status": "error", "message": f"Raster table '{raster_table}' not found."}), 400

        # Use the GeoJSON ROI to clip the raster
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


def download_map_view():
    vector_table = request.args.get("vector")
    bbox = request.args.get("bbox")  # Bounding box in "minx,miny,maxx,maxy" format

    if not vector_table or not bbox:
        return jsonify({"status": "error", "message": "Missing parameters."}), 400

    try:
        # Parse the bounding box values
        minx, miny, maxx, maxy = map(float, bbox.split(","))

        conn = psycopg2.connect(
            host="postgis", database="geoserver_db",
            user="geoserver", password="23vmoWpostgis", port="5432"
        )
        cur = conn.cursor()

        # Ensure the table exists and find its schema
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
        full_table_name = f'"{schema_name}"."{table_name}"'  # Properly quote schema and table names

        # Ensure `geom` column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s AND column_name = 'geom';
        """, (vector_table,))

        if not cur.fetchone():
            return jsonify({"status": "error", "message": "Geometry column 'geom' not found in table."}), 400

        # Query for intersection with bounding box
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

# --------------------------
# Other Endpoints
# --------------------------

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
    geoserver_user = os.environ.get("GEOSERVER_USER", "admin")
    geoserver_pass = os.environ.get("GEOSERVER_PASS", "geoserver")
    headers = {"Content-Type": "application/vnd.ogc.sld+xml"}
    sld_content = ""
    response = requests.post(rat_url, headers=headers, data=sld_content, auth=(geoserver_user, geoserver_pass))
    if response.status_code in (201, 303):
        return jsonify({"message": f"Style '{unique_style_name}' created successfully.", "styleName": unique_style_name}), response.status_code
    else:
        return jsonify({"error": "Style creation failed.", "status": response.status_code}), response.status_code

# --------------------------
# Setup Routes
# --------------------------
def setup_routes(app):
    app.add_url_rule('/', 'index', index)
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

    return

# End of routes.py
