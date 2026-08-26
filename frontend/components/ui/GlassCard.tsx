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

export default function GlassCard({ children, className, hover = false, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "bg-white/60 dark:bg-slate-900/60",
        "backdrop-blur-xl",
        "border border-white/20 dark:border-slate-700/30",
        "shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]",
        "rounded-2xl",
        "p-6",
        hover && "hover:bg-white/70 dark:hover:bg-slate-900/70 transition-all duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

