"""
Tenant Repository - Data Access Layer
"""
from typing import List, Optional
from datetime import datetime
from repositories.json_store import JsonStore
from domain.tenant.models import Tenant, TenantStatus
from config import DB_TENANTS_FILE
from pathlib import Path


class TenantRepository:
    """Repository for tenant data."""
    
    def __init__(self, file_path: Optional[str] = None):
        self._store = JsonStore(file_path or DB_TENANTS_FILE)
    
    def save(self, tenant: Tenant) -> None:
        """Save tenant."""
        tenants = self._store.load()
        
        # Convert to dict
        tenant_dict = tenant.model_dump()
        tenant_dict["created_at"] = tenant.created_at.isoformat()
        tenant_dict["updated_at"] = tenant.updated_at.isoformat()
        if tenant.trial_ends_at:
            tenant_dict["trial_ends_at"] = tenant.trial_ends_at.isoformat()
        
        # Update or insert
        found = False
        for i, t in enumerate(tenants):
            if t.get("tenant_id") == tenant.tenant_id:
                tenants[i] = tenant_dict
                found = True
                break
        
        if not found:
            tenants.append(tenant_dict)
        
        self._store.save(tenants)
    
    def get_by_id(self, tenant_id: str) -> Optional[Tenant]:
        """Get tenant by ID."""
        tenants = self._store.load()
        for t in tenants:
            if t.get("tenant_id") == tenant_id:
                return self._parse_tenant(t)
        return None
    
    def get_by_slug(self, slug: str) -> Optional[Tenant]:
        """Get tenant by slug."""
        tenants = self._store.load()
        for t in tenants:
            if t.get("slug") == slug:
                return self._parse_tenant(t)
        return None
    
    def get_by_domain(self, domain: str) -> Optional[Tenant]:
        """Get tenant by domain."""
        tenants = self._store.load()
        for t in tenants:
            if t.get("domain") == domain:
                return self._parse_tenant(t)
        return None
    
    def list_all(self, status: Optional[TenantStatus] = None) -> List[Tenant]:
        """List all tenants."""
        tenants = self._store.load()
        result = []
        for t in tenants:
            try:
                tenant = self._parse_tenant(t)
                if status is None or tenant.status == status:
                    result.append(tenant)
            except Exception:
                continue
        return result
    
    def _parse_tenant(self, t_dict: dict) -> Tenant:
        """Parse tenant dict to Tenant model."""
        # Parse timestamps
        t_dict["created_at"] = datetime.fromisoformat(t_dict["created_at"])
        t_dict["updated_at"] = datetime.fromisoformat(t_dict["updated_at"])
        if t_dict.get("trial_ends_at"):
            t_dict["trial_ends_at"] = datetime.fromisoformat(t_dict["trial_ends_at"])
        return Tenant(**t_dict)

