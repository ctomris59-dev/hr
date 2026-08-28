"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Brain, Database, Target, Users } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { extractCompetencyMap } from "../../../lib/hr/talentPotential";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import { buildTalentDecisionSnapshot } from "../../../lib/hr/talentDecisionChain";
import { evaluationsForEmployee } from "../../../lib/hr/employeeIdentity";
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "@/components/charts/recharts";

const LABEL_TO_CODE: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG", "Analitik Düşünme": "ANA", "Sonuç Odaklılık": "RES", "Detaylara Özen": "DET", "Sürekli Öğrenme": "LRN", "Etik ve Uyum": "ETH", "Öz-Disiplin": "DIS", "Dayanıklılık & Stres Yönetimi": "STR", "Stratejik Bakış": "STR", "Takım Çalışması": "TEA", "İletişim Becerileri": "COM",
};
const displayCompetencyLabel = (label: string) => label === "Stratejik Bakış" ? "Dayanıklılık & Stres Yönetimi" : label;
const validFive = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null; };

export default function YetenekMatrisiPage() {
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState("");

  const reload = () => {
    setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
    setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
  };
  useEffect(() => {
    reload();
    const refresh = () => reload();
    window.addEventListener("dataUpdated", refresh);
    window.addEventListener("talentMatrixUpdated", refresh);
    return () => { window.removeEventListener("dataUpdated", refresh); window.removeEventListener("talentMatrixUpdated", refresh); };
  }, []);

  const people = useMemo(() => orgData.map((person) => {
    const evaluations = evaluationsForEmployee(person, history);
    const latest = evaluations[0] || {};
    const composite = { ...person, ...latest, "Ad Soyad": person["Ad Soyad"], Pozisyon: person.Pozisyon, Departman: person.Departman };
    const snapshot = buildTalentDecisionSnapshot(person, history);
    return { ...composite, snapshot, calculatedPotential: snapshot.talent.potential, box: snapshot.talent.nineBox, Performans: snapshot.performance.score };
  }), [orgData, history]);

  useEffect(() => {
    if (!people.length) { setSelectedName(""); return; }
    if (!people.some((person) => person["Ad Soyad"] === selectedName)) setSelectedName(people[0]["Ad Soyad"]);
  }, [people, selectedName]);

  const selected = useMemo(() => people.find((person) => person["Ad Soyad"] === selectedName), [people, selectedName]);
  const plotData = people
    .filter((person) => person.snapshot.performance.score > 0 && person.snapshot.talent.potential.score > 0)
    .map((person) => ({
      name: person["Ad Soyad"], department: person.Departman, position: person.Pozisyon,
      performance: person.snapshot.performance.score, potential: person.snapshot.talent.potential.score,
      confidence: person.snapshot.talent.potential.confidence, evidence: person.snapshot.evidence.score, box: person.box,
    }));
  const boxCounts = useMemo(() => people.reduce((acc: Record<string, number>, person) => {
    acc[person.box] = (acc[person.box] || 0) + 1; return acc;
  }, {}), [people]);

  const selectedEvaluations = selected ? evaluationsForEmployee(selected, history) : [];
  const selectedLatest = selectedEvaluations[0] || {};
  const selectedComposite = selected ? { ...selected, ...selectedLatest } : null;
  const competencies = selectedComposite ? extractCompetencyMap(selectedComposite) : {};
  const targetResolution = selected ? resolveTargetProfile(selected.Pozisyon) : { profile: {}, source: "generic" as const, referenceCount: 0 };
  const gapData = Object.entries(targetResolution.profile).map(([label, expected]) => {
    const code = LABEL_TO_CODE[label] || label;
    const actualRaw = competencies[code];
    const hasActual = Number.isFinite(actualRaw) && Number(actualRaw) > 0;
    const actual = hasActual ? Number(actualRaw) : 0;
    const gap = hasActual ? Number(expected) - actual : null;
    return { label: displayCompetencyLabel(label), actual, expected: Number(expected), gap, hasActual };
  }).sort((a, b) => {
    if (a.hasActual !== b.hasActual) return a.hasActual ? -1 : 1;
    return Number(b.gap ?? -99) - Number(a.gap ?? -99);
  });

  const targetSourceText = targetResolution.source === "exact"
    ? "Pozisyona özel FutureHR rol profili"
    : targetResolution.source === "family-level"
      ? `${targetResolution.referenceCount} benzer job family + seviye rolünden türetildi`
      : targetResolution.source === "level"
        ? `${targetResolution.referenceCount} aynı seviye rolünden türetildi`
        : "Genel rol havuzundan türetilmiş geçici hedef";

  const updateProfileSignal = (field: "career_aspiration" | "mobility_willingness", value: number) => {
    if (!selected) return;
    const nextOrg = orgData.map((item) => item["Ad Soyad"] === selectedName ? { ...item, [field]: value || undefined } : item);
    let changed = false;
    const nextHistory = history.map((record) => {
      if (changed) return record;
      const recordName = String(record?.Personel || record?.target || record?.["Ad Soyad"] || "");
      if (recordName !== selectedName || record !== selectedEvaluations[0]) return record;
      changed = true;
      return { ...record, [field]: value || undefined };
    });
    setOrgData(nextOrg); setHistory(nextHistory);
    setStorageData(STORAGE_KEYS.ORG_CHART, nextOrg);
    setStorageData(STORAGE_KEYS.HISTORY_360, nextHistory);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
    window.dispatchEvent(new CustomEvent("talentMatrixUpdated"));
  };

  const aspiration = validFive(selected?.snapshot.profile.aspiration) ?? null;
  const mobility = validFive(selected?.snapshot.profile.mobility) ?? null;
  const aiContext = selected ? {
    module: "talent_matrix",
    employee: { position: selected.Pozisyon, department: selected.Departman, performance: selected.snapshot.performance.score || null, nineBox: selected.box },
    potential: {
      score: selected.calculatedPotential.score || null, label: selected.calculatedPotential.label,
      confidence: selected.calculatedPotential.confidence,
      factors: selected.calculatedPotential.factors.map((factor: any) => ({ ...factor, score: factor.available ? factor.score : null })),
      missingInputs: selected.calculatedPotential.missingInputs,
    },
    evidence: { score: selected.snapshot.evidence.score, band: selected.snapshot.evidence.band, missingSignals: selected.snapshot.evidence.missingSignals },
    careerSignals: { aspiration, mobility },
    roleTarget: {
      source: targetSourceText,
      topGaps: gapData.filter((item) => item.hasActual && Number(item.gap) > 0).slice(0, 4),
      strengths: gapData.filter((item) => item.hasActual).sort((a, b) => Number(a.gap) - Number(b.gap)).slice(0, 3),
    },
    instruction: "Performans, potansiyel, Evidence Score ve rol yetkinlik farklarını birlikte analiz et. Eksik kariyer/mobilite verisini 3,0 kabul etme. Terfi veya ücret kararı verme; doğrulanacak kanıtları ve gelişim aksiyonlarını çıkar.",
  } : {};

  if (!people.length) return <div className="enterprise-card p-8 text-center"><Users className="mx-auto h-8 w-8 text-slate-300"/><h2 className="mt-3 text-sm font-semibold">Yetenek verisi için çalışan bulunamadı</h2><p className="mt-1 text-xs text-slate-500">Önce organizasyon verisini yükleyin veya FutureHR V1 demo setini oluşturun.</p></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Yetenek karar desteği</p><h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Yetenek & 9-Box</h1><p className="mt-1 max-w-4xl text-sm text-slate-500">Potansiyel; öğrenme, analitik kapasite, dayanıklılık, işbirliği, kariyer isteği ve mobilite sinyallerinden oluşur. Eksik sinyal nötr puanla doldurulmaz; güven seviyesi düşer.</p></div>
        <div className="flex gap-2"><Link href="/kariyer" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Kariyer yolu</Link><Link href="/yedekleme" className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Halefiyet</Link></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Toplam çalışan" value={people.length}/><Metric label="Yıldız Oyuncu" value={boxCounts["Yıldız Oyuncu"] || 0}/><Metric label="Yüksek Potansiyel" value={(boxCounts["Yüksek Potansiyel"] || 0) + (boxCounts["Potansiyel Yatırımı"] || 0)}/><Metric label="Veri Eksik" value={boxCounts["Veri Eksik"] || 0}/>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">9-Box Yetenek Haritası</h2><p className="text-xs text-slate-500">X: Performans · Y: Çok faktörlü potansiyel · yalnızca yeterli ölçümü olan çalışanlar</p></div><Users className="h-4 w-4 text-indigo-600"/></div>
          <div className="h-[430px]">{plotData.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:18,right:22,bottom:28,left:10}}><CartesianGrid strokeDasharray="4 6"/><ReferenceArea x1={1} x2={3} y1={1} y2={3} fill="#fee2e2" fillOpacity={0.35}/><ReferenceArea x1={3} x2={4} y1={3} y2={4} fill="#fef3c7" fillOpacity={0.3}/><ReferenceArea x1={4} x2={5} y1={4} y2={5} fill="#dcfce7" fillOpacity={0.38}/><XAxis type="number" dataKey="performance" domain={[1,5]} ticks={[1,2,3,4,5]} name="Performans" label={{value:"Performans",position:"insideBottom",offset:-16}}/><YAxis type="number" dataKey="potential" domain={[1,5]} ticks={[1,2,3,4,5]} name="Potansiyel" label={{value:"Potansiyel",angle:-90,position:"insideLeft"}}/><ReferenceLine x={3} stroke="#94a3b8"/><ReferenceLine x={4} stroke="#94a3b8"/><ReferenceLine y={3} stroke="#94a3b8"/><ReferenceLine y={4} stroke="#94a3b8"/><Tooltip cursor={{strokeDasharray:"3 3"}} content={({active,payload}:any)=>active&&payload?.[0]?<div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl"><p className="font-semibold">{payload[0].payload.name}</p><p>{payload[0].payload.position}</p><p className="mt-1">Performans: {payload[0].payload.performance.toFixed(1)}</p><p>Potansiyel: {payload[0].payload.potential.toFixed(2)} · potansiyel güven %{payload[0].payload.confidence}</p><p>Evidence: %{payload[0].payload.evidence}</p><p className="mt-1 font-semibold text-indigo-700">{payload[0].payload.box}</p></div>:null}/><Scatter data={plotData} fill="#4f46e5" onClick={(point:any)=>point?.name&&setSelectedName(point.name)}/></ScatterChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">9-Box için performans ve potansiyel kanıtı henüz yeterli değil.</div>}</div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="text-xs font-medium text-slate-500">Çalışan<select value={selectedName} onChange={(e)=>setSelectedName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{people.map((person)=><option key={person.id ?? person["Ad Soyad"]}>{person["Ad Soyad"]}</option>)}</select></label>
            {selected&&<div className="mt-4"><p className="text-lg font-semibold">{selected["Ad Soyad"]}</p><p className="text-xs text-slate-500">{selected.Pozisyon} · {selected.Departman}</p><span className="mt-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{selected.box}</span><div className="mt-4 grid grid-cols-2 gap-2"><Mini label="Performans" value={selected.snapshot.performance.score > 0 ? selected.snapshot.performance.score.toFixed(1) : "—"}/><Mini label="Potansiyel" value={selected.calculatedPotential.score > 0 ? selected.calculatedPotential.score.toFixed(2) : "—"}/><Mini label="Potansiyel güveni" value={`%${selected.calculatedPotential.confidence}`}/><Mini label="Evidence Score" value={`%${selected.snapshot.evidence.score}`}/></div></div>}
          </div>
          {selected&&<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-indigo-600"/><h3 className="text-sm font-semibold">Potansiyel profil girdileri</h3></div><p className="mt-1 text-xs text-slate-500">Eksik bırakılan kariyer veya mobilite sinyali puana 3,0 eklemez; potansiyel güvenini düşürür.</p><Signal label="Kariyer isteği" value={aspiration ?? 0} onChange={(value)=>updateProfileSignal("career_aspiration",value)}/><Signal label="Mobilite / yeni sorumluluk isteği" value={mobility ?? 0} onChange={(value)=>updateProfileSignal("mobility_willingness",value)}/></div>}
        </div>
      </div>

      {selected&&<div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Brain className="h-4 w-4 text-indigo-600"/><h2 className="text-sm font-semibold">Potansiyel faktörleri</h2></div><div className="mt-4 space-y-3">{selected.calculatedPotential.factors.map((factor:any)=><div key={factor.key}><div className="flex justify-between text-xs"><span>{factor.label} <span className="text-slate-400">%{Math.round(factor.weight*100)}</span></span><strong>{factor.available ? factor.score.toFixed(1) : "—"}</strong></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${factor.available ? "bg-indigo-500" : "bg-slate-200"}`} style={{width:`${factor.available ? factor.score/5*100 : 0}%`}}/></div></div>)}</div>{selected.calculatedPotential.missingInputs.length>0&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Eksik veri: {selected.calculatedPotential.missingInputs.join(", ")}</p>}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-indigo-600"/><h2 className="text-sm font-semibold">Rol yetkinlik farkı</h2></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${targetResolution.source==="exact"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{targetResolution.source==="exact"?"ROL PROFİLİ":"TÜRETİLMİŞ HEDEF"}</span></div><p className="mt-1 text-[10px] leading-4 text-slate-400">{targetSourceText}</p><div className="mt-4 space-y-2">{gapData.slice(0,10).map((item)=><div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60"><span>{item.label}</span>{item.hasActual?<span className={Number(item.gap)>0.5?"font-semibold text-red-600":Number(item.gap)>0?"font-semibold text-amber-600":"font-semibold text-emerald-600"}>{item.actual.toFixed(1)} / {item.expected.toFixed(1)} · {Number(item.gap)>0?`-${Number(item.gap).toFixed(1)}`:"uyumlu"}</span>:<span className="font-semibold text-slate-400">Ölçüm yok · hedef {item.expected.toFixed(1)}</span>}</div>)}</div></div>
      </div>}

      {selected&&<AIDecisionSupport kind="talent" context={aiContext} resetKey={selectedName} title="AI Yetenek Karar Desteği" description="Performans, potansiyel, 9-box, Evidence Score ve rol yetkinlik farklarını aynı karar zincirinden sentezler. Eksik veriyi ortalama saymaz ve terfi kararı vermez." buttonLabel="Yetenek analizini oluştur" questionTitle="Yönetici doğrulama soruları"/>}
    </div>
  );
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>}
function Mini({label,value}:{label:string;value:string|number}){return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
function Signal({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <div className="mt-4"><div className="flex justify-between text-xs"><span>{label}</span><strong>{value > 0 ? `${value.toFixed(1)} / 5` : "Veri yok"}</strong></div><input type="range" min="0" max="5" step="0.5" value={value} onChange={(e)=>onChange(Number(e.target.value))} className="mt-2 w-full"/><p className="mt-1 text-[9px] text-slate-400">0 = veri yok · 1–5 = teyit edilmiş profil sinyali</p></div>}
