"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { API_BASE_URL } from "@/lib/apiConfig";

interface DataContextType {
  orgData: any[];
  history360: any[];
  loading: boolean;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history360, setHistory360] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  

  const loadData = async () => {
    try {
      // First, try to load from storage (fast)
      const storedOrg = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      const stored360 = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);

      // Always set the data from storage first (even if empty)
      setOrgData(storedOrg);
      setHistory360(stored360);
      setLoading(false);

      // If we have data in storage, use it and don't fetch from backend
      if (storedOrg.length > 0 && stored360.length > 0) {
        return; // Use cached data, no need to fetch
      }

      // If storage has empty arrays explicitly set, don't fetch from backend
      // (This means data was intentionally cleared)
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      if (storedOrg.length === 0 && stored360.length === 0) {
        // Check if these are explicitly set (not just default empty)
        const orgKey = localStorage.getItem(STORAGE_KEYS.ORG_CHART);
        const historyKey = localStorage.getItem(STORAGE_KEYS.HISTORY_360);
        
        // If keys exist but are empty arrays, or data was explicitly cleared, don't fetch
        if (orgKey === "[]" && historyKey === "[]" || dataCleared) {
          return; // Don't fetch from backend, keep empty arrays
        }
      }

      // Only fetch from backend if storage keys don't exist at all (first time load)
      // If no cached data or empty arrays, try to fetch from backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      // Get current user for RBAC filtering
      const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
      const userRole = currentUser && typeof currentUser === "object" && "role" in currentUser 
        ? (currentUser as any).role 
        : null;
      const userDept = currentUser && typeof currentUser === "object" && "dept" in currentUser
        ? (currentUser as any).dept || (currentUser as any).department
        : null;
      const userName = currentUser && typeof currentUser === "object" && "name" in currentUser
        ? (currentUser as any).name
        : null;

      // Build query params with RBAC filtering
      const orgParams = userRole && userDept 
        ? `?user_role=${encodeURIComponent(userRole)}&user_dept=${encodeURIComponent(userDept)}${userName ? `&user_name=${encodeURIComponent(userName)}` : ''}`
        : "";
      const data360Params = "";

      try {
        const [orgRes, data360Res] = await Promise.all([
          fetch(`${API_BASE_URL}/api/org-chart${orgParams}`, {
            signal: controller.signal,
          }).catch(() => null),
          fetch(`${API_BASE_URL}/api/360-data${data360Params}`, {
            signal: controller.signal,
          }).catch(() => null),
        ]);

        clearTimeout(timeoutId);

        if (orgRes?.ok) {
          const orgData = await orgRes.json();
          if (orgData.success && orgData.data && orgData.data.length > 0) {
            setOrgData(orgData.data);
            setStorageData(STORAGE_KEYS.ORG_CHART, orgData.data);
          }
        }

        if (data360Res?.ok) {
          const data360Result = await data360Res.json();
          if (data360Result.success && data360Result.data && data360Result.data.length > 0) {
            setHistory360(data360Result.data);
            setStorageData(STORAGE_KEYS.HISTORY_360, data360Result.data);
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        // If fetch fails, keep empty arrays (don't block UI)
        console.warn("Backend fetch failed, using cached or empty data:", error);
      }
    } catch (error) {
      console.error("Data loading error:", error);
      // On error, set empty arrays
      setOrgData([]);
      setHistory360([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Storage temizlendiğinde veya güncellendiğinde verileri yeniden yükle
    const handleStorageCleared = () => {
      // Direkt state'leri temizle - backend'den fetch etme
      setOrgData([]);
      setHistory360([]);
      setLoading(false);
      
      // Storage'daki verileri de boş array olarak set et (key'leri silmek yerine)
      setStorageData(STORAGE_KEYS.ORG_CHART, []);
      setStorageData(STORAGE_KEYS.HISTORY_360, []);
      
      console.log("[DataContext] Veriler temizlendi, state'ler ve storage sıfırlandı");
    };
    
    const handleDataUpdated = () => {
      // Veri güncellendiğinde yeniden yükle
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      if (!dataCleared) {
        loadData();
      }
    };
    
    window.addEventListener("storageCleared", handleStorageCleared);
    window.addEventListener("dataUpdated", handleDataUpdated);
    
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
      window.removeEventListener("dataUpdated", handleDataUpdated);
    };
  }, []); // Load data on mount

  const refreshData = async () => {
    setLoading(true);
    await loadData();
  };

  return (
    <DataContext.Provider
      value={{
        orgData,
        history360,
        loading,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}


