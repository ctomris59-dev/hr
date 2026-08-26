from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from schemas.models import *
from routers.dependencies import get_current_user_role, get_current_user_dept, get_current_user_name, require_non_employee
from core.audit.service import get_audit_service
from app_state import CLEAN_DB, JOB_PROFILES, COMPETENCY_KEYS, is_data_cleared
from core.config import settings
from config import DB_360_FILE
import os
import random

router = APIRouter()

# Import comprehensive RBAC service
try:
    from services.hierarchy_service import (
        filter_data_by_hierarchy,
        can_access_recruitment,
        can_access_dashboard,
        can_access_organization,
        can_access_salary_simulation,
        can_access_team_management,
        can_access_budget,
        can_evaluate_employee,
        can_approve_leave,
        get_assignable_targets
    )
except ImportError:
    # Fallback if service not available
    def filter_data_by_hierarchy(user_role, user_dept, user_name, all_employees, module=None):
        if not all_employees:
            return []
        if user_role in ["CEO", "IK"]:
            return all_employees
        if user_role == "DIRECTOR" and user_dept:
            return [e for e in all_employees if (e.get("department") or e.get("Departman", "")) == user_dept]
        if user_role == "MANAGER" and user_dept:
            filtered = []
            for e in all_employees:
                if (e.get("department") or e.get("Departman", "")) == user_dept:
                    pos = (e.get("position") or e.get("Pozisyon", "")).lower()
                    if "direktör" not in pos and "director" not in pos and "ceo" not in pos and "başkan" not in pos:
                        filtered.append(e)
            return filtered
        if user_role in ["EMPLOYEE", "PERSONEL"] and user_name:
            return [e for e in all_employees if (e.get("name") or e.get("Ad Soyad", "")) == user_name]
        return []
    
    def can_access_recruitment(user_role, user_dept): return user_role in ["CEO", "IK"] or (user_role == "DIRECTOR" and "İnsan Kaynakları" in user_dept) or (user_role == "MANAGER" and "İnsan Kaynakları" in user_dept)
    def can_access_dashboard(user_role): return user_role in ["CEO", "IK", "DIRECTOR", "MANAGER"]
    def can_access_organization(user_role): return user_role in ["CEO", "IK", "DIRECTOR", "MANAGER"]
    def can_access_salary_simulation(user_role, user_dept): return user_role in ["CEO", "IK"] or (user_role == "DIRECTOR" and ("Finans" in user_dept or "Finance" in user_dept)) or (user_role == "MANAGER" and ("Finans" in user_dept or "Finance" in user_dept))
    def can_access_team_management(user_role): return user_role in ["CEO", "IK"]
    def can_access_budget(user_role): return user_role in ["DIRECTOR", "Direktör", "IK"]
    def can_evaluate_employee(*args): return False
    def can_approve_leave(*args): return False
    def get_assignable_targets(*args): return []


@router.get("/api/talent-matrix", dependencies=[Depends(require_non_employee)])
async def get_talent_matrix(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
    name: str = Depends(get_current_user_name)
):
    """
    Talent Matrix Endpoint - RBAC Protected:
    - CEO: All data
    - Director/Manager: Own department only
    - Employee: Own data only
    """
    # Eğer veriler temizlendiyse boş array döndür
    if is_data_cleared():
        return {"success": True, "data": []}
    
    # Önce dosyadan yükle
    all_talent_data = []
    try:
        from config import DB_ORG_FILE
        import os
        import json
        
        file_path = os.path.abspath(DB_ORG_FILE)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                org_data = json.load(f)
            if org_data and len(org_data) > 0:
                # Org-chart formatını talent-matrix formatına dönüştür
                # JOB_PROFILES'dan hedef puanları al
                from utils_db import load_360_data
                from services.employee_scores_service import (
                    is_demo_scores_active,
                    load_employee_scores_map,
                    derive_competency_scores_map,
                )
                from services.talent_service import get_target_profile

                data_360 = load_360_data()
                demo_scores_map = load_employee_scores_map() if is_demo_scores_active() else {}
                for idx, emp in enumerate(org_data):
                    name = emp.get("Ad Soyad", "")
                    if not name:  # Boş isim varsa atla
                        continue
                    
                    position = emp.get("Pozisyon", "")
                    department = emp.get("Departman", "")
                    # Pozisyona göre hedef profili belirle (Data Jobs öncelikli)
                    target_profile, _ = get_target_profile(position, department)
                    target_avg_score = None
                    if target_profile:
                        target_avg_score = sum(target_profile.values()) / len(target_profile)
                    
                    # Önce 360 verilerinden manager_scores çek
                    employee_360 = None
                    for record in data_360:
                        if record.get("Personel") == name or record.get("target") == name:
                            employee_360 = record
                            break
                    
                    # Test puanları oluştur (hedef profilin etrafında varyasyon)
                    # Backend'deki JOB_PROFILES kodlarla (STR, RES, COM, vb.) tanımlı
                    test_scores = {}
                    manager_scores = {}
                    position_competency_score = target_avg_score
                    employee_id = str(emp.get("id") or name)
                    score_record = demo_scores_map.get(employee_id) if demo_scores_map else None
                    if not score_record and demo_scores_map:
                        score_record = demo_scores_map.get(str(name))
                    if score_record:
                        seed_version = str(score_record.get("seed_version") or "")
                        employee_id = str(score_record.get("employee_id") or employee_id)
                        base_test_score = score_record.get("test_score")
                        base_manager_score = score_record.get("manager_score")
                        if base_test_score is not None:
                            base_test_score = float(base_test_score)
                            test_scores = derive_competency_scores_map(
                                base_test_score,
                                seed_version,
                                employee_id,
                                list(COMPETENCY_KEYS),
                                "test",
                            )
                        if base_manager_score is not None:
                            base_manager_score = float(base_manager_score)
                            manager_scores = derive_competency_scores_map(
                                base_manager_score,
                                seed_version,
                                employee_id,
                                list(COMPETENCY_KEYS),
                                "mgr",
                            )
                        if score_record.get("position_competency_score") is not None:
                            position_competency_score = float(score_record.get("position_competency_score"))
                    for comp_key in COMPETENCY_KEYS:
                        if not score_record:
                            # 360 verilerinden manager puanını çek (öncelikli)
                            if employee_360:
                                # Önce _Mgr, sonra _Mgr1, _Mgr2 kontrol et
                                mgr_val = (
                                    employee_360.get(f"{comp_key}_Mgr")
                                    or employee_360.get(f"{comp_key}_Mgr1")
                                    or employee_360.get(f"{comp_key}_Mgr2")
                                )
                                if mgr_val is not None and mgr_val != 0:
                                    try:
                                        manager_scores[comp_key] = round(float(mgr_val), 1)
                                    except:
                                        pass
                            
                            # Eğer 360'dan manager puanı yoksa, varsayılan değer kullan
                            # RANDOM ÜRETME - Sadece 360'dan gelen veriyi kullan
                            if comp_key not in manager_scores:
                                # 360 verisi yoksa, null bırak (henüz veri yok)
                                manager_scores[comp_key] = None
                            
                            # Test puanını sadece 360'dan çek (Self değerini test puanı olarak kullan)
                            # TÜRETME YOK - Sadece gerçek veri kullan
                            test_val = None
                            if employee_360:
                                # Self değerini test puanı olarak kullan
                                test_from_360 = employee_360.get(f"{comp_key}_Self")
                                if test_from_360 is not None and test_from_360 != 0:
                                    try:
                                        test_val = round(float(test_from_360), 1)
                                    except:
                                        pass
                            
                            # Test puanı yoksa null bırak (henüz veri yok)
                            test_scores[comp_key] = test_val
                        
                        # Manager puanı da sadece 360'dan gelir, türetme yok
                        # Eğer manager puanı 0 ise 0 bırak (frontend fallback yapacak)
                    
                    email_name = name.lower().replace(" ", ".").replace("ı", "i").replace("ğ", "g").replace("ü", "u").replace("ş", "s").replace("ö", "o").replace("ç", "c")
                    all_talent_data.append({
                        "id": idx + 1,
                        "name": name,
                        "position": position,
                        "department": department,
                        "email": f"{email_name}@futurehr.com",
                        "phone": f"+90 532 {random.randint(100, 999)} {random.randint(10, 99)} {random.randint(10, 99)}",
                        "performance": emp.get("Performans", 0),
                        "potential": emp.get("Potansiyel", 0),
                        "salary": emp.get("Maaş (TL)", 0),
                        "scores": test_scores,  # Mevcut (Test) puanları
                        "manager_scores": manager_scores,  # Yönetici (360°) puanları
                        "targets": target_profile,  # Hedef (Rol) puanları
                        "position_competency_score": position_competency_score,
                        "targetCompetencyScore": position_competency_score,
                        "test_score": float(score_record.get("test_score")) if score_record and score_record.get("test_score") is not None else None,
                        "manager_score": float(score_record.get("manager_score")) if score_record and score_record.get("manager_score") is not None else None,
                    })
                print(f"[Talent Matrix] Dosyadan {len(all_talent_data)} personel yüklendi")
    except Exception as e:
        print(f"[Talent Matrix] Dosya okuma hatası: {e}")
        all_talent_data = []
    
    # Dosya yoksa veya boşsa, boş array döndür (CLEAN_DB kullanma - eski veri göstermesin)
    if not all_talent_data:
        # Eğer data_cleared flag'i varsa kesinlikle boş döndür
        if is_data_cleared():
            return {"success": True, "data": []}
        # Flag yoksa da boş döndür (dosya yoksa veri yok demektir)
        return {"success": True, "data": []}
    
    # Apply RBAC filtering using comprehensive hierarchy service
    filtered_data = filter_data_by_hierarchy(
        role or "CEO",
        dept or "Yönetim",
        name or "",
        all_talent_data,
        module="talent-matrix"
    )
    response = {"success": True, "data": filtered_data}

    # Debug info (only non-production)
    if settings.APP_ENV != "production" and settings.ENVIRONMENT != "production":
        data_360_count = len(data_360) if "data_360" in locals() else 0
        response["debug"] = {
            "filters": {
                "role": role,
                "dept": dept,
                "name": name,
            },
            "counts": {
                "org_records": len(all_talent_data),
                "data_360_records": data_360_count,
                "filtered_records": len(filtered_data),
            },
            "source": {
                "org_file": file_path if "file_path" in locals() else None,
                "360_file": os.path.abspath(DB_360_FILE),
            },
            "notes": "Data loaded from JSON stores; 360 data missing results in zero scores."
        }
    
    return response


@router.get("/api/job-profiles/report", dependencies=[Depends(require_non_employee)])
async def get_job_profile_report():
    from services.talent_service import build_job_profile_gap_report
    report = build_job_profile_gap_report()
    return {"success": True, "data": report}


@router.get("/api/org-chart", dependencies=[Depends(require_non_employee)])
async def get_org_chart(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept),
    name: str = Depends(get_current_user_name)
):
    """
    Organization Chart Endpoint - RBAC Protected.
    Router layer - only handles HTTP request/response.
    """
    try:
        from domain.services.org_chart_service import OrgChartService
        
        service = OrgChartService()
        result = service.get_org_chart(
            user_role=role,
            user_dept=dept,
            user_name=name
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Org chart yükleme hatası: {str(e)}")


@router.get("/api/org-chart/template")
async def download_org_chart_template():
    """
    Excel şablonunu indir - Akıllı dropdown listeleri ile
    """
    try:
        from legacy.ui_org import generate_smart_excel_template
        from utils_db import load_org_chart
        
        org_data = load_org_chart()
        template_data = generate_smart_excel_template(org_data)
        
        return Response(
            content=template_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=Personel_Listesi_Sablonu.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Şablon oluşturma hatası: {str(e)}")


@router.post("/api/org-chart/upload-excel")
async def upload_org_chart_excel(file: UploadFile = File(...)):
    """
    Excel dosyası yükle ve personel ekle
    """
    try:
        from legacy.ui_org import process_excel_upload
        from utils_db import load_org_chart, save_org_chart
        
        # Dosya içeriğini oku
        file_content = await file.read()
        
        # Excel'i işle
        result = process_excel_upload(file_content)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Excel işleme hatası"))
        
        new_records = result["data"]
        
        # Mevcut verilere ekle
        org_data = load_org_chart()
        if org_data:
            org_data.extend(new_records)
        else:
            org_data = new_records
        
        save_org_chart(org_data)
        
        return {
            "success": True,
            "message": f"{len(new_records)} personel başarıyla eklendi!",
            "count": len(new_records),
            "warnings": result.get("warnings", []),
            "preview": result.get("preview", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel yükleme hatası: {str(e)}")


@router.post("/api/org-chart/add-employee")
async def add_org_chart_employee(
    request: OrgChartAddEmployeeRequest,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name)
):
    """
    Manuel olarak yeni personel ekle
    """
    try:
        from legacy.ui_org import add_manual_employee
        from core.audit.service import get_audit_service
        
        name = request.name.strip()
        department = request.department
        position = request.position
        salary = float(request.salary)
        tenure = float(request.tenure)
        leave_days = int(request.leave_days)
        manager1 = request.manager1
        manager2 = request.manager2
        birth_date = request.birth_date
        
        result = add_manual_employee(
            name=name,
            department=department,
            position=position,
            salary=salary,
            tenure=tenure,
            leave_days=leave_days,
            manager1=manager1,
            manager2=manager2,
            birth_date=birth_date
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Personel ekleme hatası"))
        
        # Audit logging
        try:
            audit_service = get_audit_service()
            audit_service.log_employee_created(
                actor_id=name,
                actor_name=name,
                actor_role=role,
                employee_name=name,
            )
        except Exception as audit_error:
            from core.logging_config import get_logger
            logger = get_logger(__name__)
            logger.error(f"Failed to log employee creation audit: {audit_error}")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Personel ekleme hatası: {str(e)}")


@router.get("/api/org-chart/stats")
async def get_org_chart_statistics():
    """
    Organizasyon şeması istatistiklerini döndür
    """
    try:
        from legacy.ui_org import get_org_chart_stats
        
        stats = get_org_chart_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İstatistik hesaplama hatası: {str(e)}")


@router.put("/api/org-chart/update")
async def update_org_chart_data(request: OrgChartUpdateRequest):
    """
    Organizasyon şemasını güncelle
    """
    try:
        from legacy.ui_org import update_org_chart
        
        updated_data = request.data
        if not isinstance(updated_data, list):
            raise HTTPException(status_code=400, detail="data alanı bir liste olmalıdır")
        
        result = update_org_chart(updated_data)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Güncelleme hatası"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Güncelleme hatası: {str(e)}")
