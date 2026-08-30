import { NextResponse } from "next/server";
import { backendFetch, isSameOriginRequest, isSaasMode, writeSession } from "@/lib/saasAuthServer";

export async function POST(request: Request) {
  if (isSaasMode() && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.tenant_slug || !body?.username || !body?.password) {
    return NextResponse.json({ error: "Şirket kodu, kullanıcı adı ve şifre zorunludur." }, { status: 400 });
  }

  try {
    const response = await backendFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        tenant_slug: String(body.tenant_slug).trim().slice(0, 80),
        username: String(body.username).trim().slice(0, 120),
        password: String(body.password).slice(0, 256),
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token || !payload?.refresh_token || !payload?.user) {
      const detail = response.status === 429 ? "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin." : "Şirket kodu veya kullanıcı bilgileri geçersiz.";
      return NextResponse.json({ error: detail }, { status: response.status || 401 });
    }

    await writeSession(payload);
    return NextResponse.json({ success: true, user: payload.user }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Güvenli giriş servisine ulaşılamadı." }, { status: 503 });
  }
}
