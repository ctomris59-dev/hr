"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpenCheck, CheckCircle2, ClipboardCheck,
  Download, Gauge, LineChart, RefreshCw, ShieldCheck, Sparkles, Target, TrendingDown,
  TrendingUp, Users,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { filterDataByScope } from "@/app/utils/hierarchy";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import {
  buildDevelopmentAnalytics,
  type DevelopmentAnalyticsPeriod,
  type DevelopmentEffectivenessRow,
} from "@/lib/hr/developmentAnalytics";

const PERIODS: Array<{ value: DevelopmentAnalyticsPeriod; label: string }> = [
  { value: 3, label: "3 ay" },
  { value: 6, label: "6 ay" },
  { value: 12, label: "12 ay" },
  { value: "all", label: "Tüm dönem" },
];

function formatDelta(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`.replace(".", ",");
}

function formatPct(value: number | null) {
  return value === null ? "—" : `%${value}`;
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

export default function GelisimAnalitigiPage() {
  const { orgData, history360 } = useData();
  const [user, setUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [period, setPeriod] = useState<DevelopmentAnalyticsPeriod>(12);
  const [competencyFilter, setCompetencyFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  useEffect(() => {
    const reload = () => {
      setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
      setAssignments(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []));
    };
    reload();
    window.addEventListener("dataUpdated", reload);
    return () => window.removeEventListener("dataUpdated", reload);
  }, []);

  const scopedOrg = useMemo(() => user ? filterDataByScope(orgData || [], user) : [], [orgData, user]);
  const scopedNames = useMemo(() => new Set(scopedOrg.map((item: any) => String(item?.["Ad Soyad"] || ""))), [scopedOrg]);
  const scopedAssignments = useMemo(
    () => assignments.filter((item) => scopedNames.has(String(item?.employee || ""))),
    [assignments, scopedNames]
  );
  const analytics = useMemo(
    () => buildDevelopmentAnalytics(scopedAssignments, history360 || [], { period }),
    [scopedAssignments, history360, period]
  );

  const filteredDetails = useMemo(() => analytics.details.filter((entry) => {
    if (competencyFilter !== "all" && entry.competencyCode !== competencyFilter) return false;
    if (methodFilter !== "all" && entry.interventionType !== methodFilter) return false;
    return true;
  }), [analytics.details, competencyFilter, methodFilter]);

  const methods = useMemo(() => Array.from(new Set(analytics.methods.map((row) => row.label))), [analytics.methods]);
  const role = String(user?.role || "").toUpperCase();
  const companyScope = ["CEO", "IK", "HR", "HR_ADMIN"].includes(role);
  const summary = analytics.summary;

  const exportCsv = () => {
    const header = ["Çalışan", "Yetkinlik", "Müdahale", "Yöntem", "Kanıt", "Etki Durumu", "Başlangıç", "Son Ölçüm", "Delta", "Yeniden Ölçüm Hedefi"];
    const rows = filteredDetails.map(({ assignment, impact, competencyLabel, interventionName, interventionType }) => [
      assignment?.employee,
      competencyLabel,
      interventionName,
      interventionType,
      assignment?.managerVerified ? "Doğrulanmış" : "Doğrulanmamış",
      impact.label,
      impact.baseline ?? "",
      impact.post ?? "",
      impact.delta ?? "",
      impact.reassessDueAt ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `futurehr-gelisim-etkinligi-${period === "all" ? "tum-donem" : `${period}-ay`}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">Learning Impact · Development Effectiveness</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">Yetkinlik Bazlı Gelişim Etkinliği</h1>
          <p className="mt-1 max-w-5xl text-sm text-slate-500">Hangi gelişim müdahalelerinin doğrulanmış işe transferi ve yeniden ölçüm sonrası pozitif değişimle birlikte görüldüğünü izleyin. Sonuçlar nedensellik iddiası değildir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/egitim" className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><BookOpenCheck className="h-4 w-4"/>Eğitim & Gelişim</Link>
          <button type="button" onClick={exportCsv} className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"><Download className="h-4 w-4"/>CSV indir</button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">{PERIODS.map((item) => <button key={String(item.value)} type="button" onClick={() => setPeriod(item.value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${period === item.value ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"}`}>{item.label}</button>)}</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={competencyFilter} onChange={(event) => setCompetencyFilter(event.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="all">Tüm yetkinlikler</option>{analytics.competencies.map((row) => <option key={row.key} value={row.key}>{row.label}</option>)}</select>
            <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="all">Tüm yöntemler</option>{methods.map((method) => <option key={method} value={method}>{method}</option>)}</select>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">Kapsam: {companyScope ? "Şirket geneli" : "Yetkiniz dahilindeki ekip"} · {scopedNames.size} çalışan · {summary.assignments} gelişim kaydı</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Atanan müdahale" value={summary.assignments} note={`${summary.completed} tamamlandı`} icon={Target}/>
        <Metric label="Doğrulanmış transfer" value={summary.verified} note={`Doğrulama ${formatPct(summary.verificationRate)}`} icon={ShieldCheck}/>
        <Metric label="Yeniden ölçülen" value={summary.measured} note={`Kapsam ${formatPct(summary.measurementRate)}`} icon={RefreshCw}/>
        <Metric label="Pozitif değişim" value={formatPct(summary.positiveRate)} note={`${summary.improved}/${summary.measured || 0} ölçüm`} icon={TrendingUp} positive={Number(summary.positiveRate || 0) >= 60}/>
        <Metric label="Ort. değişim" value={formatDelta(summary.averageDelta)} note="5 puanlık yetkinlik ölçeği" icon={LineChart} positive={Number(summary.averageDelta || 0) > 0}/>
        <Metric label="Ölçüm gecikmesi" value={summary.reassessmentDue} note={`${summary.scheduled} planlı`} icon={AlertTriangle} warning={summary.reassessmentDue > 0}/>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Yetkinlik görünümü</p><h2 className="mt-1 text-sm font-semibold">10 yetkinlikte ölçülen gelişim sinyali</h2></div><BarChart3 className="h-5 w-5 text-emerald-600"/></div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="pb-2 pr-3">Yetkinlik</th><th className="pb-2 text-right">Atama</th><th className="pb-2 text-right">Doğrulama</th><th className="pb-2 text-right">Ölçüm</th><th className="pb-2 text-right">Pozitif</th><th className="pb-2 text-right">Ort. Δ</th><th className="pb-2 text-right">Geciken</th></tr></thead>
              <tbody>{analytics.competencies.map((row) => <CompetencyRow key={row.key} row={row}/>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Yönetim sinyalleri</p><h2 className="mt-1 text-sm font-semibold">Neyi güçlendirmeli, neyi doğrulamalı?</h2></div><Sparkles className="h-5 w-5 text-violet-600"/></div>
          <div className="mt-4 space-y-2">
            <Signal tone="green" title="En güçlü yetkinlik sinyali" text={analytics.signals.strongestCompetency ? `${analytics.signals.strongestCompetency.label}: ort. ${formatDelta(analytics.signals.strongestCompetency.averageDelta)} · n=${analytics.signals.strongestCompetency.measured}.` : "Henüz karşılaştırılabilir yeniden ölçüm yok."}/>
            <Signal tone="green" title="En güçlü yöntem sinyali" text={analytics.signals.strongestMethod ? `${analytics.signals.strongestMethod.label}: ort. ${formatDelta(analytics.signals.strongestMethod.averageDelta)} · pozitif ${formatPct(analytics.signals.strongestMethod.positiveRate)}.` : "Yöntem karşılaştırması için ölçüm bekleniyor."}/>
            <Signal tone={analytics.signals.lowestVerificationMethod ? "amber" : "green"} title="Transfer doğrulama disiplini" text={analytics.signals.lowestVerificationMethod ? `${analytics.signals.lowestVerificationMethod.label} yönteminde doğrulama ${formatPct(analytics.signals.lowestVerificationMethod.verificationRate)} ile en düşük.` : "Tamamlanan müdahalelerde belirgin doğrulama açığı yok."}/>
            <Signal tone={analytics.signals.mostOverdueCompetency ? "red" : "green"} title="Yeniden ölçüm gecikmesi" text={analytics.signals.mostOverdueCompetency ? `${analytics.signals.mostOverdueCompetency.label}: ${analytics.signals.mostOverdueCompetency.reassessmentDue} yeniden ölçüm gecikmiş.` : "Gecikmiş yeniden ölçüm bulunmuyor."}/>
            <Signal tone={analytics.signals.measurementCoverageRisk ? "amber" : "green"} title="Ölçüm kapsamı" text={analytics.signals.measurementCoverageRisk ? `Doğrulanmış müdahalelerin yalnız ${formatPct(summary.measurementRate)} kadarı yeniden ölçülmüş. Etkinlik yorumunu genişletmeden önce ölçüm kapsamını artırın.` : `Yeniden ölçüm kapsamı ${formatPct(summary.measurementRate)}.`}/>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Müdahale yöntemi</p><h2 className="mt-1 text-sm font-semibold">Hangi gelişim yaklaşımı nasıl ilerliyor?</h2></div><Gauge className="h-5 w-5 text-indigo-600"/></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{analytics.methods.map((row) => <MethodCard key={row.key} row={row}/>)}</div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Müdahale sıralaması</p><h2 className="mt-1 text-sm font-semibold">Pozitif değişimle birlikte görülen içerikler</h2></div><TrendingUp className="h-5 w-5 text-emerald-600"/></div>
          <div className="mt-4 space-y-2">{analytics.interventions.filter((row) => row.measured > 0).slice(0, 8).map((row, index) => <div key={row.key} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold text-slate-400">#{index + 1} · n={row.measured} · {row.evidenceMaturity}</p><p className="mt-1 text-xs font-semibold leading-5">{row.label}</p></div><span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${Number(row.averageDelta || 0) > 0 ? "bg-emerald-50 text-emerald-700" : Number(row.averageDelta || 0) < 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{formatDelta(row.averageDelta)}</span></div><div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400"><span>Pozitif {formatPct(row.positiveRate)}</span><span>•</span><span>Doğrulama {formatPct(row.verificationRate)}</span></div></div>)}{!analytics.interventions.some((row) => row.measured > 0) && <Empty text="Müdahale bazlı karşılaştırma için yeniden ölçüm verisi bekleniyor."/>}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Kanıt zinciri</p><h2 className="mt-1 text-sm font-semibold">Kayıt bazında yeniden ölçüm takibi</h2></div><span className="text-[10px] text-slate-400">{filteredDetails.length} kayıt</span></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="pb-2">Çalışan</th><th className="pb-2">Yetkinlik / Müdahale</th><th className="pb-2">Kanıt</th><th className="pb-2">Yeniden ölçüm</th><th className="pb-2 text-right">Değişim</th></tr></thead><tbody>{filteredDetails.map(({ assignment, impact, competencyLabel, interventionName }) => <tr key={assignment.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 pr-3"><p className="font-semibold">{assignment.employee}</p><p className="mt-0.5 text-[10px] text-slate-400">{assignment.assignedBy ? `${assignment.assignedBy} tarafından` : "Sistem ataması"}</p></td><td className="py-3 pr-3"><p className="text-[10px] font-bold uppercase text-emerald-600">{competencyLabel}</p><p className="mt-0.5 max-w-[280px] font-medium leading-5">{interventionName}</p></td><td className="py-3 pr-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${assignment.managerVerified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{assignment.managerVerified ? <CheckCircle2 className="h-3 w-3"/> : <ClipboardCheck className="h-3 w-3"/>}{assignment.managerVerified ? "Doğrulanmış" : "Bekliyor"}</span></td><td className="py-3 pr-3"><p className="font-semibold">{impact.label}</p><p className="mt-0.5 text-[10px] text-slate-400">{impact.postDate ? `Son ölçüm ${shortDate(impact.postDate)}` : `Hedef ${shortDate(impact.reassessDueAt)}`}</p></td><td className="py-3 text-right"><span className={`font-bold ${impact.direction === "improved" ? "text-emerald-600" : impact.direction === "declined" ? "text-red-600" : "text-slate-500"}`}>{impact.state === "measured" ? `${impact.competency}: ${impact.baseline?.toFixed(2)} → ${impact.post?.toFixed(2)}` : "—"}</span>{impact.state === "measured" && <p className="mt-0.5 text-[10px] font-semibold text-slate-400">Δ {formatDelta(impact.delta)}</p>}</td></tr>)}</tbody></table></div>
        </section>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-[11px] leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><div><strong>Yorumlama kuralı:</strong> FutureHR, bir müdahaleyi “etkili” ilan etmek için yalnız kurs tamamlama verisini kullanmaz. İşe transfer kanıtı yönetici tarafından doğrulanmalı ve aynı yetkinlik planlanan tarihten sonra yeniden ölçülmelidir. Gösterilen Δ değerleri müdahale öncesi/sonrası değişimdir; kontrol grubu olmadığı için nedensellik kanıtı veya bilimsel etki büyüklüğü olarak yorumlanmamalıdır.</div></div>
      </section>
    </div>
  );
}

function Metric({ label, value, note, icon: Icon, positive, warning }: { label: string; value: string | number; note: string; icon: any; positive?: boolean; warning?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-semibold tracking-[-.03em]">{value}</p><p className={`mt-2 text-[10px] ${warning ? "text-amber-600" : positive ? "text-emerald-600" : "text-slate-400"}`}>{note}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-emerald-600 dark:bg-slate-800"><Icon className="h-4 w-4"/></span></div></div>;
}

function CompetencyRow({ row }: { row: DevelopmentEffectivenessRow }) {
  return <tr className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 pr-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[9px] font-bold text-emerald-700">{row.key}</span><div><p className="font-semibold">{row.label}</p><p className="mt-0.5 text-[9px] text-slate-400">{row.evidenceMaturity}</p></div></div></td><td className="py-3 text-right font-semibold">{row.assignments}</td><td className="py-3 text-right">{formatPct(row.verificationRate)}</td><td className="py-3 text-right">{formatPct(row.measurementRate)}</td><td className="py-3 text-right">{formatPct(row.positiveRate)}</td><td className={`py-3 text-right font-bold ${Number(row.averageDelta || 0) > 0 ? "text-emerald-600" : Number(row.averageDelta || 0) < 0 ? "text-red-600" : "text-slate-500"}`}>{formatDelta(row.averageDelta)}</td><td className={`py-3 text-right font-semibold ${row.reassessmentDue ? "text-amber-600" : "text-slate-400"}`}>{row.reassessmentDue}</td></tr>;
}

function MethodCard({ row }: { row: DevelopmentEffectivenessRow }) {
  const rate = row.positiveRate ?? 0;
  return <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{row.label}</p><p className="mt-1 text-[10px] text-slate-400">{row.assignments} atama · {row.verified} doğrulanmış · n={row.measured} ölçüm</p></div><span className={`rounded-lg px-2 py-1 text-xs font-bold ${Number(row.averageDelta || 0) > 0 ? "bg-emerald-100 text-emerald-700" : Number(row.averageDelta || 0) < 0 ? "bg-red-100 text-red-700" : "bg-white text-slate-500"}`}>{formatDelta(row.averageDelta)}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, rate))}%` }}/></div><div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>Pozitif {formatPct(row.positiveRate)}</span><span>Doğrulama {formatPct(row.verificationRate)}</span><span>Ölçüm {formatPct(row.measurementRate)}</span></div></div>;
}

function Signal({ tone, title, text }: { tone: "green" | "amber" | "red"; title: string; text: string }) {
  const style = tone === "red" ? "border-red-100 bg-red-50/60 text-red-700" : tone === "amber" ? "border-amber-100 bg-amber-50/60 text-amber-700" : "border-emerald-100 bg-emerald-50/60 text-emerald-700";
  const Icon = tone === "red" ? TrendingDown : tone === "amber" ? AlertTriangle : TrendingUp;
  return <div className={`rounded-xl border p-3 ${style}`}><div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0"/><div><p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-600 dark:text-slate-300">{text}</p></div></div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400"><Users className="mx-auto mb-2 h-4 w-4"/>{text}</div>;
}
