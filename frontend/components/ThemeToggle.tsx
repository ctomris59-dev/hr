"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="h-9 w-9 rounded-lg border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-800/70"
        aria-label="Tema değiştir"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-9 w-9 rounded-lg border border-slate-200 bg-white/70 shadow-sm backdrop-blur hover:shadow-md transition-all active:scale-95 dark:border-slate-700 dark:bg-slate-800/70"
      aria-label="Tema değiştir"
    >
      <Sun
        className={`absolute inset-0 m-auto h-4 w-4 text-amber-500 transition-all ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`absolute inset-0 m-auto h-4 w-4 text-slate-700 dark:text-slate-200 transition-all ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}

