import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Confidence = "düşük" | "orta" | "yüksek";
type Severity = "kritik" | "yüksek" | "orta" | "bilgi";
type Provider = "groq" | "openai" | "rules";

type Priority = {
  severity: Severity;
  title: string;
  evidence: string;
  action: string;
  route: string;
};

type CopilotAnalysis = {
  answer: string;
  confidence: Confidence;
  confidenceReason: string;
  priorities: Priority[];
  nextActions: string[];
  evidenceGaps: string[];
  guardrail: string;
};

const SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    confidence: { type: "string", enum: ["düşük", "orta", "yüksek"] },
    confidenceReason: { type: "string" },
    priorities: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["kritik", "yüksek", "orta", "bilgi"] },
          title: { type: "string" },
          evidence: { type: "string" },
          action: { type: "string" },
          route: { type: "string" },
        },
        required: ["severity", "title", "evidence", "action", "route"],
        additionalProperties: false,
      },
    },
    nextActions: { type: "array", maxItems: 4, items: { type: "string" } },
    evidenceGaps: { type: "array", maxItems: 4, items: { type: "string" } },
    guardrail: { type: "string" },
  },
  required: ["answer", "confidence", "confidenceReason", "priorities", "nextActions", "evidenceGaps", "guardrail"],
  additionalProperties: false,
} as const;

const ROUTES = new Set(["/dashboard", "/degerlendirme", "/kalibrasyon", "/yetenek-matrisi", "/gelisim", "/kariyer", "/yedekleme", "/maas", "/calisan-deneyimi", "/organizasyon", "/ise-alim"]);
const unique = <T,>(values: T[]) => Array.from(new Set(values));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function safeContext(value: any): any {
  if (Array.isArray(value)) return value.slice(0, 32).map(safeContext);
  if (!value || typeof value !== "object") return value;
  const blocked = new Set(["name", "fullName", "email", "phone", "address", "tc", "tckn", "nationalId", "birthDate", "birthday", "age", "gender", "sex", "religion", "ethnicity", "race", "health", "disability", "politics", "salary"]);
  const out: Record<string, any> = {};
  Object.entries(value).forEach(([key, child]) => {
    if (!blocked.has(key)) out[key] = safeContext(child);
  });
  return out;
}

function providerInfo(): { provider: Provider; configured: boolean; model: string } {
  if (process.env.GROQ_API_KEY) return { provider: "groq", configured: true, model: process.env.GROQ_MODEL || groqModels()[0] };
  if (process.env.OPENAI_API_KEY) return { provider: "openai", configured: true, model: process.env.OPENAI_MODEL || "gpt-5-mini" };
  return { provider: "rules", configured: false, model: "rule-based" };
}

function groqModels() {
  return unique([
    ...(process.env.GROQ_MODEL ? [process.env.GROQ_MODEL] : []),
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
  ]);
}

function prompt(question: string, context: any) {
  return `Sen FutureHR Türkiye içinde çalışan İK Karar Zekâsı Copilot'usun.
Kullanıcının sorusu: ${question}

Şirket bağlamı (kişisel kimlik bilgileri çıkarılmıştır):
${JSON.stringify(context)}

Görevin:
- Soruyu yalnızca verilen kanıtlara dayanarak Türkçe ve yönetici dilinde yanıtla.
- En önemli 0-4 önceliği önem sırasıyla çıkar; gerçekten öncelik yoksa boş dizi kullan.
- Her öncelik için kanıt, insan tarafından yapılacak aksiyon ve ilgili FutureHR route'u ver.
- Route sadece şu değerlerden biri olsun: ${Array.from(ROUTES).join(", ")}.
- Performans kalibrasyonu, düşük kanıt güveni, kritik rol/halefiyet açığı, gelişim gecikmesi, ücret verisi/benchmark açığı ve çalışan deneyimi sinyallerini gerektiğinde birleştir.
- Kişiler hakkında bilinmeyen özellik çıkarımı yapma. Hassas/korunan özellikleri kullanma veya tahmin etme.
- İşe alma, işten çıkarma, terfi, ücret artışı, disiplin veya halef ataması için nihai karar verme; kişileri otomatik sıralama/eleme yapma.
- Kanıt güveni düşükse bunu açıkça söyle; eksik veriyi gerçek veri gibi doldurma.
- "Kanıt Güveni" kişinin kalitesi değil, veri kapsamı/izlenebilirliği anlamına gelir.
- Kısa ol; en fazla 4 öncelik, 4 aksiyon, 4 veri açığı üret.`;
}

function groqPrompt(question: string, context: any) {
  return `${prompt(question, context)}

Yalnızca tek geçerli JSON nesnesi döndür, markdown yazma:
{"answer":"kısa yönetici cevabı","confidence":"düşük|orta|yüksek","confidenceReason":"veri kapsamı gerekçesi","priorities":[{"severity":"kritik|yüksek|orta|bilgi","title":"başlık","evidence":"kanıt","action":"insan aksiyonu","route":"/route"}],"nextActions":["aksiyon"],"evidenceGaps":["veri açığı"],"guardrail":"Bu çıktı nihai İK kararı değildir."}`;
}

function parseJsonLoose(text: string | null): any {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const candidates = [text.trim(), cleaned];
  const first = text.indexOf("{"), last = text.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch {}
  }
  return null;
}

function normalize(value: any, fallback: CopilotAnalysis): CopilotAnalysis {
  if (!value || typeof value !== "object") return fallback;
  const confidence: Confidence = ["düşük", "orta", "yüksek"].includes(value.confidence) ? value.confidence : fallback.confidence;
  const priorities: Priority[] = Array.isArray(value.priorities) ? value.priorities.slice(0, 4).map((item: any) => ({
    severity: (["kritik", "yüksek", "orta", "bilgi"].includes(item?.severity) ? item.severity : "orta") as Severity,
    title: String(item?.title || "İncelenecek sinyal").slice(0, 180),
    evidence: String(item?.evidence || "Kanıt belirtilmedi.").slice(0, 360),
    action: String(item?.action || "İlgili modülde insan doğrulaması yapın.").slice(0, 360),
    route: ROUTES.has(String(item?.route)) ? String(item.route) : "/dashboard",
  })) : fallback.priorities;
  const list = (input: any, backup: string[]) => Array.isArray(input) ? input.filter((item) => typeof item === "string" && item.trim()).slice(0, 4) : backup;
  return {
    answer: typeof value.answer === "string" ? value.answer.slice(0, 900) : fallback.answer,
    confidence,
    confidenceReason: typeof value.confidenceReason === "string" ? value.confidenceReason.slice(0, 500) : fallback.confidenceReason,
    priorities,
    nextActions: list(value.nextActions, fallback.nextActions),
    evidenceGaps: list(value.evidenceGaps, fallback.evidenceGaps),
    guardrail: typeof value.guardrail === "string" ? value.guardrail.slice(0, 500) : fallback.guardrail,
  };
}

function fallback(context: any): CopilotAnalysis {
  const m = context?.metrics || {};
  const priorities: Priority[] = [];
  if (Number(m.calibrationRequired || 0) > 0) priorities.push({ severity: "yüksek", title: "Performans kalibrasyonu", evidence: `${m.calibrationRequired} değerlendirmede KPI-yönetici farkı kalibrasyon eşiğini aşıyor.`, action: "Kalibrasyon Merkezi'nde somut davranış ve çıktı kanıtlarını karşılaştırın.", route: "/kalibrasyon" });
  if (Number(m.criticalRolesWithoutReadySuccessor || 0) > 0) priorities.push({ severity: "kritik", title: "Halefiyet açığı", evidence: `${m.criticalRolesWithoutReadySuccessor} kritik rolün şimdi hazır halefi bulunmuyor.`, action: "Kritik roller için 6–12 aylık hazırlık ve alternatif halef senaryosu oluşturun.", route: "/yedekleme" });
  if (Number(m.lowEvidenceEmployees || 0) > 0) priorities.push({ severity: "orta", title: "Kanıt kapsamı", evidence: `${m.lowEvidenceEmployees} çalışanda Kanıt Güveni %60'ın altında.`, action: "Karar öncesi eksik performans, yetkinlik veya rol kanıtlarını tamamlayın.", route: "/yetenek-matrisi" });
  if (Number(m.compensationDataWarnings || 0) > 0) priorities.push({ severity: "orta", title: "Ücret karar verisi", evidence: `${m.compensationDataWarnings} ücret satırında veri/benchmark uyarısı var.`, action: "Ücret Karar Merkezi'nde eksik maaş ve dış benchmark kayıtlarını doğrulayın.", route: "/maas" });
  const confidence: Confidence = Number(m.employeeCount || 0) > 0 ? "orta" : "düşük";
  return {
    answer: priorities.length ? `Şu anda ${priorities.length} yönetim sinyali öncelikli görünüyor. En kritik konular kalibrasyon, halefiyet ve kanıt kapsamında yoğunlaşıyor.` : "Mevcut veride belirgin bir kritik yönetim sinyali oluşmadı; veri kapsamını ve güncelliğini kontrol ederek izlemeye devam edin.",
    confidence,
    confidenceReason: confidence === "orta" ? "Birden fazla FutureHR modülünden toplu kanıt mevcut; insan doğrulaması yine gereklidir." : "Karar desteği için yeterli şirket verisi bulunmuyor.",
    priorities: priorities.slice(0, 4),
    nextActions: priorities.slice(0, 3).map((item) => item.action),
    evidenceGaps: Array.isArray(context?.evidenceGaps) ? context.evidenceGaps.slice(0, 4) : [],
    guardrail: "FutureHR AI nihai işe alma, terfi, ücret, disiplin veya halef ataması kararı vermez; kanıtı sentezler ve insan doğrulamasını yönlendirir.",
  };
}

function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(3500, Math.ceil(seconds * 1000) + 120) : 2100;
}

async function groqRequest(apiKey: string, model: string, question: string, context: any, jsonMode: boolean) {
  const body: Record<string, any> = {
    model,
    messages: [
      { role: "system", content: "Sen FutureHR Türkiye İK Karar Zekâsı Copilot'usun. Yalnızca verilen kanıta dayan ve geçerli JSON üret." },
      { role: "user", content: groqPrompt(question, context) },
    ],
    temperature: 0,
    max_completion_tokens: 700,
    service_tier: "auto",
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  return fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

async function callGroq(question: string, context: any) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const errors: string[] = [];
  for (const model of groqModels()) {
    try {
      let response = await groqRequest(apiKey, model, question, context, true);
      if (response.status === 429) { await sleep(retryAfterMs(response)); response = await groqRequest(apiKey, model, question, context, true); }
      if (response.ok) {
        const payload = await response.json();
        const text = payload?.choices?.[0]?.message?.content;
        if (typeof text === "string" && parseJsonLoose(text)) return { text, model };
      }
      if (response.status === 400 || response.status === 422 || response.ok) {
        response = await groqRequest(apiKey, model, question, context, false);
        if (response.status === 429) { await sleep(retryAfterMs(response)); response = await groqRequest(apiKey, model, question, context, false); }
        if (response.ok) {
          const payload = await response.json();
          const text = payload?.choices?.[0]?.message?.content;
          if (typeof text === "string" && parseJsonLoose(text)) return { text, model };
        }
      }
      throw new Error(`Groq ${model} ${response.status}`);
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }
  throw new Error(errors.slice(-2).join(" | ") || "Groq modelleri yanıt vermedi.");
}

async function callOpenAI(question: string, context: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: prompt(question, context), max_output_tokens: 700, store: false, text: { verbosity: "low", format: { type: "json_schema", name: "futurehr_copilot", strict: true, schema: SCHEMA } } }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}`);
  const payload = await response.json();
  const text = typeof payload?.output_text === "string" ? payload.output_text : (payload?.output || []).flatMap((item: any) => item?.content || []).map((item: any) => item?.text || "").join("\n");
  return { text, model };
}

export async function GET() { return NextResponse.json(providerInfo()); }

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }
  const question = String(body?.question || "").trim().slice(0, 700);
  if (!question) return NextResponse.json({ error: "Soru gerekli" }, { status: 400 });
  const context = safeContext(body?.context || {});
  const rules = fallback(context);
  const info = providerInfo();
  if (!info.configured) return NextResponse.json({ mode: "rules", ...info, analysis: rules, note: "AI anahtarı tanımlı olmadığı için kural bazlı Copilot kullanılıyor." });

  const providers: Array<"groq" | "openai"> = process.env.GROQ_API_KEY ? ["groq", ...(process.env.OPENAI_API_KEY ? ["openai" as const] : [])] : ["openai"];
  let lastError = "";
  for (const provider of providers) {
    try {
      const result = provider === "groq" ? await callGroq(question, context) : await callOpenAI(question, context);
      const parsed = parseJsonLoose(result?.text || null);
      if (!parsed) { lastError = `${provider} geçerli JSON üretemedi.`; continue; }
      return NextResponse.json({ mode: "ai", provider, configured: true, model: result?.model, analysis: normalize(parsed, rules) });
    } catch (error) { lastError = error instanceof Error ? error.message : String(error); console.error(`${provider} copilot request failed`, lastError); }
  }
  return NextResponse.json({ mode: "rules", provider: info.provider, configured: true, model: info.model, analysis: rules, note: `AI servisine erişilemedi; güvenli kural motoru kullanıldı.${lastError ? ` (${lastError.slice(0, 140)})` : ""}` });
}
