"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const toMessage = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  return String(value ?? "");
};

export default function ToastInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const original = window.alert;

    window.alert = (message?: any) => {
      const text = toMessage(message);
      if (text.startsWith("✅") || text.toLowerCase().includes("başar")) {
        toast.success(text.replace(/^✅\s*/, ""));
        return;
      }
      if (text.startsWith("❌") || text.toLowerCase().includes("hata")) {
        toast.error(text.replace(/^❌\s*/, ""));
        return;
      }
      toast.message(text);
    };

    return () => {
      window.alert = original;
    };
  }, []);

  return null;
}
