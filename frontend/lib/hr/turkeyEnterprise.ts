export type TurkeyConnectorId = "excel" | "logo" | "netsis" | "mikro" | "sap_successfactors" | "pdks" | "payroll";
export type ConnectorCapability = "employees" | "organization" | "payroll" | "attendance" | "leave" | "performance";
export type ConnectorState = "built_in" | "ready_for_credentials" | "configured" | "active" | "error";

export interface TurkeyConnectorDefinition {
  id: TurkeyConnectorId;
  name: string;
  family: string;
  description: string;
  capabilities: ConnectorCapability[];
  transport: "file" | "rest" | "odata";
  documentationHint: string;
  env: { baseUrl?: string; apiKey?: string; clientId?: string; clientSecret?: string; employeePath?: string; payrollPath?: string; attendancePath?: string; healthPath?: string };
}

export interface CanonicalEmployeeMaster {
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  manager1?: string;
  manager2?: string;
  hireDate?: string;
  terminationDate?: string;
  email?: string;
  location?: string;
  branch?: string;
  costCenter?: string;
  employmentType?: string;
  workforceType?: string;
  headcountStatus?: string;
}

export interface CanonicalPayrollRecord {
  employeeCode: string;
  employeeName?: string;
  period: string;
  grossSalary?: number;
  netSalary?: number;
  currency: string;
  source: TurkeyConnectorId | string;
}

export interface CanonicalAttendanceRecord {
  employeeCode: string;
  employeeName?: string;
  date: string;
  firstIn?: string;
  lastOut?: string;
  workedMinutes?: number;
  overtimeMinutes?: number;
  absenceMinutes?: number;
  source: TurkeyConnectorId | string;
}

export interface IntegrationRunRecord {
  id: string;
  provider: TurkeyConnectorId;
  startedAt: string;
  completedAt?: string;
  action: "health" | "preview" | "sync";
  status: "success" | "warning" | "error";
  imported?: number;
  skipped?: number;
  message: string;
}

export const TURKEY_CONNECTORS: TurkeyConnectorDefinition[] = [
  {
    id: "excel", name: "Excel / CSV Onboarding", family: "Dosya", transport: "file",
    description: "Özlük, organizasyon, ücret, PDKS ve değerlendirme verilerini kontrollü eşleme ve önizleme ile FutureHR'a alır.",
    capabilities: ["employees", "organization", "payroll", "attendance", "performance"],
    documentationHint: "FutureHR canonical import", env: {},
  },
  {
    id: "logo", name: "Logo HR / ERP", family: "ERP & Bordro", transport: "rest",
    description: "Logo tarafındaki personel/organizasyon ve ücret verisini kurumun lisanslı API/servis katmanı üzerinden FutureHR'a senkronize etmek için adapter.",
    capabilities: ["employees", "organization", "payroll", "leave"], documentationHint: "Logo ürün/API sözleşmesine göre endpoint path'leri tenant bazında yapılandırılır.",
    env: { baseUrl: "FUTUREHR_LOGO_BASE_URL", apiKey: "FUTUREHR_LOGO_API_KEY", employeePath: "FUTUREHR_LOGO_EMPLOYEES_PATH", payrollPath: "FUTUREHR_LOGO_PAYROLL_PATH", healthPath: "FUTUREHR_LOGO_HEALTH_PATH" },
  },
  {
    id: "netsis", name: "Logo Netsis / NetOpenX", family: "ERP & Bordro", transport: "rest",
    description: "NetOpenX/REST servislerinden personel, organizasyon ve ücret verisini canonical FutureHR modeline dönüştürür.",
    capabilities: ["employees", "organization", "payroll"], documentationHint: "NetOpenX REST servisleri; müşteri lisansı ve endpoint yapısına göre path ayarlanır.",
    env: { baseUrl: "FUTUREHR_NETSIS_BASE_URL", apiKey: "FUTUREHR_NETSIS_API_KEY", employeePath: "FUTUREHR_NETSIS_EMPLOYEES_PATH", payrollPath: "FUTUREHR_NETSIS_PAYROLL_PATH", healthPath: "FUTUREHR_NETSIS_HEALTH_PATH" },
  },
  {
    id: "mikro", name: "Mikro Desktop API", family: "ERP & Bordro", transport: "rest",
    description: "Mikro REST/JSON API çıktısını çalışan master-data ve ücret kayıtlarına normalize eder.",
    capabilities: ["employees", "organization", "payroll"], documentationHint: "Mikro Desktop API REST/JSON; API_KEY ve kurum endpoint'i gerekir.",
    env: { baseUrl: "FUTUREHR_MIKRO_BASE_URL", apiKey: "FUTUREHR_MIKRO_API_KEY", employeePath: "FUTUREHR_MIKRO_EMPLOYEES_PATH", payrollPath: "FUTUREHR_MIKRO_PAYROLL_PATH", healthPath: "FUTUREHR_MIKRO_HEALTH_PATH" },
  },
  {
    id: "sap_successfactors", name: "SAP SuccessFactors Employee Central", family: "HCM", transport: "odata",
    description: "Employee Central OData/Compound Employee tabanlı master-data senkronizasyonu için güvenli server-side adapter.",
    capabilities: ["employees", "organization", "leave"], documentationHint: "OData/Compound Employee; tenant OAuth/service credentials gerekir.",
    env: { baseUrl: "FUTUREHR_SAP_BASE_URL", clientId: "FUTUREHR_SAP_CLIENT_ID", clientSecret: "FUTUREHR_SAP_CLIENT_SECRET", employeePath: "FUTUREHR_SAP_EMPLOYEES_PATH", healthPath: "FUTUREHR_SAP_HEALTH_PATH" },
  },
  {
    id: "pdks", name: "PDKS / Puantaj", family: "Zaman & Devam", transport: "rest",
    description: "Kart basma, vardiya ve puantaj kayıtlarını çalışan kimliği üzerinden FutureHR işgücü analizlerine taşır.",
    capabilities: ["attendance", "leave"], documentationHint: "Vendor bağımsız REST adapter; endpoint ve alan eşlemesi kurum bazında tanımlanır.",
    env: { baseUrl: "FUTUREHR_PDKS_BASE_URL", apiKey: "FUTUREHR_PDKS_API_KEY", attendancePath: "FUTUREHR_PDKS_ATTENDANCE_PATH", healthPath: "FUTUREHR_PDKS_HEALTH_PATH" },
  },
  {
    id: "payroll", name: "Bordro Veri Köprüsü", family: "Ücret", transport: "rest",
    description: "Mevcut bordro sisteminden sadece FutureHR karar katmanı için gereken ücret alanlarını alır; bordro hesaplamasını FutureHR'a taşımaz.",
    capabilities: ["payroll"], documentationHint: "Vendor bağımsız bordro adapter; minimum veri ilkesi uygulanır.",
    env: { baseUrl: "FUTUREHR_PAYROLL_BASE_URL", apiKey: "FUTUREHR_PAYROLL_API_KEY", payrollPath: "FUTUREHR_PAYROLL_PATH", healthPath: "FUTUREHR_PAYROLL_HEALTH_PATH" },
  },
];

const tr = (value: unknown) => String(value ?? "").trim();
const norm = (value: unknown) => tr(value).toLocaleLowerCase("tr-TR").replace(/[._\-/\\]+/g, " ").replace(/\s+/g, " ");
const money = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  let raw = tr(value).replace(/[^0-9,.-]/g, ""); if (!raw) return undefined;
  const comma = raw.lastIndexOf(","), dot = raw.lastIndexOf(".");
  if (comma > dot) raw = raw.replace(/\./g, "").replace(",", "."); else if (dot > comma && comma >= 0) raw = raw.replace(/,/g, "");
  const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : undefined;
};
const pick = (row: Record<string, any>, aliases: string[]) => {
  const keys = Object.keys(row); const found = keys.find((key) => aliases.includes(norm(key)) || aliases.some((alias) => norm(key).includes(alias)));
  return found ? row[found] : undefined;
};

export function normalizeEmployeeMaster(row: Record<string, any>): CanonicalEmployeeMaster | null {
  const employeeCode = tr(pick(row, ["personel kodu","personel no","sicil no","sicil","employee id","employee code","userid","user id"]));
  const name = tr(pick(row, ["ad soyad","adı soyadı","adi soyadi","personel adı","employee name","full name","displayname"]));
  const department = tr(pick(row, ["departman","bölüm","bolum","birim","organizasyon birimi","department","department name"]));
  const position = tr(pick(row, ["pozisyon","ünvan","unvan","görev","job title","position","title"]));
  if (!name || !department || !position) return null;
  return {
    employeeCode: employeeCode || name,
    name, department, position,
    manager1: tr(pick(row,["yönetici 1","yonetici 1","amir","manager","manager name"])) || undefined,
    manager2: tr(pick(row,["yönetici 2","yonetici 2","üst yönetici","manager 2"])) || undefined,
    hireDate: tr(pick(row,["işe giriş tarihi","ise giris tarihi","hire date","start date","employmentstartdate"])) || undefined,
    terminationDate: tr(pick(row,["işten çıkış tarihi","isten cikis tarihi","termination date","end date"])) || undefined,
    email: tr(pick(row,["e posta","e-posta","email","mail","business email"])) || undefined,
    location: tr(pick(row,["lokasyon","location","location name"])) || undefined,
    branch: tr(pick(row,["şube","sube","branch","işyeri","isyeri"])) || undefined,
    costCenter: tr(pick(row,["maliyet merkezi","masraf merkezi","cost center","costcentre"])) || undefined,
    employmentType: tr(pick(row,["çalışan tipi","calisan tipi","employment type","sözleşme tipi"])) || undefined,
    workforceType: tr(pick(row,["işgücü tipi","isgucu tipi","yaka","workforce type"])) || undefined,
    headcountStatus: tr(pick(row,["kadro durumu","headcount status","employment status","status"])) || undefined,
  };
}

export function normalizePayrollRecord(row: Record<string, any>, source: string): CanonicalPayrollRecord | null {
  const employeeCode = tr(pick(row,["personel kodu","personel no","sicil no","employee id","employee code"]));
  const employeeName = tr(pick(row,["ad soyad","personel adı","employee name","full name"]));
  const period = tr(pick(row,["dönem","donem","bordro dönemi","payroll period","period","ay"]));
  if ((!employeeCode && !employeeName) || !period) return null;
  return { employeeCode: employeeCode || employeeName, employeeName: employeeName || undefined, period,
    grossSalary: money(pick(row,["brüt ücret","brut ucret","brüt maaş","gross salary","gross pay"])),
    netSalary: money(pick(row,["net ücret","net ucret","net maaş","net salary","net pay"])),
    currency: tr(pick(row,["para birimi","currency","döviz","doviz"])) || "TRY", source,
  };
}

export function normalizeAttendanceRecord(row: Record<string, any>, source: string): CanonicalAttendanceRecord | null {
  const employeeCode = tr(pick(row,["personel kodu","personel no","sicil no","employee id","employee code"]));
  const employeeName = tr(pick(row,["ad soyad","personel adı","employee name","full name"]));
  const date = tr(pick(row,["tarih","date","gün","gun","work date"]));
  if ((!employeeCode && !employeeName) || !date) return null;
  const minutes = (v: unknown) => { const n = money(v); return n == null ? undefined : Math.round(n); };
  return { employeeCode: employeeCode || employeeName, employeeName: employeeName || undefined, date,
    firstIn: tr(pick(row,["ilk giriş","ilk giris","giriş","giris","first in","clock in"])) || undefined,
    lastOut: tr(pick(row,["son çıkış","son cikis","çıkış","cikis","last out","clock out"])) || undefined,
    workedMinutes: minutes(pick(row,["çalışılan dakika","calisilan dakika","worked minutes","çalışma dakika"])),
    overtimeMinutes: minutes(pick(row,["fazla mesai dakika","overtime minutes","fazla mesai"])),
    absenceMinutes: minutes(pick(row,["eksik mesai dakika","absence minutes","eksik çalışma"])), source,
  };
}

export function readinessChecklist() {
  return [
    { id:"erp", label:"Logo / Mikro / Netsis / SAP entegrasyon mimarisi", critical:true },
    { id:"excel", label:"Excel'den kontrollü onboarding", critical:true },
    { id:"pdks", label:"PDKS / puantaj veri köprüsü", critical:false },
    { id:"payroll", label:"Bordro sisteminden ücret verisi", critical:true },
    { id:"master", label:"Organizasyon / özlük master-data sync", critical:true },
    { id:"privacy", label:"KVKK + audit + RBAC", critical:true },
    { id:"reports", label:"Türkçe yönetici raporları", critical:true },
    { id:"leave", label:"Türkiye izin / İş Kanunu kuralları", critical:false },
    { id:"sso", label:"Microsoft Entra / Google SSO readiness", critical:false },
    { id:"mobile", label:"Mobil çalışan / yönetici deneyimi", critical:false },
  ];
}
