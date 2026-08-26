import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RecommendationKind = "talent" | "recruitment" | "development" | "career" | "succession";

function fallbackRecommendation(kind: RecommendationKind, context: any): string {
  if (kind === "recruitment") {
    const test = Number(context?.testScore);
    const testText = Number.isFinite(test) ? `Yetkinlik testi ${test.toFixed(1)}/5 seviyesinde.` : "Yetkinlik testi henüz tamamlanmamış.";
    return `${testText} Test sonucu işe alım kararı değildir. Ön eleme, deneyim, teknik/iş örneği, yapılandırılmış mülakat ve rol gereksinimleri birlikte değerlendirilmelidir.`;
  }
  if (kind === "talent") {
    const potential = context?.potential?.score;
    const confidence = context?.potential?.confidence;
    return `Potansiyel endeksi${potential ? ` ${potential}/5` : ""}${confidence ? `, veri güveni %${confidence}` : ""}. Güçlü yönleri koruyun; düşük faktörler için ölçülebilir gelişim aksiyonları tanımlayın. Bu çıktı terfi kararı değildir.`;
  }
  if (kind === "succession") {
    return "Halefiyet kararında hedef rol uyumu, seviye mesafesi, hazır olma süresi, kariyer isteği, performans trendi ve potansiyel birlikte değerlendirilmelidir.";
  }
  if (kind === "career") {
    return "Hedef role geçişi yalnızca tek bir hazır olma yüzdesiyle değil; yetkinlik uyumu, performans, potansiyel, deneyim, kariyer isteği ve rol seviyesi mesafesiyle değerlendirin.";
  }
  return "Gelişim planını en kritik yetkinlik açığına odaklayın; hedef, aksiyon, sorumlu, son tarih ve ilerleme ölçütünü açıkça tanımlayın.";
}

function buildPrompt(kind: RecommendationKind, context: any): string {
  return `Sen FutureHR içinde çalışan, kanıta dayalı bir İK karar destek asistanısın.
Görev türü: ${kind}
Veri: ${JSON.stringify(context)}

Kurallar:
- Türkçe ve kısa yaz.
- Yalnızca verilen veriye dayan; eksik veriyi açıkça söyle.
- Yaş, cinsiyet, sağlık, din, siyasi görüş, etnik köken veya başka hassas özellikleri tahmin etme/kullanma.
- İşe alma, işten çıkarma, terfi veya ücret konusunda nihai karar verme. Karar desteği ve doğrulanabilir aksiyon önerileri sun.
- Test puanını tek başına işe alma/terfi kararı olarak yorumlama.
- Potansiyel ile mevcut performansı aynı şeymiş gibi ele alma.
- 3 bölüm üret: "Özet", "Kanıt", "Önerilen Aksiyonlar".
- En fazla 180 kelime.`;
}

function extractResponseText(payload: any): string | null {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim() || null;
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

  const context = body?.context || {};
  const fallback = fallbackRecommendation(kind, context);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      mode: "rules",
      configured: false,
      recommendation: fallback,
      note: "OPENAI_API_KEY tanımlı olmadığı için kural bazlı karar desteği gösteriliyor.",
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: buildPrompt(kind, context),
        max_output_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI recommendation error", response.status, errorText.slice(0, 500));
      return NextResponse.json({ mode: "rules", configured: true, recommendation: fallback, note: "AI servisine erişilemedi; kural bazlı yedek çıktı gösteriliyor." });
    }

    const payload = await response.json();
    const text = extractResponseText(payload);
    if (!text) return NextResponse.json({ mode: "rules", configured: true, recommendation: fallback, note: "AI boş yanıt verdi; kural bazlı yedek çıktı gösteriliyor." });

    return NextResponse.json({ mode: "ai", configured: true, recommendation: text });
  } catch (error) {
    console.error("AI recommendation request failed", error);
    return NextResponse.json({ mode: "rules", configured: true, recommendation: fallback, note: "AI bağlantı hatası nedeniyle kural bazlı yedek çıktı gösteriliyor." });
  }
}
