"""Secure tenant-scoped bulk ingestion endpoints for enterprise HR connectors."""
from __future__ import annotations

import re
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.integration_models import IntegrationAttendanceRecordModel, IntegrationPayrollRecordModel
from db.models import EmployeeModel, utcnow

router = APIRouter(prefix="/api/v1/integrations", tags=["SaaS Integrations"])
CONNECTOR_ADMIN_ROLES = ("CEO", "IK", "HR_ADMIN")
MAX_BATCH = 5000
INGEST_SCHEMA_REVISION = "20260902_0006"


class EmployeeIngestRecord(BaseModel):
    employee_code: str = Field(min_length=1, max_length=80)
    full_name: str = Field(min_length=2, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    department: str = Field(min_length=1, max_length=160)
    position: str = Field(min_length=1, max_length=200)
    hire_date: date | None = None
    employment_type: str | None = Field(default=None, max_length=48)
    location: str | None = Field(default=None, max_length=160)


class PayrollIngestRecord(BaseModel):
    employee_code: str = Field(min_length=1, max_length=80)
    period: str = Field(min_length=1, max_length=32)
    gross_salary: Decimal | None = Field(default=None, ge=0)
    net_salary: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="TRY", min_length=3, max_length=8)


class AttendanceIngestRecord(BaseModel):
    employee_code: str = Field(min_length=1, max_length=80)
    work_date: date
    first_in: str | None = Field(default=None, max_length=32)
    last_out: str | None = Field(default=None, max_length=32)
    worked_minutes: int | None = Field(default=None, ge=0, le=2880)
    overtime_minutes: int | None = Field(default=None, ge=0, le=2880)
    absence_minutes: int | None = Field(default=None, ge=0, le=2880)


class EmployeeIngestPayload(BaseModel):
    provider: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_-]+$")
    records: list[EmployeeIngestRecord] = Field(min_length=1, max_length=MAX_BATCH)


class PayrollIngestPayload(BaseModel):
    provider: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_-]+$")
    records: list[PayrollIngestRecord] = Field(min_length=1, max_length=MAX_BATCH)


class AttendanceIngestPayload(BaseModel):
    provider: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_-]+$")
    records: list[AttendanceIngestRecord] = Field(min_length=1, max_length=MAX_BATCH)


def _result(domain: str, received: int, created: int, updated: int, skipped: int) -> dict:
    return {
        "domain": domain,
        "received": received,
        "processed": created + updated,
        "created": created,
        "updated": updated,
        "skipped": skipped,
    }


def _employee_map(db: Session, tenant_id: str, codes: set[str]) -> dict[str, EmployeeModel]:
    clean = {code.strip() for code in codes if code and code.strip()}
    if not clean:
        return {}
    rows = db.scalars(
        select(EmployeeModel).where(
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.active.is_(True),
            or_(EmployeeModel.external_id.in_(clean), EmployeeModel.id.in_(clean)),
        )
    ).all()
    mapped: dict[str, EmployeeModel] = {}
    for row in rows:
        mapped[row.id] = row
        if row.external_id:
            mapped[row.external_id] = row
    return mapped


def _period_key(value: str) -> tuple[int, int, str]:
    raw = str(value or "").strip()
    match = re.search(r"(20\d{2})\D{0,3}(0?[1-9]|1[0-2])", raw)
    if match:
        return int(match.group(1)), int(match.group(2)), raw
    return 0, 0, raw


def _refresh_latest_salary(db: Session, tenant_id: str, employee_ids: set[str]) -> None:
    if not employee_ids:
        return
    rows = db.scalars(
        select(IntegrationPayrollRecordModel).where(
            IntegrationPayrollRecordModel.tenant_id == tenant_id,
            IntegrationPayrollRecordModel.employee_id.in_(employee_ids),
            IntegrationPayrollRecordModel.gross_salary.is_not(None),
        )
    ).all()
    latest: dict[str, IntegrationPayrollRecordModel] = {}
    for row in rows:
        if str(row.currency or "").upper() != "TRY":
            continue
        current = latest.get(row.employee_id)
        if current is None or _period_key(row.period) > _period_key(current.period):
            latest[row.employee_id] = row
    if not latest:
        return
    employees = db.scalars(
        select(EmployeeModel).where(
            EmployeeModel.tenant_id == tenant_id,
            EmployeeModel.id.in_(latest.keys()),
        )
    ).all()
    for employee in employees:
        record = latest.get(employee.id)
        if record and record.gross_salary is not None:
            employee.salary_amount = float(record.gross_salary)


@router.get("/readiness")
def integration_ingest_readiness(
    principal: Principal = Depends(require_roles(*CONNECTOR_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    # These lightweight tenant-scoped reads intentionally fail if migration 0006
    # has not been applied. The Next.js connector layer uses this as a fail-closed
    # production gate before enabling any persistent sync action.
    db.scalar(
        select(IntegrationPayrollRecordModel.id)
        .where(IntegrationPayrollRecordModel.tenant_id == principal.tenant_id)
        .limit(1)
    )
    db.scalar(
        select(IntegrationAttendanceRecordModel.id)
        .where(IntegrationAttendanceRecordModel.tenant_id == principal.tenant_id)
        .limit(1)
    )
    return {
        "ready": True,
        "schema_revision": INGEST_SCHEMA_REVISION,
        "domains": ["employees", "payroll", "attendance"],
    }


@router.post("/ingest/employees")
def ingest_employees(
    payload: EmployeeIngestPayload,
    principal: Principal = Depends(require_roles(*CONNECTOR_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    codes = {row.employee_code.strip() for row in payload.records}
    emails = {row.email.strip().lower() for row in payload.records if row.email and row.email.strip()}
    clauses = [EmployeeModel.external_id.in_(codes)]
    if emails:
        clauses.append(EmployeeModel.email.in_(emails))
    existing = db.scalars(
        select(EmployeeModel).where(
            EmployeeModel.tenant_id == principal.tenant_id,
            or_(*clauses),
        )
    ).all()
    by_code = {str(row.external_id): row for row in existing if row.external_id}
    by_email = {str(row.email).lower(): row for row in existing if row.email}
    created = updated = skipped = 0
    stamp = utcnow().isoformat()

    for record in payload.records:
        code = record.employee_code.strip()
        email_key = record.email.strip().lower() if record.email and record.email.strip() else ""
        employee = by_code.get(code) or (by_email.get(email_key) if email_key else None)
        if employee is None:
            employee = EmployeeModel(
                tenant_id=principal.tenant_id,
                external_id=code,
                full_name=record.full_name.strip(),
                email=record.email.strip() if record.email else None,
                department=record.department.strip(),
                position=record.position.strip(),
                hire_date=record.hire_date,
                employment_type=record.employment_type.strip() if record.employment_type else None,
                location=record.location.strip() if record.location else None,
                active=True,
                metadata_json={"integration_provider": payload.provider, "integration_synced_at": stamp},
            )
            db.add(employee)
            db.flush()
            by_code[code] = employee
            if employee.email:
                by_email[employee.email.lower()] = employee
            created += 1
            continue

        employee.external_id = code
        employee.full_name = record.full_name.strip()
        if record.email:
            employee.email = record.email.strip()
        employee.department = record.department.strip()
        employee.position = record.position.strip()
        if record.hire_date is not None:
            employee.hire_date = record.hire_date
        if record.employment_type:
            employee.employment_type = record.employment_type.strip()
        if record.location:
            employee.location = record.location.strip()
        employee.active = True
        metadata = dict(employee.metadata_json or {})
        metadata.update({"integration_provider": payload.provider, "integration_synced_at": stamp})
        employee.metadata_json = metadata
        updated += 1

    db.commit()
    return _result("employees", len(payload.records), created, updated, skipped)


@router.post("/ingest/payroll")
def ingest_payroll(
    payload: PayrollIngestPayload,
    principal: Principal = Depends(require_roles(*CONNECTOR_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    employees = _employee_map(db, principal.tenant_id, {row.employee_code for row in payload.records})
    employee_ids = {employees[row.employee_code].id for row in payload.records if row.employee_code in employees}
    periods = {row.period.strip() for row in payload.records}
    existing = db.scalars(
        select(IntegrationPayrollRecordModel).where(
            IntegrationPayrollRecordModel.tenant_id == principal.tenant_id,
            IntegrationPayrollRecordModel.provider == payload.provider,
            IntegrationPayrollRecordModel.employee_id.in_(employee_ids) if employee_ids else False,
            IntegrationPayrollRecordModel.period.in_(periods),
        )
    ).all() if employee_ids else []
    keyed = {(row.employee_id, row.period): row for row in existing}
    created = updated = skipped = 0
    affected: set[str] = set()

    for record in payload.records:
        employee = employees.get(record.employee_code)
        if employee is None:
            skipped += 1
            continue
        period = record.period.strip()
        key = (employee.id, period)
        row = keyed.get(key)
        if row is None:
            row = IntegrationPayrollRecordModel(
                tenant_id=principal.tenant_id,
                employee_id=employee.id,
                employee_external_id=record.employee_code.strip(),
                provider=payload.provider,
                period=period,
                gross_salary=record.gross_salary,
                net_salary=record.net_salary,
                currency=record.currency.strip().upper(),
                ingested_by_user_id=principal.user_id,
            )
            db.add(row)
            keyed[key] = row
            created += 1
        else:
            row.employee_external_id = record.employee_code.strip()
            row.gross_salary = record.gross_salary
            row.net_salary = record.net_salary
            row.currency = record.currency.strip().upper()
            row.ingested_by_user_id = principal.user_id
            row.updated_at = utcnow()
            updated += 1
        affected.add(employee.id)

    db.flush()
    _refresh_latest_salary(db, principal.tenant_id, affected)
    db.commit()
    return _result("payroll", len(payload.records), created, updated, skipped)


@router.post("/ingest/attendance")
def ingest_attendance(
    payload: AttendanceIngestPayload,
    principal: Principal = Depends(require_roles(*CONNECTOR_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    employees = _employee_map(db, principal.tenant_id, {row.employee_code for row in payload.records})
    employee_ids = {employees[row.employee_code].id for row in payload.records if row.employee_code in employees}
    dates = {row.work_date for row in payload.records}
    existing = db.scalars(
        select(IntegrationAttendanceRecordModel).where(
            IntegrationAttendanceRecordModel.tenant_id == principal.tenant_id,
            IntegrationAttendanceRecordModel.provider == payload.provider,
            IntegrationAttendanceRecordModel.employee_id.in_(employee_ids) if employee_ids else False,
            IntegrationAttendanceRecordModel.work_date.in_(dates),
        )
    ).all() if employee_ids else []
    keyed = {(row.employee_id, row.work_date): row for row in existing}
    created = updated = skipped = 0

    for record in payload.records:
        employee = employees.get(record.employee_code)
        if employee is None:
            skipped += 1
            continue
        key = (employee.id, record.work_date)
        row = keyed.get(key)
        if row is None:
            row = IntegrationAttendanceRecordModel(
                tenant_id=principal.tenant_id,
                employee_id=employee.id,
                employee_external_id=record.employee_code.strip(),
                provider=payload.provider,
                work_date=record.work_date,
                first_in=record.first_in,
                last_out=record.last_out,
                worked_minutes=record.worked_minutes,
                overtime_minutes=record.overtime_minutes,
                absence_minutes=record.absence_minutes,
                ingested_by_user_id=principal.user_id,
            )
            db.add(row)
            keyed[key] = row
            created += 1
        else:
            row.employee_external_id = record.employee_code.strip()
            row.first_in = record.first_in
            row.last_out = record.last_out
            row.worked_minutes = record.worked_minutes
            row.overtime_minutes = record.overtime_minutes
            row.absence_minutes = record.absence_minutes
            row.ingested_by_user_id = principal.user_id
            row.updated_at = utcnow()
            updated += 1

    db.commit()
    return _result("attendance", len(payload.records), created, updated, skipped)
