"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Filter, Scale, Users } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { buildEvidenceGraph } from "@/lib/hr/evidenceGraph";

const timeOf = (item: any) => {
  const value = item?.date || item?.Tarih || item?.createdAt || item?.timestamp;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const normalizeName = (value: unknown) => String(value || "").trim().toLocaleLowerCase("tr-TR");

interface CalibrationRow {
  name: string;
  department: string;
  position: string;
  evaluator: string;
  finalPerformance: number;
  kpi: number | null;
  manager: number | null;
  competency: number | null;
  difference: number | null;
  evidenceScore: number;
  evidenceBand: string;
  managerNote: boolean;
  flags: string[];
}

export default function CalibrationPage() {
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [department, setDepartment] = useState("Tümü");
  const [onlyFlagged, setOnlyFlagged] = useState(true);

  useEffect(() => {
    const reload = () => {
      setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
      setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
    };
    reload();
    window.addEventListener("dataUpdated", reload);
    return () => window.removeEventListener("dataUpdated", reload);
  }, []);

  const latestByEmployee = useMemo(() => {
    const map = new Map<string, any>();
    [...history].sort((a, b) => timeOf(b) - timeOf(a)).forEach((record) => {
      const key = normalizeName(record.Personel || record.target || record["Ad Soyad"]);
      if (key && !map.has(key)) map.set(key, record);
    });
    return map;
  }, [history]);

  const evaluatorStats = useMemo(() => {
    const buckets = new Map<string, number[]>();
    latestByEmployee.forEach((record) => {
      const evaluator = String(record.evaluator || record.degerlendiren || "Belirtilmemiş");
      const manager = Number(record.manager_performance_score ?? record.manager_score ?? record.Performans ?? 0);
      if (!Number.isFinite(manager) || manager <= 0) return;
      const values = buckets.get(evaluator) || [];
      values.push(manager);
      buckets.set(evaluator, values);
    });
    const all = Array.from(buckets.values()).flat();
    const companyAvg = all.length ? all.reduce((sum, value) => sum + value, 0) / all.length : 0;
    return {
      companyAvg,
      byEvaluator: new Map(Array.from(buckets.entries()).map(([name, values]) => [name, {
        count: values.length,
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
      }])),
    };
  }, [latestByEmployee]);

  const rows = useMemo<CalibrationRow[]>(() => {
    return orgData.map((employee) => {
      const name = String(employee["Ad Soyad"] || "");
      const record = latestByEmployee.get(normalizeName(name));
      if (!record) return null;
      const finalPerformance = Number(record.Performans ?? record.performance ?? 0);
      const kpiRaw = Number(record.kpi_score ?? 0);
      const managerRaw = Number(record.manager_performance_score ?? 0);
      const competencyRaw = Number(record.competency_score ?? 0);
      const kpi = Number.isFinite(kpiRaw) && kpiRaw > 0 ? kpiRaw : null;
      const manager = Number.isFinite(managerRaw) && managerRaw > 0 ? managerRaw : null;
      const competency = Number.isFinite(competencyRaw) && competencyRaw > 0 ? competencyRaw : null;
      const difference = kpi !== null && manager !== null ? Number((kpi - manager).toFixed(2)) : null;
      const evaluator = String(record.evaluator || record.degerlendiren || "Belirtilmemiş");
      const evaluatorStat = evaluatorStats.byEvaluator.get(evaluator);
      const evaluatorBias = evaluatorStat && evaluatorStat.count >= 2 ? evaluatorStat.average - evaluatorStats.companyAvg : 0;
      const managerNote = Boolean(String(record.note || record.Not || "").trim());
      const context = {
        currentEvaluation: {
          finalPerformance,
          kpiScore: kpi,
          managerObservation: manager,
          competencyScore: competency,
          kpiManagerDifference: difference,
          managerNoteAvailable: managerNote,
          kpis: Array.isArray(record.kpi_items) ? record.kpi_items : [],
        },
        history: history
          .filter((item) => normalizeName(item.Personel || item.target) === normalizeName(name))
          .slice(0, 4)
          .map((item) => ({ date: item.date || item.Tarih || null, performance: item.Performans || item.performance || null })),
        roleTarget: { source: record.role_target_source || null },
      };
      const evidence = buildEvidenceGraph("performance", context);
      const flags: string[] = [];
      if (difference !== null && Math.abs(difference) >= 0.75) flags.push("KPI-yönetici farkı");
      if (!managerNote) flags.push("Davranış kanıtı eksik");
      if (evidence.score < 50) flags.push("Kanıt kapsamı düşük");
      if (Math.abs(evaluatorBias) >= 0.35) flags.push(evaluatorBias > 0 ? "Değerlendirici yüksek puan eğilimi" : "Değerlendirici düşük puan eğilimi");
      if (finalPerformance >= 4.5 && evidence.score < 60) flags.push("Yüksek skor / sınırlı kanıt");
      return {
        name,
        department: String(employee.Departman || "Belirtilmemiş"),
        position: String(employee.Pozisyon || "Belirtilmemiş"),
        evaluator,
        finalPerformance,
        kpi,
        manager,
        competency,
        difference,
        evidenceScore: evidence.score,
        evidenceBand: evidence.band,
        managerNote,
        flags,
      };
    }).filter(Boolean) as CalibrationRow[];
  }, [orgData, latestByEmployee, evaluatorStats, history]);

  const departments = useMemo(() => ["Tümü", ...Array.from(new Set(rows.map((row) => row.department))).sort((a, b) => a.localeCompare(b, "tr"))], [rows]);
  const visible = rows.filter((row) => (department === "Tümü" || row.department === department) && (!onlyFlagged || row.flags.length > 0));
  const flagged = rows.filter((row) => row.flags.length > 0).length;
  const highDifference = rows.filter((row) => row.difference !== null && Math.abs(row.difference) >= 0.75).length;
  const lowEvidence = rows.filter((row) => row.evidenceScore < 50).length;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">FutureHR Calibration Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Performans Kalibrasyon Merkezi</h1>
        <p className="mt-1 max-w-5xl text-sm leading-6 text-slate-500">KPI, yönetici gözlemi, kanıt kapsamı ve değerlendirici puanlama örüntülerini aynı masada gösterir. Sinyaller puanı değiştirmez; kalibrasyon toplantısında hangi kayıtların konuşulması gerektiğini önceliklendirir.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Değerlendirilen" value={rows.length} detail="Son kayıt bazında" />
        <Metric icon={AlertTriangle} label="Kalibrasyon sinyali" value={flagged} detail="En az bir kontrol noktası" tone="amber" />
        <Metric icon={Scale} label="KPI / yönetici farkı" value={highDifference} detail="|fark| ≥ 0,75" tone="blue" />
        <Metric icon={BarChart3} label="Düşük Evidence Score" value={lowEvidence} detail="50 puanın altında" tone="rose" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-400"/><div><h2 className="text-sm font-semibold">Kalibrasyon kuyruğu</h2><p className="mt-0.5 text-[10px] text-slate-400">Önce yüksek tutarsızlık ve zayıf kanıtlı kayıtları inceleyin.</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900">{departments.map((item) => <option key={item}>{item}</option>)}</select>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 dark:border-slate-700"><input type="checkbox" checked={onlyFlagged} onChange={(event) => setOnlyFlagged(event.target.checked)} />Sadece sinyalli</label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-400 dark:bg-slate-800/70"><tr><th className="px-4 py-3">Çalışan</th><th className="px-3 py-3">Performans</th><th className="px-3 py-3">KPI</th><th className="px-3 py-3">Yönetici</th><th className="px-3 py-3">Fark</th><th className="px-3 py-3">Yetkinlik</th><th className="px-3 py-3">Evidence</th><th className="px-3 py-3">Değerlendirici</th><th className="px-4 py-3">Kalibrasyon nedeni</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((row) => <CalibrationTableRow key={row.name} row={row} />)}
              {!visible.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Seçilen filtrede kalibrasyon kaydı yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-5 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300"><strong>Kalibrasyon prensibi:</strong> “yüksek/düşük puan eğilimi” bir önyargı teşhisi değildir. En az iki güncel değerlendirmede değerlendirici ortalamasının şirket ortalamasından ±0,35 sapması yalnızca konuşulması gereken bir örüntü olarak işaretlenir.</div>
    </div>
  );
}

function CalibrationTableRow({ row }: { row: CalibrationRow }) {
  return <tr className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="px-4 py-3"><p className="font-semibold text-slate-900 dark:text-white">{row.name}</p><p className="mt-1 text-[10px] text-slate-400">{row.position} · {row.department}</p></td><td className="px-3 py-3 font-semibold">{score(row.finalPerformance)}</td><td className="px-3 py-3">{score(row.kpi)}</td><td className="px-3 py-3">{score(row.manager)}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${row.difference !== null && Math.abs(row.difference) >= 0.75 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{row.difference === null ? "—" : `${row.difference > 0 ? "+" : ""}${row.difference.toFixed(2)}`}</span></td><td className="px-3 py-3">{score(row.competency)}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold ${row.evidenceScore >= 75 ? "bg-emerald-50 text-emerald-700" : row.evidenceScore >= 50 ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{row.evidenceScore}</span><span className="text-[10px] text-slate-400">{row.evidenceBand}</span></div></td><td className="px-3 py-3"><p className="max-w-[160px] truncate font-medium">{row.evaluator}</p><p className="mt-1 text-[10px] text-slate-400">{row.managerNote ? "Not mevcut" : "Not yok"}</p></td><td className="px-4 py-3"><div className="flex max-w-[320px] flex-wrap gap-1.5">{row.flags.length ? row.flags.map((flag) => <span key={flag} className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700">{flag}</span>) : <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>Belirgin sinyal yok</span>}</div></td></tr>;
}

function Metric({ icon: Icon, label, value, detail, tone = "slate" }: { icon: any; label: string; value: number; detail: string; tone?: string }) {
  const tones: Record<string, string> = { slate: "bg-slate-950 text-white", amber: "bg-amber-500 text-white", blue: "bg-blue-600 text-white", rose: "bg-rose-500 text-white" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone] || tones.slate}`}><Icon className="h-4 w-4"/></span></div><p className="mt-2 text-[10px] text-slate-400">{detail}</p></div>;
}

function score(value: number | null) { return value === null || !Number.isFinite(value) || value <= 0 ? "—" : `${value.toFixed(2)} / 5`; }
