"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";

function normalize(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR");
}

function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value ?? "").trim().replace(/[^0-9,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function saveWorkbook(workbook: any, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SalaryExcelExchange() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const buildWorkbook = async (includeExistingSalary: boolean) => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const org = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    const benchmarks = getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS, []);

    const salarySheet = workbook.addWorksheet("Çalışan Ücretleri");
    salarySheet.addRow(["Personel Kodu", "Ad Soyad", "Departman", "Pozisyon", "Mevcut Aylık Brüt Ücret"]);
    org.forEach((person) => salarySheet.addRow([
      person.id || person.employee_id || "",
      person["Ad Soyad"] || "",
      person.Departman || "",
      person.Pozisyon || "",
      includeExistingSalary ? (person["Maaş (TL)"] || person["Mevcut Maaş"] || "") : "",
    ]));
    salarySheet.getRow(1).font = { bold: true };
    salarySheet.views = [{ state: "frozen", ySplit: 1 }];
    salarySheet.columns = [16, 28, 22, 28, 24].map((width) => ({ width }));

    const benchmarkSheet = workbook.addWorksheet("Piyasa Benchmarkı");
    benchmarkSheet.addRow(["Departman", "Pozisyon", "Piyasa Aylık Brüt", "Kaynak", "Referans Tarihi"]);
    const uniqueRoles = Array.from(new Map(org.map((person) => [`${person.Departman}::${person.Pozisyon}`, { Departman: person.Departman, Pozisyon: person.Pozisyon }])).values()) as any[];
    uniqueRoles.forEach((role) => {
      const existing = benchmarks.find((item) => item.Departman === role.Departman && item.Pozisyon === role.Pozisyon);
      benchmarkSheet.addRow([
        role.Departman || "",
        role.Pozisyon || "",
        includeExistingSalary ? (existing?.["Piyasa Ortalaması"] || "") : "",
        includeExistingSalary ? (existing?.source || "") : "",
        includeExistingSalary ? String(existing?.updatedAt || "").slice(0, 10) : "",
      ]);
    });
    benchmarkSheet.getRow(1).font = { bold: true };
    benchmarkSheet.views = [{ state: "frozen", ySplit: 1 }];
    benchmarkSheet.columns = [22, 30, 22, 30, 18].map((width) => ({ width }));

    const notes = workbook.addWorksheet("Açıklamalar");
    notes.addRows([
      ["FutureHR Ücret & Benchmark Şablonu"],
      ["Çalışan Ücretleri", "Personel kimlik bilgileri FutureHR'dan gelir. Yetkili kişi yalnızca ücret kolonunu doldurabilir."],
      ["Eşleştirme", "Önce Personel Kodu, yoksa Ad Soyad ile eşleştirilir. Yükleme yeni çalışan oluşturmaz."],
      ["Piyasa Benchmarkı", "Departman + Pozisyon bazında dış piyasa aylık brüt referansı girilebilir."],
      ["Güvenlik", "Ücret dosyasını yalnızca yetkili İK/üst yönetim kullanıcısı işlemelidir."],
    ]);
    notes.getColumn(1).width = 28;
    notes.getColumn(2).width = 95;
    return workbook;
  };

  const downloadTemplate = async () => saveWorkbook(await buildWorkbook(false), "FutureHR_Ucret_Benchmark_Doldurma_Sablonu.xlsx");
  const downloadCurrent = async () => saveWorkbook(await buildWorkbook(true), "FutureHR_Ucret_Benchmark_Mevcut_Liste.xlsx");

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load((await file.arrayBuffer()) as any);
      const salarySheet = workbook.getWorksheet("Çalışan Ücretleri");
      const benchmarkSheet = workbook.getWorksheet("Piyasa Benchmarkı");
      if (!salarySheet && !benchmarkSheet) throw new Error("Çalışan Ücretleri veya Piyasa Benchmarkı sayfası bulunamadı.");

      const org = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      const nextOrg = [...org];
      const currentBenchmarks = getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS, []);
      let nextBenchmarks = [...currentBenchmarks];
      let salaryUpdated = 0;
      let salarySkipped = 0;
      let benchmarkUpdated = 0;
      let benchmarkSkipped = 0;

      if (salarySheet) {
        const headers = new Map<string, number>();
        salarySheet.getRow(1).eachCell((cell, col) => headers.set(normalize(cell.value), col));
        const col = (name: string) => headers.get(normalize(name));
        if (!col("Ad Soyad") || !col("Mevcut Aylık Brüt Ücret")) throw new Error("Çalışan Ücretleri sayfasında Ad Soyad ve Mevcut Aylık Brüt Ücret sütunları zorunludur.");
        for (let rowNo = 2; rowNo <= salarySheet.rowCount; rowNo += 1) {
          const row = salarySheet.getRow(rowNo);
          const get = (name: string) => { const index = col(name); return index ? row.getCell(index).value : undefined; };
          const name = String(get("Ad Soyad") ?? "").trim();
          const code = String(get("Personel Kodu") ?? "").trim();
          const amount = numeric(get("Mevcut Aylık Brüt Ücret"));
          if (!name && !code && amount === null) continue;
          if (amount === null) { salarySkipped += 1; continue; }
          const index = nextOrg.findIndex((item) =>
            (code && String(item.id || item.employee_id || "").trim() === code) || normalize(item["Ad Soyad"]) === normalize(name)
          );
          if (index < 0) { salarySkipped += 1; continue; }
          nextOrg[index] = { ...nextOrg[index], "Maaş (TL)": amount, salary_updated_at: new Date().toISOString(), salary_import_file: file.name };
          salaryUpdated += 1;
        }
      }

      if (benchmarkSheet) {
        const headers = new Map<string, number>();
        benchmarkSheet.getRow(1).eachCell((cell, col) => headers.set(normalize(cell.value), col));
        const col = (name: string) => headers.get(normalize(name));
        if (!col("Departman") || !col("Pozisyon") || !col("Piyasa Aylık Brüt")) throw new Error("Piyasa Benchmarkı sayfasında Departman, Pozisyon ve Piyasa Aylık Brüt sütunları zorunludur.");
        for (let rowNo = 2; rowNo <= benchmarkSheet.rowCount; rowNo += 1) {
          const row = benchmarkSheet.getRow(rowNo);
          const get = (name: string) => { const index = col(name); return index ? row.getCell(index).value : undefined; };
          const department = String(get("Departman") ?? "").trim();
          const position = String(get("Pozisyon") ?? "").trim();
          const amount = numeric(get("Piyasa Aylık Brüt"));
          if (!department && !position && amount === null) continue;
          if (!department || !position || amount === null) { benchmarkSkipped += 1; continue; }
          const entry = {
            id: `bench-${Date.now()}-${rowNo}`,
            Departman: department,
            Pozisyon: position,
            "Piyasa Ortalaması": amount,
            source: String(get("Kaynak") ?? "Excel aktarımı").trim() || "Excel aktarımı",
            updatedAt: String(get("Referans Tarihi") ?? "").trim() || new Date().toISOString(),
          };
          nextBenchmarks = [entry, ...nextBenchmarks.filter((item) => !(item.Departman === department && item.Pozisyon === position))];
          benchmarkUpdated += 1;
        }
      }

      const summary = `${salaryUpdated} çalışan ücreti ve ${benchmarkUpdated} benchmark kaydı hazır. ${salarySkipped + benchmarkSkipped} satır atlanacak.`;
      if (!window.confirm(`${summary}\n\nHassas ücret verileri sisteme uygulansın mı?`)) {
        setStatus(`Aktarım iptal edildi. ${summary}`);
        return;
      }
      setStorageData(STORAGE_KEYS.ORG_CHART, nextOrg);
      setStorageData(STORAGE_KEYS.MARKET_BENCHMARKS, nextBenchmarks);
      window.dispatchEvent(new CustomEvent("dataUpdated"));
      setStatus(`Aktarım tamamlandı. ${summary}`);
    } catch (error) {
      setStatus(`Aktarım başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/80 to-white p-4 dark:border-teal-900/50 dark:from-teal-950/20 dark:to-slate-900">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300"><FileSpreadsheet className="h-4 w-4" /></span>
          <div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900 dark:text-white">Toplu ücret & benchmark aktarımı</p><ShieldCheck className="h-3.5 w-3.5 text-teal-600" /></div><p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500">Çalışan kimliklerini FutureHR doldursun; yetkili kişi Excel'de ücret ve piyasa benchmarklarını tamamlayıp geri yüklesin.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadTemplate} className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-300"><Download className="h-3.5 w-3.5" />Doldurma şablonu</button>
          <button type="button" onClick={downloadCurrent} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Download className="h-3.5 w-3.5" />Mevcut liste</button>
          <input ref={inputRef} type="file" accept=".xlsx" onChange={importFile} className="hidden" />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"><Upload className="h-3.5 w-3.5" />{busy ? "Kontrol ediliyor…" : "Excel yükle"}</button>
        </div>
      </div>
      {status && <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">{status}</p>}
    </section>
  );
}
