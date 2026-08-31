"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Brain, Database, ShieldCheck, Target, Users } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { extractCompetencyMap } from "../../../lib/hr/talentPotential";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import { buildTalentDecisionSnapshot, type TalentDecisionSnapshot } from "../../../lib/hr/talentDecisionChain";
import {
  fetchSaasTalentWorkspace,
  SAAS_DATA_MODE,
  updateSaasTalentProfile,
  type EmployeeRow,
  type EvaluationRow,
} from "../../../lib/hr/saasWorkforceClient";

const LABEL_TO_CODE: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG",
  "Analitik Düşünme": "ANA",
  "Sonuç Odaklılık": "RES",
  "Detaylara Özen": "DET",
  "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH",
  "Öz-Disiplin": "DIS",
  "Dayanıklılık & Stres Yönetimi": "STR",
  "Stratejik Bakış": "STR",
  "Takım Çalışması": "TEA",
  "İletişim Becerileri": "COM",
};

const BOX_LABELS = [
  ["Potansiyel Yatırımı", "Yüksek Potansiyel", "Yıldız Oyuncu"],
  ["Gelişim Odağı", "Çekirdek Yetenek", "Güçlü Performans"],
  ["Kritik Gelişim", "İstikrarlı Katkı", "Uzman Katkı"],
] as const;

type TalentPerson = EmployeeRow & {
  snapshot: TalentDecisionSnapshot;
  box: string;
};

function scoreBand(value: number) {
  if (value >= 4) return 2;
  if (value >= 3) return 1;
  return 0;
}

function gridCell(performance: number, potential: number) {
  const x = scoreBand(performance);
  const y = scoreBand(potential);
  return { x, y, label: BOX_LABELS[2 - y][x] };
}

function latestEvaluation(person: EmployeeRow, history: EvaluationRow[]) {
  return history
    .filter((record) => String(record.employee_id || "") === String(person.id) || record.Personel === person["Ad Soyad"])
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0] || null;
}

export default function YetenekMatrisiPage() {
  const [orgData, setOrgData] = useState<EmployeeRow[]>([]);
  const [history, setHistory] = useState<EvaluationRow[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSignal, setSavingSignal] = useState(false);
  const [loadError, setLoadError] = useState("");

  const reload = async () => {
    setLoadError("");
    try {
      if (SAAS_DATA_MODE) {
        const workspace = await fetchSaasTalentWorkspace();
        setOrgData(workspace.employees);
        setHistory(workspace.evaluations);
      } else {
        setOrgData(getStorageData<EmployeeRow[]>(STORAGE_KEYS.ORG_CHART, []));
        setHistory(getStorageData<EvaluationRow[]>(STORAGE_KEYS.HISTORY_360, []));
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Yetenek verisi yüklenemedi.");
      setOrgData([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    const refresh = () => { void reload(); };
    window.addEventListener("dataUpdated", refresh);
    window.addEventListener("talentMatrixUpdated", refresh);
    return () => {
      window.removeEventListener("dataUpdated", refresh);
      window.removeEventListener("talentMatrixUpdated", refresh);
    };
  }, []);

  const people = useMemo<TalentPerson[]>(() => orgData.map((person) => {
    const snapshot = buildTalentDecisionSnapshot(person, history);
    return { ...person, snapshot, box: snapshot.talent.nineBox };
  }), [orgData, history]);

  useEffect(() => {
    if (!people.length) return;
    if (!people.some((person) => person["Ad Soyad"] === selectedName)) {
      setSelectedName(people[0]["Ad Soyad"]);
    }
  }, [people, selectedName]);

  const selected = useMemo(
    () => people.find((person) => person["Ad Soyad"] === selectedName) || null,
    [people, selectedName],
  );

  const boxCounts = useMemo(() => people.reduce<Record<string, number>>((acc, person) => {
    acc[person.box] = (acc[person.box] || 0) + 1;
    return acc;
  }, {}), [people]);

  const plotted = useMemo(() => people.filter(
    (person) => person.snapshot.performance.score > 0 && person.snapshot.talent.potential.score > 0,
  ), [people]);
  const missingDataCount = people.length - plotted.length;

  const selectedLatest = selected ? latestEvaluation(selected, history) : null;
  const selectedComposite = selected ? { ...selected, ...(selectedLatest || {}) } : null;
  const competencies = selectedComposite ? extractCompetencyMap(selectedComposite) : {};
  const targetResolution = selected
    ? resolveTargetProfile(selected.Pozisyon)
    : { profile: {}, source: "generic" as const, referenceCount: 0 };
  const gapData = Object.entries(targetResolution.profile)
    .map(([label, expected]) => {
      const code = LABEL_TO_CODE[label] || label;
      const actual = Number(competencies[code] || 0);
      const hasActual = actual > 0;
      const gap = hasActual ? Number(expected) - actual : null;
      return {
        label: label === "Stratejik Bakış" ? "Dayanıklılık & Stres Yönetimi" : label,
        actual,
        expected: Number(expected),
        gap,
        hasActual,
      };
    })
    .sort((a, b) => Number(b.gap ?? -99) - Number(a.gap ?? -99));

  const aspiration = selected?.snapshot.profile.aspiration || 0;
  const mobility = selected?.snapshot.profile.mobility || 0;

  const updateProfileSignal = async (
    field: "career_aspiration" | "mobility_willingness",
    value: number,
  ) => {
    if (!selected) return;
    setSavingSignal(true);
    try {
      if (SAAS_DATA_MODE) {
        await updateSaasTalentProfile(String(selected.id), { [field]: value || null });
        await reload();
        return;
      }
      const nextOrg = orgData.map((item) => item["Ad Soyad"] === selectedName
        ? { ...item, [field]: value || undefined }
        : item);
      setOrgData(nextOrg);
      setStorageData(STORAGE_KEYS.ORG_CHART, nextOrg);
      window.dispatchEvent(new CustomEvent("dataUpdated"));
      window.dispatchEvent(new CustomEvent("talentMatrixUpdated"));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Yetenek profili güncellenemedi.");
    } finally {
      setSavingSignal(false);
    }
  };

  const aiContext = selected ? {
    module: "talent_matrix",
    employee: {
      position: selected.Pozisyon,
      department: selected.Departman,
      performance: selected.snapshot.performance.score || null,
      nineBox: selected.box,
    },
    potential: {
      score: selected.snapshot.talent.potential.score || null,
      label: selected.snapshot.talent.potential.label,
      confidence: selected.snapshot.talent.potential.confidence,
      factors: selected.snapshot.talent.potential.factors.map((factor) => ({
        label: factor.label,
        available: factor.available,
        score: factor.available ? factor.score : null,
      })),
      missingInputs: selected.snapshot.talent.potential.missingInputs,
    },
    evidence: {
      score: selected.snapshot.evidence.score,
      band: selected.snapshot.evidence.band,
      missingSignals: selected.snapshot.evidence.missingSignals,
    },
    careerSignals: { aspiration: aspiration || null, mobility: mobility || null },
    roleTarget: {
      source: targetResolution.source,
      topGaps: gapData.filter((item) => item.hasActual && Number(item.gap) > 0).slice(0, 4),
    },
    instruction: "Performans, potansiyel, Evidence Score ve rol yetkinlik farklarını birlikte analiz et. Eksik kariyer/mobilite verisini orta değer kabul etme. Terfi veya ücret kararı verme; doğrulanacak kanıtları ve gelişim aksiyonlarını çıkar.",
  } : {};

  if (loading) return <div className="enterprise-card p-8 text-sm text-slate-500">Yetenek çalışma alanı yükleniyor…</div>;
  if (!people.length) {
    return <div className="enterprise-card p-8 text-center"><Users className="mx-auto h-8 w-8 text-slate-300"/><h2 className="mt-3 text-sm font-semibold">Yetenek verisi için çalışan bulunamadı</h2><p className="mt-1 text-xs text-slate-500">SaaS modunda bu ekran yalnız tenant&apos;ınıza ait çalışan ve performans kayıtlarını kabul eder.</p></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Yetenek karar desteği</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Yetenek & 9-Box</h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">Potansiyel; gerçek yetkinlik kanıtı, kariyer isteği ve mobilite sinyallerinden oluşur. Eksik veri nötr puanla doldurulmaz; güven seviyesi düşer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAAS_DATA_MODE&&<span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5"/>Tenant veri katmanı</span>}
          <Link href="/kariyer" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Kariyer yolu</Link>
          <Link href="/yedekleme" className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Halefiyet</Link>
        </div>
      </div>

      {loadError&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{loadError}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Toplam çalışan" value={people.length}/>
        <Metric label="Yıldız Oyuncu" value={boxCounts["Yıldız Oyuncu"] || 0}/>
        <Metric label="Yüksek Potansiyel" value={(boxCounts["Yüksek Potansiyel"] || 0) + (boxCounts["Potansiyel Yatırımı"] || 0)}/>
        <Metric label="Veri Eksik" value={missingDataCount}/>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <section className="enterprise-card p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">9-Box Yetenek Haritası</h2><p className="mt-1 text-xs text-slate-500">Yatay: performans · dikey: potansiyel. Yalnızca iki skor da mevcut olan çalışanlar yerleştirilir.</p></div><Brain className="h-4 w-4 text-indigo-600"/></div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {BOX_LABELS.flatMap((row, rowIndex) => row.map((label, columnIndex) => {
              const occupants = plotted.filter((person) => {
                const cell = gridCell(person.snapshot.performance.score, person.snapshot.talent.potential.score);
                return cell.y === 2 - rowIndex && cell.x === columnIndex;
              });
              return <div key={label} className="min-h-[150px] rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[.06em] text-slate-500">{label}</p><span className="text-[10px] font-semibold text-slate-400">{occupants.length}</span></div>
                <div className="mt-3 space-y-2">{occupants.map((person) => <button key={String(person.id)} type="button" onClick={()=>setSelectedName(person["Ad Soyad"])} className={`w-full rounded-xl border px-3 py-2 text-left transition ${selectedName===person["Ad Soyad"]?"border-indigo-300 bg-white shadow-sm":"border-transparent bg-white/70 hover:border-slate-200"}`}><p className="truncate text-xs font-semibold text-slate-800">{person["Ad Soyad"]}</p><p className="mt-0.5 text-[10px] text-slate-400">P {person.snapshot.performance.score.toFixed(1)} · Pot {person.snapshot.talent.potential.score.toFixed(1)}</p></button>)}</div>
              </div>;
            }))}
          </div>
          {missingDataCount>0&&<p className="mt-3 text-[11px] text-slate-500">{missingDataCount} çalışan yeterli performans/potansiyel kanıtı olmadığı için matrise yerleştirilmedi.</p>}
        </section>

        <aside className="space-y-4">
          <section className="enterprise-card p-5">
            <label className="text-xs font-medium text-slate-500">Çalışan<select value={selectedName} onChange={(event)=>setSelectedName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{people.map((person)=><option key={String(person.id)}>{person["Ad Soyad"]}</option>)}</select></label>
            {selected&&<div className="mt-4"><p className="text-lg font-semibold">{selected["Ad Soyad"]}</p><p className="text-xs text-slate-500">{selected.Pozisyon} · {selected.Departman}</p><span className="mt-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{selected.box}</span><div className="mt-4 grid grid-cols-2 gap-2"><Mini label="Performans" value={selected.snapshot.performance.score>0?selected.snapshot.performance.score.toFixed(1):"—"}/><Mini label="Potansiyel" value={selected.snapshot.talent.potential.score>0?selected.snapshot.talent.potential.score.toFixed(2):"—"}/><Mini label="Potansiyel güveni" value={`%${selected.snapshot.talent.potential.confidence}`}/><Mini label="Evidence Score" value={`%${selected.snapshot.evidence.score}`}/></div></div>}
          </section>

          {selected&&<section className="enterprise-card p-5"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-indigo-600"/><h3 className="text-sm font-semibold">Potansiyel profil girdileri</h3></div><p className="mt-1 text-xs text-slate-500">Kariyer isteği ve mobilite eksikse sistem 3,0 varsaymaz.</p><SignalSlider label="Kariyer isteği" value={aspiration} disabled={savingSignal} onChange={(value)=>void updateProfileSignal("career_aspiration",value)}/><SignalSlider label="Mobilite / yeni sorumluluk isteği" value={mobility} disabled={savingSignal} onChange={(value)=>void updateProfileSignal("mobility_willingness",value)}/></section>}
        </aside>
      </div>

      {selected&&<div className="grid gap-5 lg:grid-cols-2">
        <section className="enterprise-card p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-violet-600"/><h2 className="text-sm font-semibold">Rol yetkinlik farkları</h2></div><p className="mt-1 text-xs text-slate-500">Hedef kaynağı: {targetResolution.source} · {targetResolution.referenceCount} referans rol</p><div className="mt-4 space-y-2">{gapData.filter((item)=>item.hasActual&&Number(item.gap)>0).slice(0,6).map((item)=><div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"><span>{item.label}</span><span className="font-semibold text-amber-700">{item.actual.toFixed(1)} → {item.expected.toFixed(1)}</span></div>)}{!gapData.some((item)=>item.hasActual&&Number(item.gap)>0)&&<p className="text-xs text-slate-500">Ölçülmüş pozitif rol açığı yok veya yetkinlik verisi henüz yeterli değil.</p>}</div></section>
        <section className="enterprise-card p-5"><h2 className="text-sm font-semibold">Kanıt durumu</h2><div className="mt-4 grid grid-cols-2 gap-2"><Mini label="Performans ölçümü" value={String(selected.snapshot.performance.historyCount)}/><Mini label="Trend" value={selected.snapshot.performance.trendDirection}/><Mini label="Yetkinlik kapsamı" value={`%${selected.snapshot.competency.coverage}`}/><Mini label="Evidence bandı" value={selected.snapshot.evidence.band}/></div><div className="mt-4 space-y-2">{selected.snapshot.signals.slice(0,5).map((signal)=><p key={signal} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">{signal}</p>)}</div></section>
      </div>}

      {selected&&<AIDecisionSupport kind="talent" context={aiContext} resetKey={selectedName} title="AI Yetenek Kalibrasyonu" description="Performans, potansiyel, Evidence Score ve rol farklarını birlikte inceler; terfi veya ücret kararı vermez." buttonLabel="Yetenek analizini oluştur" questionTitle="Kalibrasyon soruları"/>}
    </div>
  );
}

function Metric({label,value}:{label:string;value:number}){
  return <div className="enterprise-card p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>;
}

function Mini({label,value}:{label:string;value:string}){
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>;
}

function SignalSlider({label,value,disabled,onChange}:{label:string;value:number;disabled:boolean;onChange:(value:number)=>void}){
  return <div className="mt-4"><div className="flex items-center justify-between text-xs"><span className="font-medium text-slate-600">{label}</span><span className="font-semibold text-indigo-700">{value>0?`${value.toFixed(1)} / 5`:"Eksik"}</span></div><input disabled={disabled} type="range" min="0" max="5" step="1" value={value} onChange={(event)=>onChange(Number(event.target.value))} className="mt-2 w-full disabled:opacity-50"/><div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>Eksik</span><span>Yüksek</span></div></div>;
}
