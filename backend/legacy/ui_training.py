# ui_training.py (V13.4 - BİLDİRİM SİSTEMLİ)

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime

# --- IMPORTLAR ---
try:
    from config import COMPETENCIES_360
    from utils_db import load_training_data, save_training_data, load_360_data, load_org_chart, send_notification
except ImportError:
    st.error("Modül hatası. config.py veya utils_db.py eksik.")
    def load_training_data(): return []
    def save_training_data(x): pass
    def load_360_data(): return []
    def load_org_chart(): return []
    def send_notification(x,y,z): pass
    COMPETENCIES_360 = {"YET_01": "İletişim", "YET_02": "Analitik"}

# --- EĞİTİM LİSTESİ (YÖNETİCİ SEÇİMİ İÇİN ARKA PLANDA GEREKLİ) ---
TRAINING_CATALOG = [
    {"id": "TR_001", "name": "İleri Excel ve Veri Analizi", "category": "Teknik", "competency": "YET_02"},
    {"id": "TR_002", "name": "Etkili İletişim Teknikleri", "category": "Soft Skill", "competency": "YET_01"},
    {"id": "TR_003", "name": "Liderlik ve Takım Yönetimi", "category": "Liderlik", "competency": "YET_04"},
    {"id": "TR_004", "name": "Zaman Yönetimi", "category": "Soft Skill", "competency": "YET_03"},
    {"id": "TR_005", "name": "Python ile Veri Bilimine Giriş", "category": "Teknik", "competency": "YET_05"},
    {"id": "TR_006", "name": "Problem Çözme Teknikleri", "category": "Soft Skill", "competency": "YET_03"},
    {"id": "TR_007", "name": "KVKK ve Bilgi Güvenliği", "category": "Uyum", "competency": "YET_06"},
    {"id": "TR_008", "name": "Satış Kapama Teknikleri", "category": "Satış", "competency": "YET_02"},
]

# --- VERİTABANI BAĞLANTISI ---
if 'db_training_assignments' not in st.session_state:
    st.session_state.db_training_assignments = load_training_data()

def get_training_data():
    return pd.DataFrame(st.session_state.db_training_assignments)

def assign_training(employee, assigner, competency, title, due_date, status="Atandı"):
    d_str = due_date.strftime("%Y-%m-%d") if isinstance(due_date, datetime) else str(due_date)
    
    new_record = {
        "id": len(st.session_state.db_training_assignments) + 1,
        "Personel": employee,
        "Atayan": assigner,
        "Yetkinlik": competency,
        "Eğitim Adı": title,
        "Son Tarih": d_str,
        "Durum": status,
        "Personel Notu": "", 
        "Atama Tarihi": datetime.now().strftime("%Y-%m-%d")
    }
    st.session_state.db_training_assignments.append(new_record)
    save_training_data(st.session_state.db_training_assignments)
    
    # --- BİLDİRİM ---
    send_notification(employee, f"📚 Size yeni bir eğitim atandı: {title}", "warning")

def update_training_status(record_id, new_status, note=""):
    for rec in st.session_state.db_training_assignments:
        if rec['id'] == record_id:
            rec['Durum'] = new_status
            if note:
                rec['Personel Notu'] = note
            break
    save_training_data(st.session_state.db_training_assignments)

# --- GECİKME HESAPLAMA ---
def check_overdue(due_date_str, status):
    if status == "Tamamlandı": return False, 0
    try:
        due = datetime.strptime(due_date_str, "%Y-%m-%d")
        today = datetime.now()
        if today > due:
            delta = (today - due).days
            return True, delta 
    except: pass
    return False, 0

# --- YETKİNLİK ANALİZİ ---
def get_my_competency_gaps(user_name):
    all_scores = load_360_data()
    df = pd.DataFrame(all_scores)
    
    if df.empty or 'Personel' not in df.columns: return {}, 0, 0
    
    my_data = df[df['Personel'] == user_name]
    if my_data.empty: return {}, 0, 0
        
    last_record = my_data.iloc[-1]
    scores = {}
    for code, name in COMPETENCIES_360.items():
        val = 0
        if f"{code}_Mgr" in last_record: val = float(last_record[f"{code}_Mgr"])
        elif f"{code}_Mgr1" in last_record: val = float(last_record[f"{code}_Mgr1"])
        elif f"{code}_Mgr2" in last_record: val = float(last_record[f"{code}_Mgr2"])
        elif code in last_record: val = float(last_record[code])
        
        if val > 0: scores[name] = val
            
    perf = float(last_record.get('Performans', 0))
    pot = float(last_record.get('Potansiyel', 0))
    
    return scores, perf, pot

# --- 1. YÖNETİCİ EKRANI ---
def render_manager_view(current_user, df_org):
    st.markdown("### 📋 Ekip Eğitim Atama ve Takip")
    
    col_sel, col_stat = st.columns([1, 2])
    with col_sel:
        staff_list = sorted(df_org['Ad Soyad'].unique().tolist())
        if current_user['name'] in staff_list: staff_list.remove(current_user['name'])
        
        if not staff_list:
            st.warning("Ekip yok.")
            return
        selected_person = st.selectbox("Personel Seç:", staff_list)

    with st.expander(f"➕ {selected_person} için Yeni Görev/Eğitim Ata", expanded=True):
        st.info("Kurumsal katalogdan eğitim seçerek atayabilirsiniz.")
        with st.form("new_task_mgr"):
            c_t1, c_t2 = st.columns(2)
            # Katalog burada Yöneticiye lazım
            t_title = c_t1.selectbox("Atanacak Eğitim", [t['name'] for t in TRAINING_CATALOG])
            t_date = c_t2.date_input("Son Tamamlama Tarihi")
            
            if st.form_submit_button("Eğitimi Ata ve Bildir"):
                assign_training(selected_person, current_user['name'], "Genel", t_title, t_date)
                st.success(f"{selected_person} kullanıcısına '{t_title}' atandı!")
                st.rerun()

    st.divider()
    df_train = get_training_data()
    
    if not df_train.empty:
        tasks = df_train[df_train['Personel'] == selected_person]
        
        if not tasks.empty:
            overdue_count = 0
            for _, t in tasks.iterrows():
                is_late, _ = check_overdue(t['Son Tarih'], t['Durum'])
                if is_late: overdue_count += 1
            
            c1, c2, c3 = st.columns(3)
            c1.metric("Toplam Görev", len(tasks))
            c2.metric("Tamamlanan", len(tasks[tasks['Durum'] == 'Tamamlandı']))
            c3.metric("Geciken Görevler", overdue_count, delta_color="inverse")
            st.write("") 

            for _, task in tasks.iterrows():
                is_late, days_late = check_overdue(task['Son Tarih'], task['Durum'])
                status_icon = "🔹"
                if is_late:
                    status_icon = "🚨"
                    st.error(f"⚠️ **DİKKAT:** Bu görev **{days_late} gün** gecikti!")
                elif task['Durum'] == "Tamamlandı": status_icon = "✅"
                elif task['Durum'] == "Devam Ediyor": status_icon = "⏳"

                with st.container(border=True):
                    c_info, c_status, c_date = st.columns([3, 2, 2])
                    c_info.markdown(f"**{status_icon} {task['Eğitim Adı']}**")
                    c_info.caption(f"Atayan: {task.get('Atayan','Sistem')}")
                    c_status.caption("Durum")
                    if is_late: c_status.markdown(f"**{task['Durum']} (GECİKTİ)**")
                    else: c_status.write(task['Durum'])
                    c_date.caption("Son Tarih")
                    c_date.write(task['Son Tarih'])
                    if task['Personel Notu']: st.info(f"💬 Personel Notu: {task['Personel Notu']}")
                    
                    if st.button("Sil 🗑️", key=f"mgr_del_{task['id']}"):
                        st.session_state.db_training_assignments = [x for x in st.session_state.db_training_assignments if x['id'] != task['id']]
                        save_training_data(st.session_state.db_training_assignments)
                        st.rerun()
        else: st.info("Bu personele atanmış görev yok.")
    else: st.info("Kayıt yok.")

# --- 2. PERSONEL EKRANI ---
def render_employee_view(current_user):
    st.markdown(f"### 🎒 {current_user['name']} - Eğitimlerim")
    df_train = get_training_data()
    my_tasks = df_train[df_train['Personel'] == current_user['name']] if not df_train.empty else pd.DataFrame()
    
    if my_tasks.empty:
        st.success("🎉 Harika! Bekleyen eğitiminiz veya göreviniz yok.")
        return

    for _, task in my_tasks.iterrows():
        is_late, days_late = check_overdue(task['Son Tarih'], task['Durum'])
        with st.container(border=True):
            if is_late: st.error(f"‼️ BU EĞİTİMİN SÜRESİ {days_late} GÜN GEÇTİ!")
            c1, c2, c3 = st.columns([3, 2, 2])
            c1.markdown(f"**{task['Eğitim Adı']}**")
            c1.caption(f"Son Tarih: {task['Son Tarih']}")
            
            if task['Durum'] == "Atandı":
                c2.warning("Başlanmadı")
                if c3.button("Başla ▶️", key=f"e_start_{task['id']}"):
                    update_training_status(task['id'], "Devam Ediyor")
                    st.rerun()
            elif task['Durum'] == "Devam Ediyor":
                c2.info("Sürüyor")
                with c3.popover("Bitir ✅"):
                    note = st.text_area("Tamamlama Notunuz (Varsa):")
                    if st.button("Tamamlandı İşaretle", key=f"e_end_{task['id']}"):
                        update_training_status(task['id'], "Tamamlandı", note)
                        st.rerun()
            else: c2.success("Tamamlandı")

# --- 3. ANALİZ EKRANI (PERFORMANS GÖSTERGELİ) ---
def render_analysis_view(user_name):
    scores, perf, pot = get_my_competency_gaps(user_name)
    
    if not scores:
        st.info("Henüz yetkinlik değerlendirmesi yapılmamış.")
        return

    # --- PERFORMANS ÖZETİ ---
    st.markdown("#### 🎯 Performans ve Gelişim Karnesi")
    kp1, kp2, kp3 = st.columns(3)
    
    kp1.metric("🏆 Yıl Sonu Performans", f"{perf:.1f} / 5.0", help="Yöneticiniz tarafından atanan yıl sonu başarı puanı.")
    kp2.metric("🚀 Potansiyel Skoru", f"{pot:.1f} / 5.0", help="Gelecek vadeden roller için potansiyeliniz.")
    
    avg_comp = sum(scores.values()) / len(scores) if scores else 0
    kp3.metric("🧠 Yetkinlik Ortalaması", f"{avg_comp:.1f} / 5.0")
    
    st.divider()

    c1, c2 = st.columns([1, 1.5])
    with c1:
        categories = list(scores.keys())
        values = list(scores.values())
        fig = go.Figure()
        fig.add_trace(go.Scatterpolar(r=values, theta=categories, fill='toself', name='Mevcut'))
        fig.add_trace(go.Scatterpolar(r=[4.0]*len(values), theta=categories, mode='lines', name='Hedef', line_dash='dot'))
        fig.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 5])), 
            showlegend=True, 
            height=300, 
            margin=dict(t=20, b=20, l=30, r=30)
        )
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.markdown("#### 🔍 Gelişim Alanları")
        for comp_name, score in scores.items():
            if score < 3.5:
                st.error(f"⚠️ **{comp_name}** (Puan: {score}) - Gelişim Gerekli")
            else:
                st.success(f"✅ **{comp_name}** (Puan: {score}) - Başarılı")

# --- ANA RENDER ---
def render_training_page():
    st.header("📚 Eğitim Takip Merkezi")
    if 'current_user' not in st.session_state: return
    user = st.session_state.current_user
    
    # KATALOG YOK (Sadece Atama ve Takip)
    tabs = ["📊 Gelişim & Görevlerim"]
    is_manager = user['role'] in ['MANAGER', 'DIRECTOR', 'CEO', 'IK']
    if is_manager: tabs.append("👥 Ekip Yönetimi (Atama)")
        
    active_tab = st.radio("", tabs, horizontal=True, label_visibility="collapsed")
    st.divider()

    if "Gelişim" in active_tab:
        
        with st.expander("🧩 Yetkinlik Analizimi ve Puanlarımı Göster", expanded=True):
            render_analysis_view(user['name'])
        
        st.write("")
        render_employee_view(user)

    elif "Ekip" in active_tab and is_manager:
        df_org = pd.DataFrame(load_org_chart())
        render_manager_view(user, df_org)