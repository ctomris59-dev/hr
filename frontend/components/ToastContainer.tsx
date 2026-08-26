"use client";

import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications, type NotificationType } from "../context/NotificationContext";

function getToastIcon(type: NotificationType) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-500" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case "info":
    default:
      return <Info className="w-5 h-5 text-blue-500" />;
  }
}

function getToastStyles(type: NotificationType): string {
  switch (type) {
    case "success":
      return "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200";
    case "error":
      return "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200";
    case "warning":
      return "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200";
    case "info":
    default:
      return "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";
  }
}

export default function ToastContainer() {
  const { toasts } = useNotifications();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            ${getToastStyles(toast.type)}
            border rounded-lg shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/50
            px-4 py-3 min-w-[300px] max-w-md
            flex items-center gap-3
            transform transition-all duration-300 ease-out
            animate-[slideUp_0.3s_ease-out]
            pointer-events-auto
            dark:border-opacity-50
          `}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {getToastIcon(toast.type)}
          </div>

          {/* Message */}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

