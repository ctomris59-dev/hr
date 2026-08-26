import streamlit as st
import pandas as pd
from datetime import datetime, timedelta

# --- GÜVENLİ IMPORT ---
try:
    from config import COMPETENCIES_360
    from utils_db import load_org_chart, load_360_data, save_data
    from auth import get_allowed_data 
except ImportError:
    st.error("Modül hatası.")
    def get_allowed_data(): return []
    def load_360_data(): return []
    def save_data(x): pass
    COMPETENCIES_360 = {}

# --- VERİTABANI YÖNETİMİ (Session State Simülasyonu) ---
if 'db_training_assignments' not in st.session_state:
    st.session_state.db_training_assignments = []

def get_training_data():
    return pd.DataFrame(st.session_state.db_training_assignments)

def assign_training(employee, assigner, competency, title, due_date, status="Atandı"):
    new_record = {
        "id": len(st.session_state.db_training_assignments) + 1,
        "Personel": employee,
        "Atayan": assigner,
        "Yetkinlik": competency,
        "Eğitim Adı": title,
        "Son Tarih": due_date.strftime("%Y-%m-%d"),
        "Durum": status,
        "Personel Notu": "", 
        "Atama Tarihi": datetime.now().strftime("%Y-%m-%d")
    }
    st.session_state.db_training_assignments.append(new_record)

def update_training_status(record_id, new_status, note=""):
    for rec in st.session_state.db_training_assignments:
        if rec['id'] == record_id:
            rec['Durum'] = new_status
            if note:
                rec['Personel Notu'] = note
            break

# --- GÖRÜNÜM 1: YÖNETİCİ EKRANI (ATAMA YAPAR) ---
def render_manager_view(current_user, df_org):
    st.markdown("### 👨‍💼 Yönetici Paneli: Eğitim Atama")
    
    col_sel, col_stat = st.columns([1, 2])
    with col_sel:
        # Sadece kendi ekibini gör
        staff_list = sorted(df_org['Ad Soyad'].unique().tolist())
        # Kendisini listeden çıkar (Genelde asta atanır)
        if current_user['name'] in staff_list: staff_list.remove(current_user['name'])
        
        if not staff_list:
            st.warning("Ekibinizde personel bulunamadı.")
            return

        selected_person = st.selectbox("Personel Seçiniz:", staff_list)

    # Seçilen personelin zayıf yönünü bul
    raw_360 = load_360_data()
    df_360 = pd.DataFrame(raw_360) if raw_360 else pd.DataFrame()
    person_scores = {}
    
    if not df_360.empty and 'Personel' in df_360.columns:
        p_data = df_360[df_360['Personel'] == selected_person]
        if not p_data.empty:
            row = p_data.iloc[0]
            for k, v in COMPETENCIES_360.items():
                val = row.get(f"{k}_Mgr") or row.get(f"{k}_Mgr2") or row.get(f"{k}_Peer") or 0
                person_scores[v] = float(val)

    with col_stat:
        if person_scores:
            weakest_comp = min(person_scores, key=person_scores.get)
            weakest_score = person_scores[weakest_comp]
            st.info(f"💡 **İpucu:** {selected_person} için en düşük alan **'{weakest_comp}'** ({weakest_score:.1f}).")
            default_comp = weakest_comp
        else:
            st.warning("Henüz yetkinlik verisi yok.")
            default_comp = list(COMPETENCIES_360.values())[0]

    # ATAMA FORMU
    with st.expander("➕ Yeni Görev / Eğitim Ata", expanded=True):
        with st.form("assign_form"):
            c1, c2 = st.columns(2)
            target_comp = c1.selectbox("Gelişim Alanı", list(COMPETENCIES_360.values()), index=list(COMPETENCIES_360.values()).index(default_comp) if person_scores else 0)
            title = c2.text_input("Eğitim Başlığı", placeholder="Örn: Sunum Teknikleri Eğitimi")
            c3, c4 = st.columns(2)
            due_date = c3.date_input("Son Tarih", datetime.now() + timedelta(days=30))
            submitted = st.form_submit_button("✅ Görevi Gönder")
            
            if submitted and title:
                assign_training(selected_person, current_user['name'], target_comp, title, due_date)
                st.success(f"Görev atandı! {selected_person} sisteme girdiğinde bunu görecek.")
                st.rerun()

    # TAKİP LİSTESİ
    st.divider()
    st.subheader(f"📋 {selected_person} - İlerleme Durumu")
    df_train = get_training_data()
    if not df_train.empty:
        tasks = df_train[df_train['Personel'] == selected_person]
        if not tasks.empty:
            for _, task in tasks.iterrows():
                with st.container(border=True):
                    c_info, c_status, c_note = st.columns([2, 1, 2])
                    c_info.markdown(f"**{task['Eğitim Adı']}** ({task['Yetkinlik']})")
                    c_info.caption(f"Son Tarih: {task['Son Tarih']}")
                    
                    status = task['Durum']
                    if status == "Tamamlandı": c_status.success(f"✅ {status}")
                    elif status == "Devam Ediyor": c_status.warning(f"⏳ {status}")
                    else: c_status.error(f"📍 {status}")
                    
                    if task['Personel Notu']:
                        c_note.info(f"💬 **Personel Notu:** {task['Personel Notu']}")
                    else:
                        c_note.caption("Henüz geri bildirim yok.")
        else:
            st.info("Atanmış görev yok.")

# --- GÖRÜNÜM 2: PERSONEL EKRANI (GÖREVLERİ YAPAR) ---
def render_employee_view(current_user):
    st.markdown(f"### 🎒 {current_user['name']} - Gelişim Yolculuğum")
    
    df_train = get_training_data()
    my_tasks = df_train[df_train['Personel'] == current_user['name']] if not df_train.empty else pd.DataFrame()
    
    if my_tasks.empty:
        st.balloons()
        st.success("Harika! Şu an tamamlamanız gereken bekleyen bir eğitiminiz yok.")
        return

    # Özet Kartlar
    pending = len(my_tasks[my_tasks['Durum'] != 'Tamamlandı'])
    c1, c2 = st.columns(2)
    c1.metric("Bekleyen Eğitimler", pending)
    
    st.divider()
    st.markdown("### 📝 Yapılacaklar Listesi")

    for idx, task in my_tasks.iterrows():
        with st.container(border=True):
            col1, col2, col3 = st.columns([3, 2, 2])
            
            col1.markdown(f"**{task['Eğitim Adı']}**")
            col1.caption(f"Atayan: {task['Atayan']} | Hedef: {task['Yetkinlik']}")
            
            status = task['Durum']
            col2.caption("Durum")
            
            # --- PERSONEL AKSİYON ALANI ---
            if status == "Atandı":
                col2.error("Başlanmadı")
                if col3.button("Başla ▶️", key=f"emp_start_{task['id']}"):
                    update_training_status(task['id'], "Devam Ediyor")
                    st.rerun()
                    
            elif status == "Devam Ediyor":
                col2.warning("Sürüyor...")
                with col3:
                    with st.popover("Bitir ✅"):
                        note = st.text_area("Tamamlanma Notu (Opsiyonel)", placeholder="Örn: Sertifikayı aldım.")
                        if st.button("Kaydet ve Bitir", key=f"emp_finish_{task['id']}"):
                            update_training_status(task['id'], "Tamamlandı", note)
                            st.rerun()
                            
            elif status == "Tamamlandı":
                col2.success("Tamamlandı")
                col3.write("🎉 Tebrikler!")

# --- ANA RENDER ---
def render_training_page():
    st.header("📚 Eğitim ve Gelişim Merkezi")

    if 'current_user' not in st.session_state:
        st.warning("Giriş yapmalısınız.")
        return

    user = st.session_state.current_user
    allowed_data = get_allowed_data()
    
    # ROL KONTROLÜ
    is_manager = user['role'] in ['MANAGER', 'DIRECTOR', 'CEO', 'IK']
    
    if is_manager:
        tab_assign, tab_my = st.tabs(["👥 Ekibime Ata (Yönetici)", "🎓 Kendi Eğitimlerim"])
        with tab_assign:
            df_org = pd.DataFrame(allowed_data)
            render_manager_view(user, df_org)
        with tab_my:
            render_employee_view(user)
    else:
        # Sadece Personel
        render_employee_view(user)