"""
Tenant Context Management
Thread-local storage for tenant context in request processing.
"""
from contextvars import ContextVar
from typing import Optional
from domain.tenant.models import TenantContext

# Context variable for current tenant
_current_tenant: ContextVar[Optional[TenantContext]] = ContextVar("current_tenant", default=None)


def set_tenant_context(tenant_context: TenantContext) -> None:
    """Set current tenant context."""
    _current_tenant.set(tenant_context)


def get_tenant_context() -> Optional[TenantContext]:
    """Get current tenant context."""
    return _current_tenant.get()


def get_tenant_id() -> Optional[str]:
    """Get current tenant ID."""
    context = get_tenant_context()
    return context.tenant_id if context else None


def clear_tenant_context() -> None:
    """Clear current tenant context."""
    _current_tenant.set(None)

