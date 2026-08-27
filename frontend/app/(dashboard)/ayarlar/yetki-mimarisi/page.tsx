"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, LockKeyhole, Network, Save, ShieldCheck, SlidersHorizontal, Users, X } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../../../utils/storage";
import { ROLE_ACCESS_CONFIG, type UserRole, mapToUserRole } from "../../../data/roles";
import {
  DEFAULT_COMPANY_ACCESS_POLICY,
  MODULE_DEFINITIONS,
  SENSITIVE_SCOPE_BY_ROLE,
  canConfigureAccess,
  loadCompanyAccessPolicy,
  roleLabel,
  saveCompanyAccessPolicy,
  scopeLabel,
  type CompanyAccessPolicy,
  type ModuleKey,
} from "../../../../lib/hr/accessControl";

const ROLES: UserRole[] = ["ceo", "hr_admin", "director", "manager", "employee"];
const SENSITIVE_KEYS = new Set<ModuleKey>(["salary", "talent", "succession"]);

export default function YetkiMimarisiPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [policy, setPolicy] = useState<CompanyAccessPolicy>(DEFAULT_COMPANY_ACCESS_POLICY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCurrentUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
    setPolicy(loadCompanyAccessPolicy());
  }, []);

  const currentRole = mapToUserRole(String(currentUser?.role || ""));
  const editable = canConfigureAccess(currentRole);

  const ordinaryModules = useMemo(
    () => MODULE_DEFINITIONS.filter((item) => !SENSITIVE_KEYS.has(item.key) && item.key !== "accessArchitecture"),
    []
  );

  const baseAllowed = (role: UserRole, route: string) =>
    ROLE_ACCESS_CONFIG[role].some((allowed) => route === allowed || route.startsWith(allowed + "/"));

  const isEnabled = (role: UserRole, key: ModuleKey, route: string) => {
    if (!baseAllowed(role, route)) return false;
    return policy.moduleOverrides?.[role]?.[key] !== false;
  };

  const toggleModule = (role: UserRole, key: ModuleKey, route: string) => {
    if (!editable || !baseAllowed(role, route)) return;
    const current = isEnabled(role, key, route);
    setPolicy((prev) => ({
      ...prev,
      moduleOverrides: {
        ...prev.moduleOverrides,
        [role]: {
          ...(prev.moduleOverrides?.[role] || {}),
          [key]: !current,
        },
      },
    }));
    setSaved(false);
  };

  const save = () => {
    if (!editable) return;
    saveCompanyAccessPolicy(policy);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-indigo-600">Kurumsal erişim yönetişimi</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">Yetki Mimarisi</h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">
            Pozisyon, sistem rolü ve organizasyon hiyerarşisini birbirinden ayırın. FutureHR erişimi; rol + modül izni + yönetici ilişkisi + hassas veri sınırı birlikte değerlendirir.
          </p>
        </div>
        <button onClick={save} disabled={!editable} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Kaydedildi" : editable ? "Politikayı kaydet" : "Salt okunur"}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <SetupCard number="1" icon={Network} title="Organizasyon bağları" text="Çalışan kaydında Yönetici 1 ve gerekiyorsa Yönetici 2 bağlantılarını kurun. Kimin kimi puanlayacağı bu ilişkiden gelir." href="/organizasyon" action="Organizasyonu aç" />
        <SetupCard number="2" icon={Users} title="Sistem rolleri" text="Kullanıcı hesabına CEO, İK, Direktör, Yönetici veya Personel rolünü atayın. Pozisyon adı otomatik yetki vermez." href="/admin" action="Kullanıcıları aç" />
        <SetupCard number="3" icon={SlidersHorizontal} title="Firma politikası" text="Modül görünürlüğünü daraltın ve ikinci yönetici / İK override kurallarını kurum politikanıza göre belirleyin." />
      </div>

      {!editable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          İK bu sayfayı görebilir ancak kendi yetkisini genişletemez. Firma yetki politikasını değiştirme yetkisi yalnızca CEO rolündedir.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-semibold">Hassas veri sınırı</h2></div>
          <p className="mt-1 text-xs text-slate-500">Maaş, potansiyel/9-Box ve halefiyet normal modül izninden bağımsız olarak ayrıca korunur. Varsayılan güvenli profil CEO + İK şirket kapsamıdır.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead><tr><th>Hassas alan</th>{ROLES.map((role) => <th key={role} className="text-center">{roleLabel(role)}</th>)}</tr></thead>
            <tbody>
              {(["salary", "talent", "succession"] as const).map((domain) => (
                <tr key={domain}>
                  <td><div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-rose-500" /><span className="font-semibold">{domain === "salary" ? "Maaş & ücret verisi" : domain === "talent" ? "Potansiyel & 9-Box" : "Halefiyet & yedekleme"}</span></div></td>
                  {ROLES.map((role) => {
                    const scope = SENSITIVE_SCOPE_BY_ROLE[domain][role];
                    return <td key={role} className="text-center"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${scope === "NONE" ? "bg-slate-100 text-slate-400 dark:bg-slate-800" : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"}`}>{scopeLabel(scope)}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h2 className="text-sm font-semibold">Modül görünürlüğü</h2>
            <p className="mt-1 text-xs text-slate-500">Güvenli varsayılan rol matrisini firma ihtiyacına göre daraltabilirsiniz. Bu ekran hiçbir rolün taban yetkisini genişletmez.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead><tr><th>Modül</th>{ROLES.map((role) => <th key={role} className="text-center">{roleLabel(role)}</th>)}</tr></thead>
              <tbody>
                {ordinaryModules.map((module) => (
                  <tr key={module.key}>
                    <td><div className="font-semibold text-slate-800 dark:text-slate-100">{module.label}</div><div className="mt-0.5 font-mono text-[10px] text-slate-400">{module.route}</div></td>
                    {ROLES.map((role) => {
                      const base = baseAllowed(role, module.route);
                      const enabled = isEnabled(role, module.key, module.route);
                      return <td key={role} className="text-center">
                        <button type="button" disabled={!editable || !base} onClick={() => toggleModule(role, module.key, module.route)} className={`inline-flex h-8 min-w-[76px] items-center justify-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold transition ${!base ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900" : enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950"}`}>
                          {!base ? <LockKeyhole className="h-3 w-3" /> : enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {!base ? "Kilitli" : enabled ? "Açık" : "Kapalı"}
                        </button>
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
            <h2 className="text-sm font-semibold text-blue-950 dark:text-blue-100">Performans değerlendirme sınırı</h2>
            <p className="mt-1 text-xs leading-5 text-blue-800 dark:text-blue-300">CEO, Direktör ve Yönetici yalnızca organizasyonda kendilerine Yönetici 1 veya Yönetici 2 olarak bağlı çalışanları puanlayabilir. İK varsayılan olarak sadece izler.</p>
            <Toggle label="Yönetici 2 değerlendirme yapabilsin" checked={policy.performance.secondManagerCanEvaluate} disabled={!editable} onChange={(checked) => setPolicy((prev) => ({ ...prev, performance: { ...prev.performance, secondManagerCanEvaluate: checked } }))} />
            <Toggle label="İK override aç" checked={policy.performance.hrCanOverride} disabled={!editable} onChange={(checked) => setPolicy((prev) => ({ ...prev, performance: { ...prev.performance, hrCanOverride: checked } }))} />
            <Toggle label="İK override için gerekçe zorunlu" checked={policy.performance.hrOverrideRequiresReason} disabled={!editable || !policy.performance.hrCanOverride} onChange={(checked) => setPolicy((prev) => ({ ...prev, performance: { ...prev.performance, hrOverrideRequiresReason: checked } }))} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Kurumsal kurulum mantığı</p>
            <p className="mt-2">Bir çalışanın pozisyonu “Müdür” olabilir fakat sistem rolü Personel bırakılabilir. Aynı şekilde bir İK uzmanına işe alım görevi verilebilir; bu onun maaş veya halefiyet verisini otomatik görmesi anlamına gelmez.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SetupCard({ number, icon: Icon, title, text, href, action }: { number: string; icon: any; title: string; text: string; href?: string; action?: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"><Icon className="h-4 w-4" /></span><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-indigo-500">Adım {number}</p><h3 className="mt-1 text-sm font-semibold">{title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p>{href && <Link href={href} className="mt-3 inline-flex text-[11px] font-semibold text-indigo-600">{action} →</Link>}</div></div></div>;
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`mt-4 flex items-center justify-between gap-4 ${disabled ? "opacity-50" : "cursor-pointer"}`}><span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span><button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} /></button></label>;
}
