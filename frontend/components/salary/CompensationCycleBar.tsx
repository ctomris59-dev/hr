"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { COMPENSATION_STAGES, COMPENSATION_STAGE_LABELS, type CompensationCycle } from "@/lib/hr/compensationWorkflow";

export default function CompensationCycleBar() {
  const [cycles,setCycles]=useState<CompensationCycle[]>([]);
  useEffect(()=>{const load=()=>setCycles(getStorageData<CompensationCycle[]>(STORAGE_KEYS.COMPENSATION_CYCLES,[]));load();window.addEventListener("dataUpdated",load);return()=>window.removeEventListener("dataUpdated",load);},[]);
  const active=cycles.find((cycle)=>cycle.stage!=="EFFECTIVE")||cycles[0];
  const progress=useMemo(()=>active?Math.round(((COMPENSATION_STAGES.indexOf(active.stage)+1)/COMPENSATION_STAGES.length)*100):0,[active]);
  if(!active)return <div className="mb-4 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 px-4 py-3 text-xs text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-300">Aktif ücret dönemi yok. Ücret Karar Merkezi'nden yeni bir dönem açın.</div>;
  const requests=Array.isArray(active.managerRequests)?active.managerRequests.length:0;
  return <section className="mb-4 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-4 py-3 shadow-sm dark:border-teal-900/50 dark:from-teal-950/20 dark:via-slate-900 dark:to-cyan-950/20"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white"><Banknote className="h-4 w-4"/></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">{active.name}</p><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-teal-700 ring-1 ring-teal-100 dark:bg-slate-900 dark:ring-teal-900">{COMPENSATION_STAGE_LABELS[active.stage]}</span></div><p className="mt-1 text-[10px] text-slate-500">{requests} yönetici talebi · simülasyon doğrudan ücrete yazılmaz · FINALIZED sonrası yürürlüğe alınır.</p></div></div><div className="flex min-w-[240px] items-center gap-3"><div className="min-w-0 flex-1"><div className="mb-1 flex justify-between text-[9px] text-slate-400"><span>Döngü ilerlemesi</span><b>%{progress}</b></div><div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-teal-600" style={{width:`${progress}%`}}/></div></div>{active.stage==="EFFECTIVE"?<CheckCircle2 className="h-4 w-4 text-emerald-600"/>:active.stage==="APPROVAL"?<ShieldCheck className="h-4 w-4 text-amber-600"/>:<Clock3 className="h-4 w-4 text-teal-600"/>}</div></div></section>;
}
