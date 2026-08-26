// Hierarchy-based employee filtering utility

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
  name?: string;
}

/**
 * Extracts role from position title
 */
/**
 * Extracts role from position title
 * Note: "Genel Müdür" is treated as DIRECTOR level for assignment purposes
 */
export function extractRoleFromPosition(position: string): "CEO" | "DIRECTOR" | "MANAGER" | "PERSONEL" {
  const pos = position.toLowerCase();
  
  if (pos.includes("ceo") || pos.includes("yönetim kurulu") || pos.includes("başkan")) {
    return "CEO";
  }
  // Genel Müdür is DIRECTOR level (can be assigned by CEO)
  if (pos.includes("genel müdür") || pos.includes("direktör") || pos.includes("director")) {
    return "DIRECTOR";
  }
  // Müdür (but not Genel Müdür) is MANAGER level
  if (pos.includes("müdür") || pos.includes("manager") || pos.includes("yönetici")) {
    return "MANAGER";
  }
  return "PERSONEL";
}

/**
 * Get manageable employees based on current user's role and hierarchy
 * 
 * Rules (Kullanıcı Atama Kuralları):
 * - CEO: Can only see Directors/Genel Müdür (regardless of department)
 * - DIRECTOR/Genel Müdür: Can only see Managers in their own department (not Employees)
 * - MANAGER: Can only see Employees in their own department (not Managers or Directors)
 * - PERSONEL/Employee: Cannot see anyone (empty list)
 */
export function getManageableEmployees(
  currentUser: CurrentUser | null,
  allEmployees: OrgChartEntry[]
): OrgChartEntry[] {
  if (!currentUser || !allEmployees.length) return [];

  const userRole = currentUser.role;
  const userDept = currentUser.dept || "";
  const userName = currentUser.name || "";

  // 1. CEO: Can only see Directors/Genel Müdür (for user assignment)
  if (userRole === "CEO" || userRole === "IK") {
    return allEmployees.filter((emp) => {
      const empRole = extractRoleFromPosition(emp.Pozisyon);
      // CEO can assign to Directors and Genel Müdür only
      return empRole === "DIRECTOR" || emp.Pozisyon.toLowerCase().includes("genel müdür");
    });
  }

  // 2. DIRECTOR/Genel Müdür: Can only see Managers in their own department (not Employees)
  if (userRole === "DIRECTOR") {
    return allEmployees.filter((emp) => {
      // Must be in same department
      if (emp.Departman !== userDept) return false;
      
      // Can only see Managers (not Employees, other Directors, or CEO)
      const empRole = extractRoleFromPosition(emp.Pozisyon);
      return empRole === "MANAGER";
    });
  }

  // 3. MANAGER: Can only see Employees in their own department AND under their management
  if (userRole === "MANAGER") {
    return allEmployees.filter((emp) => {
      // Must be in same department
      if (emp.Departman !== userDept) return false;
      
      // Can only see Employees (not Directors, Managers, or CEO)
      const empRole = extractRoleFromPosition(emp.Pozisyon);
      if (empRole !== "PERSONEL") return false;
      
      // Must be under this manager's direct management (Yönetici 1 or Yönetici 2)
      const yonetici1 = emp["Yönetici 1"] || "";
      const yonetici2 = emp["Yönetici 2"] || "";
      return yonetici1 === userName || yonetici2 === userName;
    });
  }

  // 4. PERSONEL/Employee: Cannot see anyone
  return [];
}

/**
 * Check if a user can manage a specific employee
 */
export function canManageEmployee(
  currentUser: CurrentUser | null,
  employee: OrgChartEntry
): boolean {
  const manageable = getManageableEmployees(currentUser, [employee]);
  return manageable.length > 0;
}

/**
 * Filter data by user's scope (department and role-based filtering)
 * 
 * Rules:
 * - CEO: All data
 * - DIRECTOR: Only data from their own department
 * - MANAGER: Only data from their own department AND employee role (or subordinates)
 * - PERSONEL: Only their own data
 */
export function filterDataByScope<T extends { Departman?: string; "Ad Soyad"?: string; [key: string]: any }>(
  data: T[],
  currentUser: CurrentUser | null
): T[] {
  if (!currentUser || !data.length) return [];

  const userRole = currentUser.role;
  const userDept = currentUser.dept || "";
  const userName = currentUser.name || "";

  // 1. CEO/IK: All data
  if (userRole === "CEO" || userRole === "IK") {
    return data;
  }

  // 2. DIRECTOR: Only own department (all employees in department - directors, managers, and employees)
  if (userRole === "DIRECTOR") {
    return data.filter((item) => item.Departman === userDept);
  }

  // 3. MANAGER: Only own department (all employees in department - managers can see employees and other managers in their dept, but not directors)
  if (userRole === "MANAGER") {
    return data.filter((item) => {
      // Must be in same department
      if (item.Departman !== userDept) return false;
      
      // Managers can see employees and other managers in their department, but not directors or CEO
      const position = item.Pozisyon || "";
      const posLower = position.toLowerCase();
      const isDirectorOrCEO = posLower.includes("direktör") || 
                             posLower.includes("director") ||
                             posLower.includes("ceo") ||
                             posLower.includes("başkan");
      
      // Exclude directors and CEO, but include managers and employees
      return !isDirectorOrCEO;
    });
  }

  // 4. PERSONEL: Only own data
  if (userRole === "PERSONEL") {
    return data.filter((item) => item["Ad Soyad"] === userName);
  }

  return [];
}

