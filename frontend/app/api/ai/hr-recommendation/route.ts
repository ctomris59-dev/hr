import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RecommendationKind = "talent" | "recruitment" | "development" | "career" | "succession";
type Confidence = "düşük" | "orta" | "yüksek";
type AIProvider = "groq" | "openai" | "rules";

interface DecisionAnalysis {
  summary: string;
  confidence: Confidence;
  confidenceReason: string;
  evidenceStrengths: string[];
  evidenceGaps: string[];
  nextActions: string[];
  interviewQuestions: string[];
  guardrail: string;
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    confidence: { type: "string", enum: ["düşük", "orta", "yüksek"] },
    confidenceReason: { type: "string" },
    evidenceStrengths: { type: "array", items: { type: "string" }, maxItems: 4 },
    evidenceGaps: { type: "array", items: { type: "string" }, maxItems: 4 },
    nextActions: { type: "array", items: { type: "string" }, maxItems: 4 },
    interviewQuestions: { type: "array", items: { type: "string" }, maxItems: 4 },
    guardrail: { type: "string" },
  },
  required: [
    "summary",
    "confidence",
    "confidenceReason",
    "evidenceStrengths",
    "evidenceGaps",
    "nextActions",
    "interviewQuestions",
    "guardrail",
  ],
  additionalProperties: false,
} as const;

function fallbackAnalysis(kind: RecommendationKind, context: any): DecisionAnalysis {
  if (kind === "recruitment") {
    const test = Number(context?.testScore);
    const roleFit = Number(context?.roleFit);
    const strengths = Array.isArray(context?.strengths) ? context.strengths.slice(0, 3) : [];
    const gaps = Array.isArray(context?.gaps) ? context.gaps.slice(0, 3) : [];
    const evidenceStrengths = [
      Number.isFinite(test) ? `Yetkinlik testi ortalaması ${test.toFixed(1)}/5.` : "Yetkinlik testi verisi bulunmuyor.",
      Number.isFinite(roleFit) ? `Rol yetkinlik uyumu yaklaşık %${Math.round(roleFit)}.` : "Rol uyumu hesaplanamadı.",
      ...strengths,
    ].slice(0, 4);

    const evidenceGaps = [
      ...gaps,
      ...(context?.recruiterNote ? [] : ["Yapılandırılmış mülakat / değerlendirici notu bulunmuyor."]),
      ...(context?.workSampleAvailable ? [] : ["İş örneği veya teknik kanıt bilgisi bulunmuyor."]),
    ].slice(0, 4);

    return {
      summary: "Mevcut veriler adayın rol gereksinimleriyle hangi alanlarda örtüştüğünü gösteriyor; ancak bu veri tek başına işe alım kararı için yeterli değildir.",
      confidence: evidenceGaps.length >= 3 ? "düşük" : evidenceGaps.length >= 1 ? "orta" : "yüksek",
      confidenceReason: evidenceGaps.length ? "Bazı kritik işe alım kanıtları henüz eksik." : "Birden fazla bağımsız kanıt noktası mevcut.",
      evidenceStrengths,
      evidenceGaps,
      nextActions: [
        "Eksik rol gereksinimlerini yapılandırılmış mülakatta doğrulayın.",
        "Test sonuçlarını somut iş örneği veya geçmiş davranış kanıtıyla çapraz kontrol edin.",
        "Kararı birden fazla değerlendiricinin aynı kriterlerle verdiği kanıtlarla destekleyin.",
      ],
      interviewQuestions: [
        "Bu roldeki benzer bir problemi nasıl çözdüğünüze dair somut bir örnek verebilir misiniz?",
        "Önceliklerin çakıştığı bir durumda nasıl karar verdiniz ve sonucu ne oldu?",
        "Geliştirmeniz gereken bir yetkinliği nasıl fark ettiniz ve ne yaptınız?",
      ],
      guardrail: "Bu çıktı kabul/red kararı değildir; yalnızca mevcut kanıtı özetler ve doğrulama adımları önerir.",
    };
  }

  const generic: Record<Exclude<RecommendationKind, "recruitment">, string> = {
    talent: "Potansiyel, performans ve kanıt güvenini birlikte değerlendirin; tek bir skorla terfi kararı vermeyin.",
    development: "En kritik gelişim açığını ölçülebilir aksiyon, sorumlu ve son tarihle kapatın.",
    career: "Hedef role geçişi yetkinlik, performans, potansiyel, deneyim ve kariyer isteğiyle birlikte değerlendirin.",
    succession: "Halefiyet kararını rol uyumu, hazır olma süresi, performans trendi, potansiyel ve kariyer isteğiyle doğrulayın.",
  };

  return {
    summary: generic[kind as Exclude<RecommendationKind, "recruitment">],
    confidence: "orta",
    confidenceReason: "AI servisi kullanılmadığı için yalnızca kural bazlı özet üretildi.",
    evidenceStrengths: [],
    evidenceGaps: ["AI tabanlı ayrıntılı kanıt sentezi mevcut değil."],
    nextActions: ["İlgili modüldeki eksik kanıtları tamamlayın ve değerlendirmeyi yeniden çalıştırın."],
    interviewQuestions: [],
    guardrail: "Bu çıktı nihai İK kararı değildir.",
  };
}

function safeContext(value: any): any {
  if (Array.isArray(value)) return value.slice(0, 30).map(safeContext);
  if (!value || typeof value !== "object") return value;

  const blockedKeys = new Set([
    "name", "email", "phone", "address", "tc", "tckn", "nationalId", "birthDate", "birthday",
    "age", "gender", "sex", "religion", "ethnicity", "race", "health", "disability", "politics",
  ]);

  const out: Record<string, any> = {};
  Object.entries(value).forEach(([key, item]) => {
    if (blockedKeys.has(key)) return;
    out[key] = safeContext(item);
  });
  return out;
}

function buildPrompt(kind: RecommendationKind, context: any): string {
  return `Sen FutureHR içinde çalışan, kanıta dayalı bir İK karar destek asistanısın.
Görev türü: ${kind}

Yalnızca aşağıdaki veriyi kullan:
${JSON.stringify(context)}

Kurallar:
- Türkçe, açık ve profesyonel yaz.
- Yalnızca verilen kanıta dayan; bilinmeyeni tahmin etme.
- Yaş, cinsiyet, sağlık, engellilik, din, siyasi görüş, etnik köken, ırk, medeni durum veya başka hassas özellikleri kullanma ya da tahmin etme.
- Aday/çalışan hakkında kişilik, ruh sağlığı veya korunan özellik çıkarımı yapma.
- İşe alma, işten çıkarma, terfi, ücret veya disiplin konusunda nihai karar verme; adayları sıralama veya otomatik eleme yapma.
- İşe alımda test skorunu tek başına karar gerekçesi sayma. Rol hedefleri, yapılandırılmış mülakat, iş örneği ve doğrulanabilir deneyim kanıtını birlikte ele al.
- Güçlü kanıtları ve eksik kanıtları ayrı yaz.
- Aksiyonlar doğrulanabilir ve somut olsun.
- Güven seviyesi yalnızca veri kapsamını ifade etsin; adayın kalitesini ifade etmesin.
- En fazla 4 güçlü kanıt, 4 eksik kanıt, 4 aksiyon ve 4 soru üret.`;
}

function buildGroqPrompt(kind: RecommendationKind, context: any): string {
  return `${buildPrompt(kind, context)}

YANIT FORMATI:
Yalnızca tek bir geçerli JSON nesnesi döndür. Markdown, açıklama, kod bloğu veya JSON dışında hiçbir metin yazma.
Tam olarak şu alanları kullan:
{
  "summary": "kısa özet",
  "confidence": "düşük|orta|yüksek",
  "confidenceReason": "güven gerekçesi",
  "evidenceStrengths": ["kanıt"],
  "evidenceGaps": ["eksik kanıt"],
  "nextActions": ["aksiyon"],
  "interviewQuestions": ["soru"],
  "guardrail": "Bu çıktı nihai İK kararı değildir."
}
Tüm diziler en fazla 4 öğe içersin. Boşsa [] kullan. Tüm metinler çift tırnak içinde olsun.`;
}

function extractOpenAIResponseText(payload: any): string | null {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim() || null;
}

function extractGroqResponseText(payload: any): string | null {
  const text = payload?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

function parseJsonLoose(text: string | null): any {
  if (!text) return null;
  const attempts = [text.trim(), text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()];

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) attempts.push(text.slice(firstBrace, lastBrace + 1));

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next representation.
    }
  }
  return null;
}

function normalizeAnalysis(value: any, fallback: DecisionAnalysis): DecisionAnalysis {
  if (!value || typeof value !== "object") return fallback;
  const confidence: Confidence = ["düşük", "orta", "yüksek"].includes(value.confidence) ? value.confidence : fallback.confidence;
  const list = (input: any, backup: string[]) => Array.isArray(input) ? input.filter((item) => typeof item === "string").slice(0, 4) : backup;

  return {
    summary: typeof value.summary === "string" ? value.summary : fallback.summary,
    confidence,
    confidenceReason: typeof value.confidenceReason === "string" ? value.confidenceReason : fallback.confidenceReason,
    evidenceStrengths: list(value.evidenceStrengths, fallback.evidenceStrengths),
    evidenceGaps: list(value.evidenceGaps, fallback.evidenceGaps),
    nextActions: list(value.nextActions, fallback.nextActions),
    interviewQuestions: list(value.interviewQuestions, fallback.interviewQuestions),
    guardrail: typeof value.guardrail === "string" ? value.guardrail : fallback.guardrail,
  };
}

function providerInfo(): { provider: AIProvider; configured: boolean; model: string } {
  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      configured: true,
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      configured: true,
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
    };
  }
  return {
    provider: "rules",
    configured: false,
    model: "rule-based",
  };
}

async function groqRequest(apiKey: string, model: string, kind: RecommendationKind, context: any, jsonMode: boolean) {
  const body: Record<string, any> = {
    model,
    messages: [
      {
        role: "system",
        content: "Sen FutureHR İK karar destek motorusun. Yanıtın yalnızca geçerli JSON olmalı; markdown kullanma.",
      },
      { role: "user", content: buildGroqPrompt(kind, context) },
    ],
    temperature: 0,
    max_completion_tokens: 1200,
  };

  if (jsonMode) body.response_format = { type: "json_object" };

  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function callGroq(kind: RecommendationKind, context: any) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  let response = await groqRequest(apiKey, model, kind, context, true);
  let firstError = "";

  if (!response.ok) {
    firstError = await response.text();
    const shouldRetry = response.status === 400 || response.status === 422;
    if (!shouldRetry) {
      throw new Error(`Groq ${response.status}: ${firstError.slice(0, 700)}`);
    }

    // Some Groq models occasionally fail constrained JSON generation even when the
    // prompt is valid. Retry once without response_format and parse the JSON ourselves.
    response = await groqRequest(apiKey, model, kind, context, false);
  }

  if (!response.ok) {
    const retryError = await response.text();
    throw new Error(`Groq ${response.status}: ${retryError.slice(0, 500)}${firstError ? ` | İlk deneme: ${firstError.slice(0, 180)}` : ""}`);
  }

  const payload = await response.json();
  return { text: extractGroqResponseText(payload), model };
}

async function callOpenAI(kind: RecommendationKind, context: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(kind, context),
      max_output_tokens: 900,
      store: false,
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "futurehr_decision_support",
          strict: true,
          schema: ANALYSIS_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errorText.slice(0, 700)}`);
  }

  const payload = await response.json();
  return { text: extractOpenAIResponseText(payload), model };
}

export async function GET() {
  return NextResponse.json(providerInfo());
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const kind = (body?.kind || "talent") as RecommendationKind;
  const allowed: RecommendationKind[] = ["talent", "recruitment", "development", "career", "succession"];
  if (!allowed.includes(kind)) return NextResponse.json({ error: "Desteklenmeyen öneri türü" }, { status: 400 });

  const context = safeContext(body?.context || {});
  const fallback = fallbackAnalysis(kind, context);
  const info = providerInfo();

  if (!info.configured) {
    return NextResponse.json({
      mode: "rules",
      provider: "rules",
      configured: false,
      model: info.model,
      analysis: fallback,
      recommendation: fallback.summary,
      note: "GROQ_API_KEY veya OPENAI_API_KEY tanımlı olmadığı için kural bazlı yedek analiz gösteriliyor.",
    });
  }

  const providers: Array<"groq" | "openai"> = process.env.GROQ_API_KEY
    ? ["groq", ...(process.env.OPENAI_API_KEY ? ["openai" as const] : [])]
    : ["openai"];

  let lastError = "";
  for (const provider of providers) {
    try {
      const result = provider === "groq"
        ? await callGroq(kind, context)
        : await callOpenAI(kind, context);

      if (!result?.text) {
        lastError = `${provider} boş yanıt verdi.`;
        continue;
      }

      const parsed = parseJsonLoose(result.text);
      if (!parsed) {
        lastError = `${provider} geçerli JSON üretemedi.`;
        continue;
      }

      const analysis = normalizeAnalysis(parsed, fallback);
      return NextResponse.json({
        mode: "ai",
        provider,
        configured: true,
        model: result.model,
        analysis,
        recommendation: analysis.summary,
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`${provider} recommendation request failed`, lastError);
    }
  }

  return NextResponse.json({
    mode: "rules",
    provider: info.provider,
    configured: true,
    model: info.model,
    analysis: fallback,
    recommendation: fallback.summary,
    note: `AI servisine erişilemedi; kural bazlı yedek analiz gösteriliyor.${lastError ? ` (${lastError.split("\n")[0].slice(0, 160)})` : ""}`,
  });
}
