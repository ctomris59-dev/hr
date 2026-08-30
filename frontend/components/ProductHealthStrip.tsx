"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { buildProductHealth } from "@/lib/hr/productHealth";
import { useAuth } from "@/context/AuthContext";

export default function ProductHealthStrip() {
  const { currentUserRole } = useAuth();
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

  if (currentUserRole !== "ceo" && currentUserRole !== "hr_admin") return null;

  const topIssue = health.issues.find((issue) => issue.severity !== "bilgi") || health.issues[0];
  const statusClass = health.score >= 85 ? "text-emerald-700" : health.score >= 70 ? "text-slate-600" : "text-amber-700";

  return (
    <section className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${statusClass}`}>
            {health.score >= 85 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Veri hazırlığı</p>
              <span className={`border-l border-slate-200 pl-2 text-[10px] font-semibold tabular-nums dark:border-slate-700 ${statusClass}`}>{health.score}/100 · {health.band}</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">{topIssue?.title}: {topIssue?.detail}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Database className="h-3 w-3" />Performans %{health.metrics.performanceCoverage}</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Kanıt %{health.metrics.evidenceCoverage}</span>
          {topIssue?.route && <Link href={topIssue.route} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200">{topIssue.severity === "bilgi" ? "Özeti kullan" : "Eksik veriyi düzelt"}</Link>}
        </div>
      </div>
    </section>
  );
}
