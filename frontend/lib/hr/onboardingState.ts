export type CompanyOnboardingState = {
  id: string;
  companyName: string;
  taxCity: string;
  locations: string;
  industry: string;
  completedSteps: number[];
  completedAt?: string;
  updatedAt?: string;
};

export type UserOnboardingState = {
  id: string;
  employee_id?: string | null;
  userKey: string;
  role: string;
  status: "new" | "started" | "exploring" | "completed";
  completedRoutes: string[];
  seenAt?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
};

export const DEFAULT_COMPANY_ONBOARDING: CompanyOnboardingState = {
  id: "company-onboarding",
  companyName: "FutureHR Demo Sanayi A.Ş.",
  taxCity: "Tekirdağ",
  locations: "Çorlu, İstanbul",
  industry: "Üretim & Teknoloji",
  completedSteps: [],
};

const SAAS_MODE = process.env.NEXT_PUBLIC_DATA_MODE === "saas";
const COMPANY_DEMO_KEY = "futurehr_company_onboarding_v3";
const USER_DEMO_PREFIX = "futurehr_user_onboarding_v3:";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

async function apiJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(payload?.error || payload?.detail || `HTTP ${response.status}`));
  return payload;
}

export function onboardingUserKey(user: any): string {
  return String(user?.employeeId || user?.employee_id || user?.username || user?.name || "anonymous").trim() || "anonymous";
}

export async function readOnboardingBundle(user: any): Promise<{
  company: CompanyOnboardingState;
  user: UserOnboardingState | null;
}> {
  const userKey = onboardingUserKey(user);
  const localPersonal = typeof window === "undefined"
    ? null
    : safeParse<UserOnboardingState | null>(localStorage.getItem(`${USER_DEMO_PREFIX}${userKey}`), null);

  if (!SAAS_MODE) {
    const company = typeof window === "undefined"
      ? DEFAULT_COMPANY_ONBOARDING
      : safeParse<CompanyOnboardingState>(localStorage.getItem(COMPANY_DEMO_KEY), DEFAULT_COMPANY_ONBOARDING);
    return { company: { ...DEFAULT_COMPANY_ONBOARDING, ...company }, user: localPersonal };
  }

  const payload = await apiJson("/api/saas/workforce/state/bootstrap");
  const companyRows = Array.isArray(payload?.documents?.onboarding_state) ? payload.documents.onboarding_state : [];
  const userRows = Array.isArray(payload?.documents?.user_onboarding) ? payload.documents.user_onboarding : [];
  const company = companyRows.find((row: any) => row?.id === "company-onboarding") || companyRows[0] || DEFAULT_COMPANY_ONBOARDING;
  const personal = userRows.find((row: any) => String(row?.userKey || "") === userKey) || localPersonal || null;
  return { company: { ...DEFAULT_COMPANY_ONBOARDING, ...company }, user: personal };
}

export async function saveCompanyOnboarding(state: CompanyOnboardingState): Promise<CompanyOnboardingState> {
  const next = { ...state, id: "company-onboarding", updatedAt: new Date().toISOString() };
  if (!SAAS_MODE) {
    if (typeof window !== "undefined") localStorage.setItem(COMPANY_DEMO_KEY, JSON.stringify(next));
    return next;
  }
  const payload = await apiJson("/api/saas/workforce/state/onboarding_state", {
    method: "PUT",
    body: JSON.stringify({ items: [next] }),
  });
  return (Array.isArray(payload?.items) && payload.items[0]) ? payload.items[0] : next;
}

export async function saveUserOnboarding(user: any, state: Partial<UserOnboardingState>): Promise<UserOnboardingState> {
  const userKey = onboardingUserKey(user);
  const employeeId = user?.employeeId || user?.employee_id || null;
  const role = String(user?.role || state.role || "").toUpperCase();
  const next: UserOnboardingState = {
    id: `user-onboarding-${userKey}`.slice(0, 160),
    employee_id: employeeId ? String(employeeId) : null,
    userKey,
    role,
    status: state.status || "new",
    completedRoutes: Array.from(new Set(state.completedRoutes || [])),
    seenAt: state.seenAt,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    updatedAt: new Date().toISOString(),
  };
  if (!SAAS_MODE || !employeeId) {
    if (typeof window !== "undefined") localStorage.setItem(`${USER_DEMO_PREFIX}${userKey}`, JSON.stringify(next));
    return next;
  }
  const payload = await apiJson("/api/saas/workforce/state/user_onboarding", {
    method: "PUT",
    body: JSON.stringify({ items: [next] }),
  });
  return (Array.isArray(payload?.items) && payload.items[0]) ? payload.items[0] : next;
}
