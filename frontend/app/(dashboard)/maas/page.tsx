"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, DollarSign, Gauge, Play, Plus, Save, ShieldCheck } from "lucide-react";
import SalaryScenarioStudio from "../../../components/salary/SalaryScenarioStudio";
import SalaryDecisionTools from "../../../components/salary/SalaryDecisionTools";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { calculateMarketAverages, processEmployeeData, runScenarioLogic, type MarketReference, type SimulationResult } from "../../utils/salarySimulation";
import {
  COMPENSATION_STAGES,
  COMPENSATION_STAGE_LABELS,
  type CompensationCycle,
  type CompensationStage,
  canApplySalaryChanges,
  createCompensationCycle,
  nextCompensationStage,
} from "../../../lib/hr/compensationWorkflow";
import { useNotifications } from "../../../context/NotificationContext";
import {
  advanceSaasCompensationCycle,
  applySaasCompensationCycle,
  createSaasCompensationCycle,
  fetchSaasCompensationWorkspace,
  SAAS_DATA_MODE,
  saveSaasCompensationSimulation,
  upsertSaasCompensationBenchmark,
} from "../../../lib/hr/saasWorkforceClient";

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

export default function MaasPage() {
  const { showToast } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<ExternalBenchmark[]>([]);
  const [cycles, setCycles] = useState<CompensationCycle[]>([]);
  const [scenario, setScenario] = useState<ScenarioKey>("C");
  const [inflation, setInflation] = useState(35);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [benchmarkForm, setBenchmarkForm] = useState({ department: "", position: "", amount: "" });

  const reload = async () => {
    setLoadError("");
    try {
      if (SAAS_DATA_MODE) {
        const workspace = await fetchSaasCompensationWorkspace();
        setUser(workspace.user ? { ...workspace.user, name: workspace.user.employee_name || workspace.user.username } : null);
        setOrgData(workspace.employees);
        setHistory(workspace.evaluations);
        setBenchmarks(workspace.benchmarks as ExternalBenchmark[]);
        setCycles(workspace.cycles as CompensationCycle[]);
        return;
      }
      setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
      setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
      setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
      setBenchmarks(getStorageData<ExternalBenchmark[]>(STORAGE_KEYS.MARKET_BENCHMARKS, []));
      setCycles(getStorageData<CompensationCycle[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Ücret verisi yüklenemedi.");
      setOrgData([]); setHistory([]); setBenchmarks([]); setCycles([]);
    }
  };

  useEffect(() => {
    void reload();
    const refresh = () => { void reload(); };
    window.addEventListener("dataUpdated", refresh);
    return () => window.removeEventListener("dataUpdated", refresh);
  }, []);

  const latestHistory = useMemo(() => latestEvaluationPerEmployee(history), [history]);
  const employees = useMemo(() => processEmployeeData(orgData, latestHistory), [orgData, latestHistory]);
  const internalRefs = useMemo(() => calculateMarketAverages(employees), [employees]);
  const effectiveRefs = useMemo(
    () => internalRefs.map((ref) => {
      const external = benchmarks.find((benchmark) => benchmark.Departman === ref.Departman && benchmark.Pozisyon === ref.Pozisyon);
      return external ? { Departman: external.Departman, Pozisyon: external.Pozisyon, "Piyasa Ortalaması": external["Piyasa Ortalaması"], Kaynak: external.source || "Dış benchmark" } : ref;
    }),
    [internalRefs, benchmarks]
  );

  const activeCycle = cycles.find((cycle) => cycle.stage !== "EFFECTIVE") || cycles[0];
  const managerBudgetRequests = useMemo(
    () => (((activeCycle as any)?.managerRequests || []) as any[])
      .filter((request) => Number(request.rate) > 0 && request.employee)
      .map((request) => ({ employee_id: String(request.employee), requested_rate: Number(request.rate), status: "Gönderildi" as const })),
    [activeCycle]
  );

  const results = useMemo(
    () => runScenarioLogic(employees, effectiveRefs, inflation, scenario, scenario === "D" ? managerBudgetRequests : undefined),
    [employees, effectiveRefs, inflation, scenario, managerBudgetRequests]
  );

  const totalNew = results.reduce((sum, employee) => sum + employee["Yeni Maaş"], 0);
  const totalCurrent = employees.reduce((sum, employee) => sum + employee["Mevcut Maaş"], 0);
  const increase = totalNew - totalCurrent;
  const averageRaise = results.length ? results.reduce((sum, row) => sum + row["Zam Oranı (%)"], 0) / results.length : 0;
  const role = String(user?.role || "").toUpperCase();

  const saveCycles = (next: CompensationCycle[]) => {
    setCycles(next);
    if (!SAAS_DATA_MODE) setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES, next);
  };

  const replaceCycle = (updated: CompensationCycle) => {
    saveCycles(cycles.some((cycle) => cycle.id === updated.id)
      ? cycles.map((cycle) => cycle.id === updated.id ? updated : cycle)
      : [updated, ...cycles]);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
  };

  const newCycle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const name = `${new Date().getFullYear()} Ücret Dönemi`;
      const cycle = SAAS_DATA_MODE
        ? await createSaasCompensationCycle({ name, budget_limit: 30 }) as CompensationCycle
        : createCompensationCycle(name);
      saveCycles([cycle, ...cycles]);
      showToast("Yeni ücret döngüsü oluşturuldu.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ücret döngüsü oluşturulamadı.", "error");
    } finally { setBusy(false); }
  };

  const saveSimulation = async () => {
    if (!activeCycle) return void newCycle();
    if (busy) return;
    setBusy(true);
    try {
      if (SAAS_DATA_MODE) {
        const identity = new Map(orgData.map((employee) => [String(employee["Ad Soyad"]), String(employee.id || "")]));
        const payloadResults = results.map((row) => {
          const employeeId = identity.get(row["Ad Soyad"]);
          if (!employeeId) throw new Error(`${row["Ad Soyad"]} için SaaS çalışan kimliği bulunamadı.`);
          return { ...row, employee_id: employeeId, new_salary: row["Yeni Maaş"] } as Record<string, unknown>;
        });
        const updated = await saveSaasCompensationSimulation(activeCycle.id, { scenario, inflation_rate: inflation, results: payloadResults });
        replaceCycle(updated as CompensationCycle);
      } else {
        const next = cycles.map((cycle) => cycle.id === activeCycle.id ? { ...cycle, scenario, inflationRate: inflation, results, stage: "DRAFT_SIMULATION" as CompensationStage } : cycle);
        saveCycles(next);
      }
      showToast(`Senaryo ${scenario} · ${SCENARIO_NAMES[scenario]} simülasyonu taslağa kaydedildi.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Simülasyon kaydedilemedi.", "error");
    } finally { setBusy(false); }
  };

  const advance = async () => {
    if (!activeCycle || busy) return;
    setBusy(true);
    try {
      if (SAAS_DATA_MODE) {
        const updated = await advanceSaasCompensationCycle(activeCycle.id);
        replaceCycle(updated as CompensationCycle);
        showToast(`${COMPENSATION_STAGE_LABELS[updated.stage]} aşamasına geçildi.`, "success");
      } else {
        const nextStage = nextCompensationStage(activeCycle.stage);
        const next = cycles.map((cycle) => cycle.id === activeCycle.id ? { ...cycle, stage: nextStage, ...(nextStage === "FINALIZED" ? { finalizedAt: new Date().toISOString() } : {}) } : cycle);
        saveCycles(next);
        showToast(`${COMPENSATION_STAGE_LABELS[nextStage]} aşamasına geçildi.`, "success");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ücret döngüsü ilerletilemedi.", "error");
    } finally { setBusy(false); }
  };

  const applyFinal = async () => {
    if (!activeCycle || busy) return;
    if (!SAAS_DATA_MODE && !canApplySalaryChanges(activeCycle.stage)) return;
    setBusy(true);
    try {
      if (SAAS_DATA_MODE) {
        await applySaasCompensationCycle(activeCycle.id);
        await reload();
      } else {
        const finalResults = (activeCycle.results || results) as SimulationResult[];
        const map = new Map(finalResults.map((row) => [row["Ad Soyad"], row["Yeni Maaş"]]));
        const nextOrg = orgData.map((person) => map.has(person["Ad Soyad"]) ? { ...person, "Maaş (TL)": map.get(person["Ad Soyad"]) } : person);
        setStorageData(STORAGE_KEYS.ORG_CHART, nextOrg);
        const updatedCycles = cycles.map((cycle) => cycle.id === activeCycle.id ? { ...cycle, stage: "EFFECTIVE" as CompensationStage, appliedAt: new Date().toISOString(), effectiveDate: new Date().toISOString().slice(0, 10) } : cycle);
        saveCycles(updatedCycles);
        setOrgData(nextOrg);
      }
      window.dispatchEvent(new CustomEvent("dataUpdated"));
      showToast("Kesinleşen yeni ücret dönemi yürürlüğe alındı.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Yeni ücret dönemi uygulanamadı.", "error");
    } finally { setBusy(false); }
  };

  const addBenchmark = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(benchmarkForm.amount);
    if (!benchmarkForm.department || !benchmarkForm.position || !amount || busy) return;
    setBusy(true);
    try {
      let entry: ExternalBenchmark;
      if (SAAS_DATA_MODE) {
        entry = await upsertSaasCompensationBenchmark({
          department: benchmarkForm.department,
          position: benchmarkForm.position,
          market_average: amount,
          source: "Dış kaynak / kullanıcı girişi",
        }) as ExternalBenchmark;
      } else {
        entry = { id: `bench-${Date.now()}`, Departman: benchmarkForm.department, Pozisyon: benchmarkForm.position, "Piyasa Ortalaması": amount, source: "Dış kaynak / kullanıcı girişi", updatedAt: new Date().toISOString() };
      }
      const next = [entry, ...benchmarks.filter((benchmark) => !(benchmark.Departman === entry.Departman && benchmark.Pozisyon === entry.Pozisyon))];
      setBenchmarks(next);
      if (!SAAS_DATA_MODE) setStorageData(STORAGE_KEYS.MARKET_BENCHMARKS, next);
      setBenchmarkForm({ department: "", position: "", amount: "" });
      showToast("Piyasa benchmarkı kaydedildi.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Benchmark kaydedilemedi.", "error");
    } finally { setBusy(false); }
  };

  const approvalLocked = SAAS_DATA_MODE && activeCycle?.stage === "APPROVAL" && role !== "CEO";

  return <div className="space-y-5">
    <header className="futurehr-page-header">
      <p className="futurehr-page-eyebrow">Ücret & bütçe analitiği</p>
      <h1 className="futurehr-page-title">Maaş Simülasyonu</h1>
      <p className="futurehr-page-lede">Ücret bandı, performans, yetkinlik/rol uyumu ve kıdem aynı karar setinde değerlendirilir. Simülasyon maaşı doğrudan değiştirmez; SaaS modunda yalnız FINALIZED döngü server-side uygulanabilir.</p>
    </header>

    {SAAS_DATA_MODE&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">Ücret ana verisi, benchmarklar, yönetici talepleri ve ücret döngüsü tenant-scoped SaaS veritabanında tutuluyor. Maaş değişikliği yalnız sunucudaki FINALIZED → EFFECTIVE işlemiyle gerçekleşir.</div>}
    {loadError&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{loadError}</div>}

    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><Gauge className="h-4 w-4"/></span><div><p className="text-xs font-semibold">Simülasyon varsayımı</p><p className="mt-1 text-[11px] text-slate-500">A/B/C/D senaryoları aynı çalışan veri setinde yeniden hesaplanır; karar kaydı kullanıcı onayı olmadan maaşa yazılmaz.</p></div></div>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Enflasyon %</span><input type="number" min="0" max="200" step="0.5" value={inflation} onChange={(event)=>setInflation(Number(event.target.value))} className="w-20 bg-transparent text-right text-sm font-semibold outline-none"/></label>
    </div>

    <SalaryScenarioStudio scenario={scenario} onChange={setScenario} employees={employees} marketRefs={effectiveRefs} inflation={inflation} budgetRequests={managerBudgetRequests}/>
    <SalaryDecisionTools employees={employees} marketRefs={effectiveRefs} results={results} scenario={scenario} scenarioName={SCENARIO_NAMES[scenario]} managerRequestCount={managerBudgetRequests.length} activeStage={activeCycle?.stage||null} activeStageLabel={activeCycle?COMPENSATION_STAGE_LABELS[activeCycle.stage]:null}/>

    <section className="enterprise-card p-5">
      <div className="flex items-start gap-3"><DollarSign className="mt-0.5 h-4 w-4 text-teal-700"/><div><h2 className="text-sm font-semibold">Dış piyasa benchmarkı</h2><p className="mt-1 text-[11px] text-slate-500">Dış referans yoksa ilgili rol için iç ücret ortalaması kullanılır.</p></div></div>
      <form onSubmit={addBenchmark} className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
        <select value={benchmarkForm.department} onChange={(event)=>setBenchmarkForm({...benchmarkForm,department:event.target.value,position:""})} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Departman seçin</option>{Array.from(new Set(employees.map((employee)=>employee.Departman))).map((department)=><option key={department}>{department}</option>)}</select>
        <select value={benchmarkForm.position} onChange={(event)=>setBenchmarkForm({...benchmarkForm,position:event.target.value})} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Pozisyon seçin</option>{Array.from(new Set(employees.filter((employee)=>!benchmarkForm.department||employee.Departman===benchmarkForm.department).map((employee)=>employee.Pozisyon))).map((position)=><option key={position}>{position}</option>)}</select>
        <input type="number" placeholder="Piyasa aylık brüt referansı" value={benchmarkForm.amount} onChange={(event)=>setBenchmarkForm({...benchmarkForm,amount:event.target.value})} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"/>
        <button disabled={busy} className="h-10 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Benchmarkı kaydet</button>
      </form>
      {benchmarks.length>0&&<div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">{benchmarks.slice(0,8).map((benchmark)=><span key={benchmark.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500"><strong>{benchmark.Pozisyon}</strong> · {benchmark["Piyasa Ortalaması"].toLocaleString("tr-TR")} ₺</span>)}</div>}
    </section>

    <section className="enterprise-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-700"/><h2 className="text-sm font-semibold">Ücret döngüsü</h2></div><p className="mt-1 text-xs text-slate-500">Simülasyon → Yönetici Talepleri → Bütçe Kontrolü → CEO Onayı → Kesinleştirme → Yeni ücret dönemi</p></div>{!activeCycle&&<button disabled={busy} onClick={()=>{void newCycle()}} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-1 inline h-4 w-4"/>Döngü başlat</button>}</div>
      <div className="mt-5 overflow-x-auto"><div className="flex min-w-max items-center gap-2">{COMPENSATION_STAGES.map((stage,index)=>{const active=activeCycle?.stage===stage;const done=activeCycle?COMPENSATION_STAGES.indexOf(activeCycle.stage)>index:false;return <div key={stage} className="flex items-center gap-2"><div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${active?"border-teal-700 bg-teal-700 text-white":done?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-slate-200 text-slate-400"}`}>{done&&<CheckCircle2 className="mr-1 inline h-3.5 w-3.5"/>}{COMPENSATION_STAGE_LABELS[stage]}</div>{index<COMPENSATION_STAGES.length-1&&<span className="text-slate-300">→</span>}</div>})}</div></div>
      {activeCycle&&<div className="mt-4 flex flex-wrap gap-2"><button disabled={busy||activeCycle.stage!=="DRAFT_SIMULATION"} onClick={()=>{void saveSimulation()}} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"><Save className="mr-1 inline h-3.5 w-3.5"/>Senaryo {scenario}&apos;yı kaydet</button><Link href="/yonetici/maas-talep" className={`rounded-lg border px-3 py-2 text-xs font-semibold ${activeCycle.stage==="MANAGER_INPUT"?"border-teal-200 bg-teal-50 text-teal-800":"border-slate-200 text-slate-600"}`}>Yönetici talepleri</Link>{activeCycle.stage!=="EFFECTIVE"&&activeCycle.stage!=="FINALIZED"&&<button disabled={busy||approvalLocked} onClick={()=>{void advance()}} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{approvalLocked?"CEO onayı bekleniyor":"Sonraki aşama"}</button>}{activeCycle.stage==="FINALIZED"&&<button disabled={busy} onClick={()=>{void applyFinal()}} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Play className="mr-1 inline h-3.5 w-3.5"/>Yeni ücret dönemini yürürlüğe al</button>}</div>}
    </section>

    <section className="enterprise-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">Senaryo {scenario}</p><h2 className="mt-1 text-sm font-semibold">{SCENARIO_NAMES[scenario]} sonuçları</h2></div><div className="flex flex-wrap gap-2"><ResultChip label="Yeni aylık" value={`${Math.round(totalNew).toLocaleString("tr-TR")} ₺`}/><ResultChip label="Aylık etki" value={`+${Math.round(increase).toLocaleString("tr-TR")} ₺`}/><ResultChip label="Ort. artış" value={`%${averageRaise.toFixed(1)}`}/></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px]"><thead><tr><th>Çalışan</th><th>Departman</th><th className="text-center">Performans</th><th className="text-center">Yetkinlik</th><th className="text-right">Mevcut</th><th className="text-right">Yeni</th><th className="text-right">Zam %</th><th>Karar mantığı</th></tr></thead><tbody>{results.length?results.map((row)=><tr key={row["Ad Soyad"]}><td><strong>{row["Ad Soyad"]}</strong><div className="text-[10px] text-slate-400">{row.Pozisyon}</div></td><td>{row.Departman}</td><td className="text-center font-mono">{row.Performans?row.Performans.toFixed(1):"—"}</td><td className="text-center font-mono">{row.Yetkinlik!==null?row.Yetkinlik.toFixed(1):"—"}</td><td className="text-right font-mono">{row["Mevcut Maaş"].toLocaleString("tr-TR")}</td><td className="text-right font-mono font-semibold">{row["Yeni Maaş"].toLocaleString("tr-TR")}</td><td className="text-right font-mono">%{row["Zam Oranı (%)"].toFixed(1)}</td><td className="max-w-[360px] text-xs text-slate-500">{row["Zam Açıklaması"]}</td></tr>):<tr><td colSpan={8} className="py-10 text-center text-sm text-slate-500">Ücret simülasyonu için çalışan verisi bulunmuyor.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}

function ResultChip({label,value}:{label:string;value:string}){return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-xs font-semibold">{value}</p></div>}
