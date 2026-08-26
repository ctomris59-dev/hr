# ui_succession.py (V18.0 - YEDEK ADAYLARDA PERFORMANS VE RİSK GÖSTERİMİ)

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# --- GÜVENLİ IMPORT ---
try:
    from config import COMPETENCIES_360
    from utils_db import load_org_chart, load_360_data, load_leave_requests
    from auth import get_allowed_data 
except ImportError:
    def get_allowed_data(): return []
    def load_360_data(): return []
    def load_leave_requests(): return []
    def load_org_chart(): return []
    COMPETENCIES_360 = {}

# ==========================================
# 1. HİYERARŞİ PUANLAMA MOTORU
# ==========================================
def get_hierarchy_score(position_name):
    pos = str(position_name).lower()
    if any(x in pos for x in ['genel müdür', 'ceo', 'cfo', 'cto', 'başkan', 'board']): return 90
    if 'direktör' in pos: return 80
    if 'müdür' in pos: return 60
    if any(x in pos for x in ['yönetici', 'manager', 'şef', 'lider', 'head']): return 50
    if any(x in pos for x in ['kıdemli', 'senior', 'chief']): return 40
    if any(x in pos for x in ['uzman', 'mühendis', 'analist', 'sorumlu']): return 30
    if any(x in pos for x in ['asistan', 'yardımcı', 'stajyer']): return 10
    return 20 

# ==========================================
# 2. AI RİSK MOTORU (Yedek Adaylar İçin de Kullanılacak)
# ==========================================
def calculate_flight_risk(person, org_df, leave_requests):
    risk_score = 10 
    reasons = []
    
    # --- TEMEL VERİLER ---
    my_salary = float(person.get('Maaş (TL)', 0))
    my_tenure = float(person.get('Calisma_Yili', 0))
    perf = float(person.get('Performans', 0)) 
    pot = float(person.get('Potansiyel', 0))
    my_dept = person['Departman']
    
    # --- A. MAAŞ RİSKİ ---
    if my_salary > 0:
        if my_tenure <= 2: t_min, t_max = 0, 2.9
        elif my_tenure <= 5: t_min, t_max = 3, 5.9
        elif my_tenure <= 10: t_min, t_max = 6, 10.9
        else: t_min, t_max = 11, 99

        peers = org_df[(org_df['Departman'] == my_dept) & (org_df['Calisma_Yili'] >= t_min) & (org_df['Calisma_Yili'] <= t_max)]
        benchmark = peers['Maaş (TL)'].mean() if len(peers) > 1 else (org_df[org_df['Departman'] == my_dept]['Maaş (TL)'].mean() * 0.9)

        if my_salary < (benchmark * 0.85):
            risk_score += 40
            reasons.append(f"💰 Maaş piyasanın çok altında.")
        elif my_salary < (benchmark * 0.95):
            risk_score += 15
            reasons.append(f"📉 Maaş piyasanın hafif altında.")

    # --- B. TÜKENMİŞLİK ---
    person_leaves = [r for r in leave_requests if r['personel'] == person['Ad Soyad'] and r['durum'] == 'Onaylandı']
    used_days = sum([r['gun'] for r in person_leaves])
    
    if used_days == 0:
        risk_score += 25
        reasons.append("🔥 Hiç izin kullanmadı.")

    # --- C. YILDIZ RİSKİ ---
    if pot >= 4.5 and perf >= 4.0:
        risk_score += 20
        reasons.append("💎 Yıldız Oyuncu (Transfer Riski).")
    
    # --- D. PERFORMANS ETKİSİ ---
    if perf < 3.0:
        risk_score += 10 
        reasons.append("⚠️ Düşük Performans kaynaklı mutsuzluk.")

    risk_score = min(risk_score, 99)
    level = "KRİTİK" if risk_score >= 70 else ("Orta/Yüksek" if risk_score >= 40 else "Düşük")
    color = "red" if risk_score >= 70 else ("orange" if risk_score >= 40 else "green")
    
    # --- KAYIP ETKİSİ ANALİZİ ---
    loss_impact = "Düşük"
    impact_color = "gray"
    impact_msg = "Ayrılması sorun yaratmaz."
    
    if perf >= 4.0 or pot >= 4.0:
        loss_impact = "YÜKSEK"
        impact_color = "red"
        impact_msg = "🚨 Tutundurulmalı!"
    elif perf >= 3.0:
        loss_impact = "Orta"
        impact_color = "orange"
        impact_msg = "Bilgi kaybı olur."
    else:
        loss_impact = "DÜŞÜK"
        impact_color = "green"
        impact_msg = "♻️ Fırsat olabilir."

    return risk_score, level, color, reasons, loss_impact, impact_color, impact_msg

# ==========================================
# 3. ANA SAYFA RENDER
# ==========================================
def render_succession_dashboard():
    st.header("👑 Yedekleme Planı ve Risk Analizi")
    
    with st.expander("ℹ️ Risk vs. Kayıp Etkisi (Nasıl Okunmalı?)", expanded=False):
        st.markdown("""
        Bu ekran iki farklı veriyi analiz eder:
        1.  **İstifa Riski (Flight Risk):** Personelin gitme ihtimali ne kadar?
        2.  **Kayıp Etkisi (Loss Impact):** Eğer giderse üzülmeli miyiz?
        """)
    
    org_data = load_org_chart()
    leave_requests = load_leave_requests()
    
    if not org_data:
        st.warning("Veri bulunamadı.")
        return
        
    df = pd.DataFrame(org_data)
    
    # --- TÜM PERSONEL İÇİN RİSK HESAPLA ---
    # Bunu baştan yapıyoruz ki yedeklerin de risk durumunu bilelim.
    df['Risk_Skoru'] = 0
    df['Risk_Seviyesi'] = 'Düşük'
    df['Etki_Mesajı'] = ''
    df['Risk_Nedenleri'] = None
    
    analysis_results = []
    
    for idx, person in df.iterrows():
        score, level, color, reasons, impact, imp_color, imp_msg = calculate_flight_risk(person, df, leave_requests)
        
        # DataFrame'e de yazalım ki filtrelemede kullanalım
        df.at[idx, 'Risk_Skoru'] = score
        df.at[idx, 'Risk_Seviyesi'] = level
        
        analysis_results.append({
            "Ad Soyad": person['Ad Soyad'],
            "Pozisyon": person['Pozisyon'],
            "Departman": person['Departman'],
            "Performans": float(person.get('Performans', 0)),
            "Potansiyel": float(person.get('Potansiyel', 0)),
            "Risk Skoru": score,
            "Risk Seviyesi": level,
            "Risk Rengi": color,
            "Nedenler": reasons,
            "Kayıp Etkisi": impact,
            "Etki Rengi": imp_color,
            "Etki Mesajı": imp_msg,
            "Rank_Score": get_hierarchy_score(person['Pozisyon'])
        })
    
    df_risk = pd.DataFrame(analysis_results)
    
    # --- METRİKLER ---
    regrettable_losses = df_risk[(df_risk['Risk Seviyesi'] == 'KRİTİK') & (df_risk['Performans'] >= 3.5)]
    
    c1, c2, c3 = st.columns(3)
    c1.metric("🚨 Kritik & Değerli Personel Riski", f"{len(regrettable_losses)} Kişi", "Tutundurma Odaklı", delta_color="inverse")
    c2.metric("Genel Ortalama Risk", f"%{df_risk['Risk Skoru'].mean():.1f}")
    c3.metric("Yedekleme Hazırlığı", "%65")

    st.divider()
    
    # --- DETAYLI KARTLAR ---
    st.subheader("🕵️ Pozisyon Bazlı Risk Analizi")
    
    dept_filter = st.selectbox("Departman Filtrele", ["Tümü"] + list(df['Departman'].unique()))
    filtered_risk = df_risk if dept_filter == "Tümü" else df_risk[df_risk['Departman'] == dept_filter]
    
    filtered_risk = filtered_risk.sort_values(by=['Performans', 'Risk Skoru'], ascending=[False, False])

    for i, row in filtered_risk.iterrows():
        border_color = row['Risk Rengi'] if row['Risk Rengi'] != 'green' else "#e0e0e0"
        
        with st.container():
            st.markdown(f"""
            <div style="border: 1px solid {border_color}; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin:0;">{row['Ad Soyad']}</h4>
                        <span style="color: gray; font-size: 0.9em;">{row['Pozisyon']} | {row['Departman']}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: bold; font-size: 1.1em; color: {row['Risk Rengi']};">
                            İstifa Riski: %{row['Risk Skoru']}
                        </div>
                        <div style="font-weight: bold; font-size: 0.9em; color: {row['Etki Rengi']};">
                            Kayıp Etkisi: {row['Kayıp Etkisi']}
                        </div>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)
            
            with st.expander(f"🔍 Analiz Detayı - {row['Ad Soyad']}"):
                col_info, col_succ = st.columns(2)
                
                # SOL: ANALİZ
                with col_info:
                    st.markdown("#### 📊 Performans & Risk Durumu")
                    
                    perf_val = row['Performans']
                    perf_color = "green" if perf_val >= 4 else ("orange" if perf_val >= 3 else "red")
                    st.markdown(f"**Performans:** :{perf_color}[{perf_val:.1f} / 5.0]")
                    
                    st.info(f"💡 **Etki:** {row['Etki Mesajı']}")
                    
                    if row['Nedenler']:
                        st.markdown("**Risk Sebepleri:**")
                        for reason in row['Nedenler']:
                            st.warning(f"⚠️ {reason}")

                # SAĞ: YEDEKLEME (GÜNCELLENEN KISIM)
                with col_succ:
                    st.markdown("#### 🔄 Önerilen Yedekler")
                    
                    target_rank = row['Rank_Score']
                    df['Temp_Rank'] = df['Pozisyon'].apply(get_hierarchy_score)
                    
                    # Filtreleme: Aynı Departman, Hiyerarşi Uygun, Potansiyel Yüksek
                    successors = df[
                        (df['Departman'] == row['Departman']) &
                        (df['Ad Soyad'] != row['Ad Soyad']) &
                        (df['Temp_Rank'] <= target_rank) & 
                        (df['Potansiyel'] >= 3.5)
                    ].sort_values(by=['Potansiyel', 'Performans'], ascending=[False, False])
                    
                    if not successors.empty:
                        for _, succ in successors.head(3).iterrows():
                            # Yedek adayının risk durumunu da gösterelim
                            succ_risk = succ['Risk_Seviyesi']
                            succ_perf = float(succ.get('Performans', 0))
                            
                            risk_icon = "🟢"
                            if succ_risk == "KRİTİK": risk_icon = "🔴"
                            elif succ_risk == "Orta/Yüksek": risk_icon = "🟠"
                            
                            # Yedek Kartı
                            st.markdown(f"""
                            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 5px; border-left: 3px solid #2196F3;">
                                <strong>👤 {succ['Ad Soyad']}</strong> <br>
                                <span style="font-size: 0.8em; color: gray;">{succ['Pozisyon']}</span><br>
                                <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-top: 5px;">
                                    <span>🚀 Pot: <strong>{succ['Potansiyel']}</strong></span>
                                    <span>📊 Perf: <strong>{succ_perf:.1f}</strong></span>
                                    <span title="Adayın İstifa Riski">{risk_icon} Risk: {succ_risk}</span>
                                </div>
                            </div>
                            """, unsafe_allow_html=True)
                            
                            # Eğer yedek aday da riskliyse uyarı ver
                            if succ_risk == "KRİTİK":
                                st.caption(f"⚠️ Uyarı: Bu yedek adayın da ayrılma riski yüksek!")

                    else:
                        st.caption("Bu pozisyon için uygun iç yedek bulunamadı.")