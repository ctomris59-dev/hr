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
def access_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    settings = get_settings()
    previous = (settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY)
    settings.SAAS_AUTH_ENABLED = True
    settings.DATABASE_URL = "sqlite://"
    settings.SECRET_KEY = "access-policy-test-secret-" + "x" * 40

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db

    with TestingSession() as db:
        db.add_all([
            TenantModel(id="t1", slug="one", name="One", status="ACTIVE", settings_json={}),
            TenantModel(id="t2", slug="two", name="Two", status="ACTIVE", settings_json={}),
            EmployeeModel(id="e-ceo", tenant_id="t1", full_name="CEO One", active=True),
            EmployeeModel(id="e-hr", tenant_id="t1", full_name="HR One", active=True),
            EmployeeModel(id="e-two", tenant_id="t2", full_name="CEO Two", active=True),
        ])
        db.add_all([
            UserModel(id="u-ceo", tenant_id="t1", employee_id="e-ceo", username="ceo", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
            UserModel(id="u-hr", tenant_id="t1", employee_id="e-hr", username="hr", password_hash=hash_password("password"), role="IK", active=True, token_version=1),
            UserModel(id="u-two", tenant_id="t2", employee_id="e-two", username="ceo2", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
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


def sample_policy() -> dict:
    return {
        "version": 3,
        "moduleOverrides": {"manager": {"experience": False}},
        "resourceOverrides": {
            "manager": {
                "development": {"scope": "DIRECT_REPORTS", "actions": ["view", "edit"]},
                "salary": {"scope": "NONE", "actions": []},
            }
        },
        "documentOverrides": {
            "employee": {"payroll": {"scope": "SELF", "actions": ["view", "export"]}}
        },
        "performance": {
            "secondManagerCanEvaluate": False,
            "hrCanOverride": False,
            "hrOverrideRequiresReason": True,
        },
    }


def test_company_policy_is_tenant_scoped_and_ceo_only(access_client):
    client, token = access_client
    ceo = headers(token("u-ceo", "t1", "CEO"))
    hr = headers(token("u-hr", "t1", "IK"))
    other_company = headers(token("u-two", "t2", "CEO"))

    empty = client.get("/api/v1/access/policy", headers=hr)
    assert empty.status_code == 200
    assert empty.json()["policy"] is None

    denied = client.put("/api/v1/access/policy", headers=hr, json=sample_policy())
    assert denied.status_code == 403

    saved = client.put("/api/v1/access/policy", headers=ceo, json=sample_policy())
    assert saved.status_code == 200
    assert saved.json()["saved"] is True
    assert saved.json()["policy"]["resourceOverrides"]["manager"]["salary"]["scope"] == "NONE"

    same_tenant = client.get("/api/v1/access/policy", headers=hr)
    assert same_tenant.status_code == 200
    assert same_tenant.json()["policy"]["performance"]["secondManagerCanEvaluate"] is False

    isolated = client.get("/api/v1/access/policy", headers=other_company)
    assert isolated.status_code == 200
    assert isolated.json()["policy"] is None


def test_policy_schema_rejects_invalid_scope_and_action(access_client):
    client, token = access_client
    ceo = headers(token("u-ceo", "t1", "CEO"))
    invalid = sample_policy()
    invalid["resourceOverrides"] = {"manager": {"people": {"scope": "EVERYTHING", "actions": ["view", "delete"]}}}
    response = client.put("/api/v1/access/policy", headers=ceo, json=invalid)
    assert response.status_code == 422
