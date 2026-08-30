import { evaluationSubjectName, normalizeEmployeeName, recordTimestamp } from "./employeeIdentity";
import { extractCompetencyMap } from "./talentPotential";
import { learningEvidenceState } from "./learningEvidence";

export type LearningImpactState =
  | "not-verified"
  | "scheduled"
  | "due"
  | "baseline-missing"
  | "measured";

export interface LearningImpactResult {
  state: LearningImpactState;
  competency: string | null;
  baseline: number | null;
  post: number | null;
  delta: number | null;
  baselineDate: string | null;
  postDate: string | null;
  reassessDueAt: string | null;
  daysUntilDue: number | null;
  direction: "improved" | "stable" | "declined" | "unknown";
  label: string;
  note: string;
}

function timestamp(value: unknown): number | null {
  if (!value) return null;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function evaluationDate(record: any): string | null {
  const value = record?.date ?? record?.Tarih ?? record?.createdAt ?? record?.timestamp ?? record?.updatedAt;
  return value ? String(value) : null;
}

function competencyValue(record: any, competency: string | null): number | null {
  if (!competency) return null;
  const map = extractCompetencyMap(record || {});
  const value = Number(map[competency]);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

function employeeEvaluations(employeeName: string, history: any[]) {
  const key = normalizeEmployeeName(employeeName);
  return (history || [])
    .filter((record) => normalizeEmployeeName(evaluationSubjectName(record)) === key)
    .map((record, index) => ({ record, time: recordTimestamp(record, index) }))
    .sort((a, b) => a.time - b.time);
}

export function learningImpactForAssignment(item: any, history: any[], now = new Date()): LearningImpactResult {
  const competency = String(item?.competencyCode || "").trim() || null;
  const reassessDueAt = item?.reassessDueAt ? String(item.reassessDueAt) : null;
  const dueTime = timestamp(reassessDueAt);
  const nowTime = now.getTime();
  const daysUntilDue = dueTime === null ? null : Math.ceil((dueTime - nowTime) / 86400000);

  if (learningEvidenceState(item) !== "verified") {
    return {
      state: "not-verified", competency, baseline: null, post: null, delta: null,
      baselineDate: null, postDate: null, reassessDueAt, daysUntilDue,
      direction: "unknown", label: "Kanıt doğrulaması bekleniyor",
      note: "Etki ölçümü yalnız işe transfer kanıtı yönetici tarafından doğrulandıktan sonra başlar.",
    };
  }

  const evaluations = employeeEvaluations(String(item?.employee || ""), history);
  const anchorTime = timestamp(item?.completedAt) ?? timestamp(item?.verifiedAt) ?? timestamp(item?.assignedAt) ?? nowTime;
  const baselineCandidates = evaluations.filter(({ time }) => time <= anchorTime);
  const baselineEntry = baselineCandidates.length ? baselineCandidates[baselineCandidates.length - 1] : null;
  const baseline = baselineEntry ? competencyValue(baselineEntry.record, competency) : null;

  if (baseline === null) {
    return {
      state: "baseline-missing", competency, baseline: null, post: null, delta: null,
      baselineDate: null, postDate: null, reassessDueAt, daysUntilDue,
      direction: "unknown", label: "Başlangıç ölçümü eksik",
      note: "Gelişim etkisini hesaplamak için müdahale öncesi aynı yetkinliğe ait ölçüm gerekir.",
    };
  }

  if (dueTime !== null && dueTime > nowTime) {
    return {
      state: "scheduled", competency, baseline, post: null, delta: null,
      baselineDate: evaluationDate(baselineEntry?.record), postDate: null, reassessDueAt, daysUntilDue,
      direction: "unknown", label: daysUntilDue !== null && daysUntilDue <= 14 ? "Yeniden ölçüm yaklaşıyor" : "Yeniden ölçüm planlı",
      note: "Planlanan tarihten sonra aynı yetkinlik yeniden ölçüldüğünde değişim otomatik hesaplanacak.",
    };
  }

  const postStart = dueTime ?? anchorTime;
  const postEntry = evaluations.find(({ time }) => time >= postStart && (!baselineEntry || time > baselineEntry.time)) || null;
  const post = postEntry ? competencyValue(postEntry.record, competency) : null;

  if (post === null) {
    return {
      state: "due", competency, baseline, post: null, delta: null,
      baselineDate: evaluationDate(baselineEntry?.record), postDate: null, reassessDueAt, daysUntilDue,
      direction: "unknown", label: "Yeniden ölçüm gerekli",
      note: "Hedef tarih geldi ancak karşılaştırılabilir yeni yetkinlik ölçümü henüz bulunmuyor.",
    };
  }

  const delta = Math.round((post - baseline) * 100) / 100;
  const direction = delta >= 0.15 ? "improved" : delta <= -0.15 ? "declined" : "stable";
  const label = direction === "improved" ? "Ölçülen gelişim" : direction === "declined" ? "Gerileme sinyali" : "Değişim sınırlı";

  return {
    state: "measured", competency, baseline, post, delta,
    baselineDate: evaluationDate(baselineEntry?.record), postDate: evaluationDate(postEntry?.record), reassessDueAt, daysUntilDue,
    direction, label,
    note: "Bu karşılaştırma müdahale öncesi ve planlanan yeniden ölçüm sonrası aynı yetkinlik puanlarını gösterir; nedensellik kanıtı değildir.",
  };
}

export function learningImpactSummary(rows: any[], history: any[], now = new Date()) {
  const results = (rows || []).map((row) => learningImpactForAssignment(row, history, now));
  const verified = results.filter((result) => result.state !== "not-verified");
  const measured = results.filter((result) => result.state === "measured");
  const due = results.filter((result) => result.state === "due");
  const scheduled = results.filter((result) => result.state === "scheduled");
  const improved = measured.filter((result) => result.direction === "improved");
  const deltas = measured.map((result) => Number(result.delta)).filter(Number.isFinite);
  const averageDelta = deltas.length ? Math.round((deltas.reduce((sum, value) => sum + value, 0) / deltas.length) * 100) / 100 : null;
  const positiveRate = measured.length ? Math.round((improved.length / measured.length) * 100) : null;
  return { verified: verified.length, measured: measured.length, due: due.length, scheduled: scheduled.length, improved: improved.length, averageDelta, positiveRate };
}
