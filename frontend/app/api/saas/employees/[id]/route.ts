import { NextResponse } from "next/server";
import { fetchWithSession, isSameOriginRequest, isSaasMode } from "@/lib/saasAuthServer";

async function proxy(method: "GET" | "PATCH" | "DELETE", request: Request, id: string) {
  try {
    if ((method === "PATCH" || method === "DELETE") && isSaasMode() && !isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    }

    const safeId = encodeURIComponent(String(id || "").trim());
    if (!safeId) return NextResponse.json({ error: "Çalışan kimliği gerekli." }, { status: 400 });
    const body = method === "PATCH" ? await request.text() : undefined;
    const response = await fetchWithSession(`/api/v1/employees/${safeId}`, { method, body });
    if (!response) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
    if (response.status === 204) return new NextResponse(null, { status: 204 });

    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "Geçersiz servis yanıtı." }, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Çalışan servisine ulaşılamadı." }, { status: 503 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxy("GET", request, id);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxy("PATCH", request, id);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxy("DELETE", request, id);
}
