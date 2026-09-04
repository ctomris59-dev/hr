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
const BUSINESS_READ_KEY_PREFIX = "futurehr_business_event_read_v2";
const serialize = (items: Notification[]) => items.map((item) => ({ ...item, timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp }));

function normalizedText(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function canonicalRole(value: unknown) {
  const role = String(value || "").trim().toLocaleUpperCase("tr-TR");
  if (["PERSONEL", "EMPLOYEE", "ÇALIŞAN"].includes(role)) return "PERSONEL";
  if (["IK", "İK", "HR", "HR_ADMIN", "ADMIN"].includes(role)) return "IK";
  if (["DIRECTOR", "DİREKTÖR", "DIREKTÖR"].includes(role)) return "DIRECTOR";
  if (["MANAGER", "YÖNETİCİ", "YONETICI"].includes(role)) return "MANAGER";
  return role;
}

function isLegacyExecutiveRole(role: string) {
  return role === "CEO" || role === "IK";
}

function notificationVisibleToUser(item: Pick<Notification, "targetUser" | "targetRole">, user: any) {
  if (!user) return false;
  const userNames = new Set([
    normalizedText(user?.name),
    normalizedText(user?.username),
    normalizedText(user?.employee_name),
  ].filter(Boolean));
  const currentRole = canonicalRole(user?.role);
  const targetUser = normalizedText(item.targetUser);
  const rawTargetRole = String(item.targetRole || "").trim();
  const targetRole = canonicalRole(rawTargetRole);

  if (targetUser && !userNames.has(targetUser)) return false;
  if (rawTargetRole && rawTargetRole.toUpperCase() !== "ALL" && targetRole !== currentRole) return false;

  // V1 kayıtlarında hedef bilgisi yoktu. Bu belirsiz eski kayıtları çalışan/yönetici
  // hesaplarına taşımak veri sızıntısı yaratır; yalnız CEO/İK legacy görünümünde tutulur.
  if (!targetUser && !rawTargetRole) return isLegacyExecutiveRole(currentRole);
  return true;
}

function businessReadKey(user: any) {
  const tenant = normalizedText(user?.tenantId || user?.tenant_id || user?.tenantSlug || user?.tenant_slug || "demo");
  const identity = normalizedText(user?.employeeId || user?.employee_id || user?.name || user?.username || "anonymous");
  return `${BUSINESS_READ_KEY_PREFIX}:${tenant}:${identity}:${canonicalRole(user?.role) || "UNKNOWN"}`;
}

function readBusinessIds(user: any): number[] {
  if (typeof window === "undefined" || !user) return [];
  try {
    const value = JSON.parse(localStorage.getItem(businessReadKey(user)) || "[]");
    return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

function writeBusinessIds(user: any, ids: number[]) {
  if (typeof window === "undefined" || !user) return;
  localStorage.setItem(businessReadKey(user), JSON.stringify(Array.from(new Set(ids)).slice(-200)));
}

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
    const readIds = new Set(readBusinessIds(user));
    setComputedNotifications(buildBusinessEvents(user).map((item) => ({ ...item, read: readIds.has(item.id) })));
  }, []);

  useEffect(() => {
    loadStored(); loadUser(); recompute();
    const reloadStored = () => loadStored();
    const reloadAll = () => { loadStored(); loadUser(); recompute(); };
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
    const hasExplicitAudience = Boolean(String(options.targetUser || "").trim() || String(options.targetRole || "").trim());
    const currentName = String(currentUser?.name || currentUser?.employee_name || currentUser?.username || "").trim();
    const audience = hasExplicitAudience ? options : { ...options, ...(currentName ? { targetUser: currentName } : {}) };
    const next: Notification = { id: Date.now() + Math.floor(Math.random() * 1000), message, type, read: false, timestamp: new Date(), ...audience };

    setNotifications((prev) => {
      const updated = [next, ...prev].slice(0, 200);
      setStorageData(STORAGE_KEYS.NOTIFICATIONS, serialize(updated));
      return updated;
    });
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    if (notificationVisibleToUser(next, currentUser)) showToast(message, type);
  }, [currentUser, showToast]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => notificationVisibleToUser(item, currentUser)),
    [notifications, currentUser],
  );

  const persistNotifications = useCallback((items: Notification[]) => {
    setNotifications(items);
    setStorageData(STORAGE_KEYS.NOTIFICATIONS, serialize(items));
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
  }, []);

  const markAsRead = useCallback((id: number) => {
    persistNotifications(notifications.map((item) => item.id === id && notificationVisibleToUser(item, currentUser) ? { ...item, read: true } : item));
    setComputedNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item));
    if (computedNotifications.some((item) => item.id === id)) writeBusinessIds(currentUser, [...readBusinessIds(currentUser), id]);
  }, [notifications, currentUser, computedNotifications, persistNotifications]);

  // Yalnız aktif kullanıcının görünür bildirimlerini okundu yapar; başka kullanıcıların
  // hedefli kayıtlarının read durumu değişmez.
  const clearAll = useCallback(() => {
    persistNotifications(notifications.map((item) => notificationVisibleToUser(item, currentUser) ? { ...item, read: true } : item));
    const computedIds = computedNotifications.map((item) => item.id);
    writeBusinessIds(currentUser, [...readBusinessIds(currentUser), ...computedIds]);
    setComputedNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, [notifications, currentUser, persistNotifications, computedNotifications]);

  const allNotifications = useMemo(
    () => [...computedNotifications, ...visibleNotifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [computedNotifications, visibleNotifications],
  );
  const unreadCount = allNotifications.filter((item) => !item.read).length;

  return <NotificationContext.Provider value={{ toasts, showToast, notifications: allNotifications, unreadCount, addNotification, markAsRead, clearAll }}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
