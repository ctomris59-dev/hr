"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import EmployeeDirectoryTools from "./EmployeeDirectoryTools";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../app/utils/storage";

interface EmployeeRow {
  id?: string | number;
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  "İşe Giriş Tarihi"?: string;
  [key: string]: any;
}

export default function OrganizationExcelDock() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const reload = () => setEmployees(getStorageData<EmployeeRow[]>(STORAGE_KEYS.ORG_CHART, []));
  useEffect(() => {
    reload();
    const refresh = () => reload();
    window.addEventListener("dataUpdated", refresh);
    window.addEventListener("storageCleared", refresh);
    return () => {
      window.removeEventListener("dataUpdated", refresh);
      window.removeEventListener("storageCleared", refresh);
    };
  }, []);

  const onImport = (incoming: EmployeeRow[]) => {
    const byName = new Map(employees.map((employee) => [employee["Ad Soyad"].toLocaleLowerCase("tr-TR"), employee]));
    incoming.forEach((row) => {
      const key = row["Ad Soyad"].toLocaleLowerCase("tr-TR");
      const existing = byName.get(key);
      byName.set(key, existing ? { ...existing, ...row, id: existing.id ?? row.id } : row);
    });
    const next = Array.from(byName.values());
    setEmployees(next);
    setStorageData(STORAGE_KEYS.ORG_CHART, next);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
  };

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-blue-950 dark:from-blue-950/20 dark:to-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100 dark:bg-slate-900 dark:ring-blue-900"><FileSpreadsheet className="h-4 w-4" /></span>
        <div><p className="text-xs font-bold text-slate-900 dark:text-white">Toplu veri işlemleri</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">Çalışan ana verisini şablonla yükleyin veya listeyi Excel'e aktarın. Maaş, performans ve potansiyel alanlarına dokunulmaz.</p></div>
      </div>
      <EmployeeDirectoryTools employees={employees} onImport={onImport} />
    </div>
  );
}
