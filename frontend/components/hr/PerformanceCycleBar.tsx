"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, LockKeyhole, PlayCircle, Scale, Target } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { filterDataByScope } from "@/app/utils/hierarchy";
import {
  PERFORMANCE_STAGE_LABELS,
  activePerformanceCycle,
  ensurePerformanceCycle,
  nextPerformanceStage,
  performanceCycleCompletion,
  savePerformanceCycles,
  type PerformanceCycle,
} from "@/lib/hr/performanceCycle";

export default function PerformanceCycleBar() {
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const load = () => {
      setCycles(ensurePerformanceCycle());
      setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
      setOrg(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
      setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
    };
    load();
    window.addEventListener("performanceCycleUpdated", load);
    window.addEventListener("dataUpdated", load);
    return () => {
      window.removeEventListener("performanceCycleUpdated", load);
      window.removeEventListener("dataUpdated", load);
    };
  }, []);

  const cycle = activePerformanceCycle(cycles);
  const scoped = useMemo(() => user ? filterDataByScope(org, user) : [], [org, user]);
  const completion = useMemo(() => cycle ? performanceCycleCompletion(cycle, scoped.map((item: any) => item["Ad Soyad"]), history) : { total: 0, completed: 0, rate: 0 }, [cycle, scoped, history]);
  const role = String(user?.role || "").toUpperCase();
  const canManage = role === "CEO" || role === "IK" || role === "HR" || role === "HR_ADMIN";

  if (!cycle) return null;

  const advance = () => {
    if (!canManage || cycle.stage === "LOCKED") return;
    const stage = nextPerformanceStage(cycle.stage);
    const next = cycles.map((item) => item.id === cycle.id ? { ...item, stage, ...(stage === "LOCKED" ? { lockedAt: new Date().toISOString() } : {}) } : item);
    savePerformanceCycles(next);
    setCycles(next);
  };

  const icon = cycle.stage === "LOCKED" ? LockKeyhole : cycle.stage === "CALIBRATION" ? Scale : cycle.stage === "OPEN" ? PlayCircle : Target;
  const Icon = icon;
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-white to-violet-50 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-violet-950/20">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Icon className="h-4 w-4"/></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-slate-900 dark:text-white">{cycle.name}</p><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-indigo-700 ring-1 ring-indigo-100 dark:bg-slate-900 dark:text-indigo-300 dark:ring-indigo-900">{PERFORMANCE_STAGE_LABELS[cycle.stage]}</span></div>
            <p className="mt-1 text-[10px] text-slate-500">Değerlendirme: {completion.completed}/{completion.total} · %{completion.rate} · Son tarih {new Date(cycle.evaluationDeadline).toLocaleDateString("tr-TR")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[170px]"><div className="mb-1 flex items-center justify-between text-[9px] text-slate-400"><span>Dönem kapsamı</span><b className="text-slate-600 dark:text-slate-300">%{completion.rate}</b></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${completion.rate}%` }}/></div></div>
          {canManage && cycle.stage !== "LOCKED" && <button type="button" onClick={advance} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-[10px] font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600"><CheckCircle2 className="h-3.5 w-3.5"/>Sonraki aşama</button>}
          {cycle.stage === "LOCKED" && <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900"><LockKeyhole className="h-3.5 w-3.5"/>Kilitli</span>}
        </div>
      </div>
      {cycle.stage === "LOCKED" && <div className="border-t border-indigo-100 px-4 py-2 text-[10px] text-amber-700 dark:border-indigo-900/40 dark:text-amber-300">Bu dönem demo yönetişiminde kilitlidir. Yeni puanlama yerine bir sonraki performans dönemi açılmalıdır.</div>}
    </section>
  );
}
