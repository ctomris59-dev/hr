from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.config import get_settings
from core.database import Base, get_db
from core.security import create_access_token, hash_password
from db.integration_models import IntegrationAttendanceRecordModel, IntegrationPayrollRecordModel
from db.models import EmployeeModel, TenantModel, UserModel
from main import app


@pytest.fixture()
def integration_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)

    settings = get_settings()
    previous = {"SAAS_AUTH_ENABLED": settings.SAAS_AUTH_ENABLED, "DATABASE_URL": settings.DATABASE_URL, "SECRET_KEY": settings.SECRET_KEY}
    settings.SAAS_AUTH_ENABLED = True
    settings.DATABASE_URL = "sqlite://"
    settings.SECRET_KEY = "test-secret-" + "x" * 48

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db

    with TestingSession() as db:
        t1 = TenantModel(id="tenant-1", slug="tenant-one", name="Tenant One", status="ACTIVE")
        t2 = TenantModel(id="tenant-2", slug="tenant-two", name="Tenant Two", status="ACTIVE")
        db.add_all([t1, t2])
        hr1 = EmployeeModel(id="e-hr-1", tenant_id=t1.id, external_id="HR-1", full_name="HR One", department="HR", position="HR Admin", active=True)
        mgr1 = EmployeeModel(id="e-mgr-1", tenant_id=t1.id, external_id="MGR-1", full_name="Manager One", department="Ops", position="Manager", active=True)
        p1 = EmployeeModel(id="e-p1", tenant_id=t1.id, external_id="P001", full_name="Employee One", department="Finance", position="Specialist", active=True)
        p2 = EmployeeModel(id="e-p2", tenant_id=t2.id, external_id="P001", full_name="Tenant Two Employee", department="Finance", position="Specialist", active=True)
        db.add_all([hr1, mgr1, p1, p2])
        db.add_all([
            UserModel(id="u-hr-1", tenant_id=t1.id, employee_id=hr1.id, username="hradmin", password_hash=hash_password("password"), role="HR_ADMIN", active=True, token_version=1),
            UserModel(id="u-mgr-1", tenant_id=t1.id, employee_id=mgr1.id, username="manager", password_hash=hash_password("password"), role="MANAGER", active=True, token_version=1),
        ])
        db.commit()

    def token(user_id: str, tenant_id: str, role: str):
        return create_access_token(user_id=user_id, tenant_id=tenant_id, role=role, token_version=1)

    yield TestClient(app), token, TestingSession

    app.dependency_overrides.clear()
    settings.SAAS_AUTH_ENABLED = previous["SAAS_AUTH_ENABLED"]
    settings.DATABASE_URL = previous["DATABASE_URL"]
    settings.SECRET_KEY = previous["SECRET_KEY"]
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def auth(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_hr_admin_can_ingest_employee_payroll_and_attendance(integration_client):
    client, token, TestingSession = integration_client
    headers = auth(token("u-hr-1", "tenant-1", "HR_ADMIN"))

    employee = client.post(
        "/api/v1/integrations/ingest/employees",
        headers=headers,
        json={"provider": "logo", "records": [{"employee_code": "P002", "full_name": "New Employee", "department": "HR", "position": "Specialist", "email": "new@example.com", "hire_date": "2026-01-15"}]},
    )
    assert employee.status_code == 200
    assert employee.json()["created"] == 1

    payroll = client.post(
        "/api/v1/integrations/ingest/payroll",
        headers=headers,
        json={"provider": "logo", "records": [{"employee_code": "P002", "period": "2026-08", "gross_salary": 75000.50, "net_salary": 56000.25, "currency": "TRY"}]},
    )
    assert payroll.status_code == 200
    assert payroll.json() == {"domain": "payroll", "received": 1, "processed": 1, "created": 1, "updated": 0, "skipped": 0}

    attendance = client.post(
        "/api/v1/integrations/ingest/attendance",
        headers=headers,
        json={"provider": "pdks", "records": [{"employee_code": "P002", "work_date": "2026-09-01", "first_in": "08:30", "last_out": "17:30", "worked_minutes": 480, "overtime_minutes": 30}]},
    )
    assert attendance.status_code == 200
    assert attendance.json()["created"] == 1

    with TestingSession() as db:
        new_employee = db.scalar(select(EmployeeModel).where(EmployeeModel.tenant_id == "tenant-1", EmployeeModel.external_id == "P002"))
        assert new_employee is not None
        assert new_employee.salary_amount == pytest.approx(75000.50)
        assert db.scalar(select(func.count()).select_from(IntegrationPayrollRecordModel).where(IntegrationPayrollRecordModel.tenant_id == "tenant-1")) == 1
        assert db.scalar(select(func.count()).select_from(IntegrationAttendanceRecordModel).where(IntegrationAttendanceRecordModel.tenant_id == "tenant-1")) == 1


def test_payroll_upsert_is_idempotent_and_tenant_scoped(integration_client):
    client, token, TestingSession = integration_client
    headers = auth(token("u-hr-1", "tenant-1", "HR_ADMIN"))
    first = client.post("/api/v1/integrations/ingest/payroll", headers=headers, json={"provider": "payroll", "records": [{"employee_code": "P001", "period": "2026-08", "gross_salary": 70000, "net_salary": 52000, "currency": "TRY"}]})
    second = client.post("/api/v1/integrations/ingest/payroll", headers=headers, json={"provider": "payroll", "records": [{"employee_code": "P001", "period": "2026-08", "gross_salary": 80000, "net_salary": 60000, "currency": "TRY"}]})
    assert first.status_code == 200 and first.json()["created"] == 1
    assert second.status_code == 200 and second.json()["updated"] == 1

    with TestingSession() as db:
        tenant_one = db.scalars(select(IntegrationPayrollRecordModel).where(IntegrationPayrollRecordModel.tenant_id == "tenant-1")).all()
        tenant_two = db.scalars(select(IntegrationPayrollRecordModel).where(IntegrationPayrollRecordModel.tenant_id == "tenant-2")).all()
        assert len(tenant_one) == 1
        assert len(tenant_two) == 0
        assert float(tenant_one[0].gross_salary) == 80000.0
        assert db.get(EmployeeModel, "e-p1").salary_amount == pytest.approx(80000.0)
        assert db.get(EmployeeModel, "e-p2").salary_amount is None


def test_missing_employee_is_skipped_without_creating_orphan(integration_client):
    client, token, TestingSession = integration_client
    headers = auth(token("u-hr-1", "tenant-1", "HR_ADMIN"))
    response = client.post("/api/v1/integrations/ingest/attendance", headers=headers, json={"provider": "pdks", "records": [{"employee_code": "UNKNOWN", "work_date": "2026-09-01", "worked_minutes": 480}]})
    assert response.status_code == 200
    assert response.json()["skipped"] == 1
    assert response.json()["processed"] == 0
    with TestingSession() as db:
        assert db.scalar(select(func.count()).select_from(IntegrationAttendanceRecordModel)) == 0


def test_manager_cannot_ingest_sensitive_integration_data(integration_client):
    client, token, _ = integration_client
    headers = auth(token("u-mgr-1", "tenant-1", "MANAGER"))
    response = client.post("/api/v1/integrations/ingest/payroll", headers=headers, json={"provider": "payroll", "records": [{"employee_code": "P001", "period": "2026-08", "gross_salary": 70000, "currency": "TRY"}]})
    assert response.status_code == 403
