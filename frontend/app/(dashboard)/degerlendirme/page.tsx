"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, LockKeyhole, Plus, Save, Star, Target, Trash2, TrendingUp, Users } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip, Line, LineChart, CartesianGrid, XAxis, YAxis,
} from "@/components/charts/recharts";
import { useNotifications } from "../../../context/NotificationContext";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import {
  calculateCompetencyScore, calculatePerformance, DEFAULT_KPIS, PERFORMANCE_MODEL_VERSION,
  isCompetencySetComplete, type KpiItem,
} from "../../../lib/hr/performanceModel";
import {
  canEvaluateEmployee, getPerformanceViewTargets, loadCompanyAccessPolicy,
} from "../../../lib/hr/accessControl";
import { evaluationsForEmployee, findEmployee } from "../../../lib/hr/employeeIdentity";

const COMPETENCIES: Record<string, string> = {
  DIG: "Dijital Okuryazarlık", ANA: "Analitik Düşünme", RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen", LRN: "Sürekli Öğrenme", ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin", STR: "Dayanıklılık & Stres Yönetimi", TEA: "Takım Çalışması", COM: "İletişim Becerileri",
};
const legacyTargetLabel: Record<string, string> = { STR: "Stratejik Bakış" };
const emptyScores = Object.fromEntries(Object.keys(COMPETENCIES).map((code) => [code, 0])) as Record<string, number>;
const cloneDefaultKpis = (score = 0): KpiItem[] => DEFAULT_KPIS.map((item) => ({ ...item, score }));
const validFive = (value: unknown) => Number.isFinite(Number(value)) && Number(value) >= 1 && Number(value) <= 5;
const scoreLabel = (value: number) => value > 0 ? value.toFixed(1) : "—";

export default function DegerlendirmePage() {
  const { showToast } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(emptyScores);
  const [kpis, setKpis] = useState<KpiItem[]>(cloneDefaultKpis());
  const [managerPerformance, setManagerPerformance] = useState(0);
  const [note, setNote] = useState("");
  const [isStarPerformer, setIsStarPerformer] = useState(false);

  useEffect(() => {
    const reload = () => {
      setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
      setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
      setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
    };
    reload();
    window.addEventListener("accessPolicyUpdated", reload);
    window.addEventListener("dataUpdated", reload);
    return () => {
      window.removeEventListener("accessPolicyUpdated", reload);
      window.removeEventListener("dataUpdated", reload);
    };
  }, []);

  const employees = useMemo(() => getPerformanceViewTargets(user, orgData) as any[], [user, orgData]);

  useEffect(() => {
    if (!employees.length) { setSelectedName(""); return; }
    if (!employees.some((employee) => employee["Ad Soyad"] === selectedName)) setSelectedName(employees[0]["Ad Soyad"]);
  }, [employees, selectedName]);

  const selected = useMemo(() => findEmployee(orgData, selectedName), [orgData, selectedName]);
  const access = useMemo(() => canEvaluateEmployee(user, selected || null), [user, selected]);
  const canEdit = access.allowed;
  const selectedHistory = useMemo(() => selected ? evaluationsForEmployee(selected, history) : [], [history, selected]);

  useEffect(() => {
    if (!selectedName) return;
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
    const legacyPerformanceRaw = Number(latest.Performans ?? latest.performance ?? 0);
    const legacyPerformance = validFive(legacyPerformanceRaw) ? legacyPerformanceRaw : 0;
    const storedKpis = Array.isArray(latest.kpi_items) && latest.kpi_items.length ? latest.kpi_items : cloneDefaultKpis(legacyPerformance);
    setScores({ ...emptyScores, ...latestScores });
    setKpis(storedKpis.map((item: any, index: number) => ({
      id: String(item.id || `kpi-${index + 1}`),
      title: String(item.title || `Hedef ${index + 1}`),
      weight: Number(item.weight || 0),
      score: validFive(item.score) ? Number(item.score) : legacyPerformance,
    })));
    const managerRaw = Number(latest.manager_performance_score ?? legacyPerformance);
    setManagerPerformance(validFive(managerRaw) ? managerRaw : 0);
    setNote(String(latest.note || latest.Not || ""));
    setIsStarPerformer(Boolean(latest.is_star_performer));
  }, [selectedName, selectedHistory]);

  const performanceResult = useMemo(() => calculatePerformance(kpis, managerPerformance), [kpis, managerPerformance]);
  const competencyScore = useMemo(() => calculateCompetencyScore(scores), [scores]);
  const competencyComplete = useMemo(() => isCompetencySetComplete(scores, Object.keys(COMPETENCIES).length), [scores]);
  const weightsValid = Math.abs(performanceResult.totalKpiWeight - 100) < 0.01;
  const kpiScoresComplete = kpis.length > 0 && kpis.every((item) => validFive(item.score));
  const targetResolution = useMemo(() => resolveTargetProfile(selected?.Pozisyon || ""), [selected?.Pozisyon]);
  const target = targetResolution.profile;
  const roleGapData = Object.entries(COMPETENCIES).map(([code, label]) => {
    const targetLabel = target[label] !== undefined ? label : legacyTargetLabel[code];
    const targetValue = Number((targetLabel && target[targetLabel]) || 0);
    const currentValue = Number(scores[code] || 0);
    return {
      code,
      label,
      current: currentValue,
      target: targetValue,
      gap: targetValue > 0 && currentValue > 0 ? Number((targetValue - currentValue).toFixed(2)) : null,
    };
  });
  const radarData = roleGapData.map((item) => ({
    subject: item.label.replace(" Becerileri", "").replace("Dijital Okuryazarlık", "Dijital"),
    current: item.current,
    target: item.target,
  }));
  const roleFitItems = roleGapData.filter((item) => item.target > 0 && item.current > 0);
  const targetItemCount = roleGapData.filter((item) => item.target > 0).length;
  const roleFitCoverage = targetItemCount ? Math.round((roleFitItems.length / targetItemCount) * 100) : 0;
  const roleFit = roleFitItems.length
    ? Math.round(roleFitItems.reduce((sum, item) => sum + Math.min(item.current / item.target, 1), 0) / roleFitItems.length * 100)
    : null;
  const lineData = [...selectedHistory].reverse().map((item, index) => ({
    label: item.date ? new Date(item.date).toLocaleDateString("tr-TR") : `${index + 1}. ölçüm`,
    performance: Number(item.Performans || item.performance || 0),
  })).filter((item) => item.performance > 0);

  const updateKpi = (id: string, patch: Partial<KpiItem>) => setKpis((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addKpi = () => setKpis((items) => [...items, { id: `kpi-${Date.now()}`, title: `Yeni hedef ${items.length + 1}`, weight: 0, score: 0 }]);
  const removeKpi = (id: string) => setKpis((items) => items.filter((item) => item.id !== id));

  const save = () => {
    if (!selectedName || !canEdit) return showToast(access.reason || "Bu çalışanı değerlendirme yetkiniz yok.", "error");
    if (!weightsValid) return showToast("KPI ağırlıkları toplamı %100 olmalıdır.", "error");
    if (kpis.some((item) => !item.title.trim())) return showToast("KPI/hedef başlıkları boş bırakılamaz.", "error");
    if (!kpiScoresComplete) return showToast("Tüm KPI/hedef sonuçlarını 1–5 arasında puanlayın.", "error");
    if (!validFive(managerPerformance)) return showToast("Yönetici performans gözlemini 1–5 arasında puanlayın.", "error");
    if (!competencyComplete) return showToast("10 yetkinliğin tamamını 1–5 arasında puanlayın.", "error");
    if (!performanceResult.complete || performanceResult.finalScore <= 0) return showToast("Performans puanı eksik veri nedeniyle hesaplanamadı.", "error");
    const policy = loadCompanyAccessPolicy();
    if (access.override && policy.performance.hrOverrideRequiresReason && !note.trim()) return showToast("İK override için gerekçe zorunludur.", "error");

    const record = {
      id: `eval-${Date.now()}`,
      Personel: selectedName,
      employee_id: selected?.id || selected?.employee_id || undefined,
      evaluator: user?.name || user?.username || "",
      evaluation_type: access.relation || "Yetkili Yönetici",
      authority_context: { relation: access.relation, override: access.override, role: user?.role || "" },
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
  };

  const aiContext = selected ? {
    module: "performance_competency",
    analysisPurpose: "performance_calibration_and_competency_evidence_review",
    employee: { position: selected.Pozisyon, department: selected.Departman },
    currentEvaluation: {
      complete: performanceResult.complete && competencyComplete,
      finalPerformance: performanceResult.finalScore || null,
      kpiScore: performanceResult.kpiScore || null,
      managerObservation: performanceResult.managerScore || null,
      kpiManagerDifference: performanceResult.kpiScore > 0 && performanceResult.managerScore > 0
        ? Number((performanceResult.kpiScore - performanceResult.managerScore).toFixed(2)) : null,
      competencyScore: competencyComplete ? competencyScore : null,
      roleFit,
      roleFitCoverage,
      kpiWeightsValid: weightsValid,
      kpis: kpis.map((item) => ({ title: item.title, weight: item.weight, score: item.score || null })),
      roleCompetencyGaps: roleGapData.filter((item) => item.gap !== null).sort((a,b) => Number(b.gap || 0) - Number(a.gap || 0)).slice(0, 5),
      starSignal: isStarPerformer,
      managerNoteAvailable: Boolean(note.trim()),
    },
    history: selectedHistory.slice(0, 4).map((item) => ({
      date: item.date || item.Tarih || null,
      performance: Number(item.Performans || item.performance || 0) || null,
      competency: Number(item.competency_score || 0) || null,
    })),
    roleTarget: { source: targetResolution.source, referenceCount: targetResolution.referenceCount },
    instruction: "Bu bir performans kalibrasyonu ve yetkinlik kanıt incelemesidir. Eksik veriyi ortalama kabul etme. Skorları değiştirme veya nihai performans kararı verme. KPI ile yönetici gözlemi arasındaki tutarsızlıkları, rol yetkinlik açıklarını, trendi ve eksik kanıtları göster; yönetici için doğrulama soruları üret.",
  } : {};

  if (!employees.length) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"><LockKeyhole className="mx-auto h-7 w-7 text-slate-300"/><h2 className="mt-3 text-sm font-semibold">Değerlendirilecek çalışan yok</h2><p className="mt-1 text-xs text-slate-500">Yöneticiyseniz çalışan kaydında Yönetici 1 / Yönetici 2 bağlantınızı kontrol edin. İK rolü tüm kayıtları salt okunur görebilir.</p></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Performans kalibrasyonu</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Performans & Yetkinlik Değerlendirme</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-500">Nihai performans = KPI/Hedef Başarısı %60 + Yönetici Performans Gözlemi %40. Yetkinlik ayrı ölçülür. Eksik puanlar artık 3,0 varsayılmaz; değerlendirme ancak gerçek girdiler tamamlandığında kaydedilir.</p>
      </div>

      <div className={`rounded-2xl border p-4 text-xs leading-5 ${canEdit ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        <div className="flex items-start gap-2">{canEdit ? <Users className="mt-0.5 h-4 w-4"/> : <Eye className="mt-0.5 h-4 w-4"/>}<div><strong>{canEdit ? `Değerlendirme yetkisi: ${access.relation}` : "Salt okunur görünüm"}</strong><p className="mt-0.5">{canEdit ? (access.override ? "İK override açık. Kayda override bilgisi ve gerekçe yazılır." : "Bu çalışan organizasyonda size doğrudan bağlı olduğu için puanlayabilirsiniz.") : access.reason}</p></div></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold">Değerlendirme bağlamı</h2></div>
            <label className="mt-4 block text-xs font-medium text-slate-600">Çalışan<select value={selectedName} onChange={(e) => setSelectedName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{employees.map((item:any) => <option key={item.id ?? item["Ad Soyad"]}>{item["Ad Soyad"]}</option>)}</select></label>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60"><strong>{selected?.Pozisyon || "Pozisyon bilgisi yok"}</strong><br/>{selected?.Departman || ""}<div className="mt-2 text-[10px] font-semibold text-blue-600">{access.relation || "İzleme kapsamı"}</div></div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-900">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-blue-100">Nihai performans</p><p className="mt-2 text-4xl font-semibold tracking-[-.04em]">{performanceResult.finalScore > 0 ? performanceResult.finalScore.toFixed(2) : "—"} <span className="text-sm font-medium text-blue-100">/ 5</span></p></div><TrendingUp className="h-5 w-5 text-blue-100"/></div><p className="mt-2 text-[11px] text-blue-100">{performanceResult.complete ? "KPI %60 + Yönetici gözlemi %40" : "Tüm puanlar tamamlandığında hesaplanır"}</p></div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 p-4 dark:divide-slate-800"><MiniScore label="KPI / Hedef" value={performanceResult.kpiScore}/><MiniScore label="Yönetici Gözlemi" value={performanceResult.managerScore}/></div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">Genel Yetkinlik Skoru</p><p className="mt-1 text-2xl font-semibold">{competencyComplete ? competencyScore.toFixed(2) : "—"} / 5</p></div><Target className="h-5 w-5 text-violet-600"/></div><p className="mt-2 text-[10px] leading-4 text-slate-400">10 yetkinliğin tamamı puanlandığında özet üretilir; performans skoruna karıştırılmaz.</p></div>

          <button disabled={!canEdit} type="button" onClick={() => setIsStarPerformer((value) => !value)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${isStarPerformer ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isStarPerformer ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}`}><Star className={`h-5 w-5 ${isStarPerformer ? "fill-current" : ""}`}/></span><div><p className="text-sm font-semibold">Yıldız segment işareti</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Yetenek görüşmesinde manuel karar sinyalidir; performansa veya ücrete otomatik bonus eklemez.</p></div></div></button>
        </div>

        <div className="space-y-5">
          <fieldset disabled={!canEdit} className={!canEdit ? "opacity-70" : ""}>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold">KPI / Hedef Başarısı</h2></div><p className="mt-1 text-xs text-slate-500">Ağırlık toplamı %100 olmalı; her hedef ayrıca 1–5 arasında puanlanmalıdır.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${weightsValid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>Toplam %{performanceResult.totalKpiWeight}</span></div>
              <div className="mt-4 space-y-2">{kpis.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-[1fr_90px_150px_34px] sm:items-center"><input value={item.title} onChange={(e) => updateKpi(item.id,{title:e.target.value})} className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"/><label className="flex items-center gap-1 rounded-lg border border-slate-200 px-2"><input type="number" min="0" max="100" value={item.weight} onChange={(e)=>updateKpi(item.id,{weight:Number(e.target.value)})} className="h-9 w-full border-0 bg-transparent text-right text-xs outline-none"/><span className="text-xs text-slate-400">%</span></label><div><div className="flex justify-between text-[10px] text-slate-400"><span>Sonuç puanı</span><strong className="text-blue-700">{scoreLabel(item.score)}</strong></div><input type="range" min="0" max="5" step="0.1" value={item.score} onChange={(e)=>updateKpi(item.id,{score:Number(e.target.value)})} className="mt-1 w-full"/></div><button type="button" onClick={()=>removeKpi(item.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>
              <button type="button" onClick={addKpi} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600"><Plus className="h-3.5 w-3.5"/>Hedef ekle</button>
              <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex justify-between text-xs"><span className="font-medium text-slate-600">Yönetici performans gözlemi · %40</span><strong className="text-blue-700">{scoreLabel(managerPerformance)} / 5</strong></div><input type="range" min="0" max="5" step="0.1" value={managerPerformance} onChange={(e)=>setManagerPerformance(Number(e.target.value))} className="mt-2 w-full"/></div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-violet-600"/><h2 className="text-sm font-semibold">Yetkinlik puanlama</h2></div><p className="mt-1 text-xs text-slate-500">10 yetkinlik 1–5 arasında tek tek puanlanır; puanlanmayan alan 0/boş kabul edilir.</p><div className="mt-4 grid gap-x-6 gap-y-4 lg:grid-cols-2">{Object.entries(COMPETENCIES).map(([code,label]) => <div key={code}><div className="flex justify-between text-xs"><span>{label}</span><strong className="text-violet-700">{scoreLabel(scores[code])}</strong></div><input type="range" min="0" max="5" step="0.1" value={scores[code]} onChange={(e)=>setScores({...scores,[code]:Number(e.target.value)})} className="mt-2 w-full"/></div>)}</div><label className="mt-5 block text-xs font-medium text-slate-600">Yönetici notu {access.override && <span className="text-red-500">· override gerekçesi</span>}<textarea value={note} onChange={(e)=>setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label><button type="button" onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Save className="h-4 w-4"/>Değerlendirmeyi kaydet</button></section>
          </fieldset>
        </div>
      </div>

      {selected && <AIDecisionSupport
        kind="performance"
        context={aiContext}
        resetKey={selectedName}
        title="AI Performans & Yetkinlik Kalibrasyonu"
        description="Canlı KPI sonuçlarını, yönetici gözlemini, yetkinlik skorunu, rol hedef farklarını ve geçmiş trendi birlikte inceler. Eksik veriyi ortalama kabul etmez; AI puanı değiştirmez ve performans kararı vermez."
        buttonLabel="Performans analizini oluştur"
        questionTitle="Kalibrasyon soruları"
      />}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-semibold">Mevcut yetkinlik vs. rol hedefi</h2><p className="mt-1 text-xs text-slate-500">{targetResolution.source === "exact" ? "Pozisyona özel hedef profil" : `Türetilmiş hedef · ${targetResolution.referenceCount} referans rol`} · veri kapsamı %{roleFitCoverage}</p><div className="mt-3 h-[320px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid/><PolarAngleAxis dataKey="subject" tick={{fontSize:10}}/><PolarRadiusAxis domain={[0,5]} tick={{fontSize:9}}/><Radar name="Değerlendirme" dataKey="current" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15}/><Radar name="Rol Hedefi" dataKey="target" stroke="#f97316" fill="#f97316" fillOpacity={0.08}/><Tooltip/></RadarChart></ResponsiveContainer></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-semibold">Performans geçmişi</h2><p className="mt-1 text-xs text-slate-500">Yetkili değerlendirmeler zaman sırasıyla gösterilir.</p><div className="mt-3 h-[320px]">{lineData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={lineData}><CartesianGrid vertical={false} strokeDasharray="3 5"/><XAxis dataKey="label" tick={{fontSize:10}}/><YAxis domain={[0,5]} tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="performance" stroke="#2563eb" strokeWidth={2.2} dot={{r:3}}/></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Henüz geçmiş değerlendirme yok.</div>}</div></div>
      </div>
    </div>
  );
}

function MiniScore({label,value}:{label:string;value:number}){return <div className="px-2"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value > 0 ? value.toFixed(2) : "—"}</p></div>}
