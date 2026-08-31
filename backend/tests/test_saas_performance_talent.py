from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
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
    settings.SECRET_KEY = "performance-test-secret-" + "x" * 40

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
        manager = EmployeeModel(id="m1", tenant_id="t1", full_name="Manager One", position="Manager", active=True)
        direct = EmployeeModel(id="e1", tenant_id="t1", full_name="Direct One", position="Specialist", manager_employee_id="m1", active=True)
        unrelated = EmployeeModel(id="e2", tenant_id="t1", full_name="Unrelated", position="Specialist", active=True)
        foreign = EmployeeModel(id="e3", tenant_id="t2", full_name="Foreign", position="Specialist", active=True)
        hr = EmployeeModel(id="h1", tenant_id="t1", full_name="HR One", position="HR", active=True)
        db.add_all([t1, t2, manager, direct, unrelated, foreign, hr])
        db.add_all([
            UserModel(id="u-mgr", tenant_id="t1", employee_id="m1", username="manager", password_hash=hash_password("password"), role="MANAGER", active=True, token_version=1),
            UserModel(id="u-hr", tenant_id="t1", employee_id="h1", username="hr", password_hash=hash_password("password"), role="IK", active=True, token_version=1),
            UserModel(id="u-foreign", tenant_id="t2", employee_id="e3", username="foreign", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
        ])
        db.commit()

    def token(user_id: str, tenant_id: str, role: str) -> str:
        return create_access_token(user_id=user_id, tenant_id=tenant_id, role=role, token_version=1)

    yield TestClient(app), token

    app.dependency_overrides.clear()
    settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY = previous
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def evaluation_payload(employee_id: str) -> dict:
    return {
        "employee_id": employee_id,
        "performance_model_version": "FHR-PERF-2.1",
        "kpi_items": [
            {"id": "1", "title": "A", "weight": 50, "score": 4},
            {"id": "2", "title": "B", "weight": 50, "score": 3},
        ],
        "manager_performance_score": 4,
        "manager_scores": {f"C{i}": 4 for i in range(10)},
        "note": "Evidence reviewed",
    }


def test_manager_targets_are_scoped_to_direct_reports(client_with_data):
    client, token = client_with_data
    response = client.get("/api/v1/performance/targets", headers=headers(token("u-mgr", "t1", "MANAGER")))
    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == ["e1"]
    assert response.json()[0]["can_evaluate"] is True


def test_performance_write_rejects_unrelated_employee(client_with_data):
    client, token = client_with_data
    response = client.post(
        "/api/v1/performance/evaluations",
        headers=headers(token("u-mgr", "t1", "MANAGER")),
        json=evaluation_payload("e2"),
    )
    assert response.status_code == 403


def test_performance_write_calculates_scores_server_side(client_with_data):
    client, token = client_with_data
    response = client.post(
        "/api/v1/performance/evaluations",
        headers=headers(token("u-mgr", "t1", "MANAGER")),
        json=evaluation_payload("e1"),
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["kpi_score"] == 3.5
    assert payload["manager_performance_score"] == 4.0
    assert payload["performance"] == 3.7
    assert payload["competency_score"] == 4.0


def test_hr_can_view_tenant_performance_but_cannot_score(client_with_data):
    client, token = client_with_data
    hr_headers = headers(token("u-hr", "t1", "IK"))
    targets = client.get("/api/v1/performance/targets", headers=hr_headers)
    assert targets.status_code == 200
    assert all(row["can_evaluate"] is False for row in targets.json())
    write = client.post("/api/v1/performance/evaluations", headers=hr_headers, json=evaluation_payload("e1"))
    assert write.status_code == 403


def test_talent_dataset_is_hr_ceo_only_and_tenant_scoped(client_with_data):
    client, token = client_with_data
    denied = client.get("/api/v1/talent/dataset", headers=headers(token("u-mgr", "t1", "MANAGER")))
    assert denied.status_code == 403

    allowed = client.get("/api/v1/talent/dataset", headers=headers(token("u-hr", "t1", "IK")))
    assert allowed.status_code == 200
    ids = {row["id"] for row in allowed.json()["employees"]}
    assert "e3" not in ids
    assert {"m1", "e1", "e2", "h1"}.issubset(ids)


def test_talent_profile_update_cannot_cross_tenant(client_with_data):
    client, token = client_with_data
    hr_headers = headers(token("u-hr", "t1", "IK"))
    denied = client.patch(
        "/api/v1/talent/profiles/e3",
        headers=hr_headers,
        json={"career_aspiration": 4},
    )
    assert denied.status_code == 404

    updated = client.patch(
        "/api/v1/talent/profiles/e1",
        headers=hr_headers,
        json={"career_aspiration": 4, "mobility_willingness": 3},
    )
    assert updated.status_code == 200
    assert updated.json()["career_aspiration"] == 4.0
