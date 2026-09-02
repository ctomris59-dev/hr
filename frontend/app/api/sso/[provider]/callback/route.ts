import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendFetch, writeSession } from "@/lib/saasAuthServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PROVIDERS = new Set(["google", "entra"]);

function errorRedirect(origin: string, code: string) {
  return NextResponse.redirect(new URL(`/sistem-girisi?sso_error=${encodeURIComponent(code)}`, origin));
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  if (!PROVIDERS.has(provider)) return errorRedirect(url.origin, "unsupported_provider");
  const store = await cookies();
  const state = url.searchParams.get("state") || "";
  const expectedState = store.get(`futurehr_sso_state_${provider}`)?.value || "";
  const verifier = store.get(`futurehr_sso_verifier_${provider}`)?.value || "";
  const tenant = store.get(`futurehr_sso_tenant_${provider}`)?.value || "";
  const code = url.searchParams.get("code") || "";
  if (!state || !expectedState || state !== expectedState || !verifier || !tenant || !code) return errorRedirect(url.origin, "invalid_state");

  const redirectUri = `${url.origin}/api/sso/${provider}/callback`;
  let tokenUrl = ""; let clientId = ""; let clientSecret = ""; let scope = "";
  if (provider === "google") {
    tokenUrl = "https://oauth2.googleapis.com/token";
    clientId = String(process.env.FUTUREHR_GOOGLE_CLIENT_ID || "");
    clientSecret = String(process.env.FUTUREHR_GOOGLE_CLIENT_SECRET || "");
  } else {
    const tenantId = String(process.env.FUTUREHR_ENTRA_TENANT_ID || "");
    tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
    clientId = String(process.env.FUTUREHR_ENTRA_CLIENT_ID || "");
    clientSecret = String(process.env.FUTUREHR_ENTRA_CLIENT_SECRET || "");
    scope = "openid profile email User.Read";
  }
  if (!clientId || !clientSecret) return errorRedirect(url.origin, "provider_not_configured");

  try {
    const params = new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code_verifier: verifier });
    if (scope) params.set("scope", scope);
    const tokenResponse = await fetch(tokenUrl, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
    const tokenPayload = await tokenResponse.json().catch(() => null);
    const providerAccessToken = String(tokenPayload?.access_token || "");
    if (!tokenResponse.ok || !providerAccessToken) return errorRedirect(url.origin, "token_exchange_failed");

    const futureResponse = await backendFetch("/api/v1/auth/sso/exchange", { method: "POST", body: JSON.stringify({ provider, tenant_slug: tenant, access_token: providerAccessToken }) });
    const futureTokens = await futureResponse.json().catch(() => null);
    if (!futureResponse.ok || !futureTokens?.access_token || !futureTokens?.refresh_token || !futureTokens?.user) return errorRedirect(url.origin, futureResponse.status === 403 ? "account_not_mapped" : "futurehr_exchange_failed");

    await writeSession(futureTokens);
    const response = NextResponse.redirect(new URL("/dashboard?sso=success", url.origin));
    for (const key of [`futurehr_sso_state_${provider}`, `futurehr_sso_verifier_${provider}`, `futurehr_sso_tenant_${provider}`]) response.cookies.set(key, "", { path: "/api/sso", maxAge: 0 });
    return response;
  } catch {
    return errorRedirect(url.origin, "sso_unavailable");
  }
}
