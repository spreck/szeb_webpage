#!/usr/bin/env python
"""
Test runner for Cone Scouting Tool.
Runs unit tests, API tests, and integration tests.
"""

import os
import subprocess
import sys
import argparse

# Define paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_TESTS_DIR = os.path.join(ROOT_DIR, 'tests', 'api_tests')
MODULE_TESTS_DIR = os.path.join(ROOT_DIR, 'tests', 'module_tests')
INTEGRATION_TESTS_DIR = os.path.join(ROOT_DIR, 'tests', 'integration_tests')

def run_api_tests():
    """Run API tests using pytest."""
    print("\n=== Running API Tests ===\n")
    result = subprocess.run(['pytest', API_TESTS_DIR, '-v'], cwd=ROOT_DIR)
    return result.returncode

def run_module_tests():
    """Run JavaScript module tests using Jest."""
    print("\n=== Running JavaScript Module Tests ===\n")
    result = subprocess.run(['npm', 'test'], cwd=ROOT_DIR)
    return result.returncode

def run_integration_tests():
    """Run integration tests using pytest and Selenium."""
    print("\n=== Running Integration Tests ===\n")
    # Check if the server is running
    check_server = subprocess.run(['curl', 'http://localhost:8000'], 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE)
    
    if check_server.returncode != 0:
        print("WARNING: The application server doesn't appear to be running.")
        print("Integration tests may fail. Start the server and try again.")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            return 0
    
    result = subprocess.run(['pytest', INTEGRATION_TESTS_DIR, '-v'], cwd=ROOT_DIR)
    return result.returncode

def run_coverage():
    """Run tests with coverage reports."""
    print("\n=== Running Tests with Coverage ===\n")
    
    # Python coverage
    print("Python coverage:")
    subprocess.run(['pytest', '--cov=app', '--cov=api', '--cov-report=term', 
                   '--cov-report=html:tests/coverage/python', 
                   API_TESTS_DIR], cwd=ROOT_DIR)
    
    # JavaScript coverage
    print("\nJavaScript coverage:")
    subprocess.run(['npm', 'test', '--', '--coverage'], cwd=ROOT_DIR)
    
    print("\nCoverage reports generated in:")
    print(f"  - Python: {os.path.join(ROOT_DIR, 'tests', 'coverage', 'python')}")
    print(f"  - JavaScript: {os.path.join(ROOT_DIR, 'coverage')}")
    
    return 0

def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(description='Run tests for Cone Scouting Tool')
    parser.add_argument('--api', action='store_true', help='Run API tests')
    parser.add_argument('--js', action='store_true', help='Run JavaScript tests')
    parser.add_argument('--integration', action='store_true', help='Run integration tests')
    parser.add_argument('--coverage', action='store_true', help='Generate coverage reports')
    parser.add_argument('--all', action='store_true', help='Run all tests')
    
    args = parser.parse_args()
    
    # Default to all tests if no specific tests are requested
    if not (args.api or args.js or args.integration or args.coverage):
        args.all = True
    
    exit_code = 0
    
    if args.all or args.coverage:
        exit_code = run_coverage()
    else:
        if args.api:
            api_exit = run_api_tests()
            exit_code = max(exit_code, api_exit)
        
        if args.js:
            js_exit = run_module_tests()
            exit_code = max(exit_code, js_exit)
        
        if args.integration:
            int_exit = run_integration_tests()
            exit_code = max(exit_code, int_exit)
    
    # Summary
    print("\n=== Test Summary ===\n")
    if exit_code == 0:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed. Please check the output above.")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())
