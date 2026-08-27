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

  useEffect(() => reload(), []);

  const employees = useMemo(() => processEmployeeData(orgData, history), [orgData, history]);
  const internalRefs = useMemo(() => calculateMarketAverages(employees), [employees]);
  const effectiveRefs = useMemo(
    () =>
      internalRefs.map((ref) => {
        const external = benchmarks.find(
          (benchmark) => benchmark.Departman === ref.Departman && benchmark.Pozisyon === ref.Pozisyon
        );
        return external
          ? {
              Departman: external.Departman,
              Pozisyon: external.Pozisyon,
              "Piyasa Ortalaması": external["Piyasa Ortalaması"],
            }
          : ref;
      }),
    [internalRefs, benchmarks]
  );

  const activeCycle = cycles.find((cycle) => cycle.stage !== "EFFECTIVE") || cycles[0];
  const managerBudgetRequests = useMemo(
    () =>
      (((activeCycle as any)?.managerRequests || []) as any[])
        .filter((request) => Number(request.rate) > 0 && request.employee)
        .map((request) => ({
          employee_id: String(request.employee),
          requested_rate: Number(request.rate),
          status: "Gönderildi" as const,
        })),
    [activeCycle]
  );

  const results = useMemo(
    () =>
      runScenarioLogic(
        employees,
        effectiveRefs,
        inflation,
        scenario,
        scenario === "D" ? managerBudgetRequests : undefined
      ),
    [employees, effectiveRefs, inflation, scenario, managerBudgetRequests]
  );

  const totalCurrent = employees.reduce((sum, employee) => sum + employee["Mevcut Maaş"], 0);
  const totalNew = results.reduce((sum, employee) => sum + employee["Yeni Maaş"], 0);
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
    const next = cycles.map((cycle) =>
      cycle.id === activeCycle.id
        ? {
            ...cycle,
            scenario,
            inflationRate: inflation,
            results,
            stage: "DRAFT_SIMULATION" as CompensationStage,
          }
        : cycle
    );
    saveCycles(next);
    showToast(`Senaryo ${scenario} · ${SCENARIO_NAMES[scenario]} simülasyonu taslağa kaydedildi.`, "success");
  };

  const advance = () => {
    if (!activeCycle) return;
    const nextStage = nextCompensationStage(activeCycle.stage);
    const next = cycles.map((cycle) =>
      cycle.id === activeCycle.id
        ? {
            ...cycle,
            stage: nextStage,
            ...(nextStage === "FINALIZED" ? { finalizedAt: new Date().toISOString() } : {}),
          }
        : cycle
    );
    saveCycles(next);
    showToast(`${COMPENSATION_STAGE_LABELS[nextStage]} aşamasına geçildi.`, "success");
  };

  const applyFinal = () => {
    if (!activeCycle || !canApplySalaryChanges(activeCycle.stage)) return;
    const finalResults = (activeCycle.results || results) as SimulationResult[];
    const map = new Map(finalResults.map((row) => [row["Ad Soyad"], row["Yeni Maaş"]]));
    const nextOrg = orgData.map((person) =>
      map.has(person["Ad Soyad"])
        ? { ...person, "Maaş (TL)": map.get(person["Ad Soyad"]) }
        : person
    );
    setStorageData(STORAGE_KEYS.ORG_CHART, nextOrg);
    const updatedCycles = cycles.map((cycle) =>
      cycle.id === activeCycle.id
        ? {
            ...cycle,
            stage: "EFFECTIVE" as CompensationStage,
            appliedAt: new Date().toISOString(),
            effectiveDate: new Date().toISOString().slice(0, 10),
          }
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
    const next = [
      entry,
      ...benchmarks.filter(
        (benchmark) =>
          !(benchmark.Departman === entry.Departman && benchmark.Pozisyon === entry.Pozisyon)
      ),
    ];
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
          FutureHR'ın ücret karar motoru dört ayrı stratejiyi aynı veri setinde karşılaştırır. İç veriden hesaplanan değerler “İç Ücret Referansı”dır; gerçek dış piyasa benchmarkı ayrıca yüklenir ve hiçbir simülasyon doğrudan maaş değiştirmez.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-teal-900/60 dark:from-teal-950/20 dark:to-slate-900">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-white text-teal-700 shadow-sm dark:border-teal-800 dark:bg-slate-900 dark:text-teal-300">
            <Gauge className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">Simülasyon varsayımı</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Enflasyon oranını değiştirince A/B/C/D senaryolarının tamamı anında yeniden hesaplanır.</p>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Enflasyon</span>
          <span className="text-sm font-bold text-teal-700">%</span>
          <input
            type="number"
            min="0"
            max="200"
            step="0.5"
            value={inflation}
            onChange={(event) => setInflation(Number(event.target.value))}
            className="w-20 border-0 bg-transparent p-0 text-right text-sm font-bold text-slate-900 outline-none dark:text-white"
          />
        </label>
      </div>

      <SalaryScenarioStudio
        scenario={scenario}
        onChange={setScenario}
        employees={employees}
        marketRefs={effectiveRefs}
        inflation={inflation}
        budgetRequests={managerBudgetRequests}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              <h2 className="text-sm font-semibold">Ücret döngüsü</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Simülasyon → Yönetici Talepleri → Bütçe Kontrolü → Onay → Kesinleştirme → Yeni ücret dönemi</p>
          </div>
          {!activeCycle && (
            <button onClick={newCycle} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
              <Plus className="mr-1 inline h-4 w-4" />Döngü başlat
            </button>
          )}
        </div>
        <div className="mt-5 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
            {COMPENSATION_STAGES.map((stage, index) => {
              const active = activeCycle?.stage === stage;
              const done = activeCycle ? COMPENSATION_STAGES.indexOf(activeCycle.stage) > index : false;
              return (
                <div key={stage} className="flex items-center gap-2">
                  <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${active ? "border-teal-700 bg-teal-700 text-white" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"}`}>
                    {done && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                    {COMPENSATION_STAGE_LABELS[stage]}
                  </div>
                  {index < COMPENSATION_STAGES.length - 1 && <span className="text-slate-300">→</span>}
                </div>
              );
            })}
          </div>
        </div>
        {activeCycle && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={saveSimulation} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
              <Save className="mr-1 inline h-3.5 w-3.5" />Senaryo {scenario}'yı kaydet
            </button>
            {activeCycle.stage === "MANAGER_INPUT" && (
              <Link href="/yonetici/maas-talep" className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
                Yönetici taleplerini aç
              </Link>
            )}
            {activeCycle.stage !== "EFFECTIVE" && activeCycle.stage !== "FINALIZED" && (
              <button onClick={advance} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Sonraki aşama</button>
            )}
            {activeCycle.stage === "FINALIZED" && (
              <button onClick={applyFinal} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                <Play className="mr-1 inline h-3.5 w-3.5" />Yeni ücret dönemini yürürlüğe al
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-black tracking-wide text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">SENARYO {scenario}</span>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{SCENARIO_NAMES[scenario]} sonuçları</h2>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Her çalışanın ücret önerisi ve motorun kullandığı karar mantığı.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ResultChip label="Yeni aylık" value={`${Math.round(totalNew).toLocaleString("tr-TR")} ₺`} />
              <ResultChip label="Aylık etki" value={`+${Math.round(increase).toLocaleString("tr-TR")} ₺`} />
              <ResultChip label="Ort. artış" value={`%${averageRaise.toFixed(1)}`} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr>
                  <th>Çalışan</th>
                  <th>Departman</th>
                  <th className="text-right">Mevcut</th>
                  <th className="text-right">Yeni</th>
                  <th className="text-right">Zam %</th>
                  <th>Karar Mantığı</th>
                  <th>Referans</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => {
                  const external = benchmarks.some(
                    (benchmark) => benchmark.Departman === row.Departman && benchmark.Pozisyon === row.Pozisyon
                  );
                  return (
                    <tr key={row["Ad Soyad"]}>
                      <td>{row["Ad Soyad"]}</td>
                      <td>{row.Departman}</td>
                      <td className="text-right font-mono">{row["Mevcut Maaş"].toLocaleString("tr-TR")}</td>
                      <td className="text-right font-mono font-semibold">{row["Yeni Maaş"].toLocaleString("tr-TR")}</td>
                      <td className="text-right font-mono font-semibold text-teal-700">%{row["Zam Oranı (%)"].toFixed(1)}</td>
                      <td className="max-w-[320px] text-[11px] text-slate-600">{row["Zam Açıklaması"]}</td>
                      <td>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${external ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                          {external ? "Dış Piyasa Benchmarkı" : "İç Ücret Referansı"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-teal-700" />
            <h2 className="text-sm font-semibold">Dış piyasa benchmarkı</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Demo aşamasında araştırılmış dış veri manuel girilir. Girilmezse simülasyonda açıkça “İç Ücret Referansı” kullanılır.</p>
          <form onSubmit={addBenchmark} className="mt-4 space-y-3">
            <select
              value={benchmarkForm.department}
              onChange={(event) => setBenchmarkForm({ ...benchmarkForm, department: event.target.value, position: "" })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            >
              <option value="">Departman seçin</option>
              {Array.from(new Set(employees.map((employee) => employee.Departman))).map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
            <select
              value={benchmarkForm.position}
              onChange={(event) => setBenchmarkForm({ ...benchmarkForm, position: event.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            >
              <option value="">Pozisyon seçin</option>
              {Array.from(
                new Set(
                  employees
                    .filter((employee) => !benchmarkForm.department || employee.Departman === benchmarkForm.department)
                    .map((employee) => employee.Pozisyon)
                )
              ).map((position) => (
                <option key={position}>{position}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Piyasa aylık brüt referansı"
              value={benchmarkForm.amount}
              onChange={(event) => setBenchmarkForm({ ...benchmarkForm, amount: event.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            />
            <button className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white">Benchmarkı kaydet</button>
          </form>
          <div className="mt-4 space-y-2">
            {benchmarks.slice(0, 6).map((benchmark) => (
              <div key={benchmark.id} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                <p className="font-semibold">{benchmark.Pozisyon}</p>
                <p className="mt-1 text-slate-500">{benchmark.Departman} · {benchmark["Piyasa Ortalaması"].toLocaleString("tr-TR")} ₺</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
