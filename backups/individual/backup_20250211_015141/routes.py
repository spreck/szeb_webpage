import os
import requests
from flask import render_template, current_app, send_from_directory, request, jsonify
from prometheus_client import generate_latest

def index():
    # Render the homepage (from templates/index.html)
    geoserver_url = current_app.config.get("GEOSERVER_URL", "")
    return render_template("index.html", geoserver_url=geoserver_url)
        

def favicon():
    return send_from_directory(
        os.path.join(current_app.root_path, 'static', 'icons'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )

def manifest():
    return send_from_directory(
        os.path.join(current_app.root_path, 'static', 'icons'),
        'site.webmanifest'
    )

def icons(filename):
    if filename in [
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
        'apple-touch-icon.png',
        'favicon-16x16.png',
        'favicon-32x32.png'
    ]:
        return send_from_directory(
            os.path.join(current_app.root_path, 'static', 'icons'),
            filename
        )
    else:
        return "Not found", 404

def track_species():
    data = request.get_json()
    species = data.get("species")
    # In a full app, update metrics here.
    return "Species tracked", 200

def track_attribute():
    data = request.get_json()
    attribute = data.get("attribute")
    return "Attribute tracked", 200

def track_species_duration():
    data = request.get_json()
    species = data.get("species")
    duration = float(data.get("duration", 0))
    return "Species duration tracked", 200

def track_attribute_duration():
    data = request.get_json()
    attribute = data.get("attribute")
    duration = float(data.get("duration", 0))
    return "Attribute duration tracked", 200

def get_client_ip():
    if "X-Forwarded-For" in request.headers:
        return request.headers["X-Forwarded-For"].split(",")[0].strip()
    return request.remote_addr

def get_location(ip):
    try:
        response = requests.get(f'http://ip-api.com/json/{ip}', timeout=5)
        data = response.json()
        if data.get('status') == 'success':
            return [data.get('lat', 0.0), data.get('lon', 0.0)]
    except Exception as e:
        print("Error fetching geolocation:", e)
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
    app.add_url_rule('/test', 'test', test)  # Add the test route