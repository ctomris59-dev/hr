# services/leave_service.py
# Akıllı İzin Asistanı - Conflict Detection ve Smart Suggestions

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from utils_db import load_leave_requests, load_org_chart, load_holidays

def check_leave_conflict(
    department_id: str,
    start_date: str,
    end_date: str,
    exclude_request_id: Optional[int] = None,
    threshold: float = 0.3
) -> Dict:
    """
    İzin çakışması kontrolü.
    Aynı departmanda, aynı tarih aralığında onaylanmış izinleri kontrol eder.
    
    Args:
        department_id: Departman adı
        start_date: İzin başlangıç tarihi (YYYY-MM-DD)
        end_date: İzin bitiş tarihi (YYYY-MM-DD)
        exclude_request_id: Kontrol dışı bırakılacak izin talebi ID'si
        threshold: Uyarı eşiği (varsayılan %30)
    
    Returns:
        {
            "has_conflict": bool,
            "warning": bool,
            "conflict_ratio": float,
            "on_leave_count": int,
            "department_total": int,
            "message": str
        }
    """
    try:
        # Tarihleri parse et
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        # Departmandaki tüm personelleri bul
        org_data = load_org_chart()
        department_employees = [
            emp for emp in org_data
            if emp.get("Departman") == department_id
        ]
        department_total = len(department_employees)
        
        if department_total == 0:
            return {
                "has_conflict": False,
                "warning": False,
                "conflict_ratio": 0.0,
                "on_leave_count": 0,
                "department_total": 0,
                "message": "Departman bulunamadı"
            }
        
        # Onaylanmış izinleri yükle
        all_requests = load_leave_requests()
        
        # Tarih aralığındaki onaylanmış izinleri bul
        on_leave_employees = set()
        
        for req in all_requests:
            # Exclude edilecek request'i atla
            if exclude_request_id and req.get("id") == exclude_request_id:
                continue
            
            # Sadece onaylanmış izinleri kontrol et
            if req.get("durum") != "Onaylandı":
                continue
            
            # Departman kontrolü
            req_dept = req.get("departman") or req.get("department_id")
            if req_dept != department_id:
                continue
            
            # Tarih kontrolü
            req_start_str = req.get("baslangic") or req.get("baslangic_tarihi") or req.get("start_date")
            req_end_str = req.get("bitis") or req.get("bitis_tarihi") or req.get("end_date")
            
            if not req_start_str or not req_end_str:
                continue
            
            try:
                req_start = datetime.strptime(req_start_str, "%Y-%m-%d")
                req_end = datetime.strptime(req_end_str, "%Y-%m-%d")
                
                # Tarih aralığı çakışması kontrolü
                if not (end < req_start or start > req_end):
                    # Çakışma var
                    employee_name = req.get("personel") or req.get("employee_id")
                    if employee_name:
                        on_leave_employees.add(employee_name)
            except:
                continue
        
        on_leave_count = len(on_leave_employees)
        conflict_ratio = on_leave_count / department_total if department_total > 0 else 0.0
        
        has_warning = conflict_ratio > threshold
        
        return {
            "has_conflict": on_leave_count > 0,
            "warning": has_warning,
            "conflict_ratio": round(conflict_ratio * 100, 1),  # Yüzde olarak
            "on_leave_count": on_leave_count,
            "department_total": department_total,
            "message": f"{department_id} departmanının %{conflict_ratio * 100:.1f}'i ({on_leave_count}/{department_total}) bu tarihlerde izinli."
        }
    except Exception as e:
        return {
            "has_conflict": False,
            "warning": False,
            "conflict_ratio": 0.0,
            "on_leave_count": 0,
            "department_total": 0,
            "message": f"Hata: {str(e)}"
        }


def get_smart_holiday_suggestions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict]:
    """
    Akıllı tatil önerileri.
    Resmi tatilleri analiz ederek köprü günü fırsatları bulur.
    
    Args:
        start_date: Başlangıç tarihi (opsiyonel, bugünden itibaren arar)
        end_date: Bitiş tarihi (opsiyonel, 1 yıl sonrasına kadar arar)
    
    Returns:
        [
            {
                "holiday_name": str,
                "holiday_date": str,
                "holiday_day": str,
                "suggested_date": str,
                "suggested_day": str,
                "total_days": int,
                "message": str
            }
        ]
    """
    try:
        holidays = load_holidays()
        suggestions = []
        
        today = datetime.now()
        if start_date:
            search_start = datetime.strptime(start_date, "%Y-%m-%d")
        else:
            search_start = today
        
        if end_date:
            search_end = datetime.strptime(end_date, "%Y-%m-%d")
        else:
            search_end = today + timedelta(days=365)  # 1 yıl ileri
        
        # Hafta içi günler (Pazartesi=0, Pazar=6)
        day_names = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
        
        for holiday in holidays:
            holiday_date_str = holiday.get("date")
            if not holiday_date_str:
                continue
            
            try:
                holiday_date = datetime.strptime(holiday_date_str, "%Y-%m-%d")
                
                # Arama aralığında mı?
                if holiday_date < search_start or holiday_date > search_end:
                    continue
                
                holiday_day = holiday_date.weekday()  # 0=Pazartesi, 6=Pazar
                holiday_day_name = day_names[holiday_day]
                holiday_name = holiday.get("name", "")
                
                # Köprü günü mantığı
                suggested_date = None
                suggested_day_name = None
                total_days = 1  # Tatil günü
                message = ""
                
                # Salı ise Pazartesi'yi öner (2 gün tatil)
                if holiday_day == 1:  # Salı
                    suggested_date = holiday_date - timedelta(days=1)  # Pazartesi
                    suggested_day_name = "Pazartesi"
                    total_days = 2
                    message = f"🚀 Süper Fırsat! {holiday_name} ({holiday_date_str}, {holiday_day_name}) gününe denk geliyor. Pazartesi günü izin alırsan 2 gün tatil yapabilirsin!"
                
                # Perşembe ise Cuma'yı öner (2 gün tatil)
                elif holiday_day == 3:  # Perşembe
                    suggested_date = holiday_date + timedelta(days=1)  # Cuma
                    suggested_day_name = "Cuma"
                    total_days = 2
                    message = f"🚀 Süper Fırsat! {holiday_name} ({holiday_date_str}, {holiday_day_name}) gününe denk geliyor. Cuma günü izin alırsan 2 gün tatil yapabilirsin!"
                
                # Çarşamba ise hem Pazartesi hem Cuma'yı öner (4 gün tatil)
                elif holiday_day == 2:  # Çarşamba
                    suggested_date = holiday_date - timedelta(days=1)  # Salı (Pazartesi de eklenebilir)
                    suggested_day_name = "Salı ve Pazartesi"
                    total_days = 4  # Pazartesi, Salı, Çarşamba (tatil), Perşembe, Cuma
                    message = f"🚀 Süper Fırsat! {holiday_name} ({holiday_date_str}, {holiday_day_name}) gününe denk geliyor. Pazartesi ve Salı günü izin alırsan 4 gün tatil yapabilirsin!"
                
                # Cuma ise Perşembe'yi öner (2 gün tatil)
                elif holiday_day == 4:  # Cuma
                    suggested_date = holiday_date - timedelta(days=1)  # Perşembe
                    suggested_day_name = "Perşembe"
                    total_days = 2
                    message = f"🚀 Süper Fırsat! {holiday_name} ({holiday_date_str}, {holiday_day_name}) gününe denk geliyor. Perşembe günü izin alırsan 2 gün tatil yapabilirsin!"
                
                # Pazartesi ise Salı'yı öner (2 gün tatil)
                elif holiday_day == 0:  # Pazartesi
                    suggested_date = holiday_date + timedelta(days=1)  # Salı
                    suggested_day_name = "Salı"
                    total_days = 2
                    message = f"🚀 Süper Fırsat! {holiday_name} ({holiday_date_str}, {holiday_day_name}) gününe denk geliyor. Salı günü izin alırsan 2 gün tatil yapabilirsin!"
                
                if suggested_date and suggested_date >= today:
                    suggestions.append({
                        "holiday_name": holiday_name,
                        "holiday_date": holiday_date_str,
                        "holiday_day": holiday_day_name,
                        "suggested_date": suggested_date.strftime("%Y-%m-%d"),
                        "suggested_day": suggested_day_name,
                        "total_days": total_days,
                        "message": message
                    })
            except:
                continue
        
        # Tarihe göre sırala (en yakın önce)
        suggestions.sort(key=lambda x: x["holiday_date"])
        
        return suggestions[:5]  # En fazla 5 öneri döndür
    except Exception as e:
        return []

