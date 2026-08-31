"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Database,
  Search,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
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

const ALL_BOXES = BOX_LABELS.flat();

const BOX_TONES: Record<string, { surface: string; accent: string; badge: string }> = {
  "Potansiyel Yatırımı": { surface: "bg-sky-50/70", accent: "bg-sky-500", badge: "bg-sky-100 text-sky-800" },
  "Yüksek Potansiyel": { surface: "bg-cyan-50/70", accent: "bg-cyan-500", badge: "bg-cyan-100 text-cyan-800" },
  "Yıldız Oyuncu": { surface: "bg-emerald-50/75", accent: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
  "Gelişim Odağı": { surface: "bg-amber-50/65", accent: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
  "Çekirdek Yetenek": { surface: "bg-slate-50/80", accent: "bg-slate-500", badge: "bg-slate-200 text-slate-800" },
  "Güçlü Performans": { surface: "bg-teal-50/70", accent: "bg-teal-500", badge: "bg-teal-100 text-teal-800" },
  "Kritik Gelişim": { surface: "bg-rose-50/65", accent: "bg-rose-500", badge: "bg-rose-100 text-rose-800" },
  "İstikrarlı Katkı": { surface: "bg-stone-50/80", accent: "bg-stone-500", badge: "bg-stone-200 text-stone-800" },
  "Uzman Katkı": { surface: "bg-violet-50/65", accent: "bg-violet-500", badge: "bg-violet-100 text-violet-800" },
};

type TalentPerson = EmployeeRow & {
  snapshot: TalentDecisionSnapshot;
  box: string;
};

type DrawerSort = "potential" | "performance" | "name";

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") || "")
    .join("");
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dominantDepartment(people: TalentPerson[]) {
  const counts = new Map<string, number>();
  people.forEach((person) => {
    const department = String(person.Departman || "Belirtilmedi");
    counts.set(department, (counts.get(department) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
}

export default function YetenekMatrisiPage() {
  const [orgData, setOrgData] = useState<EmployeeRow[]>([]);
  const [history, setHistory] = useState<EvaluationRow[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSignal, setSavingSignal] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeBox, setActiveBox] = useState<string | null>(null);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [drawerDepartment, setDrawerDepartment] = useState("");
  const [drawerSort, setDrawerSort] = useState<DrawerSort>("potential");
  const [drawerLimit, setDrawerLimit] = useState(60);

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

  useEffect(() => {
    if (!activeBox) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveBox(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeBox]);

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

  const plotted = useMemo(() => people.filter(
    (person) => person.snapshot.performance.score > 0 && person.snapshot.talent.potential.score > 0,
  ), [people]);
  const missingDataCount = people.length - plotted.length;

  const matrixBuckets = useMemo(() => {
    const buckets = Object.fromEntries(ALL_BOXES.map((label) => [label, [] as TalentPerson[]])) as Record<string, TalentPerson[]>;
    plotted.forEach((person) => {
      const cell = gridCell(person.snapshot.performance.score, person.snapshot.talent.potential.score);
      buckets[cell.label].push(person);
    });
    Object.values(buckets).forEach((bucket) => bucket.sort((a, b) =>
      b.snapshot.talent.potential.score - a.snapshot.talent.potential.score
      || b.snapshot.performance.score - a.snapshot.performance.score
      || a["Ad Soyad"].localeCompare(b["Ad Soyad"], "tr"),
    ));
    return buckets;
  }, [plotted]);

  const boxCounts = useMemo(() => Object.fromEntries(
    ALL_BOXES.map((label) => [label, matrixBuckets[label]?.length || 0]),
  ) as Record<string, number>, [matrixBuckets]);

  const drawerPeople = useMemo(() => activeBox ? matrixBuckets[activeBox] || [] : [], [activeBox, matrixBuckets]);
  const drawerDepartments = useMemo(() => Array.from(new Set(drawerPeople.map((person) => String(person.Departman || "Belirtilmedi"))))
    .sort((a, b) => a.localeCompare(b, "tr")), [drawerPeople]);
  const filteredDrawerPeople = useMemo(() => {
    const query = drawerQuery.trim().toLocaleLowerCase("tr-TR");
    return drawerPeople
      .filter((person) => !drawerDepartment || String(person.Departman || "Belirtilmedi") === drawerDepartment)
      .filter((person) => !query || `${person["Ad Soyad"]} ${person.Pozisyon || ""} ${person.Departman || ""}`.toLocaleLowerCase("tr-TR").includes(query))
      .sort((a, b) => {
        if (drawerSort === "name") return a["Ad Soyad"].localeCompare(b["Ad Soyad"], "tr");
        if (drawerSort === "performance") return b.snapshot.performance.score - a.snapshot.performance.score;
        return b.snapshot.talent.potential.score - a.snapshot.talent.potential.score;
      });
  }, [drawerPeople, drawerDepartment, drawerQuery, drawerSort]);

  const openBox = (label: string) => {
    if (!(matrixBuckets[label]?.length > 0)) return;
    setActiveBox(label);
    setDrawerQuery("");
    setDrawerDepartment("");
    setDrawerSort("potential");
    setDrawerLimit(60);
  };

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
          <p className="mt-1 max-w-4xl text-sm text-slate-500">Potansiyel; gerçek yetkinlik kanıtı, kariyer isteği ve mobilite sinyallerinden oluşur. Matris sabit portföy görünümüdür; çalışan detayları hücreyi büyütmeden ayrı panelde incelenir.</p>
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

      <section className="enterprise-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><h2 className="text-sm font-semibold">9-Box Yetenek Haritası</h2><Brain className="h-4 w-4 text-indigo-600"/></div>
            <p className="mt-1 text-xs text-slate-500">Yatay: performans → · dikey: potansiyel ↑. Hücreler sabit kalır; detay için dolu bir hücreyi açın.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">{plotted.length} yerleşen</span>
            {missingDataCount>0&&<span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">{missingDataCount} veri eksik</span>}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-1">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-3 gap-2.5">
              {BOX_LABELS.flatMap((row) => row.map((label) => {
                const occupants = matrixBuckets[label] || [];
                return <NineBoxCell key={label} label={label} people={occupants} total={plotted.length} onOpen={()=>openBox(label)}/>;
              }))}
            </div>
            <div className="mt-3 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[.08em] text-slate-400">
              <span>Düşük performans</span><span>Performans →</span><span>Yüksek performans</span>
            </div>
          </div>
        </div>
        {missingDataCount>0&&<p className="mt-3 text-[11px] text-slate-500">{missingDataCount} çalışan yeterli performans/potansiyel kanıtı olmadığı için matrise yerleştirilmedi.</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <section className="enterprise-card p-5">
          <label className="text-xs font-medium text-slate-500">İncelenen çalışan<select value={selectedName} onChange={(event)=>setSelectedName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{people.map((person)=><option key={String(person.id)}>{person["Ad Soyad"]}</option>)}</select></label>
          {selected&&<div className="mt-4"><p className="text-lg font-semibold">{selected["Ad Soyad"]}</p><p className="text-xs text-slate-500">{selected.Pozisyon} · {selected.Departman}</p><span className="mt-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{selected.box}</span><div className="mt-4 grid grid-cols-2 gap-2"><Mini label="Performans" value={selected.snapshot.performance.score>0?selected.snapshot.performance.score.toFixed(1):"—"}/><Mini label="Potansiyel" value={selected.snapshot.talent.potential.score>0?selected.snapshot.talent.potential.score.toFixed(2):"—"}/><Mini label="Potansiyel güveni" value={`%${selected.snapshot.talent.potential.confidence}`}/><Mini label="Evidence Score" value={`%${selected.snapshot.evidence.score}`}/></div></div>}
        </section>

        {selected&&<section className="enterprise-card p-5"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-indigo-600"/><h3 className="text-sm font-semibold">Potansiyel profil girdileri</h3></div><p className="mt-1 text-xs text-slate-500">Kariyer isteği ve mobilite eksikse sistem 3,0 varsaymaz.</p><div className="grid gap-x-6 md:grid-cols-2"><SignalSlider label="Kariyer isteği" value={aspiration} disabled={savingSignal} onChange={(value)=>void updateProfileSignal("career_aspiration",value)}/><SignalSlider label="Mobilite / yeni sorumluluk isteği" value={mobility} disabled={savingSignal} onChange={(value)=>void updateProfileSignal("mobility_willingness",value)}/></div></section>}
      </div>

      {selected&&<div className="grid gap-5 lg:grid-cols-2">
        <section className="enterprise-card p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-violet-600"/><h2 className="text-sm font-semibold">Rol yetkinlik farkları</h2></div><p className="mt-1 text-xs text-slate-500">Hedef kaynağı: {targetResolution.source} · {targetResolution.referenceCount} referans rol</p><div className="mt-4 space-y-2">{gapData.filter((item)=>item.hasActual&&Number(item.gap)>0).slice(0,6).map((item)=><div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"><span>{item.label}</span><span className="font-semibold text-amber-700">{item.actual.toFixed(1)} → {item.expected.toFixed(1)}</span></div>)}{!gapData.some((item)=>item.hasActual&&Number(item.gap)>0)&&<p className="text-xs text-slate-500">Ölçülmüş pozitif rol açığı yok veya yetkinlik verisi henüz yeterli değil.</p>}</div></section>
        <section className="enterprise-card p-5"><h2 className="text-sm font-semibold">Kanıt durumu</h2><div className="mt-4 grid grid-cols-2 gap-2"><Mini label="Performans ölçümü" value={String(selected.snapshot.performance.historyCount)}/><Mini label="Trend" value={selected.snapshot.performance.trendDirection}/><Mini label="Yetkinlik kapsamı" value={`%${selected.snapshot.competency.coverage}`}/><Mini label="Evidence bandı" value={selected.snapshot.evidence.band}/></div><div className="mt-4 space-y-2">{selected.snapshot.signals.slice(0,5).map((signal)=><p key={signal} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">{signal}</p>)}</div></section>
      </div>}

      {selected&&<AIDecisionSupport kind="talent" context={aiContext} resetKey={selectedName} title="AI Yetenek Kalibrasyonu" description="Performans, potansiyel, Evidence Score ve rol farklarını birlikte inceler; terfi veya ücret kararı vermez." buttonLabel="Yetenek analizini oluştur" questionTitle="Kalibrasyon soruları"/>}

      {activeBox&&<div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="ninebox-drawer-title">
        <button type="button" aria-label="9-Box detay panelini kapat" onClick={()=>setActiveBox(null)} className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]"/>
        <aside className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-slate-500">9-Box detay</p><h2 id="ninebox-drawer-title" className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{activeBox}</h2><p className="mt-1 text-xs text-slate-500">{drawerPeople.length} çalışan · matrise yerleşenlerin %{plotted.length?((drawerPeople.length/plotted.length)*100).toFixed(1):"0"}&apos;i</p></div>
              <button type="button" onClick={()=>setActiveBox(null)} aria-label="Paneli kapat" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><X className="h-4 w-4"/></button>
            </div>
          </div>

          <div className="grid gap-2 border-b border-slate-200 p-4 sm:grid-cols-2 dark:border-slate-800">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"><Search className="h-4 w-4 text-slate-400"/><input value={drawerQuery} onChange={(event)=>{setDrawerQuery(event.target.value);setDrawerLimit(60);}} placeholder="Çalışan veya pozisyon ara" className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label>
            <select value={drawerDepartment} onChange={(event)=>{setDrawerDepartment(event.target.value);setDrawerLimit(60);}} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">Tüm departmanlar</option>{drawerDepartments.map((department)=><option key={department}>{department}</option>)}</select>
            <select value={drawerSort} onChange={(event)=>setDrawerSort(event.target.value as DrawerSort)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="potential">Potansiyel: yüksekten düşüğe</option><option value="performance">Performans: yüksekten düşüğe</option><option value="name">Ada göre</option></select>
            <div className="flex h-10 items-center justify-between rounded-lg bg-slate-50 px-3 text-[11px] text-slate-500 dark:bg-slate-900"><span>Filtre sonucu</span><strong className="text-slate-800 dark:text-slate-200">{filteredDrawerPeople.length}</strong></div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredDrawerPeople.slice(0,drawerLimit).map((person)=><button key={String(person.id)} type="button" onClick={()=>setSelectedName(person["Ad Soyad"])} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedName===person["Ad Soyad"]?"border-[#8fb5b2] bg-[#f1f6f5]":"border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{initials(person["Ad Soyad"])}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900">{person["Ad Soyad"]}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{person.Pozisyon || "Pozisyon yok"} · {person.Departman || "Departman yok"}</span></span>
                <span className="shrink-0 text-right"><span className="block text-[10px] font-semibold text-slate-700">P {person.snapshot.performance.score.toFixed(1)}</span><span className="block text-[10px] text-slate-500">Pot {person.snapshot.talent.potential.score.toFixed(1)}</span></span>
              </button>)}
              {!filteredDrawerPeople.length&&<div className="py-12 text-center"><Users className="mx-auto h-6 w-6 text-slate-300"/><p className="mt-2 text-xs font-medium text-slate-600">Filtreyle eşleşen çalışan yok</p><button type="button" onClick={()=>{setDrawerQuery("");setDrawerDepartment("");}} className="mt-2 text-xs font-semibold text-[#2f6664]">Filtreleri temizle</button></div>}
            </div>
            {filteredDrawerPeople.length>drawerLimit&&<button type="button" onClick={()=>setDrawerLimit((value)=>value+60)} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">60 kişi daha göster · {filteredDrawerPeople.length-drawerLimit} kaldı</button>}
          </div>
          <div className="border-t border-slate-200 px-5 py-3 text-[10px] text-slate-500 dark:border-slate-800">Büyük organizasyonlarda liste kademeli render edilir; 9-Box hücre yüksekliği çalışan sayısından etkilenmez.</div>
        </aside>
      </div>}
    </div>
  );
}

function NineBoxCell({label,people,total,onOpen}:{label:string;people:TalentPerson[];total:number;onOpen:()=>void}){
  const tone=BOX_TONES[label]||BOX_TONES["Çekirdek Yetenek"];
  const ratio=total?(people.length/total)*100:0;
  const avgPerformance=average(people.map((person)=>person.snapshot.performance.score));
  const avgPotential=average(people.map((person)=>person.snapshot.talent.potential.score));
  const department=dominantDepartment(people);
  const preview=people.slice(0,3);
  return <button type="button" disabled={!people.length} onClick={onOpen} aria-label={`${label}: ${people.length} çalışan${people.length?", detayı aç":""}`} className={`group relative h-[188px] overflow-hidden rounded-2xl border border-slate-200 p-4 text-left transition dark:border-slate-800 ${tone.surface} ${people.length?"cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md":"cursor-default opacity-80"}`}>
    <span className={`absolute inset-x-0 top-0 h-1 ${tone.accent}`}/>
    <span className="flex items-start justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.07em] text-slate-600">{label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}>{people.length}</span></span>
    {people.length?<>
      <span className="mt-3 flex items-baseline gap-2"><strong className="text-2xl font-semibold text-slate-900">{people.length}</strong><span className="text-[10px] font-medium text-slate-500">%{ratio.toFixed(1)}</span></span>
      <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/80"><span className={`block h-full rounded-full ${tone.accent}`} style={{width:`${Math.max(6,Math.min(100,ratio))}%`}}/></span>
      <span className="mt-3 grid grid-cols-2 gap-2 text-[9.5px] text-slate-500"><span><span className="block">Ort. P / Pot</span><strong className="text-[10.5px] text-slate-700">{avgPerformance.toFixed(1)} / {avgPotential.toFixed(1)}</strong></span><span className="min-w-0"><span className="block">Yoğun departman</span><strong className="block truncate text-[10.5px] text-slate-700">{department}</strong></span></span>
      <span className="absolute inset-x-4 bottom-3 flex items-center justify-between"><span className="flex -space-x-1.5">{preview.map((person)=><span key={String(person.id)} title={person["Ad Soyad"]} className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-slate-100 text-[8px] font-bold text-slate-600">{initials(person["Ad Soyad"])}</span>)}{people.length>preview.length&&<span className="grid h-6 min-w-6 place-items-center rounded-full border-2 border-white bg-slate-200 px-1 text-[8px] font-bold text-slate-600">+{people.length-preview.length}</span>}</span><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 transition group-hover:text-[#2f6664]">Detayı aç <ArrowRight className="h-3 w-3"/></span></span>
    </>:<span className="mt-11 block text-center text-[11px] text-slate-400">Bu segmentte çalışan yok</span>}
  </button>;
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
