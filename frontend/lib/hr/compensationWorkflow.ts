export const COMPENSATION_STAGES = [
  "DRAFT_SIMULATION",
  "MANAGER_INPUT",
  "BUDGET_REVIEW",
  "APPROVAL",
  "FINALIZED",
  "EFFECTIVE",
] as const;

export type CompensationStage = (typeof COMPENSATION_STAGES)[number];

export const COMPENSATION_STAGE_LABELS: Record<CompensationStage, string> = {
  DRAFT_SIMULATION: "Simülasyon",
  MANAGER_INPUT: "Yönetici Talepleri",
  BUDGET_REVIEW: "Bütçe Kontrolü",
  APPROVAL: "Onay",
  FINALIZED: "Kesinleştirme",
  EFFECTIVE: "Yeni Ücret Dönemi",
};

export interface CompensationCycle {
  id: string;
  name: string;
  stage: CompensationStage;
  createdAt: string;
  effectiveDate?: string;
  scenario?: "A" | "B" | "C" | "D";
  inflationRate?: number;
  results?: any[];
  managerRequests?: any[];
  approvedBy?: string;
  finalizedAt?: string;
  appliedAt?: string;
}

export function nextCompensationStage(stage: CompensationStage): CompensationStage {
  const index = COMPENSATION_STAGES.indexOf(stage);
  return COMPENSATION_STAGES[Math.min(index + 1, COMPENSATION_STAGES.length - 1)];
}

export function canApplySalaryChanges(stage: CompensationStage): boolean {
  return stage === "FINALIZED";
}

export function createCompensationCycle(name: string): CompensationCycle {
  return {
    id: `cycle-${Date.now()}`,
    name,
    stage: "DRAFT_SIMULATION",
    createdAt: new Date().toISOString(),
  };
}
