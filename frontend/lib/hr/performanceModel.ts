export interface KpiItem {
  id: string;
  title: string;
  weight: number;
  score: number;
}

export interface PerformanceResult {
  kpiScore: number;
  managerScore: number;
  finalScore: number;
  kpiWeight: number;
  managerWeight: number;
  totalKpiWeight: number;
  complete: boolean;
}

export const PERFORMANCE_MODEL_VERSION = "FHR-PERF-2.1";
export const KPI_COMPONENT_WEIGHT = 0.6;
export const MANAGER_COMPONENT_WEIGHT = 0.4;

export const DEFAULT_KPIS: KpiItem[] = [
  { id: "kpi-1", title: "Ana hedef / çıktı 1", weight: 30, score: 0 },
  { id: "kpi-2", title: "Ana hedef / çıktı 2", weight: 30, score: 0 },
  { id: "kpi-3", title: "Kalite / doğruluk hedefi", weight: 20, score: 0 },
  { id: "kpi-4", title: "Zaman / verimlilik hedefi", weight: 20, score: 0 },
];

const validScore = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
};
const round2 = (value: number) => Math.round(value * 100) / 100;

export function calculateKpiScore(items: KpiItem[]): { score: number; totalWeight: number; complete: boolean } {
  const valid = items.filter((item) => item.title.trim() && Number(item.weight) > 0);
  const totalWeight = valid.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const scored = valid.filter((item) => validScore(item.score) !== null);
  const complete = valid.length > 0 && scored.length === valid.length && Math.abs(totalWeight - 100) < 0.01;
  if (!valid.length || totalWeight <= 0 || scored.length !== valid.length) {
    return { score: 0, totalWeight: round2(totalWeight), complete: false };
  }
  const weighted = valid.reduce(
    (sum, item) => sum + Number(validScore(item.score)) * Number(item.weight || 0),
    0
  );
  return { score: round2(weighted / totalWeight), totalWeight: round2(totalWeight), complete };
}

export function calculatePerformance(
  items: KpiItem[],
  managerScore: number,
  kpiWeight = KPI_COMPONENT_WEIGHT,
  managerWeight = MANAGER_COMPONENT_WEIGHT
): PerformanceResult {
  const kpi = calculateKpiScore(items);
  const normalizedManager = validScore(managerScore) ?? 0;
  const total = kpiWeight + managerWeight || 1;
  const normalizedKpiWeight = kpiWeight / total;
  const normalizedManagerWeight = managerWeight / total;
  const complete = kpi.complete && normalizedManager > 0;
  const finalScore = complete
    ? round2(kpi.score * normalizedKpiWeight + normalizedManager * normalizedManagerWeight)
    : 0;
  return {
    kpiScore: kpi.score,
    managerScore: normalizedManager,
    finalScore,
    kpiWeight: normalizedKpiWeight,
    managerWeight: normalizedManagerWeight,
    totalKpiWeight: kpi.totalWeight,
    complete,
  };
}

export function calculateCompetencyScore(scores: Record<string, number>): number {
  const values = Object.values(scores)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  if (!values.length) return 0;
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function isCompetencySetComplete(scores: Record<string, number>, expectedCount = 10): boolean {
  const values = Object.values(scores);
  return values.length >= expectedCount && values.every((value) => validScore(value) !== null);
}

/**
 * Bu varsayılan model bir kurum politikasıdır, bilimsel norm değildir.
 * Eksik KPI/yönetici/yetkinlik girdileri artık 3,0 ile doldurulmaz. Kullanıcı gerçek
 * puan girmeden nihai performans üretilmez; böylece "veri yok" ile "ortalama" ayrılır.
 */
