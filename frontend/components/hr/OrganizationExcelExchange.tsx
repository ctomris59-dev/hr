"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";

const HEADERS = ["Personel Kodu", "Ad Soyad", "Departman", "Pozisyon", "1. Yönetici", "2. Yönetici", "İşe Giriş Tarihi"];

function normalize(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR");
}

function toDateString(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = String(value).trim();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

async function downloadWorkbook(rows: any[], filename: string) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Organizasyon");
  sheet.addRow(HEADERS);
  rows.forEach((person) => sheet.addRow([
    person.id || person.employee_id || "",
    person["Ad Soyad"] || person.name || "",
    person.Departman || person.department || "",
    person.Pozisyon || person.position || "",
    person["Yönetici 1"] || "",
    person["Yönetici 2"] || "",
    person["İşe Giriş Tarihi"] || person.hireDate || "",
  ]));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [16, 28, 22, 28, 26, 26, 18].map((width) => ({ width }));
  const notes = workbook.addWorksheet("Açıklamalar");
  notes.addRows([
    ["FutureHR Organizasyon Şablonu"],
    ["Zorunlu alanlar", "Ad Soyad, Departman, Pozisyon"],
    ["Personel Kodu", "Varsa mutlaka kullanın. Aynı kod tekrar yüklendiğinde mevcut kayıt güncellenir."],
    ["Yönetici alanları", "Sistemdeki çalışan adlarıyla aynı yazılması önerilir."],
    ["İşe Giriş Tarihi", "YYYY-AA-GG biçimi önerilir."],
  ]);
  notes.getColumn(1).width = 28;
  notes.getColumn(2).width = 90;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function OrganizationExcelExchange() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const downloadBlank = () => downloadWorkbook([], "FutureHR_Organizasyon_Bos_Sablon.xlsx");
  const downloadCurrent = () => downloadWorkbook(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []), "FutureHR_Organizasyon_Mevcut_Liste.xlsx");

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load((await file.arrayBuffer()) as any);
      const sheet = workbook.getWorksheet("Organizasyon") || workbook.worksheets[0];
      if (!sheet) throw new Error("Organizasyon çalışma sayfası bulunamadı.");

      const headerMap = new Map<string, number>();
      sheet.getRow(1).eachCell((cell, col) => headerMap.set(normalize(cell.value), col));
      const col = (name: string) => headerMap.get(normalize(name));
      if (!col("Ad Soyad") || !col("Departman") || !col("Pozisyon")) throw new Error("Ad Soyad, Departman ve Pozisyon sütunları zorunludur.");

      const current = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      const next = [...current];
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (let rowNo = 2; rowNo <= sheet.rowCount; rowNo += 1) {
        const row = sheet.getRow(rowNo);
        const value = (name: string) => {
          const index = col(name);
          return index ? row.getCell(index).value : undefined;
        };
        const name = String(value("Ad Soyad") ?? "").trim();
        const department = String(value("Departman") ?? "").trim();
        const position = String(value("Pozisyon") ?? "").trim();
        if (!name && !department && !position) continue;
        if (!name || !department || !position) { skipped += 1; continue; }
        const personCode = String(value("Personel Kodu") ?? "").trim();
        const existingIndex = next.findIndex((item) =>
          (personCode && String(item.id || item.employee_id || "").trim() === personCode) || normalize(item["Ad Soyad"]) === normalize(name)
        );
        const record = {
          ...(existingIndex >= 0 ? next[existingIndex] : {}),
          id: personCode || (existingIndex >= 0 ? next[existingIndex]?.id : `emp-${Date.now()}-${rowNo}`),
          "Ad Soyad": name,
          Departman: department,
          Pozisyon: position,
          "Yönetici 1": String(value("1. Yönetici") ?? "").trim() || undefined,
          "Yönetici 2": String(value("2. Yönetici") ?? "").trim() || undefined,
          "İşe Giriş Tarihi": toDateString(value("İşe Giriş Tarihi")) || undefined,
          imported_at: new Date().toISOString(),
          import_file: file.name,
        };
        if (existingIndex >= 0) { next[existingIndex] = record; updated += 1; }
        else { next.push(record); created += 1; }
      }

      const message = `${created + updated} kayıt hazır: ${created} yeni, ${updated} güncelleme, ${skipped} eksik satır.`;
      if (!window.confirm(`${message}\n\nDeğişiklikler organizasyon verisine uygulansın mı?`)) {
        setStatus(`Aktarım iptal edildi. ${message}`);
        return;
      }
      setStorageData(STORAGE_KEYS.ORG_CHART, next);
      window.dispatchEvent(new CustomEvent("dataUpdated"));
      setStatus(`Aktarım tamamlandı. ${message}`);
    } catch (error) {
      setStatus(`Aktarım başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><FileSpreadsheet className="h-4 w-4" /></span>
          <div><p className="text-sm font-semibold text-slate-900 dark:text-white">Toplu organizasyon verisi</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Boş şablonu veya mevcut çalışan listesini Excel olarak indirin; yetkili kişi doldurup aynı ekrandan geri yüklesin.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadBlank} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"><Download className="h-3.5 w-3.5" />Boş şablon</button>
          <button type="button" onClick={downloadCurrent} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"><Download className="h-3.5 w-3.5" />Mevcut liste</button>
          <input ref={inputRef} type="file" accept=".xlsx" onChange={importFile} className="hidden" />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Upload className="h-3.5 w-3.5" />{busy ? "Okunuyor…" : "Excel yükle"}</button>
        </div>
      </div>
      {status && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">{status}</p>}
    </div>
  );
}
