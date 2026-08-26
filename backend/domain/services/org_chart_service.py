"""
Organization Chart Service - Business Logic
Handles business rules for organization chart operations.
"""
from typing import List, Dict, Any, Optional
from repositories.org_chart_repository import OrgChartRepository
from app_state import is_data_cleared, CLEAN_DB


class OrgChartService:
    """Service for organization chart business logic."""
    
    def __init__(self, org_chart_repo: Optional[OrgChartRepository] = None):
        self._repo = org_chart_repo or OrgChartRepository()
    
    def get_org_chart(
        self,
        user_role: str,
        user_dept: str,
        user_name: str
    ) -> Dict[str, Any]:
        """
        Get organization chart data with RBAC filtering.
        
        Business Rules:
        - If data is cleared, return empty
        - If file doesn't exist, convert from CLEAN_DB
        - Apply RBAC filtering based on user role
        
        Args:
            user_role: User role (CEO, DIRECTOR, MANAGER, etc.)
            user_dept: User department
            user_name: User name
            
        Returns:
            Dictionary with success status and filtered data
        """
        # Business Rule: Check if data is cleared
        if is_data_cleared():
            return {"success": True, "data": []}
        
        # Load data
        all_org_data = self._repo.get_all()
        
        # Business Rule: If no data, convert from CLEAN_DB
        if not all_org_data:
            all_org_data = self._convert_clean_db_to_org_chart()
            if all_org_data:
                self._repo.save_all(all_org_data)
        
        # Business Rule: Apply RBAC filtering
        try:
            from services.hierarchy_service import filter_data_by_hierarchy
        except ImportError:
            # Fallback if service not available
            def filter_data_by_hierarchy(role, dept, name, data, module=None):
                if role == "CEO":
                    return data
                elif role in ["DIRECTOR", "MANAGER"]:
                    return [d for d in data if d.get("Departman") == dept]
                else:
                    return [d for d in data if d.get("Ad Soyad") == name]
        
        filtered_data = filter_data_by_hierarchy(
            user_role or "CEO",
            user_dept or "Yönetim",
            user_name or "",
            all_org_data,
            module="org-chart"
        )
        
        return {"success": True, "data": filtered_data}
    
    def _convert_clean_db_to_org_chart(self) -> List[Dict[str, Any]]:
        """
        Convert CLEAN_DB format to org chart format.
        This is a business rule for data migration.
        """
        org_data = []
        
        for emp in CLEAN_DB:
            # Business Rule: Determine managers based on position
            yonetici1 = "-"
            yonetici2 = "-"
            
            if "Direktör" in emp.get("position", ""):
                yonetici1 = "Emin Öncü"
            elif "Müdür" in emp.get("position", ""):
                # Find director in same department
                dept = emp.get("department", "")
                for d in CLEAN_DB:
                    if d.get("department") == dept and "Direktör" in d.get("position", ""):
                        yonetici1 = d.get("name", "Emin Öncü")
                        yonetici2 = "Emin Öncü"
                        break
            elif "Uzman" in emp.get("position", ""):
                # Find manager in same department
                dept = emp.get("department", "")
                for d in CLEAN_DB:
                    if d.get("department") == dept and "Müdür" in d.get("position", ""):
                        yonetici1 = d.get("name", "-")
                        # Find director
                        for dir_emp in CLEAN_DB:
                            if dir_emp.get("department") == dept and "Direktör" in dir_emp.get("position", ""):
                                yonetici2 = dir_emp.get("name", "Emin Öncü")
                                break
                        break
            
            org_entry = {
                "Ad Soyad": emp.get("name", ""),
                "Pozisyon": emp.get("position", ""),
                "Departman": emp.get("department", ""),
                "Yönetici 1": yonetici1,
                "Yönetici 2": yonetici2,
                "Maaş (TL)": emp.get("salary", 0),
                "Performans": emp.get("performance", 0),
                "Potansiyel": emp.get("potential", 0),
                "Calisma_Yili": emp.get("tenure", 0),
                "Izin_Hakki": emp.get("leave_days", 14),
            }
            org_data.append(org_entry)
        
        return org_data

