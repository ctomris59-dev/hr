import { NextResponse } from "next/server";
import { backendFetch, writeSession } from "@/lib/saasAuthServer";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.tenant_slug || !body?.username || !body?.password) {
    return NextResponse.json({ error: "Şirket kodu, kullanıcı adı ve şifre zorunludur." }, { status: 400 });
  }

  try {
    const response = await backendFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        tenant_slug: String(body.tenant_slug).trim(),
        username: String(body.username).trim(),
        password: String(body.password),
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token || !payload?.refresh_token || !payload?.user) {
      const detail = payload?.detail || payload?.error || "Giriş başarısız.";
      return NextResponse.json({ error: detail }, { status: response.status || 401 });
    }

    await writeSession(payload);
    return NextResponse.json({ success: true, user: payload.user });
  } catch {
    return NextResponse.json({ error: "Güvenli giriş servisine ulaşılamadı." }, { status: 503 });
  }
}
