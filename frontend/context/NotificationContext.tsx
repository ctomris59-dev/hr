"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../app/utils/storage";
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
  targetUser?: string;
  targetRole?: string;
  link?: string;
  source?: string;
}

interface NotificationContextType {
  toasts: Toast[];
  showToast: (message: string, type?: NotificationType) => void;
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    message: string,
    type?: NotificationType,
    options?: Pick<Notification, "targetUser" | "targetRole" | "link" | "source">
  ) => void;
  markAsRead: (id: number) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const serialize = (items: Notification[]) =>
  items.map((item) => ({ ...item, timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp }));

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [computedNotifications, setComputedNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadNotifications = useCallback(() => {
    const stored = getStorageData<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    setNotifications(
      stored.map((item) => ({
        ...item,
        id: Number(item.id) || Date.now(),
        type: (item.type || "info") as NotificationType,
        read: Boolean(item.read),
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
      }))
    );
  }, []);

  useEffect(() => {
    loadNotifications();
    const reload = () => loadNotifications();
    window.addEventListener("notificationsUpdated", reload as EventListener);
    window.addEventListener("storageCleared", reload as EventListener);
    return () => {
      window.removeEventListener("notificationsUpdated", reload as EventListener);
      window.removeEventListener("storageCleared", reload as EventListener);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const loadUser = () => setCurrentUser(getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null));
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
      if (!currentUser) return setComputedNotifications([]);
      const userName = currentUser?.name || currentUser?.username || "";
      if (!userName) return setComputedNotifications([]);
      let talentData = getStorageData<any[]>("hr_talent_matrix", []);
      if (!Array.isArray(talentData) || talentData.length === 0) {
        try {
          const params = new URLSearchParams();
          params.append("user_role", currentUser?.role || "EMPLOYEE");
          const dept = currentUser?.dept || currentUser?.department || "";
          if (dept) params.append("user_dept", dept);
          params.append("user_name", userName);
          const response = await fetch(`/api/talent-matrix?${params.toString()}`);
          if (response.ok) {
            const result = await response.json();
            talentData = Array.isArray(result) ? result : result.data || [];
          }
        } catch {
          talentData = [];
        }
      }
      const key = userName.trim().toLocaleLowerCase("tr-TR");
      const entry = talentData.find((item: any) => {
        const candidate = String(item?.name || item?.["Ad Soyad"] || "").trim().toLocaleLowerCase("tr-TR");
        return candidate === key;
      });
      if (toScore(entry?.test_score) === null) {
        setComputedNotifications([
          {
            id: 90001,
            message: "Yetkinlik testiniz henüz tamamlanmadı. Profilinizin oluşması için testi çözün.",
            type: "warning",
            read: false,
            timestamp: new Date(),
            link: "/aday-testi",
            source: "assessment",
          },
        ]);
      } else setComputedNotifications([]);
    };
    void loadComputedNotifications();
  }, [currentUser]);

  const showToast = useCallback((message: string, type: NotificationType = "info") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 3500);
  }, []);

  const addNotification = useCallback<NotificationContextType["addNotification"]>(
    (message, type = "info", options = {}) => {
      const next: Notification = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        message,
        type,
        read: false,
        timestamp: new Date(),
        ...options,
      };
      setNotifications((prev) => {
        const updated = [next, ...prev].slice(0, 200);
        setStorageData(STORAGE_KEYS.NOTIFICATIONS, serialize(updated));
        return updated;
      });
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
      showToast(message, type);

      // Kullanıcı daha önce tarayıcı bildirimi izni verdiyse sistem bildirimi de göster.
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("FutureHR", { body: message });
        } catch {
          // In-app notification remains authoritative.
        }
      }
    },
    [showToast]
  );

  const visibleNotifications = useMemo(() => {
    const name = String(currentUser?.name || currentUser?.username || "").toLocaleLowerCase("tr-TR");
    const role = String(currentUser?.role || "").toUpperCase();
    return notifications.filter((item) => {
      const userMatch = !item.targetUser || item.targetUser.toLocaleLowerCase("tr-TR") === name;
      const roleMatch = !item.targetRole || item.targetRole.toUpperCase() === role;
      return userMatch && roleMatch;
    });
  }, [notifications, currentUser]);

  const persistNotifications = useCallback((items: Notification[]) => {
    setNotifications(items);
    setStorageData(STORAGE_KEYS.NOTIFICATIONS, serialize(items));
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
  }, []);

  const markAsRead = useCallback(
    (id: number) => {
      persistNotifications(notifications.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setComputedNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    },
    [notifications, persistNotifications]
  );

  const clearAll = useCallback(() => {
    persistNotifications([]);
    setComputedNotifications([]);
  }, [persistNotifications]);

  const allNotifications = [...computedNotifications, ...visibleNotifications];
  const unreadCount = allNotifications.filter((item) => !item.read).length;

  return (
    <NotificationContext.Provider value={{ toasts, showToast, notifications: allNotifications, unreadCount, addNotification, markAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
