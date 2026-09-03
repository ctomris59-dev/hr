import type { UserRole } from "../../app/data/roles";
import { hasAccess, mapToUserRole } from "../../app/data/roles";
import { SAAS_DATA_MODE } from "./saasWorkforceClient";
import { activePerformanceCycle, canEditPerformance, ensurePerformanceCycle, PERFORMANCE_STAGE_LABELS } from "./performanceCycle";

export type DataScope = "NONE" | "SELF" | "DIRECT_REPORTS" | "DEPARTMENT" | "COMPANY" | "ASSIGNED" | "AGGREGATE";
export type AccessAction = "view" | "create" | "edit" | "approve" | "export";
export type SensitiveDomain = "salary" | "talent" | "succession";
export type ResourceKey = "people" | "profile" | "performance" | "leave" | "development" | "training" | "experience" | "recruitment" | "salary" | "talent" | "succession";
export type DocumentKey = "employmentContract" | "payroll" | "identity" | "bank" | "medical" | "leaveAttachment" | "disciplinary" | "performanceForm" | "trainingCertificate" | "candidateCv";
export type ModuleKey = "dashboard"|"decision"|"leave"|"experience"|"organization"|"jobArchitecture"|"performance"|"calibration"|"talent"|"skillsGraph"|"training"|"development"|"developmentAnalytics"|"career"|"succession"|"salary"|"compensationFairness"|"recruitment"|"assessment"|"team"|"onboarding"|"admin"|"governance"|"turkiyeCompliance"|"integrations"|"dataImport"|"executiveReports"|"managerSalary"|"accessArchitecture";

export interface ResourceAccess { scope: DataScope; actions: AccessAction[]; }
export interface CompanyAccessPolicy {
  version: 3;
  moduleOverrides: Partial<Record<UserRole, Partial<Record<ModuleKey, boolean>>>>;
  resourceOverrides: Partial<Record<UserRole, Partial<Record<ResourceKey, Partial<ResourceAccess>>>>>;
  documentOverrides: Partial<Record<UserRole, Partial<Record<DocumentKey, Partial<ResourceAccess>>>>>;
  performance: { secondManagerCanEvaluate: boolean; hrCanOverride: boolean; hrOverrideRequiresReason: boolean; };
}
export interface AccessUser { role?: string; name?: string; dept?: string; department?: string; employee_id?: string; employeeId?: string; id?: string; [key: string]: unknown; }
export interface AccessEmployee { id?: string; employee_id?: string; "Ad Soyad"?: string; Departman?: string; "Yönetici 1"?: string; "Yönetici 2"?: string; [key: string]: unknown; }

export const ACCESS_POLICY_STORAGE_KEY = "hr_access_policy_v3";
const LEGACY_ACCESS_POLICY_STORAGE_KEY = "hr_access_policy_v2";
export const ACCESS_ROLES: UserRole[] = ["ceo", "hr_admin", "director", "manager", "employee"];
export const ACCESS_ACTIONS: AccessAction[] = ["view", "create", "edit", "approve", "export"];

export const DEFAULT_COMPANY_ACCESS_POLICY: CompanyAccessPolicy = {
  version: 3,
  moduleOverrides: {},
  resourceOverrides: {},
  documentOverrides: {},
  performance: { secondManagerCanEvaluate: true, hrCanOverride: false, hrOverrideRequiresReason: true },
};

export const MODULE_DEFINITIONS: Array<{ key: ModuleKey; label: string; route: string; sensitive?: SensitiveDomain }> = [
  {key:"dashboard",label:"Yönetici Özeti",route:"/dashboard"},{key:"decision",label:"Karar Motoru",route:"/karar-merkezi"},{key:"leave",label:"İzin Yönetimi",route:"/izinler"},{key:"experience",label:"Çalışan Deneyimi",route:"/calisan-deneyimi"},{key:"organization",label:"Çalışanlar & Organizasyon",route:"/organizasyon"},{key:"jobArchitecture",label:"Rol & Yetkinlik Mimarisi",route:"/rol-mimarisi"},{key:"performance",label:"Performans & Yetkinlik",route:"/degerlendirme"},{key:"calibration",label:"Performans Kalibrasyonu",route:"/kalibrasyon"},{key:"talent",label:"Yetenek & 9-Box",route:"/yetenek-matrisi",sensitive:"talent"},{key:"skillsGraph",label:"Yetkinlik Haritası",route:"/yetkinlik-haritasi",sensitive:"talent"},{key:"training",label:"Eğitim",route:"/egitim"},{key:"development",label:"Gelişim Planı",route:"/gelisim"},{key:"developmentAnalytics",label:"Gelişim Etkinliği",route:"/gelisim-analitigi"},{key:"career",label:"Kariyer Yolu",route:"/kariyer"},{key:"succession",label:"Halefiyet & Yedekleme",route:"/yedekleme",sensitive:"succession"},{key:"salary",label:"Ücret Karar Merkezi",route:"/maas",sensitive:"salary"},{key:"compensationFairness",label:"Ücret Adaleti & Sıkışma",route:"/ucret-adaleti",sensitive:"salary"},{key:"managerSalary",label:"Yönetici Ücret Talepleri",route:"/yonetici/maas-talep"},{key:"recruitment",label:"İşe Alım",route:"/ise-alim"},{key:"assessment",label:"Yetkinlik Testi",route:"/aday-testi"},{key:"team",label:"Ekip",route:"/ekip-yonetimi"},{key:"onboarding",label:"FutureHR Kurulum",route:"/kurulum"},{key:"governance",label:"Güven & KVKK",route:"/admin/guven-kvkk"},{key:"turkiyeCompliance",label:"Türkiye Uyum Katmanı",route:"/turkiye-uyum"},{key:"integrations",label:"Entegrasyon Merkezi",route:"/admin/entegrasyonlar"},{key:"dataImport",label:"Veri Aktarımı",route:"/admin/veri-aktarimi"},{key:"executiveReports",label:"Yönetici Raporları",route:"/yonetici-raporlari"},{key:"admin",label:"Kullanıcı & Yetki",route:"/admin"},{key:"accessArchitecture",label:"Yetki Mimarisi",route:"/ayarlar/yetki-mimarisi"},
];

export const RESOURCE_DEFINITIONS: Array<{ key: ResourceKey; label: string; description: string; sensitive?: boolean }> = [
  { key: "people", label: "Çalışan listesi & organizasyon", description: "İsim, pozisyon, departman, yönetici ilişkileri ve organizasyon görünümü." },
  { key: "profile", label: "Temel özlük profili", description: "İletişim, pozisyon, işe giriş ve çalışan profilindeki temel bilgiler." },
  { key: "performance", label: "Performans & yetkinlik", description: "Hedefler, değerlendirme puanları, notlar ve kalibrasyon kayıtları." },
  { key: "leave", label: "İzin yönetimi", description: "İzin talebi, bakiye, onay durumu ve izin planı." },
  { key: "development", label: "Gelişim & kariyer", description: "Gelişim planları, kariyer hedefleri ve gelişim aksiyonları." },
  { key: "training", label: "Eğitim", description: "Eğitim atamaları, katılım ve tamamlanma bilgileri." },
  { key: "experience", label: "Çalışan deneyimi / pulse", description: "Yönetim rollerinde yalnız toplu-anonim sonuçlar; çalışanda kendi yanıtı." },
  { key: "recruitment", label: "İşe alım & aday", description: "Adaylar, görüşme süreci ve işe alım karar kayıtları." },
  { key: "salary", label: "Maaş & ücret", description: "Bireysel ücret, zam ve ücret karar verileri.", sensitive: true },
  { key: "talent", label: "Potansiyel & 9-Box", description: "Potansiyel, 9-Box, kritik yetenek ve yetenek kararları.", sensitive: true },
  { key: "succession", label: "Halefiyet & yedekleme", description: "Kritik rol, halef adayı ve hazır olma bilgileri.", sensitive: true },
];

export const DOCUMENT_DEFINITIONS: Array<{ key: DocumentKey; label: string; description: string; highlySensitive?: boolean }> = [
  { key: "employmentContract", label: "İş sözleşmesi", description: "Çalışanın iş sözleşmesi ve ekleri." },
  { key: "payroll", label: "Ücret bordrosu", description: "Aylık bordro ve ücret dökümü.", highlySensitive: true },
  { key: "identity", label: "Kimlik / nüfus belgesi", description: "Kimlik ve resmi özlük belgeleri.", highlySensitive: true },
  { key: "bank", label: "Banka / IBAN bilgisi", description: "Ücret ödemesinde kullanılan banka bilgileri.", highlySensitive: true },
  { key: "medical", label: "Sağlık belgesi", description: "Sağlık raporu ve özel nitelikli sağlık belgeleri.", highlySensitive: true },
  { key: "leaveAttachment", label: "İzin / rapor eki", description: "İzin talebine eklenen rapor veya destekleyici belge.", highlySensitive: true },
  { key: "disciplinary", label: "Disiplin / savunma belgesi", description: "Disiplin, savunma ve ilgili karar belgeleri.", highlySensitive: true },
  { key: "performanceForm", label: "Performans formu", description: "Dönem değerlendirme ve hedef formları." },
  { key: "trainingCertificate", label: "Eğitim sertifikası", description: "Çalışanın eğitim ve sertifika belgeleri." },
  { key: "candidateCv", label: "Aday CV / başvuru belgesi", description: "İşe alım adayına ait CV ve başvuru dokümanları.", highlySensitive: true },
];

export const DEFAULT_RESOURCE_ACCESS: Record<ResourceKey, Record<UserRole, ResourceAccess>> = {
  people: {
    ceo: { scope: "COMPANY", actions: ["view", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "create", "edit", "export"] },
    director: { scope: "DEPARTMENT", actions: ["view"] },
    manager: { scope: "DIRECT_REPORTS", actions: ["view"] },
    employee: { scope: "SELF", actions: ["view"] },
  },
  profile: {
    ceo: { scope: "COMPANY", actions: ["view"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "edit", "export"] },
    director: { scope: "DEPARTMENT", actions: ["view"] },
    manager: { scope: "DIRECT_REPORTS", actions: ["view"] },
    employee: { scope: "SELF", actions: ["view", "edit"] },
  },
  performance: {
    ceo: { scope: "COMPANY", actions: ["view", "edit", "approve", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "export"] },
    director: { scope: "DEPARTMENT", actions: ["view", "edit", "approve"] },
    manager: { scope: "DIRECT_REPORTS", actions: ["view", "edit", "approve"] },
    employee: { scope: "SELF", actions: ["view"] },
  },
  leave: {
    ceo: { scope: "COMPANY", actions: ["view", "approve", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "edit", "approve", "export"] },
    director: { scope: "DEPARTMENT", actions: ["view", "approve"] },
    manager: { scope: "DIRECT_REPORTS", actions: ["view", "approve"] },
    employee: { scope: "SELF", actions: ["view", "create", "edit"] },
  },
  development: {
    ceo: { scope: "COMPANY", actions: ["view", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "create", "edit", "export"] },
    director: { scope: "DEPARTMENT", actions: ["view", "edit"] },
    manager: { scope: "DIRECT_REPORTS", actions: ["view", "edit"] },
    employee: { scope: "SELF", actions: ["view", "edit"] },
  },
  training: {
    ceo: { scope: "COMPANY", actions: ["view", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "create", "edit", "export"] },
    director: { scope: "DEPARTMENT", actions: ["view"] },
    manager: { scope: "DIRECT_REPORTS", actions: ["view"] },
    employee: { scope: "SELF", actions: ["view"] },
  },
  experience: {
    ceo: { scope: "AGGREGATE", actions: ["view", "export"] },
    hr_admin: { scope: "AGGREGATE", actions: ["view", "export"] },
    director: { scope: "AGGREGATE", actions: ["view"] },
    manager: { scope: "AGGREGATE", actions: ["view"] },
    employee: { scope: "SELF", actions: ["view", "create"] },
  },
  recruitment: {
    ceo: { scope: "COMPANY", actions: ["view", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "create", "edit", "approve", "export"] },
    director: { scope: "ASSIGNED", actions: ["view", "approve"] },
    manager: { scope: "ASSIGNED", actions: ["view"] },
    employee: { scope: "NONE", actions: [] },
  },
  salary: {
    ceo: { scope: "COMPANY", actions: ["view", "approve", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "edit", "export"] },
    director: { scope: "NONE", actions: [] },
    manager: { scope: "NONE", actions: [] },
    employee: { scope: "SELF", actions: ["view", "export"] },
  },
  talent: {
    ceo: { scope: "COMPANY", actions: ["view", "approve", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "edit", "export"] },
    director: { scope: "NONE", actions: [] },
    manager: { scope: "NONE", actions: [] },
    employee: { scope: "NONE", actions: [] },
  },
  succession: {
    ceo: { scope: "COMPANY", actions: ["view", "approve", "export"] },
    hr_admin: { scope: "COMPANY", actions: ["view", "edit", "export"] },
    director: { scope: "NONE", actions: [] },
    manager: { scope: "NONE", actions: [] },
    employee: { scope: "NONE", actions: [] },
  },
};

export const DEFAULT_DOCUMENT_ACCESS: Record<DocumentKey, Record<UserRole, ResourceAccess>> = {
  employmentContract: { ceo:{scope:"NONE",actions:[]}, hr_admin:{scope:"COMPANY",actions:["view","create","edit","export"]}, director:{scope:"NONE",actions:[]}, manager:{scope:"NONE",actions:[]}, employee:{scope:"SELF",actions:["view","export"]} },
  payroll: { ceo:{scope:"NONE",actions:[]}, hr_admin:{scope:"COMPANY",actions:["view","export"]}, director:{scope:"NONE",actions:[]}, manager:{scope:"NONE",actions:[]}, employee:{scope:"SELF",actions:["view","export"]} },
  identity: { ceo:{scope:"NONE",actions:[]}, hr_admin:{scope:"COMPANY",actions:["view","edit"]}, director:{scope:"NONE",actions:[]}, manager:{scope:"NONE",actions:[]}, employee:{scope:"SELF",actions:["view"]} },
  bank: { ceo:{scope:"NONE",actions:[]}, hr_admin:{scope:"COMPANY",actions:["view","edit"]}, director:{scope:"NONE",actions:[]}, manager:{scope:"NONE",actions:[]}, employee:{scope:"SELF",actions:["view","edit"]} },
  medical: { ceo:{scope:"NONE",actions:[]}, hr_admin:{scope:"COMPANY",actions:["view"]}, director:{scope:"NONE",actions:[]}, manager:{scope:"NONE",actions:[]}, employee:{scope:"SELF",actions:["view"]} },
  leaveAttachment: { ceo:{scope:"NONE",actions:[]}, hr_admin:{scope:"COMPANY",actions:["view"]}, director:{scope:"NONE",actions:[]}, manager:{scope:"NONE",actions:[]}, employee:{scope:"SELF",actions:["view","create"]} },
  disciplinary: { ceo:{scope:"NONE",actions:[]}, hr_admin:{scope:"COMPANY",actions:["view","create","edit","export"]}, director:{scope:"NONE",actions:[]}, manager:{scope:"NONE",actions:[]}, employee:{scope:"NONE",actions:[]} },
  performanceForm: { ceo:{scope:"COMPANY",actions:["view","export"]}, hr_admin:{scope:"COMPANY",actions:["view","export"]}, director:{scope:"DEPARTMENT",actions:["view"]}, manager:{scope:"DIRECT_REPORTS",actions:["view"]}, employee:{scope:"SELF",actions:["view"]} },
  trainingCertificate: { ceo:{scope:"NONE",actions:[]}, hr_admin:{scope:"COMPANY",actions:["view"]}, director:{scope:"DEPARTMENT",actions:["view"]}, manager:{scope:"DIRECT_REPORTS",actions:["view"]}, employee:{scope:"SELF",actions:["view","create","export"]} },
  candidateCv: { ceo:{scope:"COMPANY",actions:["view"]}, hr_admin:{scope:"COMPANY",actions:["view","create","edit","export"]}, director:{scope:"ASSIGNED",actions:["view"]}, manager:{scope:"ASSIGNED",actions:["view"]}, employee:{scope:"NONE",actions:[]} },
};

const MODULE_RESOURCE_MAP: Partial<Record<ModuleKey, ResourceKey>> = {
  leave: "leave", experience: "experience", organization: "people", jobArchitecture: "people",
  performance: "performance", calibration: "performance", talent: "talent", skillsGraph: "talent",
  training: "training", development: "development", developmentAnalytics: "development", career: "development",
  succession: "succession", salary: "salary", compensationFairness: "salary", recruitment: "recruitment",
  assessment: "recruitment", team: "people", executiveReports: "performance",
};

const GENERIC_SCOPE_CAPS: Record<UserRole, DataScope[]> = {
  ceo: ["NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY"],
  hr_admin: ["NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY"],
  director: ["NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT"],
  manager: ["NONE", "SELF", "DIRECT_REPORTS"],
  employee: ["NONE", "SELF"],
};

export function allowedScopesForResource(role: UserRole, resource: ResourceKey): DataScope[] {
  if (resource === "experience") return role === "employee" ? ["NONE", "SELF"] : ["NONE", "AGGREGATE"];
  if (resource === "recruitment") {
    if (role === "ceo" || role === "hr_admin") return ["NONE", "ASSIGNED", "DEPARTMENT", "COMPANY"];
    if (role === "director" || role === "manager") return ["NONE", "ASSIGNED"];
    return ["NONE"];
  }
  if (resource === "salary") {
    if (role === "ceo" || role === "hr_admin") return ["NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY"];
    if (role === "director") return ["NONE", "DEPARTMENT"];
    if (role === "manager") return ["NONE", "DIRECT_REPORTS"];
    return ["NONE", "SELF"];
  }
  if (resource === "talent" || resource === "succession") {
    if (role === "ceo" || role === "hr_admin") return ["NONE", "SELF", "DIRECT_REPORTS", "DEPARTMENT", "COMPANY"];
    if (role === "director") return ["NONE", "DEPARTMENT"];
    if (role === "manager") return ["NONE", "DIRECT_REPORTS"];
    return ["NONE"];
  }
  return GENERIC_SCOPE_CAPS[role];
}

export function allowedActionsForResource(role: UserRole, resource: ResourceKey): AccessAction[] {
  if (role === "ceo" || role === "hr_admin") return ACCESS_ACTIONS;
  if (role === "director") {
    if (resource === "performance") return ["view", "edit", "approve", "export"];
    if (resource === "leave") return ["view", "approve"];
    if (resource === "development") return ["view", "edit"];
    if (resource === "recruitment") return ["view", "approve"];
    return ["view", "export"];
  }
  if (role === "manager") {
    if (resource === "performance") return ["view", "edit", "approve"];
    if (resource === "leave") return ["view", "approve"];
    if (resource === "development") return ["view", "edit"];
    if (resource === "recruitment") return ["view", "approve"];
    return ["view"];
  }
  if (resource === "profile") return ["view", "edit"];
  if (resource === "leave") return ["view", "create", "edit"];
  if (resource === "development") return ["view", "edit"];
  if (resource === "experience") return ["view", "create"];
  if (resource === "salary") return ["view", "export"];
  if (resource === "people" || resource === "performance" || resource === "training") return ["view"];
  return [];
}

export function allowedScopesForDocument(role: UserRole, document: DocumentKey): DataScope[] {
  if (document === "candidateCv") return allowedScopesForResource(role, "recruitment");
  if (document === "performanceForm" || document === "trainingCertificate") return GENERIC_SCOPE_CAPS[role];
  if (document === "disciplinary") return role === "ceo" || role === "hr_admin" ? ["NONE", "COMPANY"] : ["NONE"];
  if (role === "ceo" || role === "hr_admin") return ["NONE", "COMPANY"];
  if (role === "employee") return ["NONE", "SELF"];
  return ["NONE"];
}

export function allowedActionsForDocument(role: UserRole, document: DocumentKey): AccessAction[] {
  if (role === "ceo" || role === "hr_admin") return ACCESS_ACTIONS;
  if (role === "director" || role === "manager") return ["view", "export"];
  if (document === "bank") return ["view", "edit"];
  if (document === "leaveAttachment") return ["view", "create"];
  if (document === "trainingCertificate") return ["view", "create", "export"];
  if (document === "employmentContract" || document === "payroll" || document === "performanceForm") return ["view", "export"];
  if (document === "identity" || document === "medical") return ["view"];
  return [];
}

function normalizePolicy(value: unknown): CompanyAccessPolicy {
  const parsed = value && typeof value === "object" ? value as Partial<CompanyAccessPolicy> : {};
  return {
    version: 3,
    moduleOverrides: parsed.moduleOverrides || {},
    resourceOverrides: parsed.resourceOverrides || {},
    documentOverrides: parsed.documentOverrides || {},
    performance: { ...DEFAULT_COMPANY_ACCESS_POLICY.performance, ...(parsed.performance || {}) },
  };
}

export function loadCompanyAccessPolicy(): CompanyAccessPolicy {
  if (typeof window === "undefined") return DEFAULT_COMPANY_ACCESS_POLICY;
  try {
    const raw = localStorage.getItem(ACCESS_POLICY_STORAGE_KEY) || localStorage.getItem(LEGACY_ACCESS_POLICY_STORAGE_KEY);
    return raw ? normalizePolicy(JSON.parse(raw)) : DEFAULT_COMPANY_ACCESS_POLICY;
  } catch {
    return DEFAULT_COMPANY_ACCESS_POLICY;
  }
}

export function saveCompanyAccessPolicy(policy: CompanyAccessPolicy) {
  if (typeof window === "undefined") return;
  const normalized = normalizePolicy(policy);
  localStorage.setItem(ACCESS_POLICY_STORAGE_KEY, JSON.stringify(normalized));
  localStorage.removeItem(LEGACY_ACCESS_POLICY_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("accessPolicyUpdated"));
}

export async function hydrateCompanyAccessPolicy(): Promise<CompanyAccessPolicy> {
  if (typeof window === "undefined" || !SAAS_DATA_MODE) return loadCompanyAccessPolicy();
  try {
    const response = await fetch("/api/saas/workforce/access/policy", { cache: "no-store" });
    if (!response.ok) return loadCompanyAccessPolicy();
    const payload = await response.json().catch(() => null);
    if (!payload?.policy) return loadCompanyAccessPolicy();
    const policy = normalizePolicy(payload.policy);
    saveCompanyAccessPolicy(policy);
    return policy;
  } catch {
    return loadCompanyAccessPolicy();
  }
}

export async function persistCompanyAccessPolicy(policy: CompanyAccessPolicy): Promise<CompanyAccessPolicy> {
  const normalized = normalizePolicy(policy);
  if (!SAAS_DATA_MODE) {
    saveCompanyAccessPolicy(normalized);
    return normalized;
  }
  const response = await fetch("/api/saas/workforce/access/policy", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.detail || payload?.error || "Şirket yetki politikası kaydedilemedi.");
  const saved = normalizePolicy(payload?.policy || normalized);
  saveCompanyAccessPolicy(saved);
  return saved;
}

export function getResourceAccess(role: UserRole | null | undefined, resource: ResourceKey, policy = loadCompanyAccessPolicy()): ResourceAccess {
  if (!role) return { scope: "NONE", actions: [] };
  const base = DEFAULT_RESOURCE_ACCESS[resource][role];
  const override = policy.resourceOverrides?.[role]?.[resource];
  const scopeCaps = allowedScopesForResource(role, resource);
  const actionCaps = allowedActionsForResource(role, resource);
  const requestedScope = override?.scope || base.scope;
  const scope = scopeCaps.includes(requestedScope) ? requestedScope : base.scope;
  const requestedActions = override?.actions || base.actions;
  const actions = requestedActions.filter((action) => actionCaps.includes(action));
  return scope === "NONE" ? { scope, actions: [] } : { scope, actions };
}

export function getDocumentAccess(role: UserRole | null | undefined, document: DocumentKey, policy = loadCompanyAccessPolicy()): ResourceAccess {
  if (!role) return { scope: "NONE", actions: [] };
  const base = DEFAULT_DOCUMENT_ACCESS[document][role];
  const override = policy.documentOverrides?.[role]?.[document];
  const scopeCaps = allowedScopesForDocument(role, document);
  const actionCaps = allowedActionsForDocument(role, document);
  const requestedScope = override?.scope || base.scope;
  const scope = scopeCaps.includes(requestedScope) ? requestedScope : base.scope;
  const requestedActions = override?.actions || base.actions;
  const actions = requestedActions.filter((action) => actionCaps.includes(action));
  return scope === "NONE" ? { scope, actions: [] } : { scope, actions };
}

export function canPerformResource(role: UserRole | null | undefined, resource: ResourceKey, action: AccessAction) {
  const access = getResourceAccess(role, resource);
  return access.scope !== "NONE" && access.actions.includes(action);
}

export function canPerformDocument(role: UserRole | null | undefined, document: DocumentKey, action: AccessAction) {
  const access = getDocumentAccess(role, document);
  return access.scope !== "NONE" && access.actions.includes(action);
}

export function moduleForPath(pathname: string): ModuleKey | null {
  const normalized = decodeURIComponent(pathname || "/");
  const match = [...MODULE_DEFINITIONS].sort((a, b) => b.route.length - a.route.length).find((item) => normalized === item.route || normalized.startsWith(item.route + "/"));
  return match?.key || null;
}

export function canAccessRoute(role: UserRole | null | undefined, pathname: string) {
  if (!role || !hasAccess(role, pathname)) return false;
  const key = moduleForPath(pathname);
  if (!key) return true;
  const policy = loadCompanyAccessPolicy();
  if (policy.moduleOverrides?.[role]?.[key] === false) return false;
  const resource = MODULE_RESOURCE_MAP[key];
  if (!resource) return true;
  const access = getResourceAccess(role, resource, policy);
  return access.scope !== "NONE" && access.actions.includes("view");
}

export function canConfigureAccess(role: UserRole | null | undefined) { return role === "ceo"; }
export function canViewAccessArchitecture(role: UserRole | null | undefined) { return role === "ceo" || role === "hr_admin"; }

export const SENSITIVE_SCOPE_BY_ROLE: Record<SensitiveDomain, Record<UserRole, DataScope>> = {
  salary: { ceo: "COMPANY", hr_admin: "COMPANY", director: "NONE", manager: "NONE", employee: "SELF" },
  talent: { ceo: "COMPANY", hr_admin: "COMPANY", director: "NONE", manager: "NONE", employee: "NONE" },
  succession: { ceo: "COMPANY", hr_admin: "COMPANY", director: "NONE", manager: "NONE", employee: "NONE" },
};

export function getSensitiveScope(role: UserRole | null | undefined, domain: SensitiveDomain): DataScope {
  const resource: ResourceKey = domain;
  return getResourceAccess(role, resource).scope;
}

export function getManagerRelationship(user: AccessUser | null, employee: AccessEmployee | null): "Yönetici 1" | "Yönetici 2" | null {
  const name = String(user?.name || "").trim();
  if (!name || !employee) return null;
  if (String(employee["Yönetici 1"] || "").trim() === name) return "Yönetici 1";
  if (String(employee["Yönetici 2"] || "").trim() === name) return "Yönetici 2";
  return null;
}

function sameEmployee(user: AccessUser, employee: AccessEmployee) {
  const userId = String(user.employee_id || user.employeeId || user.id || "").trim();
  const employeeId = String(employee.id || employee.employee_id || "").trim();
  if (userId && employeeId) return userId === employeeId;
  return String(employee["Ad Soyad"] || "").trim() === String(user.name || "").trim();
}

export function scopeAllowsEmployee(scope: DataScope, user: AccessUser | null, employee: AccessEmployee | null, options?: { assigned?: boolean }) {
  if (!user || !employee) return false;
  if (scope === "COMPANY") return true;
  if (scope === "SELF") return sameEmployee(user, employee);
  if (scope === "DIRECT_REPORTS") return getManagerRelationship(user, employee) !== null;
  if (scope === "DEPARTMENT") {
    const userDepartment = String(user.dept || user.department || "").trim();
    return Boolean(userDepartment) && String(employee.Departman || "").trim() === userDepartment;
  }
  if (scope === "ASSIGNED") return options?.assigned === true;
  return false;
}

export function canAccessEmployeeRecord(user: AccessUser | null, employee: AccessEmployee | null, resource: ResourceKey, action: AccessAction = "view", options?: { assigned?: boolean }) {
  if (!user || !employee) return false;
  const role = mapToUserRole(String(user.role || ""));
  const access = getResourceAccess(role, resource);
  return access.actions.includes(action) && scopeAllowsEmployee(access.scope, user, employee, options);
}

export function canAccessEmployeeDocument(user: AccessUser | null, employee: AccessEmployee | null, document: DocumentKey, action: AccessAction = "view", options?: { assigned?: boolean }) {
  if (!user || !employee) return false;
  const role = mapToUserRole(String(user.role || ""));
  const access = getDocumentAccess(role, document);
  return access.actions.includes(action) && scopeAllowsEmployee(access.scope, user, employee, options);
}

export function getPerformanceViewTargets(user: AccessUser | null, employees: AccessEmployee[]) {
  if (!user) return [];
  return employees.filter((employee) => canAccessEmployeeRecord(user, employee, "performance", "view"));
}

export function canEvaluateEmployee(user: AccessUser | null, employee: AccessEmployee | null): { allowed: boolean; relation: string | null; override: boolean; reason?: string } {
  if (!user || !employee) return { allowed: false, relation: null, override: false, reason: "Kullanıcı veya çalışan bulunamadı." };
  if (typeof window !== "undefined") {
    const cycle = activePerformanceCycle(ensurePerformanceCycle());
    if (cycle && !canEditPerformance(cycle)) return { allowed: false, relation: null, override: false, reason: `${cycle.name} şu anda ${PERFORMANCE_STAGE_LABELS[cycle.stage]} aşamasında; yeni puan girişi kapalı.` };
  }
  const role = mapToUserRole(String(user.role || ""));
  const policy = loadCompanyAccessPolicy();
  const access = getResourceAccess(role, "performance", policy);
  if (role === "hr_admin") {
    if (!policy.performance.hrCanOverride) return { allowed: false, relation: null, override: false, reason: "İK sonuçları izler; varsayılan politikada puan veremez." };
    if (!scopeAllowsEmployee(access.scope, user, employee)) return { allowed: false, relation: null, override: false, reason: "Çalışan İK kullanıcısının tanımlı veri kapsamı dışında." };
    return { allowed: true, relation: "İK Override", override: true };
  }
  if (role === "employee") return { allowed: false, relation: null, override: false, reason: "Personel başka çalışanı değerlendiremez." };
  if (!access.actions.includes("edit") || !scopeAllowsEmployee(access.scope, user, employee)) return { allowed: false, relation: null, override: false, reason: "Çalışan tanımlı performans yetkisi kapsamı dışında." };
  const relation = getManagerRelationship(user, employee);
  if (!relation) return { allowed: false, relation: null, override: false, reason: "Puanlama yetkisi yalnızca organizasyonda doğrudan bağlı çalışanlar içindir." };
  if (relation === "Yönetici 2" && !policy.performance.secondManagerCanEvaluate) return { allowed: false, relation, override: false, reason: "Firma politikasında Yönetici 2 değerlendirmesi kapalı." };
  return { allowed: true, relation, override: false };
}

export function roleLabel(role: UserRole) {
  return ({ ceo: "CEO / Genel Müdür", hr_admin: "İK Yöneticisi", director: "Direktör", manager: "Müdür / Yönetici", employee: "Personel" } as Record<UserRole, string>)[role];
}

export function scopeLabel(scope: DataScope) {
  return ({ NONE: "Erişim yok", SELF: "Sadece kendi", DIRECT_REPORTS: "Doğrudan ekip", DEPARTMENT: "Kendi departmanı", COMPANY: "Tüm şirket", ASSIGNED: "Atandığı kayıtlar", AGGREGATE: "Sadece toplu / anonim" } as Record<DataScope, string>)[scope];
}

export function actionLabel(action: AccessAction) {
  return ({ view: "Görüntüle", create: "Oluştur", edit: "Düzenle", approve: "Onayla", export: "Dışa aktar" } as Record<AccessAction, string>)[action];
}
