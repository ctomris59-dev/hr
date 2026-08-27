"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Star, Target, TrendingUp, Users } from "lucide-react";
import { JOB_PROFILES } from "../../data/jobData";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Line, LineChart, CartesianGrid, XAxis, YAxis } from "@/components/charts/recharts";
import { useNotifications } from "../../../context/NotificationContext";

const COMPETENCIES: Record<string, string> = {
  DIG: "Dijital Okuryazarlık", ANA: "Analitik Düşünme", RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen", LRN: "Sürekli Öğrenme", ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin", STR: "Dayanıklılık & Stres Yönetimi", TEA: "Takım Çalışması",
  COM: "İletişim Becerileri",
};
const legacyTargetLabel: Record<string, string> = { STR: "Stratejik Bakış" };
const emptyScores = Object.fromEntries(Object.keys(COMPETENCIES).map((code) => [code, 3])) as Record<string, number>;

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
  const [performance, setPerformance] = useState(3);
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
    try { return getManageableEmployees(user, orgData); } catch { return []; }
  }, [user, orgData]);

  useEffect(() => {
    if (!selectedName && employees.length) setSelectedName(employees[0]["Ad Soyad"]);
  }, [employees, selectedName]);

  const selectedHistory = useMemo(
    () => history.filter((item) => (item.Personel || item.target) === selectedName).sort((a, b) => recordTime(b) - recordTime(a)),
    [history, selectedName]
  );

  useEffect(() => {
    if (!selectedName) return;
    const latest = selectedHistory[0];
    if (!latest) {
      setScores({ ...emptyScores }); setPerformance(3); setNote(""); setIsStarPerformer(false); return;
    }
    const latestScores = latest.manager_scores && typeof latest.manager_scores === "object" ? latest.manager_scores : {};
    setScores({ ...emptyScores, ...latestScores });
    setPerformance(Number(latest.Performans ?? latest.performance ?? 3));
    setNote(String(latest.note || latest.Not || ""));
    setIsStarPerformer(Boolean(latest.is_star_performer));
  }, [selectedName, selectedHistory]);

  const selected = useMemo(() => orgData.find((item) => item["Ad Soyad"] === selectedName), [orgData, selectedName]);
  const target = JOB_PROFILES[selected?.Pozisyon] || {};
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

  const save = () => {
    if (!selectedName) return;
    const record = {
      id: `eval-${Date.now()}`,
      Personel: selectedName,
      evaluator: user?.name || user?.username || "",
      evaluation_type: evaluatorType,
      date: new Date().toISOString(),
      Performans: performance,
      manager_scores: { ...scores },
      note,
      is_star_performer: isStarPerformer,
    };
    const next = [record, ...history];
    setHistory(next);
    setStorageData(STORAGE_KEYS.HISTORY_360, next);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
    window.dispatchEvent(new CustomEvent("talentMatrixUpdated"));
    showToast("Değerlendirme ve yetenek sinyalleri kaydedildi.", "success");
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Performans kalibrasyonu</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Performans & Yetkinlik Değerlendirme</h1>
        <p className="mt-1 text-sm text-slate-500">Performans, yetkinlik ve yıldız segment sinyali burada kaydedilir. Maaş kararı ise Maaş modülündeki kontrollü ücret döngüsünde verilir.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold">Değerlendirme bağlamı</h2></div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600">Çalışan<select value={selectedName} onChange={(e)=>setSelectedName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Seçin</option>{employees.map((item:any)=><option key={item.id ?? item["Ad Soyad"]}>{item["Ad Soyad"]}</option>)}</select></label>
              <label className="block text-xs font-medium text-slate-600">Değerlendirici seviyesi<select value={evaluatorType} onChange={(e)=>setEvaluatorType(e.target.value as any)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option>Yönetici 1</option><option>Yönetici 2</option></select></label>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60"><strong>{selected?.Pozisyon || "Pozisyon seçilmedi"}</strong><br/>{selected?.Departman || ""}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">Genel performans</p><p className="mt-1 text-2xl font-semibold">{performance.toFixed(1)} / 5</p></div><TrendingUp className="h-5 w-5 text-blue-600"/></div>
            <input type="range" min="1" max="5" step="0.1" value={performance} onChange={(e)=>setPerformance(Number(e.target.value))} className="mt-4 w-full"/>
          </div>

          <button type="button" onClick={() => setIsStarPerformer((value) => !value)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${isStarPerformer ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white ring-2 ring-amber-100 dark:border-amber-800 dark:from-amber-950/30 dark:to-slate-900 dark:ring-amber-950" : "border-slate-200 bg-white hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900"}`}>
            <div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isStarPerformer ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}><Star className={`h-5 w-5 ${isStarPerformer ? "fill-current" : ""}`} /></span><div><div className="flex items-center gap-2"><p className="text-sm font-semibold">Yıldız segment işareti</p>{isStarPerformer&&<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">AKTİF</span>}</div><p className="mt-1 text-[11px] leading-4 text-slate-500">Yetenek ve ücret senaryolarında karar destek sinyali olarak kullanılır. Tek başına terfi veya ücret kararı değildir.</p></div></div>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-600"/><h2 className="text-sm font-semibold">Yetkinlik puanlama</h2></div>
          <div className="mt-4 grid gap-x-6 gap-y-4 lg:grid-cols-2">{Object.entries(COMPETENCIES).map(([code,label])=><div key={code}><div className="flex items-center justify-between"><label className="text-xs font-medium text-slate-700">{label}</label><span className="font-mono text-xs font-semibold text-blue-700">{scores[code].toFixed(1)}</span></div><input type="range" min="1" max="5" step="0.1" value={scores[code]} onChange={(e)=>setScores({...scores,[code]:Number(e.target.value)})} className="mt-2 w-full"/></div>)}</div>
          <label className="mt-5 block text-xs font-medium text-slate-600">Yönetici notu<textarea value={note} onChange={(e)=>setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
          <button onClick={save} disabled={!selectedName} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Save className="h-4 w-4"/>Değerlendirmeyi kaydet</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-semibold">Mevcut yetkinlik vs. rol hedefi</h2><p className="mt-1 text-xs text-slate-500">Rol hedefi kurumun pozisyon profilinden gelir. Eski profillerdeki STR hedefi geçiş uyumluluğu için Dayanıklılık & Stres Yönetimi hedefi olarak gösterilir.</p><div className="mt-3 h-[320px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid/><PolarAngleAxis dataKey="subject" tick={{fontSize:10}}/><PolarRadiusAxis domain={[0,5]} tick={{fontSize:9}}/><Radar name="Değerlendirme" dataKey="current" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15}/><Radar name="Rol Hedefi" dataKey="target" stroke="#f97316" fill="#f97316" fillOpacity={0.08}/><Tooltip/></RadarChart></ResponsiveContainer></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-semibold">Performans geçmişi</h2><p className="mt-1 text-xs text-slate-500">Kayıtlı yönetici değerlendirmeleri.</p><div className="mt-3 h-[320px]">{lineData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={lineData}><CartesianGrid vertical={false} strokeDasharray="3 5"/><XAxis dataKey="label" tick={{fontSize:10}}/><YAxis domain={[0,5]} tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="performance" stroke="#2563eb" strokeWidth={2.2} dot={{r:3}}/></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Henüz geçmiş değerlendirme yok.</div>}</div></div>
      </div>
    </div>
  );
}
