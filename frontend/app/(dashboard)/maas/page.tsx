"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  DollarSign,
  Gauge,
  Play,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import SalaryScenarioStudio from "../../../components/salary/SalaryScenarioStudio";
import SalaryDecisionTools from "../../../components/salary/SalaryDecisionTools";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import {
  calculateMarketAverages,
  processEmployeeData,
  runScenarioLogic,
  MarketReference,
  SimulationResult,
} from "../../utils/salarySimulation";
import {
  COMPENSATION_STAGES,
  COMPENSATION_STAGE_LABELS,
  CompensationCycle,
  CompensationStage,
  canApplySalaryChanges,
  createCompensationCycle,
  nextCompensationStage,
} from "../../../lib/hr/compensationWorkflow";
import { useNotifications } from "../../../context/NotificationContext";

interface ExternalBenchmark extends MarketReference {
  id: string;
  source?: string;
  updatedAt: string;
}

type ScenarioKey = "A" | "B" | "C" | "D";

const SCENARIO_NAMES: Record<ScenarioKey, string> = {
  A: "Bütçe Dostu",
  B: "Ücret Referansı Eşitleme",
  C: "Dengeli",
  D: "Yönetici Talepleri",
};

function latestEvaluationPerEmployee(history: any[]) {
  const map = new Map<string, any>();
  const timestamp = (item: any) => {
    const value = item?.date || item?.Tarih || item?.createdAt || item?.timestamp;
    const parsed = value ? new Date(value).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  };
  history.forEach((item) => {
    const name = item?.Personel || item?.target || item?.["Ad Soyad"];
    if (!name) return;
    const existing = map.get(name);
    if (!existing || timestamp(item) >= timestamp(existing)) map.set(name, item);
  });
  return Array.from(map.values());
}

function roleFitTone(value: number | null) {
  if (value === null) return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  if (value >= 90) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (value >= 80) return "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300";
  if (value >= 70) return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
  return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300";
}

function cleanRiskLabel(value: string) {
  return String(value || "").replace(/^[^A-Za-zÇĞİÖŞÜçğıöşü]+\s*/u, "");
}

export default function MaasPage() {
  const { showToast } = useNotifications();
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<ExternalBenchmark[]>([]);
  const [cycles, setCycles] = useState<CompensationCycle[]>([]);
  const [scenario, setScenario] = useState<ScenarioKey>("C");
  const [inflation, setInflation] = useState(35);
  const [benchmarkForm, setBenchmarkForm] = useState({ department: "", position: "", amount: "" });

  const reload = () => {
    setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
    setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
    setBenchmarks(getStorageData<ExternalBenchmark[]>(STORAGE_KEYS.MARKET_BENCHMARKS, []));
    setCycles(getStorageData<CompensationCycle[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []));
  };

  useEffect(() => {
    reload();
    const refresh = () => reload();
    window.addEventListener("dataUpdated", refresh);
    return () => window.removeEventListener("dataUpdated", refresh);
  }, []);

  const latestHistory = useMemo(() => latestEvaluationPerEmployee(history), [history]);
  const employees = useMemo(() => processEmployeeData(orgData, latestHistory), [orgData, latestHistory]);
  const internalRefs = useMemo(() => calculateMarketAverages(employees), [employees]);
  const effectiveRefs = useMemo(
    () => internalRefs.map((ref) => {
      const external = benchmarks.find(
        (benchmark) => benchmark.Departman === ref.Departman && benchmark.Pozisyon === ref.Pozisyon
      );
      return external
        ? { Departman: external.Departman, Pozisyon: external.Pozisyon, "Piyasa Ortalaması": external["Piyasa Ortalaması"] }
        : ref;
    }),
    [internalRefs, benchmarks]
  );

  const activeCycle = cycles.find((cycle) => cycle.stage !== "EFFECTIVE") || cycles[0];
  const managerBudgetRequests = useMemo(
    () => (((activeCycle as any)?.managerRequests || []) as any[])
      .filter((request) => Number(request.rate) > 0 && request.employee)
      .map((request) => ({
        employee_id: String(request.employee),
        requested_rate: Number(request.rate),
        status: "Gönderildi" as const,
      })),
    [activeCycle]
  );

  const results = useMemo(
    () => runScenarioLogic(
      employees,
      effectiveRefs,
      inflation,
      scenario,
      scenario === "D" ? managerBudgetRequests : undefined
    ),
    [employees, effectiveRefs, inflation, scenario, managerBudgetRequests]
  );

  const totalNew = results.reduce((sum, employee) => sum + employee["Yeni Maaş"], 0);
  const totalCurrent = employees.reduce((sum, employee) => sum + employee["Mevcut Maaş"], 0);
  const increase = totalNew - totalCurrent;
  const averageRaise = results.length
    ? results.reduce((sum, row) => sum + row["Zam Oranı (%)"], 0) / results.length
    : 0;

  const saveCycles = (next: CompensationCycle[]) => {
    setCycles(next);
    setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES, next);
  };

  const newCycle = () => {
    const cycle = createCompensationCycle(`${new Date().getFullYear()} Ücret Dönemi`);
    saveCycles([cycle, ...cycles]);
    showToast("Yeni ücret döngüsü oluşturuldu.", "success");
  };

  const saveSimulation = () => {
    if (!activeCycle) return newCycle();
    const next = cycles.map((cycle) => cycle.id === activeCycle.id
      ? { ...cycle, scenario, inflationRate: inflation, results, stage: "DRAFT_SIMULATION" as CompensationStage }
      : cycle
    );
    saveCycles(next);
    showToast(`Senaryo ${scenario} · ${SCENARIO_NAMES[scenario]} simülasyonu taslağa kaydedildi.`, "success");
  };

  const advance = () => {
    if (!activeCycle) return;
    const nextStage = nextCompensationStage(activeCycle.stage);
    const next = cycles.map((cycle) => cycle.id === activeCycle.id
      ? { ...cycle, stage: nextStage, ...(nextStage === "FINALIZED" ? { finalizedAt: new Date().toISOString() } : {}) }
      : cycle
    );
    saveCycles(next);
    showToast(`${COMPENSATION_STAGE_LABELS[nextStage]} aşamasına geçildi.`, "success");
  };

  const applyFinal = () => {
    if (!activeCycle || !canApplySalaryChanges(activeCycle.stage)) return;
    const finalResults = (activeCycle.results || results) as SimulationResult[];
    const map = new Map(finalResults.map((row) => [row["Ad Soyad"], row["Yeni Maaş"]]));
    const nextOrg = orgData.map((person) => map.has(person["Ad Soyad"])
      ? { ...person, "Maaş (TL)": map.get(person["Ad Soyad"]) }
      : person
    );
    setStorageData(STORAGE_KEYS.ORG_CHART, nextOrg);
    const updatedCycles = cycles.map((cycle) => cycle.id === activeCycle.id
      ? { ...cycle, stage: "EFFECTIVE" as CompensationStage, appliedAt: new Date().toISOString(), effectiveDate: new Date().toISOString().slice(0, 10) }
      : cycle
    );
    saveCycles(updatedCycles);
    setOrgData(nextOrg);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
    showToast("Kesinleşen yeni ücret dönemi yürürlüğe alındı.", "success");
  };

  const addBenchmark = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(benchmarkForm.amount);
    if (!benchmarkForm.department || !benchmarkForm.position || !amount) return;
    const entry: ExternalBenchmark = {
      id: `bench-${Date.now()}`,
      Departman: benchmarkForm.department,
      Pozisyon: benchmarkForm.position,
      "Piyasa Ortalaması": amount,
      source: "Dış kaynak / kullanıcı girişi",
      updatedAt: new Date().toISOString(),
    };
    const next = [entry, ...benchmarks.filter((benchmark) => !(benchmark.Departman === entry.Departman && benchmark.Pozisyon === entry.Pozisyon))];
    setBenchmarks(next);
    setStorageData(STORAGE_KEYS.MARKET_BENCHMARKS, next);
    setBenchmarkForm({ department: "", position: "", amount: "" });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-teal-700">Ücret & bütçe analitiği</p>
        <h1 className="mt-1 text-2xl font-semibold">Maaş Simülasyonu</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-500">
          FutureHR'ın ücret karar motoru ücret bandı, performans, yetkinlik/rol uyumu ve kıdemi aynı karar setinde değerlendirir. İç ücret referansı ile dış piyasa benchmarkı ayrı tutulur; hiçbir simülasyon doğrudan maaş değiştirmez.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-teal-900/60 dark:from-teal-950/20 dark:to-slate-900">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-white text-teal-700 shadow-sm dark:border-teal-800 dark:bg-slate-900 dark:text-teal-300"><Gauge className="h-4 w-4" /></span>
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">Simülasyon varsayımı</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Enflasyon değiştiğinde A/B/C/D senaryoları yeniden hesaplanır; A/B/C'de rol uyumu ve yetkinlik merit etkisi ±2 puanla sınırlandırılır.</p>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Enflasyon</span><span className="text-sm font-bold text-teal-700">%</span>
          <input type="number" min="0" max="200" step="0.5" value={inflation} onChange={(event) => setInflation(Number(event.target.value))} className="w-20 border-0 bg-transparent p-0 text-right text-sm font-bold text-slate-900 outline-none dark:text-white" />
        </label>
      </div>

      <SalaryScenarioStudio scenario={scenario} onChange={setScenario} employees={employees} marketRefs={effectiveRefs} inflation={inflation} budgetRequests={managerBudgetRequests} />

      <SalaryDecisionTools
        employees={employees}
        marketRefs={effectiveRefs}
        results={results}
        scenario={scenario}
        scenarioName={SCENARIO_NAMES[scenario]}
        managerRequestCount={managerBudgetRequests.length}
        activeStage={activeCycle?.stage || null}
        activeStageLabel={activeCycle ? COMPENSATION_STAGE_LABELS[activeCycle.stage] : null}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><DollarSign className="h-4 w-4" /></span>
            <div>
              <div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Dış piyasa benchmarkı</h2>{benchmarks.length > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{benchmarks.length} kayıt</span>}</div>
              <p className="mt-0.5 text-[11px] text-slate-500">Araştırılmış dış ücret referansını burada tanımlayın. Girilmezse ilgili pozisyon için “İç Ücret Referansı” kullanılır.</p>
            </div>
          </div>
        </div>
        <form onSubmit={addBenchmark} className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[1.05fr_1.05fr_1fr_auto]">
          <select value={benchmarkForm.department} onChange={(event) => setBenchmarkForm({ ...benchmarkForm, department: event.target.value, position: "" })} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">Departman seçin</option>{Array.from(new Set(employees.map((employee) => employee.Departman))).map((department) => <option key={department}>{department}</option>)}</select>
          <select value={benchmarkForm.position} onChange={(event) => setBenchmarkForm({ ...benchmarkForm, position: event.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">Pozisyon seçin</option>{Array.from(new Set(employees.filter((employee) => !benchmarkForm.department || employee.Departman === benchmarkForm.department).map((employee) => employee.Pozisyon))).map((position) => <option key={position}>{position}</option>)}</select>
          <input type="number" placeholder="Piyasa aylık brüt referansı" value={benchmarkForm.amount} onChange={(event) => setBenchmarkForm({ ...benchmarkForm, amount: event.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <button className="h-10 whitespace-nowrap rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">Benchmarkı kaydet</button>
        </form>
        {benchmarks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            {benchmarks.slice(0, 6).map((benchmark) => (
              <div key={benchmark.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{benchmark.Pozisyon}</span> · {benchmark["Piyasa Ortalaması"].toLocaleString("tr-TR")} ₺
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-700" /><h2 className="text-sm font-semibold">Ücret döngüsü</h2></div>
            <p className="mt-1 text-xs text-slate-500">Simülasyon → Yönetici Talepleri → Bütçe Kontrolü → Onay → Kesinleştirme → Yeni ücret dönemi</p>
          </div>
          {!activeCycle && <button onClick={newCycle} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-1 inline h-4 w-4" />Döngü başlat</button>}
        </div>
        <div className="mt-5 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
            {COMPENSATION_STAGES.map((stage, index) => {
              const active = activeCycle?.stage === stage;
              const done = activeCycle ? COMPENSATION_STAGES.indexOf(activeCycle.stage) > index : false;
              return (
                <div key={stage} className="flex items-center gap-2">
                  <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${active ? "border-teal-700 bg-teal-700 text-white" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"}`}>
                    {done && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}{COMPENSATION_STAGE_LABELS[stage]}
                  </div>
                  {index < COMPENSATION_STAGES.length - 1 && <span className="text-slate-300">→</span>}
                </div>
              );
            })}
          </div>
        </div>
        {activeCycle && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={saveSimulation} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"><Save className="mr-1 inline h-3.5 w-3.5" />Senaryo {scenario}'yı kaydet</button>
            <Link href="/yonetici/maas-talep" className={`rounded-xl border px-3 py-2 text-xs font-semibold ${activeCycle.stage === "MANAGER_INPUT" ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600"}`}>Yönetici taleplerini aç</Link>
            {activeCycle.stage !== "EFFECTIVE" && activeCycle.stage !== "FINALIZED" && <button onClick={advance} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Sonraki aşama</button>}
            {activeCycle.stage === "FINALIZED" && <button onClick={applyFinal} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Play className="mr-1 inline h-3.5 w-3.5" />Yeni ücret dönemini yürürlüğe al</button>}
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-black tracking-wide text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">SENARYO {scenario}</span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{SCENARIO_NAMES[scenario]} sonuçları</h2>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Performans, yetkinlik, rol uyumu, kıdem ve ücret konumu her çalışan için aynı karar satırında görünür.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ResultChip label="Yeni aylık" value={`${Math.round(totalNew).toLocaleString("tr-TR")} ₺`} />
            <ResultChip label="Aylık etki" value={`+${Math.round(increase).toLocaleString("tr-TR")} ₺`} />
            <ResultChip label="Ort. artış" value={`%${averageRaise.toFixed(1)}`} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1420px]">
            <thead>
              <tr>
                <th>Çalışan</th><th>Departman</th><th className="text-center">Performans</th><th className="text-center">Yetkinlik</th><th className="text-center">Rol Uyumu</th><th className="text-center">Kıdem</th><th>Ücret Konumu</th><th className="text-right">Mevcut</th><th className="text-right">Yeni</th><th className="text-right">Zam %</th><th>Karar Mantığı</th><th>Referans</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => {
                const external = benchmarks.some((benchmark) => benchmark.Departman === row.Departman && benchmark.Pozisyon === row.Pozisyon);
                const modifier = row["Yetkinlik Etkisi (puan)"];
                return (
                  <tr key={row["Ad Soyad"]}>
                    <td><div className="font-semibold text-slate-900 dark:text-white">{row["Ad Soyad"]}</div><div className="mt-0.5 text-[10px] text-slate-400">{row.Pozisyon}</div></td>
                    <td>{row.Departman}</td>
                    <td className="text-center"><span className="font-mono font-semibold text-blue-700">{row.Performans.toFixed(1)}</span><span className="text-[10px] text-slate-400"> / 5</span></td>
                    <td className="text-center">{row.Yetkinlik !== null ? <><span className="font-mono font-semibold text-violet-700">{row.Yetkinlik.toFixed(1)}</span><span className="text-[10px] text-slate-400"> / 5</span></> : <span className="text-slate-400">—</span>}</td>
                    <td className="text-center"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${roleFitTone(row.Rol_Uyumu)}`}>{row.Rol_Uyumu !== null ? `%${row.Rol_Uyumu}` : "Veri yok"}</span></td>
                    <td className="text-center"><span className="font-mono font-semibold">{row.Calisma_Yili.toFixed(1)}</span><span className="text-[10px] text-slate-400"> yıl</span></td>
                    <td><div className="font-mono text-xs font-semibold">CR {row["Eski_CR"].toFixed(2)}</div><div className="mt-0.5 text-[10px] text-slate-400">{cleanRiskLabel(row["Eski Risk"])}</div></td>
                    <td className="text-right font-mono">{row["Mevcut Maaş"].toLocaleString("tr-TR")}</td>
                    <td className="text-right font-mono font-semibold">{row["Yeni Maaş"].toLocaleString("tr-TR")}</td>
                    <td className="text-right font-mono font-semibold text-teal-700">%{row["Zam Oranı (%)"].toFixed(1)}</td>
                    <td className="max-w-[340px] text-[11px] text-slate-600 dark:text-slate-300">
                      <div>{row["Zam Açıklaması"]}</div>
                      <div className="mt-1 text-[10px] text-slate-400">P {row.Performans.toFixed(1)} · Y {row.Yetkinlik?.toFixed(1) ?? "—"} · Rol {row.Rol_Uyumu !== null ? `%${row.Rol_Uyumu}` : "—"} · {row.Calisma_Yili.toFixed(1)} yıl{modifier !== 0 ? ` · Merit ${modifier > 0 ? "+" : ""}${modifier.toFixed(1)} puan` : ""}</div>
                    </td>
                    <td><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${external ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{external ? "Dış Piyasa Benchmarkı" : "İç Ücret Referansı"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ResultChip({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/70"><p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-100">{value}</p></div>;
}
