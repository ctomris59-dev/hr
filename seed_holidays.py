# seed_holidays.py
# Türkiye Resmi Tatilleri (2026-2030)

import json
import os
from datetime import datetime, date
from config import DB_HOLIDAYS_FILE

# Türkiye'nin resmi tatilleri (2026-2030)
HOLIDAYS = [
    # 2026
    {"name": "Yılbaşı", "date": "2026-01-01", "day_of_week": "Perşembe"},
    {"name": "Ulusal Egemenlik ve Çocuk Bayramı", "date": "2026-04-23", "day_of_week": "Perşembe"},
    {"name": "Emek ve Dayanışma Günü", "date": "2026-05-01", "day_of_week": "Cuma"},
    {"name": "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "date": "2026-05-19", "day_of_week": "Salı"},
    {"name": "Ramazan Bayramı (1. Gün)", "date": "2026-03-30", "day_of_week": "Pazartesi"},
    {"name": "Ramazan Bayramı (2. Gün)", "date": "2026-03-31", "day_of_week": "Salı"},
    {"name": "Ramazan Bayramı (3. Gün)", "date": "2026-04-01", "day_of_week": "Çarşamba"},
    {"name": "Kurban Bayramı (1. Gün)", "date": "2026-06-06", "day_of_week": "Cumartesi"},
    {"name": "Kurban Bayramı (2. Gün)", "date": "2026-06-07", "day_of_week": "Pazar"},
    {"name": "Kurban Bayramı (3. Gün)", "date": "2026-06-08", "day_of_week": "Pazartesi"},
    {"name": "Kurban Bayramı (4. Gün)", "date": "2026-06-09", "day_of_week": "Salı"},
    {"name": "Zafer Bayramı", "date": "2026-08-30", "day_of_week": "Pazar"},
    {"name": "Cumhuriyet Bayramı", "date": "2026-10-29", "day_of_week": "Perşembe"},
    
    # 2027
    {"name": "Yılbaşı", "date": "2027-01-01", "day_of_week": "Cuma"},
    {"name": "Ulusal Egemenlik ve Çocuk Bayramı", "date": "2027-04-23", "day_of_week": "Cuma"},
    {"name": "Emek ve Dayanışma Günü", "date": "2027-05-01", "day_of_week": "Cumartesi"},
    {"name": "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "date": "2027-05-19", "day_of_week": "Çarşamba"},
    {"name": "Ramazan Bayramı (1. Gün)", "date": "2027-03-20", "day_of_week": "Cumartesi"},
    {"name": "Ramazan Bayramı (2. Gün)", "date": "2027-03-21", "day_of_week": "Pazar"},
    {"name": "Ramazan Bayramı (3. Gün)", "date": "2027-03-22", "day_of_week": "Pazartesi"},
    {"name": "Kurban Bayramı (1. Gün)", "date": "2027-05-27", "day_of_week": "Perşembe"},
    {"name": "Kurban Bayramı (2. Gün)", "date": "2027-05-28", "day_of_week": "Cuma"},
    {"name": "Kurban Bayramı (3. Gün)", "date": "2027-05-29", "day_of_week": "Cumartesi"},
    {"name": "Kurban Bayramı (4. Gün)", "date": "2027-05-30", "day_of_week": "Pazar"},
    {"name": "Zafer Bayramı", "date": "2027-08-30", "day_of_week": "Pazartesi"},
    {"name": "Cumhuriyet Bayramı", "date": "2027-10-29", "day_of_week": "Cuma"},
    
    # 2028
    {"name": "Yılbaşı", "date": "2028-01-01", "day_of_week": "Cumartesi"},
    {"name": "Ulusal Egemenlik ve Çocuk Bayramı", "date": "2028-04-23", "day_of_week": "Pazar"},
    {"name": "Emek ve Dayanışma Günü", "date": "2028-05-01", "day_of_week": "Pazartesi"},
    {"name": "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "date": "2028-05-19", "day_of_week": "Cuma"},
    {"name": "Ramazan Bayramı (1. Gün)", "date": "2028-03-09", "day_of_week": "Perşembe"},
    {"name": "Ramazan Bayramı (2. Gün)", "date": "2028-03-10", "day_of_week": "Cuma"},
    {"name": "Ramazan Bayramı (3. Gün)", "date": "2028-03-11", "day_of_week": "Cumartesi"},
    {"name": "Kurban Bayramı (1. Gün)", "date": "2028-05-15", "day_of_week": "Pazartesi"},
    {"name": "Kurban Bayramı (2. Gün)", "date": "2028-05-16", "day_of_week": "Salı"},
    {"name": "Kurban Bayramı (3. Gün)", "date": "2028-05-17", "day_of_week": "Çarşamba"},
    {"name": "Kurban Bayramı (4. Gün)", "date": "2028-05-18", "day_of_week": "Perşembe"},
    {"name": "Zafer Bayramı", "date": "2028-08-30", "day_of_week": "Çarşamba"},
    {"name": "Cumhuriyet Bayramı", "date": "2028-10-29", "day_of_week": "Pazar"},
    
    # 2029
    {"name": "Yılbaşı", "date": "2029-01-01", "day_of_week": "Pazartesi"},
    {"name": "Ulusal Egemenlik ve Çocuk Bayramı", "date": "2029-04-23", "day_of_week": "Pazartesi"},
    {"name": "Emek ve Dayanışma Günü", "date": "2029-05-01", "day_of_week": "Salı"},
    {"name": "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "date": "2029-05-19", "day_of_week": "Cumartesi"},
    {"name": "Ramazan Bayramı (1. Gün)", "date": "2029-02-26", "day_of_week": "Pazartesi"},
    {"name": "Ramazan Bayramı (2. Gün)", "date": "2029-02-27", "day_of_week": "Salı"},
    {"name": "Ramazan Bayramı (3. Gün)", "date": "2029-02-28", "day_of_week": "Çarşamba"},
    {"name": "Kurban Bayramı (1. Gün)", "date": "2029-05-04", "day_of_week": "Cuma"},
    {"name": "Kurban Bayramı (2. Gün)", "date": "2029-05-05", "day_of_week": "Cumartesi"},
    {"name": "Kurban Bayramı (3. Gün)", "date": "2029-05-06", "day_of_week": "Pazar"},
    {"name": "Kurban Bayramı (4. Gün)", "date": "2029-05-07", "day_of_week": "Pazartesi"},
    {"name": "Zafer Bayramı", "date": "2029-08-30", "day_of_week": "Perşembe"},
    {"name": "Cumhuriyet Bayramı", "date": "2029-10-29", "day_of_week": "Pazartesi"},
    
    # 2030
    {"name": "Yılbaşı", "date": "2030-01-01", "day_of_week": "Salı"},
    {"name": "Ulusal Egemenlik ve Çocuk Bayramı", "date": "2030-04-23", "day_of_week": "Salı"},
    {"name": "Emek ve Dayanışma Günü", "date": "2030-05-01", "day_of_week": "Çarşamba"},
    {"name": "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "date": "2030-05-19", "day_of_week": "Pazar"},
    {"name": "Ramazan Bayramı (1. Gün)", "date": "2030-02-15", "day_of_week": "Cuma"},
    {"name": "Ramazan Bayramı (2. Gün)", "date": "2030-02-16", "day_of_week": "Cumartesi"},
    {"name": "Ramazan Bayramı (3. Gün)", "date": "2030-02-17", "day_of_week": "Pazar"},
    {"name": "Kurban Bayramı (1. Gün)", "date": "2030-04-24", "day_of_week": "Çarşamba"},
    {"name": "Kurban Bayramı (2. Gün)", "date": "2030-04-25", "day_of_week": "Perşembe"},
    {"name": "Kurban Bayramı (3. Gün)", "date": "2030-04-26", "day_of_week": "Cuma"},
    {"name": "Kurban Bayramı (4. Gün)", "date": "2030-04-27", "day_of_week": "Cumartesi"},
    {"name": "Zafer Bayramı", "date": "2030-08-30", "day_of_week": "Cuma"},
    {"name": "Cumhuriyet Bayramı", "date": "2030-10-29", "day_of_week": "Salı"},
]

def seed_holidays():
    """Resmi tatilleri veritabanına kaydeder."""
    holidays_with_ids = []
    for idx, holiday in enumerate(HOLIDAYS, start=1):
        holidays_with_ids.append({
            "id": idx,
            "name": holiday["name"],
            "date": holiday["date"],
            "day_of_week": holiday["day_of_week"]
        })
    
    try:
        with open(DB_HOLIDAYS_FILE, "w", encoding="utf-8") as f:
            json.dump(holidays_with_ids, f, ensure_ascii=False, indent=4)
        print(f"SUCCESS: {len(holidays_with_ids)} resmi tatil basariyla kaydedildi: {DB_HOLIDAYS_FILE}")
        return True
    except Exception as e:
        print(f"ERROR: Hata: {e}")
        return False

if __name__ == "__main__":
    seed_holidays()

