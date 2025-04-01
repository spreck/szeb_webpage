from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import csv
import re

app = Flask(__name__)
CORS(app)

@app.route('/get_city_data', methods=['GET'])
def get_city_data():
    city_name = request.args.get('city')
    if not city_name:
        return jsonify({'error': 'No city provided'}), 400

    # Sanitize input to prevent command injection
    sanitized_city_name = re.sub(r'[^a-zA-Z0-9\s]', '', city_name)

    db_path = '/app/EvacuationDatabase4.accdb'
    table_name = 'Database'

    try:
        cmd = ['mdb-export', db_path, table_name]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()

        if stderr:
            return jsonify({'error': f'mdb-export error: {stderr.strip()}'}), 500

        reader = csv.DictReader(stdout.strip().split('\n'))
        data = [row for row in reader if row['City'].strip() == sanitized_city_name]

        if not data:
            return jsonify({'error': 'No data found for the specified city'}), 404

        return jsonify({'data': data})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# New route to get all cities with data
@app.route('/get_all_city_data', methods=['GET'])
def get_all_city_data():
    db_path = '/app/EvacuationDatabase4.accdb'
    table_name = 'Database'

    try:
        # Use mdb-export to extract the table data
        cmd = ['mdb-export', db_path, table_name]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()

        if stderr:
            return jsonify({'error': f'mdb-export error: {stderr.strip()}'}), 500

        # Parse the CSV output to get unique city names
        reader = csv.DictReader(stdout.strip().split('\n'))
        cities_with_data = set(row['City'].strip() for row in reader)

        return jsonify({'cities': list(cities_with_data)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
