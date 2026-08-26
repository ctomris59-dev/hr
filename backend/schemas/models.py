from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, Dict, Any, List

# --- REQUEST MODELS (Type Safe) ---
class RecruitmentSubmitTestRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    answers: Dict[str, float] = Field(default_factory=dict)


class CandidateCreateRequest(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = "Test Bekliyor"
    status_date: Optional[str] = None
    raw_scores: Dict[str, float] = Field(default_factory=dict)
    avg_score: Optional[float] = None
    ai_karar: Optional[str] = None
    manipulation_score: Optional[int] = None
    lie: Optional[float] = None
    date: Optional[str] = None
    type: Optional[str] = "Aday"

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, value):
        if value == "":
            return None
        return value


class RolesUpdateRequest(BaseModel):
    roles: List[Dict[str, Any]] = Field(default_factory=list)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class Save360DataRequest(BaseModel):
    personel: str = Field(..., min_length=1)
    departman: Optional[str] = None
    pozisyon: Optional[str] = None
    eval_type: Optional[str] = None
    competencies: Dict[str, float] = Field(default_factory=dict)
    performans: float = Field(0, ge=0)
    is_star_performer: bool = False


class OrgChartAddEmployeeRequest(BaseModel):
    name: str = Field(..., min_length=1)
    department: str = Field(..., min_length=1)
    position: str = Field(..., min_length=1)
    salary: float = Field(..., gt=0)
    tenure: float = Field(0, ge=0)
    leave_days: int = Field(14, gt=0)
    manager1: str = "-"
    manager2: str = "-"
    birth_date: Optional[str] = None


class OrgChartUpdateRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(default_factory=list)


class IncrementTenureRequest(BaseModel):
    increment_years: float = Field(1.0, gt=0)


class CreateUserAccountRequest(BaseModel):
    employee_name: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
