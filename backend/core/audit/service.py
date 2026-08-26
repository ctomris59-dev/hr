"""
Audit Service - Business Logic for Audit Logging
"""
from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import Request
from contextvars import ContextVar

from core.audit.models import AuditEvent, AuditEventType, AuditSeverity
from core.audit.repository import AuditRepository
from core.logging_config import get_logger

logger = get_logger(__name__)

# Context variable for current request (set by middleware)
_current_request: ContextVar[Optional[Request]] = ContextVar("current_request", default=None)


class AuditService:
    """Service for audit logging."""
    
    def __init__(self, repository: Optional[AuditRepository] = None):
        self._repo = repository or AuditRepository()
    
    def log_event(
        self,
        event_type: AuditEventType,
        action: str,
        actor_id: Optional[str] = None,
        actor_name: Optional[str] = None,
        actor_role: Optional[str] = None,
        actor_department: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        target_name: Optional[str] = None,
        description: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        severity: AuditSeverity = AuditSeverity.MEDIUM,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> AuditEvent:
        """
        Log an audit event.
        
        This method is async-safe and can be called from background tasks.
        """
        # Get request context if available
        request = _current_request.get()
        request_id = None
        request_method = None
        request_path = None
        actor_ip = None
        
        if request:
            request_id = getattr(request.state, "request_id", None)
            request_method = request.method
            request_path = request.url.path
            actor_ip = request.client.host if request.client else None
        
        # Create audit event
        event = AuditEvent(
            event_type=event_type,
            severity=severity,
            timestamp=datetime.utcnow(),
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_department=actor_department,
            actor_ip=actor_ip,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            action=action,
            description=description,
            changes=changes,
            metadata=metadata,
            request_id=request_id,
            request_method=request_method,
            request_path=request_path,
            success=success,
            error_message=error_message,
        )
        
        # Save event (synchronous for now, can be made async later)
        try:
            self._repo.save(event)
            logger.debug(f"Audit event logged: {event_type} - {action}")
        except Exception as e:
            # Don't fail the main operation if audit logging fails
            logger.error(f"Failed to save audit event: {e}", exc_info=True)
        
        return event
    
    def log_login_success(
        self,
        username: str,
        user_id: Optional[str] = None,
        user_role: Optional[str] = None,
        user_department: Optional[str] = None,
    ) -> AuditEvent:
        """Log successful login."""
        return self.log_event(
            event_type=AuditEventType.LOGIN_SUCCESS,
            action="User logged in",
            actor_id=user_id,
            actor_name=username,
            actor_role=user_role,
            actor_department=user_department,
            severity=AuditSeverity.MEDIUM,
            success=True,
        )
    
    def log_login_failed(
        self,
        username: str,
        reason: Optional[str] = None,
    ) -> AuditEvent:
        """Log failed login attempt."""
        return self.log_event(
            event_type=AuditEventType.LOGIN_FAILED,
            action="Login attempt failed",
            actor_name=username,
            description=reason,
            severity=AuditSeverity.HIGH,
            success=False,
            error_message=reason,
        )
    
    def log_user_created(
        self,
        actor_id: str,
        actor_name: str,
        actor_role: str,
        target_username: str,
        target_user_id: Optional[str] = None,
    ) -> AuditEvent:
        """Log user creation."""
        return self.log_event(
            event_type=AuditEventType.USER_CREATED,
            action=f"User account created: {target_username}",
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            target_type="User",
            target_id=target_user_id,
            target_name=target_username,
            severity=AuditSeverity.HIGH,
            success=True,
        )
    
    def log_user_deleted(
        self,
        actor_id: str,
        actor_name: str,
        actor_role: str,
        target_username: str,
        target_user_id: Optional[str] = None,
    ) -> AuditEvent:
        """Log user deletion."""
        return self.log_event(
            event_type=AuditEventType.USER_DELETED,
            action=f"User account deleted: {target_username}",
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            target_type="User",
            target_id=target_user_id,
            target_name=target_username,
            severity=AuditSeverity.HIGH,
            success=True,
        )
    
    def log_leave_approved(
        self,
        actor_id: str,
        actor_name: str,
        actor_role: str,
        leave_request_id: str,
        employee_name: str,
    ) -> AuditEvent:
        """Log leave request approval."""
        return self.log_event(
            event_type=AuditEventType.LEAVE_REQUEST_APPROVED,
            action=f"Leave request approved for {employee_name}",
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            target_type="LeaveRequest",
            target_id=leave_request_id,
            target_name=employee_name,
            severity=AuditSeverity.MEDIUM,
            success=True,
        )
    
    def log_employee_created(
        self,
        actor_id: str,
        actor_name: str,
        actor_role: str,
        employee_name: str,
        employee_id: Optional[str] = None,
    ) -> AuditEvent:
        """Log employee creation."""
        return self.log_event(
            event_type=AuditEventType.EMPLOYEE_CREATED,
            action=f"Employee created: {employee_name}",
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            target_type="Employee",
            target_id=employee_id,
            target_name=employee_name,
            severity=AuditSeverity.MEDIUM,
            success=True,
        )
    
    def log_employee_updated(
        self,
        actor_id: str,
        actor_name: str,
        actor_role: str,
        employee_name: str,
        employee_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        """Log employee update."""
        return self.log_event(
            event_type=AuditEventType.EMPLOYEE_UPDATED,
            action=f"Employee updated: {employee_name}",
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            target_type="Employee",
            target_id=employee_id,
            target_name=employee_name,
            changes=changes,
            severity=AuditSeverity.MEDIUM,
            success=True,
        )


# Global audit service instance
_audit_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    """Get global audit service instance."""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService()
    return _audit_service


def set_request_context(request: Request) -> None:
    """Set current request context for audit logging."""
    _current_request.set(request)


def audit_event(
    event_type: AuditEventType,
    action: str,
    **kwargs
) -> AuditEvent:
    """
    Convenience function to log audit event.
    Can be used as decorator or direct call.
    """
    service = get_audit_service()
    return service.log_event(event_type=event_type, action=action, **kwargs)

