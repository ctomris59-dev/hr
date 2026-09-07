from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.config import get_settings
from core.database import Base, get_db
from core.security import create_access_token, hash_password
from db.models import EmployeeModel, LeaveRequestModel, TenantModel, UserModel
from main import app


@pytest.fixture()
def dashboard_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    settings = get_settings()
    previous = (settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY)
    settings.SAAS_AUTH_ENABLED = True
    settings.DATABASE_URL = "sqlite://"
    settings.SECRET_KEY = "dashboard-test-" + "x" * 48

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with Session() as db:
        t1 = TenantModel(id="dash-t1", slug="dash-one", name="Dash One", status="ACTIVE")
        t2 = TenantModel(id="dash-t2", slug="dash-two", name="Dash Two", status="ACTIVE")
        e1 = EmployeeModel(id="dash-e1", tenant_id=t1.id, full_name="CEO One", department="Management", position="CEO", active=True)
        e2 = EmployeeModel(id="dash-e2", tenant_id=t1.id, full_name="Employee One", department="HR", position="Specialist", active=True)
        foreign = EmployeeModel(id="dash-foreign", tenant_id=t2.id, full_name="Foreign Employee", department="Finance", position="Manager", active=True)
        u1 = UserModel(id="dash-u1", tenant_id=t1.id, employee_id=e1.id, username="ceo1", password_hash=hash_password("x"), role="CEO", active=True, token_version=1)
        u2 = UserModel(id="dash-u2", tenant_id=t2.id, employee_id=foreign.id, username="ceo2", password_hash=hash_password("x"), role="CEO", active=True, token_version=1)
        db.add_all([t1, t2, e1, e2, foreign, u1, u2])
        db.add(LeaveRequestModel(tenant_id=t1.id, employee_id=e2.id, leave_type="annual", start_date=date(2026, 9, 10), end_date=date(2026, 9, 11), days=2, status="Bekliyor"))
        db.add(LeaveRequestModel(tenant_id=t2.id, employee_id=foreign.id, leave_type="annual", start_date=date(2026, 9, 10), end_date=date(2026, 9, 11), days=2, status="Bekliyor"))
        db.commit()

    client = TestClient(app)
    yield client, lambda uid, tid: create_access_token(user_id=uid, tenant_id=tid, role="CEO", token_version=1)
    app.dependency_overrides.clear()
    settings.SAAS_AUTH_ENABLED, settings.DATABASE_URL, settings.SECRET_KEY = previous
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_dashboard_summary_is_tenant_scoped(dashboard_client):
    client, token = dashboard_client
    response = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token('dash-u1', 'dash-t1')}"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["tenant_scoped"] is True
    assert payload["employee_count"] == 2
    assert payload["counts"]["pending_leave"] == 1
    assert payload["scope"] == "COMPANY"
    assert payload["tenant"]["id"] == "dash-t1"


def test_cross_tenant_token_cannot_switch_dashboard_tenant(dashboard_client):
    client, token = dashboard_client
    forged = token("dash-u1", "dash-t2")
    response = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401
