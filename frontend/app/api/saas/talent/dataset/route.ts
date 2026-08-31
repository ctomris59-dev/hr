import { NextResponse } from "next/server";
import { fetchWithSession } from "@/lib/saasAuthServer";

export async function GET() {
  try {
    const response = await fetchWithSession("/api/v1/talent/dataset");
    if (!response) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "Geçersiz servis yanıtı." }, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Yetenek veri servisine ulaşılamadı." }, { status: 503 });
  }
}
