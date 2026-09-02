import { NextResponse } from "next/server";
import { TURKEY_CONNECTORS, normalizeAttendanceRecord, normalizeEmployeeMaster, normalizePayrollRecord, type TurkeyConnectorId } from "@/lib/hr/turkeyEnterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(TURKEY_CONNECTORS.map((item) => item.id));
const env = (name?: string) => name ? String(process.env[name] || "").trim() : "";

function definition(provider: string) {
  return TURKEY_CONNECTORS.find((item) => item.id === provider) || null;
}

function safeStatus(provider: TurkeyConnectorId) {
  const item = definition(provider)!;
  if (provider === "excel") return { provider, state: "built_in", configured: true, missing: [], capabilities: item.capabilities };
  const baseUrl = env(item.env.baseUrl);
  const apiKey = env(item.env.apiKey);
  const clientId = env(item.env.clientId);
  const clientSecret = env(item.env.clientSecret);
  const missing = [
    ...(item.env.baseUrl && !baseUrl ? [item.env.baseUrl] : []),
    ...(item.env.apiKey && !apiKey ? [item.env.apiKey] : []),
    ...(item.env.clientId && !clientId ? [item.env.clientId] : []),
    ...(item.env.clientSecret && !clientSecret ? [item.env.clientSecret] : []),
  ];
  return { provider, state: missing.length ? "ready_for_credentials" : "configured", configured: missing.length === 0, missing, capabilities: item.capabilities };
}

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base : `${base}/`;
  return new URL(path.replace(/^\//, ""), b).toString();
}

async function sapToken() {
  const tokenUrl = String(process.env.FUTUREHR_SAP_TOKEN_URL || "").trim();
  const clientId = String(process.env.FUTUREHR_SAP_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.FUTUREHR_SAP_CLIENT_SECRET || "").trim();
  if (!tokenUrl || !clientId || !clientSecret) return "";
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(tokenUrl, {
      method: "POST", cache: "no-store", signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    });
    if (!response.ok) throw new Error(`SAP OAuth ${response.status}`);
    const json = await response.json(); return String(json?.access_token || "");
  } finally { clearTimeout(timer); }
}

async function headersFor(provider: TurkeyConnectorId) {
  const item = definition(provider)!;
  const headers: Record<string,string> = { Accept: "application/json" };
  if (provider === "sap_successfactors") {
    const token = await sapToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else {
    const key = env(item.env.apiKey);
    if (key) {
      if (provider === "mikro") headers.API_KEY = key;
      else headers.Authorization = `Bearer ${key}`;
    }
  }
  return headers;
}

function rowsFrom(payload: any): Record<string,any>[] {
  if (Array.isArray(payload)) return payload;
  const candidates = [payload?.value, payload?.results, payload?.data, payload?.items, payload?.records, payload?.d?.results, payload?.result];
  return candidates.find(Array.isArray) || [];
}

async function vendorFetch(provider: TurkeyConnectorId, path: string) {
  const item = definition(provider)!;
  const base = env(item.env.baseUrl);
  if (!base) throw new Error("Connector base URL is not configured.");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(joinUrl(base, path), { method: "GET", cache: "no-store", signal: controller.signal, headers: await headersFor(provider) });
    const text = await response.text();
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}${text ? ` · ${text.slice(0,160)}` : ""}`);
    if (!text) return null;
    try { return JSON.parse(text); } catch { return { ok: true, raw: text.slice(0,200) }; }
  } finally { clearTimeout(timer); }
}

export async function GET(_request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!ALLOWED.has(provider as TurkeyConnectorId)) return NextResponse.json({ error: "Unsupported connector" }, { status: 404 });
  const item = definition(provider)!;
  return NextResponse.json({ ...safeStatus(provider as TurkeyConnectorId), name: item.name, family: item.family, transport: item.transport, description: item.description });
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!ALLOWED.has(provider as TurkeyConnectorId)) return NextResponse.json({ error: "Unsupported connector" }, { status: 404 });
  const id = provider as TurkeyConnectorId;
  if (id === "excel") return NextResponse.json({ provider: id, state: "built_in", ok: true, message: "Excel onboarding istemci tarafında kontrollü önizleme/eşleme ile çalışır." });
  const status = safeStatus(id);
  if (!status.configured) return NextResponse.json({ ...status, ok: false, message: "Connector kodu hazır; tenant credential ve endpoint ayarları bekleniyor." }, { status: 409 });

  const item = definition(id)!;
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "health");
  try {
    if (action === "health") {
      const path = env(item.env.healthPath) || env(item.env.employeePath) || "/";
      await vendorFetch(id, path);
      return NextResponse.json({ provider: id, ok: true, state: "active", message: "Bağlantı doğrulandı; secret değerleri istemciye döndürülmedi." });
    }

    const domain = String(body?.domain || "employees");
    const path = domain === "payroll" ? env(item.env.payrollPath) : domain === "attendance" ? env(item.env.attendancePath) : env(item.env.employeePath);
    if (!path) return NextResponse.json({ provider: id, ok: false, message: `${domain} endpoint path'i yapılandırılmamış.` }, { status: 422 });
    const payload = await vendorFetch(id, path);
    const raw = rowsFrom(payload);
    const normalized = domain === "payroll"
      ? raw.map((row) => normalizePayrollRecord(row, id)).filter(Boolean)
      : domain === "attendance"
        ? raw.map((row) => normalizeAttendanceRecord(row, id)).filter(Boolean)
        : raw.map(normalizeEmployeeMaster).filter(Boolean);
    const limit = action === "preview" ? 25 : 5000;
    return NextResponse.json({ provider: id, ok: true, state: "active", domain, rawCount: raw.length, normalizedCount: normalized.length, rows: normalized.slice(0, limit), truncated: normalized.length > limit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connector request failed";
    return NextResponse.json({ provider: id, ok: false, state: "error", message }, { status: 502 });
  }
}
