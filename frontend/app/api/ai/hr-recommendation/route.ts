import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RecommendationKind = "talent" | "recruitment" | "performance" | "development" | "career" | "succession";
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

const validNumber = (value: any) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const limitTextList = (value: any, max = 4) => Array.isArray(value)
  ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, max)
  : [];

function fallbackAnalysis(kind: RecommendationKind, context: any): DecisionAnalysis {
  if (kind === "recruitment") {
    const test = validNumber(context?.testScore);
    const roleFit = validNumber(context?.roleFit);
    const strengths = limitTextList(context?.strengths, 3);
    const gaps = limitTextList(context?.gaps, 3);
    const evidenceStrengths = [
      test !== null ? `Yetkinlik testi ortalaması ${test.toFixed(1)}/5.` : "Yetkinlik testi verisi bulunmuyor.",
      roleFit !== null ? `Rol yetkinlik uyumu yaklaşık %${Math.round(roleFit)}.` : "Rol uyumu hesaplanamadı.",
      ...strengths,
    ].slice(0, 4);
    const evidenceGaps = [
      ...gaps,
      ...(context?.recruiterNote ? [] : ["Yapılandırılmış mülakat / değerlendirici notu bulunmuyor."]),
      ...(context?.workSampleAvailable ? [] : ["İş örneği veya teknik kanıt bilgisi bulunmuyor."]),
    ].slice(0, 4);
    return {
      summary: "Mevcut kanıt adayın rol gereksinimleriyle örtüşen ve doğrulanması gereken alanlarını gösteriyor; tek başına kabul/red kararı için yeterli değildir.",
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

  if (kind === "performance") {
    const evaluation = context?.currentEvaluation || {};
    const finalPerformance = validNumber(evaluation.finalPerformance);
    const kpiScore = validNumber(evaluation.kpiScore);
    const managerScore = validNumber(evaluation.managerObservation);
    const competencyScore = validNumber(evaluation.competencyScore);
    const roleFit = validNumber(evaluation.roleFit);
    const diff = kpiScore !== null && managerScore !== null ? Math.abs(kpiScore - managerScore) : null;
    const gaps = Array.isArray(evaluation.roleCompetencyGaps) ? evaluation.roleCompetencyGaps : [];
    return {
      summary: `Canlı değerlendirme${finalPerformance !== null ? ` ${finalPerformance.toFixed(2)}/5 performans` : ""}${competencyScore !== null ? ` ve ${competencyScore.toFixed(2)}/5 yetkinlik` : ""} verisi üzerinden kalibrasyon desteği sağlar.`,
      confidence: evaluation.kpiWeightsValid === false || !context?.history?.length ? "orta" : "yüksek",
      confidenceReason: context?.history?.length ? "Mevcut skorlar rol hedefi ve geçmiş değerlendirmelerle birlikte görülebiliyor." : "Geçmiş trend veya ek kanıt sınırlı olduğu için güven orta seviyede.",
      evidenceStrengths: [
        kpiScore !== null ? `KPI/Hedef skoru ${kpiScore.toFixed(2)}/5.` : "KPI skoru bulunmuyor.",
        managerScore !== null ? `Yönetici gözlemi ${managerScore.toFixed(2)}/5.` : "Yönetici gözlemi bulunmuyor.",
        roleFit !== null ? `Rol yetkinlik uyumu yaklaşık %${Math.round(roleFit)}.` : "Rol uyumu hesaplanamadı.",
      ].slice(0, 4),
      evidenceGaps: [
        ...(diff !== null && diff >= 0.75 ? [`KPI ile yönetici gözlemi arasında ${diff.toFixed(2)} puan fark var; gerekçe kalibrasyonda doğrulanmalı.`] : []),
        ...(gaps.length ? [`${gaps.length} rol yetkinlik farkı kalibrasyonda incelenmeli.`] : []),
        ...(!evaluation.managerNoteAvailable ? ["Yönetici kanıt/notu belirtilmemiş."] : []),
      ].slice(0, 4),
      nextActions: [
        "KPI kanıtlarını ve yönetici gözlemini aynı dönem/çıktılar üzerinden çapraz kontrol edin.",
        "En büyük rol yetkinlik açıkları için somut davranış örnekleri isteyin.",
        "Geçmiş trendle ani skor değişimlerini kalibrasyon görüşmesinde gerekçelendirin.",
      ],
      interviewQuestions: [
        "KPI skoru ile yönetici gözlemini destekleyen somut çıktılar nelerdir?",
        "Rol hedefinden en fazla ayrışan yetkinlik için hangi davranış kanıtı var?",
        "Önceki döneme göre değişimi açıklayan iş koşulu veya sonuç nedir?",
      ],
      guardrail: "AI mevcut puanı değiştirmez ve nihai performans kararı vermez; yalnızca kalibrasyon kanıtlarını ve tutarsızlıkları görünür kılar.",
    };
  }

  if (kind === "talent") {
    const performance = validNumber(context?.employee?.performance);
    const potential = validNumber(context?.potential?.score);
    const confidence = validNumber(context?.potential?.confidence);
    const topGaps = Array.isArray(context?.roleTarget?.topGaps) ? context.roleTarget.topGaps : [];
    return {
      summary: "Performans, potansiyel, veri güveni ve rol yetkinlik farkları birlikte değerlendirilmelidir; 9-box konumu tek başına karar değildir.",
      confidence: confidence !== null && confidence >= 75 ? "yüksek" : confidence !== null && confidence >= 50 ? "orta" : "düşük",
      confidenceReason: confidence !== null ? `Potansiyel veri güveni %${Math.round(confidence)}.` : "Potansiyel veri güveni hesaplanamadı.",
      evidenceStrengths: [
        performance !== null ? `Performans ${performance.toFixed(1)}/5.` : "Performans verisi eksik.",
        potential !== null ? `Potansiyel ${potential.toFixed(2)}/5.` : "Potansiyel verisi eksik.",
        context?.employee?.nineBox ? `9-box segmenti: ${context.employee.nineBox}.` : "9-box segmenti hesaplanmadı.",
      ],
      evidenceGaps: [
        ...(topGaps.length ? [`Rol hedefinde ${topGaps.length} öncelikli yetkinlik farkı var.`] : []),
        ...((context?.potential?.missingInputs || []).length ? [`Potansiyel hesabında eksik girdiler: ${context.potential.missingInputs.join(", ")}.`] : []),
      ].slice(0, 4),
      nextActions: ["Rol yetkinlik açıklarını somut gelişim aksiyonlarına bağlayın.", "Potansiyel girdilerindeki eksikleri kariyer görüşmesinde doğrulayın.", "Yetenek kararını birden fazla dönem performans kanıtıyla destekleyin."],
      interviewQuestions: ["Bu çalışan hangi daha karmaşık sorumluluklarda kanıt üretmiştir?", "Öğrenme çevikliği hangi somut örneklerle destekleniyor?", "Kariyer isteği ve yeni sorumluluk isteği güncel mi?"],
      guardrail: "Bu çıktı terfi, ücret veya çalışan sınıflandırması için otomatik karar değildir.",
    };
  }

  if (kind === "development") {
    const gaps = Array.isArray(context?.roleTarget?.topGaps) ? context.roleTarget.topGaps : [];
    const plans = Array.isArray(context?.currentPlans) ? context.currentPlans : [];
    return {
      summary: "Gelişim planı en kritik rol yetkinlik açığını somut iş davranışı ve ölçülebilir başarı kriteriyle kapatmaya odaklanmalıdır.",
      confidence: gaps.length ? "orta" : "düşük",
      confidenceReason: gaps.length ? `${gaps.length} ölçülebilir rol yetkinlik açığı mevcut.` : "Rol hedefi veya güncel yetkinlik kanıtı sınırlı.",
      evidenceStrengths: plans.length ? [`${plans.length} mevcut gelişim aksiyonu bağlama dahil edildi.`] : [],
      evidenceGaps: gaps.length ? gaps.slice(0, 4).map((gap: any) => `${gap.label || "Yetkinlik"}: ${Number(gap.actual || 0).toFixed(1)} → hedef ${Number(gap.expected || 0).toFixed(1)}.`) : ["Ölçülebilir rol yetkinlik açığı bulunmuyor."],
      nextActions: ["İlk 1–2 yetkinlik açığına öncelik verin.", "Aksiyonu iş üstünde uygulama veya proje kanıtıyla destekleyin.", "Başarı ölçütünü tarih ve gözlenebilir çıktı ile tanımlayın."],
      interviewQuestions: ["Bu yetkinliği geliştirmek iş sonuçlarında hangi farkı yaratmalı?", "Hangi gerçek iş görevi gelişimi kanıtlayabilir?", "Başarıyı 60–90 gün içinde nasıl ölçeceğiz?"],
      guardrail: "AI otomatik gelişim planı atamaz; öneriler yönetici ve çalışan tarafından doğrulanmalıdır.",
    };
  }

  if (kind === "career") {
    const readiness = context?.readiness || {};
    const index = validNumber(readiness.index);
    const notes = limitTextList(readiness.notes, 4);
    return {
      summary: `Hedef role hazır bulunuşluk${index !== null ? ` %${Math.round(index)}` : ""}; yetkinlik, performans, potansiyel, deneyim ve kariyer isteği birlikte ele alınmalıdır.`,
      confidence: index !== null ? "orta" : "düşük",
      confidenceReason: index !== null ? "Birden fazla hazır bulunuşluk bileşeni mevcut; yine de kariyer görüşmesiyle doğrulama gerekir." : "Hazır bulunuşluk bileşenleri eksik.",
      evidenceStrengths: [
        readiness.competencyFit !== undefined ? `Yetkinlik uyumu %${Math.round(Number(readiness.competencyFit) || 0)}.` : "",
        readiness.performance !== undefined ? `Performans bileşeni %${Math.round(Number(readiness.performance) || 0)}.` : "",
        readiness.potential !== undefined ? `Potansiyel bileşeni %${Math.round(Number(readiness.potential) || 0)}.` : "",
      ].filter(Boolean).slice(0, 4),
      evidenceGaps: notes.length ? notes : ["Hedef rol geçişinin davranışsal kanıtları kariyer görüşmesinde doğrulanmalı."],
      nextActions: ["En düşük hazır bulunuşluk bileşenini gelişim hedefi yapın.", "Seviye veya job family değişimi varsa ara sorumluluk/proje deneyimi planlayın.", "Kariyer isteğini çalışanla güncel olarak teyit edin."],
      interviewQuestions: ["Bu hedef rol neden sizin için anlamlı?", "Hedef rolün hangi sorumluluğunu bugün üstlenmeye hazırsınız?", "Geçiş öncesi hangi deneyimi kazanmanız gerektiğini düşünüyorsunuz?"],
      guardrail: "Hazır bulunuşluk ve AI analizi terfi kararı değildir; kariyer ve yönetici görüşmesini destekler.",
    };
  }

  const pool = context?.poolCoverage || {};
  const candidates = Array.isArray(context?.candidates) ? context.candidates : [];
  return {
    summary: "Halefiyet planı tek bir adayı seçmekten ziyade hedef rol için havuz kapsamasını, hazır olma riskini ve gelişim gereksinimlerini görünür kılmalıdır.",
    confidence: candidates.length >= 3 ? "orta" : "düşük",
    confidenceReason: candidates.length >= 3 ? `${candidates.length} adayın çok faktörlü kanıtı karşılaştırılabiliyor.` : "Halef havuzu sınırlı veya veri kapsamı düşük.",
    evidenceStrengths: [
      pool.candidateCount !== undefined ? `${pool.candidateCount} halef adayı değerlendiriliyor.` : "",
      pool.readyNow !== undefined ? `${pool.readyNow} aday şimdi hazır bandında.` : "",
      pool.averageScore !== undefined ? `Havuz ortalama uyumu %${Math.round(Number(pool.averageScore) || 0)}.` : "",
    ].filter(Boolean).slice(0, 4),
    evidenceGaps: candidates.length < 2 ? ["Tek adaya bağımlılık halefiyet riski oluşturuyor."] : [],
    nextActions: ["Havuzdaki hazır olma boşluklarını hedefli gelişim planlarına bağlayın.", "Kritik rol için en az iki bağımsız halef senaryosu oluşturun.", "Kariyer isteği ve rol ilgisini adaylarla ayrıca doğrulayın."],
    interviewQuestions: ["Bu rolün kritik sorumluluklarını hangi adaylar bugün kanıtlayabiliyor?", "Havuzda tek kişiye bağımlı olduğumuz alan var mı?", "6–12 ayda hazır hale gelmesi beklenen aday için hangi deneyim eksik?"],
    guardrail: "AI halef seçmez, aday sıralamaz ve atama yapmaz; havuz kanıtlarını ve riskleri özetler.",
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

function taskFocus(kind: RecommendationKind): string {
  const focus: Record<RecommendationKind, string> = {
    recruitment: "Aday kanıtını sentezle; test, rol hedefi, yapılandırılmış mülakat ve iş örneğini birlikte değerlendir. Kabul/red kararı verme.",
    performance: "Performans kalibrasyonu yap: KPI ile yönetici gözlemi farklarını, rol yetkinlik açıklarını, geçmiş trendi ve eksik kanıtları görünür kıl. Skoru değiştirme veya nihai performans kararı verme.",
    talent: "Performans, potansiyel, 9-box, veri güveni ve rol yetkinlik farklarını birlikte analiz et. Terfi veya ücret kararı verme.",
    development: "En kritik yetkinlik açıklarını ölçülebilir iş üstünde aksiyon, proje, koçluk ve başarı kriterleriyle ilişkilendir. Otomatik plan atama.",
    career: "Hedef role hazır bulunuşluğu bileşenleriyle analiz et; job family/seviye mesafesini ve kariyer isteğini dikkate al. Terfi kararı verme.",
    succession: "Halef havuzunun kapsama gücünü, hazır olma risklerini ve gelişim açıklarını analiz et. Aday sıralama, tek kişiyi seçme veya atama yapma.",
  };
  return focus[kind];
}

function buildPrompt(kind: RecommendationKind, context: any): string {
  return `Sen FutureHR içinde çalışan, kanıta dayalı bir İK karar destek asistanısın.
Görev türü: ${kind}
Odak: ${taskFocus(kind)}

Yalnızca aşağıdaki veriyi kullan:
${JSON.stringify(context)}

Kurallar:
- Türkçe, açık ve profesyonel yaz.
- Yalnızca verilen kanıta dayan; bilinmeyeni tahmin etme.
- Yaş, cinsiyet, sağlık, engellilik, din, siyasi görüş, etnik köken, ırk, medeni durum veya başka hassas özellikleri kullanma ya da tahmin etme.
- Aday/çalışan hakkında kişilik, ruh sağlığı veya korunan özellik çıkarımı yapma.
- İşe alma, işten çıkarma, terfi, ücret, disiplin veya halef ataması konusunda nihai karar verme; kişileri otomatik sıralama veya eleme yapma.
- Tek bir skor veya etiketi karar gerekçesi sayma; birden fazla bağımsız kanıtı birlikte ele al.
- Güçlü kanıtları ve eksik/doğrulanacak kanıtları ayrı yaz.
- Aksiyonlar doğrulanabilir, ölçülebilir ve somut olsun.
- Güven seviyesi yalnızca veri kapsamını ifade etsin; kişinin kalitesini ifade etmesin.
- interviewQuestions alanını modüle uygun doğrulama/görüşme soruları için kullan.
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
  const allowed: RecommendationKind[] = ["talent", "recruitment", "performance", "development", "career", "succession"];
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
