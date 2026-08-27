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
}

export const PERFORMANCE_MODEL_VERSION = "FHR-PERF-2.0";
export const KPI_COMPONENT_WEIGHT = 0.6;
export const MANAGER_COMPONENT_WEIGHT = 0.4;

export const DEFAULT_KPIS: KpiItem[] = [
  { id: "kpi-1", title: "Ana hedef / çıktı 1", weight: 30, score: 3 },
  { id: "kpi-2", title: "Ana hedef / çıktı 2", weight: 30, score: 3 },
  { id: "kpi-3", title: "Kalite / doğruluk hedefi", weight: 20, score: 3 },
  { id: "kpi-4", title: "Zaman / verimlilik hedefi", weight: 20, score: 3 },
];

const clampScore = (value: number) => Math.min(5, Math.max(1, Number(value) || 1));
const round2 = (value: number) => Math.round(value * 100) / 100;

export function calculateKpiScore(items: KpiItem[]): { score: number; totalWeight: number } {
  const valid = items.filter((item) => item.title.trim() && item.weight > 0);
  const totalWeight = valid.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (!valid.length || totalWeight <= 0) return { score: 3, totalWeight: 0 };
  const weighted = valid.reduce(
    (sum, item) => sum + clampScore(item.score) * Number(item.weight || 0),
    0
  );
  return { score: round2(weighted / totalWeight), totalWeight: round2(totalWeight) };
}

export function calculatePerformance(
  items: KpiItem[],
  managerScore: number,
  kpiWeight = KPI_COMPONENT_WEIGHT,
  managerWeight = MANAGER_COMPONENT_WEIGHT
): PerformanceResult {
  const kpi = calculateKpiScore(items);
  const normalizedManager = clampScore(managerScore);
  const total = kpiWeight + managerWeight || 1;
  const normalizedKpiWeight = kpiWeight / total;
  const normalizedManagerWeight = managerWeight / total;
  const finalScore = round2(
    kpi.score * normalizedKpiWeight + normalizedManager * normalizedManagerWeight
  );
  return {
    kpiScore: kpi.score,
    managerScore: normalizedManager,
    finalScore,
    kpiWeight: normalizedKpiWeight,
    managerWeight: normalizedManagerWeight,
    totalKpiWeight: kpi.totalWeight,
  };
}

export function calculateCompetencyScore(scores: Record<string, number>): number {
  const values = Object.values(scores)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  if (!values.length) return 0;
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * Bu varsayılan model bir kurum politikasıdır, bilimsel norm değildir.
 * Kurum KPI/yönetici ağırlıklarını kendi performans yönetim politikasına göre
 * yapılandırabilir. Yetkinlik skoru şimdilik 10 boyutun eşit ağırlıklı özetidir;
 * rol bazlı önem ağırlıkları ayrıca tanımlanana kadar hedef yeterlilik seviyeleri
 * "ağırlık" olarak kullanılmaz.
 */
