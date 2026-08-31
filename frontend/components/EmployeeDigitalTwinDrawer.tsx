"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, BrainCircuit, BriefcaseBusiness, CheckCircle2, CircleGauge, DollarSign, GraduationCap, Network, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import {
  fetchDigitalTwin,
  recordHumanReview,
  type DigitalTwin,
  type HumanReview,
} from "@/lib/hr/decisionIntelligenceClient";

const SKILL_LABELS:Record<string,string>={
  ANA:"Analitik Düşünme",COM:"İletişim",LRN:"Sürekli Öğrenme",RES:"Sonuç Odaklılık",DET:"Detaylara Özen",DIG:"Dijital Okuryazarlık",ETH:"Etik & Uyum",TEA:"Takım Çalışması",STR:"Dayanıklılık / Stratejik Bakış",DIS:"Öz Disiplin",
};

export default function EmployeeDigitalTwinDrawer({employeeId,fallbackName,onClose}:{employeeId:string;fallbackName:string;onClose:()=>void}){
  const[twin,setTwin]=useState<DigitalTwin|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[saving,setSaving]=useState(false);

  const reload=async()=>{
    setError("");
    try{setTwin(await fetchDigitalTwin(employeeId));}
    catch(err){setError(err instanceof Error?err.message:"Çalışan karar profili yüklenemedi.");}
    finally{setLoading(false);}
  };

  useEffect(()=>{void reload();},[employeeId]);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[onClose]);

  const name=twin?.employee.full_name||fallbackName;
  const skills=useMemo(()=>Object.entries(twin?.skills||{}).sort((a,b)=>b[1]-a[1]),[twin?.skills]);
  const review=async(status:HumanReview["status"])=>{
    if(!twin||saving)return;
    setSaving(true);setError("");
    try{await recordHumanReview(employeeId,{decision_type:"employee_decision_profile",status});await reload();}
    catch(err){setError(err instanceof Error?err.message:"İnsan incelemesi kaydedilemedi.");}
    finally{setSaving(false);}
  };

  return <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-label={`${name} Digital Twin`}>
    <button type="button" className="absolute inset-0 bg-slate-950/32 backdrop-blur-[1px]" onClick={onClose} aria-label="Digital Twin'i kapat"/>
    <aside className="relative flex h-full w-full max-w-[620px] flex-col border-l border-slate-200 bg-[#f8f8f5] shadow-2xl dark:border-slate-800 dark:bg-[#0f151b]">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-[#141b22]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{initials(name)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-base font-semibold text-slate-950 dark:text-white">{name}</p><span className="rounded-md border border-[#bdd2d0] bg-[#edf4f2] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.06em] text-[#2f6664]">Digital Twin</span></div>
            <p className="mt-1 truncate text-xs text-slate-500">{twin?.employee.position||"Çalışan profili"} · {twin?.employee.department||"Departman bilgisi yok"}</p>
            <p className="mt-1 text-[10.5px] text-slate-400">Canlı tenant verisi · {twin?.employee.source==="recruitment"?"İşe alımdan çalışan yaşam döngüsüne bağlı":"Çalışan ana verisi"}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Kapat"><X className="h-4 w-4"/></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading&&<div className="enterprise-card flex min-h-[220px] items-center justify-center text-sm text-slate-500">Karar profili oluşturuluyor…</div>}
        {error&&<div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><AlertTriangle className="mr-2 inline h-4 w-4"/>{error}</div>}
        {twin&&<div className="space-y-5">
          <section className="enterprise-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div><p className="enterprise-eyebrow">Karar Profili</p><h2 className="mt-1.5 text-[15px] font-semibold text-slate-950 dark:text-white">{twin.decision.title}</h2><p className="mt-1.5 text-xs leading-5 text-slate-500">{twin.decision.next_step}</p></div>
              <EvidenceGauge score={twin.evidence.score}/>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <TwinMetric icon={BarChart3} label="Performans" value={num(twin.performance.score)}/>
              <TwinMetric icon={GraduationCap} label="Aktif gelişim" value={String(twin.development.active_count)}/>
              <TwinMetric icon={DollarSign} label="Compa-ratio" value={twin.compensation.compa_ratio!=null?twin.compensation.compa_ratio.toFixed(2):"—"}/>
            </div>
          </section>

          <section className="enterprise-card overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-[#2f6664]"/><div><p className="text-xs font-semibold">Explainable AI · Kanıt Zinciri</p><p className="mt-0.5 text-[10.5px] text-slate-400">Öneri → dayanak → güven → eksik veri → risk → insan onayı</p></div></div></div>
            <div className="divide-y divide-slate-100 px-4 dark:divide-slate-800">
              <ChainRow n="01" label="Öneri" value={twin.decision.title}/>
              <ChainRow n="02" label="Dayanak" value={`Performans ${num(twin.performance.score)} · ${Object.keys(twin.skills).length} yetkinlik sinyali · ${twin.development.active_count} gelişim aksiyonu`}/>
              <ChainRow n="03" label="Kanıt güveni" value={`${twin.evidence.score}/100 · ${twin.evidence.band}`}/>
              <ChainRow n="04" label="Eksik veri" value={twin.evidence.missing.length?twin.evidence.missing.join(" · "):"Kritik veri açığı yok"}/>
              <ChainRow n="05" label="Risk" value={twin.decision.risks.length?twin.decision.risks.join(" · "):"Belirgin karar riski saptanmadı"}/>
              <ChainRow n="06" label="İnsan onayı" value={reviewLabel(twin.human_reviews.at(-1))}/>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Yetkinlik sinyalleri</p><Network className="h-4 w-4 text-slate-400"/></div>{skills.length?<div className="mt-3 space-y-2">{skills.slice(0,6).map(([code,score])=><SkillRow key={code} label={SKILL_LABELS[code]||code} score={score}/>)}</div>:<p className="mt-3 text-xs leading-5 text-slate-500">Henüz doğrulanmış yetkinlik sinyali bulunmuyor.</p>}</div>
            <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Ücret konumu</p><CircleGauge className="h-4 w-4 text-slate-400"/></div><div className="mt-3 space-y-2 text-xs"><InfoRow label="Piyasa farkı" value={pct(twin.compensation.market_gap_pct)}/><InfoRow label="İç emsal konumu" value={pct(twin.compensation.peer_position_pct)}/><InfoRow label="Sıkışma riski" value={twin.compensation.compression_risk?"İncele":"Yok"}/><InfoRow label="Benchmark" value={twin.compensation.market_benchmark_available?"Mevcut":"Eksik"}/></div></div>
          </section>

          {twin.development.items.length>0&&<section className="enterprise-card p-4"><p className="text-xs font-semibold">Aktif gelişim döngüsü</p><div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{twin.development.items.slice(0,4).map(item=><div key={item.id} className="py-2.5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium">{item.goal}</p><span className="text-[10px] text-slate-400">{item.status}</span></div><p className="mt-1 text-[10.5px] text-slate-500">{item.competency||"Genel gelişim"}{item.due_date?` · yeniden ölçüm/hedef ${item.due_date}`:""}</p></div>)}</div></section>}

          <section className="enterprise-card p-4">
            <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2f6664]"/><div><p className="text-xs font-semibold">İnsan onayı zorunlu</p><p className="mt-1 text-[10.5px] leading-4 text-slate-500">FutureHR yalnız karar desteği üretir. Terfi, halefiyet, işten çıkarma ve ücret sonucu otomatik uygulanmaz.</p></div></div>
            <div className="mt-3 flex flex-wrap gap-2"><button disabled={saving} onClick={()=>void review("ACKNOWLEDGED")} className="h-8 rounded-lg border border-slate-200 px-3 text-[10.5px] font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">İnceledim</button><button disabled={saving} onClick={()=>void review("NEEDS_EVIDENCE")} className="h-8 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[10.5px] font-semibold text-amber-800 disabled:opacity-50">Ek kanıt iste</button><button disabled={saving} onClick={()=>void review("APPROVED_FOR_NEXT_STEP")} className="h-8 rounded-lg bg-[#2f6664] px-3 text-[10.5px] font-semibold text-white disabled:opacity-50">Sonraki adıma onay</button></div>
          </section>
        </div>}
      </div>

      <footer className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[#141b22]"><div className="grid grid-cols-3 gap-2"><Link href={`/degerlendirme?employeeName=${encodeURIComponent(name)}`} onClick={onClose} className="flex h-9 items-center justify-center rounded-lg border border-slate-200 text-[10.5px] font-semibold dark:border-slate-700">Performans</Link><Link href={`/gelisim?employeeName=${encodeURIComponent(name)}`} onClick={onClose} className="flex h-9 items-center justify-center rounded-lg border border-slate-200 text-[10.5px] font-semibold dark:border-slate-700">Gelişim</Link><Link href="/yetkinlik-haritasi" onClick={onClose} className="flex h-9 items-center justify-center rounded-lg bg-[#2f6664] text-[10.5px] font-semibold text-white">Skills Graph</Link></div></footer>
    </aside>
  </div>;
}

function EvidenceGauge({score}:{score:number}){return <div className="shrink-0 text-right"><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#bdd2d0] bg-[#edf4f2] text-sm font-bold text-[#255452]">{score}</div><p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Evidence</p></div>}
function TwinMetric({icon:Icon,label,value}:{icon:typeof BriefcaseBusiness;label:string;value:string}){return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"><div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-slate-400"/><span className="text-[9.5px] uppercase tracking-wide text-slate-400">{label}</span></div><p className="mt-1.5 text-lg font-semibold">{value}</p></div>}
function ChainRow({n,label,value}:{n:string;label:string;value:string}){return <div className="grid grid-cols-[28px_105px_minmax(0,1fr)] gap-2 py-2.5"><span className="text-[9.5px] font-semibold text-slate-300">{n}</span><span className="text-[10.5px] font-semibold text-slate-500">{label}</span><span className="text-[10.5px] leading-4 text-slate-700 dark:text-slate-200">{value}</span></div>}
function SkillRow({label,score}:{label:string;score:number}){return <div><div className="flex items-center justify-between text-[10.5px]"><span className="font-medium">{label}</span><span className="font-semibold tabular-nums">{score.toFixed(1)}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#2f6664]" style={{width:`${Math.min(100,Math.max(0,score/5*100))}%`}}/></div></div>}
function InfoRow({label,value}:{label:string;value:string}){return <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800"><span className="text-slate-500">{label}</span><span className="font-semibold">{value}</span></div>}
function initials(name:string){return String(name||"FH").split(" ").filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")}
function num(value:number|null){return value!=null?value.toFixed(1):"—"}
function pct(value:number|null){return value!=null?`${value>0?"+":""}${value.toFixed(1)}%`:"—"}
function reviewLabel(review:HumanReview|undefined){if(!review)return"Henüz insan incelemesi kaydedilmedi";const labels:Record<HumanReview["status"],string>={ACKNOWLEDGED:"İncelendi",NEEDS_EVIDENCE:"Ek kanıt istendi",APPROVED_FOR_NEXT_STEP:"Sonraki adıma onaylandı",REJECTED:"Reddedildi"};return `${labels[review.status]}${review.reviewed_by?` · ${review.reviewed_by}`:""}`}
