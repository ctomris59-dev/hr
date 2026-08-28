"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiConfig";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { appendAIGovernanceEvent } from "@/lib/hr/governanceLog";

const MANAGEMENT_ROLES = new Set(["CEO", "IK", "ADMIN", "DIRECTOR", "MANAGER"]);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function parseBody(body: BodyInit | null | undefined): any {
  if (typeof body !== "string") return null;
  try { return JSON.parse(body); } catch { return null; }
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function privacySafeEmployeeExperience(originalFetch: typeof window.fetch) {
  const user = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
  const role = String(user?.role || "").toUpperCase();
  const dept = String(user?.dept || user?.department || "");
  if (!MANAGEMENT_ROLES.has(role)) return { available: false, reason: "management_scope_required", privacySafeAggregate: true };

  const params = new URLSearchParams();
  if (role) params.set("user_role", role);
  if (dept) params.set("user_dept", dept);
  if ((role === "DIRECTOR" || role === "MANAGER") && dept) params.set("department_id", dept);

  try {
    const response = await originalFetch(`${API_BASE_URL}/api/pulse/analytics?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) return { available: false, reason: "analytics_unavailable", privacySafeAggregate: true };
    const data = await response.json();
    const threshold = Number(data?.anonymity?.threshold || 5);
    const protectedView = Boolean(data?.anonymity?.currentProtected);
    const latest = data?.latest || null;

    return {
      available: Boolean(latest),
      privacySafeAggregate: true,
      anonymityThreshold: threshold,
      currentProtected: protectedView,
      currentRespondents: Number(data?.anonymity?.currentRespondents || 0),
      scope: data?.scope || null,
      latest: latest ? {
        week: latest.week,
        averageScore: numberOrNull(latest.average_score),
        participation: numberOrNull(latest.participation),
        driverMetrics: latest.drivers || {},
      } : null,
      latestDelta: numberOrNull(data?.latestDelta),
      lowestDriver: data?.lowestDriver || null,
      strongestDriver: data?.strongestDriver || null,
      privacyNote: data?.privacyNote || "Anonim çalışan deneyimi verisi kullanılır.",
    };
  } catch {
    return { available: false, reason: "analytics_unavailable", privacySafeAggregate: true };
  }
}

export default function AIGovernanceCapture() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const wrappedFetch: typeof window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const isRecommendation = url.includes("/api/ai/hr-recommendation");
      const isCopilot = url.includes("/api/ai/copilot");
      if (!isRecommendation && !isCopilot) return originalFetch(input, init);

      let requestPayload = parseBody(init?.body);
      let nextInit = init;

      if (isCopilot && requestPayload && typeof requestPayload === "object") {
        const employeeExperience = await privacySafeEmployeeExperience(originalFetch);
        requestPayload = {
          ...requestPayload,
          context: {
            ...(requestPayload.context || {}),
            employeeExperience,
          },
        };
        nextInit = { ...init, body: JSON.stringify(requestPayload) };
      }

      try {
        const response = await originalFetch(input, nextInit);
        const cloned = response.clone();
        const data = await cloned.json().catch(() => null);
        const context = requestPayload?.context || {};
        const experience = context?.employeeExperience;
        const evidenceScore = numberOrNull(context?.evidenceScore ?? context?.targetEmployee?.evidence?.score);
        const mode = response.ok ? (data?.mode === "ai" ? "ai" : "rules") : "error";

        appendAIGovernanceEvent({
          route: window.location.pathname,
          endpoint: isCopilot ? "copilot" : "hr-recommendation",
          decisionKind: isCopilot ? "copilot" : String(requestPayload?.kind || "unknown"),
          mode,
          provider: String(data?.provider || (mode === "error" ? "unavailable" : "rules")),
          model: String(data?.model || "unknown"),
          confidence: data?.analysis?.confidence ? String(data.analysis.confidence) : null,
          evidenceScore,
          subjectScope: String(context?.scope || (context?.targetEmployee ? "selected_employee" : "module")),
          fallbackUsed: mode !== "ai",
          privacy: {
            piiRedacted: true,
            rawPromptStored: false,
            employeeExperienceAggregated: Boolean(experience?.privacySafeAggregate),
            anonymityThreshold: numberOrNull(experience?.anonymityThreshold),
          },
          note: typeof data?.note === "string" ? data.note.slice(0, 220) : undefined,
        });

        return response;
      } catch (error) {
        appendAIGovernanceEvent({
          route: window.location.pathname,
          endpoint: isCopilot ? "copilot" : "hr-recommendation",
          decisionKind: isCopilot ? "copilot" : String(requestPayload?.kind || "unknown"),
          mode: "error",
          provider: "unavailable",
          model: "unknown",
          confidence: null,
          evidenceScore: numberOrNull(requestPayload?.context?.evidenceScore),
          subjectScope: String(requestPayload?.context?.scope || "module"),
          fallbackUsed: true,
          privacy: {
            piiRedacted: true,
            rawPromptStored: false,
            employeeExperienceAggregated: Boolean(requestPayload?.context?.employeeExperience?.privacySafeAggregate),
            anonymityThreshold: numberOrNull(requestPayload?.context?.employeeExperience?.anonymityThreshold),
          },
          note: error instanceof Error ? error.message.slice(0, 220) : "AI request failed",
        });
        throw error;
      }
    };

    window.fetch = wrappedFetch;
    return () => {
      if (window.fetch === wrappedFetch) window.fetch = originalFetch;
    };
  }, []);

  return null;
}
