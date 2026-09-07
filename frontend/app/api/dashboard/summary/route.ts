import { NextResponse } from "next/server";
import { fetchWithSession, isSaasMode } from "@/lib/saasAuthServer";

const BACKEND_BASE_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  try {
    if (isSaasMode()) {
      const response = await fetchWithSession("/api/v1/dashboard/summary", { method: "GET" });
      if (!response) return NextResponse.json({ success: false, error: "Oturum bulunamadı." }, { status: 401 });
      const payload = await response.json().catch(() => null);
      return NextResponse.json(payload ?? { success: false, error: "Geçersiz servis yanıtı." }, {
        status: response.status,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const backendUrl = new URL("/api/dashboard/summary", BACKEND_BASE_URL).toString();
    const response = await fetch(backendUrl, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { success: false, error: "Invalid backend response" }, {
      status: data ? response.status : 502,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Dashboard summary proxy error:", error);
    return NextResponse.json({ success: false, error: "Dashboard servisine ulaşılamadı." }, { status: 503 });
  }
}
