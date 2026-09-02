// FutureHR V1 demo veri katmanı.
// Production modunda kalıcı tenant verisi sunucu/PostgreSQL katmanına taşınır;
// bu yardımcı yalnızca demo prototipinin modüller arası tek tarayıcı veri kaynağıdır.
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
};

export const HR_DATA_CLEARED_KEY = "hr_data_cleared";

const CORE_DATA_KEYS = new Set<string>([
  STORAGE_KEYS.ORG_CHART,
  STORAGE_KEYS.HISTORY_360,
  STORAGE_KEYS.CANDIDATES,
  STORAGE_KEYS.ASSESSMENTS,
  STORAGE_KEYS.TRAINING_ASSIGNMENTS,
  STORAGE_KEYS.DEVELOPMENT_PLANS,
  STORAGE_KEYS.CAREER_PROFILES,
  STORAGE_KEYS.COMPENSATION_CYCLES,
  STORAGE_KEYS.MARKET_BENCHMARKS,
  STORAGE_KEYS.PULSE_ANSWERS,
  STORAGE_KEYS.ATTENDANCE_RECORDS,
  STORAGE_KEYS.PAYROLL_RECORDS,
]);

function hasMeaningfulData(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0;
  if (data && typeof data === "object") return Object.keys(data as Record<string, unknown>).length > 0;
  return data !== null && data !== undefined && data !== "";
}

export function getStorageData(key: string, defaultValue: null): any;
export function getStorageData<T>(key: string, defaultValue: T): T;
export function getStorageData<T>(key: string, defaultValue: T | null): T | any {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (CORE_DATA_KEYS.has(key) && hasMeaningfulData(data)) localStorage.removeItem(HR_DATA_CLEARED_KEY);
  } catch (error) {
    console.error("Storage error:", error);
  }
}

export function markHRDataActive(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HR_DATA_CLEARED_KEY);
}

export function clearStorage(): void {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(HR_DATA_CLEARED_KEY);
}

// Merkezi demo veri temizleme fonksiyonu. Kimlik bilgilerini ve firma yetki politikasını korur.
export function clearAllHRData(): void {
  if (typeof window === "undefined") return;
  const currentUserHr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  const currentUser = localStorage.getItem("user");
  const accessPolicy = localStorage.getItem(STORAGE_KEYS.ACCESS_POLICY);
  const allHrKeys = Object.keys(localStorage).filter(
    (key) => key.startsWith("hr_") && key !== STORAGE_KEYS.CURRENT_USER && key !== STORAGE_KEYS.ACCESS_POLICY && key !== HR_DATA_CLEARED_KEY
  );
  allHrKeys.forEach((key) => localStorage.removeItem(key));

  const emptyKeys = [
    STORAGE_KEYS.ORG_CHART, STORAGE_KEYS.HISTORY_360, STORAGE_KEYS.LEAVE_REQUESTS, STORAGE_KEYS.REWARD_LEAVE,
    STORAGE_KEYS.NOTIFICATIONS, STORAGE_KEYS.CANDIDATE_RESULTS, STORAGE_KEYS.CANDIDATES, STORAGE_KEYS.ASSESSMENTS,
    STORAGE_KEYS.TRAINING_ASSIGNMENTS, STORAGE_KEYS.DEVELOPMENT_PLANS, STORAGE_KEYS.CAREER_PROFILES,
    STORAGE_KEYS.COMPENSATION_CYCLES, STORAGE_KEYS.MARKET_BENCHMARKS, STORAGE_KEYS.PULSE_ANSWERS,
    STORAGE_KEYS.ATTENDANCE_RECORDS, STORAGE_KEYS.PAYROLL_RECORDS, STORAGE_KEYS.INTEGRATION_RUNS,
    STORAGE_KEYS.EXECUTIVE_REPORTS, STORAGE_KEYS.KVKK_CONTROL_REGISTER, STORAGE_KEYS.AI_ACTION_DRAFTS, STORAGE_KEYS.AI_HISTORY,
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
