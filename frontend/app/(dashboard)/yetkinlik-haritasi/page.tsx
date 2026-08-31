"use client";

import { useEffect, useMemo, useState } from "react";
import { Network, Search, ShieldCheck, Target, Users } from "lucide-react";
import { fetchSkillsGraph, type SkillsGraph } from "@/lib/hr/decisionIntelligenceClient";
import { SAAS_DATA_MODE } from "@/lib/hr/saasWorkforceClient";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";

const LABELS:Record<string,string>={ANA:"Analitik Düşünme",COM:"İletişim",LRN:"Sürekli Öğrenme",RES:"Sonuç Odaklılık",DET:"Detaylara Özen",DIG:"Dijital Okuryazarlık",ETH:"Etik & Uyum",DIS:"Öz Disiplin",STR:"Dayanıklılık / Stratejik Bakış",TEA:"Takım Çalışması"};

function localGraph():SkillsGraph{
  const org=getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]);
  const history=getStorageData<any[]>(STORAGE_KEYS.HISTORY_360,[]);
  const latest=new Map<string,any>();
  [...history].sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).forEach(row=>latest.set(String(row.Personel||row["Ad Soyad"]||""),row));
  const nodes:SkillsGraph["nodes"]=[],edges:SkillsGraph["edges"]=[],values:Record<string,Record<string,number[]>>={};
  const skillSet=new Set<string>(),roleSet=new Set<string>();
  org.forEach((person,index)=>{const id=String(person.id||`demo-${index}`),name=String(person["Ad Soyad"]||"Çalışan"),role=String(person.Pozisyon||"Tanımsız rol"),record=latest.get(name)||{};nodes.push({id,name,department:person.Departman,position:role});roleSet.add(role);edges.push({source:id,target:`role:${role}`,type:"holds_role"});Object.entries(record).forEach(([key,raw])=>{if(!/(?:_Mgr$|^(ANA|COM|LRN|RES|DET|DIG|ETH|DIS|STR|TEA)$)/.test(key))return;const score=Number(raw);if(!(score>0&&score<=5))return;const code=key.replace(/_Mgr$/,""),skill=`skill:${code}`;skillSet.add(code);edges.push({source:id,target:skill,type:"demonstrates",score});values[role]??={};values[role][code]??=[];values[role][code].push(score);});});
  roleSet.forEach(role=>nodes.push({id:`role:${role}`,label:role,type:"role"}));skillSet.forEach(skill=>nodes.push({id:`skill:${skill}`,label:skill,type:"skill"}));
  const role_requirements:SkillsGraph["role_requirements"]=[];Object.entries(values).forEach(([role,skills])=>Object.entries(skills).forEach(([skill,scores])=>{const avg=scores.reduce((a,b)=>a+b,0)/scores.length;const target=Math.min(5,Math.max(3.5,avg+.25));role_requirements.push({role,skill,target:Number(target.toFixed(2)),sample_size:scores.length,source:"tenant_evidence_baseline"});edges.push({source:`role:${role}`,target:`skill:${skill}`,type:"requires",target_score:Number(target.toFixed(2))});}));
  return{nodes,edges,role_requirements,method:"Demo modunda rol hedefleri mevcut performans kanıtlarından türetilen şirket içi baseline'dır."};
}

export default function YetkinlikHaritasiPage(){
  const[graph,setGraph]=useState<SkillsGraph|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState("");const[query,setQuery]=useState("");const[selectedRole,setSelectedRole]=useState("");
  useEffect(()=>{let active=true;(async()=>{try{const data=SAAS_DATA_MODE?await fetchSkillsGraph():localGraph();if(active)setGraph(data);}catch(err){if(active)setError(err instanceof Error?err.message:"Yetkinlik haritası yüklenemedi.");}finally{if(active)setLoading(false);}})();return()=>{active=false};},[]);
  const roles=useMemo(()=>Array.from(new Set((graph?.role_requirements||[]).map(row=>row.role))).sort((a,b)=>a.localeCompare(b,"tr")),[graph]);
  const requirements=useMemo(()=>{const q=query.toLocaleLowerCase("tr-TR");return(graph?.role_requirements||[]).filter(row=>(!selectedRole||row.role===selectedRole)&&(!q||`${row.role} ${row.skill} ${LABELS[row.skill]||""}`.toLocaleLowerCase("tr-TR").includes(q))).sort((a,b)=>a.role.localeCompare(b.role,"tr")||b.target-a.target);},[graph,query,selectedRole]);
  const employees=(graph?.nodes||[]).filter(node=>!node.type&&!String(node.id).startsWith(("role:","skill:")));
  const skills=(graph?.nodes||[]).filter(node=>node.type==="skill");

  return <div className="space-y-5">
    <header className="futurehr-page-header"><p className="futurehr-page-eyebrow">Skills Intelligence</p><h1 className="futurehr-page-title">Yetkinlik Haritası</h1><p className="futurehr-page-lede">Çalışan → rol → yetkinlik ilişkisini tek kanıt grafiğinde gösterir. Rol hedefleri dışarıdan uydurulmaz; mevcut şirket kanıtından türetilen baseline açıkça işaretlenir.</p></header>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Users} label="Çalışan düğümü" value={loading?"…":employees.length}/><Metric icon={Network} label="Yetkinlik" value={loading?"…":skills.length}/><Metric icon={Target} label="Rol-yetkinlik bağı" value={loading?"…":graph?.role_requirements.length||0}/></div>
    {error&&<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}
    <section className="enterprise-card overflow-hidden">
      <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_260px] dark:border-slate-800"><label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"><Search className="h-4 w-4 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Rol veya yetkinlik ara" className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label><select value={selectedRole} onChange={event=>setSelectedRole(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">Tüm roller</option>{roles.map(role=><option key={role}>{role}</option>)}</select></div>
      <div className="grid gap-0 lg:grid-cols-[1.1fr_.9fr]">
        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r dark:border-slate-800"><div className="flex items-center justify-between"><div><p className="enterprise-eyebrow">Rol gereksinimleri</p><h2 className="mt-1 text-sm font-semibold">Kanıta dayalı hedef profil</h2></div><span className="text-[10px] text-slate-400">{requirements.length} bağ</span></div><div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{requirements.slice(0,30).map(row=><div key={`${row.role}-${row.skill}`} className="grid grid-cols-[minmax(0,1fr)_90px_48px] items-center gap-3 py-2.5"><div><p className="text-xs font-semibold">{LABELS[row.skill]||row.skill}</p><p className="mt-0.5 text-[10px] text-slate-400">{row.role} · n={row.sample_size}</p></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#2f6664]" style={{width:`${row.target/5*100}%`}}/></div><span className="text-right text-xs font-semibold tabular-nums">{row.target.toFixed(2)}</span></div>)}{!loading&&!requirements.length&&<p className="py-8 text-center text-xs text-slate-500">Filtreyle eşleşen yetkinlik bağı yok.</p>}</div></div>
        <div className="p-5"><p className="enterprise-eyebrow">Grafik mantığı</p><h2 className="mt-1 text-sm font-semibold">Bağlantılar nasıl okunur?</h2><div className="mt-4 space-y-3"><GraphLegend title="Çalışan → Rol" text="Çalışanın mevcut organizasyon rolü."/><GraphLegend title="Çalışan → Yetkinlik" text="Son doğrulanmış performans/yetkinlik kanıtındaki skor."/><GraphLegend title="Rol → Yetkinlik" text="Aynı roldeki tenant kanıtından türetilen hedef baseline."/></div><div className="mt-5 rounded-lg border border-[#cbdad8] bg-[#f1f6f5] p-3 text-[10.5px] leading-5 text-[#315f5c]"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5"/>{graph?.method||"Veri modeli hazırlanıyor."}</div><p className="mt-4 text-[10.5px] leading-5 text-slate-500">Bu hedefler normatif iş standardı değildir. İK, rol mimarisi ve iş analizi ile doğrulanmadan terfi/işe alım eşiği olarak kullanılmamalıdır.</p></div>
      </div>
    </section>
  </div>;
}

function Metric({icon:Icon,label,value}:{icon:typeof Users;label:string;value:number|string}){return <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className="h-4 w-4 text-slate-400"/></div><p className="mt-3 text-2xl font-semibold">{value}</p></div>}
function GraphLegend({title,text}:{title:string;text:string}){return <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-[10.5px] leading-4 text-slate-500">{text}</p></div>}
