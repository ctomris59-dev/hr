from fastapi import Depends, Header, HTTPException
from typing import Optional
from urllib.parse import unquote

from core.config import get_settings



def _decode_header(value: Optional[str]) -> str:
    """Decode percent-encoded UTF-8 header values sent by the frontend proxy."""
    if not value:
        return ""
    try:
        return unquote(value)
    except Exception:
        return value

try:
    from services.hierarchy_service import can_access_recruitment
except ImportError:
    def can_access_recruitment(user_role, user_dept): return user_role in ["CEO", "IK"] or (user_role == "DIRECTOR" and "İnsan Kaynakları" in user_dept) or (user_role == "MANAGER" and "İnsan Kaynakları" in user_dept)


async def get_current_user_role(x_user_role: Optional[str] = Header(None)) -> str:
    """
    Get current user role from header.
    In development mode, ALWAYS returns "CEO" (bypass auth completely).
    """
    settings = get_settings()
    # Development mode: COMPLETE BYPASS - always return CEO, ignore headers
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return "CEO"  # Always CEO in dev, ignore header
    return _decode_header(x_user_role) or "EMPLOYEE"


async def get_current_user_dept(x_user_dept: Optional[str] = Header(None)) -> str:
    """
    Get current user department from header.
    In development mode, ALWAYS returns "Yönetim" (bypass auth completely).
    """
    settings = get_settings()
    # Development mode: COMPLETE BYPASS - always return Yönetim, ignore header
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return "Yönetim"  # Always Yönetim in dev, ignore header
    return _decode_header(x_user_dept)


async def get_current_user_name(x_user_name: Optional[str] = Header(None)) -> str:
    """
    Get current user name from header.
    In development mode, ALWAYS returns "Development User" (bypass auth completely).
    """
    settings = get_settings()
    # Development mode: COMPLETE BYPASS - always return Development User, ignore header
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return "Development User"  # Always Development User in dev, ignore header
    return _decode_header(x_user_name)


async def get_current_tenant_id() -> str:
    """
    Get current tenant ID from context.
    Raises error if tenant context not set.
    """
    from core.tenant_context import get_tenant_id
    tenant_id = get_tenant_id()
    if not tenant_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Tenant ID not found in request context"
        )
    return tenant_id


async def get_current_tenant_context():
    """
    Get current tenant context.
    Raises error if tenant context not set.
    """
    from core.tenant_context import get_tenant_context
    from fastapi import HTTPException
    context = get_tenant_context()
    if not context:
        raise HTTPException(
            status_code=400,
            detail="Tenant context not found in request"
        )
    return context


async def require_role_ceo(role: str = Depends(get_current_user_role)) -> None:
    """Require CEO role. Bypassed in development mode."""
    settings = get_settings()
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return  # Bypass in development
    if role != "CEO":
        raise HTTPException(status_code=403, detail="Yasak")


async def require_role_director(role: str = Depends(get_current_user_role)) -> None:
    """Require Director role. Bypassed in development mode."""
    settings = get_settings()
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return  # Bypass in development
    if role not in ["DIRECTOR", "Direktör", "IK"]:
        raise HTTPException(status_code=403, detail="Yasak")


async def require_non_employee(role: str = Depends(get_current_user_role)) -> None:
    """Require non-employee role. Bypassed in development mode."""
    settings = get_settings()
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return  # Bypass in development - allow all roles
    if role in ["EMPLOYEE", "PERSONEL"]:
        raise HTTPException(status_code=403, detail="Yasak")


async def require_recruitment_access(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept)
) -> None:
    """Require recruitment access. Bypassed in development mode."""
    settings = get_settings()
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return  # Bypass in development
    if not can_access_recruitment(role, dept):
        raise HTTPException(
            status_code=403,
            detail="Access denied. Only CEO, HR Director, and HR Manager can access recruitment data."
        )


async def require_budget_access(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept)
) -> None:
    """Require budget access. Bypassed in development mode."""
    settings = get_settings()
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return  # Bypass in development
    if role in ["CEO", "DIRECTOR", "Direktör"]:
        return
    if role == "MANAGER":
        from services.budget_service import department_has_director
        if dept and department_has_director(dept):
            raise HTTPException(status_code=403, detail="Departmanda direktör olduğu için müdür yetkisi yok")
        return
    raise HTTPException(status_code=403, detail="Bu sayfaya sadece departmanların en üst amirleri ve CEO erişebilir")
