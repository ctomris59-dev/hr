export type AgentConfidence = "düşük" | "orta" | "yüksek";
export type AgentSeverity = "kritik" | "yüksek" | "orta" | "bilgi";
export type AgentDomain =
  | "employee360"
  | "development"
  | "performance"
  | "talent"
  | "career"
  | "succession"
  | "compensation"
  | "recruitment"
  | "organization"
  | "executive";

export type AgentActionKind =
  | "open_employee"
  | "open_performance"
  | "open_development"
  | "open_training"
  | "open_career"
  | "open_talent"
  | "open_succession"
  | "open_compensation"
  | "open_recruitment"
  | "prepare_development_plan"
  | "prepare_training_assignment"
  | "prepare_reassessment"
  | "prepare_calibration_review"
  | "prepare_succession_review"
  | "prepare_compensation_review"
  | "prepare_recruitment_review";

export interface AgentEvidenceSource {
  id: string;
  label: string;
  detail: string;
  route: string;
  domain: AgentDomain;
  confidence?: AgentConfidence;
  value?: string;
}

export interface AgentPreparedAction {
  id: string;
  kind: AgentActionKind;
  label: string;
  description: string;
  route: string;
  requiresConfirmation: true;
  employeeKey?: string | null;
  employeeDisplayName?: string | null;
  payload?: Record<string, unknown>;
}

export interface AgentToolResult {
  tool: string;
  label: string;
  domain: AgentDomain;
  summary: string;
  confidence: AgentConfidence;
  evidence: AgentEvidenceSource[];
  facts: Record<string, unknown>;
  evidenceGaps: string[];
  preparedActions: AgentPreparedAction[];
}

export interface AgentPackage {
  question: string;
  sanitizedQuestion: string;
  pageContext: string;
  scope: "selected_employee" | "team" | "company" | "self";
  focusEmployee: {
    employeeKey: string;
    displayName: string;
    position: string;
    department: string;
  } | null;
  access: {
    role: string;
    scopeLabel: string;
    deniedDomains: AgentDomain[];
  };
  toolsUsed: string[];
  toolResults: AgentToolResult[];
  evidenceSources: AgentEvidenceSource[];
  evidenceGaps: string[];
  preparedActions: AgentPreparedAction[];
  externalContext: Record<string, unknown>;
}

export interface AgentAIRecommendation {
  title: string;
  why: string;
  evidence: string;
  route: string;
}

export interface AgentAIResponse {
  answer: string;
  executiveSummary: string;
  confidence: AgentConfidence;
  confidenceReason: string;
  recommendations: AgentAIRecommendation[];
  evidenceSources: AgentEvidenceSource[];
  nextActions: Array<{ label: string; route: string; actionKind?: AgentActionKind }>;
  evidenceGaps: string[];
  guardrail: string;
}

export interface AgentActionDraft extends AgentPreparedAction {
  createdAt: string;
  status: "draft";
  sourceQuestion: string;
}
