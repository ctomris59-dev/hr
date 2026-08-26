"""
Roles Service - Business Logic
Handles business rules for roles and permissions.
"""
from typing import List, Dict, Any, Optional
from repositories.roles_repository import RolesRepository


class RolesService:
    """Service for roles and permissions business logic."""
    
    def __init__(self, roles_repo: Optional[RolesRepository] = None):
        self._repo = roles_repo or RolesRepository()
    
    def get_all_roles(self) -> Dict[str, Any]:
        """
        Get all roles with business rules.
        
        Business Rules:
        - Always return at least 4 roles (CEO, Director, Manager, Employee)
        - If file doesn't exist, return defaults
        - If file exists but missing roles, merge with defaults
        - Roles must be sorted by rank
        
        Returns:
            Dictionary with success status and roles data
        """
        # Business Rule: Get default roles
        default_roles = self._repo.get_default_roles()
        
        # If file doesn't exist, return defaults
        if not self._repo.exists():
            return {"success": True, "data": default_roles}
        
        # Load saved roles
        saved_roles = self._repo.get_all()
        
        # Business Rule: Validate role structure
        if not saved_roles or not isinstance(saved_roles, list):
            return {"success": True, "data": default_roles}
        
        # Business Rule: Check if manager role exists and we have at least 4 roles
        has_manager = any(role.get("id") == "manager" for role in saved_roles)
        
        if not has_manager or len(saved_roles) < 4:
            # Business Rule: Merge missing roles from defaults
            role_ids = {role.get("id") for role in saved_roles}
            for default_role in default_roles:
                if default_role["id"] not in role_ids:
                    saved_roles.append(default_role)
        
        # Business Rule: Sort by rank
        saved_roles.sort(key=lambda x: x.get("rank", 999))
        
        return {"success": True, "data": saved_roles}
    
    def update_roles(self, roles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Update roles with business rules.
        
        Business Rules:
        - Validate that we have at least 4 roles
        - Validate that manager role exists
        - Sort by rank before saving
        
        Args:
            roles: List of role dictionaries
            
        Returns:
            Dictionary with success status
        """
        if not roles:
            return {"success": False, "error": "Roller boş olamaz"}
        
        # Business Rule: Validate minimum 4 roles
        if len(roles) < 4:
            return {"success": False, "error": "En az 4 rol olmalıdır (CEO, Direktör, Müdür, Personel)"}
        
        # Business Rule: Validate manager role exists
        has_manager = any(role.get("id") == "manager" for role in roles)
        if not has_manager:
            return {"success": False, "error": "Müdür rolü bulunmalıdır"}
        
        # Business Rule: Sort by rank
        roles.sort(key=lambda x: x.get("rank", 999))
        
        # Save
        self._repo.save_all(roles)
        
        return {"success": True, "message": "Roller başarıyla güncellendi"}

