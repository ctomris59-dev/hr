import os
import random
from datetime import datetime

# --- TEMİZ DEMO VERİSİ (ISIM HAVUZU) ---
FIRST_NAMES = ["Ahmet", "Mehmet", "Mustafa", "Can", "Burak", "Emre", "Murat", "Ali", "Ozan", "Serkan", "Hakan", "Deniz", "Cem", "Tolga", "Ayşe", "Fatma", "Zeynep", "Elif", "Selin", "Esra", "Gamze", "Buse", "Gizem", "Derya", "Merve", "İrem"]
LAST_NAMES = ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek"]
DEPARTMENTS = ["İnsan Kaynakları", "Bilgi Teknolojileri", "Finans", "Satış", "Pazarlama", "Operasyon", "AR-GE", "Hukuk"]

# Job Profiles (Hedef Puanlar)
JOB_PROFILES = {
    "Genel Müdür": { "STR": 5.0, "RES": 5.0, "COM": 5.0, "TEA": 4.5, "ETH": 5.0, "ANA": 4.5, "DIG": 4.0, "DET": 4.0, "LRN": 5.0, "DIS": 5.0 },
    "Direktör": { "STR": 4.5, "RES": 4.5, "COM": 5.0, "TEA": 4.5, "ETH": 5.0, "ANA": 4.0, "DIG": 4.0, "DET": 3.5, "LRN": 4.5, "DIS": 4.5 },
    "Müdür": { "STR": 3.5, "RES": 4.5, "COM": 4.5, "TEA": 5.0, "ETH": 4.5, "ANA": 4.0, "DIG": 4.0, "DET": 4.0, "LRN": 4.0, "DIS": 4.5 },
    "Uzman": { "STR": 2.5, "RES": 4.0, "COM": 4.0, "TEA": 4.5, "ETH": 4.0, "ANA": 3.5, "DIG": 3.5, "DET": 4.5, "LRN": 4.0, "DIS": 4.0 }
}

COMPETENCY_KEYS = ["STR", "RES", "COM", "ETH", "ANA", "DIG", "DET", "LRN", "TEA", "DIS"]

def generate_random_birth_date():
    """
    Rastgele bir doğum tarihi üretir (25-65 yaş arası, yılın farklı aylarına dağıtılmış).
    Format: YYYY-MM-DD
    """
    # 25-65 yaş arası (bugünden geriye doğru)
    current_year = datetime.now().year
    birth_year = random.randint(current_year - 65, current_year - 25)
    
    # Yılın farklı aylarına dağıt (tüm aylar eşit olasılıkla)
    birth_month = random.randint(1, 12)
    
    # Ayın gün sayısını hesapla
    if birth_month in [1, 3, 5, 7, 8, 10, 12]:
        max_day = 31
    elif birth_month in [4, 6, 9, 11]:
        max_day = 30
    else:  # Şubat
        # Artık yıl kontrolü
        if (birth_year % 4 == 0 and birth_year % 100 != 0) or (birth_year % 400 == 0):
            max_day = 29
        else:
            max_day = 28
    
    birth_day = random.randint(1, max_day)
    
    return f"{birth_year}-{birth_month:02d}-{birth_day:02d}"

# --- VERİ ÜRETİM MOTORU ---
def generate_clean_employees(count=145):
    """
    Eski bozuk verileri yoksayar, sıfırdan temiz Türkçe isimler üretir.
    """
    employees = []
    
    # 1. CEO (Sabit)
    employees.append({
        "id": 1001,
        "name": "Emin Öncü",
        "position": "Genel Müdür",
        "department": "Yönetim",
        "email": "emin.oncu@futurehr.com",
        "phone": "+90 532 100 00 01",
        "performance": 4.9,
        "potential": 5.0,
        "salary": 250000,
        "scores": {k: 5.0 for k in COMPETENCY_KEYS},
        "targets": JOB_PROFILES["Genel Müdür"],
        "birth_date": "1965-03-15"  # CEO için sabit bir tarih
    })
    
    # 2. Diğer Çalışanlar
    for i in range(2, count + 1):
        dept = random.choice(DEPARTMENTS)
        
        # Hiyerarşi Dağılımı
        roll = random.random()
        if roll < 0.05: # %5 Direktör
            pos = f"{dept} Direktörü"
            base_profile = JOB_PROFILES["Direktör"]
            salary = random.randint(120000, 180000)
        elif roll < 0.20: # %15 Müdür
            pos = f"{dept} Müdürü"
            base_profile = JOB_PROFILES["Müdür"]
            salary = random.randint(70000, 110000)
        else: # %80 Uzman
            pos = f"{dept} Uzmanı"
            base_profile = JOB_PROFILES["Uzman"]
            salary = random.randint(35000, 65000)
        
        # Rastgele isim oluştur
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        
        # Performans ve potansiyel rastgele ama mantıklı
        performance = round(random.uniform(2.5, 5.0), 1)
        potential = round(random.uniform(2.0, 5.0), 1)
        
        # Yetkinlik skorları (base_profile etrafında küçük sapmalar)
        scores = {}
        for k, v in base_profile.items():
            scores[k] = round(max(1.0, min(5.0, v + random.uniform(-0.5, 0.5))), 1)
        
        employees.append({
            "id": 1001 + i,
            "name": name,
            "position": pos,
            "department": dept,
            "email": f"{name.lower().replace(' ', '.').replace('ı', 'i').replace('ğ', 'g').replace('ü', 'u').replace('ş', 's').replace('ö', 'o').replace('ç', 'c')}@futurehr.com",
            "phone": f"+90 532 {random.randint(100,999)} {random.randint(10,99)} {random.randint(10,99)}",
            "performance": performance,
            "potential": potential,
            "salary": salary,
            "scores": scores,
            "targets": base_profile,
            "birth_date": generate_random_birth_date()
        })
    
    return employees

# Global Cache (Her restartta temiz veri)
CLEAN_DB = generate_clean_employees(145)

# Veri temizleme flag dosyası
DATA_CLEARED_FILE = "data_cleared.flag"

def is_data_cleared():
    """Verilerin temizlenip temizlenmediğini kontrol et"""
    return os.path.exists(DATA_CLEARED_FILE)

def set_data_cleared(cleared: bool):
    """Veri temizleme flag'ini set et"""
    if cleared:
        with open(DATA_CLEARED_FILE, "w") as f:
            f.write("1")
    else:
        if os.path.exists(DATA_CLEARED_FILE):
            try:
                os.remove(DATA_CLEARED_FILE)
            except:
                pass
