"""
Cross-platform file locking utility.

This module provides a platform-independent way to lock files
for exclusive access, preventing race conditions during writes.
"""

import os
import time
import errno
import tempfile
import contextlib

# Determine platform
is_windows = os.name == 'nt'

if is_windows:
    import msvcrt
    
    @contextlib.contextmanager
    def file_lock(file_path, timeout=5):
        """
        Context manager for file locking on Windows.
        
        Args:
            file_path (str): Path to the file to lock
            timeout (int): Timeout in seconds for acquiring the lock
        
        Yields:
            None: Context manager yields None on successful lock
            
        Raises:
            IOError: If lock cannot be acquired within timeout
        """
        lock_file_path = file_path + ".lock"
        start_time = time.time()
        
        # Try to create and lock the file
        while True:
            try:
                # Open for exclusive creation
                lock_file = open(lock_file_path, 'x')
                
                try:
                    # Lock the file
                    msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
                    break
                except IOError:
                    lock_file.close()
                    
                    # Check timeout
                    if time.time() - start_time > timeout:
                        raise IOError(f"Timeout waiting for lock on {file_path}")
                    
                    time.sleep(0.1)
            except FileExistsError:
                # If the lock file already exists, try to remove it if it's stale
                try:
                    # Check if the lock is stale (older than 1 hour)
                    if os.path.isfile(lock_file_path) and \
                       time.time() - os.path.getmtime(lock_file_path) > 3600:
                        os.remove(lock_file_path)
                        continue
                except:
                    pass
                
                # Check timeout
                if time.time() - start_time > timeout:
                    raise IOError(f"Timeout waiting for lock on {file_path}")
                
                time.sleep(0.1)
        
        try:
            yield
        finally:
            try:
                # Release the lock
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
                lock_file.close()
                os.remove(lock_file_path)
            except:
                # If we can't remove it now, it will be cleaned up later as stale
                pass

else:
    import fcntl
    
    @contextlib.contextmanager
    def file_lock(file_path, timeout=5):
        """
        Context manager for file locking on Unix-like systems.
        
        Args:
            file_path (str): Path to the file to lock
            timeout (int): Timeout in seconds for acquiring the lock
        
        Yields:
            None: Context manager yields None on successful lock
            
        Raises:
            IOError: If lock cannot be acquired within timeout
        """
        lock_file_path = file_path + ".lock"
        lock_file = None
        
        try:
            lock_file = open(lock_file_path, 'w')
            
            # Try to acquire an exclusive lock with a timeout
            start_time = time.time()
            while True:
                try:
                    fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break  # Lock acquired
                except IOError as e:
                    # Lock couldn't be acquired
                    if time.time() - start_time > timeout:
                        raise IOError(f"Timeout waiting for lock on {file_path}")
                    time.sleep(0.1)
            
            yield
        finally:
            if lock_file:
                try:
                    fcntl.flock(lock_file, fcntl.LOCK_UN)
                    lock_file.close()
                    os.remove(lock_file_path)
                except:
                    # If we can't remove it now, it will be cleaned up later as stale
                    pass
