# ui_360.py (V12.4 - CEO YETKİ FİLTRESİ DÜZELTİLDİ)

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime

# --- GÜVENLİ IMPORT ---
try:
    from config import COMPETENCIES_360
    from utils_db import save_data, load_360_data, load_org_chart
except ImportError:
    st.error("Modül hatası. Lütfen config.py ve utils_db.py dosyalarını kontrol edin.")
    COMPETENCIES_360 = {'DIG': 'Dijital', 'ANA': 'Analitik'}
    def save_data(x): pass
    def load_360_data(): return []
    def load_org_chart(): return []

# --- VERİ YÜKLEME ---
def get_real_org_data():
    if 'org_chart' not in st.session_state or not st.session_state.org_chart:
        disk_data = load_org_chart()
        if disk_data: st.session_state.org_chart = disk_data
        else: return pd.DataFrame() 
    return pd.DataFrame(st.session_state.org_chart)

def load_current_scores():
    raw_360 = load_360_data()
    if 'db_360' in st.session_state and st.session_state.db_360:
        raw_360 = st.session_state.db_360
        
    df = pd.DataFrame(raw_360) if raw_360 else pd.DataFrame()
    
    if not df.empty:
        if 'Personel' not in df.columns and 'target' in df.columns:
            df.rename(columns={'target': 'Personel'}, inplace=True)
            
    return df

# --- HESAPLAMA MOTORU ---
def calculate_final_scores(row):
    # 1. PERFORMANS
    p1 = float(row.get('Performans_Mgr1', 0))
    p2 = float(row.get('Performans_Mgr2', 0))
    
    final_perf = 3.0
    if p1 > 0 and p2 > 0: final_perf = (p1 + p2) / 2
    elif p1 > 0: final_perf = p1
    elif p2 > 0: final_perf = p2
    
    # 2. YETKİNLİK
    mgr_avg_scores = []
    for code in COMPETENCIES_360.keys():
        s1 = float(row.get(f"{code}_Mgr", 0))
        s2 = float(row.get(f"{code}_Mgr2", 0))
        
        comp_score = 0
        if s1 > 0 and s2 > 0: comp_score = (s1 + s2) / 2
        elif s1 > 0: comp_score = s1
        elif s2 > 0: comp_score = s2
        
        if comp_score > 0: mgr_avg_scores.append(comp_score)
            
    final_pot = 3.0
    if mgr_avg_scores:
        final_pot = sum(mgr_avg_scores) / len(mgr_avg_scores)
        
    return final_perf, final_pot

# --- ANA EKRAN ---
def render_360_dashboard():
    st.header("🔄 Performans Değerlendirme Girişi")
    
    if 'current_user' not in st.session_state:
        st.warning("Lütfen önce giriş yapınız.")
        return
        
    current_user = st.session_state.current_user
    current_user_name = current_user['name']
    current_user_role = current_user['role'] 
    
    df_org = get_real_org_data()
    if df_org.empty:
        st.warning("Personel listesi bulunamadı.")
        return
    
    df_stats = load_current_scores()
    st.session_state['df_dept_stats'] = df_stats 

    st.divider()

    c1, c2 = st.columns(2)
    
    # --- SEÇİM ALANI (FİLTRE MANTIĞI GÜNCELLENDİ) ---
    selectable_employees = []
    
    # 1. İK (Herkesi Görür)
    if current_user_role == 'IK':
        selectable_employees = sorted(df_org['Ad Soyad'].unique().tolist())
        
    # 2. CEO (Sadece Direktörleri Görür)
    elif current_user_role == 'CEO':
        # Pozisyon içinde 'Direktör' veya 'Director' geçenleri bul
        directors = df_org[df_org['Pozisyon'].str.contains("Direktör|Director|Direktor", case=False, na=False)]
        selectable_employees = sorted(directors['Ad Soyad'].unique().tolist())
        
    # 3. DİREKTÖR (Kendi Departmanını Görür)
    elif current_user_role == 'DIRECTOR':
        dept_filtered = df_org[df_org['Departman'] == current_user.get('dept')]
        selectable_employees = sorted(dept_filtered['Ad Soyad'].unique().tolist())
        
    # 4. MÜDÜR (Sadece Kendisine Bağlıları Görür)
    elif current_user_role == 'MANAGER':
        # Yönetici 1 veya Yönetici 2 sütununda kendi adı olanlar
        my_team = df_org[
            (df_org['Yönetici 1'] == current_user_name) | 
            (df_org['Yönetici 2'] == current_user_name)
        ]
        selectable_employees = sorted(my_team['Ad Soyad'].unique().tolist())
        
    # Kişi kendini listeden çıkarır (Kendini değerlendiremez)
    if current_user_name in selectable_employees:
        selectable_employees.remove(current_user_name)

    with c1:
        if not selectable_employees:
            st.info("⚠️ Değerlendirilecek uygun personel bulunamadı.")
            return

        target_name = st.selectbox("Değerlendirilen Personel", selectable_employees)
        emp_info = df_org[df_org['Ad Soyad'] == target_name].iloc[0]
        
        mgr1_name = emp_info.get('Yönetici 1', '-')
        mgr2_name = emp_info.get('Yönetici 2', '-')
        
        st.info(f"Pozisyon: **{emp_info['Pozisyon']}**\n\n1. Amir: {mgr1_name}\n\n2. Amir: {mgr2_name}")

    with c2:
        eval_options = []
        
        # Yetki Kontrolü: Kim kimi nasıl değerlendiriyor?
        if current_user_name == mgr1_name:
            eval_options = ["1. Yönetici (Doğrudan Amir)"]
        elif current_user_name == mgr2_name:
            eval_options = ["2. Yönetici (Üst Amir/Direktör)"]
        elif current_user_role == 'IK':
            eval_options = ["1. Yönetici (Doğrudan Amir)", "2. Yönetici (Üst Amir/Direktör)"]
        elif current_user_role == 'CEO':
            # CEO, Direktörün 1. Yöneticisidir (Genelde)
            eval_options = ["1. Yönetici (Doğrudan Amir)"]
        else:
            # Eğer listede varsa ama yönetici adı eşleşmiyorsa (Örn: Direktör tüm departmanı görüyor ama direkt yönetici değil)
            # Direktör genelde 2. Yönetici sayılır veya Manuel yetki verilir.
            # Basitlik adına Direktörlere '2. Yönetici' yetkisi veya esnek yetki verelim:
            if current_user_role == 'DIRECTOR':
                eval_options = ["2. Yönetici (Üst Amir/Direktör)"]
            else:
                st.error("⚠️ Bu personeli değerlendirme yetkiniz (Yönetici eşleşmesi) bulunmuyor.")
                return

        if eval_options:
            eval_type_display = st.selectbox("Değerlendirme Tipi", eval_options)
            
            if "1. Yönetici" in eval_type_display: suffix = "_Mgr"
            elif "2. Yönetici" in eval_type_display: suffix = "_Mgr2"
            else: suffix = "_Mgr"
        else:
            return

    # --- MEVCUT PUANLAR ---
    current_scores = {}
    current_perf_val = 3.0
    
    if not df_stats.empty and 'Personel' in df_stats.columns:
        person_record = df_stats[df_stats['Personel'] == target_name]
        if not person_record.empty:
            row = person_record.iloc[0]
            if "1. Yönetici" in eval_type_display:
                current_perf_val = float(row.get('Performans_Mgr1', 3.0))
            else:
                current_perf_val = float(row.get('Performans_Mgr2', 3.0))
            
            for code in COMPETENCIES_360.keys():
                val = row.get(f"{code}{suffix}")
                if pd.notnull(val): current_scores[code] = val

    st.markdown("---")
    st.subheader(f"📝 {target_name} İçin Puanlama")
    
    # 1. YETKİNLİKLER
    input_scores = {}
    cols = st.columns(2)
    i = 0
    for code, name in COMPETENCIES_360.items():
        with cols[i % 2]:
            default_val = float(current_scores.get(code, 3.0))
            input_scores[code] = st.slider(f"{name}", 1.0, 5.0, default_val, 0.1, key=f"live_sld_{code}_{target_name}")
        i += 1
    
    st.markdown("---")
    
    # 2. PERFORMANS (GÜNCELLENEN METİNLER)
    st.write("🏆 **Genel Performans Değerlendirmesi**")
    
    col_perf_input, col_perf_viz = st.columns([2, 1])
    
    with col_perf_input:
        new_perf = st.slider("KPI / Hedef Gerçekleşme Skoru", 1.0, 5.0, float(current_perf_val), 0.1, key=f"live_perf_{target_name}")
    
    # --- CANLI HESAPLAMA ---
    perf_pct = int((new_perf / 5.0) * 100)
    
    with col_perf_viz:
        st.write("") 
        st.write("") 
        st.progress(perf_pct / 100)
        
    # --- YENİ METİN MANTIĞI ---
    if perf_pct < 60:
        st.error(f"📉 **%{perf_pct}:** Hedeflerin gerisinde (Beklenti Altı).")
    elif perf_pct < 99:
        st.warning(f"📊 **%{perf_pct}:** Hedeflere yaklaşılıyor (Gelişim Sürüyor).")
    else:
        # %100 (5.0 Puan) durumu
        st.success(f"✅ **%{perf_pct}:** Yıllık hedefler tam olarak gerçekleşti.")

    st.divider()
    
    # 3. KAYDET
    if st.button("💾 Değerlendirmeyi Kaydet", type="primary"):
        update_data = {f"{code}{suffix}": val for code, val in input_scores.items()}
        
        if "1. Yönetici" in eval_type_display:
            update_data['Performans_Mgr1'] = new_perf
        else:
            update_data['Performans_Mgr2'] = new_perf
        
        if not df_stats.empty and 'Personel' in df_stats.columns and target_name in df_stats['Personel'].values:
            idx = df_stats.index[df_stats['Personel'] == target_name][0]
            for k, v in update_data.items(): df_stats.at[idx, k] = v
            updated_row = df_stats.iloc[idx].to_dict()
            final_perf, final_pot = calculate_final_scores(updated_row)
            df_stats.at[idx, 'Performans'] = round(final_perf, 1)
            df_stats.at[idx, 'Potansiyel'] = round(final_pot, 1)
        else:
            full_data = {
                'Personel': target_name,
                'Departman': emp_info['Departman'],
                'Pozisyon': emp_info['Pozisyon'],
                'date': datetime.now().strftime("%Y-%m-%d")
            }
            full_data.update(update_data)
            final_perf, final_pot = calculate_final_scores(full_data)
            full_data['Performans'] = round(final_perf, 1)
            full_data['Potansiyel'] = round(final_pot, 1)
            df_stats = pd.concat([df_stats, pd.DataFrame([full_data])], ignore_index=True)
        
        st.session_state['df_dept_stats'] = df_stats
        st.session_state.db_360 = df_stats.to_dict('records')
        save_data(st.session_state.db_360)
        
        st.balloons()
        st.success("✅ Değerlendirme başarıyla kaydedildi!")