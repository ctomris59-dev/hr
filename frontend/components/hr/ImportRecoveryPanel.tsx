"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { readImportSnapshots, restoreImportSnapshot, type ImportSnapshot } from "@/lib/hr/importSnapshots";

export default function ImportRecoveryPanel() {
  const [items, setItems] = useState<ImportSnapshot[]>([]);
  useEffect(() => {
    const reload = () => setItems(readImportSnapshots());
    reload(); window.addEventListener("importSnapshotUpdated", reload); return () => window.removeEventListener("importSnapshotUpdated", reload);
  }, []);
  if (!items.length) return null;
  const latest = items[0];
  const restore = () => {
    if (!window.confirm(`${latest.label} öncesindeki veriye geri dönülsün mü?`)) return;
    if (restoreImportSnapshot(latest.id)) window.alert("Son veri aktarımı geri alındı.");
  };
  return <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/20"><div className="flex items-center gap-2"><History className="h-4 w-4 text-amber-600"/><div><p className="text-[10px] font-bold uppercase text-amber-700">Aktarım geri alma</p><p className="text-[10px] text-amber-700/80">Son snapshot: {latest.label} · {new Date(latest.createdAt).toLocaleString("tr-TR")}</p></div></div><button onClick={restore} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 dark:bg-slate-900"><RotateCcw className="h-3.5 w-3.5"/>Son aktarımı geri al</button></div>;
}
