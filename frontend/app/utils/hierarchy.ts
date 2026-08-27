// FutureHR hierarchy and data-scope utilities.
// Yetki artık pozisyon adından tahmin edilmez; Yönetici 1 / Yönetici 2 ilişkisi esas alınır.

interface OrgChartEntry {
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  [key: string]: any;
}

interface CurrentUser {
  role: string;
  dept?: string;
  department?: string;
  name?: string;
}

/**
 * Eski entegrasyonlar için tutulur. Erişim kararı verirken kullanılmamalıdır.
 */
export function extractRoleFromPosition(position: string): "CEO" | "DIRECTOR" | "MANAGER" | "PERSONEL" {
  const pos = String(position || "").toLocaleLowerCase("tr-TR");
  if (pos.includes("ceo") || pos.includes("yönetim kurulu") || pos.includes("başkan")) return "CEO";
  if (pos.includes("genel müdür") || pos.includes("direktör") || pos.includes("director")) return "DIRECTOR";
  if (pos.includes("müdür") || pos.includes("manager") || pos.includes("yönetici") || pos.includes("lider")) return "MANAGER";
  return "PERSONEL";
}

export function getManagerRelation(currentUser: CurrentUser | null, employee: OrgChartEntry): "Yönetici 1" | "Yönetici 2" | null {
  const userName = String(currentUser?.name || "").trim();
  if (!userName) return null;
  if (String(employee["Yönetici 1"] || "").trim() === userName) return "Yönetici 1";
  if (String(employee["Yönetici 2"] || "").trim() === userName) return "Yönetici 2";
  return null;
}

export function getDirectReports(currentUser: CurrentUser | null, allEmployees: OrgChartEntry[]): OrgChartEntry[] {
  if (!currentUser || !allEmployees.length) return [];
  return allEmployees.filter((employee) => getManagerRelation(currentUser, employee) !== null);
}

/**
 * Generic "manage" scope.
 * - CEO / DIRECTOR / MANAGER: only explicit direct reports.
 * - IK: HR operational flows may work company-wide.
 * - PERSONEL: no one else.
 */
export function getManageableEmployees(currentUser: CurrentUser | null, allEmployees: OrgChartEntry[]): OrgChartEntry[] {
  if (!currentUser || !allEmployees.length) return [];
  const role = String(currentUser.role || "").toUpperCase();
  if (role === "IK" || role === "HR" || role === "HR_ADMIN") return allEmployees;
  if (role === "CEO" || role === "DIRECTOR" || role === "MANAGER") return getDirectReports(currentUser, allEmployees);
  return [];
}

export function canManageEmployee(currentUser: CurrentUser | null, employee: OrgChartEntry): boolean {
  const role = String(currentUser?.role || "").toUpperCase();
  if (role === "IK" || role === "HR" || role === "HR_ADMIN") return true;
  return getManagerRelation(currentUser, employee) !== null;
}

/**
 * General read scope used by non-sensitive modules.
 * Sensitive salary/talent/succession data is additionally guarded by accessControl.ts.
 */
export function filterDataByScope<T extends { Departman?: string; "Ad Soyad"?: string; "Yönetici 1"?: string; "Yönetici 2"?: string; [key: string]: any }>(
  data: T[],
  currentUser: CurrentUser | null
): T[] {
  if (!currentUser || !data.length) return [];
  const role = String(currentUser.role || "").toUpperCase();
  const userDept = currentUser.dept || currentUser.department || "";
  const userName = currentUser.name || "";

  if (role === "CEO" || role === "IK" || role === "HR" || role === "HR_ADMIN") return data;
  if (role === "DIRECTOR") return data.filter((item) => item.Departman === userDept);
  if (role === "MANAGER") {
    return data.filter((item) => item["Ad Soyad"] === userName || item["Yönetici 1"] === userName || item["Yönetici 2"] === userName);
  }
  return data.filter((item) => item["Ad Soyad"] === userName);
}
