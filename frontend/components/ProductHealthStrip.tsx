"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { buildProductHealth } from "@/lib/hr/productHealth";

export default function ProductHealthStrip() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("dataUpdated", refresh);
    window.addEventListener("storageCleared", refresh);
    window.addEventListener("talentMatrixUpdated", refresh);
    return () => {
      window.removeEventListener("dataUpdated", refresh);
      window.removeEventListener("storageCleared", refresh);
      window.removeEventListener("talentMatrixUpdated", refresh);
    };
  }, []);

  const health = useMemo(() => {
    void revision;
    return buildProductHealth(
      getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []),
      getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []),
      getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS, [])
    );
  }, [revision]);

  const topIssue = health.issues.find((issue) => issue.severity !== "bilgi") || health.issues[0];
  const tone = health.score >= 85
    ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200"
    : health.score >= 70
      ? "border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200"
      : "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200";

  return (
    <section className={`mb-4 rounded-2xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-slate-900/60">
            {health.score >= 85 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.1em]">FutureHR V1 Veri Hazırlığı</p>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold dark:bg-slate-900/60">{health.score}/100 · {health.band}</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 opacity-80">{topIssue?.title}: {topIssue?.detail}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/60 px-2.5 py-1.5 dark:bg-slate-900/50"><Database className="h-3 w-3" />Performans %{health.metrics.performanceCoverage}</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/60 px-2.5 py-1.5 dark:bg-slate-900/50"><ShieldCheck className="h-3 w-3" />Kanıt %{health.metrics.evidenceCoverage}</span>
          {topIssue?.route && <Link href={topIssue.route} className="rounded-lg bg-slate-950 px-3 py-1.5 text-white hover:bg-indigo-700 dark:bg-white dark:text-slate-950">{topIssue.severity === "bilgi" ? "Yönetici özetini kullan" : "Eksik veriyi düzelt"}</Link>}
        </div>
      </div>
    </section>
  );
}
