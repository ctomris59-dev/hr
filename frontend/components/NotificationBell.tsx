"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, X, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications, type NotificationType } from "../context/NotificationContext";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Az önce";
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "error":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "info":
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case "success":
      return "bg-green-500";
    case "error":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    case "info":
    default:
      return "bg-blue-500";
  }
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number } | null>(null);
  const PANEL_WIDTH = 320;
  const PANEL_MARGIN = 8;
  const PANEL_OFFSET = 8;

  const updatePanelPosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const left = Math.min(
      Math.max(rect.right - PANEL_WIDTH, PANEL_MARGIN),
      window.innerWidth - PANEL_WIDTH - PANEL_MARGIN
    );
    let top = rect.bottom + PANEL_OFFSET;
    const panel = panelRef.current;
    if (panel) {
      const height = panel.offsetHeight;
      if (top + height > window.innerHeight - PANEL_MARGIN) {
        top = Math.max(PANEL_MARGIN, rect.top - height - PANEL_OFFSET);
      }
    }
    setPanelStyle({ top, left });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    updatePanelPosition();
    const frame = requestAnimationFrame(updatePanelPosition);
    const handleResize = () => updatePanelPosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, notifications.length]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-11 h-11 bg-white dark:bg-slate-900/50 rounded-full shadow-lg shadow-indigo-100/50 dark:shadow-indigo-900/50 border border-indigo-100 dark:border-slate-800 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"
      >
        <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg animate-ping">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen &&
        createPortal(
        <div
          ref={panelRef}
          style={panelStyle ?? undefined}
          className="fixed z-[9999] w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-200/50 dark:shadow-indigo-900/50 border border-indigo-100/50 dark:border-slate-800/50 overflow-hidden animate-[fadeIn_0.3s_ease-out_forwards]"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-indigo-100/50 dark:border-slate-800/50 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-slate-800/50 dark:to-slate-800/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Bildirimler</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                  Temizle
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-12 h-12 text-indigo-300 dark:text-indigo-700 mx-auto mb-2" />
                <p className="text-sm text-indigo-400 dark:text-slate-500">Henüz bildirim yok</p>
              </div>
            ) : (
              <div className="divide-y divide-indigo-50/50 dark:divide-slate-800/50">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                    }}
                    className={`px-4 py-3 hover:bg-indigo-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group ${
                      !notification.read ? "bg-indigo-50/20 dark:bg-slate-800/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Color Bar */}
                      <div className={`w-1 h-full ${getNotificationColor(notification.type)} rounded-full flex-shrink-0`} />
                      
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? "font-semibold text-indigo-900 dark:text-indigo-100" : "text-indigo-700 dark:text-slate-300"}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-indigo-400 dark:text-slate-500 mt-1">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>

                      {/* Read Indicator */}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-indigo-100/50 dark:border-slate-800/50 bg-indigo-50/30 dark:bg-slate-800/30">
              <p className="text-xs text-center text-indigo-600 dark:text-indigo-400">
                {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Tüm bildirimler okundu"}
              </p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

