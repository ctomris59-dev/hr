import { NextResponse } from "next/server";
import { publicAIStatus, runStructuredAI } from "../../../../../lib/ai/resilient-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEALTH_SCHEMA = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
  additionalProperties: false,
} as const;

export async function GET() {
  const configured = publicAIStatus();
  if (!configured.configured) {
    return NextResponse.json({ status: "degraded", configured, checkedAt: new Date().toISOString(), message: "AI provider anahtarı tanımlı değil." }, { status: 503 });
  }

  try {
    const result = await runStructuredAI({
      prompt: "Yalnızca {\"ok\":true} JSON nesnesini üret.",
      schema: HEALTH_SCHEMA as any,
      schemaName: "futurehr_ai_health",
      maxTokens: 40,
      timeoutMs: 8_000,
    });
    return NextResponse.json({
      status: "healthy",
      configured,
      active: { provider: result.provider, model: result.model, latencyMs: result.latencyMs },
      failoverUsed: result.attempts.some((item) => !item.ok),
      checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({
      status: "degraded",
      configured,
      checkedAt: new Date().toISOString(),
      message: "AI sağlayıcı zinciri yanıt vermedi; uygulama kural motoruyla çalışmaya devam eder.",
      attempts: Array.isArray(error?.attempts) ? error.attempts.map((item: any) => ({ provider: item.provider, model: item.model, status: item.status, latencyMs: item.latencyMs })) : [],
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
