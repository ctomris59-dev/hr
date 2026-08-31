"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Building2, CalendarDays, Clock3, MoreHorizontal, Search, UserRound, Users, X } from "lucide-react";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { fetchSaasTeamWorkspace, SAAS_DATA_MODE } from "../../../lib/hr/saasWorkforceClient";

export default function EkipYonetimiPage(){
  const[user,setUser]=useState<any>(null);
  const[orgData,setOrgData]=useState<any[]>([]);
  const[leaveRequests,setLeaveRequests]=useState<any[]>([]);
  const[history,setHistory]=useState<any[]>([]);
  const[plans,setPlans]=useState<any[]>([]);
  const[search,setSearch]=useState("");
  const[selectedEmployee,setSelectedEmployee]=useState<any|null>(null);
  const[loading,setLoading]=useState(true);
  const[loadError,setLoadError]=useState("");

  const reload=async()=>{
    setLoading(true);
    setLoadError("");
    try{
      if(SAAS_DATA_MODE){
        const workspace=await fetchSaasTeamWorkspace();
        setUser({role:"SAAS"});
        setOrgData(workspace.employees);
        setHistory(workspace.evaluations);
        setLeaveRequests(workspace.leaveRequests);
        setPlans(workspace.plans);
        return;
      }
      setUser(getStorageData(STORAGE_KEYS.CURRENT_USER,null));
      setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]));
      setLeaveRequests(getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS,[]));
      setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360,[]));
      setPlans(getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS,[]));
    }catch(error){
      setLoadError(error instanceof Error?error.message:"Ekip verisi yüklenemedi.");
      setOrgData([]);setHistory([]);setLeaveRequests([]);setPlans([]);
    }finally{setLoading(false)}
  };

  useEffect(()=>{
    void reload();
    const h=()=>{void reload()};
    window.addEventListener("dataUpdated",h);
    return()=>window.removeEventListener("dataUpdated",h);
  },[]);

  useEffect(()=>{
    if(!selectedEmployee)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setSelectedEmployee(null)};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[selectedEmployee]);

  const role=String(user?.role||"").toUpperCase();
  const team=useMemo(()=>{
    if(SAAS_DATA_MODE)return orgData;
    if(!user)return[];
    if(role==="CEO"||role==="IK")return orgData;
    try{return getManageableEmployees(user,orgData)}catch{return[]}
  },[user,orgData,role]);

  const filtered=team.filter(e=>{
    const q=search.trim().toLocaleLowerCase("tr-TR");
    return !q||[e["Ad Soyad"],e.Pozisyon,e.Departman].some(v=>String(v||"").toLocaleLowerCase("tr-TR").includes(q));
  });

  const pendingLeave=leaveRequests.filter(r=>r.status==="Bekliyor"&&team.some(e=>e["Ad Soyad"]===r.employee)).length;
  const activePlans=plans.filter(p=>p.status!=="Tamamlandı"&&team.some(e=>e["Ad Soyad"]===p.employee)).length;

  return <>
    <div className="space-y-5">
      <header className="futurehr-page-header">
        <p className="futurehr-page-eyebrow">Ekip operasyonları</p>
        <h1 className="futurehr-page-title">Ekip</h1>
        <p className="futurehr-page-lede">Bağlı çalışanları ve günlük ekip aksiyonlarını yönetin. Çalışan ana verisi Çalışanlar & Organizasyon&apos;da; kullanıcı hesabı ve yetkiler Kullanıcı & Yetki&apos;de yönetilir.</p>
      </header>

      {SAAS_DATA_MODE&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">Ekip, performans, izin ve gelişim verileri tenant-scoped SaaS API&apos;lerden okunuyor. Bu görünüm production modunda browser storage&apos;ı veri otoritesi olarak kullanmıyor.</div>}
      {loadError&&<div className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:flex-row sm:items-center sm:justify-between"><span>{loadError}</span><button type="button" onClick={()=>void reload()} className="h-8 shrink-0 rounded-lg border border-rose-200 bg-white px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-100">Tekrar dene</button></div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Yönetilen çalışan" value={loading?"…":team.length} icon={Users}/>
        <Metric label="Bekleyen izin" value={loading?"…":pendingLeave} icon={CalendarDays}/>
        <Metric label="Aktif gelişim aksiyonu" value={loading?"…":activePlans} icon={Clock3}/>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true"/>
        <span className="sr-only">Ekipte ara</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ekipte ara" className="h-11 flex-1 bg-transparent text-sm outline-none"/>
        {search&&<button type="button" onClick={()=>setSearch("")} className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100" aria-label="Ekip aramasını temizle">Temizle</button>}
      </label>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(employee=>{
          const name=employee["Ad Soyad"];
          const lastEval=latestEvaluation(history,name);
          const employeePlans=plans.filter(p=>p.employee===name&&p.status!=="Tamamlandı").length;
          const leave=leaveRequests.filter(r=>r.employee===name&&r.status==="Bekliyor").length;
          const q=`?employeeName=${encodeURIComponent(name)}`;
          return <article key={employee.id??name} className="enterprise-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{name}</h2>
                <p className="mt-1 text-xs text-slate-500">{employee.Pozisyon}</p>
                <p className="mt-1 text-[11px] text-slate-400">{employee.Departman}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{initials(name)}</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Mini label="Son perf." value={performanceValue(lastEval)}/>
              <Mini label="Gelişim" value={String(employeePlans)}/>
              <Mini label="İzin talebi" value={String(leave)}/>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <button type="button" onClick={()=>setSelectedEmployee(employee)} aria-haspopup="dialog" className="text-[11px] font-semibold text-[#2f6664] hover:underline">Çalışanı görüntüle →</button>
              <details className="relative">
                <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label={`${name} aksiyonları`}><MoreHorizontal className="h-4 w-4"/></summary>
                <div className="absolute bottom-10 right-0 z-20 min-w-[160px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <Link href={`/degerlendirme${q}`} className="block px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Değerlendir</Link>
                  <Link href={`/gelisim${q}`} className="block px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Gelişim planı</Link>
                  <Link href="/izinler" className="block px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">İzinler</Link>
                </div>
              </details>
            </div>
          </article>;
        })}
      </div>

      {!loading&&!filtered.length&&<div className="enterprise-card p-10 text-center"><Users className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{search.trim()?"Aramanızla eşleşen çalışan bulunamadı.":"Yönetilebilir çalışan bulunmuyor."}</p><p className="mt-1 text-xs text-slate-500">{search.trim()?"İsim, pozisyon veya departman aramasını değiştirin.":"Organizasyon yönetici bağlarını kontrol edin."}</p>{search.trim()&&<button type="button" onClick={()=>setSearch("")} className="mt-4 h-9 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Aramayı temizle</button>}</div>}
    </div>

    {selectedEmployee&&<EmployeeDrawer employee={selectedEmployee} history={history} plans={plans} leaveRequests={leaveRequests} onClose={()=>setSelectedEmployee(null)}/>} 
  </>;
}

function EmployeeDrawer({employee,history,plans,leaveRequests,onClose}:{employee:any;history:any[];plans:any[];leaveRequests:any[];onClose:()=>void}){
  const name=employee["Ad Soyad"]||"Çalışan";
  const lastEval=latestEvaluation(history,name);
  const employeePlans=plans.filter(p=>p.employee===name&&p.status!=="Tamamlandı");
  const pendingLeaves=leaveRequests.filter(r=>r.employee===name&&r.status==="Bekliyor");
  const q=`?employeeName=${encodeURIComponent(name)}`;
  const manager1=employee["Yönetici 1"]||employee["1. Yönetici"]||employee["1.Yönetici"]||employee.Yonetici||employee.Yönetici||"—";
  const manager2=employee["Yönetici 2"]||employee["2. Yönetici"]||employee["2.Yönetici"]||"—";
  const personnelCode=employee["Personel Kodu"]||employee.PersonelKodu||employee.id||"—";
  const tenure=employee.Kidem??employee.Kıdem??employee["Kıdem"]??employee["Kıdem (Yıl)"]??employee["Kıdem Yılı"];

  return <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label={`${name} çalışan detayı`}>
    <button type="button" className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} aria-label="Çalışan detayını kapat"/>
    <aside className="relative flex h-full w-full max-w-[480px] flex-col border-l border-slate-200 bg-[#fbfbf8] shadow-2xl dark:border-slate-800 dark:bg-[#141b22]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{initials(name)}</div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-950 dark:text-white">{name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{employee.Pozisyon||"Pozisyon bilgisi yok"}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">{employee.Departman||"Departman bilgisi yok"}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900" aria-label="Kapat"><X className="h-4 w-4"/></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <section>
          <p className="enterprise-eyebrow">Çalışan özeti</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <DetailMetric label="Son performans" value={performanceValue(lastEval)}/>
            <DetailMetric label="Aktif gelişim" value={String(employeePlans.length)}/>
            <DetailMetric label="Bekleyen izin" value={String(pendingLeaves.length)}/>
          </div>
        </section>

        <section className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <p className="enterprise-eyebrow">Organizasyon bilgisi</p>
          <div className="mt-3 space-y-1">
            <ProfileRow icon={BriefcaseBusiness} label="Pozisyon" value={employee.Pozisyon||"—"}/>
            <ProfileRow icon={Building2} label="Departman" value={employee.Departman||"—"}/>
            <ProfileRow icon={UserRound} label="1. Yönetici" value={String(manager1)}/>
            <ProfileRow icon={UserRound} label="2. Yönetici" value={String(manager2)}/>
            <ProfileRow icon={UserRound} label="Personel kodu" value={String(personnelCode)}/>
            <ProfileRow icon={Clock3} label="Kıdem" value={tenure!==undefined&&tenure!==null&&tenure!==""?`${tenure}${String(tenure).includes("yıl")?"":" yıl"}`:"—"}/>
          </div>
        </section>

        <section className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <p className="enterprise-eyebrow">Gelişim durumu</p>
            <span className="text-[11px] font-medium text-slate-400">{employeePlans.length} aktif aksiyon</span>
          </div>
          {employeePlans.length?<div className="mt-3 space-y-2">{employeePlans.slice(0,4).map((plan,index)=><div key={plan.id??`${plan.title}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{plan.title||plan.action||plan.name||"Gelişim aksiyonu"}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-400"><span>{plan.status||"Aktif"}</span>{(plan.targetDate||plan.dueDate)&&<span>Hedef: {plan.targetDate||plan.dueDate}</span>}</div></div>)}</div>:<p className="mt-3 text-xs leading-5 text-slate-500">Bu çalışan için aktif gelişim aksiyonu bulunmuyor.</p>}
        </section>
      </div>

      <div className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/degerlendirme${q}`} onClick={onClose} className="flex h-10 items-center justify-center rounded-lg bg-[#2f6664] px-3 text-xs font-semibold text-white hover:bg-[#255452]">Değerlendir</Link>
          <Link href={`/gelisim${q}`} onClick={onClose} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Gelişim planı</Link>
        </div>
      </div>
    </aside>
  </div>;
}

function latestEvaluation(history:any[],name:string){
  return history.filter(h=>(h.Personel||h.target||h["Ad Soyad"])===name).sort((a,b)=>String(b.date||b.createdAt||b.Tarih||"").localeCompare(String(a.date||a.createdAt||a.Tarih||"")))[0];
}
function performanceValue(record:any){
  const raw=record?.Performans??record?.performance??record?.finalScore??record?.score;
  const value=Number(raw);
  return Number.isFinite(value)&&value>0?value.toFixed(1):"—";
}
function initials(name:string){return String(name||"FH").split(" ").filter(Boolean).slice(0,2).map((p:string)=>p[0]?.toUpperCase()).join("")}
function Metric({label,value,icon:Icon}:{label:string;value:string|number;icon:any}){return <div className="enterprise-card p-4"><div className="flex justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className="h-4 w-4 text-slate-500"/></div><p className="mt-3 text-2xl font-semibold">{value}</p></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70"><p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>}
function DetailMetric({label,value}:{label:string;value:string}){return <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-[9.5px] font-semibold uppercase tracking-[.07em] text-slate-400">{label}</p><p className="mt-1.5 text-lg font-semibold text-slate-950 dark:text-white">{value}</p></div>}
function ProfileRow({icon:Icon,label,value}:{icon:any;label:string;value:string}){return <div className="grid grid-cols-[28px_112px_minmax(0,1fr)] items-center gap-2 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800"><Icon className="h-3.5 w-3.5"/></span><span className="text-[11px] text-slate-400">{label}</span><span className="truncate text-right text-xs font-medium text-slate-700 dark:text-slate-200">{value}</span></div>}
