// localStorage yönetimi - demo veri senkronizasyonu için
// Not: Production kimlik doğrulaması ve kalıcı veri katmanı daha sonra sunucu tarafına taşınacak.
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
  ACCESS_POLICY: "hr_access_policy_v2",
};

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
  } catch (error) {
    console.error("Storage error:", error);
  }
}

export function clearStorage(): void {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

// Merkezi demo veri temizleme fonksiyonu. Kimlik bilgilerini ve firma yetki politikasını korur.
export function clearAllHRData(): void {
  if (typeof window === "undefined") return;

  const currentUserHr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  const currentUser = localStorage.getItem("user");
  const accessPolicy = localStorage.getItem(STORAGE_KEYS.ACCESS_POLICY);

  const allHrKeys = Object.keys(localStorage).filter(
    (key) => key.startsWith("hr_") && key !== STORAGE_KEYS.CURRENT_USER && key !== STORAGE_KEYS.ACCESS_POLICY && key !== "hr_data_cleared"
  );
  allHrKeys.forEach((key) => localStorage.removeItem(key));

  setStorageData(STORAGE_KEYS.ORG_CHART, []);
  setStorageData(STORAGE_KEYS.HISTORY_360, []);
  setStorageData(STORAGE_KEYS.LEAVE_REQUESTS, []);
  setStorageData(STORAGE_KEYS.REWARD_LEAVE, []);
  setStorageData(STORAGE_KEYS.NOTIFICATIONS, []);
  setStorageData(STORAGE_KEYS.CANDIDATE_RESULTS, []);
  setStorageData(STORAGE_KEYS.CANDIDATES, []);
  setStorageData(STORAGE_KEYS.ASSESSMENTS, []);
  setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
  setStorageData(STORAGE_KEYS.DEVELOPMENT_PLANS, []);
  setStorageData(STORAGE_KEYS.CAREER_PROFILES, []);
  setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES, []);
  setStorageData(STORAGE_KEYS.MARKET_BENCHMARKS, []);
  setStorageData(STORAGE_KEYS.PULSE_ANSWERS, []);
  setStorageData(STORAGE_KEYS.USERS, {});

  localStorage.removeItem("hr_talent_matrix");
  localStorage.removeItem("hr_org_chart_data");
  localStorage.removeItem("hr_360_data");
  localStorage.removeItem("market_data_ref");

  if (currentUserHr) localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUserHr);
  if (currentUser) localStorage.setItem("user", currentUser);
  if (accessPolicy) localStorage.setItem(STORAGE_KEYS.ACCESS_POLICY, accessPolicy);

  localStorage.setItem("hr_data_cleared", "true");
  window.dispatchEvent(new CustomEvent("storageCleared"));
}
