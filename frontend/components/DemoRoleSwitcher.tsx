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
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3 h-3 text-slate-600" />
          <span className="text-xs font-medium text-slate-700 uppercase tracking-wider">
            Demo: Rol
          </span>
        </div>
        <select
          value={currentUserRole || ""}
          onChange={(e) => {
            const selectedRole = e.target.value as UserRole;
            if (selectedRole) {
              switchRole(selectedRole);
            }
          }}
          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Rol seçin...</option>
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

