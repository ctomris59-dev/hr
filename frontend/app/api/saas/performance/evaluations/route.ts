import { NextResponse } from "next/server";
import { fetchWithSession, isSameOriginRequest, isSaasMode } from "@/lib/saasAuthServer";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employee_id");
    const path = employeeId
      ? `/api/v1/performance/evaluations?employee_id=${encodeURIComponent(employeeId)}`
      : "/api/v1/performance/evaluations";
    const response = await fetchWithSession(path);
    if (!response) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "Geçersiz servis yanıtı." }, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Performans kayıt servisine ulaşılamadı." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (isSaasMode() && !isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    }
    const response = await fetchWithSession("/api/v1/performance/evaluations", {
      method: "POST",
      body: await request.text(),
    });
    if (!response) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "Geçersiz servis yanıtı." }, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Performans kaydı oluşturulamadı." }, { status: 503 });
  }
}
