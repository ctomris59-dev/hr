#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Şirket Mutluluk Grafiği (Pulse) Demo Verisi Oluşturucu
Son 12 hafta için demo pulse verileri oluşturur
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import random

# Unicode encoding fix
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Backend dizinine ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import DB_PULSE_FILE, DB_ORG_FILE, DEPARTMENTS
from utils_db import load_org_chart, save_pulse_answer

def seed_pulse_demo_data():
    """Şirket Mutluluk Grafiği için demo verileri oluşturur."""
    
    # Organizasyon şemasını yükle
    org_data = load_org_chart()
    
    if not org_data:
        print("⚠️  Organizasyon şeması bulunamadı. Önce çalışan verilerini oluşturun.")
        return
    
    print(f"[PULSE] {len(org_data)} calisan icin pulse verileri olusturuluyor...")
    
    # Son 12 hafta için veri oluştur
    current_date = datetime.now()
    weeks_to_generate = 12
    
    total_answers = 0
    
    for week_offset in range(weeks_to_generate):
        week_number = weeks_to_generate - week_offset  # 12, 11, 10, ..., 1
        week_date = current_date - timedelta(weeks=week_offset)
        
        # Her hafta için çalışanların %70'i cevap vermiş varsayalım
        employees_this_week = random.sample(org_data, k=int(len(org_data) * 0.7))
        
        for employee in employees_this_week:
            employee_name = employee.get("Ad Soyad", "")
            department = employee.get("Departman", "Genel")
            
            # Departman bazlı mutluluk skorları (gerçekçi varyasyon)
            base_scores = {
                "İnsan Kaynakları": (7.2, 8.5),
                "Bilgi Teknolojileri": (6.8, 8.2),
                "Finans": (7.0, 8.0),
                "Satış": (6.5, 7.8),
                "Operasyon": (6.8, 7.9),
                "Yönetim": (7.5, 9.0),
            }
            
            score_range = base_scores.get(department, (6.5, 8.0))
            
            # Haftalara göre trend (başlangıçta düşük, sonra yükseliyor)
            trend_factor = 0.3 + (week_offset / weeks_to_generate) * 0.7  # 0.3'ten 1.0'a
            
            # Baz skor + trend + rastgele varyasyon
            base_score = score_range[0] + (score_range[1] - score_range[0]) * trend_factor
            score = base_score + random.uniform(-0.5, 0.5)
            score = max(1.0, min(10.0, score))  # 1-10 arası sınırla
            
            # Pulse cevabını kaydet
            success = save_pulse_answer(
                employee_id=employee.get("id", ""),
                employee_name=employee_name,
                department_id=department,
                department_name=department,
                score=round(score, 2),
                week_number=f"Hafta {week_number}"
            )
            
            if success:
                total_answers += 1
    
    print(f"[OK] {total_answers} pulse cevabi basariyla olusturuldu!")
    print(f"[INFO] Son {weeks_to_generate} hafta icin veriler hazir.")
    print(f"[INFO] Dashboard'da 'Sirket Mutluluk Grafigi' bolumunde goruntuleyebilirsiniz.")

if __name__ == "__main__":
    seed_pulse_demo_data()

