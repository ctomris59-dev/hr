"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ListChecks, Plus, Target, UserRound } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { extractCompetencyMap } from "../../../lib/hr/talentPotential";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import { latestEvaluationForEmployee } from "../../../lib/hr/employeeIdentity";
import { useNotifications } from "../../../context/NotificationContext";
import { learningEvidenceForEmployee, recommendedInterventions, type DevelopmentIntervention } from "../../../lib/hr/developmentLibrary";

interface DevelopmentPlan {
  id: string;
  employee: string;
  competency?: string;
  goal: string;
  action: string;
  actionType: "İş Üstünde" | "Koçluk" | "Proje" | "Formal Eğitim" | "Okuma / Araştırma";
  successMetric: string;
  dueDate?: string;
  status: "Planlandı" | "Devam Ediyor" | "Tamamlandı";
  createdBy: string;
  createdAt: string;
  transferredToTraining?: boolean;
  interventionId?: string;
  reassessDays?: number;
}

const ACTION_TYPES: DevelopmentPlan["actionType"][] = ["İş Üstünde", "Koçluk", "Proje", "Formal Eğitim", "Okuma / Araştırma"];
const LABEL_TO_CODE: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG", "Analitik Düşünme": "ANA", "Sonuç Odaklılık": "RES", "Detaylara Özen": "DET", "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH", "Öz-Disiplin": "DIS", "Dayanıklılık & Stres Yönetimi": "STR", "Takım Çalışması": "TEA", "İletişim Becerileri": "COM",
};

function planActionType(item: DevelopmentIntervention): DevelopmentPlan["actionType"] {
  if (item.type === "Koçluk / Mentorluk") return "Koçluk";
  if (item.type === "Gelişim Projesi" || item.type === "Liderlik Uygulaması") return "Proje";
  if (item.type === "Mikro Öğrenme" || item.type === "Uygulamalı Eğitim") return "Formal Eğitim";
  return "İş Üstünde";
}

export default function GelisimPage() {
  const { addNotification, showToast } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [form, setForm] = useState({ competency: "", goal: "", action: "", actionType: "İş Üstünde" as DevelopmentPlan["actionType"], successMetric: "", dueDate: "", interventionId: "", reassessDays: 60 });

  useEffect(() => {
    const reload = () => {
      setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
      setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
      setPlans(getStorageData<DevelopmentPlan[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []));
      setAssessments(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
      setAssignments(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []));
    };
    reload();
    window.addEventListener("dataUpdated", reload);
    window.addEventListener("userChanged", reload);
    return () => { window.removeEventListener("dataUpdated", reload); window.removeEventListener("userChanged", reload); };
  }, []);

  const role = String(user?.role || "").toUpperCase();
  const isEmployee = role === "PERSONEL" || role === "EMPLOYEE";
  const canCreatePlan = ["CEO", "IK", "DIRECTOR", "MANAGER"].includes(role);
  const employees = useMemo(() => {
    if (!user) return [];
    if (role === "CEO" || role === "IK") return orgData;
    if (isEmployee) return orgData.filter((person) => person["Ad Soyad"] === user?.name);
    try { return getManageableEmployees(user, orgData); } catch { return []; }
  }, [user, orgData, role, isEmployee]);

  useEffect(() => {
    if (employees.length && (!selectedName || !employees.some((person) => person["Ad Soyad"] === selectedName))) setSelectedName(employees[0]["Ad Soyad"]);
  }, [employees, selectedName]);

  const selectedOrg = orgData.find((employee) => employee["Ad Soyad"] === selectedName) || {};
  const latestAssessment = selectedName ? latestEvaluationForEmployee(selectedOrg, assessments) || {} : {};
  const selected = { ...selectedOrg, ...latestAssessment };
  const targetResolution = resolveTargetProfile(selectedOrg.Pozisyon || "");
  const current = extractCompetencyMap(selected);
  const gaps = Object.entries(targetResolution.profile).map(([label, expected]) => {
    const code = LABEL_TO_CODE[label] || label;
    const actual = Number(current[code] || 0);
    return { label, code, actual, expected: Number(expected), gap: Number(expected) - actual };
  }).filter((item) => item.actual > 0 && item.gap > 0).sort((a, b) => b.gap - a.gap);

  const prescriptions = useMemo(() => gaps.slice(0, 3).flatMap((gap) => recommendedInterventions(gap.code, gap.actual, gap.expected, 2).map((item) => ({ ...item, gap: gap.gap, actual: gap.actual, expected: gap.expected }))).filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 6), [gaps]);
  const employeePlans = plans.filter((plan) => plan.employee === selectedName);
  const activePlans = employeePlans.filter((plan) => plan.status !== "Tamamlandı");
  const completedPlans = employeePlans.filter((plan) => plan.status === "Tamamlandı");
  const learningEvidence = learningEvidenceForEmployee(selectedName, assignments);

  const aiContext = selectedName ? {
    module: "development_plan",
    employee: { position: selectedOrg.Pozisyon || "", department: selectedOrg.Departman || "" },
    evidence: { performance: Number(latestAssessment.Performans || latestAssessment.performance || 0) || null, competencyScore: Number(latestAssessment.competency_score || 0) || null, completedLearning: learningEvidence.slice(0, 8) },
    roleTarget: { source: targetResolution.source, referenceCount: targetResolution.referenceCount, topGaps: gaps.slice(0, 5) },
    developmentPrescription: prescriptions.map((item) => ({ id: item.id, competency: item.competencyCode, level: item.level, type: item.type, name: item.name, transferTask: item.transferTask, successMetric: item.successMetric, reassessDays: item.reassessDays })),
    currentPlans: employeePlans.slice(0, 8).map((plan) => ({ competency: plan.competency || null, goal: plan.goal, action: plan.action, actionType: plan.actionType, successMetric: plan.successMetric, dueDate: plan.dueDate || null, status: plan.status })),
    planSummary: { active: activePlans.length, completed: completedPlans.length, total: employeePlans.length, completedLearningEvidence: learningEvidence.length },
    instruction: isEmployee ? "Çalışanın kendi gelişim görünümünü destekle. Kütüphanedeki kanıta dayalı müdahaleleri seçenek olarak açıkla; otomatik plan veya kariyer kararı verme." : "En kritik yetkinlik açıklarını önceliklendir. Kütüphanedeki formal eğitim, iş üstü uygulama, proje ve koçluğu birlikte kullan; ölçülebilir başarı kriteri ve yeniden ölçüm öner. Otomatik insan kararı verme.",
  } : {};

  const savePlans = (next: DevelopmentPlan[]) => { setPlans(next); setStorageData(STORAGE_KEYS.DEVELOPMENT_PLANS, next); window.dispatchEvent(new CustomEvent("dataUpdated")); };

  const usePrescription = (item: DevelopmentIntervention) => {
    setForm({ competency: item.competencyLabel, goal: `${item.competencyLabel} yetkinliğini rol hedefiyle daha güçlü hizalamak`, action: `${item.name}. İşe transfer görevi: ${item.transferTask}`, actionType: planActionType(item), successMetric: item.successMetric, dueDate: "", interventionId: item.id, reassessDays: item.reassessDays });
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreatePlan || !selectedName || !form.goal.trim() || !form.action.trim() || !form.successMetric.trim()) return;
    const plan: DevelopmentPlan = { id: `dev-${Date.now()}`, employee: selectedName, competency: form.competency || undefined, goal: form.goal.trim(), action: form.action.trim(), actionType: form.actionType, successMetric: form.successMetric.trim(), dueDate: form.dueDate || undefined, status: "Planlandı", createdBy: user?.name || user?.username || "", createdAt: new Date().toISOString(), interventionId: form.interventionId || undefined, reassessDays: form.reassessDays };
    savePlans([plan, ...plans]);
    addNotification(`Yeni gelişim aksiyonu tanımlandı: ${plan.goal}`, "info", { targetUser: selectedName, link: "/gelisim", source: "development" });
    setForm({ competency: "", goal: "", action: "", actionType: "İş Üstünde", successMetric: "", dueDate: "", interventionId: "", reassessDays: 60 });
  };

  const updateStatus = (id: string, status: DevelopmentPlan["status"]) => savePlans(plans.map((plan) => plan.id === id ? { ...plan, status } : plan));
  const sendToTraining = (plan: DevelopmentPlan) => {
    if (!canCreatePlan) return;
    const trainingAssignments = getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
    if (trainingAssignments.some((assignment) => assignment.sourceDevelopmentPlanId === plan.id)) return showToast("Bu aksiyon zaten Eğitim modülüne aktarıldı.", "info");
    const interventionId = plan.interventionId || `dev-${plan.id}`;
    const assignment = { id: `training-${Date.now()}`, employee: plan.employee, trainingId: interventionId, trainingName: plan.action.split(". İşe transfer görevi:")[0], source: "Gelişim Planı", sourceDevelopmentPlanId: plan.id, assignedBy: user?.name || "", assignedAt: new Date().toISOString(), dueDate: plan.dueDate, status: "Atandı", competencyCode: plan.competency ? LABEL_TO_CODE[plan.competency] : undefined, transferTask: plan.action, successMetric: plan.successMetric };
    setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, [assignment, ...trainingAssignments]);
    setAssignments([assignment, ...trainingAssignments]);
    savePlans(plans.map((item) => item.id === plan.id ? { ...item, transferredToTraining: true } : item));
    addNotification(`${assignment.trainingName} Eğitim & Gelişim modülüne aktarıldı.`, "info", { targetUser: plan.employee, link: "/egitim", source: "development" });
  };

  if (!employees.length) return <div className="enterprise-card p-8 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-300"/><h1 className="mt-3 text-lg font-semibold">Gelişim profili bulunamadı</h1><p className="mt-1 text-sm text-slate-500">Demo personanız organizasyon kaydıyla eşleşmiyor.</p></div>;

  return <div className="space-y-5">
    <header className="futurehr-page-header"><p className="futurehr-page-eyebrow">{isEmployee ? "Benim gelişimim" : "Gelişim planlama"}</p><h1 className="futurehr-page-title">Gelişim Planı</h1><p className="futurehr-page-lede">Yetkinlik açığı → önerilen aksiyon → uygulama → başarı kanıtı → yeniden ölçüm zinciri.</p></header>

    <div className="grid gap-5 xl:grid-cols-[360px_1fr]"><div className="space-y-4"><div className="enterprise-card p-5">{isEmployee ? <div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-slate-400">Çalışan</p><p className="mt-1 text-sm font-semibold">{selectedName}</p></div> : <label className="text-xs font-medium text-slate-500">Çalışan<select value={selectedName} onChange={(e) => setSelectedName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm">{employees.map((employee: any) => <option key={employee.id ?? employee["Ad Soyad"]}>{employee["Ad Soyad"]}</option>)}</select></label>}<div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800"><p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedOrg.Pozisyon || "Pozisyon"}</p><p className="mt-1 text-xs text-slate-500">{gaps.length} yetkinlik açığı · {learningEvidence.length} tamamlanmış gelişim kanıtı</p></div></div><div className="enterprise-card p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-slate-500"/><h2 className="text-sm font-semibold">Öncelikli gelişim alanları</h2></div><div className="mt-3">{gaps.slice(0,5).map((gap) => <div key={gap.label} className="border-t border-slate-100 py-3 text-xs first:border-t-0 dark:border-slate-800"><div className="flex justify-between gap-3"><span className="font-medium">{gap.label}</span><span className="font-semibold text-amber-700">Açık {gap.gap.toFixed(1)} puan</span></div><p className="mt-1 text-slate-400">Mevcut {gap.actual.toFixed(1)} · hedef {gap.expected.toFixed(1)}</p></div>)}{!gaps.length && <p className="text-xs text-slate-500">Ölçülebilir açık bulunmuyor.</p>}</div></div></div>

      <div className="space-y-4"><section className="enterprise-card p-5"><div className="flex items-start gap-2"><ListChecks className="mt-0.5 h-4 w-4 text-slate-500"/><div><h2 className="text-sm font-semibold text-slate-950 dark:text-white">Önerilen gelişim aksiyonları</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">En büyük yetkinlik açıkları için kütüphaneden eşleşen müdahaleler. Seçim yalnızca plan formunu hazırlar; nihai gelişim kararı kullanıcıdadır.</p></div></div><ol className="mt-3 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">{prescriptions.map((item,index) => <li key={item.id}><button type="button" onClick={() => canCreatePlan && usePrescription(item)} className="grid w-full gap-2 px-1 py-3 text-left hover:bg-slate-50 md:grid-cols-[30px_minmax(0,1fr)_auto] md:items-start dark:hover:bg-slate-800/40"><span className="pt-0.5 text-[10px] font-semibold tabular-nums text-slate-300">{String(index+1).padStart(2,"0")}</span><span><span className="text-[10px] font-semibold uppercase tracking-[.06em] text-slate-500">{item.type} · L{item.level}</span><span className="mt-0.5 block text-xs font-semibold text-slate-900 dark:text-white">{item.name}</span><span className="mt-1 block text-[10px] text-slate-500">Hedeflenen alan: {item.competencyLabel} · yeniden ölçüm {item.reassessDays} gün</span></span><span className="text-[10px] font-semibold text-amber-700">Yetkinlik açığı {item.gap.toFixed(1)} puan</span></button></li>)}</ol><Link href="/egitim" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2f6664]">Müdahale kütüphanesini aç <ArrowRight className="h-3.5 w-3.5"/></Link></section>

        {canCreatePlan && <form onSubmit={create} className="enterprise-card p-5"><div className="flex items-center gap-2"><Plus className="h-4 w-4 text-slate-500"/><h2 className="text-sm font-semibold">Gelişim aksiyonu oluştur</h2>{form.interventionId && <span className="rounded-md border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500">Kütüphane önerisi</span>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Yetkinlik / alan"><input value={form.competency} onChange={(e) => setForm({ ...form, competency: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></Field><Field label="Aksiyon tipi"><select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value as DevelopmentPlan["actionType"] })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm">{ACTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Gelişim hedefi"><textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></Field><Field label="Aksiyon"><textarea value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></Field><Field label="Başarı ölçütü"><input value={form.successMetric} onChange={(e) => setForm({ ...form, successMetric: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></Field><Field label="Son tarih"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></Field></div><button className="mt-4 rounded-lg bg-[#2f6664] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255452]">Aksiyonu ekle</button></form>}
      </div></div>

    {selectedName && <AIDecisionSupport kind="development" context={aiContext} resetKey={selectedName} title={isEmployee ? "AI Gelişim Rehberi" : "AI Gelişim Karar Desteği"} description="Yetkinlik açığı, rol hedefi, aktif planlar, tamamlanan öğrenme kanıtları ve önerilen gelişim aksiyonlarını birlikte yorumlar." buttonLabel="Gelişim analizini oluştur" questionTitle="Gelişim görüşmesi soruları"/>}

    <div className="enterprise-card p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Aktif gelişim planı</h2><p className="mt-1 text-xs text-slate-500">Kütüphane müdahaleleri Eğitim & Gelişim modülüne aktarılıp tamamlandığında Evidence Graph'a gelişim kanıtı olarak taşınır.</p></div><Link href="/egitim" className="inline-flex items-center gap-1 text-xs font-semibold text-[#2f6664]"><BookOpen className="h-3.5 w-3.5"/> Eğitim & Gelişim <ArrowRight className="h-3.5 w-3.5"/></Link></div><div className="mt-4 space-y-3">{employeePlans.length ? employeePlans.map((plan) => <div key={plan.id} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">{plan.actionType}</span>{plan.competency && <span className="text-xs text-slate-400">{plan.competency}</span>}{plan.interventionId && <span className="rounded-md border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 dark:border-slate-700">Kütüphane önerisi</span>}</div><h3 className="mt-2 text-sm font-semibold">{plan.goal}</h3><p className="mt-1 text-xs text-slate-600">Aksiyon: {plan.action}</p><p className="mt-1 text-xs text-slate-400">Ölçüt: {plan.successMetric}{plan.reassessDays ? ` · yeniden ölçüm ${plan.reassessDays} gün` : ""}</p></div>{canCreatePlan ? <select value={plan.status} onChange={(e) => updateStatus(plan.id, e.target.value as DevelopmentPlan["status"])} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"><option>Planlandı</option><option>Devam Ediyor</option><option>Tamamlandı</option></select> : <span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600">{plan.status}</span>}</div>{canCreatePlan && <button onClick={() => sendToTraining(plan)} disabled={plan.transferredToTraining} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#2f6664] hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">{plan.transferredToTraining ? "Eğitim & Gelişime aktarıldı" : "Eğitim & Gelişim modülüne aktar"}</button>}</div>) : <p className="py-8 text-center text-sm text-slate-500">Henüz gelişim aksiyonu yok.</p>}</div></div>
  </div>;
}

function Field({ label, children }: { label: string; children: any }) { return <label className="text-xs font-medium text-slate-600">{label}<div className="mt-1">{children}</div></label>; }
