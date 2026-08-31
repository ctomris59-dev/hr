"""Batch compensation intelligence for FutureHR.

This endpoint computes tenant-scoped market position, peer position and manager
compression in memory after a small fixed number of SQL queries. It replaces the
per-employee N+1 request pattern in the compensation evidence workspace.
"""
from __future__ import annotations

from statistics import median
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core.auth import Principal, require_roles
from core.database import get_db
from db.models import CompensationBenchmarkModel, EmployeeModel

router = APIRouter(prefix="/api/v1/compensation", tags=["Compensation Intelligence"])
MANAGEMENT_ROLES = ("CEO", "IK", "HR_ADMIN", "DIRECTOR", "MANAGER")
EXECUTIVE_HR_ROLES = {"CEO", "IK", "HR_ADMIN"}
LINE_MANAGER_ROLES = {"DIRECTOR", "MANAGER"}


def _round(value: float | None, digits: int = 1) -> float | None:
    return None if value is None else round(float(value), digits)


def _scope(principal: Principal, employees: list[EmployeeModel]) -> list[EmployeeModel]:
    role = principal.role.upper()
    if role in EXECUTIVE_HR_ROLES:
        return employees
    if role in LINE_MANAGER_ROLES and principal.employee_id:
        return [
            row
            for row in employees
            if row.id == principal.employee_id
            or row.manager_employee_id == principal.employee_id
            or row.second_manager_employee_id == principal.employee_id
        ]
    return []


@router.get("/overview")
def compensation_overview(
    principal: Principal = Depends(require_roles(*MANAGEMENT_ROLES)),
    db: Session = Depends(get_db),
):
    all_employees = list(
        db.scalars(
            select(EmployeeModel).where(
                EmployeeModel.tenant_id == principal.tenant_id,
                EmployeeModel.active.is_(True),
            )
        ).all()
    )
    scoped = _scope(principal, all_employees)
    benchmarks = list(
        db.scalars(
            select(CompensationBenchmarkModel).where(
                CompensationBenchmarkModel.tenant_id == principal.tenant_id
            )
        ).all()
    )
    benchmark_map = {(row.department, row.position): row for row in benchmarks}

    peer_salaries: dict[tuple[str | None, str | None], list[float]] = {}
    highest_report_salary: dict[str, float] = {}
    for employee in all_employees:
        if employee.salary_amount:
            peer_salaries.setdefault((employee.department, employee.position), []).append(float(employee.salary_amount))
            for manager_id in (employee.manager_employee_id, employee.second_manager_employee_id):
                if manager_id:
                    highest_report_salary[manager_id] = max(
                        highest_report_salary.get(manager_id, 0.0),
                        float(employee.salary_amount),
                    )

    items: list[dict[str, Any]] = []
    ratios: list[float] = []
    benchmarked = 0
    below_market = 0
    compression_count = 0
    for employee in scoped:
        salary = float(employee.salary_amount) if employee.salary_amount else None
        benchmark = benchmark_map.get((employee.department, employee.position))
        market = float(benchmark.market_average) if benchmark else None
        peers = peer_salaries.get((employee.department, employee.position), [])
        peer_median = median(peers) if peers else None
        highest_report = highest_report_salary.get(employee.id)
        compa_ratio = salary / market if salary and market else None
        peer_ratio = salary / peer_median if salary and peer_median else None
        compression_ratio = highest_report / salary if salary and highest_report else None
        compression_risk = bool(compression_ratio is not None and compression_ratio >= 0.90)
        market_gap = ((salary - market) / market) * 100 if salary and market else None

        if market is not None:
            benchmarked += 1
        if compa_ratio is not None:
            ratios.append(compa_ratio)
        if market_gap is not None and market_gap < -5:
            below_market += 1
        if compression_risk:
            compression_count += 1

        items.append(
            {
                "employee_id": employee.id,
                "employee_name": employee.full_name,
                "department": employee.department,
                "position": employee.position,
                "salary_available": salary is not None,
                "market_benchmark_available": market is not None,
                "market_average": _round(market, 0),
                "compa_ratio": _round(compa_ratio, 3),
                "market_gap_pct": _round(market_gap, 1),
                "peer_median": _round(peer_median, 0),
                "peer_position_pct": _round((peer_ratio - 1) * 100, 1) if peer_ratio is not None else None,
                "compression_risk": compression_risk,
                "compression_ratio": _round(compression_ratio, 3),
                "benchmark_source": benchmark.source if benchmark else None,
            }
        )

    ratios.sort()
    ratio_median = median(ratios) if ratios else None
    return {
        "items": items,
        "summary": {
            "employee_count": len(scoped),
            "salary_coverage_pct": round(sum(1 for row in scoped if row.salary_amount is not None) / len(scoped) * 100) if scoped else 0,
            "benchmark_coverage_pct": round(benchmarked / len(scoped) * 100) if scoped else 0,
            "below_market_count": below_market,
            "compression_risk_count": compression_count,
            "median_compa_ratio": _round(ratio_median, 3),
        },
        "method": "Tenant benchmark + same-role peer median + manager/report compression. Advisory only; no compensation mutation is executed.",
    }
