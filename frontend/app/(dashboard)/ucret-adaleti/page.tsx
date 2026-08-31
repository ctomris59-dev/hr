"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CircleGauge, DollarSign, Scale, Search, ShieldCheck } from "lucide-react";
import { fetchCompensationOverview, type CompensationInsight } from "@/lib/hr/decisionIntelligenceClient";
import { SAAS_DATA_MODE } from "@/lib/hr/saasWorkforceClient";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";

function demoInsights():Array<CompensationInsight>{
  const employees=getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]);
  const benchmarks=getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS,[]);
  return employees.map((employee,index)=>{
    const salary=Number(employee["Maaş (TL)"]||employee["Mevcut Maaş"]||employee.salary||0)||null;
    const benchmark=benchmarks.find(row=>String(row.Departman||row.department||"")===String(employee.Departman||"")&&String(row.Pozisyon||row.position||"")===String(employee.Pozisyon||""));
    const market=Number(benchmark?.["Piyasa Ortalaması"]||benchmark?.market_average||0)||null;
    const peers=employees.filter(row=>row.Departman===employee.Departman&&row.Pozisyon===employee.Pozisyon).map(row=>Number(row["Maaş (TL)"]||row["Mevcut Maaş"]||row.salary||0)).filter(value=>value>0).sort((a,b)=>a-b);
    const peerMedian=peers.length?peers[Math.floor(peers.length/2)]:null;
    const reports=employees.filter(row=>String(row["Yönetici 1"]||"")===String(employee["Ad Soyad"]||"")).map(row=>Number(row["Maaş (TL)"]||row["Mevcut Maaş"]||row.salary||0)).filter(value=>value>0);
    const highestReport=reports.length?Math.max(...reports):null;
    return{employee_id:String(employee.id||`demo-${index}`),employee_name:String(employee["Ad Soyad"]||"Çalışan"),salary_available:Boolean(salary),market_benchmark_available:Boolean(market),market_average:market,compa_ratio:salary&&market?salary/market:null,market_gap_pct:salary&&market?(salary-market)/market*100:null,peer_median:peerMedian,peer_position_pct:salary&&peerMedian?(salary-peerMedian)/peerMedian*100:null,compression_risk:Boolean(salary&&highestReport&&highestReport/salary>=.9),compression_ratio:salary&&highestReport?highestReport/salary:null,benchmark_source:benchmark?.source||"Demo benchmark",department:employee.Departman,position:employee.Pozisyon};
  });
}

export default function UcretAdaletiPage(){
  const[rows,setRows]=useState<CompensationInsight[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState("");const[query,setQuery]=useState("");
  useEffect(()=>{let active=true;(async()=>{try{if(!SAAS_DATA_MODE){if(active)setRows(demoInsights());return;}const overview=await fetchCompensationOverview();if(active)setRows(overview.items);}catch(err){if(active)setError(err instanceof Error?err.message:"Ücret karar zekâsı yüklenemedi.");}finally{if(active)setLoading(false);}})();return()=>{active=false};},[]);
  const filtered=useMemo(()=>{const q=query.toLocaleLowerCase("tr-TR");return rows.filter(row=>!q||`${row.employee_name} ${row.department||""} ${row.position||""}`.toLocaleLowerCase("tr-TR").includes(q));},[rows,query]);
  const metrics=useMemo(()=>{const benchmarked=rows.filter(row=>row.market_benchmark_available),below=benchmarked.filter(row=>(row.market_gap_pct??0)<-5),compression=rows.filter(row=>row.compression_risk),ratios=benchmarked.map(row=>row.compa_ratio).filter((value):value is number=>value!=null).sort((a,b)=>a-b);const med=ratios.length?ratios[Math.floor(ratios.length/2)]:null;return{coverage:rows.length?Math.round(benchmarked.length/rows.length*100):0,below:below.length,compression:compression.length,median:med};},[rows]);

  return <div className="space-y-5">
    <header className="futurehr-page-header"><p className="futurehr-page-eyebrow">Compensation Intelligence</p><h1 className="futurehr-page-title">Ücret Adaleti & Sıkışma</h1><p className="futurehr-page-lede">Piyasa konumu, iç emsal farkı ve yönetici-ekip ücret sıkışmasını tek karar tablosunda görün. Bu görünüm otomatik zam kararı vermez; ücret komitesi ve insan onayı için kanıt üretir.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CircleGauge} label="Benchmark kapsaması" value={loading?"…":`%${metrics.coverage}`}/><Metric icon={DollarSign} label="Piyasanın >%5 altında" value={loading?"…":metrics.below}/><Metric icon={AlertTriangle} label="Sıkışma riski" value={loading?"…":metrics.compression}/><Metric icon={Scale} label="Medyan compa-ratio" value={loading?"…":metrics.median!=null?metrics.median.toFixed(2):"—"}/></div>
    {error&&<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}
    <section className="enterprise-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"><div><p className="enterprise-eyebrow">Ücret karar kanıtı</p><h2 className="mt-1 text-sm font-semibold">Çalışan bazında adalet sinyalleri</h2></div><label className="flex h-9 w-full max-w-[320px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"><Search className="h-3.5 w-3.5 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Çalışan, rol veya departman ara" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"/></label></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="bg-slate-50 text-[9.5px] font-semibold uppercase tracking-[.06em] text-slate-500 dark:bg-slate-900/60"><tr><th className="px-4 py-3">Çalışan</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3 text-right">Compa</th><th className="px-4 py-3 text-right">Piyasa farkı</th><th className="px-4 py-3 text-right">İç emsal</th><th className="px-4 py-3">Sıkışma</th><th className="px-4 py-3">Kanıt</th></tr></thead><tbody className="divide-y divide-slate-100 text-[11px] dark:divide-slate-800">{filtered.map(row=><tr key={row.employee_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40"><td className="px-4 py-3"><p className="font-semibold text-slate-900 dark:text-white">{row.employee_name}</p><p className="mt-0.5 text-[9.5px] text-slate-400">{row.department||"—"}</p></td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.position||"—"}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{row.compa_ratio!=null?row.compa_ratio.toFixed(2):"—"}</td><td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.market_gap_pct!=null&&row.market_gap_pct<-5?"text-amber-700":"text-slate-700 dark:text-slate-200"}`}>{formatPct(row.market_gap_pct)}</td><td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatPct(row.peer_position_pct)}</td><td className="px-4 py-3">{row.compression_risk?<span className="rounded-md bg-amber-50 px-2 py-1 text-[9.5px] font-semibold text-amber-700">İncele</span>:<span className="rounded-md bg-emerald-50 px-2 py-1 text-[9.5px] font-semibold text-emerald-700">Normal</span>}</td><td className="px-4 py-3 text-[9.5px] text-slate-500">{row.market_benchmark_available?row.benchmark_source||"Benchmark mevcut":"Benchmark eksik"}</td></tr>)}{!loading&&!filtered.length&&<tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-500">Eşleşen ücret kaydı bulunamadı.</td></tr>}</tbody></table></div>
    </section>
    <div className="rounded-lg border border-[#cbdad8] bg-[#f1f6f5] px-4 py-3 text-[10.5px] leading-5 text-[#315f5c] dark:border-[#294643] dark:bg-[#172b2a] dark:text-[#a9cfcb]"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5"/>SaaS modunda ücret adaleti analizi tek batch isteğiyle hesaplanır; çalışan başına N+1 çağrı yapılmaz. Compa-ratio ve sıkışma sinyalleri karar desteğidir. Ücret değişikliği mevcut onaylı Compensation döngüsü dışında uygulanmaz.</div>
  </div>;
}
function Metric({icon:Icon,label,value}:{icon:typeof DollarSign;label:string;value:string|number}){return <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className="h-4 w-4 text-slate-400"/></div><p className="mt-3 text-xl font-semibold">{value}</p></div>}
function formatPct(value:number|null){return value!=null?`${value>0?"+":""}${value.toFixed(1)}%`:"—"}
