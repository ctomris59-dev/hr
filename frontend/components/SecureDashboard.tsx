"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, RefreshCw, Target, Users } from "lucide-react";

interface DashboardTask { key:string; title:string; description:string; href:string; count:number; }
interface DashboardAction { title:string; href:string; }
interface DashboardSummary {
  success:boolean; source:string; tenant_scoped:boolean; generated_at:string; scope:string; role:string;
  tenant:{id:string;name:string}; profile:{employee_id:string;name:string;department?:string|null;position?:string|null}|null;
  employee_count:number; attention_count:number; counts:Record<string,number>; tasks:DashboardTask[]; quick_actions:DashboardAction[];
}

const ICONS:Record<string,typeof Users>={leave:CalendarDays,performance:Target,development:Clock3,training:CheckCircle2};
const scopeLabel=(scope:string)=>scope==="COMPANY"?"Tüm şirket":scope==="DEPARTMENT"?"Departman":scope==="DIRECT_REPORTS"?"Ekibim":scope==="SELF"?"Kendi alanım":"Yetkili alan";

export default function SecureDashboard(){
  const[data,setData]=useState<DashboardSummary|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/dashboard/summary",{cache:"no-store",credentials:"include"});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||!payload?.success)throw new Error(payload?.error||"Özet yüklenemedi.");
      setData(payload);
    }catch(err){setError(err instanceof Error?err.message:"Özet yüklenemedi.");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  if(loading)return <main className="fh-page" aria-busy="true"><div className="h-40 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"/><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map(item=><div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800"/>)}</div></main>;
  if(error||!data)return <main className="fh-page"><section className="fh-card p-6 text-center"><p className="text-sm font-semibold text-slate-900 dark:text-white">Yönetici özeti şu anda alınamadı.</p><p className="mt-2 text-xs text-slate-500">{error}</p><button type="button" onClick={()=>void load()} className="fh-button fh-button-primary mt-4"><RefreshCw className="h-4 w-4"/>Tekrar dene</button></section></main>;

  const firstName=(data.profile?.name||"").trim().split(/\s+/)[0];
  return <main className="fh-page" data-testid="secure-dashboard">
    <section className="fh-card overflow-hidden p-5 sm:p-7">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
        <div>
          <p className="fh-kicker">People Intelligence</p>
          <h1 className="fh-title mt-2">{firstName?`Merhaba ${firstName}`:"Yönetici Özeti"}</h1>
          <p className="fh-body mt-2 max-w-2xl">{data.attention_count>0?`Yetki alanınızda bugün ilgilenmeniz gereken ${data.attention_count} açık işlem var.`:"Bugün bekleyen kritik bir işlem görünmüyor. Hızlı işlemlerden yeni bir çalışma başlatabilirsiniz."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="fh-chip"><Users className="h-3.5 w-3.5"/>{data.employee_count} çalışan</span>
            <span className="fh-chip"><Clock3 className="h-3.5 w-3.5"/>{data.attention_count} açık iş</span>
            <span className="fh-chip"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/>{scopeLabel(data.scope)}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/30">
          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">Canlı veri kaynağı</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{data.tenant.name}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Bu özet sunucuda, oturumunuzun şirket ve rol kapsamına göre hesaplandı.</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3"/>Tenant kapsamlı</span>
        </div>
      </div>
    </section>

    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="fh-kicker">ÖNCELİKLER</p><h2 className="fh-section-title mt-1">Bekleyen işler</h2></div><span className="text-[10px] text-slate-400">Sunucu özeti</span></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.tasks.map(task=>{const Icon=ICONS[task.key]||Clock3;return <Link key={task.key} href={task.href} className="fh-card group p-4 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon className="h-4.5 w-4.5"/></span><strong className={`text-2xl font-semibold ${task.count?"text-slate-950 dark:text-white":"text-emerald-600"}`}>{task.count}</strong></div><h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{task.title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{task.description}</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600">Aç <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5"/></span></Link>})}
      </div>
    </section>

    <section>
      <p className="fh-kicker">HIZLI İŞLEMLER</p><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{data.quick_actions.map(action=><Link key={action.href} href={action.href} className="fh-button fh-button-secondary justify-between">{action.title}<ArrowRight className="h-3.5 w-3.5"/></Link>)}</div>
    </section>
  </main>;
}
