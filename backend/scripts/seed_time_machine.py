#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Time Machine / Simülasyon Modu - Demo Veri Oluşturucu
Ahmet Yılmaz için 4 yıllık tarihçeli veri oluşturur (2023-2026)
"""

import json
import os
import sys
from datetime import datetime, date
from pathlib import Path

# Backend dizinine ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    DB_ORG_FILE, DB_360_FILE, DB_TALENT_ASSESSMENT_FILE, 
    DB_SUCCESSION_FILE, COMPETENCIES_360
)

# Yetkinlik kodları (LID hariç - 10 temel yetkinlik)
COMPETENCY_CODES = [code for code in COMPETENCIES_360.keys() if code != "LID"]
COMPETENCY_NAMES = {code: COMPETENCIES_360[code] for code in COMPETENCY_CODES}

# Ahmet Yılmaz'ın zaman yolculuğu
TIME_MACHINE_DATA = {
    "2023-01-01": {
        "role": "Uzman Yrd.",
        "position": "Uzman Yardımcısı",
        "salary": 25000,
        "performance": 1.5,
        "potential": 2.0,
        "competencies": {
            "COM": 1.5,  # İletişim Becerileri
            "ANA": 2.0,  # Analitik Düşünme
            "TEA": 2.5,  # Takım Çalışması
            "DIG": 1.8,
            "RES": 2.0,
            "DET": 2.2,
            "LRN": 2.3,
            "ETH": 2.5,
            "DIS": 2.0,
            "STR": 1.5,
        },
        "succession_readiness": "NOT_READY",
        "succession_years": None,
    },
    "2024-01-01": {
        "role": "Uzman",
        "position": "Uzman",
        "salary": 45000,
        "performance": 3.0,
        "potential": 3.5,
        "competencies": {
            "COM": 2.5,
            "ANA": 3.5,
            "TEA": 3.5,
            "DIG": 3.0,
            "RES": 3.2,
            "DET": 3.3,
            "LRN": 3.4,
            "ETH": 3.5,
            "DIS": 3.0,
            "STR": 2.8,
        },
        "succession_readiness": "DEVELOPMENT_NEEDED",
        "succession_years": 2,
    },
    "2025-01-01": {
        "role": "Kıdemli Uzman",
        "position": "Kıdemli Uzman",
        "salary": 75000,
        "performance": 4.2,
        "potential": 4.5,
        "competencies": {
            "COM": 3.5,
            "ANA": 4.5,
            "TEA": 4.5,
            "DIG": 4.0,
            "RES": 4.2,
            "DET": 4.3,
            "LRN": 4.4,
            "ETH": 4.5,
            "DIS": 4.0,
            "STR": 3.8,
        },
        "succession_readiness": "DEVELOPMENT_NEEDED",
        "succession_years": 1,
    },
    "2026-01-01": {
        "role": "Müdür",
        "position": "Müdür",
        "salary": 110000,
        "performance": 4.8,
        "potential": 4.8,
        "competencies": {
            "COM": 4.8,
            "ANA": 5.0,
            "TEA": 4.8,
            "DIG": 4.5,
            "RES": 4.7,
            "DET": 4.8,
            "LRN": 4.9,
            "ETH": 5.0,
            "DIS": 4.5,
            "STR": 4.6,
        },
        "succession_readiness": "READY",
        "succession_years": 0,
    },
}

EMPLOYEE_NAME = "Ahmet Yılmaz"
EMPLOYEE_DEPARTMENT = "Bilgi Teknolojileri"


def load_json_file(filepath: str) -> list:
    """JSON dosyasını yükle."""
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_json_file(filepath: str, data: list):
    """JSON dosyasına kaydet."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def create_org_chart_entry(date_str: str, data: dict) -> dict:
    """Organizasyon şeması girişi oluştur."""
    return {
        "Ad Soyad": EMPLOYEE_NAME,
        "Pozisyon": data["position"],
        "Departman": EMPLOYEE_DEPARTMENT,
        "Maaş (TL)": data["salary"],
        "valid_from": date_str,
        "simulation": True,
    }


def create_360_entry(date_str: str, data: dict) -> dict:
    """360 derece değerlendirme girişi oluştur."""
    entry = {
        "Personel": EMPLOYEE_NAME,
        "target": EMPLOYEE_NAME,
        "Performans": data["performance"],
        "Potansiyel": data["potential"],
        "date": date_str,
        "valid_from": date_str,
        "simulation": True,
    }
    
    # Yetkinlik puanlarını ekle (Mgr, Peer, Self)
    for code, score in data["competencies"].items():
        entry[f"{code}_Mgr"] = str(score)
        entry[f"{code}_Peer"] = str(score - 0.1)
        entry[f"{code}_Self"] = str(score - 0.2)
    
    return entry


def create_talent_assessment(date_str: str, data: dict) -> dict:
    """Talent assessment girişi oluştur."""
    return {
        "id": len(load_json_file(DB_TALENT_ASSESSMENT_FILE)) + 1,
        "employee_id": EMPLOYEE_NAME,
        "period": date_str.split("-")[0] + "-Q1",
        "performance_score": data["performance"],
        "potential_score": data["potential"],
        "created_at": date_str + "T00:00:00",
        "updated_at": date_str + "T00:00:00",
        "valid_from": date_str,
        "simulation": True,
    }


def create_succession_entry(date_str: str, data: dict) -> dict:
    """Yedekleme planı girişi oluştur."""
    readiness_map = {
        "NOT_READY": "Kırmızı",
        "DEVELOPMENT_NEEDED": "Sarı",
        "READY": "Yeşil",
    }
    
    return {
        "id": len(load_json_file(DB_SUCCESSION_FILE).get("succession_plans", [])) + 1,
        "position_id": f"{EMPLOYEE_NAME}_position",
        "position_name": data["position"],
        "employee_name": EMPLOYEE_NAME,
        "readiness_status": data["succession_readiness"],
        "readiness_color": readiness_map.get(data["succession_readiness"], "Gri"),
        "years_to_readiness": data["succession_years"],
        "created_at": date_str + "T00:00:00",
        "valid_from": date_str,
        "simulation": True,
    }


def seed_time_machine_data():
    """Time Machine verilerini oluştur."""
    print("Time Machine / Simulasyon Modu - Veri Olusturuluyor...")
    print(f"Kahraman: {EMPLOYEE_NAME}")
    print(f"Tarih Araligi: 2023-01-01 -> 2026-01-01\n")
    
    # 1. Organizasyon Şeması
    org_data = load_json_file(DB_ORG_FILE)
    # Mevcut Ahmet Yılmaz kayıtlarını temizle (simulation olanları)
    org_data = [e for e in org_data if not (
        e.get("Ad Soyad") == EMPLOYEE_NAME and e.get("simulation")
    )]
    
    for date_str, data in TIME_MACHINE_DATA.items():
        org_entry = create_org_chart_entry(date_str, data)
        org_data.append(org_entry)
        print(f"[OK] {date_str}: {data['position']} - {data['salary']:,} TL")
    
    save_json_file(DB_ORG_FILE, org_data)
    print(f"\nOrganizasyon Semasi: {len(org_data)} kayit")
    
    # 2. 360 Derece Değerlendirme
    data_360 = load_json_file(DB_360_FILE)
    # Mevcut Ahmet Yılmaz kayıtlarını temizle
    data_360 = [e for e in data_360 if not (
        (e.get("Personel") == EMPLOYEE_NAME or e.get("target") == EMPLOYEE_NAME) 
        and e.get("simulation")
    )]
    
    for date_str, data in TIME_MACHINE_DATA.items():
        entry_360 = create_360_entry(date_str, data)
        data_360.append(entry_360)
    
    save_json_file(DB_360_FILE, data_360)
    print(f"360 Degerlendirme: {len(data_360)} kayit")
    
    # 3. Talent Assessment
    assessments = load_json_file(DB_TALENT_ASSESSMENT_FILE)
    # Mevcut kayıtları temizle
    assessments = [a for a in assessments if not (
        a.get("employee_id") == EMPLOYEE_NAME and a.get("simulation")
    )]
    
    for date_str, data in TIME_MACHINE_DATA.items():
        assessment = create_talent_assessment(date_str, data)
        assessments.append(assessment)
    
    save_json_file(DB_TALENT_ASSESSMENT_FILE, assessments)
    print(f"Talent Assessment: {len(assessments)} kayit")
    
    # 4. Yedekleme Planı
    succession_data = load_json_file(DB_SUCCESSION_FILE)
    if not isinstance(succession_data, dict):
        succession_data = {"succession_plans": []}
    
    # Mevcut kayıtları temizle
    succession_data["succession_plans"] = [
        p for p in succession_data.get("succession_plans", [])
        if not (p.get("employee_name") == EMPLOYEE_NAME and p.get("simulation"))
    ]
    
    for date_str, data in TIME_MACHINE_DATA.items():
        succession_entry = create_succession_entry(date_str, data)
        succession_data["succession_plans"].append(succession_entry)
    
    save_json_file(DB_SUCCESSION_FILE, succession_data)
    print(f"Yedekleme Plani: {len(succession_data['succession_plans'])} kayit")
    
    print("\n[SUCCESS] Time Machine verileri basariyla olusturuldu!")
    print(f"4 zaman noktasi: 2023 -> 2024 -> 2025 -> 2026")
    print(f"Demo sunumuna hazir!")


if __name__ == "__main__":
    seed_time_machine_data()

