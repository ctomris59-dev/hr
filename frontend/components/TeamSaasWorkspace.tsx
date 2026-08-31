"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Search, Users } from "lucide-react";
import EmployeeDigitalTwinDrawer from "@/components/EmployeeDigitalTwinDrawer";
import { fetchSaasTeamWorkspace, type EmployeeRow, type EvaluationRow, type DevelopmentPlanRow, type LeaveRequestRow } from "@/lib/hr/saasWorkforceClient";

export default function TeamSaasWorkspace(){
  const[employees,setEmployees]=useState<EmployeeRow[]>([]);
  const[evaluations,setEvaluations]=useState<EvaluationRow[]>([]);
  const[plans,setPlans]=useState<DevelopmentPlanRow[]>([]);
  const[leave,setLeave]=useState<LeaveRequestRow[]>([]);
  const[query,setQuery]=useState("");
  const[selected,setSelected]=useState<EmployeeRow|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");

  const reload=async()=>{
    setError("");
    try{const workspace=await fetchSaasTeamWorkspace();setEmployees(workspace.employees);setEvaluations(workspace.evaluations);setPlans(workspace.plans);setLeave(workspace.leaveRequests);}
    catch(err){setError(err instanceof Error?err.message:"Ekip verisi yüklenemedi.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void reload();const handler=()=>void reload();window.addEventListener("dataUpdated",handler);return()=>window.removeEventListener("dataUpdated",handler);},[]);

  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase("tr-TR");return employees.filter(row=>!q||`${row["Ad Soyad"]} ${row.Pozisyon||""} ${row.Departman||""}`.toLocaleLowerCase("tr-TR").includes(q));},[employees,query]);
  const pendingLeave=leave.filter(row=>row.status==="Bekliyor").length;
  const activePlans=plans.filter(row=>row.status!=="Tamamlandı").length;

  return <>
    <div className="space-y-5">
      <header className="futurehr-page-header"><p className="futurehr-page-eyebrow">People Intelligence</p><h1 className="futurehr-page-title">Ekip</h1><p className="futurehr-page-lede">Bağlı çalışanları tek bir çalışma alanında yönetin. Çalışan kartı açıldığında klasik profil yerine canlı Digital Twin; performans, yetkinlik, gelişim, izin, ücret konumu ve kanıt zincirini birlikte gösterir.</p></header>
      <div className="rounded-lg border border-[#cbdad8] bg-[#f1f6f5] px-4 py-3 text-[10.5px] leading-5 text-[#315f5c] dark:border-[#294643] dark:bg-[#172b2a] dark:text-[#a9cfcb]">Production ekip görünümü yalnız tenant-scoped SaaS API&apos;lerden beslenir. Browser storage veri otoritesi değildir.</div>
      {error&&<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Users} label="Yönetilen çalışan" value={loading?"…":employees.length}/><Metric icon={CalendarDays} label="Bekleyen izin" value={loading?"…":pendingLeave}/><Metric icon={Clock3} label="Aktif gelişim" value={loading?"…":activePlans}/></div>
      <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"><Search className="h-4 w-4 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ekipte ara" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map(employee=>{
        const name=String(employee["Ad Soyad"]||"Çalışan");
        const lastEval=latestEvaluation(evaluations,employee.id,name);
        const employeePlans=plans.filter(row=>row.employee_id===employee.id&&row.status!=="Tamamlandı").length;
        const employeeLeave=leave.filter(row=>row.employee_id===employee.id&&row.status==="Bekliyor").length;
        return <article key={employee.id} className="enterprise-card p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{name}</h2><p className="mt-1 truncate text-xs text-slate-500">{employee.Pozisyon||"Pozisyon bilgisi yok"}</p><p className="mt-1 truncate text-[10.5px] text-slate-400">{employee.Departman||"Departman bilgisi yok"}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{initials(name)}</span></div><div className="mt-4 grid grid-cols-3 gap-2"><Mini label="Son perf." value={performance(lastEval)}/><Mini label="Gelişim" value={String(employeePlans)}/><Mini label="İzin" value={String(employeeLeave)}/></div><div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800"><button type="button" onClick={()=>setSelected(employee)} className="text-[11px] font-semibold text-[#2f6664] hover:underline">Digital Twin&apos;i aç →</button></div></article>;
      })}</div>
      {!loading&&!filtered.length&&<div className="enterprise-card p-10 text-center text-sm text-slate-500">Yönetilebilir çalışan bulunmuyor.</div>}
    </div>
    {selected&&<EmployeeDigitalTwinDrawer employeeId={selected.id} fallbackName={String(selected["Ad Soyad"]||"Çalışan")} onClose={()=>setSelected(null)}/>} 
  </>;
}

function latestEvaluation(rows:EvaluationRow[],employeeId:string,name:string){return rows.filter(row=>row.employee_id===employeeId||row.Personel===name).sort((a,b)=>new Date(b.date||0).getTime()-new Date(a.date||0).getTime())[0]}
function performance(row:EvaluationRow|undefined){const value=Number(row?.Performans);return Number.isFinite(value)&&value>0?value.toFixed(1):"—"}
function initials(name:string){return name.split(" ").filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")||"FH"}
function Metric({icon:Icon,label,value}:{icon:typeof Users;label:string;value:string|number}){return <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className="h-4 w-4 text-slate-400"/></div><p className="mt-3 text-xl font-semibold">{value}</p></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60"><p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
