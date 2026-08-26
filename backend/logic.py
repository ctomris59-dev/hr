# logic.py (GÜNCEL TAM SÜRÜM: Tüm Fonksiyonlar Eksiksiz ve Çalışır Durumda)

import streamlit as st 
import pandas as pd
import random
from datetime import date, timedelta, datetime
import numpy as np

# Harici veri yapılarını güvenli bir şekilde içe aktar
try:
    from data.data_jobs import JOB_PROFILES
    from data.data_education import COMPETENCY_LIBRARY
    from config import COMPETENCIES_360
except ImportError:
    JOB_PROFILES = {}
    COMPETENCY_LIBRARY = {}
    # Eğer config.py'de yetkinlikler tanımlı değilse, yaygın kullanılanları varsayalım
    COMPETENCIES_360 = {'DIG': 'Dijital', 'ANA': 'Analitik', 'RES': 'Sonuç', 'DET': 'Detay', 'COM': 'İletişim', 'STR': 'Stratejik'}

# --- AYARLAR ---
CANDIDATE_PASS_GAP_THRESHOLD = 1.0
FINAL_SCORE_THRESHOLD = 70
HIGH_POTENTIAL_THRESHOLD = 85
LIE_SCORE_THRESHOLD = 3.0

COMP_MAP = {
    "DIG": "Dijital Okuryazarlık", "ANA": "Analitik Düşünme",
    "RES": "Sonuç Odaklılık", "DET": "Detaylara Özen",
    "LRN": "Sürekli Öğrenme", "ETH": "Etik ve Uyum",
    "DIS": "Öz-Disiplin", "STR": "Stratejik Bakış",
    "TEA": "Takım Çalışması", "COM": "İletişim Becerileri", "LIE": "Sosyal Beğenilirlik"
}

# --- EĞİTİM DIŞI AKSİYON ÖNERİLERİ (70:20:10 Kuralı) ---
ACTION_RECOMMENDATIONS = {
    # 🌟 LİDERLİK ve STRATEJİK YETKİNLİKLER 🌟
    "STR": [
        "Liderlik: Kriz Simülasyon Ekibine Katılım (3 Aylık Geçici Görev)", 
        "Politika Oluşturma: Yeni bir şirket içi süreç Politikası tasarlama ve Üst Yönetime sunma",
        "Rotasyon: 3-6 aylığına farklı bir departmanda (Örn: Finans/Satış) kısa süreli görevlendirme alarak büyük resmi görme"
    ],
    "DIS": [
        "Öz-Yönetim: Haftalık 'Verimlilik Taahhüdü' oluşturma ve bunu birebir koça/mentöre raporlama",
        "Koçluk: Bir Üst Yöneticiden, hedeflere ulaşma ve zaman yönetimi üzerine birebir koçluk alma"
    ],
    "ETH": [
        "Uyum: Şirket Etiği ve Uyum Politikası revizyon sürecine aktif katkıda bulunma",
        "Çözüm Odaklılık: Kritik bir etik ikilemi ele alan vaka çalışması hazırlama ve şirket içi eğitimde sunma"
    ],
    "LRN": [
        "Sürekli Öğrenme: Şirket içi yeni başlayanlar için kendi uzmanlık alanında bir eğitim modülü tasarlama (Eğitmen Rolü)",
        "Uzmanlık: Kritik bir sektör sertifikası (Örn: PMP, CFA) için çalışma grubu kurma ve liderlik etme"
    ],

    # 🌟 ANALİTİK ve OPERASYONEL YETKİNLİKLER 🌟
    "ANA": [
        "Veri Odaklılık: Bir ürün/kampanya için uçtan uca A/B Testi tasarlama ve sonuçlarını analiz etme",
        "Optimizasyon: Departmanınızdaki en kritik 3 süreç 'Borcu'nun kök nedenini bulma ve temizleme görevi"
    ],
    "RES": [
        "Proje Liderliği: Farklı departmanlardan oluşan kritik bir Çapraz Fonksiyonel Projeye liderlik etme",
        "Sorumluluk Alma: Son 6 ayda en çok hataya sebep olan operasyonel sorunun çözümünü uygulama sorumluluğu"
    ],
    "DET": [
        "Kalite Kontrol: Kritik bir süreçteki kalite kontrol adımlarını denetleme ve iyileştirme sorumluluğu",
        "Vekâlet: 1 ay boyunca İlgili Yönetici/Liderin günlük operasyonlarına ve toplantılarına katılma (Job Shadowing)"
    ],
    
    # 🌟 TEKNOLOJİK ve DİJİTAL YETKİNLİKLER 🌟
    "DIG": [
        "Dijitalleşme: Şirketteki manuel raporlama veya süreçlerin otomatikleştirilmesi görevini üstlenme (MVP Geliştirme)",
        "İş Başı: Yeni çıkan bir teknolojinin (Örn: Büyük Dil Modeli) entegrasyon fizibilitesini hazırlama"
    ],

    # 🌟 İLETİŞİM ve İŞBİRLİĞİ YETKİNLİKLERİ 🌟
    "COM": [
        "Müzakere: Hassas bir konuda kıdemli bir yöneticinin yanında gözlemci olarak müzakereye katılma",
        "Sunum: Düzenli 'Bilgi Paylaşımı/Sunum' oturumları düzenleme (Halka Açık Konuşma Pratiği)",
    ],
    "TEA": [
        "Kültürel: Yeni işe alım Oryantasyonlarında Şirket Değer Elçisi rolünü üstlenme",
        "İşbirliği: Bir gün boyunca müşterinin rolünü üstlenerek zorluklarını anlama (Job Swap)",
    ],
    
    # ⚠️ Varsayılan Durum 
    "DEFAULT": [
        "Yüksek Potansiyel (HiPo) Mentorluk Programına başvurun (Genel Gelişim).", 
        "İç Çatışma Yönetimi veya Müzakere Teknikleri üzerine aksiyonel koçluk alın (İlişkisel Gelişim)."
    ]
}


# --- 1. KPI HESAPLAMA ---
def calculate_kpi_score(employee_name):
    """
    Personelin KPI puanını 360 verilerinden (eğer varsa) veya varsayılan olarak hesaplar.
    """
    if 'db_360' not in st.session_state: return 0, 3.0
    evals = [x for x in st.session_state.db_360 if x['target'] == employee_name and x.get('perf_score') is not None]
    if not evals: return 0, 3.0
        
    total_score = sum([e['perf_score'] for e in evals])
    avg_percent = total_score / len(evals)
    scale_5 = 1.0 + (avg_percent / 100) * 4.0 
    return round(avg_percent, 1), round(scale_5, 2)

# --- 2. YETKİNLİK SKORU HESAPLAMA (360) ---
def calculate_competency_score(employee_name, competency_code):
    """Belirli bir yetkinlik kodu için 360 ortalamasını döndürür."""
    if 'db_360' not in st.session_state: return 2.5
    evaluations = [e for e in st.session_state.db_360 if e['target'] == employee_name]
    scores = []
    for e in evaluations:
        if e.get('relation') != 'Kendi (Self)' and competency_code in e['scores']:
            scores.append(e['scores'][competency_code])
    return sum(scores) / len(scores) if scores else 2.5


# --- 3. ADAY DEĞERLENDİRME MANTIĞI ---

def calculate_raw_scores(submission_data, role_key):
    """MOCK: Gerçek verinin yerine simülasyon puanları üretir."""
    profile = JOB_PROFILES.get(role_key, JOB_PROFILES.get("Genel - Ofis Personeli", {}))
    raw_scores = {}
    for comp, target in profile.items():
        raw_scores[comp] = round(max(1.0, min(5.0, target - random.uniform(0, 1.5) + random.uniform(-0.3, 0.5))), 2)
    raw_scores['LIE'] = round(random.uniform(1.0, 4.2), 1)
    return raw_scores, raw_scores['LIE']

# 🚨 HATA DÜZELTİLDİ: Bu fonksiyon eksikti (ui_recruitment.py çağırıyordu)
def evaluate_candidate(raw_scores, role_key, job_profiles, submission_data):
    """Adayın yetkinlik skorlarını hedeflenen pozisyon profiliyle karşılaştırır."""
    profile = job_profiles.get(role_key, job_profiles.get("Genel - Ofis Personeli", {}))
    total, weight, weak = 0, 0, []
    lie_score = raw_scores.get('LIE', 2.5)
    
    for comp, target in profile.items():
        if comp == 'LIE': continue
        actual = raw_scores.get(comp, 2.5)
        total += actual
        weight += 1.0
        if actual < (target - CANDIDATE_PASS_GAP_THRESHOLD): 
            weak.append(f"{COMP_MAP.get(comp, comp)} ({actual})")
    
    avg_score_5 = (total / weight) if weight > 0 else 0
    final_score_percent = round((avg_score_5 / 5.0) * 100, 1) if avg_score_5 > 0 else 0
    
    LIE_ADJUSTMENT = max(0.5, 1 - (max(0, lie_score - LIE_SCORE_THRESHOLD) * 0.35))
    overall_score = round(final_score_percent * LIE_ADJUSTMENT, 1)

    reasons = []
    if submission_data.get('manipulation_score', 0) > 50: reasons.append("⚠️ Güvenilirlik Riski (Sistem Tespiti)")
    if overall_score < FINAL_SCORE_THRESHOLD: reasons.append(f"Yetersiz Genel Puan (%{overall_score})")
    if lie_score >= LIE_SCORE_THRESHOLD: reasons.append("🚩 Dürüstlük Riski (Yüksek)")
    if weak: reasons.append(f"Zayıf Alanlar: {', '.join(weak[:2])}")
    
    is_critical_fail = (
        (overall_score < FINAL_SCORE_THRESHOLD and len(weak) > 0) or 
        (overall_score < 50) or                                   
        (lie_score >= LIE_SCORE_THRESHOLD and overall_score < FINAL_SCORE_THRESHOLD) 
    )
    
    if not reasons: return final_score_percent, overall_score, "KESİN MÜLAKAT", "success", []
    if is_critical_fail or len(reasons) > 2: return final_score_percent, overall_score, "RED", "danger", reasons
        
    return final_score_percent, overall_score, "ŞARTLI / İNCELEME", "warning", reasons

# 🚨 HATA DÜZELTİLDİ: Bu fonksiyon eksikti (ui_candidate.py çağırıyordu)
def submit_candidate_form(submission_data):
    """Aday/Çalışan test sonucunu kaydeder."""
    if 'submissions' not in st.session_state: st.session_state.submissions = []
    submission_data['type'] = submission_data.get('type', "İşe Alım Adayı")
    submission_data['date'] = datetime.now().strftime("%Y-%m-%d %H:%M")
    st.session_state.submissions.append(submission_data)
    raw_scores = submission_data.get('raw_scores', {})
    lie_score = raw_scores.get('LIE', 2.5)
    return {'type': "Kaydedildi", 'name': submission_data['name'], 'role': submission_data['role'], 
           'raw_scores': raw_scores, 'lie': lie_score, 'manipulation_score': 0, 'manipulation_flags': []}


# --- 4. EĞİTİM MOTORU ---

# 🚨 HATA DÜZELTİLDİ: Bu fonksiyon eksikti (ui_development.py ve ui_career.py çağırıyordu)
def recommend_education_plan(comp_code, current_score, role_key):
    """Belirlenen yetkinlik kodu için eğitim planı önerir."""
    if comp_code not in COMPETENCY_LIBRARY: return None
    development_threshold = 3.5 
    if current_score < development_threshold:
        comp_info = COMPETENCY_LIBRARY.get(comp_code, {})
        target_level = min(5.0, current_score + 1.0)
        return {
            "competency": comp_info.get('name', comp_code),
            "current_score": round(current_score, 1),
            "target_level": round(target_level, 1),
            "courses": comp_info.get('courses', [])[:3], 
            "books": comp_info.get('books', [])[:3],
            "resources": comp_info.get('resources', [])[:3]
        }
    return None

def simulate_training_completion(current_score, target_level):
    """Eğitim tamamlandıktan sonra puan artışını simüle eder."""
    gain = (target_level - current_score) * 0.6 + (random.random() * 0.2)
    new_score = current_score + gain
    return round(new_score, 1), round(gain, 1)


# --- 5. KPI Ağırlık Özeti (Analytics için) ---
def calculate_kpi_weight_summary():
    """Tüm şirketin KPI hedeflerinin ağırlık dağılımını (varsa) hesaplar."""
    if 'performance_goals' not in st.session_state or not st.session_state.performance_goals: return pd.DataFrame()
    df_goals = pd.DataFrame(st.session_state.performance_goals)
    if df_goals.empty: return pd.DataFrame()

    weight_summary = df_goals.groupby('title')['weight'].sum().reset_index()
    weight_summary['percentage'] = (weight_summary['weight'] / weight_summary['weight'].sum()) * 100
    return weight_summary

# --- 6. TARİHSEL TAKİP VE GELİŞİM KAYDI ---
def save_historical_9box_data(df_360_stats, period_name=None):
    """
    360/Performans değerlendirmesi tamamlandığında, o döneme ait 
    9-Box verilerini tarihsel olarak kaydeder.
    """
    if df_360_stats.empty: return 0
    if 'historical_9box_data' not in st.session_state: st.session_state['historical_9box_data'] = []
    
    if period_name is None:
        now = datetime.now()
        q = (now.month - 1) // 3 + 1
        period_name = f"{now.year}-Q{q} (Oto)"

    historical_entries = []
    for _, row in df_360_stats.iterrows():
        perf = row.get('Performans', 3.0)
        pot = row.get('Potansiyel', 3.0)
        
        entry = {
            'Personel': row['Personel'],
            'Dönem': period_name,
            'Yıl': datetime.now().year,
            'Performans': round(float(perf), 2),
            'Potansiyel': round(float(pot), 2),
        }
        
        is_duplicate = any(
            (e['Personel'] == entry['Personel'] and e['Dönem'] == entry['Dönem'])
            for e in st.session_state.historical_9box_data
        )
        
        if not is_duplicate: historical_entries.append(entry)
        
    st.session_state.historical_9box_data.extend(historical_entries)
    return len(historical_entries)

# --- 7. KARİYER YOLU PLANLAMA MANTIĞI (SKILL GAP) ---
def calculate_skill_gap(employee_name, target_role_key, job_profiles):
    """
    Seçilen çalışanın mevcut yetkinlik skorlarını, hedef pozisyonun 
    gerektirdiği skorlarla karşılaştırarak yetkinlik açığını hesaplar.
    """
    gap_analysis = []
    target_profile = job_profiles.get(target_role_key)
    if not target_profile:
        return []

    current_scores = {}
    
    # 360/Performans verisinin varlığını kontrol et
    if 'df_dept_stats' in st.session_state and not st.session_state.df_dept_stats.empty:
        df_latest_360 = pd.DataFrame(st.session_state.df_dept_stats)
        # Personel adının tam eşleştiğinden emin olmak için filtrele
        employee_row = df_latest_360[df_latest_360['Personel'] == employee_name]

        if not employee_row.empty:
            
            # Yetkinlik kodlarını config'den veya varsayılan olarak çek
            try: from config import COMPETENCIES_360 
            except ImportError: COMPETENCIES_360 = {'DIG': 'Dijital', 'ANA': 'Analitik'} 
            
            # Kritik Düzeltme: DataFrame'deki her sütunu dönerek puanları topla
            for code in COMPETENCIES_360.keys():
                mgr_col = f"{code}_Mgr"; peer_col = f"{code}_Peer"
                scores = []
                
                # Sütunun DataFrame'de var olup olmadığını kontrol et
                if mgr_col in employee_row.columns:
                    score_val = employee_row.iloc[0].get(mgr_col)
                    # Değerin geçerli olup olmadığını kontrol et
                    if pd.notna(score_val) and score_val is not None: 
                        try:
                            scores.append(float(score_val))
                        except (ValueError, TypeError):
                            pass # Geçersiz değerleri (örn: boş string) atla
                
                if peer_col in employee_row.columns:
                    score_val = employee_row.iloc[0].get(peer_col)
                    if pd.notna(score_val) and score_val is not None:
                         try:
                            scores.append(float(score_val))
                         except (ValueError, TypeError):
                             pass
                
                # Eğer geçerli skor varsa ortalama al, yoksa yetkinlik için 3.0 kullan
                current_scores[code] = sum(scores) / len(scores) if scores else 3.0
        
    # 3. Açık Hesaplaması ve Analiz
    for comp_code, target_score in target_profile.items():
        if comp_code == 'LIE': continue

        comp_name = COMP_MAP.get(comp_code, comp_code) 
        
        # Eğer 360 verisi çekilemediyse varsayılan 3.0'ı kullan
        current_score = current_scores.get(comp_code, 3.0) 
        
        gap = round(target_score - current_score, 2)
        
        gap_analysis.append({
            'Yetkinlik': comp_name,
            'Kod': comp_code,
            'Mevcut Skor': round(current_score, 2),
            'Hedef Skor': round(target_score, 2),
            'Açık (Gap)': gap,
            'Gereken Aksiyon': "Çok Kritik" if gap >= 1.5 else ("Kritik" if gap >= 0.8 else "Geliştirilebilir")
        })

    return sorted(gap_analysis, key=lambda x: x['Açık (Gap)'], reverse=True)


# --- 8. YENİ KARİYER YOLU GÖRSELLEŞTİRME MANTIĞI (V2) ---

def analyze_skill_gaps_v2(employee_name, target_role_key, job_profiles):
    """
    Yetkinlik Açığı verisini, Radar Grafiği ve Kritik Gelişim Odakları için hazırlar.
    """
    
    raw_gap_data = calculate_skill_gap(employee_name, target_role_key, job_profiles)
    
    if not raw_gap_data:
        return None, None

    df_gap = pd.DataFrame(raw_gap_data)
    
    # 1. Radar Grafiği İçin Veri Hazırlama
    df_radar = df_gap[['Yetkinlik', 'Mevcut Skor', 'Hedef Skor']].melt(
        id_vars='Yetkinlik',
        var_name='Durum',
        value_name='Skor'
    )
    
    # 2. Kritik Gelişim Alanlarını Belirleme (Açığı 0'dan büyük olan ilk 3)
    df_critical = df_gap[df_gap['Açık (Gap)'] > 0].sort_values(by='Açık (Gap)', ascending=False).head(3)
    
    return df_radar, df_critical