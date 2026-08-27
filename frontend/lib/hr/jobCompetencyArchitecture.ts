/** FutureHR Role Competency Architecture v2 (FHR-COMP-JOB-2.0). */
import { BATCH1_PROFILES, BATCH1_METADATA, BATCH1_WEIGHTS } from "./jobCompetencyBatch1";

export const JOB_COMPETENCY_MODEL_VERSION = "FHR-COMP-JOB-2.0" as const;
export const RESILIENCE_LABEL = "Dayanıklılık & Stres Yönetimi" as const;
export const LEGACY_STRATEGY_LABEL = "Stratejik Bakış" as const;

export const FUTUREHR_COMPETENCIES = [
  "Dijital Okuryazarlık",
  "Analitik Düşünme",
  "Sonuç Odaklılık",
  "Detaylara Özen",
  "Sürekli Öğrenme",
  "Etik ve Uyum",
  "Öz-Disiplin",
  RESILIENCE_LABEL,
  "Takım Çalışması",
  "İletişim Becerileri",
] as const;

export type FutureHRCompetency = (typeof FUTUREHR_COMPETENCIES)[number];
export type CompetencyProfile = Record<FutureHRCompetency, number>;
export type CompetencyWeights = Record<FutureHRCompetency, number>;
export type EvidenceConfidence = "A" | "B" | "C";

export interface JobProfileMetadata {
  modelVersion: typeof JOB_COMPETENCY_MODEL_VERSION;
  family: string;
  level: "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
  confidence: EvidenceConfidence;
  evidence: string[];
  rationale: string;
  status: "recalibrated-v2" | "legacy-normalized";
  smeValidationRecommended: boolean;
}

export const EVIDENCE_REFERENCES = {
  onet: "O*NET Work Styles / occupational information",
  esco: "ESCO v1.2.1 Skills-Occupations Matrix / ISCO crosswalk",
  opm: "U.S. OPM Job Analysis: importance, criticality and SME confirmation",
} as const;

function normalizeLegacyProfile(profile: Record<string, number>): CompetencyProfile {
  const normalized: Record<string, number> = {};
  for (const competency of FUTUREHR_COMPETENCIES) {
    normalized[competency] = competency === RESILIENCE_LABEL
      ? Number(profile[RESILIENCE_LABEL] ?? profile[LEGACY_STRATEGY_LABEL] ?? 3.5)
      : Number(profile[competency] ?? 3.5);
  }
  return normalized as CompetencyProfile;
}

function addLegacyAlias(profile: Record<string, number>) {
  Object.defineProperty(profile, LEGACY_STRATEGY_LABEL, {
    enumerable: false,
    configurable: false,
    get: () => profile[RESILIENCE_LABEL],
  });
  return profile;
}

/**
 * Canonicalizes the full legacy catalog to the current ten competencies and overlays
 * evidence-informed recalibrated roles. The hidden legacy alias protects older direct
 * lookups while Object.keys/Object.entries expose only the canonical resilience label.
 */
export function buildJobProfilesV2(legacyProfiles: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const [role, raw] of Object.entries(legacyProfiles)) {
    result[role] = addLegacyAlias({ ...normalizeLegacyProfile(raw) });
  }
  for (const [role, calibrated] of Object.entries(BATCH1_PROFILES)) {
    result[role] = addLegacyAlias({ ...calibrated });
  }
  return result;
}

export const JOB_PROFILE_METADATA: Record<string, JobProfileMetadata> = BATCH1_METADATA as Record<string, JobProfileMetadata>;
export const JOB_PROFILE_WEIGHTS: Record<string, CompetencyWeights> = BATCH1_WEIGHTS as Record<string, CompetencyWeights>;

export function getJobProfileEvidence(role: string): JobProfileMetadata {
  return JOB_PROFILE_METADATA[role] || {
    modelVersion: JOB_COMPETENCY_MODEL_VERSION,
    family: "Legacy catalog / pending recalibration",
    level: "L3",
    confidence: "C",
    evidence: [EVIDENCE_REFERENCES.opm],
    rationale: "STR semantiği kanonikleştirildi; hedef değerler departman bazlı FHR-COMP-JOB-2.0 kalibrasyonunu bekliyor.",
    status: "legacy-normalized",
    smeValidationRecommended: true,
  };
}
