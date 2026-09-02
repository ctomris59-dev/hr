"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ className, variant = "rectangular", width, height }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const variantClasses = {
    text: "h-3.5 rounded-md",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn("premium-skeleton", variantClasses[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2"><Skeleton variant="text" width="42%" /><Skeleton variant="text" width="68%" /></div>
        <Skeleton variant="circular" width={38} height={38} />
      </div>
      <Skeleton className="mt-5" height={92} />
      <div className="mt-4 flex gap-2"><Skeleton variant="text" width="28%" /><Skeleton variant="text" width="22%" /></div>
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}</div>;
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between"><div className="space-y-2"><Skeleton variant="text" width={150} /><Skeleton variant="text" width={210} /></div><Skeleton variant="text" width={72} /></div>
      <div className="mt-6 flex items-end gap-2" style={{ height }}>
        {[46, 62, 38, 76, 54, 84, 69, 92, 73, 88, 78, 96].map((value, i) => <Skeleton key={i} className="flex-1 rounded-t-lg rounded-b-sm" height={`${value}%`} />)}
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-2"><Skeleton variant="text" width="34%" /><Skeleton variant="text" width="52%" /></div>
      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton variant="circular" width={34} height={34} />
            <div className="flex-1 space-y-2"><Skeleton variant="text" width={`${56 + (i % 3) * 8}%`} /><Skeleton variant="text" width={`${30 + (i % 2) * 10}%`} /></div>
            <Skeleton variant="text" width={52} />
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
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} variant="text" width={`${55 + (i % 2) * 18}%`} />)}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-4 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, col) => <Skeleton key={col} variant="text" width={`${48 + ((row + col) % 3) * 16}%`} />)}
        </div>
      ))}
    </div>
  );
}
