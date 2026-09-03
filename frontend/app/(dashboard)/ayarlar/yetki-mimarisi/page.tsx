"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  ChevronDown,
  FileLock2,
  KeyRound,
  LockKeyhole,
  Network,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../../../utils/storage";
import { ROLE_ACCESS_CONFIG, type UserRole, mapToUserRole } from "../../../data/roles";
import {
  ACCESS_ACTIONS,
  ACCESS_ROLES,
  DEFAULT_COMPANY_ACCESS_POLICY,
  DOCUMENT_DEFINITIONS,
  MODULE_DEFINITIONS,
  RESOURCE_DEFINITIONS,
  actionLabel,
  allowedActionsForDocument,
  allowedActionsForResource,
  allowedScopesForDocument,
  allowedScopesForResource,
  canConfigureAccess,
  getDocumentAccess,
  getResourceAccess,
  hydrateCompanyAccessPolicy,
  loadCompanyAccessPolicy,
  persistCompanyAccessPolicy,
  roleLabel,
  scopeLabel,
  type AccessAction,
  type CompanyAccessPolicy,
  type DataScope,
  type DocumentKey,
  type ModuleKey,
  type ResourceKey,
} from "../../../../lib/hr/accessControl";

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ceo: "Şirket genelinde yönetim ve karar görünümü; özel nitelikli özlük belgeleri varsayılan olarak İK'da kalır.",
  hr_admin: "Şirket genelinde İK operasyonu; özlük, işe alım, ücret ve yetenek süreçlerinin ana yöneticisi.",
  director: "Kendi departmanı; ekip performansı ve gelişim görünümü. Maaş, 9-Box ve halefiyet varsayılan kapalıdır.",
  manager: "Doğrudan bağlı ekip; günlük yönetim, performans, izin ve gelişim işlemleri.",
  employee: "Kendi profili, izinleri, gelişimi, eğitimleri ve kendisine ait belgeler.",
};

const ROLE_SHORT: Record<UserRole, string> = {
  ceo: "Şirket",
  hr_admin: "Şirket / İK",
  director: "Departman",
  manager: "Doğrudan ekip",
  employee: "Kendi",
};

const SENSITIVE_RESOURCES = new Set<ResourceKey>(["salary", "talent", "succession"]);

interface CurrentUserLike {
  role?: string;
}

export default function YetkiMimarisiPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUserLike | null>(null);
  const [policy, setPolicy] = useState<CompanyAccessPolicy>(DEFAULT_COMPANY_ACCESS_POLICY);
  const [selectedRole, setSelectedRole] = useState<UserRole>("manager");
  const [statusText, setStatusText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedUser = getStorageData<CurrentUserLike | null>(STORAGE_KEYS.CURRENT_USER, null);
    setCurrentUser(storedUser);
    setPolicy(loadCompanyAccessPolicy());
    void hydrateCompanyAccessPolicy().then(setPolicy);
  }, []);

  const currentRole = mapToUserRole(String(currentUser?.role || ""));
  const editable = canConfigureAccess(currentRole);

  const ordinaryModules = useMemo(
    () => MODULE_DEFINITIONS.filter((item) => item.key !== "accessArchitecture"),
    []
  );

  const baseAllowed = (role: UserRole, route: string) =>
    ROLE_ACCESS_CONFIG[role].some((allowed) => route === allowed || route.startsWith(allowed + "/"));

  const isEnabled = (role: UserRole, key: ModuleKey, route: string) => {
    if (!baseAllowed(role, route)) return false;
    return policy.moduleOverrides?.[role]?.[key] !== false;
  };

  const markChanged = () => setStatusText("Kaydedilmemiş değişiklik var");

  const updateResourceScope = (resource: ResourceKey, scope: DataScope) => {
    if (!editable) return;
    const current = getResourceAccess(selectedRole, resource, policy);
    setPolicy((prev) => ({
      ...prev,
      resourceOverrides: {
        ...prev.resourceOverrides,
        [selectedRole]: {
          ...(prev.resourceOverrides?.[selectedRole] || {}),
          [resource]: { ...(prev.resourceOverrides?.[selectedRole]?.[resource] || {}), scope, actions: scope === "NONE" ? [] : current.actions },
        },
      },
    }));
    markChanged();
  };

  const toggleResourceAction = (resource: ResourceKey, action: AccessAction) => {
    if (!editable) return;
    const current = getResourceAccess(selectedRole, resource, policy);
    if (current.scope === "NONE") return;
    const actions = current.actions.includes(action) ? current.actions.filter((item) => item !== action) : [...current.actions, action];
    setPolicy((prev) => ({
      ...prev,
      resourceOverrides: {
        ...prev.resourceOverrides,
        [selectedRole]: {
          ...(prev.resourceOverrides?.[selectedRole] || {}),
          [resource]: { ...(prev.resourceOverrides?.[selectedRole]?.[resource] || {}), scope: current.scope, actions },
        },
      },
    }));
    markChanged();
  };

  const updateDocumentScope = (document: DocumentKey, scope: DataScope) => {
    if (!editable) return;
    const current = getDocumentAccess(selectedRole, document, policy);
    setPolicy((prev) => ({
      ...prev,
      documentOverrides: {
        ...prev.documentOverrides,
        [selectedRole]: {
          ...(prev.documentOverrides?.[selectedRole] || {}),
          [document]: { ...(prev.documentOverrides?.[selectedRole]?.[document] || {}), scope, actions: scope === "NONE" ? [] : current.actions },
        },
      },
    }));
    markChanged();
  };

  const toggleDocumentAction = (document: DocumentKey, action: AccessAction) => {
    if (!editable) return;
    const current = getDocumentAccess(selectedRole, document, policy);
    if (current.scope === "NONE") return;
    const actions = current.actions.includes(action) ? current.actions.filter((item) => item !== action) : [...current.actions, action];
    setPolicy((prev) => ({
      ...prev,
      documentOverrides: {
        ...prev.documentOverrides,
        [selectedRole]: {
          ...(prev.documentOverrides?.[selectedRole] || {}),
          [document]: { ...(prev.documentOverrides?.[selectedRole]?.[document] || {}), scope: current.scope, actions },
        },
      },
    }));
    markChanged();
  };

  const toggleModule = (key: ModuleKey, route: string) => {
    if (!editable || !baseAllowed(selectedRole, route)) return;
    const current = isEnabled(selectedRole, key, route);
    setPolicy((prev) => ({
      ...prev,
      moduleOverrides: {
        ...prev.moduleOverrides,
        [selectedRole]: {
          ...(prev.moduleOverrides?.[selectedRole] || {}),
          [key]: !current,
        },
      },
    }));
    markChanged();
  };

  const resetSelectedRole = () => {
    if (!editable || !window.confirm(`${roleLabel(selectedRole)} için firma özel ayarları güvenli varsayılanlara dönsün mü?`)) return;
    setPolicy((prev) => {
      const moduleOverrides = { ...prev.moduleOverrides };
      const resourceOverrides = { ...prev.resourceOverrides };
      const documentOverrides = { ...prev.documentOverrides };
      delete moduleOverrides[selectedRole];
      delete resourceOverrides[selectedRole];
      delete documentOverrides[selectedRole];
      return { ...prev, moduleOverrides, resourceOverrides, documentOverrides };
    });
    markChanged();
  };

  const save = async () => {
    if (!editable || saving) return;
    setSaving(true);
    setStatusText("Kaydediliyor…");
    try {
      const saved = await persistCompanyAccessPolicy(policy);
      setPolicy(saved);
      setStatusText("Şirket yetki politikası kaydedildi");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Yetki politikası kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-indigo-600">Yetki & hiyerarşi</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">Kim neyi görebilir ve ne yapabilir?</h1>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
            FutureHR erişimi dört katmanda yönetir: sistem rolü, organizasyon hiyerarşisi, veri kapsamı ve işlem yetkisi. Belge erişimi ayrıca korunur.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusText && <span className="mr-1 text-xs font-medium text-slate-500">{statusText}</span>}
          <button type="button" onClick={resetSelectedRole} disabled={!editable || saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <RotateCcw className="h-4 w-4" /> Rolü sıfırla
          </button>
          <button type="button" onClick={save} disabled={!editable || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40">
            {statusText.includes("kaydedildi") ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Kaydediliyor…" : editable ? "Şirket politikasını kaydet" : "Salt okunur"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <SetupCard number="1" icon={Network} title="Hiyerarşiyi kur" text="Yönetici 1 ve gerekiyorsa Yönetici 2 ilişkilerini doğru kurun. Ekip ve departman kapsamı buradan hesaplanır." href="/organizasyon" action="Organizasyonu aç" />
        <SetupCard number="2" icon={Users} title="Sistem rolünü ata" text="Pozisyon adı yetki değildir. Hesaplara CEO, İK, Direktör, Yönetici veya Personel rolü ayrı atanır." href="/admin" action="Kullanıcıları aç" />
        <SetupCard number="3" icon={ShieldCheck} title="Yetki politikasını özelleştir" text="Firma güvenli varsayılanla başlar; veri, belge ve işlem yetkilerini burada ihtiyaca göre daraltır veya güvenli sınırlar içinde genişletir." />
      </div>

      {!editable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          Bu ekran İK tarafından denetlenebilir; şirketin yetki politikasını değiştirme yetkisi varsayılan olarak yalnızca CEO / Genel Müdür rolündedir. Böylece İK kendi erişimini tek taraflı genişletemez.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-semibold">Rol seçin</h2></div>
              <p className="mt-1 text-xs text-slate-500">Aşağıdaki tüm veri, belge ve işlem ayarları seçtiğiniz rol için uygulanır.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Varsayılan kapsam: {ROLE_SHORT[selectedRole]}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {ACCESS_ROLES.map((role) => {
              const selected = selectedRole === role;
              return (
                <button key={role} type="button" onClick={() => setSelectedRole(role)} className={`rounded-xl border p-3 text-left transition ${selected ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200 dark:border-indigo-700 dark:bg-indigo-950/30" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"}`}>
                  <div className={`text-xs font-semibold ${selected ? "text-indigo-800 dark:text-indigo-200" : "text-slate-900 dark:text-white"}`}>{roleLabel(role)}</div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-500">{ROLE_SHORT[role]}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">{ROLE_DESCRIPTIONS[selectedRole]}</div>
        </div>

        <div className="grid gap-px bg-slate-100 lg:grid-cols-5 dark:bg-slate-800">
          <Principle title="Personel" value="Kendi" text="Kendi verisi ve self-service işlemleri" />
          <Principle title="Yönetici" value="Doğrudan ekip" text="Yönetici 1 / 2 bağıyla gelen ekip" />
          <Principle title="Direktör" value="Departman" text="Kendi departmanındaki çalışanlar" />
          <Principle title="İK" value="Şirket" text="İK süreçleri ve özlük yönetimi" />
          <Principle title="CEO" value="Şirket" text="Karar verisi geniş; özel belgeler sınırlı" />
        </div>
      </section>

      <PermissionSection
        icon={ShieldCheck}
        title="Veri kapsamı ve işlem yetkileri"
        description="Bir rolün bir ekranı görmesi, o ekrandaki bütün çalışanları veya bütün işlemleri yapabileceği anlamına gelmez. Kapsam ve işlem yetkisi ayrı uygulanır."
      >
        <div className="space-y-2 p-4">
          {RESOURCE_DEFINITIONS.map((resource) => {
            const access = getResourceAccess(selectedRole, resource.key, policy);
            const allowedScopes = allowedScopesForResource(selectedRole, resource.key);
            const allowedActions = allowedActionsForResource(selectedRole, resource.key);
            const sensitive = SENSITIVE_RESOURCES.has(resource.key);
            return (
              <PermissionRow
                key={resource.key}
                label={resource.label}
                description={resource.description}
                sensitive={sensitive}
                scope={access.scope}
                allowedScopes={allowedScopes}
                actions={access.actions}
                allowedActions={allowedActions}
                editable={editable}
                onScope={(scope) => updateResourceScope(resource.key, scope)}
                onAction={(action) => toggleResourceAction(resource.key, action)}
              />
            );
          })}
        </div>
      </PermissionSection>

      <PermissionSection
        icon={FileLock2}
        title="Belge erişimi"
        description="Belge yetkisi veri ekranlarından bağımsızdır. Özellikle bordro, kimlik, banka, sağlık ve disiplin evrakı en az yetki prensibiyle kapalı başlar."
      >
        <div className="space-y-2 p-4">
          {DOCUMENT_DEFINITIONS.map((document) => {
            const access = getDocumentAccess(selectedRole, document.key, policy);
            return (
              <PermissionRow
                key={document.key}
                label={document.label}
                description={document.description}
                sensitive={document.highlySensitive}
                scope={access.scope}
                allowedScopes={allowedScopesForDocument(selectedRole, document.key)}
                actions={access.actions}
                allowedActions={allowedActionsForDocument(selectedRole, document.key)}
                editable={editable}
                onScope={(scope) => updateDocumentScope(document.key, scope)}
                onAction={(action) => toggleDocumentAction(document.key, action)}
              />
            );
          })}
        </div>
      </PermissionSection>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-semibold">Modül görünürlüğü · {roleLabel(selectedRole)}</h2></div>
            <p className="mt-1 text-xs text-slate-500">Rolün taban modüllerini burada kapatabilirsiniz. Kilitli bir modül rolün güvenli taban profilinde yoktur ve buradan açılamaz.</p>
          </div>
          <div className="grid gap-2 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {ordinaryModules.map((module) => {
              const base = baseAllowed(selectedRole, module.route);
              const enabled = isEnabled(selectedRole, module.key, module.route);
              return (
                <button key={module.key} type="button" disabled={!editable || !base} onClick={() => toggleModule(module.key, module.route)} className={`flex min-h-[62px] items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${!base ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-950" : enabled ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"}`}>
                  <div className="min-w-0"><div className={`truncate text-xs font-semibold ${base ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}>{module.label}</div><div className="mt-1 truncate text-[9px] text-slate-400">{module.route}</div></div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${!base ? "bg-slate-100 text-slate-400 dark:bg-slate-800" : enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{!base ? <LockKeyhole className="h-3 w-3" /> : enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{!base ? "Kilitli" : enabled ? "Açık" : "Kapalı"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
            <h2 className="text-sm font-semibold text-blue-950 dark:text-blue-100">Performans puanlama kuralı</h2>
            <p className="mt-1 text-xs leading-5 text-blue-800 dark:text-blue-300">Görüntüleme kapsamı departman veya şirket olsa bile puan verme yetkisi organizasyon bağını aşmaz. Yönetici yalnızca kendisine bağlı çalışanı puanlar.</p>
            <Toggle label="Yönetici 2 değerlendirme yapabilsin" checked={policy.performance.secondManagerCanEvaluate} disabled={!editable} onChange={(checked) => { setPolicy((prev) => ({ ...prev, performance: { ...prev.performance, secondManagerCanEvaluate: checked } })); markChanged(); }} />
            <Toggle label="İK puan override yapabilsin" checked={policy.performance.hrCanOverride} disabled={!editable} onChange={(checked) => { setPolicy((prev) => ({ ...prev, performance: { ...prev.performance, hrCanOverride: checked } })); markChanged(); }} />
            <Toggle label="İK override için gerekçe zorunlu" checked={policy.performance.hrOverrideRequiresReason} disabled={!editable || !policy.performance.hrCanOverride} onChange={(checked) => { setPolicy((prev) => ({ ...prev, performance: { ...prev.performance, hrOverrideRequiresReason: checked } })); markChanged(); }} />
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 text-xs leading-5 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">
            <div className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" /> Özel nitelikli veriler</div>
            <p className="mt-2">Sağlık, kimlik, banka, bordro ve disiplin belgeleri CEO dahil herkese otomatik açılmaz. Varsayılan sahip İK'dır; çalışan yalnızca kendisine ait uygun belgeleri görebilir.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Güvenli sınırlar neden var?</p>
            <p className="mt-2">Firma ayar yapabilir; ancak bir Personeli şirket genelinde ücret yöneticisine veya bir Müdürü tüm şirketin özlük yöneticisine çeviremez. Daha yüksek yetki gerekiyorsa önce sistem rolü değiştirilir. Bu, yanlış bir tıklamayla veri sızıntısını önler.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PermissionSection({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 p-5 dark:border-slate-800">
        <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-semibold">{title}</h2></div>
        <p className="mt-1 max-w-5xl text-xs leading-5 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function PermissionRow({ label, description, sensitive, scope, allowedScopes, actions, allowedActions, editable, onScope, onAction }: {
  label: string;
  description: string;
  sensitive?: boolean;
  scope: DataScope;
  allowedScopes: DataScope[];
  actions: AccessAction[];
  allowedActions: AccessAction[];
  editable: boolean;
  onScope: (scope: DataScope) => void;
  onAction: (action: AccessAction) => void;
}) {
  return (
    <div className={`grid gap-3 rounded-xl border p-3.5 xl:grid-cols-[minmax(240px,1fr)_210px_minmax(360px,1.4fr)] xl:items-center ${sensitive ? "border-rose-200 bg-rose-50/25 dark:border-rose-900/50 dark:bg-rose-950/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/30"}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-900 dark:text-white">{label}</span>{sensitive && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Hassas</span>}</div>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p>
      </div>
      <div className="relative">
        <select aria-label={`${label} veri kapsamı`} value={scope} disabled={!editable} onChange={(event) => onScope(event.target.value as DataScope)} className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {allowedScopes.map((item) => <option key={item} value={item}>{scopeLabel(item)}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ACCESS_ACTIONS.map((action) => {
          const allowed = allowedActions.includes(action);
          const active = actions.includes(action) && scope !== "NONE";
          return (
            <button key={action} type="button" aria-pressed={active} disabled={!editable || !allowed || scope === "NONE"} onClick={() => onAction(action)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${!allowed || scope === "NONE" ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600" : active ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300" : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}>
              {active && <Check className="mr-1 inline h-3 w-3" />}{actionLabel(action)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Principle({ title, value, text }: { title: string; value: string; text: string }) {
  return <div className="bg-white p-4 dark:bg-slate-900"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">{title}</div><div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{text}</div></div>;
}

function SetupCard({ number, icon: Icon, title, text, href, action }: { number: string; icon: LucideIcon; title: string; text: string; href?: string; action?: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"><Icon className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-indigo-600">Adım {number}</p><h3 className="mt-1 text-sm font-semibold">{title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p>{href && <Link href={href} className="mt-3 inline-flex text-[11px] font-semibold text-indigo-600">{action} →</Link>}</div></div></div>;
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <div className={`mt-4 flex items-center justify-between gap-4 ${disabled ? "opacity-50" : ""}`}><span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span><button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} /></button></div>;
}
