"""Seed one FutureHR SaaS tenant and admin user.

Usage from backend/ after running migrations:

  export DATABASE_URL='postgresql://...'
  export SECRET_KEY='...'
  export SAAS_BOOTSTRAP_PASSWORD='choose-a-strong-password'
  python scripts/seed_saas_demo.py

No password is committed to the repository. The script is idempotent for the
configured tenant slug and username.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from sqlalchemy import select

# Allow execution from backend/scripts or backend root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.database import db_session  # noqa: E402
from core.security import hash_password  # noqa: E402
from db.models import EmployeeModel, TenantModel, UserModel  # noqa: E402


def main() -> None:
    password = os.getenv("SAAS_BOOTSTRAP_PASSWORD", "")
    if len(password) < 10:
        raise SystemExit("SAAS_BOOTSTRAP_PASSWORD must be at least 10 characters.")

    tenant_slug = os.getenv("SAAS_BOOTSTRAP_TENANT_SLUG", "futurehr-demo").strip().lower()
    tenant_name = os.getenv("SAAS_BOOTSTRAP_TENANT_NAME", "FutureHR Demo Şirketi").strip()
    username = os.getenv("SAAS_BOOTSTRAP_USERNAME", "admin").strip().lower()
    admin_name = os.getenv("SAAS_BOOTSTRAP_ADMIN_NAME", "FutureHR Demo Yöneticisi").strip()
    email = os.getenv("SAAS_BOOTSTRAP_EMAIL", "admin@futurehr.local").strip().lower()

    with db_session() as db:
        tenant = db.scalar(select(TenantModel).where(TenantModel.slug == tenant_slug))
        if not tenant:
            tenant = TenantModel(slug=tenant_slug, name=tenant_name, status="ACTIVE", plan="prototype")
            db.add(tenant)
            db.flush()

        employee = db.scalar(
            select(EmployeeModel).where(
                EmployeeModel.tenant_id == tenant.id,
                EmployeeModel.external_id == "DEMO-ADMIN",
            )
        )
        if not employee:
            employee = EmployeeModel(
                tenant_id=tenant.id,
                external_id="DEMO-ADMIN",
                full_name=admin_name,
                email=email,
                department="Yönetim",
                position="Yönetim / İK Yöneticisi",
                job_family="Genel Yönetim & Destek",
                job_level="L7",
            )
            db.add(employee)
            db.flush()

        user = db.scalar(
            select(UserModel).where(
                UserModel.tenant_id == tenant.id,
                UserModel.username == username,
            )
        )
        if user:
            user.password_hash = hash_password(password)
            user.employee_id = employee.id
            user.email = email
            user.role = "CEO"
            user.active = True
            user.token_version += 1
        else:
            user = UserModel(
                tenant_id=tenant.id,
                employee_id=employee.id,
                username=username,
                email=email,
                password_hash=hash_password(password),
                role="CEO",
                active=True,
            )
            db.add(user)

    print(f"SaaS demo tenant ready: {tenant_slug} / {username}")
    print("Password was read from SAAS_BOOTSTRAP_PASSWORD and was not stored in source code.")


if __name__ == "__main__":
    main()
