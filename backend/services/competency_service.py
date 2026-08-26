# competency_service.py
# Merkezi Yetkinlik Puanı Güncelleme Servisi - Event-Driven Architecture

import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from config import COMPETENCIES_360, DB_360_FILE, DB_ORG_FILE

# Gelişim geçmişi dosyası
DB_COMPETENCY_HISTORY_FILE = "future_competency_history.json"

def load_competency_history():
    """Gelişim geçmişini yükler."""
    if not os.path.exists(DB_COMPETENCY_HISTORY_FILE):
        return []
    try:
        with open(DB_COMPETENCY_HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_competency_history(history_entry: Dict[str, Any]):
    """Gelişim geçmişine yeni kayıt ekler."""
    history = load_competency_history()
    history.append(history_entry)
    try:
        with open(DB_COMPETENCY_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Gelişim geçmişi kayıt hatası: {e}")

def get_competency_history(employee_name: str) -> List[Dict[str, Any]]:
    """Bir çalışanın gelişim geçmişini döndürür."""
    history = load_competency_history()
    return [h for h in history if h.get("employee_name") == employee_name]

def update_competency_score(
    employee_name: str,
    competency_code: str,
    new_score: float,
    source: str = "Değerlendirme",  # "Sınav", "Proje", "Değerlendirme"
    source_detail: str = "",
    old_score: Optional[float] = None
) -> Dict[str, Any]:
    """
    Yetkinlik puanını günceller ve tüm ilgili servisleri tetikler.
    
    Args:
        employee_name: Çalışan adı
        competency_code: Yetkinlik kodu (ANA, DIG, LID, vb.)
        new_score: Yeni puan
        source: Puan kaynağı ("Sınav", "Proje", "Değerlendirme")
        source_detail: Detay bilgisi (örn: "İleri Excel Sınavı")
        old_score: Eski puan (otomatik bulunur)
    
    Returns:
        {
            "success": bool,
            "impact": {
                "talent_matrix": {...},
                "career_path": {...},
                "succession": {...}
            }
        }
    """
    from utils_db import load_360_data, load_org_chart
    import json
    
    # 1. Eski puanı bul
    data_360 = load_360_data()
    employee_360 = None
    for record in data_360:
        if record.get("Personel") == employee_name or record.get("target") == employee_name:
            employee_360 = record
            break
    
    if not employee_360:
        return {"success": False, "error": "Çalışan bulunamadı"}
    
    # Eski puanı al
    if old_score is None:
        old_score = float(employee_360.get(f"{competency_code}_Mgr") or 
                         employee_360.get(f"{competency_code}_Peer") or 
                         employee_360.get(f"{competency_code}_Self") or 0.0)
    
    score_change = new_score - old_score
    
    # 2. 360 verisini güncelle
    competency_name = COMPETENCIES_360.get(competency_code, competency_code)
    
    # En yüksek öncelikli kaynağı güncelle (Mgr > Peer > Self)
    if f"{competency_code}_Mgr" in employee_360:
        employee_360[f"{competency_code}_Mgr"] = new_score
    elif f"{competency_code}_Peer" in employee_360:
        employee_360[f"{competency_code}_Peer"] = new_score
    else:
        employee_360[f"{competency_code}_Self"] = new_score
    
    # 360 verisini kaydet
    try:
        with open(DB_360_FILE, "w", encoding="utf-8") as f:
            json.dump(data_360, f, ensure_ascii=False, indent=4)
    except Exception as e:
        return {"success": False, "error": f"Veri kayıt hatası: {e}"}
    
    # 3. Gelişim geçmişine kaydet (Eski sistem - backward compatibility)
    history_entry = {
        "id": len(load_competency_history()) + 1,
        "employee_name": employee_name,
        "competency_code": competency_code,
        "competency_name": competency_name,
        "old_score": old_score,
        "new_score": new_score,
        "change": score_change,
        "source": source,
        "source_detail": source_detail,
        "date": datetime.now().isoformat(),
        "timestamp": datetime.now().timestamp()
    }
    save_competency_history(history_entry)
    
    # 4. Otomatik tarihçe kaydı (Yeni sistem)
    try:
        from services.history_service import record_competency_change
        record_competency_change(
            employee_name=employee_name,
            competency_code=competency_code,
            old_score=old_score,
            new_score=new_score,
            source=source
        )
    except Exception as e:
        print(f"History service error: {e}")
    
    # 4. Tüm servisleri tetikle
    impact_results = {}
    
    # 4.1 Talent Service - 9-Box koordinatlarını güncelle
    try:
        from services.talent_service import analyze_talent_gap
        talent_analysis = analyze_talent_gap(employee_name)
        impact_results["talent_matrix"] = {
            "new_performance": talent_analysis.get("current_scores", {}),
            "box_category": "Yıldız Oyuncu" if talent_analysis.get("readiness_status") == "READY" else "Gelişim Gerekli"
        }
    except Exception as e:
        impact_results["talent_matrix"] = {"error": str(e)}
    
    # 4.2 Career Service - Gap analizini güncelle
    try:
        from services.career_service import get_role_states, get_current_role
        current_role = get_current_role(employee_name)
        if current_role:
            # Tüm track'ler için kontrol et
            for track_id in [1, 2, 3]:
                role_states = get_role_states(employee_name, track_id)
                if role_states.get("current_role_id"):
                    impact_results["career_path"] = {
                        "current_role": current_role,
                        "unlocked_roles": [
                            role_id for role_id, state in role_states.get("role_states", {}).items()
                            if state == "future"
                        ]
                    }
                    break
    except Exception as e:
        impact_results["career_path"] = {"error": str(e)}
    
    # 4.3 Succession Service - Hazırlık süresini yeniden hesapla
    try:
        from services.succession_service import load_succession_data, calculate_readiness_time
        succession_data = load_succession_data()
        plans = succession_data.get("succession_plans", [])
        
        # Bu çalışanın yedek olduğu pozisyonları bul
        employee_plans = [p for p in plans if p.get("successor_id") == employee_name]
        
        updated_plans = []
        for plan in employee_plans:
            position_id = plan.get("position_id")
            new_readiness = calculate_readiness_time(employee_name, position_id)
            
            # Planı güncelle
            plan["readiness_level"] = new_readiness["readiness_level"]
            plan["calculated_readiness"] = new_readiness["readiness_level"]
            plan["readiness_percentage"] = new_readiness["readiness_percentage"]
            plan["missing_skills"] = new_readiness["missing_skills"]
            plan["notes"] = new_readiness["notes"]
            
            updated_plans.append({
                "position_id": position_id,
                "old_readiness": plan.get("readiness_level"),
                "new_readiness": new_readiness["readiness_level"],
                "readiness_percentage": new_readiness["readiness_percentage"]
            })
        
        if updated_plans:
            # Güncellenmiş planları kaydet
            from services.succession_service import save_succession_data
            save_succession_data(succession_data)
            
            impact_results["succession"] = {
                "updated_plans": updated_plans,
                "ready_now_count": len([p for p in updated_plans if p["new_readiness"] == "READY_NOW"])
            }
    except Exception as e:
        impact_results["succession"] = {"error": str(e)}
    
    return {
        "success": True,
        "employee_name": employee_name,
        "competency_code": competency_code,
        "competency_name": competency_name,
        "old_score": old_score,
        "new_score": new_score,
        "change": score_change,
        "source": source,
        "source_detail": source_detail,
        "impact": impact_results,
        "history_entry": history_entry
    }

