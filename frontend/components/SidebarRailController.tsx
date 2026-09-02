"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const KEY = "futurehr_sidebar_rail";

export default function SidebarRailController() {
  const [available, setAvailable] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const syncAvailability = () => setAvailable(Boolean(document.querySelector('[data-testid="app-sidebar"]')));
    const saved = window.localStorage.getItem(KEY) === "1";
    setCollapsed(saved);
    document.documentElement.classList.toggle("futurehr-sidebar-rail", saved);
    syncAvailability();
    const observer = new MutationObserver(syncAvailability);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("futurehr-sidebar-rail");
    };
  }, []);

  if (!available) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(KEY, next ? "1" : "0");
    document.documentElement.classList.toggle("futurehr-sidebar-rail", next);
    window.dispatchEvent(new CustomEvent("futurehrSidebarRailChanged", { detail: { collapsed: next } }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="futurehr-sidebar-rail-toggle"
      aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
      title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
    >
      {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
    </button>
  );
}
