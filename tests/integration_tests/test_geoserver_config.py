import os
import unittest
import json
from unittest.mock import patch, MagicMock
from flask import url_for

# Import app from parent directory
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from app import create_app

class TestGeoServerConfig(unittest.TestCase):
    """
    Test the GeoServer configuration and integration
    """
    
    def setUp(self):
        """
        Set up test client and environment
        """
        # Create test app with test config
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SERVER_NAME'] = 'localhost'
        self.app.config['GEOSERVER_URL'] = 'http://test-geoserver.example.com/geoserver'
        self.app.config['GEOSERVER_WORKSPACE'] = 'test_workspace'
        self.app.config['GEOSERVER_USER'] = 'test_user'
        self.app.config['GEOSERVER_PASS'] = 'test_pass'
        
        # Create test client
        self.client = self.app.test_client()
        
        # Create app context
        self.app_context = self.app.app_context()
        self.app_context.push()
    
    def tearDown(self):
        """
        Clean up after tests
        """
        self.app_context.pop()
    
    def test_index_passes_geoserver_config(self):
        """
        Test that the index route passes GeoServer configuration to template
        """
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        
        # Check that HTML contains data attributes with GeoServer configuration
        html = response.data.decode('utf-8')
        self.assertIn('data-geoserver-url="http://test-geoserver.example.com/geoserver"', html)
        self.assertIn('data-workspace="test_workspace"', html)
    
    @patch('requests.post')
    def test_generate_style_uses_app_config(self, mock_post):
        """
        Test that the generate_style endpoint uses the app's GeoServer configuration
        """
        # Mock the requests.post response
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response
        
        # Test data
        test_data = {
            'workspace': 'test_workspace',
            'store': 'test_store',
            'coverage': 'test_coverage',
            'band': '1',
            'classification': 'unique',
            'styleName': 'test_style'
        }
        
        # Make request
        response = self.client.post(
            '/generate_style',
            data=json.dumps(test_data),
            content_type='application/json'
        )
        
        # Assert response is successful
        self.assertEqual(response.status_code, 201)
        
        # Assert POST was called with correct URL and auth from app config
        mock_post.assert_called_once_with(
            f"http://test-geoserver.example.com/geoserver/rest/workspaces/test_workspace/coveragestores/test_store/coverages/test_coverage/pam?band=1&classification=unique&styleName=test_style_",
            headers={"Content-Type": "application/vnd.ogc.sld+xml"},
            data="",
            auth=('test_user', 'test_pass')
        )
    
    @patch('requests.post')
    def test_generate_style_handles_errors(self, mock_post):
        """
        Test that the generate_style endpoint handles GeoServer errors
        """
        # Mock the requests.post response for an error
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response
        
        # Test data
        test_data = {
            'workspace': 'test_workspace',
            'store': 'test_store',
            'coverage': 'test_coverage',
            'band': '1',
            'classification': 'unique',
            'styleName': 'test_style'
        }
        
        # Make request
        response = self.client.post(
            '/generate_style',
            data=json.dumps(test_data),
            content_type='application/json'
        )
        
        # Assert response contains error information
        self.assertEqual(response.status_code, 500)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Style creation failed.')
        self.assertEqual(response_data['status'], 500)
    
    @patch('requests.get')
    def test_error_handling_decorator(self, mock_get):
        """
        Test that the error handling decorator properly handles and formats errors
        """
        # Mock requests.get to raise an exception
        mock_get.side_effect = Exception("Test GeoServer connection error")
        
        # Make request to a route decorated with handle_error
        response = self.client.get('/download_roi_intersection?vector=test_layer')
        
        # Assert response contains proper error format
        self.assertEqual(response.status_code, 500)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['status'], 'error')
        self.assertIn('Test GeoServer connection error', response_data['message'])
        self.assertEqual(response_data['error_type'], 'Exception')
    
    def test_environment_variables_config(self):
        """
        Test that environment variables are correctly loaded into app config
        """
        # Set test environment variables
        with patch.dict(os.environ, {
            'GEOSERVER_URL': 'http://env-geoserver.example.com/geoserver',
            'GEOSERVER_WORKSPACE': 'env_workspace',
            'GEOSERVER_USER': 'env_user',
            'GEOSERVER_PASS': 'env_pass'
        }):
            # Create a new app to load config from environment
            test_app = create_app()
            
            # Check that config was loaded from environment
            self.assertEqual(test_app.config['GEOSERVER_URL'], 'http://env-geoserver.example.com/geoserver')
            self.assertEqual(test_app.config['GEOSERVER_WORKSPACE'], 'env_workspace')
            self.assertEqual(test_app.config['GEOSERVER_USER'], 'env_user')
            self.assertEqual(test_app.config['GEOSERVER_PASS'], 'env_pass')

if __name__ == '__main__':
    unittest.main()
