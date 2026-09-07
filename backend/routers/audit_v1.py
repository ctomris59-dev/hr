"""Secure audit-integrity evidence endpoint."""
from fastapi import APIRouter, Depends

from core.audit.repository import AuditRepository
from core.auth import Principal, require_roles
from core.database import database_configured

router = APIRouter(prefix="/api/v1/audit", tags=["SaaS Audit"])


@router.get("/integrity")
def audit_integrity(principal: Principal = Depends(require_roles("CEO", "IK", "HR_ADMIN"))):
    repository = AuditRepository()
    chain_valid = repository.verify_chain()
    return {
        "success": chain_valid,
        "tenant_id": principal.tenant_id,
        "storage": "database" if database_configured() else "demo-json",
        "append_only": database_configured(),
        "tamper_evident": database_configured(),
        "integrity": "valid" if chain_valid else "failed",
        "enforcement": "postgres-trigger+sha256-chain" if database_configured() else "application-append-only-demo",
    }
