"use client";

import { useRef, useState } from "react";
import { Download, FileDown, Upload } from "lucide-react";

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

interface Props {
  employees: EmployeeRow[];
  onImport: (employees: EmployeeRow[]) => void;
}

const HEADERS = ["Ad Soyad", "Departman", "Pozisyon", "Yönetici 1", "Yönetici 2", "İşe Giriş Tarihi"];

export default function EmployeeDirectoryTools({ employees, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const createWorkbook = async (rows: EmployeeRow[], template = false) => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Çalışanlar");
    sheet.addRow(HEADERS);
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.alignment = { vertical: "middle" };
    if (template) {
      sheet.addRow(["Örnek Çalışan", "İnsan Kaynakları", "İK Uzmanı", "Yönetici Adı", "", "2026-01-15"]);
    } else {
      rows.forEach((employee) => sheet.addRow([
        employee["Ad Soyad"] || "",
        employee.Departman || "",
        employee.Pozisyon || "",
        employee["Yönetici 1"] || "",
        employee["Yönetici 2"] || "",
        employee["İşe Giriş Tarihi"] || employee.hireDate || "",
      ]));
    }
    sheet.columns = [{ width: 26 }, { width: 25 }, { width: 32 }, { width: 24 }, { width: 24 }, { width: 20 }];
    return workbook;
  };

  const downloadWorkbook = async (template: boolean) => {
    setLoading(true);
    try {
      const workbook = await createWorkbook(employees, template);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = template ? "FutureHR-Calisan-Sablonu.xlsx" : `FutureHR-Calisan-Dizini-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } finally { setLoading(false); }
  };

  const importWorkbook = async (file: File) => {
    setLoading(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("Excel dosyasında çalışma sayfası bulunamadı.");

      const first = sheet.getRow(1).values as any[];
      const headerIndex = new Map<string, number>();
      first.forEach((value, index) => { if (value) headerIndex.set(String(value).trim(), index); });
      const required = ["Ad Soyad", "Departman", "Pozisyon"];
      if (required.some((header) => !headerIndex.has(header))) {
        throw new Error("Zorunlu sütunlar: Ad Soyad, Departman, Pozisyon.");
      }

      const imported: EmployeeRow[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const value = (header: string) => {
          const index = headerIndex.get(header);
          if (!index) return "";
          const cellValue: any = row.getCell(index).value;
          if (cellValue instanceof Date) return cellValue.toISOString().slice(0, 10);
          if (cellValue && typeof cellValue === "object" && "text" in cellValue) return String(cellValue.text || "");
          return String(cellValue ?? "").trim();
        };
        const name = value("Ad Soyad");
        const department = value("Departman");
        const position = value("Pozisyon");
        if (!name || !department || !position) return;
        imported.push({
          id: `emp-import-${Date.now()}-${rowNumber}`,
          "Ad Soyad": name,
          Departman: department,
          Pozisyon: position,
          "Yönetici 1": value("Yönetici 1") || undefined,
          "Yönetici 2": value("Yönetici 2") || undefined,
          "İşe Giriş Tarihi": value("İşe Giriş Tarihi") || undefined,
        });
      });
      if (!imported.length) throw new Error("Aktarılabilir çalışan kaydı bulunamadı.");
      onImport(imported);
    } catch (error: any) {
      window.alert(error?.message || "Excel içe aktarımı başarısız oldu.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importWorkbook(file); }} />
      <button type="button" disabled={loading} onClick={() => void downloadWorkbook(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><FileDown className="h-3.5 w-3.5"/>Excel şablonu</button>
      <button type="button" disabled={loading} onClick={() => inputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Upload className="h-3.5 w-3.5"/>Excel'den yükle</button>
      <button type="button" disabled={loading || !employees.length} onClick={() => void downloadWorkbook(false)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Download className="h-3.5 w-3.5"/>Dışa aktar</button>
    </div>
  );
}
