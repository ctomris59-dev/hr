"""
Audit Log API Endpoints
Provides access to audit logs for compliance and security monitoring.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from core.audit.service import get_audit_service
from core.audit.repository import AuditRepository
from core.audit.models import AuditEvent, AuditEventFilter, AuditEventType, AuditSeverity
from routers.dependencies import get_current_user_role, require_role_ceo
from core.response import success_response, error_response

router = APIRouter()


class AuditEventResponse(BaseModel):
    """Audit event response model."""
    id: str
    event_type: str
    severity: str
    timestamp: str
    actor_name: Optional[str]
    actor_role: Optional[str]
    target_type: Optional[str]
    target_name: Optional[str]
    action: str
    description: Optional[str]
    success: bool


class AuditLogQueryParams(BaseModel):
    """Query parameters for audit log filtering."""
    event_types: Optional[List[str]] = None
    severity: Optional[List[str]] = None
    actor_name: Optional[str] = None
    target_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    success: Optional[bool] = None
    limit: int = 100
    offset: int = 0


@router.get("/api/audit/logs", dependencies=[Depends(require_role_ceo)])
async def get_audit_logs(
    event_types: Optional[str] = Query(None, description="Comma-separated event types"),
    severity: Optional[str] = Query(None, description="Comma-separated severity levels"),
    actor_name: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None, description="ISO format: YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="ISO format: YYYY-MM-DD"),
    success: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    role: str = Depends(get_current_user_role),
):
    """
    Get audit logs with filtering.
    Only CEO can access audit logs.
    """
    try:
        # Parse event types
        event_type_list = None
        if event_types:
            try:
                event_type_list = [AuditEventType(et.strip()) for et in event_types.split(",")]
            except ValueError:
                return error_response(
                    error="Invalid event type",
                    error_code="INVALID_EVENT_TYPE",
                    status_code=400
                )
        
        # Parse severity
        severity_list = None
        if severity:
            try:
                severity_list = [AuditSeverity(s.strip()) for s in severity.split(",")]
            except ValueError:
                return error_response(
                    error="Invalid severity level",
                    error_code="INVALID_SEVERITY",
                    status_code=400
                )
        
        # Parse dates
        start_dt = None
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
            except ValueError:
                return error_response(
                    error="Invalid start_date format. Use ISO format: YYYY-MM-DD",
                    error_code="INVALID_DATE",
                    status_code=400
                )
        
        end_dt = None
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
            except ValueError:
                return error_response(
                    error="Invalid end_date format. Use ISO format: YYYY-MM-DD",
                    error_code="INVALID_DATE",
                    status_code=400
                )
        
        # Create filter
        filter_obj = AuditEventFilter(
            event_types=event_type_list,
            severity=severity_list,
            actor_name=actor_name,
            target_type=target_type,
            start_date=start_dt,
            end_date=end_dt,
            success=success,
            limit=limit,
            offset=offset,
        )
        
        # Get audit events
        repository = AuditRepository()
        events = repository.find_all(filter_obj)
        total_count = repository.count(filter_obj)
        
        # Convert to response format
        event_responses = [
            {
                "id": event.id,
                "event_type": event.event_type,
                "severity": event.severity,
                "timestamp": event.timestamp.isoformat(),
                "actor_name": event.actor_name,
                "actor_role": event.actor_role,
                "target_type": event.target_type,
                "target_name": event.target_name,
                "action": event.action,
                "description": event.description,
                "success": event.success,
                "actor_ip": event.actor_ip,
                "request_method": event.request_method,
                "request_path": event.request_path,
            }
            for event in events
        ]
        
        return success_response(
            data=event_responses,
            meta={
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total_count,
            }
        )
    
    except Exception as e:
        return error_response(
            error=f"Failed to retrieve audit logs: {str(e)}",
            error_code="AUDIT_LOG_ERROR",
            status_code=500
        )


@router.get("/api/audit/logs/{event_id}", dependencies=[Depends(require_role_ceo)])
async def get_audit_event(
    event_id: str,
    role: str = Depends(get_current_user_role),
):
    """Get specific audit event by ID."""
    try:
        repository = AuditRepository()
        event = repository.get_by_id(event_id)
        
        if not event:
            return error_response(
                error="Audit event not found",
                error_code="NOT_FOUND",
                status_code=404
            )
        
        return success_response(data=event.model_dump())
    
    except Exception as e:
        return error_response(
            error=f"Failed to retrieve audit event: {str(e)}",
            error_code="AUDIT_LOG_ERROR",
            status_code=500
        )


@router.get("/api/audit/stats", dependencies=[Depends(require_role_ceo)])
async def get_audit_stats(
    start_date: Optional[str] = Query(None, description="ISO format: YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="ISO format: YYYY-MM-DD"),
    role: str = Depends(get_current_user_role),
):
    """Get audit log statistics."""
    try:
        repository = AuditRepository()
        
        # Parse dates
        start_dt = None
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
        
        end_dt = None
        if end_date:
            end_dt = datetime.fromisoformat(end_date)
        
        # Get all events in date range
        filter_obj = AuditEventFilter(
            start_date=start_dt,
            end_date=end_dt,
            limit=10000,  # Large limit for stats
        )
        events = repository.find_all(filter_obj)
        
        # Calculate statistics
        stats = {
            "total_events": len(events),
            "by_event_type": {},
            "by_severity": {},
            "by_actor": {},
            "success_rate": 0,
            "failed_events": 0,
        }
        
        successful = 0
        for event in events:
            # By event type
            stats["by_event_type"][event.event_type] = stats["by_event_type"].get(event.event_type, 0) + 1
            
            # By severity
            stats["by_severity"][event.severity] = stats["by_severity"].get(event.severity, 0) + 1
            
            # By actor
            if event.actor_name:
                stats["by_actor"][event.actor_name] = stats["by_actor"].get(event.actor_name, 0) + 1
            
            # Success rate
            if event.success:
                successful += 1
            else:
                stats["failed_events"] += 1
        
        if len(events) > 0:
            stats["success_rate"] = round((successful / len(events)) * 100, 2)
        
        return success_response(data=stats)
    
    except Exception as e:
        return error_response(
            error=f"Failed to retrieve audit stats: {str(e)}",
            error_code="AUDIT_STATS_ERROR",
            status_code=500
        )

