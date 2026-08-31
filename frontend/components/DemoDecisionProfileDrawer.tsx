"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, BrainCircuit, CalendarDays, CheckCircle2, CircleGauge, GraduationCap, ShieldCheck, X } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { latestEvaluationForEmployee } from "@/lib/hr/employeeIdentity";
import { buildTalentDecisionSnapshot } from "@/lib/hr/talentDecisionChain";
import { extractCompetencyMap } from "@/lib/hr/talentPotential";
import type { HumanReview } from "@/lib/hr/decisionIntelligenceClient";

const REVIEW_KEY = "fhr_demo_decision_reviews_v1";
const SKILL_LABELS:Record<string,string>={ANA:"Analitik Düşünme",COM:"İletişim",LRN:"Sürekli Öğrenme",RES:"Sonuç Odaklılık",DET:"Detaylara Özen",DIG:"Dijital Okuryazarlık",ETH:"Etik & Uyum",TEA:"Takım Çalışması",STR:"Dayanıklılık / Stratejik Bakış",DIS:"Öz Disiplin"};

type DemoReview = HumanReview & { employee_id:string };

export default function DemoDecisionProfileDrawer({employeeId,fallbackName,onClose}:{employeeId:string;fallbackName:string;onClose:()=>void}){
  const closeRef=useRef<HTMLButtonElement>(null);
  const[reviews,setReviews]=useState<DemoReview[]>(()=>getStorageData<DemoReview[]>(REVIEW_KEY,[]));
  const data=useMemo(()=>buildDemoProfile(employeeId,fallbackName),[employeeId,fallbackName]);

  useEffect(()=>{
    closeRef.current?.focus();
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[onClose]);

  const employeeReviews=reviews.filter(review=>review.employee_id===data.id);
  const latestReview=employeeReviews.at(-1);
  const recordReview=(status:HumanReview["status"])=>{
    const review:DemoReview={id:`demo-review-${Date.now()}`,employee_id:data.id,decision_type:"employee_decision_profile",status,reviewed_by:"Demo kullanıcı",reviewed_at:new Date().toISOString()};
    const next=[...reviews,review].slice(-100);
    setReviews(next);
    localStorage.setItem(REVIEW_KEY,JSON.stringify(next));
  };

  return <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="demo-decision-profile-title">
    <button type="button" className="absolute inset-0 bg-slate-950/32 backdrop-blur-[1px]" onClick={onClose} aria-label="Karar profilini kapat"/>
    <aside className="relative flex h-full w-full max-w-[610px] flex-col border-l border-slate-200 bg-[#f8f8f5] shadow-2xl dark:border-slate-800 dark:bg-[#0f151b]">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-[#141b22] sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{initials(data.name)}</span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 id="demo-decision-profile-title" className="truncate text-base font-semibold text-slate-950 dark:text-white">{data.name}</h2><span className="rounded-md border border-[#bdd2d0] bg-[#edf4f2] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.05em] text-[#2f6664]">Karar Profili</span></div><p className="mt-1 truncate text-xs text-slate-500">{data.position||"Pozisyon bilgisi yok"} · {data.department||"Departman bilgisi yok"}</p><p className="mt-1 text-[11px] text-slate-400">Demo karar verisi · kanıt zinciri canlı hesaplanır</p></div>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Kapat"><X className="h-4 w-4"/></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="space-y-4">
          <section className="enterprise-card p-4">
            <div className="flex items-start justify-between gap-4"><div><p className="enterprise-eyebrow">Neden şimdi dikkat gerekiyor?</p><h3 className="mt-1.5 text-[15px] font-semibold text-slate-950 dark:text-white">{data.title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">{data.nextStep}</p></div><EvidenceGauge score={data.evidenceScore}/></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3"><Metric icon={BarChart3} label="Performans" value={data.performance}/><Metric icon={GraduationCap} label="Aktif gelişim" value={String(data.activePlans.length)}/><Metric icon={CalendarDays} label="Bekleyen izin" value={String(data.pendingLeave)}/></div>
          </section>

          <section className="enterprise-card overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-[#2f6664]"/><div><p className="text-xs font-semibold">Explainable AI · Kanıt Zinciri</p><p className="mt-0.5 text-[11px] text-slate-400">Öneri → dayanak → güven → eksik veri → risk → insan onayı</p></div></div></div>
            <div className="divide-y divide-slate-100 px-4 dark:divide-slate-800"><ChainRow n="01" label="Öneri" value={data.title}/><ChainRow n="02" label="Dayanak" value={data.basis}/><ChainRow n="03" label="Kanıt güveni" value={`${data.evidenceScore}/100 · ${data.evidenceBand}`}/><ChainRow n="04" label="Eksik veri" value={data.missing.length?data.missing.join(" · "):"Kritik veri açığı yok"}/><ChainRow n="05" label="Risk" value={data.risks.length?data.risks.slice(0,3).join(" · "):"Belirgin karar riski saptanmadı"}/><ChainRow n="06" label="İnsan onayı" value={reviewLabel(latestReview)}/></div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Yetkinlik sinyalleri</p><CircleGauge className="h-4 w-4 text-slate-400"/></div>{data.skills.length?<div className="mt-3 space-y-2">{data.skills.slice(0,6).map(([code,score])=><SkillRow key={code} label={SKILL_LABELS[code]||code} score={score}/>)}</div>:<p className="mt-3 text-xs leading-5 text-slate-500">Henüz doğrulanmış yetkinlik sinyali bulunmuyor.</p>}</div>
            <div className="enterprise-card p-4"><p className="text-xs font-semibold">Karar sinyalleri</p><div className="mt-3 space-y-2 text-xs"><Info label="9-Box" value={data.nineBox||"—"}/><Info label="Kariyer isteği" value={data.aspiration?`${data.aspiration}/5`:"Belirtilmedi"}/><Info label="Mobilite" value={data.mobility?`${data.mobility}/5`:"Belirtilmedi"}/><Info label="Kanıt kaynağı" value="Demo Evidence Graph"/></div></div>
          </section>

          <section className="enterprise-card p-4">
            <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2f6664]"/><div><p className="text-xs font-semibold">İnsan onayı zorunlu</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Demo dahil hiçbir öneri otomatik terfi, ücret veya halefiyet kararı uygulamaz. Bu seçim yalnız inceleme izini gösterir.</p></div></div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>recordReview("ACKNOWLEDGED")} className="h-9 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">İnceledim</button><button type="button" onClick={()=>recordReview("NEEDS_EVIDENCE")} className="h-9 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">Ek kanıt iste</button><button type="button" onClick={()=>recordReview("APPROVED_FOR_NEXT_STEP")} className="h-9 rounded-lg bg-[#2f6664] px-3 text-[11px] font-semibold text-white hover:bg-[#255452]">Sonraki adıma onay</button></div>
          </section>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#141b22] sm:px-6"><div className="grid grid-cols-3 gap-2"><Link href={`/degerlendirme?employeeName=${encodeURIComponent(data.name)}`} onClick={onClose} className="flex h-9 items-center justify-center rounded-lg border border-slate-200 text-[11px] font-semibold dark:border-slate-700">Performans</Link><Link href={`/gelisim?employeeName=${encodeURIComponent(data.name)}`} onClick={onClose} className="flex h-9 items-center justify-center rounded-lg border border-slate-200 text-[11px] font-semibold dark:border-slate-700">Gelişim</Link><Link href="/yetkinlik-haritasi" onClick={onClose} className="flex h-9 items-center justify-center rounded-lg bg-[#2f6664] text-[11px] font-semibold text-white">Skills Graph</Link></div></footer>
    </aside>
  </div>;
}

function buildDemoProfile(employeeId:string,fallbackName:string){
  const org=getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]);
  const history=getStorageData<any[]>(STORAGE_KEYS.HISTORY_360,[]);
  const plans=getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS,[]);
  const leaves=getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS,[]);
  const employee=org.find(row=>String(row.id||"")===employeeId)||org.find(row=>String(row["Ad Soyad"]||"")===fallbackName)||{};
  const name=String(employee["Ad Soyad"]||fallbackName||"Çalışan");
  const latest=latestEvaluationForEmployee(employee,history)||{};
  const snapshot=buildTalentDecisionSnapshot(employee,history);
  const skills=Object.entries(extractCompetencyMap({...employee,...latest})).map(([code,score])=>[code,Number(score)] as [string,number]).filter(([,score])=>Number.isFinite(score)&&score>0).sort((a,b)=>b[1]-a[1]);
  const activePlans=plans.filter(plan=>String(plan.employee||plan.employee_name||"")===name&&!/tamam|completed|closed/i.test(String(plan.status||"")));
  const pendingLeave=leaves.filter(row=>String(row.employee||row.employee_name||"")===name&&String(row.status||"")==="Bekliyor").length;
  const performance=snapshot.performance.score>0?snapshot.performance.score.toFixed(1):"—";
  const title=snapshot.evidence.score<60?"Karar öncesi kanıtı güçlendir":snapshot.performance.score>=4.2?"Yüksek performans sinyalini bütüncül değerlendir":"Kariyer, gelişim ve performans sinyallerini birlikte değerlendir";
  const nextStep=snapshot.evidence.score<60?"Eksik kanıtları tamamla; ardından kariyer, gelişim ve ücret sinyallerini yeniden değerlendir.":"Performans sonucunu tek başına karar yapmadan kariyer, gelişim ve rol verileriyle doğrula.";
  const basis=`Performans ${performance} · ${skills.length} yetkinlik sinyali · ${activePlans.length} aktif gelişim aksiyonu`;
  return{id:String(employee.id||employeeId),name,position:String(employee.Pozisyon||""),department:String(employee.Departman||""),performance,activePlans,pendingLeave,evidenceScore:snapshot.evidence.score,evidenceBand:snapshot.evidence.band,missing:snapshot.evidence.missingSignals,risks:snapshot.signals,title,nextStep,basis,skills,nineBox:snapshot.talent.nineBox,aspiration:snapshot.profile.aspiration,mobility:snapshot.profile.mobility};
}

function EvidenceGauge({score}:{score:number}){return <div className="shrink-0 text-right"><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#bdd2d0] bg-[#edf4f2] text-sm font-bold text-[#255452]">{score}</div><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kanıt</p></div>}
function Metric({icon:Icon,label,value}:{icon:typeof BarChart3;label:string;value:string}){return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"><div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-slate-400"/><span className="text-[10.5px] uppercase tracking-wide text-slate-400">{label}</span></div><p className="mt-1.5 text-lg font-semibold">{value}</p></div>}
function ChainRow({n,label,value}:{n:string;label:string;value:string}){return <div className="grid grid-cols-[28px_105px_minmax(0,1fr)] gap-2 py-2.5"><span className="text-[10px] font-semibold text-slate-300">{n}</span><span className="text-[11px] font-semibold text-slate-500">{label}</span><span className="text-[11px] leading-4 text-slate-700 dark:text-slate-200">{value}</span></div>}
function SkillRow({label,score}:{label:string;score:number}){return <div><div className="flex items-center justify-between text-[11px]"><span className="font-medium">{label}</span><span className="font-semibold tabular-nums">{score.toFixed(1)}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#2f6664]" style={{width:`${Math.min(100,Math.max(0,score/5*100))}%`}}/></div></div>}
function Info({label,value}:{label:string;value:string}){return <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800"><span className="text-slate-500">{label}</span><span className="font-semibold text-right">{value}</span></div>}
function initials(name:string){return String(name||"FH").split(" ").filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")}
function reviewLabel(review:DemoReview|undefined){if(!review)return"Henüz insan incelemesi kaydedilmedi";const labels:Record<HumanReview["status"],string>={ACKNOWLEDGED:"İncelendi",NEEDS_EVIDENCE:"Ek kanıt istendi",APPROVED_FOR_NEXT_STEP:"Sonraki adıma onaylandı",REJECTED:"Reddedildi"};return labels[review.status];}
