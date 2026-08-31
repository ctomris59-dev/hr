import { NextResponse } from "next/server";
import { fetchWithSession, isSameOriginRequest, isSaasMode } from "@/lib/saasAuthServer";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (isSaasMode() && !isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    }
    const { id } = await context.params;
    const response = await fetchWithSession(`/api/v1/talent/profiles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: await request.text(),
    });
    if (!response) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "Geçersiz servis yanıtı." }, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Yetenek profili güncellenemedi." }, { status: 503 });
  }
}
