# talent_service.py - Rol Bazlı Dinamik Yetkinlik Hedeflemesi Servisi

import json
import os
from typing import Dict, Any, Optional, List, Tuple
from config import COMPETENCIES_360, DB_ORG_FILE, DB_360_FILE, DB_TALENT_ASSESSMENT_FILE
try:
    from data.data_jobs import (
        JOB_PROFILES as DATA_JOB_PROFILES,
        POSITION_ALIASES,
        DEPARTMENT_DEFAULT_PROFILES,
        DEFAULT_JOB_PROFILE_KEY,
    )
except ImportError:
    DATA_JOB_PROFILES = {}
    POSITION_ALIASES = {}
    DEPARTMENT_DEFAULT_PROFILES = {}
    DEFAULT_JOB_PROFILE_KEY = ""

# Rol bazlı hedef profilleri (ROLE_TARGET_PROFILES ile uyumlu)
ROLE_TARGET_PROFILES = {
    "Teknik Lider": {
        "ANA": 4.5, "DIG": 4.5, "DET": 4.0, "LRN": 4.5,
        "LID": 3.5, "COM": 3.0, "STR": 3.0,
        "RES": 4.0, "TEA": 3.5, "ETH": 3.5, "DIS": 3.5
    },
    "Satış Müdürü": {
        "COM": 5.0, "RES": 4.5, "ETH": 4.5, "TEA": 4.0,
        "LID": 4.5, "STR": 4.0,
        "ANA": 2.5, "DIG": 2.5, "DET": 3.0, "LRN": 3.0,
        "DIS": 3.5
    },
    "Genel Yönetici": {
        "LID": 4.5, "STR": 4.5, "COM": 4.0, "RES": 4.0,
        "TEA": 4.0, "ETH": 4.0, "DIS": 4.0,
        "ANA": 3.5, "DIG": 3.0, "DET": 3.5, "LRN": 3.5
    },
    "Kıdemli Uzman": {
        "ANA": 4.0, "DIG": 4.0, "DET": 4.0, "LRN": 4.0,
        "RES": 3.5, "TEA": 3.5, "ETH": 3.5, "DIS": 3.5,
        "LID": 2.5, "COM": 3.0, "STR": 2.5
    },
    "Uzman": {
        "ANA": 3.5, "DIG": 3.5, "DET": 3.5, "LRN": 3.5,
        "RES": 3.0, "TEA": 3.0, "ETH": 3.0, "DIS": 3.0,
        "LID": 2.0, "COM": 3.0, "STR": 2.0
    },
    "Direktörlük/Liderlik": {
        "LID": 5.0, "STR": 5.0, "COM": 4.5, "RES": 4.5,
        "TEA": 4.5, "ETH": 4.5, "DIS": 4.5,
        "ANA": 4.0, "DIG": 3.5, "DET": 4.0, "LRN": 4.0
    },
    "Yöneticilik": {
        "LID": 4.0, "STR": 4.0, "COM": 4.0, "RES": 4.0,
        "TEA": 4.0, "ETH": 4.0, "DIS": 4.0,
        "ANA": 3.5, "DIG": 3.0, "DET": 3.5, "LRN": 3.5
    },
    "Kıdemli Uzmanlık": {
        "ANA": 4.0, "DIG": 4.0, "DET": 4.0, "LRN": 4.0,
        "RES": 3.5, "TEA": 3.5, "ETH": 3.5, "DIS": 3.5,
        "LID": 2.5, "COM": 3.0, "STR": 2.5
    },
    "Uzmanlık": {
        "ANA": 3.5, "DIG": 3.5, "DET": 3.5, "LRN": 3.5,
        "RES": 3.0, "TEA": 3.0, "ETH": 3.0, "DIS": 3.0,
        "LID": 2.0, "COM": 3.0, "STR": 2.0
    },
    "default": {
        "ANA": 3.5, "DIG": 3.5, "DET": 3.5, "LRN": 3.5,
        "RES": 3.5, "TEA": 3.5, "ETH": 3.5, "DIS": 3.5,
        "LID": 3.5, "COM": 3.5, "STR": 3.5
    }
}

# Kritiklik eşiği
CRITICAL_THRESHOLD = 4.0

# Pozisyon kritik yetkinlik haritası (ui_talent.py'den)
ROLE_CRITICAL_MAP = {
    "Yönetici": ["LID", "STR", "RES", "COM"],
    "Satış": ["COM", "RES", "ETH", "TEA"],
    "Teknik": ["ANA", "DIG", "DET", "LRN"],
    "Operasyon": ["DET", "TEA", "RES", "DIS"],
    "Genel": ["COM", "TEA", "RES"]
}

def normalize_position_key(value: str) -> str:
    if not value:
        return ""
    text = value.lower()
    replacements = {
        "ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c",
        "â": "a", "î": "i", "û": "u",
    }
    for src, dest in replacements.items():
        text = text.replace(src, dest)
    for ch in ["&", "/", "(", ")", ".", ",", "-", "_", ":"]:
        text = text.replace(ch, " ")
    text = " ".join(text.split())
    # Common department/abbreviation normalizations
    text = text.replace("insan kaynaklari", "ik")
    text = text.replace("bilgi teknolojileri", "bt")
    text = text.replace("bilgi teknolojisi", "bt")
    text = text.replace("bilgi islem", "bt")
    text = text.replace("ar ge", "arge")
    text = text.replace("ar-ge", "arge")
    return text.strip()

def _build_alias_map() -> Dict[str, str]:
    alias_map: Dict[str, str] = {}
    for alias, canonical in (POSITION_ALIASES or {}).items():
        alias_map[normalize_position_key(alias)] = canonical
    return alias_map

def _resolve_department_default_profile(department: Optional[str]) -> Optional[str]:
    if not department:
        return None
    dept_norm = normalize_position_key(department)
    for dept_name, profile_key in (DEPARTMENT_DEFAULT_PROFILES or {}).items():
        if normalize_position_key(dept_name) == dept_norm:
            return profile_key
    return None

def _convert_profile_to_codes(profile: Dict[str, float]) -> Dict[str, float]:
    name_to_code = {v: k for k, v in COMPETENCIES_360.items()}
    targets_by_code: Dict[str, float] = {}
    for comp_name, score in profile.items():
        code = name_to_code.get(comp_name)
        if code is not None:
            try:
                targets_by_code[code] = float(score)
            except (TypeError, ValueError):
                continue
    return targets_by_code

def resolve_job_profile_key(position_name: str, department: Optional[str] = None) -> Tuple[Optional[str], str]:
    if not position_name or not DATA_JOB_PROFILES:
        return None, "missing"

    if position_name in DATA_JOB_PROFILES:
        return position_name, "exact"

    normalized_pos = normalize_position_key(position_name)
    alias_map = _build_alias_map()
    alias_key = None
    if position_name in (POSITION_ALIASES or {}):
        alias_key = POSITION_ALIASES.get(position_name)
    elif normalized_pos in alias_map:
        alias_key = alias_map.get(normalized_pos)
    if alias_key and alias_key in DATA_JOB_PROFILES:
        return alias_key, "alias"

    best_key = None
    best_len = 0
    for job_name in DATA_JOB_PROFILES.keys():
        normalized_job = normalize_position_key(job_name)
        if normalized_job == normalized_pos:
            return job_name, "normalized"
        if normalized_job and (normalized_job in normalized_pos or normalized_pos in normalized_job):
            if len(normalized_job) > best_len:
                best_key = job_name
                best_len = len(normalized_job)
    if best_key:
        return best_key, "partial"

    dept_default = _resolve_department_default_profile(department)
    if dept_default and dept_default in DATA_JOB_PROFILES:
        return dept_default, "department_default"

    if DEFAULT_JOB_PROFILE_KEY and DEFAULT_JOB_PROFILE_KEY in DATA_JOB_PROFILES:
        return DEFAULT_JOB_PROFILE_KEY, "default"

    return None, "missing"

def get_position_profile_from_data_jobs(
    position_name: str,
    department: Optional[str] = None
) -> Tuple[Optional[Dict[str, float]], Optional[str], Optional[float]]:
    if not position_name or not DATA_JOB_PROFILES:
        return None, None, None

    matched_key, _match_type = resolve_job_profile_key(position_name, department)
    if not matched_key:
        return None, None, None

    best_match = DATA_JOB_PROFILES.get(matched_key)
    if not best_match:
        return None, None, None

    targets_by_code = _convert_profile_to_codes(best_match)

    avg_score = None
    if best_match:
        try:
            avg_score = sum(float(v) for v in best_match.values()) / len(best_match)
        except Exception:
            avg_score = None

    return targets_by_code, matched_key, avg_score


def get_target_profile(position_name: str, department: Optional[str] = None) -> Tuple[Dict[str, float], str]:
    """
    Kişinin mevcut unvanına bakarak gereken yetkinlik profilini belirler (tek kaynak: data_jobs.py).
    
    Args:
        position_name: Çalışanın mevcut pozisyon adı
        
    Returns:
        tuple: (target_profile_dict, target_role_name)
    """
    # 0. Data Jobs - pozisyon bazlı hedefler (tek kaynak)
    targets_by_code, matched_role, _avg_score = get_position_profile_from_data_jobs(position_name, department)
    if targets_by_code:
        # Eksik yetkinlikler için varsayılan (data_jobs) değer ekle
        default_targets, _default_role, _ = get_position_profile_from_data_jobs(DEFAULT_JOB_PROFILE_KEY, department)
        for code in COMPETENCIES_360.keys():
            if code not in targets_by_code:
                if default_targets and code in default_targets:
                    targets_by_code[code] = default_targets[code]
                else:
                    targets_by_code[code] = 3.5
        return targets_by_code, matched_role or position_name

    # Pozisyon bulunamazsa varsayılan job profile kullan
    default_targets, _default_role, _ = get_position_profile_from_data_jobs(DEFAULT_JOB_PROFILE_KEY, department)
    if default_targets:
        return default_targets, DEFAULT_JOB_PROFILE_KEY or (matched_role or position_name)

    return {}, matched_role or position_name

def build_job_profile_gap_report(org_data: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Org chart pozisyonlarını job profile anahtarlarıyla karşılaştırır."""
    try:
        if org_data is None:
            org_data = []
            if os.path.exists(DB_ORG_FILE):
                with open(DB_ORG_FILE, "r", encoding="utf-8") as f:
                    org_data = json.load(f)
    except Exception:
        org_data = []

    position_map: Dict[str, set] = {}
    for emp in (org_data or []):
        pos = (emp.get("Pozisyon") or "").strip()
        if not pos:
            continue
        dept = (emp.get("Departman") or "").strip()
        position_map.setdefault(pos, set()).add(dept)

    items = []
    stats = {
        "exact": 0,
        "alias": 0,
        "normalized": 0,
        "partial": 0,
        "department_default": 0,
        "default": 0,
        "missing": 0,
    }

    for pos, departments in sorted(position_map.items()):
        dept_list = sorted({d for d in departments if d})
        dept = dept_list[0] if dept_list else None
        matched_key, match_type = resolve_job_profile_key(pos, dept)
        stats[match_type] = stats.get(match_type, 0) + 1
        items.append({
            "position": pos,
            "departments": dept_list,
            "match_type": match_type,
            "matched_profile": matched_key,
        })

    missing_positions = [
        item["position"]
        for item in items
        if item["match_type"] in ["department_default", "default", "missing"]
    ]

    return {
        "total_positions": len(position_map),
        "stats": stats,
        "missing_positions": missing_positions,
        "items": items,
    }


def load_employee_data(employee_name: str) -> Optional[Dict[str, Any]]:
    """Çalışan verilerini yükler (org chart ve 360 data birleştirilmiş)."""
    try:
        # Org chart verilerini yükle
        org_data = []
        if os.path.exists(DB_ORG_FILE):
            with open(DB_ORG_FILE, "r", encoding="utf-8") as f:
                org_data = json.load(f)
        
        # 360 verilerini yükle
        data_360 = []
        if os.path.exists(DB_360_FILE):
            with open(DB_360_FILE, "r", encoding="utf-8") as f:
                data_360 = json.load(f)
        
        # Çalışanı bul
        employee = None
        for emp in org_data:
            if emp.get("Ad Soyad") == employee_name:
                employee = emp.copy()
                break
        
        if not employee:
            return None
        
        # 360 verilerini birleştir
        for data in data_360:
            if data.get("Personel") == employee_name or data.get("target") == employee_name:
                employee.update(data)
                break
        
        return employee
    except Exception as e:
        print(f"Error loading employee data: {e}")
        return None


def get_current_scores(employee: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """Çalışanın mevcut yetkinlik puanlarını çıkarır (null güvenli)."""
    scores: Dict[str, Optional[float]] = {}
    
    for code in COMPETENCIES_360.keys():
        # Önce Mgr, sonra Peer, sonra Self değerini al
        val = (
            employee.get(f"{code}_Mgr") or 
            employee.get(f"{code}_Mgr2") or 
            employee.get(f"{code}_Peer") or 
            employee.get(f"{code}_Self")
        )
        if val is None or val == "":
            scores[code] = None
        else:
            try:
                scores[code] = float(val)
            except (TypeError, ValueError):
                scores[code] = None
    
    return scores


def analyze_talent_gap(employee_name: str) -> Dict[str, Any]:
    """
    Çalışan için gap analizi yapar ve hazırlık durumunu belirler.
    
    Returns:
        {
            "current_scores": {competency_code: score},
            "target_scores": {competency_code: target},
            "gaps": {competency_code: gap_value},
            "readiness_status": "READY" | "DEVELOPMENT_NEEDED" | "NOT_READY",
            "target_role": "role_name",
            "critical_gaps": [...],
            "strengths": [...],
            "moderate_gaps": [...]
        }
    """
    # Çalışan verilerini yükle
    employee = load_employee_data(employee_name)
    if not employee:
        return {
            "error": f"Çalışan bulunamadı: {employee_name}",
            "current_scores": {},
            "target_scores": {},
            "gaps": {},
            "readiness_status": "NOT_READY"
        }
    
    # Mevcut puanları al
    current_scores = get_current_scores(employee)
    
    # Hedef profili belirle
    position = employee.get("Pozisyon", "Uzman")
    department = employee.get("Departman", "")
    target_profile, target_role = get_target_profile(position, department)
    
    # Gap hesapla
    gaps = {}
    critical_gaps = []
    moderate_gaps = []
    strengths = []
    missing_scores = []
    
    for code in COMPETENCIES_360.keys():
        current = current_scores.get(code)
        target = target_profile.get(code, 3.5)
        if current is None:
            missing_scores.append({
                "code": code,
                "name": COMPETENCIES_360.get(code, code),
                "current": None,
                "target": target,
                "status": "PENDING_MANAGER_OR_TEST"
            })
            continue
        gap = current - target
        
        gaps[code] = gap
        
        competency_name = COMPETENCIES_360.get(code, code)
        
        if gap < 0:
            # Eksiklik var
            gap_detail = {
                "code": code,
                "name": competency_name,
                "current": current,
                "target": target,
                "gap": abs(gap)
            }
            
            # Kritik kontrolü: Hedef >= 4.0 ise kritik
            if target >= CRITICAL_THRESHOLD:
                critical_gaps.append(gap_detail)
            else:
                moderate_gaps.append(gap_detail)
        elif gap >= 0.5:
            # Güçlü yön
            strengths.append({
                "code": code,
                "name": competency_name,
                "current": current,
                "target": target,
                "excess": gap
            })
    
    # Hazırlık durumu belirleme
    readiness_status = "READY"
    
    # Eğer kritik yetkinliklerde eksiklik varsa NOT_READY
    if critical_gaps:
        readiness_status = "NOT_READY"
    # Eğer orta seviye eksiklikler varsa DEVELOPMENT_NEEDED
    elif moderate_gaps:
        readiness_status = "DEVELOPMENT_NEEDED"
    
    # İsim bazlı skorlar (frontend için)
    current_scores_named = {
        COMPETENCIES_360.get(code, code): score 
        for code, score in current_scores.items()
    }
    
    target_scores_named = {
        COMPETENCIES_360.get(code, code): target 
        for code, target in target_profile.items()
    }
    
    average_current = 0
    valid_current_values = [v for v in current_scores.values() if isinstance(v, (int, float))]
    if valid_current_values:
        average_current = sum(valid_current_values) / len(valid_current_values)

    return {
        "employee_name": employee_name,
        "current_position": position,
        "target_role": target_role,
        "current_scores": current_scores_named,
        "target_scores": target_scores_named,
        "current_scores_coded": current_scores,  # Kod bazlı (backend için)
        "target_scores_coded": target_profile,    # Kod bazlı (backend için)
        "gaps": gaps,
        "readiness_status": readiness_status,
        "critical_gaps": critical_gaps,
        "moderate_gaps": moderate_gaps,
        "strengths": strengths,
        "missing_scores": missing_scores,
        "average_current": average_current,
        "average_target": sum(target_profile.values()) / len(target_profile) if target_profile else 0
    }

def load_talent_assessments() -> List[Dict[str, Any]]:
    """TalentAssessment veritabanını yükler (file lock)."""
    from config import DB_TALENT_ASSESSMENT_FILE
    from repositories.json_store import JsonStore
    
    store = JsonStore(DB_TALENT_ASSESSMENT_FILE)
    return store.load()


def save_talent_assessment(employee_id: str, period: str, performance_score: float, potential_score: float) -> bool:
    """Yeni bir talent assessment kaydı ekler."""
    from config import DB_TALENT_ASSESSMENT_FILE
    import json
    import os
    from datetime import datetime
    
    assessments = load_talent_assessments()
    
    # Aynı employee ve period için mevcut kaydı güncelle veya yeni ekle
    existing = next(
        (a for a in assessments if a.get("employee_id") == employee_id and a.get("period") == period),
        None
    )
    
    # Eski değerleri kaydet (history için)
    old_performance = existing.get("performance_score") if existing else None
    old_potential = existing.get("potential_score") if existing else None
    
    new_record = {
        "id": existing.get("id") if existing else len(assessments) + 1,
        "employee_id": employee_id,
        "period": period,
        "performance_score": performance_score,
        "potential_score": potential_score,
        "created_at": existing.get("created_at") if existing else datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    if existing:
        assessments = [a if a.get("id") == existing.get("id") else a for a in assessments]
        assessments[assessments.index(existing)] = new_record
    else:
        assessments.append(new_record)
    
    try:
        from repositories.json_store import JsonStore
        store = JsonStore(DB_TALENT_ASSESSMENT_FILE)
        store.save(assessments)
        
        # Otomatik tarihçe kaydı (History Service)
        try:
            from services.history_service import record_talent_assessment
            # Employee ID'den isim bul
            from utils_db import load_org_chart
            org_data = load_org_chart()
            employee_name = employee_id  # Default: ID = Name
            for person in org_data:
                if str(person.get("id", "")) == str(employee_id) or person.get("Ad Soyad", "") == employee_id:
                    employee_name = person.get("Ad Soyad", employee_id)
                    break
            
            record_talent_assessment(
                employee_name=employee_name,
                performance_score=performance_score,
                potential_score=potential_score,
                period=period
            )
        except Exception as e:
            print(f"History service error (talent): {e}")
        
        return True
    except Exception as e:
        print(f"Error saving talent assessment: {e}")
        return False


def get_previous_period_scores(employee_id: str, current_period: str) -> Optional[Dict[str, float]]:
    """Bir önceki dönem puanlarını döndürür."""
    assessments = load_talent_assessments()
    
    # Dönem sıralaması (Q1, Q2, Q3, Q4)
    period_order = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}
    
    # Mevcut dönem bilgisini çıkar
    current_year = current_period.split("-")[0] if "-" in current_period else "2025"
    current_q = current_period.split("-")[1] if "-" in current_period else "Q1"
    
    # Önceki dönemi hesapla
    prev_q_num = period_order.get(current_q, 1) - 1
    if prev_q_num < 1:
        prev_q_num = 4
        prev_year = str(int(current_year) - 1)
    else:
        prev_year = current_year
    
    prev_period = f"{prev_year}-{list(period_order.keys())[prev_q_num - 1]}"
    
    # Önceki dönem kaydını bul
    prev_assessment = next(
        (a for a in assessments if a.get("employee_id") == employee_id and a.get("period") == prev_period),
        None
    )
    
    if prev_assessment:
        return {
            "performance": prev_assessment.get("performance_score", 0),
            "potential": prev_assessment.get("potential_score", 0)
        }
    
    return None


def get_talent_matrix_with_history(simulation_date: str = None) -> List[Dict[str, Any]]:
    """9-Box matrisi için veri döndürür (geçmiş verilerle birlikte - Ghost Trail)."""
    from utils_db import load_org_chart, load_360_data
    from datetime import datetime
    
    # Gelecek tarih kontrolü
    is_future_date = False
    if simulation_date:
        sim_dt = datetime.fromisoformat(simulation_date) if isinstance(simulation_date, str) else simulation_date
        now_dt = datetime.now()
        is_future_date = sim_dt > now_dt
    
    org_data = load_org_chart(simulation_date)
    data_360 = load_360_data(simulation_date)
    
    # Mevcut dönem
    if simulation_date:
        sim_dt = datetime.fromisoformat(simulation_date) if isinstance(simulation_date, str) else simulation_date
        current_date = sim_dt
    else:
        current_date = datetime.now()
    current_period = f"{current_date.year}-Q{((current_date.month - 1) // 3) + 1}"
    
    result = []
    for person in org_data:
        name = person.get("Ad Soyad", "")
        person_360 = next(
            (p for p in data_360 if p.get("Personel") == name or p.get("target") == name),
            None
        )
        
        if person_360:
            # Gelecek tarih ise tahmin motorunu kullan
            if is_future_date:
                try:
                    from services.history_service import predict_future_talent_matrix
                    prediction = predict_future_talent_matrix(name, simulation_date)
                    if prediction.get("is_prediction"):
                        perf = prediction.get("predicted_performance", 3.0)
                        pot = prediction.get("predicted_potential", 3.0)
                        is_prediction = True
                    else:
                        perf = float(person_360.get("Performans", 0))
                        pot = float(person_360.get("Potansiyel", 0))
                        is_prediction = False
                except Exception as e:
                    print(f"Prediction error for {name}: {e}")
                    perf = float(person_360.get("Performans", 0))
                    pot = float(person_360.get("Potansiyel", 0))
                    is_prediction = False
            else:
                perf = float(person_360.get("Performans", 0))
                pot = float(person_360.get("Potansiyel", 0))
                is_prediction = False
            
            # Geçmiş verileri yükle (sadece geçmiş tarihler için)
            if not is_future_date:
                prev_scores = get_previous_period_scores(name, current_period)
                if prev_scores:
                    prev_perf = prev_scores.get("performance", perf - 0.1)
                    prev_pot = prev_scores.get("potential", pot - 0.1)
                else:
                    # Eğer geçmiş veri yoksa, mevcut veriyi kaydet ve küçük bir fark ekle
                    prev_perf = perf - 0.1  # Demo için
                    prev_pot = pot - 0.1
                    save_talent_assessment(name, current_period, perf, pot)
            else:
                # Gelecek için önceki veri = mevcut (bugünkü) veri
                prev_scores = get_previous_period_scores(name, current_period)
                if prev_scores:
                    prev_perf = prev_scores.get("performance", perf - 0.1)
                    prev_pot = prev_scores.get("potential", pot - 0.1)
                else:
                    prev_perf = perf - 0.1
                    prev_pot = pot - 0.1
            
            # Mevcut veriyi kaydet (sadece geçmiş tarihler için)
            if not is_future_date:
                save_talent_assessment(name, current_period, perf, pot)
            
            result.append({
                "id": name,
                "name": name,
                "position": person.get("Pozisyon", ""),
                "department": person.get("Departman", ""),
                "salary": person.get("Maaş (TL)", 0),
                "current": {"x": perf, "y": pot},
                "previous": {"x": prev_perf, "y": prev_pot},
                "period": current_period,
                "date": person_360.get("date", ""),
                "box_id": categorize_9box_id(perf, pot),
                "box_name": categorize_9box_name(perf, pot),
                "box_position": get_box_position(perf, pot),
                "color": get_box_color(perf, pot),
                "bg_color": get_box_bg_color(perf, pot),
                "is_prediction": is_prediction  # Frontend için flag
            })
    
    return result

def categorize_9box_id(perf: float, pot: float) -> int:
    """9-Box kategorisini ID olarak döndürür (1-9)."""
    p_cat = 0 if perf < 3.0 else (1 if perf < 4.0 else 2)
    pot_cat = 0 if pot < 3.0 else (1 if pot < 4.0 else 2)
    return pot_cat * 3 + p_cat + 1

def categorize_9box_name(perf: float, pot: float) -> str:
    """9-Box kategorisini isim olarak döndürür."""
    p_cat = 0 if perf < 3.0 else (1 if perf < 4.0 else 2)
    pot_cat = 0 if pot < 3.0 else (1 if pot < 4.0 else 2)
    
    if pot_cat == 2 and p_cat == 2:
        return "Yıldız Oyuncu"
    elif pot_cat == 2 and p_cat == 1:
        return "Yüksek Potansiyel"
    elif pot_cat == 1 and p_cat == 2:
        return "Yüksek Performans"
    elif pot_cat == 2 and p_cat == 0:
        return "Soru İşareti"
    elif pot_cat == 1 and p_cat == 1:
        return "Kilit Oyuncu"
    elif pot_cat == 0 and p_cat == 2:
        return "Güvenilir Profesyonel"
    elif pot_cat == 1 and p_cat == 0:
        return "Uyumsuz"
    elif pot_cat == 0 and p_cat == 1:
        return "Etkili Oyuncu"
    else:
        return "Riskli"

def get_box_position(perf: float, pot: float) -> Dict[str, int]:
    """9-Box matrisindeki pozisyonu döndürür (x: 0-2, y: 0-2)."""
    x = 0 if perf < 3.0 else (1 if perf < 4.0 else 2)
    y = 0 if pot < 3.0 else (1 if pot < 4.0 else 2)
    return {"x": x, "y": y}

def get_box_color(perf: float, pot: float) -> str:
    """Box rengini döndürür."""
    if pot >= 4.0 and perf >= 4.0:
        return "#10b981"  # Green
    elif pot >= 4.0 or perf >= 4.0:
        return "#f59e0b"  # Yellow
    else:
        return "#ef4444"  # Red

def get_box_bg_color(perf: float, pot: float) -> str:
    """Box arka plan rengini döndürür."""
    if pot >= 4.0 and perf >= 4.0:
        return "#d1fae5"
    elif pot >= 4.0 or perf >= 4.0:
        return "#fef3c7"
    else:
        return "#fee2e2"

def get_action_recommendations(box_id: int, perf: float, pot: float) -> Dict[str, Any]:
    """Box ID'sine göre aksiyon önerileri döndürür (AI Recommendation)."""
    recommendations_map = {
        1: {"icon": "⭐", "title": "Yıldız Oyuncu", "recommendations": ["Terfi düşün", "Mentorluk ver", "Zam yap"], "priority": "Yüksek", "color": "green"},
        2: {"icon": "🚀", "title": "Yüksek Potansiyel", "recommendations": ["Gelişim planı hazırla", "Zorlu projeler ver", "Liderlik eğitimi"], "priority": "Yüksek", "color": "yellow"},
        3: {"icon": "💎", "title": "Yüksek Performans", "recommendations": ["Potansiyel geliştir", "Liderlik eğitimi", "Zorlu görevler ver"], "priority": "Orta", "color": "blue"},
        4: {"icon": "❓", "title": "Soru İşareti", "recommendations": ["Performans değerlendirmesi", "Destek sağla", "Hedef belirle"], "priority": "Orta", "color": "yellow"},
        5: {"icon": "🔑", "title": "Kilit Oyuncu", "recommendations": ["Gelişim fırsatları", "Mentorluk al", "Proje liderliği"], "priority": "Orta", "color": "blue"},
        6: {"icon": "✅", "title": "Güvenilir Profesyonel", "recommendations": ["Potansiyel geliştir", "Yeni sorumluluklar", "Eğitim"], "priority": "Düşük", "color": "green"},
        7: {"icon": "⚠️", "title": "Uyumsuz", "recommendations": ["Performans planı", "Koçluk", "Hedef belirle"], "priority": "Yüksek", "color": "orange"},
        8: {"icon": "📈", "title": "Etkili Oyuncu", "recommendations": ["Gelişim planı", "Eğitim", "Destek"], "priority": "Orta", "color": "blue"},
        9: {"icon": "🚨", "title": "Riskli", "recommendations": ["Performans planı", "Destek sağla", "Eğitim ata"], "priority": "Kritik", "color": "red"}
    }
    return recommendations_map.get(box_id, {"icon": "📊", "title": "Standart", "recommendations": [], "priority": "Orta", "color": "gray"})


def get_department_average_scores(department: str) -> Dict[str, float]:
    """Departmandaki diğer çalışanların ortalama yetkinlik puanlarını döndürür."""
    from utils_db import load_org_chart, load_360_data
    
    org_data = load_org_chart()
    data_360 = load_360_data()
    
    # Departmandaki çalışanları bul
    dept_employees = [p for p in org_data if p.get("Departman") == department]
    
    if not dept_employees:
        return {}
    
    # Her yetkinlik için ortalama hesapla
    competency_totals = {}
    competency_counts = {}
    
    for employee in dept_employees:
        name = employee.get("Ad Soyad", "")
        person_360 = next(
            (p for p in data_360 if p.get("Personel") == name or p.get("target") == name),
            None
        )
        
        if person_360:
            for code in COMPETENCIES_360.keys():
                # LID (Liderlik) yetkinliğini atla
                if code == "LID":
                    continue
                    
                val = (
                    person_360.get(f"{code}_Mgr") or 
                    person_360.get(f"{code}_Mgr2") or 
                    person_360.get(f"{code}_Peer") or 
                    person_360.get(f"{code}_Self") or 
                    0
                )
                if val:
                    if code not in competency_totals:
                        competency_totals[code] = 0
                        competency_counts[code] = 0
                    competency_totals[code] += float(val)
                    competency_counts[code] += 1
    
    # Ortalamaları hesapla (LID hariç)
    averages = {}
    for code in COMPETENCIES_360.keys():
        # LID (Liderlik) yetkinliğini atla
        if code == "LID":
            continue
        if code in competency_counts and competency_counts[code] > 0:
            averages[COMPETENCIES_360[code]] = competency_totals[code] / competency_counts[code]
        else:
            averages[COMPETENCIES_360[code]] = 3.0  # Varsayılan
    
    return averages


def analyze_talent_deep(employee_name: str, simulation_date: Optional[str] = None) -> Dict[str, Any]:
    """
    3 Katmanlı Radar Analizi: Current, Target, Benchmark (Dept Avg)
    """
    from datetime import datetime
    
    # Gelecek tarih kontrolü
    is_future_date = False
    if simulation_date:
        sim_dt = datetime.fromisoformat(simulation_date) if isinstance(simulation_date, str) else simulation_date
        now_dt = datetime.now()
        is_future_date = sim_dt > now_dt
    
    employee = load_employee_data(employee_name, simulation_date)
    if not employee:
        return {"error": f"Çalışan bulunamadı: {employee_name}"}
    
    # Mevcut puanlar (gelecek ise tahmin kullan)
    if is_future_date:
        try:
            from services.history_service import predict_future_performance
            prediction = predict_future_performance(employee_name, simulation_date)
            if prediction.get("is_prediction") and prediction.get("predicted_scores"):
                # Tahmin edilmiş puanları kullan
                predicted_scores = prediction.get("predicted_scores", {})
                current_scores = {}
                for code, name in COMPETENCIES_360.items():
                    if code != "LID" and code in predicted_scores:
                        current_scores[code] = predicted_scores[code]
                    elif code != "LID":
                        # Tahmin yoksa mevcut puanı kullan
                        current_scores[code] = get_current_scores(employee).get(code, 3.0)
            else:
                current_scores = get_current_scores(employee)
        except Exception as e:
            print(f"Prediction error in analyze_talent_deep: {e}")
            current_scores = get_current_scores(employee)
    else:
        current_scores = get_current_scores(employee)
    
    # LID (Liderlik) yetkinliğini çıkar
    current_scores_filtered = {code: score for code, score in current_scores.items() if code != "LID"}
    current_scores_named = {
        COMPETENCIES_360.get(code, code): score 
        for code, score in current_scores_filtered.items()
    }
    
    # Hedef puanlar
    position = employee.get("Pozisyon", "Uzman")
    department = employee.get("Departman", "")
    target_profile, target_role = get_target_profile(position, department)
    # LID (Liderlik) yetkinliğini çıkar
    target_profile_filtered = {code: target for code, target in target_profile.items() if code != "LID"}
    target_scores_named = {
        COMPETENCIES_360.get(code, code): target 
        for code, target in target_profile_filtered.items()
    }
    
    # Departman ortalaması
    department = employee.get("Departman", "")
    dept_avg_scores = get_department_average_scores(department, simulation_date)
    # LID (Liderlik) yetkinliğini çıkar
    dept_avg_scores = {name: score for name, score in dept_avg_scores.items() if name != "Liderlik"}
    
    # AI Önerisi
    perf = float(employee.get("Performans", 0))
    pot = float(employee.get("Potansiyel", 0))
    box_id = categorize_9box_id(perf, pot)
    recommendations = get_action_recommendations(box_id, perf, pot)
    
    # Gap analizi
    gap_analysis = analyze_talent_gap(employee_name)
    
    return {
        "employee_name": employee_name,
        "position": position,
        "department": department,
        "target_role": target_role,
        "current": current_scores_named,
        "target": target_scores_named,
        "benchmark": dept_avg_scores,
        "box_name": categorize_9box_name(perf, pot),
        "box_id": box_id,
        "ai_recommendation": recommendations,
        "gap_analysis": gap_analysis
    }

