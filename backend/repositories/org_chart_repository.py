"""
Organization Chart Repository
Data access layer for organization chart data.
"""
from typing import List, Dict, Any, Optional
from repositories.json_store import JsonStore
from config import DB_ORG_FILE


class OrgChartRepository:
    """Repository for organization chart data."""
    
    def __init__(self):
        self._store = JsonStore(DB_ORG_FILE)
    
    def get_all(self) -> List[Dict[str, Any]]:
        """Get all organization chart entries."""
        return self._store.load()
    
    def save_all(self, data: List[Dict[str, Any]]) -> None:
        """Save all organization chart entries."""
        self._store.save(data)
    
    def find_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find employee by name."""
        all_data = self.get_all()
        for entry in all_data:
            if entry.get("Ad Soyad") == name:
                return entry
        return None
    
    def update_by_name(self, name: str, updates: Dict[str, Any]) -> bool:
        """
        Update employee data by name.
        
        Returns:
            True if updated, False if not found
        """
        all_data = self.get_all()
        for entry in all_data:
            if entry.get("Ad Soyad") == name:
                entry.update(updates)
                self.save_all(all_data)
                return True
        return False
    
    def exists(self) -> bool:
        """Check if data file exists."""
        return self._store.exists()

