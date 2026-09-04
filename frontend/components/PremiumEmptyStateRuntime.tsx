"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const EMPTY_PATTERN = /(veri bulunamadı|veri yok|kayıt bulunamadı|kayıt yok|çalışan bulunamadı|aday bulunamadı|henüz .* yok|henüz .* oluşmadı|veri bekleniyor|oluşturmak için .* bulunamadı|sonuç bulunamadı|eşleşme bulunamadı)/i;
const PERMISSION_PATTERN = /(yetkiniz yok|erişim yok|erişim izni|görüntüleme yetkisi|bu alanı görüntüleyemez)/i;
const FILTER_PATTERN = /(filtre|arama kriter|eşleşme bulunamadı|sonuç bulunamadı)/i;

function clearAutoEmpty(node: HTMLElement) {
  if (!node.classList.contains("premium-auto-empty")) return;
  node.classList.remove("premium-auto-empty");
  if (node.dataset.emptyPath) {
    node.removeAttribute("role");
    node.removeAttribute("aria-live");
    delete node.dataset.emptyKind;
    delete node.dataset.emptyPath;
  }
}

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
          const isMultiCardGrid = node.classList.contains("grid") && node.children.length > 1;
          const hasDataStructure = Boolean(node.querySelector("table, canvas, [role='grid'], [data-chart], .recharts-wrapper, [data-row-count]"));
          const hasManyInteractiveChildren = node.querySelectorAll("button, a, input, select").length > 3;
          const shouldEnhance = Boolean(
            text &&
            text.length <= 620 &&
            EMPTY_PATTERN.test(text) &&
            !isMultiCardGrid &&
            !hasDataStructure &&
            !hasManyInteractiveChildren
          );

          if (!shouldEnhance) {
            clearAutoEmpty(node);
            return;
          }

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
