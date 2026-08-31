"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, LockKeyhole, Send } from "lucide-react";
import { getManageableEmployees } from "../../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../../utils/storage";
import { calculateMarketAverages, processEmployeeData, runScenarioLogic } from "../../../utils/salarySimulation";
import { COMPENSATION_STAGE_LABELS, type CompensationCycle } from "../../../../lib/hr/compensationWorkflow";
import { useNotifications } from "../../../../context/NotificationContext";
import {
  fetchSaasCompensationWorkspace,
  SAAS_DATA_MODE,
  submitSaasCompensationManagerRequests,
} from "../../../../lib/hr/saasWorkforceClient";

interface Proposal { rate:number|null; note:string }

export default function YoneticiMaasTalepPage(){
  const{showToast}=useNotifications();
  const[user,setUser]=useState<any>(null);
  const[orgData,setOrgData]=useState<any[]>([]);
  const[history,setHistory]=useState<any[]>([]);
  const[cycles,setCycles]=useState<CompensationCycle[]>([]);
  const[proposals,setProposals]=useState<Record<string,Proposal>>({});
  const[loadError,setLoadError]=useState("");
  const[busy,setBusy]=useState(false);

  const load=async()=>{
    setLoadError("");
    try{
      if(SAAS_DATA_MODE){
        const workspace=await fetchSaasCompensationWorkspace();
        const secureUser=workspace.user?{...workspace.user,name:workspace.user.employee_name||workspace.user.username}:null;
        setUser(secureUser);
        setOrgData(workspace.employees);
        setHistory(workspace.evaluations);
        setCycles(workspace.cycles as CompensationCycle[]);
        const active=(workspace.cycles as CompensationCycle[]).find(c=>c.stage!=="EFFECTIVE");
        const existing=(active?.managerRequests||[]) as any[];
        const mine=existing.filter((request)=>String(request.manager_user_id||"")===String(secureUser?.id||"")||String(request.manager||"")===String(secureUser?.name||""));
        setProposals(Object.fromEntries(mine.map((request)=>[String(request.employee||""),{rate:Number.isFinite(Number(request.rate))?Number(request.rate):null,note:String(request.note||"")}])));
        return;
      }
      const u=getStorageData(STORAGE_KEYS.CURRENT_USER,null);
      setUser(u);
      const org=getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]),hist=getStorageData<any[]>(STORAGE_KEYS.HISTORY_360,[]),cs=getStorageData<CompensationCycle[]>(STORAGE_KEYS.COMPENSATION_CYCLES,[]);
      setOrgData(org);setHistory(hist);setCycles(cs);
      const active=cs.find(c=>c.stage!=="EFFECTIVE");
      const existing=active?.managerRequests||[];
      setProposals(Object.fromEntries(existing.filter((r:any)=>r.manager===u?.name).map((r:any)=>[r.employee,{rate:r.rate,note:r.note||""}])));
    }catch(error){
      setLoadError(error instanceof Error?error.message:"Yönetici ücret verisi yüklenemedi.");
      setOrgData([]);setHistory([]);setCycles([]);setProposals({});
    }
  };

  useEffect(()=>{
    void load();
    const refresh=()=>{void load()};
    window.addEventListener("dataUpdated",refresh);
    return()=>window.removeEventListener("dataUpdated",refresh);
  },[]);

  const role=String(user?.role||"").toUpperCase();
  const employees=useMemo(()=>{
    if(SAAS_DATA_MODE)return orgData;
    if(!user)return[];
    if(role==="CEO"||role==="IK"||role==="HR_ADMIN")return orgData;
    try{return getManageableEmployees(user,orgData)}catch{return[]}
  },[user,orgData,role]);

  const activeCycle=cycles.find(c=>c.stage!=="EFFECTIVE");
  const inputOpen=activeCycle?.stage==="MANAGER_INPUT";
  const budgetLimit=Number(activeCycle?.budgetLimit||30);
  const processed=useMemo(()=>processEmployeeData(orgData,history),[orgData,history]);
  const internalRefs=useMemo(()=>calculateMarketAverages(processed),[processed]);
  const scenarioB=useMemo(()=>runScenarioLogic(processed,internalRefs,activeCycle?.inflationRate||35,"B"),[processed,internalRefs,activeCycle]);
  const rows=employees.map(emp=>{
    const name=emp["Ad Soyad"];
    const current=Number(emp["Maaş (TL)"]||emp.Maaş||0);
    const cycleResult=(activeCycle?.results||[]).find((r:any)=>r["Ad Soyad"]===name||String(r.employee_id||"")===String(emp.id||""));
    const baseline=Number(cycleResult?.["Yeni Maaş"]||cycleResult?.new_salary||scenarioB.find(r=>r["Ad Soyad"]===name)?.["Yeni Maaş"]||current);
    return{id:String(emp.id||""),name,current,baseline,proposal:proposals[name]||{rate:null,note:""}};
  });
  const budget=useMemo(()=>{const current=rows.reduce((s,r)=>s+r.current,0);const increase=rows.reduce((s,r)=>s+(r.proposal.rate==null?0:r.current*r.proposal.rate/100),0);return{current,increase,rate:current?increase/current*100:0}},[rows]);

  const submit=async()=>{
    if(!activeCycle)return showToast("Önce Ücret Karar Merkezi'nde ücret döngüsü başlatılmalı.","error");
    if(!inputOpen)return showToast(`Yönetici girişi kapalı. Aktif aşama: ${COMPENSATION_STAGE_LABELS[activeCycle.stage]}.`,"error");
    if(budget.rate>budgetLimit)return showToast("Talep toplamı yönetici bütçe limitini aşıyor.","error");
    const selected=rows.filter(r=>r.proposal.rate!==null);
    if(!selected.length)return showToast("En az bir ücret önerisi girin.","warning");
    if(selected.some(r=>Number(r.proposal.rate)<0||Number(r.proposal.rate)>100))return showToast("Ücret önerisi %0–100 aralığında olmalıdır.","error");
    if(selected.some(r=>!String(r.proposal.note||"").trim()))return showToast("Her ücret önerisi için kısa bir gerekçe yazın.","error");
    setBusy(true);
    try{
      if(SAAS_DATA_MODE){
        if(selected.some(row=>!row.id))throw new Error("Bir veya daha fazla çalışan için SaaS kimliği bulunamadı.");
        const updated=await submitSaasCompensationManagerRequests(activeCycle.id,selected.map(row=>({employee_id:row.id,rate:Number(row.proposal.rate),note:row.proposal.note.trim(),system_baseline:row.baseline})));
        setCycles(cycles.map(c=>c.id===updated.id?updated as CompensationCycle:c));
      }else{
        const manager=user?.name||user?.username||"";
        const newRequests=selected.map(r=>({employee:r.name,manager,rate:r.proposal.rate,note:r.proposal.note,currentSalary:r.current,systemBaseline:r.baseline,submittedAt:new Date().toISOString()}));
        const retained=(activeCycle.managerRequests||[]).filter((r:any)=>r.manager!==manager);
        const next=cycles.map(c=>c.id===activeCycle.id?{...c,managerRequests:[...retained,...newRequests]}:c);
        setCycles(next);setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES,next);
      }
      window.dispatchEvent(new CustomEvent("dataUpdated"));
      showToast("Maaş talepleri aktif ücret döngüsüne kaydedildi.","success");
    }catch(error){showToast(error instanceof Error?error.message:"Maaş talepleri kaydedilemedi.","error")}finally{setBusy(false)}
  };

  if(!activeCycle)return <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800"><strong>Aktif ücret döngüsü yok.</strong><p className="mt-1">Ücret Karar Merkezi&apos;nde önce yeni ücret dönemi başlatılmalıdır.</p></div>;

  return <div className="space-y-5">
    <header className="futurehr-page-header"><p className="futurehr-page-eyebrow">Ücret döngüsü · yönetici girdisi</p><h1 className="futurehr-page-title">Yönetici Maaş Talepleri</h1><p className="futurehr-page-lede">Bu ekran çalışan ana verisindeki maaşı değiştirmez. Talepler bütçe kontrolü ve CEO onayından geçmeden yürürlüğe giremez.</p></header>
    {SAAS_DATA_MODE&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">Yönetici önerileri tenant-scoped ücret döngüsüne yazılıyor. Çalışan kapsamı, aktif aşama ve bütçe limiti backend tarafından tekrar doğrulanır.</div>}
    {loadError&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{loadError}</div>}
    {!inputOpen&&<div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/><div><strong>Yönetici girişi kapalı.</strong><p>Aktif aşama: {COMPENSATION_STAGE_LABELS[activeCycle.stage]}. Öneriler görüntülenebilir ancak bu aşamada değiştirilemez/gönderilemez.</p></div></div>}
    <div className="grid gap-3 sm:grid-cols-4"><Mini label="Mevcut aylık toplam" value={`${budget.current.toLocaleString("tr-TR")} ₺`}/><Mini label="Talep edilen artış" value={`${Math.round(budget.increase).toLocaleString("tr-TR")} ₺`}/><Mini label="Bütçe kullanımı" value={`%${budget.rate.toFixed(1)}`}/><Mini label="Yönetici limiti" value={`%${budgetLimit}`}/></div>
    <div className={`rounded-xl border p-4 text-sm ${budget.rate>budgetLimit?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{budget.rate>budgetLimit?<><AlertCircle className="mr-2 inline h-4 w-4"/>Talep toplamı tanımlı yönetici bütçe limitini aşıyor.</>:<><CheckCircle2 className="mr-2 inline h-4 w-4"/>Talepler yönetici bütçe limiti içinde.</>}</div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Çalışan</th><th className="text-right">Mevcut Maaş</th><th className="text-right">Sistem Referansı</th><th>Yönetici Talebi %</th><th>Gerekçe</th></tr></thead><tbody>{rows.length?rows.map(row=><tr key={row.id||row.name}><td>{row.name}</td><td className="text-right font-mono">{row.current.toLocaleString("tr-TR")}</td><td className="text-right font-mono">{Math.round(row.baseline).toLocaleString("tr-TR")}</td><td><input disabled={!inputOpen} type="number" min="0" max="100" step="0.5" value={row.proposal.rate??""} onChange={e=>setProposals({...proposals,[row.name]:{...row.proposal,rate:e.target.value===""?null:Number(e.target.value)}})} className="w-24 rounded-lg border border-slate-200 p-2 text-sm disabled:bg-slate-100"/></td><td><input disabled={!inputOpen} value={row.proposal.note} onChange={e=>setProposals({...proposals,[row.name]:{...row.proposal,note:e.target.value}})} placeholder="Gerekçe" className="min-w-[240px] rounded-lg border border-slate-200 p-2 text-sm disabled:bg-slate-100"/></td></tr>):<tr><td colSpan={5} className="py-8 text-center text-sm text-slate-500">Yönetilebilir çalışan bulunmuyor.</td></tr>}</tbody></table></div></div>
    <div className="flex justify-end"><button disabled={!inputOpen||budget.rate>budgetLimit||busy} onClick={()=>{void submit()}} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4"/>Talepleri ücret döngüsüne gönder</button></div>
  </div>;
}

function Mini({label,value}:{label:string;value:string}){return <div className="enterprise-card p-4"><p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>}
