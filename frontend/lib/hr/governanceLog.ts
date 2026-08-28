export type AIGovernanceMode = "ai" | "rules" | "error";

export interface AIGovernanceEvent {
  id: string;
  timestamp: string;
  route: string;
  endpoint: "hr-recommendation" | "copilot";
  decisionKind: string;
  mode: AIGovernanceMode;
  provider: string;
  model: string;
  confidence: string | null;
  evidenceScore: number | null;
  subjectScope: string;
  fallbackUsed: boolean;
  policyVersion: string;
  privacy: {
    piiRedacted: true;
    rawPromptStored: false;
    employeeExperienceAggregated: boolean;
    anonymityThreshold: number | null;
  };
  note?: string;
}

export const AI_GOVERNANCE_LOG_KEY = "futurehr_ai_governance_log_v1";
export const AI_POLICY_VERSION = "futurehr-ai-policy-v1";
const MAX_EVENTS = 250;

export function readAIGovernanceLog(): AIGovernanceEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AI_GOVERNANCE_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAIGovernanceEvent(event: Omit<AIGovernanceEvent, "id" | "timestamp" | "policyVersion">): AIGovernanceEvent {
  const record: AIGovernanceEvent = {
    ...event,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    policyVersion: AI_POLICY_VERSION,
  };

  if (typeof window !== "undefined") {
    const next = [record, ...readAIGovernanceLog()].slice(0, MAX_EVENTS);
    try {
      window.localStorage.setItem(AI_GOVERNANCE_LOG_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("futurehrGovernanceLogUpdated", { detail: record }));
    } catch {
      // Governance logging must never block the HR workflow.
    }
  }

  return record;
}

export function clearAIGovernanceLog(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AI_GOVERNANCE_LOG_KEY);
  window.dispatchEvent(new CustomEvent("futurehrGovernanceLogUpdated"));
}
