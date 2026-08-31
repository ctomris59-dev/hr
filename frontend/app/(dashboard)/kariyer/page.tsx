"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Map, Sparkles, Target, TrendingUp, UserRound } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { POSITIONS } from "../../data/jobData";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { buildCareerArchitecture, calculateCareerReadiness, getCareerRole, JOB_LEVELS } from "../../../lib/hr/careerArchitecture";
import { latestEvaluationForEmployee } from "../../../lib/hr/employeeIdentity";
import { extractCompetencyMap } from "../../../lib/hr/talentPotential";
import { recommendedInterventions } from "../../../lib/hr/developmentLibrary";
import { learningProgressForEmployee, verifiedLearningEvidenceForEmployee } from "../../../lib/hr/learningEvidence";

const LABEL_TO_CODE: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG", "Analitik Düşünme": "ANA", "Sonuç Odaklılık": "RES", "Detaylara Özen": "DET", "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH", "Öz-Disiplin": "DIS", "Dayanıklılık & Stres Yönetimi": "STR", "Takım Çalışması": "TEA", "İletişim Becerileri": "COM",
};

export default function KariyerPage() {
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [targetPosition, setTargetPosition] = useState("");

  useEffect(() => {
    const reload = () => {
      setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
      setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
      setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
      setAssignments(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []));
    };
    reload();
    window.addEventListener("dataUpdated", reload);
    window.addEventListener("userChanged", reload);
    return () => { window.removeEventListener("dataUpdated", reload); window.removeEventListener("userChanged", reload); };
  }, []);

  const role = String(user?.role || "").toUpperCase();
  const isEmployee = role === "PERSONEL" || role === "EMPLOYEE";
  const people = useMemo(() => {
    if (!user) return [];
    if (role === "CEO" || role === "IK") return orgData;
    if (isEmployee) return orgData.filter((person) => person["Ad Soyad"] === user?.name);
    try { return getManageableEmployees(user, orgData); } catch { return []; }
  }, [user, orgData, role, isEmployee]);

  useEffect(() => {
    if (!people.length) return;
    if (!selectedName || !people.some((person) => person["Ad Soyad"] === selectedName)) {
      setSelectedName(people[0]["Ad Soyad"]);
      setTargetPosition("");
    }
  }, [people, selectedName]);

  const orgPerson = orgData.find((person) => person["Ad Soyad"] === selectedName) || {};
  const assessment = selectedName ? latestEvaluationForEmployee(orgPerson, history) || {} : {};
  const person = { ...orgPerson, ...assessment };
  const currentRole = getCareerRole(orgPerson.Pozisyon || "");
  const architecture = useMemo(() => buildCareerArchitecture(POSITIONS), []);
  const familyRoles = architecture[currentRole.family] || [];

  useEffect(() => {
    if (!targetPosition && currentRole.title) {
      const next = familyRoles.find((item) => item.levelRank > currentRole.levelRank) || familyRoles.find((item) => item.title !== currentRole.title);
      if (next) setTargetPosition(next.title);
    }
  }, [currentRole.title, currentRole.levelRank, familyRoles, targetPosition]);

  const readiness = targetPosition && targetPosition !== currentRole.title ? calculateCareerReadiness(person, targetPosition) : null;
  const targetRole = targetPosition && targetPosition !== currentRole.title ? getCareerRole(targetPosition) : null;
  const aspirationRaw = Number(orgPerson.career_aspiration);
  const aspiration = Number.isFinite(aspirationRaw) && aspirationRaw >= 1 && aspirationRaw <= 5 ? aspirationRaw : null;
  const canEditAspiration = isEmployee && selectedName === user?.name;
  const learningProgress = learningProgressForEmployee(selectedName, assignments);
  const verifiedLearningEvidence = verifiedLearningEvidenceForEmployee(selectedName, assignments);
  const pendingLearningEvidence = learningProgress.filter((item) => item.state === "completed" || item.state === "transfer-submitted");

  const developmentGaps = useMemo(() => {
    if (!targetRole) return [];
    const current = extractCompetencyMap(person);
    return Object.entries(targetRole.targetProfile)
      .map(([label, expected]) => {
        const code = LABEL_TO_CODE[label] || label;
        const actual = Number(current[code] || 0);
        return { label, code, actual, expected: Number(expected), gap: Number(expected) - actual };
      })
      .filter((item) => item.actual > 0 && item.gap > 0)
      .sort((a, b) => b.gap - a.gap);
  }, [person, targetRole]);

  const prescriptions = useMemo(() => developmentGaps
    .slice(0, 3)
    .flatMap((gap) => recommendedInterventions(gap.code, gap.actual, gap.expected, 1).map((item) => ({ ...item, gap: gap.gap })))
    .slice(0, 3), [developmentGaps]);

  const updateAspiration = (value: number) => {
    if (!canEditAspiration) return;
    const next = orgData.map((row) => row["Ad Soyad"] === selectedName ? { ...row, career_aspiration: value } : row);
    setOrgData(next);
    setStorageData(STORAGE_KEYS.ORG_CHART, next);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
  };

  const aiContext = readiness && targetRole ? {
    module: "career_readiness",
    employee: { currentPosition: currentRole.title, currentFamily: currentRole.family, currentLevel: currentRole.level, targetPosition: targetRole.title, targetFamily: targetRole.family, targetLevel: targetRole.level },
    readiness: { index: readiness.index, band: readiness.band, competencyFit: readiness.competencyFit, performance: readiness.performance, potential: readiness.potential, experience: readiness.experience, aspiration: readiness.aspiration, dataCoverage: readiness.dataCoverage, notes: readiness.notes },
    careerSignals: { aspiration, levelDistance: targetRole.levelRank - currentRole.levelRank, familyChange: targetRole.family !== currentRole.family },
    evidence: {
      performance: Number(assessment.Performans || assessment.performance || 0) || null,
      competencyScore: Number(assessment.competency_score || 0) || null,
      evaluationDate: assessment.date || assessment.Tarih || null,
      verifiedLearningEvidence: verifiedLearningEvidence.slice(0, 8),
      pendingLearningEvidenceCount: pendingLearningEvidence.length,
    },
    development: { topGaps: developmentGaps.slice(0, 5), recommendedInterventions: prescriptions.map((item) => ({ competency: item.competencyCode, level: item.level, name: item.name, transferTask: item.transferTask, reassessDays: item.reassessDays })) },
    instruction: isEmployee
      ? "Çalışanın kendi kariyer keşfini destekle. Yalnız işe transfer kanıtı yönetici tarafından doğrulanmış öğrenmeleri kanıt olarak kullan. Eğitim tamamlanmasını otomatik yetkinlik artışı sayma; yeniden ölçüm gereksinimini açıkla. Terfi sözü verme."
      : "Hazır bulunuşluğu tek başına karar olarak yorumlama. Yalnız yönetici tarafından doğrulanmış işe transfer kanıtlarını gelişim kanıtı olarak kullan. Tamamlanan ama doğrulanmamış öğrenmeleri karar kanıtına dönüştürme. Terfi kararı verme.",
  } : {};

  if (!people.length) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><UserRound className="mx-auto h-8 w-8 text-slate-300"/><h1 className="mt-3 text-lg font-semibold">Kariyer profili bulunamadı</h1><p className="mt-1 text-sm text-slate-500">Demo personanız organizasyon kaydıyla eşleşmiyor.</p></div>;

  return <div className="min-w-0 space-y-4 overflow-hidden">
    <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">{isEmployee ? "Benim kariyerim" : "Kariyer mimarisi"}</p><h1 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Kariyer Yolu</h1><p className="mt-1 max-w-5xl text-xs leading-5 text-slate-500">Hazır bulunuşluk rol uyumu, performans, potansiyel, deneyim ve kariyer isteğini birleştirir. Öğrenme tamamlamak puanı otomatik artırmaz; yalnız doğrulanmış işe transfer kanıtı Evidence Graph&apos;a girer.</p></div>

    <div className="grid min-w-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isEmployee ? <div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-slate-400">Çalışan</p><p className="mt-1 text-sm font-semibold">{selectedName}</p></div> : <label className="text-xs font-medium text-slate-500">Çalışan<select value={selectedName} onChange={(e) => { setSelectedName(e.target.value); setTargetPosition(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{people.map((row: any) => <option key={row.id ?? row["Ad Soyad"]}>{row["Ad Soyad"]}</option>)}</select></label>}
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">Mevcut rol</p><p className="mt-1 text-sm font-semibold text-amber-950">{currentRole.title || "—"}</p><p className="mt-1 text-[11px] text-amber-800">{currentRole.family} · {currentRole.level} {JOB_LEVELS[currentRole.level]}</p></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-500">Kariyer isteği</p><strong className="text-sm">{aspiration !== null ? `${aspiration.toFixed(1)} / 5` : "Belirtilmedi"}</strong></div>
          {canEditAspiration ? <><div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Kariyer isteği seviyesi">{[1,2,3,4,5].map(value=><button key={value} type="button" role="radio" aria-checked={aspiration===value} onClick={()=>updateAspiration(value)} className={`h-9 rounded-lg border text-xs font-semibold ${aspiration===value?"border-[#2f6664] bg-[#2f6664] text-white":"border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>{value}</button>)}</div><div className="mt-1.5 flex justify-between text-[10px] text-slate-400"><span>1 düşük</span><span>5 yüksek</span></div><p className="mt-2 text-[10px] leading-4 text-slate-400">Değer seçilene kadar sistem orta seviye varsaymaz. Bu alan sizin öz-bildiriminizdir.</p></> : <p className="mt-2 text-[10px] text-slate-400">Çalışan öz-bildirimi; yönetici için salt okunur.</p>}
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><Map className="h-4 w-4 text-amber-600"/><div><h2 className="text-sm font-semibold">{currentRole.family} kariyer mimarisi</h2><p className="text-[10px] text-slate-400">Aynı kariyer ailesindeki roller seviye sırasıyla. Mevcut rol hedef olarak yeniden seçilemez.</p></div></div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{familyRoles.map((careerRole, index) => { const isCurrent = careerRole.title === currentRole.title; const isTarget = careerRole.title === targetPosition; return <button key={careerRole.title} type="button" disabled={isCurrent} aria-current={isCurrent?"true":undefined} aria-pressed={!isCurrent?isTarget:undefined} onClick={() => {if(!isCurrent)setTargetPosition(careerRole.title);}} className={`rounded-xl border p-3 text-left ${isCurrent ? "cursor-default border-slate-900 bg-slate-950 text-white" : isTarget ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"}`}><div className="flex justify-between gap-2"><p className="text-[9px] font-bold uppercase opacity-60">{careerRole.level} · {JOB_LEVELS[careerRole.level]}</p><span className="text-[9px] font-semibold">{isCurrent?"Mevcut":isTarget?"Hedef":String(index+1).padStart(2,"0")}</span></div><p className="mt-2 line-clamp-2 text-xs font-semibold">{careerRole.title}</p></button>; })}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-medium text-slate-500">Hedef rol<select value={targetPosition} onChange={(e) => setTargetPosition(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm"><optgroup label={`${currentRole.family} içi`}>{familyRoles.filter((item) => item.title !== currentRole.title).map((item) => <option key={item.title}>{item.title}</option>)}</optgroup><optgroup label="Diğer roller">{POSITIONS.filter((position) => getCareerRole(position).family !== currentRole.family).map((position) => <option key={position}>{position}</option>)}</optgroup></select></label>
          {readiness && <div className="mt-4 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]"><div className="rounded-2xl bg-slate-950 p-4 text-white"><p className="text-[10px] uppercase text-slate-400">Hazır bulunuşluk</p><div className="mt-2 flex items-end gap-2"><p className="text-4xl font-semibold">%{readiness.index}</p><span className="mb-1 rounded-full bg-white/10 px-2 py-1 text-[10px]">{readiness.band}</span></div><p className="mt-3 text-[10px] text-slate-400">Veri kapsamı %{readiness.dataCoverage} · otomatik terfi değildir.</p></div><div className="grid gap-x-5 gap-y-3 md:grid-cols-2"><Factor label="Yetkinlik uyumu" value={readiness.competencyFit} weight="%50"/><Factor label="Performans" value={readiness.performance} weight="%20"/><Factor label="Potansiyel" value={readiness.potential} weight="%15"/><Factor label="Deneyim / kıdem" value={readiness.experience} weight="%10"/><Factor label="Kariyer isteği" value={readiness.aspiration} weight="%5"/></div></div>}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-600"/><h3 className="text-sm font-semibold text-indigo-950">Hedef role gelişim reçetesi</h3></div><p className="mt-1 text-[10px] text-indigo-700">En büyük hedef rol yetkinlik açıklarına göre. Eğitim tamamlamak tek başına hazır bulunuşluğu artırmaz.</p><div className="mt-3 space-y-2">{prescriptions.length ? prescriptions.map((item) => <div key={item.id} className="rounded-xl border border-indigo-100 bg-white p-3"><div className="flex justify-between"><span className="text-[9px] font-bold uppercase text-indigo-600">{item.competencyCode} · L{item.level}</span><span className="text-[10px] font-semibold text-red-600">gap -{item.gap.toFixed(1)}</span></div><p className="mt-1 text-xs font-semibold">{item.name}</p><p className="mt-1 text-[10px] text-slate-500">{item.type} · yeniden ölçüm {item.reassessDays} gün</p></div>) : <p className="text-xs text-slate-500">Ölçülebilir hedef rol açığı bulunmuyor.</p>}</div><Link href="/gelisim" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700">Gelişim planına geç <ArrowRight className="h-3.5 w-3.5"/></Link></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-600"/><h3 className="text-sm font-semibold text-emerald-950">Doğrulanmış gelişim kanıtı</h3></div><p className="mt-2 text-3xl font-semibold text-emerald-900">{verifiedLearningEvidence.length}</p><p className="mt-1 text-[10px] leading-4 text-emerald-700">işe transfer kanıtı yönetici tarafından doğrulandı. {pendingLearningEvidence.length ? `${pendingLearningEvidence.length} kayıt henüz kanıt/doğrulama aşamasında.` : "Bekleyen kanıt yok."}</p><Link href="/egitim" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">Kanıt akışını görüntüle <ArrowRight className="h-3.5 w-3.5"/></Link></div>
        </div>
      </section>
    </div>

    {readiness && targetRole && <AIDecisionSupport kind="career" context={aiContext} resetKey={`${selectedName}-${targetPosition}-${verifiedLearningEvidence.length}-${pendingLearningEvidence.length}`} title="AI Kariyer Karar Desteği" description="Hazır bulunuşluk, hedef rol yetkinlik açıkları, doğrulanmış işe transfer kanıtları ve yeniden ölçüm ihtiyacını birlikte yorumlar." buttonLabel="Kariyer analizini oluştur" questionTitle="Kariyer görüşmesi soruları"/>}

    <div className="grid gap-3 md:grid-cols-3"><Info icon={Target} title="Job family" text="Benzer uzmanlık alanındaki roller aynı kariyer ailesinde gruplanır."/><Info icon={TrendingUp} title="Kanıtla gelişim" text="Yalnız doğrulanmış işe transfer kanıtı Evidence Graph&apos;a girer; otomatik yetkinlik artışı yoktur."/><Info icon={Map} title="Çapraz kariyer" text="Başka aileye geçiş mümkün; rol ailesi ve seviye mesafesi görünür."/></div>
  </div>;
}

function Factor({ label, value, weight }: { label: string; value: number; weight: string }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return <div><div className="flex justify-between gap-3 text-[11px]"><span className="text-slate-600">{label} <span className="text-slate-400">{weight}</span></span><strong>%{safe}</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${safe}%` }}/></div></div>;
}

function Info({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Icon className="h-4 w-4"/></div><div><h3 className="text-xs font-semibold">{title}</h3><p className="mt-1 text-[11px] leading-4 text-slate-500">{text}</p></div></div></div>;
}
