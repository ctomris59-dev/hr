"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const replacements: Array<[RegExp, string]> = [
  [/SaaS veri kaynağı/gi, "Güvenli şirket verisi"],
  [/SaaS modunda/gi, "Güvenli şirket ortamında"],
  [/tenant-scoped/gi, "şirket kapsamlı"],
  [/tenant kapsamlı/gi, "şirket kapsamlı"],
  [/backend yetki kapsamı/gi, "yetki kapsamı"],
  [/server-side/gi, "güvenli sunucu katmanında"],
  [/Employee Digital Twin/gi, "Çalışan Karar Profili"],
  [/Evidence Score/gi, "Kanıt Güveni"],
  [/AI Karar Desteği/gi, "Karar Desteği"],
];

function rewrite(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !["SCRIPT", "STYLE", "CODE", "PRE"].includes(parent.tagName)) {
      let value = node.nodeValue || "";
      const original = value;
      replacements.forEach(([pattern, text]) => { value = value.replace(pattern, text); });
      if (value !== original) node.nodeValue = value;
    }
    node = walker.nextNode();
  }
}

export default function CustomerLanguageRuntime() {
  const pathname = usePathname();
  useEffect(() => {
    // Trust/integration admin pages intentionally retain precise technical terminology.
    if (pathname.startsWith("/admin/guven-kvkk") || pathname.startsWith("/admin/entegrasyonlar")) return;
    rewrite(document.body);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.parentNode) rewrite(node.parentNode);
      else if (node.nodeType === Node.ELEMENT_NODE) rewrite(node as Element);
    })));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
