"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserRole, mapToUserRole } from "../app/data/roles";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { getDemoPersona } from "../lib/hr/demoPersonas";

interface AuthContextType {
  currentUserRole: UserRole | null;
  switchRole: (role: UserRole) => void;
  internalRole: string | null;
  userName: string | null;
  authMode: "demo" | "secure" | null;
  authReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SAAS_MODE = process.env.NEXT_PUBLIC_DATA_MODE === "saas";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [internalRole, setInternalRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"demo" | "secure" | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) setAuthReady(true);
    };

    const clearUser = () => {
      if (cancelled) return;
      setCurrentUserRole(null);
      setInternalRole(null);
      setUserName(null);
      setAuthMode(null);
    };

    const applySecureUser = (user: any) => {
      if (cancelled || !user?.role) return;
      setCurrentUserRole(mapToUserRole(user.role));
      setInternalRole(String(user.role));
      setUserName(user.employee_name || user.username || null);
      setAuthMode("secure");

      // Compatibility mirror only. Authorization never trusts this value in SaaS mode.
      setStorageData(STORAGE_KEYS.CURRENT_USER, {
        username: user.username,
        name: user.employee_name || user.username,
        role: user.role,
        dept: user.department || "",
        department: user.department || "",
        position: user.position || "",
        employeeId: user.employee_id,
        tenantId: user.tenant_id,
        tenantSlug: user.tenant_slug,
        tenantName: user.tenant_name,
        authMode: "secure",
      });
    };

    const loadSecureSession = async () => {
      try {
        const response = await fetch("/api/secure-auth/session", { cache: "no-store", credentials: "same-origin" });
        const payload = await response.json().catch(() => null);
        if (response.ok && payload?.authenticated && payload?.user) applySecureUser(payload.user);
        else clearUser();
      } catch {
        clearUser();
      } finally {
        finish();
      }
    };

    const loadDemoUser = () => {
      const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
      if (currentUser && typeof currentUser === "object" && "role" in currentUser) {
        const userRole = (currentUser as any).role;
        setCurrentUserRole(mapToUserRole(userRole));
        setInternalRole(userRole);
        setUserName((currentUser as any).name || null);
        setAuthMode((currentUser as any).authMode === "secure" ? "secure" : "demo");
      } else clearUser();
      finish();
    };

    const load = () => {
      if (SAAS_MODE) void loadSecureSession();
      else loadDemoUser();
    };

    load();
    const handleStorageChange = (e: StorageEvent) => {
      if (!SAAS_MODE && (!e.key || e.key === STORAGE_KEYS.CURRENT_USER)) loadDemoUser();
    };
    const refresh = () => load();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userChanged", refresh);
    window.addEventListener("storageCleared", refresh);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userChanged", refresh);
      window.removeEventListener("storageCleared", refresh);
    };
  }, []);

  const switchRole = (role: UserRole) => {
    // Role switching is a demo-only feature. In SaaS mode the backend session is authoritative.
    if (SAAS_MODE) return;
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && typeof currentUser === "object" && (currentUser as any).authMode === "secure") return;

    const persona = getDemoPersona(role);
    setStorageData(STORAGE_KEYS.CURRENT_USER, persona);
    setCurrentUserRole(role);
    setInternalRole(persona.role);
    setUserName(persona.name);
    setAuthMode("demo");
    setAuthReady(true);
    window.dispatchEvent(new CustomEvent("userChanged", { detail: persona }));
  };

  return (
    <AuthContext.Provider value={{ currentUserRole, switchRole, internalRole, userName, authMode, authReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
