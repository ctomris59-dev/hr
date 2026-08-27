"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Plus, Save, Star, Target, Trash2, TrendingUp, Users } from "lucide-react";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "@/components/charts/recharts";
import { useNotifications } from "../../../context/NotificationContext";
import { resolveTargetProfile } from "../../../lib/hr/careerArchitecture";
import {
  calculateCompetencyScore,
  calculatePerformance,
  DEFAULT_KPIS,
  PERFORMANCE_MODEL_VERSION,
  type KpiItem,
} from "../../../lib/hr/performanceModel";

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
const emptyScores = Object.fromEntries(Object.keys(COMPETENCIES).map((code) => [code, 3])) as Record<string, number>;
const cloneDefaultKpis = (score = 3): KpiItem[] => DEFAULT_KPIS.map((item) => ({ ...item, score }));

const recordTime = (item: any) => {
  const value = item?.date || item?.Tarih || item?.createdAt || item?.timestamp;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

export default function DegerlendirmePage() {
  const { showToast } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [evaluatorType, setEvaluatorType] = useState<"Yönetici 1" | "Yönetici 2">("Yönetici 1");
  const [scores, setScores] = useState<Record<string, number>>(emptyScores);
  const [kpis, setKpis] = useState<KpiItem[]>(cloneDefaultKpis());
  const [managerPerformance, setManagerPerformance] = useState(3);
  const [note, setNote] = useState("");
  const [isStarPerformer, setIsStarPerformer] = useState(false);

  useEffect(() => {
    setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
    setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
    setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
  }, []);

  const employees = useMemo(() => {
    if (!user || !orgData.length) return [];
    const role = String(user.role || "").toUpperCase();
    if (role === "CEO" || role === "IK") return orgData;
    try {
      return getManageableEmployees(user, orgData);
    } catch {
      return [];
    }
  }, [user, orgData]);

  useEffect(() => {
    if (!selectedName && employees.length) setSelectedName(employees[0]["Ad Soyad"]);
  }, [employees, selectedName]);

  const selectedHistory = useMemo(
    () => history
      .filter((item) => (item.Personel || item.target) === selectedName)
      .sort((a, b) => recordTime(b) - recordTime(a)),
    [history, selectedName]
  );

  useEffect(() => {
    if (!selectedName) return;
    const latest = selectedHistory[0];
    if (!latest) {
      setScores({ ...emptyScores });
      setKpis(cloneDefaultKpis());
      setManagerPerformance(3);
      setNote("");
      setIsStarPerformer(false);
      return;
    }

    const latestScores = latest.manager_scores && typeof latest.manager_scores === "object"
      ? latest.manager_scores
      : {};
    const legacyPerformance = Number(latest.Performans ?? latest.performance ?? 3);
    const storedKpis = Array.isArray(latest.kpi_items) && latest.kpi_items.length
      ? latest.kpi_items
      : cloneDefaultKpis(legacyPerformance);

    setScores({ ...emptyScores, ...latestScores });
    setKpis(storedKpis.map((item: any, index: number) => ({
      id: String(item.id || `kpi-${index + 1}`),
      title: String(item.title || `Hedef ${index + 1}`),
      weight: Number(item.weight || 0),
      score: Number(item.score || legacyPerformance),
    })));
    setManagerPerformance(Number(latest.manager_performance_score ?? legacyPerformance));
    setNote(String(latest.note || latest.Not || ""));
    setIsStarPerformer(Boolean(latest.is_star_performer));
  }, [selectedName, selectedHistory]);

  const selected = useMemo(
    () => orgData.find((item) => item["Ad Soyad"] === selectedName),
    [orgData, selectedName]
  );

  const performanceResult = useMemo(
    () => calculatePerformance(kpis, managerPerformance),
    [kpis, managerPerformance]
  );
  const competencyScore = useMemo(() => calculateCompetencyScore(scores), [scores]);
  const weightsValid = Math.abs(performanceResult.totalKpiWeight - 100) < 0.01;

  const targetResolution = useMemo(
    () => resolveTargetProfile(selected?.Pozisyon || ""),
    [selected?.Pozisyon]
  );
  const target = targetResolution.profile;
  const radarData = Object.entries(COMPETENCIES).map(([code, label]) => {
    const targetLabel = target[label] !== undefined ? label : legacyTargetLabel[code];
    return {
      subject: label.replace(" Becerileri", "").replace("Dijital Okuryazarlık", "Dijital"),
      current: scores[code] || 0,
      target: Number((targetLabel && target[targetLabel]) || 0),
    };
  });

  const lineData = [...selectedHistory].reverse().map((item, index) => ({
    label: item.date || item.Tarih || `${index + 1}. ölçüm`,
    performance: Number(item.Performans || item.performance || 0),
  }));

  const updateKpi = (id: string, patch: Partial<KpiItem>) => {
    setKpis((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };
  const addKpi = () => {
    const nextIndex = kpis.length + 1;
    setKpis((items) => [...items, { id: `kpi-${Date.now()}`, title: `Yeni hedef ${nextIndex}`, weight: 0, score: 3 }]);
  };
  const removeKpi = (id: string) => setKpis((items) => items.filter((item) => item.id !== id));

  const save = () => {
    if (!selectedName) return;
    if (!weightsValid) {
      showToast("KPI ağırlıkları toplamı %100 olmalıdır.", "error");
      return;
    }
    if (kpis.some((item) => !item.title.trim())) {
      showToast("KPI/hedef başlıkları boş bırakılamaz.", "error");
      return;
    }

    const record = {
      id: `eval-${Date.now()}`,
      Personel: selectedName,
      evaluator: user?.name || user?.username || "",
      evaluation_type: evaluatorType,
      date: new Date().toISOString(),
      performance_model_version: PERFORMANCE_MODEL_VERSION,
      kpi_items: kpis.map((item) => ({ ...item })),
      kpi_score: performanceResult.kpiScore,
      manager_performance_score: performanceResult.managerScore,
      performance_weights: { kpi: 0.6, manager: 0.4 },
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

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Performans kalibrasyonu</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Performans & Yetkinlik Değerlendirme</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-500">
          Performans ve yetkinlik artık ayrı hesaplanır. Nihai performans = KPI/Hedef Başarısı %60 + Yönetici Performans Gözlemi %40. Yetkinlik skoru 10 boyutun ayrı bir özetidir; 9-Box'ta performans ile karıştırılmaz.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold">Değerlendirme bağlamı</h2></div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600">Çalışan
                <select value={selectedName} onChange={(e) => setSelectedName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">
                  <option value="">Seçin</option>
                  {employees.map((item:any)=><option key={item.id ?? item["Ad Soyad"]}>{item["Ad Soyad"]}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600">Değerlendirici seviyesi
                <select value={evaluatorType} onChange={(e)=>setEvaluatorType(e.target.value as any)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">
                  <option>Yönetici 1</option><option>Yönetici 2</option>
                </select>
              </label>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60"><strong>{selected?.Pozisyon || "Pozisyon seçilmedi"}</strong><br/>{selected?.Departman || ""}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-900">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white">
              <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-blue-100">Nihai performans</p><p className="mt-2 text-4xl font-semibold tracking-[-.04em]">{performanceResult.finalScore.toFixed(2)} <span className="text-sm font-medium text-blue-100">/ 5</span></p></div><TrendingUp className="h-5 w-5 text-blue-100"/></div>
              <p className="mt-2 text-[11px] text-blue-100">KPI %60 + Yönetici gözlemi %40</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 p-4 dark:divide-slate-800">
              <MiniScore label="KPI / Hedef" value={performanceResult.kpiScore} />
              <MiniScore label="Yönetici Gözlemi" value={performanceResult.managerScore} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">Genel Yetkinlik Skoru</p><p className="mt-1 text-2xl font-semibold">{competencyScore.toFixed(2)} / 5</p></div><Target className="h-5 w-5 text-violet-600"/></div>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">Şimdilik 10 yetkinliğin eşit ağırlıklı özetidir. Rol hedef puanları önem ağırlığı olarak kullanılmaz.</p>
          </div>

          <button type="button" onClick={() => setIsStarPerformer((value) => !value)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${isStarPerformer ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white ring-2 ring-amber-100 dark:border-amber-800 dark:from-amber-950/30 dark:to-slate-900 dark:ring-amber-950" : "border-slate-200 bg-white hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900"}`}>
            <div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isStarPerformer ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}><Star className={`h-5 w-5 ${isStarPerformer ? "fill-current" : ""}`} /></span><div><div className="flex items-center gap-2"><p className="text-sm font-semibold">Yıldız segment işareti</p>{isStarPerformer&&<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">AKTİF</span>}</div><p className="mt-1 text-[11px] leading-4 text-slate-500">Yetenek ve ücret senaryolarında ek karar sinyalidir; nihai performans hesabına otomatik bonus eklemez.</p></div></div>
          </button>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold">KPI / Hedef Başarısı</h2></div><p className="mt-1 text-xs text-slate-500">Her hedefe 1–5 sonuç puanı ve ağırlık verin. Ağırlık toplamı %100 olmalıdır.</p></div>
              <button type="button" onClick={addKpi} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"><Plus className="h-3.5 w-3.5"/>Hedef ekle</button>
            </div>

            <div className="mt-4 space-y-3">
              {kpis.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 md:grid-cols-[1fr_90px_220px_34px] md:items-center dark:border-slate-800 dark:bg-slate-950/35">
                  <input value={item.title} onChange={(e)=>updateKpi(item.id,{title:e.target.value})} className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium" />
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Ağırlık %
                    <input type="number" min="0" max="100" step="5" value={item.weight} onChange={(e)=>updateKpi(item.id,{weight:Number(e.target.value)})} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-right text-xs font-semibold" />
                  </label>
                  <div><div className="flex items-center justify-between text-[10px]"><span className="font-medium text-slate-500">Sonuç puanı</span><strong className="text-blue-700">{item.score.toFixed(1)} / 5</strong></div><input type="range" min="1" max="5" step="0.1" value={item.score} onChange={(e)=>updateKpi(item.id,{score:Number(e.target.value)})} className="mt-1 w-full" /></div>
                  <button type="button" onClick={()=>removeKpi(item.id)} disabled={kpis.length<=1} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5"/></button>
                </div>
              ))}
            </div>

            <div className={`mt-4 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${weightsValid ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              <div><p className="text-[10px] font-bold uppercase tracking-wide">KPI ağırlık toplamı</p><p className="mt-0.5 text-xs">{weightsValid ? "Hesaplamaya hazır" : "Kaydetmek için toplamı %100 yapın"}</p></div><strong className="text-lg">%{performanceResult.totalKpiWeight.toFixed(0)}</strong>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Yönetici Performans Gözlemi</p><p className="mt-1 text-[10px] text-slate-400">KPI dışında davranışsal iş çıktısı, sorumluluk alma ve dönem geneli katkı değerlendirmesi.</p></div><strong className="text-lg text-blue-700">{managerPerformance.toFixed(1)}</strong></div>
              <input type="range" min="1" max="5" step="0.1" value={managerPerformance} onChange={(e)=>setManagerPerformance(Number(e.target.value))} className="mt-4 w-full" />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-violet-600"/><h2 className="text-sm font-semibold">Yetkinlik puanlama</h2></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">Skor {competencyScore.toFixed(2)}</span></div>
            <p className="mt-1 text-xs text-slate-500">10 yetkinlik ayrı tutulur; nihai performans formülüne doğrudan eklenmez.</p>
            <div className="mt-4 grid gap-x-6 gap-y-4 lg:grid-cols-2">{Object.entries(COMPETENCIES).map(([code,label])=><div key={code}><div className="flex items-center justify-between"><label className="text-xs font-medium text-slate-700">{label}</label><span className="font-mono text-xs font-semibold text-violet-700">{scores[code].toFixed(1)}</span></div><input type="range" min="1" max="5" step="0.1" value={scores[code]} onChange={(e)=>setScores({...scores,[code]:Number(e.target.value)})} className="mt-2 w-full"/></div>)}</div>
            <label className="mt-5 block text-xs font-medium text-slate-600">Yönetici notu<textarea value={note} onChange={(e)=>setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
            <button onClick={save} disabled={!selectedName || !weightsValid} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Save className="h-4 w-4"/>Değerlendirmeyi kaydet</button>
          </section>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Mevcut yetkinlik vs. rol hedefi</h2><p className="mt-1 text-xs text-slate-500">{targetResolution.source === "exact" ? "Pozisyona özel rol profili kullanılıyor." : `Pozisyon profili birebir bulunamadı; ${targetResolution.referenceCount} referans rolden türetilmiş hedef kullanılıyor.`}</p></div></div><div className="mt-3 h-[320px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid/><PolarAngleAxis dataKey="subject" tick={{fontSize:10}}/><PolarRadiusAxis domain={[0,5]} tick={{fontSize:9}}/><Radar name="Değerlendirme" dataKey="current" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15}/><Radar name="Rol Hedefi" dataKey="target" stroke="#f97316" fill="#f97316" fillOpacity={0.08}/><Tooltip/></RadarChart></ResponsiveContainer></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-semibold">Nihai performans geçmişi</h2><p className="mt-1 text-xs text-slate-500">Eski kayıtlar mevcut performans puanıyla, yeni kayıtlar KPI %60 + yönetici %40 modeliyle gösterilir.</p><div className="mt-3 h-[320px]">{lineData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={lineData}><CartesianGrid vertical={false} strokeDasharray="3 5"/><XAxis dataKey="label" tick={{fontSize:10}}/><YAxis domain={[0,5]} tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="performance" stroke="#2563eb" strokeWidth={2.2} dot={{r:3}}/></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Henüz geçmiş değerlendirme yok.</div>}</div></div>
      </div>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return <div className="px-3 text-center"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{value.toFixed(2)}</p></div>;
}
