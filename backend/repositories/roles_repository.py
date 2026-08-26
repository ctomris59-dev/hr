"""
Roles Repository
Data access layer for roles and permissions data.
"""
from typing import List, Dict, Any
from repositories.json_store import JsonDictStore
from config import DB_ROLES_FILE


class RolesRepository:
    """Repository for roles and permissions data."""
    
    def __init__(self):
        self._store = JsonDictStore(DB_ROLES_FILE)
    
    def get_all(self) -> List[Dict[str, Any]]:
        """
        Get all roles.
        
        Returns:
            List of role dictionaries
        """
        data = self._store.load()
        return data.get("roles", [])
    
    def save_all(self, roles: List[Dict[str, Any]]) -> None:
        """
        Save all roles.
        
        Args:
            roles: List of role dictionaries
        """
        data = {"roles": roles}
        self._store.save(data)
    
    def get_default_roles(self) -> List[Dict[str, Any]]:
        """
        Get default roles (used when file doesn't exist).
        
        Returns:
            List of default role dictionaries
        """
        return [
            {
                "id": "ceo",
                "name": "CEO / Genel Müdür",
                "rank": 1,
                "permissions": {"all_data_access": True}
            },
            {
                "id": "director",
                "name": "Direktör",
                "rank": 2,
                "permissions": {
                    "budget": {"view": True, "edit": True},
                    "talent": {"view": True, "edit": True}
                }
            },
            {
                "id": "manager",
                "name": "Müdür",
                "rank": 3,
                "permissions": {
                    "talent": {"view": True, "edit": True},
                    "org_chart": {"view": True}
                }
            },
            {
                "id": "employee",
                "name": "Personel",
                "rank": 4,
                "permissions": {}
            }
        ]
    
    def exists(self) -> bool:
        """Check if data file exists."""
        return self._store.exists()

