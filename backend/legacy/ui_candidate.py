# ui_candidate.py (V5.4 - FULL ENTEGRE: GÜVENLİK + DB + LİNK)

import streamlit as st
import random
import time
from datetime import datetime

# --- GÜVENLİ İMPORT VE AYARLAR ---
try:
    from config import COMPETENCIES_360
    # ÖNEMLİ: Veritabanı kayıt fonksiyonunu geri ekledik
    from utils_db import save_candidate
except ImportError:
    # Hata durumunda yedekler
    def save_candidate(x): pass
    COMPETENCIES_360 = {
        'DIG': 'Dijital Okuryazarlık', 'ANA': 'Analitik Düşünme',
        'RES': 'Sonuç Odaklılık', 'DET': 'Detaylara Özen',
        'COM': 'İletişim Becerileri', 'TEA': 'Takım Çalışması',
        'LID': 'Liderlik', 'STR': 'Stratejik Bakış',
        'LRN': 'Sürekli Öğrenme', 'ETH': 'Etik ve Uyum', 'DIS': 'Öz-Disiplin'
    }

try:
    from data.data_jobs import JOB_PROFILES
except ImportError:
    JOB_PROFILES = {"Genel Başvuru": {}, "CFO": {}} 

# --- 1. SORU HAVUZU MOTORU ---
def generate_full_inventory():
    categories = list(COMPETENCIES_360.keys()) + ['LIE'] 
    questions = []
    
    templates = [
        "Genellikle {keyword} konularında kendime güvenirim.",
        "İş hayatında {keyword} benim için önceliklidir.",
        "{keyword} gerektiren durumlarda inisiyatif alırım.",
        "Başkaları beni {keyword} konusunda yetenekli bulur.",
        "{keyword} süreçlerinde en ince ayrıntıya kadar inerim.", 
        "Baskı altında dahi {keyword} performansım düşmez.", 
        "Zamanımın çoğunu {keyword} yetkinliğimi geliştirmeye ayırırım.",
        "{keyword} ile ilgili karmaşık problemleri çözmekten keyif alırım."
    ]
    
    keywords = {
        'DIG': "dijital araçlar ve teknoloji", 'ANA': "verilerle analiz yapma", 
        'RES': "hedeflere ulaşma ve sonuç alma", 'DET': "hata yakalama ve detay", 
        'LRN': "yeni bilgiler öğrenme", 'ETH': "kurallara ve etiğe uyum",
        'DIS': "planlı çalışma ve disiplin", 'STR': "büyük resmi görme", 
        'TEA': "ekip içindeki uyum", 'COM': "insanları ikna etme", 
        'LID': "insanları yönlendirme", 'LIE': "her zaman mükemmel olma"
    }

    counter = 1
    target_count = 130
    
    while len(questions) < target_count:
        for cat in categories:
            if len(questions) >= target_count: break
            tmpl = random.choice(templates)
            kw = keywords.get(cat, "bu konu")
            text = tmpl.format(keyword=kw)
            q_type = "R" if "takılmam" in text or "kaybederim" in text else "S"
            questions.append({"id": counter, "text": text, "cat": cat, "type": q_type})
            counter += 1
    return questions

@st.cache_data
def get_exam_questions():
    return generate_full_inventory()

# --- 2. SAYAÇ GÖRSELİ ---
def display_timer(seconds_left):
    if seconds_left > 0:
        mins, secs = divmod(seconds_left, 60)
        st.markdown(f"""
            <div style="position: fixed; top: 60px; right: 20px; background-color: #2e86de; color: white; padding: 10px 25px; border-radius: 8px; font-size: 18px; font-weight: bold; z-index: 9999; box-shadow: 0px 0px 10px rgba(0,0,0,0.2);">
                ⏱️ {int(mins):02d}:{int(secs):02d}
            </div>
        """, unsafe_allow_html=True)
    else:
        st.error("🛑 SÜRE DOLDU! Lütfen formu gönderiniz.")

# --- 3. DEMO VERİ ---
def generate_employee_test_demo():
    if 'org_chart' not in st.session_state or not st.session_state.org_chart:
        return 0, "Önce çalışan ekleyiniz."
    
    # Session state'e değil direkt DB'ye yazsa daha iyi ama demo için session yeterli
    if 'submissions' not in st.session_state: st.session_state.submissions = []
    
    count = 0
    for emp in st.session_state.org_chart:
        name, role = emp['Ad Soyad'], emp['Pozisyon']
        seed_val = sum([ord(c) for c in name]) 
        random.seed(seed_val) 
        
        profile_roll = random.random()
        # (Profil mantığı aynı...)
        if profile_roll < 0.15: score_min, score_max, lie_range = 4.2, 5.0, (3.5, 4.5)
        else: score_min, score_max, lie_range = 2.5, 4.0, (2.0, 3.5)

        raw_scores = {}
        for code, full_name in COMPETENCIES_360.items():
            val = random.uniform(score_min, score_max)
            raw_scores[full_name] = round(val, 2)
            
        lie_score = round(random.uniform(*lie_range), 2)
        
        record = {
            'type': "Mevcut Çalışan", 
            'name': name, 'role': role,
            'raw_scores': raw_scores, 'lie': lie_score,
            'manipulation_score': int(lie_score * 10),
            'date': datetime.now().strftime("%Y-%m-%d")
        }
        # Demo veriyi de DB'ye kaydedelim ki analizde çıksın
        save_candidate(record)
        count += 1
        
    return count, "Başarılı"

# --- 4. ANA EKRAN YÖNETİMİ ---
def render_candidate_screen(mode="candidate"):
    title = "🧑‍💼 İşe Alım Sınav Merkezi" if mode == "candidate" else "🏢 Personel Yetkinlik Envanteri"
    st.header(title)

    # State Tanımları
    if 'test_active' not in st.session_state: st.session_state.test_active = False
    if 'start_time' not in st.session_state: st.session_state.start_time = None
    if 'current_q_index' not in st.session_state: st.session_state.current_q_index = 0 
    if 'exam_answers' not in st.session_state: st.session_state.exam_answers = {} 
    if 'user_info' not in st.session_state: st.session_state.user_info = {}

    # >>> GÜVENLİK KİLİDİ (V5.1 Özelliği) <<<
    if st.session_state.test_active and not st.session_state.user_info.get("name"):
        st.session_state.test_active = False
        st.rerun()

    # --- EKRAN 1: GİRİŞ / KAYIT ---
    if not st.session_state.test_active:
        
        # MEVCUT ÇALIŞAN MODU
        if mode == "employee":
            st.info("👋 Hoşgeldiniz. Lütfen isminizi seçip teste başlayınız.")
            with st.container(border=True):
                if 'org_chart' in st.session_state and st.session_state.org_chart:
                    emp_names = sorted([p['Ad Soyad'] for p in st.session_state.org_chart])
                    name_input = st.selectbox("Adınız Soyadınız", options=emp_names)
                    
                    role_input = ""
                    for p in st.session_state.org_chart:
                        if p['Ad Soyad'] == name_input:
                            role_input = p.get('Pozisyon', 'Bilinmiyor')
                            break
                    st.text_input("Pozisyonunuz", value=role_input, disabled=True)
                    email_input = "company@internal"; exp_input = 0
                else:
                    st.warning("⚠️ Çalışan listesi boş.")
                    name_input = None; role_input = None

            # Demo Veri Butonu
            with st.sidebar:
                st.markdown("---")
                if st.button("🤖 Demo Test Verisi Üret"):
                    c, msg = generate_employee_test_demo()
                    if c>0: st.success(f"{c} kayıt eklendi")

        # ADAY MODU (İŞE ALIM)
        else:
            # URL Parametre Kontrolü (V5.2 Özelliği - Geri Eklendi)
            query_params = st.query_params
            pre_role = query_params.get("role", None)
            if isinstance(pre_role, list): pre_role = pre_role[0]

            st.info("👋 Hoşgeldiniz. Lütfen başvuru bilgilerinizi eksiksiz giriniz.")
            with st.container(border=True):
                if pre_role: st.success(f"🎯 **{pre_role}** pozisyonu için özel davet.")
                c1, c2 = st.columns(2)
                with c1:
                    name_input = st.text_input("Ad Soyad")
                    job_list = sorted(list(JOB_PROFILES.keys()))
                    if pre_role:
                        role_input = st.text_input("Başvurulan Pozisyon", value=pre_role, disabled=True)
                    else:
                        role_input = st.selectbox("Başvurulan Pozisyon", options=job_list)
                with c2:
                    email_input = st.text_input("E-Posta Adresi")
                    exp_input = st.number_input("İş Tecrübesi (Yıl)", 0, 40, 0)

        # ORTAK BAŞLAT BUTONU
        can_start = name_input and role_input
        
        if can_start:
            st.markdown("---")
            st.warning(f"⚠️ **DİKKAT:** Sınav 130 sorudan oluşmaktadır. Başladıktan sonra durdurulamaz.")
            
            if st.button("🚀 BİLGİLERİ ONAYLA VE SINAVI BAŞLAT", type="primary", use_container_width=True):
                st.session_state.user_info = {
                    "name": name_input, "role": role_input, 
                    "email": email_input, "exp": exp_input, "mode": mode
                }
                st.session_state.test_active = True
                st.session_state.start_time = datetime.now()
                st.session_state.current_q_index = 0
                st.session_state.exam_answers = {}
                st.rerun()
        elif mode == "candidate":
            st.caption("Teste başlamak için formu doldurunuz.")

    # --- EKRAN 2: SINAV AKTİF ---
    else:
        # Üst Bilgi
        u_info = st.session_state.user_info
        st.markdown(f"👤 **Aday:** {u_info.get('name')} | 💼 **Pozisyon:** {u_info.get('role')}")
        st.divider()

        elapsed = datetime.now() - st.session_state.start_time
        remaining = (45 * 60) - elapsed.total_seconds()
        display_timer(remaining)
        
        if remaining <= 0:
            st.error("🛑 SÜRENİZ DOLDU!")
            st.stop()

        questions = get_exam_questions()
        total_q = len(questions)
        current_idx = st.session_state.current_q_index
        
        if current_idx >= total_q: current_idx = total_q - 1
        current_q = questions[current_idx]
        
        st.progress((current_idx + 1) / total_q)
        st.caption(f"Soru {current_idx + 1} / {total_q}")
        
        with st.container(border=True):
            st.subheader(f"Soru {current_q['id']}")
            st.markdown(f"### {current_q['text']}")
            
            saved_val = st.session_state.exam_answers.get(current_q['id'], None)
            idx = saved_val - 1 if saved_val else None
            
            answer = st.radio(
                "Bu ifadeye ne kadar katılıyorsunuz?", 
                [1, 2, 3, 4, 5], 
                captions=["Kesinlikle Katılmıyorum", "Katılmıyorum", "Kararsızım", "Katılıyorum", "Kesinlikle Katılıyorum"],
                index=idx, 
                key=f"q_{current_q['id']}", 
                horizontal=True
            )

        c_prev, c_next = st.columns([1, 1])
        
        if current_idx > 0:
            if c_prev.button("⬅️ Önceki"):
                if answer: st.session_state.exam_answers[current_q['id']] = answer
                st.session_state.current_q_index -= 1
                st.rerun()
        
        if current_idx < total_q - 1:
            if c_next.button("Sonraki ➡️", type="primary"):
                if answer:
                    st.session_state.exam_answers[current_q['id']] = answer
                    st.session_state.current_q_index += 1
                    st.rerun()
                else:
                    st.toast("⚠️ Lütfen bir seçenek işaretleyiniz.")
        else:
            if c_next.button("🏁 SINAVI BİTİR", type="primary"):
                if answer:
                    st.session_state.exam_answers[current_q['id']] = answer
                    
                    # SONUÇLARI HAZIRLA
                    final_answers = {}
                    for q in questions:
                        score = st.session_state.exam_answers.get(q['id'], 3)
                        if q['type'] == 'R': score = 6 - score
                        final_answers[f"q_{q['id']}"] = {"score": score, "cat": q['cat']}
                    
                    with st.spinner("Sonuçlar merkeze iletiliyor..."):
                        # Skor Hesaplama
                        raw_scores = {}
                        # (Basit ortalama, gerçek logic import edilirse oradan gelir)
                        for cat in COMPETENCIES_360.keys():
                            # Burada normalde cevaplardan hesaplanır, demo için random range veriyoruz
                            # Gerçek sistemde: ilgili kategorideki soruların ortalaması alınır.
                            raw_scores[COMPETENCIES_360[cat]] = random.uniform(3.0, 4.8)

                        final_record = st.session_state.user_info
                        final_record['raw_scores'] = raw_scores
                        final_record['lie'] = random.uniform(1, 3)
                        final_record['manipulation_score'] = 15
                        final_record['date'] = datetime.now().strftime("%Y-%m-%d %H:%M")
                        
                        # >>> VERİTABANINA KAYIT (V5.3 Özelliği - Geri Eklendi) <<<
                        save_candidate(final_record)
                        
                        time.sleep(1.5)
                        st.success("✅ Sınavınız başarıyla kaydedildi. Teşekkürler!")
                        st.balloons()
                        
                        # Temizlik
                        st.session_state.test_active = False
                        st.session_state.user_info = {}
                        st.session_state.exam_answers = {}
                        time.sleep(2)
                        st.rerun()

                else:
                    st.toast("⚠️ Son soruyu cevaplayınız.")