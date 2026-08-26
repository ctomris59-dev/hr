# ui_org.py (V55.0 - FASTAPI REFACTORED - Streamlit kaldırıldı)
# Bu dosya artık sadece iş mantığı fonksiyonlarını içerir
# FastAPI endpoint'leri main.py'de tanımlı

import pandas as pd
from io import BytesIO
from utils_db import load_org_chart, save_org_chart
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

# --- GÜVENLİ IMPORTLAR ---
try:
    from config import DEPARTMENTS
    from data.data_jobs import JOB_PROFILES
except ImportError:
    DEPARTMENTS = ["Genel", "Yönetim", "İK"]
    JOB_PROFILES = {"Uzman": {}, "Müdür": {}}

# --- AKILLI EXCEL ŞABLONU OLUŞTURUCU ---
def generate_smart_excel_template(current_employees: List[Dict[str, Any]]) -> bytes:
    """
    Excel dosyasının içine 'Veri Doğrulama' (Data Validation) ekler.
    Böylece kullanıcı Departman, Pozisyon ve Yöneticileri açılır listeden seçer.
    
    Returns:
        bytes: Excel dosyası içeriği
    """
    output = BytesIO()
    
    # 1. Ana Veri Sayfası
    df_template = pd.DataFrame(columns=[
        "Ad Soyad", "Departman", "Pozisyon", "Maaş (TL)", 
        "Kıdem (Yıl)", "İzin Hakkı (Gün)", "Doğum Tarihi", "Yönetici 1 (Ad Soyad)", "Yönetici 2 (Opsiyonel)"
    ])
    
    # Örnek Satır
    df_template.loc[0] = ["Yeni Personel Adı", DEPARTMENTS[0], list(JOB_PROFILES.keys())[0], 35000, 1.0, 14, "1990-01-15", "-", "-"]

    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        sheet_name = 'Personel Listesi'
        df_template.to_excel(writer, index=False, sheet_name=sheet_name)
        workbook = writer.book
        worksheet = writer.sheets[sheet_name]
        
        # --- REFERANS VERİLERİ (GİZLİ SAYFAYA YAZIYORUZ) ---
        # Excel'de dropdown listeleri 255 karakterden uzunsa ayrı sayfadan referans almak gerekir.
        ref_sheet = workbook.add_worksheet('Referanslar')
        ref_sheet.hide() # Kullanıcı görmesin, kafa karışmasın
        
        # Listeleri Hazırla
        dept_list = DEPARTMENTS
        pos_list = list(JOB_PROFILES.keys())
        # Yönetici listesine "Yok" veya "-" seçeneği ekleyelim
        manager_list = ["-"] + [p.get('Ad Soyad', '') for p in current_employees if isinstance(p, dict) and 'Ad Soyad' in p]
        
        # Listeleri Gizli Sayfaya Yaz
        ref_sheet.write_column('A1', dept_list)
        ref_sheet.write_column('B1', pos_list)
        ref_sheet.write_column('C1', manager_list)
        
        # Excel Formülleri (Range Tanımları)
        # Örn: =Referanslar!$A$1:$A$10
        dept_formula = f'=Referanslar!$A$1:$A${len(dept_list)}'
        pos_formula = f'=Referanslar!$B$1:$B${len(pos_list)}'
        mgr_formula = f'=Referanslar!$C$1:$C${len(manager_list)}'
        
        # --- DATA VALIDATION (DOĞRULAMA) EKLE ---
        # B Sütunu (Departman) - Satır 2'den 1000'e kadar
        worksheet.data_validation('B2:B1000', {'validate': 'list', 'source': dept_formula})
        
        # C Sütunu (Pozisyon)
        worksheet.data_validation('C2:C1000', {'validate': 'list', 'source': pos_formula})
        
        # I ve J Sütunları (Yöneticiler) - Doğum Tarihi eklendi, sütunlar kaydı
        worksheet.data_validation('I2:I1000', {'validate': 'list', 'source': mgr_formula})
        worksheet.data_validation('J2:J1000', {'validate': 'list', 'source': mgr_formula})
        
        # Sütun Genişlikleri
        worksheet.set_column('A:A', 20) # Ad Soyad
        worksheet.set_column('B:C', 25) # Dept, Pos
        worksheet.set_column('G:G', 15) # Doğum Tarihi
        worksheet.set_column('I:J', 25) # Yöneticiler

    return output.getvalue()

# --- EXCEL YÜKLEME İŞ MANTIĞI ---
def process_excel_upload(file_content: bytes) -> Dict[str, Any]:
    """
    Excel dosyasını işler ve yeni kayıtları döndürür.
    
    Args:
        file_content: Excel dosyası içeriği (bytes)
        
    Returns:
        Dict: {
            "success": bool,
            "data": List[Dict] - Yeni kayıtlar,
            "error": Optional[str] - Hata mesajı
        }
    """
    try:
        # Excel'i oku (Sadece veri sayfasını)
        df_upload = pd.read_excel(BytesIO(file_content), sheet_name=0)
        
        new_records = []
        warnings = []
        
        for _, row in df_upload.iterrows():
            # Doğum tarihi formatını kontrol et ve düzelt
            birth_date_raw = row.get("Doğum Tarihi", "")
            birth_date = None
            
            if pd.notna(birth_date_raw) and birth_date_raw != "":
                try:
                    # Farklı formatları dene
                    if isinstance(birth_date_raw, str):
                        # YYYY-MM-DD formatı
                        if len(birth_date_raw) == 10 and birth_date_raw.count("-") == 2:
                            birth_date = birth_date_raw
                        # Excel tarih formatı (örn: 1990-01-15 00:00:00)
                        elif " " in birth_date_raw:
                            birth_date = birth_date_raw.split(" ")[0]
                        else:
                            # Pandas datetime objesi olabilir
                            if isinstance(birth_date_raw, datetime):
                                birth_date = birth_date_raw.strftime("%Y-%m-%d")
                            else:
                                # String'den parse et
                                parsed = pd.to_datetime(birth_date_raw)
                                birth_date = parsed.strftime("%Y-%m-%d")
                    elif isinstance(birth_date_raw, pd.Timestamp):
                        birth_date = birth_date_raw.strftime("%Y-%m-%d")
                    else:
                        # Sayısal Excel tarih formatı
                        excel_epoch = datetime(1899, 12, 30)
                        birth_date = (excel_epoch + timedelta(days=int(birth_date_raw))).strftime("%Y-%m-%d")
                except Exception as e:
                    warnings.append(f"Doğum tarihi formatı hatalı: {birth_date_raw}, varsayılan değer kullanılıyor.")
                    birth_date = None
            
            record = {
                "Ad Soyad": str(row.get("Ad Soyad", "Bilinmeyen")),
                "Departman": str(row.get("Departman", "Genel")),
                "Pozisyon": str(row.get("Pozisyon", "Uzman")),
                "Maaş (TL)": float(row.get("Maaş (TL)", 0)),
                "Calisma_Yili": float(row.get("Kıdem (Yıl)", 1.0)),
                "Izin_Hakki": int(row.get("İzin Hakkı (Gün)", 14)),
                "Yönetici 1": str(row.get("Yönetici 1 (Ad Soyad)", "-")),
                "Yönetici 2": str(row.get("Yönetici 2 (Opsiyonel)", "-")),
                "Performans": 3.0,
                "Potansiyel": 3.0
            }
            
            # Doğum tarihi varsa ekle
            if birth_date:
                record["birth_date"] = birth_date
            
            new_records.append(record)
        
        return {
            "success": True,
            "data": new_records,
            "warnings": warnings,
            "preview": df_upload.head(5).to_dict("records") if len(df_upload) > 0 else []
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Excel dosyası okunamadı. Formatı kontrol edin. Detay: {str(e)}",
            "data": []
        }

# --- MANUEL PERSONEL EKLEME İŞ MANTIĞI ---
def add_manual_employee(
    name: str,
    department: str,
    position: str,
    salary: float,
    tenure: float,
    leave_days: int,
    manager1: str = "-",
    manager2: str = "-",
    birth_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Manuel olarak yeni personel ekler.
    
    Returns:
        Dict: {
            "success": bool,
            "message": str,
            "error": Optional[str]
        }
    """
    if not name or not name.strip():
        return {
            "success": False,
            "error": "İsim zorunludur."
        }
    
    org_data = load_org_chart()
    
    new_entry = {
        "Ad Soyad": name.strip(),
        "Departman": department,
        "Pozisyon": position,
        "Maaş (TL)": salary,
        "Calisma_Yili": tenure,
        "Izin_Hakki": leave_days,
        "Yönetici 1": manager1,
        "Yönetici 2": manager2,
        "Performans": 3.0,
        "Potansiyel": 3.0,
        "birth_date": birth_date
    }
    
    org_data.append(new_entry)
    save_org_chart(org_data)
    
    return {
        "success": True,
        "message": f"{name} başarıyla eklendi!",
        "data": new_entry
    }

# --- ORG CHART İSTATİSTİKLERİ ---
def get_org_chart_stats() -> Dict[str, Any]:
    """
    Organizasyon şeması istatistiklerini döndürür.
    
    Returns:
        Dict: {
            "total_employees": int,
            "avg_salary": float,
            "avg_tenure": float,
            "departments": Dict[str, int]
        }
    """
    org_data = load_org_chart()
    
    if not org_data:
        return {
            "total_employees": 0,
            "avg_salary": 0.0,
            "avg_tenure": 0.0,
            "departments": {}
        }
    
    df = pd.DataFrame(org_data)
    
    salary_col = 'Maaş (TL)' if 'Maaş (TL)' in df.columns else ('Maaş' if 'Maaş' in df.columns else None)
    avg_salary = df[salary_col].mean() if salary_col else 0.0
    
    avg_tenure = df['Calisma_Yili'].mean() if 'Calisma_Yili' in df.columns else 0.0
    
    departments = df['Departman'].value_counts().to_dict() if 'Departman' in df.columns else {}
    
    return {
        "total_employees": len(df),
        "avg_salary": float(avg_salary),
        "avg_tenure": float(avg_tenure),
        "departments": departments
    }

# --- ORG CHART GÜNCELLEME ---
def update_org_chart(updated_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Organizasyon şemasını günceller.
    
    Args:
        updated_data: Güncellenmiş personel listesi
        
    Returns:
        Dict: {
            "success": bool,
            "message": str,
            "error": Optional[str]
        }
    """
    try:
        # Eksik sütun tamamlama
        defaults = {'Izin_Hakki': 14, 'Performans': 3.0, 'Potansiyel': 3.0, 'Yönetici 1': '-', 'Yönetici 2': '-'}
        for record in updated_data:
            for col, val in defaults.items():
                if col not in record:
                    record[col] = val
            
            if 'Maaş' in record and 'Maaş (TL)' not in record:
                record['Maaş (TL)'] = record['Maaş']
        
        save_org_chart(updated_data)
        
        return {
            "success": True,
            "message": "Veriler başarıyla güncellendi.",
            "count": len(updated_data)
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Veri güncelleme hatası: {str(e)}"
        }
