# ui_development.py (V13.1 - BİLDİRİM SİSTEMİYLE ENTEGRE)

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta

# --- IMPORTLAR ---
try:
    from config import COMPETENCIES_360
    from utils_db import load_org_chart, load_360_data
    from auth import get_allowed_data
    # get_training_data ve assign_training fonksiyonlarını çağırıyoruz.
    # assign_training fonksiyonu artık içinde BİLDİRİM GÖNDERME yeteneğine sahip.
    from ui_training import assign_training, get_training_data 
    from data.data_education import get_tiered_recommendation 
except ImportError:
    st.error("Gerekli modüller eksik.")
    def get_allowed_data(): return []
    def load_360_data(): return []
    def assign_training(a,b,c,d,e): pass
    def get_training_data(): return pd.DataFrame()
    def get_tiered_recommendation(a,b): return {}
    COMPETENCIES_360 = {}

NAME_TO_CODE = {v: k for k, v in COMPETENCIES_360.items()}

def render_development_dashboard():
    st.header("⏳ Kişisel Gelişim Planı (Aksiyon Merkezi)")
    st.markdown("Personelin yetkinlik açıklarına göre **Kitap ve Kurs atamalarını** süre belirterek yapabilirsiniz.")

    # 1. PERSONEL SEÇİMİ
    if 'current_user' not in st.session_state:
        st.warning("Giriş yapınız.")
        return
    
    current_user = st.session_state.current_user
    allowed_data = get_allowed_data()
    
    if not allowed_data:
        st.warning("Veri bulunamadı.")
        return
        
    df_org = pd.DataFrame(allowed_data)
    staff_list = sorted(df_org['Ad Soyad'].unique().tolist())
    
    col_sel, col_info = st.columns([1, 3])
    with col_sel:
        selected_person = st.selectbox("Personel Seçiniz", staff_list)

    # --- KRİTİK ADIM: MEVCUT ATAMALARI ÇEK ---
    # Bu personelin halihazırda üzerine atanmış (Bitmiş veya Devam Eden) görevlerini buluyoruz.
    all_tasks = get_training_data()
    assigned_titles = []
    if not all_tasks.empty:
        # Sadece bu personelin görevlerinin isimlerini listeye al
        user_tasks = all_tasks[all_tasks['Personel'] == selected_person]
        assigned_titles = user_tasks['Eğitim Adı'].tolist()

    # 2. PERSONEL VERİSİ
    raw_360 = load_360_data()
    df_360 = pd.DataFrame(raw_360) if raw_360 else pd.DataFrame()
    
    person_scores = {}
    if not df_360.empty:
        p_data = df_360[df_360['Personel'] == selected_person]
        if not p_data.empty:
            row = p_data.iloc[0]
            for code, name in COMPETENCIES_360.items():
                val = row.get(f"{code}_Mgr") or row.get(f"{code}_Mgr2") or 0
                person_scores[name] = float(val)

    if not person_scores:
        st.info("Bu personel için henüz yetkinlik değerlendirmesi yapılmamış.")
        return

    # 3. KARTLAR VE POP-UP ATAMA
    st.divider()
    sorted_scores = sorted(person_scores.items(), key=lambda x: x[1])

    for comp_name, score in sorted_scores:
        comp_code = NAME_TO_CODE.get(comp_name, "DEFAULT")
        rec = get_tiered_recommendation(comp_code, score)
        
        level_name = rec.get('level_name', 'Level 1')
        color = rec.get('color', 'blue')
        
        status_text = "🔴 Gelişim Şart" if color == "red" else ("🟠 Geliştirilmeli" if color == "orange" else "🟢 İyi Durumda")

        with st.expander(f"**{comp_name}** | Puan: {score:.1f} | {status_text}", expanded=(score < 3.5)):
            st.markdown(f"**Hedef:** {rec.get('title')} ({level_name})")
            st.caption(f"Analiz: {rec.get('desc')}")
            st.markdown("---")
            
            c_book, c_course = st.columns(2)
            
            # --- KİTAP ATAMA ---
            with c_book:
                st.markdown("#### 📖 Kitap Önerileri")
                
                # FİLTRELEME: Zaten atanmış kitapları listeden çıkar
                available_books = [b for b in rec.get('books', []) if f"Kitap Okuma: {b}" not in assigned_titles]
                
                if not available_books:
                    if rec.get('books', []):
                        st.success("✅ Tüm kitaplar atandı.") # Hepsi verilmişse
                    else:
                        st.caption("Bu seviye için kitap önerisi yok.")
                
                for i, book in enumerate(available_books):
                    col_txt, col_btn = st.columns([3, 1])
                    col_txt.write(f"• {book}")
                    
                    with col_btn.popover("Ata ➕", help="Tarih seçerek ata"):
                        st.markdown(f"**Kitap:** {book}")
                        
                        due_date_book = st.date_input(
                            "Son Tarih", 
                            datetime.now() + timedelta(days=21), 
                            key=f"d_book_{comp_code}_{i}"
                        )
                        
                        if st.button("Onayla ve Ata", key=f"cnfm_book_{comp_code}_{i}"):
                            assign_training(
                                employee=selected_person,
                                assigner=current_user['name'],
                                competency=comp_name,
                                title=f"Kitap Okuma: {book}",
                                due_date=due_date_book
                            )
                            # Not: assign_training içinde bildirim gönderiliyor
                            st.toast(f"✅ Başarılı! '{book}' listeden kaldırıldı ve görevlere eklendi.")
                            # Sayfayı yenile ki listeden silinsin
                            st.rerun()

            # --- KURS ATAMA ---
            with c_course:
                st.markdown("#### 🎓 Kurs Önerileri")
                
                # FİLTRELEME: Zaten atanmış kursları listeden çıkar
                available_courses = [c for c in rec.get('courses', []) if c not in assigned_titles]
                
                if not available_courses:
                    if rec.get('courses', []):
                        st.success("✅ Tüm kurslar atandı.")
                    else:
                        st.caption("Bu seviye için kurs önerisi yok.")

                for i, course in enumerate(available_courses):
                    col_txt, col_btn = st.columns([3, 1])
                    col_txt.write(f"• {course}")
                    
                    with col_btn.popover("Ata ➕", help="Tarih seçerek ata"):
                        st.markdown(f"**Kurs:** {course}")
                        
                        due_date_course = st.date_input(
                            "Son Tarih", 
                            datetime.now() + timedelta(days=30), 
                            key=f"d_course_{comp_code}_{i}"
                        )
                        
                        if st.button("Onayla ve Ata", key=f"cnfm_course_{comp_code}_{i}"):
                            assign_training(
                                employee=selected_person,
                                assigner=current_user['name'],
                                competency=comp_name,
                                title=course,
                                due_date=due_date_course
                            )
                            # Not: assign_training içinde bildirim gönderiliyor
                            st.toast(f"✅ Başarılı! '{course}' listeden kaldırıldı ve görevlere eklendi.")
                            st.rerun()