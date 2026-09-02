import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDERS = new Set(["google", "entra"]);
const b64url = (buffer: Buffer) => buffer.toString("base64url");

function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/sso", maxAge: 600 };
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!PROVIDERS.has(provider)) return NextResponse.json({ error: "Unsupported SSO provider" }, { status: 404 });
  const url = new URL(request.url);
  const tenant = String(url.searchParams.get("tenant") || "").trim().slice(0, 80);
  if (!tenant) return NextResponse.json({ error: "Şirket kodu zorunludur." }, { status: 400 });

  const origin = url.origin;
  const redirectUri = `${origin}/api/sso/${provider}/callback`;
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  let authorizationUrl: URL;
  if (provider === "google") {
    const clientId = String(process.env.FUTUREHR_GOOGLE_CLIENT_ID || "").trim();
    if (!clientId || !process.env.FUTUREHR_GOOGLE_CLIENT_SECRET) return NextResponse.json({ error: "Google SSO credential yapılandırması bekleniyor." }, { status: 409 });
    authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" }).toString();
  } else {
    const clientId = String(process.env.FUTUREHR_ENTRA_CLIENT_ID || "").trim();
    const tenantId = String(process.env.FUTUREHR_ENTRA_TENANT_ID || "").trim();
    if (!clientId || !tenantId || !process.env.FUTUREHR_ENTRA_CLIENT_SECRET) return NextResponse.json({ error: "Microsoft Entra SSO credential yapılandırması bekleniyor." }, { status: 409 });
    authorizationUrl = new URL(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`);
    authorizationUrl.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid profile email User.Read", state, code_challenge: challenge, code_challenge_method: "S256", response_mode: "query" }).toString();
  }

  const response = NextResponse.redirect(authorizationUrl);
  const opts = cookieOptions();
  response.cookies.set(`futurehr_sso_state_${provider}`, state, opts);
  response.cookies.set(`futurehr_sso_verifier_${provider}`, verifier, opts);
  response.cookies.set(`futurehr_sso_tenant_${provider}`, tenant, opts);
  return response;
}
