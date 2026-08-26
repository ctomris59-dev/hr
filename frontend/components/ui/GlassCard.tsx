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
 * The visual treatment is intentionally no longer glassmorphic: enterprise
 * dashboards read as more trustworthy with quiet surfaces, crisp borders and
 * restrained elevation.
 */
export default function GlassCard({ children, className, hover = false, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: "easeOut" }}
      className={cn(
        "bg-white dark:bg-slate-900",
        "border border-slate-200 dark:border-slate-800",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.035)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.16)]",
        "rounded-xl",
        "p-5",
        hover && "hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
