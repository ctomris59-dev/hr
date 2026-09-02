import "server-only";
import { getSecureUserFromSession, isSaasMode } from "../saasAuthServer";
import { applyFutureHROutputGuardrails } from "./futurehr-output-guardrails.mjs";

export type AIProviderName = "futurehr_local" | "groq" | "openai";
export type StructuredAIResult = {
  provider: AIProviderName;
  model: string;
  text: string;
  latencyMs: number;
  attempts: Array<{ provider: AIProviderName; model: string; ok: boolean; status?: number; latencyMs: number; error?: string }>;
};

type StructuredAIRequest = {
  prompt: string;
  schema: Record<string, any>;
  schemaName: string;
  maxTokens?: number;
  timeoutMs?: number;
};

type ProviderRun = { text: string; model: string; status: number; latencyMs: number; relaxed?: boolean };

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_BASE = "https://api.openai.com/v1/responses";
const DEFAULT_TIMEOUT = 12_000;
const LOCAL_DEFAULT_TIMEOUT = 18_000;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const STRICT_GROQ_MODELS = new Set(["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]);
const CJK_RE = /[\u3400-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g;
const unique = <T,>(items: T[]) => Array.from(new Set(items));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function localBaseUrl() {
  const raw = String(process.env.FUTUREHR_LOCAL_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return /\/v1$/i.test(raw) ? raw : `${raw}/v1`;
}

function localChatUrl() {
  const base = localBaseUrl();
  return base ? `${base}/chat/completions` : "";
}

export function localModel() {
  return process.env.FUTUREHR_LOCAL_MODEL || "futurehr-local";
}

export function configuredProviders() {
  const local = Boolean(localBaseUrl());
  const groq = Boolean(process.env.GROQ_API_KEY);
  const openai = Boolean(process.env.OPENAI_API_KEY);
  return {
    local,
    groq,
    openai,
    primary: local ? "futurehr_local" : groq ? "groq" : openai ? "openai" : null,
  } as const;
}

export function preferredGroqModels(): string[] {
  return unique([
    ...(process.env.GROQ_MODEL ? [process.env.GROQ_MODEL] : []),
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
  ]);
}

export function defaultOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5.6-luna";
}

function sanitizeError(value: unknown) {
  const text = value instanceof Error ? value.message : String(value || "Bilinmeyen hata");
  return text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]").slice(0, 500);
}

async function ensureAuthorizedInSaasMode() {
  if (!isSaasMode()) return;
  const user = await getSecureUserFromSession();
  if (!user) {
    const error = new Error("Authenticated SaaS session required for AI request");
    (error as any).code = "AI_AUTH_REQUIRED";
    throw error;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function retryDelay(response?: Response, attempt = 0) {
  if (response?.status === 429) {
    const raw = response.headers.get("retry-after");
    const seconds = raw ? Number(raw) : Number.NaN;
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(3500, Math.ceil(seconds * 1000) + 100);
  }
  return Math.min(2500, 450 * 2 ** attempt + Math.floor(Math.random() * 180));
}

function extractChatText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((item: any) => typeof item?.text === "string" ? item.text : "").filter(Boolean).join("\n").trim();
  }
  return "";
}

function extractOpenAIText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function parseJsonObject(text: string) {
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  for (const candidate of [clean, first >= 0 && last > first ? clean.slice(first, last + 1) : ""]) {
    if (!candidate) continue;
    try { return JSON.parse(candidate); } catch {}
  }
  return null;
}

function mapStrings(value: unknown, fn: (text: string) => string): unknown {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, fn));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) out[key] = mapStrings(child, fn);
    return out;
  }
  return value;
}

function highImpactSafeText(input: string) {
  const directDecision = /(?:terfi\s+ettiril(?:mesi|sin|melidir)|terfi\s+edil(?:mesi|sin|melidir)|işe\s+alın(?:ması|sın|malıdır)|işten\s+çıkarıl(?:ması|sın|malıdır)|maaş(?:ı|ını|ının)?\s+(?:artırıl|arttırıl|yükseltil)(?:ması|sin|melidir)|ücret(?:i|ini|inin)?\s+(?:artırıl|arttırıl|yükseltil)(?:ması|sin|melidir)|halef\s+(?:olarak\s+)?atan(?:ması|sın|malıdır)|aday(?:ı|ın)?\s+reddedil(?:mesi|sin|melidir)).{0,80}(?:öner|uygun|gerek)|(?:öner|uygun|gerek).{0,80}(?:terfi|işe\s+al|işten\s+çıkar|maaş|ücret|halef\s+ata|aday\s+reddet)/i;
  if (!directDecision.test(input)) return input;
  return "Bu yüksek etkili İK kararı için doğrudan karar veya kişi bazlı nihai öneri verilmemelidir. FutureHR mevcut kanıtları, riskleri ve veri boşluklarını sunar; karar yetkili insan değerlendirmesiyle verilmelidir.";
}

function extractFutureHRInputs(prompt: string) {
  const qMatch = prompt.match(/SORU:\s*\n([\s\S]*?)\n\nYETKİLİ VE GÜVENLİ FUTUREHR BAĞLAMI:/i);
  const cMatch = prompt.match(/YETKİLİ VE GÜVENLİ FUTUREHR BAĞLAMI:\s*\n([\s\S]*?)\n\nZORUNLU KURALLAR/i);
  let context: Record<string, unknown> = {};
  if (cMatch?.[1]) { try { context = JSON.parse(cMatch[1]); } catch {} }
  return { question: qMatch?.[1]?.trim() || "", context };
}

function repairFutureHRSemantics(text: string, request: StructuredAIRequest) {
  if (request.schemaName !== "futurehr_intelligence_agent") return text;
  const parsed = parseJsonObject(text);
  if (!parsed) return text;
  const promptText = request.prompt;
  const hasLearningMetrics = /positiveRate|averageDelta/i.test(promptText);
  const hasLowWorkloadSignal = /İş Yükü|Is Yuku|workload/i.test(promptText) && /lowestDriver|driver|2[.,][0-9]/i.test(promptText);
  const evidenceValues = Array.from(promptText.matchAll(/"evidenceScore"\s*:\s*(\d+(?:\.\d+)?)/gi)).map((m) => Number(m[1])).filter(Number.isFinite);
  const hasLowEvidence = evidenceValues.some((score) => score < 60);
  let repaired = mapStrings(parsed, (input) => {
    let value = input.replace(CJK_RE, "").replace(/\s{2,}/g, " ").trim();
    if (hasLearningMetrics) {
      const causal = /(?:eğitim|öğrenme).{0,160}(?:performans).{0,120}(?:%\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*%).{0,120}(?:artır|arttır|yükselt|sağla|neden\s+ol|etkile|iyileştir)|(?:eğitim|öğrenme).{0,160}(?:%\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*%).{0,120}(?:artış|iyileşme).{0,100}(?:sağla|yarat|oluştur)/i;
      if (causal.test(value)) value = "Öğrenme verilerinde pozitif transfer/değişim sinyali gözleniyor; positiveRate ve averageDelta nedensellik kanıtı değildir. Performans etkisi için yeniden ölçüm ve karşılaştırmalı kanıt gerekir.";
    }
    if (hasLowEvidence && /(?:güvenli|güvenilir|kesin).{0,50}(?:karar|sonuç|değerlendirme)|(?:karar|sonuç|değerlendirme).{0,50}(?:güvenli|güvenilir|kesin)/i.test(value)) {
      value = "Kanıt skoru düşük olduğu için bu sonuç güvenilir bir nihai karar olarak kullanılmamalıdır. Önce kanıt kapsamı tamamlanmalı ve kalibrasyon/insan doğrulaması yapılmalıdır.";
    }
    if (hasLowWorkloadSignal) {
      value = value.replace(/iş yükünün\s+(?:artırılması|arttırılması|yükseltilmesi)/gi, "aşırı iş yükünün azaltılması ve iş yükünün dengelenmesi").replace(/iş yükünü\s+(?:artır|arttır|yükselt)/gi, "iş yükünü dengele ve aşırı yükü azalt");
    }
    return highImpactSafeText(value);
  }) as Record<string, unknown>;
  const { question, context } = extractFutureHRInputs(promptText);
  repaired = applyFutureHROutputGuardrails(question, context, repaired) as Record<string, unknown>;
  if (!String(repaired?.answer || "").trim()) {
    repaired = { ...repaired, answer: "FutureHR kanıtları mevcut; ancak güvenli ve doğrulanabilir bir Türkçe sonuç üretilemedi. İlgili kanıtların yetkili insan değerlendirmesiyle incelenmesi gerekir." };
  }
  return JSON.stringify(repaired);
}

function localHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = String(process.env.FUTUREHR_LOCAL_API_KEY || "").trim();
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function localBody(request: StructuredAIRequest, relaxed: boolean) {
  return {
    model: localModel(),
    messages: [{ role: "user", content: request.prompt }],
    max_tokens: request.maxTokens || 900,
    temperature: 0.1,
    response_format: relaxed
      ? { type: "json_object" }
      : { type: "json_schema", json_schema: { name: request.schemaName, strict: true, schema: request.schema } },
  };
}

async function requestLocalOnce(request: StructuredAIRequest, relaxed: boolean) {
  const url = localChatUrl();
  if (!url) return null;
  const timeout = Number(process.env.FUTUREHR_LOCAL_TIMEOUT_MS || "") || request.timeoutMs || LOCAL_DEFAULT_TIMEOUT;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: localHeaders(),
    body: JSON.stringify(localBody(request, relaxed)),
  }, timeout);
  const raw = await response.text();
  if (!response.ok) return { ok: false as const, response, detail: raw.slice(0, 420) };
  let payload: any = null;
  try { payload = JSON.parse(raw); } catch {}
  const text = extractChatText(payload);
  if (!text) throw new Error("FutureHR Local boş yanıt verdi");
  return { ok: true as const, response, text: repairFutureHRSemantics(text, request) };
}

async function runLocal(request: StructuredAIRequest): Promise<ProviderRun | null> {
  if (!localChatUrl()) return null;
  const started = Date.now();
  let lastResponse: Response | undefined;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const strict = await requestLocalOnce(request, false);
      if (!strict) return null;
      lastResponse = strict.response;
      if (strict.ok) return { text: strict.text, model: localModel(), status: strict.response.status, latencyMs: Date.now() - started, relaxed: false };
      lastError = `HTTP ${strict.response.status}${strict.detail ? `: ${strict.detail}` : ""}`;
      if (strict.response.status === 400 || strict.response.status === 422) {
        const relaxed = await requestLocalOnce(request, true);
        if (!relaxed) return null;
        lastResponse = relaxed.response;
        if (relaxed.ok) return { text: relaxed.text, model: localModel(), status: relaxed.response.status, latencyMs: Date.now() - started, relaxed: true };
        lastError = `HTTP ${relaxed.response.status}${relaxed.detail ? `: ${relaxed.detail}` : ""}`;
      }
      if (!lastResponse || !RETRYABLE.has(lastResponse.status) || attempt === 1) break;
      await sleep(retryDelay(lastResponse, attempt));
    } catch (error) {
      lastError = sanitizeError(error);
      if (attempt === 1) break;
      await sleep(retryDelay(undefined, attempt));
    }
  }
  throw Object.assign(new Error(lastError || "FutureHR Local isteği başarısız"), { status: lastResponse?.status, latencyMs: Date.now() - started });
}

function groqBody(model: string, request: StructuredAIRequest, forceRelaxed = false) {
  const strict = STRICT_GROQ_MODELS.has(model) && !forceRelaxed;
  const body: Record<string, any> = {
    model,
    messages: [{ role: "user", content: request.prompt }],
    max_completion_tokens: request.maxTokens || 900,
  };
  body.response_format = strict
    ? { type: "json_schema", json_schema: { name: request.schemaName, strict: true, schema: request.schema } }
    : { type: "json_object" };
  if (model.startsWith("openai/gpt-oss-")) {
    body.reasoning_effort = "low";
    body.include_reasoning = false;
  } else if (model.startsWith("qwen/")) {
    body.reasoning_effort = "none";
    body.reasoning_format = "hidden";
  }
  return body;
}

async function requestGroqOnce(model: string, request: StructuredAIRequest, forceRelaxed: boolean) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const response = await fetchWithTimeout(GROQ_BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(groqBody(model, request, forceRelaxed)),
  }, request.timeoutMs || DEFAULT_TIMEOUT);
  const raw = await response.text();
  if (!response.ok) return { ok: false as const, response, detail: raw.slice(0, 420) };
  let payload: any = null;
  try { payload = JSON.parse(raw); } catch {}
  const text = extractChatText(payload);
  if (!text) throw new Error("Groq boş yanıt verdi");
  return { ok: true as const, response, text: repairFutureHRSemantics(text, request) };
}

async function runGroq(model: string, request: StructuredAIRequest): Promise<ProviderRun | null> {
  if (!process.env.GROQ_API_KEY) return null;
  const started = Date.now();
  let lastResponse: Response | undefined;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const strictResult = await requestGroqOnce(model, request, false);
      if (!strictResult) return null;
      lastResponse = strictResult.response;
      if (strictResult.ok) return { text: strictResult.text, model, status: strictResult.response.status, latencyMs: Date.now() - started, relaxed: false };
      lastError = `HTTP ${strictResult.response.status}${strictResult.detail ? `: ${strictResult.detail}` : ""}`;
      if (STRICT_GROQ_MODELS.has(model) && strictResult.response.status === 400) {
        const relaxedResult = await requestGroqOnce(model, request, true);
        if (!relaxedResult) return null;
        lastResponse = relaxedResult.response;
        if (relaxedResult.ok) return { text: relaxedResult.text, model, status: relaxedResult.response.status, latencyMs: Date.now() - started, relaxed: true };
        lastError = `HTTP ${relaxedResult.response.status}${relaxedResult.detail ? `: ${relaxedResult.detail}` : ""}`;
      }
      if (!lastResponse || !RETRYABLE.has(lastResponse.status) || attempt === 1) break;
      await sleep(retryDelay(lastResponse, attempt));
    } catch (error) {
      lastError = sanitizeError(error);
      if (attempt === 1) break;
      await sleep(retryDelay(undefined, attempt));
    }
  }
  throw Object.assign(new Error(lastError || "Groq isteği başarısız"), { status: lastResponse?.status, latencyMs: Date.now() - started });
}

async function runOpenAI(request: StructuredAIRequest): Promise<ProviderRun | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = defaultOpenAIModel();
  const started = Date.now();
  let lastResponse: Response | undefined;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(OPENAI_BASE, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: request.prompt,
          max_output_tokens: request.maxTokens || 900,
          store: false,
          reasoning: { effort: "low" },
          text: { format: { type: "json_schema", name: request.schemaName, strict: true, schema: request.schema } },
        }),
      }, request.timeoutMs || DEFAULT_TIMEOUT);
      lastResponse = response;
      if (response.ok) {
        const text = extractOpenAIText(await response.json());
        if (!text) throw new Error("OpenAI boş yanıt verdi");
        return { text: repairFutureHRSemantics(text, request), model, status: response.status, latencyMs: Date.now() - started };
      }
      const detail = (await response.text()).slice(0, 420);
      lastError = `HTTP ${response.status}${detail ? `: ${detail}` : ""}`;
      if (!RETRYABLE.has(response.status) || attempt === 1) break;
      await sleep(retryDelay(response, attempt));
    } catch (error) {
      lastError = sanitizeError(error);
      if (attempt === 1) break;
      await sleep(retryDelay(undefined, attempt));
    }
  }
  throw Object.assign(new Error(lastError || "OpenAI isteği başarısız"), { status: lastResponse?.status, latencyMs: Date.now() - started });
}

export async function runStructuredAI(request: StructuredAIRequest): Promise<StructuredAIResult> {
  await ensureAuthorizedInSaasMode();
  const attempts: StructuredAIResult["attempts"] = [];

  if (localBaseUrl()) {
    const started = Date.now();
    try {
      const result = await runLocal(request);
      if (result) {
        attempts.push({ provider: "futurehr_local", model: result.model, ok: true, status: result.status, latencyMs: result.latencyMs, error: result.relaxed ? "json_schema unsupported; recovered with json_object" : undefined });
        return { provider: "futurehr_local", model: result.model, text: result.text, latencyMs: result.latencyMs, attempts };
      }
    } catch (error: any) {
      attempts.push({ provider: "futurehr_local", model: localModel(), ok: false, status: error?.status, latencyMs: error?.latencyMs || Date.now() - started, error: sanitizeError(error) });
    }
  }

  if (process.env.GROQ_API_KEY) {
    for (const model of preferredGroqModels()) {
      const started = Date.now();
      try {
        const result = await runGroq(model, request);
        if (result) {
          attempts.push({ provider: "groq", model, ok: true, status: result.status, latencyMs: result.latencyMs, error: result.relaxed ? "strict schema failed; recovered with json_object" : undefined });
          return { provider: "groq", model, text: result.text, latencyMs: result.latencyMs, attempts };
        }
      } catch (error: any) {
        attempts.push({ provider: "groq", model, ok: false, status: error?.status, latencyMs: error?.latencyMs || Date.now() - started, error: sanitizeError(error) });
      }
    }
  }

  if (process.env.OPENAI_API_KEY) {
    const model = defaultOpenAIModel();
    const started = Date.now();
    try {
      const result = await runOpenAI(request);
      if (result) {
        attempts.push({ provider: "openai", model, ok: true, status: result.status, latencyMs: result.latencyMs });
        return { provider: "openai", model, text: result.text, latencyMs: result.latencyMs, attempts };
      }
    } catch (error: any) {
      attempts.push({ provider: "openai", model, ok: false, status: error?.status, latencyMs: error?.latencyMs || Date.now() - started, error: sanitizeError(error) });
    }
  }

  const error = new Error("Tüm AI sağlayıcıları başarısız oldu");
  (error as any).attempts = attempts;
  throw error;
}

export function publicAIStatus() {
  const providers = configuredProviders();
  return {
    configured: Boolean(providers.local || providers.groq || providers.openai),
    primary: providers.primary,
    chain: ["futurehr_local", "groq", "openai", "rules"],
    local: providers.local
      ? { configured: true, model: localModel(), protocol: "openai-compatible", endpointConfigured: true }
      : { configured: false, model: localModel(), protocol: "openai-compatible", endpointConfigured: false },
    groq: providers.groq ? { configured: true, models: preferredGroqModels() } : { configured: false, models: [] },
    openai: providers.openai ? { configured: true, model: defaultOpenAIModel() } : { configured: false, model: defaultOpenAIModel() },
    fallback: { configured: true, provider: "rules", deterministicGuardrails: true },
  };
}
