# salary_service.py
# Maaş Simülasyonu Servisi - Senaryo D Aggregation

import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime

# Config import
try:
    from config import DB_BUDGET_FILE, DB_ORG_FILE, DB_360_FILE
except ImportError:
    DB_BUDGET_FILE = os.path.join("database", "future_budget_db.json")
    DB_ORG_FILE = os.path.join("database", "future_org_chart.json")
    DB_360_FILE = os.path.join("database", "future_360_db.json")

from utils_db import load_org_chart, load_360_data
from services.budget_service import load_budget_data, get_salary_request_for_employee

def get_simulation_data_for_scenario_d(period: str, default_inflation_rate: float = 35.0) -> Dict[str, Any]:
    """
    Senaryo D için simülasyon verilerini toplar.
    
    Her çalışan için:
    1. SalaryRequest tablosuna bak (status='Gönderildi')
    2. Varsa: Yeni Maaş = Mevcut Maaş * (1 + request.rate/100)
    3. Yoksa: Yeni Maaş = Mevcut Maaş * (1 + default_inflation_rate/100)
    
    Returns:
        {
            "total_current_salary": float,
            "total_new_salary": float,
            "total_cost": float,
            "employee_count": int,
            "submitted_count": int,
            "default_count": int,
            "details": List[Dict]  # Her çalışan için detay
        }
    """
    org_data = load_org_chart()
    history360 = load_360_data()
    budget_data = load_budget_data()
    
    total_current = 0.0
    total_new = 0.0
    submitted_count = 0
    default_count = 0
    details = []
    
    for person in org_data:
        employee_name = person.get("Ad Soyad", "")
        if not employee_name:
            continue
        
        # Get current salary
        current_salary = float(person.get("Maaş (TL)", 0) or person.get("Maaş", 0) or 0)
        if current_salary <= 0:
            continue
        
        total_current += current_salary
        
        # Check for budget request
        request = get_salary_request_for_employee(employee_name, period)
        
        # Get performance data
        person360 = next(
            (h for h in history360 if h.get("Personel") == employee_name or h.get("target") == employee_name),
            None
        )
        
        # Check for star performer flag in 360 data
        is_star_performer = person360.get("is_star_performer", False) if person360 else False
        star_performer_bonus = 10.0 if is_star_performer else 0.0  # +10% bonus for star performers
        
        if request and request.get("status") == "Gönderildi" and request.get("requested_rate", 0) > 0:
            # Use manager's requested rate
            requested_rate = float(request.get("requested_rate", 0))
            # Add star performer bonus
            requested_rate += star_performer_bonus
            new_salary = current_salary * (1 + requested_rate / 100.0)
            source = "Yönetici Talebi" + (" 🌟+10%" if star_performer_bonus > 0 else "")
            submitted_count += 1
        else:
            # Use default inflation rate + star performer bonus
            effective_rate = default_inflation_rate + star_performer_bonus
            new_salary = current_salary * (1 + effective_rate / 100.0)
            source = "Varsayılan Enflasyon" + (" 🌟+10%" if star_performer_bonus > 0 else "")
            default_count += 1
        
        total_new += new_salary
        
        performance = float(person360.get("Performans", 0) if person360 else person.get("Performans", 0) or 0)
        
        details.append({
            "employee_name": employee_name,
            "department": person.get("Departman", ""),
            "position": person.get("Pozisyon", ""),
            "current_salary": current_salary,
            "new_salary": new_salary,
            "raise_amount": new_salary - current_salary,
            "raise_percentage": ((new_salary - current_salary) / current_salary) * 100,
            "source": source,
            "performance": performance,
            "is_star_performer": is_star_performer,  # Include star performer flag for UI
        })
    
    total_cost = total_new - total_current
    
    return {
        "total_current_salary": total_current,
        "total_new_salary": total_new,
        "total_cost": total_cost,
        "employee_count": len(details),
        "submitted_count": submitted_count,
        "default_count": default_count,
        "details": details,
    }

