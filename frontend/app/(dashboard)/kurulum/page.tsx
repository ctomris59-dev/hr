"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, Database, PlayCircle, ShieldCheck } from "lucide-react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { ensurePerformanceCycle } from "@/lib/hr/performanceCycle";
import { createCompensationCycle } from "@/lib/hr/compensationWorkflow";

const SETUP_KEY = "futurehr_demo_setup_v2";
type Setup = { companyName: string; taxCity: string; locations: string; industry: string; completedSteps: number[]; completedAt?: string };
const DEFAULT: Setup = { companyName: "FutureHR Demo Sanayi A.Ş.", taxCity: "Tekirdağ", locations: "Çorlu, İstanbul", industry: "Üretim & Teknoloji", completedSteps: [] };
const STEPS = [
  { title: "Şirket bilgileri", icon: Building2, desc: "Şirket adı ve temel bilgileri" },
  { title: "Çalışanlar", icon: Database, desc: "Çalışan ve yönetici bilgileri" },
  { title: "Dönemler", icon: PlayCircle, desc: "Performans ve ücret dönemleri" },
  { title: "Yetkiler & gizlilik", icon: ShieldCheck, desc: "Kullanıcı erişimleri ve KVKK" },
] as const;

export default function KurulumPage() {
  const [setup, setSetup] = useState<Setup>(DEFAULT);
  const [active, setActive] = useState(0);
  const [org, setOrg] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);

  useEffect(() => {
    try { const parsed = JSON.parse(localStorage.getItem(SETUP_KEY) || "null"); if (parsed) setSetup({ ...DEFAULT, ...parsed }); } catch {}
    const reload = () => { setOrg(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, [])); setBenchmarks(getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS, [])); };
    reload(); window.addEventListener("dataUpdated", reload); return () => window.removeEventListener("dataUpdated", reload);
  }, []);

  const save = (next: Setup) => { setSetup(next); localStorage.setItem(SETUP_KEY, JSON.stringify(next)); window.dispatchEvent(new CustomEvent("setupUpdated")); };
  const mark = (index: number) => { if (!setup.completedSteps.includes(index)) save({ ...setup, completedSteps: [...setup.completedSteps, index] }); setActive(Math.min(index + 1, STEPS.length - 1)); };
  const readiness = useMemo(() => {
    const orgReady = org.length >= 1 && org.every((p) => p["Ad Soyad"] && p.Departman && p.Pozisyon);
    const managers = org.filter((p) => p["Yönetici 1"]).length;
    return { orgReady, managerCoverage: org.length ? Math.round((managers / org.length) * 100) : 0, benchmarkCount: benchmarks.length };
  }, [org, benchmarks]);

  const initCycles = () => {
    ensurePerformanceCycle();
    const cycles = getStorageData<any[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []);
    if (!cycles.length) setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES, [createCompensationCycle(`${new Date().getFullYear()} Ücret Dönemi`)]);
    window.dispatchEvent(new CustomEvent("dataUpdated")); mark(2);
  };
  const finish = () => save({ ...setup, completedSteps: [0,1,2,3], completedAt: new Date().toISOString() });
  const progress = Math.round((setup.completedSteps.length / STEPS.length) * 100);

  return <div className="mx-auto max-w-6xl space-y-5 pb-8">
    <header className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-indigo-600">İlk Kurulum</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">FutureHR'ı kullanıma hazırlayın</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Dört temel adımı tamamlayın. İleri seviye ayarlar daha sonra Sistem Yönetimi bölümünden değiştirilebilir.</p></div><div className="min-w-40 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/40"><div className="flex items-center justify-between text-[10px] font-semibold text-slate-500"><span>İlerleme</span><span>%{progress}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{width:`${progress}%`}}/></div></div></div></header>

    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Kurulum adımları"><div className="space-y-1">{STEPS.map((step,index)=>{const Icon=step.icon;const done=setup.completedSteps.includes(index);return <button key={step.title} type="button" onClick={()=>setActive(index)} aria-current={active===index?"step":undefined} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${active===index?"bg-indigo-50 text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100":"hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done?"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300":"bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{done?<CheckCircle2 className="h-4 w-4"/>:<Icon className="h-4 w-4"/>}</span><span className="min-w-0"><b className="block text-xs">{index+1}. {step.title}</b><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{step.desc}</span></span></button>})}</div></aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        {active===0&&<div><StepTitle step="1 / 4" title="Şirket bilgilerini kontrol edin" text="Bu bilgiler rapor ve şirket bağlamında kullanılır. Daha sonra değiştirebilirsiniz."/><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input label="Şirket adı" value={setup.companyName} onChange={(v)=>save({...setup,companyName:v})}/><Input label="Sektör" value={setup.industry} onChange={(v)=>save({...setup,industry:v})}/><Input label="Merkez il" value={setup.taxCity} onChange={(v)=>save({...setup,taxCity:v})}/><Input label="Lokasyonlar" value={setup.locations} onChange={(v)=>save({...setup,locations:v})}/></div><Nav nextLabel="Kaydet ve devam et" onNext={()=>mark(0)}/></div>}
        {active===1&&<div><StepTitle step="2 / 4" title="Çalışanları ekleyin" text="En az bir çalışan ekleyin. Departman, pozisyon ve yönetici bilgileri diğer modüllerin doğru çalışması için önemlidir."/><div className="mt-5 grid gap-3 sm:grid-cols-3"><Kpi label="Çalışan" value={org.length}/><Kpi label="Yönetici bilgisi" value={org.length?`%${readiness.managerCoverage}`:"—"}/><Kpi label="Durum" value={readiness.orgReady?"Hazır":"Çalışan ekleyin"}/></div><div className="mt-5 flex flex-wrap gap-2"><Link href="/admin/veri-aktarimi" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white">Excel / CSV ile çalışan ekle</Link><Link href="/organizasyon" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold dark:border-slate-700">Çalışanlar ekranını aç</Link></div><Nav onBack={()=>setActive(0)} nextLabel="Kontrol ettim, devam et" onNext={()=>mark(1)} nextDisabled={!org.length}/></div>}
        {active===2&&<div><StepTitle step="3 / 4" title="İlk dönemleri hazırlayın" text="Performans ve ücret süreçlerinin hangi döneme ait olduğunu sistem bu adımla takip eder."/><div className="mt-5 grid gap-3 sm:grid-cols-2"><Kpi label="Yıl" value={String(new Date().getFullYear())}/><Kpi label="Piyasa ücret verisi" value={readiness.benchmarkCount?`${readiness.benchmarkCount} kayıt`:"Daha sonra eklenebilir"}/></div><button type="button" onClick={initCycles} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white"><PlayCircle className="h-4 w-4"/>Dönemleri hazırla ve devam et</button><Nav onBack={()=>setActive(1)}/></div>}
        {active===3&&<div><StepTitle step="4 / 4" title="Yetkileri ve gizliliği kontrol edin" text="Kullanıcıların yalnız ihtiyaç duydukları alanları gördüğünden emin olun. Gelişmiş ayarları daha sonra değiştirebilirsiniz."/><div className="mt-5 grid gap-3 sm:grid-cols-2"><Link href="/admin" className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold hover:border-indigo-300 dark:border-slate-700">Kullanıcılar & Yetkiler <span className="text-indigo-600">→</span><small className="mt-1 block text-[10px] font-normal leading-4 text-slate-500">Kullanıcı hesaplarını ve temel rollerini yönetin.</small></Link><Link href="/admin/guven-kvkk" className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold hover:border-indigo-300 dark:border-slate-700">Gizlilik & KVKK <span className="text-indigo-600">→</span><small className="mt-1 block text-[10px] font-normal leading-4 text-slate-500">Veri gizliliği ve saklama kontrollerini görün.</small></Link></div><div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={finish} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white"><CheckCircle2 className="h-4 w-4"/>Kurulumu tamamla</button><button type="button" onClick={()=>setActive(2)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><ChevronLeft className="h-4 w-4"/>Geri</button></div>{setup.completedAt&&<div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">✓ Temel kurulum tamamlandı. Ana sayfadan günlük işlemlere başlayabilirsiniz.</div>}</div>}
      </section>
    </div>
  </div>;
}
function StepTitle({step,title,text}:{step:string;title:string;text:string}){return <div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-indigo-600">Adım {step}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">{text}</p></div>}
function Input({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label><span className="mb-1.5 block text-[10px] font-semibold text-slate-600 dark:text-slate-300">{label}</span><input value={value} onChange={(e)=>onChange(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-950"/></label>}
function Kpi({label,value}:{label:string;value:string|number}){return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50"><p className="text-[10px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>}
function Nav({onBack,onNext,nextLabel="Devam et",nextDisabled=false}:{onBack?:()=>void;onNext?:()=>void;nextLabel?:string;nextDisabled?:boolean}){if(!onBack&&!onNext)return null;return <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">{onBack?<button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><ChevronLeft className="h-4 w-4"/>Geri</button>:<span/>}{onNext&&<button type="button" disabled={nextDisabled} onClick={onNext} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{nextLabel}<ChevronRight className="h-4 w-4"/></button>}</div>}
