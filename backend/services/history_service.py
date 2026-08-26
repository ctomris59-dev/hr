# history_service.py
# Otomatik Tarihçe Kaydı ve Gelecek Tahmin Motoru

import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from config import DB_360_FILE, DB_ORG_FILE, DB_TALENT_ASSESSMENT_FILE

# History database files
DB_COMPETENCY_HISTORY_FILE = "future_competency_history.json"
DB_SALARY_HISTORY_FILE = "future_salary_history.json"
DB_POSITION_HISTORY_FILE = "future_position_history.json"
DB_TALENT_HISTORY_FILE = "future_talent_history.json"

# ==========================================
# 1. COMPETENCY HISTORY (Yetkinlik Geçmişi)
# ==========================================

def load_competency_history() -> List[Dict[str, Any]]:
    """Yetkinlik geçmişini yükler."""
    if not os.path.exists(DB_COMPETENCY_HISTORY_FILE):
        return []
    try:
        with open(DB_COMPETENCY_HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_competency_history(history: List[Dict[str, Any]]):
    """Yetkinlik geçmişini kaydeder."""
    try:
        with open(DB_COMPETENCY_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Competency history save error: {e}")

def record_competency_change(
    employee_name: str,
    competency_code: str,
    old_score: float,
    new_score: float,
    source: str = "Değerlendirme"
) -> Dict[str, Any]:
    """
    Yetkinlik puanı değişikliğini otomatik olarak tarihçeye kaydeder.
    """
    history = load_competency_history()
    
    entry = {
        "id": len(history) + 1,
        "employee_name": employee_name,
        "competency_code": competency_code,
        "old_score": old_score,
        "new_score": new_score,
        "change": new_score - old_score,
        "source": source,
        "created_at": datetime.now().isoformat(),
        "timestamp": datetime.now().timestamp()
    }
    
    history.append(entry)
    save_competency_history(history)
    
    return entry

def get_competency_history_for_employee(
    employee_name: str,
    competency_code: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Çalışanın yetkinlik geçmişini filtreler."""
    history = load_competency_history()
    
    filtered = [
        h for h in history
        if h.get("employee_name") == employee_name
        and (competency_code is None or h.get("competency_code") == competency_code)
    ]
    
    if start_date:
        filtered = [h for h in filtered if h.get("created_at", "") >= start_date]
    if end_date:
        filtered = [h for h in filtered if h.get("created_at", "") <= end_date]
    
    # Sort by date
    filtered.sort(key=lambda x: x.get("created_at", ""))
    
    return filtered

# ==========================================
# 2. SALARY HISTORY (Maaş Geçmişi)
# ==========================================

def load_salary_history() -> List[Dict[str, Any]]:
    """Maaş geçmişini yükler."""
    if not os.path.exists(DB_SALARY_HISTORY_FILE):
        return []
    try:
        with open(DB_SALARY_HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_salary_history(history: List[Dict[str, Any]]):
    """Maaş geçmişini kaydeder."""
    try:
        with open(DB_SALARY_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Salary history save error: {e}")

def record_salary_change(
    employee_name: str,
    old_salary: float,
    new_salary: float,
    reason: str = "Maaş Güncelleme"
) -> Dict[str, Any]:
    """
    Maaş değişikliğini otomatik olarak tarihçeye kaydeder.
    """
    history = load_salary_history()
    
    entry = {
        "id": len(history) + 1,
        "employee_name": employee_name,
        "old_salary": old_salary,
        "new_salary": new_salary,
        "change": new_salary - old_salary,
        "change_percentage": ((new_salary - old_salary) / old_salary * 100) if old_salary > 0 else 0,
        "reason": reason,
        "created_at": datetime.now().isoformat(),
        "timestamp": datetime.now().timestamp()
    }
    
    history.append(entry)
    save_salary_history(history)
    
    return entry

def get_salary_history_for_employee(
    employee_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Çalışanın maaş geçmişini filtreler."""
    history = load_salary_history()
    
    filtered = [h for h in history if h.get("employee_name") == employee_name]
    
    if start_date:
        filtered = [h for h in filtered if h.get("created_at", "") >= start_date]
    if end_date:
        filtered = [h for h in filtered if h.get("created_at", "") <= end_date]
    
    filtered.sort(key=lambda x: x.get("created_at", ""))
    
    return filtered

# ==========================================
# 3. POSITION HISTORY (Pozisyon Geçmişi)
# ==========================================

def load_position_history() -> List[Dict[str, Any]]:
    """Pozisyon geçmişini yükler."""
    if not os.path.exists(DB_POSITION_HISTORY_FILE):
        return []
    try:
        with open(DB_POSITION_HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_position_history(history: List[Dict[str, Any]]):
    """Pozisyon geçmişini kaydeder."""
    try:
        with open(DB_POSITION_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Position history save error: {e}")

def record_position_change(
    employee_name: str,
    old_position: str,
    new_position: str,
    old_department: Optional[str] = None,
    new_department: Optional[str] = None,
    reason: str = "Terfi"
) -> Dict[str, Any]:
    """
    Pozisyon değişikliğini otomatik olarak tarihçeye kaydeder.
    """
    history = load_position_history()
    
    entry = {
        "id": len(history) + 1,
        "employee_name": employee_name,
        "old_position": old_position,
        "new_position": new_position,
        "old_department": old_department,
        "new_department": new_department,
        "reason": reason,
        "created_at": datetime.now().isoformat(),
        "timestamp": datetime.now().timestamp()
    }
    
    history.append(entry)
    save_position_history(history)
    
    return entry

def get_position_history_for_employee(
    employee_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Çalışanın pozisyon geçmişini filtreler."""
    history = load_position_history()
    
    filtered = [h for h in history if h.get("employee_name") == employee_name]
    
    if start_date:
        filtered = [h for h in filtered if h.get("created_at", "") >= start_date]
    if end_date:
        filtered = [h for h in filtered if h.get("created_at", "") <= end_date]
    
    filtered.sort(key=lambda x: x.get("created_at", ""))
    
    return filtered

# ==========================================
# 4. TALENT HISTORY (9-Box Geçmişi)
# ==========================================

def load_talent_history() -> List[Dict[str, Any]]:
    """Talent geçmişini yükler."""
    if not os.path.exists(DB_TALENT_HISTORY_FILE):
        return []
    try:
        with open(DB_TALENT_HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_talent_history(history: List[Dict[str, Any]]):
    """Talent geçmişini kaydeder."""
    try:
        with open(DB_TALENT_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Talent history save error: {e}")

def record_talent_assessment(
    employee_name: str,
    performance_score: float,
    potential_score: float,
    period: Optional[str] = None
) -> Dict[str, Any]:
    """
    9-Box değerlendirmesini otomatik olarak tarihçeye kaydeder.
    """
    history = load_talent_history()
    
    if not period:
        period = datetime.now().strftime("%Y-Q%q").replace("Q1", "Q1").replace("Q2", "Q2").replace("Q3", "Q3").replace("Q4", "Q4")
        # Calculate quarter
        month = datetime.now().month
        quarter = (month - 1) // 3 + 1
        period = f"{datetime.now().year}-Q{quarter}"
    
    entry = {
        "id": len(history) + 1,
        "employee_name": employee_name,
        "performance_score": performance_score,
        "potential_score": potential_score,
        "period": period,
        "created_at": datetime.now().isoformat(),
        "timestamp": datetime.now().timestamp()
    }
    
    history.append(entry)
    save_talent_history(history)
    
    return entry

def get_talent_history_for_employee(
    employee_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Çalışanın talent geçmişini filtreler."""
    history = load_talent_history()
    
    filtered = [h for h in history if h.get("employee_name") == employee_name]
    
    if start_date:
        filtered = [h for h in filtered if h.get("created_at", "") >= start_date]
    if end_date:
        filtered = [h for h in filtered if h.get("created_at", "") <= end_date]
    
    filtered.sort(key=lambda x: x.get("created_at", ""))
    
    return filtered

# ==========================================
# 5. GELECEK TAHMİN MOTORU (FORECASTING ENGINE)
# ==========================================

def predict_future_performance(
    employee_name: str,
    target_date: str,
    competency_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Geçmiş verilere dayanarak gelecek performansı tahmin eder.
    
    Args:
        employee_name: Çalışan adı
        target_date: Tahmin edilecek tarih (YYYY-MM-DD)
        competency_code: Belirli bir yetkinlik kodu (opsiyonel)
    
    Returns:
        {
            "predicted_score": float,
            "confidence": float,  # 0-1 arası
            "method": str,
            "based_on": int,  # Kaç kayıt kullanıldı
            "is_prediction": True
        }
    """
    from datetime import datetime as dt
    
    target_dt = dt.fromisoformat(target_date)
    now_dt = dt.now()
    
    # Eğer geçmiş bir tarih ise, tahmin yapma
    if target_dt <= now_dt:
        return {"is_prediction": False, "error": "Target date is in the past"}
    
    # Son 2 yıllık veriyi çek
    two_years_ago = (now_dt - timedelta(days=730)).isoformat()
    
    if competency_code:
        # Belirli bir yetkinlik için tahmin
        history = get_competency_history_for_employee(
            employee_name,
            competency_code=competency_code,
            start_date=two_years_ago
        )
        
        if len(history) < 2:
            # Yeterli veri yok, mevcut puanı döndür
            from utils_db import load_360_data
            data_360 = load_360_data()
            current_score = 3.0  # Default
            for record in data_360:
                if record.get("Personel") == employee_name or record.get("target") == employee_name:
                    current_score = float(record.get(f"{competency_code}_Mgr") or 
                                        record.get(f"{competency_code}_Peer") or 
                                        record.get(f"{competency_code}_Self") or 3.0)
                    break
            
            return {
                "predicted_score": min(current_score, 5.0),
                "confidence": 0.3,
                "method": "insufficient_data",
                "based_on": len(history),
                "is_prediction": True
            }
        
        # Linear regression: y = mx + b
        # x = time (days since first record), y = score
        first_record = history[0]
        first_date = dt.fromisoformat(first_record["created_at"])
        first_score = first_record["old_score"]
        
        # Son iki kayıt arasındaki trend
        if len(history) >= 2:
            last_two = history[-2:]
            date1 = dt.fromisoformat(last_two[0]["created_at"])
            date2 = dt.fromisoformat(last_two[1]["created_at"])
            score1 = last_two[0]["new_score"]
            score2 = last_two[1]["new_score"]
            
            days_diff = (date2 - date1).days
            if days_diff > 0:
                slope = (score2 - score1) / days_diff
            else:
                slope = 0
        else:
            slope = 0
        
        # Tahmin: Son puan + (gün farkı * slope)
        last_record = history[-1]
        last_date = dt.fromisoformat(last_record["created_at"])
        last_score = last_record["new_score"]
        
        days_to_target = (target_dt - last_date).days
        predicted_score = last_score + (days_to_target * slope * 0.001)  # Normalize slope
        
        # Cap at 5.0
        predicted_score = min(max(predicted_score, 1.0), 5.0)
        
        # Confidence: Daha fazla veri = daha yüksek güven
        confidence = min(len(history) / 10.0, 0.9)  # Max 0.9 confidence
        
        return {
            "predicted_score": round(predicted_score, 2),
            "confidence": round(confidence, 2),
            "method": "linear_projection",
            "based_on": len(history),
            "is_prediction": True,
            "last_actual_score": last_score,
            "last_actual_date": last_record["created_at"]
        }
    else:
        # Tüm yetkinlikler için ortalama tahmin
        from config import COMPETENCIES_360
        
        predictions = {}
        total_confidence = 0
        count = 0
        
        for code in COMPETENCIES_360.keys():
            if code == "LID":  # Skip Liderlik
                continue
            pred = predict_future_performance(employee_name, target_date, code)
            if pred.get("is_prediction"):
                predictions[code] = pred["predicted_score"]
                total_confidence += pred.get("confidence", 0.5)
                count += 1
        
        avg_confidence = total_confidence / count if count > 0 else 0.5
        
        return {
            "predicted_scores": predictions,
            "average_confidence": round(avg_confidence, 2),
            "method": "linear_projection_multi",
            "based_on": count,
            "is_prediction": True
        }

def predict_future_talent_matrix(
    employee_name: str,
    target_date: str
) -> Dict[str, Any]:
    """
    9-Box matrisi için gelecek tahmini.
    """
    from datetime import datetime as dt
    
    target_dt = dt.fromisoformat(target_date)
    now_dt = dt.now()
    
    if target_dt <= now_dt:
        return {"is_prediction": False}
    
    # Son 2 yıllık talent history
    two_years_ago = (now_dt - timedelta(days=730)).isoformat()
    history = get_talent_history_for_employee(
        employee_name,
        start_date=two_years_ago
    )
    
    if len(history) < 2:
        # Yeterli veri yok, mevcut değerleri döndür
        from services.talent_service import get_talent_matrix_with_history
        current_data = get_talent_matrix_with_history()
        for emp in current_data:
            if emp.get("name") == employee_name:
                return {
                    "predicted_performance": emp.get("current", {}).get("x", 3.0),
                    "predicted_potential": emp.get("current", {}).get("y", 3.0),
                    "confidence": 0.3,
                    "is_prediction": True,
                    "method": "insufficient_data"
                }
    
    # Linear projection
    last_two = history[-2:]
    date1 = dt.fromisoformat(last_two[0]["created_at"])
    date2 = dt.fromisoformat(last_two[1]["created_at"])
    perf1 = last_two[0]["performance_score"]
    perf2 = last_two[1]["performance_score"]
    pot1 = last_two[0]["potential_score"]
    pot2 = last_two[1]["potential_score"]
    
    days_diff = (date2 - date1).days
    if days_diff > 0:
        perf_slope = (perf2 - perf1) / days_diff
        pot_slope = (pot2 - pot1) / days_diff
    else:
        perf_slope = 0
        pot_slope = 0
    
    last_record = history[-1]
    last_date = dt.fromisoformat(last_record["created_at"])
    days_to_target = (target_dt - last_date).days
    
    predicted_perf = last_record["performance_score"] + (days_to_target * perf_slope * 0.001)
    predicted_pot = last_record["potential_score"] + (days_to_target * pot_slope * 0.001)
    
    # Cap at 5.0
    predicted_perf = min(max(predicted_perf, 1.0), 5.0)
    predicted_pot = min(max(predicted_pot, 1.0), 5.0)
    
    confidence = min(len(history) / 10.0, 0.9)
    
    return {
        "predicted_performance": round(predicted_perf, 2),
        "predicted_potential": round(predicted_pot, 2),
        "confidence": round(confidence, 2),
        "is_prediction": True,
        "method": "linear_projection",
        "based_on": len(history)
    }

