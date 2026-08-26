// Role-Based Access Control (RBAC) Configuration

export type UserRole = "admin" | "director" | "manager" | "employee";

// Map internal roles to UserRole
export const ROLE_MAPPING: Record<string, UserRole> = {
  CEO: "admin",
  IK: "admin",
  DIRECTOR: "director",
  MANAGER: "manager",
  PERSONEL: "employee",
};

// Reverse mapping: UserRole to internal roles
export const REVERSE_ROLE_MAPPING: Record<UserRole, string[]> = {
  admin: ["CEO", "IK"],
  director: ["DIRECTOR"],
  manager: ["MANAGER"],
  employee: ["PERSONEL"],
};

// Page access configuration for each role
export const ROLE_ACCESS_CONFIG: Record<UserRole, string[]> = {
  admin: [
    "/dashboard",
    "/organizasyon",
    "/degerlendirme",
    "/yetenek-matrisi",
    "/egitim",
    "/gelisim",
    "/kariyer",
    "/yedekleme",
    "/maas",
    "/ise-alim",
    "/aday-testi",
    "/kullanici",
    "/ekip-yonetimi",
    "/admin",
    "/izinler",
    "/ayarlar/roller",
  ],
  director: [
    "/dashboard",
    "/degerlendirme",
    "/yetenek-matrisi",
    "/egitim",
    "/gelisim",
    "/kariyer",
    "/yedekleme",
    "/aday-testi",
    "/admin",
    "/izinler",
    "/ekip-yonetimi",
  ],
  manager: [
    "/dashboard",
    "/degerlendirme",
    "/yetenek-matrisi",
    "/egitim",
    "/gelisim",
    "/kariyer",
    "/yedekleme",
    "/aday-testi",
    "/admin",
    "/izinler",
    "/ekip-yonetimi",
  ],
  employee: [
    "/dashboard",
    "/egitim",
    "/gelisim",
    "/aday-testi",
    "/izinler",
  ],
};

// Role permissions for creating users
export const ROLE_PERMISSIONS: Record<UserRole, {
  canCreateRoles: string[];
  canAccessDepartments: "all" | "own";
  canAccessSalary: boolean;
  canAccessOrgChart: boolean;
}> = {
  admin: {
    canCreateRoles: ["DIRECTOR"],
    canAccessDepartments: "all",
    canAccessSalary: true,
    canAccessOrgChart: true,
  },
  director: {
    canCreateRoles: ["MANAGER"],
    canAccessDepartments: "own",
    canAccessSalary: false,
    canAccessOrgChart: false,
  },
  manager: {
    canCreateRoles: ["PERSONEL"],
    canAccessDepartments: "own",
    canAccessSalary: false,
    canAccessOrgChart: false,
  },
  employee: {
    canCreateRoles: [],
    canAccessDepartments: "own",
    canAccessSalary: false,
    canAccessOrgChart: false,
  },
};

// Get default route for a role
export function getDefaultRoute(role: UserRole | null | undefined): string {
  if (!role) return "/dashboard";
  const routes = ROLE_ACCESS_CONFIG[role];
  return routes?.[0] || "/dashboard";
}

// Check if a role has access to a route
export function hasAccess(role: UserRole | null | undefined, pathname: string): boolean {
  if (!role) return false;
  const allowedRoutes = ROLE_ACCESS_CONFIG[role];
  if (!allowedRoutes) return false;
  
  // Normalize pathname (handle both encoded and decoded URLs)
  let normalizedPathname = pathname;
  try {
    // Try to decode if it's encoded, but don't fail if it's already decoded
    if (pathname.includes('%')) {
      normalizedPathname = decodeURIComponent(pathname);
    }
  } catch (e) {
    // If decoding fails, use original pathname
    normalizedPathname = pathname;
  }
  
  return allowedRoutes.some((route) => {
    // Check both original and normalized pathname
    return normalizedPathname === route || 
           normalizedPathname.startsWith(route + "/") ||
           pathname === route ||
           pathname.startsWith(route + "/");
  });
}

// Convert internal role to UserRole
export function mapToUserRole(internalRole: string): UserRole {
  return ROLE_MAPPING[internalRole] || "employee";
}

