"""
Audit Event Models
Immutable audit events for compliance and security tracking.
"""
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid


class AuditEventType(str, Enum):
    """Types of audit events."""
    
    # Authentication & Authorization
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    PASSWORD_RESET = "PASSWORD_RESET"
    
    # User Management
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
    USER_PERMISSION_CHANGED = "USER_PERMISSION_CHANGED"
    
    # Organization
    EMPLOYEE_CREATED = "EMPLOYEE_CREATED"
    EMPLOYEE_UPDATED = "EMPLOYEE_UPDATED"
    EMPLOYEE_DELETED = "EMPLOYEE_DELETED"
    EMPLOYEE_TRANSFERRED = "EMPLOYEE_TRANSFERRED"
    DEPARTMENT_CREATED = "DEPARTMENT_CREATED"
    DEPARTMENT_UPDATED = "DEPARTMENT_UPDATED"
    DEPARTMENT_DELETED = "DEPARTMENT_DELETED"
    
    # Recruitment
    CANDIDATE_CREATED = "CANDIDATE_CREATED"
    CANDIDATE_UPDATED = "CANDIDATE_UPDATED"
    CANDIDATE_DELETED = "CANDIDATE_DELETED"
    TEST_SUBMITTED = "TEST_SUBMITTED"
    CANDIDATE_APPROVED = "CANDIDATE_APPROVED"
    CANDIDATE_REJECTED = "CANDIDATE_REJECTED"
    
    # Performance
    EVALUATION_CREATED = "EVALUATION_CREATED"
    EVALUATION_UPDATED = "EVALUATION_UPDATED"
    EVALUATION_DELETED = "EVALUATION_DELETED"
    
    # Leave & Attendance
    LEAVE_REQUEST_CREATED = "LEAVE_REQUEST_CREATED"
    LEAVE_REQUEST_APPROVED = "LEAVE_REQUEST_APPROVED"
    LEAVE_REQUEST_REJECTED = "LEAVE_REQUEST_REJECTED"
    LEAVE_REQUEST_CANCELLED = "LEAVE_REQUEST_CANCELLED"
    
    # Budget & Compensation
    SALARY_UPDATED = "SALARY_UPDATED"
    BUDGET_APPROVED = "BUDGET_APPROVED"
    BUDGET_REJECTED = "BUDGET_REJECTED"
    
    # Data Management
    DATA_EXPORTED = "DATA_EXPORTED"
    DATA_IMPORTED = "DATA_IMPORTED"
    DATA_DELETED = "DATA_DELETED"
    DATA_CLEARED = "DATA_CLEARED"
    
    # Configuration
    CONFIG_UPDATED = "CONFIG_UPDATED"
    ROLE_UPDATED = "ROLE_UPDATED"
    PERMISSION_UPDATED = "PERMISSION_UPDATED"
    
    # System
    SYSTEM_ERROR = "SYSTEM_ERROR"
    SECURITY_VIOLATION = "SECURITY_VIOLATION"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""
    LOW = "LOW"           # Informational events
    MEDIUM = "MEDIUM"     # Important business events
    HIGH = "HIGH"         # Critical business events
    CRITICAL = "CRITICAL" # Security violations, data breaches


class AuditEvent(BaseModel):
    """
    Immutable audit event model.
    Once created, should never be modified.
    """
    
    # Unique identifier
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Event metadata
    event_type: AuditEventType
    severity: AuditSeverity = AuditSeverity.MEDIUM
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Actor information
    actor_id: Optional[str] = None  # User ID or system
    actor_name: Optional[str] = None  # User name
    actor_role: Optional[str] = None  # User role
    actor_department: Optional[str] = None  # User department
    actor_ip: Optional[str] = None  # IP address
    
    # Target information
    target_type: Optional[str] = None  # Entity type (e.g., "Employee", "User")
    target_id: Optional[str] = None  # Entity ID
    target_name: Optional[str] = None  # Entity name
    
    # Event details
    action: str  # Human-readable action description
    description: Optional[str] = None  # Detailed description
    changes: Optional[Dict[str, Any]] = None  # Before/after changes (for updates)
    metadata: Optional[Dict[str, Any]] = None  # Additional context
    
    # Request context
    request_id: Optional[str] = None  # Request ID from middleware
    request_method: Optional[str] = None  # HTTP method
    request_path: Optional[str] = None  # Request path
    
    # Result
    success: bool = True  # Whether the action succeeded
    error_message: Optional[str] = None  # Error message if failed
    
    class Config:
        frozen = True  # Immutable model
        use_enum_values = True


class AuditEventFilter(BaseModel):
    """Filter model for querying audit events."""
    
    event_types: Optional[list[AuditEventType]] = None
    severity: Optional[list[AuditSeverity]] = None
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    success: Optional[bool] = None
    limit: int = 100
    offset: int = 0

