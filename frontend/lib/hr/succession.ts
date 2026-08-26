import { calculateCareerReadiness, getCareerRole } from "./careerArchitecture";
import { calculatePotentialIndex } from "./talentPotential";

export interface SuccessorAssessment {
  score: number;
  readiness: "Şimdi" | "6–12 ay" | "12–24 ay" | "24+ ay";
  targetRoleFit: number;
  levelFit: number;
  timeToReadiness: number;
  aspiration: number;
  performanceTrend: number;
  potential: number;
  reasons: string[];
}

function normalizePerformance(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : 0;
}

function performanceTrend(candidate: any, history: any[] = []): number {
  const name = String(candidate?.["Ad Soyad"] || candidate?.name || "").trim().toLocaleLowerCase("tr-TR");
  const points = history
    .filter((item) => String(item?.Personel || item?.target || item?.["Ad Soyad"] || "").trim().toLocaleLowerCase("tr-TR") === name)
    .map((item) => normalizePerformance(item?.Performans ?? item?.performance))
    .filter((value) => value > 0);

  if (!points.length) return Math.round((normalizePerformance(candidate?.Performans ?? candidate?.performance) / 5) * 100);
  if (points.length === 1) return Math.round((points[0] / 5) * 100);
  const first = points[0];
  const last = points[points.length - 1];
  const avg = points.reduce((a, b) => a + b, 0) / points.length;
  const trendBonus = Math.max(-15, Math.min(15, (last - first) * 15));
  return Math.round(Math.min(100, Math.max(0, (avg / 5) * 100 + trendBonus)));
}

function readinessMonths(index: number, levelDistance: number): number {
  if (index >= 80 && levelDistance <= 1) return 0;
  if (index >= 68 && levelDistance <= 1) return 9;
  if (index >= 52 && levelDistance <= 2) return 18;
  return 30;
}

/**
 * Halefiyet skoru hedef role göre dinamik hesaplanır:
 * - Hedef rol yetkinlik uyumu %35
 * - Mevcut seviye/rol mesafesi %15
 * - Hazır olma süresi %15
 * - Kariyer isteği %10
 * - Performans trendi %15
 * - Potansiyel %10
 * Sonuç otomatik atama/terfi kararı değildir; karar desteğidir.
 */
export function assessSuccessor(candidate: any, targetPosition: string, history: any[] = []): SuccessorAssessment {
  const career = calculateCareerReadiness(candidate, targetPosition);
  const potentialResult = calculatePotentialIndex(candidate);
  const targetRoleFit = career.competencyFit;
  const levelFit = Math.max(0, 100 - Math.max(0, career.levelDistance - 1) * 30);
  const months = readinessMonths(career.index, career.levelDistance);
  const timeToReadiness = months === 0 ? 100 : months <= 12 ? 80 : months <= 24 ? 55 : 25;
  const aspirationRaw = Number(candidate?.career_aspiration ?? candidate?.careerAspiration ?? 3);
  const aspiration = Math.round(Math.min(100, Math.max(0, (aspirationRaw / 5) * 100)));
  const trend = performanceTrend(candidate, history);
  const potential = Math.round((potentialResult.score / 5) * 100);

  const score = Math.round(
    targetRoleFit * 0.35 +
      levelFit * 0.15 +
      timeToReadiness * 0.15 +
      aspiration * 0.1 +
      trend * 0.15 +
      potential * 0.1
  );

  const readiness: SuccessorAssessment["readiness"] =
    months === 0 ? "Şimdi" : months <= 12 ? "6–12 ay" : months <= 24 ? "12–24 ay" : "24+ ay";
  const reasons: string[] = [];
  if (targetRoleFit < 70) reasons.push("Hedef rol yetkinlik uyumu geliştirilmelidir.");
  if (career.levelDistance > 1) reasons.push(`Seviye mesafesi ${career.levelDistance} kademe.`);
  if (aspirationRaw <= 3) reasons.push("Kariyer isteği teyit edilmelidir.");
  if (potentialResult.missingInputs.length) reasons.push(`Potansiyel verisi eksik: ${potentialResult.missingInputs.join(", ")}.`);

  return { score, readiness, targetRoleFit, levelFit, timeToReadiness, aspiration, performanceTrend: trend, potential, reasons };
}

export function rankSuccessors(
  targetPerson: any,
  candidates: any[],
  history: any[] = []
): Array<{ candidate: any; assessment: SuccessorAssessment }> {
  const targetPosition = targetPerson?.Pozisyon || targetPerson?.position || "";
  const targetFamily = getCareerRole(targetPosition).family;
  return candidates
    .filter((candidate) => candidate !== targetPerson)
    .map((candidate) => {
      const assessment = assessSuccessor(candidate, targetPosition, history);
      const candidateFamily = getCareerRole(candidate?.Pozisyon || candidate?.position || "").family;
      const familyAdjustment = candidateFamily === targetFamily ? 0 : -5;
      return { candidate, assessment: { ...assessment, score: Math.max(0, assessment.score + familyAdjustment) } };
    })
    .sort((a, b) => b.assessment.score - a.assessment.score);
}
