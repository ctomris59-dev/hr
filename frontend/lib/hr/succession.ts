import { getCareerRole } from "./careerArchitecture";
import { buildTalentDecisionSnapshot, type TalentDecisionSnapshot } from "./talentDecisionChain";

export interface SuccessorAssessment {
  score: number;
  readiness: "Şimdi" | "6–12 ay" | "12–24 ay" | "24+ ay";
  targetRoleFit: number;
  levelFit: number;
  timeToReadiness: number;
  aspiration: number;
  performanceTrend: number;
  potential: number;
  evidenceScore: number;
  evidenceBand: "Düşük" | "Orta" | "Yüksek";
  chainVersion: string;
  reasons: string[];
}

function readinessMonths(index: number, levelDistance: number): number {
  if (index >= 80 && levelDistance <= 1) return 0;
  if (index >= 68 && levelDistance <= 1) return 9;
  if (index >= 52 && levelDistance <= 2) return 18;
  return 30;
}

/**
 * Halefiyet skoru artık FutureHR tek yetenek karar zinciri üzerinden beslenir:
 * performans trendi, potansiyel, rol uyumu ve kanıt güveni kariyer/yetenek ekranlarıyla
 * aynı kaynaktan gelir. Kanıt skoru adayın yetkinlik puanını artırıp azaltmaz; ayrı bir
 * karar güveni sinyali olarak tutulur.
 *
 * Skor bileşimi:
 * - Hedef rol yetkinlik uyumu %35
 * - Mevcut seviye/rol mesafesi %15
 * - Hazır olma süresi %15
 * - Kariyer isteği %10
 * - Performans trendi %15
 * - Potansiyel %10
 */
export function assessSuccessor(candidate: any, targetPosition: string, history: any[] = []): SuccessorAssessment {
  const snapshot: TalentDecisionSnapshot = buildTalentDecisionSnapshot(candidate, history, targetPosition);
  const career = snapshot.career.targetReadiness;

  if (!career) {
    return {
      score: 0,
      readiness: "24+ ay",
      targetRoleFit: 0,
      levelFit: 0,
      timeToReadiness: 0,
      aspiration: Math.round((snapshot.profile.aspiration / 5) * 100),
      performanceTrend: snapshot.performance.trendScore,
      potential: Math.round((snapshot.talent.potential.score / 5) * 100),
      evidenceScore: snapshot.evidence.score,
      evidenceBand: snapshot.evidence.band,
      chainVersion: snapshot.version,
      reasons: ["Hedef rol için kariyer hazır bulunuşluk modeli üretilemedi."],
    };
  }

  const targetRoleFit = career.competencyFit;
  const levelFit = Math.max(0, 100 - Math.max(0, career.levelDistance - 1) * 30);
  const months = readinessMonths(career.index, career.levelDistance);
  const timeToReadiness = months === 0 ? 100 : months <= 12 ? 80 : months <= 24 ? 55 : 25;
  const aspiration = Math.round((snapshot.profile.aspiration / 5) * 100);
  const trend = snapshot.performance.trendScore;
  const potential = Math.round((snapshot.talent.potential.score / 5) * 100);

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
  if (snapshot.profile.aspiration <= 3) reasons.push("Kariyer isteği teyit edilmelidir.");
  if (snapshot.talent.potential.missingInputs.length) {
    reasons.push(`Potansiyel verisi eksik: ${snapshot.talent.potential.missingInputs.join(", ")}.`);
  }
  if (snapshot.evidence.score < 60) {
    reasons.push(`Kanıt Güveni %${snapshot.evidence.score}; halefiyet kararı öncesi ek kanıt toplanmalıdır.`);
  }
  if (snapshot.performance.historyCount < 2) {
    reasons.push("Performans trendi için en az iki dönem ölçümü tercih edilir.");
  }

  return {
    score,
    readiness,
    targetRoleFit,
    levelFit,
    timeToReadiness,
    aspiration,
    performanceTrend: trend,
    potential,
    evidenceScore: snapshot.evidence.score,
    evidenceBand: snapshot.evidence.band,
    chainVersion: snapshot.version,
    reasons,
  };
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
      return {
        candidate,
        assessment: {
          ...assessment,
          score: Math.max(0, assessment.score + familyAdjustment),
        },
      };
    })
    .sort((a, b) => {
      const scoreDifference = b.assessment.score - a.assessment.score;
      if (scoreDifference !== 0) return scoreDifference;
      return b.assessment.evidenceScore - a.assessment.evidenceScore;
    });
}
