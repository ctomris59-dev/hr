export const EMPLOYEE_SAAS_MODE = process.env.NEXT_PUBLIC_DATA_MODE === "saas";

export type SaaSEmployee = {
  id: string;
  external_id?: string | null;
  full_name: string;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  job_family?: string | null;
  job_level?: string | null;
  manager_employee_id?: string | null;
  second_manager_employee_id?: string | null;
  hire_date?: string | null;
  employment_type?: string | null;
  location?: string | null;
  active: boolean;
  has_avatar?: boolean;
};

export type EmployeeDirectoryRow = {
  id?: string | number;
  externalId?: string | null;
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  "İşe Giriş Tarihi"?: string;
  manager1Id?: string | null;
  manager2Id?: string | null;
  hasAvatar?: boolean;
  avatarUrl?: string | null;
  avatarDataUrl?: string | null;
  [key: string]: any;
};

async function jsonOrError(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.detail || payload?.error || `İstek başarısız (${response.status})`;
    throw new Error(String(message));
  }
  return payload;
}

export function employeeAvatarUrl(id: string | number) {
  return `/api/saas/employees/${encodeURIComponent(String(id))}/avatar`;
}

export async function fetchSaasEmployees(): Promise<EmployeeDirectoryRow[]> {
  const response = await fetch("/api/saas/employees", { cache: "no-store", credentials: "same-origin" });
  const rows = (await jsonOrError(response)) as SaaSEmployee[];
  const names = new Map(rows.map((employee) => [employee.id, employee.full_name]));
  return rows.map((employee) => ({
    id: employee.id,
    externalId: employee.external_id,
    "Ad Soyad": employee.full_name,
    Departman: employee.department || "",
    Pozisyon: employee.position || "",
    "Yönetici 1": employee.manager_employee_id ? names.get(employee.manager_employee_id) || "" : undefined,
    "Yönetici 2": employee.second_manager_employee_id ? names.get(employee.second_manager_employee_id) || "" : undefined,
    "İşe Giriş Tarihi": employee.hire_date || undefined,
    manager1Id: employee.manager_employee_id,
    manager2Id: employee.second_manager_employee_id,
    jobFamily: employee.job_family,
    jobLevel: employee.job_level,
    employmentType: employee.employment_type,
    location: employee.location,
    email: employee.email,
    active: employee.active,
    hasAvatar: Boolean(employee.has_avatar),
    avatarUrl: employee.has_avatar ? employeeAvatarUrl(employee.id) : null,
  }));
}

export async function fetchSaasCurrentEmployee(): Promise<SaaSEmployee | null> {
  const response = await fetch("/api/saas/employees/me", { cache: "no-store", credentials: "same-origin" });
  if (response.status === 404) return null;
  return (await jsonOrError(response)) as SaaSEmployee;
}

export function employeeMutationPayload(input: {
  name: string;
  department: string;
  position: string;
  hireDate?: string;
  manager1Name?: string;
  manager2Name?: string;
  employees: EmployeeDirectoryRow[];
}) {
  const byName = new Map(
    input.employees
      .filter((employee) => employee.id !== undefined && employee.id !== null)
      .map((employee) => [employee["Ad Soyad"], String(employee.id)]),
  );
  return {
    full_name: input.name.trim(),
    department: input.department || null,
    position: input.position || null,
    hire_date: input.hireDate || null,
    manager_employee_id: input.manager1Name ? byName.get(input.manager1Name) || null : null,
    second_manager_employee_id: input.manager2Name ? byName.get(input.manager2Name) || null : null,
  };
}

export async function createSaasEmployee(payload: Record<string, any>) {
  const response = await fetch("/api/saas/employees", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrError(response);
}

export async function updateSaasEmployee(id: string, payload: Record<string, any>) {
  const response = await fetch(`/api/saas/employees/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrError(response);
}

export async function updateSaasEmployeeAvatar(id: string, avatarDataUrl: string | null) {
  return updateSaasEmployee(id, { avatar_data_url: avatarDataUrl });
}

export async function deactivateSaasEmployee(id: string) {
  const response = await fetch(`/api/saas/employees/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok && response.status !== 204) await jsonOrError(response);
}
