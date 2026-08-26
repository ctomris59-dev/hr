"""
Approval Workflow Engine - Domain Models
Generic workflow models for approval processes.
"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from pydantic import BaseModel, Field
import uuid


class WorkflowStatus(str, Enum):
    """Workflow instance status."""
    PENDING = "PENDING"           # Waiting for approval
    IN_PROGRESS = "IN_PROGRESS"   # Partially approved
    APPROVED = "APPROVED"         # Fully approved
    REJECTED = "REJECTED"         # Rejected
    CANCELLED = "CANCELLED"       # Cancelled by requester
    EXPIRED = "EXPIRED"           # Timeout


class StepStatus(str, Enum):
    """Individual step status."""
    PENDING = "PENDING"           # Waiting for approval
    APPROVED = "APPROVED"         # Approved
    REJECTED = "REJECTED"         # Rejected
    SKIPPED = "SKIPPED"           # Skipped (condition not met)
    ESCALATED = "ESCALATED"       # Escalated to next level


class ApprovalAction(str, Enum):
    """Approval actions."""
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REQUEST_CHANGES = "REQUEST_CHANGES"
    DELEGATE = "DELEGATE"
    ESCALATE = "ESCALATE"


class ApprovalRuleType(str, Enum):
    """Types of approval rules."""
    ROLE_BASED = "ROLE_BASED"           # Approver must have specific role
    DEPARTMENT_BASED = "DEPARTMENT_BASED"  # Approver must be in specific department
    HIERARCHY_BASED = "HIERARCHY_BASED"  # Approver must be manager/director of requester
    THRESHOLD_BASED = "THRESHOLD_BASED"  # Approval required if value exceeds threshold
    CUSTOM = "CUSTOM"                    # Custom condition function


class ApprovalRule(BaseModel):
    """Rule for determining approver."""
    rule_type: ApprovalRuleType
    value: Any  # Rule-specific value (role name, department, threshold, etc.)
    condition: Optional[str] = None  # Optional condition expression (e.g., "days > 10")
    custom_function: Optional[str] = None  # Name of custom function (for CUSTOM type)


class WorkflowStep(BaseModel):
    """A single step in a workflow."""
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    step_order: int  # Order in workflow (1, 2, 3, ...)
    name: str  # Step name (e.g., "Manager Approval", "HR Approval")
    description: Optional[str] = None
    
    # Approver determination
    approver_rules: List[ApprovalRule]  # Rules to determine approver
    
    # Step configuration
    is_required: bool = True  # If False, step can be skipped
    is_parallel: bool = False  # If True, can run in parallel with other steps
    requires_all: bool = True  # If parallel, requires all approvals (False = any approval)
    
    # Timeout
    timeout_hours: Optional[int] = None  # Hours before escalation/timeout
    escalation_rule: Optional[ApprovalRule] = None  # Rule for escalation
    
    # Status
    status: StepStatus = StepStatus.PENDING
    approver_id: Optional[str] = None  # Actual approver (determined at runtime)
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    comments: Optional[str] = None
    
    class Config:
        use_enum_values = True


class WorkflowDefinition(BaseModel):
    """Workflow template/definition."""
    workflow_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Leave Request Workflow", "Recruitment Workflow"
    description: Optional[str] = None
    entity_type: str  # e.g., "LeaveRequest", "Recruitment", "PerformanceReview"
    
    # Steps
    steps: List[WorkflowStep]
    
    # Configuration
    requires_all_steps: bool = True  # All steps must be approved
    allow_parallel: bool = False  # Allow parallel step execution
    auto_approve_on_timeout: bool = False  # Auto-approve if timeout
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Config:
        use_enum_values = True


class WorkflowInstance(BaseModel):
    """A running workflow instance."""
    instance_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str  # Reference to WorkflowDefinition
    entity_type: str  # e.g., "LeaveRequest"
    entity_id: str  # ID of the entity being approved (e.g., leave request ID)
    
    # Requester
    requester_id: str
    requester_name: str
    requester_role: Optional[str] = None
    requester_department: Optional[str] = None
    
    # Context data (for rule evaluation)
    context: Dict[str, Any] = Field(default_factory=dict)  # e.g., {"days": 10, "amount": 5000}
    
    # Steps (runtime state)
    steps: List[WorkflowStep]  # Steps with current status
    
    # Status
    status: WorkflowStatus = WorkflowStatus.PENDING
    current_step_index: int = 0  # Index of current active step
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Result
    final_approver_id: Optional[str] = None
    final_approver_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    class Config:
        use_enum_values = True


class ApprovalRequest(BaseModel):
    """Request to approve/reject a workflow step."""
    instance_id: str
    step_id: str
    action: ApprovalAction
    approver_id: str
    approver_name: str
    approver_role: Optional[str] = None
    comments: Optional[str] = None
    delegate_to_id: Optional[str] = None  # For DELEGATE action


class WorkflowCreateRequest(BaseModel):
    """Request to create a workflow instance."""
    workflow_id: str  # Workflow definition ID
    entity_type: str
    entity_id: str
    requester_id: str
    requester_name: str
    requester_role: Optional[str] = None
    requester_department: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)

