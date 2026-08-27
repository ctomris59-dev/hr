"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { calculateNetSalary } from "../../app/utils/calculations";
import {
  calculateCurrencyImpact,
  type EmployeeData,
  type MarketReference,
  type SimulationResult,
} from "../../app/utils/salarySimulation";

type ScenarioKey = "A" | "B" | "C" | "D";

interface SalaryDecisionToolsProps {
  employees: EmployeeData[];
  marketRefs: MarketReference[];
  results: SimulationResult[];
  scenario: ScenarioKey;
  scenarioName: string;
  managerRequestCount: number;
  activeStage?: string | null;
  activeStageLabel?: string | null;
}

const money = (value: number) => `${Math.round(value || 0).toLocaleString("tr-TR")} ₺`;

export default function SalaryDecisionTools({
  employees,
  marketRefs,
  results,
  scenario,
  scenarioName,
  managerRequestCount,
  activeStage,
  activeStageLabel,
}: SalaryDecisionToolsProps) {
  const [gross, setGross] = useState(60000);
  const [fxIncrease, setFxIncrease] = useState(20);
  const net = useMemo(() => calculateNetSalary(Math.max(0, gross || 0)), [gross]);
  const fx = useMemo(
    () => calculateCurrencyImpact(employees, marketRefs, Math.max(0, fxIncrease || 0)),
    [employees, marketRefs, fxIncrease]
  );

  const managerInputActive = activeStage === "MANAGER_INPUT";
  const hasCycle = Boolean(activeStage);

  const exportExcel = async () => {
    if (!results.length) return;
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Senaryo ${scenario}`);

    sheet.mergeCells("A1:I1");
    const title = sheet.getCell("A1");
    title.value = `FutureHR Maaş Simülasyonu · Senaryo ${scenario} · ${scenarioName}`;
    title.font = { bold: true, size: 15 };
    title.alignment = { horizontal: "center" };

    sheet.addRow([
      "Çalışan",
      "Departman",
      "Pozisyon",
      "Mevcut Maaş",
      "Yeni Maaş",
      "Zam Oranı (%)",
      "Zam Tutarı",
      "Karar Mantığı",
      "Yeni Risk",
    ]);
    const header = sheet.getRow(2);
    header.font = { bold: true };

    results.forEach((row) => {
      sheet.addRow([
        row["Ad Soyad"],
        row.Departman,
        row.Pozisyon,
        row["Mevcut Maaş"],
        row["Yeni Maaş"],
        Number(row["Zam Oranı (%)"].toFixed(2)),
        row["Zam Tutarı"],
        row["Zam Açıklaması"],
        row["Yeni Risk"],
      ]);
    });

    sheet.columns = [
      { width: 24 }, { width: 22 }, { width: 28 }, { width: 16 }, { width: 16 },
      { width: 15 }, { width: 16 }, { width: 44 }, { width: 24 },
    ];
    [4, 5, 7].forEach((index) => {
      sheet.getColumn(index).numFmt = "#,##0.00";
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `FutureHR-Senaryo-${scenario}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr_.85fr]">
      <div className={`overflow-hidden rounded-[18px] border bg-white shadow-sm dark:bg-slate-900 ${managerInputActive ? "border-teal-300 ring-2 ring-teal-100 dark:border-teal-800 dark:ring-teal-950" : "border-slate-200 dark:border-slate-800"}`}>
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${managerInputActive ? "bg-teal-600 text-white" : "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"}`}>
              <UsersRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yönetici Maaş Talepleri</h3>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${managerInputActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {managerInputActive ? "AKTİF AŞAMA" : "ÜCRET DÖNGÜSÜ ALT MODÜLÜ"}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Yöneticiler ekipleri için artış oranı ve gerekçe girer. Talepler çalışan maaşını değiştirmez; bütçe kontrolü ve onaya taşınır.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
            <span className="block text-[9px] uppercase tracking-wide text-slate-400">Talep</span>
            <strong className="mt-0.5 block text-sm text-slate-800 dark:text-slate-100">{managerRequestCount}</strong>
          </span>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/40">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Mevcut durum</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {hasCycle ? activeStageLabel || activeStage : "Aktif ücret döngüsü yok"}
            </p>
          </div>
          <Link href="/yonetici/maas-talep" className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-[11px] font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900">
            Talepleri aç <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Brüt → Net Tahmin</h3>
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">Sunum ve hızlı karşılaştırma içindir; bordro/vergisel kesin hesap değildir.</p>
        <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Aylık brüt ücret
          <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950">
            <input type="number" min="0" value={gross} onChange={(event) => setGross(Number(event.target.value))} className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
            <span className="text-xs font-semibold text-slate-400">₺</span>
          </div>
        </label>
        <div className="mt-3 flex items-end justify-between rounded-xl bg-blue-50 p-3 dark:bg-blue-950/25">
          <div><p className="text-[9px] uppercase tracking-wide text-blue-500">Tahmini net</p><p className="mt-1 text-lg font-bold text-blue-800 dark:text-blue-200">{money(net["Net Maaş"])}</p></div>
          <p className="text-[10px] text-blue-600">Kesinti ~%{gross ? (((gross - net["Net Maaş"]) / gross) * 100).toFixed(1) : "0"}</p>
        </div>
      </div>

      <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Kur Stres Testi</h3>
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">Kur artışının varsayımsal enflasyon ve ücret yükü etkisini hızlıca karşılaştırır.</p>
        <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Kur artışı %
          <input type="range" min="0" max="100" step="1" value={fxIncrease} onChange={(event) => setFxIncrease(Number(event.target.value))} className="mt-2 w-full" />
        </label>
        <div className="mt-2 flex items-center justify-between text-xs"><strong>%{fxIncrease}</strong><span className="text-slate-400">Tahmini enflasyon: %{fx.estimatedInflation.toFixed(1)}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Mini label="Aylık yük artışı" value={money(fx.monthlyIncrease)} />
          <Mini label="Yıllık yük artışı" value={money(fx.yearlyIncrease)} />
        </div>
      </div>

      <div className="xl:col-span-3 flex flex-col gap-3 rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><FileSpreadsheet className="h-4 w-4" /></span>
          <div><p className="text-xs font-bold text-slate-900 dark:text-white">Senaryo çıktısı</p><p className="mt-0.5 text-[10px] text-slate-400">Seçili senaryonun çalışan bazlı ücret, zam oranı ve karar mantığını Excel'e aktar.</p></div>
        </div>
        <button type="button" onClick={exportExcel} disabled={!results.length} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Download className="h-3.5 w-3.5" /> Senaryo {scenario}'yı Excel'e aktar
        </button>
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-[11px] font-bold text-slate-700 dark:text-slate-200">{value}</p></div>;
}
