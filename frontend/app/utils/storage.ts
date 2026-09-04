// FutureHR shared client state.
// Demo mode uses localStorage. Secure company mode keeps business data in memory
// and persists approved namespaces through tenant-scoped server endpoints.
export const STORAGE_KEYS = {
  USERS: "hr_users",
  ORG_CHART: "hr_org_chart",
  HISTORY_360: "hr_history_360",
  LEAVE_REQUESTS: "hr_leave_requests",
  REWARD_LEAVE: "hr_reward_leave",
  NOTIFICATIONS: "hr_notifications",
  CURRENT_USER: "hr_current_user",
  CANDIDATE_RESULTS: "hr_candidate_results",
  CANDIDATES: "hr_candidates",
  ASSESSMENTS: "hr_assessments",
  TRAINING_ASSIGNMENTS: "hr_training_assignments",
  DEVELOPMENT_PLANS: "hr_development_plans",
  CAREER_PROFILES: "hr_career_profiles",
  COMPENSATION_CYCLES: "hr_compensation_cycles",
  MARKET_BENCHMARKS: "hr_market_benchmarks",
  PULSE_ANSWERS: "hr_pulse_answers",
  ATTENDANCE_RECORDS: "hr_attendance_records_v1",
  PAYROLL_RECORDS: "hr_payroll_records_v1",
  INTEGRATION_CONFIGS: "hr_integration_configs_v1",
  INTEGRATION_RUNS: "hr_integration_runs_v1",
  SSO_CONFIG: "hr_sso_config_v1",
  EXECUTIVE_REPORTS: "hr_executive_reports_v1",
  KVKK_CONTROL_REGISTER: "hr_kvkk_control_register_v1",
  ACCESS_POLICY: "hr_access_policy_v2",
  AI_ACTION_DRAFTS: "hr_ai_action_drafts_v1",
  AI_FOCUS: "hr_ai_focus_v1",
  AI_HISTORY: "hr_ai_history_v1",
  DECISION_ACTIONS: "hr_decision_actions_v1",
  ROLE_OVERRIDES: "hr_role_overrides_v1",
};

export const HR_DATA_CLEARED_KEY = "hr_data_cleared";
const SAAS_MODE = process.env.NEXT_PUBLIC_DATA_MODE === "saas";

const CORE_DATA_KEYS = new Set<string>([
  STORAGE_KEYS.ORG_CHART, STORAGE_KEYS.HISTORY_360, STORAGE_KEYS.CANDIDATES,
  STORAGE_KEYS.ASSESSMENTS, STORAGE_KEYS.TRAINING_ASSIGNMENTS, STORAGE_KEYS.DEVELOPMENT_PLANS,
  STORAGE_KEYS.CAREER_PROFILES, STORAGE_KEYS.COMPENSATION_CYCLES, STORAGE_KEYS.MARKET_BENCHMARKS,
  STORAGE_KEYS.PULSE_ANSWERS, STORAGE_KEYS.ATTENDANCE_RECORDS, STORAGE_KEYS.PAYROLL_RECORDS,
]);

const SAAS_MEMORY_KEYS = new Set<string>([
  ...CORE_DATA_KEYS,
  STORAGE_KEYS.CANDIDATE_RESULTS,
  STORAGE_KEYS.EXECUTIVE_REPORTS,
  STORAGE_KEYS.KVKK_CONTROL_REGISTER,
  STORAGE_KEYS.AI_ACTION_DRAFTS,
  STORAGE_KEYS.DECISION_ACTIONS,
  STORAGE_KEYS.ROLE_OVERRIDES,
]);

const memory = new Map<string, unknown>();
const queues = new Map<string, Promise<void>>();

function hasMeaningfulData(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0;
  if (data && typeof data === "object") return Object.keys(data as Record<string, unknown>).length > 0;
  return data !== null && data !== undefined && data !== "";
}

function sameOriginJson(url: string, init?: RequestInit) {
  return fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers || {}) },
  }).then(async (response) => {
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(String(payload?.error || payload?.detail || `HTTP ${response.status}`));
    return payload;
  });
}

function namespaceFor(key: string): string | null {
  if (key === STORAGE_KEYS.ASSESSMENTS) return "assessments";
  if (key === STORAGE_KEYS.TRAINING_ASSIGNMENTS) return "training_assignments";
  if (key === STORAGE_KEYS.CAREER_PROFILES) return "career_profiles";
  if (key === STORAGE_KEYS.DECISION_ACTIONS) return "decision_actions";
  if (key === STORAGE_KEYS.ROLE_OVERRIDES) return "role_overrides";
  return null;
}

function queuePersist(key: string, work: () => Promise<void>) {
  const previous = queues.get(key) || Promise.resolve();
  const next = previous.catch(() => undefined).then(work).catch((error) => {
    console.error(`FutureHR secure persistence failed for ${key}:`, error);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("saasPersistenceError", { detail: { key, message: error instanceof Error ? error.message : String(error) } }));
  });
  queues.set(key, next);
}

function normalizedEmployeeImport(rows: any[]) {
  return rows.filter((row) => row?.import_file || row?.import_source).map((row, index) => ({
    employee_code: String(row?.["Personel Kodu"] || row?.external_id || row?.employeeCode || row?.id || `IMP-${index + 1}`),
    full_name: String(row?.["Ad Soyad"] || row?.name || "").trim(),
    email: String(row?.Eposta || row?.email || "").trim() || null,
    department: String(row?.Departman || row?.department || "").trim(),
    position: String(row?.Pozisyon || row?.position || "").trim(),
    hire_date: row?.["İşe Giriş Tarihi"] || row?.hireDate || null,
    employment_type: row?.["Çalışan Tipi"] || row?.employment_type || null,
    location: row?.Lokasyon || row?.location || null,
  })).filter((row) => row.full_name.length >= 2 && row.department && row.position);
}

function persistSaasValue(key: string, data: unknown) {
  const items = Array.isArray(data) ? data as any[] : [];
  if (key === STORAGE_KEYS.CANDIDATES) {
    queuePersist(key, async () => {
      const payload = await sameOriginJson("/api/saas/workforce/state/candidates/sync", { method: "PUT", body: JSON.stringify({ items }) });
      if (Array.isArray(payload?.items)) memory.set(key, payload.items);
    });
    return;
  }
  const namespace = namespaceFor(key);
  if (namespace) {
    queuePersist(key, async () => {
      const payload = await sameOriginJson(`/api/saas/workforce/state/${namespace}`, { method: "PUT", body: JSON.stringify({ items }) });
      if (Array.isArray(payload?.items)) memory.set(key, payload.items);
    });
    return;
  }
  if (key === STORAGE_KEYS.ORG_CHART) {
    const imported = normalizedEmployeeImport(items);
    const careerProfiles = items.filter((row) => Number(row?.career_aspiration) > 0 || Number(row?.mobility_willingness) > 0).map((row) => ({
      id: `career-${String(row?.id || row?.["Ad Soyad"] || "unknown")}`,
      employee_id: row?.id,
      employee: row?.["Ad Soyad"],
      career_aspiration: Number(row?.career_aspiration) || null,
      mobility_willingness: Number(row?.mobility_willingness) || null,
      updatedAt: new Date().toISOString(),
    }));
    if (careerProfiles.length) queuePersist(STORAGE_KEYS.CAREER_PROFILES, async () => {
      await sameOriginJson("/api/saas/workforce/state/career_profiles", { method: "PUT", body: JSON.stringify({ items: careerProfiles }) });
    });
    if (imported.length) queuePersist(key, async () => {
      await sameOriginJson("/api/saas/workforce/integrations/ingest/employees", { method: "POST", body: JSON.stringify({ provider: "excel", records: imported }) });
    });
    return;
  }
  if (key === STORAGE_KEYS.PAYROLL_RECORDS && items.length) {
    const records = items.map((row) => ({
      employee_code: String(row?.employeeCode || row?.employee_code || ""), period: String(row?.period || ""),
      gross_salary: Number(row?.grossSalary ?? row?.gross_salary ?? 0) || null,
      net_salary: Number(row?.netSalary ?? row?.net_salary ?? 0) || null,
      currency: String(row?.currency || "TRY"),
    })).filter((row) => row.employee_code && row.period);
    if (records.length) queuePersist(key, async () => { await sameOriginJson("/api/saas/workforce/integrations/ingest/payroll", { method: "POST", body: JSON.stringify({ provider: "excel", records }) }); });
    return;
  }
  if (key === STORAGE_KEYS.ATTENDANCE_RECORDS && items.length) {
    const records = items.map((row) => ({
      employee_code: String(row?.employeeCode || row?.employee_code || ""), work_date: row?.date || row?.work_date,
      first_in: row?.firstIn || row?.first_in || null, last_out: row?.lastOut || row?.last_out || null,
      worked_minutes: Number(row?.workedMinutes ?? row?.worked_minutes ?? 0) || null,
      overtime_minutes: Number(row?.overtimeMinutes ?? row?.overtime_minutes ?? 0) || null,
      absence_minutes: Number(row?.absenceMinutes ?? row?.absence_minutes ?? 0) || null,
    })).filter((row) => row.employee_code && row.work_date);
    if (records.length) queuePersist(key, async () => { await sameOriginJson("/api/saas/workforce/integrations/ingest/attendance", { method: "POST", body: JSON.stringify({ provider: "excel", records }) }); });
  }
}

export function seedSaasStorage(values: Record<string, unknown>) {
  if (!SAAS_MODE) return;
  Object.entries(values).forEach(([key, value]) => memory.set(key, value));
}

export async function flushSaasStorage(): Promise<void> {
  await Promise.all([...queues.values()].map((task) => task.catch(() => undefined)));
}

export function getStorageData(key: string, defaultValue: null): any;
export function getStorageData<T>(key: string, defaultValue: T): T;
export function getStorageData<T>(key: string, defaultValue: T | null): T | any {
  if (typeof window === "undefined") return defaultValue;
  if (SAAS_MODE && SAAS_MEMORY_KEYS.has(key)) return memory.has(key) ? memory.get(key) as T : defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  if (SAAS_MODE && SAAS_MEMORY_KEYS.has(key)) {
    memory.set(key, data);
    persistSaasValue(key, data);
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (CORE_DATA_KEYS.has(key) && hasMeaningfulData(data)) localStorage.removeItem(HR_DATA_CLEARED_KEY);
  } catch (error) {
    console.error("Storage error:", error);
  }
}

export function markHRDataActive(): void {
  if (typeof window === "undefined") return;
  if (!SAAS_MODE) localStorage.removeItem(HR_DATA_CLEARED_KEY);
}

export function clearStorage(): void {
  if (typeof window === "undefined") return;
  if (SAAS_MODE) {
    memory.clear();
    return;
  }
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(HR_DATA_CLEARED_KEY);
}

// Demo veri temizleme; secure company mode never deletes server records from a browser helper.
export function clearAllHRData(): void {
  if (typeof window === "undefined") return;
  if (SAAS_MODE) {
    memory.clear();
    window.dispatchEvent(new CustomEvent("storageCleared"));
    return;
  }
  const currentUserHr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  const currentUser = localStorage.getItem("user");
  const accessPolicy = localStorage.getItem(STORAGE_KEYS.ACCESS_POLICY);
  const allHrKeys = Object.keys(localStorage).filter((key) => key.startsWith("hr_") && key !== STORAGE_KEYS.CURRENT_USER && key !== STORAGE_KEYS.ACCESS_POLICY && key !== HR_DATA_CLEARED_KEY);
  allHrKeys.forEach((key) => localStorage.removeItem(key));
  const emptyKeys = [
    STORAGE_KEYS.ORG_CHART, STORAGE_KEYS.HISTORY_360, STORAGE_KEYS.LEAVE_REQUESTS, STORAGE_KEYS.REWARD_LEAVE,
    STORAGE_KEYS.NOTIFICATIONS, STORAGE_KEYS.CANDIDATE_RESULTS, STORAGE_KEYS.CANDIDATES, STORAGE_KEYS.ASSESSMENTS,
    STORAGE_KEYS.TRAINING_ASSIGNMENTS, STORAGE_KEYS.DEVELOPMENT_PLANS, STORAGE_KEYS.CAREER_PROFILES,
    STORAGE_KEYS.COMPENSATION_CYCLES, STORAGE_KEYS.MARKET_BENCHMARKS, STORAGE_KEYS.PULSE_ANSWERS,
    STORAGE_KEYS.ATTENDANCE_RECORDS, STORAGE_KEYS.PAYROLL_RECORDS, STORAGE_KEYS.INTEGRATION_RUNS,
    STORAGE_KEYS.EXECUTIVE_REPORTS, STORAGE_KEYS.KVKK_CONTROL_REGISTER, STORAGE_KEYS.AI_ACTION_DRAFTS, STORAGE_KEYS.AI_HISTORY,
    STORAGE_KEYS.DECISION_ACTIONS, STORAGE_KEYS.ROLE_OVERRIDES,
  ];
  emptyKeys.forEach((key) => localStorage.setItem(key, "[]"));
  localStorage.setItem(STORAGE_KEYS.USERS, "{}");
  localStorage.setItem(STORAGE_KEYS.INTEGRATION_CONFIGS, "{}");
  localStorage.setItem(STORAGE_KEYS.SSO_CONFIG, "{}");
  localStorage.removeItem(STORAGE_KEYS.AI_FOCUS);
  localStorage.removeItem("hr_talent_matrix");
  localStorage.removeItem("hr_org_chart_data");
  localStorage.removeItem("hr_360_data");
  localStorage.removeItem("market_data_ref");
  if (currentUserHr) localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUserHr);
  if (currentUser) localStorage.setItem("user", currentUser);
  if (accessPolicy) localStorage.setItem(STORAGE_KEYS.ACCESS_POLICY, accessPolicy);
  localStorage.setItem(HR_DATA_CLEARED_KEY, "true");
  window.dispatchEvent(new CustomEvent("storageCleared"));
}
