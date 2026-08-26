import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from config import COMPETENCIES_360
from utils_db import get_organization_structure # Org şemasını çekmek için eklendi

def calculate_flight_risk_score(emp_name):
    # Verileri Çek
    evals = [x for x in st.session_state.db_360 if x['target'] == emp_name]
    if not evals: return 0, [], "Veri Yok"

    # Puanları Ayrıştır
    self_scores = {}
    others_scores_list = {k: [] for k in COMPETENCIES_360}
    
    for e in evals:
        s = e.get('scores', {})
        if e['relation'] == "Kendi (Self)":
            self_scores = s
        else:
            for k, v in s.items():
                if k in others_scores_list and v > 0: others_scores_list[k].append(v)
    
    avg_others = {k: (sum(v)/len(v) if v else 0) for k, v in others_scores_list.items()}
    
    # --- RİSK ALGORİTMASI ---
    risk_score = 10 # Taban Risk
    risk_factors = []

    # 1. Kriter: Yüksek Potansiyel (Headhunter Hedefi)
    # Perf: RES, DET, ETH, DIS. Pot: DIG, ANA, LRN (ui_talent.py mantığı)
    perf_keys = ['RES','DET','ETH','DIS']
    pot_keys = ['DIG','ANA','LRN']
    perf = sum([avg_others.get(k,0) for k in perf_keys]) / len(perf_keys)
    pot = sum([avg_others.get(k,0) for k in pot_keys]) / len(pot_keys)
    
    if perf > 4.0 and pot > 4.0:
        risk_score += 25
        risk_factors.append("🌟 **Yüksek Piyasa Değeri:** 'Yıldız' çalışan, rakip firmaların radarında olabilir.")

    # 2. Kriter: Tükenmişlik (Burnout)
    str_score = avg_others.get('STR', 3.0)
    # REVİZYON: Kriteri 3.0'dan 2.8'e düşürerek hassasiyet artırıldı (ui_risk.txt'teki eski koda uygun hale getirildi)
    if str_score < 2.8: 
        risk_score += 30
        risk_factors.append(f"🔥 **Tükenmişlik Sinyali:** Dayanıklılık puanı kritik seviyede ({str_score:.1f}).")

    # 3. Kriter: Algı Farkı (Frustrasyon)
    if self_scores and any(self_scores.values()):
        avg_self = sum(self_scores.values()) / len(self_scores)
        avg_env = sum(avg_others.values()) / len(avg_others) if avg_others else 0
        if (avg_self - avg_env) > 1.0:
            risk_score += 20
            risk_factors.append("💔 **Değer Görmeme Hissi (Algı Farkı):** Kendi algısı ile çevrenin algısı arasında uçurum var.")

    # 4. Kriter: Sessiz İstifa
    eth_score = avg_others.get('ETH', 3.0)
    if eth_score < 3.0:
        risk_score += 15
        risk_factors.append("📉 **Sessiz İstifa:** Bağlılık ve iş etiği puanlarında düşüş var.")

    risk_score = min(95, risk_score)
    level = "Yüksek" if risk_score > 60 else "Orta" if risk_score > 30 else "Düşük"
    return risk_score, risk_factors, level

# --- YENİ YARDIMCI FONKSİYON: RİSK TEMELLİ REÇETE ---
def generate_risk_prescription(factors, name):
    """Faktörlere göre özelleştirilmiş elde tutma reçetesi üretir."""
    prescription = [
        f"**ACİL ADIM 1: Birebir Görüşme (Stay Interview)**: Yöneticisi, {name} ile 48 saat içinde, konuyu doğrudan iş değil 'duygu durumu' olacak şekilde bir görüşme planlamalı.",
        "**ADIM 2: Kök Neden Analizi**: Aşağıdaki baskın faktörlere odaklanarak görüşme derinleştirilmelidir."
    ]
    
    if any("Yüksek Piyasa Değeri" in f for f in factors):
        prescription.append("- **STRATEJİK ÇÖZÜM**: Yatay/dikey terfi, maaş zammı teklifi veya özel proje sorumluluğu gibi kariyer gelişim fırsatları sunulmalıdır.")
    if any("Tükenmişlik Sinyali" in f for f in factors):
        prescription.append("- **İYİLEŞTİRME ÇÖZÜMÜ**: İş yükü yeniden dengelenmeli, zorunlu tatil veya esnek çalışma saatleri teklif edilmelidir. Çalışana 'Hayır' deme yetkisi verilmelidir.")
    if any("Değer Görmeme Hissi" in f for f in factors):
        prescription.append("- **KÜLTÜREL ÇÖZÜM**: Çalışanın son dönemdeki somut başarıları (360 puan değil, proje çıktıları) resmi kanallarda (şirket içi duyuru/ödül) görünür kılınmalıdır.")
    if any("Sessiz İstifa" in f for f in factors):
        prescription.append("- **BAĞLILIK ÇÖZÜMÜ**: Yeni bir ekip aktivitesine dahil edilmeli veya şirketin değerlerine uygun bir gönüllülük projesinde liderlik yapması teşvik edilmelidir.")
        
    if not factors:
        prescription.append("- **DÜŞÜK RİSK**: Durum stabil. Bağlılığını korumak için takdir ve gelişim görüşmeleri planlanabilir.")

    return prescription

def render_risk_dashboard():
    st.header("🚨 Yapay Zeka İstifa Riski Analizi (Flight Risk)")
    st.info("Bu modül, sadece **Mevcut Çalışanlar** için risk analizi yapar. Adaylar dahil edilmez.") #

    # --- BİLGİLENDİRME PANELİ (GELİŞTİRİLDİ) ---
    with st.expander("ℹ️ Risk Sinyalleri ve Stratejik Aksiyonlar", expanded=True):
        st.markdown("""
        Bu modül, çalışanların **360 Derece Değerlendirme** verilerini yapay zeka algoritmalarıyla tarayarak olası ayrılma (turnover) risklerini tahmin eder.
        
        **Algoritmanın Takip Ettiği 4 Temel Sinyal:**
        1.  **🌟 Yüksek Piyasa Değeri:** Performansı çok yüksek olup "Headhunter" hedefinde olanlar.
        2.  **🔥 Tükenmişlik Sinyali:** Dayanıklılık ve stres yönetimi puanları kritik seviyede olanlar.
        3.  **💔 Algı Kopukluğu:** Kendini başarılı görüp takdir edilmediğini düşünenler (Frustrasyon).
        4.  **📉 Sessiz İstifa:** İş etiği ve katılım puanlarında düşüş yaşayanlar.

        **Risk Seviyeleri ve Aksiyonlar:**
        * 🔴 **YÜKSEK RİSK (> %60):** Kırmızı Alarm. Çalışan kopma noktasında. **48 saat içinde** "Elde Tutma Görüşmesi" (Stay Interview) yapılmalı.
        * 🟡 **ORTA RİSK (%30 - %60):** Sarı Alarm. Memnuniyetsizlik sinyalleri var. Yöneticisi ile konuşulmalı ve motivasyon planı yapılmalı.
        * 🟢 **DÜŞÜK RİSK (< %30):** Yeşil. Çalışan stabil.
        """)
    # ---------------------------------------------
    
    # 1. VERİ KONTROLÜ VE FİLTRELEME (ui_risk.txt mantığı korundu)
    all_targets = sorted(list(set([x['target'] for x in st.session_state.db_360])))
    org_names = [p.get('Ad Soyad') for p in st.session_state.org_chart if p.get('Ad Soyad')]
    valid_employees = [emp for emp in all_targets if emp in org_names]

    if not valid_employees:
        st.warning("Veritabanında kayıtlı 'Mevcut Çalışan' bulunamadı.")
        return

    # 2. RİSK HESAPLAMA
    risk_data = []
    for emp in valid_employees:
        score, factors, level = calculate_flight_risk_score(emp)
        risk_data.append({"Ad": emp, "Risk Skoru": score, "Seviye": level, "Faktörler": factors})
    
    risk_data.sort(key=lambda x: x['Risk Skoru'], reverse=True)
    
    # 3. Metrikler ve Grafikler (GELİŞTİRİLDİ)
    high_risk_count = len([x for x in risk_data if x['Seviye'] == "Yüksek"])
    avg_risk = sum([x['Risk Skoru'] for x in risk_data]) / len(risk_data) if risk_data else 0
    
    st.divider()
    
    c1, c2, c3 = st.columns(3)
    c1.metric("Ortalama Şirket Riski", f"%{avg_risk:.0f}", delta_color="inverse")
    c2.metric("Kritik Personel Sayısı", f"{high_risk_count} Kişi", delta_color="inverse", delta=f"{high_risk_count}")
    c3.info("💡 **İpucu:** %60 üzeri riskli personelle hemen 'Elde Tutma Görüşmesi' planlayın.")
    
    # YENİ EKLENEN GRAFİK: Risk Dağılımı (Dramatizasyon)
    risk_levels = ["Yüksek", "Orta", "Düşük"]
    level_counts = [len([x for x in risk_data if x['Seviye'] == level]) for level in risk_levels]
    
    fig = go.Figure(data=[go.Bar(x=risk_levels, y=level_counts, marker_color=['red', 'gold', 'green'])])
    fig.update_layout(title='Risk Seviyelerine Göre Personel Dağılımı', height=300, margin=dict(t=30, b=0))
    st.plotly_chart(fig, use_container_width=True)
    
    st.divider()

    # 4. Risk Kartları (DETAYLANDIRILDI)
    st.subheader("📋 Kriz Yönetim Raporu (Aksiyona Hazır)")
    
    for p in risk_data:
        if p['Seviye'] == "Yüksek": color, icon = "#ffcccc", "🚨"
        elif p['Seviye'] == "Orta": color, icon = "#fff4cc", "⚠️"
        else: color, icon = "#ddffdd", "✅"

        # HTML Kart (Aynı)
        st.markdown(f"""
        <div style="background-color: {color}; padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #ddd;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #333;">{icon} {p['Ad']}</h3>
                <h2 style="margin: 0; color: #333;">%{p['Risk Skoru']} <span style="font-size: 16px;">(Risk)</span></h2>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        c_a, c_b = st.columns([1, 3])
        with c_a:
            st.progress(p['Risk Skoru'] / 100)
            st.caption(f"Risk Seviyesi: **{p['Seviye']}**")
        
        with c_b:
            if p['Faktörler']:
                st.markdown("**Tespit Edilen Kritik Sinyaller:**")
                for f in p['Faktörler']: st.write(f"- {f}")
            else: 
                st.write("- 🟢 Herhangi bir risk faktörü tespit edilmedi.")
        
        # YÜKSEK RİSK İÇİN ÖZEL REÇETE (GELİŞTİRİLDİ)
        if p['Seviye'] == "Yüksek":
            with st.expander(f"💊 {p['Ad']} İçin **Kişiselleştirilmiş** Elde Tutma Reçetesi (AI Tavsiyesi)", expanded=True):
                prescription = generate_risk_prescription(p['Faktörler'], p['Ad'])
                for step in prescription:
                    st.markdown(f"- {step}")
                st.caption("Kaynak: Bu reçete, tespit edilen risk faktörlerine göre özel olarak oluşturulmuştur.")
        
        st.write("")