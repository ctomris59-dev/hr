import { POSITIONS } from "../../app/data/jobData";
import { getCareerRole, JOB_LEVELS, resolveTargetProfile } from "./careerArchitecture";
import { JOB_PROFILE_WEIGHTS, JOB_COMPETENCY_MODEL_VERSION } from "./jobCompetencyArchitecture";

export interface RoleCompetencyTarget {
  label: string;
  target: number;
  weight: number;
  criticality: number;
}

export interface JobArchitectureRecord {
  title: string;
  canonicalTitle: string;
  family: string;
  level: string;
  levelLabel: string;
  modelVersion: string;
  confidence: "A" | "B" | "C" | null;
  source: "exact" | "family-level" | "level" | "generic";
  referenceCount: number;
  aliasMatched: boolean;
  competencies: RoleCompetencyTarget[];
}

const normalize = (value: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");

export function getJobArchitectureRecord(position: string): JobArchitectureRecord {
  const resolution = resolveTargetProfile(position);
  const role = getCareerRole(position);
  const canonicalTitle = resolution.canonicalPosition || role.canonicalTitle || position;
  const weights = JOB_PROFILE_WEIGHTS[canonicalTitle] || {};

  const competencies = Object.entries(resolution.profile)
    .map(([label, target]) => {
      const numericTarget = Number(target);
      const weight = Number((weights as Record<string, number>)[label] ?? 1);
      // Criticality combines explicit role target and role-specific weight.  It is
      // a display/ranking aid, not an employee score.
      const criticality = Math.round((numericTarget * 12 + weight * 2) * 10) / 10;
      return { label, target: numericTarget, weight, criticality };
    })
    .sort((a, b) => b.criticality - a.criticality || b.target - a.target);

  return {
    title: position,
    canonicalTitle,
    family: role.family,
    level: role.level,
    levelLabel: JOB_LEVELS[role.level],
    modelVersion: resolution.modelVersion || JOB_COMPETENCY_MODEL_VERSION,
    confidence: resolution.evidenceConfidence || null,
    source: resolution.source,
    referenceCount: resolution.referenceCount,
    aliasMatched: Boolean(resolution.aliasMatched),
    competencies,
  };
}

export function listJobArchitectureRecords(): JobArchitectureRecord[] {
  const seen = new Set<string>();
  return POSITIONS.filter((title) => {
    const key = normalize(title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  })
    .map(getJobArchitectureRecord)
    .sort((a, b) => a.family.localeCompare(b.family, "tr") || a.level.localeCompare(b.level) || a.title.localeCompare(b.title, "tr"));
}

export function searchJobArchitecture(query: string, limit = 30): JobArchitectureRecord[] {
  const q = normalize(query);
  const all = listJobArchitectureRecords();
  if (!q) return all.slice(0, limit);
  return all
    .map((record) => {
      const haystack = normalize(`${record.title} ${record.canonicalTitle} ${record.family} ${record.levelLabel}`);
      const score = normalize(record.title) === q ? 100 : normalize(record.title).startsWith(q) ? 80 : haystack.includes(q) ? 50 : 0;
      return { record, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title, "tr"))
    .slice(0, limit)
    .map((item) => item.record);
}
