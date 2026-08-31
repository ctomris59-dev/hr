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
  "Maaş (TL)"?: number;
  "Yıllık İzin Hakkı"?: number;
  "İşe Giriş Tarihi"?: string;
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

export interface DevelopmentPlanRow {
  id: string;
  employee_id: string;
  employee: string;
  competency?: string;
  goal: string;
  action: string;
  actionType: string;
  successMetric: string;
  dueDate?: string;
  status: "Planlandı" | "Devam Ediyor" | "Tamamlandı";
  createdBy?: string;
  createdAt: string;
  interventionId?: string;
  reassessDays?: number;
  transferredToTraining?: boolean;
}

export interface DevelopmentAssignmentRow {
  id: string;
  employee_id: string;
  employee: string;
  trainingId: string;
  trainingName: string;
  sourceDevelopmentPlanId: string;
  assignedBy?: string;
  assignedAt: string;
  dueDate?: string;
  status: string;
  competencyCode?: string;
  transferTask?: string;
  successMetric?: string;
}

export interface LeaveRequestRow {
  id: string;
  employee_id: string;
  employee: string;
  department?: string;
  type: string;
  start: string;
  end: string;
  days: number;
  status: "Bekliyor" | "Onaylandı" | "Reddedildi";
  note?: string;
  createdAt: string;
  approvedBy?: string;
}

export interface RewardLeaveRow {
  id: string;
  employee_id: string;
  employee: string;
  days: number;
  reason: string;
  grantedBy?: string;
  createdAt: string;
}

export interface CompensationBenchmarkRow {
  id: string;
  Departman: string;
  Pozisyon: string;
  "Piyasa Ortalaması": number;
  source?: string;
  updatedAt: string;
}

export interface CompensationCycleRow {
  id: string;
  name: string;
  stage: "DRAFT_SIMULATION" | "MANAGER_INPUT" | "BUDGET_REVIEW" | "APPROVAL" | "FINALIZED" | "EFFECTIVE";
  createdAt: string;
  effectiveDate?: string;
  managerDeadline?: string;
  budgetLimit?: number;
  scenario?: "A" | "B" | "C" | "D";
  inflationRate?: number;
  results?: Array<Record<string, unknown>>;
  managerRequests?: Array<Record<string, unknown>>;
  approvedBy?: string;
  finalizedAt?: string;
  appliedAt?: string;
  stageHistory?: Array<{ stage: string; at: string; by?: string }>;
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
  salary_amount?: number | null;
  annual_leave_entitlement?: number | null;
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

interface RawDevelopmentPlan {
  id: string;
  employee_id: string;
  employee_name: string;
  competency?: string | null;
  goal: string;
  action: string;
  action_type: string;
  success_metric: string;
  due_date?: string | null;
  status: DevelopmentPlanRow["status"];
  created_by?: string | null;
  created_at: string;
  intervention_id?: string | null;
  reassess_days?: number | null;
  transferred_to_training: boolean;
}

interface RawDevelopmentAssignment {
  id: string;
  employee_id: string;
  employee_name: string;
  training_id: string;
  training_name: string;
  source_development_plan_id: string;
  assigned_by?: string | null;
  assigned_at: string;
  due_date?: string | null;
  status: string;
  competency_code?: string | null;
  transfer_task?: string | null;
  success_metric?: string | null;
}

interface RawDevelopmentWorkspace {
  employees: RawEmployee[];
  plans: RawDevelopmentPlan[];
  assignments: RawDevelopmentAssignment[];
}

interface RawLeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  department?: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: LeaveRequestRow["status"];
  note?: string | null;
  created_at: string;
  approved_by?: string | null;
}

interface RawRewardLeave {
  id: string;
  employee_id: string;
  employee_name: string;
  days: number;
  reason: string;
  granted_by?: string | null;
  created_at: string;
}

interface RawLeaveWorkspace {
  current_employee: RawEmployee | null;
  manageable_employees: RawEmployee[];
  requests: RawLeaveRequest[];
  rewards: RawRewardLeave[];
}

interface RawCompensationBenchmark {
  id: string;
  department: string;
  position: string;
  market_average: number;
  source?: string | null;
  updated_at: string;
}

interface RawCompensationCycle {
  id: string;
  name: string;
  stage: CompensationCycleRow["stage"];
  created_at: string;
  effective_date?: string | null;
  manager_deadline?: string | null;
  budget_limit: number;
  scenario?: CompensationCycleRow["scenario"] | null;
  inflation_rate?: number | null;
  results: Array<Record<string, unknown>>;
  manager_requests: Array<Record<string, unknown>>;
  approved_by?: string | null;
  finalized_at?: string | null;
  applied_at?: string | null;
  stage_history: Array<{ stage: string; at: string; by?: string }>;
}

interface RawCompensationEvaluation {
  employee_id: string;
  employee_name: string;
  date: string;
  performance: number;
  competency_score?: number | null;
  manager_scores: Record<string, unknown>;
  is_star_performer: boolean;
}

interface RawCompensationWorkspace {
  employees: RawEmployee[];
  evaluations: RawCompensationEvaluation[];
  benchmarks: RawCompensationBenchmark[];
  cycles: RawCompensationCycle[];
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

function numericRecord(value: Record<string, unknown> | undefined): Record<string, number> {
  return Object.fromEntries(
    Object.entries(value || {})
      .map(([key, raw]) => [key, Number(raw)] as const)
      .filter(([, score]) => Number.isFinite(score)),
  );
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
    ...(employee.salary_amount != null ? { "Maaş (TL)": Number(employee.salary_amount) } : {}),
    ...(employee.annual_leave_entitlement != null ? { "Yıllık İzin Hakkı": Number(employee.annual_leave_entitlement) } : {}),
    ...(employee.hire_date ? { "İşe Giriş Tarihi": employee.hire_date } : {}),
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

function mapDevelopmentPlan(row: RawDevelopmentPlan): DevelopmentPlanRow {
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee: row.employee_name,
    competency: row.competency || undefined,
    goal: row.goal,
    action: row.action,
    actionType: row.action_type,
    successMetric: row.success_metric,
    dueDate: row.due_date || undefined,
    status: row.status,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    interventionId: row.intervention_id || undefined,
    reassessDays: row.reassess_days ?? undefined,
    transferredToTraining: row.transferred_to_training,
  };
}

function mapDevelopmentAssignment(row: RawDevelopmentAssignment): DevelopmentAssignmentRow {
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee: row.employee_name,
    trainingId: row.training_id,
    trainingName: row.training_name,
    sourceDevelopmentPlanId: row.source_development_plan_id,
    assignedBy: row.assigned_by || undefined,
    assignedAt: row.assigned_at,
    dueDate: row.due_date || undefined,
    status: row.status,
    competencyCode: row.competency_code || undefined,
    transferTask: row.transfer_task || undefined,
    successMetric: row.success_metric || undefined,
  };
}

function mapLeaveRequest(row: RawLeaveRequest): LeaveRequestRow {
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee: row.employee_name,
    department: row.department || undefined,
    type: row.leave_type,
    start: row.start_date,
    end: row.end_date,
    days: Number(row.days || 0),
    status: row.status,
    note: row.note || undefined,
    createdAt: row.created_at,
    approvedBy: row.approved_by || undefined,
  };
}

function mapRewardLeave(row: RawRewardLeave): RewardLeaveRow {
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee: row.employee_name,
    days: Number(row.days || 0),
    reason: row.reason,
    grantedBy: row.granted_by || undefined,
    createdAt: row.created_at,
  };
}

function mapBenchmark(row: RawCompensationBenchmark): CompensationBenchmarkRow {
  return {
    id: row.id,
    Departman: row.department,
    Pozisyon: row.position,
    "Piyasa Ortalaması": Number(row.market_average || 0),
    source: row.source || undefined,
    updatedAt: row.updated_at,
  };
}

function mapCycle(row: RawCompensationCycle): CompensationCycleRow {
  return {
    id: row.id,
    name: row.name,
    stage: row.stage,
    createdAt: row.created_at,
    effectiveDate: row.effective_date || undefined,
    managerDeadline: row.manager_deadline || undefined,
    budgetLimit: Number(row.budget_limit || 0),
    scenario: row.scenario || undefined,
    inflationRate: row.inflation_rate ?? undefined,
    results: row.results || [],
    managerRequests: row.manager_requests || [],
    approvedBy: row.approved_by || undefined,
    finalizedAt: row.finalized_at || undefined,
    appliedAt: row.applied_at || undefined,
    stageHistory: row.stage_history || [],
  };
}

function mapCompensationEvaluation(row: RawCompensationEvaluation): EvaluationRow {
  return {
    id: `comp-${row.employee_id}-${row.date}`,
    Personel: row.employee_name,
    employee_id: row.employee_id,
    date: row.date,
    evaluation_type: "Manager",
    authority_context: {},
    kpi_items: [],
    performance_weights: {},
    Performans: Number(row.performance || 0),
    competency_score: row.competency_score,
    manager_scores: numericRecord(row.manager_scores),
    is_star_performer: row.is_star_performer,
  };
}

export async function fetchSecureSessionUser(): Promise<SecureSessionUser | null> {
  const response = await fetch("/api/secure-auth/session", { cache: "no-store", credentials: "same-origin" });
  const payload = await response.json().catch(() => null) as { authenticated?: boolean; user?: SecureSessionUser } | null;
  return response.ok && payload?.authenticated && payload.user ? payload.user : null;
}

export async function fetchSaasTeamWorkspace(): Promise<{
  employees: EmployeeRow[];
  evaluations: EvaluationRow[];
  plans: DevelopmentPlanRow[];
  leaveRequests: LeaveRequestRow[];
}> {
  const [employees, evaluations, development, leave] = await Promise.all([
    apiJson<RawEmployee[]>("/api/saas/employees/team"),
    apiJson<RawEvaluation[]>("/api/saas/performance/evaluations"),
    apiJson<RawDevelopmentWorkspace>("/api/saas/workforce/development/workspace"),
    apiJson<RawLeaveWorkspace>("/api/saas/workforce/leave/workspace"),
  ]);
  return {
    employees: mapEmployees(employees),
    evaluations: evaluations.map(mapEvaluation),
    plans: development.plans.map(mapDevelopmentPlan),
    leaveRequests: leave.requests.map(mapLeaveRequest),
  };
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

export async function fetchSaasDevelopmentWorkspace(): Promise<{
  user: SecureSessionUser | null;
  employees: EmployeeRow[];
  plans: DevelopmentPlanRow[];
  assignments: DevelopmentAssignmentRow[];
  evaluations: EvaluationRow[];
}> {
  const [user, workspace, evaluations] = await Promise.all([
    fetchSecureSessionUser(),
    apiJson<RawDevelopmentWorkspace>("/api/saas/workforce/development/workspace"),
    apiJson<RawEvaluation[]>("/api/saas/performance/evaluations"),
  ]);
  return {
    user,
    employees: mapEmployees(workspace.employees),
    plans: workspace.plans.map(mapDevelopmentPlan),
    assignments: workspace.assignments.map(mapDevelopmentAssignment),
    evaluations: evaluations.map(mapEvaluation),
  };
}

export async function createSaasDevelopmentPlan(payload: {
  employee_id: string;
  competency?: string;
  goal: string;
  action: string;
  action_type: string;
  success_metric: string;
  due_date?: string;
  intervention_id?: string;
  reassess_days?: number;
}): Promise<DevelopmentPlanRow> {
  const row = await apiJson<RawDevelopmentPlan>("/api/saas/workforce/development/plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapDevelopmentPlan(row);
}

export async function updateSaasDevelopmentPlanStatus(
  planId: string,
  status: DevelopmentPlanRow["status"],
): Promise<DevelopmentPlanRow> {
  const row = await apiJson<RawDevelopmentPlan>(`/api/saas/workforce/development/plans/${encodeURIComponent(planId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return mapDevelopmentPlan(row);
}

export async function transferSaasDevelopmentPlan(planId: string): Promise<DevelopmentAssignmentRow> {
  const row = await apiJson<RawDevelopmentAssignment>(`/api/saas/workforce/development/plans/${encodeURIComponent(planId)}/transfer`, {
    method: "POST",
  });
  return mapDevelopmentAssignment(row);
}

export async function fetchSaasLeaveWorkspace(): Promise<{
  user: SecureSessionUser | null;
  currentEmployee: EmployeeRow | null;
  manageableEmployees: EmployeeRow[];
  requests: LeaveRequestRow[];
  rewards: RewardLeaveRow[];
}> {
  const [user, workspace] = await Promise.all([
    fetchSecureSessionUser(),
    apiJson<RawLeaveWorkspace>("/api/saas/workforce/leave/workspace"),
  ]);
  const allEmployees = [
    ...(workspace.current_employee ? [workspace.current_employee] : []),
    ...workspace.manageable_employees,
  ];
  const mapped = mapEmployees(allEmployees);
  const currentEmployee = workspace.current_employee
    ? mapped.find((employee) => employee.id === workspace.current_employee?.id) || null
    : null;
  return {
    user,
    currentEmployee,
    manageableEmployees: mapped.filter((employee) => employee.id !== currentEmployee?.id),
    requests: workspace.requests.map(mapLeaveRequest),
    rewards: workspace.rewards.map(mapRewardLeave),
  };
}

export async function createSaasLeaveRequest(payload: {
  leave_type: string;
  start_date: string;
  end_date: string;
  note?: string;
}): Promise<LeaveRequestRow> {
  const row = await apiJson<RawLeaveRequest>("/api/saas/workforce/leave/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapLeaveRequest(row);
}

export async function decideSaasLeaveRequest(
  requestId: string,
  decision: LeaveRequestRow["status"],
): Promise<LeaveRequestRow> {
  const row = await apiJson<RawLeaveRequest>(`/api/saas/workforce/leave/requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  });
  return mapLeaveRequest(row);
}

export async function grantSaasRewardLeave(payload: {
  employee_id: string;
  days: number;
  reason: string;
}): Promise<RewardLeaveRow> {
  const row = await apiJson<RawRewardLeave>("/api/saas/workforce/leave/rewards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapRewardLeave(row);
}

export async function fetchSaasCompensationWorkspace(): Promise<{
  user: SecureSessionUser | null;
  employees: EmployeeRow[];
  evaluations: EvaluationRow[];
  benchmarks: CompensationBenchmarkRow[];
  cycles: CompensationCycleRow[];
}> {
  const [user, workspace] = await Promise.all([
    fetchSecureSessionUser(),
    apiJson<RawCompensationWorkspace>("/api/saas/workforce/compensation/workspace"),
  ]);
  return {
    user,
    employees: mapEmployees(workspace.employees),
    evaluations: workspace.evaluations.map(mapCompensationEvaluation),
    benchmarks: workspace.benchmarks.map(mapBenchmark),
    cycles: workspace.cycles.map(mapCycle),
  };
}

export async function upsertSaasCompensationBenchmark(payload: {
  department: string;
  position: string;
  market_average: number;
  source?: string;
}): Promise<CompensationBenchmarkRow> {
  const row = await apiJson<RawCompensationBenchmark>("/api/saas/workforce/compensation/benchmarks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapBenchmark(row);
}

export async function createSaasCompensationCycle(payload: {
  name: string;
  budget_limit?: number;
}): Promise<CompensationCycleRow> {
  const row = await apiJson<RawCompensationCycle>("/api/saas/workforce/compensation/cycles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapCycle(row);
}

export async function saveSaasCompensationSimulation(
  cycleId: string,
  payload: { scenario: "A" | "B" | "C" | "D"; inflation_rate: number; results: Array<Record<string, unknown>> },
): Promise<CompensationCycleRow> {
  const row = await apiJson<RawCompensationCycle>(`/api/saas/workforce/compensation/cycles/${encodeURIComponent(cycleId)}/simulation`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapCycle(row);
}

export async function advanceSaasCompensationCycle(cycleId: string): Promise<CompensationCycleRow> {
  const row = await apiJson<RawCompensationCycle>(`/api/saas/workforce/compensation/cycles/${encodeURIComponent(cycleId)}/advance`, {
    method: "POST",
  });
  return mapCycle(row);
}

export async function submitSaasCompensationManagerRequests(
  cycleId: string,
  requests: Array<{ employee_id: string; rate: number; note: string; system_baseline?: number }>,
): Promise<CompensationCycleRow> {
  const row = await apiJson<RawCompensationCycle>(`/api/saas/workforce/compensation/cycles/${encodeURIComponent(cycleId)}/manager-requests`, {
    method: "PUT",
    body: JSON.stringify({ requests }),
  });
  return mapCycle(row);
}

export async function applySaasCompensationCycle(cycleId: string): Promise<CompensationCycleRow> {
  const row = await apiJson<RawCompensationCycle>(`/api/saas/workforce/compensation/cycles/${encodeURIComponent(cycleId)}/apply`, {
    method: "POST",
  });
  return mapCycle(row);
}
