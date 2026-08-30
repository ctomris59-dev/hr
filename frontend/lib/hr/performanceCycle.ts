export type PerformanceCycleStage = "PLANNING" | "OPEN" | "CALIBRATION" | "LOCKED";

export interface PerformanceCycle {
  id: string;
  name: string;
  year: number;
  period: "H1" | "H2" | "ANNUAL";
  stage: PerformanceCycleStage;
  startDate: string;
  evaluationDeadline: string;
  calibrationDeadline: string;
  createdAt: string;
  lockedAt?: string;
}

export const PERFORMANCE_CYCLE_KEY = "hr_performance_cycles";
export const PERFORMANCE_STAGE_LABELS: Record<PerformanceCycleStage, string> = {
  PLANNING: "Hedef Planlama",
  OPEN: "Değerlendirme Açık",
  CALIBRATION: "Kalibrasyon",
  LOCKED: "Dönem Kilitli",
};

function iso(date: Date) { return date.toISOString().slice(0, 10); }

export function defaultPerformanceCycle(now = new Date()): PerformanceCycle {
  const year = now.getFullYear();
  const h1 = now.getMonth() < 6;
  return {
    id: `perf-${year}-${h1 ? "h1" : "h2"}`,
    name: `${year} ${h1 ? "H1" : "H2"} Performans Dönemi`,
    year,
    period: h1 ? "H1" : "H2",
    stage: "OPEN",
    startDate: `${year}-${h1 ? "01-01" : "07-01"}`,
    evaluationDeadline: iso(new Date(year, h1 ? 5 : 11, h1 ? 20 : 15)),
    calibrationDeadline: iso(new Date(year, h1 ? 5 : 11, h1 ? 28 : 23)),
    createdAt: new Date().toISOString(),
  };
}

export function loadPerformanceCycles(): PerformanceCycle[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PERFORMANCE_CYCLE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function ensurePerformanceCycle(): PerformanceCycle[] {
  if (typeof window === "undefined") return [];
  const existing = loadPerformanceCycles();
  if (existing.length) return existing;
  const seeded = [defaultPerformanceCycle()];
  localStorage.setItem(PERFORMANCE_CYCLE_KEY, JSON.stringify(seeded));
  return seeded;
}

export function savePerformanceCycles(cycles: PerformanceCycle[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PERFORMANCE_CYCLE_KEY, JSON.stringify(cycles));
  window.dispatchEvent(new CustomEvent("performanceCycleUpdated"));
}

export function activePerformanceCycle(cycles: PerformanceCycle[]): PerformanceCycle | null {
  return cycles.find((item) => item.stage !== "LOCKED") || cycles[0] || null;
}

export function cycleContainsEvaluation(cycle: PerformanceCycle, evaluation: any): boolean {
  const raw = evaluation?.date || evaluation?.Tarih || evaluation?.createdAt;
  if (!raw) return false;
  const value = new Date(raw).getTime();
  if (!Number.isFinite(value)) return false;
  const start = new Date(cycle.startDate).getTime();
  const end = new Date(cycle.calibrationDeadline + "T23:59:59").getTime();
  return value >= start && value <= end;
}

export function performanceCycleCompletion(cycle: PerformanceCycle, employeeNames: string[], history: any[]) {
  const normalized = new Set(employeeNames.map((name) => String(name).trim().toLocaleLowerCase("tr-TR")));
  const evaluated = new Set<string>();
  history.forEach((item) => {
    if (!cycleContainsEvaluation(cycle, item)) return;
    const name = String(item?.Personel || item?.target || item?.["Ad Soyad"] || "").trim().toLocaleLowerCase("tr-TR");
    if (normalized.has(name)) evaluated.add(name);
  });
  const total = normalized.size;
  return { total, completed: evaluated.size, rate: total ? Math.round((evaluated.size / total) * 100) : 0 };
}

export function nextPerformanceStage(stage: PerformanceCycleStage): PerformanceCycleStage {
  return ({ PLANNING: "OPEN", OPEN: "CALIBRATION", CALIBRATION: "LOCKED", LOCKED: "LOCKED" } as const)[stage];
}

export function canEditPerformance(cycle: PerformanceCycle | null) {
  return !cycle || cycle.stage === "OPEN";
}
