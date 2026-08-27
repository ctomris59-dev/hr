"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Crown, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { getCareerRole } from "../../../lib/hr/careerArchitecture";
import { rankSuccessors } from "../../../lib/hr/succession";

export default function YedeklemePage(){
  const[orgData,setOrgData]=useState<any[]>([]);const[history,setHistory]=useState<any[]>([]);const[selectedName,setSelectedName]=useState("");
  useEffect(()=>{setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]));setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360,[]));},[]);
  const reportCounts=useMemo(()=>{const map:Record<string,number>={};orgData.forEach(e=>{const m=e["Yönetici 1"];if(m)map[m]=(map[m]||0)+1});return map},[orgData]);
  const criticalRoles=useMemo(()=>orgData.filter(e=>{const level=getCareerRole(e.Pozisyon||"").levelRank;return level>=4||(reportCounts[e["Ad Soyad"]]||0)>=2}).sort((a,b)=>getCareerRole(b.Pozisyon||"").levelRank-getCareerRole(a.Pozisyon||"").levelRank),[orgData,reportCounts]);
  useEffect(()=>{if(!selectedName&&criticalRoles.length)setSelectedName(criticalRoles[0]["Ad Soyad"])},[criticalRoles,selectedName]);
  const target=orgData.find(e=>e["Ad Soyad"]===selectedName);const ranked=useMemo(()=>target?rankSuccessors(target,orgData,history).slice(0,8):[],[target,orgData,history]);
  const readyNow=ranked.filter(r=>r.assessment.readiness==="Şimdi").length;
  const averageScore=ranked.length?Math.round(ranked.reduce((sum,r)=>sum+Number(r.assessment.score||0),0)/ranked.length):0;
  const nearestReadiness=ranked[0]?.assessment.readiness||"—";

  return <div className="space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-red-600">Halefiyet yönetimi</p><h1 className="mt-1 text-2xl font-semibold">Yedekleme</h1><p className="mt-1 max-w-4xl text-sm text-slate-500">Sabit “%65 hazır” kaldırıldı. Halef skoru hedef rol yetkinlik uyumu %35, seviye uyumu %15, hazır olma süresi %15, kariyer isteği %10, performans trendi %15 ve potansiyel %10 ile dinamik hesaplanır.</p></div>

    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Kritik rol" value={criticalRoles.length} icon={Crown}/><Metric label="Değerlendirilen halef" value={ranked.length} icon={Users}/><Metric label="Şimdi hazır" value={readyNow} icon={ShieldCheck}/></div>

    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600"/><h2 className="text-sm font-semibold">Kritik roller</h2></div><p className="mt-1 text-xs text-slate-500">Yönetim seviyesi veya ekip sorumluluğu olan roller.</p>
        <div className="mt-4 space-y-2">{criticalRoles.map(role=>{const active=role["Ad Soyad"]===selectedName;const career=getCareerRole(role.Pozisyon||"");return <button key={role.id??role["Ad Soyad"]} onClick={()=>setSelectedName(role["Ad Soyad"])} className={`w-full rounded-2xl border p-3.5 text-left transition ${active?"border-red-200 bg-red-50 shadow-sm dark:border-red-900/60 dark:bg-red-950/25":"border-slate-100 bg-white hover:-translate-y-px hover:border-slate-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"}`}><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{role["Ad Soyad"]}</p><p className="mt-1 truncate text-xs text-slate-500">{role.Pozisyon}</p></div><span className={`h-fit rounded-full px-2 py-1 text-[10px] font-bold ${active?"bg-white text-red-700":"bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{career.level}</span></div><p className="mt-2 text-[11px] text-slate-400">{reportCounts[role["Ad Soyad"]]||0} doğrudan raporlayan</p></button>})}{!criticalRoles.length&&<p className="text-xs text-slate-500">Kritik rol bulunamadı.</p>}</div>
      </div>

      <div className="min-w-0 space-y-4">
        {target&&<div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-500">Halefi aranan rol</p><h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{target.Pozisyon}</h2><p className="mt-1 text-xs text-slate-500">Mevcut rol sahibi: {target["Ad Soyad"]} · {target.Departman}</p></div><div className="flex flex-wrap gap-2"><SummaryChip label="Aday" value={ranked.length}/><SummaryChip label="Ort. uyum" value={`%${averageScore}`}/><SummaryChip label="En yakın" value={nearestReadiness}/></div></div></div>}

        <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-red-950/10">
            <div><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40"><Sparkles className="h-4 w-4"/></div><div><h3 className="text-sm font-semibold text-slate-950 dark:text-white">Halef Havuzu</h3><p className="mt-0.5 text-[11px] text-slate-500">Adayların hazırlık süresi ve rol uyumunu karşılaştırın.</p></div></div></div>
            {ranked[0]&&<div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">En güçlü aday · %{ranked[0].assessment.score}</div>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95"><tr>
                <th className="w-[27%] border-b border-slate-200 px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">Halef adayı</th>
                <th className="w-[13%] border-b border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">Hazırlık</th>
                <th className="w-[16%] border-b border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">Toplam uyum</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">Rol uyumu</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">Seviye</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">Perf. trendi</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800">Potansiyel</th>
              </tr></thead>
              <tbody>{ranked.length?ranked.map(({candidate,assessment},index)=>{
                const name=String(candidate["Ad Soyad"]||"");
                return <tr key={candidate.id??name} className={`group transition-colors ${index===0?"bg-emerald-50/25 dark:bg-emerald-950/10":"bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/50"}`}>
                  <td className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-800"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${index===0?"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300":"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{initials(name)}</div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{name}</p>{index===0&&<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Öncelikli</span>}</div><p className="mt-0.5 truncate text-[11px] text-slate-500">{candidate.Pozisyon}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{candidate.Departman||"Departman bilgisi yok"}</p></div></div></td>
                  <td className="border-b border-slate-100 px-3 py-3.5 dark:border-slate-800"><ReadinessBadge value={assessment.readiness}/></td>
                  <td className="border-b border-slate-100 px-3 py-3.5 dark:border-slate-800"><TotalScore value={Number(assessment.score||0)}/></td>
                  <td className="border-b border-slate-100 px-3 py-3.5 dark:border-slate-800"><ScoreCell value={Math.round(assessment.targetRoleFit)} tone="indigo"/></td>
                  <td className="border-b border-slate-100 px-3 py-3.5 dark:border-slate-800"><ScoreCell value={Math.round(assessment.levelFit)} tone="sky"/></td>
                  <td className="border-b border-slate-100 px-3 py-3.5 dark:border-slate-800"><ScoreCell value={Math.round(assessment.performanceTrend)} tone="emerald"/></td>
                  <td className="border-b border-slate-100 px-3 py-3.5 dark:border-slate-800"><ScoreCell value={Math.round(assessment.potential)} tone="violet"/></td>
                </tr>}) : <tr><td colSpan={7} className="py-12 text-center"><Users className="mx-auto h-6 w-6 text-slate-300"/><p className="mt-2 text-sm font-medium text-slate-500">Halef adayı bulunmuyor.</p><p className="mt-1 text-xs text-slate-400">Rol uyumu için yeterli çalışan verisi oluştuğunda adaylar burada sıralanır.</p></td></tr>}</tbody>
            </table>
          </div>
        </section>

        {ranked[0]&&<div className="rounded-[20px] border border-red-100 bg-gradient-to-r from-red-50/80 to-white p-5 shadow-sm dark:border-red-950 dark:from-red-950/20 dark:to-slate-900"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50"><TrendingUp className="h-4 w-4"/></div><div><h3 className="text-sm font-semibold text-red-950 dark:text-red-100">En güçlü aday için açıklama</h3><p className="mt-1 text-xs font-medium text-red-800 dark:text-red-300">{ranked[0].candidate["Ad Soyad"]} · %{ranked[0].assessment.score} · {ranked[0].assessment.readiness}</p>{ranked[0].assessment.reasons.length?<div className="mt-3 text-xs leading-5 text-red-800 dark:text-red-300">{ranked[0].assessment.reasons.map(r=><p key={r}>• {r}</p>)}</div>:<p className="mt-3 text-xs text-red-800 dark:text-red-300">Belirgin veri açığı yok. Yine de halefiyet kararı yönetici değerlendirmesi ve kariyer görüşmesiyle teyit edilmelidir.</p>}</div></div></div>}
      </div>
    </div>
  </div>
}

function Metric({label,value,icon:Icon}:{label:string;value:number;icon:any}){return <div className="rounded-[18px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between"><p className="text-xs font-medium text-slate-500">{label}</p><Icon className="h-4 w-4 text-red-600"/></div><p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p></div>}
function SummaryChip({label,value}:{label:string;value:string|number}){return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100">{value}</p></div>}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toLocaleUpperCase("tr-TR")).join("")||"—"}
function ReadinessBadge({value}:{value:string}){const cls=value==="Şimdi"?"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300":value==="6–12 ay"?"border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300":value==="12–24 ay"?"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300":"border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${cls}`}>{value}</span>}
function TotalScore({value}:{value:number}){const width=Math.max(0,Math.min(100,value));const tone=value>=75?"bg-emerald-500":value>=60?"bg-amber-500":"bg-red-500";return <div className="min-w-[110px]"><div className="flex items-baseline justify-between gap-2"><strong className="text-sm text-slate-950 dark:text-white">%{value}</strong><span className="text-[9px] font-medium text-slate-400">uyum</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${tone}`} style={{width:`${width}%`}}/></div></div>}
function ScoreCell({value,tone}:{value:number;tone:"indigo"|"sky"|"emerald"|"violet"}){const styles={indigo:"bg-indigo-500",sky:"bg-sky-500",emerald:"bg-emerald-500",violet:"bg-violet-500"};const width=Math.max(0,Math.min(100,value));return <div className="min-w-[88px]"><span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">%{value}</span><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${styles[tone]}`} style={{width:`${width}%`}}/></div></div>}
