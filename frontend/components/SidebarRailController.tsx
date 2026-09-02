"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const KEY = "futurehr_sidebar_rail";
const DESKTOP = "(min-width: 1024px)";

export default function SidebarRailController() {
  const [available, setAvailable] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP);
    const root = document.documentElement;
    let sidebar: HTMLElement | null = null;

    const apply = (next: boolean) => {
      const desktopState = next && media.matches;
      setCollapsed(desktopState);
      root.classList.toggle("futurehr-sidebar-rail", desktopState);
      root.dataset.sidebarState = desktopState ? "collapsed" : "expanded";
      if (!desktopState) root.classList.remove("futurehr-sidebar-peek");
    };

    const syncSidebar = () => {
      sidebar = document.querySelector<HTMLElement>('[data-testid="app-sidebar"]');
      setAvailable(Boolean(sidebar));
    };

    const onMedia = () => apply(window.localStorage.getItem(KEY) === "1");
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLocaleLowerCase("tr-TR") !== "b") return;
      event.preventDefault();
      const next = !root.classList.contains("futurehr-sidebar-rail");
      window.localStorage.setItem(KEY, next ? "1" : "0");
      apply(next);
      window.dispatchEvent(new CustomEvent("futurehrSidebarRailChanged", { detail: { collapsed: next } }));
    };
    const onEnter = () => {
      if (root.classList.contains("futurehr-sidebar-rail") && media.matches) root.classList.add("futurehr-sidebar-peek");
    };
    const onLeave = () => root.classList.remove("futurehr-sidebar-peek");

    const bindSidebar = () => {
      const next = document.querySelector<HTMLElement>('[data-testid="app-sidebar"]');
      if (next === sidebar) return;
      sidebar?.removeEventListener("mouseenter", onEnter);
      sidebar?.removeEventListener("mouseleave", onLeave);
      sidebar = next;
      sidebar?.addEventListener("mouseenter", onEnter);
      sidebar?.addEventListener("mouseleave", onLeave);
      setAvailable(Boolean(sidebar));
    };

    apply(window.localStorage.getItem(KEY) === "1");
    syncSidebar();
    bindSidebar();
    const observer = new MutationObserver(bindSidebar);
    observer.observe(document.body, { childList: true, subtree: true });
    media.addEventListener("change", onMedia);
    window.addEventListener("keydown", onKey);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMedia);
      window.removeEventListener("keydown", onKey);
      sidebar?.removeEventListener("mouseenter", onEnter);
      sidebar?.removeEventListener("mouseleave", onLeave);
      root.classList.remove("futurehr-sidebar-rail", "futurehr-sidebar-peek");
      delete root.dataset.sidebarState;
    };
  }, []);

  if (!available) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(KEY, next ? "1" : "0");
    document.documentElement.classList.toggle("futurehr-sidebar-rail", next);
    document.documentElement.classList.remove("futurehr-sidebar-peek");
    document.documentElement.dataset.sidebarState = next ? "collapsed" : "expanded";
    window.dispatchEvent(new CustomEvent("futurehrSidebarRailChanged", { detail: { collapsed: next } }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="futurehr-sidebar-rail-toggle"
      aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
      aria-pressed={collapsed}
      title={`${collapsed ? "Menüyü genişlet" : "Menüyü daralt"} · Ctrl/⌘ + Shift + B`}
    >
      {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
    </button>
  );
}
