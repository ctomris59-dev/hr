"use client";

import { ReactNode, useEffect, useState } from "react";
import { useSimulation } from "../context/SimulationContext";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeWrapperProps {
  children: ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { currentDate } = useSimulation();
  const [themeMode, setThemeMode] = useState<"present" | "past" | "future">("present");

  useEffect(() => {
    const today = new Date();
    const simDate = new Date(currentDate);
    
    if (simDate < today) {
      setThemeMode("past");
    } else if (simDate > today) {
      setThemeMode("future");
    } else {
      setThemeMode("present");
    }
  }, [currentDate]);

  return (
    <div
      className={`
        min-h-screen transition-all duration-500
        ${
          themeMode === "past"
            ? "bg-[#fdfcf8] sepia-[0.15]"
            : themeMode === "future"
            ? "bg-[#f8fafc]"
            : "bg-slate-50"
        }
      `}
    >
      {/* Past Mode Watermark */}
      {themeMode === "past" && (
        <div className="fixed inset-0 pointer-events-none z-50 opacity-5">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] text-6xl font-bold text-slate-400">
            GEÇMİŞ SİMÜLASYONU
          </div>
        </div>
      )}

      {/* Future Mode Badge */}
      {themeMode === "future" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-4 right-4 z-50 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold"
        >
          <span>🤖</span>
          <span>AI PREDICTION MODE</span>
        </motion.div>
      )}

      {/* Content with theme effects */}
      <div
        className={`
          transition-all duration-500
          ${
            themeMode === "future"
              ? "[&_button]:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] [&_svg]:drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]"
              : ""
          }
        `}
      >
        {children}
      </div>
    </div>
  );
}

