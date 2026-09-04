"""Regression tests for authenticated workforce scoping."""
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from db.models import Base, EmployeeModel
from routers.workforce_ops_v1 import _scoped_employees


def _employee(employee_id: str, name: str, department: str, manager_id: str | None = None):
    return EmployeeModel(
        id=employee_id,
        tenant_id="tenant-1",
        full_name=name,
        department=department,
        position="Uzman",
        manager_employee_id=manager_id,
        active=True,
    )


@pytest.fixture()
def db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            _employee("mgr-1", "Hakan Çetin", "Operasyon & Üretim"),
            _employee("emp-1", "Pelin Yılmaz", "Operasyon & Üretim", "mgr-1"),
            _employee("emp-2", "Ali Demir", "Operasyon & Üretim", "mgr-1"),
            _employee("hr-1", "Selin Acar", "İnsan Kaynakları"),
        ])
        session.commit()
        yield session


def _principal(role: str, employee_id: str):
    return SimpleNamespace(role=role, employee_id=employee_id, tenant_id="tenant-1")


def test_employee_scope_returns_only_self(db: Session):
    rows = _scoped_employees(_principal("PERSONEL", "emp-1"), db)
    assert [row.id for row in rows] == ["emp-1"]


def test_manager_scope_returns_only_direct_reports(db: Session):
    rows = _scoped_employees(_principal("MANAGER", "mgr-1"), db)
    assert {row.id for row in rows} == {"emp-1", "emp-2"}
    assert "hr-1" not in {row.id for row in rows}


def test_company_roles_keep_tenant_scope(db: Session):
    for role in ("CEO", "IK", "HR_ADMIN"):
        rows = _scoped_employees(_principal(role, "mgr-1"), db)
        assert {row.id for row in rows} == {"mgr-1", "emp-1", "emp-2", "hr-1"}
