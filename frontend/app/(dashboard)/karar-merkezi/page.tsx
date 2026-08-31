"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2, CircleGauge, ShieldCheck } from "lucide-react";
import EmployeeDigitalTwinDrawer from "@/components/EmployeeDigitalTwinDrawer";
import { fetchDecisionPriorities, type DecisionPriority } from "@/lib/hr/decisionIntelligenceClient";
import { SAAS_DATA_MODE } from "@/lib/hr/saasWorkforceClient";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { buildTalentDecisionSnapshot } from "@/lib/hr/talentDecisionChain";

function demoPriorities():DecisionPriority[]{
  const org=getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]);
  const history=getStorageData<any[]>(STORAGE_KEYS.HISTORY_360,[]);
  return org.map((employee,index)=>{
    const snapshot=buildTalentDecisionSnapshot(employee,history);
    const reasons:string[]=[];
    let priority=0;
    if(snapshot.evidence.score<60){priority+=3;reasons.push("Düşük kanıt güveni");}
    if(snapshot.performance.score>=4.2){priority+=1;reasons.push("Yüksek performans");}
    if(snapshot.evidence.missingSignals.length){priority+=1;reasons.push("Eksik karar sinyali");}
    return {employee_id:String(employee.id||`demo-${index}`),employee_name:String(employee["Ad Soyad"]||"Çalışan"),department:employee.Departman,priority_score:priority,reasons,recommended_next_step:snapshot.evidence.score<60?"Eksik kanıtları tamamla ve kararı yeniden değerlendir.":"Kariyer, gelişim ve ücret sinyallerini birlikte gözden geçir.",evidence_score:snapshot.evidence.score};
  }).filter(item=>item.reasons.length).sort((a,b)=>b.priority_score-a.priority_score).slice(0,25);
}

export default function KararMerkeziPage(){
  const[items,setItems]=useState<DecisionPriority[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[selected,setSelected]=useState<DecisionPriority|null>(null);

  useEffect(()=>{let active=true;(async()=>{try{const rows=SAAS_DATA_MODE?(await fetchDecisionPriorities()).items:demoPriorities();if(active)setItems(rows);}catch(err){if(active)setError(err instanceof Error?err.message:"Karar sinyalleri yüklenemedi.");}finally{if(active)setLoading(false);}})();return()=>{active=false};},[]);
  const summary=useMemo(()=>({critical:items.filter(item=>item.priority_score>=4).length,lowEvidence:items.filter(item=>item.evidence_score<55).length,total:items.length}),[items]);

  return <>
    <div className="space-y-5">
      <header className="futurehr-page-header">
        <p className="futurehr-page-eyebrow">Decision Intelligence</p>
        <h1 className="futurehr-page-title">Karar Motoru</h1>
        <p className="futurehr-page-lede">Performans, yetenek, gelişim, ücret ve kanıt kalitesini aynı insan karar zincirinde birleştirir. FutureHR önerir ve açıklar; nihai karar yetkili kullanıcıda kalır.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Dikkat isteyen profil" value={loading?"…":summary.total} icon={BrainCircuit}/>
        <Metric label="Yüksek öncelik" value={loading?"…":summary.critical} icon={AlertTriangle}/>
        <Metric label="Düşük kanıt güveni" value={loading?"…":summary.lowEvidence} icon={CircleGauge}/>
      </div>

      <section className="enterprise-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div><p className="enterprise-eyebrow">Yönetim öncelikleri</p><h2 className="mt-1 text-sm font-semibold">Neden şimdi dikkat gerekiyor?</h2></div>
          <div className="flex items-center gap-2 text-[10.5px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-[#2f6664]"/>İnsan onaylı karar desteği</div>
        </div>
        {error&&<div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}
        {loading?<div className="p-8 text-center text-sm text-slate-500">Karar zincirleri hesaplanıyor…</div>:items.length?<div className="divide-y divide-slate-100 dark:divide-slate-800">{items.map((item,index)=><button key={item.employee_id} type="button" onClick={()=>SAAS_DATA_MODE&&setSelected(item)} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-50/70 sm:grid-cols-[34px_minmax(180px,.8fr)_minmax(220px,1.2fr)_100px_24px] sm:items-center dark:hover:bg-slate-900/40">
          <span className="text-[10px] font-semibold tabular-nums text-slate-300">{String(index+1).padStart(2,"0")}</span>
          <div><p className="text-xs font-semibold text-slate-900 dark:text-white">{item.employee_name}</p><p className="mt-1 text-[10.5px] text-slate-400">{item.department||"Departman belirtilmedi"}</p></div>
          <div><div className="flex flex-wrap gap-1.5">{item.reasons.map(reason=><span key={reason} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9.5px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{reason}</span>)}</div><p className="mt-2 text-[10.5px] leading-4 text-slate-500">{item.recommended_next_step}</p></div>
          <div><p className="text-[9.5px] uppercase tracking-wide text-slate-400">Kanıt</p><p className={`mt-1 text-sm font-semibold ${item.evidence_score<55?"text-amber-700":"text-[#2f6664]"}`}>{item.evidence_score}/100</p></div>
          <ArrowRight className="h-4 w-4 text-slate-300"/>
        </button>)}</div>:<div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-600"/>Şu anda öncelikli karar sinyali bulunmuyor.</div>}
      </section>

      <div className="rounded-lg border border-[#cbdad8] bg-[#f1f6f5] px-4 py-3 text-[10.5px] leading-5 text-[#315f5c] dark:border-[#294643] dark:bg-[#172b2a] dark:text-[#a9cfcb]">Karar Motoru sonuçları otomatik insan kaynağı kararı değildir. Kanıt güveni, eksik veri ve riskler görünür tutulur; onay kaydı Digital Twin üzerinde insan kullanıcı tarafından verilir.</div>
    </div>
    {selected&&<EmployeeDigitalTwinDrawer employeeId={selected.employee_id} fallbackName={selected.employee_name} onClose={()=>setSelected(null)}/>} 
  </>;
}

function Metric({label,value,icon:Icon}:{label:string;value:string|number;icon:typeof BrainCircuit}){return <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className="h-4 w-4 text-slate-400"/></div><p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p></div>}
