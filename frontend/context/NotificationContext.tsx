"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { buildBusinessEvents } from "../lib/hr/businessEvents";

export type NotificationType = "success" | "error" | "warning" | "info";
export interface Toast { id: string; message: string; type: NotificationType; }
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
  addNotification: (message: string, type?: NotificationType, options?: Pick<Notification, "targetUser" | "targetRole" | "link" | "source">) => void;
  markAsRead: (id: number) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const BUSINESS_READ_KEY = "futurehr_business_event_read_v1";
const serialize = (items: Notification[]) => items.map((item) => ({ ...item, timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp }));
function readBusinessIds(): number[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(localStorage.getItem(BUSINESS_READ_KEY) || "[]"); return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : []; } catch { return []; }
}
function writeBusinessIds(ids: number[]) { if (typeof window !== "undefined") localStorage.setItem(BUSINESS_READ_KEY, JSON.stringify(Array.from(new Set(ids)).slice(-200))); }

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [computedNotifications, setComputedNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadStored = useCallback(() => {
    const stored = getStorageData<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    setNotifications(stored.map((item) => ({ ...item, id: Number(item.id) || Date.now(), type: (item.type || "info") as NotificationType, read: Boolean(item.read), timestamp: item.timestamp ? new Date(item.timestamp) : new Date() })));
  }, []);
  const loadUser = useCallback(() => setCurrentUser(getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null)), []);
  const recompute = useCallback(() => {
    const user = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) return setComputedNotifications([]);
    const readIds = new Set(readBusinessIds());
    setComputedNotifications(buildBusinessEvents(user).map((item) => ({ ...item, read: readIds.has(item.id) })));
  }, []);

  useEffect(() => {
    loadStored(); loadUser(); recompute();
    const reloadStored = () => loadStored();
    const reloadAll = () => { loadUser(); recompute(); };
    window.addEventListener("notificationsUpdated", reloadStored as EventListener);
    window.addEventListener("userChanged", reloadAll as EventListener);
    window.addEventListener("dataUpdated", reloadAll as EventListener);
    window.addEventListener("performanceCycleUpdated", reloadAll as EventListener);
    window.addEventListener("storageCleared", reloadAll as EventListener);
    return () => {
      window.removeEventListener("notificationsUpdated", reloadStored as EventListener);
      window.removeEventListener("userChanged", reloadAll as EventListener);
      window.removeEventListener("dataUpdated", reloadAll as EventListener);
      window.removeEventListener("performanceCycleUpdated", reloadAll as EventListener);
      window.removeEventListener("storageCleared", reloadAll as EventListener);
    };
  }, [loadStored, loadUser, recompute]);

  const showToast = useCallback((message: string, type: NotificationType = "info") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 3500);
  }, []);

  const addNotification = useCallback<NotificationContextType["addNotification"]>((message, type = "info", options = {}) => {
    const next: Notification = { id: Date.now() + Math.floor(Math.random() * 1000), message, type, read: false, timestamp: new Date(), ...options };
    setNotifications((prev) => {
      const updated = [next, ...prev].slice(0, 200);
      setStorageData(STORAGE_KEYS.NOTIFICATIONS, serialize(updated));
      return updated;
    });
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    showToast(message, type);
  }, [showToast]);

  const visibleNotifications = useMemo(() => {
    const name = String(currentUser?.name || currentUser?.username || "").toLocaleLowerCase("tr-TR");
    const role = String(currentUser?.role || "").toUpperCase();
    return notifications.filter((item) => (!item.targetUser || item.targetUser.toLocaleLowerCase("tr-TR") === name) && (!item.targetRole || item.targetRole.toUpperCase() === role));
  }, [notifications, currentUser]);

  const persistNotifications = useCallback((items: Notification[]) => {
    setNotifications(items); setStorageData(STORAGE_KEYS.NOTIFICATIONS, serialize(items)); window.dispatchEvent(new CustomEvent("notificationsUpdated"));
  }, []);

  const markAsRead = useCallback((id: number) => {
    persistNotifications(notifications.map((item) => item.id === id ? { ...item, read: true } : item));
    setComputedNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item));
    if (computedNotifications.some((item) => item.id === id)) writeBusinessIds([...readBusinessIds(), id]);
  }, [notifications, computedNotifications, persistNotifications]);

  const clearAll = useCallback(() => {
    persistNotifications([]);
    const computedIds = computedNotifications.map((item) => item.id);
    writeBusinessIds([...readBusinessIds(), ...computedIds]);
    setComputedNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, [persistNotifications, computedNotifications]);

  const allNotifications = useMemo(() => [...computedNotifications, ...visibleNotifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()), [computedNotifications, visibleNotifications]);
  const unreadCount = allNotifications.filter((item) => !item.read).length;

  return <NotificationContext.Provider value={{ toasts, showToast, notifications: allNotifications, unreadCount, addNotification, markAsRead, clearAll }}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
