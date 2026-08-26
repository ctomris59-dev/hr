"""
Multi-Tenant Domain Models
"""
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid


class TenantStatus(str, Enum):
    """Tenant status."""
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    TRIAL = "TRIAL"
    EXPIRED = "EXPIRED"
    DELETED = "DELETED"


class Tenant(BaseModel):
    """Tenant model."""
    
    tenant_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Company name
    slug: str  # URL-friendly identifier (e.g., "acme-corp")
    domain: Optional[str] = None  # Custom domain (e.g., "acme.hrsystem.com")
    
    # Status
    status: TenantStatus = TenantStatus.TRIAL
    
    # Subscription
    plan: str = "trial"  # trial, basic, premium, enterprise
    max_users: int = 10
    max_employees: int = 100
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    trial_ends_at: Optional[datetime] = None
    
    # Settings
    settings: Dict[str, Any] = Field(default_factory=dict)
    
    # Contact
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    
    class Config:
        use_enum_values = True


class TenantContext(BaseModel):
    """Tenant context for request processing."""
    
    tenant_id: str
    tenant_name: str
    tenant_slug: str
    tenant_status: TenantStatus
    tenant_plan: str
    
    class Config:
        use_enum_values = True

