import { NextResponse } from "next/server";
import { publicAIStatus } from "@/lib/ai/resilient-provider";
import { backendConfigured, backendFetch, isSaasMode } from "@/lib/saasAuthServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const saasMode = isSaasMode();
  const hasBackend = backendConfigured();
  const ai = publicAIStatus();
  let backend: any = null;

  if (hasBackend) {
    try {
      const response = await backendFetch("/health");
      const payload = await response.json().catch(() => null);
      backend = payload
        ? {
            reachable: response.ok,
            status: payload.status,
            ready: payload.ready ?? response.ok,
            version: payload.version,
            data_mode: payload.data_mode,
            secure_auth_enabled: payload.secure_auth_enabled,
            database_configured: payload.database_configured,
            database_ok: payload.database_ok,
            legacy_api_allowed: payload.legacy_api_allowed,
            readiness_issue_count: payload.readiness_issue_count,
          }
        : { reachable: false, ready: false };
    } catch {
      backend = { reachable: false, ready: false };
    }
  }

  const issues: string[] = [];
  if (saasMode && !hasBackend) issues.push("BACKEND_URL is not configured");
  if (saasMode && (!backend?.reachable || backend?.ready === false)) issues.push("SaaS backend is not ready");
  if (!ai.configured) issues.push("No AI provider is configured");
  if (saasMode && backend?.legacy_api_allowed === true) issues.push("Legacy API is enabled in SaaS mode");

  const ready = issues.length === 0;
  return NextResponse.json(
    {
      status: ready ? "healthy" : "degraded",
      ready,
      environment: process.env.NODE_ENV,
      mode: saasMode ? "saas" : "demo",
      frontend: { ready: true },
      backend: hasBackend ? backend : { configured: false, reachable: false, ready: !saasMode },
      ai: {
        configured: ai.configured,
        primary: ai.primary,
        groq: { configured: ai.groq.configured },
        openai: { configured: ai.openai.configured },
      },
      issue_count: issues.length,
      issues,
      checkedAt: new Date().toISOString(),
    },
    { status: saasMode && !ready ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
