"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Target, UserRound } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { extractCompetencyMap } from "../../../lib/hr/talentPotential";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import { latestEvaluationForEmployee } from "../../../lib/hr/employeeIdentity";
import { useNotifications } from "../../../context/NotificationContext";

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
}

const ACTION_TYPES: DevelopmentPlan["actionType"][] = ["İş Üstünde", "Koçluk", "Proje", "Formal Eğitim", "Okuma / Araştırma"];
const LABEL_TO_CODE: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG", "Analitik Düşünme": "ANA", "Sonuç Odaklılık": "RES", "Detaylara Özen": "DET", "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH", "Öz-Disiplin": "DIS", "Dayanıklılık & Stres Yönetimi": "STR", "Takım Çalışması": "TEA", "İletişim Becerileri": "COM",
};

export default function GelisimPage() {
  const { addNotification, showToast } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [form, setForm] = useState({ competency: "", goal: "", action: "", actionType: "İş Üstünde" as DevelopmentPlan["actionType"], successMetric: "", dueDate: "" });

  useEffect(() => {
    const reload = () => {
      setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
      setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
      setPlans(getStorageData<DevelopmentPlan[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []));
      setAssessments(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
    };
    reload();
    window.addEventListener("dataUpdated", reload);
    window.addEventListener("userChanged", reload);
    return () => {
      window.removeEventListener("dataUpdated", reload);
      window.removeEventListener("userChanged", reload);
    };
  }, []);

  const role = String(user?.role || "").toUpperCase();
  const isEmployee = role === "PERSONEL" || role === "EMPLOYEE";
  const canCreatePlan = role === "CEO" || role === "IK" || role === "DIRECTOR" || role === "MANAGER";

  const employees = useMemo(() => {
    if (!user) return [];
    if (role === "CEO" || role === "IK") return orgData;
    if (isEmployee) return orgData.filter((person) => person["Ad Soyad"] === user?.name);
    try { return getManageableEmployees(user, orgData); } catch { return []; }
  }, [user, orgData, role, isEmployee]);

  useEffect(() => {
    if (!employees.length) return;
    if (!selectedName || !employees.some((person) => person["Ad Soyad"] === selectedName)) setSelectedName(employees[0]["Ad Soyad"]);
  }, [employees, selectedName]);

  const selectedOrg = orgData.find((employee) => employee["Ad Soyad"] === selectedName) || {};
  const latestAssessment = selectedName ? latestEvaluationForEmployee(selectedOrg, assessments) || {} : {};
  const selected = { ...selectedOrg, ...latestAssessment };
  const targetResolution = resolveTargetProfile(selectedOrg.Pozisyon || "");
  const current = extractCompetencyMap(selected);
  const gaps = Object.entries(targetResolution.profile)
    .map(([label, expected]) => {
      const code = LABEL_TO_CODE[label] || label;
      const actual = Number(current[code] || 0);
      return { label, actual, expected: Number(expected), gap: Number(expected) - actual };
    })
    .filter((item) => item.actual > 0 && item.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  const employeePlans = plans.filter((plan) => plan.employee === selectedName);
  const activePlans = employeePlans.filter((plan) => plan.status !== "Tamamlandı");
  const completedPlans = employeePlans.filter((plan) => plan.status === "Tamamlandı");
  const aiContext = selectedName ? {
    module: "development_plan",
    employee: { position: selectedOrg.Pozisyon || "", department: selectedOrg.Departman || "" },
    evidence: { performance: Number(latestAssessment.Performans || latestAssessment.performance || 0) || null, competencyScore: Number(latestAssessment.competency_score || 0) || null },
    roleTarget: { source: targetResolution.source, referenceCount: targetResolution.referenceCount, topGaps: gaps.slice(0, 5) },
    currentPlans: employeePlans.slice(0, 8).map((plan) => ({ competency: plan.competency || null, goal: plan.goal, action: plan.action, actionType: plan.actionType, successMetric: plan.successMetric, dueDate: plan.dueDate || null, status: plan.status })),
    planSummary: { active: activePlans.length, completed: completedPlans.length, total: employeePlans.length },
    instruction: isEmployee
      ? "Çalışanın kendi gelişim görünümünü destekle. Otomatik plan ya da kariyer kararı verme; mevcut hedefleri açıklayıp yöneticisiyle görüşebileceği somut gelişim soruları üret."
      : "En kritik yetkinlik açıklarını önceliklendir. Sadece eğitim önermek yerine iş üstünde uygulama, proje, koçluk ve ölçülebilir başarı kriterlerini birlikte düşün. Otomatik plan oluşturma; yöneticinin doğrulayacağı somut aksiyon ve sorular üret.",
  } : {};

  const savePlans = (next: DevelopmentPlan[]) => {
    setPlans(next);
    setStorageData(STORAGE_KEYS.DEVELOPMENT_PLANS, next);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreatePlan || !selectedName || !form.goal.trim() || !form.action.trim() || !form.successMetric.trim()) return;
    const plan: DevelopmentPlan = {
      id: `dev-${Date.now()}`, employee: selectedName, competency: form.competency || undefined, goal: form.goal.trim(), action: form.action.trim(), actionType: form.actionType,
      successMetric: form.successMetric.trim(), dueDate: form.dueDate || undefined, status: "Planlandı", createdBy: user?.name || user?.username || "", createdAt: new Date().toISOString(),
    };
    savePlans([plan, ...plans]);
    addNotification(`Yeni gelişim aksiyonu tanımlandı: ${plan.goal}`, "info", { targetUser: selectedName, link: "/gelisim", source: "development" });
    setForm({ competency: "", goal: "", action: "", actionType: "İş Üstünde", successMetric: "", dueDate: "" });
  };

  const updateStatus = (id: string, status: DevelopmentPlan["status"]) => savePlans(plans.map((plan) => plan.id === id ? { ...plan, status } : plan));
  const sendToTraining = (plan: DevelopmentPlan) => {
    if (!canCreatePlan) return;
    const trainingAssignments = getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
    if (trainingAssignments.some((assignment) => assignment.sourceDevelopmentPlanId === plan.id)) return showToast("Bu aksiyon zaten Eğitim modülüne aktarıldı.", "info");
    const assignment = { id: `training-${Date.now()}`, employee: plan.employee, trainingId: `dev-${plan.id}`, trainingName: plan.action, source: "Gelişim Planı", sourceDevelopmentPlanId: plan.id, assignedBy: user?.name || "", assignedAt: new Date().toISOString(), dueDate: plan.dueDate, status: "Atandı" };
    setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, [assignment, ...trainingAssignments]);
    savePlans(plans.map((item) => item.id === plan.id ? { ...item, transferredToTraining: true } : item));
    addNotification(`${plan.action} eğitimi Eğitim modülüne aktarıldı.`, "info", { targetUser: plan.employee, link: "/egitim", source: "development" });
  };

  if (!employees.length) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><UserRound className="mx-auto h-8 w-8 text-slate-300"/><h1 className="mt-3 text-lg font-semibold">Gelişim profili bulunamadı</h1><p className="mt-1 text-sm text-slate-500">Demo personanız organizasyon kaydıyla eşleşmiyor. Demo personasını yeniden seçin veya organizasyon verisini kontrol edin.</p></div>;
  }

  return <div className="space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-emerald-600">{isEmployee ? "Benim gelişimim" : "Gelişim planlama"}</p><h1 className="mt-1 text-2xl font-semibold">Gelişim Planı</h1><p className="mt-1 text-sm text-slate-500">{isEmployee ? "Size tanımlanan gelişim hedeflerini, aksiyonları ve ilerlemenizi tek yerde takip edin." : "Yetkinlik açığını ölçülebilir hedef, aksiyon ve takip adımına dönüştürün; eğitimi gerektiğinde ayrı modüle aktarın."}</p></div>

    <div className={`grid gap-5 ${canCreatePlan ? "xl:grid-cols-[360px_1fr]" : "xl:grid-cols-[360px_1fr]"}`}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {isEmployee ? <div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-slate-400">Çalışan</p><p className="mt-1 text-sm font-semibold">{selectedName}</p></div> : <label className="text-xs font-medium text-slate-500">Çalışan<select value={selectedName} onChange={(e) => setSelectedName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{employees.map((employee: any) => <option key={employee.id ?? employee["Ad Soyad"]}>{employee["Ad Soyad"]}</option>)}</select></label>}
          <div className="mt-4 rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">{selectedOrg.Pozisyon || "Pozisyon"}</p><p className="mt-1 text-xs text-emerald-700">{gaps.length} ölçülebilir yetkinlik açığı · {targetResolution.modelVersion || "FHR-COMP-JOB-2.0"}{targetResolution.evidenceConfidence ? ` · Güven ${targetResolution.evidenceConfidence}` : ""}</p></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-600"/><h2 className="text-sm font-semibold">Öncelikli gelişim alanları</h2></div><div className="mt-3 space-y-2">{gaps.slice(0, 5).map((gap) => <button key={gap.label} disabled={!canCreatePlan} onClick={() => setForm({ ...form, competency: gap.label, goal: `${gap.label} yetkinliğini rol hedefi olan ${gap.expected.toFixed(1)} seviyesine yaklaştırmak` })} className="w-full rounded-xl bg-slate-50 p-3 text-left text-xs enabled:hover:bg-emerald-50 disabled:cursor-default"><div className="flex justify-between"><span className="font-medium">{gap.label}</span><span className="font-semibold text-red-600">-{gap.gap.toFixed(1)}</span></div><p className="mt-1 text-slate-400">{gap.actual.toFixed(1)} → hedef {gap.expected.toFixed(1)}</p></button>)}{!gaps.length && <p className="text-xs text-slate-500">Yetkinlik verisi veya rol hedefi bulunmuyor.</p>}</div></div>
      </div>

      {canCreatePlan ? <form onSubmit={create} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Plus className="h-4 w-4 text-emerald-600"/><h2 className="text-sm font-semibold">Gelişim aksiyonu oluştur</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Yetkinlik / alan"><input value={form.competency} onChange={(e) => setForm({ ...form, competency: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></Field><Field label="Aksiyon tipi"><select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value as DevelopmentPlan["actionType"] })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm">{ACTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Gelişim hedefi"><textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></Field><Field label="Aksiyon"><textarea value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></Field><Field label="Başarı ölçütü"><input value={form.successMetric} onChange={(e) => setForm({ ...form, successMetric: e.target.value })} placeholder="Örn. 90 gün içinde proje sunumu" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></Field><Field label="Son tarih"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></Field></div><button className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Aksiyonu ekle</button></form>
      : <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5"><p className="text-sm font-semibold text-emerald-900">Yöneticiyle gelişim görüşmesine hazır olun</p><p className="mt-2 text-xs leading-5 text-emerald-800">Bu görünümde yeni hedef ataması yapmazsınız. Mevcut planınızı takip edebilir, gelişim alanlarını inceleyebilir ve AI desteğiyle görüşme soruları hazırlayabilirsiniz.</p></div>}
    </div>

    {selectedName && <AIDecisionSupport kind="development" context={aiContext} resetKey={selectedName} title={isEmployee ? "AI Gelişim Rehberi" : "AI Gelişim Karar Desteği"} description={isEmployee ? "Kendi rolünüz, yetkinlik açıklarınız ve mevcut gelişim planınız üzerinden açıklayıcı gelişim soruları üretir; otomatik kariyer kararı vermez." : "Rol yetkinlik açıklarını, mevcut performans/yetkinlik kanıtlarını ve aktif gelişim planlarını birlikte inceler; yöneticinin doğrulayacağı somut aksiyonları çıkarır."} buttonLabel={isEmployee ? "Gelişimimi yorumla" : "Gelişim analizini oluştur"} questionTitle="Gelişim görüşmesi soruları"/>}

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">{isEmployee ? "Gelişim planım" : "Aktif gelişim planı"}</h2><p className="mt-1 text-xs text-slate-500">{isEmployee ? "İlerleme durumunu güncelleyebilir ve bağlı eğitimlerinizi takip edebilirsiniz." : "Formal eğitim seçilen aksiyonlar Eğitim modülüne aktarılabilir."}</p></div><Link href="/egitim" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">Eğitim modülü <ArrowRight className="h-3.5 w-3.5"/></Link></div><div className="mt-4 space-y-3">{employeePlans.length ? employeePlans.map((plan) => <div key={plan.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{plan.actionType}</span>{plan.competency && <span className="text-xs text-slate-400">{plan.competency}</span>}</div><h3 className="mt-2 text-sm font-semibold">{plan.goal}</h3><p className="mt-1 text-xs text-slate-600">Aksiyon: {plan.action}</p><p className="mt-1 text-xs text-slate-400">Ölçüt: {plan.successMetric}{plan.dueDate ? ` · Son tarih ${plan.dueDate}` : ""}</p></div><select value={plan.status} onChange={(e) => updateStatus(plan.id, e.target.value as DevelopmentPlan["status"])} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"><option>Planlandı</option><option>Devam Ediyor</option><option>Tamamlandı</option></select></div>{canCreatePlan && plan.actionType === "Formal Eğitim" && <button onClick={() => sendToTraining(plan)} disabled={plan.transferredToTraining} className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 disabled:opacity-50">{plan.transferredToTraining ? "Eğitime aktarıldı" : "Eğitim modülüne aktar"}</button>}</div>) : <p className="py-8 text-center text-sm text-slate-500">Henüz gelişim aksiyonu yok.</p>}</div></div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-medium text-slate-600">{label}<div className="mt-1">{children}</div></label>;
}
