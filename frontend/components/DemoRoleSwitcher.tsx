"use client";

import { useAuth } from "../context/AuthContext";
import { UserRole } from "../app/data/roles";
import { Shield } from "lucide-react";

export default function DemoRoleSwitcher() {
  const { currentUserRole, switchRole } = useAuth();

  const roles: { value: UserRole; label: string }[] = [
    { value: "admin", label: "Admin" },
    { value: "director", label: "Director" },
    { value: "manager", label: "Manager" },
    { value: "employee", label: "Employee" },
  ];

  return (
    <div className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 lg:flex dark:border-slate-700 dark:bg-slate-800/70">
      <Shield className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.8} />
      <span className="hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 2xl:inline">
        Demo rol
      </span>
      <select
        value={currentUserRole || ""}
        onChange={(e) => {
          const selectedRole = e.target.value as UserRole;
          if (selectedRole) switchRole(selectedRole);
        }}
        aria-label="Demo rol seçimi"
        className="min-w-[76px] cursor-pointer border-0 bg-transparent py-0 text-xs font-medium text-slate-600 outline-none dark:text-slate-300"
      >
        <option value="">Rol seçin</option>
        {roles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
}
