# config.py

import os

# --- 1. GENEL AYARLAR ---
TEST_DURATION_MINUTES = 45
TEST_DURATION_SECONDS = TEST_DURATION_MINUTES * 60

# --- 2. DOSYA YOLLARI (VERİTABANI) ---
# Tüm modüllerin kullandığı ortak dosya yolları
DB_BASE_DIR = os.getenv("DB_BASE_DIR", "database")
DB_FILE = os.path.join(DB_BASE_DIR, "future_database.json")             # İşe Alım ve Aday Test Sonuçları
# 360 Derece ve Performans Verileri
_default_360_file = os.path.join(DB_BASE_DIR, "future_360_db.json")
_legacy_360_file = os.path.join(DB_BASE_DIR, "db_360_data.json")
DB_360_FILE = _default_360_file if os.path.exists(_default_360_file) else (
    _legacy_360_file if os.path.exists(_legacy_360_file) else _default_360_file
)
DB_ORG_FILE = os.path.join(DB_BASE_DIR, "future_org_chart.json")        # Organizasyon Şeması ve Personel Bilgileri
DB_TRAINING_FILE = os.path.join(DB_BASE_DIR, "future_training_db.json") # Eğitim ve Gelişim Atamaları (YENİ)
DB_LEAVE_FILE = os.path.join(DB_BASE_DIR, "future_leave_db.json")       # İzin Talep Veritabanı (YENİ EKLENDİ)
DB_NOTIFICATIONS_FILE = os.path.join(DB_BASE_DIR, "future_notifications.json") # Bildirim Veritabanı (YENİ EKLENDİ)
DB_PULSE_FILE = os.path.join(DB_BASE_DIR, "future_pulse_db.json")       # Takım Nabzı (Pulse) Veritabanı (YENİ EKLENDİ)
DB_HOLIDAYS_FILE = os.path.join(DB_BASE_DIR, "future_holidays_db.json") # Resmi Tatiller Veritabanı (YENİ EKLENDİ)
DB_CAREER_FILE = os.path.join(DB_BASE_DIR, "future_career_db.json")     # Kariyer Yolu Veritabanı (YENİ EKLENDİ)
DB_SUCCESSION_FILE = os.path.join(DB_BASE_DIR, "future_succession_db.json") # Yedekleme Planı Veritabanı (YENİ EKLENDİ)
DB_TALENT_ASSESSMENT_FILE = os.path.join(DB_BASE_DIR, "future_talent_assessment_db.json") # Yetenek Değerlendirme Geçmişi (YENİ EKLENDİ)
DB_BUDGET_FILE = os.path.join(DB_BASE_DIR, "future_budget_db.json")     # Bütçe Yönetimi - Maaş Artış Talepleri (YENİ EKLENDİ)
DB_ROLES_FILE = os.path.join(DB_BASE_DIR, "future_roles_db.json")       # Rol ve Yetki Yönetimi (YENİ EKLENDİ)
USERS_FILE = os.path.join(DB_BASE_DIR, "users.json")                    # Kullanıcı Giriş Bilgileri
DB_AUDIT_FILE = os.path.join(DB_BASE_DIR, "audit_log.json")            # Audit Log (YENİ EKLENDİ)
DB_WORKFLOW_DEFINITIONS_FILE = os.path.join(DB_BASE_DIR, "workflow_definitions.json")  # Workflow Definitions (YENİ EKLENDİ)
DB_WORKFLOW_INSTANCES_FILE = os.path.join(DB_BASE_DIR, "workflow_instances.json")      # Workflow Instances (YENİ EKLENDİ)
DB_TENANTS_FILE = os.path.join(DB_BASE_DIR, "tenants.json")            # Tenants (YENİ EKLENDİ)
DB_EMPLOYEE_SCORES_FILE = os.path.join(DB_BASE_DIR, "future_employee_scores.json")     # Demo SSOT - Employee Scores

# --- 3. YETKİNLİK İSİMLERİ (STANDARTLAŞTIRILMIŞ) ---
# DİKKAT: Buradaki isimler data_jobs.py içindeki anahtarlarla BİREBİR aynı yapıldı.
# Böylece veritabanı ile grafikler eşleşebilecek.
CAT_NAMES = {
    'DIG': 'Dijital Okuryazarlık',   # Eski: Dijital Yetkinlik
    'ANA': 'Analitik Düşünme',
    'RES': 'Sonuç Odaklılık',
    'DET': 'Detaylara Özen',         # Eski: Dikkat & Detay
    'LRN': 'Sürekli Öğrenme',        # Eski: Öğrenme Çevikliği
    'ETH': 'Etik ve Uyum',           # Eski: İş Etiği
    'DIS': 'Öz-Disiplin',
    'STR': 'Stratejik Bakış',        # Eski: Dayanıklılık
    'TEA': 'Takım Çalışması',
    'COM': 'İletişim Becerileri',    # Eski: İletişim
    'LID': 'Liderlik',               # Liderlik (Kariyer yolu için)
    'LIE': 'Güvenilirlik'            # Test geçerlilik ölçeği (Grafikte çıkmaz)
}

# 360 Derece İçin (LIE hariç - Sadece Yetkinlikler)
# Bu liste 360 değerlendirme, radar grafikleri ve yetenek matrisinde kullanılır.
COMPETENCIES_360 = {k:v for k,v in CAT_NAMES.items() if k != 'LIE'}

# --- 4. DEPARTMAN LİSTESİ ---
# Admin panelinde ve filtrelemelerde kullanılan standart liste
DEPARTMENTS = ["İnsan Kaynakları", "Bilgi Teknolojileri", "Finans", "Satış", "Operasyon", "Yönetim"]

# --- 5. SJT SENARYOLARI (Vaka Analizi - İşe Alım) ---
SJT_SCENARIOS = {
    "HEALTH": {"question": "VAKA: Nöbet bitti, acil hasta geldi. Şef yok. Ne yaparsınız?", "options": ["A) Çıkarım.", "B) Sorarım.", "C) Hemen başlarım."], "best": "C", "target_cat": "TEA"},
    "CONSTRUCTION": {"question": "VAKA: Proje gecikti, hava riskli. Ne yaparsınız?", "options": ["A) Devam.", "B) Raporlarım.", "C) Durdururum."], "best": "C", "target_cat": "DET"},
    "SALES": {"question": "VAKA: Hedef için tek satış lazım, ürün uymuyor. Ne yaparsınız?", "options": ["A) Satarım.", "B) Risk müşteride.", "C) Satmam."], "best": "C", "target_cat": "ETH"},
    "GENERAL": {"question": "VAKA: Arkadaşınız kaytarıyor. Ne yaparsınız?", "options": ["A) Boşveririm.", "B) Şikayet.", "C) Konuşurum."], "best": "C", "target_cat": "COM"},
    "PURCHASING": {"question": "VAKA: Stok bitti, tedarikçi faturasız teklif etti. Ne yaparsınız?", "options": ["A) Kabul.", "B) Müdüre sorarım.", "C) Red."], "best": "C", "target_cat": "ETH"},
    "IT": {"question": "VAKA: Cuma akşamı kritik hata. Ne yaparsınız?", "options": ["A) Pazartesi.", "B) Mail.", "C) Müdahale."], "best": "C", "target_cat": "RES"}
}

def get_sjt_code(role_name):
    """Pozisyon ismine göre uygun vaka sorusunu seçer."""
    role_map = {
        "Sağlık": "HEALTH", "İnşaat": "CONSTRUCTION", "Satış": "SALES", 
        "Satınalma": "PURCHASING", "IT": "IT", "Bilgi Teknolojileri": "IT"
    }
    for k, v in role_map.items():
        if k in role_name: return v
    return "GENERAL"