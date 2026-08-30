import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";

export const IMPORT_SNAPSHOT_KEY = "futurehr_import_snapshots_v1";
export interface ImportSnapshot {
  id: string;
  createdAt: string;
  label: string;
  source: string;
  keys: Record<string, any>;
}

export function readImportSnapshots(): ImportSnapshot[] {
  if (typeof window === "undefined") return [];
  try { const parsed = JSON.parse(localStorage.getItem(IMPORT_SNAPSHOT_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export function createImportSnapshot(label: string, source: string, keys: string[] = [STORAGE_KEYS.ORG_CHART, STORAGE_KEYS.MARKET_BENCHMARKS]) {
  if (typeof window === "undefined") return null;
  const snapshot: ImportSnapshot = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `snapshot-${Date.now()}`,
    createdAt: new Date().toISOString(),
    label,
    source,
    keys: Object.fromEntries(keys.map((key) => [key, getStorageData<any>(key, null)])),
  };
  localStorage.setItem(IMPORT_SNAPSHOT_KEY, JSON.stringify([snapshot, ...readImportSnapshots()].slice(0, 10)));
  window.dispatchEvent(new CustomEvent("importSnapshotUpdated"));
  return snapshot;
}

export function restoreImportSnapshot(id: string) {
  const snapshot = readImportSnapshots().find((item) => item.id === id);
  if (!snapshot) return false;
  Object.entries(snapshot.keys).forEach(([key, value]) => setStorageData(key, value));
  window.dispatchEvent(new CustomEvent("dataUpdated"));
  window.dispatchEvent(new CustomEvent("importSnapshotUpdated"));
  return true;
}

export function clearImportSnapshots() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(IMPORT_SNAPSHOT_KEY);
  window.dispatchEvent(new CustomEvent("importSnapshotUpdated"));
}
