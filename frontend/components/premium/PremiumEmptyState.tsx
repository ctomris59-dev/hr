"use client";

import Link from "next/link";
import { ArrowRight, Database, FilterX, LockKeyhole, Sparkles, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const ICONS: Record<"data" | "filter" | "permission" | "insight", LucideIcon> = {
  data: Database,
  filter: FilterX,
  permission: LockKeyhole,
  insight: Sparkles,
};

export default function PremiumEmptyState({
  title,
  description,
  kind = "data",
  actionLabel,
  actionHref,
  secondaryLabel,
  onSecondary,
  compact = false,
}: {
  title: string;
  description: string;
  kind?: "data" | "filter" | "permission" | "insight";
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  compact?: boolean;
}) {
  const Icon = ICONS[kind];
  const reduced = useReducedMotion();
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={`premium-empty-state ${compact ? "is-compact" : ""}`}
      data-empty-kind={kind}
      role="status"
      aria-live="polite"
    >
      <div className="premium-empty-content">
        <span className="premium-empty-icon"><Icon className="h-5 w-5" strokeWidth={1.7} /></span>
        <p className="premium-empty-kicker">FutureHR çalışma durumu</p>
        <h3>{title}</h3>
        <p>{description}</p>
        {(actionLabel || secondaryLabel) && (
          <div className="premium-empty-actions">
            {actionLabel && actionHref && (
              <Link href={actionHref} className="pe-button pe-button-primary">
                {actionLabel}<ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {secondaryLabel && onSecondary && (
              <button type="button" onClick={onSecondary} className="pe-button pe-button-secondary">{secondaryLabel}</button>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}
