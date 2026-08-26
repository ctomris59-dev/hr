"""
Authentication and User Management Module
Pure API implementation - no Streamlit dependencies
"""
import json
import os
from typing import Dict, Optional, Any

try:
    from config import USERS_FILE
except ImportError:
    USERS_FILE = os.path.join("database", "users.json")

DEFAULT_USERS = {
    "ceo": {"password": "123", "name": "Emin Öncü", "role": "CEO", "dept": "Yönetim", "position": "Yönetim Kurulu Başkanı"},
    "ik_dir": {"password": "123", "name": "Canan İns (Dir)", "role": "IK", "dept": "İnsan Kaynakları", "position": "İnsan Kaynakları Direktörü"}
}

def load_users() -> Dict[str, Any]:
    """Load users from JSON file."""
    if not os.path.exists(USERS_FILE):
        save_users(DEFAULT_USERS)
        return DEFAULT_USERS
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_USERS

def save_users(users_data: Dict[str, Any]) -> None:
    """Save users to JSON file."""
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users_data, f, ensure_ascii=False, indent=4)

# Global users cache (can be refreshed)
USERS_DB = load_users()

def refresh_users_db() -> None:
    """Refresh the global users database cache."""
    global USERS_DB
    USERS_DB = load_users()

def check_login(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Check user credentials.
    
    Args:
        username: Username
        password: Plain text password (should be hashed in production)
        
    Returns:
        User dict if credentials are valid, None otherwise
    """
    users = load_users()
    if username in users:
        if users[username]['password'] == password:
            return users[username]
    return None

# Note: get_allowed_data() function was Streamlit-specific and has been removed.
# Use services/hierarchy_service.py for RBAC filtering instead.