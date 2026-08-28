"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FileSpreadsheet, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../../utils/storage";
import {
  FIELD_DEFINITIONS,
  appendImportLog,
  autoMapHeaders,
  canonicalEmployeeFromRow,
  isValidCanonicalEmployee,
  type CanonicalField,
  type ImportSource,
} from "@/lib/hr/dataImport";

type RawRow = Record<string, any>;

const SOURCE_PROFILES: Array<{ key: ImportSource; label: string; detail: string }> = [
  { key: "excel", label: "Genel Excel / CSV", detail: "Standart veya şirketinize özel personel listesi" },
  { key: "logo", label: "Logo", detail: "Logo'dan dışa aktarılan personel Excel/CSV dosyası" },
  { key: "mikro", label: "Mikro", detail: "Mikro personel kartı / personel listesi dışa aktarımı" },
  { key: "netsis", label: "Netsis", detail: "Netsis personel/sicil listesi dışa aktarımı" },
];

function normalizePersonKey(value: unknown) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

function displayValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === "object") {
    const objectValue = value as any;
    return objectValue.text ?? objectValue.result ?? objectValue.formula ?? JSON.stringify(objectValue);
  }
  return value ?? "";
}

function parseDelimited(text: string): { headers: string[]; rows: RawRow[] } {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const delimiter = (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0) ? ";" : ",";
  const parseLine = (line: string) => {
    const cells: string[] = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === delimiter && !quoted) { cells.push(value.trim()); value = ""; continue; }
      value += char;
    }
    cells.push(value.trim());
    return cells;
  };
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]).map((header, index) => header || `Kolon ${index + 1}`);
  const rows = lines.slice(1, 2001).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, rows };
}

async function parseFile(file: File): Promise<{ headers: string[]; rows: RawRow[] }> {
  if (/\.csv$/i.test(file.name)) return parseDelimited(await file.text());
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  const maxColumn = Math.max(headerRow.cellCount, sheet.columnCount);
  for (let col = 1; col <= maxColumn; col += 1) {
    headers.push(String(displayValue(headerRow.getCell(col).value) || `Kolon ${col}`).trim());
  }
  const rows: RawRow[] = [];
  const maxRows = Math.min(sheet.rowCount, 2001);
  for (let rowIndex = 2; rowIndex <= maxRows; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    const record: RawRow = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      const value = displayValue(row.getCell(index + 1).value);
      record[header] = value;
      if (String(value ?? "").trim()) hasValue = true;
    });
    if (hasValue) rows.push(record);
  }
  return { headers, rows };
}

export default function VeriAktarimiPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [source, setSource] = useState<ImportSource>("excel");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<CanonicalField, string>>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const missingRequired = FIELD_DEFINITIONS.filter((field) => field.required && !mapping[field.key]);
  const mappedEmployees = useMemo(() => rows.map((row) => canonicalEmployeeFromRow(row, mapping)), [mapping, rows]);
  const validCount = mappedEmployees.filter(isValidCanonicalEmployee).length;
  const invalidCount = rows.length - validCount;

  const resetFile = () => {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSource = (next: ImportSource) => {
    setSource(next);
    if (headers.length) setMapping(autoMapHeaders(headers, next));
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult("");
    try {
      const parsed = await parseFile(file);
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(autoMapHeaders(parsed.headers, source));
    } catch (error) {
      setResult(`Dosya okunamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
      resetFile();
    } finally {
      setLoading(false);
    }
  };

  const applyImport = () => {
    if (!rows.length || missingRequired.length) return;
    const current = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    const next = [...current];
    let createdRows = 0;
    let updatedRows = 0;
    let skippedRows = 0;

    mappedEmployees.forEach((employee, index) => {
      if (!isValidCanonicalEmployee(employee)) { skippedRows += 1; return; }
      const sourceId = String(employee.id || "").trim();
      const sourceName = normalizePersonKey(employee["Ad Soyad"]);
      const existingIndex = next.findIndex((item) =>
        (sourceId && String(item.id || "").trim() === sourceId) || normalizePersonKey(item["Ad Soyad"]) === sourceName
      );
      const record = {
        ...(existingIndex >= 0 ? next[existingIndex] : {}),
        ...employee,
        id: sourceId || (existingIndex >= 0 ? next[existingIndex]?.id : `emp-import-${Date.now()}-${index}`),
        import_source: source,
        import_file: fileName,
        imported_at: new Date().toISOString(),
      };
      if (existingIndex >= 0) { next[existingIndex] = record; updatedRows += 1; }
      else { next.push(record); createdRows += 1; }
    });

    setStorageData(STORAGE_KEYS.ORG_CHART, next);
    appendImportLog({
      source,
      fileName,
      totalRows: rows.length,
      importedRows: createdRows + updatedRows,
      skippedRows,
      updatedRows,
      createdRows,
      mappedFields: mappedCount,
    });
    window.dispatchEvent(new CustomEvent("dataUpdated"));
    setResult(`${createdRows + updatedRows} kayıt aktarıldı: ${createdRows} yeni, ${updatedRows} güncellendi, ${skippedRows} satır atlandı.`);
  };

  const downloadTemplate = async () => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("FutureHR Personel");
    sheet.addRow(["Personel Kodu", "Ad Soyad", "Departman", "Pozisyon", "1. Yönetici", "2. Yönetici", "İşe Giriş Tarihi", "Brüt Ücret"]);
    sheet.addRow(["P001", "Örnek Çalışan", "Finans", "Finans Uzmanı", "Örnek Yönetici", "", "2024-01-15", ""]);
    sheet.columns.forEach((column) => { column.width = 22; });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "FutureHR_Personel_Aktarim_Sablonu.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="enterprise-eyebrow">Data Onboarding · Türkiye</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">Veri Aktarım Merkezi</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">Mevcut İK sisteminizi değiştirmeden Excel/CSV dışa aktarımlarını FutureHR'ın çalışan veri modeline eşleyin. Logo, Mikro ve Netsis için akıllı sütun eşleme profilleri hazırdır.</p>
        </div>
        <button type="button" onClick={downloadTemplate} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Download className="h-4 w-4" />FutureHR şablonunu indir</button>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs leading-5 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
        <strong>Entegrasyon yaklaşımı:</strong> Bu prototip Logo/Mikro/Netsis'in farklı sürümlerinden alınan Excel/CSV çıktılarındaki yaygın başlıkları otomatik eşler. Resmî API/web-service bağlantıları sonraki production entegrasyon katmanıdır; bu ekran herhangi bir üretici tarafından sertifikalı entegrasyon iddiası taşımaz.
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SOURCE_PROFILES.map((profile) => (
          <button key={profile.key} type="button" onClick={() => handleSource(profile.key)} className={`rounded-2xl border p-4 text-left transition ${source === profile.key ? "border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/20 dark:ring-indigo-950" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"}`}>
            <div className="flex items-center justify-between"><FileSpreadsheet className={`h-5 w-5 ${source === profile.key ? "text-indigo-600" : "text-slate-400"}`} />{source === profile.key && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}</div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{profile.label}</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">{profile.detail}</p>
          </button>
        ))}
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <div className="space-y-4">
          <div className="enterprise-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">1. Dosyayı yükle</h2><p className="mt-1 text-[11px] text-slate-500">.xlsx veya .csv · ilk çalışma sayfası · en fazla 2.000 satır</p></div>
              {fileName && <button type="button" onClick={resetFile} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw className="h-3.5 w-3.5" />Sıfırla</button>}
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.csv" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={loading} className="mt-4 flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/30">
              <Upload className="h-6 w-6 text-indigo-500" />
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{loading ? "Dosya okunuyor…" : fileName || "Excel / CSV dosyasını seç"}</p>
              <p className="mt-1 text-[10px] text-slate-400">Veri önce tarayıcıda önizlenir; onay vermeden çalışan listesine yazılmaz.</p>
            </button>
          </div>

          {headers.length > 0 && (
            <div className="enterprise-card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-sm font-semibold text-slate-900 dark:text-white">2. Sütun eşleme</h2><p className="mt-1 text-[11px] text-slate-500">FutureHR alanlarını dosyanızdaki sütunlarla kontrol edin. Zorunlu alanlar: Ad Soyad, Departman, Pozisyon.</p></div>
              <div className="grid gap-x-5 gap-y-3 p-5 md:grid-cols-2">
                {FIELD_DEFINITIONS.map((field) => (
                  <label key={field.key} className="block">
                    <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{field.label}{field.required && <span className="ml-1 text-red-500">*</span>}</span>{field.sensitive && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">Hassas</span>}</div>
                    <select value={mapping[field.key] || ""} onChange={(event) => setMapping((old) => ({ ...old, [field.key]: event.target.value || undefined }))} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-indigo-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <option value="">Eşleme yok</option>
                      {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="enterprise-card p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Aktarım kontrolü</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat label="Dosya satırı" value={rows.length} />
              <MiniStat label="Eşlenen alan" value={`${mappedCount}/${FIELD_DEFINITIONS.length}`} />
              <MiniStat label="Geçerli kayıt" value={validCount} good={validCount > 0} />
              <MiniStat label="Atlanacak" value={invalidCount} danger={invalidCount > 0} />
            </div>
            {missingRequired.length > 0 && headers.length > 0 && <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Zorunlu eşleme eksik: {missingRequired.map((field) => field.label).join(", ")}</span></div>}
            <button type="button" onClick={applyImport} disabled={!rows.length || missingRequired.length > 0 || validCount === 0} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"><Database className="h-4 w-4" />Demo çalışan verisine uygula</button>
            {result && <div className={`mt-3 rounded-xl border p-3 text-[10px] leading-4 ${result.startsWith("Dosya okunamadı") ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{result}</div>}
          </div>

          <div className="enterprise-card p-5">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Güvenli aktarım kuralları</h2></div>
            <div className="mt-3 space-y-2 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              <p>• Aynı Personel Kodu veya Ad Soyad bulunursa mevcut kayıt güncellenir; kopya çalışan yaratılmaz.</p>
              <p>• Ad Soyad + Departman + Pozisyon eksik satırlar otomatik atlanır.</p>
              <p>• Ücret sütunu isteğe bağlıdır ve yalnızca kullanıcı açıkça eşlerse içeri alınır.</p>
              <p>• Kaynak sistem, dosya adı ve aktarım zamanı kayıt üzerinde izlenebilirlik için tutulur.</p>
            </div>
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="enterprise-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-sm font-semibold text-slate-900 dark:text-white">3. Önizleme</h2><p className="mt-1 text-[11px] text-slate-500">İlk 8 satır · FutureHR kanonik veri modeline dönüştürülmüş görünüm</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:bg-slate-950/50"><tr><th className="px-4 py-3">Personel Kodu</th><th className="px-4 py-3">Ad Soyad</th><th className="px-4 py-3">Departman</th><th className="px-4 py-3">Pozisyon</th><th className="px-4 py-3">1. Yönetici</th><th className="px-4 py-3">İşe Giriş</th><th className="px-4 py-3">Durum</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{mappedEmployees.slice(0, 8).map((employee, index) => { const valid = isValidCanonicalEmployee(employee); return <tr key={index} className="text-slate-600 dark:text-slate-300"><td className="px-4 py-3">{employee.id || "—"}</td><td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{employee["Ad Soyad"] || "—"}</td><td className="px-4 py-3">{employee.Departman || "—"}</td><td className="px-4 py-3">{employee.Pozisyon || "—"}</td><td className="px-4 py-3">{employee["Yönetici 1"] || "—"}</td><td className="px-4 py-3">{employee["İşe Giriş Tarihi"] || "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${valid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{valid ? "Hazır" : "Eksik alan"}</span></td></tr>; })}</tbody></table></div>
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value, good = false, danger = false }: { label: string; value: string | number; good?: boolean; danger?: boolean }) {
  return <div className={`rounded-xl border px-3 py-3 ${danger ? "border-red-100 bg-red-50/60" : good ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40"}`}><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-lg font-semibold ${danger ? "text-red-700" : good ? "text-emerald-700" : "text-slate-900 dark:text-white"}`}>{value}</p></div>;
}
