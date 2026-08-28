"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserRole, getDefaultRoute, mapToUserRole } from "../app/data/roles";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { getDemoPersona } from "../lib/hr/demoPersonas";

interface AuthContextType {
  currentUserRole: UserRole | null;
  switchRole: (role: UserRole) => void;
  internalRole: string | null;
  userName: string | null;
  authMode: "demo" | "secure" | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [internalRole, setInternalRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"demo" | "secure" | null>(null);

  useEffect(() => {
    const loadUserRole = () => {
      const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
      if (currentUser && typeof currentUser === "object" && "role" in currentUser) {
        const userRole = (currentUser as any).role;
        const mappedRole = mapToUserRole(userRole);
        setCurrentUserRole(mappedRole);
        setInternalRole(userRole);
        setUserName((currentUser as any).name || null);
        setAuthMode((currentUser as any).authMode === "secure" ? "secure" : "demo");
      } else {
        setCurrentUserRole(null);
        setInternalRole(null);
        setUserName(null);
        setAuthMode(null);
      }
    };

    loadUserRole();

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEYS.CURRENT_USER) loadUserRole();
    };
    const refresh = () => loadUserRole();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userChanged", refresh);
    window.addEventListener("storageCleared", refresh);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userChanged", refresh);
      window.removeEventListener("storageCleared", refresh);
    };
  }, []);

  const switchRole = (role: UserRole) => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);

    // Secure session rolü sunucu tarafından belirlenir. Demo persona anahtarı
    // gerçek kullanıcıyı yükseltmek/düşürmek için kullanılamaz.
    if (currentUser && typeof currentUser === "object" && (currentUser as any).authMode === "secure") return;

    const persona = getDemoPersona(role);
    setStorageData(STORAGE_KEYS.CURRENT_USER, persona);
    setCurrentUserRole(role);
    setInternalRole(persona.role);
    setUserName(persona.name);
    setAuthMode("demo");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("userChanged", { detail: persona }));
      window.location.assign(getDefaultRoute(role));
    }
  };

  return (
    <AuthContext.Provider value={{ currentUserRole, switchRole, internalRole, userName, authMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
