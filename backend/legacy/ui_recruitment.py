# ui_recruitment.py (V5.0 - PUAN ODAKLI LİSTE VE GAP ANALİZİ)

import streamlit as st
import pandas as pd
import urllib.parse 
import random
import time
from datetime import datetime
import plotly.graph_objects as go
import numpy as np

# --- IMPORT KONTROLÜ ---
try:
    from config import COMPETENCIES_360
    from data.data_jobs import JOB_PROFILES
    from utils_db import load_candidates, save_candidates, save_candidate
except ImportError:
    st.error("Config veya Data modülleri eksik.")
    JOB_PROFILES = {"Genel Başvuru": {}, "CFO": {}}
    def load_candidates(): return []
    def save_candidates(x): pass
    def save_candidate(x): pass
    COMPETENCIES_360 = {'DIG': 'Dijital', 'ANA': 'Analitik'}

# --- YARDIMCI: HEDEF PROFİL ---
def get_target_profile(role_name):
    """Rol bazlı kritik yetkinlikleri ve hedefleri belirler."""
    target_scores = {v: 4.0 for k,v in COMPETENCIES_360.items()}
    
    if "CFO" in role_name or "Finans" in role_name:
        target_scores[COMPETENCIES_360.get('ANA', 'Analitik')] = 5.0
        target_scores[COMPETENCIES_360.get('ETH', 'Etik')] = 5.0
        target_scores[COMPETENCIES_360.get('STR', 'Strateji')] = 5.0
    elif "Yazılım" in role_name or "Developer" in role_name:
        target_scores[COMPETENCIES_360.get('DIG', 'Dijital')] = 5.0
        target_scores[COMPETENCIES_360.get('LRN', 'Öğrenme')] = 5.0
        target_scores[COMPETENCIES_360.get('ANA', 'Analitik')] = 4.8
    elif "Satış" in role_name or "Sales" in role_name:
        target_scores[COMPETENCIES_360.get('COM', 'İletişim')] = 5.0
        target_scores[COMPETENCIES_360.get('RES', 'Sonuç')] = 5.0
    
    return target_scores

# --- YARDIMCI: PUAN HESAPLAMA ---
def calculate_average_score(candidate):
    scores = candidate.get('raw_scores', {})
    if not scores: return 0.0
    return sum(scores.values()) / len(scores)

# --- AI KARAR MOTORU ---
def calculate_ai_recommendation(candidate):
    scores = candidate.get('raw_scores', {})
    role = candidate.get('role', 'Genel')
    risk_score = candidate.get('manipulation_score', 0)
    
    if not scores: return "❓ Veri Yok"

    avg_score = calculate_average_score(candidate)
    targets = get_target_profile(role)
    critical_fail = False      
    critical_warning = False   
    
    for comp, target_val in targets.items():
        user_val = scores.get(comp, 0)
        if target_val >= 4.8:
            if user_val < 3.0: critical_fail = True 
            elif user_val < 4.0: critical_warning = True 

    if risk_score > 65: return "❌ ÖNERİ: RED (Yüksek Yalan)"
    if avg_score < 3.5: return "❌ ÖNERİ: RED (Puan < %70)"
    if critical_fail: return "❌ ÖNERİ: RED (Kritik Yetersiz)"

    if critical_warning: return "🟡 CV İNCELEME (Kritik Sınırda)"
    if risk_score > 35: return "🟡 CV İNCELEME (Yalan Şüphesi)"

    return "✅ ÖNERİ: KABUL"

# --- YARDIMCI: DURUM GÜNCELLEME (Detay ekranından) ---
def update_candidate_status(candidate_name, new_status):
    all_candidates = load_candidates()
    updated = False
    for cand in all_candidates:
        if cand['name'] == candidate_name:
            cand['status'] = new_status
            cand['status_date'] = datetime.now().strftime("%Y-%m-%d")
            updated = True
            break
    if updated:
        save_candidates(all_candidates)
        st.toast(f"✅ Durum güncellendi: {new_status}")
        time.sleep(1)
        st.rerun()

# --- DEMO VERİ ÜRETİCİ ---
def generate_demo_candidates():
    fake_names = ["Ayşe Yılmaz", "Mert Demir", "Zeynep Kaya", "Canan Çelik", "Burak Öztürk", "Elif Şahin", "Okan Yıldız", "Selin Aras"]
    roles = ["CFO (Chief Financial Officer)", "Yazılım Uzmanı", "Satış Müdürü", "İK Yöneticisi"]
    possible_statuses = ["İnceleniyor", "İnceleniyor", "Mülakat", "İnceleniyor"] 

    count = 0
    for name in fake_names:
        profile_type = random.choice(["Star", "Average", "Risky", "Weak", "Mixed"])
        
        if profile_type == "Star":
            score_range = (4.2, 5.0); lie_score = random.uniform(1.0, 2.0); manipulation = random.randint(5, 20)
        elif profile_type == "Average":
            score_range = (3.2, 4.2); lie_score = random.uniform(2.0, 3.5); manipulation = random.randint(20, 40)
        elif profile_type == "Risky":
            score_range = (4.0, 4.8); lie_score = random.uniform(4.0, 5.0); manipulation = random.randint(45, 80) 
        elif profile_type == "Weak":
            score_range = (2.0, 3.2); lie_score = random.uniform(1.5, 3.0); manipulation = random.randint(10, 30)
        else: 
            score_range = (3.5, 4.5); lie_score = random.uniform(3.0, 4.2); manipulation = random.randint(30, 50)

        raw_scores = {}
        for k, v in COMPETENCIES_360.items(): raw_scores[v] = round(random.uniform(*score_range), 2)

        demo_record = {
            "name": name, 
            "role": random.choice(roles),
            "email": f"{name.lower().replace(' ','.')}@email.com",
            "exp": random.randint(2, 15),
            "lie": round(lie_score, 1),
            "manipulation_score": manipulation,
            "raw_scores": raw_scores,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "type": "Aday",
            "status": random.choice(possible_statuses)
        }
        save_candidate(demo_record)
        count += 1
    return count

# --- ANA SAYFA ---
def render_recruitment_dashboard():
    st.header("🧑‍💼 İşe Alım Yönetim Merkezi")
    
    # --- DEMO ARAÇLARI ---
    with st.expander("🛠️ Sunum Modu / Demo Veri Araçları", expanded=False):
        if st.button("🤖 Demo Aday Verisi Üret (AI Analizli)", type="primary", use_container_width=True):
            with st.spinner("Yapay zeka aday profilleri oluşturuyor..."):
                time.sleep(1)
                c = generate_demo_candidates()
            st.success(f"{c} aday eklendi! Tablo yenileniyor...")
            time.sleep(0.5)
            st.rerun()

    # --- 1. LINK OLUŞTURUCU ---
    with st.container(border=True):
        c1, c2 = st.columns([3, 1])
        job_list = sorted(list(JOB_PROFILES.keys()))
        sel_role = c1.selectbox("Pozisyon Seç (Davet Linki İçin)", job_list)
        base_url = c2.text_input("Domain", value="http://localhost:8501")
        if sel_role:
            link = f"{base_url}/?role={urllib.parse.quote(sel_role)}"
            st.caption(f"🔗 Link: `{link}`")

    st.divider()

    # --- 2. BAŞVURU LİSTESİ ---
    st.subheader("📋 Aday Listesi ve Puan Durumu")
    
    candidates_data = load_candidates()
    real_candidates = [c for c in candidates_data if c.get('type') != 'Mevcut Çalışan']
    
    if not real_candidates:
        st.warning("⚠️ Başvuru yok. Yukarıdan demo veri üretebilirsiniz.")
        return

    df = pd.DataFrame(real_candidates)
    if 'status' not in df.columns: df['status'] = 'İnceleniyor'
    
    # HESAPLAMALAR
    df['AI Kararı'] = df.apply(calculate_ai_recommendation, axis=1)
    df['avg_score'] = df.apply(calculate_average_score, axis=1)

    # TABLO SÜTUNLARI (Durum kaldırıldı, Puan eklendi)
    display_cols = ['name', 'AI Kararı', 'avg_score', 'role', 'manipulation_score', 'date']
    
    st.dataframe(
        df[display_cols],
        column_config={
            "name": st.column_config.TextColumn("Aday", width="medium"),
            "AI Kararı": st.column_config.TextColumn("🤖 Yapay Zeka Önerisi", width="medium"), 
            "avg_score": st.column_config.ProgressColumn(
                "Genel Puan", 
                format="%.1f", 
                min_value=1.0, 
                max_value=5.0
            ),
            "role": st.column_config.TextColumn("Pozisyon"),
            "manipulation_score": st.column_config.ProgressColumn(
                "Risk %", 
                format="%d%%", 
                min_value=0, 
                max_value=100
            ),
            "date": st.column_config.TextColumn("Tarih")
        },
        use_container_width=True,
        hide_index=True
    )
    
    st.caption("ℹ️ Listeden detaylarını görmek istediğiniz adayı aşağıdan seçiniz.")

    # --- 3. DETAYLI PROFİL İNCELEMESİ ---
    st.divider()
    st.subheader("🔍 Detaylı Profil İncelemesi")
    
    col_sel, col_empty = st.columns([1, 2])
    selected_candidate_name = col_sel.selectbox("İncelemek İçin Aday Seçiniz:", df['name'].unique())
    
    if selected_candidate_name:
        candidate_data = df[df['name'] == selected_candidate_name].iloc[0]
        role_target = candidate_data['role']
        target_scores = get_target_profile(role_target)
        candidate_scores = candidate_data.get('raw_scores', {})
        ai_rec = calculate_ai_recommendation(candidate_data)

        # --- A. ADAY KARTI ---
        c1, c2 = st.columns([1, 2])
        
        with c1:
            st.markdown(f"### 👤 {candidate_data['name']}")
            st.caption(f"Başvuru: {candidate_data['role']}")
            
            # AI Karar Kutusu
            if "KABUL" in ai_rec: st.success(ai_rec)
            elif "RED" in ai_rec: st.error(ai_rec)
            else: st.warning(ai_rec)

            # Durum Değiştirme (Buraya taşıdık)
            curr_status = candidate_data.get('status', 'İnceleniyor')
            new_status = st.selectbox(
                "Mevcut Durum:", 
                ["İnceleniyor", "Mülakat", "Teklif", "Red", "İşe Alındı"],
                index=["İnceleniyor", "Mülakat", "Teklif", "Red", "İşe Alındı"].index(curr_status) if curr_status in ["İnceleniyor", "Mülakat", "Teklif", "Red", "İşe Alındı"] else 0
            )
            
            if new_status != curr_status:
                if st.button("Durumu Güncelle"):
                    update_candidate_status(candidate_data['name'], new_status)

        # --- B. GRAFİK VE EKSİK/FAZLA ANALİZİ ---
        with c2:
            st.markdown("#### 📊 Yetkinlik Gap Analizi (Aday vs Hedef)")
            
            if candidate_scores:
                # 1. Grafik
                categories = list(candidate_scores.keys())
                cand_vals = [candidate_scores.get(k, 0) for k in categories]
                targ_vals = [target_scores.get(k, 3.0) for k in categories]
                
                categories += [categories[0]]
                cand_vals += [cand_vals[0]]
                targ_vals += [targ_vals[0]]
                
                fig = go.Figure()
                fig.add_trace(go.Scatterpolar(r=targ_vals, theta=categories, fill='toself', name='Hedef', line_color='green', line_dash='dot', opacity=0.3))
                fig.add_trace(go.Scatterpolar(r=cand_vals, theta=categories, fill='toself', name='Aday', line_color='#1E88E5', opacity=0.7))
                fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 5])), showlegend=True, height=300, margin=dict(t=20, b=20, r=40, l=40))
                st.plotly_chart(fig, use_container_width=True)
                
                # 2. EKSİK / FAZLA ANALİZİ (YENİ)
                st.write("**📝 Kritik Yetkinlik Açıklamaları**")
                
                gaps = {k: candidate_scores[k] - target_scores.get(k, 4.0) for k in candidate_scores}
                
                # Sınıflandırma
                strengths = {k: v for k,v in gaps.items() if v >= 0.2}
                weaknesses = {k: v for k,v in gaps.items() if v <= -0.5}
                
                col_good, col_bad = st.columns(2)
                
                with col_good:
                    if strengths:
                        st.success("🌟 **Güçlü Yönler (Beklenti Üstü)**")
                        for k, v in strengths.items():
                            st.write(f"• **{k}:** Hedefin +{v:.1f} puan üzerinde.")
                    else:
                        st.info("Belirgin bir güçlü yön yok.")

                with col_bad:
                    if weaknesses:
                        st.error("📉 **Gelişim Alanları (Beklenti Altı)**")
                        for k, v in weaknesses.items():
                            st.write(f"• **{k}:** Hedefin {v:.1f} puan gerisinde.")
                    else:
                        st.success("Tüm yetkinlikler beklentiyi karşılıyor.")

            else:
                st.info("Grafik verisi yok.")