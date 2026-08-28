"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Brain, Target, Users } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { calculatePotentialIndex, extractCompetencyMap, getNineBox } from "../../../lib/hr/talentPotential";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "@/components/charts/recharts";

const LABEL_TO_CODE: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG", "Analitik Düşünme": "ANA", "Sonuç Odaklılık": "RES", "Detaylara Özen": "DET", "Sürekli Öğrenme": "LRN", "Etik ve Uyum": "ETH", "Öz-Disiplin": "DIS", "Dayanıklılık & Stres Yönetimi": "STR", "Stratejik Bakış": "STR", "Takım Çalışması": "TEA", "İletişim Becerileri": "COM",
};
const displayCompetencyLabel = (label: string) => label === "Stratejik Bakış" ? "Dayanıklılık & Stres Yönetimi" : label;
const recordTime = (item:any) => { const value=item?.date||item?.Tarih||item?.createdAt||item?.timestamp; const time=value?new Date(value).getTime():0; return Number.isFinite(time)?time:0; };

export default function YetenekMatrisiPage() {
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [talentData, setTalentData] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState("");

  const reload = async () => {
    const org = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    setOrgData(org);
    setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
    let talent = getStorageData<any[]>("hr_talent_matrix", []);
    try {
      const response = await fetch(`/api/talent-matrix?_t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        talent = Array.isArray(result) ? result : result.data || [];
        localStorage.setItem("hr_talent_matrix", JSON.stringify(talent));
      }
    } catch {}
    setTalentData(talent);
  };
  useEffect(() => { void reload(); }, []);

  const people = useMemo(() => {
    const names = new Set<string>();
    orgData.forEach((item) => names.add(item["Ad Soyad"]));
    talentData.forEach((item) => names.add(item.name || item["Ad Soyad"] || item.Personel || item.target));
    return Array.from(names).filter(Boolean).map((name) => {
      const org = orgData.find((item) => item["Ad Soyad"] === name) || {};
      const talent = talentData.find((item) => (item.name || item["Ad Soyad"] || item.Personel || item.target) === name) || {};
      const evaluations = history.filter((item) => (item.Personel || item.target) === name).sort((a,b)=>recordTime(b)-recordTime(a));
      const latest = evaluations[0] || {};
      const person = {
        ...org, ...talent, ...latest,
        "Ad Soyad": name,
        Pozisyon: org.Pozisyon || talent.position || talent.Pozisyon || "",
        Departman: org.Departman || talent.department || talent.Departman || "",
        Performans: Number(talent.performance ?? talent.Performans ?? latest.Performans ?? org.Performans ?? 0),
        career_aspiration: org.career_aspiration ?? talent.career_aspiration,
        mobility_willingness: org.mobility_willingness ?? talent.mobility_willingness,
      };
      const potential = calculatePotentialIndex(person);
      return { ...person, calculatedPotential: potential, box: getNineBox(person.Performans || 0, potential.score) };
    });
  }, [orgData, talentData, history]);

  useEffect(() => { if (!selectedName && people.length) setSelectedName(people[0]["Ad Soyad"]); }, [people, selectedName]);
  const selected = useMemo(() => people.find((person) => person["Ad Soyad"] === selectedName), [people, selectedName]);
  const plotData = people.filter((p) => p.Performans > 0).map((p) => ({ name:p["Ad Soyad"], department:p.Departman, position:p.Pozisyon, performance:p.Performans, potential:p.calculatedPotential.score, confidence:p.calculatedPotential.confidence, box:p.box }));
  const boxCounts = useMemo(() => people.reduce((acc:Record<string,number>, p) => { acc[p.box] = (acc[p.box] || 0) + 1; return acc; }, {}), [people]);

  const competencies = selected ? extractCompetencyMap(selected) : {};
  const targetResolution = selected ? resolveTargetProfile(selected.Pozisyon) : { profile:{}, source:"generic" as const, referenceCount:0 };
  const gapData = Object.entries(targetResolution.profile).map(([label, expected]) => {
    const code = LABEL_TO_CODE[label] || label;
    const rawActual = competencies[code];
    const hasActual = Number.isFinite(rawActual);
    const actual = hasActual ? Number(rawActual) : 0;
    const gap = hasActual ? Number(expected) - actual : Number.NaN;
    return { label: displayCompetencyLabel(label), actual, expected:Number(expected), gap, hasActual };
  }).sort((a,b) => {
    if (a.hasActual !== b.hasActual) return a.hasActual ? -1 : 1;
    return (Number.isFinite(b.gap)?b.gap:-99) - (Number.isFinite(a.gap)?a.gap:-99);
  });

  const targetSourceText = targetResolution.source === "exact"
    ? "Pozisyona özel kurum rol profili"
    : targetResolution.source === "family-level"
      ? `${targetResolution.referenceCount} benzer job family + seviye rolünden türetildi`
      : targetResolution.source === "level"
        ? `${targetResolution.referenceCount} aynı seviye rolünden türetildi`
        : "Genel rol havuzundan türetilmiş geçici hedef";

  const updateProfileSignal = (field:"career_aspiration"|"mobility_willingness", value:number) => {
    if (!selected) return;
    const next = orgData.map((item) => item["Ad Soyad"] === selectedName ? { ...item, [field]: value } : item);
    setOrgData(next); setStorageData(STORAGE_KEYS.ORG_CHART, next); window.dispatchEvent(new CustomEvent("dataUpdated"));
  };

  const aiContext = selected ? {
    module: "talent_matrix",
    employee: {
      position: selected.Pozisyon,
      department: selected.Departman,
      performance: selected.Performans,
      nineBox: selected.box,
    },
    potential: {
      score: selected.calculatedPotential.score,
      label: selected.calculatedPotential.label,
      confidence: selected.calculatedPotential.confidence,
      factors: selected.calculatedPotential.factors,
      missingInputs: selected.calculatedPotential.missingInputs,
    },
    careerSignals: {
      aspiration: Number(selected.career_aspiration ?? 3),
      mobility: Number(selected.mobility_willingness ?? 3),
    },
    roleTarget: {
      source: targetSourceText,
      topGaps: gapData.filter((item) => item.hasActual && item.gap > 0).slice(0, 4),
      strengths: gapData.filter((item) => item.hasActual).sort((a,b)=>a.gap-b.gap).slice(0,3),
    },
    instruction: "Performans, potansiyel, veri güveni ve rol yetkinlik farklarını birlikte analiz et. Terfi ya da ücret kararı verme; doğrulanması gereken kanıtları ve gelişim aksiyonlarını çıkar.",
  } : {};

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Yetenek karar desteği</p><h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Yetenek Matrisi</h1><p className="mt-1 max-w-4xl text-sm text-slate-500">Potansiyel Endeksi: öğrenme çevikliği %30, analitik/karmaşıklık kapasitesi %20, dayanıklılık & stres yönetimi %15, iletişim & işbirliği %15, kariyer isteği %10 ve mobilite/yeni sorumluluk isteği %10.</p></div><div className="flex gap-2"><Link href="/kariyer" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Kariyer mimarisi</Link><Link href="/yedekleme" className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Halefiyet</Link></div></div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Toplam çalışan" value={people.length}/><Metric label="Yıldız Oyuncu" value={boxCounts["Yıldız Oyuncu"] || 0}/><Metric label="Yüksek Potansiyel" value={(boxCounts["Yüksek Potansiyel"] || 0)+(boxCounts["Potansiyel Yatırımı"] || 0)}/><Metric label="Kritik Risk" value={boxCounts["Kritik Risk"] || 0}/></div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">9-Box Yetenek Haritası</h2><p className="text-xs text-slate-500">X: Performans · Y: Çok faktörlü potansiyel</p></div><Users className="h-4 w-4 text-indigo-600"/></div><div className="h-[430px]"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:18,right:22,bottom:28,left:10}}><CartesianGrid strokeDasharray="4 6"/><ReferenceArea x1={1} x2={3} y1={1} y2={3} fill="#fee2e2" fillOpacity={0.35}/><ReferenceArea x1={3} x2={4} y1={3} y2={4} fill="#fef3c7" fillOpacity={0.3}/><ReferenceArea x1={4} x2={5} y1={4} y2={5} fill="#dcfce7" fillOpacity={0.38}/><XAxis type="number" dataKey="performance" domain={[1,5]} ticks={[1,2,3,4,5]} name="Performans" label={{value:"Performans",position:"insideBottom",offset:-16}}/><YAxis type="number" dataKey="potential" domain={[1,5]} ticks={[1,2,3,4,5]} name="Potansiyel" label={{value:"Potansiyel",angle:-90,position:"insideLeft"}}/><ReferenceLine x={3} stroke="#94a3b8"/><ReferenceLine x={4} stroke="#94a3b8"/><ReferenceLine y={3} stroke="#94a3b8"/><ReferenceLine y={4} stroke="#94a3b8"/><Tooltip cursor={{strokeDasharray:"3 3"}} content={({active,payload}:any)=>active&&payload?.[0]?<div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl"><p className="font-semibold">{payload[0].payload.name}</p><p>{payload[0].payload.position}</p><p className="mt-1">Performans: {payload[0].payload.performance.toFixed(1)}</p><p>Potansiyel: {payload[0].payload.potential.toFixed(2)} · güven %{payload[0].payload.confidence}</p><p className="mt-1 font-semibold text-indigo-700">{payload[0].payload.box}</p></div>:null}/><Scatter data={plotData} fill="#4f46e5" onClick={(point:any)=>point?.name&&setSelectedName(point.name)}/></ScatterChart></ResponsiveContainer></div></div>

        <div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><label className="text-xs font-medium text-slate-500">Çalışan<select value={selectedName} onChange={(e)=>setSelectedName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{people.map((p)=><option key={p["Ad Soyad"]}>{p["Ad Soyad"]}</option>)}</select></label>{selected&&<div className="mt-4"><p className="text-lg font-semibold">{selected["Ad Soyad"]}</p><p className="text-xs text-slate-500">{selected.Pozisyon} · {selected.Departman}</p><span className="mt-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{selected.box}</span><div className="mt-4 grid grid-cols-2 gap-2"><Mini label="Performans" value={selected.Performans.toFixed(1)}/><Mini label="Potansiyel" value={selected.calculatedPotential.score.toFixed(2)}/><Mini label="Veri güveni" value={`%${selected.calculatedPotential.confidence}`}/><Mini label="Potansiyel bandı" value={selected.calculatedPotential.label}/></div></div>}</div>
        {selected&&<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="text-sm font-semibold">Potansiyel girdileri</h3><p className="mt-1 text-xs text-slate-500">Öz-bildirim alanları girilmezse nötr 3,0 kullanılır ve güven skoru düşer.</p><Signal label="Kariyer isteği" value={Number(selected.career_aspiration ?? 3)} onChange={(v)=>updateProfileSignal("career_aspiration",v)}/><Signal label="Mobilite / yeni sorumluluk isteği" value={Number(selected.mobility_willingness ?? 3)} onChange={(v)=>updateProfileSignal("mobility_willingness",v)}/></div>}</div>
      </div>

      {selected&&<div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Brain className="h-4 w-4 text-indigo-600"/><h2 className="text-sm font-semibold">Potansiyel faktörleri</h2></div><div className="mt-4 space-y-3">{selected.calculatedPotential.factors.map((factor:any)=><div key={factor.key}><div className="flex justify-between text-xs"><span>{factor.label} <span className="text-slate-400">%{Math.round(factor.weight*100)}</span></span><strong>{factor.score.toFixed(1)}</strong></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${factor.score/5*100}%`}}/></div></div>)}</div>{selected.calculatedPotential.missingInputs.length>0&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Eksik veri: {selected.calculatedPotential.missingInputs.join(", ")}</p>}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-indigo-600"/><h2 className="text-sm font-semibold">Rol yetkinlik farkı</h2></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${targetResolution.source==="exact"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{targetResolution.source==="exact"?"ROL PROFİLİ":"TÜRETİLMİŞ HEDEF"}</span></div><p className="mt-1 text-[10px] leading-4 text-slate-400">{targetSourceText}</p><div className="mt-4 space-y-2">{gapData.slice(0,10).map((item)=><div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60"><span>{item.label}</span>{item.hasActual?<span className={item.gap>0.5?"font-semibold text-red-600":item.gap>0?"font-semibold text-amber-600":"font-semibold text-emerald-600"}>{item.actual.toFixed(1)} / {item.expected.toFixed(1)} · {item.gap>0?`-${item.gap.toFixed(1)}`:"uyumlu"}</span>:<span className="font-semibold text-slate-400">Ölçüm yok · hedef {item.expected.toFixed(1)}</span>}</div>)}</div>{!gapData.length&&<div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">Bu rol için hedef yetkinlik profili üretilemedi. Pozisyon adı ve job level eşleşmesini kontrol edin.</div>}</div>
      </div>}

      {selected&&<AIDecisionSupport
        kind="talent"
        context={aiContext}
        resetKey={selectedName}
        title="AI Yetenek Karar Desteği"
        description="Performans, potansiyel, 9-box konumu, veri güveni ve rol yetkinlik farklarını birlikte sentezler. AI terfi kararı vermez; güçlü kanıtları, veri açıklarını ve doğrulama aksiyonlarını gösterir."
        buttonLabel="Yetenek analizini oluştur"
        questionTitle="Yönetici doğrulama soruları"
      />}
    </div>
  );
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>}
function Mini({label,value}:{label:string;value:string|number}){return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
function Signal({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <div className="mt-4"><div className="flex justify-between text-xs"><span>{label}</span><strong>{value.toFixed(1)} / 5</strong></div><input type="range" min="1" max="5" step="0.5" value={value} onChange={(e)=>onChange(Number(e.target.value))} className="mt-2 w-full"/></div>}
