# ui_leave.py (V22.0 - BİLDİRİM SİSTEMİ ENTEGRASYONLU)

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta

# --- IMPORT ---
try:
    from utils_db import load_leave_requests, save_leave_request, update_leave_status, load_org_chart, send_notification
except ImportError:
    st.error("Veritabanı modülleri eksik.")
    def load_leave_requests(): return []
    def save_leave_request(x): pass
    def update_leave_status(x,y,z): pass
    def load_org_chart(): return []
    def send_notification(x,y,z): pass

# --- YARDIMCI: KİŞİ BAZLI İSTATİSTİK HESAPLA ---
def get_person_leave_stats(person_name, org_chart, all_requests):
    # 1. Tanımlı Hak (DB'den)
    user_record = next((p for p in org_chart if p['Ad Soyad'] == person_name), None)
    total_quota = int(user_record.get('Izin_Hakki', 14)) if user_record else 14
    
    # 2. Kullanılan (Onaylı Yıllık İzinler)
    my_requests = [r for r in all_requests if r['personel'] == person_name]
    used_annual = sum([r['gun'] for r in my_requests if r['durum'] == 'Onaylandı' and r['tur'] == 'Yıllık İzin'])
    
    # 3. Kalan
    remaining = total_quota - used_annual
    
    return total_quota, used_annual, remaining, my_requests

# ==========================================
# 1. PERSONEL EKRANI (DETAYLI KARNE)
# ==========================================
def render_my_leaves(user):
    st.subheader(f"✈️ İzin Yönetimi: {user['name']}")
    
    org_chart = load_org_chart()
    all_requests = load_leave_requests()
    
    # İstatistikleri Çek
    quota, used, rem, my_history = get_person_leave_stats(user['name'], org_chart, all_requests)
    
    # --- A. DURUM KARTLARI ---
    col1, col2, col3 = st.columns(3)
    col1.metric("Toplam İzin Hakkı", f"{quota} Gün", "Devir + Hak Ediş", delta_color="off")
    col2.metric("Kullanılan (Yıllık)", f"{used} Gün", "Onaylananlar", delta_color="inverse")
    
    color = "normal" if rem > 3 else "inverse"
    col3.metric("Kullanılabilir Bakiye", f"{rem} Gün", "Kalan", delta_color=color)
    
    st.divider()
    
    # --- B. YENİ TALEP FORMU ---
    with st.expander("➕ Yeni İzin Talebi Oluştur", expanded=False):
        with st.form("leave_form"):
            c1, c2 = st.columns(2)
            leave_type = c1.selectbox("İzin Türü", ["Yıllık İzin", "Mazeret İzni", "Hastalık Raporu", "Evden Çalışma"])
            if leave_type == "Yıllık İzin":
                st.caption(f"ℹ️ Bakiyeden düşecektir. (Mevcut: {rem})")
            
            desc = c2.text_input("Açıklama", placeholder="Sebep belirtiniz... (Örn: Yaz tatili)")
            
            c3, c4 = st.columns(2)
            start_date = c3.date_input("Başlangıç", datetime.now())
            end_date = c4.date_input("Bitiş", datetime.now() + timedelta(days=1))
            
            days_diff = (end_date - start_date).days + 1
            if days_diff <= 0: days_diff = 0
            
            st.info(f"📅 Talep Edilen Süre: **{days_diff} Gün**")
            
            if st.form_submit_button("Talebi Gönder 🚀"):
                if days_diff <= 0:
                    st.error("Tarihleri kontrol ediniz.")
                elif leave_type == "Yıllık İzin" and days_diff > rem:
                    st.error(f"Yetersiz Bakiye! ({days_diff} gün istediniz, {rem} gününüz var)")
                else:
                    new_req = {
                        "personel": user['name'],
                        "departman": user.get('dept', '-'),
                        "tur": leave_type,
                        "baslangic": start_date.strftime("%Y-%m-%d"),
                        "bitis": end_date.strftime("%Y-%m-%d"),
                        "gun": days_diff,
                        "aciklama": desc,
                        "durum": "Bekliyor",
                        "talep_tarihi": datetime.now().strftime("%Y-%m-%d"),
                        "yonetici_notu": ""
                    }
                    save_leave_request(new_req)
                    
                    # --- BİLDİRİM GÖNDER (YÖNETİCİYE) ---
                    user_rec = next((p for p in org_chart if p['Ad Soyad'] == user['name']), None)
                    if user_rec:
                        manager_name = user_rec.get('Yönetici 1', '-')
                        if manager_name not in ['-', 'Yok']:
                            send_notification(manager_name, f"📢 {user['name']} yeni bir izin talebi oluşturdu.", "info")
                    # ------------------------------------
                    
                    st.success("Talep iletildi!")
                    st.rerun()

    # --- C. HAREKET DÖKÜMÜ ---
    st.subheader("📋 İzin Hareket Dökümü")
    if my_history:
        df = pd.DataFrame(my_history)
        
        # Bakiye Etkisi Gösterimi
        df['İşlem'] = df.apply(lambda x: f"⬇️ -{x['gun']}" if x['durum']=='Onaylandı' and x['tur']=='Yıllık İzin' else f"⏳ {x['gun']}", axis=1)
        
        if 'aciklama' not in df.columns: df['aciklama'] = ""
        
        display_df = df[['talep_tarihi', 'tur', 'aciklama', 'baslangic', 'bitis', 'gun', 'durum', 'İşlem', 'yonetici_notu']]
        display_df.columns = ['Talep Tarihi', 'Tür', 'Açıklama', 'Başlangıç', 'Bitiş', 'Gün', 'Durum', 'Bakiye Etkisi', 'Yönetici Notu']
        
        def highlight_status(val):
            if val == 'Onaylandı': return 'background-color: #dcedc8; color: black'
            if val == 'Reddedildi': return 'background-color: #ffccbc; color: black'
            return 'background-color: #fff9c4; color: black'

        st.dataframe(display_df.style.applymap(highlight_status, subset=['Durum']), use_container_width=True, hide_index=True)
    else:
        st.info("Henüz bir izin hareketiniz yok.")

# ==========================================
# 2. YÖNETİCİ ONAY EKRANI
# ==========================================
def render_manager_approvals(user, my_team_names, all_requests, org_chart):
    st.subheader("✅ Onay Bekleyen Talepler")
    
    pending = [r for r in all_requests if r['durum'] == 'Bekliyor' and r['personel'] in my_team_names]
    
    if not pending:
        st.success("Harika! Onay bekleyen izin talebi yok.")
        return

    for req in pending:
        with st.container(border=True):
            q, u, r, _ = get_person_leave_stats(req['personel'], org_chart, all_requests)
            
            c1, c2, c3, c4 = st.columns([2, 2, 1, 1])
            c1.markdown(f"**👤 {req['personel']}**")
            c1.caption(f"Tarih: {req['talep_tarihi']}")
            
            c2.markdown(f"**{req['tur']}** ({req['gun']} Gün)")
            c2.write(f"{req['baslangic']} ➡️ {req['bitis']}")
            if req.get('aciklama'):
                c2.info(f"💬 \"{req['aciklama']}\"")
            
            if req['tur'] == 'Yıllık İzin':
                c2.caption(f"📊 Mevcut Bakiye: **{r} Gün**")
            
            with c3:
                if st.button("Onayla", key=f"ok_{req['id']}", use_container_width=True):
                    update_leave_status(req['id'], "Onaylandı", "Yönetici onayı.")
                    # --- BİLDİRİM GÖNDER (PERSONELE) ---
                    send_notification(req['personel'], f"✅ İzin talebiniz ONAYLANDI. ({req['baslangic']})", "success")
                    # -----------------------------------
                    st.rerun()
            with c4:
                if st.button("Reddet", key=f"no_{req['id']}", type="primary", use_container_width=True):
                    update_leave_status(req['id'], "Reddedildi", "Uygun görülmedi.")
                    # --- BİLDİRİM GÖNDER (PERSONELE) ---
                    send_notification(req['personel'], f"❌ İzin talebiniz REDDEDİLDİ.", "error")
                    # -----------------------------------
                    st.rerun()

# ==========================================
# 3. YÖNETİCİ: EKİP İZİN KARNESİ
# ==========================================
def render_team_overview(my_team_names, org_chart, all_requests):
    st.subheader("👥 Ekip İzin Karnesi")
    st.info("Ekibinizdeki herkesin izin durumunu ve geçmişini buradan inceleyebilirsiniz.")
    
    team_summary = []
    for member in my_team_names:
        q, u, r, _ = get_person_leave_stats(member, org_chart, all_requests)
        team_summary.append({
            "Personel": member,
            "Toplam Hak": q,
            "Kullanılan": u,
            "Kalan Bakiye": r
        })
    
    if team_summary:
        df_team = pd.DataFrame(team_summary)
        df_team = df_team.sort_values(by="Kalan Bakiye")
        
        st.dataframe(
            df_team.style.background_gradient(subset=['Kalan Bakiye'], cmap="RdYlGn", vmin=0, vmax=14),
            use_container_width=True,
            hide_index=True
        )
        
        st.divider()
        selected_member = st.selectbox("🔍 Detaylı İnceleme İçin Personel Seç:", my_team_names)
        if selected_member:
            st.markdown(f"#### 👤 {selected_member} - İzin Geçmişi")
            _, _, _, history = get_person_leave_stats(selected_member, org_chart, all_requests)
            if history:
                h_df = pd.DataFrame(history)
                if 'aciklama' not in h_df.columns: h_df['aciklama'] = ""
                st.dataframe(h_df[['tur', 'baslangic', 'gun', 'durum', 'aciklama', 'yonetici_notu']], use_container_width=True)
            else:
                st.caption("Bu personelin geçmiş izin kaydı yok.")
    else:
        st.warning("Ekibinizde personel bulunamadı.")

# --- ANA RENDER ---
def render_leave_page():
    if 'current_user' not in st.session_state: return
    user = st.session_state.current_user
    
    org_chart = load_org_chart()
    all_requests = load_leave_requests()
    
    is_manager = user['role'] in ['MANAGER', 'DIRECTOR', 'CEO', 'IK']
    my_team_names = []
    
    if is_manager:
        if user['role'] in ['CEO', 'IK']:
            my_team_names = [p['Ad Soyad'] for p in org_chart if p['Ad Soyad'] != user['name']]
        else:
            my_team_names = [p['Ad Soyad'] for p in org_chart if p.get('Yönetici 1') == user['name'] or p.get('Yönetici 2') == user['name']]

    tabs = ["✈️ İzinlerim"]
    if is_manager:
        tabs.extend(["✅ Onay Bekleyenler", "👥 Ekip İzin Durumu"])
        
    active_tab = st.radio("Mod Seçimi", tabs, horizontal=True, label_visibility="collapsed")
    st.write("")
    
    if active_tab == "✈️ İzinlerim":
        render_my_leaves(user)
    elif active_tab == "✅ Onay Bekleyenler" and is_manager:
        render_manager_approvals(user, my_team_names, all_requests, org_chart)
    elif active_tab == "👥 Ekip İzin Durumu" and is_manager:
        render_team_overview(my_team_names, org_chart, all_requests)