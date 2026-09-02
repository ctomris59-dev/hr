"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Cable, CheckCircle2, CircleAlert, Database, FileSpreadsheet, RefreshCw, ShieldCheck } from "lucide-react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { TURKEY_CONNECTORS, type IntegrationRunRecord, type TurkeyConnectorId } from "@/lib/hr/turkeyEnterprise";

type Status = { provider: TurkeyConnectorId; state: string; configured: boolean; missing?: string[]; capabilities?: string[]; name?: string; description?: string };
const nowId = () => `integration-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function IntegrationCenter() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [domain, setDomain] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Record<string, any[]>>({});
  const [revision, setRevision] = useState(0);
  const runs = useMemo(() => getStorageData<IntegrationRunRecord[]>(STORAGE_KEYS.INTEGRATION_RUNS, []), [revision]);

  const load = async () => {
    const pairs = await Promise.all(TURKEY_CONNECTORS.map(async (item) => {
      try {
        const response = await fetch(`/api/integrations/${item.id}`, { cache: "no-store", credentials: "same-origin" });
        return [item.id, await response.json()] as const;
      } catch {
        return [item.id, { provider: item.id, state: "error", configured: false }] as const;
      }
    }));
    setStatuses(Object.fromEntries(pairs));
  };

  useEffect(() => { void load(); }, []);
  const saveRun = (run: IntegrationRunRecord) => {
    setStorageData(STORAGE_KEYS.INTEGRATION_RUNS, [run, ...getStorageData<IntegrationRunRecord[]>(STORAGE_KEYS.INTEGRATION_RUNS, [])].slice(0, 100));
    setRevision((value) => value + 1);
  };

  const call = async (provider: TurkeyConnectorId, action: "health" | "preview" | "sync") => {
    const key = `${provider}-${action}`;
    setBusy(key);
    setMessage("");
    try {
      const def = TURKEY_CONNECTORS.find((item) => item.id === provider)!;
      const selected = domain[provider] || def.capabilities[0] || "employees";
      const response = await fetch(`/api/integrations/${provider}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, domain: selected }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);

      if (action === "preview") {
        setPreview((current) => ({ ...current, [provider]: payload.rows || [] }));
        setMessage(`${def.name}: ${payload.normalizedCount ?? 0} kayıt normalize edildi; kişisel/ücret alanları maskelenmiş önizleme gösteriliyor.`);
      }
      if (action === "sync") {
        const imported = Number(payload.synced || 0);
        saveRun({ id: nowId(), provider, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), action, status: "success", imported, skipped: Number(payload.skipped || 0), message: `${selected} · ${imported} kayıt server-side işlendi.` });
        setMessage(`${def.name}: ${imported} kayıt tenant-scoped backend'e işlendi (${payload.created || 0} yeni, ${payload.updated || 0} güncel, ${payload.skipped || 0} atlandı). Tarayıcıya sync satırı gönderilmedi.`);
      }
      if (action === "health") {
        saveRun({ id: nowId(), provider, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), action, status: "success", message: "Bağlantı doğrulandı." });
        setMessage(`${def.name}: bağlantı aktif.`);
      }
      await load();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Entegrasyon çağrısı başarısız";
      saveRun({ id: nowId(), provider, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), action, status: "error", message: msg });
      setMessage(msg);
    } finally {
      setBusy("");
    }
  };

  return <div className="mx-auto max-w-7xl space-y-5 pb-8">
    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="enterprise-eyebrow">Türkiye Enterprise Readiness</p><h1 className="mt-1 text-2xl font-semibold">Entegrasyon Merkezi</h1><p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">ERP, HCM, bordro ve PDKS verisini kontrollü server-side connector katmanından yönetin. Credential değerleri server environment'ta kalır; sync payload'u localStorage'a yazılmaz.</p></div>
      <Link href="/admin/veri-aktarimi" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"><FileSpreadsheet className="h-4 w-4"/>Excel onboarding<ArrowRight className="h-3.5 w-3.5"/></Link>
    </header>

    <div className="grid gap-3 md:grid-cols-3"><Stat icon={Database} label="Connector" value={TURKEY_CONNECTORS.length}/><Stat icon={ShieldCheck} label="Güvenlik modeli" value="RBAC + Server-side"/><Stat icon={Activity} label="Son senkronizasyon" value={runs[0]?.completedAt ? new Date(runs[0].completedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Henüz yok"}/></div>
    {message && <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 dark:border-slate-800 dark:bg-slate-900">{message}</div>}

    <section className="grid gap-4 xl:grid-cols-2">{TURKEY_CONNECTORS.map((def) => {
      const st = statuses[def.id];
      const configured = def.id === "excel" || Boolean(st?.configured);
      const selectable = def.capabilities.filter((capability) => ["employees", "payroll", "attendance"].includes(capability));
      const selected = domain[def.id] || selectable[0] || "employees";
      const syncReady = selected === "employees";
      return <article key={def.id} className="enterprise-card overflow-hidden">
        <div className="flex items-start gap-3 p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><Cable className="h-5 w-5 text-indigo-500"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{def.name}</h2><StateBadge state={st?.state || "loading"}/></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{def.description}</p><div className="mt-2 flex flex-wrap gap-1.5">{def.capabilities.map((capability) => <span key={capability} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{capability}</span>)}</div></div></div>
        {def.id === "excel" ? <div className="border-t border-slate-100 p-4 dark:border-slate-800"><Link href="/admin/veri-aktarimi" className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-[11px] font-semibold text-white">Dosya aktarımını aç<ArrowRight className="h-3.5 w-3.5"/></Link></div> : <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2"><select value={selected} onChange={(event) => setDomain((current) => ({ ...current, [def.id]: event.target.value }))} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[11px] dark:border-slate-700 dark:bg-slate-950">{selectable.map((capability) => <option key={capability}>{capability}</option>)}</select><button disabled={!configured || Boolean(busy)} onClick={() => call(def.id, "health")} className="h-9 rounded-xl border border-slate-200 px-3 text-[10px] font-semibold disabled:opacity-40 dark:border-slate-700">{busy === `${def.id}-health` ? "Test…" : "Bağlantıyı test et"}</button><button disabled={!configured || Boolean(busy)} onClick={() => call(def.id, "preview")} className="h-9 rounded-xl border border-slate-200 px-3 text-[10px] font-semibold disabled:opacity-40 dark:border-slate-700">Önizle</button><button disabled={!configured || Boolean(busy) || !syncReady} onClick={() => call(def.id, "sync")} title={syncReady ? "Server-side senkronizasyon" : "Bu domain için tenant-scoped server ingest adapter'i bekleniyor"} className="h-9 rounded-xl bg-emerald-600 px-3 text-[10px] font-semibold text-white disabled:opacity-40">Senkronize et</button></div>
          {!configured && <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-amber-700 dark:text-amber-300"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Adapter hazır; server-side endpoint/credential environment ayarı bekleniyor.</p>}
          {configured && !syncReady && <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-amber-700 dark:text-amber-300"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Güvenlik nedeniyle {selected} verisi browser/localStorage sync'e kapalı. Kalıcı server ingest adapter'i tamamlanınca etkinleşir.</p>}
          {preview[def.id]?.length > 0 && <div className="mt-3 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="min-w-full text-[10px]"><thead><tr className="bg-slate-50 dark:bg-slate-800">{Object.keys(preview[def.id][0]).slice(0, 6).map((key) => <th key={key} className="px-2 py-2 text-left">{key}</th>)}</tr></thead><tbody>{preview[def.id].slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800">{Object.keys(preview[def.id][0]).slice(0, 6).map((key) => <td key={key} className="max-w-44 truncate px-2 py-2">{String(row[key] ?? "")}</td>)}</tr>)}</tbody></table></div>}
        </div>}
      </article>;
    })}</section>

    <section className="enterprise-card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="text-sm font-semibold">Senkronizasyon günlüğü</h2><p className="mt-1 text-[10px] text-slate-500">Tarayıcıda yalnız işlem özeti tutulur; çalışan/bordro/PDKS satırları tutulmaz.</p></div><button onClick={() => void load()} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold dark:border-slate-700"><RefreshCw className="h-3.5 w-3.5"/>Durumları yenile</button></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{runs.slice(0, 12).map((run) => <div key={run.id} className="grid gap-2 px-5 py-3 text-[10px] sm:grid-cols-[130px_100px_1fr_150px]"><span className="font-semibold">{run.provider}</span><span>{run.action}</span><span className="text-slate-500">{run.message}</span><span className={run.status === "success" ? "text-emerald-600" : "text-red-500"}>{run.status}</span></div>)}{!runs.length && <div className="p-6 text-center text-xs text-slate-500">Henüz entegrasyon çalışması yok.</div>}</div></section>
  </div>;
}

function StateBadge({ state }: { state: string }) {
  const active = state === "active" || state === "configured" || state === "built_in";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : state === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"}`}>{active ? <CheckCircle2 className="h-3 w-3"/> : <CircleAlert className="h-3 w-3"/>}{state === "ready_for_credentials" ? "Credential bekliyor" : state === "configured" ? "Yapılandırıldı" : state === "built_in" ? "Yerleşik" : state === "active" ? "Aktif" : state === "error" ? "Hata" : "Kontrol"}</span>;
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return <div className="enterprise-card flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30"><Icon className="h-4 w-4"/></span><div><p className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div></div>;
}
