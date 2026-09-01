"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS, HR_DATA_CLEARED_KEY } from "../app/utils/storage";
import { API_BASE_URL } from "@/lib/apiConfig";

interface DataContextType {
  orgData: any[];
  history360: any[];
  loading: boolean;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function hasStoredKey(key: string): boolean {
  return typeof window !== "undefined" && localStorage.getItem(key) !== null;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history360, setHistory360] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (typeof window === "undefined") return;
    setLoading(true);
    try {
      const storedOrg = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      const stored360 = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
      const orgKeyExists = hasStoredKey(STORAGE_KEYS.ORG_CHART);
      const historyKeyExists = hasStoredKey(STORAGE_KEYS.HISTORY_360);
      const currentUser = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
      const secureMode = currentUser?.authMode === "secure";

      // Demo/prototip modu bilinçli olarak boş şirketle başlar. İlk açılışta backend'den
      // örnek/veri sızdırılmaz; kullanıcı Demo Oluştur veya veri içe aktarma akışını seçer.
      if (!secureMode) {
        if (!orgKeyExists) localStorage.setItem(STORAGE_KEYS.ORG_CHART, "[]");
        if (!historyKeyExists) localStorage.setItem(STORAGE_KEYS.HISTORY_360, "[]");
        if (!orgKeyExists && !historyKeyExists) localStorage.setItem(HR_DATA_CLEARED_KEY, "true");
        setOrgData(storedOrg);
        setHistory360(stored360);
        setLoading(false);
        return;
      }

      // Secure SaaS modunda tenant verisi yalnız sunucu katmanından okunur.
      setOrgData(storedOrg);
      setHistory360(stored360);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3500);
      const role = currentUser?.role || "";
      const dept = currentUser?.dept || currentUser?.department || "";
      const name = currentUser?.name || "";
      const orgParams = new URLSearchParams();
      if (role) orgParams.set("user_role", role);
      if (dept) orgParams.set("user_dept", dept);
      if (name) orgParams.set("user_name", name);

      try {
        const [orgRes, data360Res] = await Promise.all([
          fetch(`${API_BASE_URL}/api/org-chart${orgParams.size ? `?${orgParams.toString()}` : ""}`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
          fetch(`${API_BASE_URL}/api/360-data`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
        ]);
        window.clearTimeout(timeoutId);

        if (orgRes?.ok) {
          const result = await orgRes.json().catch(() => null);
          const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
          setOrgData(rows);
        }
        if (data360Res?.ok) {
          const result = await data360Res.json().catch(() => null);
          const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
          setHistory360(rows);
        }
      } catch (error) {
        window.clearTimeout(timeoutId);
        console.warn("Secure SaaS backend fetch failed:", error);
      }
    } catch (error) {
      console.error("Data loading error:", error);
      setOrgData([]);
      setHistory360([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const handleStorageCleared = () => {
      setOrgData([]);
      setHistory360([]);
      setLoading(false);
    };

    const handleDataUpdated = () => {
      const storedOrg = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      const stored360 = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
      if (storedOrg.length || stored360.length) localStorage.removeItem(HR_DATA_CLEARED_KEY);
      void loadData();
    };

    window.addEventListener("storageCleared", handleStorageCleared);
    window.addEventListener("dataUpdated", handleDataUpdated);
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
      window.removeEventListener("dataUpdated", handleDataUpdated);
    };
  }, [loadData]);

  const refreshData = async () => {
    await loadData();
  };

  return (
    <DataContext.Provider value={{ orgData, history360, loading, refreshData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error("useData must be used within a DataProvider");
  return context;
}
