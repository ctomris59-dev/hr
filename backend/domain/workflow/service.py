"""
Workflow Service - Business Logic for Approval Workflows
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from domain.workflow.models import (
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowStep,
    WorkflowStatus,
    StepStatus,
    ApprovalAction,
    ApprovalRequest,
    WorkflowCreateRequest,
    ApprovalRule,
    ApprovalRuleType,
)
from domain.workflow.repository import WorkflowRepository
from core.logging_config import get_logger

logger = get_logger(__name__)


class WorkflowService:
    """Service for managing approval workflows."""
    
    def __init__(self, repository: Optional[WorkflowRepository] = None):
        self._repo = repository or WorkflowRepository()
    
    # ========== Workflow Definition Management ==========
    
    def create_definition(self, definition: WorkflowDefinition) -> WorkflowDefinition:
        """Create a new workflow definition."""
        self._repo.save_definition(definition)
        logger.info(f"Workflow definition created: {definition.workflow_id} - {definition.name}")
        return definition
    
    def get_definition(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """Get workflow definition."""
        return self._repo.get_definition(workflow_id)
    
    def get_definition_for_entity(self, entity_type: str) -> Optional[WorkflowDefinition]:
        """Get active workflow definition for entity type."""
        return self._repo.get_definition_by_entity_type(entity_type)
    
    # ========== Workflow Instance Management ==========
    
    def create_instance(self, request: WorkflowCreateRequest) -> WorkflowInstance:
        """
        Create a new workflow instance.
        
        Steps:
        1. Get workflow definition
        2. Clone steps from definition
        3. Determine approvers for each step
        4. Create instance
        """
        # Get workflow definition
        definition = self._repo.get_definition(request.workflow_id)
        if not definition:
            raise ValueError(f"Workflow definition not found: {request.workflow_id}")
        
        if not definition.is_active:
            raise ValueError(f"Workflow definition is not active: {request.workflow_id}")
        
        # Clone steps
        steps = []
        for step_def in definition.steps:
            step = WorkflowStep(**step_def.model_dump())
            step.status = StepStatus.PENDING
            
            # Determine approver for this step
            approver = self._determine_approver(step, request)
            if approver:
                step.approver_id = approver.get("id")
                step.approver_name = approver.get("name")
            
            steps.append(step)
        
        # Create instance
        instance = WorkflowInstance(
            workflow_id=request.workflow_id,
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            requester_id=request.requester_id,
            requester_name=request.requester_name,
            requester_role=request.requester_role,
            requester_department=request.requester_department,
            context=request.context,
            steps=steps,
            status=WorkflowStatus.PENDING,
            current_step_index=0,
            started_at=datetime.utcnow(),
        )
        
        self._repo.save_instance(instance)
        logger.info(f"Workflow instance created: {instance.instance_id} for {request.entity_type}:{request.entity_id}")
        
        return instance
    
    def approve_step(self, request: ApprovalRequest) -> WorkflowInstance:
        """
        Approve or reject a workflow step.
        
        Steps:
        1. Get instance
        2. Validate approver
        3. Update step status
        4. Move to next step or complete workflow
        """
        instance = self._repo.get_instance(request.instance_id)
        if not instance:
            raise ValueError(f"Workflow instance not found: {request.instance_id}")
        
        # Find step
        step = None
        step_index = None
        for i, s in enumerate(instance.steps):
            if s.step_id == request.step_id:
                step = s
                step_index = i
                break
        
        if not step:
            raise ValueError(f"Step not found: {request.step_id}")
        
        # Validate approver
        if step.approver_id != request.approver_id:
            raise ValueError(f"Approver mismatch. Expected: {step.approver_id}, Got: {request.approver_id}")
        
        # Update step
        if request.action == ApprovalAction.APPROVE:
            step.status = StepStatus.APPROVED
            step.approved_at = datetime.utcnow()
            step.comments = request.comments
        elif request.action == ApprovalAction.REJECT:
            step.status = StepStatus.REJECTED
            step.rejected_at = datetime.utcnow()
            step.comments = request.comments
            instance.status = WorkflowStatus.REJECTED
            instance.rejection_reason = request.comments
            instance.completed_at = datetime.utcnow()
        elif request.action == ApprovalAction.REQUEST_CHANGES:
            # Reset step to pending (requester needs to resubmit)
            step.status = StepStatus.PENDING
            step.comments = request.comments
        elif request.action == ApprovalAction.DELEGATE:
            # Delegate to another approver
            if request.delegate_to_id:
                step.approver_id = request.delegate_to_id
                step.status = StepStatus.PENDING
                step.comments = f"Delegated to {request.delegate_to_id}: {request.comments}"
            else:
                raise ValueError("delegate_to_id required for DELEGATE action")
        
        # Update instance
        instance.steps[step_index] = step
        
        # Check if workflow is complete
        if request.action == ApprovalAction.APPROVE:
            self._advance_workflow(instance)
        
        self._repo.save_instance(instance)
        logger.info(f"Workflow step {request.action}: {request.step_id} by {request.approver_name}")
        
        return instance
    
    def _advance_workflow(self, instance: WorkflowInstance) -> None:
        """Advance workflow to next step or complete."""
        definition = self._repo.get_definition(instance.workflow_id)
        if not definition:
            return
        
        # Check if all required steps are approved
        all_approved = all(
            s.status == StepStatus.APPROVED or (not s.is_required and s.status == StepStatus.SKIPPED)
            for s in instance.steps
        )
        
        if all_approved:
            instance.status = WorkflowStatus.APPROVED
            instance.completed_at = datetime.utcnow()
            # Set final approver (last approver)
            last_approved_step = None
            for step in reversed(instance.steps):
                if step.status == StepStatus.APPROVED:
                    last_approved_step = step
                    break
            if last_approved_step:
                instance.final_approver_id = last_approved_step.approver_id
                instance.final_approver_name = last_approved_step.approver_name
        else:
            # Move to next pending step
            instance.status = WorkflowStatus.IN_PROGRESS
            for i, step in enumerate(instance.steps):
                if step.status == StepStatus.PENDING:
                    instance.current_step_index = i
                    break
    
    def _determine_approver(self, step: WorkflowStep, request: WorkflowCreateRequest) -> Optional[Dict[str, str]]:
        """
        Determine approver for a step based on rules.
        
        This is a simplified version. In production, this would:
        - Query org chart to find managers
        - Query user database to find users by role/department
        - Evaluate custom conditions
        """
        # For MVP: Simple rule evaluation
        for rule in step.approver_rules:
            if rule.rule_type == ApprovalRuleType.HIERARCHY_BASED:
                # Find manager of requester
                # TODO: Query org chart
                return {"id": "manager_id", "name": "Manager Name"}
            
            elif rule.rule_type == ApprovalRuleType.ROLE_BASED:
                # Find user with specific role
                # TODO: Query user database
                return {"id": f"user_{rule.value}", "name": f"{rule.value} User"}
            
            elif rule.rule_type == ApprovalRuleType.DEPARTMENT_BASED:
                # Find user in specific department
                # TODO: Query user database
                return {"id": f"dept_{rule.value}", "name": f"{rule.value} Manager"}
            
            elif rule.rule_type == ApprovalRuleType.THRESHOLD_BASED:
                # Check if threshold is met
                threshold_value = rule.value
                context_value = request.context.get(rule.condition or "value", 0)
                if context_value > threshold_value:
                    # Threshold exceeded, need approval
                    # TODO: Determine approver based on threshold
                    return {"id": "threshold_approver", "name": "Threshold Approver"}
                else:
                    # Threshold not met, skip step
                    return None
        
        return None
    
    def get_pending_approvals(self, approver_id: str) -> List[WorkflowInstance]:
        """Get pending approvals for an approver."""
        instances = self._repo.list_instances(status=WorkflowStatus.PENDING)
        pending = []
        
        for instance in instances:
            if instance.status in [WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS]:
                for step in instance.steps:
                    if step.status == StepStatus.PENDING and step.approver_id == approver_id:
                        pending.append(instance)
                        break
        
        return pending
    
    def cancel_instance(self, instance_id: str, requester_id: str) -> WorkflowInstance:
        """Cancel a workflow instance."""
        instance = self._repo.get_instance(instance_id)
        if not instance:
            raise ValueError(f"Workflow instance not found: {instance_id}")
        
        if instance.requester_id != requester_id:
            raise ValueError("Only requester can cancel workflow")
        
        if instance.status in [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED]:
            raise ValueError(f"Cannot cancel workflow in status: {instance.status}")
        
        instance.status = WorkflowStatus.CANCELLED
        instance.completed_at = datetime.utcnow()
        
        self._repo.save_instance(instance)
        logger.info(f"Workflow instance cancelled: {instance_id}")
        
        return instance

