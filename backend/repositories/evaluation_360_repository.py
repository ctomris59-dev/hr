"""
360 Evaluation Repository
Data access layer for 360-degree evaluation data.
"""
from typing import List, Dict, Any, Optional
from repositories.json_store import JsonStore
from config import DB_360_FILE


class Evaluation360Repository:
    """Repository for 360-degree evaluation data."""
    
    def __init__(self):
        self._store = JsonStore(DB_360_FILE)
    
    def get_all(self) -> List[Dict[str, Any]]:
        """Get all 360 evaluation entries."""
        return self._store.load()
    
    def save_all(self, data: List[Dict[str, Any]]) -> None:
        """Save all 360 evaluation entries."""
        self._store.save(data)
    
    def find_by_employee(self, employee_name: str) -> Optional[Dict[str, Any]]:
        """Find evaluation by employee name."""
        all_data = self.get_all()
        for entry in all_data:
            if entry.get("Personel") == employee_name or entry.get("target") == employee_name:
                return entry
        return None
    
    def upsert(self, employee_name: str, evaluation_data: Dict[str, Any]) -> None:
        """
        Insert or update evaluation data for an employee.
        
        Args:
            employee_name: Employee name
            evaluation_data: Evaluation data to save
        """
        all_data = self.get_all()
        
        # Find existing entry
        existing_index = -1
        for idx, entry in enumerate(all_data):
            if entry.get("Personel") == employee_name or entry.get("target") == employee_name:
                existing_index = idx
                break
        
        if existing_index >= 0:
            # Update existing
            all_data[existing_index].update(evaluation_data)
        else:
            # Add new
            evaluation_data["Personel"] = employee_name
            evaluation_data["target"] = employee_name
            all_data.append(evaluation_data)
        
        self.save_all(all_data)
    
    def exists(self) -> bool:
        """Check if data file exists."""
        return self._store.exists()

