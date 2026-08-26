from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from schemas.models import *
from routers.dependencies import get_current_user_role, get_current_user_dept, get_current_user_name
from app_state import is_data_cleared, CLEAN_DB, JOB_PROFILES
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

router = APIRouter()


class LeaveConflictCheckRequest(BaseModel):
    department_id: str = Field(..., min_length=1)
    start_date: str = Field(..., min_length=10)
    end_date: str = Field(..., min_length=10)
    exclude_request_id: Optional[int] = None


class PulseAnswerRequest(BaseModel):
    employee_id: str = Field(..., min_length=1)
    employee_name: str = Field(..., min_length=1)
    department_id: str = Field(..., min_length=1)
    department_name: str = Field(..., min_length=1)
    score: float = Field(..., ge=1, le=5)
    week_number: str = Field(..., min_length=1)


@router.post("/api/360-data")
async def save_360_data(request: Save360DataRequest):
    """
    360 Değerlendirme verilerini kaydeder.
    Router layer - only handles HTTP request/response.
    """
    try:
        from domain.services.evaluation_360_service import Evaluation360Service
        
        service = Evaluation360Service()
        result = service.save_evaluation(
            employee_name=request.personel,
            department=request.departman or "",
            position=request.pozisyon or "",
            eval_type=request.eval_type or "",
            competencies=request.competencies or {},
            performance=request.performans,
            is_star_performer=request.is_star_performer
        )
        
        return result
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}


@router.get("/api/360-data")
async def get_360_data():
    """
    360 Değerlendirme verilerini döndürür.
    Router layer - only handles HTTP request/response.
    """
    try:
        from domain.services.evaluation_360_service import Evaluation360Service
        
        service = Evaluation360Service()
        result = service.get_all_evaluations()
        
        # Business rule: Check if data is cleared
        if is_data_cleared():
            return {"success": True, "data": []}
        
        return result
    except Exception as e:
        return {"success": True, "data": []}


@router.get("/api/leave-requests")
async def get_leaves(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept)
):
    """
    Leave Management:
    - CEO: Sees all leave requests
    - Director/Manager/Employee: See only their department
    """
    try:
        from utils_db import load_leave_requests
        all_leaves = load_leave_requests()
        
        if not all_leaves:
            return {"success": True, "data": []}
        
        # CEO sees all
        if role in ["CEO", "IK"]:
            return {"success": True, "data": all_leaves}
        
        # Others see only their department
        filtered = []
        for leave in all_leaves:
            requester_dept = leave.get("department") or leave.get("Departman", "")
            if requester_dept == dept:
                filtered.append(leave)
        
        return {"success": True, "data": filtered}
    except Exception as e:
        return {"success": True, "data": []}


@router.get("/api/leave/suggestions")
async def get_leave_suggestions():
    """Return date-aware bridge-day suggestions from the holiday database."""
    from services.leave_service import get_smart_holiday_suggestions
    return {"success": True, "data": get_smart_holiday_suggestions()}


@router.get("/api/holidays")
async def get_holidays():
    """Return configured official holidays."""
    from utils_db import load_holidays
    return {"success": True, "data": load_holidays()}


@router.post("/api/leave-conflict-check")
async def leave_conflict_check(request: LeaveConflictCheckRequest):
    """Check whether approving a leave request creates department overlap risk."""
    from services.leave_service import check_leave_conflict
    result = check_leave_conflict(
        department_id=request.department_id,
        start_date=request.start_date,
        end_date=request.end_date,
        exclude_request_id=request.exclude_request_id,
    )
    return {"success": True, "data": result}


@router.post("/api/pulse-answer")
async def save_pulse_response(request: PulseAnswerRequest):
    """Persist a weekly pulse answer used by the training/dashboard UI."""
    from utils_db import save_pulse_answer
    saved = save_pulse_answer(
        employee_id=request.employee_id,
        employee_name=request.employee_name,
        department_id=request.department_id,
        department_name=request.department_name,
        score=request.score,
        week_number=request.week_number,
    )
    return {"success": bool(saved)}

@router.get("/api/metadata")
async def get_metadata():
    """
    Metadata endpoint - Returns job profiles and other system metadata
    """
    try:
        # Import job profiles from data_jobs.py (already in Turkish name format)
        try:
            from data.data_jobs import JOB_PROFILES
            # data_jobs.py already has Turkish names, so use directly
            job_profiles = JOB_PROFILES
        except ImportError:
            # Fallback: Try to convert main.py JOB_PROFILES (code format) to Turkish names
            try:
                # Competency code to Turkish name mapping
                COMPETENCY_CODE_TO_NAME = {
                    "STR": "Stratejik Bakış",
                    "RES": "Sonuç Odaklılık",
                    "COM": "İletişim Becerileri",
                    "TEA": "Takım Çalışması",
                    "ETH": "Etik ve Uyum",
                    "ANA": "Analitik Düşünme",
                    "DIG": "Dijital Okuryazarlık",
                    "DET": "Detaylara Özen",
                    "LRN": "Sürekli Öğrenme",
                    "DIS": "Öz-Disiplin"
                }
                
                # Convert main.py JOB_PROFILES to Turkish names
                job_profiles = {}
                for position, competencies in JOB_PROFILES.items():
                    frontend_profile = {}
                    for code, score in competencies.items():
                        if code in COMPETENCY_CODE_TO_NAME:
                            frontend_profile[COMPETENCY_CODE_TO_NAME[code]] = score
                    job_profiles[position] = frontend_profile
            except:
                # Final fallback: empty dict
                job_profiles = {}
        
        return {
            "success": True,
            "data": {
                "job_profiles": job_profiles
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/api/pulse-trends")
async def get_pulse(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
    user_department: Optional[str] = None,
    department_id: Optional[str] = None
):
    """Pulse trends with RBAC filtering"""
    try:
        from utils_db import get_pulse_trends, load_org_chart
        from datetime import datetime, timedelta
        import random
        
        # Departman ID parametresini kontrol et (CEO için departman seçimi)
        target_dept = department_id if department_id else (user_department or dept)
        
        # Gerçek verileri çek
        all_trends = get_pulse_trends(target_dept)
        
        # Eğer veri yoksa, demo veri oluştur
        if not all_trends or len(all_trends) == 0:
            # Org chart'tan departman bilgisini al
            org_data = load_org_chart()
            departments = list(set([emp.get("Departman", "") for emp in org_data if emp.get("Departman")]))
            
            # Hangi departman için demo veri oluşturulacak?
            demo_dept = target_dept if target_dept else (departments[0] if departments else "Genel")
            
            # Son 12 hafta için demo veri oluştur
            demo_trends = []
            current_date = datetime.now()
            
            for week_offset in range(12, 0, -1):
                week_date = current_date - timedelta(weeks=week_offset)
                week_number = f"{week_date.year}-W{week_date.isocalendar()[1]:02d}"
                
                # Departman bazlı mutluluk skorları (gerçekçi varyasyon)
                base_scores = {
                    "İnsan Kaynakları": (7.2, 8.5),
                    "Bilgi Teknolojileri": (6.8, 8.2),
                    "Finans": (7.0, 8.0),
                    "Satış": (6.5, 7.8),
                    "Pazarlama": (6.8, 7.9),
                    "Operasyon": (6.8, 7.9),
                    "AR-GE": (7.0, 8.2),
                    "Hukuk": (7.2, 8.3),
                    "Yönetim": (7.5, 9.0),
                }
                
                score_range = base_scores.get(demo_dept, (6.5, 8.0))
                
                # Haftalara göre trend (başlangıçta düşük, sonra yükseliyor)
                trend_factor = 0.85 + (12 - week_offset) * 0.012  # 0.85'ten 1.0'a
                
                # Baz skor + trend + rastgele varyasyon
                base_score = score_range[0] + (score_range[1] - score_range[0]) * trend_factor
                score = base_score + random.uniform(-0.3, 0.3)
                score = max(5.0, min(10.0, score))  # 5-10 arası sınırla
                
                demo_trends.append({
                    "week": week_number,
                    "average_score": round(score, 2),
                    "count": random.randint(15, 35)  # Rastgele katılım sayısı
                })
            
            # CEO için tüm departmanları göster, diğerleri için sadece kendi departmanı
            if role in ["CEO", "IK"] and not department_id:
                # Tüm departmanlar için demo veri oluştur
                all_dept_trends = {}
                for dept in departments:
                    if not dept:
                        continue
                    for week_offset in range(12, 0, -1):
                        week_date = current_date - timedelta(weeks=week_offset)
                        week_number = f"{week_date.year}-W{week_date.isocalendar()[1]:02d}"
                        
                        score_range = base_scores.get(dept, (6.5, 8.0))
                        trend_factor = 0.85 + (12 - week_offset) * 0.012
                        base_score = score_range[0] + (score_range[1] - score_range[0]) * trend_factor
                        score = base_score + random.uniform(-0.3, 0.3)
                        score = max(5.0, min(10.0, score))
                        
                        if week_number not in all_dept_trends:
                            all_dept_trends[week_number] = {"scores": [], "counts": []}
                        all_dept_trends[week_number]["scores"].append(score)
                        all_dept_trends[week_number]["counts"].append(random.randint(10, 25))
                
                # Ortalamaları hesapla
                final_trends = []
                for week in sorted(all_dept_trends.keys()):
                    scores = all_dept_trends[week]["scores"]
                    counts = all_dept_trends[week]["counts"]
                    final_trends.append({
                        "week": week,
                        "average_score": round(sum(scores) / len(scores), 2),
                        "count": sum(counts)
                    })
                return {"success": True, "data": final_trends}
            else:
                return {"success": True, "data": demo_trends}
        
        # CEO sees all (if no department filter)
        if role in ["CEO", "IK"] and not department_id:
            return {"success": True, "data": all_trends}
        
        # Others see only their department
        filtered = []
        for trend in all_trends:
            trend_dept = trend.get("department") or trend.get("Departman", "")
            if not target_dept or trend_dept == target_dept:
                filtered.append(trend)
        
        return {"success": True, "data": filtered if filtered else all_trends}
    except Exception as e:
        # Hata durumunda demo veri döndür
        from datetime import datetime, timedelta
        import random
        
        demo_trends = []
        current_date = datetime.now()
        
        for week_offset in range(12, 0, -1):
            week_date = current_date - timedelta(weeks=week_offset)
            week_number = f"{week_date.year}-W{week_date.isocalendar()[1]:02d}"
            
            # Basit demo veri
            base_score = 7.0 + (12 - week_offset) * 0.05  # Zamanla artış
            score = base_score + random.uniform(-0.5, 0.5)
            score = max(5.0, min(10.0, score))
            
            demo_trends.append({
                "week": week_number,
                "average_score": round(score, 2),
                "count": random.randint(20, 40)
            })
        
        return {"success": True, "data": demo_trends}


@router.get("/api/dashboard/summary")
async def get_dashboard_summary(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
    name: str = Depends(get_current_user_name)
):
    """
    Dashboard özet verilerini döndürür - Yaklaşan Doğum Günleri dahil.
    Bugünden itibaren önümüzdeki 30 gün içinde doğum günü olan personelleri filtreler.
    """
    try:
        from utils_db import load_org_chart
        from config import DB_ORG_FILE
        import os
        import json
        from datetime import datetime, timedelta
        
        # Verilerin temizlenip temizlenmediğini kontrol et
        if is_data_cleared():
            return {
                "success": True,
                "data": {
                    "upcoming_birthdays": [],
                    "total_employees": 0
                }
            }
        
        # Org-chart verilerini yükle (aktif veri seti)
        all_org_data = []
        
        # Önce dosyadan yükle
        if os.path.exists(DB_ORG_FILE):
            try:
                with open(DB_ORG_FILE, "r", encoding="utf-8") as f:
                    all_org_data = json.load(f)
                    if not isinstance(all_org_data, list):
                        all_org_data = []
            except Exception as e:
                print(f"Org chart load error: {e}")
                all_org_data = []
        
        # Dosya yoksa veya boşsa, CLEAN_DB'den dönüştür (demo verisi)
        if not all_org_data:
            # CLEAN_DB zaten bu dosyada tanımlı
            try:
                # CLEAN_DB'yi kullan (global scope'tan)
                for emp in CLEAN_DB:
                    org_entry = {
                        "Ad Soyad": emp.get("name", ""),
                        "Pozisyon": emp.get("position", ""),
                        "Departman": emp.get("department", ""),
                        "Maaş (TL)": emp.get("salary", 0),
                        "Performans": emp.get("performance", 0),
                        "Potansiyel": emp.get("potential", 0),
                    }
                    # Doğum tarihi varsa ekle
                    if emp.get("birth_date"):
                        org_entry["birth_date"] = emp.get("birth_date")
                    all_org_data.append(org_entry)
            except (NameError, AttributeError):
                # CLEAN_DB tanımlı değilse, boş bırak
                pass
        
        # Bugünün tarihi
        today = datetime.now().date()
        # 30 gün sonrası
        end_date = today + timedelta(days=30)
        
        # Yaklaşan doğum günlerini filtrele
        upcoming_birthdays = []
        
        for emp in all_org_data:
            birth_date_str = emp.get("birth_date")
            if not birth_date_str:
                continue
            
            try:
                # YYYY-MM-DD formatını parse et
                birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
                
                # Bu yıl için doğum günü tarihini hesapla
                current_year = today.year
                this_year_birthday = birth_date.replace(year=current_year)
                
                # Eğer bu yılın doğum günü geçtiyse, gelecek yılın doğum gününü al
                if this_year_birthday < today:
                    next_year_birthday = birth_date.replace(year=current_year + 1)
                    days_until = (next_year_birthday - today).days
                    birthday_date = next_year_birthday
                else:
                    days_until = (this_year_birthday - today).days
                    birthday_date = this_year_birthday
                
                # 30 gün içinde mi kontrol et
                if 0 <= days_until <= 30:
                    upcoming_birthdays.append({
                        "name": emp.get("Ad Soyad", ""),
                        "department": emp.get("Departman", ""),
                        "position": emp.get("Pozisyon", ""),
                        "birth_date": birth_date_str,
                        "birthday_date": birthday_date.strftime("%Y-%m-%d"),
                        "days_until": days_until,
                        "age": current_year - birth_date.year + (1 if this_year_birthday < today else 0)
                    })
            except (ValueError, TypeError) as e:
                # Hatalı tarih formatı varsa atla
                continue
        
        # Yaklaşan doğum günlerini tarihe göre sırala
        upcoming_birthdays.sort(key=lambda x: x["days_until"])
        
        return {
            "success": True,
            "data": {
                "upcoming_birthdays": upcoming_birthdays,
                "total_employees": len(all_org_data)
            }
        }
    except Exception as e:
        # Hata durumunda boş liste döndür
        return {
            "success": True,
            "data": {
                "upcoming_birthdays": [],
                "total_employees": 0
            }
        }


@router.get("/api/health")
async def health_check():
    """Backend sağlık kontrolü"""
    return {"status": "ok", "message": "Backend çalışıyor"}
