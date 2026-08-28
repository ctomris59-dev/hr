export type ImportSource = "excel" | "logo" | "mikro" | "netsis";
export type CanonicalField = "employeeCode" | "name" | "department" | "position" | "manager1" | "manager2" | "hireDate" | "salary";

export interface CanonicalFieldDefinition {
  key: CanonicalField;
  label: string;
  required?: boolean;
  sensitive?: boolean;
  aliases: string[];
}

export interface ImportLogEntry {
  id: string;
  timestamp: string;
  source: ImportSource;
  fileName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  updatedRows: number;
  createdRows: number;
  mappedFields: number;
}

export const IMPORT_LOG_KEY = "futurehr_data_import_log_v1";

export const FIELD_DEFINITIONS: CanonicalFieldDefinition[] = [
  { key: "employeeCode", label: "Personel Kodu", aliases: ["personel kodu", "sicil no", "sicil numarası", "sicil numarasi", "sicil", "personel no", "personel numarası", "employee id", "employee code", "kod"] },
  { key: "name", label: "Ad Soyad", required: true, aliases: ["ad soyad", "adı soyadı", "adi soyadi", "personel adı", "personel adi", "çalışan", "calisan", "çalışan adı", "employee name", "full name", "adsoyad"] },
  { key: "department", label: "Departman", required: true, aliases: ["departman", "bölüm", "bolum", "departmanı", "departmani", "birim", "organizasyon birimi", "department"] },
  { key: "position", label: "Pozisyon / Ünvan", required: true, aliases: ["pozisyon", "ünvan", "unvan", "görev", "gorev", "görevi", "job title", "position", "title"] },
  { key: "manager1", label: "1. Yönetici", aliases: ["yönetici 1", "yonetici 1", "birinci yönetici", "birinci yonetici", "bağlı olduğu yönetici", "bagli oldugu yonetici", "amir", "manager", "manager 1"] },
  { key: "manager2", label: "2. Yönetici", aliases: ["yönetici 2", "yonetici 2", "ikinci yönetici", "ikinci yonetici", "üst yönetici", "ust yonetici", "manager 2"] },
  { key: "hireDate", label: "İşe Giriş Tarihi", aliases: ["işe giriş tarihi", "ise giris tarihi", "giriş tarihi", "giris tarihi", "işe başlama tarihi", "ise baslama tarihi", "hire date", "start date"] },
  { key: "salary", label: "Brüt / Mevcut Ücret", sensitive: true, aliases: ["maaş", "maas", "ücret", "ucret", "brüt ücret", "brut ucret", "brüt maaş", "brut maas", "salary", "gross salary"] },
];

const SOURCE_HINTS: Record<ImportSource, Record<CanonicalField, string[]>> = {
  excel: {} as Record<CanonicalField, string[]>,
  logo: {
    employeeCode: ["sicil no", "sicilnumarası", "personel kodu"], name: ["adı soyadı", "ad soyad"], department: ["bölüm", "departman"], position: ["ünvan", "görev"], manager1: ["amir"], manager2: [], hireDate: ["işe giriş tarihi"], salary: ["brüt ücret"],
  },
  mikro: {
    employeeCode: ["personel kodu", "sicil no"], name: ["personel adı", "adı soyadı"], department: ["departman", "birim"], position: ["görev", "ünvan"], manager1: ["yönetici"], manager2: [], hireDate: ["işe giriş tarihi"], salary: ["brüt maaş"],
  },
  netsis: {
    employeeCode: ["sicil no", "personel no"], name: ["ad soyad", "personel adı"], department: ["bölüm", "departman"], position: ["ünvan", "görev"], manager1: ["amir"], manager2: [], hireDate: ["giriş tarihi"], salary: ["ücret", "brüt ücret"],
  },
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[._\-/\\]+/g, " ")
    .replace(/\s+/g, " ");
}

export function autoMapHeaders(headers: string[], source: ImportSource): Partial<Record<CanonicalField, string>> {
  const normalized = headers.map((header) => ({ raw: header, normalized: normalizeHeader(header) }));
  const result: Partial<Record<CanonicalField, string>> = {};

  FIELD_DEFINITIONS.forEach((field) => {
    const sourceHints = SOURCE_HINTS[source]?.[field.key] || [];
    const candidates = [...sourceHints, ...field.aliases].map(normalizeHeader);
    const exact = normalized.find((header) => candidates.includes(header.normalized));
    if (exact) {
      result[field.key] = exact.raw;
      return;
    }
    const fuzzy = normalized.find((header) => candidates.some((candidate) => candidate.length >= 4 && (header.normalized.includes(candidate) || candidate.includes(header.normalized))));
    if (fuzzy) result[field.key] = fuzzy.raw;
  });

  return result;
}

export function readImportLog(): ImportLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(IMPORT_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendImportLog(entry: Omit<ImportLogEntry, "id" | "timestamp">): ImportLogEntry {
  const record: ImportLogEntry = {
    ...entry,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `import-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(IMPORT_LOG_KEY, JSON.stringify([record, ...readImportLog()].slice(0, 100)));
      window.dispatchEvent(new CustomEvent("futurehrImportLogUpdated", { detail: record }));
    } catch {
      // Logging must not block an import.
    }
  }
  return record;
}

export function canonicalEmployeeFromRow(row: Record<string, any>, mapping: Partial<Record<CanonicalField, string>>) {
  const value = (key: CanonicalField) => {
    const header = mapping[key];
    return header ? row[header] : undefined;
  };
  const salaryRaw = value("salary");
  const salary = typeof salaryRaw === "number" ? salaryRaw : Number(String(salaryRaw ?? "").replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", "."));

  return {
    id: value("employeeCode") ? String(value("employeeCode")).trim() : undefined,
    "Ad Soyad": String(value("name") ?? "").trim(),
    Departman: String(value("department") ?? "").trim(),
    Pozisyon: String(value("position") ?? "").trim(),
    "Yönetici 1": String(value("manager1") ?? "").trim() || undefined,
    "Yönetici 2": String(value("manager2") ?? "").trim() || undefined,
    "İşe Giriş Tarihi": value("hireDate") ? String(value("hireDate")).trim() : undefined,
    ...(Number.isFinite(salary) && salary > 0 ? { "Maaş (TL)": salary } : {}),
  };
}

export function isValidCanonicalEmployee(employee: Record<string, any>): boolean {
  return Boolean(String(employee["Ad Soyad"] || "").trim() && String(employee.Departman || "").trim() && String(employee.Pozisyon || "").trim());
}
