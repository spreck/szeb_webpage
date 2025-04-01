"""
File locking utility for cross-platform file locking.

Uses the filelock library which is cross-platform (works on Windows, Linux, and MacOS).
"""

import os
import time
import contextlib
from filelock import FileLock, Timeout
from flask import current_app

class FileLocker:
    """
    Cross-platform file locking utility.
    """
    
    def __init__(self, file_path, timeout=5):
        """
        Initialize the file locker.
        
        Args:
            file_path (str): Path to the file to lock
            timeout (int): Maximum time to wait for lock acquisition in seconds
        """
        self.file_path = file_path
        self.lock_path = f"{file_path}.lock"
        self.timeout = timeout
        self.lock = FileLock(self.lock_path, timeout=timeout)
        
    @contextlib.contextmanager
    def locked_file(self, mode="r"):
        """
        Context manager for safely opening and locking a file.
        
        Args:
            mode (str): File open mode ('r', 'w', etc.)
            
        Yields:
            file: The opened file object
            
        Raises:
            Timeout: If the lock could not be acquired within the timeout
            IOError: If the file could not be opened
        """
        try:
            with self.lock:
                with open(self.file_path, mode) as f:
                    yield f
        except Timeout:
            current_app.logger.error(f"Could not acquire lock for {self.file_path} within {self.timeout} seconds")
            raise
        except IOError as e:
            current_app.logger.error(f"Error opening file {self.file_path}: {str(e)}")
            raise
        except Exception as e:
            current_app.logger.error(f"Unexpected error with file {self.file_path}: {str(e)}")
            raise
