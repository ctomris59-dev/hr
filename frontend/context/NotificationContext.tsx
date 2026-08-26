"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { toScore } from "../lib/score";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: NotificationType;
}

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: Date;
}

interface NotificationContextType {
  toasts: Toast[];
  showToast: (message: string, type?: NotificationType) => void;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [computedNotifications, setComputedNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load notifications from storage on mount
  useEffect(() => {
    const storedNotifications = getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, []);
    // Convert stored notifications to Notification format
    const loadedNotifications: Notification[] = storedNotifications
      .filter((n: any) => n.id && n.message)
      .map((n: any) => ({
        id: n.id,
        message: n.message || "",
        type: (n.type || "info") as NotificationType,
        read: n.read || false,
        timestamp: n.timestamp ? new Date(n.timestamp) : new Date(),
      }));
    setNotifications(loadedNotifications);
  }, []);

  useEffect(() => {
    const loadUser = () => {
      const stored = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
      setCurrentUser(stored);
    };
    loadUser();
    window.addEventListener("storage", loadUser);
    window.addEventListener("userChanged", loadUser as EventListener);
    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("userChanged", loadUser as EventListener);
    };
  }, []);

  useEffect(() => {
    const loadComputedNotifications = async () => {
      if (!currentUser) {
        setComputedNotifications([]);
        return;
      }

      const userName = currentUser?.name || currentUser?.username || "";
      if (!userName) {
        setComputedNotifications([]);
        return;
      }

      let talentData = getStorageData<any[]>("hr_talent_matrix", []);
      if (!Array.isArray(talentData) || talentData.length === 0) {
        try {
          const params = new URLSearchParams();
          const userRole = currentUser?.role || "EMPLOYEE";
          const userDept = currentUser?.dept || currentUser?.department || "";
          params.append("user_role", userRole);
          if (userDept) params.append("user_dept", userDept);
          params.append("user_name", userName);
          const response = await fetch(`/api/talent-matrix?${params.toString()}`);
          if (response.ok) {
            const result = await response.json();
            talentData = Array.isArray(result) ? result : (result.data || []);
          }
        } catch {
          talentData = [];
        }
      }

      const userKey = userName.trim().toLowerCase();
      const entry = (talentData || []).find((item: any) => {
        const candidate = (item?.name || item?.["Ad Soyad"] || "").trim().toLowerCase();
        return candidate === userKey || candidate.includes(userKey) || userKey.includes(candidate);
      });

      const testScore = toScore(entry?.test_score);
      if (testScore === null) {
        setComputedNotifications([
          {
            id: 90001,
            message: "Yetkinlik testiniz henüz tamamlanmadı. Profilinizin oluşması için testi çözün.",
            type: "warning",
            read: false,
            timestamp: new Date(),
          },
        ]);
      } else {
        setComputedNotifications([]);
      }
    };

    loadComputedNotifications();
  }, [currentUser]);

  const showToast = useCallback((message: string, type: NotificationType = "info") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const markAsRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setComputedNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setComputedNotifications([]);
  }, []);

  const allNotifications = [...computedNotifications, ...notifications];
  const unreadCount = allNotifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        notifications: allNotifications,
        unreadCount,
        markAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}


