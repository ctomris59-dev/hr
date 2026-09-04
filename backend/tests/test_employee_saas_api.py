from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from core.config import get_settings
from core.database import Base, get_db
from core.security import create_access_token, hash_password
from db.models import EmployeeModel, TenantModel, UserModel
from main import app

VALID_PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1gAAAABJRU5ErkJggg=="


@pytest.fixture()
def saas_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    settings = get_settings()
    previous = {
        "SAAS_AUTH_ENABLED": settings.SAAS_AUTH_ENABLED,
        "DATABASE_URL": settings.DATABASE_URL,
        "SECRET_KEY": settings.SECRET_KEY,
    }
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

        ceo1 = EmployeeModel(id="e-ceo-1", tenant_id=t1.id, full_name="CEO One", department="Management", position="CEO", active=True)
        manager1 = EmployeeModel(id="e-mgr-1", tenant_id=t1.id, full_name="Manager One", department="HR", position="Manager", active=True)
        direct1 = EmployeeModel(id="e-dir-1", tenant_id=t1.id, full_name="Direct One", department="HR", position="Specialist", manager_employee_id=manager1.id, hire_date=date(2024, 1, 1), active=True)
        second1 = EmployeeModel(id="e-sec-1", tenant_id=t1.id, full_name="Second One", department="Ops", position="Specialist", second_manager_employee_id=manager1.id, active=True)
        unrelated1 = EmployeeModel(id="e-unr-1", tenant_id=t1.id, full_name="Unrelated One", department="Sales", position="Specialist", active=True)
        foreign = EmployeeModel(id="e-foreign", tenant_id=t2.id, full_name="Foreign Employee", department="Finance", position="Manager", active=True)
        db.add_all([ceo1, manager1, direct1, second1, unrelated1, foreign])

        users = [
            UserModel(id="u-ceo-1", tenant_id=t1.id, employee_id=ceo1.id, username="ceo", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
            UserModel(id="u-mgr-1", tenant_id=t1.id, employee_id=manager1.id, username="manager", password_hash=hash_password("password"), role="MANAGER", active=True, token_version=1),
            UserModel(id="u-emp-1", tenant_id=t1.id, employee_id=direct1.id, username="employee", password_hash=hash_password("password"), role="PERSONEL", active=True, token_version=1),
            UserModel(id="u-ceo-2", tenant_id=t2.id, employee_id=foreign.id, username="foreign-ceo", password_hash=hash_password("password"), role="CEO", active=True, token_version=1),
        ]
        db.add_all(users)
        db.commit()

    client = TestClient(app)

    def token(user_id: str, tenant_id: str, role: str):
        return create_access_token(user_id=user_id, tenant_id=tenant_id, role=role, token_version=1)

    yield client, token

    app.dependency_overrides.clear()
    settings.SAAS_AUTH_ENABLED = previous["SAAS_AUTH_ENABLED"]
    settings.DATABASE_URL = previous["DATABASE_URL"]
    settings.SECRET_KEY = previous["SECRET_KEY"]
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def auth(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_executive_employee_list_is_tenant_scoped(saas_client):
    client, token = saas_client
    response = client.get("/api/v1/employees", headers=auth(token("u-ceo-1", "tenant-1", "CEO")))
    assert response.status_code == 200
    ids = {row["id"] for row in response.json()}
    assert "e-foreign" not in ids
    assert {"e-ceo-1", "e-mgr-1", "e-dir-1"}.issubset(ids)


def test_cross_tenant_employee_id_returns_not_found(saas_client):
    client, token = saas_client
    response = client.get("/api/v1/employees/e-foreign", headers=auth(token("u-ceo-1", "tenant-1", "CEO")))
    assert response.status_code == 404


def test_manager_cannot_open_executive_directory(saas_client):
    client, token = saas_client
    response = client.get("/api/v1/employees", headers=auth(token("u-mgr-1", "tenant-1", "MANAGER")))
    assert response.status_code == 403


def test_manager_team_scope_contains_only_managed_employees(saas_client):
    client, token = saas_client
    response = client.get("/api/v1/employees/team", headers=auth(token("u-mgr-1", "tenant-1", "MANAGER")))
    assert response.status_code == 200
    ids = {row["id"] for row in response.json()}
    assert ids == {"e-dir-1", "e-sec-1"}


def test_employee_me_cannot_escape_own_record(saas_client):
    client, token = saas_client
    employee_token = token("u-emp-1", "tenant-1", "PERSONEL")
    response = client.get("/api/v1/employees/me", headers=auth(employee_token))
    assert response.status_code == 200
    assert response.json()["id"] == "e-dir-1"
    forbidden = client.get("/api/v1/employees/e-unr-1", headers=auth(employee_token))
    assert forbidden.status_code == 403


def test_cross_tenant_manager_reference_is_rejected(saas_client):
    client, token = saas_client
    response = client.post(
        "/api/v1/employees",
        headers=auth(token("u-ceo-1", "tenant-1", "CEO")),
        json={
            "full_name": "New Employee",
            "department": "HR",
            "position": "Specialist",
            "manager_employee_id": "e-foreign",
        },
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["error_code"] == "HTTP_400"
    assert "same company" in payload["error"]


def test_employee_cannot_be_own_manager(saas_client):
    client, token = saas_client
    response = client.patch(
        "/api/v1/employees/e-dir-1",
        headers=auth(token("u-ceo-1", "tenant-1", "CEO")),
        json={"manager_employee_id": "e-dir-1"},
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["error_code"] == "HTTP_400"
    assert "itself" in payload["error"]


def test_executive_can_store_and_employee_can_read_own_avatar(saas_client):
    client, token = saas_client
    ceo_headers = auth(token("u-ceo-1", "tenant-1", "CEO"))
    employee_headers = auth(token("u-emp-1", "tenant-1", "PERSONEL"))

    updated = client.patch(
        "/api/v1/employees/e-dir-1",
        headers=ceo_headers,
        json={"avatar_data_url": VALID_PNG_DATA_URL},
    )
    assert updated.status_code == 200
    payload = updated.json()
    assert payload["has_avatar"] is True
    assert "avatar_data_url" not in payload
    assert "metadata_json" not in payload

    avatar = client.get("/api/v1/employees/e-dir-1/avatar", headers=employee_headers)
    assert avatar.status_code == 200
    assert avatar.headers["content-type"].startswith("image/png")
    assert avatar.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert avatar.headers["x-content-type-options"] == "nosniff"

    cleared = client.patch(
        "/api/v1/employees/e-dir-1",
        headers=ceo_headers,
        json={"avatar_data_url": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["has_avatar"] is False
    assert client.get("/api/v1/employees/e-dir-1/avatar", headers=employee_headers).status_code == 404


def test_manager_avatar_scope_is_limited_to_team(saas_client):
    client, token = saas_client
    ceo_headers = auth(token("u-ceo-1", "tenant-1", "CEO"))
    manager_headers = auth(token("u-mgr-1", "tenant-1", "MANAGER"))

    for employee_id in ("e-dir-1", "e-unr-1"):
        response = client.patch(
            f"/api/v1/employees/{employee_id}",
            headers=ceo_headers,
            json={"avatar_data_url": VALID_PNG_DATA_URL},
        )
        assert response.status_code == 200

    assert client.get("/api/v1/employees/e-dir-1/avatar", headers=manager_headers).status_code == 200
    assert client.get("/api/v1/employees/e-unr-1/avatar", headers=manager_headers).status_code == 403


def test_avatar_rejects_mismatched_image_signature(saas_client):
    client, token = saas_client
    response = client.patch(
        "/api/v1/employees/e-dir-1",
        headers=auth(token("u-ceo-1", "tenant-1", "CEO")),
        json={"avatar_data_url": "data:image/png;base64,SGVsbG8="},
    )
    assert response.status_code == 422
