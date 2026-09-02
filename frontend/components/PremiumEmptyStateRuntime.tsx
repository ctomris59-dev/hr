"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const EMPTY_PATTERN = /(veri bulunamadı|veri yok|kayıt bulunamadı|kayıt yok|çalışan bulunamadı|aday bulunamadı|henüz .* yok|henüz .* oluşmadı|veri bekleniyor|oluşturmak için .* bulunamadı|sonuç bulunamadı|eşleşme bulunamadı)/i;
const PERMISSION_PATTERN = /(yetkiniz yok|erişim yok|erişim izni|görüntüleme yetkisi|bu alanı görüntüleyemez)/i;
const FILTER_PATTERN = /(filtre|arama kriter|eşleşme bulunamadı|sonuç bulunamadı)/i;

export default function PremiumEmptyStateRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    const enhance = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.querySelector<HTMLElement>('[data-tour="workspace"]');
        if (!root) return;

        root.querySelectorAll<HTMLElement>(".enterprise-card, .dashboard-visual-card, .futurehr-analytics-panel, section, article").forEach((node) => {
          if (node.classList.contains("premium-empty-state")) return;
          const text = (node.innerText || "").replace(/\s+/g, " ").trim();
          if (!text || text.length > 620 || !EMPTY_PATTERN.test(text)) return;

          const hasDataStructure = Boolean(node.querySelector("table, canvas, [role='grid'], [data-chart], .recharts-wrapper, [data-row-count]"));
          const hasManyInteractiveChildren = node.querySelectorAll("button, a, input, select").length > 3;
          if (hasDataStructure || hasManyInteractiveChildren) return;

          node.classList.add("premium-auto-empty");
          node.setAttribute("role", "status");
          node.setAttribute("aria-live", "polite");
          node.dataset.emptyKind = PERMISSION_PATTERN.test(text) ? "permission" : FILTER_PATTERN.test(text) ? "filter" : "data";
          node.dataset.emptyPath = pathname;
        });
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("dataUpdated", enhance);
    window.addEventListener("storageCleared", enhance);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("dataUpdated", enhance);
      window.removeEventListener("storageCleared", enhance);
    };
  }, [pathname]);

  return null;
}
