import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestConeScoutingTool:
    @pytest.fixture(scope="class")
    def driver(self):
        """Setup and teardown for WebDriver"""
        driver = webdriver.Chrome()
        driver.implicitly_wait(10)
        driver.maximize_window()
        yield driver
        driver.quit()
    
    def test_homepage_loads(self, driver):
        """Test that the homepage loads successfully"""
        driver.get("http://localhost:8000")
        
        # Check page title
        assert "Cone Scouting Tool" in driver.title
        
        # Check that the about tab is visible by default
        about_tab = driver.find_element(By.ID, "about")
        assert "show active" in about_tab.get_attribute("class")
    
    def test_map_tab_navigation(self, driver):
        """Test switching to the map tab works"""
        driver.get("http://localhost:8000")
        
        # Click on the map tab
        map_tab = driver.find_element(By.ID, "map-tab")
        map_tab.click()
        
        # Wait for the map to load
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "map"))
        )
        
        # Check that the map is visible
        map_element = driver.find_element(By.ID, "map")
        assert map_element.is_displayed()
    
    def test_species_selection(self, driver):
        """Test species dropdown works"""
        driver.get("http://localhost:8000")
        
        # Navigate to map tab
        map_tab = driver.find_element(By.ID, "map-tab")
        map_tab.click()
        
        # Wait for the map to load
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "map"))
        )
        
        # Find the species dropdown
        species_dropdown = driver.find_element(By.ID, "rasterSelect")
        
        # Check that the dropdown has options
        options = species_dropdown.find_elements(By.TAG_NAME, "option")
        assert len(options) > 0
        
        # Select the second option if available
        if len(options) > 1:
            options[1].click()
            time.sleep(1)  # Allow time for the map to update
            
            # Check that the attribute dropdown is populated
            attribute_dropdown = driver.find_element(By.ID, "attributeSelect")
            attribute_options = attribute_dropdown.find_elements(By.TAG_NAME, "option")
            assert len(attribute_options) > 0
    
    def test_attribute_selection(self, driver):
        """Test attribute dropdown works"""
        driver.get("http://localhost:8000")
        
        # Navigate to map tab
        map_tab = driver.find_element(By.ID, "map-tab")
        map_tab.click()
        
        # Wait for the map to load
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "map"))
        )
        
        # Select an attribute from the dropdown
        attribute_dropdown = driver.find_element(By.ID, "attributeSelect")
        attribute_options = attribute_dropdown.find_elements(By.TAG_NAME, "option")
        
        # Skip disabled options (headers and dividers)
        selectable_options = [opt for opt in attribute_options if not opt.get_attribute("disabled")]
        
        if len(selectable_options) > 1:
            selectable_options[1].click()
            time.sleep(1)  # Allow time for the map to update
            
            # Check that the legend is displayed
            legend = driver.find_element(By.ID, "legend")
            assert legend.is_displayed()
    
    def test_admin_page_loads(self, driver):
        """Test that the admin page loads"""
        driver.get("http://localhost:8000/admin")
        
        # Check page title
        assert "Admin" in driver.title
        
        # Check that the species management elements are present
        add_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Add New Species')]")
        assert add_button.is_displayed()
        
        # Check if species cards are loaded (may take a moment)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "speciesList"))
        )
        
        species_list = driver.find_element(By.ID, "speciesList")
        assert species_list.is_displayed()

if __name__ == "__main__":
    pytest.main(["-v", "test_application.py"])
