import { NextResponse } from "next/server";
import { canManageConnectors, canPersistConnectorDomain, maskEmail, maskIdentifier, maskName } from "@/lib/hr/connectorSecurity";
import { TURKEY_CONNECTORS, normalizeAttendanceRecord, normalizeEmployeeMaster, normalizePayrollRecord, type TurkeyConnectorId } from "@/lib/hr/turkeyEnterprise";
import { fetchWithSession, getSecureUserFromSession, isSameOriginRequest } from "@/lib/saasAuthServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRow = Record<string, unknown>;

const ALLOWED = new Set(TURKEY_CONNECTORS.map((item) => item.id));
const MAX_VENDOR_ROWS = 5000;
const EXPECTED_INGEST_SCHEMA = "20260902_0006";
const env = (name?: string) => name ? String(process.env[name] || "").trim() : "";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", Vary: "Cookie" } });
}

function asObject(value: unknown): JsonRow | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRow : null;
}

function compactRows(values: unknown[]): JsonRow[] {
  return values.map(asObject).filter((row): row is JsonRow => row !== null);
}

async function requireConnectorAdmin() {
  const user = await getSecureUserFromSession();
  if (!user) return { user: null, response: json({ error: "Authentication required" }, 401) };
  if (!canManageConnectors(user.role)) return { user, response: json({ error: "Connector administration requires an HR administrator role" }, 403) };
  return { user, response: null };
}

async function secureIngestReadiness() {
  try {
    const response = await fetchWithSession("/api/v1/integrations/readiness");
    if (!response?.ok) return false;
    const payload = asObject(await response.json().catch(() => null));
    return payload?.ready === true && String(payload.schema_revision || "") === EXPECTED_INGEST_SCHEMA;
  } catch {
    return false;
  }
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
    const payload = asObject(await response.json().catch(() => null));
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

function rowsFrom(payload: unknown): JsonRow[] {
  if (Array.isArray(payload)) return compactRows(payload);
  const root = asObject(payload);
  if (!root) return [];
  const nestedD = asObject(root.d);
  const candidates: unknown[] = [root.value, root.results, root.data, root.items, root.records, nestedD?.results, root.result];
  const rows = candidates.find(Array.isArray);
  return Array.isArray(rows) ? compactRows(rows) : [];
}

async function vendorFetch(provider: TurkeyConnectorId, path: string): Promise<unknown> {
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
    try { return JSON.parse(text) as unknown; } catch { throw new Error("Provider returned an invalid JSON response"); }
  } finally {
    clearTimeout(timer);
  }
}

function previewRows(domain: string, rows: JsonRow[]) {
  return rows.slice(0, 25).map((row) => {
    if (domain === "employees") return { ...row, employeeCode: maskIdentifier(row.employeeCode), name: maskName(row.name), email: maskEmail(row.email) };
    if (domain === "payroll") return { ...row, employeeCode: maskIdentifier(row.employeeCode), employeeName: maskName(row.employeeName), grossSalary: "••••", netSalary: "••••" };
    return { ...row, employeeCode: maskIdentifier(row.employeeCode), employeeName: maskName(row.employeeName), firstIn: row.firstIn ? "••:••" : undefined, lastOut: row.lastOut ? "••:••" : undefined };
  });
}

function isoDate(value: unknown) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  const local = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (local) return `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  return "";
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serverRecords(domain: string, rows: JsonRow[]) {
  if (domain === "employees") {
    return rows.map((row) => ({
      employee_code: String(row.employeeCode || "").trim(),
      full_name: String(row.name || "").trim(),
      email: row.email ? String(row.email) : null,
      department: String(row.department || "").trim(),
      position: String(row.position || "").trim(),
      hire_date: isoDate(row.hireDate) || null,
      employment_type: row.employmentType ? String(row.employmentType) : null,
      location: row.location ? String(row.location) : row.branch ? String(row.branch) : null,
    })).filter((row) => row.employee_code && row.full_name && row.department && row.position);
  }
  if (domain === "payroll") {
    return rows.map((row) => ({
      employee_code: String(row.employeeCode || "").trim(),
      period: String(row.period || "").trim(),
      gross_salary: optionalNumber(row.grossSalary),
      net_salary: optionalNumber(row.netSalary),
      currency: String(row.currency || "TRY").trim().toUpperCase(),
    })).filter((row) => row.employee_code && row.period);
  }
  return rows.map((row) => ({
    employee_code: String(row.employeeCode || "").trim(),
    work_date: isoDate(row.date),
    first_in: row.firstIn ? String(row.firstIn) : null,
    last_out: row.lastOut ? String(row.lastOut) : null,
    worked_minutes: optionalNumber(row.workedMinutes),
    overtime_minutes: optionalNumber(row.overtimeMinutes),
    absence_minutes: optionalNumber(row.absenceMinutes),
  })).filter((row) => row.employee_code && row.work_date);
}

async function syncServerDomain(provider: TurkeyConnectorId, domain: string, normalized: JsonRow[]) {
  if (!canPersistConnectorDomain(domain)) throw new Error("Unsupported persistent connector domain");
  const records = serverRecords(domain, normalized);
  if (!records.length) return { domain, received: normalized.length, processed: 0, created: 0, updated: 0, skipped: normalized.length };
  const response = await fetchWithSession(`/api/v1/integrations/ingest/${domain}`, {
    method: "POST",
    body: JSON.stringify({ provider, records }),
  });
  if (!response) throw new Error("Secure backend session is unavailable");
  if (!response.ok) throw new Error(`Secure ${domain} ingest failed with HTTP ${response.status}`);
  const payload = asObject(await response.json().catch(() => null));
  if (!payload || !Number.isFinite(Number(payload.processed))) throw new Error("Secure ingest returned an invalid response");
  return payload;
}

export async function GET(_request: Request, context: { params: Promise<{ provider: string }> }) {
  const auth = await requireConnectorAdmin();
  if (auth.response) return auth.response;
  const { provider } = await context.params;
  if (!ALLOWED.has(provider as TurkeyConnectorId)) return json({ error: "Unsupported connector" }, 404);
  const item = definition(provider)!;
  const status = safeStatus(provider as TurkeyConnectorId);
  if (provider === "excel") return json({ ...status, ingestReady: true, name: item.name, family: item.family, transport: item.transport, description: item.description });
  const ingestReady = await secureIngestReadiness();
  return json({
    ...status,
    configured: status.configured && ingestReady,
    state: status.configured && !ingestReady ? "backend_upgrade_required" : status.state,
    ingestReady,
    name: item.name,
    family: item.family,
    transport: item.transport,
    description: item.description,
  });
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
  const body = asObject(await request.json().catch(() => null)) || {};
  const action = String(body.action || "health").toLowerCase();
  if (!new Set(["health", "preview", "sync"]).has(action)) return json({ provider: id, ok: false, message: "Unsupported connector action" }, 400);
  const domain = String(body.domain || "employees").toLowerCase();
  if (!["employees", "payroll", "attendance"].includes(domain)) return json({ provider: id, ok: false, message: "Unsupported connector domain" }, 400);

  if (action === "sync" && !(await secureIngestReadiness())) {
    return json({
      provider: id,
      ok: false,
      state: "backend_upgrade_required",
      message: "Secure tenant ingest backend is not ready. Deploy the backend revision and apply migration 20260902_0006 before syncing.",
    }, 503);
  }

  try {
    if (action === "health") {
      const path = env(item.env.healthPath) || env(item.env.employeePath) || env(item.env.payrollPath) || env(item.env.attendancePath) || "/";
      await vendorFetch(id, path);
      return json({ provider: id, ok: true, state: "active", message: "Bağlantı doğrulandı. Credential ve provider payload'u tarayıcıya aktarılmadı." });
    }

    const path = domain === "payroll" ? env(item.env.payrollPath) : domain === "attendance" ? env(item.env.attendancePath) : env(item.env.employeePath);
    if (!path) return json({ provider: id, ok: false, message: `${domain} endpoint path'i yapılandırılmamış.` }, 422);
    const vendorRows = rowsFrom(await vendorFetch(id, path));
    const raw = vendorRows.slice(0, MAX_VENDOR_ROWS);
    const normalized = domain === "payroll"
      ? compactRows(raw.map((row) => normalizePayrollRecord(row, id)).filter(Boolean))
      : domain === "attendance"
        ? compactRows(raw.map((row) => normalizeAttendanceRecord(row, id)).filter(Boolean))
        : compactRows(raw.map((row) => normalizeEmployeeMaster(row)).filter(Boolean));

    if (action === "preview") {
      return json({ provider: id, ok: true, state: "active", domain, rawCount: vendorRows.length, normalizedCount: normalized.length, rows: previewRows(domain, normalized), truncated: vendorRows.length > MAX_VENDOR_ROWS, redacted: true });
    }

    const stats = await syncServerDomain(id, domain, normalized);
    const normalizationSkipped = Math.max(0, raw.length - normalized.length);
    return json({
      provider: id,
      ok: true,
      state: "active",
      domain,
      normalizedCount: normalized.length,
      synced: Number(stats.processed || 0),
      created: Number(stats.created || 0),
      updated: Number(stats.updated || 0),
      skipped: Number(stats.skipped || 0) + normalizationSkipped,
      truncated: vendorRows.length > MAX_VENDOR_ROWS,
    });
  } catch (error) {
    const message = error instanceof Error && /HTTP \d{3}|not configured|invalid JSON|unavailable/.test(error.message) ? error.message : "Connector operation failed";
    return json({ provider: id, ok: false, state: "error", message }, 502);
  }
}
