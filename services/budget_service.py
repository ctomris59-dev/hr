# budget_service.py
# Bütçe Yönetimi Servisi - Maaş Artış Talepleri

import os
from typing import Dict, List, Optional, Any
from datetime import datetime

# Config import
try:
    from config import DB_BUDGET_FILE, DEPARTMENTS
except ImportError:
    DB_BUDGET_FILE = "future_budget_db.json"
    DEPARTMENTS = ["İnsan Kaynakları", "Bilgi Teknolojileri", "Finans", "Satış", "Operasyon", "Yönetim"]

# Import professional JSON store
from repositories.json_store import JsonStore

from utils_db import load_org_chart, load_360_data

# Initialize JSON store
_budget_store = JsonStore(DB_BUDGET_FILE)

# ==========================================
# HELPERS
# ==========================================

def _normalize_text(value: str) -> str:
    return str(value or "").strip().lower()


def _match_name(name1: str, name2: str) -> bool:
    n1 = _normalize_text(name1)
    n2 = _normalize_text(name2)
    return n1 == n2 or n1 in n2 or n2 in n1


def _is_director_position(position: str) -> bool:
    pos = _normalize_text(position)
    return "direktör" in pos or "director" in pos or "genel müdür" in pos


def _is_manager_position(position: str) -> bool:
    pos = _normalize_text(position)
    return "müdür" in pos or "manager" in pos


def _get_departments_with_director(org_data: List[Dict[str, Any]]) -> set:
    departments = set()
    for person in org_data:
        if _is_director_position(person.get("Pozisyon", "")):
            dept_norm = _normalize_text(person.get("Departman", ""))
            if dept_norm:
                departments.add(dept_norm)
    return departments

def department_has_director(department: str) -> bool:
    if not department:
        return False
    org_data = load_org_chart()
    dept_norm = _normalize_text(department)
    for person in org_data:
        person_dept = _normalize_text(person.get("Departman", ""))
        if person_dept != dept_norm:
            continue
        if _is_director_position(person.get("Pozisyon", "")):
            return True
    return False


def get_employee_department(employee_id: str) -> Optional[str]:
    if not employee_id:
        return None
    org_data = load_org_chart()
    for person in org_data:
        if _match_name(person.get("Ad Soyad", ""), employee_id):
            return person.get("Departman", "")
    return None

# ==========================================
# VERİ YÖNETİMİ
# ==========================================

def load_budget_data() -> List[Dict[str, Any]]:
    """Bütçe taleplerini yükler (file lock)."""
    return _budget_store.load()

def save_budget_data(data: List[Dict[str, Any]]):
    """Bütçe taleplerini kaydeder (atomic write + file lock)."""
    _budget_store.save(data)

# ==========================================
# YETKİ KONTROLÜ (HİYERARŞİK)
# ==========================================

def get_team_data_for_manager(manager_name: str, manager_role: str, manager_dept: str) -> List[Dict[str, Any]]:
    """
    Yöneticinin ekibini döndürür.
    
    Rol = Direktör: Kendi departmanındaki TÜM alt çalışanları listele.
    Rol = CEO/Müdür/Uzman: Boş liste döndür (403 Forbidden frontend'de kontrol edilir).
    """
    org_data = load_org_chart()
    history360 = load_360_data()
    
    if manager_role == "CEO":
        # CEO: Direktörler + direktör olmayan departmanların en üst amirleri
        team = []
        departments_with_director = _get_departments_with_director(org_data)
        for person in org_data:
            person_name = person.get("Ad Soyad", "").strip()
            if not person_name or person_name == manager_name:
                continue
            person_dept = person.get("Departman", "")
            person_dept_norm = _normalize_text(person_dept)
            position = person.get("Pozisyon", "")

            if _is_director_position(position):
                pass
            elif _is_manager_position(position) and person_dept_norm and person_dept_norm not in departments_with_director:
                pass
            else:
                continue
            person360 = next(
                (h for h in history360 if h.get("Personel") == person_name or h.get("target") == person_name),
                None
            )
            team.append({
                "employee_id": person_name,
                "employee_name": person_name,
                "position": person.get("Pozisyon", ""),
                "department": person_dept,
                "current_salary": float(person.get("Maaş (TL)", 0) or person.get("Maaş", 0) or 0),
                "performance": float(person360.get("Performans", 0) if person360 else person.get("Performans", 0) or 0),
                "potential": float(person360.get("Potansiyel", 0) if person360 else person.get("Potansiyel", 0) or 0),
            })
        return team

    if manager_role == "DIRECTOR" or manager_role == "Direktör":
        # Direktör: Kendi departmanındaki TÜM çalışanlar (kendisi hariç, direktörler dahil)
        team = []
        
        # Normalize department names for matching (handle variations)
        manager_dept_normalized = manager_dept.strip().lower()
        
        # Debug: Print manager info
        print(f"[BUDGET DEBUG] Manager: {manager_name}, Role: {manager_role}, Dept: {manager_dept} (normalized: {manager_dept_normalized})")
        print(f"[BUDGET DEBUG] Total org_data entries: {len(org_data)}")
        
        for person in org_data:
            person_dept = person.get("Departman", "").strip()
            person_dept_normalized = person_dept.lower()
            person_name = person.get("Ad Soyad", "").strip()
            position = person.get("Pozisyon", "").lower()
            
            # Debug: Print each person check
            dept_match = person_dept_normalized == manager_dept_normalized
            name_match = person_name != manager_name
            
            # Direktörler kendi departmanlarındaki HERKESİ görebilir (direktörler dahil, sadece kendisi hariç)
            if dept_match and name_match:
                # 360 verilerini merge et
                person360 = next(
                    (h for h in history360 if h.get("Personel") == person_name or h.get("target") == person_name),
                    None
                )
                team.append({
                    "employee_id": person_name,
                    "employee_name": person_name,
                    "position": person.get("Pozisyon", ""),
                    "department": person_dept,
                    "current_salary": float(person.get("Maaş (TL)", 0) or person.get("Maaş", 0) or 0),
                    "performance": float(person360.get("Performans", 0) if person360 else person.get("Performans", 0) or 0),
                    "potential": float(person360.get("Potansiyel", 0) if person360 else person.get("Potansiyel", 0) or 0),
                })
                print(f"[BUDGET DEBUG] Added: {person_name} ({person_dept}) - {person.get('Pozisyon', '')}")
            elif dept_match:
                print(f"[BUDGET DEBUG] Skipped: {person_name} - dept_match={dept_match}, name_match={name_match}")
        
        print(f"[BUDGET DEBUG] Final team size: {len(team)}")
        return team
    
    if manager_role == "MANAGER":
        # Müdür: Departmanda direktör yoksa erişim var
        if department_has_director(manager_dept):
            return []
        team = []
        manager_dept_normalized = manager_dept.strip().lower()

        for person in org_data:
            person_dept = person.get("Departman", "").strip()
            person_dept_normalized = person_dept.lower()
            person_name = person.get("Ad Soyad", "").strip()

            if person_dept_normalized == manager_dept_normalized and person_name != manager_name:
                person360 = next(
                    (h for h in history360 if h.get("Personel") == person_name or h.get("target") == person_name),
                    None
                )
                team.append({
                    "employee_id": person_name,
                    "employee_name": person_name,
                    "position": person.get("Pozisyon", ""),
                    "department": person_dept,
                    "current_salary": float(person.get("Maaş (TL)", 0) or person.get("Maaş", 0) or 0),
                    "performance": float(person360.get("Performans", 0) if person360 else person.get("Performans", 0) or 0),
                    "potential": float(person360.get("Potansiyel", 0) if person360 else person.get("Potansiyel", 0) or 0),
                })
        return team

    # Diğer roller: erişim yok
    return []


def can_ceo_access_employee(employee_id: str) -> bool:
    """CEO sadece direktörlere veya direktör olmayan departmanların en üst amirlerine erişebilir."""
    if not employee_id:
        return False
    org_data = load_org_chart()
    departments_with_director = _get_departments_with_director(org_data)
    for person in org_data:
        if _match_name(person.get("Ad Soyad", ""), employee_id):
            position = person.get("Pozisyon", "")
            if _is_director_position(position):
                return True
            if _is_manager_position(position):
                dept_norm = _normalize_text(person.get("Departman", ""))
                return bool(dept_norm) and dept_norm not in departments_with_director
            return False
    return False

# ==========================================
# BÜTÇE TALEP YÖNETİMİ
# ==========================================

def save_salary_request(
    employee_id: str,
    manager_id: str,
    period: str,
    requested_rate: float,
    status: str = "Taslak"
) -> Dict[str, Any]:
    """
    Maaş artış talebini kaydeder veya günceller (Upsert).
    Aynı personel ve dönem için sadece 1 kayıt olabilir.
    """
    budget_data = load_budget_data()
    
    # Mevcut kaydı bul
    existing_index = None
    for i, req in enumerate(budget_data):
        if req.get("employee_id") == employee_id and req.get("period") == period:
            existing_index = i
            break
    
    request_entry = {
        "id": budget_data[existing_index].get("id") if existing_index is not None else len(budget_data) + 1,
        "employee_id": employee_id,
        "manager_id": manager_id,
        "period": period,
        "requested_rate": requested_rate,
        "status": status,
        "created_at": budget_data[existing_index].get("created_at") if existing_index is not None else datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    if existing_index is not None:
        budget_data[existing_index] = request_entry
    else:
        budget_data.append(request_entry)
    
    save_budget_data(budget_data)
    return request_entry

def get_salary_requests_for_period(period: str) -> List[Dict[str, Any]]:
    """Belirli bir dönem için tüm maaş artış taleplerini döndürür."""
    budget_data = load_budget_data()
    return [req for req in budget_data if req.get("period") == period]

def get_salary_request_for_employee(employee_id: str, period: str) -> Optional[Dict[str, Any]]:
    """Belirli bir çalışan ve dönem için maaş artış talebini döndürür."""
    budget_data = load_budget_data()
    for req in budget_data:
        if req.get("employee_id") == employee_id and req.get("period") == period:
            return req
    return None

def submit_budget_requests(manager_id: str, period: str) -> int:
    """
    Yöneticinin tüm taslak taleplerini 'Gönderildi' statüsüne çevirir.
    Dönen değer: Gönderilen talep sayısı.
    """
    budget_data = load_budget_data()
    updated_count = 0
    
    for req in budget_data:
        if req.get("manager_id") == manager_id and req.get("period") == period and req.get("status") == "Taslak":
            req["status"] = "Gönderildi"
            req["updated_at"] = datetime.now().isoformat()
            updated_count += 1
    
    if updated_count > 0:
        save_budget_data(budget_data)
    
    return updated_count

