import { buildEvidenceGraph, type EvidenceGraphResult } from "./evidenceGraph";
import { calculateCareerReadiness, getCareerRole, type CareerReadiness, type CareerRole } from "./careerArchitecture";
import { calculatePotentialIndex, extractCompetencyMap, getNineBox, type PotentialResult } from "./talentPotential";
import { employeeKey as stableEmployeeKey, evaluationsForEmployee } from "./employeeIdentity";

export const TALENT_DECISION_CHAIN_VERSION = "FHR-TALENT-CHAIN-1.1" as const;

export type TrendDirection = "Yükseliş" | "Yatay" | "Düşüş" | "Veri yok";

export interface TalentDecisionSnapshot {
  version: typeof TALENT_DECISION_CHAIN_VERSION;
  identity: {
    employeeKey: string;
    position: string;
    department: string;
  };
  performance: {
    score: number;
    historyCount: number;
    trendScore: number;
    trendDelta: number;
    trendDirection: TrendDirection;
    latestEvaluationDate: string | null;
  };
  competency: {
    score: number;
    coverage: number;
    currentRoleFit: number;
  };
  talent: {
    potential: PotentialResult;
    nineBox: string;
  };
  profile: {
    aspiration: number;
    mobility: number;
  };
  career: {
    currentRole: CareerRole;
    targetRole: CareerRole | null;
    targetReadiness: CareerReadiness | null;
  };
  evidence: EvidenceGraphResult;
  signals: string[];
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function normalizeFive(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 0;
}

function profileFive(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 0;
}

function competencyAverage(person: any): { score: number; coverage: number } {
  const map = extractCompetencyMap(person);
  const values = Object.values(map).map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return { score: 0, coverage: 0 };
  return {
    score: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100,
    coverage: Math.round(Math.min(100, (values.length / 10) * 100)),
  };
}

function performanceSnapshot(person: any, history: any[]) {
  const recordsDesc = evaluationsForEmployee(person, history);
  const records = [...recordsDesc].reverse();
  const points = records
    .map((record) => normalizeFive(record?.Performans ?? record?.performance))
    .filter((value) => value > 0);

  const fallback = normalizeFive(person?.Performans ?? person?.performance);
  const score = points.length ? points[points.length - 1] : fallback;
  if (!points.length) {
    return {
      score,
      historyCount: 0,
      trendScore: score > 0 ? Math.round((score / 5) * 100) : 0,
      trendDelta: 0,
      trendDirection: "Veri yok" as TrendDirection,
      latestEvaluationDate: null,
      latestRecord: null,
    };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const average = points.reduce((sum, value) => sum + value, 0) / points.length;
  const delta = Math.round((last - first) * 100) / 100;
  const trendBonus = Math.max(-15, Math.min(15, delta * 15));
  const trendScore = Math.round(clamp((average / 5) * 100 + trendBonus));
  const trendDirection: TrendDirection = points.length < 2 ? "Yatay" : delta >= 0.25 ? "Yükseliş" : delta <= -0.25 ? "Düşüş" : "Yatay";
  const latestRecord = recordsDesc[0] || null;
  const latestDate = latestRecord?.date || latestRecord?.Tarih || latestRecord?.createdAt || latestRecord?.timestamp || null;

  return {
    score,
    historyCount: points.length,
    trendScore,
    trendDelta: delta,
    trendDirection,
    latestEvaluationDate: latestDate ? String(latestDate) : null,
    latestRecord,
  };
}

/**
 * FutureHR'ın performans → yetkinlik → yetenek → kariyer → halefiyet zinciri için
 * tek çalışan karar görünümünü üretir. Eksik kişisel profil veya değerlendirme verisi
 * nötr/ortalama puanla doldurulmaz; 0 + açık veri sinyali olarak taşınır.
 */
export function buildTalentDecisionSnapshot(
  person: any,
  history: any[] = [],
  targetPosition?: string | null
): TalentDecisionSnapshot {
  const perf = performanceSnapshot(person, history);
  const composite = perf.latestRecord ? { ...person, ...perf.latestRecord } : { ...person };
  const competency = competencyAverage(composite);
  const storedCompetency = Number(composite?.competency_score);
  const competencyScore = Number.isFinite(storedCompetency) && storedCompetency > 0 ? storedCompetency : competency.score;

  const position = String(person?.Pozisyon || person?.position || composite?.Pozisyon || composite?.position || "");
  const department = String(person?.Departman || person?.department || composite?.Departman || composite?.department || "");
  const currentRole = getCareerRole(position);
  const currentRoleReadiness = position ? calculateCareerReadiness(composite, position) : null;
  const targetRole = targetPosition ? getCareerRole(targetPosition) : null;
  const targetReadiness = targetPosition ? calculateCareerReadiness(composite, targetPosition) : null;
  const potential = calculatePotentialIndex(composite);
  const nineBox = getNineBox(perf.score, potential.score);
  const aspiration = profileFive(composite?.career_aspiration ?? composite?.careerAspiration);
  const mobility = profileFive(composite?.mobility_willingness ?? composite?.mobilityWillingness);

  const evidenceContext: Record<string, unknown> = {
    performance: {
      score: perf.score || null,
      historyCount: perf.historyCount,
      trendScore: perf.trendScore || null,
      trendDelta: perf.trendDelta,
      evaluationDate: perf.latestEvaluationDate,
    },
    assessment: {
      competencyScore: competencyScore || null,
      competencyCoverage: competency.coverage,
      managerScores: composite?.manager_scores || composite?.scores || composite?.raw_scores || null,
    },
    profile: {
      careerAspiration: aspiration || null,
      mobility: mobility || null,
    },
    potential: {
      score: potential.score || null,
      confidence: potential.confidence,
      missingInputs: potential.missingInputs,
    },
    roleTarget: {
      currentPosition: position,
      currentRoleFit: currentRoleReadiness?.competencyFit || null,
      targetPosition: targetPosition || null,
      targetReadiness: targetReadiness?.index || null,
      targetCompetencyFit: targetReadiness?.competencyFit || null,
      targetDataCoverage: targetReadiness?.dataCoverage || null,
    },
  };

  const evidenceKind = targetPosition ? "career" : "talent";
  const evidence = buildEvidenceGraph(evidenceKind, evidenceContext);
  const signals: string[] = [];
  if (!perf.historyCount) signals.push("Geçmiş performans ölçümü yok; trend yorumu sınırlı.");
  if (competency.coverage < 70) signals.push(`Yetkinlik veri kapsamı %${competency.coverage}; ek ölçüm önerilir.`);
  if (aspiration === 0) signals.push("Kariyer isteği teyit edilmemiş; nötr puan varsayılmadı.");
  if (mobility === 0) signals.push("Mobilite / yeni sorumluluk isteği teyit edilmemiş; nötr puan varsayılmadı.");
  if (potential.missingInputs.length) signals.push(`Potansiyel güveni için eksik: ${potential.missingInputs.join(", ")}.`);
  if (evidence.score < 60) signals.push(`Kanıt Güveni %${evidence.score}; insan kararı öncesi ek kanıt toplanmalı.`);
  if (targetReadiness && targetReadiness.dataCoverage < 60) signals.push(`Hedef rol karar veri kapsamı %${targetReadiness.dataCoverage}; hazır kararı üretmek için yetersiz.`);
  if (targetReadiness && targetReadiness.competencyFit > 0 && targetReadiness.competencyFit < 70) signals.push("Hedef rol yetkinlik uyumu gelişim eşiğinin altında.");
  if (targetReadiness && targetReadiness.levelDistance > 1) signals.push(`Hedef rol mevcut seviyenin ${targetReadiness.levelDistance} kademe üzerinde.`);

  return {
    version: TALENT_DECISION_CHAIN_VERSION,
    identity: {
      employeeKey: stableEmployeeKey(person),
      position,
      department,
    },
    performance: {
      score: Math.round(perf.score * 100) / 100,
      historyCount: perf.historyCount,
      trendScore: perf.trendScore,
      trendDelta: perf.trendDelta,
      trendDirection: perf.trendDirection,
      latestEvaluationDate: perf.latestEvaluationDate,
    },
    competency: {
      score: Math.round(competencyScore * 100) / 100,
      coverage: competency.coverage,
      currentRoleFit: Math.round(currentRoleReadiness?.competencyFit ?? 0),
    },
    talent: {
      potential,
      nineBox,
    },
    profile: {
      aspiration,
      mobility,
    },
    career: {
      currentRole,
      targetRole,
      targetReadiness,
    },
    evidence,
    signals,
  };
}
