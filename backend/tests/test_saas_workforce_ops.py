from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.config import get_settings
from core.database import Base, get_db
from core.security import create_access_token, hash_password
from db.models import EmployeeModel, TenantModel, UserModel
from main import app


@pytest.fixture()
def client_with_data():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    settings = get_settings()
    previous = (settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY)
    settings.SAAS_AUTH_ENABLED = True
    settings.DATABASE_URL = "sqlite://"
    settings.SECRET_KEY = "workforce-ops-test-secret-" + "x" * 40

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db

    with TestingSession() as db:
        t1 = TenantModel(id="t1", slug="one", name="One", status="ACTIVE")
        t2 = TenantModel(id="t2", slug="two", name="Two", status="ACTIVE")
        manager = EmployeeModel(id="m1", tenant_id="t1", full_name="Manager One", position="Manager", salary_amount=20000, annual_leave_entitlement=14, active=True)
        direct = EmployeeModel(id="e1", tenant_id="t1", full_name="Direct One", position="Specialist", department="Ops", manager_employee_id="m1", salary_amount=10000, annual_leave_entitlement=14, active=True)
        unrelated = EmployeeModel(id="e2", tenant_id="t1", full_name="Unrelated", position="Specialist", department="Sales", salary_amount=12000, annual_leave_entitlement=14, active=True)
        hr = EmployeeModel(id="h1", tenant_id="t1", full_name="HR One", position="HR", salary_amount=25000, annual_leave_entitlement=14, active=True)
        ceo = EmployeeModel(id="c1", tenant_id="t1", full_name="CEO One", position="CEO", salary_amount=40000, annual_leave_entitlement=14, active=True)
        foreign = EmployeeModel(id="e3", tenant_id="t2", full_name="Foreign", position="Specialist", salary_amount=9000, annual_leave_entitlement=14, active=True)
        db.add_all([t1, t2, manager, direct, unrelated, hr, ceo, foreign])
        db.add_all([
            UserModel(id="u-mgr", tenant_id="t1", employee_id="m1", username="manager", password_hash=hash_password("password"), role="MANAGER", active=True, token_version=1),
            UserModel(id="u-direct", tenant_id="t1", employee_id="e1", username="direct", password_hash=hash_password("password"), role="EMPLOYEE", active=True, token_version=1),
            UserModel(id="u-hr", tenant_id="t1", employee_id="h1", username="hr", password_hash=hash_password("password"), role="IK", active=True, token_version=1),
            UserModel(id="u-ceo", tenant_id="t1", employee_id="c1", username="ceo", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
            UserModel(id="u-foreign", tenant_id="t2", employee_id="e3", username="foreign", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
        ])
        db.commit()

    def token(user_id: str, tenant_id: str, role: str) -> str:
        return create_access_token(user_id=user_id, tenant_id=tenant_id, role=role, token_version=1)

    yield TestClient(app), token, TestingSession

    app.dependency_overrides.clear()
    settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY = previous
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_development_is_manager_scoped_and_cross_tenant_safe(client_with_data):
    client, token, _ = client_with_data
    manager_headers = headers(token("u-mgr", "t1", "MANAGER"))
    workspace = client.get("/api/v1/development/workspace", headers=manager_headers)
    assert workspace.status_code == 200
    assert [row["id"] for row in workspace.json()["employees"]] == ["e1"]

    payload = {
        "employee_id": "e1",
        "competency": "Analitik Düşünme",
        "goal": "Analitik karar kalitesini artırmak",
        "action": "Gerçek iş verisiyle gelişim projesi",
        "action_type": "Proje",
        "success_metric": "İki ölçülebilir çıktı",
        "reassess_days": 60,
    }
    created = client.post("/api/v1/development/plans", headers=manager_headers, json=payload)
    assert created.status_code == 201
    assert created.json()["employee_id"] == "e1"

    unrelated = client.post("/api/v1/development/plans", headers=manager_headers, json={**payload, "employee_id": "e2"})
    assert unrelated.status_code == 403
    foreign = client.post("/api/v1/development/plans", headers=manager_headers, json={**payload, "employee_id": "e3"})
    assert foreign.status_code == 404

    transfer = client.post(f"/api/v1/development/plans/{created.json()['id']}/transfer", headers=manager_headers)
    assert transfer.status_code == 201
    assert transfer.json()["source_development_plan_id"] == created.json()["id"]


def test_leave_days_balance_and_manager_approval_are_server_side(client_with_data):
    client, token, _ = client_with_data
    employee_headers = headers(token("u-direct", "t1", "EMPLOYEE"))
    created = client.post(
        "/api/v1/leave/requests",
        headers=employee_headers,
        json={"leave_type": "annual", "start_date": "2026-09-07", "end_date": "2026-09-11", "note": "Planlı izin"},
    )
    assert created.status_code == 201
    assert created.json()["days"] == 5.0

    manager_headers = headers(token("u-mgr", "t1", "MANAGER"))
    workspace = client.get("/api/v1/leave/workspace", headers=manager_headers)
    assert workspace.status_code == 200
    assert any(row["id"] == created.json()["id"] for row in workspace.json()["requests"])

    approved = client.patch(
        f"/api/v1/leave/requests/{created.json()['id']}",
        headers=manager_headers,
        json={"decision": "Onaylandı"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "Onaylandı"

    too_much = client.post(
        "/api/v1/leave/requests",
        headers=employee_headers,
        json={"leave_type": "annual", "start_date": "2026-09-14", "end_date": "2026-10-30"},
    )
    assert too_much.status_code == 422


def test_reward_leave_is_persisted_and_scoped(client_with_data):
    client, token, _ = client_with_data
    manager_headers = headers(token("u-mgr", "t1", "MANAGER"))
    granted = client.post(
        "/api/v1/leave/rewards",
        headers=manager_headers,
        json={"employee_id": "e1", "days": 2, "reason": "Kritik proje katkısı"},
    )
    assert granted.status_code == 201
    assert granted.json()["days"] == 2.0

    denied = client.post(
        "/api/v1/leave/rewards",
        headers=manager_headers,
        json={"employee_id": "e2", "days": 1, "reason": "Scope dışı"},
    )
    assert denied.status_code == 403

    reward_request = client.post(
        "/api/v1/leave/requests",
        headers=headers(token("u-direct", "t1", "EMPLOYEE")),
        json={"leave_type": "reward", "start_date": "2026-09-14", "end_date": "2026-09-15"},
    )
    assert reward_request.status_code == 201
    assert reward_request.json()["days"] == 2.0


def test_compensation_cycle_requires_server_stage_and_tenant_employee_ids(client_with_data):
    client, token, TestingSession = client_with_data
    hr_headers = headers(token("u-hr", "t1", "IK"))
    workspace = client.get("/api/v1/compensation/workspace", headers=hr_headers)
    assert workspace.status_code == 200
    ids = {row["id"] for row in workspace.json()["employees"]}
    assert "e3" not in ids
    assert {"m1", "e1", "e2", "h1", "c1"}.issubset(ids)

    cycle = client.post("/api/v1/compensation/cycles", headers=hr_headers, json={"name": "2026 Ücret Dönemi"})
    assert cycle.status_code == 201
    cycle_id = cycle.json()["id"]

    bad = client.patch(
        f"/api/v1/compensation/cycles/{cycle_id}/simulation",
        headers=hr_headers,
        json={"scenario": "C", "inflation_rate": 35, "results": [{"employee_id": "e3", "new_salary": 99999}]},
    )
    assert bad.status_code == 422

    saved = client.patch(
        f"/api/v1/compensation/cycles/{cycle_id}/simulation",
        headers=hr_headers,
        json={"scenario": "C", "inflation_rate": 35, "results": [{"employee_id": "e1", "new_salary": 11500, "Ad Soyad": "Direct One", "Yeni Maaş": 11500}]},
    )
    assert saved.status_code == 200

    manager_input = client.post(f"/api/v1/compensation/cycles/{cycle_id}/advance", headers=hr_headers)
    assert manager_input.status_code == 200
    assert manager_input.json()["stage"] == "MANAGER_INPUT"

    manager_request = client.put(
        f"/api/v1/compensation/cycles/{cycle_id}/manager-requests",
        headers=headers(token("u-mgr", "t1", "MANAGER")),
        json={"requests": [{"employee_id": "e1", "rate": 10, "note": "Pazar ve performans dengesi", "system_baseline": 11500}]},
    )
    assert manager_request.status_code == 200
    assert manager_request.json()["manager_requests"][0]["employee_id"] == "e1"

    assert client.post(f"/api/v1/compensation/cycles/{cycle_id}/advance", headers=hr_headers).json()["stage"] == "BUDGET_REVIEW"
    assert client.post(f"/api/v1/compensation/cycles/{cycle_id}/advance", headers=hr_headers).json()["stage"] == "APPROVAL"
    denied_finalize = client.post(f"/api/v1/compensation/cycles/{cycle_id}/advance", headers=hr_headers)
    assert denied_finalize.status_code == 403

    ceo_headers = headers(token("u-ceo", "t1", "CEO"))
    finalized = client.post(f"/api/v1/compensation/cycles/{cycle_id}/advance", headers=ceo_headers)
    assert finalized.status_code == 200
    assert finalized.json()["stage"] == "FINALIZED"

    applied = client.post(f"/api/v1/compensation/cycles/{cycle_id}/apply", headers=hr_headers)
    assert applied.status_code == 200
    assert applied.json()["stage"] == "EFFECTIVE"
    with TestingSession() as db:
        employee = db.scalar(select(EmployeeModel).where(EmployeeModel.id == "e1"))
        assert employee is not None
        assert employee.salary_amount == 11500
