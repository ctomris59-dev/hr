"""
Tenant Middleware - Extracts and validates tenant from request
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional

from domain.tenant.service import TenantService
from core.tenant_context import set_tenant_context, get_tenant_context
from core.logging_config import get_logger

logger = get_logger(__name__)


def extract_tenant_id(request: Request) -> Optional[str]:
    """
    Extract tenant ID from request.
    
    Priority:
    1. Subdomain (e.g., acme.hrsystem.com)
    2. Header (X-Tenant-ID or X-Tenant-Slug)
    3. Path parameter (future)
    """
    # 1. Try subdomain
    host = request.headers.get("host", "")
    if "." in host:
        subdomain = host.split(".")[0]
        if subdomain and subdomain != "www" and subdomain != "api":
            tenant_service = TenantService()
            tenant = tenant_service.get_tenant_by_slug(subdomain)
            if tenant:
                return tenant.tenant_id
    
    # 2. Try header (X-Tenant-ID)
    tenant_id = request.headers.get("x-tenant-id")
    if tenant_id:
        return tenant_id
    
    # 3. Try header (X-Tenant-Slug)
    tenant_slug = request.headers.get("x-tenant-slug")
    if tenant_slug:
        tenant_service = TenantService()
        tenant = tenant_service.get_tenant_by_slug(tenant_slug)
        if tenant:
            return tenant.tenant_id
    
    return None


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to extract and validate tenant from request.
    Sets tenant context for request processing.
    """
    
    def __init__(self, app, require_tenant: bool = True):
        """
        Initialize tenant middleware.
        
        Args:
            app: FastAPI application
            require_tenant: If True, raises error if tenant not found. If False, allows requests without tenant.
        """
        super().__init__(app)
        self.require_tenant = require_tenant
        self._tenant_service = TenantService()
    
    async def dispatch(self, request: Request, call_next):
        """Process request with tenant context."""
        # Skip tenant validation for health checks and public endpoints
        if request.url.path in ["/health", "/health/live", "/health/ready"]:
            return await call_next(request)
        
        # Extract tenant ID
        tenant_id = extract_tenant_id(request)
        
        if not tenant_id:
            if self.require_tenant:
                logger.warning(f"Tenant not found in request: {request.url.path}")
                raise HTTPException(
                    status_code=400,
                    detail="Tenant ID required. Provide via subdomain or X-Tenant-ID header."
                )
            else:
                # Allow request without tenant (for public endpoints)
                return await call_next(request)
        
        # Validate tenant exists and is active
        tenant = self._tenant_service.get_tenant(tenant_id)
        if not tenant:
            logger.warning(f"Tenant not found: {tenant_id}")
            raise HTTPException(
                status_code=404,
                detail="Tenant not found"
            )
        
        if tenant.status != "ACTIVE":
            logger.warning(f"Tenant not active: {tenant_id}, status: {tenant.status}")
            raise HTTPException(
                status_code=403,
                detail=f"Tenant is {tenant.status.lower()}"
            )
        
        # Set tenant context
        tenant_context = self._tenant_service.get_tenant_context(tenant_id)
        if tenant_context:
            set_tenant_context(tenant_context)
            logger.debug(f"Tenant context set: {tenant_id}")
        
        # Process request
        try:
            response = await call_next(request)
            return response
        finally:
            # Clear tenant context (optional, contextvars auto-clear)
            pass

