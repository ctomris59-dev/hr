"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

/**
 * Historical name kept for API compatibility.
 * FutureHR uses restrained enterprise surfaces: crisp borders, minimal radius
 * and subtle motion instead of glass blur, glow or decorative elevation.
 */
export default function GlassCard({ children, className, hover = false, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={cn(
        "bg-white dark:bg-slate-900",
        "border border-slate-200 dark:border-slate-800",
        "rounded-[10px]",
        "p-5",
        hover && "hover:-translate-y-px hover:border-slate-300 dark:hover:border-slate-700",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
