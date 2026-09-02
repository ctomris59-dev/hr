"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SURFACE_SELECTOR = [
  ".enterprise-card",
  ".dashboard-visual-card",
  ".futurehr-dashboard article",
  ".futurehr-analytics-panel",
  ".module-workspace article",
  ".module-workspace section[class*='rounded']",
  ".module-workspace div[class*='rounded-2xl'][class*='border']",
].join(",");

export default function PremiumMotionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    let intersection: IntersectionObserver | null = null;

    const classify = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const workspace = document.querySelector<HTMLElement>('[data-tour="workspace"]');
        if (!workspace) return;
        workspace.dataset.premiumUi = "v2";

        const surfaces = workspace.querySelectorAll<HTMLElement>(SURFACE_SELECTOR);
        surfaces.forEach((node, index) => {
          node.classList.add("pe-surface");
          if (!node.dataset.peReveal) {
            node.dataset.peReveal = "true";
            node.style.setProperty("--pe-reveal-delay", `${Math.min(index % 8, 5) * 32}ms`);
            intersection?.observe(node);
          }
        });

        workspace.querySelectorAll<HTMLElement>("table").forEach((node) => node.classList.add("pe-table"));
        workspace.querySelectorAll<HTMLElement>("input, textarea, select").forEach((node) => node.classList.add("pe-input"));
        workspace.querySelectorAll<HTMLElement>("[role='dialog'], dialog").forEach((node) => node.classList.add("pe-dialog"));
        workspace.querySelectorAll<HTMLElement>("details").forEach((node) => node.classList.add("pe-details"));

        workspace.querySelectorAll<SVGElement>("svg").forEach((svg) => {
          if (!svg.querySelector("polyline, path[stroke], rect, circle")) return;
          svg.classList.add("pe-chart-svg");
          const parent = svg.closest<HTMLElement>("article, section, .rounded-2xl, .rounded-xl");
          if (parent) parent.classList.add("pe-chart-surface");
        });
      });
    };

    intersection = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add("is-visible");
        intersection?.unobserve(entry.target);
      });
    }, { rootMargin: "50px 0px", threshold: 0.06 });

    classify();
    const mutation = new MutationObserver(classify);
    mutation.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("dataUpdated", classify);
    window.addEventListener("themeChanged", classify);

    return () => {
      cancelAnimationFrame(frame);
      mutation.disconnect();
      intersection?.disconnect();
      window.removeEventListener("dataUpdated", classify);
      window.removeEventListener("themeChanged", classify);
    };
  }, [pathname]);

  return null;
}
