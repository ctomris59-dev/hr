import "server-only";

import { cookies } from "next/headers";

export const ACCESS_COOKIE = "futurehr_access";
export const REFRESH_COOKIE = "futurehr_refresh";

export interface SecureUser {
  id: string;
  username: string;
  role: string;
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  position: string | null;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
}

interface TokenPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: SecureUser;
}

export function isSaasMode() {
  return process.env.FUTUREHR_SAAS_MODE === "true" || process.env.NEXT_PUBLIC_DATA_MODE === "saas";
}

export function backendConfigured() {
  return Boolean(process.env.BACKEND_URL);
}

function backendBaseUrl() {
  const configured = process.env.BACKEND_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production" && isSaasMode()) {
    throw new Error("BACKEND_URL is required in SaaS production mode");
  }
  return "http://127.0.0.1:8000";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
    priority: "high" as const,
  };
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Server-to-server and same-origin navigations may omit Origin.
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (!forwardedHost) return false;
    return originUrl.host === forwardedHost && originUrl.protocol.replace(":", "") === forwardedProto;
  } catch {
    return false;
  }
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  const url = new URL(path, backendBaseUrl());
  return fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
}

export async function writeSession(tokens: TokenPayload) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(Math.max(60, Number(tokens.expires_in) || 1200)));
  store.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(7 * 24 * 60 * 60));
}

export async function clearSession() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", cookieOptions(0));
  store.set(REFRESH_COOKIE, "", cookieOptions(0));
}

export async function getAccessToken() {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value || null;
}

export async function getRefreshToken() {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value || null;
}

export async function hasSessionCookie() {
  const store = await cookies();
  return Boolean(store.get(ACCESS_COOKIE)?.value || store.get(REFRESH_COOKIE)?.value);
}

export async function refreshSession(): Promise<TokenPayload | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await backendFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    await clearSession();
    return null;
  }

  const payload = (await response.json()) as TokenPayload;
  await writeSession(payload);
  return payload;
}

export async function fetchWithSession(path: string, init: RequestInit = {}) {
  let accessToken = await getAccessToken();
  if (!accessToken) {
    const refreshed = await refreshSession();
    accessToken = refreshed?.access_token || null;
  }
  if (!accessToken) return null;

  let response = await backendFetch(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) return response;
    response = await backendFetch(path, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${refreshed.access_token}`,
      },
    });
  }

  return response;
}

export async function getSecureUserFromSession(): Promise<SecureUser | null> {
  if (!isSaasMode()) return null;
  try {
    const response = await fetchWithSession("/api/v1/auth/me");
    if (!response?.ok) return null;
    const user = await response.json().catch(() => null);
    return user?.id && user?.tenant_id && user?.role ? (user as SecureUser) : null;
  } catch {
    return null;
  }
}
