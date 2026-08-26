"""
Workflow Repository - Data Access Layer
"""
from typing import List, Optional
from datetime import datetime
from repositories.json_store import JsonStore
from domain.workflow.models import (
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowStatus,
)
from config import DB_WORKFLOW_DEFINITIONS_FILE, DB_WORKFLOW_INSTANCES_FILE
from pathlib import Path


class WorkflowRepository:
    """Repository for workflow definitions and instances."""
    
    def __init__(
        self,
        definitions_file: Optional[str] = None,
        instances_file: Optional[str] = None
    ):
        self._definitions_store = JsonStore(definitions_file or DB_WORKFLOW_DEFINITIONS_FILE)
        self._instances_store = JsonStore(instances_file or DB_WORKFLOW_INSTANCES_FILE)
    
    # ========== Workflow Definitions ==========
    
    def save_definition(self, definition: WorkflowDefinition) -> None:
        """Save workflow definition."""
        definitions = self._definitions_store.load()
        
        # Convert to dict
        def_dict = definition.model_dump()
        def_dict["created_at"] = definition.created_at.isoformat()
        def_dict["updated_at"] = definition.updated_at.isoformat()
        
        # Update or insert
        found = False
        for i, d in enumerate(definitions):
            if d.get("workflow_id") == definition.workflow_id:
                definitions[i] = def_dict
                found = True
                break
        
        if not found:
            definitions.append(def_dict)
        
        self._definitions_store.save(definitions)
    
    def get_definition(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """Get workflow definition by ID."""
        definitions = self._definitions_store.load()
        for d in definitions:
            if d.get("workflow_id") == workflow_id:
                # Parse datetime
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                d["updated_at"] = datetime.fromisoformat(d["updated_at"])
                return WorkflowDefinition(**d)
        return None
    
    def get_definition_by_entity_type(self, entity_type: str) -> Optional[WorkflowDefinition]:
        """Get active workflow definition for entity type."""
        definitions = self._definitions_store.load()
        for d in definitions:
            if d.get("entity_type") == entity_type and d.get("is_active", True):
                # Parse datetime
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                d["updated_at"] = datetime.fromisoformat(d["updated_at"])
                return WorkflowDefinition(**d)
        return None
    
    def list_definitions(self) -> List[WorkflowDefinition]:
        """List all workflow definitions."""
        definitions = self._definitions_store.load()
        result = []
        for d in definitions:
            try:
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                d["updated_at"] = datetime.fromisoformat(d["updated_at"])
                result.append(WorkflowDefinition(**d))
            except Exception:
                continue
        return result
    
    # ========== Workflow Instances ==========
    
    def save_instance(self, instance: WorkflowInstance) -> None:
        """Save workflow instance."""
        instances = self._instances_store.load()
        
        # Convert to dict
        inst_dict = instance.model_dump()
        inst_dict["created_at"] = instance.created_at.isoformat()
        if instance.started_at:
            inst_dict["started_at"] = instance.started_at.isoformat()
        if instance.completed_at:
            inst_dict["completed_at"] = instance.completed_at.isoformat()
        
        # Convert step timestamps
        for step in inst_dict["steps"]:
            if step.get("approved_at"):
                step["approved_at"] = step["approved_at"].isoformat()
            if step.get("rejected_at"):
                step["rejected_at"] = step["rejected_at"].isoformat()
        
        # Update or insert
        found = False
        for i, inst in enumerate(instances):
            if inst.get("instance_id") == instance.instance_id:
                instances[i] = inst_dict
                found = True
                break
        
        if not found:
            instances.append(inst_dict)
        
        self._instances_store.save(instances)
    
    def get_instance(self, instance_id: str) -> Optional[WorkflowInstance]:
        """Get workflow instance by ID."""
        instances = self._instances_store.load()
        for inst in instances:
            if inst.get("instance_id") == instance_id:
                return self._parse_instance(inst)
        return None
    
    def get_instance_by_entity(self, entity_type: str, entity_id: str) -> Optional[WorkflowInstance]:
        """Get workflow instance by entity."""
        instances = self._instances_store.load()
        for inst in instances:
            if inst.get("entity_type") == entity_type and inst.get("entity_id") == entity_id:
                return self._parse_instance(inst)
        return None
    
    def list_instances(
        self,
        entity_type: Optional[str] = None,
        status: Optional[WorkflowStatus] = None,
        requester_id: Optional[str] = None,
    ) -> List[WorkflowInstance]:
        """List workflow instances with filters."""
        instances = self._instances_store.load()
        result = []
        
        for inst in instances:
            # Apply filters
            if entity_type and inst.get("entity_type") != entity_type:
                continue
            if status and inst.get("status") != status.value:
                continue
            if requester_id and inst.get("requester_id") != requester_id:
                continue
            
            try:
                result.append(self._parse_instance(inst))
            except Exception:
                continue
        
        return result
    
    def _parse_instance(self, inst_dict: dict) -> WorkflowInstance:
        """Parse instance dict to WorkflowInstance."""
        # Parse timestamps
        inst_dict["created_at"] = datetime.fromisoformat(inst_dict["created_at"])
        if inst_dict.get("started_at"):
            inst_dict["started_at"] = datetime.fromisoformat(inst_dict["started_at"])
        if inst_dict.get("completed_at"):
            inst_dict["completed_at"] = datetime.fromisoformat(inst_dict["completed_at"])
        
        # Parse step timestamps
        for step in inst_dict.get("steps", []):
            if step.get("approved_at"):
                step["approved_at"] = datetime.fromisoformat(step["approved_at"])
            if step.get("rejected_at"):
                step["rejected_at"] = datetime.fromisoformat(step["rejected_at"])
        
        return WorkflowInstance(**inst_dict)

