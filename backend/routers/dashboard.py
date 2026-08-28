from fastapi import APIRouter, Depends, Query, HTTPException
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
    score: float = Field(..., ge=1, le=10)
    week_number: str = Field(..., min_length=1)


class PulseSubmitRequest(BaseModel):
    user_name: str = Field(..., min_length=1)
    score: float = Field(..., ge=1, le=10)
    feedback: Optional[str] = Field(default=None, max_length=500)
    department_id: Optional[str] = None


def _pulse_week_context():
    now = datetime.now()
    iso = now.isocalendar()
    week_number = f"{iso.year}-W{iso.week:02d}"
    week_start = (now - timedelta(days=now.weekday())).date().isoformat()
    return week_number, week_start


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


@router.get("/api/pulse/status")
async def get_pulse_status(user_name: str = Query(..., min_length=1)):
    """Return whether the employee already submitted this week's check-in."""
    from utils_db import load_pulse_answers
    week_number, week_start = _pulse_week_context()
    normalized_name = user_name.strip().casefold()
    submitted = any(
        str(item.get("employee_name") or item.get("user_name") or "").strip().casefold() == normalized_name
        and item.get("week_number") == week_number
        for item in load_pulse_answers()
    )
    return {"success": True, "hasSubmitted": submitted, "weekStart": week_start}


@router.post("/api/pulse/submit")
async def submit_pulse_response(request: PulseSubmitRequest):
    """Persist one real 1-10 employee-experience check-in per employee/week."""
    from utils_db import load_org_chart, load_pulse_answers, save_pulse_answer
    week_number, _ = _pulse_week_context()
    normalized_name = request.user_name.strip().casefold()
    existing = any(
        str(item.get("employee_name") or item.get("user_name") or "").strip().casefold() == normalized_name
        and item.get("week_number") == week_number
        for item in load_pulse_answers()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Bu haftanın check-in'i zaten gönderildi.")

    employee = next(
        (
            item for item in load_org_chart()
            if str(item.get("Ad Soyad") or item.get("name") or "").strip().casefold() == normalized_name
        ),
        {},
    )
    department = request.department_id or employee.get("Departman") or employee.get("department") or "Belirtilmemiş"
    employee_id = str(employee.get("id") or employee.get("employee_id") or request.user_name)
    saved = save_pulse_answer(
        employee_id=employee_id,
        employee_name=request.user_name.strip(),
        department_id=str(department),
        department_name=str(department),
        score=request.score,
        week_number=week_number,
        feedback=request.feedback,
    )
    return {"success": bool(saved), "message": "Check-in kaydedildi."}


@router.get("/api/pulse/data")
async def get_pulse_data(department: Optional[str] = None):
    """Return stored employee-experience check-ins without synthetic data."""
    from utils_db import load_pulse_answers
    answers = load_pulse_answers()
    if department:
        answers = [
            item for item in answers
            if item.get("department_id") == department or item.get("department_name") == department
        ]
    return {"success": True, "data": answers}


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
    user_role: Optional[str] = None,
    user_dept: Optional[str] = None,
    user_department: Optional[str] = None,
    department_id: Optional[str] = None,
):
    """Return real weekly employee-experience trends with role/scope filtering."""
    try:
        from utils_db import get_pulse_trends
        effective_role = user_role or role
        effective_dept = user_dept or user_department or dept
        target_dept = department_id
        if not target_dept and effective_role not in ["CEO", "IK", "admin"]:
            target_dept = effective_dept or None
        return {"success": True, "data": get_pulse_trends(target_dept)}
    except Exception as exc:
        return {"success": False, "data": [], "error": str(exc)}


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
