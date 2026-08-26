"""
Audit Repository - Data Access Layer for Audit Events
"""
from typing import List, Optional
from datetime import datetime
from repositories.json_store import JsonStore
from core.audit.models import AuditEvent, AuditEventFilter
from config import DB_AUDIT_FILE
from pathlib import Path


class AuditRepository:
    """Repository for audit events."""
    
    def __init__(self, file_path: Optional[str] = None):
        self._store = JsonStore(file_path or DB_AUDIT_FILE)
    
    def save(self, event: AuditEvent) -> None:
        """
        Save audit event.
        Events are append-only (immutable).
        """
        events = self._store.load()
        
        # Convert event to dict
        event_dict = event.model_dump()
        # Convert datetime to ISO string for JSON
        event_dict["timestamp"] = event.timestamp.isoformat()
        
        events.append(event_dict)
        self._store.save(events)
    
    def save_batch(self, events: List[AuditEvent]) -> None:
        """Save multiple audit events in batch."""
        existing_events = self._store.load()
        
        new_events = []
        for event in events:
            event_dict = event.model_dump()
            event_dict["timestamp"] = event.timestamp.isoformat()
            new_events.append(event_dict)
        
        existing_events.extend(new_events)
        self._store.save(existing_events)
    
    def find_all(self, filter: Optional[AuditEventFilter] = None) -> List[AuditEvent]:
        """
        Find all audit events matching filter.
        
        Args:
            filter: Optional filter criteria
            
        Returns:
            List of audit events
        """
        events = self._store.load()
        
        # Convert dicts to AuditEvent objects
        audit_events = []
        for event_dict in events:
            try:
                # Parse timestamp
                if isinstance(event_dict.get("timestamp"), str):
                    event_dict["timestamp"] = datetime.fromisoformat(event_dict["timestamp"])
                event = AuditEvent(**event_dict)
                audit_events.append(event)
            except Exception:
                # Skip invalid events
                continue
        
        # Apply filters
        if filter:
            audit_events = self._apply_filters(audit_events, filter)
        
        # Sort by timestamp (newest first)
        audit_events.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination
        if filter:
            start = filter.offset
            end = start + filter.limit
            return audit_events[start:end]
        
        return audit_events
    
    def _apply_filters(self, events: List[AuditEvent], filter: AuditEventFilter) -> List[AuditEvent]:
        """Apply filters to events."""
        filtered = events
        
        if filter.event_types:
            filtered = [e for e in filtered if e.event_type in filter.event_types]
        
        if filter.severity:
            filtered = [e for e in filtered if e.severity in filter.severity]
        
        if filter.actor_id:
            filtered = [e for e in filtered if e.actor_id == filter.actor_id]
        
        if filter.actor_name:
            filtered = [e for e in filtered if filter.actor_name.lower() in (e.actor_name or "").lower()]
        
        if filter.target_type:
            filtered = [e for e in filtered if e.target_type == filter.target_type]
        
        if filter.target_id:
            filtered = [e for e in filtered if e.target_id == filter.target_id]
        
        if filter.start_date:
            filtered = [e for e in filtered if e.timestamp >= filter.start_date]
        
        if filter.end_date:
            filtered = [e for e in filtered if e.timestamp <= filter.end_date]
        
        if filter.success is not None:
            filtered = [e for e in filtered if e.success == filter.success]
        
        return filtered
    
    def count(self, filter: Optional[AuditEventFilter] = None) -> int:
        """Count audit events matching filter."""
        events = self.find_all(filter)
        return len(events)
    
    def get_by_id(self, event_id: str) -> Optional[AuditEvent]:
        """Get audit event by ID."""
        events = self.find_all()
        for event in events:
            if event.id == event_id:
                return event
        return None

