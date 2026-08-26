"""
Audit Middleware - Automatic Request Tracking
Tracks all HTTP requests for audit purposes.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Callable

from core.audit.service import set_request_context, get_audit_service
from core.audit.models import AuditEventType, AuditSeverity
from core.logging_config import get_logger

logger = get_logger(__name__)


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically track requests for audit.
    
    This middleware:
    - Sets request context for audit service
    - Optionally logs all requests (can be disabled for performance)
    - Tracks unauthorized access attempts
    """
    
    def __init__(self, app, track_all_requests: bool = False):
        """
        Initialize audit middleware.
        
        Args:
            app: FastAPI application
            track_all_requests: If True, logs all requests. If False, only logs important ones.
        """
        super().__init__(app)
        self.track_all_requests = track_all_requests
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and track for audit."""
        # Set request context for audit service
        set_request_context(request)
        
        # Process request
        response = await call_next(request)
        
        # Track unauthorized access (403, 401)
        if response.status_code in [401, 403]:
            try:
                audit_service = get_audit_service()
                actor_name = request.headers.get("x-user-name") or "Unknown"
                actor_role = request.headers.get("x-user-role") or "Unknown"
                
                audit_service.log_event(
                    event_type=AuditEventType.UNAUTHORIZED_ACCESS,
                    action=f"Unauthorized access attempt: {request.method} {request.url.path}",
                    actor_name=actor_name,
                    actor_role=actor_role,
                    severity=AuditSeverity.HIGH,
                    success=False,
                    error_message=f"HTTP {response.status_code}",
                )
            except Exception as e:
                # Don't fail request if audit logging fails
                logger.error(f"Failed to log unauthorized access: {e}")
        
        # Track all requests if enabled (for debugging/compliance)
        elif self.track_all_requests and request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            try:
                audit_service = get_audit_service()
                actor_name = request.headers.get("x-user-name") or "System"
                actor_role = request.headers.get("x-user-role") or "Unknown"
                
                audit_service.log_event(
                    event_type=AuditEventType.CONFIG_UPDATED,  # Generic type
                    action=f"{request.method} {request.url.path}",
                    actor_name=actor_name,
                    actor_role=actor_role,
                    severity=AuditSeverity.LOW,
                    success=response.status_code < 400,
                )
            except Exception as e:
                logger.error(f"Failed to log request: {e}")
        
        return response

