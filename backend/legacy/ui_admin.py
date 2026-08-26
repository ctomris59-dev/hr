# ui_admin.py (V24.0 - FASTAPI REFACTORED - Streamlit kaldırıldı)
# Bu dosya artık sadece iş mantığı fonksiyonlarını içerir
# FastAPI endpoint'leri main.py'de tanımlı

import pandas as pd
import random
import os
import string
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

# Dosya yollarını güvenli çekelim
try:
    from utils_db import save_data, save_org_chart, DB_FILE, DB_360_FILE, DB_ORG_FILE, load_org_chart
    from config import COMPETENCIES_360
    from auth import load_users, save_users, refresh_users_db
    from data.data_jobs import JOB_PROFILES 
except ImportError:
    DB_FILE = os.path.join("database", "future_hr_db.json")
    DB_360_FILE = os.path.join("database", "future_360_db.json")
    DB_ORG_FILE = os.path.join("database", "future_org_chart.json")
    COMPETENCIES_360 = {}
    JOB_PROFILES = {} 
    def save_data(x): pass
    def save_org_chart(x): pass
    def load_users(): return {}
    def save_users(x): pass
    def refresh_users_db(): pass
    def load_org_chart(): return []

# --- 0. DOĞUM TARİHİ ÜRETİCİ ---
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

# --- 1. GARANTİ MAAŞ HESAPLAYICI ---
def get_guaranteed_salary_by_level(level_type):
    """
    level_type: 'Stajyer', 'Uzman', 'Müdür' vb. kesin bilgi alır.
    """
    # Aralıklar (Min - Max)
    ranges = {
        "Stajyer": (17002, 19500),
        "Asistan": (26000, 32000),
        "Uzman Yardımcısı": (34000, 42000),
        "Uzman": (43000, 58000),
        "Kıdemli Uzman": (62000, 85000),
        "Takım Lideri": (75000, 95000),
        "Müdür": (98000, 125000),
        "Direktör": (135000, 165000),
        "CEO": (190000, 250000)
    }
    
    # Eğer gelen tip listede varsa aralığı al, yoksa varsayılan Uzman aralığını al
    low, high = ranges.get(level_type, (40000, 50000))
    
    # Rastgele sayı üret
    val = random.randint(low, high)
    
    # Sonunu yuvarla (Örn: 43212 -> 43200)
    return round(val, -2)

# --- 2. KIDEME GÖRE İZİN HAKKI HESAPLAYICI ---
def calculate_vacation_days(tenure_years):
    """
    4857 Sayılı İş Kanunu'na benzer mantıkla izin hakkı belirler.
    Ek olarak rastgele +1/+2 gün devreden izin eklenebilir.
    """
    base_leave = 0
    if tenure_years < 1:
        base_leave = 0 # 1 yılı doldurmayan hak kazanmaz (Demo için 0 kalsın)
    elif tenure_years < 6:
        base_leave = 14
    elif tenure_years < 15:
        base_leave = 20
    else:
        base_leave = 26
    
    # Gerçekçilik katmak için bazılarının kullanmadığı devreden günleri olsun
    extra_days = random.choice([0, 0, 0, 1, 2, 5]) 
    return base_leave + extra_days if base_leave > 0 else 0

# --- 3. POZİSYON BULUCU ---
def find_real_title(dept, level_key):
    """DataJobs varsa oradan gerçekçi isim bulur."""
    if JOB_PROFILES:
        candidates = []
        for title in JOB_PROFILES.keys():
            # Hem departman (örn: Finans) hem seviye (örn: Müdür) geçiyor mu?
            if dept[:3].lower() in title.lower() and level_key.lower() in title.lower():
                candidates.append(title)
        
        if candidates:
            return random.choice(candidates)
            
    # Bulamazsa standart oluştur
    return f"{dept} {level_key}"

# --- 4. FULL DEMO OLUŞTURUCU (HACİMLİ) - Streamlit bağımlılıkları kaldırıldı ---
def generate_full_demo_environment():
    """
    Full demo environment oluşturur - Streamlit bağımlılığı yok.
    Returns: (org_count, 360_count, demo_org_list)
    """
    # 1. TEMİZLİK: Önce eski dosyayı fiziksel olarak sil (Ghost data kalmasın)
    if os.path.exists(DB_ORG_FILE):
        try: 
            os.remove(DB_ORG_FILE)
        except: 
            pass
        
    departments = ["İnsan Kaynakları", "Bilgi Teknolojileri", "Finans", "Satış", "Operasyon", "Pazarlama", "AR-GE"]
    demo_org = []
    
    # A. CEO
    ceo_name = "Emin Öncü"
    ceo_pos = "Yönetim Kurulu Başkanı"
    demo_org.append({
        "Ad Soyad": ceo_name, "Pozisyon": ceo_pos, "Departman": "Yönetim", 
        "Yönetici 1": "-", "Yönetici 2": "-",
        "Maaş (TL)": get_guaranteed_salary_by_level("CEO"), 
        "Performans": 5.0, "Potansiyel": 5.0, "Calisma_Yili": 20,
        "Izin_Hakki": 30, # CEO olduğu için manuel yüksek girdik
        "birth_date": "1965-03-15"  # CEO için sabit bir tarih
    })

    total_depts = len(departments)

    # B. DEPARTMAN DÖNGÜSÜ
    for i, dept in enumerate(departments):
        # 1. DİREKTÖR
        dir_name = f"Canan {dept[:3]} (Dir)"
        dir_pos = find_real_title(dept, "Direktör")
        dir_tenure = random.randint(12, 18)
        
        demo_org.append({
            "Ad Soyad": dir_name, "Pozisyon": dir_pos, "Departman": dept, 
            "Yönetici 1": ceo_name, "Yönetici 2": "-", 
            "Maaş (TL)": get_guaranteed_salary_by_level("Direktör"), 
            "Performans": round(random.uniform(4.2, 5.0), 1),
            "Potansiyel": round(random.uniform(4.0, 5.0), 1),
            "Calisma_Yili": dir_tenure,
            "Izin_Hakki": calculate_vacation_days(dir_tenure),
            "birth_date": generate_random_birth_date()
        })
        current_dir = dir_name

        # 2. MÜDÜRLER (2-3 Adet)
        num_managers = random.randint(2, 3)
        for m in range(num_managers):
            mgr_name = f"Mehmet {dept[:3]} (Mdr-{m+1})"
            mgr_pos = find_real_title(dept, "Müdür")
            mgr_tenure = random.randint(6, 12)
            
            demo_org.append({
                "Ad Soyad": mgr_name, "Pozisyon": mgr_pos, "Departman": dept, 
                "Yönetici 1": current_dir, "Yönetici 2": ceo_name, 
                "Maaş (TL)": get_guaranteed_salary_by_level("Müdür"), 
                "Performans": round(random.uniform(3.5, 4.8), 1),
                "Potansiyel": round(random.uniform(3.2, 4.5), 1),
                "Calisma_Yili": mgr_tenure,
                "Izin_Hakki": calculate_vacation_days(mgr_tenure),
                "birth_date": generate_random_birth_date()
            })
            current_mgr = mgr_name

            # 3. PERSONEL (5-8 Adet)
            num_staff = random.randint(5, 8)
            
            # Bu listeden seçilen her bir rol için maaş hesaplanacak
            possible_levels = ["Uzman", "Uzman Yardımcısı", "Kıdemli Uzman", "Asistan", "Stajyer"]
            first_names = ["Zeynep", "Ali", "Ayşe", "Burak", "Ceren", "Deniz", "Elif", "Fatih", "Gizem", "Hakan", "Selin", "Mert"]
            
            for s in range(num_staff):
                # Rastgele seviye seç
                selected_level = random.choice(possible_levels)
                
                fname = random.choice(first_names)
                stf_name = f"{fname} {dept[:3]} ({random.randint(100,999)})"
                
                # Pozisyon adı bul
                stf_pos = find_real_title(dept, selected_level)
                
                # MAAŞI HESAPLA (Seçilen seviyeyi gönderiyoruz)
                salary = get_guaranteed_salary_by_level(selected_level) 
                
                perf = round(random.normalvariate(3.5, 0.7), 1)
                perf = max(1.5, min(5.0, perf))
                
                tenure = random.randint(1, 8)
                if selected_level == "Stajyer": tenure = 0.5
                
                demo_org.append({
                    "Ad Soyad": stf_name, "Pozisyon": stf_pos, "Departman": dept, 
                    "Yönetici 1": current_mgr, "Yönetici 2": current_dir,
                    "Maaş (TL)": salary, 
                    "Performans": perf,
                    "Potansiyel": round(random.uniform(2.5, 5.0), 1),
                    "Calisma_Yili": tenure,
                    "Izin_Hakki": calculate_vacation_days(tenure),
                    "birth_date": generate_random_birth_date()
                })

    # Org Kaydet
    save_org_chart(demo_org)
    
    # C. 360 DATA - Her personel için 360 değerlendirme verisi oluştur
    demo_360 = [] 
    comp_codes = list(COMPETENCIES_360.keys())
    
    for emp in demo_org:
        base_perf = emp['Performans']
        emp_name = emp['Ad Soyad']
        
        # DETERMİNİSTİK: Aynı kişi için her zaman aynı değerler üretilmeli
        seed_val = sum([ord(c) for c in emp_name])
        random.seed(seed_val)
        
        record = {
            "Personel": emp_name,
            "target": emp_name,  # Talent matrix için gerekli
            "Departman": emp['Departman'],
            "Pozisyon": emp['Pozisyon'], 
            "Performans": base_perf,
            "Potansiyel": emp['Potansiyel'], 
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        # Her yetkinlik için yönetici, peer ve self puanları oluştur
        for code in comp_codes:
            # DETERMİNİSTİK: Her yetkinlik için farklı seed
            comp_seed = seed_val + sum([ord(c) for c in code])
            random.seed(comp_seed)
            
            # Yönetici puanı: Performans etrafında daha tutarlı
            record[f"{code}_Mgr"] = round(max(1.0, min(5.0, base_perf + random.uniform(-0.4, 0.4))), 2)
            record[f"{code}_Mgr1"] = record[f"{code}_Mgr"]  # Alternatif field
            record[f"{code}_Mgr2"] = record[f"{code}_Mgr"]  # Alternatif field
            # Peer puanı: Biraz daha geniş varyasyon
            record[f"{code}_Peer"] = round(max(1.0, min(5.0, base_perf + random.uniform(-0.7, 0.7))), 2)
            # Self puanı: Genellikle biraz daha yüksek (self-assessment bias)
            record[f"{code}_Self"] = round(max(1.0, min(5.0, base_perf + random.uniform(-0.2, 0.8))), 2)
        demo_360.append(record)

    save_data(demo_360) 
    
    # E. PULSE DATA (Şirket Mutluluk Grafiği için)
    # Son 12 hafta için demo veri oluştur
    current_date = datetime.now()
    pulse_answers = []
    
    for week_offset in range(12, 0, -1):
        week_date = current_date - timedelta(weeks=week_offset)
        # Hafta numarası (ISO week number)
        week_number = f"{week_date.year}-W{week_date.isocalendar()[1]:02d}"
        
        # Her departman için rastgele sayıda çalışan için pulse verisi oluştur
        for emp in demo_org:
            # %80 ihtimalle bu çalışan o hafta pulse doldurmuş olsun
            if random.random() < 0.8:
                # Mutluluk skoru: 5-9 arası (10 üzerinden)
                # Performansı yüksek olanlar daha mutlu olsun
                base_score = 5.0
                if emp.get('Performans', 0) >= 4.5:
                    base_score = random.uniform(7.5, 9.0)
                elif emp.get('Performans', 0) >= 4.0:
                    base_score = random.uniform(6.5, 8.5)
                elif emp.get('Performans', 0) >= 3.5:
                    base_score = random.uniform(5.5, 7.5)
                else:
                    base_score = random.uniform(5.0, 6.5)
                
                # Haftalık varyasyon ekle (trend oluşturmak için)
                # Son haftalarda daha yüksek olsun (pozitif trend)
                trend_factor = 0.95 + (12 - week_offset) * 0.01  # Zamanla hafif artış
                final_score = round(base_score * trend_factor, 1)
                final_score = max(5.0, min(10.0, final_score))
                
                pulse_answers.append({
                    "id": len(pulse_answers) + 1,
                    "employee_id": emp['Ad Soyad'],
                    "employee_name": emp['Ad Soyad'],
                    "department_id": emp['Departman'],
                    "department_name": emp['Departman'],
                    "score": final_score,
                    "created_at": week_date.isoformat(),
                    "week_number": week_number
                })
    
    # Pulse verilerini kaydet
    try:
        from utils_db import DB_PULSE_FILE
        import json
        
        # Önce mevcut dosyayı sil (temiz başlangıç için)
        if os.path.exists(DB_PULSE_FILE):
            try:
                os.remove(DB_PULSE_FILE)
            except:
                pass
        
        # Yeni verileri kaydet
        with open(DB_PULSE_FILE, "w", encoding="utf-8") as f:
            json.dump(pulse_answers, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Pulse verisi kaydedilemedi: {e}")
    
    # D. KULLANICI HESAPLARI
    users_db = load_users()
    users_db = {k: v for k, v in users_db.items() if k in ['ceo', 'ik_dir']} 
    
    for emp in demo_org:
        role = "PERSONEL"
        if "Direktör" in emp['Pozisyon'] or "Dir" in emp['Ad Soyad']: role = "DIRECTOR"
        elif "Müdür" in emp['Pozisyon'] or "Mdr" in emp['Ad Soyad']: role = "MANAGER"
        elif "Başkan" in emp['Pozisyon']: role = "CEO"
        
        def clean_char(txt):
            return txt.lower().replace('ş','s').replace('ı','i').replace('ö','o').replace('ü','u').replace('ç','c').replace('ğ','g').replace(' ','')

        base_uname = clean_char(emp['Ad Soyad'].split()[0])
        username = f"{base_uname}{random.randint(1000,9999)}"
        
        if role == "CEO": continue

        users_db[username] = {
            "password": "123",
            "name": emp['Ad Soyad'],
            "role": role,
            "dept": emp['Departman'],
            "position": emp['Pozisyon']
        }
            
    save_users(users_db)
    refresh_users_db()
    
    # E. KARİYER YOLU VERİLERİ (Career Tracks)
    try:
        from services.career_service import load_career_data, save_career_data
        career_data = load_career_data()
        # Varsayılan veriler zaten yüklü, sadece kaydet
        save_career_data(career_data)
    except Exception as e:
        print(f"Kariyer verisi oluşturulamadı: {e}")
    
    # F. YEDEKLEME PLANI VERİLERİ (Succession Plans)
    try:
        from services.succession_service import load_succession_data, save_succession_data
        from services.succession_service import ReadinessLevel
        
        succession_data = load_succession_data()
        succession_plans = []
        
        # Kritik pozisyonlar için yedekleme planları oluştur
        critical_positions = [emp for emp in demo_org if "Direktör" in emp['Pozisyon'] or "Müdür" in emp['Pozisyon']]
        
        for pos_emp in critical_positions[:10]:  # İlk 10 kritik pozisyon
            # Bu pozisyon için potansiyel yedekler bul (yüksek potansiyelli çalışanlar)
            potential_successors = [
                emp for emp in demo_org 
                if emp['Pozisyon'] != pos_emp['Pozisyon'] 
                and emp.get('Potansiyel', 0) >= 4.0
                and emp['Departman'] == pos_emp['Departman']
            ]
            
            if potential_successors:
                # 1-2 yedek seç
                num_successors = min(random.randint(1, 2), len(potential_successors))
                selected_successors = random.sample(potential_successors, num_successors)
                
                for successor in selected_successors:
                    # Hazırlık seviyesi belirle
                    if successor.get('Potansiyel', 0) >= 4.5:
                        readiness = ReadinessLevel.READY_NOW.value
                    elif successor.get('Potansiyel', 0) >= 4.0:
                        readiness = ReadinessLevel.READY_1_YEAR.value
                    else:
                        readiness = ReadinessLevel.READY_2_YEARS.value
                    
                    succession_plans.append({
                        "id": len(succession_plans) + 1,
                        "position_id": pos_emp['Pozisyon'],
                        "position_name": pos_emp['Pozisyon'],
                        "successor_id": successor['Ad Soyad'],
                        "successor_name": successor['Ad Soyad'],
                        "readiness_level": readiness,
                        "notes": f"Potansiyel: {successor.get('Potansiyel', 0):.1f}, Performans: {successor.get('Performans', 0):.1f}"
                    })
        
        succession_data["succession_plans"] = succession_plans
        save_succession_data(succession_data)
    except Exception as e:
        print(f"Yedekleme planı verisi oluşturulamadı: {e}")
    
    # G. EĞİTİM VERİLERİ (Training Assignments)
    try:
        from utils_db import load_training_data, save_training_data
        
        training_data = []
        
        # Her çalışan için rastgele eğitim atamaları oluştur
        for emp in demo_org:
            # %40 ihtimalle eğitim ataması olsun
            if random.random() < 0.4:
                # Eksik yetkinliklere göre eğitim öner
                base_perf = emp.get('Performans', 3.5)
                
                # Düşük performanslı çalışanlar için daha fazla eğitim
                num_trainings = 1 if base_perf >= 4.0 else random.randint(1, 3)
                
                training_titles = [
                    "Liderlik Geliştirme Programı",
                    "İletişim Becerileri Eğitimi",
                    "Proje Yönetimi Sertifikası",
                    "Stratejik Düşünme Workshop",
                    "Takım Çalışması Eğitimi",
                    "Dijital Okuryazarlık Kursu",
                    "Analitik Düşünme Eğitimi"
                ]
                
                for _ in range(num_trainings):
                    training_data.append({
                        "id": len(training_data) + 1,
                        "employee_name": emp['Ad Soyad'],
                        "employee_id": emp['Ad Soyad'],
                        "training_title": random.choice(training_titles),
                        "status": random.choice(["Tamamlandı", "Devam Ediyor", "Planlandı"]),
                        "assigned_date": (datetime.now() - timedelta(days=random.randint(0, 180))).strftime("%Y-%m-%d"),
                        "completion_date": (datetime.now() - timedelta(days=random.randint(0, 90))).strftime("%Y-%m-%d") if random.random() < 0.5 else None,
                        "department": emp['Departman']
                    })
        
        save_training_data(training_data)
    except Exception as e:
        print(f"Eğitim verisi oluşturulamadı: {e}")
    
    # H. İZİN TALEPLERİ (Leave Requests)
    try:
        from utils_db import load_leave_requests, save_leave_request
        
        leave_requests = []
        
        # Her çalışan için rastgele izin talepleri oluştur
        for emp in demo_org:
            # %30 ihtimalle izin talebi olsun
            if random.random() < 0.3:
                num_requests = random.randint(1, 2)
                
                for _ in range(num_requests):
                    # Geçmiş veya gelecek tarihler
                    start_date = datetime.now() - timedelta(days=random.randint(0, 365))
                    days_diff = random.randint(1, 5)
                    end_date = start_date + timedelta(days=days_diff)
                    
                    leave_requests.append({
                        "id": len(leave_requests) + 1,
                        "personel": emp['Ad Soyad'],
                        "departman": emp['Departman'],
                        "tur": random.choice(["Yıllık İzin", "Hastalık İzni", "Mazeret İzni"]),
                        "baslangic": start_date.strftime("%Y-%m-%d"),
                        "bitis": end_date.strftime("%Y-%m-%d"),
                        "gun": days_diff,
                        "aciklama": random.choice(["Aile ziyareti", "Tatil", "Kişisel nedenler", ""]),
                        "durum": random.choice(["Onaylandı", "Bekliyor", "Reddedildi"]),
                        "talep_tarihi": (start_date - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
                        "yonetici_notu": random.choice(["", "Onaylandı", "Uygun görüldü"]) if random.random() < 0.5 else ""
                    })
        
        # İzin taleplerini kaydet
        for req in leave_requests:
            save_leave_request(req)
    except Exception as e:
        print(f"İzin talebi verisi oluşturulamadı: {e}")
    
    # I. BİLDİRİMLER (Notifications)
    try:
        from utils_db import send_notification
        
        # Örnek bildirimler oluştur
        notification_types = [
            ("info", "Yeni eğitim ataması yapıldı"),
            ("success", "İzin talebiniz onaylandı"),
            ("warning", "Performans değerlendirmesi yaklaşıyor"),
            ("info", "Yeni yedekleme planı oluşturuldu")
        ]
        
        # Her çalışan için 1-2 bildirim
        for emp in demo_org[:20]:  # İlk 20 çalışan
            if random.random() < 0.5:
                notif_type, message = random.choice(notification_types)
                send_notification(
                    emp['Ad Soyad'],
                    f"📢 {message}",
                    notif_type
                )
    except Exception as e:
        print(f"Bildirim verisi oluşturulamadı: {e}")
    
    # J. RESMİ TATİLLER (Holidays)
    try:
        from utils_db import load_holidays
        from config import DB_HOLIDAYS_FILE
        import json
        
        # Eğer tatil dosyası yoksa veya boşsa, örnek tatiller oluştur
        holidays = load_holidays()
        if not holidays or len(holidays) == 0:
            # 2024-2025 yılları için örnek resmi tatiller
            current_year = datetime.now().year
            sample_holidays = [
                {"id": 1, "name": "Yılbaşı", "date": f"{current_year}-01-01", "type": "Resmi Tatil"},
                {"id": 2, "name": "Ulusal Egemenlik ve Çocuk Bayramı", "date": f"{current_year}-04-23", "type": "Resmi Tatil"},
                {"id": 3, "name": "Emek ve Dayanışma Günü", "date": f"{current_year}-05-01", "type": "Resmi Tatil"},
                {"id": 4, "name": "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "date": f"{current_year}-05-19", "type": "Resmi Tatil"},
                {"id": 5, "name": "Zafer Bayramı", "date": f"{current_year}-08-30", "type": "Resmi Tatil"},
                {"id": 6, "name": "Cumhuriyet Bayramı", "date": f"{current_year}-10-29", "type": "Resmi Tatil"},
            ]
            
            # Gelecek yıl için de ekle
            next_year = current_year + 1
            sample_holidays.extend([
                {"id": 7, "name": "Yılbaşı", "date": f"{next_year}-01-01", "type": "Resmi Tatil"},
                {"id": 8, "name": "Ulusal Egemenlik ve Çocuk Bayramı", "date": f"{next_year}-04-23", "type": "Resmi Tatil"},
                {"id": 9, "name": "Emek ve Dayanışma Günü", "date": f"{next_year}-05-01", "type": "Resmi Tatil"},
            ])
            
            with open(DB_HOLIDAYS_FILE, "w", encoding="utf-8") as f:
                json.dump(sample_holidays, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Tatil verisi oluşturulamadı: {e}")
    
    return len(demo_org), len(demo_360), demo_org  # Debug için listeyi de döndür

# --- YARDIMCI FONKSİYONLAR ---
def normalize_username(name):
    """Kullanıcı adını normalize eder"""
    replacements = {'ı': 'i', 'İ': 'i', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u', 'ş': 's', 'Ş': 's', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c', ' ': ''}
    name = name.lower()
    for src, dest in replacements.items(): 
        name = name.replace(src, dest)
    if "(" in name: 
        name = name.split("(")[0]
    return name.strip()

def generate_strong_password(length=8):
    """Güçlü şifre oluşturur"""
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(random.choice(chars) for _ in range(length))

# --- KIDEM GÜNCELLEME İŞ MANTIĞI ---
def increment_tenure_for_all(increment_years: float) -> Dict[str, Any]:
    """
    Tüm personelin kıdemini artırır.
    
    Args:
        increment_years: Artırılacak yıl miktarı
        
    Returns:
        Dict: {
            "success": bool,
            "message": str,
            "count": int,
            "error": Optional[str]
        }
    """
    try:
        current_data = load_org_chart()
        if not current_data:
            return {
                "success": False,
                "error": "Veri bulunamadı.",
                "count": 0
            }
        
        count = 0
        for p in current_data:
            if 'Calisma_Yili' in p:
                p['Calisma_Yili'] += increment_years
            else:
                p['Calisma_Yili'] = 1 + increment_years
            count += 1
        
        save_org_chart(current_data)
        
        return {
            "success": True,
            "message": f"{count} personelin kıdemine {increment_years} yıl eklendi.",
            "count": count
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Hata: {str(e)}",
            "count": 0
        }

# --- KULLANICI YÖNETİMİ İŞ MANTIĞI ---
def create_user_account(
    employee_name: str,
    username: str,
    password: str,
    role: str,
    user_role: str,
    user_dept: Optional[str] = None
) -> Dict[str, Any]:
    """
    Yeni kullanıcı hesabı oluşturur.
    
    Args:
        employee_name: Personel adı
        username: Kullanıcı adı
        password: Şifre
        role: Atanacak rol (DIRECTOR, MANAGER, PERSONEL, vb.)
        user_role: İşlemi yapan kullanıcının rolü
        user_dept: İşlemi yapan kullanıcının departmanı
        
    Returns:
        Dict: {
            "success": bool,
            "message": str,
            "error": Optional[str]
        }
    """
    try:
        users_db = load_users()
        
        # Kullanıcı adı kontrolü
        if username in users_db:
            return {
                "success": False,
                "error": "Bu kullanıcı adı zaten alınmış."
            }
        
        # Personel organizasyon şemasında var mı?
        org_data = load_org_chart()
        emp_info = None
        for emp in org_data:
            if emp.get('Ad Soyad') == employee_name:
                emp_info = emp
                break
        
        if not emp_info:
            return {
                "success": False,
                "error": "Personel organizasyon şemasında bulunamadı."
            }
        
        # Rol kontrolü (hiyerarşi kuralları)
        if user_role == 'IK':
            allowed_roles = ["DIRECTOR", "MANAGER", "PERSONEL", "IK", "CEO"]
        elif user_role == 'CEO':
            allowed_roles = ["DIRECTOR"]
            if "Direktör" not in emp_info.get('Pozisyon', ''):
                return {
                    "success": False,
                    "error": "CEO sadece Direktörlere kullanıcı atayabilir."
                }
        elif user_role == 'DIRECTOR':
            allowed_roles = ["MANAGER"]
            if emp_info.get('Departman') != user_dept or "Müdür" not in emp_info.get('Pozisyon', ''):
                return {
                    "success": False,
                    "error": "Direktör sadece kendi departmanındaki Müdürlere kullanıcı atayabilir."
                }
        elif user_role == 'MANAGER':
            allowed_roles = ["PERSONEL"]
            if emp_info.get('Departman') != user_dept or "Müdür" in emp_info.get('Pozisyon', '') or "Direktör" in emp_info.get('Pozisyon', ''):
                return {
                    "success": False,
                    "error": "Müdür sadece kendi departmanındaki Çalışanlara kullanıcı atayabilir."
                }
        else:
            return {
                "success": False,
                "error": "Bu işlem için yetkiniz yok."
            }
        
        if role not in allowed_roles:
            return {
                "success": False,
                "error": f"Bu rol atanamaz. İzin verilen roller: {', '.join(allowed_roles)}"
            }
        
        # Kullanıcı oluştur
        users_db[username] = {
            "password": password,
            "name": employee_name,
            "role": role,
            "dept": emp_info.get('Departman', ''),
            "position": emp_info.get('Pozisyon', '')
        }
        
        save_users(users_db)
        refresh_users_db()
        
        return {
            "success": True,
            "message": f"Başarılı! {employee_name} için hesap açıldı.",
            "username": username
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Kullanıcı oluşturma hatası: {str(e)}"
        }

def delete_user_account(username: str, user_role: str) -> Dict[str, Any]:
    """
    Kullanıcı hesabını siler.
    
    Args:
        username: Silinecek kullanıcı adı
        user_role: İşlemi yapan kullanıcının rolü
        
    Returns:
        Dict: {
            "success": bool,
            "message": str,
            "error": Optional[str]
        }
    """
    try:
        users_db = load_users()
        
        if username not in users_db:
            return {
                "success": False,
                "error": "Kullanıcı bulunamadı."
            }
        
        # CEO hesabı silinemez
        if users_db[username].get('role') == 'CEO':
            return {
                "success": False,
                "error": "CEO hesabı silinemez."
            }
        
        # Yetki kontrolü
        if user_role not in ['CEO', 'IK']:
            return {
                "success": False,
                "error": "Bu işlem için yetkiniz yok."
            }
        
        del users_db[username]
        save_users(users_db)
        refresh_users_db()
        
        return {
            "success": True,
            "message": f"Kullanıcı {username} başarıyla silindi."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Kullanıcı silme hatası: {str(e)}"
        }

def get_manageable_users(user_role: str, user_dept: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Kullanıcının yönetebileceği kullanıcı listesini döndürür.
    
    Args:
        user_role: Kullanıcının rolü
        user_dept: Kullanıcının departmanı
        
    Returns:
        List[Dict]: Kullanıcı listesi
    """
    try:
        users_db = load_users()
        
        if user_role == 'IK':
            viewable_users = users_db
        elif user_role == 'CEO':
            viewable_users = {k: v for k, v in users_db.items() if v.get('role') == 'DIRECTOR'}
        else:
            viewable_users = {k: v for k, v in users_db.items() if v.get('dept') == user_dept}
        
        user_list = [
            {
                "username": k,
                "name": v['name'],
                "role": v['role'],
                "department": v.get('dept', '-'),
                "position": v.get('position', '-')
            }
            for k, v in viewable_users.items()
        ]
        
        return user_list
    except Exception as e:
        print(f"Kullanıcı listesi yükleme hatası: {e}")
        return []

def get_available_employees_for_user_creation(user_role: str, user_dept: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Kullanıcı oluşturulabilecek personel listesini döndürür.
    
    Args:
        user_role: İşlemi yapan kullanıcının rolü
        user_dept: İşlemi yapan kullanıcının departmanı
        
    Returns:
        List[Dict]: Personel listesi
    """
    try:
        org_data = load_org_chart()
        users_db = load_users()
        existing_names = {u['name'] for u in users_db.values()}
        
        if not org_data:
            return []
        
        df_org = pd.DataFrame(org_data)
        
        # Rol bazlı filtreleme
        if user_role == 'IK':
            filtered_staff = df_org
            allowed_roles = ["DIRECTOR", "MANAGER", "PERSONEL", "IK", "CEO"]
        elif user_role == 'CEO':
            filtered_staff = df_org[df_org['Pozisyon'].str.contains("Direktörü", na=False)]
            allowed_roles = ["DIRECTOR"]
        elif user_role == 'DIRECTOR':
            filtered_staff = df_org[
                (df_org['Departman'] == user_dept) & 
                (df_org['Pozisyon'].str.contains("Müdürü", na=False))
            ]
            allowed_roles = ["MANAGER"]
        elif user_role == 'MANAGER':
            filtered_staff = df_org[
                (df_org['Departman'] == user_dept) & 
                (~df_org['Pozisyon'].str.contains("Müdürü", na=False)) & 
                (~df_org['Pozisyon'].str.contains("Direktörü", na=False))
            ]
            allowed_roles = ["PERSONEL"]
        else:
            filtered_staff = pd.DataFrame()
            allowed_roles = []
        
        # Henüz hesabı olmayan personeller
        available_staff = []
        for _, row in filtered_staff.iterrows():
            name = row.get('Ad Soyad', '')
            if name and name not in existing_names:
                available_staff.append({
                    "name": name,
                    "department": row.get('Departman', ''),
                    "position": row.get('Pozisyon', ''),
                    "allowed_roles": allowed_roles
                })
        
        return available_staff
    except Exception as e:
        print(f"Personel listesi yükleme hatası: {e}")
        return []
