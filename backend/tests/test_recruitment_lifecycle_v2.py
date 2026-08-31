from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.config import get_settings
from core.database import Base, get_db
from core.security import create_access_token, hash_password
from db.models import CompensationBenchmarkModel, EmployeeModel, TenantModel, UserModel
from main import app


@pytest.fixture()
def lifecycle_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    settings = get_settings()
    previous = (settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY)
    settings.SAAS_AUTH_ENABLED = True
    settings.DATABASE_URL = "sqlite://"
    settings.SECRET_KEY = "recruitment-lifecycle-test-secret-" + "x" * 40

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestingSession() as db:
        db.add_all([
            TenantModel(id="t1", slug="one", name="One", status="ACTIVE"),
            TenantModel(id="t2", slug="two", name="Two", status="ACTIVE"),
            EmployeeModel(id="ceo1", tenant_id="t1", full_name="CEO One", department="Management", position="CEO", salary_amount=160000, active=True),
            EmployeeModel(id="mgr1", tenant_id="t1", full_name="Manager One", department="Sales", position="Manager", manager_employee_id="ceo1", salary_amount=100000, active=True),
            EmployeeModel(id="e1", tenant_id="t1", full_name="Employee One", department="Sales", position="Specialist", manager_employee_id="mgr1", salary_amount=92000, active=True),
            EmployeeModel(id="e2", tenant_id="t1", full_name="Employee Two", department="Sales", position="Specialist", manager_employee_id="mgr1", salary_amount=98000, active=True),
            EmployeeModel(id="foreign1", tenant_id="t2", full_name="Foreign CEO", active=True),
        ])
        db.add_all([
            UserModel(id="u-ceo", tenant_id="t1", employee_id="ceo1", username="ceo", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
            UserModel(id="u-mgr", tenant_id="t1", employee_id="mgr1", username="manager", password_hash=hash_password("password"), role="MANAGER", active=True, token_version=1),
            UserModel(id="u-foreign", tenant_id="t2", employee_id="foreign1", username="foreign", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
        ])
        db.add(CompensationBenchmarkModel(id="bench1", tenant_id="t1", department="Sales", position="Specialist", market_average=100000, source="Survey"))
        db.commit()

    def token(user_id: str, tenant_id: str, role: str) -> str:
        return create_access_token(user_id=user_id, tenant_id=tenant_id, role=role, token_version=1)

    yield TestClient(app), token, TestingSession

    app.dependency_overrides.clear()
    settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY = previous
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_recruitment_candidate_persists_and_is_tenant_scoped(lifecycle_client):
    client, token, _ = lifecycle_client
    ceo = auth(token("u-ceo", "t1", "CEO"))
    created = client.post(
        "/api/v1/recruitment/candidates",
        headers=ceo,
        json={
            "candidate_source_id": "ats-100",
            "full_name": "Aday Bir",
            "email": "candidate@example.com",
            "department": "Sales",
            "position": "Specialist",
            "competency_signals": {"ANA": 4.2, "COM": 4.0},
            "structured_interview_notes": "STAR evidence recorded",
            "interview_done": True,
        },
    )
    assert created.status_code == 201
    candidate_id = created.json()["id"]

    listed = client.get("/api/v1/recruitment/candidates", headers=ceo)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    foreign = client.get(
        f"/api/v1/recruitment/candidates/{candidate_id}",
        headers=auth(token("u-foreign", "t2", "CEO")),
    )
    assert foreign.status_code == 404


def test_candidate_conversion_is_atomic_and_links_employee_origin(lifecycle_client):
    client, token, _ = lifecycle_client
    ceo = auth(token("u-ceo", "t1", "CEO"))
    candidate = client.post(
        "/api/v1/recruitment/candidates",
        headers=ceo,
        json={
            "candidate_source_id": "ats-200",
            "full_name": "New Hire",
            "email": "newhire@example.com",
            "department": "Sales",
            "position": "Specialist",
            "assessment_summary": "Structured interview and skills evidence",
            "competency_signals": {"ANA": 4.4},
            "status": "Teklif",
        },
    ).json()

    converted = client.post(
        f"/api/v1/recruitment/candidates/{candidate['id']}/convert",
        headers=ceo,
        json={"job_family": "Commercial", "job_level": "L2"},
    )
    assert converted.status_code == 201
    payload = converted.json()
    assert payload["candidate"]["status"] == "İşe Alındı"
    employee_id = payload["employee"]["id"]

    origin = client.get(f"/api/v1/lifecycle/employees/{employee_id}/origin", headers=ceo)
    assert origin.status_code == 200
    assert origin.json()["source"] == "recruitment"
    assert origin.json()["candidate_source_id"] == "ats-200"

    duplicate = client.post(
        f"/api/v1/recruitment/candidates/{candidate['id']}/convert",
        headers=ceo,
        json={},
    )
    assert duplicate.status_code == 409


def test_recruitment_is_hr_only(lifecycle_client):
    client, token, _ = lifecycle_client
    manager = auth(token("u-mgr", "t1", "MANAGER"))
    response = client.get("/api/v1/recruitment/candidates", headers=manager)
    assert response.status_code == 403


def test_compensation_overview_batches_scope_and_metrics(lifecycle_client):
    client, token, _ = lifecycle_client
    ceo = auth(token("u-ceo", "t1", "CEO"))
    response = client.get("/api/v1/compensation/overview", headers=ceo)
    assert response.status_code == 200
    payload = response.json()
    specialist = next(row for row in payload["items"] if row["employee_id"] == "e1")
    assert specialist["compa_ratio"] == 0.92
    assert specialist["market_gap_pct"] == -8.0
    assert payload["summary"]["benchmark_coverage_pct"] > 0

    manager = auth(token("u-mgr", "t1", "MANAGER"))
    scoped = client.get("/api/v1/compensation/overview", headers=manager)
    assert scoped.status_code == 200
    ids = {row["employee_id"] for row in scoped.json()["items"]}
    assert ids == {"mgr1", "e1", "e2"}
