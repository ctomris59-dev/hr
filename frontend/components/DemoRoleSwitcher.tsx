"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../app/data/roles";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { DEMO_PERSONAS, PRIMARY_DEMO_ROLES } from "../lib/hr/demoPersonas";
import { UsersRound } from "lucide-react";

const ROLE_LABELS: Record<UserRole, string> = {
  ceo: "CEO",
  hr_admin: "İK",
  director: "Direktör",
  manager: "Yönetici",
  employee: "Personel",
};

export default function DemoRoleSwitcher() {
  const { currentUserRole, switchRole } = useAuth();
  const [secureSession, setSecureSession] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const user = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
      setSecureSession(user?.authMode === "secure");
    };
    refresh();
    window.addEventListener("userChanged", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("userChanged", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (secureSession) return null;

  return (
    <div className="hidden h-9 items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 lg:flex dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <UsersRound className="h-3.5 w-3.5 text-indigo-500" strokeWidth={1.8} />
      <span className="hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-500 2xl:inline">Demo persona</span>
      <select
        value={currentUserRole || ""}
        onChange={(e) => { const selectedRole = e.target.value as UserRole; if (selectedRole) switchRole(selectedRole); }}
        aria-label="Demo persona seçimi"
        className="min-w-[132px] cursor-pointer border-0 bg-transparent py-0 text-xs font-semibold text-slate-700 outline-none dark:text-slate-200"
      >
        {PRIMARY_DEMO_ROLES.map((role) => (
          <option key={role} value={role}>{ROLE_LABELS[role]} · {DEMO_PERSONAS[role].name}</option>
        ))}
      </select>
    </div>
  );
}
