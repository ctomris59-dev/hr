"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronRight, Database, PlayCircle, Settings2, ShieldCheck, Target } from "lucide-react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { ensurePerformanceCycle } from "@/lib/hr/performanceCycle";
import { createCompensationCycle } from "@/lib/hr/compensationWorkflow";

const SETUP_KEY = "futurehr_demo_setup_v1";
type Setup = { companyName: string; taxCity: string; locations: string; industry: string; completedSteps: number[]; completedAt?: string };
const DEFAULT: Setup = { companyName: "FutureHR Demo Sanayi A.Ş.", taxCity: "Tekirdağ", locations: "Çorlu, İstanbul", industry: "Üretim & Teknoloji", completedSteps: [] };
const STEPS = [
  { title: "Şirket profili", icon: Building2, desc: "Şirket adı, sektör ve lokasyonları tanımlayın." },
  { title: "Organizasyon verisi", icon: Database, desc: "Çalışan, rol ve yönetici ilişkilerini yükleyin." },
  { title: "Rol & yetkinlik", icon: Target, desc: "Kanonik roller ve hedef yetkinlik profillerini doğrulayın." },
  { title: "Dönem & ücret", icon: PlayCircle, desc: "Performans ve ücret karar döngülerini başlatın." },
  { title: "Yetki & güven", icon: ShieldCheck, desc: "Rol erişimi, KVKK kontrolleri ve demo yönetişimini gözden geçirin." },
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
    const orgReady = org.length >= 5 && org.every((p) => p["Ad Soyad"] && p.Departman && p.Pozisyon);
    const managers = org.filter((p) => p["Yönetici 1"]).length;
    return { orgReady, managerCoverage: org.length ? Math.round((managers / org.length) * 100) : 0, benchmarkCount: benchmarks.length };
  }, [org, benchmarks]);

  const initCycles = () => {
    ensurePerformanceCycle();
    const cycles = getStorageData<any[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []);
    if (!cycles.length) setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES, [createCompensationCycle(`${new Date().getFullYear()} Ücret Dönemi`)]);
    window.dispatchEvent(new CustomEvent("dataUpdated")); mark(3);
  };
  const finish = () => save({ ...setup, completedSteps: [0,1,2,3,4], completedAt: new Date().toISOString() });
  const progress = Math.round((setup.completedSteps.length / STEPS.length) * 100);

  return <div className="space-y-5 pb-8">
    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-indigo-600">Müşteri kurulum sihirbazı</p><h1 className="mt-1 text-2xl font-semibold">FutureHR V1 Kurulum</h1><p className="mt-1 max-w-4xl text-sm text-slate-500">Demo ortamında gerçek pilot kurulum sırasını simüle eder: şirket → organizasyon → rol/yetkinlik → dönemler → yetki/güven.</p></div><div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-[9px] font-bold uppercase text-slate-400">Kurulum hazırlığı</p><p className="mt-1 text-lg font-semibold text-indigo-600">%{progress}</p></div></header>

    <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="space-y-1">{STEPS.map((step,index)=>{const Icon=step.icon;const done=setup.completedSteps.includes(index);return <button key={step.title} onClick={()=>setActive(index)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left ${active===index?"bg-indigo-50 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200":"hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${done?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{done?<CheckCircle2 className="h-4 w-4"/>:<Icon className="h-4 w-4"/>}</span><span><b className="block text-xs">{index+1}. {step.title}</b><span className="mt-1 block text-[10px] leading-4 text-slate-400">{step.desc}</span></span></button>})}</div></aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {active===0&&<div><StepTitle title="Şirket profilini tanımlayın" text="Bu bilgiler demo şirket bağlamını ve Türkiye odaklı organizasyon alanlarını temsil eder."/><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="Şirket adı" value={setup.companyName} onChange={(v)=>save({...setup,companyName:v})}/><Input label="Sektör" value={setup.industry} onChange={(v)=>save({...setup,industry:v})}/><Input label="Merkez il" value={setup.taxCity} onChange={(v)=>save({...setup,taxCity:v})}/><Input label="Lokasyonlar" value={setup.locations} onChange={(v)=>save({...setup,locations:v})}/></div><Next onClick={()=>mark(0)}/></div>}
        {active===1&&<div><StepTitle title="Organizasyon verisini doğrulayın" text="Çalışan ana verisi bütün FutureHR karar zincirinin temelidir."/><div className="mt-4 grid gap-3 sm:grid-cols-3"><Kpi label="Çalışan" value={org.length}/><Kpi label="Yönetici bağı" value={`%${readiness.managerCoverage}`}/><Kpi label="Durum" value={readiness.orgReady?"Hazır":"Eksik"}/></div><div className="mt-4 flex flex-wrap gap-2"><Link href="/organizasyon" className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Organizasyonu aç</Link>{readiness.orgReady&&<button onClick={()=>mark(1)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Kontrol edildi</button>}</div></div>}
        {active===2&&<div><StepTitle title="Rol & yetkinlik mimarisini gözden geçirin" text="Pozisyonların kanonik rol, seviye ve hedef yetkinlik profiline bağlanması kariyer ve yetenek kararlarında tutarlılık sağlar."/><div className="mt-4 rounded-xl bg-indigo-50 p-4 text-xs leading-5 text-indigo-800 dark:bg-indigo-950/25 dark:text-indigo-200">FutureHR V1 demo, 10 ortak yetkinliği ve rol seviyesine göre hedef profilleri kullanır. Eksik pozisyonlar fallback profil ile işaretlenir; veri varmış gibi uydurulmaz.</div><div className="mt-4 flex gap-2"><Link href="/rol-mimarisi" className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Rol mimarisini aç</Link><button onClick={()=>mark(2)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Doğruladım</button></div></div>}
        {active===3&&<div><StepTitle title="Performans ve ücret dönemlerini başlatın" text="Dönemler kararların hangi zaman penceresine ait olduğunu görünür kılar ve kilitleme disiplinini destekler."/><div className="mt-4 grid gap-3 sm:grid-cols-2"><Kpi label="Ücret benchmarkı" value={readiness.benchmarkCount}/><Kpi label="Dönem başlangıcı" value={String(new Date().getFullYear())}/></div><button onClick={initCycles} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-indigo-600"><PlayCircle className="h-4 w-4"/>Demo dönemlerini hazırla</button></div>}
        {active===4&&<div><StepTitle title="Yetki, KVKK ve demo güven kontrollerini tamamlayın" text="Üretim ortamında server-side yetki ve tenant izolasyonu gerekir; demo ortamı rol/kapsam davranışını ve AI guardrail'lerini görünür kılar."/><div className="mt-4 grid gap-2 sm:grid-cols-2"><Link href="/ayarlar/yetki-mimarisi" className="rounded-xl border border-slate-200 p-3 text-xs font-semibold hover:border-indigo-300">Yetki Mimarisini aç →</Link><Link href="/admin/guven-kvkk" className="rounded-xl border border-slate-200 p-3 text-xs font-semibold hover:border-indigo-300">Güven & KVKK'yı aç →</Link></div><button onClick={finish} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"><CheckCircle2 className="h-4 w-4"/>Kurulumu tamamla</button>{setup.completedAt&&<p className="mt-3 text-xs font-semibold text-emerald-600">✓ Demo pilot kurulumu hazır.</p>}</div>}
      </section>
    </div>
  </div>;
}
function StepTitle({title,text}:{title:string;text:string}){return <div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Kurulum adımı</p><h2 className="mt-1 text-lg font-semibold">{title}</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{text}</p></div>}
function Input({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label><span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">{label}</span><input value={value} onChange={(e)=>onChange(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"/></label>}
function Kpi({label,value}:{label:string;value:string|number}){return <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50"><p className="text-[9px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>}
function Next({onClick}:{onClick:()=>void}){return <button onClick={onClick} className="mt-4 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Kaydet ve ilerle<ChevronRight className="h-4 w-4"/></button>}
