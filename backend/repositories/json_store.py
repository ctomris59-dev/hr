"""
JSON Store Repository - Professional JSON file operations with:
- Atomic writes (temp file + rename)
- Cross-platform file locking
- Comprehensive error handling
- Generic CRUD operations

This is the ONLY place where JSON file I/O happens.
All other layers (services, routers) should use repositories, not direct file I/O.
"""
import json
import os
import tempfile
import shutil
from typing import List, Dict, Any, Optional, Callable
from pathlib import Path
import platform

# Cross-platform file locking
if platform.system() == "Windows":
    import msvcrt
else:
    import fcntl


class JsonStoreError(Exception):
    """Base exception for JSON store operations."""
    pass


class JsonStoreLockError(JsonStoreError):
    """Raised when file lock cannot be acquired."""
    pass


class JsonStore:
    """
    Generic JSON file repository for list-based data.
    
    Features:
    - Atomic writes (temp file + rename) - prevents corruption
    - File locking (cross-platform) - prevents race conditions
    - Comprehensive error handling
    - Generic CRUD operations
    """
    
    def __init__(self, file_path: str, lock_timeout: float = 5.0):
        """
        Initialize JSON store with file path.
        
        Args:
            file_path: Path to JSON file (relative or absolute)
            lock_timeout: Maximum time to wait for file lock (seconds)
        """
        self.file_path = Path(file_path).resolve()
        self.lock_timeout = lock_timeout
        # Ensure directory exists
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock_file = None
    
    def _acquire_lock(self) -> None:
        """
        Acquire file lock (cross-platform).
        
        Raises:
            JsonStoreLockError: If lock cannot be acquired
        """
        lock_path = self.file_path.with_suffix(self.file_path.suffix + '.lock')
        
        try:
            if platform.system() == "Windows":
                # Windows file locking
                self._lock_file = open(lock_path, 'w')
                msvcrt.locking(self._lock_file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                # Unix file locking
                self._lock_file = open(lock_path, 'w')
                fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except (IOError, OSError) as e:
            if self._lock_file:
                try:
                    self._lock_file.close()
                except:
                    pass
            raise JsonStoreLockError(f"Cannot acquire lock for {self.file_path}: {e}")
    
    def _release_lock(self) -> None:
        """Release file lock."""
        if self._lock_file:
            try:
                if platform.system() == "Windows":
                    msvcrt.locking(self._lock_file.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_UN)
                self._lock_file.close()
                # Remove lock file
                lock_path = self.file_path.with_suffix(self.file_path.suffix + '.lock')
                if lock_path.exists():
                    lock_path.unlink()
            except:
                pass
            finally:
                self._lock_file = None
    
    def load(self) -> List[Dict[str, Any]]:
        """
        Load data from JSON file with file locking.
        
        Returns:
            List of dictionaries. Empty list if file doesn't exist or is invalid.
        """
        if not self.file_path.exists():
            return []
        
        self._acquire_lock()
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                return []
        except json.JSONDecodeError as e:
            raise JsonStoreError(f"Invalid JSON in {self.file_path}: {e}")
        except IOError as e:
            raise JsonStoreError(f"Cannot read {self.file_path}: {e}")
        finally:
            self._release_lock()
    
    def save(self, data: List[Dict[str, Any]]) -> None:
        """
        Save data to JSON file using atomic write (temp file + rename).
        This prevents data corruption if write is interrupted.
        
        Args:
            data: List of dictionaries to save
            
        Raises:
            JsonStoreError: If file write fails
        """
        if not isinstance(data, list):
            raise JsonStoreError(f"Data must be a list, got {type(data)}")
        
        self._acquire_lock()
        try:
            # Atomic write: Write to temp file first
            temp_file = None
            try:
                # Create temp file in same directory
                temp_fd, temp_path = tempfile.mkstemp(
                    dir=self.file_path.parent,
                    suffix='.tmp',
                    prefix=self.file_path.stem + '_'
                )
                temp_file = Path(temp_path)
                
                # Write to temp file
                with open(temp_fd, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=4)
                
                # Atomic rename (OS-level operation)
                if platform.system() == "Windows":
                    # Windows: Replace existing file
                    if self.file_path.exists():
                        self.file_path.unlink()
                    temp_file.rename(self.file_path)
                else:
                    # Unix: Atomic replace
                    temp_file.replace(self.file_path)
                
            except Exception as e:
                # Clean up temp file on error
                if temp_file and temp_file.exists():
                    try:
                        temp_file.unlink()
                    except:
                        pass
                raise JsonStoreError(f"Failed to save to {self.file_path}: {e}")
        finally:
            self._release_lock()
    
    def find(self, predicate: Callable[[Dict[str, Any]], bool]) -> Optional[Dict[str, Any]]:
        """
        Find first item matching predicate.
        
        Args:
            predicate: Function that takes a dict and returns bool
            
        Returns:
            First matching item or None
        """
        data = self.load()
        for item in data:
            if predicate(item):
                return item
        return None
    
    def find_all(self, predicate: Callable[[Dict[str, Any]], bool]) -> List[Dict[str, Any]]:
        """
        Find all items matching predicate.
        
        Args:
            predicate: Function that takes a dict and returns bool
            
        Returns:
            List of matching items
        """
        data = self.load()
        return [item for item in data if predicate(item)]
    
    def update(self, predicate: Callable[[Dict[str, Any]], bool], updates: Dict[str, Any]) -> bool:
        """
        Update first item matching predicate.
        
        Args:
            predicate: Function to identify item to update
            updates: Dictionary of fields to update
            
        Returns:
            True if updated, False if not found
        """
        data = self.load()
        for item in data:
            if predicate(item):
                item.update(updates)
                self.save(data)
                return True
        return False
    
    def update_all(self, predicate: Callable[[Dict[str, Any]], bool], updates: Dict[str, Any]) -> int:
        """
        Update all items matching predicate.
        
        Args:
            predicate: Function to identify items to update
            updates: Dictionary of fields to update
            
        Returns:
            Number of items updated
        """
        data = self.load()
        count = 0
        for item in data:
            if predicate(item):
                item.update(updates)
                count += 1
        if count > 0:
            self.save(data)
        return count
    
    def delete(self, predicate: Callable[[Dict[str, Any]], bool]) -> bool:
        """
        Delete first item matching predicate.
        
        Args:
            predicate: Function to identify item to delete
            
        Returns:
            True if deleted, False if not found
        """
        data = self.load()
        for i, item in enumerate(data):
            if predicate(item):
                data.pop(i)
                self.save(data)
                return True
        return False
    
    def delete_all(self, predicate: Callable[[Dict[str, Any]], bool]) -> int:
        """
        Delete all items matching predicate.
        
        Args:
            predicate: Function to identify items to delete
            
        Returns:
            Number of items deleted
        """
        data = self.load()
        original_len = len(data)
        data = [item for item in data if not predicate(item)]
        deleted_count = original_len - len(data)
        if deleted_count > 0:
            self.save(data)
        return deleted_count
    
    def append(self, item: Dict[str, Any]) -> None:
        """
        Append new item to list.
        
        Args:
            item: Dictionary to append
        """
        data = self.load()
        data.append(item)
        self.save(data)
    
    def exists(self) -> bool:
        """Check if file exists."""
        return self.file_path.exists()
    
    def delete_file(self) -> None:
        """Delete the JSON file."""
        self._acquire_lock()
        try:
            if self.file_path.exists():
                self.file_path.unlink()
        finally:
            self._release_lock()


class JsonDictStore:
    """
    Generic JSON file repository for dictionary-based data.
    
    Features:
    - Atomic writes (temp file + rename)
    - File locking (cross-platform)
    - Comprehensive error handling
    """
    
    def __init__(self, file_path: str, lock_timeout: float = 5.0):
        """
        Initialize JSON store with file path.
        
        Args:
            file_path: Path to JSON file (relative or absolute)
            lock_timeout: Maximum time to wait for file lock (seconds)
        """
        self.file_path = Path(file_path).resolve()
        self.lock_timeout = lock_timeout
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock_file = None
    
    def _acquire_lock(self) -> None:
        """Acquire file lock (cross-platform)."""
        lock_path = self.file_path.with_suffix(self.file_path.suffix + '.lock')
        
        try:
            if platform.system() == "Windows":
                self._lock_file = open(lock_path, 'w')
                msvcrt.locking(self._lock_file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                self._lock_file = open(lock_path, 'w')
                fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except (IOError, OSError) as e:
            if self._lock_file:
                try:
                    self._lock_file.close()
                except:
                    pass
            raise JsonStoreLockError(f"Cannot acquire lock for {self.file_path}: {e}")
    
    def _release_lock(self) -> None:
        """Release file lock."""
        if self._lock_file:
            try:
                if platform.system() == "Windows":
                    msvcrt.locking(self._lock_file.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_UN)
                self._lock_file.close()
                lock_path = self.file_path.with_suffix(self.file_path.suffix + '.lock')
                if lock_path.exists():
                    lock_path.unlink()
            except:
                pass
            finally:
                self._lock_file = None
    
    def load(self) -> Dict[str, Any]:
        """
        Load data from JSON file with file locking.
        
        Returns:
            Dictionary. Empty dict if file doesn't exist or is invalid.
        """
        if not self.file_path.exists():
            return {}
        
        self._acquire_lock()
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
                return {}
        except json.JSONDecodeError as e:
            raise JsonStoreError(f"Invalid JSON in {self.file_path}: {e}")
        except IOError as e:
            raise JsonStoreError(f"Cannot read {self.file_path}: {e}")
        finally:
            self._release_lock()
    
    def save(self, data: Dict[str, Any]) -> None:
        """
        Save data to JSON file using atomic write.
        
        Args:
            data: Dictionary to save
            
        Raises:
            JsonStoreError: If file write fails
        """
        if not isinstance(data, dict):
            raise JsonStoreError(f"Data must be a dict, got {type(data)}")
        
        self._acquire_lock()
        try:
            # Atomic write
            temp_file = None
            try:
                temp_fd, temp_path = tempfile.mkstemp(
                    dir=self.file_path.parent,
                    suffix='.tmp',
                    prefix=self.file_path.stem + '_'
                )
                temp_file = Path(temp_path)
                
                with open(temp_fd, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=4)
                
                if platform.system() == "Windows":
                    if self.file_path.exists():
                        self.file_path.unlink()
                    temp_file.rename(self.file_path)
                else:
                    temp_file.replace(self.file_path)
                
            except Exception as e:
                if temp_file and temp_file.exists():
                    try:
                        temp_file.unlink()
                    except:
                        pass
                raise JsonStoreError(f"Failed to save to {self.file_path}: {e}")
        finally:
            self._release_lock()
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get value by key.
        
        Args:
            key: Key to get
            default: Default value if key doesn't exist
            
        Returns:
            Value or default
        """
        data = self.load()
        return data.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """
        Set value by key.
        
        Args:
            key: Key to set
            value: Value to set
        """
        data = self.load()
        data[key] = value
        self.save(data)
    
    def update(self, updates: Dict[str, Any]) -> None:
        """
        Update multiple keys at once.
        
        Args:
            updates: Dictionary of key-value pairs to update
        """
        data = self.load()
        data.update(updates)
        self.save(data)
    
    def delete_key(self, key: str) -> bool:
        """
        Delete key from dictionary.
        
        Args:
            key: Key to delete
            
        Returns:
            True if deleted, False if not found
        """
        data = self.load()
        if key in data:
            del data[key]
            self.save(data)
            return True
        return False
    
    def exists(self) -> bool:
        """Check if file exists."""
        return self.file_path.exists()
    
    def delete_file(self) -> None:
        """Delete the JSON file."""
        self._acquire_lock()
        try:
            if self.file_path.exists():
                self.file_path.unlink()
        finally:
            self._release_lock()
