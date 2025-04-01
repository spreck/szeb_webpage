import json
import pytest
import os
import tempfile
import shutil
from app import create_app

@pytest.fixture
def app():
    """Create a Flask app for testing."""
    # Create a temporary directory for the config file
    test_dir = tempfile.mkdtemp()
    
    # Create a test config file
    test_config = os.path.join(test_dir, 'species_config.js')
    with open(test_config, 'w') as f:
        f.write('''/**
 * Species Configuration File (TEST VERSION)
 */

const speciesConfig = {
  "psme": {
    "displayName": "Douglas Fir",
    "scientificName": "Pseudotsuga menziesii",
    "vectorLayer": "szeb_psme_vector",
    "rasterLayer": "SZEBxPsme_raster_4326",
    "backgroundImage": "/static/images/DouglasFirCones1_Tom-BrandtCC-BY-ND-2.jpg",
    "enabled": true,
    "attributes": {
      "basics": {
        "label": "Basic Information",
        "items": {
          "Range": "Range",
          "TotalSZEBRanking": "Total SZEB Rank"
        }
      }
    }
  },
  "pipo": {
    "displayName": "Ponderosa Pine",
    "scientificName": "Pinus ponderosa",
    "vectorLayer": "szeb_pipo_vector",
    "rasterLayer": "SZEBxPipo_raster_4326",
    "backgroundImage": "/static/images/lake-tahoe-trees-ponderosa.jpg",
    "enabled": false,
    "attributes": {
      "basics": {
        "label": "Basic Information",
        "items": {
          "Range": "Range",
          "TotalSZEBRanking": "Total SZEB Rank"
        }
      }
    }
  }
};

// Export the configuration for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { speciesConfig };
}''')
    
    # Create app with test config
    app = create_app(test_dir=test_dir)
    app.config['TESTING'] = True
    
    yield app
    
    # Clean up after test
    shutil.rmtree(test_dir)

@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()

def test_get_all_species(client):
    """Test fetching all species."""
    response = client.get('/api/species')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data) == 2
    
    # Check species data
    species_ids = {s['id'] for s in data}
    assert 'psme' in species_ids
    assert 'pipo' in species_ids
    
    # Check one species is enabled, one disabled
    enabled_count = sum(1 for s in data if s['enabled'])
    assert enabled_count == 1

def test_get_single_species(client):
    """Test fetching a single species."""
    response = client.get('/api/species/psme')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == 'psme'
    assert data['displayName'] == 'Douglas Fir'
    assert data['scientificName'] == 'Pseudotsuga menziesii'
    assert data['enabled'] is True

def test_species_not_found(client):
    """Test fetching a non-existent species."""
    response = client.get('/api/species/nonexistent')
    assert response.status_code == 404

def test_toggle_species(client):
    """Test toggling a species enabled status."""
    # Toggle psme to disabled
    response = client.patch('/api/species/psme/toggle', 
                           json={'enabled': False})
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == 'psme'
    assert data['enabled'] is False
    
    # Verify the change
    response = client.get('/api/species/psme')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['enabled'] is False
    
    # Toggle back to enabled
    response = client.patch('/api/species/psme/toggle', 
                           json={'enabled': True})
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['enabled'] is True

def test_create_species(client):
    """Test creating a new species."""
    new_species = {
        "displayName": "Sugar Pine",
        "scientificName": "Pinus lambertiana",
        "vectorLayer": "szeb_pila_vector",
        "rasterLayer": "SZEBxPila_raster_4326",
        "backgroundImage": "/static/images/sugar-pine.jpg",
        "enabled": True,
        "attributes": {
            "basics": {
                "label": "Basic Information",
                "items": {
                    "Range": "Range",
                    "TotalSZEBRanking": "Total SZEB Rank"
                }
            }
        }
    }
    
    response = client.post('/api/species', 
                          json=new_species)
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'id' in data
    assert data['displayName'] == 'Sugar Pine'
    
    # Verify the new species was added
    response = client.get(f'/api/species/{data["id"]}')
    assert response.status_code == 200
    assert json.loads(response.data)['scientificName'] == 'Pinus lambertiana'

def test_update_species(client):
    """Test updating an existing species."""
    updated_species = {
        "displayName": "Douglas Fir (Updated)",
        "scientificName": "Pseudotsuga menziesii",
        "vectorLayer": "szeb_psme_vector",
        "rasterLayer": "SZEBxPsme_raster_4326",
        "backgroundImage": "/static/images/DouglasFirCones1_Tom-BrandtCC-BY-ND-2.jpg",
        "enabled": True,
        "attributes": {
            "basics": {
                "label": "Basic Information",
                "items": {
                    "Range": "Range",
                    "TotalSZEBRanking": "Total SZEB Rank",
                    "NewAttribute": "New Attribute"
                }
            }
        }
    }
    
    response = client.put('/api/species/psme', 
                         json=updated_species)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == 'psme'
    assert data['displayName'] == 'Douglas Fir (Updated)'
    
    # Verify the update
    response = client.get('/api/species/psme')
    data = json.loads(response.data)
    assert 'NewAttribute' in data['attributes']['basics']['items']
