export const SAAS_DATA_MODE = process.env.NEXT_PUBLIC_DATA_MODE === "saas";

export interface SecureSessionUser {
  id: string;
  username: string;
  role: string;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  position: string | null;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
}

export interface EmployeeRow {
  id: string;
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  manager1Id?: string | null;
  manager2Id?: string | null;
  career_aspiration?: number;
  mobility_willingness?: number;
  __canEvaluate?: boolean;
  __relation?: string | null;
  [key: string]: unknown;
}

export interface EvaluationRow {
  id: string;
  Personel: string;
  employee_id: string;
  evaluator?: string | null;
  evaluation_type?: string;
  authority_context?: Record<string, unknown>;
  date: string;
  performance_model_version?: string | null;
  kpi_items: Array<{ id: string; title: string; weight: number; score: number }>;
  kpi_score?: number | null;
  manager_performance_score?: number | null;
  performance_weights?: Record<string, unknown>;
  Performans: number;
  competency_score?: number | null;
  manager_scores: Record<string, number>;
  note?: string | null;
  is_star_performer?: boolean;
  [key: string]: unknown;
}

interface RawEmployee {
  id: string;
  full_name: string;
  department?: string | null;
  position?: string | null;
  manager_employee_id?: string | null;
  second_manager_employee_id?: string | null;
  job_family?: string | null;
  job_level?: string | null;
  hire_date?: string | null;
  external_id?: string | null;
  active?: boolean;
}

interface PerformanceTarget extends RawEmployee {
  can_evaluate: boolean;
  relation?: string | null;
}

interface RawEvaluation {
  id: string;
  employee_id: string;
  employee_name: string;
  evaluator?: string | null;
  evaluation_type: string;
  authority_context: Record<string, unknown>;
  date: string;
  performance_model_version?: string | null;
  kpi_items: Array<{ id: string; title: string; weight: number; score: number }>;
  kpi_score?: number | null;
  manager_performance_score?: number | null;
  performance_weights: Record<string, unknown>;
  performance: number;
  competency_score?: number | null;
  manager_scores: Record<string, number>;
  note?: string | null;
  is_star_performer: boolean;
}

interface TalentEmployee extends RawEmployee {
  profile: {
    employee_id: string;
    career_aspiration?: number | null;
    mobility_willingness?: number | null;
  };
}

interface TalentDataset {
  employees: TalentEmployee[];
  evaluations: RawEvaluation[];
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const message = payload?.error ?? payload?.detail ?? `İstek başarısız (${response.status})`;
    throw new Error(String(message));
  }
  return payload as T;
}

function mapEmployees(rows: RawEmployee[], extra?: Map<string, Partial<EmployeeRow>>): EmployeeRow[] {
  const names = new Map(rows.map((employee) => [employee.id, employee.full_name]));
  return rows.map((employee) => ({
    id: employee.id,
    "Ad Soyad": employee.full_name,
    Departman: employee.department || "",
    Pozisyon: employee.position || "",
    "Yönetici 1": employee.manager_employee_id ? names.get(employee.manager_employee_id) : undefined,
    "Yönetici 2": employee.second_manager_employee_id ? names.get(employee.second_manager_employee_id) : undefined,
    manager1Id: employee.manager_employee_id,
    manager2Id: employee.second_manager_employee_id,
    jobFamily: employee.job_family,
    jobLevel: employee.job_level,
    hireDate: employee.hire_date,
    externalId: employee.external_id,
    active: employee.active !== false,
    ...(extra?.get(employee.id) || {}),
  }));
}

function mapEvaluation(row: RawEvaluation): EvaluationRow {
  return {
    id: row.id,
    Personel: row.employee_name,
    employee_id: row.employee_id,
    evaluator: row.evaluator,
    evaluation_type: row.evaluation_type,
    authority_context: row.authority_context,
    date: row.date,
    performance_model_version: row.performance_model_version,
    kpi_items: row.kpi_items || [],
    kpi_score: row.kpi_score,
    manager_performance_score: row.manager_performance_score,
    performance_weights: row.performance_weights,
    Performans: Number(row.performance || 0),
    competency_score: row.competency_score,
    manager_scores: row.manager_scores || {},
    note: row.note,
    is_star_performer: row.is_star_performer,
  };
}

export async function fetchSecureSessionUser(): Promise<SecureSessionUser | null> {
  const response = await fetch("/api/secure-auth/session", { cache: "no-store", credentials: "same-origin" });
  const payload = await response.json().catch(() => null) as { authenticated?: boolean; user?: SecureSessionUser } | null;
  return response.ok && payload?.authenticated && payload.user ? payload.user : null;
}

export async function fetchSaasTeamWorkspace(): Promise<{ employees: EmployeeRow[]; evaluations: EvaluationRow[] }> {
  const [employees, evaluations] = await Promise.all([
    apiJson<RawEmployee[]>("/api/saas/employees/team"),
    apiJson<RawEvaluation[]>("/api/saas/performance/evaluations"),
  ]);
  return { employees: mapEmployees(employees), evaluations: evaluations.map(mapEvaluation) };
}

export async function fetchSaasPerformanceWorkspace(): Promise<{
  user: SecureSessionUser | null;
  employees: EmployeeRow[];
  evaluations: EvaluationRow[];
}> {
  const [user, targets, evaluations] = await Promise.all([
    fetchSecureSessionUser(),
    apiJson<PerformanceTarget[]>("/api/saas/performance/targets"),
    apiJson<RawEvaluation[]>("/api/saas/performance/evaluations"),
  ]);
  const extra = new Map<string, Partial<EmployeeRow>>(
    targets.map((target) => [target.id, { __canEvaluate: target.can_evaluate, __relation: target.relation || null }]),
  );
  return {
    user,
    employees: mapEmployees(targets, extra),
    evaluations: evaluations.map(mapEvaluation),
  };
}

export async function createSaasPerformanceEvaluation(payload: {
  employee_id: string;
  performance_model_version?: string;
  kpi_items: Array<{ id: string; title: string; weight: number; score: number }>;
  manager_performance_score: number;
  manager_scores: Record<string, number>;
  note?: string;
  is_star_performer?: boolean;
}): Promise<EvaluationRow> {
  const row = await apiJson<RawEvaluation>("/api/saas/performance/evaluations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapEvaluation(row);
}

export async function fetchSaasTalentWorkspace(): Promise<{ employees: EmployeeRow[]; evaluations: EvaluationRow[] }> {
  const dataset = await apiJson<TalentDataset>("/api/saas/talent/dataset");
  const extra = new Map<string, Partial<EmployeeRow>>(
    dataset.employees.map((employee) => [employee.id, {
      career_aspiration: employee.profile.career_aspiration ?? undefined,
      mobility_willingness: employee.profile.mobility_willingness ?? undefined,
    }]),
  );
  return {
    employees: mapEmployees(dataset.employees, extra),
    evaluations: dataset.evaluations.map(mapEvaluation),
  };
}

export async function updateSaasTalentProfile(
  employeeId: string,
  patch: { career_aspiration?: number | null; mobility_willingness?: number | null },
) {
  return apiJson<{ employee_id: string; career_aspiration: number | null; mobility_willingness: number | null }>(
    `/api/saas/talent/profiles/${encodeURIComponent(employeeId)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}
