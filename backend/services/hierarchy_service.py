"""
HIERARCHY SERVICE (COMPREHENSIVE RBAC)
Comprehensive Role-Based Access Control implementation for FutureHR system.
Implements strict hierarchical data visibility and module access rules.
"""

from data.data_roles import get_roles
from typing import List, Dict, Optional, Any

# --- YARDIMCI: Rol Konfigürasyonunu Bulma ---
def get_role_config(user_role_or_position: str) -> Dict[str, Any]:
    """
    Kullanıcının rol ismine (örn: "Satış Müdürü" veya "MANAGER") göre
    data_roles.py içindeki en uygun rol tanımını bulur.
    """
    roles = get_roles()
    search_term = str(user_role_or_position).lower()

    # 1. Adım: ID Eşleşmesi (örn: "role_ceo")
    for role in roles:
        if role['id'] == search_term:
            return role

    # 2. Adım: İsim İçerme Kontrolü (örn: "Satış Direktörü" içinde "Direktör" var mı?)
    # Öncelik sırasına göre (Önce CEO, sonra Direktör...)
    sorted_roles = sorted(roles, key=lambda x: x['rank'])
    
    for role in sorted_roles:
        # Rol isminin parçaları (Örn: "Genel Müdür / CEO" -> ["genel", "müdür", "ceo"])
        keywords = role['name'].lower().split(' / ')
        for kw in keywords:
            if kw in search_term:
                return role
                
    # 3. Adım: Hiçbiri değilse en düşük yetkiyi (Personel) döndür
    return roles[-1]

def get_role_rank(position_name: str) -> int:
    """Pozisyonun hiyerarşik rütbesini (sayısal) döndürür."""
    config = get_role_config(position_name)
    return config.get('rank', 4)

def is_ceo(user_role: str) -> bool:
    """Check if user is CEO or IK (super admin)"""
    return user_role in ["CEO", "IK"]

def is_director(user_role: str) -> bool:
    """Check if user is Director"""
    return user_role == "DIRECTOR"

def is_manager(user_role: str) -> bool:
    """Check if user is Manager"""
    return user_role == "MANAGER"

def is_employee(user_role: str) -> bool:
    """Check if user is Employee/Personel"""
    return user_role in ["EMPLOYEE", "PERSONEL"]

# --- MODULE ACCESS CONTROL ---

def can_access_recruitment(user_role: str, user_dept: str) -> bool:
    """
    Recruitment Module Access:
    - CEO: Yes
    - HR Director: Yes (if department is "İnsan Kaynakları")
    - HR Manager: Yes (if department is "İnsan Kaynakları")
    - Others: No
    """
    if is_ceo(user_role):
        return True
    if is_director(user_role) and "İnsan Kaynakları" in user_dept:
        return True
    if is_manager(user_role) and "İnsan Kaynakları" in user_dept:
        return True
    return False

def can_access_dashboard(user_role: str) -> bool:
    """
    Dashboard Access:
    - CEO: Yes
    - Director: Yes
    - Manager: Yes
    - Employee: No
    """
    return user_role in ["CEO", "IK", "DIRECTOR", "MANAGER"]

def can_access_organization(user_role: str) -> bool:
    """
    Organization Chart Access:
    - CEO: Yes (view/edit all)
    - Director: Yes (view/edit own dept)
    - Manager: Yes (view/edit own dept)
    - Employee: No
    """
    return user_role in ["CEO", "IK", "DIRECTOR", "MANAGER"]

def can_access_salary_simulation(user_role: str, user_dept: str) -> bool:
    """
    Salary Simulation Access:
    - CEO: Yes
    - Finance Director: Yes (if department is "Finans")
    - Finance Manager: Yes (if department is "Finans")
    - Others: No
    """
    if is_ceo(user_role):
        return True
    if is_director(user_role) and ("Finans" in user_dept or "Finance" in user_dept):
        return True
    if is_manager(user_role) and ("Finans" in user_dept or "Finance" in user_dept):
        return True
    return False

def can_access_team_management(user_role: str) -> bool:
    """
    Team & User Management Access:
    - CEO: Yes (only)
    - Others: No
    """
    return is_ceo(user_role)

def can_access_budget(user_role: str) -> bool:
    """
    Budget Management Access: Only Directors (for their own department)
    - CEO: No
    - Director: Yes (own department only)
    - Manager: No
    - Employee: No
    """
    return user_role in ["DIRECTOR", "Direktör", "IK"]

# --- DATA FILTERING (HIERARCHICAL VISIBILITY) ---

def filter_data_by_hierarchy(
    user_role: str, 
    user_dept: str, 
    user_name: str,
    all_employees: List[Dict],
    module: Optional[str] = None
) -> List[Dict]:
    """
    GÖRÜNTÜLEME MOTORU:
    Listeleme ekranlarında (Yetenek Matrisi, Yedekleme vb.) kimin kimi göreceğini belirler.
    
    Rules:
    - CEO: All employees (all departments)
    - DIRECTOR: Only employees in their own department
    - MANAGER: Only employees in their own department (excluding directors/CEO)
    - EMPLOYEE: Only themselves
    
    Args:
        user_role: User's role (CEO, DIRECTOR, MANAGER, EMPLOYEE)
        user_dept: User's department
        user_name: User's name
        all_employees: List of all employees
        module: Optional module name for module-specific filtering
    """
    if not all_employees:
        return []
    
    filtered_list = []
    
    # CEO sees all
    if is_ceo(user_role):
        return all_employees
    
    # DIRECTOR sees only their department
    if is_director(user_role):
        for emp in all_employees:
            emp_dept = emp.get("department") or emp.get("Departman", "")
            if emp_dept == user_dept:
                filtered_list.append(emp)
        return filtered_list
    
    # MANAGER sees only their department (excluding directors/CEO)
    if is_manager(user_role):
        for emp in all_employees:
            emp_dept = emp.get("department") or emp.get("Departman", "")
            if emp_dept == user_dept:
                position = (emp.get("position") or emp.get("Pozisyon", "")).lower()
                # Exclude directors and CEO
                if "direktör" not in position and "director" not in position and "ceo" not in position and "başkan" not in position:
                    filtered_list.append(emp)
        return filtered_list
    
    # EMPLOYEE sees only themselves
    if is_employee(user_role):
        for emp in all_employees:
            emp_name = emp.get("name") or emp.get("Ad Soyad", "")
            if emp_name == user_name:
                filtered_list.append(emp)
        return filtered_list
    
    # Default: return empty
    return []

def get_assignable_targets(
    user_role: str, 
    user_dept: str, 
    all_employees: List[Dict],
    assignment_type: str = "general"
) -> List[Dict]:
    """
    ATAMA MOTORU:
    Kim kime iş/eğitim/değerlendirme/kullanıcı atayabilir?
    
    Rules:
    - CEO: Can assign ONLY to Directors/Genel Müdür (not to Managers or Employees)
    - DIRECTOR/Genel Müdür: Can assign to Managers in their own department (not to Employees directly)
    - MANAGER: Can assign to Employees in their own department
    - EMPLOYEE: Cannot assign to anyone
    
    Args:
        user_role: User's role
        user_dept: User's department
        all_employees: List of all employees
        assignment_type: Type of assignment (general, training, evaluation, user_creation, etc.)
    """
    if not all_employees:
        return []
    
    assignable_list = []
    
    # CEO can assign ONLY to Directors/Genel Müdür (not to Managers or Employees)
    if is_ceo(user_role):
        for emp in all_employees:
            position = (emp.get("position") or emp.get("Pozisyon", "")).lower()
            # Include only Directors and Genel Müdür
            is_director = "direktör" in position or "director" in position
            is_genel_mudur = "genel müdür" in position or "genel müdür" in position
            # Exclude CEO themselves and lower ranks
            if (is_director or is_genel_mudur) and "ceo" not in position and "başkan" not in position:
                assignable_list.append(emp)
        return assignable_list
    
    # DIRECTOR/Genel Müdür can assign ONLY to Managers in their own department (not to Employees)
    if is_director(user_role):
        for emp in all_employees:
            emp_dept = emp.get("department") or emp.get("Departman", "")
            if emp_dept == user_dept:
                position = (emp.get("position") or emp.get("Pozisyon", "")).lower()
                # Only Managers (not Directors, CEO, or Employees)
                is_manager = ("müdür" in position or "manager" in position) and "direktör" not in position and "genel müdür" not in position
                if is_manager and "ceo" not in position and "başkan" not in position:
                    assignable_list.append(emp)
        return assignable_list
    
    # MANAGER can assign to Employees in their department
    if is_manager(user_role):
        for emp in all_employees:
            emp_dept = emp.get("department") or emp.get("Departman", "")
            if emp_dept == user_dept:
                position = (emp.get("position") or emp.get("Pozisyon", "")).lower()
                # Only Employees (not Directors, Managers, or CEO)
                if "direktör" not in position and "director" not in position and "müdür" not in position and "manager" not in position and "ceo" not in position and "başkan" not in position:
                    assignable_list.append(emp)
        return assignable_list
    
    # EMPLOYEE cannot assign to anyone
    return []

def can_evaluate_employee(
    evaluator_role: str,
    evaluator_dept: str,
    evaluator_name: str,
    target_employee: Dict,
    evaluation_type: str = "360"
) -> bool:
    """
    360 EVALUATION ACCESS:
    Top-down evaluation rules:
    - CEO evaluates Directors
    - DIRECTOR evaluates Managers & Employees in their Dept
    - MANAGER evaluates Employees in their Dept
    - EMPLOYEE cannot evaluate anyone
    
    Args:
        evaluator_role: Role of the person doing the evaluation
        evaluator_dept: Department of the evaluator
        evaluator_name: Name of the evaluator
        target_employee: Employee being evaluated
        evaluation_type: Type of evaluation (360, performance, etc.)
    """
    target_dept = target_employee.get("department") or target_employee.get("Departman", "")
    target_position = (target_employee.get("position") or target_employee.get("Pozisyon", "")).lower()
    target_name = target_employee.get("name") or target_employee.get("Ad Soyad", "")
    
    # CEO evaluates Directors
    if is_ceo(evaluator_role):
        return "direktör" in target_position or "director" in target_position
    
    # DIRECTOR evaluates Managers & Employees in their department
    if is_director(evaluator_role):
        if target_dept != evaluator_dept:
            return False
        # Can evaluate Managers and Employees, but not Directors or CEO
        return "direktör" not in target_position and "director" not in target_position and "ceo" not in target_position and "başkan" not in target_position
    
    # MANAGER evaluates Employees in their department
    if is_manager(evaluator_role):
        if target_dept != evaluator_dept:
            return False
        # Can only evaluate Employees (not Directors, Managers, or CEO)
        return "direktör" not in target_position and "director" not in target_position and "müdür" not in target_position and "manager" not in target_position and "ceo" not in target_position and "başkan" not in target_position
    
    # EMPLOYEE cannot evaluate anyone
    return False

def can_approve_leave(
    approver_role: str,
    approver_dept: str,
    approver_name: str,
    leave_requester: Dict
) -> bool:
    """
    LEAVE APPROVAL ACCESS:
    - CEO: Can approve all
    - DIRECTOR: Can approve Managers & Employees in their Dept
    - MANAGER: Can approve Employees in their Dept
    - EMPLOYEE: Cannot approve (only request)
    """
    requester_dept = leave_requester.get("department") or leave_requester.get("Departman", "")
    requester_position = (leave_requester.get("position") or leave_requester.get("Pozisyon", "")).lower()
    
    # CEO can approve all
    if is_ceo(approver_role):
        return True
    
    # DIRECTOR can approve Managers & Employees in their department
    if is_director(approver_role):
        if requester_dept != approver_dept:
            return False
        return "direktör" not in requester_position and "director" not in requester_position and "ceo" not in requester_position and "başkan" not in requester_position
    
    # MANAGER can approve Employees in their department
    if is_manager(approver_role):
        if requester_dept != approver_dept:
            return False
        return "direktör" not in requester_position and "director" not in requester_position and "müdür" not in requester_position and "manager" not in requester_position and "ceo" not in requester_position and "başkan" not in requester_position
    
    # EMPLOYEE cannot approve
    return False

# --- LEGACY FUNCTIONS (for backward compatibility) ---

def can_access_module(user_role: str, module_key: str, action: str = "view") -> bool:
    """
    Legacy function for module access control.
    Now uses specific module access functions above.
    """
    config = get_role_config(user_role)
    permissions = config.get('permissions', {})
    
    if module_key not in permissions:
        return False
        
    return permissions[module_key].get(action, False)
