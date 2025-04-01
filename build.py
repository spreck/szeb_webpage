#!/usr/bin/env python
"""
Build script for Cone Scouting Tool.

This script:
1. Ensures all required directories exist
2. Runs Babel to transpile JavaScript files
3. Processes any other assets

Usage:
    python build.py [--watch]
"""

import os
import sys
import subprocess
import shutil
import argparse
from pathlib import Path

# Define paths
ROOT_DIR = Path(__file__).parent
JS_DIR = ROOT_DIR / 'static' / 'js'
DIST_DIR = ROOT_DIR / 'static' / 'dist'

def ensure_directories():
    """
    Ensure all required directories exist.
    """
    print("Ensuring directories exist...")
    
    # Create dist directory
    DIST_DIR.mkdir(exist_ok=True)
    
    # Create subdirectories in dist matching js structure
    for subdir in ['config', 'components', 'modules', 'admin']:
        (DIST_DIR / subdir).mkdir(exist_ok=True)

def run_babel(watch=False):
    """
    Run Babel to transpile JavaScript files.
    
    Args:
        watch (bool): Whether to watch for changes.
    """
    cmd = ['npm', 'run', 'watch' if watch else 'build']
    
    print(f"Running Babel ({'watch' if watch else 'build'} mode)...")
    
    try:
        subprocess.run(cmd, check=True)
        print("Babel completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error running Babel: {e}")
        sys.exit(1)

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Build the Cone Scouting Tool application.')
    parser.add_argument('--watch', action='store_true', help='Watch for changes and rebuild')
    
    args = parser.parse_args()
    
    # Ensure directories exist
    ensure_directories()
    
    # Run Babel
    run_babel(args.watch)
    
    if not args.watch:
        print("Build completed successfully.")

if __name__ == "__main__":
    main()
