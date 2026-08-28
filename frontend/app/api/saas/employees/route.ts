import { NextResponse } from "next/server";
import { fetchWithSession } from "@/lib/saasAuthServer";

async function proxy(method: "GET" | "POST", request?: Request) {
  try {
    const body = method === "POST" && request ? await request.text() : undefined;
    const response = await fetchWithSession("/api/v1/employees", {
      method,
      body,
    });
    if (!response) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "Geçersiz servis yanıtı." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Çalışan servisine ulaşılamadı." }, { status: 503 });
  }
}

export async function GET() {
  return proxy("GET");
}

export async function POST(request: Request) {
  return proxy("POST", request);
}
