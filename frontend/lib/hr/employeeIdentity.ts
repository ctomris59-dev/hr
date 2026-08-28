export const EMPLOYEE_IDENTITY_VERSION = "FHR-IDENTITY-1.0" as const;

export function normalizeEmployeeName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

export function employeeId(person: any): string {
  return String(person?.id ?? person?.employee_id ?? person?.employeeCode ?? person?.["Personel Kodu"] ?? "").trim();
}

export function employeeName(person: any): string {
  return String(person?.["Ad Soyad"] ?? person?.name ?? person?.Personel ?? person?.target ?? "").trim();
}

export function employeeKey(person: any): string {
  const id = employeeId(person);
  if (id) return `id:${id}`;
  const name = normalizeEmployeeName(employeeName(person));
  return name ? `name:${name}` : "unknown";
}

export function evaluationSubjectName(record: any): string {
  return String(record?.Personel ?? record?.target ?? record?.["Ad Soyad"] ?? record?.name ?? "").trim();
}

export function recordTimestamp(record: any, fallback = 0): number {
  const value = record?.date ?? record?.Tarih ?? record?.createdAt ?? record?.timestamp ?? record?.updatedAt;
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function latestEvaluationMap(history: any[]): Map<string, any> {
  const map = new Map<string, any>();
  history.forEach((record, index) => {
    const key = normalizeEmployeeName(evaluationSubjectName(record));
    if (!key) return;
    const current = map.get(key);
    if (!current || recordTimestamp(record, index) >= recordTimestamp(current, -1)) map.set(key, record);
  });
  return map;
}

export function latestEvaluationForEmployee(person: any, history: any[]): any | null {
  const key = normalizeEmployeeName(employeeName(person));
  return key ? latestEvaluationMap(history).get(key) ?? null : null;
}

export function evaluationsForEmployee(person: any, history: any[]): any[] {
  const key = normalizeEmployeeName(employeeName(person));
  if (!key) return [];
  return history
    .map((record, index) => ({ record, order: recordTimestamp(record, index) }))
    .filter(({ record }) => normalizeEmployeeName(evaluationSubjectName(record)) === key)
    .sort((a, b) => b.order - a.order)
    .map(({ record }) => record);
}

export function findEmployee(org: any[], reference: unknown): any | null {
  const raw = String(reference ?? "").trim();
  if (!raw) return null;
  const byId = org.find((person) => employeeId(person) === raw);
  if (byId) return byId;
  const normalized = normalizeEmployeeName(raw);
  return org.find((person) => normalizeEmployeeName(employeeName(person)) === normalized) ?? null;
}

export function duplicateEmployeeKeys(org: any[]): { duplicateIds: string[]; duplicateNames: string[] } {
  const ids = new Map<string, number>();
  const names = new Map<string, number>();
  org.forEach((person) => {
    const id = employeeId(person);
    const name = normalizeEmployeeName(employeeName(person));
    if (id) ids.set(id, (ids.get(id) || 0) + 1);
    if (name) names.set(name, (names.get(name) || 0) + 1);
  });
  return {
    duplicateIds: Array.from(ids.entries()).filter(([, count]) => count > 1).map(([key]) => key),
    duplicateNames: Array.from(names.entries()).filter(([, count]) => count > 1).map(([key]) => key),
  };
}
