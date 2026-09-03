"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Cable, CheckCircle2, CircleAlert, Database, FileSpreadsheet, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { TURKEY_CONNECTORS, type IntegrationRunRecord, type TurkeyConnectorId } from "@/lib/hr/turkeyEnterprise";

type Status = { provider: TurkeyConnectorId; state: string; configured: boolean; missing?: string[]; capabilities?: string[]; name?: string; description?: string };
const nowId = () => `integration-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const CAPABILITY_LABELS: Record<string,string> = { employees:"Çalışan bilgileri", payroll:"Ücret / bordro", attendance:"Puantaj / devam", organization:"Organizasyon", leave:"İzin", sso:"Tek oturum açma" };
const domainLabel = (value:string) => CAPABILITY_LABELS[value] || value;

export default function IntegrationCenter() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [domain, setDomain] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Record<string, Record<string, unknown>[]>>({});
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
      const selected = domain[provider] || def.capabilities.filter((capability) => ["employees", "payroll", "attendance"].includes(capability))[0] || "employees";
      const response = await fetch(`/api/integrations/${provider}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, domain: selected }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);

      if (action === "preview") {
        setPreview((current) => ({ ...current, [provider]: Array.isArray(payload.rows) ? payload.rows : [] }));
        setMessage(`${def.name}: ${payload.normalizedCount ?? 0} kayıt kontrol edildi. Hassas alanlar gizlenerek önizleme hazırlandı.`);
      }
      if (action === "sync") {
        const imported = Number(payload.synced || 0);
        saveRun({ id: nowId(), provider, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), action, status: "success", imported, skipped: Number(payload.skipped || 0), message: `${domainLabel(selected)} · ${imported} kayıt işlendi.` });
        setMessage(`${def.name}: ${imported} kayıt başarıyla güncellendi. ${payload.created || 0} yeni, ${payload.updated || 0} güncel, ${payload.skipped || 0} atlanan kayıt.`);
      }
      if (action === "health") {
        saveRun({ id: nowId(), provider, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), action, status: "success", message: "Bağlantı doğrulandı." });
        setMessage(`${def.name}: bağlantı çalışıyor.`);
      }
      await load();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Bağlantı işlemi başarısız oldu.";
      saveRun({ id: nowId(), provider, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), action, status: "error", message: msg });
      setMessage(`İşlem tamamlanamadı. ${msg}`);
    } finally {
      setBusy("");
    }
  };

  const readyCount = TURKEY_CONNECTORS.filter((item) => item.id === "excel" || statuses[item.id]?.configured).length;

  return <div className="mx-auto max-w-7xl space-y-5 pb-8">
    <header className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-indigo-600">Sistem Yönetimi</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Entegrasyonlar</h1><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">FutureHR'ı kullandığınız ERP, bordro veya puantaj sistemiyle bağlayın. Bağlantı kurulmamış sistemlerde yalnızca gerekli kurulum adımı gösterilir.</p></div>
        <Link href="/admin/veri-aktarimi" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900"><FileSpreadsheet className="h-4 w-4"/>Excel / CSV ile veri ekle<ArrowRight className="h-3.5 w-3.5"/></Link>
      </div>
    </header>

    <div className="grid gap-3 md:grid-cols-3"><Stat icon={Database} label="Bağlantı seçeneği" value={TURKEY_CONNECTORS.length}/><Stat icon={CheckCircle2} label="Kullanıma hazır" value={`${readyCount}/${TURKEY_CONNECTORS.length}`}/><Stat icon={Activity} label="Son veri güncelleme" value={runs[0]?.completedAt ? new Date(runs[0].completedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Henüz yapılmadı"}/></div>
    {message && <div role="status" className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-5 text-slate-700 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-slate-200">{message}</div>}

    <section aria-labelledby="connections-title"><div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Bağlantılar</p><h2 id="connections-title" className="mt-1 text-lg font-semibold">Kullandığınız sistemi seçin</h2></div>
      <div className="grid gap-4 xl:grid-cols-2">{TURKEY_CONNECTORS.map((def) => {
        const st = statuses[def.id];
        const configured = def.id === "excel" || Boolean(st?.configured);
        const selectable = def.capabilities.filter((capability) => ["employees", "payroll", "attendance"].includes(capability));
        const selected = domain[def.id] || selectable[0] || "employees";
        return <article key={def.id} className="enterprise-card overflow-hidden">
          <div className="flex items-start gap-3 p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><Cable className="h-5 w-5 text-indigo-500"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{def.name}</h3><StateBadge state={st?.state || "loading"}/></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{friendlyDescription(def.id, def.description)}</p><div className="mt-2 flex flex-wrap gap-1.5">{def.capabilities.map((capability) => <span key={capability} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{domainLabel(capability)}</span>)}</div></div></div>
          {def.id === "excel" ? <div className="border-t border-slate-100 p-4 dark:border-slate-800"><Link href="/admin/veri-aktarimi" className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-[11px] font-semibold text-white">Dosya aktarımını aç<ArrowRight className="h-3.5 w-3.5"/></Link></div> : <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            {!configured ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20"><div className="flex items-start gap-2"><Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"/><div><p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">Kurulum gerekiyor</p><p className="mt-1 text-[10px] leading-4 text-amber-800 dark:text-amber-300">Bağlantı için kurumunuza ait erişim bilgileri sistem yöneticisi tarafından tanımlanmalı. Kod tarafı hazır.</p></div></div></div> : <>
              <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`domain-${def.id}`}>Aktarılacak veri</label><select id={`domain-${def.id}`} value={selected} onChange={(event) => setDomain((current) => ({ ...current, [def.id]: event.target.value }))} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[11px] dark:border-slate-700 dark:bg-slate-950">{selectable.map((capability) => <option key={capability} value={capability}>{domainLabel(capability)}</option>)}</select><button disabled={Boolean(busy)} onClick={() => call(def.id, "health")} className="h-9 rounded-xl border border-slate-200 px-3 text-[10px] font-semibold disabled:opacity-40 dark:border-slate-700">{busy === `${def.id}-health` ? "Kontrol ediliyor…" : "Bağlantıyı kontrol et"}</button><button disabled={Boolean(busy)} onClick={() => call(def.id, "preview")} className="h-9 rounded-xl border border-slate-200 px-3 text-[10px] font-semibold disabled:opacity-40 dark:border-slate-700">Önizle</button><button disabled={Boolean(busy)} onClick={() => call(def.id, "sync")} className="h-9 rounded-xl bg-emerald-600 px-3 text-[10px] font-semibold text-white disabled:opacity-40">Verileri güncelle</button></div>
              <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-emerald-700 dark:text-emerald-300"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Bağlantı kullanıma hazır. Hassas veriler güvenli sunucu katmanında işlenir.</p>
            </>}
            {preview[def.id]?.length > 0 && <div className="mt-3 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="min-w-full text-[10px]"><thead><tr className="bg-slate-50 dark:bg-slate-800">{Object.keys(preview[def.id][0]).slice(0, 6).map((key) => <th key={key} className="px-2 py-2 text-left">{key}</th>)}</tr></thead><tbody>{preview[def.id].slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800">{Object.keys(preview[def.id][0]).slice(0, 6).map((key) => <td key={key} className="max-w-44 truncate px-2 py-2">{String(row[key] ?? "")}</td>)}</tr>)}</tbody></table></div>}
            <details className="mt-3 text-[10px] text-slate-500"><summary className="cursor-pointer font-semibold">Teknik ayrıntılar</summary><p className="mt-2 leading-4">Durum: {st?.state || "kontrol ediliyor"}. Veri aktarımı tenant kapsamlı sunucu katmanında çalışır; hassas kayıt satırları tarayıcı depolamasına yazılmaz.</p></details>
          </div>}
        </article>;
      })}</div>
    </section>

    <section className="enterprise-card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="text-sm font-semibold">Son işlemler</h2><p className="mt-1 text-[10px] text-slate-500">Bağlantılar üzerinden yapılan son veri güncellemeleri.</p></div><button onClick={() => void load()} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold dark:border-slate-700"><RefreshCw className="h-3.5 w-3.5"/>Yenile</button></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{runs.slice(0, 12).map((run) => <div key={run.id} className="grid gap-2 px-5 py-3 text-[10px] sm:grid-cols-[130px_110px_1fr_120px]"><span className="font-semibold">{run.provider}</span><span>{run.action === "sync" ? "Veri güncelleme" : run.action === "health" ? "Bağlantı kontrolü" : "Önizleme"}</span><span className="text-slate-500">{run.message}</span><span className={run.status === "success" ? "text-emerald-600" : "text-red-500"}>{run.status === "success" ? "Başarılı" : "Başarısız"}</span></div>)}{!runs.length && <div className="p-6 text-center text-xs text-slate-500">Henüz işlem yapılmadı. Bir bağlantıyı kontrol ederek başlayabilirsiniz.</div>}</div></section>
  </div>;
}

function friendlyDescription(id:TurkeyConnectorId, fallback:string){
  if(id === "excel") return "Excel veya CSV dosyanızdaki çalışan verilerini kontrollü olarak FutureHR'a aktarın.";
  if(id === "logo" || id === "mikro" || id === "netsis" || id === "sap") return "Kurumunuzdaki çalışan ve organizasyon verilerini FutureHR ile bağlayın.";
  if(id === "pdks") return "Puantaj ve devam bilgilerini FutureHR ile güncel tutun.";
  if(id === "bordro") return "Bordro ve ücret bilgilerini yetkili kullanıcılar için güvenli şekilde aktarın.";
  return fallback;
}

function StateBadge({ state }: { state: string }) {
  const active = state === "active" || state === "configured" || state === "built_in";
  const error = state === "error";
  const text = active ? "Kullanıma hazır" : error ? "Kontrol gerekli" : state === "ready_for_credentials" ? "Kurulum gerekiyor" : "Kontrol ediliyor";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : error ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"}`}>{active ? <CheckCircle2 className="h-3 w-3"/> : <CircleAlert className="h-3 w-3"/>}{text}</span>;
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return <div className="enterprise-card flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30"><Icon className="h-4 w-4"/></span><div><p className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div></div>;
}
