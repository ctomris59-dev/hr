import { NextResponse } from "next/server";
import { fetchWithSession, isSameOriginRequest, isSaasMode } from "@/lib/saasAuthServer";

const ALLOWED_ROOTS = new Set([
  "development",
  "leave",
  "compensation",
  "decision",
  "digital-twin",
  "skills",
  "lifecycle",
  "compliance",
  "recruitment",
]);
const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function backendPath(request: Request, segments: string[]) {
  if (!segments.length || !ALLOWED_ROOTS.has(segments[0])) return null;
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  const source = new URL(request.url);
  const suffix = segments.map((segment) => encodeURIComponent(decodeURIComponent(segment))).join("/");
  return `/api/v1/${suffix}${source.search}`;
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const target = backendPath(request, path || []);
    if (!target) return NextResponse.json({ error: "Desteklenmeyen SaaS işgücü endpoint'i." }, { status: 404 });

    if (MUTATION_METHODS.has(request.method) && isSaasMode() && !isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    }

    const response = await fetchWithSession(target, {
      method: request.method,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
    });
    if (!response) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "Geçersiz servis yanıtı." }, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "SaaS karar zekâsı servisine ulaşılamadı." }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
