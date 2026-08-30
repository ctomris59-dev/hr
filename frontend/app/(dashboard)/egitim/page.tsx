"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, Filter, Plus, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import PremiumTrainingTable, { type PremiumTrainingRow } from "../../../components/PremiumTrainingTable";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { useNotifications } from "../../../context/NotificationContext";
import { latestEvaluationForEmployee } from "../../../lib/hr/employeeIdentity";
import { extractCompetencyMap } from "../../../lib/hr/talentPotential";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import {
  DEVELOPMENT_EVIDENCE_REFERENCES,
  DEVELOPMENT_LIBRARY,
  findDevelopmentIntervention,
  recommendedInterventions,
  type CompetencyCode,
  type DevelopmentLevel,
} from "../../../lib/hr/developmentLibrary";
import { learningEvidenceLabel, learningEvidenceState } from "../../../lib/hr/learningEvidence";

interface TrainingAssignment extends PremiumTrainingRow {
  completedAt?: string;
  competencyCode?: CompetencyCode;
  developmentLevel?: DevelopmentLevel;
  interventionType?: string;
  transferTask?: string;
  successMetric?: string;
  reassessDueAt?: string;
  transferEvidence?: string;
  transferSubmittedAt?: string;
  managerVerified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

const LABEL_TO_CODE: Record<string, CompetencyCode> = {
  "Dijital Okuryazarlık": "DIG", "Analitik Düşünme": "ANA", "Sonuç Odaklılık": "RES", "Detaylara Özen": "DET", "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH", "Öz-Disiplin": "DIS", "Dayanıklılık & Stres Yönetimi": "STR", "Takım Çalışması": "TEA", "İletişim Becerileri": "COM",
};

const levelOptions: Array<{ value: "" | DevelopmentLevel; label: string }> = [
  { value: "", label: "Tüm seviyeler" },
  { value: 1, label: "1 · Temel" },
  { value: 2, label: "2 · Uygulama" },
  { value: 3, label: "3 · İleri" },
  { value: 4, label: "4 · Liderlik" },
];

function datePlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function shortDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EgitimPage() {
  const { addNotification, showToast } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [tab, setTab] = useState<"mine" | "catalog" | "manage">("mine");
  const [form, setForm] = useState({ employee: "", trainingId: "", dueDate: "" });
  const [search, setSearch] = useState("");
  const [competencyFilter, setCompetencyFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<"" | DevelopmentLevel>("");
  const [evidenceItemId, setEvidenceItemId] = useState<string | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState("");

  const reload = () => {
    setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
    setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
    setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
    setAssignments(getStorageData<TrainingAssignment[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []));
  };

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener("dataUpdated", handler);
    return () => window.removeEventListener("dataUpdated", handler);
  }, []);

  const name = user?.name || user?.username || "";
  const role = String(user?.role || "").toUpperCase();
  const manageable = useMemo(() => {
    if (!user) return [];
    if (role === "CEO" || role === "IK") return orgData;
    try { return getManageableEmployees(user, orgData); } catch { return []; }
  }, [user, orgData, role]);
  const manageableNames = useMemo(() => new Set(manageable.map((employee: any) => employee["Ad Soyad"])), [manageable]);
  const myAssignments = assignments.filter((assignment) => assignment.employee === name);
  const teamAssignments = assignments.filter((assignment) => manageableNames.has(assignment.employee));
  const myVerifiedCount = myAssignments.filter((assignment) => learningEvidenceState(assignment) === "verified").length;
  const myEvidencePendingCount = myAssignments.filter((assignment) => ["completed", "transfer-submitted"].includes(learningEvidenceState(assignment))).length;
  const overdue = (assignment: PremiumTrainingRow) => assignment.status !== "Tamamlandı" && Boolean(assignment.dueDate) && new Date(assignment.dueDate!) < new Date();

  const selectedRecommendationPerson = useMemo(() => {
    const targetName = form.employee || name;
    return orgData.find((employee) => employee["Ad Soyad"] === targetName) || null;
  }, [form.employee, name, orgData]);

  const recommendations = useMemo(() => {
    if (!selectedRecommendationPerson) return [];
    const evaluation = latestEvaluationForEmployee(selectedRecommendationPerson, history) || {};
    const current = extractCompetencyMap({ ...selectedRecommendationPerson, ...evaluation });
    const target = resolveTargetProfile(selectedRecommendationPerson.Pozisyon || "").profile;
    return Object.entries(target)
      .map(([label, expected]) => {
        const code = LABEL_TO_CODE[label];
        const actual = code ? Number(current[code] || 0) : 0;
        return { label, code, actual, expected: Number(expected), gap: Number(expected) - actual };
      })
      .filter((item) => item.code && item.actual > 0 && item.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3)
      .flatMap((gap) => recommendedInterventions(gap.code!, gap.actual, gap.expected, 2).map((item) => ({ ...item, gap: gap.gap })))
      .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
      .slice(0, 6);
  }, [selectedRecommendationPerson, history]);
  const recommendedIds = useMemo(() => new Set(recommendations.map((item) => item.id)), [recommendations]);

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    return DEVELOPMENT_LIBRARY.filter((item) => {
      if (competencyFilter && item.competencyCode !== competencyFilter) return false;
      if (levelFilter && item.level !== levelFilter) return false;
      if (!query) return true;
      return `${item.name} ${item.competencyLabel} ${item.type} ${item.description}`.toLocaleLowerCase("tr-TR").includes(query);
    });
  }, [search, competencyFilter, levelFilter]);

  const evidenceItem = evidenceItemId ? assignments.find((assignment) => assignment.id === evidenceItemId) || null : null;
  const evidenceState = evidenceItem ? learningEvidenceState(evidenceItem) : null;
  const canSubmitOwnEvidence = Boolean(evidenceItem && evidenceItem.employee === name && evidenceItem.status === "Tamamlandı" && !evidenceItem.managerVerified);
  const canVerifyTeamEvidence = Boolean(
    evidenceItem &&
    manageableNames.has(evidenceItem.employee) &&
    String(evidenceItem.transferEvidence || "").trim() &&
    !evidenceItem.managerVerified
  );

  const saveAssignments = (next: TrainingAssignment[]) => {
    setAssignments(next);
    setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, next);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
  };

  const assign = (event: FormEvent) => {
    event.preventDefault();
    const intervention = findDevelopmentIntervention(form.trainingId);
    if (!intervention || !form.employee) return;
    const item: TrainingAssignment = {
      id: `training-${Date.now()}`,
      employee: form.employee,
      trainingId: intervention.id,
      trainingName: intervention.name,
      assignedBy: name,
      assignedAt: new Date().toISOString(),
      dueDate: form.dueDate || undefined,
      status: "Atandı",
      competencyCode: intervention.competencyCode,
      developmentLevel: intervention.level,
      interventionType: intervention.type,
      transferTask: intervention.transferTask,
      successMetric: intervention.successMetric,
    };
    saveAssignments([item, ...assignments]);
    addNotification(`${intervention.name} gelişim müdahalesi atandı.`, "info", { targetUser: form.employee, link: "/egitim", source: "training" });
    setForm({ employee: "", trainingId: "", dueDate: "" });
  };

  const setStatus = (id: string, status: TrainingAssignment["status"]) => {
    const next = assignments.map((assignment) => {
      if (assignment.id !== id) return assignment;
      const intervention = findDevelopmentIntervention(assignment.trainingId);
      const completed = status === "Tamamlandı";
      return {
        ...assignment,
        status,
        completedAt: completed ? assignment.completedAt || new Date().toISOString() : undefined,
        reassessDueAt: completed ? assignment.reassessDueAt || datePlusDays(intervention?.reassessDays || 60) : undefined,
        managerVerified: completed ? assignment.managerVerified : false,
        verifiedAt: completed ? assignment.verifiedAt : undefined,
        verifiedBy: completed ? assignment.verifiedBy : undefined,
      };
    });
    saveAssignments(next);
    showToast(
      status === "Tamamlandı"
        ? "Öğrenme tamamlandı. Evidence Graph'a geçmeden önce işe transfer kanıtı ve yönetici doğrulaması gerekir."
        : "Gelişim durumu güncellendi.",
      "success"
    );
  };

  const openEvidence = (item: PremiumTrainingRow) => {
    setEvidenceItemId(item.id);
    setEvidenceDraft(item.transferEvidence || "");
  };

  const saveTransferEvidence = () => {
    if (!evidenceItem || !canSubmitOwnEvidence) return;
    const evidence = evidenceDraft.trim();
    if (evidence.length < 20) return showToast("Kanıt açıklaması en az 20 karakter olmalı ve gerçek iş uygulamasını tarif etmeli.", "error");
    const next = assignments.map((assignment) => assignment.id === evidenceItem.id ? {
      ...assignment,
      transferEvidence: evidence,
      transferSubmittedAt: new Date().toISOString(),
      managerVerified: false,
      verifiedAt: undefined,
      verifiedBy: undefined,
    } : assignment);
    saveAssignments(next);
    showToast("İşe transfer kanıtı kaydedildi. Yönetici doğrulaması bekleniyor.", "success");
  };

  const verifyTransferEvidence = () => {
    if (!evidenceItem || !canVerifyTeamEvidence) return;
    const next = assignments.map((assignment) => assignment.id === evidenceItem.id ? {
      ...assignment,
      managerVerified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: name,
    } : assignment);
    saveAssignments(next);
    addNotification(`${evidenceItem.trainingName} için gelişim kanıtı doğrulandı.`, "info", { targetUser: evidenceItem.employee, link: "/egitim", source: "training" });
    showToast("Gelişim kanıtı doğrulandı. Artık Evidence Graph'ta doğrulanmış gelişim kanıtı olarak kullanılabilir.", "success");
  };

  const tabItems = [
    { key: "mine" as const, label: "Atanan Gelişimler", description: "Size atanan eğitim ve iş üstü gelişim müdahalelerini takip edin.", icon: CheckCircle2, count: myAssignments.length },
    { key: "catalog" as const, label: "Gelişim Kütüphanesi", description: "10 yetkinlik için 60 seviyelendirilmiş, kanıta dayalı müdahale.", icon: BookOpen, count: DEVELOPMENT_LIBRARY.length },
    ...(manageable.length ? [{ key: "manage" as const, label: "Ekip Gelişimi", description: "Yetkinlik açığına göre müdahale atayın ve kanıtı doğrulayın.", icon: Users, count: teamAssignments.length }] : []),
  ];

  return <div className="space-y-5">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Kanıta dayalı gelişim sistemi</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Eğitim & Gelişim Kütüphanesi</h1>
      <p className="mt-1 max-w-5xl text-sm text-slate-500">FutureHR yalnız “kurs tamamlandı” takibi yapmaz. Yetkinlik açığını seviyelendirilmiş öğrenme, işe transfer kanıtı, yönetici doğrulaması ve 30-90 günlük yeniden ölçüm döngüsüne bağlar.</p>
    </div>

    <div className="grid gap-3 sm:grid-cols-4">
      <Metric label="Bana atanan" value={myAssignments.length} icon={BookOpen}/>
      <Metric label="Devam eden" value={myAssignments.filter((item) => item.status !== "Tamamlandı").length} icon={Clock3}/>
      <Metric label="Kanıt bekleyen" value={myEvidencePendingCount} icon={Sparkles}/>
      <Metric label="Doğrulanmış kanıt" value={myVerifiedCount} icon={ShieldCheck}/>
    </div>

    <div className="rounded-2xl border border-violet-200/80 bg-white p-2 shadow-[0_8px_30px_rgba(76,29,149,0.08)] dark:border-violet-900/50 dark:bg-slate-900">
      <div className="grid gap-2 md:grid-cols-3">
        {tabItems.map(({ key, label, description, icon: Icon, count }) => {
          const active = tab === key;
          return <button key={key} type="button" onClick={() => setTab(key)} className={`flex min-h-[76px] items-center gap-3 rounded-xl border px-4 py-3 text-left ${active ? "border-violet-600 bg-violet-600 text-white shadow-lg" : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-white/15" : "bg-white text-violet-600 dark:bg-slate-900"}`}><Icon className="h-5 w-5"/></span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-sm">{label}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-white/15" : "bg-violet-100 text-violet-700"}`}>{count}</span></span><span className={`mt-1 block text-[11px] leading-4 ${active ? "text-violet-100" : "text-slate-500"}`}>{description}</span></span>
          </button>;
        })}
      </div>
    </div>

    {tab === "mine" && <PremiumTrainingTable title="Atanan Gelişim Müdahaleleri" description="Tamamlanan öğrenme ancak işe transfer kanıtı ve yönetici doğrulamasından sonra doğrulanmış gelişim kanıtına dönüşür." rows={myAssignments} editable onStatus={setStatus} onEvidence={openEvidence} overdue={overdue}/>} 

    {tab === "catalog" && <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Eğitim, yetkinlik veya yöntem ara..." className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"/></div>
          <div className="flex gap-2">
            <select value={competencyFilter} onChange={(e) => setCompetencyFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="">10 yetkinliğin tümü</option>{Array.from(new Map(DEVELOPMENT_LIBRARY.map((item) => [item.competencyCode, item.competencyLabel])).entries()).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value ? Number(e.target.value) as DevelopmentLevel : "")} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">{levelOptions.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><Filter className="h-3.5 w-3.5"/><span>{filteredCatalog.length} müdahale</span><span>•</span><span>4 seviye</span><span>•</span><span>6 yöntem / yetkinlik</span></div>
      </div>

      {recommendations.length > 0 && <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-600"/><h2 className="text-sm font-semibold text-indigo-950 dark:text-indigo-200">Kişiye göre önerilen gelişim reçetesi</h2></div>
        <p className="mt-1 text-[11px] text-indigo-700/80 dark:text-indigo-300">Mevcut rol hedefi ile son yetkinlik kanıtı arasındaki en büyük açıklardan seçildi. Otomatik atama değildir.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{recommendations.map((item) => <button key={item.id} type="button" onClick={() => { setTab(manageable.length ? "manage" : "catalog"); setForm((value) => ({ ...value, trainingId: item.id })); }} className="rounded-xl border border-indigo-100 bg-white p-3 text-left hover:border-indigo-300 dark:bg-slate-900"><div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase text-indigo-600">{item.competencyLabel} · L{item.level}</span><span className="text-[10px] font-semibold text-red-600">gap -{item.gap.toFixed(1)}</span></div><p className="mt-1 text-xs font-semibold">{item.name}</p><p className="mt-1 text-[10px] text-slate-500">{item.type} · {item.duration}</p></button>)}</div>
      </div>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredCatalog.map((item) => <div key={item.id} className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${recommendedIds.has(item.id) ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200 dark:border-slate-800"}`}><div className="flex flex-wrap items-center gap-1.5"><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-semibold text-violet-700">{item.competencyLabel}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">L{item.level} · {item.levelLabel}</span>{recommendedIds.has(item.id) && <span className="rounded-full bg-indigo-100 px-2 py-1 text-[9px] font-bold text-indigo-700">Önerilen</span>}</div><h3 className="mt-3 text-sm font-semibold leading-5">{item.name}</h3><p className="mt-1 text-[11px] text-slate-500">{item.type} · {item.duration}</p><p className="mt-3 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{item.description}</p><div className="mt-3 rounded-xl bg-slate-50 p-3 text-[10px] leading-4 text-slate-500 dark:bg-slate-950/40"><strong className="text-slate-700 dark:text-slate-200">İşe transfer:</strong> {item.transferTask}</div><div className="mt-2 flex flex-wrap gap-1">{item.evidenceMechanisms.map((mechanism) => <span key={mechanism} className="rounded-md bg-emerald-50 px-1.5 py-1 text-[9px] font-semibold text-emerald-700">{mechanism}</span>)}</div></div>)}</div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900"><strong className="text-slate-800 dark:text-white">Kanıt tasarım notu:</strong> Kütüphane “bu eğitim herkeste kesin etki yaratır” iddiası taşımaz. Müdahaleler uygulama, geri bildirim, aralıklı tekrar/geri çağırma, hedef takibi ve işe transfer gibi araştırma destekli öğrenme ilkeleri üzerine tasarlanmıştır. <span className="ml-1">{DEVELOPMENT_EVIDENCE_REFERENCES.map((reference) => `${reference.reference} — ${reference.label}`).join(" · ")}</span></div>
    </>}

    {tab === "manage" && <div className="grid items-start gap-5 xl:grid-cols-[380px_1fr]">
      <form onSubmit={assign} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-violet-600"/><h2 className="text-sm font-semibold">Gelişim müdahalesi ata</h2></div>
        <div className="mt-4 space-y-3">
          <select value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Çalışan seçin</option>{manageable.map((employee: any) => <option key={employee.id ?? employee["Ad Soyad"]}>{employee["Ad Soyad"]}</option>)}</select>
          {recommendations.length > 0 && <div className="rounded-xl bg-indigo-50 p-3 text-[10px] leading-4 text-indigo-800"><strong>FutureHR reçetesi:</strong> Seçili çalışan için {recommendations.length} uygun müdahale önerildi. Aşağıdaki listede ★ ile gösterilir.</div>}
          <select value={form.trainingId} onChange={(e) => setForm({ ...form, trainingId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Müdahale seçin</option>{DEVELOPMENT_LIBRARY.map((item) => <option key={item.id} value={item.id}>{recommendedIds.has(item.id) ? "★ " : ""}{item.competencyCode} · L{item.level} · {item.name}</option>)}</select>
          {form.trainingId && (() => { const item = findDevelopmentIntervention(form.trainingId); return item ? <div className="rounded-xl border border-slate-200 p-3 text-[10px] leading-4 text-slate-500"><p><strong className="text-slate-700">Transfer görevi:</strong> {item.transferTask}</p><p className="mt-1"><strong className="text-slate-700">Başarı ölçütü:</strong> {item.successMetric}</p><p className="mt-1"><strong className="text-slate-700">Yeniden ölçüm:</strong> tamamlandıktan {item.reassessDays} gün sonra</p></div> : null; })()}
          <label className="block text-xs font-medium text-slate-600">Son tarih<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></label>
          <button className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Atama Yap</button>
        </div>
      </form>
      <PremiumTrainingTable title="Ekip Gelişim Takibi" description="Atanmış müdahaleleri ve işe transfer kanıtlarının yönetici doğrulamasını izleyin." rows={teamAssignments} onEvidence={openEvidence} overdue={overdue}/>
    </div>}

    {evidenceItem && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-[1px] sm:items-center" onClick={() => setEvidenceItemId(null)}>
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-600">Gelişim kanıtı</p><h2 className="mt-1 text-lg font-semibold">{evidenceItem.trainingName}</h2><p className="mt-1 text-xs text-slate-500">{evidenceItem.employee} · {learningEvidenceLabel(evidenceState!)}</p></div>
          <button type="button" onClick={() => setEvidenceItemId(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600 dark:bg-slate-950/40"><strong className="text-slate-800 dark:text-white">İşe transfer görevi</strong><p className="mt-1">{evidenceItem.transferTask || findDevelopmentIntervention(evidenceItem.trainingId)?.transferTask || "Gerçek iş üzerinde uygulama kanıtı bekleniyor."}</p></div>
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600 dark:bg-slate-950/40"><strong className="text-slate-800 dark:text-white">Başarı ölçütü</strong><p className="mt-1">{evidenceItem.successMetric || findDevelopmentIntervention(evidenceItem.trainingId)?.successMetric || "Yönetici tarafından doğrulanabilir ölçülebilir çıktı."}</p></div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">İşe transfer kanıtı</label>
          <textarea value={evidenceDraft} onChange={(e) => setEvidenceDraft(e.target.value)} disabled={!canSubmitOwnEvidence} rows={5} placeholder="Örn. süreci hangi gerçek işte uyguladınız, hangi çıktı değişti, hangi ölçümü/örneği yöneticiniz doğrulayabilir?" className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950/30"/>
          <p className="mt-1 text-[10px] text-slate-400">Müşteri, sağlık, özel nitelikli kişisel veri veya gizli şirket bilgisi yazmayın. Somut davranış ve iş çıktısını tarif edin.</p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-3 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2"><span>Öğrenme tamamlandı</span><strong>{shortDate(evidenceItem.completedAt)}</strong></div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span>Yeniden ölçüm hedefi</span><strong>{shortDate(evidenceItem.reassessDueAt)}</strong></div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span>Yönetici doğrulaması</span><strong className={evidenceItem.managerVerified ? "text-emerald-600" : "text-amber-600"}>{evidenceItem.managerVerified ? `${evidenceItem.verifiedBy || "Doğrulandı"} · ${shortDate(evidenceItem.verifiedAt)}` : "Bekleniyor"}</strong></div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {canSubmitOwnEvidence && <button type="button" onClick={saveTransferEvidence} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white">Transfer kanıtını kaydet</button>}
          {canVerifyTeamEvidence && <button type="button" onClick={verifyTransferEvidence} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white"><ShieldCheck className="h-4 w-4"/>Kanıtı doğrula</button>}
          {!canSubmitOwnEvidence && !canVerifyTeamEvidence && evidenceItem.managerVerified && <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>Evidence Graph için doğrulandı</span>}
        </div>
      </div>
    </div>}
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className="h-4 w-4 text-violet-600"/></div><p className="mt-3 text-2xl font-semibold">{value}</p></div>;
}
