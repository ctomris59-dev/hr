"""
Tenant Service - Business Logic
"""
from typing import Optional
from datetime import datetime, timedelta
from domain.tenant.models import Tenant, TenantStatus, TenantContext
from domain.tenant.repository import TenantRepository
from core.logging_config import get_logger

logger = get_logger(__name__)


class TenantService:
    """Service for tenant management."""
    
    def __init__(self, repository: Optional[TenantRepository] = None):
        self._repo = repository or TenantRepository()
    
    def create_tenant(
        self,
        name: str,
        slug: str,
        plan: str = "trial",
        contact_email: Optional[str] = None,
    ) -> Tenant:
        """Create a new tenant."""
        # Check if slug already exists
        existing = self._repo.get_by_slug(slug)
        if existing:
            raise ValueError(f"Tenant with slug '{slug}' already exists")
        
        # Create tenant
        tenant = Tenant(
            name=name,
            slug=slug,
            plan=plan,
            status=TenantStatus.TRIAL if plan == "trial" else TenantStatus.ACTIVE,
            contact_email=contact_email,
            trial_ends_at=datetime.utcnow() + timedelta(days=14) if plan == "trial" else None,
        )
        
        self._repo.save(tenant)
        logger.info(f"Tenant created: {tenant.tenant_id} - {tenant.name}")
        
        return tenant
    
    def get_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """Get tenant by ID."""
        return self._repo.get_by_id(tenant_id)
    
    def get_tenant_by_slug(self, slug: str) -> Optional[Tenant]:
        """Get tenant by slug."""
        return self._repo.get_by_slug(slug)
    
    def get_tenant_by_domain(self, domain: str) -> Optional[Tenant]:
        """Get tenant by domain."""
        return self._repo.get_by_domain(domain)
    
    def get_tenant_context(self, tenant_id: str) -> Optional[TenantContext]:
        """Get tenant context for request processing."""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return None
        
        return TenantContext(
            tenant_id=tenant.tenant_id,
            tenant_name=tenant.name,
            tenant_slug=tenant.slug,
            tenant_status=tenant.status,
            tenant_plan=tenant.plan,
        )
    
    def update_tenant_status(self, tenant_id: str, status: TenantStatus) -> Tenant:
        """Update tenant status."""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            raise ValueError(f"Tenant not found: {tenant_id}")
        
        tenant.status = status
        tenant.updated_at = datetime.utcnow()
        self._repo.save(tenant)
        
        logger.info(f"Tenant status updated: {tenant_id} -> {status}")
        return tenant
    
    def is_tenant_active(self, tenant_id: str) -> bool:
        """Check if tenant is active."""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return False
        return tenant.status == TenantStatus.ACTIVE

