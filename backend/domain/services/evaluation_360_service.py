"""
360 Evaluation Service - Business Logic
Handles business rules for 360-degree evaluations.
"""
from typing import Dict, Any, Optional
from datetime import datetime
from repositories.evaluation_360_repository import Evaluation360Repository
from repositories.org_chart_repository import OrgChartRepository


class Evaluation360Service:
    """Service for 360-degree evaluation business logic."""
    
    def __init__(
        self,
        evaluation_repo: Optional[Evaluation360Repository] = None,
        org_chart_repo: Optional[OrgChartRepository] = None
    ):
        self._evaluation_repo = evaluation_repo or Evaluation360Repository()
        self._org_chart_repo = org_chart_repo or OrgChartRepository()
    
    def save_evaluation(
        self,
        employee_name: str,
        department: str,
        position: str,
        eval_type: str,
        competencies: Dict[str, float],
        performance: float,
        is_star_performer: bool
    ) -> Dict[str, Any]:
        """
        Save 360 evaluation data.
        
        Business Rules:
        - Determines suffix based on eval_type (Mgr vs Mgr2)
        - Calculates potential based on performance and competency average
        - Updates org chart performance/potential scores
        
        Args:
            employee_name: Employee name
            department: Department
            position: Position
            eval_type: Evaluation type (determines Mgr vs Mgr2)
            competencies: Competency scores
            performance: Performance score
            is_star_performer: Star performer flag
            
        Returns:
            Result dictionary with success status
        """
        if not employee_name:
            return {"success": False, "error": "Personel adı gerekli"}
        
        # Business Rule: Determine suffix based on eval_type
        suffix = "_Mgr" if "1. Yönetici" in str(eval_type) or "Yönetici" in str(eval_type) else "_Mgr2"
        
        # Build evaluation entry
        evaluation_entry: Dict[str, Any] = {
            "Departman": department or "",
            "Pozisyon": position or "",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "Performans": float(performance) if performance else 0,
            "is_star_performer": bool(is_star_performer),
        }
        
        # Add competency scores with suffix
        for comp_code, score in competencies.items():
            if comp_code and score is not None:
                evaluation_entry[f"{comp_code}{suffix}"] = float(score)
        
        # Add performance score with suffix
        if "1. Yönetici" in str(eval_type) or "Yönetici" in str(eval_type):
            evaluation_entry["Performans_Mgr1"] = float(performance) if performance else 0
        else:
            evaluation_entry["Performans_Mgr2"] = float(performance) if performance else 0
        
        # Save evaluation
        self._evaluation_repo.upsert(employee_name, evaluation_entry)
        
        # Business Rule: Calculate potential
        final_perf = float(performance) if performance else 0
        final_pot = 0
        
        if competencies:
            avg_competency = sum(competencies.values()) / len(competencies) if competencies else 0
            # Business Rule: Potential = (Performance + Competency Average) / 2
            final_pot = (final_perf + avg_competency) / 2
        
        # Business Rule: Update org chart performance/potential
        self._org_chart_repo.update_by_name(
            employee_name,
            {
                "Performans": round(final_perf, 1),
                "Potansiyel": round(final_pot, 1)
            }
        )
        
        return {"success": True, "message": "360 data saved successfully"}
    
    def get_all_evaluations(self) -> Dict[str, Any]:
        """
        Get all 360 evaluations.
        
        Returns:
            Dictionary with success status and data
        """
        data = self._evaluation_repo.get_all()
        try:
            from services.employee_scores_service import (
                is_demo_scores_active,
                load_employee_scores_map,
                derive_competency_scores_map,
            )
            from config import COMPETENCIES_360
            if is_demo_scores_active():
                scores_map = load_employee_scores_map()
                for entry in data:
                    name = entry.get("Personel") or entry.get("target") or entry.get("name")
                    score_record = scores_map.get(str(name))
                    if not score_record:
                        continue
                    seed_version = str(score_record.get("seed_version") or "")
                    employee_id = str(score_record.get("employee_id") or name)
                    test_score = float(score_record.get("test_score", 0))
                    manager_score = float(score_record.get("manager_score", 0))
                    comp_keys = list(COMPETENCIES_360.keys())
                    test_scores = derive_competency_scores_map(
                        test_score,
                        seed_version,
                        employee_id,
                        comp_keys,
                        "test",
                    )
                    manager_scores = derive_competency_scores_map(
                        manager_score,
                        seed_version,
                        employee_id,
                        comp_keys,
                        "mgr",
                    )
                    for code in comp_keys:
                        entry[f"{code}_Self"] = test_scores.get(code, test_score)
                        entry[f"{code}_Mgr"] = manager_scores.get(code, manager_score)
                        entry[f"{code}_Mgr2"] = manager_scores.get(code, manager_score)
        except Exception:
            pass
        return {"success": True, "data": data}

