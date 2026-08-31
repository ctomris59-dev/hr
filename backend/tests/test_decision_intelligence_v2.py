from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.config import get_settings
from core.database import Base, get_db
from core.security import create_access_token, hash_password
from db.models import (
    CompensationBenchmarkModel,
    DevelopmentPlanModel,
    EmployeeModel,
    PerformanceEvaluationModel,
    TalentProfileModel,
    TenantModel,
    UserModel,
)
from main import app


@pytest.fixture()
def decision_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    settings = get_settings()
    previous = (settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY)
    settings.SAAS_AUTH_ENABLED = True
    settings.DATABASE_URL = "sqlite://"
    settings.SECRET_KEY = "decision-intelligence-test-secret-" + "x" * 40

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
        ceo = EmployeeModel(id="ceo1", tenant_id="t1", full_name="CEO One", position="Genel Müdür", salary_amount=150000, active=True)
        manager = EmployeeModel(id="m1", tenant_id="t1", full_name="Manager One", department="Sales", position="Sales Manager", manager_employee_id="ceo1", salary_amount=100000, active=True)
        direct = EmployeeModel(id="e1", tenant_id="t1", full_name="Direct One", email="direct@example.com", department="Sales", position="Specialist", manager_employee_id="m1", salary_amount=92000, active=True)
        unrelated = EmployeeModel(id="e2", tenant_id="t1", full_name="Unrelated", department="Finance", position="Specialist", salary_amount=70000, active=True)
        foreign = EmployeeModel(id="x1", tenant_id="t2", full_name="Foreign", department="Sales", position="Specialist", salary_amount=80000, active=True)
        db.add_all([t1, t2, ceo, manager, direct, unrelated, foreign])
        db.add_all([
            UserModel(id="u-ceo", tenant_id="t1", employee_id="ceo1", username="ceo", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
            UserModel(id="u-mgr", tenant_id="t1", employee_id="m1", username="manager", password_hash=hash_password("password"), role="MANAGER", active=True, token_version=1),
            UserModel(id="u-foreign", tenant_id="t2", employee_id="x1", username="foreign", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
        ])
        db.add(
            PerformanceEvaluationModel(
                id="p1",
                tenant_id="t1",
                employee_id="e1",
                evaluator_user_id="u-mgr",
                final_score=4.4,
                kpi_score=4.3,
                manager_performance_score=4.5,
                competency_score=4.2,
                manager_scores_json={"ANA": 4.4, "COM": 4.0, "LRN": 3.8},
                kpi_items_json=[],
                performance_weights_json={"kpi": 60, "manager": 40},
                authority_context_json={},
            )
        )
        db.add(TalentProfileModel(id="tp1", tenant_id="t1", employee_id="e1", career_aspiration=4, mobility_willingness=3))
        db.add(DevelopmentPlanModel(id="d1", tenant_id="t1", employee_id="e1", competency="LRN", goal="Improve", action="Practice", action_type="Mentorluk", success_metric="Re-score", status="Devam Ediyor"))
        db.add(CompensationBenchmarkModel(id="b1", tenant_id="t1", department="Sales", position="Specialist", market_average=100000, source="Market survey"))
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


def test_decision_profile_is_explainable_and_tenant_scoped(decision_client):
    client, token, _ = decision_client
    ceo = auth(token("u-ceo", "t1", "CEO"))
    response = client.get("/api/v1/decision/employees/e1", headers=ceo)
    assert response.status_code == 200
    payload = response.json()
    assert payload["evidence"]["score"] == 100
    assert payload["recommendation"]["autonomous_action"] is False
    assert payload["recommendation"]["decision_authority"] == "human"
    assert [row["step"] for row in payload["explainability_chain"]] == ["Öneri", "Dayanak", "Kanıt Güveni", "Eksik Veri", "Risk", "İnsan Onayı"]

    foreign = client.get("/api/v1/decision/employees/x1", headers=ceo)
    assert foreign.status_code == 404


def test_manager_scope_blocks_unrelated_digital_twin(decision_client):
    client, token, _ = decision_client
    manager = auth(token("u-mgr", "t1", "MANAGER"))
    allowed = client.get("/api/v1/digital-twin/e1", headers=manager)
    denied = client.get("/api/v1/digital-twin/e2", headers=manager)
    assert allowed.status_code == 200
    assert allowed.json()["employee"]["full_name"] == "Direct One"
    assert denied.status_code == 403


def test_human_review_is_persisted_without_autonomous_action(decision_client):
    client, token, _ = decision_client
    manager = auth(token("u-mgr", "t1", "MANAGER"))
    response = client.post(
        "/api/v1/decision/employees/e1/review",
        headers=manager,
        json={"decision_type": "career", "status": "NEEDS_EVIDENCE", "note": "Second observation required"},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "NEEDS_EVIDENCE"
    twin = client.get("/api/v1/digital-twin/e1", headers=manager).json()
    assert twin["human_reviews"][-1]["note"] == "Second observation required"


def test_skills_graph_uses_tenant_evidence(decision_client):
    client, token, _ = decision_client
    response = client.get("/api/v1/skills/graph", headers=auth(token("u-ceo", "t1", "CEO")))
    assert response.status_code == 200
    payload = response.json()
    employee_ids = {row["id"] for row in payload["nodes"] if not str(row["id"]).startswith(("role:", "skill:"))}
    assert "x1" not in employee_ids
    assert "e1" in employee_ids
    assert any(row["skill"] == "ANA" for row in payload["role_requirements"])


def test_compensation_insights_detect_market_gap_and_compression(decision_client):
    client, token, _ = decision_client
    ceo = auth(token("u-ceo", "t1", "CEO"))
    specialist = client.get("/api/v1/compensation/insights/e1", headers=ceo)
    assert specialist.status_code == 200
    assert specialist.json()["compa_ratio"] == 0.92
    assert specialist.json()["market_gap_pct"] == -8.0

    manager = client.get("/api/v1/compensation/insights/m1", headers=ceo)
    assert manager.status_code == 200
    assert manager.json()["compression_risk"] is True


def test_candidate_conversion_links_recruitment_to_employee_lifecycle(decision_client):
    client, token, _ = decision_client
    ceo = auth(token("u-ceo", "t1", "CEO"))
    payload = {
        "candidate_source_id": "cand-42",
        "full_name": "New Hire",
        "email": "newhire@example.com",
        "department": "Sales",
        "position": "Specialist",
        "assessment_summary": "Structured interview + skills evidence",
        "competency_signals": {"ANA": 4.1, "COM": 3.9},
    }
    created = client.post("/api/v1/lifecycle/candidates/convert", headers=ceo, json=payload)
    assert created.status_code == 201
    employee_id = created.json()["employee_id"]
    origin = client.get(f"/api/v1/lifecycle/employees/{employee_id}/origin", headers=ceo)
    assert origin.status_code == 200
    assert origin.json()["source"] == "recruitment"
    assert origin.json()["candidate_source_id"] == "cand-42"

    duplicate = client.post("/api/v1/lifecycle/candidates/convert", headers=ceo, json=payload)
    assert duplicate.status_code == 409


def test_turkiye_compliance_layer_never_stores_connector_secrets(decision_client):
    client, token, _ = decision_client
    ceo = auth(token("u-ceo", "t1", "CEO"))
    status_response = client.get("/api/v1/compliance/turkiye/status", headers=ceo)
    assert status_response.status_code == 200
    assert set(status_response.json()["connectors"]) == {"sgk", "logo", "mikro", "netsis"}

    update = client.patch(
        "/api/v1/compliance/turkiye/connectors/logo",
        headers=ceo,
        json={"enabled": True, "mode": "file", "label": "Logo bordro aktarımı"},
    )
    assert update.status_code == 200
    assert update.json()["enabled"] is True
    assert update.json()["secrets_stored"] is False
    assert "token" not in str(update.json()).lower()
