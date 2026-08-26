"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserRole, mapToUserRole, REVERSE_ROLE_MAPPING } from "../app/data/roles";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../app/utils/storage";

interface AuthContextType {
  currentUserRole: UserRole | null;
  switchRole: (role: UserRole) => void;
  internalRole: string | null;
  userName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [internalRole, setInternalRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Load user role from storage on mount and listen for changes
  useEffect(() => {
    const loadUserRole = () => {
      const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
      if (currentUser && typeof currentUser === "object" && "role" in currentUser) {
        const userRole = (currentUser as any).role;
        const mappedRole = mapToUserRole(userRole);
        setCurrentUserRole(mappedRole);
        setInternalRole(userRole);
        setUserName((currentUser as any).name || null);
      } else {
        // No user logged in, keep role as null
        setCurrentUserRole(null);
        setInternalRole(null);
        setUserName(null);
      }
    };

    // Load on mount
    loadUserRole();

    // Listen for storage changes (when user logs in/out)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CURRENT_USER) {
        loadUserRole();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check periodically (for same-tab updates)
    const interval = setInterval(loadUserRole, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const switchRole = (role: UserRole) => {
    // Get the first internal role that maps to this UserRole
    const internalRoles = REVERSE_ROLE_MAPPING[role] || [];
    const newInternalRole = internalRoles[0] || role.toUpperCase();
    
    // Update localStorage with the new role
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && typeof currentUser === "object") {
      // Update the user object with new role, preserving other properties
      const updatedUser = {
        ...(currentUser as any),
        role: newInternalRole,
      };
      
      // Save to localStorage
      setStorageData(STORAGE_KEYS.CURRENT_USER, updatedUser);
      
      // Update state
      setCurrentUserRole(role);
      setInternalRole(newInternalRole);
      
      // Dispatch storage event to notify other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
        
        // Reload page after a short delay to ensure all components update
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } else {
      // No user logged in, just update the role state for demo purposes
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


