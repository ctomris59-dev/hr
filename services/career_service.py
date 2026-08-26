# career_service.py
# Kariyer Yönetimi Servisi - Metro Haritası ve Gap Analizi

import json
import os
from typing import Dict, List, Optional, Any

# Config import
try:
    from config import COMPETENCIES_360, DB_CAREER_FILE
except ImportError:
    COMPETENCIES_360 = {
        'DIG': 'Dijital Okuryazarlık', 'ANA': 'Analitik Düşünme',
        'RES': 'Sonuç Odaklılık', 'DET': 'Detaylara Özen',
        'LRN': 'Sürekli Öğrenme', 'ETH': 'Etik ve Uyum',
        'DIS': 'Öz-Disiplin', 'STR': 'Stratejik Bakış',
        'TEA': 'Takım Çalışması', 'COM': 'İletişim Becerileri',
        'LID': 'Liderlik'
    }
    DB_CAREER_FILE = "future_career_db.json"

# Liderlik yetkinliğini ekle (eğer yoksa)
if 'LID' not in COMPETENCIES_360:
    COMPETENCIES_360['LID'] = 'Liderlik'

from utils_db import load_org_chart, load_360_data

# JOB_PROFILES import
try:
    from data.data_jobs import JOB_PROFILES
except ImportError:
    JOB_PROFILES = {}
from data.data_jobs import JOB_PROFILES

# ==========================================
# VERİ MODELLERİ (JSON Tabanlı)
# ==========================================

def load_career_data():
    """Kariyer verilerini yükler."""
    if not os.path.exists(DB_CAREER_FILE):
        # İlk çalıştırmada varsayılan verileri oluştur
        default_data = initialize_default_career_data()
        save_career_data(default_data)
        return default_data
    
    try:
        with open(DB_CAREER_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return initialize_default_career_data()

def save_career_data(data):
    """Kariyer verilerini kaydeder."""
    try:
        with open(DB_CAREER_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Kariyer verisi kayıt hatası: {e}")

def initialize_default_career_data():
    """Varsayılan kariyer yolu verilerini oluşturur."""
    return {
        "career_tracks": [
            {
                "id": 1,
                "name": "Yazılım Geliştirme Yolu"
            },
            {
                "id": 2,
                "name": "Yönetim Yolu"
            },
            {
                "id": 3,
                "name": "İş Geliştirme Yolu"
            }
        ],
        "job_roles": [
            # Yazılım Geliştirme Yolu
            {"id": 1, "track_id": 1, "title": "Junior Developer", "level_order": 1},
            {"id": 2, "track_id": 1, "title": "Mid-Level Developer", "level_order": 2},
            {"id": 3, "track_id": 1, "title": "Senior Developer", "level_order": 3},
            {"id": 4, "track_id": 1, "title": "Tech Lead", "level_order": 4},
            {"id": 5, "track_id": 1, "title": "CTO", "level_order": 5, "locked": True},
            
            # Yönetim Yolu
            {"id": 6, "track_id": 2, "title": "Uzman", "level_order": 1},
            {"id": 7, "track_id": 2, "title": "Kıdemli Uzman", "level_order": 2},
            {"id": 8, "track_id": 2, "title": "Takım Lideri", "level_order": 3},
            {"id": 9, "track_id": 2, "title": "Müdür", "level_order": 4},
            {"id": 10, "track_id": 2, "title": "Direktör", "level_order": 5},
            {"id": 11, "track_id": 2, "title": "CEO", "level_order": 6, "locked": True},
            
            # İş Geliştirme Yolu
            {"id": 12, "track_id": 3, "title": "İş Geliştirme Uzmanı", "level_order": 1},
            {"id": 13, "track_id": 3, "title": "Kıdemli İş Geliştirme Uzmanı", "level_order": 2},
            {"id": 14, "track_id": 3, "title": "İş Geliştirme Müdürü", "level_order": 3},
            {"id": 15, "track_id": 3, "title": "İş Geliştirme Direktörü", "level_order": 4}
        ],
        "role_requirements": [
            # Junior Developer
            {"id": 1, "role_id": 1, "required_skill_id": "DIG", "min_score": 3.0},
            {"id": 2, "role_id": 1, "required_skill_id": "ANA", "min_score": 3.0},
            {"id": 3, "role_id": 1, "required_skill_id": "LRN", "min_score": 3.5},
            
            # Mid-Level Developer
            {"id": 4, "role_id": 2, "required_skill_id": "DIG", "min_score": 3.5},
            {"id": 5, "role_id": 2, "required_skill_id": "ANA", "min_score": 3.5},
            {"id": 6, "role_id": 2, "required_skill_id": "RES", "min_score": 3.5},
            {"id": 7, "role_id": 2, "required_skill_id": "LRN", "min_score": 4.0},
            
            # Senior Developer
            {"id": 8, "role_id": 3, "required_skill_id": "DIG", "min_score": 4.0},
            {"id": 9, "role_id": 3, "required_skill_id": "ANA", "min_score": 4.0},
            {"id": 10, "role_id": 3, "required_skill_id": "RES", "min_score": 4.0},
            {"id": 11, "role_id": 3, "required_skill_id": "TEA", "min_score": 3.5},
            {"id": 12, "role_id": 3, "required_skill_id": "LRN", "min_score": 4.0},
            
            # Tech Lead
            {"id": 13, "role_id": 4, "required_skill_id": "DIG", "min_score": 4.5},
            {"id": 14, "role_id": 4, "required_skill_id": "ANA", "min_score": 4.5},
            {"id": 15, "role_id": 4, "required_skill_id": "RES", "min_score": 4.5},
            {"id": 16, "role_id": 4, "required_skill_id": "LID", "min_score": 4.0, "required_badge": "Liderlik Sertifikası"},
            {"id": 17, "role_id": 4, "required_skill_id": "TEA", "min_score": 4.5},
            {"id": 18, "role_id": 4, "required_skill_id": "COM", "min_score": 4.0},
            
            # CTO (Locked)
            {"id": 19, "role_id": 5, "required_skill_id": "STR", "min_score": 5.0},
            {"id": 20, "role_id": 5, "required_skill_id": "LID", "min_score": 5.0},
            {"id": 21, "role_id": 5, "required_skill_id": "RES", "min_score": 5.0},
            
            # Uzman
            {"id": 22, "role_id": 6, "required_skill_id": "DET", "min_score": 3.5},
            {"id": 23, "role_id": 6, "required_skill_id": "RES", "min_score": 3.5},
            {"id": 24, "role_id": 6, "required_skill_id": "ETH", "min_score": 4.0},
            
            # Kıdemli Uzman
            {"id": 25, "role_id": 7, "required_skill_id": "DET", "min_score": 4.0},
            {"id": 26, "role_id": 7, "required_skill_id": "RES", "min_score": 4.0},
            {"id": 27, "role_id": 7, "required_skill_id": "ANA", "min_score": 3.5},
            {"id": 28, "role_id": 7, "required_skill_id": "ETH", "min_score": 4.0},
            
            # Takım Lideri
            {"id": 29, "role_id": 8, "required_skill_id": "LID", "min_score": 4.0, "required_badge": "Liderlik Sertifikası"},
            {"id": 30, "role_id": 8, "required_skill_id": "TEA", "min_score": 4.5},
            {"id": 31, "role_id": 8, "required_skill_id": "COM", "min_score": 4.0},
            {"id": 32, "role_id": 8, "required_skill_id": "RES", "min_score": 4.5},
            
            # Müdür
            {"id": 33, "role_id": 9, "required_skill_id": "LID", "min_score": 4.5, "required_badge": "Liderlik Sertifikası"},
            {"id": 34, "role_id": 9, "required_skill_id": "STR", "min_score": 4.0},
            {"id": 35, "role_id": 9, "required_skill_id": "COM", "min_score": 4.5},
            {"id": 36, "role_id": 9, "required_skill_id": "RES", "min_score": 4.5},
            
            # Direktör
            {"id": 37, "role_id": 10, "required_skill_id": "LID", "min_score": 4.8, "required_badge": "Liderlik Sertifikası"},
            {"id": 38, "role_id": 10, "required_skill_id": "STR", "min_score": 4.5},
            {"id": 39, "role_id": 10, "required_skill_id": "COM", "min_score": 4.8},
            {"id": 40, "role_id": 10, "required_skill_id": "RES", "min_score": 4.8},
            
            # CEO (Locked)
            {"id": 41, "role_id": 11, "required_skill_id": "STR", "min_score": 5.0},
            {"id": 42, "role_id": 11, "required_skill_id": "LID", "min_score": 5.0},
            {"id": 43, "role_id": 11, "required_skill_id": "RES", "min_score": 5.0},
            {"id": 44, "role_id": 11, "required_skill_id": "COM", "min_score": 5.0}
        ]
    }

# ==========================================
# GAP ANALİZİ FONKSİYONLARI
# ==========================================

def get_employee_scores(employee_name: str) -> Dict[str, float]:
    """
    Çalışanın mevcut yetkinlik puanlarını döndürür.
    360 verilerinden çeker.
    """
    scores = {}
    
    # 360 verilerini yükle
    data_360 = load_360_data()
    org_data = load_org_chart()
    
    # Çalışanı bul
    employee_360 = None
    for record in data_360:
        if record.get('Personel') == employee_name or record.get('target') == employee_name:
            employee_360 = record
            break
    
    if not employee_360:
        # Varsayılan puanlar
        for code in COMPETENCIES_360.keys():
            scores[code] = 3.0
        return scores
    
    # Yetkinlik puanlarını topla (Mgr > Peer > Self önceliği)
    for code in COMPETENCIES_360.keys():
        mgr_val = employee_360.get(f"{code}_Mgr")
        peer_val = employee_360.get(f"{code}_Peer")
        self_val = employee_360.get(f"{code}_Self")
        
        value = 0.0
        if mgr_val and mgr_val != 0:
            try:
                value = float(mgr_val)
            except:
                pass
        elif peer_val and peer_val != 0:
            try:
                value = float(peer_val)
            except:
                pass
        elif self_val:
            try:
                value = float(self_val)
            except:
                pass
        
        scores[code] = value if value > 0 else 3.0
    
    return scores

def calculate_gap_analysis(employee_name: str, target_role_id: int) -> Dict[str, Any]:
    """
    Çalışanın hedef rol için gap analizini yapar.
    
    Returns:
        {
            "readiness_percentage": float,
            "gaps": [
                {
                    "skill_code": str,
                    "skill_name": str,
                    "current_score": float,
                    "required_score": float,
                    "gap": float
                }
            ],
            "missing_badges": [str],
            "overall_status": str  # "ready", "preparing", "not_ready"
        }
    """
    # Verileri yükle
    career_data = load_career_data()
    employee_scores = get_employee_scores(employee_name)
    
    # Hedef rolü bul
    target_role = None
    for role in career_data["job_roles"]:
        if role["id"] == target_role_id:
            target_role = role
            break
    
    if not target_role:
        return {
            "readiness_percentage": 0,
            "gaps": [],
            "missing_badges": [],
            "overall_status": "not_ready"
        }
    
    # Rol gereksinimlerini bul
    requirements = [req for req in career_data["role_requirements"] if req["role_id"] == target_role_id]
    
    gaps = []
    missing_badges = []
    total_gap = 0.0
    
    for req in requirements:
        skill_code = req.get("required_skill_id")
        if not skill_code:
            continue
        
        required_score = req.get("min_score", 4.0)
        current_score = employee_scores.get(skill_code, 0.0)
        gap = max(0, required_score - current_score)
        
        if gap > 0.3:  # Önemli gap
            gaps.append({
                "skill_code": skill_code,
                "skill_name": COMPETENCIES_360.get(skill_code, skill_code),
                "current_score": current_score,
                "required_score": required_score,
                "gap": gap
            })
            total_gap += gap
        
        # Rozet kontrolü
        required_badge = req.get("required_badge")
        if required_badge:
            # Basit kontrol: Rozet sistemini burada simüle ediyoruz
            # Gerçek uygulamada rozet veritabanından kontrol edilir
            missing_badges.append(required_badge)
    
    # Hazırlık yüzdesi hesapla
    if not requirements:
        readiness_percentage = 0
    else:
        # Formül: (Mevcut Puan / Gerekli Puan) * 100
        total_required = sum(req.get("min_score", 4.0) for req in requirements)
        total_current = sum(
            employee_scores.get(req.get("required_skill_id", ""), 0.0) 
            for req in requirements 
            if req.get("required_skill_id")
        )
        
        if total_required > 0:
            readiness_percentage = min(100, max(0, (total_current / total_required) * 100))
        else:
            readiness_percentage = 0
    
    # Genel durum
    if readiness_percentage >= 80:
        overall_status = "ready"
    elif readiness_percentage >= 50:
        overall_status = "preparing"
    else:
        overall_status = "not_ready"
    
    return {
        "readiness_percentage": round(readiness_percentage, 1),
        "gaps": gaps,
        "missing_badges": list(set(missing_badges)),  # Tekrarları kaldır
        "overall_status": overall_status,
        "target_role_title": target_role.get("title", "")
    }

def get_career_tracks(department: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Kariyer yollarını döndürür.
    department verilirse, o departmana uygun kariyer yollarını filtreler.
    """
    career_data = load_career_data()
    all_tracks = career_data.get("career_tracks", [])
    
    if not department:
        return all_tracks
    
    # Departman bazlı eşleştirme
    dept_lower = department.lower()
    department_track_mapping = {
        "bilgi teknolojileri": 1,  # Yazılım Geliştirme Yolu
        "it": 1,
        "yazılım": 1,
        "teknoloji": 1,
        "satış": 3,  # İş Geliştirme Yolu
        "pazarlama": 3,
        "iş geliştirme": 3,
        "yönetim": 2,  # Yönetim Yolu
        "insan kaynakları": 2,
        "ik": 2,
        "finans": 2,
        "operasyon": 2,
    }
    
    # Eşleşen track ID'sini bul
    matched_track_id = None
    for key, track_id in department_track_mapping.items():
        if key in dept_lower:
            matched_track_id = track_id
            break
    
    if matched_track_id:
        return [t for t in all_tracks if t.get("id") == matched_track_id]
    
    # Eşleşme yoksa varsayılan olarak Yönetim Yolu'nu döndür
    return [t for t in all_tracks if t.get("id") == 2]

def get_job_roles(track_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """İş rollerini döndürür. track_id verilirse filtrelenir."""
    career_data = load_career_data()
    roles = career_data.get("job_roles", [])
    
    if track_id:
        roles = [r for r in roles if r.get("track_id") == track_id]
    
    # level_order'a göre sırala
    roles.sort(key=lambda x: x.get("level_order", 0))
    return roles

def get_current_role(employee_name: str) -> Optional[str]:
    """Çalışanın mevcut rolünü döndürür."""
    org_data = load_org_chart()
    for person in org_data:
        if person.get("Ad Soyad") == employee_name:
            return person.get("Pozisyon")
    return None

def get_active_positions(department: Optional[str] = None) -> List[str]:
    """
    Organizasyondaki aktif pozisyonları döndürür.
    department verilirse, sadece o departmana ait pozisyonları döndürür.
    """
    org_data = load_org_chart()
    positions = set()
    
    for person in org_data:
        position = person.get("Pozisyon", "")
        if not position:
            continue
        
        # Departman filtresi
        if department:
            person_dept = person.get("Departman", "")
            if person_dept != department:
                continue
        
        if position:
            positions.add(position)
    
    # Sıralı liste olarak döndür
    return sorted(list(positions))

def get_role_states(employee_name: str, track_id: int) -> Dict[str, Any]:
    """
    Kullanıcının mevcut seviyesine göre istasyon durumlarını belirler.
    Returns: {
        "current_level": int,
        "role_states": {
            role_id: "past" | "current" | "future" | "locked"
        }
    }
    """
    current_role_title = get_current_role(employee_name)
    if not current_role_title:
        return {"current_level": 0, "role_states": {}}
    
    career_data = load_career_data()
    job_roles = [r for r in career_data.get("job_roles", []) if r.get("track_id") == track_id]
    
    # Mevcut rolü bul
    current_role = None
    for role in job_roles:
        if role.get("title", "").lower() in current_role_title.lower() or \
           current_role_title.lower() in role.get("title", "").lower():
            current_role = role
            break
    
    if not current_role:
        # Eğer tam eşleşme yoksa, level_order'a göre tahmin et
        # Örn: "Uzman" -> level 1-2, "Müdür" -> level 4-5
        role_lower = current_role_title.lower()
        if any(x in role_lower for x in ["stajyer", "junior", "asistan"]):
            estimated_level = 1
        elif any(x in role_lower for x in ["uzman", "specialist"]):
            estimated_level = 2
        elif any(x in role_lower for x in ["kıdemli", "senior", "mid"]):
            estimated_level = 3
        elif any(x in role_lower for x in ["müdür", "manager", "lider", "lead"]):
            estimated_level = 4
        elif any(x in role_lower for x in ["direktör", "director"]):
            estimated_level = 5
        else:
            estimated_level = 2  # Varsayılan
    else:
        estimated_level = current_role.get("level_order", 0)
    
    # Her rol için durum belirle
    role_states = {}
    for role in job_roles:
        role_id = role.get("id")
        level_order = role.get("level_order", 0)
        is_locked = role.get("locked", False)
        
        if is_locked:
            role_states[role_id] = "locked"
        elif level_order < estimated_level:
            role_states[role_id] = "past"
        elif level_order == estimated_level:
            role_states[role_id] = "current"
        else:
            # Gelecek: sadece önündeki 2-3 basamak
            if level_order <= estimated_level + 3:
                role_states[role_id] = "future"
            else:
                role_states[role_id] = "locked"
    
    return {
        "current_level": estimated_level,
        "role_states": role_states,
        "current_role_id": current_role.get("id") if current_role else None
    }

