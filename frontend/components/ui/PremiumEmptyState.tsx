"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles } from "lucide-react";

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
};

type Props = {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  actions?: Action[];
  className?: string;
};

export default function PremiumEmptyState({
  icon: Icon = Sparkles,
  eyebrow = "FutureHR",
  title,
  description,
  actions = [],
  className = "",
}: Props) {
  return (
    <section className={`premium-empty-state ${className}`}>
      <div className="relative z-[1] max-w-xl">
        <div className="premium-empty-icon"><Icon className="h-6 w-6" strokeWidth={1.7} /></div>
        <p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">{eyebrow}</p>
        <h3 className="mt-2">{title}</h3>
        <p>{description}</p>
        {actions.length > 0 && (
          <div className="premium-empty-actions">
            {actions.map((action) => {
              const base = action.variant === "secondary"
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                : "border border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-950/10 hover:-translate-y-0.5 hover:shadow-xl dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-200";
              const content = <><span>{action.label}</span><ArrowRight className="h-3.5 w-3.5" /></>;
              if (action.href) {
                return <Link key={action.label} href={action.href} className={`inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[11px] font-semibold ${base}`}>{content}</Link>;
              }
              return <button key={action.label} type="button" onClick={action.onClick} className={`inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[11px] font-semibold ${base}`}>{content}</button>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}
