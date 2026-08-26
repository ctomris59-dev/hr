# ui_talent.py (V16.2 - POZİSYONA GÖRE DİNAMİK TERFİ HEDEFİ)

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# --- GÜVENLİ IMPORT ---
try:
    from config import COMPETENCIES_360
    from utils_db import load_org_chart, load_360_data
    from auth import get_allowed_data
except ImportError:
    st.error("Modül hatası. Config veya Utils dosyaları eksik.")
    def get_allowed_data(): return []
    def load_360_data(): return []
    COMPETENCIES_360 = {}

# --- YARDIMCI: İSİMDEN KODA DÖNÜŞ ---
NAME_TO_CODE = {v: k for k, v in COMPETENCIES_360.items()}

# --- POZİSYON KRİTİK YETKİNLİK HARİTASI ---
ROLE_CRITICAL_MAP = {
    "Yönetici": ["LID", "STR", "RES", "COM"],  
    "Satış":    ["COM", "RES", "ETH", "TEA"],  # ILT yok, COM kullanıyoruz
    "Teknik":   ["ANA", "DIG", "DET", "LRN"],  
    "Operasyon":["DET", "TEA", "RES", "DIS"],  
    "Genel":    ["COM", "TEA", "RES"]          
}

# --- ROL BAZLI DİNAMİK YETKİNLİK HEDEF PROFİLLERİ ---
# Her rol için her yetkinliğin hedef puanını tanımlar
ROLE_TARGET_PROFILES = {
    "Teknik Lider": {
        "ANA": 4.5, "DIG": 4.5, "DET": 4.0, "LRN": 4.5,  # Teknik yetkinlikler yüksek
        "LID": 3.5, "COM": 3.0, "STR": 3.0,              # Liderlik orta
        "RES": 4.0, "TEA": 3.5, "ETH": 3.5, "DIS": 3.5   # Diğerleri orta
    },
    "Satış Müdürü": {
        "COM": 5.0, "RES": 4.5, "ETH": 4.5, "TEA": 4.0,  # İletişim ve satış zirve
        "LID": 4.5, "STR": 4.0,                          # Liderlik yüksek
        "ANA": 2.5, "DIG": 2.5, "DET": 3.0, "LRN": 3.0,  # Analitik düşük
        "DIS": 3.5
    },
    "Genel Yönetici": {
        "LID": 4.5, "STR": 4.5, "COM": 4.0, "RES": 4.0,  # Liderlik ve strateji yüksek
        "TEA": 4.0, "ETH": 4.0, "DIS": 4.0,             # Yönetim yetkinlikleri
        "ANA": 3.5, "DIG": 3.0, "DET": 3.5, "LRN": 3.5   # Teknik orta
    },
    "Kıdemli Uzman": {
        "ANA": 4.0, "DIG": 4.0, "DET": 4.0, "LRN": 4.0,  # Teknik yetkinlikler yüksek
        "RES": 3.5, "TEA": 3.5, "ETH": 3.5, "DIS": 3.5,  # Diğerleri orta
        "LID": 2.5, "COM": 3.0, "STR": 2.5              # Liderlik düşük
    },
    "Uzman": {
        "ANA": 3.5, "DIG": 3.5, "DET": 3.5, "LRN": 3.5,  # Teknik yetkinlikler orta-yüksek
        "RES": 3.0, "TEA": 3.0, "ETH": 3.0, "DIS": 3.0,  # Diğerleri orta
        "LID": 2.0, "COM": 3.0, "STR": 2.0              # Liderlik düşük
    },
    "Direktörlük/Liderlik": {
        "LID": 5.0, "STR": 5.0, "COM": 4.5, "RES": 4.5,  # Liderlik zirve
        "TEA": 4.5, "ETH": 4.5, "DIS": 4.5,             # Yönetim yetkinlikleri yüksek
        "ANA": 4.0, "DIG": 3.5, "DET": 4.0, "LRN": 4.0   # Teknik yeterli
    },
    "Yöneticilik": {
        "LID": 4.0, "STR": 4.0, "COM": 4.0, "RES": 4.0,  # Liderlik yüksek
        "TEA": 4.0, "ETH": 4.0, "DIS": 4.0,             # Yönetim yetkinlikleri
        "ANA": 3.5, "DIG": 3.0, "DET": 3.5, "LRN": 3.5   # Teknik orta
    },
    "Kıdemli Uzmanlık": {
        "ANA": 4.0, "DIG": 4.0, "DET": 4.0, "LRN": 4.0,  # Teknik yetkinlikler yüksek
        "RES": 3.5, "TEA": 3.5, "ETH": 3.5, "DIS": 3.5,  # Diğerleri orta
        "LID": 2.5, "COM": 3.0, "STR": 2.5              # Liderlik düşük
    },
    "Uzmanlık": {
        "ANA": 3.5, "DIG": 3.5, "DET": 3.5, "LRN": 3.5,  # Teknik yetkinlikler orta
        "RES": 3.0, "TEA": 3.0, "ETH": 3.0, "DIS": 3.0,  # Diğerleri orta
        "LID": 2.0, "COM": 3.0, "STR": 2.0              # Liderlik düşük
    },
    # Varsayılan profil (Tanımsız roller için)
    "default": {
        "ANA": 3.5, "DIG": 3.5, "DET": 3.5, "LRN": 3.5,
        "RES": 3.5, "TEA": 3.5, "ETH": 3.5, "DIS": 3.5,
        "LID": 3.5, "COM": 3.5, "STR": 3.5
    }
}

# --- YENİ: BİR ÜST BASAMAK HEDEF PROFİLİ BELİRLEME ---
def get_next_level_target(position_name):
    """
    Kişinin mevcut unvanına bakarak bir üst rol için gereken yetkinlik profilini belirler.
    Artık tek bir sayı değil, her yetkinlik için hedef puan içeren bir sözlük döndürür.
    
    Returns:
        tuple: (target_profile_dict, target_role_name)
        - target_profile_dict: Her yetkinlik kodu için hedef puan içeren sözlük
        - target_role_name: Hedef rolün adı
    """
    pos = str(position_name).lower()
    
    # 1. Mevcut: Müdür/Yönetici -> Hedef: Direktörlük/Liderlik
    if any(x in pos for x in ['müdür', 'yönetici', 'lider', 'manager', 'head']):
        target_role = "Direktörlük/Liderlik"
        
    # 2. Mevcut: Kıdemli/Senior -> Hedef: Yöneticilik
    elif any(x in pos for x in ['kıdemli', 'senior', 'chief', 'lead']):
        target_role = "Yöneticilik"
        
    # 3. Mevcut: Uzman/Mühendis -> Hedef: Kıdemli Uzmanlık
    elif any(x in pos for x in ['uzman', 'specialist', 'mühendis', 'analist', 'sorumlu']):
        target_role = "Kıdemli Uzmanlık"
        
    # 4. Mevcut: Asistan/Stajyer/Yardımcı -> Hedef: Uzmanlık
    elif any(x in pos for x in ['asistan', 'stajyer', 'yardımcı', 'eleman']):
        target_role = "Uzmanlık"
        
    # Varsayılan (Tanımsız Roller İçin)
    else:
        target_role = "Bir Üst Rol"
    
    # Rol bazlı profil seçimi
    if target_role in ROLE_TARGET_PROFILES:
        profile = ROLE_TARGET_PROFILES[target_role].copy()
    else:
        # Pozisyon tipine göre özel profil seçimi
        if any(x in pos for x in ['satış', 'sales', 'müşteri']):
            profile = ROLE_TARGET_PROFILES["Satış Müdürü"].copy()
        elif any(x in pos for x in ['teknik', 'mühendis', 'yazılım', 'it', 'developer']):
            profile = ROLE_TARGET_PROFILES["Teknik Lider"].copy()
        else:
            profile = ROLE_TARGET_PROFILES["default"].copy()
    
    # Eksik yetkinlikler için varsayılan değer ekle
    for code in COMPETENCIES_360.keys():
        if code not in profile:
            profile[code] = ROLE_TARGET_PROFILES["default"].get(code, 3.5)
    
    return profile, target_role

# --- KARAR MOTORU ---
def check_readiness(score, target_score, context="promotion"):
    """
    context="promotion" -> TERFİ: Hedef Puan, Tolerans 0.50
    """
    if context == "recruitment":
        tolerance = 1.00
    elif context == "promotion":
        tolerance = 0.50 
    else:
        tolerance = 0.0

    gap = target_score - score
    
    # Eğer puan hedeften büyükse veya fark tolerans içindeyse
    is_ready = False
    if score >= target_score:
        return True, gap, tolerance # Tam Hazır
    elif gap <= tolerance:
        return True, gap, tolerance # Tolerans Dahilinde (Hazır sayılır)
    else:
        return False, gap, tolerance # Hazır Değil

# --- 1. VERİ HAZIRLAMA ---
def get_talent_data():
    org_data = get_allowed_data()
    if not org_data: return pd.DataFrame()
    
    df_org = pd.DataFrame(org_data)
    
    raw_360 = load_360_data()
    if 'db_360' in st.session_state and st.session_state.db_360:
        raw_360 = st.session_state.db_360
        
    df_360 = pd.DataFrame(raw_360) if raw_360 else pd.DataFrame()
    
    if not df_360.empty:
        if 'Personel' not in df_360.columns and 'target' in df_360.columns:
            df_360.rename(columns={'target': 'Personel'}, inplace=True)
            
        df_merged = pd.merge(df_org, df_360, left_on='Ad Soyad', right_on='Personel', how='left', suffixes=('', '_y'))
        
        if 'Performans_y' in df_merged.columns: 
            df_merged['Performans'] = df_merged['Performans'].fillna(df_merged['Performans_y'])
        if 'Potansiyel_y' in df_merged.columns: 
            df_merged['Potansiyel'] = df_merged['Potansiyel'].fillna(df_merged['Potansiyel_y'])
            
        return df_merged
    return df_org

# --- 2. 9-BOX KATEGORİZASYON ---
def categorize_9box(perf, pot):
    p_cat = 0 if perf < 3.0 else (1 if perf < 4.0 else 2)
    pot_cat = 0 if pot < 3.0 else (1 if pot < 4.0 else 2)
    
    if pot_cat == 2 and p_cat == 2: return "1. Yıldız Oyuncu (Star)"
    if pot_cat == 2 and p_cat == 1: return "2. Yüksek Potansiyel (High Pot)"
    if pot_cat == 1 and p_cat == 2: return "3. Yüksek Performans (High Perf)"
    if pot_cat == 2 and p_cat == 0: return "4. Soru İşareti (Enigma)"
    if pot_cat == 1 and p_cat == 1: return "5. Kilit Oyuncu (Core)"
    if pot_cat == 0 and p_cat == 2: return "6. Güvenilir Profesyonel"
    if pot_cat == 1 and p_cat == 0: return "7. Uyumsuz (Inconsistent)"
    if pot_cat == 0 and p_cat == 1: return "8. Etkili Oyuncu (Solid)"
    if pot_cat == 0 and p_cat == 0: return "9. Riskli (Underperformer)"
    return "Tanımsız"

# --- 3. AKILLI GAP ANALİZİ VE YORUM MOTORU ---
def analyze_gap_smart(person_name, position, df_360):
    if df_360.empty or 'Personel' not in df_360.columns: return None, None
    person_data = df_360[df_360['Personel'] == person_name]
    if person_data.empty: return None, None
    row = person_data.iloc[0]
    
    # --- A) ROL BAZLI DİNAMİK HEDEF PROFİLİ ---
    # Artık her yetkinlik için kendi hedefi var
    target_profile, target_role_name = get_next_level_target(position)
    
    role_type = "Genel"
    pos_lower = str(position).lower()
    if "müdür" in pos_lower or "yönetici" in pos_lower: role_type = "Yönetici"
    elif "satış" in pos_lower: role_type = "Satış"
    elif "uzman" in pos_lower or "mühendis" in pos_lower: role_type = "Teknik"
    elif "operasyon" in pos_lower: role_type = "Operasyon"

    critical_codes = ROLE_CRITICAL_MAP.get(role_type, ROLE_CRITICAL_MAP["Genel"])

    # --- B) VERİ TOPLAMA VE ANALİZ (YETKİNLİK BAZLI HEDEFLER) ---
    radar_data = {"cat": [], "curr": [], "tgt": []}
    analysis_report = {"critical_fail": [], "moderate_gap": [], "strength": []}
    
    # Ortalama hedef skoru (görselleştirme için)
    avg_target = sum(target_profile.values()) / len(target_profile) if target_profile else 3.5
    
    for code, name in COMPETENCIES_360.items():
        val = row.get(f"{code}_Mgr") or row.get(f"{code}_Mgr2") or row.get(f"{code}_Peer") or 0
        val = float(val)
        
        # Her yetkinlik için kendi hedefi
        target_score = target_profile.get(code, ROLE_TARGET_PROFILES["default"].get(code, 3.5))
        
        radar_data["cat"].append(name)
        radar_data["curr"].append(val)
        radar_data["tgt"].append(target_score)
        
        gap = val - target_score
        is_critical = code in critical_codes
        
        if gap < 0:
            detail = {
                "name": name, "current": val, "target": target_score,
                "gap": gap, "is_critical": is_critical, "code": code
            }
            if is_critical and gap <= -0.5:
                analysis_report["critical_fail"].append(detail)
            else:
                analysis_report["moderate_gap"].append(detail)
        elif gap >= 0.5:
            analysis_report["strength"].append({"name": name, "val": val, "code": code})

    # --- C) GRAFİK OLUŞTURMA ---
    radar_data["cat"] += [radar_data["cat"][0]]
    radar_data["curr"] += [radar_data["curr"][0]]
    radar_data["tgt"] += [radar_data["tgt"][0]]

    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(
        r=radar_data["tgt"], theta=radar_data["cat"],
        fill='toself', name=f'Hedef Profil (Ort: {avg_target:.1f})',
        line_color='rgba(255, 0, 0, 0.4)', fillcolor='rgba(255, 0, 0, 0.05)'
    ))
    fig.add_trace(go.Scatterpolar(
        r=radar_data["curr"], theta=radar_data["cat"],
        fill='toself', name='Mevcut Puan',
        line_color='deepskyblue', fillcolor='rgba(0, 191, 255, 0.2)'
    ))
    fig.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 5])),
        margin=dict(t=30, b=30, l=40, r=40),
        height=350,
        legend=dict(orientation="h", y=-0.1),
        title=f"Yetkinlik Kıyaslaması: {target_role_name}"
    )
    
    return fig, analysis_report

# --- ANA EKRAN ---
def render_talent_dashboard():
    st.header("📊 Yetenek Matrisi (Analiz ve Teşhis)")
    
    if 'current_user' not in st.session_state:
        st.warning("Giriş yapmalısınız.")
        return
    
    df = get_talent_data()
    if df.empty:
        st.warning("Görüntülenecek veri yok.")
        return

    # 1. 9-BOX SCATTER
    fig = px.scatter(
        df, x="Performans", y="Potansiyel", color="Departman",
        hover_data=["Ad Soyad", "Pozisyon"],
        size="Maaş (TL)" if "Maaş (TL)" in df.columns else None,
        title="Genel Yetenek Dağılımı",
        range_x=[0.5, 5.5], range_y=[0.5, 5.5]
    )
    fig.add_hline(y=3.0, line_dash="dash", line_color="gray")
    fig.add_hline(y=4.0, line_dash="dash", line_color="gray")
    fig.add_vline(x=3.0, line_dash="dash", line_color="gray")
    fig.add_vline(x=4.0, line_dash="dash", line_color="gray")
    st.plotly_chart(fig, use_container_width=True)

    # 2. DETAYLI ANALİZ
    st.divider()
    st.subheader("🔍 Kişi Bazlı Derinlemesine Analiz")
    
    col_select, col_chart = st.columns([1, 2])
    
    with col_select:
        selected_person = st.selectbox("Analiz Edilecek Personel:", sorted(df['Ad Soyad'].unique()))
        
        person_row = df[df['Ad Soyad'] == selected_person].iloc[0]
        perf = float(person_row.get('Performans', 0))
        pot = float(person_row.get('Potansiyel', 0))
        pos = person_row.get('Pozisyon', 'Uzman')
        
        box_name = categorize_9box(perf, pot)
        
        st.info(f"📍 **{box_name}**")
        st.write(f"**Pozisyon:** {pos}")
        c1, c2 = st.columns(2)
        c1.metric("Perf.", f"{perf:.1f}")
        c2.metric("Pot.", f"{pot:.1f}")
        
        st.markdown("---")
        
        # --- DİNAMİK TERFİ ANALİZİ ---
        st.markdown("### 🚀 Terfi Durumu")
        
        # 1. Kişiye özel hedef profili belirle
        target_profile, target_role_name = get_next_level_target(pos)
        
        # 2. Ortalama hedef skoru hesapla (potansiyel karşılaştırması için)
        avg_target_score = sum(target_profile.values()) / len(target_profile) if target_profile else 3.5
        
        # 3. Hazırlık durumunu kontrol et (ortalama hedefe göre)
        is_ready, gap, tol = check_readiness(pot, avg_target_score, context="promotion")
        
        st.caption(f"Bir Üst Rol Hedefi: **{target_role_name}**")
        st.caption(f"Ortalama Hedef Yetkinlik Skoru: **{avg_target_score:.1f}**")
        
        if is_ready:
            if pot >= avg_target_score:
                st.success(f"✅ **TAM HAZIR**\n\n(Puan: {pot:.1f} >= {avg_target_score:.1f})")
            else:
                st.warning(f"🟡 **TOLERANS DAHİLİNDE**\n\n(Hedef: {avg_target_score:.1f}, Puan: {pot:.1f})\n*Destekle Terfi Edilebilir.*")
        else:
            st.error(f"⛔ **HAZIR DEĞİL**\n\n(Hedef: {avg_target_score:.1f}, Puan: {pot:.1f})\n*Fark ({gap:.1f}), 0.50 toleransın üzerinde.*")
        
        # 4. Yetkinlik bazlı hedef özeti
        with st.expander("📋 Hedef Yetkinlik Profili Detayı"):
            st.write(f"**Hedef Rol:** {target_role_name}")
            cols = st.columns(3)
            for idx, (code, target_val) in enumerate(sorted(target_profile.items())):
                comp_name = COMPETENCIES_360.get(code, code)
                with cols[idx % 3]:
                    st.metric(comp_name, f"{target_val:.1f}")

    with col_chart:
        raw_360 = load_360_data()
        df_360 = pd.DataFrame(raw_360) if raw_360 else pd.DataFrame()
        
        fig_radar, analysis = analyze_gap_smart(selected_person, pos, df_360)
        
        if fig_radar:
            st.plotly_chart(fig_radar, use_container_width=True)
            
            st.markdown("### 🧠 Yapay Zeka Yorumu")
            
            with st.container(border=True):
                if analysis["critical_fail"]:
                    st.error("🚨 **Kritik Rol Gerekliliklerinde Uyumsuzluk!**")
                    st.write("Personel, bu pozisyon için *hayati önem taşıyan* aşağıdaki yetkinliklerde hedefin çok gerisinde:")
                    for item in analysis["critical_fail"]:
                        gap_val = abs(item['gap'])
                        st.markdown(f"* **{item['name']}**: Hedef **{item['target']:.1f}** iken mevcut **{item['current']:.1f}**. (Fark: -{gap_val:.1f})")
                
                if analysis["moderate_gap"]:
                    st.warning("⚠️ **Gelişim Alanları**")
                    st.write("Aşağıdaki alanlarda hedefe ulaşmak için desteğe ihtiyaç var:")
                    for item in analysis["moderate_gap"]:
                        priority = "Yüksek" if item['is_critical'] else "Orta"
                        st.markdown(f"* **{item['name']}**: Hedefin **{abs(item['gap']):.1f} puan** altında. (Öncelik: {priority})")
                
                if analysis["strength"]:
                    st.success("💎 **Güçlü Yönler**")
                    names = [x['name'] for x in analysis["strength"]]
                    st.write(f"Beklentinin üzerinde performans: **{', '.join(names)}**.")

                if not analysis["critical_fail"] and not analysis["moderate_gap"]:
                    st.balloons()
                    st.success("🏆 **Mükemmel Profil:** Personel, pozisyonun gerektirdiği tüm yetkinliklerde hedefin üzerinde!")

            st.info("💡 **Aksiyon:** Bu analiz ışığında eğitim planlamasını **'Gelişim Planı'** sekmesinden yapabilirsiniz.")
            
        else:
            st.warning("Bu personel için 360 verisi bulunamadı.")