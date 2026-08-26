"""
Workflow API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from domain.workflow.service import WorkflowService
from domain.workflow.models import (
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowCreateRequest,
    ApprovalRequest,
    ApprovalAction,
    WorkflowStatus,
)
from routers.dependencies import get_current_user_role, get_current_user_name, get_current_user_dept
from core.response import success_response, error_response

router = APIRouter()


@router.post("/api/workflow/definitions")
async def create_workflow_definition(
    definition: WorkflowDefinition,
    role: str = Depends(get_current_user_role),
):
    """Create a workflow definition (CEO only)."""
    from core.config import get_settings
    settings = get_settings()
    # Development mode: bypass role check
    if settings.ENVIRONMENT != "development" and settings.APP_ENV != "development":
        if role not in ["CEO", "IK"]:
            return error_response(
                error="Only CEO/IK can create workflow definitions",
                error_code="UNAUTHORIZED",
                status_code=403
            )
    
    try:
        service = WorkflowService()
        result = service.create_definition(definition)
        return success_response(data=result.model_dump())
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )


@router.get("/api/workflow/definitions")
async def list_workflow_definitions(
    role: str = Depends(get_current_user_role),
):
    """List all workflow definitions."""
    try:
        service = WorkflowService()
        definitions = service._repo.list_definitions()
        return success_response(data=[d.model_dump() for d in definitions])
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )


@router.get("/api/workflow/definitions/{workflow_id}")
async def get_workflow_definition(
    workflow_id: str,
    role: str = Depends(get_current_user_role),
):
    """Get workflow definition by ID."""
    try:
        service = WorkflowService()
        definition = service.get_definition(workflow_id)
        if not definition:
            return error_response(
                error="Workflow definition not found",
                error_code="NOT_FOUND",
                status_code=404
            )
        return success_response(data=definition.model_dump())
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )


@router.post("/api/workflow/instances")
async def create_workflow_instance(
    request: WorkflowCreateRequest,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name),
    dept: str = Depends(get_current_user_dept),
):
    """Create a workflow instance."""
    try:
        # Set requester info if not provided
        if not request.requester_id:
            request.requester_id = name
        if not request.requester_name:
            request.requester_name = name
        if not request.requester_role:
            request.requester_role = role
        if not request.requester_department:
            request.requester_department = dept
        
        service = WorkflowService()
        instance = service.create_instance(request)
        return success_response(data=instance.model_dump())
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )


@router.post("/api/workflow/instances/{instance_id}/approve")
async def approve_workflow_step(
    instance_id: str,
    step_id: str,
    action: ApprovalAction,
    comments: Optional[str] = None,
    delegate_to_id: Optional[str] = None,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name),
):
    """Approve/reject a workflow step."""
    try:
        approval_request = ApprovalRequest(
            instance_id=instance_id,
            step_id=step_id,
            action=action,
            approver_id=name,  # Using name as ID for now
            approver_name=name,
            approver_role=role,
            comments=comments,
            delegate_to_id=delegate_to_id,
        )
        
        service = WorkflowService()
        instance = service.approve_step(approval_request)
        return success_response(data=instance.model_dump())
    except ValueError as e:
        return error_response(
            error=str(e),
            error_code="VALIDATION_ERROR",
            status_code=400
        )
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )


@router.get("/api/workflow/instances/pending")
async def get_pending_approvals(
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name),
):
    """Get pending approvals for current user."""
    try:
        service = WorkflowService()
        pending = service.get_pending_approvals(name)  # Using name as ID
        return success_response(data=[inst.model_dump() for inst in pending])
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )


@router.get("/api/workflow/instances")
async def list_workflow_instances(
    entity_type: Optional[str] = None,
    status: Optional[WorkflowStatus] = None,
    role: str = Depends(get_current_user_role),
):
    """List workflow instances with filters."""
    try:
        service = WorkflowService()
        instances = service._repo.list_instances(
            entity_type=entity_type,
            status=status,
        )
        return success_response(data=[inst.model_dump() for inst in instances])
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )


@router.get("/api/workflow/instances/{instance_id}")
async def get_workflow_instance(
    instance_id: str,
    role: str = Depends(get_current_user_role),
):
    """Get workflow instance by ID."""
    try:
        service = WorkflowService()
        instance = service._repo.get_instance(instance_id)
        if not instance:
            return error_response(
                error="Workflow instance not found",
                error_code="NOT_FOUND",
                status_code=404
            )
        return success_response(data=instance.model_dump())
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )


@router.post("/api/workflow/instances/{instance_id}/cancel")
async def cancel_workflow_instance(
    instance_id: str,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name),
):
    """Cancel a workflow instance."""
    try:
        service = WorkflowService()
        instance = service.cancel_instance(instance_id, name)  # Using name as ID
        return success_response(data=instance.model_dump())
    except ValueError as e:
        return error_response(
            error=str(e),
            error_code="VALIDATION_ERROR",
            status_code=400
        )
    except Exception as e:
        return error_response(
            error=str(e),
            error_code="WORKFLOW_ERROR",
            status_code=500
        )

