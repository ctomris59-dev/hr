"use client";

import { ArrowRight, BadgeCheck, BriefcaseBusiness, Crown, Gauge, Network, Target, TrendingUp } from "lucide-react";
import type { TalentDecisionSnapshot } from "@/lib/hr/talentDecisionChain";

interface Props {
  snapshot: TalentDecisionSnapshot;
  succession?: {
    score: number;
    readiness: string;
    evidenceScore?: number;
  } | null;
  title?: string;
}

export default function TalentDecisionChainCard({ snapshot, succession = null, title = "FutureHR Yetenek Karar Zinciri" }: Props) {
  const targetReadiness = snapshot.career.targetReadiness;
  const steps = [
    {
      key: "performance",
      label: "Performans",
      icon: TrendingUp,
      value: snapshot.performance.score > 0 ? `${snapshot.performance.score.toFixed(2)} / 5` : "Veri yok",
      detail: snapshot.performance.historyCount ? `${snapshot.performance.trendDirection} · trend %${snapshot.performance.trendScore}` : "İlk ölçüm bekleniyor",
    },
    {
      key: "competency",
      label: "Yetkinlik",
      icon: Gauge,
      value: snapshot.competency.score > 0 ? `${snapshot.competency.score.toFixed(2)} / 5` : "Veri yok",
      detail: `Rol uyumu %${snapshot.competency.currentRoleFit} · kapsam %${snapshot.competency.coverage}`,
    },
    {
      key: "talent",
      label: "Yetenek",
      icon: BadgeCheck,
      value: `${snapshot.talent.potential.score.toFixed(2)} / 5`,
      detail: `${snapshot.talent.nineBox} · veri güveni %${snapshot.talent.potential.confidence}`,
    },
    {
      key: "career",
      label: "Kariyer",
      icon: Target,
      value: targetReadiness ? `%${targetReadiness.index}` : "Hedef rol seçilmedi",
      detail: targetReadiness && snapshot.career.targetRole
        ? `${snapshot.career.targetRole.title} · ${targetReadiness.band}`
        : "Kariyer ekranında hedef rolle tamamlanır",
    },
    {
      key: "succession",
      label: "Halefiyet",
      icon: Crown,
      value: succession ? `%${Math.round(succession.score)}` : "Rol bazlı",
      detail: succession ? `${succession.readiness} hazır olma` : "Kritik rol seçildiğinde hesaplanır",
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/10">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <Network className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-indigo-600">Tek veri zinciri · {snapshot.version}</p>
            <h2 className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Performans, yetkinlik, potansiyel, kariyer ve halefiyet aynı çalışan kanıtlarından beslenir; modüller ayrı skor gerçekleri üretmez.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2 dark:border-indigo-900/50 dark:bg-slate-950">
          <BriefcaseBusiness className="h-3.5 w-3.5 text-indigo-500" />
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-400">Kanıt Güveni</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">%{snapshot.evidence.score} · {snapshot.evidence.band}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 px-4 py-4 md:grid-cols-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.key} className="relative min-w-0 px-2 py-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500">{step.label}</p>
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-slate-950 dark:text-white">{step.value}</p>
                <p className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-4 text-slate-400">{step.detail}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="absolute -right-1 top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-slate-300 md:block" />
              )}
            </div>
          );
        })}
      </div>

      {snapshot.signals.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-[10px] leading-4 text-slate-500">
              <strong className="text-slate-700 dark:text-slate-300">Karar öncesi kontrol:</strong> {snapshot.signals.slice(0, 3).join(" · ")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
