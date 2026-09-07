"""Audit Repository - append-only and tamper-evident in SaaS/database mode."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select

from config import DB_AUDIT_FILE
from core.audit.models import AuditEvent, AuditEventFilter
from core.database import database_configured, db_session
from db.audit_models import ImmutableAuditEventModel
from repositories.json_store import JsonStore


class AuditRepository:
    """Persist audit events without exposing update/delete operations.

    Database mode stores an SHA-256 hash chain. PostgreSQL additionally has a DB
    trigger (migration 0008) that rejects UPDATE and DELETE on the audit table.
    Demo mode retains the historical JSON append-only store.
    """

    def __init__(self, file_path: Optional[str] = None):
        self._store = JsonStore(file_path or DB_AUDIT_FILE)
        self._database_mode = database_configured()

    @staticmethod
    def _payload(event: AuditEvent) -> dict:
        payload = event.model_dump()
        payload["timestamp"] = event.timestamp.isoformat()
        return payload

    @staticmethod
    def _hash(payload: dict, previous_hash: str | None) -> str:
        canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
        return hashlib.sha256(f"{previous_hash or ''}|{canonical}".encode("utf-8")).hexdigest()

    def save(self, event: AuditEvent) -> None:
        if not self._database_mode:
            events = self._store.load()
            events.append(self._payload(event))
            self._store.save(events)
            return

        payload = self._payload(event)
        with db_session() as db:
            previous = db.scalar(select(ImmutableAuditEventModel).order_by(ImmutableAuditEventModel.created_at.desc()).limit(1))
            previous_hash = previous.event_hash if previous else None
            db.add(ImmutableAuditEventModel(
                event_id=event.id,
                event_type=str(event.event_type),
                event_timestamp=event.timestamp,
                payload_json=payload,
                previous_hash=previous_hash,
                event_hash=self._hash(payload, previous_hash),
            ))

    def save_batch(self, events: List[AuditEvent]) -> None:
        for event in events:
            self.save(event)

    def _database_events(self) -> List[AuditEvent]:
        with db_session() as db:
            rows = list(db.scalars(select(ImmutableAuditEventModel).order_by(ImmutableAuditEventModel.event_timestamp.desc())).all())
        result: List[AuditEvent] = []
        for row in rows:
            try:
                payload = dict(row.payload_json or {})
                if isinstance(payload.get("timestamp"), str):
                    payload["timestamp"] = datetime.fromisoformat(payload["timestamp"])
                result.append(AuditEvent(**payload))
            except Exception:
                continue
        return result

    def find_all(self, filter: Optional[AuditEventFilter] = None) -> List[AuditEvent]:
        if self._database_mode:
            audit_events = self._database_events()
        else:
            audit_events = []
            for event_dict in self._store.load():
                try:
                    payload = dict(event_dict)
                    if isinstance(payload.get("timestamp"), str):
                        payload["timestamp"] = datetime.fromisoformat(payload["timestamp"])
                    audit_events.append(AuditEvent(**payload))
                except Exception:
                    continue

        if filter:
            audit_events = self._apply_filters(audit_events, filter)
        audit_events.sort(key=lambda item: item.timestamp, reverse=True)
        if filter:
            return audit_events[filter.offset:filter.offset + filter.limit]
        return audit_events

    def _apply_filters(self, events: List[AuditEvent], filter: AuditEventFilter) -> List[AuditEvent]:
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

    def verify_chain(self) -> bool:
        """Verify the persisted database chain and detect out-of-band tampering."""
        if not self._database_mode:
            return True
        with db_session() as db:
            rows = list(db.scalars(select(ImmutableAuditEventModel).order_by(ImmutableAuditEventModel.created_at.asc())).all())
        previous_hash: str | None = None
        for row in rows:
            if row.previous_hash != previous_hash:
                return False
            if row.event_hash != self._hash(dict(row.payload_json or {}), previous_hash):
                return False
            previous_hash = row.event_hash
        return True

    def count(self, filter: Optional[AuditEventFilter] = None) -> int:
        return len(self.find_all(filter))

    def get_by_id(self, event_id: str) -> Optional[AuditEvent]:
        return next((event for event in self.find_all() if event.id == event_id), None)
