"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserRole, mapToUserRole, REVERSE_ROLE_MAPPING } from "../app/data/roles";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../app/utils/storage";

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

    const interval = setInterval(loadUserRole, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userChanged", refresh);
      window.removeEventListener("storageCleared", refresh);
      clearInterval(interval);
    };
  }, []);

  const switchRole = (role: UserRole) => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);

    // Secure sessions are authoritative on the server.  The browser cannot promote
    // or downgrade the current user's real role through the demo switcher.
    if (currentUser && typeof currentUser === "object" && (currentUser as any).authMode === "secure") {
      return;
    }

    const internalRoles = REVERSE_ROLE_MAPPING[role] || [];
    const newInternalRole = internalRoles[0] || role.toUpperCase();

    if (currentUser && typeof currentUser === "object") {
      const updatedUser = {
        ...(currentUser as any),
        role: newInternalRole,
      };

      setStorageData(STORAGE_KEYS.CURRENT_USER, updatedUser);
      setCurrentUserRole(role);
      setInternalRole(newInternalRole);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } else {
      setCurrentUserRole(role);
      setInternalRole(newInternalRole);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUserRole,
        switchRole,
        internalRole,
        userName,
        authMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
