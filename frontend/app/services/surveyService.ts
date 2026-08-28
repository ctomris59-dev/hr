import { API_BASE_URL } from "@/lib/apiConfig";

export type PulseDriverKey = "workload" | "energy" | "manager_support" | "role_clarity" | "growth";

export interface PulseDriverDefinition {
  key: PulseDriverKey;
  label: string;
  question: string;
}

export interface PulseStatusResponse {
  success: boolean;
  hasSubmitted: boolean;
  weekStart: string;
  weekNumber?: string;
  drivers?: PulseDriverDefinition[];
  anonymityThreshold?: number;
}

export interface PulseSubmitRequest {
  user_name: string;
  score: number;
  drivers: Partial<Record<PulseDriverKey, number>>;
  feedback?: string;
  department_id?: string;
}

export interface PulseSubmitResponse {
  success: boolean;
  message: string;
  anonymityThreshold?: number;
}

export interface PulseDriverMetric {
  key: PulseDriverKey;
  label: string;
  average: number;
  count: number;
  delta: number | null;
}

export interface PulseAnalyticsWeek {
  week: string;
  count: number;
  suppressed: boolean;
  average_score: number | null;
  participation: number | null;
  comment_count: number | null;
  drivers: Partial<Record<PulseDriverKey, PulseDriverMetric>>;
}

export interface PulseAnalyticsResponse {
  success: boolean;
  scope: { department: string | null; population: number };
  anonymity: { threshold: number; currentRespondents: number; currentProtected: boolean };
  currentDrivers: PulseDriverDefinition[];
  latest: PulseAnalyticsWeek | null;
  latestDelta: number | null;
  lowestDriver: PulseDriverMetric | null;
  strongestDriver: PulseDriverMetric | null;
  trend: PulseAnalyticsWeek[];
  privacyNote: string;
}

export async function checkPulseStatus(userName: string): Promise<PulseStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pulse/v2/status?user_name=${encodeURIComponent(userName)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Pulse status check error:", error);
    return { success: false, hasSubmitted: false, weekStart: "", drivers: [], anonymityThreshold: 5 };
  }
}

export async function submitPulseAnswer(request: PulseSubmitRequest): Promise<PulseSubmitResponse> {
  const response = await fetch(`${API_BASE_URL}/api/pulse/v2/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

export async function getPulseAnalytics(params?: {
  department?: string;
  role?: string;
  userDept?: string;
}): Promise<PulseAnalyticsResponse | null> {
  try {
    const search = new URLSearchParams();
    if (params?.department) search.set("department_id", params.department);
    if (params?.role) search.set("user_role", params.role);
    if (params?.userDept) search.set("user_dept", params.userDept);
    search.set("_t", Date.now().toString());
    const response = await fetch(`${API_BASE_URL}/api/pulse/analytics?${search.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Pulse analytics fetch error:", error);
    return null;
  }
}
