"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { mapToUserRole, type UserRole } from "../app/data/roles";

const ROLE_LABELS: Record<UserRole, string> = {
  ceo: "CEO",
  hr_admin: "İK",
  director: "Direktör",
  manager: "Yönetici",
  employee: "Personel",
};

export default function WelcomeWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = () => setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
    load();
    window.addEventListener("storage", load);
    window.addEventListener("storageCleared", load);
    window.addEventListener("userChanged", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("storageCleared", load);
      window.removeEventListener("userChanged", load);
    };
  }, []);

  const greeting = useMemo(() => {
    if (!now) return "";
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return "Günaydın";
    if (hour >= 12 && hour < 17) return "Merhaba";
    if (hour >= 17 && hour < 22) return "İyi akşamlar";
    return "İyi geceler";
  }, [now]);

  const dateText = useMemo(() => {
    if (!now) return "";
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", weekday: "short" }).format(now);
  }, [now]);

  const timeText = useMemo(() => {
    if (!now) return "";
    return now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }, [now]);

  const mappedRole = mapToUserRole(String(user?.role || ""));
  const roleLabel = user ? ROLE_LABELS[mappedRole] : "";
  const scope = mappedRole === "ceo" || mappedRole === "hr_admin" ? "Tüm şirket" : mappedRole === "employee" ? "Kendi alanım" : user?.dept || user?.department || "Ekip";
  const fullName = String(user?.name || "").trim();
  const firstName = fullName.split(/\s+/)[0] || "";

  return (
    <div className="min-w-0 flex items-center gap-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-[13px] font-semibold text-slate-800 sm:text-sm dark:text-slate-100">
            <span className="sm:hidden">{greeting}{firstName ? `, ${firstName}` : ""}</span>
            <span className="hidden sm:inline">{greeting}{fullName ? `, ${fullName}` : ""}</span>
          </p>
          {user && <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-slate-500 sm:inline-flex dark:bg-slate-800 dark:text-slate-300">{roleLabel}</span>}
        </div>
        <p className="mt-0.5 hidden truncate text-[10px] text-slate-400 sm:block">{scope}</p>
      </div>
      <div className="hidden h-5 w-px bg-slate-200 lg:block dark:bg-slate-700" />
      <div className="hidden items-center gap-1.5 text-[11px] text-slate-400 lg:flex"><Clock3 className="h-3.5 w-3.5"/><span>{dateText} · {timeText}</span></div>
    </div>
  );
}
