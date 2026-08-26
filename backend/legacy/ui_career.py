# ui_career.py (V10.1 - SADECE MEVCUT ORGANİZASYONDAKİ POZİSYONLAR)

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px

# --- GÜVENLİ IMPORT ---
try:
    from config import COMPETENCIES_360, CAT_NAMES
    from data.data_jobs import JOB_PROFILES
    from utils_db import load_org_chart, load_360_data
except ImportError:
    st.error("Gerekli modüller eksik.")
    COMPETENCIES_360 = {}
    JOB_PROFILES = {}
    def load_org_chart(): return []
    def load_360_data(): return []

# --- VERİ HAZIRLAMA ---
def get_real_employee_data():
    """
    Org şeması ve 360 verilerini birleştirir.
    """
    # 1. Org Şeması
    if 'org_chart' not in st.session_state or not st.session_state.org_chart:
        disk_data = load_org_chart()
        if disk_data: st.session_state.org_chart = disk_data
        else: return pd.DataFrame()

    df_org = pd.DataFrame(st.session_state.org_chart)

    # 2. 360 Verisi
    raw_360 = load_360_data()
    if 'db_360' in st.session_state and st.session_state.db_360:
        raw_360 = st.session_state.db_360
        
    df_360 = pd.DataFrame(raw_360) if raw_360 else pd.DataFrame()

    if not df_360.empty:
        if 'Personel' not in df_360.columns and 'target' in df_360.columns:
            df_360.rename(columns={'target': 'Personel'}, inplace=True)
            
        if 'scores' in df_360.columns:
            normalized = pd.json_normalize(df_360['scores'])
            new_cols = {c: f"{c}_Mgr" for c in normalized.columns if not c.endswith(('_Mgr', '_Peer', '_Self'))}
            normalized.rename(columns=new_cols, inplace=True)
            df_360 = pd.concat([df_360.drop(columns=['scores']), normalized], axis=1)

        df_merged = pd.merge(
            df_org,
            df_360,
            left_on='Ad Soyad',
            right_on='Personel',
            how='left',
            suffixes=('', '_y')
        )
        return df_merged
    
    return df_org

# --- RADAR GRAFİĞİ ---
def plot_gap_radar(emp_scores, target_scores, emp_name, target_role):
    categories = []
    emp_vals = []
    target_vals = []
    
    for code, name in COMPETENCIES_360.items():
        categories.append(name)
        # Hedef Puan
        t_val = target_scores.get(code)
        if t_val is None: t_val = target_scores.get(name, 4.0) 
        target_vals.append(float(t_val))
        
        # Aday Puanı
        e_val = emp_scores.get(code, 0.0)
        emp_vals.append(float(e_val))
        
    categories += [categories[0]]
    emp_vals += [emp_vals[0]]
    target_vals += [target_vals[0]]
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatterpolar(
        r=target_vals, theta=categories, fill='toself', name=f'Hedef: {target_role}',
        line=dict(color='#ff7f0e'), fillcolor='rgba(255, 127, 14, 0.2)'
    ))
    
    fig.add_trace(go.Scatterpolar(
        r=emp_vals, theta=categories, fill='toself', name=f'Mevcut: {emp_name}',
        line=dict(color='#1f77b4'), fillcolor='rgba(31, 119, 180, 0.4)'
    ))
    
    fig.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 5])),
        showlegend=True, height=400, margin=dict(t=40, b=40, l=40, r=40)
    )
    return fig

# --- ANA EKRAN ---
def render_career_path_dashboard():
    st.header("🗺️ Kariyer Yolu ve Terfi Planlama")
    st.markdown("Çalışanların mevcut yetkinlikleri ile **mevcut organizasyondaki** hedef pozisyon arasındaki farkları inceleyin.")

    # 1. VERİLERİ ÇEK
    df_merged = get_real_employee_data()
    
    if df_merged.empty:
        st.warning("⚠️ Veri bulunamadı. Lütfen Admin panelinden veri oluşturun.")
        return

    # --- FİLTRELEME ---
    current_user = st.session_state.get('current_user')
    if current_user and current_user['role'] not in ['CEO', 'IK']:
        user_dept = current_user.get('dept')
        if user_dept:
            df_merged = df_merged[df_merged['Departman'] == user_dept]
            if df_merged.empty:
                st.error(f"⚠️ {user_dept} departmanında çalışan bulunamadı.")
                return

    # 2. SEÇİMLER
    c1, c2 = st.columns([1, 1])
    
    with c1:
        # 1. ÇALIŞAN SEÇİMİ
        employees = sorted(df_merged['Ad Soyad'].unique())
        selected_emp = st.selectbox("1. Çalışan Seçiniz", employees)
        
        emp_row = df_merged[df_merged['Ad Soyad'] == selected_emp].iloc[0]
        current_role = emp_row['Pozisyon']
        st.info(f"Mevcut Pozisyon: **{current_role}**")
        
        # Puanları Topla
        emp_scores = {}
        for code in COMPETENCIES_360.keys():
            val = emp_row.get(f"{code}_Mgr")
            if pd.isna(val) or val == 0: val = emp_row.get(f"{code}_Peer")
            if pd.isna(val) or val == 0: val = emp_row.get(f"{code}_Self")
            try:
                emp_scores[code] = float(val) if val else 0.0
            except:
                emp_scores[code] = 0.0

    with c2:
        # 2. HEDEF POZİSYON SEÇİMİ (DÜZELTİLDİ)
        # Artık JOB_PROFILES'dan değil, DOĞRUDAN ORG ŞEMASINDAN çekiyoruz.
        # Böylece olmayan pozisyonlar (Genel Sekreter vb.) gelmez.
        
        # Mevcut verideki tüm benzersiz pozisyonları al
        active_positions = df_merged['Pozisyon'].unique().tolist()
        
        # İsteğe bağlı: Mevcut pozisyonunu listeden çıkarabiliriz ama bazen kendine kıyaslamak isterler, kalsın.
        active_positions = sorted(active_positions)
        
        target_role = st.selectbox("2. Hedef Pozisyon Seçiniz", active_positions)
        
        # Hedef Profil (Eğer tanımlı değilse varsayılan)
        target_profile = JOB_PROFILES.get(target_role, {})
        if not target_profile: 
            target_profile = {k: 4.0 for k in COMPETENCIES_360.keys()}
            st.caption("ℹ️ Bu pozisyon için özel profil tanımı bulunamadı, varsayılan (4.0) kullanılıyor.")

    st.divider()

    # 3. ANALİZ
    if selected_emp and target_role:
        if sum(emp_scores.values()) == 0:
            st.warning(f"⚠️ **{selected_emp}** için yetkinlik puanı bulunamadı. Lütfen 360 Değerlendirme ekranından veri giriniz.")
        else:
            c_left, c_right = st.columns([1, 1])
            
            with c_left:
                st.subheader("📊 Yetkinlik Kıyaslaması (Radar)")
                fig = plot_gap_radar(emp_scores, target_profile, selected_emp, target_role)
                st.plotly_chart(fig, use_container_width=True)
                
            with c_right:
                st.subheader("GAP Analizi (Eksik Yönler)")
                
                gaps = []
                total_gap = 0
                for code, name in COMPETENCIES_360.items():
                    t_val = float(target_profile.get(code, target_profile.get(name, 4.0)))
                    e_val = emp_scores.get(code, 0.0)
                    diff = t_val - e_val
                    
                    if diff > 0.3: 
                        gaps.append({'Yetkinlik': name, 'Mevcut': e_val, 'Hedef': t_val, 'Fark': diff})
                        total_gap += diff
                
                readiness = max(0, 100 - (total_gap * 8)) 
                
                if readiness > 80:
                    st.success(f"✅ Hazır! (Uyum: %{readiness:.0f})")
                elif readiness > 50:
                    st.warning(f"⏳ Hazırlanıyor... (Uyum: %{readiness:.0f})")
                else:
                    st.error(f"❌ Hazır Değil (Uyum: %{readiness:.0f})")
                    
                if gaps:
                    st.write("**Geliştirilmesi Gereken Alanlar:**")
                    df_gaps = pd.DataFrame(gaps)
                    st.dataframe(
                        df_gaps.style.format({"Mevcut": "{:.1f}", "Hedef": "{:.1f}", "Fark": "{:.1f}"}),
                        use_container_width=True,
                        hide_index=True
                    )
                    
                    top_gap = sorted(gaps, key=lambda x: x['Fark'], reverse=True)[0]
                    st.info(f"💡 **AI Koç Önerisi:** {selected_emp}, **{target_role}** pozisyonuna geçmek için öncelikle **{top_gap['Yetkinlik']}** yetkinliğini geliştirmelidir.")
                else:
                    st.balloons()
                    st.success("Tebrikler! Çalışan bu pozisyon için tüm yetkinlik gereksinimlerini karşılıyor.")

    # 4. TERFİ SİMÜLASYONU
    st.divider()
    with st.expander("🎓 Terfi Etki Analizi (Simülasyon)"):
        st.write("Eğer bu terfi gerçekleşirse:")
        col1, col2, col3 = st.columns(3)
        col1.metric("Maaş Artış Beklentisi", "+%25", help="Piyasa ortalamasına göre tahmini artış")
        col2.metric("Sorumluluk Alanı", "Genişleyecek", help="Takım yönetimi ve bütçe sorumluluğu eklenecek")
        col3.metric("Eğitim İhtiyacı", "Liderlik 101", help="Önerilen zorunlu eğitim")