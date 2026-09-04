import { NextResponse } from "next/server";
import { fetchWithSession } from "@/lib/saasAuthServer";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const safeId = encodeURIComponent(String(id || "").trim());
    if (!safeId) return NextResponse.json({ error: "Çalışan kimliği gerekli." }, { status: 400 });

    const response = await fetchWithSession(`/api/v1/employees/${safeId}/avatar`, { method: "GET" });
    if (!response) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return NextResponse.json(payload ?? { error: "Profil fotoğrafı bulunamadı." }, {
        status: response.status,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const bytes = await response.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Profil fotoğrafı servisine ulaşılamadı." }, { status: 503 });
  }
}
