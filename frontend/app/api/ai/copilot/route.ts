import { NextRequest, NextResponse } from "next/server";
import { publicAIStatus, runStructuredAI } from "../../../../lib/ai/resilient-provider";

export const runtime = "nodejs";

type Confidence = "düşük" | "orta" | "yüksek";
type Severity = "kritik" | "yüksek" | "orta" | "bilgi";

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

const ROUTES = new Set(["/dashboard", "/degerlendirme", "/kalibrasyon", "/yetenek-matrisi", "/gelisim", "/egitim", "/gelisim-analitigi", "/kariyer", "/yedekleme", "/maas", "/calisan-deneyimi", "/organizasyon", "/ise-alim"]);

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
- Performans kalibrasyonu, düşük kanıt güveni, kritik rol/halefiyet açığı, gelişim gecikmesi, doğrulanmış öğrenme ve yeniden ölçüm etkisi, ücret verisi/benchmark açığı ve çalışan deneyimi sinyallerini gerektiğinde birleştir.
- Toplu gelişim etkinliği, yetkinlik bazlı değişim, yöntem karşılaştırması, transfer doğrulama oranı veya yeniden ölçüm kapsamı sorularında /gelisim-analitigi route'unu kullan.
- learningAverageDelta ve learningPositiveRate yalnız doğrulanmış işe transfer kanıtı sonrasındaki karşılaştırılabilir yeniden ölçümleri özetler; bunları eğitimin nedensel etkisi olarak sunma.
- Kişiler hakkında bilinmeyen özellik çıkarımı yapma. Hassas/korunan özellikleri kullanma veya tahmin etme.
- İşe alma, işten çıkarma, terfi, ücret artışı, disiplin veya halef ataması için nihai karar verme; kişileri otomatik sıralama/eleme yapma.
- Kanıt güveni düşükse bunu açıkça söyle; eksik veriyi gerçek veri gibi doldurma.
- "Kanıt Güveni" kişinin kalitesi değil, veri kapsamı/izlenebilirliği anlamına gelir.
- Kısa ol; en fazla 4 öncelik, 4 aksiyon, 4 veri açığı üret.
- Yalnızca JSON schema ile uyumlu tek bir JSON nesnesi üret.`;
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

function normalize(value: any, fallbackValue: CopilotAnalysis): CopilotAnalysis {
  if (!value || typeof value !== "object") return fallbackValue;
  const confidence: Confidence = ["düşük", "orta", "yüksek"].includes(value.confidence) ? value.confidence : fallbackValue.confidence;
  const priorities: Priority[] = Array.isArray(value.priorities) ? value.priorities.slice(0, 4).map((item: any) => ({
    severity: (["kritik", "yüksek", "orta", "bilgi"].includes(item?.severity) ? item.severity : "orta") as Severity,
    title: String(item?.title || "İncelenecek sinyal").slice(0, 180),
    evidence: String(item?.evidence || "Kanıt belirtilmedi.").slice(0, 360),
    action: String(item?.action || "İlgili modülde insan doğrulaması yapın.").slice(0, 360),
    route: ROUTES.has(String(item?.route)) ? String(item.route) : "/dashboard",
  })) : fallbackValue.priorities;
  const list = (input: any, backup: string[]) => Array.isArray(input) ? input.filter((item) => typeof item === "string" && item.trim()).slice(0, 4) : backup;
  return {
    answer: typeof value.answer === "string" ? value.answer.slice(0, 900) : fallbackValue.answer,
    confidence,
    confidenceReason: typeof value.confidenceReason === "string" ? value.confidenceReason.slice(0, 500) : fallbackValue.confidenceReason,
    priorities,
    nextActions: list(value.nextActions, fallbackValue.nextActions),
    evidenceGaps: list(value.evidenceGaps, fallbackValue.evidenceGaps),
    guardrail: typeof value.guardrail === "string" ? value.guardrail.slice(0, 500) : fallbackValue.guardrail,
  };
}

function fallback(context: any): CopilotAnalysis {
  const m = context?.metrics || {};
  const priorities: Priority[] = [];
  if (Number(m.calibrationRequired || 0) > 0) priorities.push({ severity: "yüksek", title: "Performans kalibrasyonu", evidence: `${m.calibrationRequired} değerlendirmede KPI-yönetici farkı kalibrasyon eşiğini aşıyor.`, action: "Kalibrasyon Merkezi'nde somut davranış ve çıktı kanıtlarını karşılaştırın.", route: "/kalibrasyon" });
  if (Number(m.criticalRolesWithoutReadySuccessor || 0) > 0) priorities.push({ severity: "kritik", title: "Halefiyet açığı", evidence: `${m.criticalRolesWithoutReadySuccessor} kritik rolün şimdi hazır halefi bulunmuyor.`, action: "Kritik roller için 6–12 aylık hazırlık ve alternatif halef senaryosu oluşturun.", route: "/yedekleme" });
  if (Number(m.learningReassessmentDue || 0) > 0) priorities.push({ severity: "yüksek", title: "Gelişim yeniden ölçümü", evidence: `${m.learningReassessmentDue} doğrulanmış gelişim müdahalesinde yeniden ölçüm zamanı geldi.`, action: "Gelişim Etkinliği ekranında gecikmiş yeniden ölçümleri tamamlayın ve yetkinlik bazında başlangıç/sonuç farkını inceleyin.", route: "/gelisim-analitigi" });
  if (Number(m.lowEvidenceEmployees || 0) > 0) priorities.push({ severity: "orta", title: "Kanıt kapsamı", evidence: `${m.lowEvidenceEmployees} çalışanda Kanıt Güveni %60'ın altında.`, action: "Karar öncesi eksik performans, yetkinlik veya rol kanıtlarını tamamlayın.", route: "/yetenek-matrisi" });
  if (Number(m.compensationDataWarnings || 0) > 0) priorities.push({ severity: "orta", title: "Ücret karar verisi", evidence: `${m.compensationDataWarnings} ücret satırında veri/benchmark uyarısı var.`, action: "Ücret Karar Merkezi'nde eksik maaş ve dış benchmark kayıtlarını doğrulayın.", route: "/maas" });
  const confidence: Confidence = Number(m.employeeCount || 0) > 0 ? "orta" : "düşük";
  const learningSentence = Number(m.learningMeasured || 0) > 0
    ? ` Ölçülen ${m.learningMeasured} gelişim kaydında pozitif değişim oranı ${m.learningPositiveRate ?? "—"}% ve ortalama yetkinlik değişimi ${m.learningAverageDelta ?? "—"}. Bu değerler nedensellik kanıtı değildir.`
    : "";
  return {
    answer: priorities.length ? `Şu anda ${priorities.length} yönetim sinyali öncelikli görünüyor.${learningSentence}` : `Mevcut veride belirgin bir kritik yönetim sinyali oluşmadı; veri kapsamını ve güncelliğini kontrol ederek izlemeye devam edin.${learningSentence}`,
    confidence,
    confidenceReason: confidence === "orta" ? "Birden fazla FutureHR modülünden toplu kanıt mevcut; insan doğrulaması yine gereklidir." : "Karar desteği için yeterli şirket verisi bulunmuyor.",
    priorities: priorities.slice(0, 4),
    nextActions: priorities.slice(0, 3).map((item) => item.action),
    evidenceGaps: Array.isArray(context?.evidenceGaps) ? context.evidenceGaps.slice(0, 4) : [],
    guardrail: "FutureHR AI nihai işe alma, terfi, ücret, disiplin veya halef ataması kararı vermez; gelişim değişimini nedensellik iddiasına çevirmeden kanıtı sentezler ve insan doğrulamasını yönlendirir.",
  };
}

export async function GET() {
  return NextResponse.json(publicAIStatus());
}

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }
  const question = String(body?.question || "").trim().slice(0, 700);
  if (!question) return NextResponse.json({ error: "Soru gerekli" }, { status: 400 });

  const context = safeContext(body?.context || {});
  const rules = fallback(context);
  const status = publicAIStatus();
  if (!status.configured) {
    return NextResponse.json({ mode: "rules", provider: "rules", configured: false, model: "rule-based", analysis: rules, note: "AI sağlayıcısı yapılandırılmadığı için güvenli kural motoru kullanılıyor." });
  }

  try {
    const result = await runStructuredAI({ prompt: prompt(question, context), schema: SCHEMA as any, schemaName: "futurehr_copilot", maxTokens: 900 });
    const parsed = parseJsonLoose(result.text);
    if (!parsed) throw new Error("AI yanıtı JSON olarak ayrıştırılamadı");
    const analysis = normalize(parsed, rules);
    return NextResponse.json({ mode: "ai", provider: result.provider, configured: true, model: result.model, latencyMs: result.latencyMs, analysis, failoverUsed: result.attempts.some((item) => !item.ok) });
  } catch (error: any) {
    console.error("AI copilot provider chain failed", error?.attempts || error?.message || error);
    return NextResponse.json({ mode: "rules", provider: status.primary || "rules", configured: true, model: "fallback", analysis: rules, note: "AI bağlantısı geçici olarak kullanılamıyor. Mevcut veriler güvenli karar kurallarıyla gösteriliyor." });
  }
}
