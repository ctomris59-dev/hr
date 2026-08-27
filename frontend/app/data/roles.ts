// FutureHR Role-Based Access Control (RBAC)
// Pozisyon ile sistem rolü birbirinden ayrıdır. Sistem rolü erişim seviyesini,
// organizasyondaki Yönetici 1 / Yönetici 2 ilişkileri ise veri kapsamını belirler.

export type UserRole = "ceo" | "hr_admin" | "director" | "manager" | "employee";

export const ROLE_MAPPING: Record<string, UserRole> = {
  CEO: "ceo",
  IK: "hr_admin",
  HR: "hr_admin",
  HR_ADMIN: "hr_admin",
  DIRECTOR: "director",
  MANAGER: "manager",
  PERSONEL: "employee",
  EMPLOYEE: "employee",
};

export const REVERSE_ROLE_MAPPING: Record<UserRole, string[]> = {
  ceo: ["CEO"],
  hr_admin: ["IK"],
  director: ["DIRECTOR"],
  manager: ["MANAGER"],
  employee: ["PERSONEL", "EMPLOYEE"],
};

/**
 * Sıkı varsayılan erişim modeli.
 * Hassas modüller (maaş, yetenek matrisi, halefiyet) yalnızca CEO ve İK'ya açıktır.
 * Firma bazlı görünürlük ayarları accessControl.ts üzerinden bu tabanın üzerine uygulanır.
 */
export const ROLE_ACCESS_CONFIG: Record<UserRole, string[]> = {
  ceo: [
    "/dashboard", "/organizasyon", "/degerlendirme", "/yetenek-matrisi", "/egitim",
    "/gelisim", "/kariyer", "/yedekleme", "/maas", "/ise-alim", "/aday-testi",
    "/ekip-yonetimi", "/admin", "/izinler", "/ayarlar/roller",
    "/ayarlar/yetki-mimarisi", "/yonetici/maas-talep",
  ],
  hr_admin: [
    "/dashboard", "/organizasyon", "/degerlendirme", "/yetenek-matrisi", "/egitim",
    "/gelisim", "/kariyer", "/yedekleme", "/maas", "/ise-alim", "/aday-testi",
    "/ekip-yonetimi", "/admin", "/izinler", "/ayarlar/yetki-mimarisi",
    "/yonetici/maas-talep",
  ],
  director: [
    "/dashboard", "/degerlendirme", "/egitim", "/gelisim", "/kariyer",
    "/aday-testi", "/izinler", "/ekip-yonetimi", "/yonetici/maas-talep",
  ],
  manager: [
    "/dashboard", "/degerlendirme", "/egitim", "/gelisim", "/kariyer",
    "/aday-testi", "/izinler", "/ekip-yonetimi", "/yonetici/maas-talep",
  ],
  employee: ["/egitim", "/gelisim", "/kariyer", "/aday-testi", "/izinler"],
};

export const ROLE_PERMISSIONS: Record<UserRole, {
  canCreateRoles: string[];
  canAccessDepartments: "all" | "own";
  canAccessSalary: boolean;
  canAccessOrgChart: boolean;
}> = {
  ceo: { canCreateRoles: ["IK", "DIRECTOR", "MANAGER", "PERSONEL"], canAccessDepartments: "all", canAccessSalary: true, canAccessOrgChart: true },
  hr_admin: { canCreateRoles: ["DIRECTOR", "MANAGER", "PERSONEL"], canAccessDepartments: "all", canAccessSalary: true, canAccessOrgChart: true },
  director: { canCreateRoles: [], canAccessDepartments: "own", canAccessSalary: false, canAccessOrgChart: false },
  manager: { canCreateRoles: [], canAccessDepartments: "own", canAccessSalary: false, canAccessOrgChart: false },
  employee: { canCreateRoles: [], canAccessDepartments: "own", canAccessSalary: false, canAccessOrgChart: false },
};

export function isExecutiveRole(role: UserRole | null | undefined): boolean {
  return role === "ceo" || role === "hr_admin";
}

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
  return allowedRoutes.some((route) =>
    normalizedPathname === route || normalizedPathname.startsWith(route + "/") ||
    pathname === route || pathname.startsWith(route + "/")
  );
}

export function mapToUserRole(internalRole: string): UserRole {
  return ROLE_MAPPING[String(internalRole || "").toUpperCase()] || "employee";
}
