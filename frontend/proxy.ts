import { NextRequest, NextResponse } from "next/server";

const SAAS_MODE = process.env.FUTUREHR_SAAS_MODE === "true" || process.env.NEXT_PUBLIC_DATA_MODE === "saas";
const PUBLIC_SAAS_PATHS = ["/sistem-girisi", "/basvuru", "/aday-girisi", "/aday-sinavi", "/test-adayi"];
const SAFE_API_PREFIXES = ["/api/secure-auth/", "/api/saas/", "/api/ai/"];
const SAFE_API_EXACT = new Set(["/api/health"]);

function isPublicSaasPath(pathname: string) {
  return PUBLIC_SAAS_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isAllowedApi(pathname: string) {
  if (SAFE_API_EXACT.has(pathname)) return true;
  return SAFE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  if (!SAAS_MODE) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/") return NextResponse.redirect(new URL("/sistem-girisi", request.url));

  if (pathname.startsWith("/api/")) {
    if (!isAllowedApi(pathname)) {
      return NextResponse.json(
        { error: "Legacy/demo API is disabled in SaaS mode." },
        { status: 410, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.next();
  }

  if (isPublicSaasPath(pathname)) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get("futurehr_access")?.value || request.cookies.get("futurehr_refresh")?.value);
  if (!hasSession) return NextResponse.redirect(new URL("/sistem-girisi", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
