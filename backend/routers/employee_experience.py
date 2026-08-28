from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from config import DB_PULSE_FILE
from repositories.json_store import JsonStore
from routers.dependencies import get_current_user_dept, get_current_user_role
from utils_db import load_org_chart

router = APIRouter()
_pulse_store = JsonStore(DB_PULSE_FILE)

ANONYMITY_THRESHOLD = 5
DRIVERS = {
    "workload": {"label": "İş Yükü", "question": "Bu hafta iş yüküm sürdürülebilir düzeydeydi."},
    "energy": {"label": "Enerji", "question": "Bu hafta işimi yaparken enerjimi koruyabildim."},
    "manager_support": {"label": "Yönetici Desteği", "question": "İhtiyaç duyduğumda yöneticimden yeterli destek alabildim."},
    "role_clarity": {"label": "Rol Netliği", "question": "Bu hafta önceliklerim ve benden beklenenler netti."},
    "growth": {"label": "Gelişim", "question": "Bu hafta öğrenme veya gelişme fırsatı buldum."},
}
DRIVER_ROTATION = [
    ("workload", "energy"),
    ("manager_support", "role_clarity"),
    ("growth", "workload"),
    ("energy", "manager_support"),
    ("role_clarity", "growth"),
]


class EmployeeExperienceSubmitRequest(BaseModel):
    user_name: str = Field(..., min_length=1, max_length=160)
    score: float = Field(..., ge=1, le=10)
    drivers: Dict[str, float] = Field(default_factory=dict)
    feedback: Optional[str] = Field(default=None, max_length=500)
    department_id: Optional[str] = Field(default=None, max_length=160)


def _week_context():
    now = datetime.now()
    iso = now.isocalendar()
    week_number = f"{iso.year}-W{iso.week:02d}"
    week_start = (now - timedelta(days=now.weekday())).date().isoformat()
    rotation = DRIVER_ROTATION[(iso.week - 1) % len(DRIVER_ROTATION)]
    return week_number, week_start, rotation


def _driver_payload(keys):
    return [
        {"key": key, "label": DRIVERS[key]["label"], "question": DRIVERS[key]["question"]}
        for key in keys
    ]


def _normalized_name(value: str) -> str:
    return str(value or "").strip().casefold()


def _scope_department(role: str, dept: str, requested: Optional[str]) -> Optional[str]:
    normalized_role = str(role or "").upper()
    if normalized_role in {"CEO", "IK", "ADMIN"}:
        return requested or None
    return dept or requested or None


def _filter_scope(answers, department: Optional[str]):
    if not department:
        return answers
    return [
        item for item in answers
        if str(item.get("department_id") or "") == department
        or str(item.get("department_name") or "") == department
    ]


def _private_weekly_trends(department_id=None):
    """Privacy-safe replacement used by the legacy dashboard trend route."""
    answers = _filter_scope(_pulse_store.load(), department_id)
    grouped = defaultdict(list)
    for item in answers:
        week = str(item.get("week_number") or "")
        score = item.get("score")
        if not week:
            continue
        try:
            numeric = float(score)
        except (TypeError, ValueError):
            continue
        if 1 <= numeric <= 10:
            grouped[week].append(numeric)

    result = []
    for week in sorted(grouped.keys()):
        values = grouped[week]
        count = len(values)
        if count < ANONYMITY_THRESHOLD:
            result.append({
                "week": week,
                "average_score": 0,
                "count": count,
                "suppressed": True,
                "anonymity_threshold": ANONYMITY_THRESHOLD,
            })
            continue
        result.append({
            "week": week,
            "average_score": round(sum(values) / count, 2),
            "count": count,
            "suppressed": False,
            "anonymity_threshold": ANONYMITY_THRESHOLD,
        })
    return result


def install_legacy_privacy_guard():
    """Keep the old /api/pulse-trends route privacy-safe during the v2 migration."""
    import utils_db
    utils_db.get_pulse_trends = _private_weekly_trends


@router.get("/api/pulse/v2/status")
async def employee_experience_status(user_name: str = Query(..., min_length=1)):
    week_number, week_start, rotation = _week_context()
    normalized = _normalized_name(user_name)
    submitted = any(
        _normalized_name(item.get("employee_name") or item.get("user_name")) == normalized
        and item.get("week_number") == week_number
        for item in _pulse_store.load()
    )
    return {
        "success": True,
        "hasSubmitted": submitted,
        "weekStart": week_start,
        "weekNumber": week_number,
        "drivers": _driver_payload(rotation),
        "anonymityThreshold": ANONYMITY_THRESHOLD,
    }


@router.post("/api/pulse/v2/submit")
async def submit_employee_experience(request: EmployeeExperienceSubmitRequest):
    week_number, _, rotation = _week_context()
    normalized = _normalized_name(request.user_name)
    current = _pulse_store.load()

    if any(
        _normalized_name(item.get("employee_name") or item.get("user_name")) == normalized
        and item.get("week_number") == week_number
        for item in current
    ):
        raise HTTPException(status_code=409, detail="Bu haftanın check-in'i zaten gönderildi.")

    expected = set(rotation)
    supplied = set(request.drivers.keys())
    if supplied != expected:
        raise HTTPException(status_code=422, detail="Bu haftanın iki driver sorusu eksiksiz yanıtlanmalıdır.")

    clean_drivers: Dict[str, float] = {}
    for key, value in request.drivers.items():
        if key not in DRIVERS:
            raise HTTPException(status_code=422, detail="Geçersiz deneyim driver'ı.")
        numeric = float(value)
        if numeric < 1 or numeric > 5:
            raise HTTPException(status_code=422, detail="Driver puanları 1-5 arasında olmalıdır.")
        clean_drivers[key] = numeric

    employee = next(
        (
            item for item in load_org_chart()
            if _normalized_name(item.get("Ad Soyad") or item.get("name")) == normalized
        ),
        {},
    )
    department = request.department_id or employee.get("Departman") or employee.get("department") or "Belirtilmemiş"
    employee_id = str(employee.get("id") or employee.get("employee_id") or request.user_name)

    current.append({
        "id": int(datetime.now().timestamp() * 1000),
        "employee_id": employee_id,
        "employee_name": request.user_name.strip(),
        "department_id": str(department),
        "department_name": str(department),
        "score": float(request.score),
        "drivers": clean_drivers,
        "driver_set": list(rotation),
        "feedback": (request.feedback or "").strip(),
        "created_at": datetime.now().isoformat(),
        "week_number": week_number,
        "schema_version": "pulse-v2",
    })
    _pulse_store.save(current)
    return {
        "success": True,
        "message": "Check-in kaydedildi. Yönetim görünümünde yalnızca anonim toplu sonuçlar kullanılır.",
        "anonymityThreshold": ANONYMITY_THRESHOLD,
    }


@router.get("/api/pulse/analytics")
async def employee_experience_analytics(
    department_id: Optional[str] = None,
    user_role: Optional[str] = None,
    user_dept: Optional[str] = None,
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
):
    effective_role = user_role or role
    effective_dept = user_dept or dept
    scope_department = _scope_department(effective_role, effective_dept, department_id)
    answers = _filter_scope(_pulse_store.load(), scope_department)

    org = load_org_chart()
    if scope_department:
        org = [
            item for item in org
            if str(item.get("Departman") or item.get("department") or "") == scope_department
        ]
    population = len(org)

    weekly = defaultdict(lambda: {"scores": [], "drivers": defaultdict(list), "comments": 0})
    for item in answers:
        week = str(item.get("week_number") or "")
        if not week:
            continue
        try:
            score = float(item.get("score"))
        except (TypeError, ValueError):
            continue
        if 1 <= score <= 10:
            weekly[week]["scores"].append(score)
        if str(item.get("feedback") or "").strip():
            weekly[week]["comments"] += 1
        drivers = item.get("drivers") or {}
        if isinstance(drivers, dict):
            for key, value in drivers.items():
                if key not in DRIVERS:
                    continue
                try:
                    numeric = float(value)
                except (TypeError, ValueError):
                    continue
                if 1 <= numeric <= 5:
                    weekly[week]["drivers"][key].append(numeric)

    trend = []
    previous_driver_values: Dict[str, float] = {}
    for week in sorted(weekly.keys()):
        bucket = weekly[week]
        count = len(bucket["scores"])
        protected = count < ANONYMITY_THRESHOLD
        row = {
            "week": week,
            "count": count,
            "suppressed": protected,
            "average_score": None,
            "participation": round((count / population) * 100, 1) if population else None,
            "comment_count": bucket["comments"] if not protected else None,
            "drivers": {},
        }
        if not protected and count:
            row["average_score"] = round(sum(bucket["scores"]) / count, 2)
            for key, values in bucket["drivers"].items():
                if len(values) < ANONYMITY_THRESHOLD:
                    continue
                average = round(sum(values) / len(values), 2)
                row["drivers"][key] = {
                    "key": key,
                    "label": DRIVERS[key]["label"],
                    "average": average,
                    "count": len(values),
                    "delta": round(average - previous_driver_values[key], 2) if key in previous_driver_values else None,
                }
                previous_driver_values[key] = average
        trend.append(row)

    visible = [row for row in trend if not row["suppressed"] and row["average_score"] is not None]
    latest = visible[-1] if visible else None
    previous = visible[-2] if len(visible) > 1 else None
    latest_delta = round(latest["average_score"] - previous["average_score"], 2) if latest and previous else None
    latest_drivers = list((latest or {}).get("drivers", {}).values())
    lowest_driver = min(latest_drivers, key=lambda item: item["average"]) if latest_drivers else None
    strongest_driver = max(latest_drivers, key=lambda item: item["average"]) if latest_drivers else None

    current_week, _, rotation = _week_context()
    current_bucket = next((row for row in trend if row["week"] == current_week), None)

    return {
        "success": True,
        "scope": {"department": scope_department, "population": population},
        "anonymity": {
            "threshold": ANONYMITY_THRESHOLD,
            "currentRespondents": int((current_bucket or {}).get("count", 0)),
            "currentProtected": bool((current_bucket or {}).get("suppressed", True)),
        },
        "currentDrivers": _driver_payload(rotation),
        "latest": latest,
        "latestDelta": latest_delta,
        "lowestDriver": lowest_driver,
        "strongestDriver": strongest_driver,
        "trend": trend[-12:],
        "privacyNote": "Beşten az yanıt bulunan gruplarda skor, driver ve yorum metni yönetim görünümünde gösterilmez.",
    }
