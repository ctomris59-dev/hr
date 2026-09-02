"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const EMPTY_PATTERN = /(veri bulunamadı|veri yok|kayıt bulunamadı|kayıt yok|henüz .* yok|veri bekleniyor|oluşturmak için .* bulunamadı)/i;

export default function PremiumEmptyStateRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    const enhance = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.querySelector('[data-tour="workspace"]');
        if (!root) return;
        root.querySelectorAll<HTMLElement>(".enterprise-card, .dashboard-visual-card, section, article").forEach((node) => {
          if (node.classList.contains("premium-empty-state") || node.classList.contains("premium-auto-empty")) return;
          const text = (node.innerText || "").trim();
          if (!text || text.length > 520 || !EMPTY_PATTERN.test(text)) return;
          const hasDataStructure = Boolean(node.querySelector("table, canvas, [role='grid'], [data-chart], .recharts-wrapper"));
          if (hasDataStructure) return;
          node.classList.add("premium-auto-empty");
        });
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("dataUpdated", enhance);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("dataUpdated", enhance);
    };
  }, [pathname]);

  return null;
}
