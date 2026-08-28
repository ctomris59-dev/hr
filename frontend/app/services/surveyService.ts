import { API_BASE_URL } from "@/lib/apiConfig";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";

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
  mode?: "api" | "demo";
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
  mode?: "api" | "demo";
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
  mode?: "api" | "demo";
}

const ANONYMITY_THRESHOLD = 5;
const DRIVER_DEFINITIONS: PulseDriverDefinition[] = [
  { key: "workload", label: "İş Yükü", question: "Bu hafta iş yükün sürdürülebilir ve yönetilebilir miydi?" },
  { key: "energy", label: "Enerji", question: "İş gününü sürdürebilecek enerji ve odağa sahip miydin?" },
  { key: "manager_support", label: "Yönetici Desteği", question: "İhtiyaç duyduğunda yöneticinden yeterli destek alabildin mi?" },
  { key: "role_clarity", label: "Rol Netliği", question: "Bu hafta önceliklerin ve senden beklenenler yeterince net miydi?" },
  { key: "growth", label: "Gelişim", question: "Bu hafta öğrenme veya gelişme fırsatı bulabildin mi?" },
];

function isoWeek(date = new Date()): { key: string; start: string; index: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
  return { key: `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, start: monday.toISOString().slice(0, 10), index: week };
}

function driversForWeek(weekIndex: number): PulseDriverDefinition[] {
  const start = ((weekIndex - 1) * 2) % DRIVER_DEFINITIONS.length;
  return [DRIVER_DEFINITIONS[start], DRIVER_DEFINITIONS[(start + 1) % DRIVER_DEFINITIONS.length]];
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function localAnswers() {
  return getStorageData<any[]>(STORAGE_KEYS.PULSE_ANSWERS, []);
}

function localStatus(userName: string): PulseStatusResponse {
  const week = isoWeek();
  const submitted = localAnswers().some((answer) =>
    normalizeName(answer?.user_name ?? answer?.userName ?? answer?.name) === normalizeName(userName) &&
    String(answer?.week_number ?? answer?.week ?? "") === week.key
  );
  return {
    success: true,
    hasSubmitted: submitted,
    weekStart: week.start,
    weekNumber: week.key,
    drivers: driversForWeek(week.index),
    anonymityThreshold: ANONYMITY_THRESHOLD,
    mode: "demo",
  };
}

function saveLocalAnswer(request: PulseSubmitRequest): PulseSubmitResponse {
  const week = isoWeek();
  const answers = localAnswers();
  const duplicate = answers.some((answer) =>
    normalizeName(answer?.user_name ?? answer?.userName ?? answer?.name) === normalizeName(request.user_name) &&
    String(answer?.week_number ?? answer?.week ?? "") === week.key
  );
  if (duplicate) throw new Error("Bu haftanın check-in'i daha önce gönderildi.");
  const record = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pulse-${Date.now()}`,
    user_name: request.user_name,
    department_id: request.department_id || "",
    department: request.department_id || "",
    week_number: week.key,
    week_start: week.start,
    score: request.score,
    drivers: request.drivers,
    feedback: request.feedback || "",
    created_at: new Date().toISOString(),
    source: "futurehr-demo",
  };
  setStorageData(STORAGE_KEYS.PULSE_ANSWERS, [record, ...answers]);
  return { success: true, message: "Check-in demo veri katmanına kaydedildi.", anonymityThreshold: ANONYMITY_THRESHOLD, mode: "demo" };
}

function localAnalytics(params?: { department?: string; role?: string; userDept?: string }): PulseAnalyticsResponse {
  const current = isoWeek();
  const requestedDepartment = params?.department || ((params?.role === "DIRECTOR" || params?.role === "MANAGER") ? params?.userDept : undefined) || "";
  const answers = localAnswers().filter((answer) => {
    if (!requestedDepartment) return true;
    return String(answer?.department_id ?? answer?.department ?? answer?.departman ?? "") === requestedDepartment;
  });
  const org = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
  const population = requestedDepartment
    ? org.filter((person) => String(person?.Departman ?? person?.department ?? "") === requestedDepartment).length
    : org.length;

  const grouped = new Map<string, any[]>();
  answers.forEach((answer) => {
    const week = String(answer?.week_number ?? answer?.week ?? "");
    if (!week) return;
    const bucket = grouped.get(week) || [];
    bucket.push(answer);
    grouped.set(week, bucket);
  });

  const allWeeks = Array.from(grouped.keys()).sort().slice(-12);
  const lastVisibleDriver = new Map<PulseDriverKey, number>();
  const trend: PulseAnalyticsWeek[] = allWeeks.map((week) => {
    const rows = grouped.get(week) || [];
    const suppressed = rows.length < ANONYMITY_THRESHOLD;
    const scores = rows.map((row) => Number(row?.score)).filter((value) => Number.isFinite(value) && value >= 1 && value <= 10);
    const drivers: Partial<Record<PulseDriverKey, PulseDriverMetric>> = {};
    if (!suppressed) {
      DRIVER_DEFINITIONS.forEach((definition) => {
        const values = rows
          .map((row) => Number(row?.drivers?.[definition.key]))
          .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
        if (!values.length) return;
        const avg = average(values) as number;
        const previous = lastVisibleDriver.get(definition.key);
        drivers[definition.key] = {
          key: definition.key,
          label: definition.label,
          average: Math.round(avg * 10) / 10,
          count: values.length,
          delta: previous === undefined ? null : Math.round((avg - previous) * 10) / 10,
        };
        lastVisibleDriver.set(definition.key, avg);
      });
    }
    return {
      week,
      count: rows.length,
      suppressed,
      average_score: suppressed || !scores.length ? null : Math.round((average(scores) as number) * 10) / 10,
      participation: suppressed || !population ? null : Math.min(100, Math.round((rows.length / population) * 100)),
      comment_count: suppressed ? null : rows.filter((row) => String(row?.feedback || "").trim()).length,
      drivers,
    };
  });

  const visible = trend.filter((week) => !week.suppressed && week.average_score !== null);
  const latest = visible.length ? visible[visible.length - 1] : null;
  const previous = visible.length > 1 ? visible[visible.length - 2] : null;
  const currentRespondents = (grouped.get(current.key) || []).length;
  const latestDrivers = latest ? Object.values(latest.drivers).filter(Boolean) as PulseDriverMetric[] : [];
  const sortedDrivers = [...latestDrivers].sort((a, b) => a.average - b.average);

  return {
    success: true,
    scope: { department: requestedDepartment || null, population },
    anonymity: {
      threshold: ANONYMITY_THRESHOLD,
      currentRespondents,
      currentProtected: currentRespondents < ANONYMITY_THRESHOLD,
    },
    currentDrivers: driversForWeek(current.index),
    latest,
    latestDelta: latest && previous ? Math.round(((latest.average_score as number) - (previous.average_score as number)) * 10) / 10 : null,
    lowestDriver: sortedDrivers[0] || null,
    strongestDriver: sortedDrivers.length ? sortedDrivers[sortedDrivers.length - 1] : null,
    trend,
    privacyNote: `Demo dahil yönetim görünümünde yalnızca en az ${ANONYMITY_THRESHOLD} yanıtlı anonim toplu sonuçlar gösterilir. Bireysel yorumlar analitik çıktıya dahil edilmez.`,
    mode: "demo",
  };
}

export async function checkPulseStatus(userName: string): Promise<PulseStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pulse/v2/status?user_name=${encodeURIComponent(userName)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { ...(await response.json()), mode: "api" };
  } catch {
    return localStatus(userName);
  }
}

export async function submitPulseAnswer(request: PulseSubmitRequest): Promise<PulseSubmitResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pulse/v2/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (response.ok) return { ...(await response.json()), mode: "api" };
    if (response.status >= 400 && response.status < 500) {
      const errorData = await response.json().catch(() => ({ detail: "Check-in reddedildi." }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
  } catch (error) {
    if (error instanceof Error && /daha önce|reddedildi|HTTP 4/.test(error.message)) throw error;
  }
  return saveLocalAnswer(request);
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { ...(await response.json()), mode: "api" };
  } catch {
    return localAnalytics(params);
  }
}
