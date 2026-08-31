"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Eye, LockKeyhole, Plus, Save, ShieldCheck, Star, Target, Trash2, TrendingUp, Users } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { useNotifications } from "../../../context/NotificationContext";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import {
  calculateCompetencyScore,
  calculatePerformance,
  DEFAULT_KPIS,
  PERFORMANCE_MODEL_VERSION,
  isCompetencySetComplete,
  type KpiItem,
} from "../../../lib/hr/performanceModel";
import { canEvaluateEmployee, getPerformanceViewTargets } from "../../../lib/hr/accessControl";
import {
  createSaasPerformanceEvaluation,
  fetchSaasPerformanceWorkspace,
  SAAS_DATA_MODE,
  type EmployeeRow,
  type EvaluationRow,
  type SecureSessionUser,
} from "../../../lib/hr/saasWorkforceClient";

const COMPETENCIES: Record<string, string> = {
  DIG: "Dijital Okuryazarlık",
  ANA: "Analitik Düşünme",
  RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen",
  LRN: "Sürekli Öğrenme",
  ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin",
  STR: "Dayanıklılık & Stres Yönetimi",
  TEA: "Takım Çalışması",
  COM: "İletişim Becerileri",
};
const legacyTargetLabel: Record<string, string> = { STR: "Stratejik Bakış" };
const emptyScores = Object.fromEntries(Object.keys(COMPETENCIES).map((code) => [code, 0])) as Record<string, number>;
const cloneDefaultKpis = (score = 0): KpiItem[] => DEFAULT_KPIS.map((item) => ({ ...item, score }));
const validFive = (value: unknown) => Number.isFinite(Number(value)) && Number(value) >= 1 && Number(value) <= 5;
const scoreLabel = (value: number) => value > 0 ? value.toFixed(1) : "—";

type DemoUser = {
  username?: string;
  name?: string;
  role?: string;
  dept?: string;
  department?: string;
};

type AccessState = {
  allowed: boolean;
  relation: string | null;
  override: boolean;
  reason?: string;
};

function historyForEmployee(employee: EmployeeRow | null, history: EvaluationRow[]) {
  if (!employee) return [];
  const id = String(employee.id || "");
  const name = employee["Ad Soyad"];
  return history
    .filter((record) => String(record.employee_id || "") === id || record.Personel === name)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

export default function DegerlendirmePage() {
  const { showToast } = useNotifications();
  const searchParams = useSearchParams();
  const requestedEmployee = searchParams.get("employeeName") || "";

  const [user, setUser] = useState<DemoUser | SecureSessionUser | null>(null);
  const [orgData, setOrgData] = useState<EmployeeRow[]>([]);
  const [history, setHistory] = useState<EvaluationRow[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({ ...emptyScores });
  const [kpis, setKpis] = useState<KpiItem[]>(cloneDefaultKpis());
  const [managerPerformance, setManagerPerformance] = useState(0);
  const [note, setNote] = useState("");
  const [isStarPerformer, setIsStarPerformer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const reload = async () => {
    setLoadError("");
    try {
      if (SAAS_DATA_MODE) {
        const workspace = await fetchSaasPerformanceWorkspace();
        setUser(workspace.user);
        setOrgData(workspace.employees);
        setHistory(workspace.evaluations);
      } else {
        const demoUser = getStorageData<DemoUser | null>(STORAGE_KEYS.CURRENT_USER, null);
        const demoEmployees = getStorageData<EmployeeRow[]>(STORAGE_KEYS.ORG_CHART, []);
        const demoHistory = getStorageData<EvaluationRow[]>(STORAGE_KEYS.HISTORY_360, []);
        setUser(demoUser);
        setOrgData(demoEmployees);
        setHistory(demoHistory);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Performans verisi yüklenemedi.");
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
    return () => window.removeEventListener("dataUpdated", refresh);
  }, []);

  const employees = useMemo(() => {
    if (SAAS_DATA_MODE) return orgData;
    return getPerformanceViewTargets(user as DemoUser | null, orgData) as EmployeeRow[];
  }, [user, orgData]);

  useEffect(() => {
    if (!employees.length) return;
    const requested = requestedEmployee && employees.find((employee) => employee["Ad Soyad"] === requestedEmployee);
    const currentExists = employees.some((employee) => employee["Ad Soyad"] === selectedName);
    if (requested) setSelectedName(requested["Ad Soyad"]);
    else if (!currentExists) setSelectedName(employees[0]["Ad Soyad"]);
  }, [employees, requestedEmployee, selectedName]);

  const selected = useMemo(
    () => orgData.find((employee) => employee["Ad Soyad"] === selectedName) || null,
    [orgData, selectedName],
  );

  const access = useMemo<AccessState>(() => {
    if (!selected) return { allowed: false, relation: null, override: false, reason: "Çalışan seçilmedi." };
    if (SAAS_DATA_MODE) {
      return {
        allowed: Boolean(selected.__canEvaluate),
        relation: selected.__relation || null,
        override: false,
        reason: selected.__canEvaluate ? undefined : "Bu kayıt backend yetki kapsamınızda salt okunur.",
      };
    }
    return canEvaluateEmployee(user as DemoUser | null, selected) as AccessState;
  }, [user, selected]);

  const canEdit = access.allowed;
  const selectedHistory = useMemo(() => historyForEmployee(selected, history), [selected, history]);

  useEffect(() => {
    const latest = selectedHistory[0];
    if (!latest) {
      setScores({ ...emptyScores });
      setKpis(cloneDefaultKpis());
      setManagerPerformance(0);
      setNote("");
      setIsStarPerformer(false);
      return;
    }
    const latestScores = latest.manager_scores && typeof latest.manager_scores === "object" ? latest.manager_scores : {};
    const legacyPerformance = validFive(latest.Performans) ? Number(latest.Performans) : 0;
    const storedKpis = Array.isArray(latest.kpi_items) && latest.kpi_items.length ? latest.kpi_items : cloneDefaultKpis(legacyPerformance);
    setScores({ ...emptyScores, ...latestScores });
    setKpis(storedKpis.map((item, index) => ({
      id: String(item.id || `kpi-${index + 1}`),
      title: String(item.title || `Hedef ${index + 1}`),
      weight: Number(item.weight || 0),
      score: validFive(item.score) ? Number(item.score) : legacyPerformance,
    })));
    const managerRaw = Number(latest.manager_performance_score ?? legacyPerformance);
    setManagerPerformance(validFive(managerRaw) ? managerRaw : 0);
    setNote(String(latest.note || ""));
    setIsStarPerformer(Boolean(latest.is_star_performer));
  }, [selectedHistory]);

  const performanceResult = useMemo(() => calculatePerformance(kpis, managerPerformance), [kpis, managerPerformance]);
  const competencyScore = useMemo(() => calculateCompetencyScore(scores), [scores]);
  const competencyComplete = useMemo(() => isCompetencySetComplete(scores, 10), [scores]);
  const weightsValid = Math.abs(performanceResult.totalKpiWeight - 100) < 0.01;
  const kpiScoresComplete = kpis.length > 0 && kpis.every((item) => validFive(item.score));
  const targetResolution = useMemo(() => resolveTargetProfile(selected?.Pozisyon || ""), [selected?.Pozisyon]);

  const roleGapData = useMemo(() => Object.entries(COMPETENCIES).map(([code, label]) => {
    const targetLabel = targetResolution.profile[label] !== undefined ? label : legacyTargetLabel[code];
    const targetValue = Number((targetLabel && targetResolution.profile[targetLabel]) || 0);
    const currentValue = Number(scores[code] || 0);
    return {
      code,
      label,
      current: currentValue,
      target: targetValue,
      gap: targetValue > 0 && currentValue > 0 ? Number((targetValue - currentValue).toFixed(2)) : null,
    };
  }), [scores, targetResolution]);

  const targetCount = roleGapData.filter((item) => item.target > 0).length;
  const measuredCount = roleGapData.filter((item) => item.target > 0 && item.current > 0).length;
  const roleFitCoverage = targetCount ? Math.round((measuredCount / targetCount) * 100) : 0;
  const positiveGaps = roleGapData.filter((item) => item.gap !== null && Number(item.gap) > 0).sort((a, b) => Number(b.gap) - Number(a.gap));

  const updateKpi = (id: string, patch: Partial<KpiItem>) => setKpis((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addKpi = () => setKpis((items) => [...items, { id: `kpi-${Date.now()}`, title: `Yeni hedef ${items.length + 1}`, weight: 0, score: 0 }]);
  const removeKpi = (id: string) => setKpis((items) => items.filter((item) => item.id !== id));

  const save = async () => {
    if (!selected || !canEdit) return showToast(access.reason || "Bu çalışanı değerlendirme yetkiniz yok.", "error");
    if (!weightsValid) return showToast("KPI ağırlıkları toplamı %100 olmalıdır.", "error");
    if (kpis.some((item) => !item.title.trim())) return showToast("KPI/hedef başlıkları boş bırakılamaz.", "error");
    if (!kpiScoresComplete) return showToast("Tüm KPI/hedef sonuçlarını 1–5 arasında puanlayın.", "error");
    if (!validFive(managerPerformance)) return showToast("Yönetici performans gözlemini 1–5 arasında puanlayın.", "error");
    if (!competencyComplete) return showToast("10 yetkinliğin tamamını 1–5 arasında puanlayın.", "error");

    setSaving(true);
    try {
      if (SAAS_DATA_MODE) {
        const created = await createSaasPerformanceEvaluation({
          employee_id: String(selected.id),
          performance_model_version: PERFORMANCE_MODEL_VERSION,
          kpi_items: kpis.map((item) => ({ ...item })),
          manager_performance_score: managerPerformance,
          manager_scores: { ...scores },
          note,
          is_star_performer: isStarPerformer,
        });
        await reload();
        window.dispatchEvent(new CustomEvent("talentMatrixUpdated"));
        showToast(`Değerlendirme güvenli SaaS kaydına yazıldı. Nihai performans: ${created.Performans.toFixed(2)} / 5`, "success");
        return;
      }

      const record: EvaluationRow = {
        id: `eval-${Date.now()}`,
        Personel: selectedName,
        employee_id: String(selected.id || ""),
        evaluator: "name" in (user || {}) ? String((user as DemoUser)?.name || (user as DemoUser)?.username || "") : "",
        evaluation_type: access.relation || "Yetkili Yönetici",
        authority_context: { relation: access.relation, override: access.override, role: (user as DemoUser)?.role || "" },
        date: new Date().toISOString(),
        performance_model_version: PERFORMANCE_MODEL_VERSION,
        kpi_items: kpis.map((item) => ({ ...item })),
        kpi_score: performanceResult.kpiScore,
        manager_performance_score: performanceResult.managerScore,
        performance_weights: { kpi: performanceResult.kpiWeight, manager: performanceResult.managerWeight },
        Performans: performanceResult.finalScore,
        competency_score: competencyScore,
        manager_scores: { ...scores },
        note,
        is_star_performer: isStarPerformer,
      };
      const next = [record, ...history];
      setHistory(next);
      setStorageData(STORAGE_KEYS.HISTORY_360, next);
      window.dispatchEvent(new CustomEvent("dataUpdated"));
      window.dispatchEvent(new CustomEvent("talentMatrixUpdated"));
      showToast(`Değerlendirme kaydedildi. Nihai performans: ${performanceResult.finalScore.toFixed(2)} / 5`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Değerlendirme kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const aiContext = selected ? {
    module: "performance_competency",
    employee: { position: selected.Pozisyon, department: selected.Departman },
    currentEvaluation: {
      complete: performanceResult.complete && competencyComplete,
      finalPerformance: performanceResult.finalScore || null,
      kpiScore: performanceResult.kpiScore || null,
      managerObservation: performanceResult.managerScore || null,
      competencyScore: competencyComplete ? competencyScore : null,
      roleFitCoverage,
      kpiWeightsValid: weightsValid,
      topRoleGaps: positiveGaps.slice(0, 5),
      starSignal: isStarPerformer,
    },
    history: selectedHistory.slice(0, 4).map((item) => ({ date: item.date, performance: item.Performans, competency: item.competency_score || null })),
    instruction: "Eksik veriyi ortalama kabul etme. Skorları değiştirme veya nihai performans kararı verme; tutarsızlıkları ve doğrulanması gereken kanıtları göster.",
  } : {};

  if (loading) return <div className="enterprise-card p-8 text-sm text-slate-500">Performans çalışma alanı yükleniyor…</div>;
  if (!employees.length) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"><LockKeyhole className="mx-auto h-7 w-7 text-slate-300"/><h2 className="mt-3 text-sm font-semibold">Görüntülenecek performans kaydı yok</h2><p className="mt-1 text-xs text-slate-500">Yönetici kapsamı backend&apos;de organizasyon ilişkilerinden belirlenir; İK salt okunur şirket görünümüne sahiptir.</p></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Performans kalibrasyonu</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Performans & Yetkinlik Değerlendirme</h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">Nihai performans = KPI/Hedef Başarısı %60 + Yönetici Performans Gözlemi %40. SaaS modunda skor backend tarafından yeniden hesaplanır ve tenant kaydına yazılır.</p>
        </div>
        {SAAS_DATA_MODE&&<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5"/>Tenant API aktif</span>}
      </div>

      {loadError&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{loadError}</div>}

      <div className={`rounded-2xl border p-4 text-xs leading-5 ${canEdit ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        <div className="flex items-start gap-2">{canEdit?<Users className="mt-0.5 h-4 w-4"/>:<Eye className="mt-0.5 h-4 w-4"/>}<div><strong>{canEdit?`Değerlendirme yetkisi: ${access.relation}`:"Salt okunur görünüm"}</strong><p className="mt-0.5">{canEdit?"Yetki ilişkisi backend oturumunuz ve çalışan yönetici bağlantısından doğrulanır.":access.reason}</p></div></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <section className="enterprise-card p-5">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold">Değerlendirme bağlamı</h2></div>
            <label className="mt-4 block text-xs font-medium text-slate-600">Çalışan<select value={selectedName} onChange={(event)=>setSelectedName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{employees.map((employee)=><option key={String(employee.id)}>{employee["Ad Soyad"]}</option>)}</select></label>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><strong>{selected?.Pozisyon||"Pozisyon bilgisi yok"}</strong><br/>{selected?.Departman||""}<div className="mt-2 text-[10px] font-semibold text-blue-600">{access.relation||"İzleme kapsamı"}</div></div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-blue-100">Nihai performans</p><p className="mt-2 text-4xl font-semibold tracking-[-.04em]">{performanceResult.finalScore>0?performanceResult.finalScore.toFixed(2):"—"} <span className="text-sm font-medium text-blue-100">/ 5</span></p></div><TrendingUp className="h-5 w-5 text-blue-100"/></div><p className="mt-2 text-[11px] text-blue-100">Backend aynı %60 / %40 modelini yeniden doğrular.</p></div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 p-4"><MiniScore label="KPI / Hedef" value={performanceResult.kpiScore}/><MiniScore label="Yönetici" value={performanceResult.managerScore}/></div>
          </section>

          <section className="enterprise-card p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Genel Yetkinlik Skoru</p><p className="mt-1 text-2xl font-semibold">{competencyComplete?competencyScore.toFixed(2):"—"} / 5</p></div><Target className="h-5 w-5 text-violet-600"/></div></section>
          <button disabled={!canEdit} type="button" onClick={()=>setIsStarPerformer((value)=>!value)} className={`w-full rounded-2xl border p-4 text-left transition disabled:opacity-50 ${isStarPerformer?"border-amber-300 bg-amber-50":"border-slate-200 bg-white"}`}><div className="flex items-center gap-3"><Star className={`h-5 w-5 ${isStarPerformer?"fill-amber-500 text-amber-500":"text-slate-400"}`}/><div><p className="text-sm font-semibold">Yıldız segment işareti</p><p className="mt-1 text-[11px] text-slate-500">Manuel yetenek sinyali; performans skoruna ek puan vermez.</p></div></div></button>
        </aside>

        <main className="space-y-5">
          <fieldset disabled={!canEdit||saving} className={!canEdit?"opacity-70":""}>
            <section className="enterprise-card p-5">
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold">KPI / Hedef Başarısı</h2></div><p className="mt-1 text-xs text-slate-500">Ağırlık toplamı %100 olmalı ve tüm skorlar 1–5 aralığında tamamlanmalıdır.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${weightsValid?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>Toplam %{performanceResult.totalKpiWeight}</span></div>
              <div className="mt-4 space-y-2">{kpis.map((item)=><div key={item.id} className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-[1fr_90px_150px_34px] sm:items-center"><input value={item.title} onChange={(event)=>updateKpi(item.id,{title:event.target.value})} className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"/><label className="flex items-center gap-1 rounded-lg border border-slate-200 px-2"><input type="number" min="0" max="100" value={item.weight} onChange={(event)=>updateKpi(item.id,{weight:Number(event.target.value)})} className="h-9 w-full bg-transparent text-right text-xs outline-none"/><span className="text-xs text-slate-400">%</span></label><div><div className="flex justify-between text-[10px] text-slate-400"><span>Sonuç</span><strong className="text-blue-700">{scoreLabel(item.score)}</strong></div><input type="range" min="0" max="5" step="0.1" value={item.score} onChange={(event)=>updateKpi(item.id,{score:Number(event.target.value)})} className="mt-1 w-full"/></div><button type="button" onClick={()=>removeKpi(item.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>
              <button type="button" onClick={addKpi} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold"><Plus className="h-3.5 w-3.5"/>Hedef ekle</button>
              <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex justify-between text-xs"><span className="font-medium text-slate-600">Yönetici performans gözlemi · %40</span><strong className="text-blue-700">{scoreLabel(managerPerformance)} / 5</strong></div><input type="range" min="0" max="5" step="0.1" value={managerPerformance} onChange={(event)=>setManagerPerformance(Number(event.target.value))} className="mt-2 w-full"/></div>
            </section>

            <section className="mt-5 enterprise-card p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-violet-600"/><h2 className="text-sm font-semibold">Yetkinlik puanlama</h2></div><div className="mt-4 grid gap-x-6 gap-y-4 lg:grid-cols-2">{Object.entries(COMPETENCIES).map(([code,label])=><div key={code}><div className="flex justify-between text-xs"><span>{label}</span><strong className="text-violet-700">{scoreLabel(scores[code])}</strong></div><input type="range" min="0" max="5" step="0.1" value={scores[code]} onChange={(event)=>setScores({...scores,[code]:Number(event.target.value)})} className="mt-2 w-full"/></div>)}</div><label className="mt-5 block text-xs font-medium text-slate-600">Yönetici notu<textarea value={note} onChange={(event)=>setNote(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label><button type="button" onClick={()=>void save()} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4"/>{saving?"Kaydediliyor…":"Değerlendirmeyi kaydet"}</button></section>
          </fieldset>
        </main>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="enterprise-card p-5"><h2 className="text-sm font-semibold">Rol hedef farkları</h2><p className="mt-1 text-xs text-slate-500">Hedef profil kaynağı: {targetResolution.source} · veri kapsamı %{roleFitCoverage}</p><div className="mt-4 space-y-2">{positiveGaps.slice(0,6).map((item)=><div key={item.code} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"><span>{item.label}</span><span className="font-semibold text-amber-700">{item.current.toFixed(1)} → {item.target.toFixed(1)}</span></div>)}{!positiveGaps.length&&<p className="text-xs text-slate-500">Ölçülmüş pozitif yetkinlik açığı yok veya veri henüz tamamlanmadı.</p>}</div></section>
        <section className="enterprise-card p-5"><h2 className="text-sm font-semibold">Performans geçmişi</h2><p className="mt-1 text-xs text-slate-500">Kayıtlar backend zaman damgasıyla sıralanır.</p><div className="mt-4 space-y-2">{selectedHistory.slice(0,6).map((item)=><div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5"><div><p className="text-xs font-semibold">{new Date(item.date).toLocaleDateString("tr-TR")}</p><p className="text-[10px] text-slate-400">{item.evaluator||item.evaluation_type||"Değerlendirme"}</p></div><span className="text-sm font-semibold text-blue-700">{Number(item.Performans).toFixed(2)} / 5</span></div>)}{!selectedHistory.length&&<p className="text-xs text-slate-500">Henüz geçmiş değerlendirme yok.</p>}</div></section>
      </div>

      {selected&&<AIDecisionSupport kind="performance" context={aiContext} resetKey={selectedName} title="AI Performans & Yetkinlik Kalibrasyonu" description="Canlı KPI sonuçlarını, yetkinlik açıklarını ve geçmiş trendi birlikte inceler; puanı değiştirmez ve nihai insan kararının yerine geçmez." buttonLabel="Performans analizini oluştur" questionTitle="Kalibrasyon soruları"/>}
    </div>
  );
}

function MiniScore({label,value}:{label:string;value:number}){
  return <div className="px-2"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value>0?value.toFixed(2):"—"}</p></div>;
}
