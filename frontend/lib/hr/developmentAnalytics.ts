import { findDevelopmentIntervention, type CompetencyCode, type InterventionType } from "./developmentLibrary";
import { learningEvidenceState } from "./learningEvidence";
import { learningImpactForAssignment, type LearningImpactResult } from "./learningImpact";

export type DevelopmentAnalyticsPeriod = 3 | 6 | 12 | "all";

export interface DevelopmentEffectivenessRow {
  key: string;
  label: string;
  assignments: number;
  completed: number;
  verified: number;
  measured: number;
  improved: number;
  stable: number;
  declined: number;
  reassessmentDue: number;
  scheduled: number;
  baselineMissing: number;
  verificationRate: number | null;
  measurementRate: number | null;
  positiveRate: number | null;
  averageDelta: number | null;
  evidenceMaturity: "Veri yok" | "Erken sinyal" | "Gelişen kanıt" | "Daha güçlü kanıt";
}

export interface DevelopmentAssignmentImpact {
  assignment: any;
  impact: LearningImpactResult;
  competencyCode: string;
  competencyLabel: string;
  interventionType: string;
  interventionName: string;
}

export interface DevelopmentAnalyticsResult {
  period: DevelopmentAnalyticsPeriod;
  filteredAssignments: any[];
  details: DevelopmentAssignmentImpact[];
  summary: DevelopmentEffectivenessRow;
  competencies: DevelopmentEffectivenessRow[];
  methods: DevelopmentEffectivenessRow[];
  interventions: DevelopmentEffectivenessRow[];
  signals: {
    strongestCompetency: DevelopmentEffectivenessRow | null;
    strongestMethod: DevelopmentEffectivenessRow | null;
    strongestIntervention: DevelopmentEffectivenessRow | null;
    lowestVerificationMethod: DevelopmentEffectivenessRow | null;
    mostOverdueCompetency: DevelopmentEffectivenessRow | null;
    measurementCoverageRisk: boolean;
  };
}

const COMPETENCY_LABELS: Record<string, string> = {
  DIG: "Dijital Okuryazarlık",
  ANA: "Analitik Düşünme",
  RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen",
  LRN: "Sürekli Öğrenme",
  ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin",
  STR: "Dayanıklılık & Stres Yönetimi",
  TEA: "Takım Çalışması",
  COM: "İletişim Becerileri",
};

const METHOD_ORDER: InterventionType[] = [
  "Mikro Öğrenme",
  "Uygulamalı Eğitim",
  "İş Üstünde Uygulama",
  "Gelişim Projesi",
  "Koçluk / Mentorluk",
  "Liderlik Uygulaması",
];

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pct(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

function dateValue(value: unknown): number | null {
  if (!value) return null;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function assignmentAnchor(item: any): number | null {
  return dateValue(item?.verifiedAt) ?? dateValue(item?.completedAt) ?? dateValue(item?.assignedAt);
}

function withinPeriod(item: any, period: DevelopmentAnalyticsPeriod, now: Date) {
  if (period === "all") return true;
  const anchor = assignmentAnchor(item);
  if (anchor === null) return true;
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - period);
  return anchor >= threshold.getTime();
}

function maturity(measured: number, verified: number): DevelopmentEffectivenessRow["evidenceMaturity"] {
  if (!verified) return "Veri yok";
  if (measured < 3) return "Erken sinyal";
  if (measured < 6) return "Gelişen kanıt";
  return "Daha güçlü kanıt";
}

function buildRow(key: string, label: string, entries: DevelopmentAssignmentImpact[]): DevelopmentEffectivenessRow {
  const completed = entries.filter(({ assignment }) => ["completed", "transfer-submitted", "verified"].includes(learningEvidenceState(assignment))).length;
  const verified = entries.filter(({ assignment }) => learningEvidenceState(assignment) === "verified").length;
  const measuredEntries = entries.filter(({ impact }) => impact.state === "measured");
  const deltas = measuredEntries.map(({ impact }) => Number(impact.delta)).filter(Number.isFinite);
  const improved = measuredEntries.filter(({ impact }) => impact.direction === "improved").length;
  const stable = measuredEntries.filter(({ impact }) => impact.direction === "stable").length;
  const declined = measuredEntries.filter(({ impact }) => impact.direction === "declined").length;
  const reassessmentDue = entries.filter(({ impact }) => impact.state === "due").length;
  const scheduled = entries.filter(({ impact }) => impact.state === "scheduled").length;
  const baselineMissing = entries.filter(({ impact }) => impact.state === "baseline-missing").length;
  return {
    key,
    label,
    assignments: entries.length,
    completed,
    verified,
    measured: measuredEntries.length,
    improved,
    stable,
    declined,
    reassessmentDue,
    scheduled,
    baselineMissing,
    verificationRate: pct(verified, completed),
    measurementRate: pct(measuredEntries.length, verified),
    positiveRate: pct(improved, measuredEntries.length),
    averageDelta: deltas.length ? round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length, 2) : null,
    evidenceMaturity: maturity(measuredEntries.length, verified),
  };
}

function groupRows(entries: DevelopmentAssignmentImpact[], selector: (entry: DevelopmentAssignmentImpact) => [string, string]) {
  const groups = new Map<string, { label: string; entries: DevelopmentAssignmentImpact[] }>();
  entries.forEach((entry) => {
    const [key, label] = selector(entry);
    const group = groups.get(key) || { label, entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  });
  return Array.from(groups.entries()).map(([key, value]) => buildRow(key, value.label, value.entries));
}

function bestMeasured(rows: DevelopmentEffectivenessRow[]) {
  const candidates = rows.filter((row) => row.measured > 0 && row.averageDelta !== null);
  return candidates.sort((a, b) => {
    const maturityBonus = (row: DevelopmentEffectivenessRow) => Math.min(row.measured, 6) * 0.03;
    return (Number(b.averageDelta) + maturityBonus(b)) - (Number(a.averageDelta) + maturityBonus(a));
  })[0] || null;
}

export function buildDevelopmentAnalytics(
  assignments: any[],
  history: any[],
  options: { period?: DevelopmentAnalyticsPeriod; now?: Date } = {}
): DevelopmentAnalyticsResult {
  const period = options.period ?? 12;
  const now = options.now ?? new Date();
  const filteredAssignments = (assignments || []).filter((item) => withinPeriod(item, period, now));
  const details: DevelopmentAssignmentImpact[] = filteredAssignments.map((assignment) => {
    const intervention = findDevelopmentIntervention(String(assignment?.trainingId || ""));
    const competencyCode = String(assignment?.competencyCode || intervention?.competencyCode || "").trim();
    const competencyLabel = intervention?.competencyLabel || COMPETENCY_LABELS[competencyCode] || competencyCode || "Yetkinlik belirtilmedi";
    const interventionType = String(assignment?.interventionType || intervention?.type || "Diğer");
    const interventionName = String(assignment?.trainingName || intervention?.name || "Gelişim müdahalesi");
    return {
      assignment,
      impact: learningImpactForAssignment({ ...assignment, competencyCode }, history || [], now),
      competencyCode,
      competencyLabel,
      interventionType,
      interventionName,
    };
  });

  const competencies = groupRows(details, (entry) => [entry.competencyCode || "UNKNOWN", entry.competencyLabel])
    .sort((a, b) => Object.keys(COMPETENCY_LABELS).indexOf(a.key) - Object.keys(COMPETENCY_LABELS).indexOf(b.key));
  const methods = groupRows(details, (entry) => [entry.interventionType, entry.interventionType])
    .sort((a, b) => METHOD_ORDER.indexOf(a.key as InterventionType) - METHOD_ORDER.indexOf(b.key as InterventionType));
  const interventions = groupRows(details, (entry) => [String(entry.assignment?.trainingId || entry.interventionName), entry.interventionName])
    .sort((a, b) => b.measured - a.measured || Number(b.averageDelta ?? -99) - Number(a.averageDelta ?? -99));
  const summary = buildRow("all", period === "all" ? "Tüm dönem" : `Son ${period} ay`, details);

  const lowVerificationCandidates = methods.filter((row) => row.completed >= 2 && row.verificationRate !== null);
  const overdueCandidates = competencies.filter((row) => row.reassessmentDue > 0);
  const signals = {
    strongestCompetency: bestMeasured(competencies),
    strongestMethod: bestMeasured(methods),
    strongestIntervention: bestMeasured(interventions),
    lowestVerificationMethod: lowVerificationCandidates.sort((a, b) => Number(a.verificationRate) - Number(b.verificationRate))[0] || null,
    mostOverdueCompetency: overdueCandidates.sort((a, b) => b.reassessmentDue - a.reassessmentDue)[0] || null,
    measurementCoverageRisk: summary.verified >= 3 && Number(summary.measurementRate ?? 0) < 60,
  };

  return { period, filteredAssignments, details, summary, competencies, methods, interventions, signals };
}

export function competencyLabel(code: string) {
  return COMPETENCY_LABELS[code] || code;
}

export function developmentAnalyticsMethodOrder() {
  return [...METHOD_ORDER];
}
