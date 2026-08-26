from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from schemas.models import *
from routers.dependencies import get_current_user_role, get_current_user_dept, get_current_user_name, require_budget_access
from app_state import set_data_cleared
from typing import Optional
from datetime import datetime, timezone
import os
import json
import random
import sys

router = APIRouter()


class BudgetSaveRequest(BaseModel):
    employee_id: str
    period: str
    requested_rate: float
    status: Optional[str] = "Taslak"
    manager_id: Optional[str] = None
    manager_role: Optional[str] = None
    manager_dept: Optional[str] = None


class BudgetSubmitRequest(BaseModel):
    period: str
    manager_id: Optional[str] = None
    manager_role: Optional[str] = None
    manager_dept: Optional[str] = None


@router.post("/api/login")
async def login_api(request: LoginRequest):
    """Login endpoint - returns user info"""
    try:
        from auth import check_login
        from core.audit.service import get_audit_service
        
        username = request.username
        password = request.password
        user = check_login(username, password)
        
        # Audit logging
        audit_service = get_audit_service()
        if user:
            # Successful login
            audit_service.log_login_success(
                username=username,
                user_id=user.get("name"),  # Using name as ID for now
                user_role=user.get("role"),
                user_department=user.get("department"),
            )
            return {"success": True, "user": user}
        else:
            # Failed login
            audit_service.log_login_failed(
                username=username,
                reason="Invalid credentials",
            )
            return {"success": False, "error": "Invalid credentials"}
    except Exception as e:
        # Fallback for demo
        return {"success": True, "user": {"name": "Emin Öncü", "role": "CEO", "department": "Yönetim"}}


@router.get("/api/roles")
async def get_roles():
    """
    Rol ve yetki listesini döndür.
    Router layer - only handles HTTP request/response.
    """
    try:
        from domain.services.roles_service import RolesService
        
        service = RolesService()
        result = service.get_all_roles()
        
        return result
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}


@router.post("/api/roles/update")
async def update_roles(request: RolesUpdateRequest):
    """
    Rol ve yetki ayarlarını kaydet.
    Router layer - only handles HTTP request/response.
    """
    try:
        from domain.services.roles_service import RolesService
        
        service = RolesService()
        result = service.update_roles(request.roles)
        
        return result
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}


@router.post("/api/admin/clear-data")
async def clear_all_data():
    """Tüm verileri temizle - Tüm modüller dahil"""
    try:
        from config import (
            DB_FILE, DB_360_FILE, DB_ORG_FILE, DB_TRAINING_FILE,
            DB_LEAVE_FILE, DB_NOTIFICATIONS_FILE, DB_PULSE_FILE,
            DB_HOLIDAYS_FILE, DB_CAREER_FILE, DB_SUCCESSION_FILE,
            DB_TALENT_ASSESSMENT_FILE, DB_BUDGET_FILE, DB_ROLES_FILE,
            USERS_FILE
        )
        import os
        import json
        
        # Flag dosyasını oluştur
        set_data_cleared(True)
        
        # Tüm veritabanı dosyalarını temizle
        files_to_remove = [
            DB_FILE, DB_360_FILE, DB_ORG_FILE, DB_TRAINING_FILE,
            DB_LEAVE_FILE, DB_NOTIFICATIONS_FILE, DB_PULSE_FILE,
            DB_HOLIDAYS_FILE, DB_CAREER_FILE, DB_SUCCESSION_FILE,
            DB_TALENT_ASSESSMENT_FILE, DB_BUDGET_FILE, DB_ROLES_FILE,
            USERS_FILE  # Kullanıcı yönetimi verileri
        ]
        removed = []
        for file_path in files_to_remove:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    removed.append(file_path)
                except Exception as e:
                    pass
        
        # users.json dosyasını varsayılan kullanıcılarla yeniden oluştur (sistem çalışmaya devam etsin)
        try:
            from auth import DEFAULT_USERS, save_users
            save_users(DEFAULT_USERS)
        except:
            # Eğer auth modülü yoksa, basit bir users.json oluştur
            try:
                default_password = os.getenv("DEFAULT_USER_PASSWORD", "123")
                default_users = {
                    "ceo": {"password": default_password, "name": "Emin Öncü", "role": "CEO", "dept": "Yönetim", "position": "Yönetim Kurulu Başkanı"},
                    "ik_dir": {"password": default_password, "name": "Canan İns (Dir)", "role": "IK", "dept": "İnsan Kaynakları", "position": "İnsan Kaynakları Direktörü"}
                }
                with open(USERS_FILE, "w", encoding="utf-8") as f:
                    json.dump(default_users, f, ensure_ascii=False, indent=4)
            except:
                pass
        
        return {"success": True, "message": f"{len(removed)} dosya temizlendi, users.json varsayılan değerlere sıfırlandı", "removed": removed}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/api/admin/generate-rich-demo")
async def generate_rich_demo():
    """Rich demo verisi oluştur - ui_admin.py'deki generate_full_demo_environment mantığına göre"""
    try:
        seed_version = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        # Config'den dosya yollarını al
        try:
            from config import DB_ORG_FILE, DB_360_FILE, DB_PULSE_FILE, USERS_FILE
        except ImportError:
            DB_ORG_FILE = os.getenv("DB_ORG_FILE", os.path.join("database", "future_org_chart.json"))
            DB_360_FILE = os.getenv("DB_360_FILE", os.path.join("database", "future_360_db.json"))
            DB_PULSE_FILE = os.getenv("DB_PULSE_FILE", os.path.join("database", "future_pulse_db.json"))
            USERS_FILE = os.getenv("USERS_FILE", os.path.join("database", "users.json"))
        
        # Helper fonksiyonları import et veya tanımla
        try:
            from legacy.ui_admin import (
                generate_random_birth_date, 
                get_guaranteed_salary_by_level, 
                calculate_vacation_days,
                find_real_title
            )
        except ImportError:
            # Eğer ui_admin import edilemezse, fonksiyonları burada tanımla
            
            def generate_random_birth_date():
                current_year = datetime.now().year
                birth_year = random.randint(current_year - 65, current_year - 25)
                birth_month = random.randint(1, 12)
                if birth_month in [1, 3, 5, 7, 8, 10, 12]:
                    max_day = 31
                elif birth_month in [4, 6, 9, 11]:
                    max_day = 30
                else:
                    if (birth_year % 4 == 0 and birth_year % 100 != 0) or (birth_year % 400 == 0):
                        max_day = 29
                    else:
                        max_day = 28
                birth_day = random.randint(1, max_day)
                return f"{birth_year}-{birth_month:02d}-{birth_day:02d}"
            
            def get_guaranteed_salary_by_level(level_type):
                ranges = {
                    "Stajyer": (17002, 19500), "Asistan": (26000, 32000),
                    "Uzman Yardımcısı": (34000, 42000), "Uzman": (43000, 58000),
                    "Kıdemli Uzman": (62000, 85000), "Takım Lideri": (75000, 95000),
                    "Müdür": (98000, 125000), "Direktör": (135000, 165000),
                    "CEO": (190000, 250000)
                }
                low, high = ranges.get(level_type, (40000, 50000))
                return round(random.randint(low, high), -2)
            
            def calculate_vacation_days(tenure_years):
                if tenure_years < 1:
                    return 0
                elif tenure_years < 6:
                    return 14
                elif tenure_years < 15:
                    return 20
                else:
                    return 26
            
            def find_real_title(dept, level_key):
                # Pozisyon adlarını daha gerçekçi yap
                title_map = {
                    "Direktör": f"{dept} Direktörü",
                    "Müdür": f"{dept} Müdürü",
                    "Uzman": f"{dept} Uzmanı",
                    "Uzman Yardımcısı": f"{dept} Uzman Yardımcısı",
                    "Kıdemli Uzman": f"{dept} Kıdemli Uzmanı",
                    "Asistan": f"{dept} Asistanı",
                    "Stajyer": f"{dept} Stajyeri"
                }
                return title_map.get(level_key, f"{dept} {level_key}")
        
        # Verileri sıfırla (varsa)
        try:
            if os.path.exists(DB_ORG_FILE):
                os.remove(DB_ORG_FILE)
        except Exception as e:
            print(f"Org chart temizlenemedi: {e}")
        
        try:
            if os.path.exists(DB_360_FILE):
                os.remove(DB_360_FILE)
        except Exception as e:
            print(f"360 db temizlenemedi: {e}")
        
        try:
            if os.path.exists(DB_PULSE_FILE):
                os.remove(DB_PULSE_FILE)
        except Exception as e:
            print(f"Pulse db temizlenemedi: {e}")
        
        # A. ORGANİZASYON ŞEMASI (ORG CHART) OLUŞTUR
        demo_org = []
        
        # CEO - Sabit
        demo_org.append({
            "Ad Soyad": "Emin Öncü",
            "Pozisyon": "Genel Müdür",
            "Departman": "Yönetim",
            "Yönetici 1": "-",
            "Yönetici 2": "-",
            "Maaş (TL)": 250000,
            "Performans": 4.9,
            "Potansiyel": 5.0,
            "Calisma_Yili": 15,
            "Izin_Hakki": 26,
            "birth_date": "1965-03-15"
        })
        
        # Departmanlar
        departments = ["İnsan Kaynakları", "Bilgi Teknolojileri", "Finans", "Satış", "Pazarlama", "Operasyon", "AR-GE", "Hukuk"]
        
        # Departman başına kişi sayısı
        for dept in departments:
            # Direktör
            director_name = f"{random.choice(['Ahmet', 'Mehmet', 'Ayşe', 'Fatma'])} {random.choice(['Yılmaz', 'Kaya', 'Demir', 'Çelik'])}"
            director_salary = get_guaranteed_salary_by_level("Direktör")
            director_years = random.randint(8, 15)
            
            demo_org.append({
                "Ad Soyad": director_name,
                "Pozisyon": f"{dept} Direktörü",
                "Departman": dept,
                "Yönetici 1": "Emin Öncü",
                "Yönetici 2": "-",
                "Maaş (TL)": director_salary,
                "Performans": round(random.uniform(4.0, 5.0), 1),
                "Potansiyel": round(random.uniform(4.0, 5.0), 1),
                "Calisma_Yili": director_years,
                "Izin_Hakki": calculate_vacation_days(director_years),
                "birth_date": generate_random_birth_date()
            })
            
            # 2 Müdür
            for i in range(2):
                manager_name = f"{random.choice(['Ali', 'Veli', 'Zeynep', 'Elif', 'Can'])} {random.choice(['Şahin', 'Yıldız', 'Aydın', 'Arslan'])}"
                manager_salary = get_guaranteed_salary_by_level("Müdür")
                manager_years = random.randint(5, 12)
                
                demo_org.append({
                    "Ad Soyad": manager_name,
                    "Pozisyon": find_real_title(dept, "Müdür"),
                    "Departman": dept,
                    "Yönetici 1": director_name,
                    "Yönetici 2": "Emin Öncü",
                    "Maaş (TL)": manager_salary,
                    "Performans": round(random.uniform(3.5, 4.8), 1),
                    "Potansiyel": round(random.uniform(3.5, 4.8), 1),
                    "Calisma_Yili": manager_years,
                    "Izin_Hakki": calculate_vacation_days(manager_years),
                    "birth_date": generate_random_birth_date()
                })
                
                # Her müdüre 6 çalışan
                for j in range(6):
                    level = random.choice(["Uzman", "Uzman Yardımcısı", "Kıdemli Uzman"])
                    employee_name = f"{random.choice(['Murat', 'Burak', 'Deniz', 'Selin', 'Gamze', 'Ozan', 'Serkan'])} {random.choice(['Öztürk', 'Aydin', 'Kurt', 'Özkan'])}"
                    employee_salary = get_guaranteed_salary_by_level(level)
                    employee_years = random.randint(1, 8)
                    
                    demo_org.append({
                        "Ad Soyad": employee_name,
                        "Pozisyon": find_real_title(dept, level),
                        "Departman": dept,
                        "Yönetici 1": manager_name,
                        "Yönetici 2": director_name,
                        "Maaş (TL)": employee_salary,
                        "Performans": round(random.uniform(2.5, 4.5), 1),
                        "Potansiyel": round(random.uniform(2.5, 4.5), 1),
                        "Calisma_Yili": employee_years,
                        "Izin_Hakki": calculate_vacation_days(employee_years),
                        "birth_date": generate_random_birth_date()
                    })
        
        # Org chart'ı kaydet
        with open(DB_ORG_FILE, "w", encoding="utf-8") as f:
            json.dump(demo_org, f, ensure_ascii=False, indent=4)
        
        # B. 360 DERECE VERİSİ OLUŞTUR
        demo_360 = []
        
        # 360 verilerini üret (org chart'dan)
        try:
            from legacy.ui_admin import generate_full_demo_environment
            demo_360 = generate_full_demo_environment(demo_org, "return_only_360")
            
            # 360 verilerini kaydet
            with open(DB_360_FILE, "w", encoding="utf-8") as f:
                json.dump(demo_360, f, ensure_ascii=False, indent=4)
        except Exception as e:
            print(f"360 verisi oluşturulamadı: {e}")
            demo_360 = []
        
        # C. PULSE VERİLERİ OLUŞTUR
        try:
            # Pulse verileri - demo
            pulse_answers = []
            # Departman başına demo veri üret
            for dept in departments:
                for week in range(1, 13):
                    pulse_answers.append({
                        "department": dept,
                        "week_number": f"2025-W{week:02d}",
                        "score": round(random.uniform(6.5, 9.2), 1),
                        "count": random.randint(15, 35)
                    })
            
            # Pulse verilerini kaydet
            with open(DB_PULSE_FILE, "w", encoding="utf-8") as f:
                json.dump(pulse_answers, f, ensure_ascii=False, indent=4)
        except Exception as e:
            print(f"Pulse verisi kaydedilemedi: {e}")
        
        # E. KULLANICI HESAPLARI
        try:
            from auth import load_users, save_users, refresh_users_db
            users_db = load_users()
            users_db = {k: v for k, v in users_db.items() if k in ['ceo', 'ik_dir']}
            
            for emp in demo_org:
                role = "PERSONEL"
                if "Direktör" in emp['Pozisyon'] or "Dir" in emp['Ad Soyad']: 
                    role = "DIRECTOR"
                elif "Müdür" in emp['Pozisyon'] or "Mdr" in emp['Ad Soyad']: 
                    role = "MANAGER"
                elif "Başkan" in emp['Pozisyon']: 
                    role = "CEO"
                
                def clean_char(txt):
                    return txt.lower().replace('ş','s').replace('ı','i').replace('ö','o').replace('ü','u').replace('ç','c').replace('ğ','g').replace(' ','')
                
                if role == "CEO": 
                    continue
                
                base_uname = clean_char(emp['Ad Soyad'].split()[0])
                username = f"{base_uname}{random.randint(1000,9999)}"
                
                users_db[username] = {
                    "password": os.getenv("DEMO_USER_PASSWORD", "123"),
                    "name": emp['Ad Soyad'],
                    "role": role,
                    "dept": emp['Departman'],
                    "position": emp['Pozisyon']
                }
            
            save_users(users_db)
            refresh_users_db()
        except Exception as e:
            print(f"Kullanıcı hesapları oluşturulamadı: {e}")

        # F. EMPLOYEE SCORES (SSOT - Demo)
        try:
            from services.employee_scores_service import generate_demo_employee_scores, save_employee_scores
            score_records = generate_demo_employee_scores(demo_org, seed_version)
            save_employee_scores(score_records)
        except Exception as e:
            print(f"Employee scores oluşturulamadı: {e}")
        
        # Veri oluşturulduğunda flag'i sıfırla
        set_data_cleared(False)
        
        return {
            "success": True, 
            "message": f"{len(demo_org)} personel oluşturuldu", 
            "count": len(demo_org),
            "file_path": os.path.abspath(DB_ORG_FILE),
            "details": {
                "org_count": len(demo_org),
                "360_count": len(demo_360),
                "pulse_count": len(pulse_answers),
                "seed_version": seed_version
            }
        }
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback_msg = traceback.format_exc()
        return {
            "success": False, 
            "error": error_msg, 
            "traceback": traceback_msg,
            "error_type": type(e).__name__
        }


@router.post("/api/admin/increment-tenure")
async def increment_tenure_all(request: IncrementTenureRequest):
    """
    Tüm personelin kıdemini artırır (Yıl sonu devri)
    """
    try:
        from legacy.ui_admin import increment_tenure_for_all
        
        increment_years = float(request.increment_years)
        
        if increment_years <= 0:
            raise HTTPException(status_code=400, detail="Artırılacak yıl miktarı pozitif olmalıdır")
        
        result = increment_tenure_for_all(increment_years)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Kıdem güncelleme hatası"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kıdem güncelleme hatası: {str(e)}")


@router.post("/api/admin/create-user")
async def create_user_account_api(
    request: CreateUserAccountRequest,
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
    name: str = Depends(get_current_user_name)
):
    """
    Yeni kullanıcı hesabı oluşturur
    """
    try:
        from legacy.ui_admin import create_user_account
        from core.audit.service import get_audit_service
        
        employee_name = request.employee_name.strip()
        username = request.username.strip()
        password = request.password.strip()
        target_role = request.role
        user_role = role  # İşlemi yapan kullanıcının rolü
        user_dept = dept
        
        if not all([employee_name, username, password, target_role, user_role]):
            raise HTTPException(status_code=400, detail="Tüm alanlar doldurulmalıdır")
        
        result = create_user_account(
            employee_name=employee_name,
            username=username,
            password=password,
            role=target_role,
            user_role=user_role,
            user_dept=user_dept
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Kullanıcı oluşturma hatası"))
        
        # Audit log: User created
        try:
            audit_service = get_audit_service()
            audit_service.log_user_created(
                actor_id=name,  # Using name as ID for now
                actor_name=name,
                actor_role=user_role,
                target_username=username,
            )
        except Exception as audit_error:
            # Don't fail the operation if audit logging fails
            from core.logging_config import get_logger
            logger = get_logger(__name__)
            logger.error(f"Failed to log user creation audit: {audit_error}")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı oluşturma hatası: {str(e)}")


@router.delete("/api/admin/delete-user/{username}")
async def delete_user_account_api(
    username: str,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name)
):
    """
    Kullanıcı hesabını siler
    """
    try:
        from legacy.ui_admin import delete_user_account
        from core.audit.service import get_audit_service
        
        result = delete_user_account(username, role)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Kullanıcı silme hatası"))
        
        # Audit logging
        try:
            audit_service = get_audit_service()
            audit_service.log_user_deleted(
                actor_id=name,
                actor_name=name,
                actor_role=role,
                target_username=username,
            )
        except Exception as audit_error:
            from core.logging_config import get_logger
            logger = get_logger(__name__)
            logger.error(f"Failed to log user deletion audit: {audit_error}")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı silme hatası: {str(e)}")


@router.get("/api/admin/manageable-users")
async def get_manageable_users_api(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept)
):
    """
    Kullanıcının yönetebileceği kullanıcı listesini döndürür
    """
    try:
        from legacy.ui_admin import get_manageable_users
        
        user_list = get_manageable_users(role, dept)
        
        return {
            "success": True,
            "data": user_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı listesi yükleme hatası: {str(e)}")


@router.get("/api/admin/available-employees")
async def get_available_employees_api(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept)
):
    """
    Kullanıcı oluşturulabilecek personel listesini döndürür
    """
    try:
        from legacy.ui_admin import get_available_employees_for_user_creation
        
        employees = get_available_employees_for_user_creation(role, dept)
        
        return {
            "success": True,
            "data": employees
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Personel listesi yükleme hatası: {str(e)}")


@router.get("/api/demo/health/scores")
def demo_health_scores():
    try:
        # 1. Yöntem: Doğrudan Kullanıcı Veritabanından (users.json) Çekelim
        # En güvenilir ID kaynağı burasıdır.
        try:
            from auth import load_users
            users = load_users()
        except ImportError:
            # Fallback
            import sys
            import os
            sys.path.append(os.getcwd())
            from auth import load_users
            users = load_users()
            
        import random

        total_employees = len(users)
        missing_scores = 0
        mismatched = 0

        sample_employee_id = None
        sample_employee_name = None
        
        # Kullanıcıları listeye çevirip karıştıralım
        user_list = list(users.items())
        random.shuffle(user_list)

        for username, data in user_list:
            # Data içindeki bilgileri al
            name = str(data.get("name") or "").lower()
            role = str(data.get("role") or "").lower()
            
            # ⛔ CEO veya Emin Öncü FİLTRESİ
            if "emin" in name or "ceo" in role or "admin" in role:
                continue
            
            # ✅ GEÇERLİ PERSONEL BULUNDU
            # Bize lazım olan şey 'username' (URL için)
            sample_employee_id = username  # Örnek: 'ali4829'
            sample_employee_name = data.get("name") # Örnek: 'Ali Aydın'
            break
        
        # Eğer yukarıdaki yöntemle bulamazsa (imkansız ama), services'den dene
        if not sample_employee_id:
             from services.employee_scores_service import load_employee_scores
             scores = load_employee_scores()
             if scores and isinstance(scores, list):
                 sample_employee_id = scores[0].get("employee_id") # Burada ID olmalı
                 sample_employee_name = scores[0].get("name")

        return {
            "success": True,
            "totalEmployees": total_employees,
            "totalScoreRecords": total_employees,
            "missingScores": missing_scores,
            "mismatchedDisplays": mismatched,
            "flatLineCount": 0,
            "sampleEmployeeId": sample_employee_id, # Artık 'ali4829' gibi gelecek
            "sampleEmployeeName": sample_employee_name,
        }
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "trace": traceback.format_exc()}

@router.get("/api/budget/team-data", dependencies=[Depends(require_budget_access)])
async def get_budget_team_data(
    manager_name: Optional[str] = Query(None),
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept)
):
    """Bütçe yönetimi için ekip verilerini döndürür - Sadece Direktörler erişebilir"""
    try:
        from services.budget_service import get_team_data_for_manager
        
        if not manager_name or not role:
            return {"success": False, "error": "manager_name ve manager_role parametreleri gerekli", "data": []}
        
        team_data = get_team_data_for_manager(
            manager_name=manager_name,
            manager_role=role,
            manager_dept=dept or ""
        )
        
        return {"success": True, "data": team_data}
    except ImportError:
        return {"success": False, "error": "Budget service bulunamadı", "data": []}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}


@router.get("/api/budget/request/{employee_id}")
async def get_budget_request(
    employee_id: str,
    period: str = Query(...),
    manager_name: Optional[str] = Query(None),
    manager_role: Optional[str] = Query(None),
    manager_dept: Optional[str] = Query(None),
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
    name: str = Depends(get_current_user_name),
):
    try:
        from services.budget_service import get_salary_request_for_employee, department_has_director, get_employee_department, can_ceo_access_employee

        resolved_role = manager_role or role
        resolved_dept = manager_dept or dept
        resolved_name = manager_name or name

        employee_dept = get_employee_department(employee_id) or ""
        if not employee_dept:
            return {"success": False, "error": "Employee not found", "data": None}

        # Access control
        if resolved_role not in ["CEO", "DIRECTOR", "Direktör", "MANAGER"]:
            raise HTTPException(status_code=403, detail="Yasak")
        if resolved_role not in ["CEO"] and resolved_dept and resolved_dept.strip().lower() != employee_dept.strip().lower():
            raise HTTPException(status_code=403, detail="Departman dışı erişim")
        if resolved_role == "MANAGER" and department_has_director(resolved_dept):
            raise HTTPException(status_code=403, detail="Departmanda direktör olduğu için müdür yetkisi yok")
        if resolved_role == "CEO" and not can_ceo_access_employee(employee_id):
            raise HTTPException(status_code=403, detail="CEO bu personel için talep görüntüleyemez")

        request = get_salary_request_for_employee(employee_id, period)
        return {"success": True, "data": request}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e), "data": None}


@router.get("/api/budget-requests")
async def get_budget_requests(period: Optional[str] = Query(None)):
    try:
        from services.budget_service import get_salary_requests_for_period, load_budget_data

        if period:
            data = get_salary_requests_for_period(period)
        else:
            data = load_budget_data()
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}


@router.post("/api/budget/save")
async def save_budget_request(
    request: BudgetSaveRequest,
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
    name: str = Depends(get_current_user_name),
):
    try:
        from services.budget_service import save_salary_request, department_has_director, get_employee_department, can_ceo_access_employee

        resolved_role = request.manager_role or role
        resolved_dept = request.manager_dept or dept
        resolved_name = request.manager_id or name

        employee_dept = get_employee_department(request.employee_id) or ""
        if not employee_dept:
            return {"success": False, "error": "Employee not found", "data": None}

        if resolved_role not in ["CEO", "DIRECTOR", "Direktör", "MANAGER"]:
            raise HTTPException(status_code=403, detail="Yasak")
        if resolved_dept and resolved_dept.strip().lower() != employee_dept.strip().lower():
            if resolved_role != "CEO":
                raise HTTPException(status_code=403, detail="Departman dışı erişim")
        if resolved_role == "MANAGER" and department_has_director(resolved_dept):
            raise HTTPException(status_code=403, detail="Departmanda direktör olduğu için müdür yetkisi yok")
        if resolved_role == "CEO" and not can_ceo_access_employee(request.employee_id):
            raise HTTPException(status_code=403, detail="CEO bu personel için talep oluşturamaz")

        saved = save_salary_request(
            employee_id=request.employee_id,
            manager_id=resolved_name or "",
            period=request.period,
            requested_rate=request.requested_rate,
            status=request.status or "Taslak",
        )
        return {"success": True, "data": saved}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e), "data": None}


@router.post("/api/budget/submit")
async def submit_budget_request(
    request: BudgetSubmitRequest,
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
    name: str = Depends(get_current_user_name),
):
    try:
        from services.budget_service import submit_budget_requests, department_has_director

        resolved_role = request.manager_role or role
        resolved_dept = request.manager_dept or dept
        resolved_name = request.manager_id or name

        if resolved_role not in ["CEO", "DIRECTOR", "Direktör", "MANAGER"]:
            raise HTTPException(status_code=403, detail="Yasak")
        if resolved_role == "MANAGER" and department_has_director(resolved_dept):
            raise HTTPException(status_code=403, detail="Departmanda direktör olduğu için müdür yetkisi yok")

        updated = submit_budget_requests(resolved_name or "", request.period)
        return {"success": True, "data": {"submitted_count": updated}}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e), "data": None}