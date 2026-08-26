# ui_manager_dashboard.py (V15.3 - FİLTRELER ANA SAYFAYA TAŞINDI)

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# --- AYARLAR ---
TARGET_SCORE = 4.5  # Hedef Puan

# --- GÜVENLİ IMPORT ---
try:
    from utils_db import load_org_chart, load_360_data
    from auth import get_allowed_data
    from config import COMPETENCIES_360
except ImportError:
    st.error("Veri bağlantı hatası.")
    def get_allowed_data(): return []
    def load_360_data(): return []
    COMPETENCIES_360 = {}

# --- VERİ HAZIRLAMA ---
def get_dashboard_data():
    org_data = get_allowed_data()
    if not org_data: return pd.DataFrame()
    
    df_org = pd.DataFrame(org_data)
    
    # Temizlik
    cols_to_drop = [c for c in ['Performans', 'Potansiyel'] if c in df_org.columns]
    if cols_to_drop: df_org = df_org.drop(columns=cols_to_drop)

    raw_360 = load_360_data()
    df_360 = pd.DataFrame(raw_360) if raw_360 else pd.DataFrame()
    
    if not df_360.empty:
        if 'Personel' not in df_360.columns and 'target' in df_360.columns:
            df_360.rename(columns={'target': 'Personel'}, inplace=True)
        
        # Tüm sütunlarla birleştir (Yetkinlik detayları için)
        df_merged = pd.merge(df_org, df_360, left_on='Ad Soyad', right_on='Personel', how='left', suffixes=('', '_360'))
        
        df_merged['Performans'] = df_merged['Performans'].fillna(0)
        df_merged['Potansiyel'] = df_merged['Potansiyel'].fillna(0)
        return df_merged
    
    df_org['Performans'] = 0
    df_org['Potansiyel'] = 0
    return df_org

# --- 🧠 YAPAY ZEKA YORUM VE AKSİYON MOTORU ---
def generate_ai_insights(df, avg_perf):
    st.markdown("### 🧠 Yapay Zeka Stratejik Analiz")
    container = st.container(border=True)
    with container:
        c1, c2 = st.columns([2, 1])
        
        with c1:
            # Genel Durum
            if avg_perf >= TARGET_SCORE:
                st.success(f"🚀 **Harika Durum:** Ekip ortalaması ({avg_perf:.1f}), hedefi ({TARGET_SCORE}) aşıyor. Yüksek performansı ödüllendirme zamanı.")
            elif avg_perf >= (TARGET_SCORE - 0.5):
                st.warning(f"⚠️ **Takip Gerekli:** Ekip ortalaması ({avg_perf:.1f}), hedefe yakın ancak desteklenmeli.")
            else:
                st.error(f"🚨 **Kritik:** Ekip ortalaması ({avg_perf:.1f}), hedefin çok altında. Acil gelişim planı gerekli.")

            # Aksiyon Önerileri
            high_risk_count = len(df[(df['Performans'] > 0) & (df['Performans'] < 3.0)])
            stars_count = len(df[(df['Performans'] >= 4.5) & (df['Potansiyel'] >= 4.0)])
            
            if stars_count > 0:
                st.info(f"💡 **Tavsiye:** {stars_count} adet 'Yıldız Personel' tespit edildi. Onları kaybetmemek için 'Yedekleme Planı'na dahil edin.")
            if high_risk_count > 0:
                st.info(f"💡 **Aksiyon:** {high_risk_count} personel kritik seviyenin altında. Onlar için koçluk veya eğitim ataması yapın.")

        with c2:
            # Odak Departman
            if 'Departman' in df.columns:
                dept_stats = df[df['Performans'] > 0].groupby('Departman')['Performans'].mean()
                if not dept_stats.empty:
                    worst_dept = dept_stats.idxmin()
                    worst_score = dept_stats.min()
                    if worst_score < TARGET_SCORE:
                        st.metric(label="📉 Odaklanılması Gereken", value=worst_dept, delta=f"{worst_score:.1f} (Düşük)")

# --- SEKME 1: LİSTELER ---
def render_tab_overview(df):
    col_top, col_risk = st.columns(2)
    with col_top:
        st.subheader("🏆 Top 10 Yetenek (Yıldız Adayları)")
        if 'Performans' in df.columns:
            # Skor = Performans + Potansiyel
            df['Score'] = df['Performans'] + df['Potansiyel']
            top_10 = df.sort_values(by='Score', ascending=False).head(10)
            
            if not top_10.empty and top_10['Score'].sum() > 0:
                st.dataframe(
                    top_10[['Ad Soyad', 'Departman', 'Performans', 'Potansiyel']], 
                    hide_index=True, use_container_width=True,
                    column_config={
                        "Performans": st.column_config.ProgressColumn("Perf.", format="%.1f", min_value=0, max_value=5),
                        "Potansiyel": st.column_config.NumberColumn("Pot.", format="%.1f")
                    }
                )
            else: st.info("Yeterli veri yok.")
    
    with col_risk:
        st.subheader("⚠️ Riskli Grup (Düşük Performans)")
        risk_list = df[(df['Performans'] > 0) & (df['Performans'] < 3.5)].sort_values(by='Performans', ascending=True)
        if not risk_list.empty:
            st.dataframe(
                risk_list[['Ad Soyad', 'Departman', 'Performans']], 
                hide_index=True, use_container_width=True,
                column_config={"Performans": st.column_config.ProgressColumn("Perf.", format="%.1f", min_value=0, max_value=5, help="3.5 altı riskli kabul edilir")}
            )
        else: st.success("Riskli personel bulunmuyor.")

    st.markdown("---")
    with st.expander("📋 Tüm Personel Listesi (Detaylı)", expanded=False):
        st.dataframe(df[['Ad Soyad', 'Departman', 'Pozisyon', 'Performans', 'Potansiyel', 'Maaş (TL)']], use_container_width=True, hide_index=True)

# --- SEKME 2: DEPARTMAN KPI ---
def render_tab_departments(df):
    st.subheader("🏢 Departman Bazlı Performans Karşılaştırması")
    if 'Departman' in df.columns:
        dept_stats = df[df['Performans'] > 0].groupby('Departman')[['Performans', 'Potansiyel']].mean().reset_index()
        if not dept_stats.empty:
            fig = px.bar(dept_stats, x="Departman", y="Performans", color="Performans", 
                         title=f"Departman Ortalamaları vs Hedef ({TARGET_SCORE})", text_auto='.1f',
                         color_continuous_scale=["#FF5252", "#FFD740", "#69F0AE"]) # Kırmızı-Sarı-Yeşil
            fig.add_hline(y=TARGET_SCORE, line_dash="dot", line_color="black", annotation_text="Hedef")
            st.plotly_chart(fig, use_container_width=True)
            
            # Detay Tablo
            st.dataframe(dept_stats.style.highlight_max(axis=0, color='#dcedc8'), hide_index=True, use_container_width=True)
        else: st.info("Grafik için yeterli veri yok.")

# --- SEKME 3: GRAFİKLER ---
def render_tab_charts(df):
    st.subheader("📈 Stratejik Analiz Grafikleri")
    
    # Veri Hazırlığı
    plot_df = df[df['Performans'] > 0].copy()
    if plot_df.empty:
        st.warning("Grafikler için yeterli performans verisi yok.")
        return

    # Maaş verisi var mı kontrol et
    size_col = 'Maaş (TL)' if 'Maaş (TL)' in plot_df.columns and plot_df['Maaş (TL)'].sum() > 0 else None
    
    c1, c2 = st.columns(2)
    
    # 1. 9-BOX SCATTER
    with c1:
        st.markdown("##### 🧩 Performans vs Potansiyel (Talent Matrix)")
        fig_scatter = px.scatter(
            plot_df, x="Performans", y="Potansiyel", 
            color="Departman", 
            size=size_col, 
            hover_name="Ad Soyad",
            hover_data=["Pozisyon"],
            range_x=[0.5, 5.5], range_y=[0.5, 5.5],
            title="Yetenek Konumlandırma"
        )
        # 9-Box Çizgileri
        fig_scatter.add_vline(x=3.0, line_dash="dash", line_color="gray", opacity=0.5)
        fig_scatter.add_vline(x=4.0, line_dash="dash", line_color="gray", opacity=0.5)
        fig_scatter.add_hline(y=3.0, line_dash="dash", line_color="gray", opacity=0.5)
        fig_scatter.add_hline(y=4.0, line_dash="dash", line_color="gray", opacity=0.5)
        
        # Bölgeleri İsimlendir
        fig_scatter.add_annotation(x=5, y=5, text="YILDIZLAR", showarrow=False, font=dict(color="green"))
        fig_scatter.add_annotation(x=1.5, y=1.5, text="RİSKLİ", showarrow=False, font=dict(color="red"))
        
        st.plotly_chart(fig_scatter, use_container_width=True)

    # 2. MAAŞ vs PERFORMANS
    with c2:
        st.markdown("##### 💰 Maaş vs Performans (Verimlilik)")
        if size_col:
            fig_salary = px.scatter(
                plot_df, x="Performans", y="Maaş (TL)",
                color="Departman",
                hover_name="Ad Soyad",
                title="Maaş Performans İlişkisi"
            )
            st.plotly_chart(fig_salary, use_container_width=True)
            st.caption("Yüksek performans gösterip düşük maaş alanlar 'Fırsat', tam tersi 'Risk' olabilir.")
        else:
            st.info("Maaş verisi olmadığı için bu grafik gösterilemiyor.")

    # 3. DAĞILIM PASTA GRAFİĞİ
    st.divider()
    def perf_cat(x):
        if x == 0: return "Veri Yok"
        if x < 3.5: return "Düşük (Risk)"
        if x < 4.5: return "Orta (Standart)"
        return "Yüksek (Yıldız)"
    
    plot_df['Segment'] = plot_df['Performans'].apply(perf_cat)
    pie_data = plot_df['Segment'].value_counts().reset_index()
    pie_data.columns = ['Segment', 'Kişi Sayısı']
    
    fig_pie = px.pie(
        pie_data, names='Segment', values='Kişi Sayısı', hole=0.4, 
        color='Segment', 
        color_discrete_map={"Yüksek (Yıldız)":"#4CAF50", "Orta (Standart)":"#FFC107", "Düşük (Risk)":"#F44336"},
        title="Genel Performans Dağılımı"
    )
    st.plotly_chart(fig_pie, use_container_width=True)

# --- SEKME 4: YETKİNLİK ANALİZİ ---
def render_tab_competencies(df):
    st.subheader("🧠 Yetkinlik Analizi")
    
    # Yetkinlik Kolonlarını Belirle
    comp_cols = []
    rename_map = {}
    for code, name in COMPETENCIES_360.items():
        col_mgr = f"{code}_Mgr"
        if col_mgr in df.columns:
            comp_cols.append(col_mgr)
            rename_map[col_mgr] = name

    if not comp_cols:
        st.warning("Henüz yetkinlik verisi oluşmamış.")
        return

    # 1. RADAR GRAFİĞİ (GENEL)
    avg_values = df[comp_cols].mean().fillna(0).tolist()
    cat_names = list(rename_map.values())
    
    # Kapatma
    avg_values += [avg_values[0]]
    cat_plot = cat_names + [cat_names[0]]

    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(r=[TARGET_SCORE]*len(cat_plot), theta=cat_plot, fill='toself', name=f'Hedef ({TARGET_SCORE})', line_color='red', opacity=0.1))
    fig.add_trace(go.Scatterpolar(r=avg_values, theta=cat_plot, fill='toself', name='Filtrelenmiş Ekip Ort.', line_color='#2196F3', opacity=0.6))
    fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 5])), height=350, title="Genel Yetkinlik Radarı")
    st.plotly_chart(fig, use_container_width=True)
    
    st.divider()

    # 2. DEPARTMAN BAZLI YETKİNLİK KIRILIMI
    if 'Departman' in df.columns:
        st.subheader("🏢 Departman Bazlı Yetkinlik Kırılımı")
        dept_comp_df = df.groupby('Departman')[comp_cols].mean().reset_index()
        dept_comp_df.rename(columns=rename_map, inplace=True)
        
        cfg = {}
        for cname in list(rename_map.values()):
            cfg[cname] = st.column_config.ProgressColumn(cname, min_value=0, max_value=5, format="%.1f")
            
        st.dataframe(dept_comp_df, hide_index=True, use_container_width=True, column_config=cfg)
    
    st.divider()

    # 3. KİŞİ BAZLI DETAY LİSTESİ
    st.subheader("🔍 Kişi Bazlı Yetkinlik Detayı")
    cols_person = ['Ad Soyad', 'Departman'] + comp_cols
    person_df = df[cols_person].copy()
    person_df.rename(columns=rename_map, inplace=True)
    person_df = person_df.fillna(0)
    
    st.dataframe(person_df, hide_index=True, use_container_width=True, column_config=cfg)

# --- ANA RENDER ---
def render_dashboard():
    st.header(f"🏠 Yönetici Kokpiti (Hedef: {TARGET_SCORE})")
    
    if 'current_user' not in st.session_state: return
    df = get_dashboard_data()
    if df.empty: st.warning("Veri yok."); return

    # --- FİLTRELEME ALANI (ANA SAYFA - EXPANDER) ---
    with st.expander("🔍 Kokpit Filtreleri (Departman Seçimi)", expanded=True):
        if 'Departman' in df.columns:
            all_depts = sorted(df['Departman'].unique().tolist())
            # Default olarak hepsi seçili gelsin
            selected_depts = st.multiselect("Departmanları Filtrele:", all_depts, default=all_depts)
            
            if selected_depts:
                df = df[df['Departman'].isin(selected_depts)]
            else:
                st.error("Lütfen en az bir departman seçin.")
                return # Seçim yoksa gösterme

    # --- KPI KARTLARI ---
    active = df[df['Performans']>0]
    avg_p = active['Performans'].mean() if not active.empty else 0
    
    # Renk mantığı
    clr_perf = "normal" if avg_p >= TARGET_SCORE else "inverse"
    
    # Yıldızlar ve Riskler
    stars_count = len(df[(df['Performans']>=4.5) & (df['Potansiyel']>=4.0)])
    risky_count = len(df[(df['Performans']>0) & (df['Performans']<3.5)])
    
    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Görüntülenen Ekip", len(df), "👤")
    k2.metric("Ortalama Perf.", f"{avg_p:.1f}", f"{avg_p-TARGET_SCORE:.1f} Fark", delta_color=clr_perf)
    k3.metric("Riskli Personel", risky_count, "⚠️ Aksiyon Al", delta_color="inverse")
    k4.metric("Yıldızlar", stars_count, "⭐ Tutundur", delta_color="normal")
    
    st.divider()
    if avg_p > 0: generate_ai_insights(df, avg_p)
    st.write("")

    # TABS
    t1, t2, t3, t4 = st.tabs(["📋 Özet", "🏢 Departman Perf.", "📊 Grafikler (Matrix)", "🧠 Yetkinlik Analizi"])
    with t1: render_tab_overview(df)
    with t2: render_tab_departments(df)
    with t3: render_tab_charts(df)
    with t4: render_tab_competencies(df)