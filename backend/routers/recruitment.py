from fastapi import APIRouter, Depends, Header, HTTPException
from schemas.models import *
from typing import Optional

from core.config import get_settings

router = APIRouter()

# Import comprehensive RBAC service (recruitment access only)
try:
    from services.hierarchy_service import can_access_recruitment
except ImportError:
    def can_access_recruitment(user_role, user_dept): return user_role in ["CEO", "IK"] or (user_role == "DIRECTOR" and "İnsan Kaynakları" in user_dept) or (user_role == "MANAGER" and "İnsan Kaynakları" in user_dept)


async def get_current_user_role(x_user_role: Optional[str] = Header(None)) -> str:
    """Get current user role. In development mode, ALWAYS returns CEO (bypass auth)."""
    settings = get_settings()
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return "CEO"  # Always CEO in dev, ignore header
    return x_user_role or "EMPLOYEE"


async def get_current_user_dept(x_user_dept: Optional[str] = Header(None)) -> str:
    """Get current user department. In development mode, ALWAYS returns Yönetim (bypass auth)."""
    settings = get_settings()
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return "Yönetim"  # Always Yönetim in dev, ignore header
    return x_user_dept or ""


async def require_recruitment_access(
    role: str = Depends(get_current_user_role),
    dept: str = Depends(get_current_user_dept)
) -> None:
    """Require recruitment access. Bypassed in development mode."""
    settings = get_settings()
    if settings.ENVIRONMENT == "development" or settings.APP_ENV == "development":
        return  # Bypass in development - allow all
    if not can_access_recruitment(role, dept):
        raise HTTPException(
            status_code=403,
            detail="Access denied. Only CEO, HR Director, and HR Manager can access recruitment data."
        )


def _calculate_avg_score(raw_scores: dict) -> float:
    if not raw_scores:
        return 0.0
    values = [float(v) for v in raw_scores.values() if v is not None]
    if not values:
        return 0.0
    return round(sum(values) / len(values), 2)


def _calculate_ai_recommendation(avg_score: float) -> str:
    if avg_score > 4.0:
        return "ÖNERİ: KABUL"
    if avg_score < 3.0:
        return "KRİTİK"
    return "CV İNCELEME"


@router.get("/api/recruitment/candidate/{candidate_id}")
async def get_candidate(candidate_id: str):
    """
    PUBLIC ENDPOINT: Get candidate data and test questions.
    No authentication required - this is for public candidate test access.
    """
    try:
        from config import DB_FILE
        import os
        import json
        
        if not os.path.exists(DB_FILE):
            return {"success": False, "error": "Candidate not found", "status": 404}
        
        with open(DB_FILE, "r", encoding="utf-8") as f:
            candidates = json.load(f)
        
        # Find candidate by ID
        candidate = None
        if isinstance(candidates, list):
            candidate = next((c for c in candidates if str(c.get("id") or c.get("_id", "")) == str(candidate_id)), None)
        elif isinstance(candidates, dict):
            candidate = candidates.get(candidate_id)
        
        if not candidate:
            return {"success": False, "error": "Candidate not found", "status": 404}
        
        # Load questions from data_questions
        try:
            from data.data_questions import QUESTIONS
            test_questions = QUESTIONS[:130]  # First 130 questions
        except ImportError:
            # Fallback questions
            test_questions = [
                {"id": f"Q{i}", "text": f"Soru {i}", "category": "GEN"}
                for i in range(1, 131)
            ]
        
        return {
            "success": True,
            "data": {
                "id": candidate.get("id") or candidate_id,
                "name": candidate.get("name") or candidate.get("ad_soyad", ""),
                "email": candidate.get("email") or candidate.get("e_posta", ""),
                "position": candidate.get("position") or candidate.get("pozisyon", ""),
                "status": candidate.get("status") or candidate.get("durum", "Test Bekliyor"),
                "test_questions": test_questions
            }
        }
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}


@router.post("/api/recruitment/submit-test")
async def submit_candidate_test(request: RecruitmentSubmitTestRequest):
    """
    PUBLIC ENDPOINT: Submit candidate test results.
    No authentication required - this is for public candidate test submission.
    """
    try:
        from config import DB_FILE
        import os
        import json
        from datetime import datetime
        
        candidate_id = request.candidate_id
        answers = request.answers
        
        if not candidate_id or not answers:
            return {"success": False, "error": "Missing candidate_id or answers"}
        
        # Load existing candidates
        candidates = []
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    candidates = json.load(f)
                if not isinstance(candidates, list):
                    candidates = []
            except:
                candidates = []
        
        # Find and update candidate
        candidate_found = False
        for idx, c in enumerate(candidates):
            if str(c.get("id") or c.get("_id", "")) == str(candidate_id):
                # Calculate scores from answers
                from logic import evaluate_candidate
                from data.data_jobs import JOB_PROFILES
                
                # Calculate raw scores from answers
                raw_scores = {}
                # Map answers to competencies (simplified - should use proper mapping)
                for q_id, answer in answers.items():
                    category = q_id.split("_")[0] if "_" in q_id else "GEN"
                    if category not in raw_scores:
                        raw_scores[category] = []
                    raw_scores[category].append(answer)
                
                # Calculate average per category
                for cat in raw_scores:
                    raw_scores[cat] = sum(raw_scores[cat]) / len(raw_scores[cat]) if raw_scores[cat] else 0
                
                # Update candidate
                candidates[idx]["status"] = "Test Tamamlandı"
                candidates[idx]["test_completed"] = True
                candidates[idx]["test_date"] = datetime.now().isoformat()
                candidates[idx]["answers"] = answers
                candidates[idx]["raw_scores"] = raw_scores
                
                candidate_found = True
                break
        
        if not candidate_found:
            return {"success": False, "error": "Candidate not found"}
        
        # Save updated candidates
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(candidates, f, ensure_ascii=False, indent=2)
        
        return {"success": True, "message": "Test submitted successfully"}
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}


@router.get("/api/candidates", dependencies=[Depends(require_recruitment_access)])
async def get_candidates():
    """
    ADMIN ENDPOINT: Get all candidates (for recruitment module).
    Access: Only CEO, HR Director, HR Manager
    """
    try:
        from config import DB_FILE
        import os
        import json
        
        if not os.path.exists(DB_FILE):
            return {"success": True, "data": []}
        
        with open(DB_FILE, "r", encoding="utf-8") as f:
            candidates = json.load(f)
        
        if not isinstance(candidates, list):
            candidates = []
        
        return {"success": True, "data": candidates}
    except Exception as e:
        return {"success": True, "data": []}


@router.post("/api/candidates")
async def create_candidate(request: CandidateCreateRequest):
    """
    PUBLIC/ADMIN ENDPOINT: Create new candidate (from public test or admin).
    No strict RBAC for creation - public candidates can create themselves.
    """
    try:
        from config import DB_FILE
        import os
        import json
        from datetime import datetime
        
        # Load existing candidates
        candidates = []
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    candidates = json.load(f)
                if not isinstance(candidates, list):
                    candidates = []
            except:
                candidates = []
        
        # Add new candidate
        raw_scores = request.raw_scores or {}
        avg_score = request.avg_score
        if avg_score is None:
            avg_score = _calculate_avg_score(raw_scores)
        ai_karar = request.ai_karar or _calculate_ai_recommendation(avg_score)

        new_candidate = {
            "id": request.id or str(len(candidates) + 1),
            "name": request.name or "",
            "email": str(request.email) if request.email else "",
            "phone": request.phone or "",
            "position": request.role or request.position or "",
            "status": request.status or "Test Bekliyor",
            "status_date": request.status_date,
            "raw_scores": raw_scores,
            "avg_score": avg_score,
            "ai_karar": ai_karar,
            "manipulation_score": request.manipulation_score,
            "lie": request.lie,
            "date": request.date or datetime.now().isoformat(),
            "type": request.type or "Aday"
        }
        
        candidates.append(new_candidate)
        
        # Save
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(candidates, f, ensure_ascii=False, indent=2)
        
        return {"success": True, "data": new_candidate}
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}
