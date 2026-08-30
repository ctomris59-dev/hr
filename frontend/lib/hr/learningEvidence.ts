import { findDevelopmentIntervention } from "./developmentLibrary";

export type LearningEvidenceState =
  | "assigned"
  | "in-progress"
  | "completed"
  | "transfer-submitted"
  | "verified";

export interface LearningEvidenceRecord {
  id: string;
  employee: string;
  trainingId: string;
  trainingName: string;
  competency: string | null;
  level: number | null;
  completedAt: string | null;
  transferEvidence: string | null;
  managerVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  reassessDueAt: string | null;
  state: LearningEvidenceState;
}

export function learningEvidenceState(item: any): LearningEvidenceState {
  if (!item || item.status === "Atandı") return "assigned";
  if (item.status === "Devam Ediyor") return "in-progress";
  if (item.status !== "Tamamlandı") return "assigned";
  const transferEvidence = String(item.transferEvidence || "").trim();
  if (!transferEvidence) return "completed";
  if (!item.managerVerified) return "transfer-submitted";
  return "verified";
}

export function learningEvidenceLabel(state: LearningEvidenceState) {
  if (state === "assigned") return "Atandı";
  if (state === "in-progress") return "Öğrenme sürüyor";
  if (state === "completed") return "Transfer kanıtı bekleniyor";
  if (state === "transfer-submitted") return "Yönetici doğrulaması bekleniyor";
  return "Doğrulanmış gelişim kanıtı";
}

export function toLearningEvidenceRecord(item: any): LearningEvidenceRecord {
  const intervention = findDevelopmentIntervention(item?.trainingId);
  const state = learningEvidenceState(item);
  return {
    id: String(item?.id || item?.trainingId || "learning"),
    employee: String(item?.employee || ""),
    trainingId: String(item?.trainingId || ""),
    trainingName: String(item?.trainingName || intervention?.name || "Gelişim müdahalesi"),
    competency: item?.competencyCode || intervention?.competencyCode || null,
    level: Number(item?.developmentLevel || intervention?.level || 0) || null,
    completedAt: item?.completedAt || null,
    transferEvidence: String(item?.transferEvidence || "").trim() || null,
    managerVerified: state === "verified",
    verifiedAt: item?.verifiedAt || null,
    verifiedBy: item?.verifiedBy || null,
    reassessDueAt: item?.reassessDueAt || null,
    state,
  };
}

export function learningProgressForEmployee(employeeName: string, assignments: any[]) {
  return (assignments || [])
    .filter((item: any) => item?.employee === employeeName)
    .map(toLearningEvidenceRecord);
}

export function verifiedLearningEvidenceForEmployee(employeeName: string, assignments: any[]) {
  return learningProgressForEmployee(employeeName, assignments).filter((item) => item.state === "verified");
}

export function pendingTransferEvidenceForEmployee(employeeName: string, assignments: any[]) {
  return learningProgressForEmployee(employeeName, assignments).filter((item) => item.state === "completed");
}

export function pendingManagerVerification(assignments: any[]) {
  return (assignments || []).map(toLearningEvidenceRecord).filter((item) => item.state === "transfer-submitted");
}
