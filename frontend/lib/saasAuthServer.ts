import "server-only";

import { cookies } from "next/headers";

const BACKEND_BASE_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

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

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  const url = new URL(path, BACKEND_BASE_URL);
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
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
