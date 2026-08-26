# backend/data_roles.py

# Varsayılan Roller ve İzinler (Sistem ilk açıldığında boş gelmesin diye)
DEFAULT_ROLES = [
    {
        "id": "role_ceo",
        "name": "Genel Müdür / CEO",
        "rank": 1, # En yüksek rütbe (Hiyerarşi için)
        "permissions": {
            "budget": {"view": True, "edit": True},
            "salary_sim": {"view": True, "edit": True},
            "talent": {"view": True, "edit": True},
            "org_chart": {"view": True, "edit": True},
            "all_data_access": True # Tüm departmanları görür
        }
    },
    {
        "id": "role_director",
        "name": "Direktör",
        "rank": 2,
        "permissions": {
            "budget": {"view": True, "edit": True}, # Bütçe yapabilir
            "salary_sim": {"view": False, "edit": False}, # Maaş simülasyonu yapamaz
            "talent": {"view": True, "edit": True},
            "org_chart": {"view": True, "edit": False},
            "all_data_access": False # Sadece kendi departmanı
        }
    },
    {
        "id": "role_manager",
        "name": "Müdür / Yönetici",
        "rank": 3,
        "permissions": {
            "budget": {"view": False, "edit": False}, # Bütçe göremez
            "salary_sim": {"view": False, "edit": False},
            "talent": {"view": True, "edit": True},
            "org_chart": {"view": True, "edit": False},
            "all_data_access": False # Sadece alt ekip
        }
    },
    {
        "id": "role_employee",
        "name": "Personel / Uzman",
        "rank": 4, # En düşük rütbe
        "permissions": {
            "budget": {"view": False, "edit": False},
            "salary_sim": {"view": False, "edit": False},
            "talent": {"view": False, "edit": False},
            "org_chart": {"view": True, "edit": False},
            "all_data_access": False # Sadece kendisi
        }
    }
]

# Bellekte tutmak için (Gerçekte DB'ye yazılır)
ACTIVE_ROLES = list(DEFAULT_ROLES)

def get_roles():
    return ACTIVE_ROLES

def save_roles(new_roles):
    global ACTIVE_ROLES
    ACTIVE_ROLES = new_roles
    return True
