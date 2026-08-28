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
  decisionCoverage: number;
  evidenceBand: "Düşük" | "Orta" | "Yüksek";
  chainVersion: string;
  reasons: string[];
}

function readinessMonths(index: number, levelDistance: number, dataCoverage: number, evidenceScore: number): number {
  // Düşük kanıt / veri kapsamı asla "Şimdi hazır" sonucu üretmez.
  if (dataCoverage < 40 || evidenceScore < 40) return 30;
  if (dataCoverage < 60 || evidenceScore < 60) return index >= 68 && levelDistance <= 1 ? 18 : 30;
  if (index >= 80 && levelDistance <= 1) return 0;
  if (index >= 68 && levelDistance <= 1) return 9;
  if (index >= 52 && levelDistance <= 2) return 18;
  return 30;
}

/**
 * Halefiyet skoru FutureHR tek yetenek karar zinciri üzerinden beslenir.
 * Kanıt güveni adayın yetenek/performans kalitesine bonus vermez; yalnızca
 * "hazır olma" iddiasının güvenilirliğini sınırlar.
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
      aspiration: snapshot.profile.aspiration > 0 ? Math.round((snapshot.profile.aspiration / 5) * 100) : 0,
      performanceTrend: snapshot.performance.trendScore,
      potential: snapshot.talent.potential.score > 0 ? Math.round((snapshot.talent.potential.score / 5) * 100) : 0,
      evidenceScore: snapshot.evidence.score,
      decisionCoverage: 0,
      evidenceBand: snapshot.evidence.band,
      chainVersion: snapshot.version,
      reasons: ["Hedef rol için kariyer hazır bulunuşluk modeli üretilemedi."],
    };
  }

  const targetRoleFit = career.competencyFit;
  const levelFit = Math.max(0, 100 - Math.max(0, career.levelDistance - 1) * 30);
  const months = readinessMonths(career.index, career.levelDistance, career.dataCoverage, snapshot.evidence.score);
  const timeToReadiness = months === 0 ? 100 : months <= 12 ? 80 : months <= 24 ? 55 : 25;
  const aspiration = snapshot.profile.aspiration > 0 ? Math.round((snapshot.profile.aspiration / 5) * 100) : 0;
  const trend = snapshot.performance.historyCount > 0 ? snapshot.performance.trendScore : 0;
  const potential = snapshot.talent.potential.score > 0 ? Math.round((snapshot.talent.potential.score / 5) * 100) : 0;

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
  if (targetRoleFit < 70) reasons.push(targetRoleFit > 0 ? "Hedef rol yetkinlik uyumu geliştirilmelidir." : "Hedef rol yetkinlik kanıtı bulunmuyor.");
  if (career.levelDistance > 1) reasons.push(`Seviye mesafesi ${career.levelDistance} kademe.`);
  if (snapshot.profile.aspiration === 0) reasons.push("Kariyer isteği henüz teyit edilmemiştir.");
  else if (snapshot.profile.aspiration <= 3) reasons.push("Kariyer isteği teyit edilmelidir.");
  if (snapshot.talent.potential.missingInputs.length) {
    reasons.push(`Potansiyel verisi eksik: ${snapshot.talent.potential.missingInputs.join(", ")}.`);
  }
  if (career.dataCoverage < 60) {
    reasons.push(`Hedef rol karar veri kapsamı %${career.dataCoverage}; hazır olma süresi temkinli tutuldu.`);
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
    decisionCoverage: career.dataCoverage,
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
      const coverageDifference = b.assessment.decisionCoverage - a.assessment.decisionCoverage;
      if (coverageDifference !== 0) return coverageDifference;
      return b.assessment.evidenceScore - a.assessment.evidenceScore;
    });
}
