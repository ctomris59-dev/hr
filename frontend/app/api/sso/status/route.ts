import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const google = Boolean(process.env.FUTUREHR_GOOGLE_CLIENT_ID && process.env.FUTUREHR_GOOGLE_CLIENT_SECRET);
  const entra = Boolean(process.env.FUTUREHR_ENTRA_CLIENT_ID && process.env.FUTUREHR_ENTRA_CLIENT_SECRET && process.env.FUTUREHR_ENTRA_TENANT_ID);
  return NextResponse.json({
    google: { configured: google, state: google ? "configured" : "ready_for_credentials", redirectUri: `${origin}/api/sso/google/callback` },
    entra: { configured: entra, state: entra ? "configured" : "ready_for_credentials", redirectUri: `${origin}/api/sso/entra/callback` },
    mapping: "Provider tarafından doğrulanmış e-posta → mevcut aktif FutureHR tenant kullanıcısı",
    autoProvisioning: false,
  }, { headers: { "Cache-Control": "no-store" } });
}
