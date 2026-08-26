// Role-Based Access Control (RBAC) Configuration

export type UserRole = "admin" | "director" | "manager" | "employee";

export const ROLE_MAPPING: Record<string, UserRole> = {
  CEO: "admin",
  IK: "admin",
  DIRECTOR: "director",
  MANAGER: "manager",
  PERSONEL: "employee",
  EMPLOYEE: "employee",
};

export const REVERSE_ROLE_MAPPING: Record<UserRole, string[]> = {
  admin: ["CEO", "IK"],
  director: ["DIRECTOR"],
  manager: ["MANAGER"],
  employee: ["PERSONEL", "EMPLOYEE"],
};

export const ROLE_ACCESS_CONFIG: Record<UserRole, string[]> = {
  admin: [
    "/dashboard", "/organizasyon", "/degerlendirme", "/yetenek-matrisi", "/egitim", "/gelisim", "/kariyer", "/yedekleme", "/maas", "/ise-alim", "/aday-testi", "/ekip-yonetimi", "/admin", "/izinler", "/ayarlar/roller", "/yonetici/maas-talep",
  ],
  director: [
    "/dashboard", "/degerlendirme", "/yetenek-matrisi", "/egitim", "/gelisim", "/kariyer", "/yedekleme", "/aday-testi", "/izinler", "/ekip-yonetimi", "/yonetici/maas-talep",
  ],
  manager: [
    "/dashboard", "/degerlendirme", "/yetenek-matrisi", "/egitim", "/gelisim", "/kariyer", "/yedekleme", "/aday-testi", "/izinler", "/ekip-yonetimi", "/yonetici/maas-talep",
  ],
  employee: ["/egitim", "/gelisim", "/aday-testi", "/izinler"],
};

// Demo sürümünde kullanıcı hesabı ve rol oluşturma yalnızca CEO/İK tarafında yönetilir.
export const ROLE_PERMISSIONS: Record<UserRole, {
  canCreateRoles: string[];
  canAccessDepartments: "all" | "own";
  canAccessSalary: boolean;
  canAccessOrgChart: boolean;
}> = {
  admin: { canCreateRoles: ["DIRECTOR", "MANAGER", "PERSONEL"], canAccessDepartments: "all", canAccessSalary: true, canAccessOrgChart: true },
  director: { canCreateRoles: [], canAccessDepartments: "own", canAccessSalary: false, canAccessOrgChart: false },
  manager: { canCreateRoles: [], canAccessDepartments: "own", canAccessSalary: false, canAccessOrgChart: false },
  employee: { canCreateRoles: [], canAccessDepartments: "own", canAccessSalary: false, canAccessOrgChart: false },
};

export function getDefaultRoute(role: UserRole | null | undefined): string {
  if (!role) return "/dashboard";
  return ROLE_ACCESS_CONFIG[role]?.[0] || "/dashboard";
}

export function hasAccess(role: UserRole | null | undefined, pathname: string): boolean {
  if (!role) return false;
  const allowedRoutes = ROLE_ACCESS_CONFIG[role];
  if (!allowedRoutes) return false;
  let normalizedPathname = pathname;
  try { if (pathname.includes("%")) normalizedPathname = decodeURIComponent(pathname); } catch {}
  return allowedRoutes.some((route) => normalizedPathname === route || normalizedPathname.startsWith(route + "/") || pathname === route || pathname.startsWith(route + "/"));
}

export function mapToUserRole(internalRole: string): UserRole {
  return ROLE_MAPPING[internalRole] || "employee";
}
