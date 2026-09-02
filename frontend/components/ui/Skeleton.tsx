"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  delay?: number;
}

export default function Skeleton({ className, variant = "rectangular", width, height, delay = 0 }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const variantClasses = { text: "h-3.5 rounded-md", circular: "rounded-full", rectangular: "rounded-xl" };
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("premium-skeleton", variantClasses[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2"><Skeleton variant="text" width="42%" delay={delay} /><Skeleton height={28} width="46%" delay={delay + .02} /></div>
        <Skeleton variant="rectangular" width={38} height={38} className="rounded-xl" delay={delay + .03} />
      </div>
      <Skeleton className="mt-5" height={6} delay={delay + .05} />
      <Skeleton variant="text" className="mt-3" width="64%" delay={delay + .06} />
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} delay={i * .035} />)}</div>;
}

export function SkeletonChart({ height = 300, delay = 0 }: { height?: number; delay?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4"><div className="space-y-2"><Skeleton variant="text" width={120} delay={delay} /><Skeleton height={18} width={220} delay={delay + .02} /><Skeleton variant="text" width={270} delay={delay + .04} /></div><Skeleton variant="text" width={74} delay={delay + .03} /></div>
      <div className="relative mt-6 overflow-hidden rounded-xl border border-slate-100 p-3 dark:border-slate-800" style={{ height }}>
        <div className="absolute inset-x-3 bottom-3 top-3 flex items-end gap-2">
          {[42, 58, 38, 72, 54, 84, 66, 90, 71, 86, 76, 94].map((value, i) => <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-sm" height={`${value}%`} delay={delay + .04 + i * .012} />)}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4, delay = 0 }: { count?: number; delay?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-2"><Skeleton variant="text" width="34%" delay={delay} /><Skeleton height={17} width="52%" delay={delay + .02} /></div>
      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton variant="circular" width={8} height={8} delay={delay + .03 + i * .02} />
            <div className="flex-1 space-y-2"><Skeleton variant="text" width={`${56 + (i % 3) * 8}%`} delay={delay + .03 + i * .02} /><Skeleton variant="text" width={`${30 + (i % 2) * 10}%`} delay={delay + .04 + i * .02} /></div>
            <Skeleton height={26} width={38} className="rounded-lg" delay={delay + .04 + i * .02} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/20" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} variant="text" width={`${55 + (i % 2) * 18}%`} delay={i * .02} />)}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-4 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, col) => <Skeleton key={col} variant="text" width={`${48 + ((row + col) % 3) * 16}%`} delay={.03 + row * .018 + col * .008} />)}
        </div>
      ))}
    </div>
  );
}

export function SkeletonExecutiveHero() {
  return (
    <div className="grid min-h-[164px] grid-cols-[minmax(0,1fr)_140px] items-center gap-8 rounded-[24px] border border-slate-200/80 bg-white px-7 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 max-md:grid-cols-1">
      <div>
        <div className="flex gap-2"><Skeleton height={24} width={142} className="rounded-full" /><Skeleton height={24} width={126} className="rounded-full" delay={.03} /></div>
        <Skeleton height={34} width={250} className="mt-3 rounded-lg" delay={.04} />
        <Skeleton variant="text" width="78%" className="mt-3" delay={.06} /><Skeleton variant="text" width="58%" className="mt-2" delay={.07} />
        <div className="mt-5 flex gap-2"><Skeleton height={36} width={132} delay={.08} /><Skeleton height={36} width={100} delay={.09} /></div>
      </div>
      <Skeleton variant="circular" width={126} height={126} className="max-md:hidden" delay={.08} />
    </div>
  );
}

export function SkeletonExecutiveDashboard() {
  return (
    <div className="premium-page-skeleton mx-auto max-w-[1680px] space-y-4 pb-6" aria-label="FutureHR yönetici özeti yükleniyor" aria-busy="true">
      <SkeletonExecutiveHero />
      <SkeletonKpiGrid count={5} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_390px]"><SkeletonChart height={286} delay={.08} /><SkeletonList count={4} delay={.1} /></div>
      <div className="grid gap-4 xl:grid-cols-2"><SkeletonChart height={250} delay={.12} /><SkeletonChart height={250} delay={.14} /></div>
    </div>
  );
}
