import { activePerformanceCycle, ensurePerformanceCycle, performanceCycleCompletion } from "./performanceCycle";
import { learningEvidenceState } from "./learningEvidence";
import { learningImpactForAssignment } from "./learningImpact";
import { filterDataByScope } from "@/app/utils/hierarchy";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { COMPENSATION_STAGE_LABELS, type CompensationCycle } from "./compensationWorkflow";

export type BusinessEventTone = "success" | "error" | "warning" | "info";
export interface BusinessEvent {
  id: number;
  key: string;
  message: string;
  type: BusinessEventTone;
  read: false;
  timestamp: Date;
  link: string;
  source: string;
}

function hashKey(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash) + 700000;
}
function daysUntil(raw?: string | null) {
  if (!raw) return null;
  const value = new Date(raw).getTime();
  if (!Number.isFinite(value)) return null;
  return Math.ceil((value - Date.now()) / 86400000);
}
function isManagerRole(role: string) { return ["CEO", "IK", "HR", "HR_ADMIN", "DIRECTOR", "MANAGER"].includes(role); }
function event(key: string, message: string, type: BusinessEventTone, link: string, source: string): BusinessEvent {
  return { id: hashKey(key), key, message, type, read: false, timestamp: new Date(), link, source };
}

export function buildBusinessEvents(currentUser: any): BusinessEvent[] {
  if (typeof window === "undefined" || !currentUser) return [];
  const role = String(currentUser?.role || "").toUpperCase();
  const name = String(currentUser?.name || currentUser?.username || "");
  const org = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
  const history = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
  const training = getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
  const leave = getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, []);
  const cycles = getStorageData<CompensationCycle[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []);
  const scopedOrg = filterDataByScope(org, currentUser) as any[];
  const scopedNames = new Set(scopedOrg.map((item) => String(item?.["Ad Soyad"] || "")));
  const events: BusinessEvent[] = [];

  if (isManagerRole(role)) {
    const perf = activePerformanceCycle(ensurePerformanceCycle());
    if (perf) {
      const completion = performanceCycleCompletion(perf, [...scopedNames], history);
      const days = daysUntil(perf.evaluationDeadline);
      if (perf.stage === "OPEN" && completion.rate < 100 && days !== null && days <= 7) {
        events.push(event(`perf:${perf.id}:${completion.completed}`, `${perf.name}: değerlendirme kapsamı %${completion.rate}. Son tarihe ${Math.max(days, 0)} gün kaldı.`, days < 0 ? "error" : "warning", "/degerlendirme", "performance-cycle"));
      }
      if (perf.stage === "CALIBRATION") events.push(event(`cal:${perf.id}`, `${perf.name} kalibrasyon aşamasında. Kanıt farklarını kapatıp dönemi kilitleyin.`, "info", "/kalibrasyon", "performance-cycle"));
    }
  }

  const scopedTraining = training.filter((item) => scopedNames.has(String(item?.employee || "")) || String(item?.employee || "") === name);
  const waitingVerification = scopedTraining.filter((item) => learningEvidenceState(item) === "transfer-submitted" && isManagerRole(role));
  if (waitingVerification.length) events.push(event(`learning-verify:${waitingVerification.map((x) => x.id).join("|")}`, `${waitingVerification.length} gelişim kanıtı yönetici doğrulaması bekliyor.`, "warning", "/egitim", "learning-evidence"));
  const due = scopedTraining.filter((item) => learningImpactForAssignment(item, history).state === "due");
  if (due.length) events.push(event(`learning-due:${due.map((x) => x.id).join("|")}`, `${due.length} doğrulanmış gelişim müdahalesinde yeniden ölçüm zamanı geldi.`, "warning", "/gelisim-analitigi", "learning-impact"));
  const employeeEvidence = scopedTraining.filter((item) => String(item?.employee || "") === name && learningEvidenceState(item) === "completed");
  if (role === "PERSONEL" || role === "EMPLOYEE") {
    if (employeeEvidence.length) events.push(event(`employee-evidence:${employeeEvidence.map((x) => x.id).join("|")}`, `${employeeEvidence.length} tamamlanan gelişim müdahalesi için işe transfer kanıtınızı ekleyin.`, "info", "/egitim", "learning-evidence"));
  }

  const pendingLeave = leave.filter((item) => {
    const status = String(item?.status || item?.durum || "").toLocaleLowerCase("tr-TR");
    const employee = String(item?.employee || item?.name || item?.["Ad Soyad"] || "");
    return /bekle|pending|talep/.test(status) && (scopedNames.has(employee) || employee === name);
  });
  if (pendingLeave.length && isManagerRole(role)) events.push(event(`leave:${pendingLeave.map((x) => x.id || x.createdAt).join("|")}`, `${pendingLeave.length} izin talebi onay bekliyor.`, "info", "/izinler", "leave"));

  const activeComp = cycles.find((cycle) => cycle.stage !== "EFFECTIVE");
  if (activeComp && (role === "CEO" || role === "IK" || role === "HR_ADMIN")) {
    events.push(event(`comp:${activeComp.id}:${activeComp.stage}`, `${activeComp.name}: ${COMPENSATION_STAGE_LABELS[activeComp.stage]} aşamasında.`, activeComp.stage === "APPROVAL" ? "warning" : "info", "/maas", "compensation"));
  }
  if (activeComp?.stage === "MANAGER_INPUT" && (role === "DIRECTOR" || role === "MANAGER")) {
    events.push(event(`comp-manager:${activeComp.id}`, `${activeComp.name}: yönetici ücret önerileri girişi açık.`, "info", "/yonetici/maas-talep", "compensation"));
  }

  return events.slice(0, 12);
}
