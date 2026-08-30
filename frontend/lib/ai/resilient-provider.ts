export type AIProviderName = "groq" | "openai";

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

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_BASE = "https://api.openai.com/v1/responses";
const DEFAULT_TIMEOUT = 12_000;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const STRICT_GROQ_MODELS = new Set(["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]);

const unique = <T,>(items: T[]) => Array.from(new Set(items));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function configuredProviders() {
  return {
    groq: Boolean(process.env.GROQ_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    primary: process.env.GROQ_API_KEY ? "groq" : process.env.OPENAI_API_KEY ? "openai" : null,
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

function groqBody(model: string, prompt: string, schema: Record<string, any>, schemaName: string, maxTokens: number) {
  const strict = STRICT_GROQ_MODELS.has(model);
  const body: Record<string, any> = {
    model,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: maxTokens,
  };

  if (strict) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: schemaName, strict: true, schema },
    };
  } else {
    body.response_format = { type: "json_object" };
  }

  if (model.startsWith("openai/gpt-oss-")) {
    body.reasoning_effort = "low";
    body.include_reasoning = false;
  } else if (model.startsWith("qwen/")) {
    body.reasoning_effort = "none";
    body.reasoning_format = "hidden";
  }
  return body;
}

function extractGroqText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
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

async function runGroq(model: string, request: StructuredAIRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const started = Date.now();
  let lastResponse: Response | undefined;
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(GROQ_BASE, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(groqBody(model, request.prompt, request.schema, request.schemaName, request.maxTokens || 900)),
      }, request.timeoutMs || DEFAULT_TIMEOUT);
      lastResponse = response;
      if (response.ok) {
        const text = extractGroqText(await response.json());
        if (!text) throw new Error("Groq boş yanıt verdi");
        return { text, status: response.status, latencyMs: Date.now() - started };
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
  throw Object.assign(new Error(lastError || "Groq isteği başarısız"), { status: lastResponse?.status, latencyMs: Date.now() - started });
}

async function runOpenAI(request: StructuredAIRequest) {
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
        return { text, model, status: response.status, latencyMs: Date.now() - started };
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
  const attempts: StructuredAIResult["attempts"] = [];

  if (process.env.GROQ_API_KEY) {
    for (const model of preferredGroqModels()) {
      const started = Date.now();
      try {
        const result = await runGroq(model, request);
        if (result) {
          attempts.push({ provider: "groq", model, ok: true, status: result.status, latencyMs: result.latencyMs });
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
    configured: Boolean(providers.groq || providers.openai),
    primary: providers.primary,
    groq: providers.groq ? { configured: true, models: preferredGroqModels() } : { configured: false, models: [] },
    openai: providers.openai ? { configured: true, model: defaultOpenAIModel() } : { configured: false, model: defaultOpenAIModel() },
  };
}
