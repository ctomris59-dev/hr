"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, Search, Target } from "lucide-react";

interface RoleRecord {
  title: string;
  canonicalTitle: string;
  family: string;
  level: string;
  levelLabel: string;
  modelVersion: string;
  confidence: "A" | "B" | "C" | null;
  source: "exact" | "family-level" | "level" | "generic";
  referenceCount: number;
  aliasMatched: boolean;
  competencies: Array<{ label: string; target: number; weight: number; criticality: number }>;
}

export default function RoleArchitecturePage() {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RoleRecord[]>([]);
  const [selected, setSelected] = useState<RoleRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/job-architecture?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        const next = Array.isArray(payload?.data) ? payload.data : [];
        setRecords(next);
        setSelected((current) => current && next.some((item: RoleRecord) => item.title === current.title) ? current : next[0] || null);
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") setRecords([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const families = useMemo(() => new Set(records.map((record) => record.family)).size, [records]);
  const exactCount = useMemo(() => records.filter((record) => record.source === "exact").length, [records]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">FutureHR Türkiye Job Architecture</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Rol & Yetkinlik Mimarisi</h1>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">Pozisyon adlarını kanonik role, job family ve seviyeye bağlayan; performans, kariyer, halefiyet, işe alım ve ücret kararlarının ortak rol kaynağı.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Stat label="Gösterilen rol" value={records.length} />
          <Stat label="Job family" value={families} />
          <Stat label="Doğrudan profil" value={exactCount} />
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pozisyon veya job family ara…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800" />
            </label>
          </div>
          <div className="max-h-[calc(100vh-255px)] overflow-y-auto p-2">
            {loading && <p className="p-4 text-xs text-slate-400">Rol mimarisi yükleniyor…</p>}
            {!loading && !records.length && <p className="p-4 text-xs text-slate-500">Eşleşen rol bulunamadı.</p>}
            {records.map((record) => (
              <button key={record.title} onClick={() => setSelected(record)} className={`mb-1 w-full rounded-xl border px-3 py-2.5 text-left transition ${selected?.title === record.title ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/25" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{record.title}</p>
                    <p className="mt-1 truncate text-[10px] text-slate-500">{record.family} · {record.level}</p>
                  </div>
                  {record.confidence && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${record.confidence === "A" ? "bg-emerald-50 text-emerald-700" : record.confidence === "B" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>Güven {record.confidence}</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {selected ? <RoleDetail record={selected} /> : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Bir rol seçin.</div>}
        </section>
      </div>
    </div>
  );
}

function RoleDetail({ record }: { record: RoleRecord }) {
  const top = record.competencies.slice(0, 5);
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600"><BriefcaseBusiness className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.1em]">Kanonik rol profili</span></div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">{record.canonicalTitle}</h2>
            {record.aliasMatched && <p className="mt-1 text-xs text-slate-500">Girilen unvan: {record.title} · FutureHR kanonik rolüne eşlendi.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill text={record.family} />
            <Pill text={`${record.level} · ${record.levelLabel}`} />
            <Pill text={record.modelVersion} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Info icon={BadgeCheck} title="Profil güveni" value={record.confidence ? `${record.confidence} seviyesi` : "Türetilmiş"} />
          <Info icon={Target} title="Profil kaynağı" value={record.source === "exact" ? "Pozisyona özel" : `${record.referenceCount} benzer rol`} />
          <Info icon={BriefcaseBusiness} title="Yetkinlik sayısı" value={`${record.competencies.length} ortak yetkinlik`} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Rol hedef profili</h3>
          <p className="mt-1 text-xs text-slate-500">Hedef seviye ve rol ağırlığı birlikte gösterilir. Bu değerler çalışan puanı değildir.</p>
          <div className="mt-4 space-y-3">
            {record.competencies.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-600 dark:text-slate-300">{item.label}</span><strong>{item.target.toFixed(1)} / 5</strong></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, item.target / 5 * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Kritik başarı yetkinlikleri</h3>
          <p className="mt-1 text-xs text-slate-500">FutureHR karar motorlarının role göre en fazla önem verdiği ilk 5 alan.</p>
          <div className="mt-4 space-y-2">
            {top.map((item, index) => (
              <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-white text-[10px] font-bold text-indigo-600 shadow-sm dark:bg-slate-900">{index + 1}</span><span className="truncate text-xs font-semibold">{item.label}</span></div><span className="text-[10px] font-semibold text-slate-500">Ağırlık {item.weight.toFixed(1)}</span></div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-[11px] leading-5 text-indigo-800 dark:bg-indigo-950/25 dark:text-indigo-300">Bu merkezi profil; Performans & Yetkinlik, Yetenek, Kariyer, Halefiyet, İşe Alım ve Ücret Karar Merkezi için ortak referans olacaktır.</div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="text-slate-400">{label}</span><strong className="ml-2 text-slate-900 dark:text-white">{value}</strong></div>; }
function Pill({ text }: { text: string }) { return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{text}</span>; }
function Info({ icon: Icon, title, value }: { icon: any; title: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><div className="flex items-center gap-2 text-slate-400"><Icon className="h-3.5 w-3.5"/><span className="text-[10px] uppercase tracking-[0.08em]">{title}</span></div><p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{value}</p></div>; }
