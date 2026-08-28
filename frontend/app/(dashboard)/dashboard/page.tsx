"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, BarChart3, CheckCircle2, Crown, Heart, LayoutDashboard, Scale, ShieldCheck,
  Star, Target, TrendingDown, TrendingUp, Users,
} from "lucide-react";
import { useData } from "../../../context/DataContext";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { filterDataByScope } from "../../utils/hierarchy";
import { latestEvaluationMap, normalizeEmployeeName } from "../../../lib/hr/employeeIdentity";
import { buildTalentDecisionSnapshot } from "../../../lib/hr/talentDecisionChain";
import { getCareerRole } from "../../../lib/hr/careerArchitecture";
import { rankSuccessors } from "../../../lib/hr/succession";
import { getPulseAnalytics, type PulseAnalyticsResponse } from "../../services/surveyService";
import GlassCard from "../../../components/ui/GlassCard";
import CountUp from "../../../components/ui/CountUp";
import Skeleton from "@/components/ui/Skeleton";

const PERFORMANCE_TARGET = 4.2;

function dueDate(plan: any): Date | null {
  const raw = plan?.dueDate || plan?.deadline || plan?.endDate || plan?.targetDate || plan?.bitisTarihi;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
function isCompleted(plan: any) {
  const status = String(plan?.status || plan?.durum || "").toLocaleLowerCase("tr-TR");
  return /tamam|completed|done|closed/.test(status) || Number(plan?.progress || plan?.ilerleme || 0) >= 100;
}
function pct(part: number, total: number) { return total ? Math.round((part / total) * 100) : 0; }

export default function DashboardPage() {
  const { orgData, history360, loading } = useData();
  const [user, setUser] = useState<any>(null);
  const [pulse, setPulse] = useState<PulseAnalyticsResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setUser(current);
    if (current && !["CEO", "IK", "ADMIN", "DIRECTOR", "MANAGER"].includes(String(current.role || "").toUpperCase()) && process.env.NODE_ENV !== "development") {
      window.location.href = "/izinler";
      return;
    }
    setReady(true);
  }, []);

  const scopedOrg = useMemo(() => user ? filterDataByScope(orgData || [], user) as any[] : [], [orgData, user]);
  const latest = useMemo(() => latestEvaluationMap(history360 || []), [history360]);
  const snapshots = useMemo(() => scopedOrg.map((person) => ({ person, snapshot: buildTalentDecisionSnapshot(person, history360 || []) })), [scopedOrg, history360]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const role = String(user.role || "").toUpperCase();
    const dept = String(user.dept || user.department || "");
    void getPulseAnalytics({ role, userDept: dept, department: (role === "DIRECTOR" || role === "MANAGER") ? dept : undefined }).then((result) => { if (active) setPulse(result); });
    const refresh = () => void getPulseAnalytics({ role, userDept: dept, department: (role === "DIRECTOR" || role === "MANAGER") ? dept : undefined }).then((result) => { if (active) setPulse(result); });
    window.addEventListener("pulseUpdated", refresh);
    window.addEventListener("dataUpdated", refresh);
    return () => { active = false; window.removeEventListener("pulseUpdated", refresh); window.removeEventListener("dataUpdated", refresh); };
  }, [user]);

  const performanceRows = snapshots.filter(({ snapshot }) => snapshot.performance.score > 0);
  const avgPerformance = performanceRows.length ? performanceRows.reduce((sum, row) => sum + row.snapshot.performance.score, 0) / performanceRows.length : 0;
  const performanceCoverage = pct(performanceRows.length, snapshots.length);
  const lowEvidence = snapshots.filter(({ snapshot }) => snapshot.evidence.score < 60);
  const stars = snapshots.filter(({ snapshot }) => snapshot.talent.nineBox === "Yıldız Oyuncu");
  const calibrationRequired = snapshots.filter(({ person }) => {
    const evaluation = latest.get(normalizeEmployeeName(person?.["Ad Soyad"]));
    const kpi = Number(evaluation?.kpi_score), manager = Number(evaluation?.manager_performance_score);
    return Number.isFinite(kpi) && kpi > 0 && Number.isFinite(manager) && manager > 0 && Math.abs(kpi - manager) >= 0.75;
  });
  const lowPerformers = performanceRows.filter(({ snapshot }) => snapshot.performance.score < 3.5).sort((a, b) => a.snapshot.performance.score - b.snapshot.performance.score);

  const reportCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scopedOrg.forEach((person) => { const manager = String(person?.["Yönetici 1"] || ""); if (manager) counts.set(manager, (counts.get(manager) || 0) + 1); });
    return counts;
  }, [scopedOrg]);
  const criticalRoles = useMemo(() => scopedOrg.filter((person) => getCareerRole(person?.Pozisyon || "").levelRank >= 4 || (reportCounts.get(String(person?.["Ad Soyad"] || "")) || 0) >= 2), [scopedOrg, reportCounts]);
  const successionRisk = useMemo(() => criticalRoles.filter((target) => !rankSuccessors(target, scopedOrg, history360 || []).some((item) => item.assessment.readiness === "Şimdi")), [criticalRoles, scopedOrg, history360]);

  const development = getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []);
  const overduePlans = development.filter((plan) => { const due = dueDate(plan); return Boolean(due && due.getTime() < Date.now() && !isCompleted(plan)); });

  const departments = useMemo(() => {
    const map = new Map<string, number[]>();
    snapshots.forEach(({ person, snapshot }) => {
      if (!(snapshot.performance.score > 0)) return;
      const dept = String(person?.Departman || "Belirtilmemiş");
      const values = map.get(dept) || []; values.push(snapshot.performance.score); map.set(dept, values);
    });
    return Array.from(map.entries()).map(([department, values]) => ({ department, average: values.reduce((a, b) => a + b, 0) / values.length, count: values.length })).sort((a, b) => a.average - b.average);
  }, [snapshots]);

  if (loading || !ready) return <div className="space-y-4"><Skeleton className="h-14 w-72"/><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0,1,2,3].map((item)=><Skeleton key={item} className="h-32 rounded-xl"/>)}</div><Skeleton className="h-72 rounded-xl"/></div>;

  if (!scopedOrg.length) return (
    <div className="enterprise-card p-8 text-center"><LayoutDashboard className="mx-auto h-8 w-8 text-slate-300"/><h1 className="mt-3 text-lg font-semibold">Yönetici Özeti</h1><p className="mt-1 text-sm text-slate-500">Karar görünümünü oluşturmak için organizasyon verisi bulunamadı.</p><Link href="/organizasyon" className="mt-4 inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white">Organizasyon verisini yükle</Link></div>
  );

  const pulseLatest = pulse?.latest;
  const pulseDelta = pulse?.latestDelta;

  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.3}} className="space-y-4 pb-4">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="flex items-center gap-2"><span className="enterprise-eyebrow">İK Karar Merkezi</span><span className="h-1 w-1 rounded-full bg-slate-300"/><span className="text-[10px] text-slate-400">FutureHR V1</span></div><h1 className="mt-1 text-[24px] font-semibold tracking-[-.03em] text-slate-950 dark:text-white">Yönetici Özeti</h1><p className="mt-1 text-xs text-slate-500">Aynı çalışan veri zincirinden performans, kanıt, yetenek, halefiyet ve deneyim sinyalleri.</p></div>
        <div className="flex flex-wrap gap-2"><ActionLink href="/kalibrasyon" icon={Scale} label="Kalibrasyon"/><ActionLink href="/yetenek-matrisi" icon={Star} label="Yetenek & 9-Box"/><ActionLink href="/yedekleme" icon={Crown} label="Halefiyet"/><ActionLink href="/maas" icon={Target} label="Ücret Kararları"/></div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Görünen çalışan" value={scopedOrg.length} note={`${performanceRows.length} performans kaydı`} icon={Users} />
        <MetricCard label="Ort. performans" value={avgPerformance ? avgPerformance.toFixed(2) : "—"} note={`%${performanceCoverage} veri kapsamı`} icon={BarChart3} positive={avgPerformance >= PERFORMANCE_TARGET} />
        <MetricCard label="Kanıt riski" value={lowEvidence.length} note={`Evidence Score < 60 · %${pct(lowEvidence.length, snapshots.length)}`} icon={ShieldCheck} warning={lowEvidence.length > 0} />
        <MetricCard label="Halefiyet riski" value={successionRisk.length} note={`${criticalRoles.length} kritik rol içinde`} icon={Crown} warning={successionRisk.length > 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <section className="enterprise-card p-4">
          <div className="flex items-center justify-between"><div><p className="enterprise-eyebrow">Yönetim öncelikleri</p><h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Bu hafta karar gerektiren sinyaller</h2></div><span className="text-[10px] text-slate-400">Kural + Evidence Graph</span></div>
          <div className="mt-3 space-y-2">
            <DecisionRow href="/kalibrasyon" icon={Scale} tone={calibrationRequired.length ? "amber" : "green"} title="Performans kalibrasyonu" detail={calibrationRequired.length ? `${calibrationRequired.length} çalışanda KPI ile yönetici gözlemi farkı ≥ 0,75.` : "Belirgin KPI-yönetici puan farkı bulunmuyor."} />
            <DecisionRow href="/yedekleme" icon={Crown} tone={successionRisk.length ? "red" : "green"} title="Kritik rol sürekliliği" detail={successionRisk.length ? `${successionRisk.length} kritik rolde yüksek kanıtla 'Şimdi hazır' halef bulunmuyor.` : "Kritik roller için hazır halef sinyali mevcut."} />
            <DecisionRow href="/gelisim" icon={Target} tone={overduePlans.length ? "amber" : "green"} title="Gelişim aksiyonları" detail={overduePlans.length ? `${overduePlans.length} gelişim planının hedef tarihi geçti.` : "Gecikmiş açık gelişim planı bulunmuyor."} />
            <DecisionRow href="/degerlendirme" icon={ShieldCheck} tone={lowEvidence.length ? "amber" : "green"} title="Kanıt kalitesi" detail={lowEvidence.length ? `${lowEvidence.length} çalışanın Evidence Score'u 60 altında; karar öncesi ek kanıt önerilir.` : "Karar zincirinde düşük Evidence Score kaydı bulunmuyor."} />
          </div>
        </section>

        <section className="enterprise-card p-4">
          <div className="flex items-start justify-between"><div><p className="enterprise-eyebrow">Çalışan deneyimi</p><h2 className="mt-1 text-sm font-semibold">Anonim mikro-pulse</h2></div><Heart className="h-5 w-5 text-rose-500"/></div>
          {pulseLatest ? <div className="mt-4"><div className="flex items-end justify-between"><div><p className="text-[28px] font-semibold tracking-[-.04em]">{pulseLatest.average_score?.toFixed(1).replace(".",",") || "—"}<span className="ml-1 text-xs text-slate-400">/10</span></p><p className="mt-1 text-[10px] text-slate-400">{pulseLatest.count} anonim yanıt · k≥{pulse?.anonymity.threshold || 5}</p></div>{pulseDelta !== null && pulseDelta !== undefined && <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${pulseDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{pulseDelta>=0?<TrendingUp className="h-3 w-3"/>:<TrendingDown className="h-3 w-3"/>}{pulseDelta>=0?"+":""}{pulseDelta.toFixed(1)}</span>}</div><div className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">{pulse?.lowestDriver ? `En düşük driver: ${pulse.lowestDriver.label} · ${pulse.lowestDriver.average.toFixed(1)}/5.` : "Driver verisi yeni haftalık check-in'lerle oluşur."}</div><Link href="/calisan-deneyimi" className="mt-3 inline-flex text-[11px] font-semibold text-indigo-600">Anonim driver analizini aç →</Link></div> : <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">Anonimlik eşiğini geçen mikro-pulse verisi henüz yok. <Link href="/calisan-deneyimi" className="font-semibold text-indigo-600">Check-in ekranı →</Link></div>}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="enterprise-card p-4"><div className="flex items-center justify-between"><div><p className="enterprise-eyebrow">Yakın takip</p><h2 className="mt-1 text-sm font-semibold">Performans & kanıt öncelikleri</h2></div><AlertTriangle className="h-4 w-4 text-amber-500"/></div><div className="mt-3 space-y-2">{lowPerformers.slice(0,4).map(({person,snapshot})=><Link key={person.id || person["Ad Soyad"]} href="/degerlendirme" className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 hover:border-indigo-200 dark:border-slate-800"><div className="min-w-0"><p className="truncate text-xs font-semibold">{person["Ad Soyad"]}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{person.Departman} · Evidence %{snapshot.evidence.score}</p></div><span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{snapshot.performance.score.toFixed(1)}</span></Link>)}{!lowPerformers.length && <EmptyGood text="3,5 altında performans sinyali yok."/>}</div></section>
        <section className="enterprise-card p-4"><div className="flex items-center justify-between"><div><p className="enterprise-eyebrow">Departman görünümü</p><h2 className="mt-1 text-sm font-semibold">Performans kapsamı</h2></div><BarChart3 className="h-4 w-4 text-indigo-500"/></div><div className="mt-3 space-y-2">{departments.slice(0,6).map((item)=><div key={item.department} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950/50"><div><p className="text-xs font-semibold">{item.department}</p><p className="mt-0.5 text-[10px] text-slate-400">{item.count} değerlendirilmiş çalışan</p></div><span className={`text-sm font-bold ${item.average >= PERFORMANCE_TARGET ? "text-emerald-600" : "text-slate-700 dark:text-slate-200"}`}>{item.average.toFixed(2)}</span></div>)}</div></section>
      </div>
    </motion.div>
  );
}

function MetricCard({label,value,note,icon:Icon,positive,warning}:{label:string;value:string|number;note:string;icon:any;positive?:boolean;warning?:boolean}) {
  return <GlassCard className="p-4"><div className="flex items-start justify-between"><div><p className="enterprise-eyebrow">{label}</p><p className="mt-3 text-[28px] font-semibold leading-none tracking-[-.04em] text-slate-950 dark:text-white">{typeof value === "number" ? <CountUp value={value}/> : value}</p><p className={`mt-2 text-[10px] ${warning?"text-amber-600":positive?"text-emerald-600":"text-slate-400"}`}>{note}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-indigo-600 dark:bg-slate-800"><Icon className="h-4 w-4"/></span></div></GlassCard>;
}
function ActionLink({href,icon:Icon,label}:{href:string;icon:any;label:string}) { return <Link href={href} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><Icon className="h-3.5 w-3.5"/>{label}</Link>; }
function DecisionRow({href,icon:Icon,tone,title,detail}:{href:string;icon:any;tone:"red"|"amber"|"green";title:string;detail:string}) {
  const styles = tone === "red" ? "border-red-100 bg-red-50/60 text-red-600" : tone === "amber" ? "border-amber-100 bg-amber-50/60 text-amber-600" : "border-emerald-100 bg-emerald-50/60 text-emerald-600";
  return <Link href={href} className={`flex items-start gap-3 rounded-xl border p-3 transition hover:-translate-y-px ${styles}`}><Icon className="mt-0.5 h-4 w-4 shrink-0"/><div><p className="text-xs font-semibold text-slate-850 dark:text-slate-100">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-400">{detail}</p></div></Link>;
}
function EmptyGood({text}:{text:string}) { return <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-center text-xs font-medium text-emerald-700"><CheckCircle2 className="mx-auto mb-2 h-4 w-4"/>{text}</div>; }
