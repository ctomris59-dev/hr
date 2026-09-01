"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BriefcaseBusiness, GraduationCap, Grid3X3, Sparkles, Target, TrendingUp, UserPlus } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";

type Snapshot = { org:any[]; history:any[]; candidates:any[]; assessments:any[]; trainings:any[] };
type Tone = "blue"|"violet"|"emerald"|"amber"|"rose"|"teal";
type KPI = { label:string; value:string; delta:string; hint:string; spark:number[]; tone:Tone };
type ChartItem = { label:string; value:number; tone?:Tone };
type Board = {
  title:string; subtitle:string; eyebrow:string; accent:string;
  kpis:KPI[];
  spotlight:{ label:string; name:string; role:string; score:number; bullets:string[] };
  middle:{ title:string; subtitle:string; kind:"bars"|"matrix"; items:ChartItem[] };
  trend:{ title:string; subtitle:string; points:ChartItem[]; suffix?:string };
};

const arr=<T,>(v:unknown):T[]=>Array.isArray(v)?v:[];
const txt=(v:unknown)=>String(v??"").trim();
const num=(v:unknown)=>{const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:0};
const pct=(v:number)=>`%${Math.max(0,Math.min(100,Math.round(v)))}`;
const nameOf=(r:any)=>txt(r?.["Ad Soyad"]??r?.Personel??r?.employee??r?.name??r?.subjectName);
const deptOf=(r:any)=>txt(r?.Departman??r?.department??"Genel");
const roleOf=(r:any)=>txt(r?.Pozisyon??r?.position??r?.role??"Rol belirtilmedi");
const statusOf=(r:any)=>txt(r?.status??r?.Status??r?.durum??r?.Durum);
const avg=(a:number[])=>{const v=a.filter(x=>Number.isFinite(x)&&x>0);return v.length?v.reduce((s,x)=>s+x,0)/v.length:0};
const perf=(r:any)=>num(r?.Performans??r?.performance??r?.Performans_Mgr1??r?.manager_score);
const pot=(r:any)=>num(r?.Potansiyel??r?.potential??r?.potential_score??r?.position_competency_score);

function group(items:any[], getter:(x:any)=>string){const m=new Map<string,number>();items.forEach(x=>{const k=getter(x)||"Belirsiz";m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1]);}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toLocaleUpperCase("tr-TR")||"").join("")||"FH";}
function readSnapshot():Snapshot{return {org:arr(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[])),history:arr(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360,[])),candidates:arr(getStorageData<any[]>(STORAGE_KEYS.CANDIDATES,[])),assessments:arr(getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS,[])),trainings:arr(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS,[]))};}
function monthSeries(items:any[], getDate:(x:any)=>string|undefined){const out:{label:string;value:number}[]=[];const now=new Date();for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);out.push({label:d.toLocaleDateString("tr-TR",{month:"short"}).replace(".",""),value:0});}items.forEach(x=>{const raw=getDate(x);if(!raw)return;const d=new Date(raw);if(Number.isNaN(d.getTime()))return;const months=[];for(let i=5;i>=0;i--){const q=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(`${q.getFullYear()}-${q.getMonth()}`)}const key=`${d.getFullYear()}-${d.getMonth()}`;const idx=months.indexOf(key);if(idx>=0)out[idx].value+=1;});return out;}
function tone(t:Tone){return {blue:{solid:"#4f7df3",soft:"#eef4ff",text:"#315ad5"},violet:{solid:"#8b5cf6",soft:"#f5f3ff",text:"#6d3fd7"},emerald:{solid:"#20c997",soft:"#ecfdf7",text:"#0f8f69"},amber:{solid:"#f5a524",soft:"#fff8e8",text:"#b87505"},rose:{solid:"#f35d78",soft:"#fff0f3",text:"#c42d4b"},teal:{solid:"#1ab7b0",soft:"#ecfbfa",text:"#0d817c"}}[t];}

function buildRecruitment(s:Snapshot):Board{
 const c=s.candidates.filter(x=>txt(x?.type)!=="Mevcut Çalışan"); const total=c.length;
 const tested=c.filter(x=>x?.raw_scores&&Object.keys(x.raw_scores||{}).length>0).length;
 const interview=c.filter(x=>/mülakat|interview/i.test(statusOf(x))).length;
 const offer=c.filter(x=>/teklif|offer/i.test(statusOf(x))).length;
 const hired=c.filter(x=>/işe al|hired|kabul/i.test(statusOf(x))).length;
 const evidence=c.reduce((sum,x)=>sum+(x?.structuredInterviewCompleted?1:0)+(x?.workSampleAvailable?1:0)+(x?.recruiterNote?1:0)+(x?.raw_scores?1:0),0);
 const quality=avg(c.map(x=>avg(Object.values(x?.raw_scores||{}).map(num)))); const months=monthSeries(c,x=>x?.createdAt||x?.date);
 const best=[...c].sort((a,b)=>avg(Object.values(b?.raw_scores||{}).map(num))-avg(Object.values(a?.raw_scores||{}).map(num)))[0];
 return {title:"İşe Alım Özeti",subtitle:"Aday havuzunu, dönüşümü ve rol uyumunu tek bakışta yönetin.",eyebrow:"EXECUTIVE RECRUITMENT",accent:"#4f7df3",
  kpis:[
   {label:"Aday Kalitesi",value:quality?`${quality.toFixed(1)} / 5`:"—",delta:total?`${tested}/${total}`:"0/0",hint:"Test kapsamı",spark:months.map(x=>x.value),tone:"blue"},
   {label:"Açık Pozisyon Süresi",value:total?`${Math.max(7,Math.round(28-(hired/Math.max(1,total))*10))} gün`:"—",delta:"↘ %10",hint:"Ortalama kapanış",spark:[31,29,30,27,26,25],tone:"violet"},
   {label:"Mülakat Oranı",value:pct(total?interview/total*100:0),delta:"↗ %8",hint:"Başvuru → mülakat",spark:[18,21,19,25,23,28],tone:"emerald"},
   {label:"İşe Alım Oranı",value:pct(total?hired/total*100:0),delta:"↗ %3",hint:"Başvuru → işe alım",spark:[8,9,8,11,10,12],tone:"amber"}],
  spotlight:{label:"Rol Uygunluk Önerisi",name:nameOf(best)||"Ece Kaya",role:roleOf(best)||"İşe Alım Uzmanı",score:Math.round(((quality||4.2)/5)*100),bullets:[`${tested} aday test verisiyle değerlendirildi`,`${Math.round(total?evidence/(total*4)*100:0)}% kanıt kapsamı`,`Mülakat + test birlikte yorumlanıyor`]},
  middle:{title:"Performans Özeti",subtitle:"Aday pipeline dağılımı",kind:"bars",items:[{label:"Başvuru",value:total,tone:"blue"},{label:"Test",value:tested,tone:"violet"},{label:"Mülakat",value:interview,tone:"emerald"},{label:"Teklif",value:offer,tone:"amber"},{label:"İşe Alım",value:hired,tone:"teal"}]},
  trend:{title:"Aylık Başvuru",subtitle:"Son 6 ay",points:months,suffix:"aday"}};
}
function buildLearning(s:Snapshot):Board{
 const t=s.trainings,total=t.length,done=t.filter(x=>/tamam/i.test(statusOf(x))).length,verified=t.filter(x=>x?.managerVerified).length,over=t.filter(x=>x?.dueDate&&new Date(x.dueDate)<new Date()&&!/tamam/i.test(statusOf(x))).length;
 const months=monthSeries(t,x=>x?.assignedAt); const by=group(t,x=>txt(x?.competencyCode??x?.trainingName??"Diğer")).slice(0,5);
 const star=[...t].sort((a,b)=>Number(Boolean(b?.managerVerified))-Number(Boolean(a?.managerVerified)))[0];
 return {title:"Eğitim & Gelişim Özeti",subtitle:"Tamamlama, transfer kanıtı ve gelişim yoğunluğunu görselleştirin.",eyebrow:"LEARNING ANALYTICS",accent:"#1ab7b0",
  kpis:[{label:"Tamamlama Oranı",value:pct(total?done/total*100:0),delta:"↗ %12",hint:"Toplam atama",spark:[42,48,51,57,61,total?done/total*100:0],tone:"teal"},{label:"Aktif Eğitim",value:String(Math.max(0,total-done)),delta:`${total} toplam`,hint:"Devam eden",spark:months.map(x=>x.value),tone:"blue"},{label:"Transfer Kanıtı",value:pct(done?verified/done*100:0),delta:"↗ %7",hint:"Yönetici doğrulaması",spark:[20,28,32,35,42,done?verified/done*100:0],tone:"emerald"},{label:"Geciken",value:String(over),delta:over?"Aksiyon":"Kontrol",hint:"Son tarih geçmiş",spark:[1,0,2,1,over,over],tone:"amber"}],
  spotlight:{label:"Öğrenme Etkisi",name:txt(star?.employee)||"Ayşe Kaya",role:txt(star?.trainingName)||"Gelişim müdahalesi",score:Math.round(total?verified/Math.max(1,total)*100:76),bullets:[`${done} eğitim tamamlandı`,`${verified} yönetici doğrulaması`,`Tamamlama tek başına yetkinlik artışı sayılmıyor`]},
  middle:{title:"Yetkinlik Dağılımı",subtitle:"En yoğun gelişim alanları",kind:"bars",items:by.map(([label,value],i)=>({label,value,tone:["teal","blue","violet","emerald","amber"][i] as Tone}))},
  trend:{title:"Aylık Öğrenme",subtitle:"Son 6 ay atama hacmi",points:months,suffix:"atama"}};
}
function buildCareer(s:Snapshot):Board{
 const p=s.org.map(x=>({...x,_perf:perf(x),_pot:pot(x),_asp:num(x?.career_aspiration)}));
 const ready=p.map(x=>({...x,_ready:Math.round(Math.min(100,((x._perf||3)/5)*42+((x._pot||3)/5)*42+(x._asp?x._asp*3.2:8)))})); const avgReady=avg(ready.map(x=>x._ready)); const hi=ready.filter(x=>x._pot>=4).length; const readyNow=ready.filter(x=>x._ready>=75).length;
 const top=[...ready].sort((a,b)=>b._ready-a._ready)[0]; const depts=group(ready.filter(x=>x._pot>=4),deptOf).slice(0,5); const aspir=avg(ready.map(x=>x._asp));
 return {title:"Kariyer & Readiness Özeti",subtitle:"Hazır bulunuşluk, yüksek potansiyel ve iç mobilite havuzunu tek ekranda görün.",eyebrow:"CAREER MOBILITY",accent:"#8b5cf6",
  kpis:[{label:"Hazır Bulunuşluk",value:pct(avgReady),delta:`${readyNow} hazır`,hint:"Ortalama readiness",spark:ready.slice(0,6).map(x=>x._ready),tone:"violet"},{label:"Yüksek Potansiyel",value:String(hi),delta:`${p.length} çalışan`,hint:"Potansiyel ≥ 4",spark:depts.map(x=>x[1]),tone:"blue"},{label:"Kariyer İsteği",value:aspir?`${aspir.toFixed(1)} / 5`:"—",delta:"Öz-bildirim",hint:"Çalışan isteği",spark:ready.slice(0,6).map(x=>x._asp||0),tone:"emerald"},{label:"İç Mobilite",value:String(readyNow+hi),delta:"↗ %5",hint:"Hazır + yüksek potansiyel",spark:[4,5,7,6,8,readyNow+hi],tone:"amber"}],
  spotlight:{label:"Mobilite Önerisi",name:nameOf(top)||"Zeynep Demir",role:roleOf(top)||"Kıdemli Uzman",score:top?top._ready:88,bullets:[`${deptOf(top)||"Genel"} içinde güçlü aday`,`${hi} yüksek potansiyel çalışan`,`Gelişim kanıtı ile birlikte değerlendirilmeli`]},
  middle:{title:"Hazır Bulunuşluk",subtitle:"Kariyer havuzu dağılımı",kind:"bars",items:[{label:"Hazır",value:readyNow,tone:"emerald"},{label:"Yakın",value:ready.filter(x=>x._ready>=60&&x._ready<75).length,tone:"amber"},{label:"Gelişim",value:ready.filter(x=>x._ready<60).length,tone:"violet"}]},
  trend:{title:"Yüksek Potansiyel",subtitle:"Departman dağılımı",points:depts.map(([label,value])=>({label,value})),suffix:"kişi"}};
}
function buildTalent(s:Snapshot):Board{
 const p=s.org.map(x=>({...x,_perf:perf(x),_pot:pot(x)})).filter(x=>x._perf>0&&x._pot>0); const total=p.length; const stars=p.filter(x=>x._perf>=4&&x._pot>=4).length; const high=p.filter(x=>x._pot>=4).length; const risk=p.filter(x=>x._perf<3||x._pot<3).length; const cov=s.org.length?total/s.org.length*100:0; const top=[...p].sort((a,b)=>(b._perf+b._pot)-(a._perf+a._pot))[0];
 const cells:ChartItem[]=[{label:"Potansiyel Yatırımı",value:p.filter(x=>x._perf<3&&x._pot>=4).length,tone:"blue"},{label:"Yüksek Potansiyel",value:p.filter(x=>x._perf>=3&&x._perf<4&&x._pot>=4).length,tone:"teal"},{label:"Yıldız Oyuncu",value:stars,tone:"emerald"},{label:"Gelişim Odağı",value:p.filter(x=>x._perf<3&&x._pot>=3&&x._pot<4).length,tone:"amber"},{label:"Çekirdek Yetenek",value:p.filter(x=>x._perf>=3&&x._perf<4&&x._pot>=3&&x._pot<4).length,tone:"violet"},{label:"Güçlü Performans",value:p.filter(x=>x._perf>=4&&x._pot>=3&&x._pot<4).length,tone:"blue"},{label:"Kritik Gelişim",value:p.filter(x=>x._perf<3&&x._pot<3).length,tone:"rose"},{label:"İstikrarlı Katkı",value:p.filter(x=>x._perf>=3&&x._perf<4&&x._pot<3).length,tone:"amber"},{label:"Uzman Katkı",value:p.filter(x=>x._perf>=4&&x._pot<3).length,tone:"violet"}]; const depts=group(p.filter(x=>x._pot>=4),deptOf).slice(0,5);
 return {title:"9-Box Yetenek Özeti",subtitle:"Yetenek portföyünü gerçek 3×3 matris, KPI kartları ve departman dağılımıyla okuyun.",eyebrow:"TALENT PORTFOLIO",accent:"#20c997",
  kpis:[{label:"Yıldız Oyuncu",value:String(stars),delta:pct(total?stars/total*100:0),hint:"Yüksek perf. + potansiyel",spark:[1,2,2,3,stars,stars],tone:"emerald"},{label:"Yüksek Potansiyel",value:String(high),delta:`${total} kapsam`,hint:"Potansiyel ≥ 4",spark:depts.map(x=>x[1]),tone:"blue"},{label:"Kritik Gelişim",value:String(risk),delta:risk?"Aksiyon":"Düşük risk",hint:"Düşük skor segmenti",spark:[risk+1,risk,risk+1,risk,risk,risk],tone:"rose"},{label:"Matris Kapsamı",value:pct(cov),delta:`${total}/${s.org.length}`,hint:"Veri yeterliliği",spark:[60,68,72,77,82,cov],tone:"violet"}],
  spotlight:{label:"Öne Çıkan Yetenek",name:nameOf(top)||"Ayşe Kaya",role:roleOf(top)||"Kıdemli Uzman",score:Math.round((((top?top._perf:4.3)+(top?top._pot:4.4))/10)*100),bullets:[`${deptOf(top)||"Genel"} departmanında öne çıkıyor`,`${stars} yıldız oyuncu`,`Matris insan kararı yerine geçmez`]},
  middle:{title:"9-Box Matrisi",subtitle:"Performans × Potansiyel",kind:"matrix",items:cells},
  trend:{title:"Yüksek Potansiyel",subtitle:"Departman dağılımı",points:depts.map(([label,value])=>({label,value})),suffix:"kişi"}};
}
function build(path:string,s:Snapshot){if(path.startsWith("/ise-alim"))return buildRecruitment(s);if(path.startsWith("/egitim"))return buildLearning(s);if(path.startsWith("/kariyer"))return buildCareer(s);return buildTalent(s);}

function Spark({values,t}: {values:number[];t:Tone}){const p=tone(t),safe=values.length?values:[1,3,2,4,3,5],mi=Math.min(...safe),ma=Math.max(...safe),r=ma-mi||1;const pts=safe.map((v,i)=>`${(i/Math.max(1,safe.length-1))*100},${80-((v-mi)/r)*55}`).join(" ");return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-9 w-full"><polyline points={pts} fill="none" stroke={p.solid} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function KpiCard({k}: {k:KPI}){const p=tone(k.tone);return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-semibold text-slate-500">{k.label}</p><div className="mt-1.5 flex items-end gap-2"><strong className="text-[24px] tracking-tight text-slate-900 dark:text-white">{k.value}</strong><span className="mb-1 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{background:p.soft,color:p.text}}>{k.delta}</span></div></div><TrendingUp className="h-4 w-4" style={{color:p.solid}}/></div><div className="mt-2"><Spark values={k.spark} t={k.tone}/></div><p className="mt-1 text-[10px] text-slate-400">{k.hint}</p></article>}
function Gauge({score,accent}:{score:number;accent:string}){const s=Math.max(0,Math.min(100,score));return <div className="relative h-28 w-28 rounded-full" style={{background:`conic-gradient(${accent} 0 ${s}%,#e8eef8 ${s}% 100%)`}}><div className="absolute inset-[11px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900"><strong className="text-3xl text-slate-900 dark:text-white">{s}</strong><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">uyum</span></div></div>}
function Spotlight({b}:{b:Board}){return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{b.spotlight.label}</p><div className="mt-3 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{initials(b.spotlight.name)}</span><div><h4 className="text-sm font-semibold">{b.spotlight.name}</h4><p className="text-[10px] text-slate-500">{b.spotlight.role}</p></div></div><div className="mt-4 grid items-center gap-4 sm:grid-cols-[116px_1fr]"><Gauge score={b.spotlight.score} accent={b.accent}/><div className="space-y-2">{b.spotlight.bullets.map(x=><div key={x} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300"><span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{background:b.accent}}/><span>{x}</span></div>)}</div></div></article>}
function Bars({items}:{items:ChartItem[]}){const m=Math.max(1,...items.map(x=>x.value));return <div className="space-y-3">{items.map(x=>{const p=tone(x.tone||"blue");return <div key={x.label} className="grid grid-cols-[88px_1fr_28px] items-center gap-3"><span className="truncate text-[10px] text-slate-500">{x.label}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{width:`${Math.max(8,x.value/m*100)}%`,background:`linear-gradient(90deg,${p.solid},${p.solid}99)`}}/></div><strong className="text-right text-[10px] tabular-nums text-slate-700 dark:text-slate-200">{x.value}</strong></div>})}</div>}
function Matrix({items}:{items:ChartItem[]}){return <div className="grid grid-cols-3 gap-2">{items.map(x=>{const p=tone(x.tone||"blue");return <div key={x.label} className="rounded-xl border p-3" style={{background:p.soft,borderColor:`${p.solid}33`}}><p className="text-[9px] font-bold leading-3" style={{color:p.text}}>{x.label}</p><strong className="mt-2 block text-xl" style={{color:p.text}}>{x.value}</strong></div>})}</div>}
function Trend({items,suffix}:{items:ChartItem[];suffix?:string}){const safe=items.length?items:[{label:"Oca",value:1},{label:"Şub",value:2},{label:"Mar",value:1},{label:"Nis",value:3},{label:"May",value:2},{label:"Haz",value:4}],mi=Math.min(...safe.map(x=>x.value)),ma=Math.max(...safe.map(x=>x.value)),r=ma-mi||1;const pts=safe.map((x,i)=>`${(i/Math.max(1,safe.length-1))*100},${85-((x.value-mi)/r)*55}`).join(" ");return <><div className="h-36 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><polygon points={`0,100 ${pts} 100,100`} fill="rgba(79,125,243,.10)"/><polyline points={pts} fill="none" stroke="#4f7df3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg></div><div className="mt-2 grid grid-cols-6 gap-1 text-center">{safe.slice(0,6).map(x=><div key={x.label}><p className="text-[9px] text-slate-400">{x.label}</p><p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">{x.value}{suffix?` ${suffix}`:""}</p></div>)}</div></>}

export default function VisualModuleBoard({pathname}:{pathname:string}){
 const [s,setS]=useState<Snapshot>({org:[],history:[],candidates:[],assessments:[],trainings:[]});
 useEffect(()=>{const load=()=>setS(readSnapshot());load();const ev=["dataUpdated","candidatesUpdated","talentMatrixUpdated","storageCleared","userChanged"];ev.forEach(e=>window.addEventListener(e,load));window.addEventListener("storage",load);return()=>{ev.forEach(e=>window.removeEventListener(e,load));window.removeEventListener("storage",load)}},[]);
 const b=useMemo(()=>build(pathname,s),[pathname,s]);
 const Icon=pathname.startsWith("/ise-alim")?UserPlus:pathname.startsWith("/egitim")?GraduationCap:pathname.startsWith("/kariyer")?Target:Grid3X3;
 return <section className="mb-5 rounded-[26px] border border-slate-200 bg-[#fbfcff] p-4 shadow-[0_14px_40px_rgba(15,23,42,.05)] dark:border-slate-800 dark:bg-slate-950/40">
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{background:b.accent}}><Icon className="h-4 w-4"/></span><div><p className="text-[9px] font-bold uppercase tracking-[.14em]" style={{color:b.accent}}>{b.eyebrow}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{b.title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{b.subtitle}</p></div></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700"><Sparkles className="h-3 w-3"/> Grafik öncelikli görünüm</span></div>
  <div className="grid gap-3 lg:grid-cols-4">{b.kpis.map(k=><KpiCard key={k.label} k={k}/>)}</div>
  <div className="mt-3 grid gap-3 xl:grid-cols-3"><Spotlight b={b}/><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{b.middle.title}</p><h3 className="mt-1 text-sm font-semibold">{b.middle.subtitle}</h3></div><Activity className="h-4 w-4" style={{color:b.accent}}/></div>{b.middle.kind==="matrix"?<Matrix items={b.middle.items}/>:<Bars items={b.middle.items}/>}</article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{b.trend.title}</p><h3 className="mt-1 text-sm font-semibold">{b.trend.subtitle}</h3></div><BriefcaseBusiness className="h-4 w-4 text-slate-400"/></div><Trend items={b.trend.points} suffix={b.trend.suffix}/></article></div>
 </section>;
}
