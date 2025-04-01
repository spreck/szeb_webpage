"""
File Operations Module

This module provides functions for file manipulation and management for the GeoServer
data workflow, including secure file handling, validation, and directory management.
"""

import os
import shutil
import zipfile
import tempfile
import logging
import uuid
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from typing import List, Tuple, Optional, Dict, Any, Union

# Configure logger
logger = logging.getLogger(__name__)

# Safe file extensions with their MIME types
ALLOWED_EXTENSIONS = {
    # Vector data formats
    'shp': 'application/x-esri-shape',
    'dbf': 'application/x-dbf',
    'shx': 'application/x-shx',
    'prj': 'text/plain',
    'cpg': 'text/plain',
    'zip': 'application/zip',
    'gpkg': 'application/geopackage+sqlite3',
    'geojson': 'application/geo+json',
    'json': 'application/json',
    'kml': 'application/vnd.google-earth.kml+xml',
    'kmz': 'application/vnd.google-earth.kmz',
    
    # Raster data formats
    'tif': 'image/tiff',
    'tiff': 'image/tiff',
    'geotiff': 'image/tiff',
    'img': 'application/x-img',
    'asc': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'sid': 'image/x-mrsid',
    'ecw': 'image/x-ecw',
    
    # Style files
    'sld': 'application/vnd.ogc.sld+xml',
    'xml': 'application/xml',
    'qml': 'application/xml',
    
    # Documentation
    'md': 'text/markdown',
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'csv': 'text/csv',
}

class FileOperationError(Exception):
    """Exception raised for errors in file operations"""
    pass

def is_safe_path(base_dir: str, path: str) -> bool:
    """
    Check if the path is safe (within the base directory)
    
    Args:
        base_dir: The base directory that should contain the path
        path: The path to check
        
    Returns:
        bool: True if the path is safe, False otherwise
    """
    # Resolve any symbolic links or .. notation to get absolute path
    abs_base = os.path.abspath(os.path.normpath(os.path.expanduser(base_dir)))
    abs_path = os.path.abspath(os.path.normpath(os.path.expanduser(path)))
    
    # Check if the absolute path of the file is within the base directory
    return abs_path.startswith(abs_base)

def validate_file(file: FileStorage) -> Tuple[bool, str]:
    """
    Validate file type and size
    
    Args:
        file: The file to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, reason)
    """
    if not file or not file.filename:
        return False, "No file provided"
    
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File extension '{ext}' not allowed"
    
    # Check file size (limit to 50MB)
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)  # Reset file pointer
    
    if size > 50 * 1024 * 1024:  # 50MB
        return False, "File too large (max 50MB)"
    
    return True, ""

def save_uploaded_file(file: FileStorage, target_dir: str, original_filename: Optional[str] = None) -> str:
    """
    Securely save an uploaded file to a target directory
    
    Args:
        file: The file to save
        target_dir: The target directory
        original_filename: Optional original filename to use
        
    Returns:
        str: The path to the saved file
    """
    try:
        # Create target directory if it doesn't exist
        os.makedirs(target_dir, exist_ok=True)
        
        # Use secure filename
        if original_filename:
            filename = secure_filename(original_filename)
        else:
            filename = secure_filename(file.filename)
            
        # Add random component to prevent overwriting
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(target_dir, unique_filename)
        
        # Save file
        file.save(file_path)
        
        logger.info(f"File saved to {file_path}")
        return file_path
    
    except Exception as e:
        logger.error(f"Error saving uploaded file: {str(e)}")
        raise FileOperationError(f"Failed to save file: {str(e)}")

def extract_zip(zip_path: str, target_dir: str) -> List[str]:
    """
    Extract a ZIP file to a target directory
    
    Args:
        zip_path: Path to the ZIP file
        target_dir: Target directory to extract to
        
    Returns:
        List[str]: List of extracted file paths
    """
    try:
        os.makedirs(target_dir, exist_ok=True)
        
        # Extract zip
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Check for unwanted files like executables
            bad_extensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.php']
            for file_info in zip_ref.infolist():
                if any(file_info.filename.lower().endswith(ext) for ext in bad_extensions):
                    raise FileOperationError(f"ZIP contains potentially harmful file: {file_info.filename}")
                
                # Prevent directory traversal attacks
                if '..' in file_info.filename or file_info.filename.startswith('/'):
                    raise FileOperationError(f"ZIP contains potentially malicious path: {file_info.filename}")
            
            # Extract all files
            zip_ref.extractall(target_dir)
        
        # List extracted files
        extracted_files = []
        for root, _, files in os.walk(target_dir):
            for filename in files:
                extracted_files.append(os.path.join(root, filename))
        
        logger.info(f"Extracted {len(extracted_files)} files from {zip_path}")
        return extracted_files
    
    except zipfile.BadZipFile:
        logger.error(f"Invalid ZIP file: {zip_path}")
        raise FileOperationError("Invalid ZIP file")
    except Exception as e:
        logger.error(f"Error extracting ZIP file: {str(e)}")
        raise FileOperationError(f"Failed to extract ZIP file: {str(e)}")

def identify_shapefile_components(files: List[str]) -> Dict[str, str]:
    """
    Identify Shapefile components in a list of files
    
    Args:
        files: List of file paths
        
    Returns:
        Dict[str, str]: Dictionary of shapefile components
    """
    components = {}
    base_names = {}
    
    # Group files by their base name
    for file_path in files:
        filename = os.path.basename(file_path)
        name, ext = os.path.splitext(filename)
        ext = ext.lower()[1:]  # Remove the dot
        
        if ext in ['shp', 'dbf', 'shx', 'prj', 'cpg']:
            if name not in base_names:
                base_names[name] = []
            base_names[name].append((ext, file_path))
    
    # Find complete shapefile sets
    for name, files in base_names.items():
        extensions = [ext for ext, _ in files]
        
        # Check for required components (shp, dbf, shx)
        if all(ext in extensions for ext in ['shp', 'dbf', 'shx']):
            components[name] = {ext: path for ext, path in files}
    
    return components

def identify_geotiff_files(files: List[str]) -> List[str]:
    """
    Identify GeoTIFF files in a list of files
    
    Args:
        files: List of file paths
        
    Returns:
        List[str]: List of GeoTIFF file paths
    """
    return [f for f in files if f.lower().endswith(('.tif', '.tiff', '.geotiff'))]

def copy_files_to_geoserver_data_dir(files: List[str], geoserver_data_dir: str, 
                                    subdirectory: str = None) -> List[str]:
    """
    Copy files to GeoServer data directory
    
    Args:
        files: List of file paths to copy
        geoserver_data_dir: GeoServer data directory
        subdirectory: Optional subdirectory to create under data directory
        
    Returns:
        List[str]: List of copied file paths in GeoServer data directory
    """
    try:
        # Create target directory path
        if subdirectory:
            target_dir = os.path.join(geoserver_data_dir, subdirectory)
            # Sanitize subdirectory to prevent directory traversal
            if not is_safe_path(geoserver_data_dir, target_dir):
                raise FileOperationError(f"Invalid subdirectory: {subdirectory}")
        else:
            target_dir = geoserver_data_dir
            
        # Create target directory if it doesn't exist
        os.makedirs(target_dir, exist_ok=True)
        
        # Copy each file
        copied_files = []
        for file_path in files:
            if not os.path.exists(file_path):
                logger.warning(f"File not found: {file_path}")
                continue
                
            # Get filename and create destination path
            filename = os.path.basename(file_path)
            dest_path = os.path.join(target_dir, filename)
            
            # Copy file
            shutil.copy2(file_path, dest_path)
            copied_files.append(dest_path)
            
        logger.info(f"Copied {len(copied_files)} files to {target_dir}")
        return copied_files
    
    except Exception as e:
        logger.error(f"Error copying files to GeoServer data directory: {str(e)}")
        raise FileOperationError(f"Failed to copy files to GeoServer data directory: {str(e)}")

def write_style_file(sld_content: str, styles_dir: str, style_name: str) -> str:
    """
    Write an SLD style file to the GeoServer styles directory
    
    Args:
        sld_content: The SLD content to write
        styles_dir: The GeoServer styles directory
        style_name: The name of the style
        
    Returns:
        str: The path to the saved style file
    """
    try:
        os.makedirs(styles_dir, exist_ok=True)
        
        # Ensure style name has .sld extension
        if not style_name.lower().endswith('.sld'):
            style_name = f"{style_name}.sld"
            
        # Sanitize filename
        style_name = secure_filename(style_name)
        
        # Create file path
        file_path = os.path.join(styles_dir, style_name)
        
        # Write file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(sld_content)
            
        logger.info(f"Style file written to {file_path}")
        return file_path
    
    except Exception as e:
        logger.error(f"Error writing style file: {str(e)}")
        raise FileOperationError(f"Failed to write style file: {str(e)}")

def write_markdown_documentation(content: str, docs_dir: str, filename: str) -> str:
    """
    Write markdown documentation file
    
    Args:
        content: The markdown content
        docs_dir: The documentation directory
        filename: The name of the file
        
    Returns:
        str: The path to the saved documentation file
    """
    try:
        os.makedirs(docs_dir, exist_ok=True)
        
        # Ensure filename has .md extension
        if not filename.lower().endswith('.md'):
            filename = f"{filename}.md"
            
        # Sanitize filename
        filename = secure_filename(filename)
        
        # Create file path
        file_path = os.path.join(docs_dir, filename)
        
        # Write file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        logger.info(f"Documentation file written to {file_path}")
        return file_path
    
    except Exception as e:
        logger.error(f"Error writing documentation file: {str(e)}")
        raise FileOperationError(f"Failed to write documentation file: {str(e)}")

def cleanup_temp_files(file_paths: List[str]) -> None:
    """
    Clean up temporary files
    
    Args:
        file_paths: List of file paths to clean up
    """
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                if os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                else:
                    os.remove(file_path)
        except Exception as e:
            logger.warning(f"Error cleaning up file {file_path}: {str(e)}")

def create_temp_directory() -> str:
    """
    Create a temporary directory
    
    Returns:
        str: Path to the temporary directory
    """
    return tempfile.mkdtemp()
