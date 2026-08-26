# succession_service.py
# Yedekleme Planı Servisi - Trafik Işığı Paneli ve Risk Analizi

import os
from typing import Dict, List, Optional, Any
from enum import Enum

# Config import
try:
    from config import DB_SUCCESSION_FILE, COMPETENCIES_360
except ImportError:
    DB_SUCCESSION_FILE = "future_succession_db.json"
    COMPETENCIES_360 = {}

# Import professional JSON store
from repositories.json_store import JsonDictStore

from utils_db import load_org_chart, load_360_data, load_leave_requests

# Initialize JSON store
_succession_store = JsonDictStore(DB_SUCCESSION_FILE)

# ==========================================
# ENUMS
# ==========================================

class ReadinessLevel(str, Enum):
    READY_NOW = "READY_NOW"
    READY_1_YEAR = "READY_1_YEAR"
    READY_2_YEARS = "READY_2_YEARS"

class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"  # RED
    MODERATE = "MODERATE"  # YELLOW
    LOW = "LOW"  # GREEN

# ==========================================
# VERİ MODELLERİ (JSON Tabanlı)
# ==========================================

def load_succession_data():
    """Yedekleme planı verilerini yükler (file lock)."""
    data = _succession_store.load()
    if not data or "succession_plans" not in data:
        default_data = {"succession_plans": []}
        save_succession_data(default_data)
        return default_data
    return data

def save_succession_data(data):
    """Yedekleme planı verilerini kaydeder (atomic write + file lock)."""
    _succession_store.save(data)

# ==========================================
# RİSK HESAPLAMA ALGORİTMASI
# ==========================================

def calculate_position_risk(position_id: str) -> Dict[str, Any]:
    """
    Pozisyon için risk seviyesini hesaplar.
    EN İYİ yedeğe göre risk seviyesini belirler.
    
    Mantık:
    - HİÇ yedek yoksa -> CRITICAL (RED) 🔴
    - En iyi yedek READY_NOW ise -> LOW (GREEN) 🟢
    - En iyi yedek READY_1_YEAR ise -> MODERATE (YELLOW) 🟡
    - En iyi yedek READY_2_YEARS ise -> CRITICAL (RED) 🔴
    """
    succession_data = load_succession_data()
    plans = succession_data.get("succession_plans", [])
    
    # Bu pozisyon için yedekleri bul
    position_plans = [p for p in plans if p.get("position_id") == position_id]
    
    if not position_plans:
        # HİÇ yedek yok
        return {
            "risk_level": RiskLevel.CRITICAL.value,
            "risk_color": "red",
            "risk_icon": "🔴",
            "message": "⚠️ ACİL: Bu pozisyonun yedeği yok!",
            "successors": []
        }
    
    # En iyi yedeği bul (READY_NOW > READY_1_YEAR > READY_2_YEARS)
    readiness_priority = {
        ReadinessLevel.READY_NOW.value: 0,
        ReadinessLevel.READY_1_YEAR.value: 1,
        ReadinessLevel.READY_2_YEARS.value: 2
    }
    
    best_plan = min(
        position_plans,
        key=lambda p: readiness_priority.get(p.get("readiness_level", ReadinessLevel.READY_2_YEARS.value), 99)
    )
    best_readiness = best_plan.get("readiness_level", ReadinessLevel.READY_2_YEARS.value)
    
    # Successor bilgilerini zenginleştir
    enriched_successors = []
    for plan in position_plans:
        enriched_successors.append({
            "id": plan.get("id"),
            "successor_id": plan.get("successor_id"),
            "readiness_level": plan.get("readiness_level"),
            "calculated_readiness": plan.get("calculated_readiness"),
            "readiness_percentage": plan.get("readiness_percentage"),
            "missing_skills": plan.get("missing_skills", []),
            "notes": plan.get("notes", "")
        })
    
    # En iyi yedeğe göre risk seviyesi
    if best_readiness == ReadinessLevel.READY_NOW.value:
        return {
            "risk_level": RiskLevel.LOW.value,
            "risk_color": "green",
            "risk_icon": "🟢",
            "message": "✅ Yedekleme planı mevcut - En iyi yedek şimdi hazır",
            "successors": enriched_successors
        }
    elif best_readiness == ReadinessLevel.READY_1_YEAR.value:
        return {
            "risk_level": RiskLevel.MODERATE.value,
            "risk_color": "yellow",
            "risk_icon": "🟡",
            "message": "⏳ En iyi yedek 1 yıl içinde hazır olacak",
            "successors": enriched_successors
        }
    else:
        return {
            "risk_level": RiskLevel.CRITICAL.value,
            "risk_color": "red",
            "risk_icon": "🔴",
            "message": "⚠️ En iyi yedek 2+ yıl sonra hazır olacak",
            "successors": enriched_successors
        }

def get_critical_positions(department: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Manager ve üzeri kritik pozisyonları döndürür.
    department verilirse, sadece o departmana ait pozisyonları döndürür.
    """
    org_data = load_org_chart()
    
    # Kritik pozisyonları filtrele (Manager, Müdür, Direktör, CEO, vb.)
    critical_keywords = [
        "müdür", "manager", "direktör", "director", 
        "ceo", "cfo", "cto", "başkan", "president",
        "head", "şef", "lider", "leader"
    ]
    
    positions = {}
    for person in org_data:
        position = person.get("Pozisyon", "")
        if not position:
            continue
        
        # Departman filtresi
        if department:
            person_dept = person.get("Departman", "")
            if person_dept != department:
                continue
        
        position_lower = position.lower()
        is_critical = any(keyword in position_lower for keyword in critical_keywords)
        
        if is_critical and position not in positions:
            positions[position] = {
                "position_id": position,
                "position_title": position,
                "department": person.get("Departman", ""),
                "current_holder": person.get("Ad Soyad", "")
            }
    
    # Her pozisyon için risk hesapla
    result = []
    for pos_data in positions.values():
        risk_info = calculate_position_risk(pos_data["position_id"])
        result.append({
            **pos_data,
            **risk_info
        })
    
    # Risk seviyesine göre sırala (CRITICAL önce)
    risk_order = {RiskLevel.CRITICAL.value: 0, RiskLevel.MODERATE.value: 1, RiskLevel.LOW.value: 2}
    result.sort(key=lambda x: risk_order.get(x.get("risk_level", ""), 99))
    
    return result

def calculate_readiness_time(employee_name: str, position_id: str) -> Dict[str, Any]:
    """
    Adayın hazırlık süresini otomatik hesaplar.
    
    Algoritma:
    1. Hemen Hazır (Ready Now): Tüm kritik yetkinlikler (>= 4.0) karşılanıyor VE genel puan farkı < 0.2
    2. 1 Yıl Sonra: Kritik yetkinliklerde en fazla 1 eksik var VEYA genel puan farkı < 0.8
    3. 2+ Yıl Sonra: Birden fazla kritik eksik var
    
    Returns:
        {
            "readiness_level": "READY_NOW" | "READY_1_YEAR" | "READY_2_YEARS",
            "readiness_percentage": float,
            "missing_skills": List[str],
            "notes": str
        }
    """
    from services.talent_service import get_target_profile, get_current_scores, load_employee_data
    from config import COMPETENCIES_360
    
    CRITICAL_THRESHOLD = 4.0
    
    # Hedef pozisyon profili
    target_profile, target_role_name = get_target_profile(position_id)
    
    # Adayın mevcut puanları
    employee = load_employee_data(employee_name)
    if not employee:
        return {
            "readiness_level": ReadinessLevel.READY_2_YEARS.value,
            "readiness_percentage": 0.0,
            "missing_skills": [],
            "notes": "Çalışan verisi bulunamadı"
        }
    
    current_scores = get_current_scores(employee)
    
    # Kritik yetkinlikleri kontrol et
    critical_gaps = []
    all_gaps = []
    total_gap = 0.0
    
    for comp_code, target_score in target_profile.items():
        current_score = current_scores.get(comp_code)
        if current_score is None:
            continue
        gap = target_score - current_score
        all_gaps.append(gap)
        total_gap += abs(gap)
        
        # Kritik yetkinlik (hedef >= 4.0)
        if target_score >= CRITICAL_THRESHOLD:
            if current_score < target_score:
                critical_gaps.append({
                    "code": comp_code,
                    "name": COMPETENCIES_360.get(comp_code, comp_code),
                    "current": current_score,
                    "target": target_score,
                    "gap": gap
                })
    
    # Ortalama gap
    avg_gap = total_gap / len(target_profile) if target_profile else 0.0
    
    # Hazırlık seviyesi belirleme
    num_critical_gaps = len(critical_gaps)
    missing_skill_names = [g["name"] for g in critical_gaps]
    
    if num_critical_gaps == 0 and avg_gap < 0.2:
        # Hemen Hazır
        readiness_level = ReadinessLevel.READY_NOW.value
        readiness_percentage = max(95.0, 100.0 - (avg_gap * 10))
        notes = f"Tüm kritik yetkinlikler karşılanıyor. Uyum: %{readiness_percentage:.0f}"
    elif num_critical_gaps <= 1 or avg_gap < 0.8:
        # 1 Yıl Sonra
        readiness_level = ReadinessLevel.READY_1_YEAR.value
        readiness_percentage = max(60.0, 100.0 - (avg_gap * 15))
        if missing_skill_names:
            notes = f"1 yıl içinde hazır olacak. Eksik: {', '.join(missing_skill_names[:2])}"
        else:
            notes = f"Genel uyum: %{readiness_percentage:.0f}"
    else:
        # 2+ Yıl Sonra
        readiness_level = ReadinessLevel.READY_2_YEARS.value
        readiness_percentage = max(30.0, 100.0 - (avg_gap * 20))
        notes = f"2+ yıl sonra hazır olacak. Eksikler: {', '.join(missing_skill_names[:3])}"
    
    return {
        "readiness_level": readiness_level,
        "readiness_percentage": round(readiness_percentage, 1),
        "missing_skills": missing_skill_names,
        "notes": notes
    }

def create_succession_plan(
    position_id: str,
    successor_id: str,
    readiness_level: Optional[str] = None,
    notes: str = "",
    auto_calculate: bool = True
) -> Dict[str, Any]:
    """
    Yeni yedekleme planı oluşturur.
    auto_calculate=True ise hazırlık süresini otomatik hesaplar.
    """
    succession_data = load_succession_data()
    plans = succession_data.get("succession_plans", [])
    
    # Yeni plan ID'si
    new_id = max([p.get("id", 0) for p in plans], default=0) + 1
    
    # Otomatik hesaplama
    calculated_data = {}
    if auto_calculate:
        calculated_data = calculate_readiness_time(successor_id, position_id)
        readiness_level = calculated_data.get("readiness_level", ReadinessLevel.READY_2_YEARS.value)
        if not notes:
            notes = calculated_data.get("notes", "")
    
    new_plan = {
        "id": new_id,
        "position_id": position_id,
        "successor_id": successor_id,
        "readiness_level": readiness_level,
        "calculated_readiness": calculated_data.get("readiness_level") if auto_calculate else None,
        "readiness_percentage": calculated_data.get("readiness_percentage", 0.0) if auto_calculate else None,
        "missing_skills": calculated_data.get("missing_skills", []) if auto_calculate else [],
        "notes": notes
    }
    
    plans.append(new_plan)
    succession_data["succession_plans"] = plans
    save_succession_data(succession_data)
    
    return new_plan

def get_succession_plans_for_position(position_id: str) -> List[Dict[str, Any]]:
    """Belirli bir pozisyon için yedekleme planlarını döndürür."""
    succession_data = load_succession_data()
    plans = succession_data.get("succession_plans", [])
    return [p for p in plans if p.get("position_id") == position_id]

def get_high_potential_employees() -> List[Dict[str, Any]]:
    """
    Yüksek potansiyelli çalışanları döndürür.
    Potansiyel >= 3.5 olanlar.
    """
    org_data = load_org_chart()
    data_360 = load_360_data()
    
    # 360 verilerini merge et
    employees_with_scores = []
    for person in org_data:
        person_360 = next(
            (p for p in data_360 if p.get("Personel") == person.get("Ad Soyad") or p.get("target") == person.get("Ad Soyad")),
            None
        )
        
        potansiyel = 0.0
        if person_360:
            potansiyel = float(person_360.get("Potansiyel", 0))
        else:
            potansiyel = float(person.get("Potansiyel", 0))
        
        if potansiyel >= 3.5:
            employees_with_scores.append({
                "id": person.get("Ad Soyad", ""),
                "name": person.get("Ad Soyad", ""),
                "position": person.get("Pozisyon", ""),
                "department": person.get("Departman", ""),
                "potansiyel": potansiyel,
                "performans": float(person_360.get("Performans", 0)) if person_360 else float(person.get("Performans", 0))
            })
    
    # Potansiyel'e göre sırala
    employees_with_scores.sort(key=lambda x: x.get("potansiyel", 0), reverse=True)
    
    return employees_with_scores

def delete_succession_plan(plan_id: int) -> bool:
    """Yedekleme planını siler."""
    succession_data = load_succession_data()
    plans = succession_data.get("succession_plans", [])
    
    original_count = len(plans)
    succession_data["succession_plans"] = [p for p in plans if p.get("id") != plan_id]
    save_succession_data(succession_data)
    
    return len(succession_data["succession_plans"]) < original_count

