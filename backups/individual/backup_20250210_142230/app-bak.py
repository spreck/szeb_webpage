from flask import Flask
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s %(levelname)s: %(message)s')

app = Flask(__name__)

# Set environment and configurations
app.config["ENV"] = "production"
app.config["DEBUG"] = False
app.config["GEOSERVER_URL"] = "http://evacportal.duckdns.org/geoserver"


# Import routes after the app is created
import routes

routes.setup_routes(app)

if __name__ == '__main__':
    app.run(debug=app.config["DEBUG"])
