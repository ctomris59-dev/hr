import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { mapToUserRole } from "@/app/data/roles";
import { canAccessRoute, getPerformanceViewTargets, getSensitiveScope } from "@/lib/hr/accessControl";
import { employeeKey, latestEvaluationForEmployee, normalizeEmployeeName } from "@/lib/hr/employeeIdentity";
import { buildTalentDecisionSnapshot } from "@/lib/hr/talentDecisionChain";
import { extractCompetencyMap } from "@/lib/hr/talentPotential";
import { resolveTargetProfile } from "@/lib/hr/careerArchitecture";
import { learningImpactSummary } from "@/lib/hr/learningImpact";
import { DEVELOPMENT_LIBRARY, recommendedInterventions, type CompetencyCode } from "@/lib/hr/developmentLibrary";
import { rankSuccessors } from "@/lib/hr/succession";
import { processEmployeeData } from "@/app/utils/salarySimulation";
import type { AgentConfidence, AgentEvidenceSource, AgentPreparedAction } from "./futureHRAgentTypes";

const LABEL_TO_CODE: Record<string, CompetencyCode> = {
  "Dijital Okuryazarlık": "DIG",
  "Analitik Düşünme": "ANA",
  "Sonuç Odaklılık": "RES",
  "Detaylara Özen": "DET",
  "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH",
  "Öz-Disiplin": "DIS",
  "Dayanıklılık & Stres Yönetimi": "STR",
  "Takım Çalışması": "TEA",
  "İletişim Becerileri": "COM",
};

export interface FutureHRDataBundle {
  user: any;
  org: any[];
  history: any[];
  training: any[];
  development: any[];
  careerProfiles: any[];
  benchmarks: any[];
  compensationCycles: any[];
  candidates: any[];
  candidateResults: any[];
  assessments: any[];
  pulse: any[];
}

export interface TrainingAdvice {
  interventionId: string;
  name: string;
  competencyCode: string;
  competencyLabel: string;
  type: string;
  level: number;
  duration: string;
  gap: number;
  transferTask: string;
  successMetric: string;
  reassessDays: number;
  alreadyAssigned: boolean;
  alreadyCompleted: boolean;
}

export interface Employee360Context {
  identity: {
    employeeKey: string;
    displayName: string;
    position: string;
    department: string;
  };
  decisionSnapshot: any;
  latestEvaluation: any;
  evaluationCount: number;
  competencyGaps: Array<{ label: string; code: string; actual: number; expected: number; gap: number }>;
  trainingHistory: any[];
  trainingAdvice: TrainingAdvice[];
  developmentPlans: any[];
  learningImpact: ReturnType<typeof learningImpactSummary>;
  careerProfile: any | null;
  succession: {
    canView: boolean;
    topCandidates: Array<{ employeeKey: string; displayName: string; readiness: string; score: number }>;
  };
  compensation: {
    canView: boolean;
    hasBenchmark: boolean;
    evidenceScore: number | null;
    risk: string | null;
  };
  evidenceSources: AgentEvidenceSource[];
  evidenceGaps: string[];
  preparedActions: AgentPreparedAction[];
  confidence: AgentConfidence;
}

const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function sameEmployee(item: any, name: string) {
  const target = normalizeEmployeeName(name);
  return [item?.employee, item?.Personel, item?.["Ad Soyad"], item?.employee_name]
    .some((candidate) => normalizeEmployeeName(candidate) === target);
}

export function readLocalFutureHRData(): FutureHRDataBundle {
  return {
    user: getStorageData(STORAGE_KEYS.CURRENT_USER, null),
    org: getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []),
    history: getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []),
    training: getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []),
    development: getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []),
    careerProfiles: getStorageData<any[]>(STORAGE_KEYS.CAREER_PROFILES, []),
    benchmarks: getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS, []),
    compensationCycles: getStorageData<any[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []),
    candidates: getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []),
    candidateResults: getStorageData<any[]>(STORAGE_KEYS.CANDIDATE_RESULTS, []),
    assessments: getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS, []),
    pulse: getStorageData<any[]>(STORAGE_KEYS.PULSE_ANSWERS, []),
  };
}

export function scopedEmployees(data: FutureHRDataBundle) {
  const role = mapToUserRole(String(data.user?.role || ""));
  if (role === "ceo" || role === "hr_admin") return data.org;
  if (role === "employee") {
    const name = normalizeEmployeeName(data.user?.name || "");
    return data.org.filter((person) => normalizeEmployeeName(person?.["Ad Soyad"]) === name);
  }
  return getPerformanceViewTargets(data.user, data.org);
}

export function findEmployeeInQuestion(question: string, employees: any[]) {
  const normalized = normalizeEmployeeName(question);
  return [...employees]
    .filter((person) => {
      const name = String(person?.["Ad Soyad"] || "").trim();
      return name.length >= 3 && normalized.includes(normalizeEmployeeName(name));
    })
    .sort((a, b) => String(b?.["Ad Soyad"] || "").length - String(a?.["Ad Soyad"] || "").length)[0] || null;
}

function buildCompetencyGaps(employee: any, history: any[]) {
  const latest = latestEvaluationForEmployee(employee, history) || {};
  const current = extractCompetencyMap({ ...employee, ...latest });
  const target = resolveTargetProfile(employee?.Pozisyon || "").profile || {};
  return Object.entries(target)
    .map(([label, expected]) => {
      const code = LABEL_TO_CODE[label];
      const actual = code ? n(current[code]) : 0;
      const expectedValue = n(expected);
      return { label, code: code || "", actual, expected: expectedValue, gap: expectedValue - actual };
    })
    .filter((item) => item.code && item.expected > 0 && item.actual > 0 && item.gap > 0)
    .sort((a, b) => b.gap - a.gap);
}

function buildTrainingAdvice(gaps: ReturnType<typeof buildCompetencyGaps>, assignments: any[]) {
  const assignedIds = new Set(assignments.map((item) => String(item?.trainingId || "")));
  const completedIds = new Set(assignments.filter((item) => /tamam|completed/i.test(String(item?.status || ""))).map((item) => String(item?.trainingId || "")));
  return gaps.slice(0, 4)
    .flatMap((gap) => recommendedInterventions(gap.code as CompetencyCode, gap.actual, gap.expected, 3)
      .map((item) => ({
        interventionId: item.id,
        name: item.name,
        competencyCode: item.competencyCode,
        competencyLabel: item.competencyLabel,
        type: item.type,
        level: item.level,
        duration: item.duration,
        gap: Math.round(gap.gap * 100) / 100,
        transferTask: item.transferTask,
        successMetric: item.successMetric,
        reassessDays: item.reassessDays,
        alreadyAssigned: assignedIds.has(item.id),
        alreadyCompleted: completedIds.has(item.id),
      })))
    .filter((item, index, rows) => rows.findIndex((row) => row.interventionId === item.interventionId) === index)
    .sort((a, b) => Number(a.alreadyCompleted) - Number(b.alreadyCompleted) || Number(a.alreadyAssigned) - Number(b.alreadyAssigned) || b.gap - a.gap)
    .slice(0, 6);
}

function evidence(id: string, label: string, detail: string, route: string, domain: AgentEvidenceSource["domain"], confidence: AgentConfidence = "orta", value?: string): AgentEvidenceSource {
  return { id, label, detail, route, domain, confidence, value };
}

function action(id: string, kind: AgentPreparedAction["kind"], label: string, description: string, route: string, employee: any, payload?: Record<string, unknown>): AgentPreparedAction {
  return {
    id,
    kind,
    label,
    description,
    route,
    requiresConfirmation: true,
    employeeKey: employeeKey(employee),
    employeeDisplayName: String(employee?.["Ad Soyad"] || ""),
    payload,
  };
}

export function buildEmployee360Context(employee: any, data: FutureHRDataBundle): Employee360Context {
  const displayName = String(employee?.["Ad Soyad"] || "");
  const role = mapToUserRole(String(data.user?.role || ""));
  const snapshot = buildTalentDecisionSnapshot(employee, data.history);
  const latestEvaluation = latestEvaluationForEmployee(employee, data.history) || null;
  const employeeHistory = data.history.filter((item) => sameEmployee(item, displayName));
  const trainingHistory = data.training.filter((item) => sameEmployee(item, displayName));
  const developmentPlans = data.development.filter((item) => sameEmployee(item, displayName));
  const competencyGaps = buildCompetencyGaps(employee, data.history);
  const trainingAdvice = buildTrainingAdvice(competencyGaps, trainingHistory);
  const learningImpact = learningImpactSummary(trainingHistory, data.history);
  const careerProfile = data.careerProfiles.find((item) => sameEmployee(item, displayName)) || null;

  const canViewSuccession = getSensitiveScope(role, "succession") !== "NONE" && canAccessRoute(role, "/yedekleme");
  const successors = canViewSuccession
    ? rankSuccessors(employee, data.org, data.history).slice(0, 4).map((item: any) => ({
        employeeKey: employeeKey(item.person || item.employee || {}),
        displayName: String(item.person?.["Ad Soyad"] || item.employee?.["Ad Soyad"] || ""),
        readiness: String(item.assessment?.readiness || ""),
        score: n(item.assessment?.score || item.score),
      }))
    : [];

  const canViewSalary = getSensitiveScope(role, "salary") !== "NONE" && canAccessRoute(role, "/maas");
  let compensation = { canView: canViewSalary, hasBenchmark: false, evidenceScore: null as number | null, risk: null as string | null };
  if (canViewSalary) {
    const rows = processEmployeeData(data.org, data.history);
    const salaryRow = rows.find((row: any) => normalizeEmployeeName(row?.["Ad Soyad"] || row?.Personel) === normalizeEmployeeName(displayName));
    const hasBenchmark = data.benchmarks.some((benchmark) => String(benchmark?.Departman || "") === String(employee?.Departman || "") && String(benchmark?.Pozisyon || "") === String(employee?.Pozisyon || ""));
    const evidenceScore = salaryRow ? n(salaryRow?.Kanıt_Güveni ?? salaryRow?.["Kanıt Güveni"]) : null;
    compensation = {
      canView: true,
      hasBenchmark,
      evidenceScore: evidenceScore || null,
      risk: !hasBenchmark ? "Piyasa benchmarkı eksik" : evidenceScore !== null && evidenceScore < 60 ? "Ücret kararı için kanıt güveni düşük" : null,
    };
  }

  const evidenceSources: AgentEvidenceSource[] = [
    evidence("employee-org", "Organizasyon", `${employee?.Departman || "—"} · ${employee?.Pozisyon || "—"}`, "/organizasyon", "employee360", "yüksek"),
    evidence("employee-performance", "Performans", `${snapshot.performance?.score?.toFixed?.(2) || snapshot.performance?.score || "—"}/5 · evidence ${snapshot.evidence?.score ?? "—"}/100`, "/degerlendirme", "performance", snapshot.evidence?.score >= 80 ? "yüksek" : snapshot.evidence?.score >= 60 ? "orta" : "düşük"),
    evidence("employee-role", "Rol & Yetkinlik", `${competencyGaps.length} ölçülebilir yetkinlik açığı`, "/rol-mimarisi", "development", competencyGaps.length ? "yüksek" : "düşük"),
    evidence("employee-training", "Eğitim Geçmişi", `${trainingHistory.length} atama · ${trainingHistory.filter((item) => /tamam/i.test(String(item?.status || ""))).length} tamamlandı`, "/egitim", "development", trainingHistory.length ? "orta" : "düşük"),
    evidence("employee-development", "Gelişim Planı", `${developmentPlans.length} gelişim planı`, "/gelisim", "development", developmentPlans.length ? "orta" : "düşük"),
    evidence("employee-career", "Kariyer", careerProfile ? "Kariyer profili mevcut" : "Kariyer profili eksik", "/kariyer", "career", careerProfile ? "orta" : "düşük"),
  ];
  if (canViewSuccession) evidenceSources.push(evidence("employee-succession", "Halefiyet", `${successors.length} karşılaştırılabilir halef adayı`, "/yedekleme", "succession", successors.length ? "orta" : "düşük"));
  if (canViewSalary) evidenceSources.push(evidence("employee-compensation", "Ücret Kararı", compensation.risk || "Benchmark ve ücret kanıtı mevcut", "/maas", "compensation", compensation.risk ? "düşük" : "orta"));

  const evidenceGaps = [
    ...(employeeHistory.length ? [] : ["Performans geçmişi bulunmuyor."]),
    ...(competencyGaps.length ? [] : ["Rol hedefi ile mevcut yetkinlik arasında ölçülebilir fark üretilemiyor."]),
    ...(trainingHistory.length ? [] : ["Eğitim/gelişim geçmişi bulunmuyor."]),
    ...(careerProfile ? [] : ["Kariyer isteği veya hedef rol profili güncel değil."]),
    ...(learningImpact.due > 0 ? [`${learningImpact.due} doğrulanmış gelişim müdahalesinde yeniden ölçüm zamanı geldi.`] : []),
  ];

  const preparedActions: AgentPreparedAction[] = [];
  const firstAdvice = trainingAdvice.find((item) => !item.alreadyCompleted);
  if (firstAdvice) {
    preparedActions.push(action(
      `training-${employeeKey(employee)}-${firstAdvice.interventionId}`,
      "prepare_training_assignment",
      "Eğitim atama taslağı hazırla",
      `${firstAdvice.name} için atama taslağını Eğitim ekranına taşı.`,
      "/egitim",
      employee,
      { trainingId: firstAdvice.interventionId, trainingName: firstAdvice.name, competencyCode: firstAdvice.competencyCode },
    ));
  }
  if (competencyGaps.length) {
    preparedActions.push(action(
      `development-${employeeKey(employee)}-${competencyGaps[0].code}`,
      "prepare_development_plan",
      "Gelişim planı taslağı hazırla",
      `${competencyGaps[0].label} açığı için ölçülebilir gelişim planı oluştur.`,
      "/gelisim",
      employee,
      { competency: competencyGaps[0].label, current: competencyGaps[0].actual, target: competencyGaps[0].expected },
    ));
  }
  if (learningImpact.due > 0) {
    preparedActions.push(action(
      `reassess-${employeeKey(employee)}`,
      "prepare_reassessment",
      "Yeniden ölçüm hazırlığı",
      "Doğrulanmış öğrenme transferinden sonra yeniden ölçüm kontrolünü aç.",
      "/gelisim-analitigi",
      employee,
      { dueCount: learningImpact.due },
    ));
  }

  const score = n(snapshot.evidence?.score);
  const confidence: AgentConfidence = score >= 80 && employeeHistory.length ? "yüksek" : score >= 60 ? "orta" : "düşük";

  return {
    identity: { employeeKey: employeeKey(employee), displayName, position: String(employee?.Pozisyon || ""), department: String(employee?.Departman || "") },
    decisionSnapshot: snapshot,
    latestEvaluation,
    evaluationCount: employeeHistory.length,
    competencyGaps,
    trainingHistory,
    trainingAdvice,
    developmentPlans,
    learningImpact,
    careerProfile,
    succession: { canView: canViewSuccession, topCandidates: successors },
    compensation,
    evidenceSources,
    evidenceGaps,
    preparedActions,
    confidence,
  };
}

export function developmentLibrarySummary() {
  return {
    interventionCount: DEVELOPMENT_LIBRARY.length,
    competencyCount: new Set(DEVELOPMENT_LIBRARY.map((item) => item.competencyCode)).size,
    types: Array.from(new Set(DEVELOPMENT_LIBRARY.map((item) => item.type))),
  };
}
