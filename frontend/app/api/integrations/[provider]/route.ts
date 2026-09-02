import { NextResponse } from "next/server";
import { canManageConnectors, canPersistConnectorDomain, maskEmail, maskIdentifier, maskName } from "@/lib/hr/connectorSecurity";
import { TURKEY_CONNECTORS, normalizeAttendanceRecord, normalizeEmployeeMaster, normalizePayrollRecord, type CanonicalEmployeeMaster, type TurkeyConnectorId } from "@/lib/hr/turkeyEnterprise";
import { fetchWithSession, getSecureUserFromSession, isSameOriginRequest } from "@/lib/saasAuthServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(TURKEY_CONNECTORS.map((item) => item.id));
const MAX_VENDOR_ROWS = 5000;
const env = (name?: string) => name ? String(process.env[name] || "").trim() : "";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", Vary: "Cookie" } });
}

async function requireConnectorAdmin() {
  const user = await getSecureUserFromSession();
  if (!user) return { user: null, response: json({ error: "Authentication required" }, 401) };
  if (!canManageConnectors(user.role)) return { user, response: json({ error: "Connector administration requires an HR administrator role" }, 403) };
  return { user, response: null };
}

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
  const tokenUrl = env("FUTUREHR_SAP_TOKEN_URL");
  const clientId = env("FUTUREHR_SAP_CLIENT_ID");
  const clientSecret = env("FUTUREHR_SAP_CLIENT_SECRET");
  if (!tokenUrl || !clientId || !clientSecret) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    });
    if (!response.ok) throw new Error(`SAP OAuth ${response.status}`);
    const payload = await response.json().catch(() => null);
    return String(payload?.access_token || "");
  } finally {
    clearTimeout(timer);
  }
}

async function headersFor(provider: TurkeyConnectorId) {
  const item = definition(provider)!;
  const headers: Record<string, string> = { Accept: "application/json" };
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

function rowsFrom(payload: any): Record<string, any>[] {
  if (Array.isArray(payload)) return payload;
  const candidates = [payload?.value, payload?.results, payload?.data, payload?.items, payload?.records, payload?.d?.results, payload?.result];
  return candidates.find(Array.isArray) || [];
}

async function vendorFetch(provider: TurkeyConnectorId, path: string) {
  const item = definition(provider)!;
  const base = env(item.env.baseUrl);
  if (!base) throw new Error("Connector base URL is not configured.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(joinUrl(base, path), { method: "GET", cache: "no-store", signal: controller.signal, headers: await headersFor(provider) });
    if (!response.ok) throw new Error(`Provider request failed with HTTP ${response.status}`);
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { throw new Error("Provider returned an invalid JSON response"); }
  } finally {
    clearTimeout(timer);
  }
}

function previewRows(domain: string, rows: any[]) {
  return rows.slice(0, 25).map((row) => {
    if (domain === "employees") return { ...row, employeeCode: maskIdentifier(row.employeeCode), name: maskName(row.name), email: maskEmail(row.email) };
    if (domain === "payroll") return { ...row, employeeCode: maskIdentifier(row.employeeCode), employeeName: maskName(row.employeeName), grossSalary: "••••", netSalary: "••••" };
    return { ...row, employeeCode: maskIdentifier(row.employeeCode), employeeName: maskName(row.employeeName), firstIn: row.firstIn ? "••:••" : undefined, lastOut: row.lastOut ? "••:••" : undefined };
  });
}

function employeePayload(row: CanonicalEmployeeMaster) {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(String(row.hireDate || "")) ? row.hireDate : undefined;
  return {
    external_id: String(row.employeeCode || "").slice(0, 80) || null,
    full_name: String(row.name || "").slice(0, 200),
    email: row.email || null,
    department: String(row.department || "").slice(0, 160) || null,
    position: String(row.position || "").slice(0, 200) || null,
    hire_date: isoDate || null,
    employment_type: String(row.employmentType || "").slice(0, 48) || null,
    location: String(row.location || row.branch || "").slice(0, 160) || null,
  };
}

async function syncEmployees(rows: CanonicalEmployeeMaster[]) {
  const existingResponse = await fetchWithSession("/api/v1/employees");
  if (!existingResponse) throw new Error("Secure backend session is unavailable");
  if (!existingResponse.ok) throw new Error(`Employee master access failed with HTTP ${existingResponse.status}`);
  const existing = await existingResponse.json().catch(() => []);
  const byExternalId = new Map<string, any>();
  const byEmail = new Map<string, any>();
  for (const item of Array.isArray(existing) ? existing : []) {
    if (item?.external_id) byExternalId.set(String(item.external_id), item);
    if (item?.email) byEmail.set(String(item.email).toLowerCase(), item);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of rows.slice(0, MAX_VENDOR_ROWS)) {
    if (!row?.name || !row?.department || !row?.position) { skipped += 1; continue; }
    const payload = employeePayload(row);
    const match = byExternalId.get(String(row.employeeCode || "")) || (row.email ? byEmail.get(String(row.email).toLowerCase()) : null);
    const path = match?.id ? `/api/v1/employees/${encodeURIComponent(String(match.id))}` : "/api/v1/employees";
    const response = await fetchWithSession(path, { method: match?.id ? "PATCH" : "POST", body: JSON.stringify(payload) });
    if (!response?.ok) { skipped += 1; continue; }
    const saved = await response.json().catch(() => null);
    if (saved?.external_id) byExternalId.set(String(saved.external_id), saved);
    if (saved?.email) byEmail.set(String(saved.email).toLowerCase(), saved);
    if (match?.id) updated += 1; else created += 1;
  }
  return { created, updated, skipped, processed: created + updated };
}

export async function GET(_request: Request, context: { params: Promise<{ provider: string }> }) {
  const auth = await requireConnectorAdmin();
  if (auth.response) return auth.response;
  const { provider } = await context.params;
  if (!ALLOWED.has(provider as TurkeyConnectorId)) return json({ error: "Unsupported connector" }, 404);
  const item = definition(provider)!;
  return json({ ...safeStatus(provider as TurkeyConnectorId), name: item.name, family: item.family, transport: item.transport, description: item.description });
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const auth = await requireConnectorAdmin();
  if (auth.response) return auth.response;
  if (!isSameOriginRequest(request)) return json({ error: "Cross-origin connector mutation blocked" }, 403);

  const { provider } = await context.params;
  if (!ALLOWED.has(provider as TurkeyConnectorId)) return json({ error: "Unsupported connector" }, 404);
  const id = provider as TurkeyConnectorId;
  if (id === "excel") return json({ provider: id, state: "built_in", ok: true, message: "Excel onboarding kontrollü dosya aktarımı üzerinden çalışır." });

  const status = safeStatus(id);
  if (!status.configured) return json({ ...status, ok: false, message: "Connector hazır; server-side credential ve endpoint ayarları bekleniyor." }, 409);

  const item = definition(id)!;
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "health").toLowerCase();
  if (!new Set(["health", "preview", "sync"]).has(action)) return json({ provider: id, ok: false, message: "Unsupported connector action" }, 400);
  const domain = String(body?.domain || "employees").toLowerCase();
  if (!["employees", "payroll", "attendance"].includes(domain)) return json({ provider: id, ok: false, message: "Unsupported connector domain" }, 400);

  try {
    if (action === "health") {
      const path = env(item.env.healthPath) || env(item.env.employeePath) || "/";
      await vendorFetch(id, path);
      return json({ provider: id, ok: true, state: "active", message: "Bağlantı doğrulandı. Credential ve provider payload'u tarayıcıya aktarılmadı." });
    }

    const path = domain === "payroll" ? env(item.env.payrollPath) : domain === "attendance" ? env(item.env.attendancePath) : env(item.env.employeePath);
    if (!path) return json({ provider: id, ok: false, message: `${domain} endpoint path'i yapılandırılmamış.` }, 422);
    const payload = await vendorFetch(id, path);
    const raw = rowsFrom(payload).slice(0, MAX_VENDOR_ROWS);
    const normalized = domain === "payroll"
      ? raw.map((row) => normalizePayrollRecord(row, id)).filter(Boolean)
      : domain === "attendance"
        ? raw.map((row) => normalizeAttendanceRecord(row, id)).filter(Boolean)
        : raw.map(normalizeEmployeeMaster).filter(Boolean);

    if (action === "preview") {
      return json({ provider: id, ok: true, state: "active", domain, rawCount: raw.length, normalizedCount: normalized.length, rows: previewRows(domain, normalized), truncated: normalized.length > 25, redacted: true });
    }

    if (!canPersistConnectorDomain(domain)) {
      return json({ provider: id, ok: false, state: "server_ingest_required", domain, message: `${domain} senkronizasyonu tarayıcı depolamasına kapatıldı. Tenant-scoped server ingest adapter'i tamamlanmadan kalıcı sync yapılmaz.` }, 501);
    }

    const stats = await syncEmployees(normalized as CanonicalEmployeeMaster[]);
    return json({ provider: id, ok: true, state: "active", domain, normalizedCount: normalized.length, synced: stats.processed, created: stats.created, updated: stats.updated, skipped: stats.skipped, truncated: raw.length >= MAX_VENDOR_ROWS });
  } catch (error) {
    const message = error instanceof Error && /HTTP \d{3}|not configured|invalid JSON|unavailable/.test(error.message) ? error.message : "Connector operation failed";
    return json({ provider: id, ok: false, state: "error", message }, 502);
  }
}
