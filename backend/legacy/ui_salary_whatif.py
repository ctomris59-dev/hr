# ui_salary_whatif.py (V77.0 - SENARYO B: TAM MATRİS VE PİYASA KURTARMA MODU)

import streamlit as st
import pandas as pd
import plotly.express as px
import numpy as np
import time
import re

# --- IMPORT KONTROLÜ ---
try:
    from utils_db import load_org_chart, load_360_data, save_org_chart, calculate_net_salary
except ImportError:
    def load_org_chart(): return []
    def load_360_data(): return []
    def save_org_chart(data): pass
    def calculate_net_salary(x): return {}

# --- SESSION RESET ---
def reset_simulation():
    if 'sim_results' in st.session_state:
        del st.session_state.sim_results

# --- 1. KIDEM TAVANI (CR CAP - Hedef Çarpanlar) ---
# Senaryo B'de değerli personel bu oranlara tamamlanacak.
def get_tenure_max_cap(years):
    try: y = float(years)
    except: y = 1.0
    
    if y <= 2: return 0.75      # 0-2 Yıl (Çaylak) -> Piyasanın %75'i
    elif y <= 4: return 0.90    # 3-4 Yıl (Gelişen) -> Piyasanın %90'ı
    elif y <= 9: return 1.00    # 5-9 Yıl (Tam Piyasa) -> Piyasanın %100'ü
    elif y <= 14: return 1.25   # 10-14 Yıl (Kıdemli) -> Piyasa + %25
    elif y <= 19: return 1.35   # 15-19 Yıl (Yüksek Kıdem)
    else: return 1.50           # 20+ Yıl (Duayen)

# --- 2. PROFİL MATRİSİ (SİZİN TANIMLARINIZLA BİREBİR) ---
def get_employee_segment(perf, pot, tenure):
    # 1. YILDIZ (Perf >= 4.5, Pot >= 4.0)
    if perf >= 4.5 and pot >= 4.0: return "🌟 YILDIZ"
    
    # 2. YÜKSEK PERFORMANS (Perf >= 4.5, Pot 3.0-3.99)
    if perf >= 4.5 and 3.0 <= pot <= 3.99: return "🚀 YÜKSEK PERFORMANS"
    
    # 3. PERFORMANS (Perf >= 4.5, Pot < 3.0)
    if perf >= 4.5 and pot < 3.0: return "⚡ PERFORMANS"
    
    # 4. KİLİT OYUNCU GRUBU (Perf 4.0-4.49, Pot >= 4.0)
    if 4.0 <= perf <= 4.49 and pot >= 4.0:
        if tenure <= 5: return "🛡️ KİLİT OYUNCU"
        else: return "⚓ KIDEMLİ KİLİT OYUNCU"

    # 5. STANDART (Perf 4.0-4.49, Pot 3.0-3.99)
    if 4.0 <= perf <= 4.49 and 3.0 <= pot <= 3.99: return "⚖️ STANDART"
    
    # 6. GELİŞTİRİLEBİLİR (Perf 4.0-4.49, Pot < 3.0)
    if 4.0 <= perf <= 4.49 and pot < 3.0: return "🌱 GELİŞTİRİLEBİLİR"
    
    # 7. VASAT PERFORMANS (Perf 3.5-3.99, Pot 3.0-3.99)
    if 3.5 <= perf <= 3.99 and 3.0 <= pot <= 3.99: return "📉 VASAT PERFORMANS"
    
    # 8. DÜŞÜK PERFORMANS (Perf 3.5-3.99, Pot < 3.0)
    if 3.5 <= perf <= 3.99 and pot < 3.0: return "⚠️ DÜŞÜK PERFORMANS"
    
    # 9. POTANSİYEL YATIRIMI (Perf < 3.5, Pot >= 4.0)
    if perf < 3.5 and pot >= 4.0: return "💎 POTANSİYEL YATIRIMI"
    
    # 10. KRİTİK ALTI (Diğerleri)
    return "⛔ KRİTİK ALTI"

# --- 3. DURUM ANALİZİ ---
def analyze_strategic_status(cr, tenure):
    limit = get_tenure_max_cap(tenure)
    if cr > limit + 0.02: return f"🔵 Limit Üstü (> {limit})"
    if tenure > 2 and cr < 0.80: return "🟠 Kritik Düşük"
    if cr < (limit - 0.15): return f"🟡 Alt Bant"
    return "🟢 Dengeli"

# --- 4. VERİ YÜKLEME ---
def load_live_data_forced():
    raw_data = load_org_chart()
    if not raw_data: return pd.DataFrame()
    raw_360 = load_360_data()
    df_360 = pd.DataFrame(raw_360) if raw_360 else pd.DataFrame()
    final_list = []
    
    for row in raw_data:
        r_clean = {str(k).lower().strip().replace(' ', '').replace('_', ''): v for k, v in row.items()}
        name = row.get('Ad Soyad', 'Bilinmeyen')
        dept = row.get('Departman', 'Genel')
        pos = row.get('Pozisyon', 'Personel')

        perf, pot = 3.0, 3.0
        if not df_360.empty:
            match_col = 'target' if 'target' in df_360.columns else 'Personel'
            if match_col in df_360.columns:
                p_match = df_360[df_360[match_col] == name]
                if not p_match.empty:
                    perf = float(p_match.iloc[0].get('Performans', 3.0))
                    pot = float(p_match.iloc[0].get('Potansiyel', 3.0))
        if perf == 3.0: perf = float(r_clean.get('performans', 3.0))
        if pot == 3.0: pot = float(r_clean.get('potansiyel', 3.0))

        maas = 45000.0
        if 'Maaş (TL)' in row:
            try: maas = float(row['Maaş (TL)'])
            except: pass
        else:
            for k in ['maaş', 'maas', 'salary']:
                matched_key = next((x for x in r_clean.keys() if k in x), None)
                if matched_key:
                    try:
                        val_str = str(r_clean[matched_key]).replace('.','').replace(',','').replace('₺','').strip()
                        maas = float(val_str)
                        break
                    except: pass

        tenure = 1.0
        if 'Calisma_Yili' in row: tenure = float(row['Calisma_Yili'])
        else:
            for k in ['calismayili', 'calisma', 'kıdem']:
                 matched = next((x for x in r_clean.keys() if k in x), None)
                 if matched:
                     try: nums = re.findall(r'\d+\.?\d*', str(r_clean[matched])); tenure = float(nums[0]) if nums else 1.0
                     except: pass

        final_list.append({
            'Ad Soyad': name, 'Departman': dept, 'Pozisyon': pos,
            'Mevcut Maaş': maas, 'Performans': perf, 'Potansiyel': pot,
            'Calisma_Yili': tenure, 
            'Profil': get_employee_segment(perf, pot, tenure) 
        })
    return pd.DataFrame(final_list)

# --- 5. BENCHMARK YÖNETİMİ ---
def manage_market_reference_data(df):
    if df.empty: return pd.DataFrame()
    real_benchmarks = df.groupby(['Departman', 'Pozisyon'])['Mevcut Maaş'].mean().round(-2).reset_index()
    real_benchmarks.rename(columns={'Mevcut Maaş': 'Hesaplanan_Ortalama'}, inplace=True)
    current_roles = df[['Departman', 'Pozisyon']].drop_duplicates()
    
    if 'market_data_ref' in st.session_state:
        existing = st.session_state.market_data_ref
        merged = pd.merge(current_roles, existing, on=['Departman', 'Pozisyon'], how='left')
        merged = pd.merge(merged, real_benchmarks, on=['Departman', 'Pozisyon'], how='left')
        merged['Piyasa Ortalaması'] = merged['Piyasa Ortalaması'].fillna(merged['Hesaplanan_Ortalama'])
        merged['Piyasa Ortalaması'] = merged['Piyasa Ortalaması'].fillna(45000.0)
        if 'Hesaplanan_Ortalama' in merged.columns: merged = merged.drop(columns=['Hesaplanan_Ortalama'])
        st.session_state.market_data_ref = merged
    else:
        real_benchmarks.rename(columns={'Hesaplanan_Ortalama': 'Piyasa Ortalaması'}, inplace=True)
        st.session_state.market_data_ref = real_benchmarks
        
    with st.expander("🏷️ Piyasa Rakamlarını Düzenle (Benchmark)", expanded=False):
        if st.button("🔄 Benchmarkları Güncel Veriye Göre Sıfırla"):
            real_benchmarks = df.groupby(['Departman', 'Pozisyon'])['Mevcut Maaş'].mean().round(-2).reset_index()
            real_benchmarks.rename(columns={'Mevcut Maaş': 'Piyasa Ortalaması'}, inplace=True)
            st.session_state.market_data_ref = real_benchmarks
            st.rerun()
        edited = st.data_editor(st.session_state.market_data_ref, use_container_width=True, hide_index=True)
        st.session_state.market_data_ref = edited
    return edited

# ==========================================
# 6. ÇİFT SENARYOLU HESAPLAMA MOTORU
# ==========================================
def run_scenario_logic(df, inflation_rate, mode="A"):
    sim = df.copy()
    sim['Piyasa_Gelecek'] = sim['Piyasa Ortalaması'] * (1 + inflation_rate/100.0)
    
    # Eski Durum
    sim['Eski_CR'] = sim['Mevcut Maaş'] / sim['Piyasa_Gelecek']
    sim['Eski Risk'] = sim.apply(lambda x: analyze_strategic_status(x['Eski_CR'], x['Calisma_Yili']), axis=1)
    
    def calculate_logic(row):
        current = row['Mevcut Maaş']
        profile = row['Profil']
        base_market = row['Piyasa_Gelecek'] 
        tenure = row['Calisma_Yili']
        
        # Hedef Kıdem Tavanı (Emniyet Sübabı ve Hedef Noktası)
        cap_cr = get_tenure_max_cap(tenure)
        max_allowed_salary = base_market * cap_cr
        
        raise_pct = 0.0
        potential_salary = current
        logic_desc = ""
        
        # -----------------------------------------------------------
        # SENARYO A: ESKİ SİSTEM (BÜTÇE DOSTU MATRİS)
        # -----------------------------------------------------------
        if mode == "A":
            if profile == "💎 POTANSİYEL YATIRIMI": raise_pct = inflation_rate * 0.50; logic_desc = "Enf/2 (Riskli)"
            elif profile == "⚠️ DÜŞÜK PERFORMANS": raise_pct = inflation_rate * 0.25; logic_desc = "%25 Enf"
            elif profile == "📉 VASAT PERFORMANS": raise_pct = inflation_rate * 0.50; logic_desc = "Enf/2"
            elif profile == "🌱 GELİŞTİRİLEBİLİR": raise_pct = inflation_rate * 0.75; logic_desc = "%75 Enf"
            elif profile == "⚖️ STANDART": raise_pct = inflation_rate; logic_desc = "Tam Enf"
            elif profile == "🛡️ KİLİT OYUNCU": raise_pct = inflation_rate + 2.0; logic_desc = "Enf+Düşük Prim"
            elif profile == "⚓ KIDEMLİ KİLİT OYUNCU": raise_pct = inflation_rate + 5.0; logic_desc = "Enf+Std Prim"
            elif profile == "⚡ PERFORMANS": raise_pct = inflation_rate + 5.0; logic_desc = "Enf+Std Prim"
            elif profile == "🚀 YÜKSEK PERFORMANS": raise_pct = inflation_rate + 5.0; logic_desc = "Enf+Std Prim"
            elif profile == "🌟 YILDIZ": raise_pct = inflation_rate + 10.0; logic_desc = "Enf+Yüksek Prim"
            else: raise_pct = 0.0; logic_desc = "0 Zam"
            
            potential_salary = current * (1 + raise_pct/100.0)

        # -----------------------------------------------------------
        # SENARYO B: PİYASA KURTARMA & EŞİTLEME MODU
        # -----------------------------------------------------------
        elif mode == "B":
            # 1. Adım: Önce Herkese Temel Enflasyon Zammı Ver (Düşük Performans Hariç)
            # Bu, kişinin "Piyasa Altında" kalıp kalmadığını görmek için bir testtir.
            
            temp_raise = inflation_rate
            if "DÜŞÜK" in profile or "VASAT" in profile or "KRİTİK" in profile:
                temp_raise = inflation_rate * 0.5 # Kötü performansa az ver
            
            test_salary = current * (1 + temp_raise/100.0)
            
            # 2. Adım: ALT BANT KONTROLÜ ve MÜDAHALE
            # Kişi zammı aldıktan sonra bile "Piyasa Tavanı"nın çok altındaysa
            # ve DEĞERLİ bir personelse, onu agresif kurallarla yukarı çek.
            
            valuable_profiles = [
                "🛡️ KİLİT OYUNCU", 
                "⚓ KIDEMLİ KİLİT OYUNCU", 
                "⚡ PERFORMANS", 
                "🚀 YÜKSEK PERFORMANS", 
                "🌟 YILDIZ"
            ]
            
            if profile in valuable_profiles:
                # -- KURAL SETİ (SİZİN BELİRLEDİĞİNİZ) --
                aggressive_raise = 0
                if profile == "🛡️ KİLİT OYUNCU": aggressive_raise = inflation_rate + 2.0
                elif profile in ["⚓ KIDEMLİ KİLİT OYUNCU", "⚡ PERFORMANS", "🚀 YÜKSEK PERFORMANS"]: aggressive_raise = inflation_rate + 5.0
                elif profile == "🌟 YILDIZ": aggressive_raise = inflation_rate + 10.0
                
                # Agresif Zammı Uygula
                salary_with_premium = current * (1 + aggressive_raise/100.0)
                
                # -- PİYASA TAMAMLAMA (KIDEM TAVANINA ÇEKME) --
                # Kural: Bu kişileri Kıdem Tavanlarına (Max CR) kadar doldur.
                # Örn: Junior Yıldız ise (0.75 CR), Senior Yıldız ise (1.25 CR) hedefle.
                
                target_salary = max_allowed_salary # Hedef: Kıdemin izin verdiği TAVAN
                
                # Hangisi yüksekse onu ver (Ya Primli Zam, ya da Piyasa Tavanı)
                # Amaç Alt Banttan kurtarıp dengeye veya üste taşımak.
                
                # Eğer Primli Zam bile Piyasa Tavanının altındaysa -> TAVANA TAMAMLA
                if salary_with_premium < target_salary:
                    potential_salary = target_salary
                    logic_desc = f"Alt Banttan Kurtarma (Hedef CR {cap_cr})"
                else:
                    potential_salary = salary_with_premium
                    logic_desc = f"Yüksek Primli Zam (%{aggressive_raise})"
            
            else:
                # Değerli olmayan personel için sadece hesaplanan temel zam kalır
                potential_salary = test_salary
                logic_desc = f"Standart/Düşük Zam (%{temp_raise})"

        # -----------------------------------------------------------
        # ORTAK KURAL: TAVAN AŞIMI KONTROLÜ (DONDURMA)
        # -----------------------------------------------------------
        # Eğer hesaplanan maaş tavanı deliyorsa, ve kişi zaten tavanda değilse, tavanda durdur.
        if potential_salary > max_allowed_salary:
            if current > max_allowed_salary:
                final_salary = current 
                explanation = f"Limit Üstü ({cap_cr} CR) - Dondurma"
            else:
                final_salary = max_allowed_salary 
                explanation = f"{logic_desc} (Limitlendi: {cap_cr} CR)"
        else:
            final_salary = potential_salary
            explanation = logic_desc

        return final_salary, explanation

    res_series = sim.apply(calculate_logic, axis=1)
    sim['Yeni Maaş'] = res_series.apply(lambda x: np.ceil(x[0] / 100) * 100)
    sim['Zam Açıklaması'] = res_series.apply(lambda x: x[1])
    sim['Zam Tutarı'] = sim['Yeni Maaş'] - sim['Mevcut Maaş']
    sim['Zam Oranı (%)'] = (sim['Zam Tutarı'] / sim['Mevcut Maaş']) * 100
    
    sim['Yeni_CR'] = sim['Yeni Maaş'] / sim['Piyasa_Gelecek']
    sim['Yeni Risk'] = sim.apply(lambda x: analyze_strategic_status(x['Yeni_CR'], x['Calisma_Yili']), axis=1)
    
    def calculate_deviation(row):
        cr = row['Yeni_CR']
        tenure = row['Calisma_Yili']
        limit = get_tenure_max_cap(tenure)
        target_entry_point = limit - 0.20 
        
        if tenure > 2 and cr < 0.80:
            diff_pct = (0.80 - cr) * 100
            return f"📉 -%{diff_pct:.1f} (Genel)"
        if cr < target_entry_point:
            diff_pct = (target_entry_point - cr) * 100
            return f"📉 -%{diff_pct:.1f} (Kendi)"
        return "-"

    sim['Risk Mesafesi'] = sim.apply(calculate_deviation, axis=1)
    return sim

# --- 7. GÖRSELLEŞTİRME ---
def plot_dept_scatter(data, x_col, y_col, color_col, size_col, title, y_label):
    dynamic_map = {}
    for risk_label in data[color_col].unique():
        if "🟢" in risk_label: dynamic_map[risk_label] = "#2E7D32"
        elif "🟡" in risk_label: dynamic_map[risk_label] = "#FFD700"
        elif "🟠" in risk_label: dynamic_map[risk_label] = "#FF5722"
        elif "🔵" in risk_label: dynamic_map[risk_label] = "#1976D2"
        else: dynamic_map[risk_label] = "#9E9E9E"

    fig = px.scatter(
        data, x=x_col, y=y_col, 
        color=color_col, size=size_col, 
        hover_name="Ad Soyad", title=title,
        color_discrete_map=dynamic_map, 
        labels={y_col: y_label}
    )
    # Referans Çizgileri
    fig.add_hline(y=1.00, line_dash="solid", line_color="green", annotation_text="Piyasa (1.0)")
    fig.add_hline(y=0.75, line_dash="dash", line_color="red", annotation_text="Çaylak Limiti")
    fig.add_hline(y=1.25, line_dash="dash", line_color="blue", annotation_text="Kıdemli Limiti")
    
    fig.update_layout(yaxis_range=[0.5, 1.6], height=350)
    return fig

# --- 8. ANA EKRAN ---
def render_salary_whatif_dashboard():
    st.title("🎯 Entegre Ücret Yönetimi")
    
    df = load_live_data_forced()
    if df.empty: 
        st.warning("Veri bulunamadı.")
        return

    if 'sim_results' in st.session_state:
        results = st.session_state.sim_results
        if isinstance(results, dict) and 'A' in results:
            if 'Risk Mesafesi' not in results['A'].columns:
                del st.session_state.sim_results
                st.rerun()

    tab1, tab2, tab3 = st.tabs(["💰 Simülasyon", "📊 Piyasa Analizi", "🧮 Brüt-Net Hesaplayıcı"])

    with tab1:
        st.divider()
        c_top1, c_top2 = st.columns([3, 1])
        with c_top1:
            inflation = st.number_input("Enflasyon Öngörüsü (%)", value=35, step=5, on_change=reset_simulation)
            st.caption("Her iki senaryo için de temel parametredir.")
        with c_top2:
            st.write(""); st.write("")
            if st.button("🔄 Sıfırla", type="secondary", use_container_width=True):
                reset_simulation()
                st.rerun()

        market_df = manage_market_reference_data(df)
        if 'Piyasa Ortalaması' in df.columns: df = df.drop(columns=['Piyasa Ortalaması'])
        df = pd.merge(df, market_df, on=['Departman', 'Pozisyon'], how='left')
        df['Piyasa Ortalaması'] = df['Piyasa Ortalaması'].fillna(45000.0)
        
        st.divider()

        if st.button("🚀 Senaryoları Karşılaştır (A vs B)", type="primary", use_container_width=True):
            with st.spinner("Senaryo A ve Senaryo B hesaplanıyor..."):
                res_a = run_scenario_logic(df, inflation, mode="A")
                res_b = run_scenario_logic(df, inflation, mode="B")
                st.session_state.sim_results = {"A": res_a, "B": res_b}
                st.rerun()

        if 'sim_results' in st.session_state:
            res_a = st.session_state.sim_results["A"]
            res_b = st.session_state.sim_results["B"]
            
            st.subheader("📊 Senaryo Karşılaştırması")
            
            total_old = df['Mevcut Maaş'].sum()
            total_new_a = res_a['Yeni Maaş'].sum()
            cost_a = total_new_a - total_old
            avg_raise_a = (cost_a / total_old) * 100
            
            total_new_b = res_b['Yeni Maaş'].sum()
            cost_b = total_new_b - total_old
            avg_raise_b = (cost_b / total_old) * 100
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                st.info("🅰️ Senaryo A: Bütçe Dostu (Standart)")
                st.markdown("""
                * **Mantık:** Sadece matris kuralları.
                * **Risk:** Alt bantta kalanlar orada kalabilir.
                * **Tavan:** Kıdem limitleri katı uygulanır.
                """)
                st.metric("Toplam Maliyet (Fark)", f"{cost_a:,.0f} ₺")
                st.metric("Ortalama Zam", f"%{avg_raise_a:.1f}")
                fig_a = px.scatter(res_a, x="Performans", y="Yeni_CR", color="Yeni Risk", title="Senaryo A: Risk Dağılımı", height=300)
                fig_a.add_hline(y=1.0, line_dash="solid", line_color="green")
                st.plotly_chart(fig_a, use_container_width=True)

            with col_b:
                st.success("🅱️ Senaryo B: Piyasa Eşitleme (Adil)")
                st.markdown("""
                * **Mantık:** Alt Banttaki Değerli Personeli Kurtarır.
                * **Hedef:** Kilit ve üstü profilleri Kıdem Tavanına (Ideal Konuma) taşır.
                * **Sonuç:** Alt bantta sadece düşük performanslılar kalır.
                """)
                diff_cost = cost_b - cost_a
                st.metric("Toplam Maliyet (Fark)", f"{cost_b:,.0f} ₺", delta=f"A'dan {diff_cost:,.0f} ₺ Fark", delta_color="inverse")
                st.metric("Ortalama Zam", f"%{avg_raise_b:.1f}")
                fig_b = px.scatter(res_b, x="Performans", y="Yeni_CR", color="Yeni Risk", title="Senaryo B: Dengeli Dağılım", height=300)
                fig_b.add_hline(y=1.0, line_dash="solid", line_color="green")
                st.plotly_chart(fig_b, use_container_width=True)

            st.divider()
            st.subheader("✅ Karar ve Onay")
            
            selected_scenario = st.radio("Hangi senaryoyu onaylıyorsunuz?", ["Senaryo A (Standart)", "Senaryo B (Eşitlemeli)"], horizontal=True)
            
            if st.button("Seçili Senaryoyu Uygula ve Kaydet 💾", type="primary", use_container_width=True):
                final_df = res_a if "A" in selected_scenario else res_b
                current_db = load_org_chart()
                updated_count = 0
                for person in current_db:
                    name = person.get('Ad Soyad')
                    sim_row = final_df[final_df['Ad Soyad'] == name]
                    if not sim_row.empty:
                        new_salary = int(sim_row.iloc[0]['Yeni Maaş'])
                        person['Maaş (TL)'] = new_salary
                        if 'Maaş' in person: person['Maaş'] = new_salary
                        updated_count += 1
                save_org_chart(current_db)
                if 'market_data_ref' in st.session_state:
                    st.session_state.market_data_ref['Piyasa Ortalaması'] = st.session_state.market_data_ref['Piyasa Ortalaması'] * (1 + inflation/100.0)
                st.balloons()
                st.success(f"✅ Başarılı! {selected_scenario} uygulandı.")
                del st.session_state.sim_results
                time.sleep(2)
                st.rerun()
            
            with st.expander("📋 Seçili Senaryo Detay Listesi (Tüm Veriler)"):
                target_df = res_a if "A" in selected_scenario else res_b
                
                display_cols = [
                    'Ad Soyad', 'Departman', 'Profil',
                    'Performans', 'Potansiyel', 
                    'Mevcut Maaş', 'Yeni Maaş', 
                    'Zam Oranı (%)', 'Zam Açıklaması',
                    'Eski Risk', 'Yeni Risk', 'Risk Mesafesi'
                ]
                fmt = {
                    "Performans": "{:.1f}", "Potansiyel": "{:.1f}",
                    "Mevcut Maaş": "{:,.0f}", "Yeni Maaş": "{:,.0f}", 
                    "Zam Oranı (%)": "{:.2f}"
                }
                st.dataframe(target_df[display_cols].style.format(fmt), use_container_width=True)

    with tab2:
        st.subheader("📊 Piyasa Konumlandırma Analizi")
        if not df.empty:
            df['Comp_Ratio'] = df['Mevcut Maaş'] / df['Piyasa Ortalaması']
            fig_cr = px.histogram(df, x="Comp_Ratio", color="Departman", nbins=20, title="Şirket Geneli CR Dağılımı")
            fig_cr.add_vline(x=1.0, line_dash="solid", line_color="green")
            st.plotly_chart(fig_cr, use_container_width=True)

    with tab3:
        st.subheader("🧮 Hızlı Maaş Hesaplayıcı")
        c_cal1, c_cal2 = st.columns([1, 1])
        with c_cal1:
            input_gross = st.number_input("Brüt Maaş Giriniz (TL)", min_value=17002, value=30000, step=1000)
            if st.button("Hesapla 🧮", use_container_width=True):
                result = calculate_net_salary(input_gross)
                st.divider()
                st.metric("Net Maaş", f"{result['Net Maaş']:,.2f} ₺")
                with st.expander("Detaylı Döküm"):
                    st.dataframe(pd.DataFrame(list(result.items()), columns=["Kalem", "Tutar"]), use_container_width=True, hide_index=True)
        with c_cal2:
            st.info("Bilgi: SGK, İşsizlik, Gelir Vergisi (1. Dilim) ve Damga Vergisi dahildir.")