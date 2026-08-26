import hashlib
import random
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from core.config import settings
from repositories.json_store import JsonStore
from config import DB_EMPLOYEE_SCORES_FILE, COMPETENCIES_360
from services.talent_service import get_position_profile_from_data_jobs


_employee_scores_store = JsonStore(DB_EMPLOYEE_SCORES_FILE)


def _seeded_rng(seed_version: str, employee_id: str) -> random.Random:
    seed_input = f"{seed_version}:{employee_id}".encode("utf-8")
    seed_hex = hashlib.sha256(seed_input).hexdigest()[:16]
    seed_int = int(seed_hex, 16)
    return random.Random(seed_int)


def _seeded_rng_from_text(seed_text: str) -> random.Random:
    seed_hex = hashlib.sha256(seed_text.encode("utf-8")).hexdigest()[:16]
    seed_int = int(seed_hex, 16)
    return random.Random(seed_int)


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def derive_competency_score(
    base_score: float,
    seed_version: str,
    employee_id: str,
    competency_id: str,
    salt: str,
    min_value: float = 0.0,
    max_value: float = 5.0,
) -> float:
    seed_text = f"{seed_version}:{employee_id}:{competency_id}:{salt}"
    rng = _seeded_rng_from_text(seed_text)
    delta = rng.uniform(-0.4, 0.4)
    score = _clamp(float(base_score) + delta, min_value, max_value)
    return round(score, 2)


def derive_competency_scores_map(
    base_score: float,
    seed_version: str,
    employee_id: str,
    competency_ids: List[str],
    salt: str,
    min_value: float = 0.0,
    max_value: float = 5.0,
    normalize_mean: bool = True,
) -> Dict[str, float]:
    if not competency_ids:
        return {}
    ordered_ids = sorted(competency_ids)
    deltas: List[Tuple[str, float]] = []
    for competency_id in ordered_ids:
        seed_text = f"{seed_version}:{employee_id}:{competency_id}:{salt}"
        rng = _seeded_rng_from_text(seed_text)
        deltas.append((competency_id, rng.uniform(-0.4, 0.4)))
    avg_delta = 0.0
    if normalize_mean:
        avg_delta = sum(delta for _cid, delta in deltas) / len(deltas)
    scores: Dict[str, float] = {}
    for competency_id, delta in deltas:
        score = _clamp(float(base_score) + (delta - avg_delta), min_value, max_value)
        scores[competency_id] = round(score, 2)
    return scores


def is_demo_scores_active() -> bool:
    if settings.APP_ENV == "production" or settings.ENVIRONMENT == "production":
        return False
    return _employee_scores_store.exists() and len(_employee_scores_store.load()) > 0


def load_employee_scores() -> List[Dict[str, Any]]:
    return _employee_scores_store.load()


def load_employee_scores_map() -> Dict[str, Dict[str, Any]]:
    data = load_employee_scores()
    return {str(item.get("employee_id")): item for item in data if item.get("employee_id")}


def save_employee_scores(records: List[Dict[str, Any]]) -> None:
    _employee_scores_store.save(records)


def build_employee_score(
    seed_version: str,
    tenant_id: str,
    employee_id: str,
    position_name: str,
    score_scale: str = "0-5",
) -> Dict[str, Any]:
    _, matched_role, position_avg = get_position_profile_from_data_jobs(position_name)
    position_score = position_avg if position_avg is not None else 3.5

    rng = _seeded_rng(seed_version, employee_id)

    test_score = _clamp(position_score + rng.uniform(-0.6, 0.4), 1.0, 5.0)
    manager_score = _clamp((test_score * 0.6 + position_score * 0.4) + rng.uniform(-0.3, 0.3), 1.0, 5.0)

    return {
        "tenant_id": tenant_id,
        "employee_id": employee_id,
        "job_id": matched_role or position_name or "",
        "test_score": round(test_score, 2),
        "position_competency_score": round(position_score, 2),
        "manager_score": round(manager_score, 2),
        "score_scale": score_scale,
        "seed_version": seed_version,
        "generated_at": datetime.utcnow().isoformat(),
    }


def generate_demo_employee_scores(
    org_data: List[Dict[str, Any]],
    seed_version: str,
    tenant_id: str = "demo",
) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    for idx, emp in enumerate(org_data):
        name = emp.get("Ad Soyad") or emp.get("name") or ""
        if not name:
            continue
        position = emp.get("Pozisyon") or emp.get("position") or ""
        employee_id = str(emp.get("id") or name or idx + 1)
        record = build_employee_score(
            seed_version=seed_version,
            tenant_id=tenant_id,
            employee_id=employee_id,
            position_name=position,
        )
        records.append(record)
    return records
