# utils_db.py - Database utilities (Pure API - No Streamlit dependencies)
# This module provides data access functions for JSON-based storage.
# Note: Session state management has been removed for API-only operation.
# 
# IMPORTANT: All file I/O now uses repositories/json_store.py for:
# - Atomic writes (prevents corruption)
# - File locking (prevents race conditions)
# - Better error handling

import os
from datetime import datetime
from typing import List, Dict, Any, Optional

# Import professional JSON store
from repositories.json_store import JsonStore, JsonDictStore

# Config dosyasından dosya yollarını çekiyoruz (Tek kaynak)
try:
    from config import DB_FILE, DB_360_FILE, DB_ORG_FILE, DB_TRAINING_FILE, DB_LEAVE_FILE, DB_NOTIFICATIONS_FILE, DB_PULSE_FILE, DB_HOLIDAYS_FILE, DB_TALENT_ASSESSMENT_FILE, DB_EMPLOYEE_SCORES_FILE
except ImportError:
    # Eğer config henüz güncellenmediyse varsayılanları kullan (Fallback)
    DB_FILE = os.path.join("database", "future_database.json") # Aday Veritabanı
    DB_360_FILE = os.path.join("database", "future_360_db.json")
    DB_ORG_FILE = os.path.join("database", "future_org_chart.json")
    DB_TRAINING_FILE = os.path.join("database", "future_training_db.json")
    DB_LEAVE_FILE = os.path.join("database", "future_leave_db.json")
    DB_NOTIFICATIONS_FILE = os.path.join("database", "future_notifications.json")
    DB_PULSE_FILE = os.path.join("database", "future_pulse_db.json")
    DB_HOLIDAYS_FILE = os.path.join("database", "future_holidays_db.json")
    DB_TALENT_ASSESSMENT_FILE = os.path.join("database", "future_talent_assessment_db.json")
    DB_EMPLOYEE_SCORES_FILE = os.path.join("database", "future_employee_scores.json")

# Initialize JSON stores (singleton pattern for each file)
_org_chart_store = JsonStore(DB_ORG_FILE)
_360_data_store = JsonStore(DB_360_FILE)
_training_store = JsonStore(DB_TRAINING_FILE)
_candidates_store = JsonStore(DB_FILE)
_leave_store = JsonStore(DB_LEAVE_FILE)
_notifications_store = JsonStore(DB_NOTIFICATIONS_FILE)
_pulse_store = JsonStore(DB_PULSE_FILE)
_holidays_store = JsonStore(DB_HOLIDAYS_FILE)
_talent_assessment_store = JsonStore(DB_TALENT_ASSESSMENT_FILE)
_employee_scores_store = JsonStore(DB_EMPLOYEE_SCORES_FILE)

# ==========================================
# 1. ORGANİZASYON ŞEMASI (PERSONEL)
# ==========================================
def save_org_chart(data: List[Dict[str, Any]]) -> None:
    """Organizasyon şemasını diske kaydeder (atomic write + file lock)."""
    _org_chart_store.save(data)

def load_org_chart(simulation_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Organizasyon şemasını diskten okur (file lock)."""
    data = _org_chart_store.load()
    
    # Simulation mode: Filter by valid_from date
    if simulation_date:
        # Group by employee name, get the latest entry <= simulation_date
        employee_dict = {}
        for entry in data:
            name = entry.get("Ad Soyad", "")
            valid_from = entry.get("valid_from", "")
            if not valid_from:
                continue
            
            # Only process simulation entries or if date is valid
            if entry.get("simulation"):
                if valid_from <= simulation_date:
                    if name not in employee_dict or employee_dict[name].get("valid_from", "") < valid_from:
                        employee_dict[name] = entry
            else:
                # Non-simulation entries are always included
                if name not in employee_dict:
                    employee_dict[name] = entry
        
        data = list(employee_dict.values())
    
    return data

# ==========================================
# 2. 360 & PERFORMANS VERİLERİ
# ==========================================
def save_data(data: List[Dict[str, Any]]) -> None:
    """360 Değerlendirme verilerini kaydeder (atomic write + file lock)."""
    _360_data_store.save(data)

def load_360_data(simulation_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """360 verilerini okur (file lock)."""
    data = _360_data_store.load()
    
    # Simulation mode: Filter by valid_from date
    if simulation_date:
        # Group by employee name, get the latest entry <= simulation_date
        employee_dict = {}
        for entry in data:
            name = entry.get("Personel") or entry.get("target", "")
            valid_from = entry.get("valid_from", "")
            if not valid_from:
                continue
            
            # Only process simulation entries or if date is valid
            if entry.get("simulation"):
                if valid_from <= simulation_date:
                    key = f"{name}_{valid_from}"
                    if key not in employee_dict or employee_dict[key].get("valid_from", "") < valid_from:
                        employee_dict[key] = entry
            else:
                # Non-simulation entries are always included
                key = f"{name}_{valid_from or 'permanent'}"
                if key not in employee_dict:
                    employee_dict[key] = entry
        
        data = list(employee_dict.values())
    
    return data

# ==========================================
# 3. EĞİTİM VE GELİŞİM ATAMALARI (YENİ)
# ==========================================
def save_training_data(data: List[Dict[str, Any]]) -> None:
    """Eğitim atamalarını kaydeder (atomic write + file lock)."""
    _training_store.save(data)

def load_training_data() -> List[Dict[str, Any]]:
    """Eğitim atamalarını okur (file lock)."""
    return _training_store.load()

# ==========================================
# 4. İŞE ALIM (ADAY) VERİLERİ
# ==========================================
def save_candidates(data: List[Dict[str, Any]]) -> None:
    """Aday havuzunu (Liste olarak) kaydeder (atomic write + file lock)."""
    _candidates_store.save(data)

def load_candidates():
    """Aday havuzunu okur (file lock)."""
    return _candidates_store.load()

# --- ENTEGRASYON EKİ: ui_candidate.py uyumluluğu ---
def save_candidate(new_record):
    """
    ui_candidate.py modülünün tekil kayıt ekleyebilmesi için 
    mevcut fonksiyonları kullanan yardımcı fonksiyon.
    """
    current_list = load_candidates()
    current_list.append(new_record)
    save_candidates(current_list)
# ----------------------------------------------------

# ==========================================
# 6. İZİN YÖNETİMİ
# ==========================================
def load_leave_requests():
    """İzin taleplerini okur (file lock)."""
    return _leave_store.load()

def save_leave_request(new_request: Dict[str, Any]) -> bool:
    """Yeni izin talebi ekler (atomic write + file lock)."""
    current_data = load_leave_requests()
    # ID atama
    new_id = len(current_data) + 1
    new_request['id'] = new_id
    current_data.append(new_request)
    _leave_store.save(current_data)
    return True

def update_leave_status(req_id, new_status, approver_note=""):
    """İzin durumunu günceller (Onay/Red) (atomic write + file lock)."""
    current_data = load_leave_requests()
    for req in current_data:
        if req['id'] == req_id:
            req['durum'] = new_status
            req['yonetici_notu'] = approver_note
            break
    _leave_store.save(current_data)

# ==========================================
# 8. BİLDİRİM SİSTEMİ (NOTIFICATION CENTER)
# ==========================================
def load_notifications():
    """Bildirimleri okur (file lock)."""
    return _notifications_store.load()

def send_notification(to_user, message, notif_type="info"):
    """
    to_user: Bildirimin kime gideceği (Kullanıcı Adı veya 'Ad Soyad')
    notif_type: info, success, warning, error
    """
    notifs = load_notifications()
    new_notif = {
        "id": int(datetime.now().timestamp() * 1000), # Unique ID
        "to": to_user,
        "message": message,
        "type": notif_type,
        "read": False,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    notifs.insert(0, new_notif) # En yeni en başa
    _notifications_store.save(notifs)

def mark_notification_read(notif_id):
    """Bildirimi okundu olarak işaretle (atomic write + file lock)."""
    notifs = load_notifications()
    for n in notifs:
        if n['id'] == notif_id:
            n['read'] = True
            break
    _notifications_store.save(notifs)

def get_unread_count(user_name):
    notifs = load_notifications()
    return len([n for n in notifs if n['to'] == user_name and not n['read']])

# ==========================================
# 9. MAAŞ HESAPLAYICI (BRÜT -> NET)
# ==========================================
def calculate_net_salary(gross_salary):
    """
    2024/2025 Standartlarına göre Tahmini Net Maaş Hesaplar (1. Ay / %15 Vergi Dilimi)
    Not: Kümülatif vergi dilimi yıl içinde değişir, bu temel bir simülasyondur.
    """
    sgk_isc = gross_salary * 0.14          # SGK İşçi Payı (%14)
    issiz_isc = gross_salary * 0.01        # İşsizlik İşçi Payı (%1)
    
    gelir_vergisi_matrahi = gross_salary - (sgk_isc + issiz_isc)
    
    # Basitlik için 1. Vergi Dilimi (%15) varsayıyoruz
    gelir_vergisi = gelir_vergisi_matrahi * 0.15 
    
    damga_vergisi = gross_salary * 0.00759 # Damga Vergisi (%0.759)
    
    kesintiler = sgk_isc + issiz_isc + gelir_vergisi + damga_vergisi
    net_maas = gross_salary - kesintiler
    
    return {
        "Brüt": gross_salary,
        "SGK (%14)": sgk_isc,
        "İşsizlik (%1)": issiz_isc,
        "Gelir Vergisi (%15)": gelir_vergisi,
        "Damga Vergisi": damga_vergisi,
        "Net Maaş": net_maas
    }

# ==========================================
# 11. TAKIM NABZI (PULSE) SİSTEMİ
# ==========================================
def load_pulse_answers():
    """Takım nabzı cevaplarını okur (file lock)."""
    return _pulse_store.load()

def save_pulse_answer(employee_id: str, employee_name: str, department_id: str,
                      department_name: str, score: float, week_number: str,
                      feedback: Optional[str] = None) -> bool:
    """Yeni takım nabzı cevabı kaydeder (atomic write + file lock)."""
    current_data = load_pulse_answers()
    new_answer = {
        "id": len(current_data) + 1,
        "employee_id": employee_id,
        "employee_name": employee_name,
        "department_id": department_id,
        "department_name": department_name,
        "score": score,
        "feedback": feedback or "",
        "created_at": datetime.now().isoformat(),
        "week_number": week_number
    }
    current_data.append(new_answer)
    _pulse_store.save(current_data)
    return True

def get_pulse_trends(department_id=None):
    """
    Haftalık trend verilerini döndürür.
    department_id None ise tüm şirket, belirtilirse o departman.
    department_id hem department_id hem de department_name ile eşleşebilir.
    """
    all_answers = load_pulse_answers()
    
    # Departman filtresi (hem department_id hem department_name ile eşleşebilir)
    if department_id:
        all_answers = [
            a for a in all_answers 
            if a.get("department_id") == department_id or a.get("department_name") == department_id
        ]
    
    # Haftalara göre grupla ve ortalama hesapla
    week_data = {}
    for answer in all_answers:
        week = answer.get("week_number")
        if week:
            if week not in week_data:
                week_data[week] = {"scores": [], "count": 0}
            week_data[week]["scores"].append(answer.get("score", 0))
            week_data[week]["count"] += 1
    
    # Ortalamaları hesapla
    trends = []
    for week in sorted(week_data.keys()):
        scores = week_data[week]["scores"]
        avg_score = sum(scores) / len(scores) if scores else 0
        trends.append({
            "week": week,
            "average_score": round(avg_score, 2),
            "count": week_data[week]["count"]
        })
    
    return trends

# ==========================================
# 12. EMPLOYEE SCORES (SSOT - DEMO)
# ==========================================
def load_employee_scores() -> List[Dict[str, Any]]:
    """Employee scores (SSOT) verisini okur."""
    return _employee_scores_store.load()

def save_employee_scores(data: List[Dict[str, Any]]) -> None:
    """Employee scores (SSOT) verisini kaydeder."""
    _employee_scores_store.save(data)

# ==========================================
# 12. RESMİ TATİLLER (PUBLIC HOLIDAYS)
# ==========================================
def load_holidays() -> List[Dict[str, Any]]:
    """Resmi tatilleri okur (file lock)."""
    return _holidays_store.load()

def get_holiday_by_date(target_date) -> Optional[Dict[str, Any]]:
    """Belirli bir tarihte resmi tatil var mı kontrol eder."""
    holidays = load_holidays()
    date_str = target_date.strftime("%Y-%m-%d") if isinstance(target_date, datetime) else str(target_date)
    return next((h for h in holidays if h.get("date") == date_str), None)

# Note: init_db() function removed - it was Streamlit-specific.
# Data is loaded on-demand when functions are called.