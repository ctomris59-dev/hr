"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, BarChart3, CheckCircle2, Crown, GraduationCap, Heart, LayoutDashboard, Scale, ShieldCheck,
  Star, Target, TrendingDown, TrendingUp, Users,
} from "lucide-react";
import { useData } from "../../../context/DataContext";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { filterDataByScope } from "../../utils/hierarchy";
import { latestEvaluationMap, normalizeEmployeeName } from "../../../lib/hr/employeeIdentity";
import { buildTalentDecisionSnapshot } from "../../../lib/hr/talentDecisionChain";
import { getCareerRole } from "../../../lib/hr/careerArchitecture";
import { rankSuccessors } from "../../../lib/hr/succession";
import { buildDevelopmentAnalytics } from "../../../lib/hr/developmentAnalytics";
import { getPulseAnalytics, type PulseAnalyticsResponse } from "../../services/surveyService";
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
function signed(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

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
  const trainingAssignments = getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
  const scopedNames = new Set(scopedOrg.map((person) => String(person?.["Ad Soyad"] || "")));
  const scopedTrainingAssignments = trainingAssignments.filter((item) => scopedNames.has(String(item?.employee || "")));
  const developmentAnalytics = buildDevelopmentAnalytics(scopedTrainingAssignments, history360 || [], { period: 12 });
  const learningImpact = developmentAnalytics.summary;

  const departments = useMemo(() => {
    const map = new Map<string, number[]>();
    snapshots.forEach(({ person, snapshot }) => {
      if (!(snapshot.performance.score > 0)) return;
      const dept = String(person?.Departman || "Belirtilmemiş");
      const values = map.get(dept) || []; values.push(snapshot.performance.score); map.set(dept, values);
    });
    return Array.from(map.entries()).map(([department, values]) => ({ department, average: values.reduce((a, b) => a + b, 0) / values.length, count: values.length })).sort((a, b) => a.average - b.average);
  }, [snapshots]);

  const attentionCount = [calibrationRequired.length, successionRisk.length, overduePlans.length, learningImpact.reassessmentDue, lowEvidence.length].filter((value) => Number(value) > 0).length;

  if (loading || !ready) return <div className="space-y-4"><Skeleton className="h-14 w-72"/><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0,1,2,3].map((item)=><Skeleton key={item} className="h-32 rounded-xl"/>)}</div><Skeleton className="h-72 rounded-xl"/></div>;

  if (!scopedOrg.length) return (
    <div className="enterprise-card p-8 text-center"><LayoutDashboard className="mx-auto h-8 w-8 text-slate-300"/><h1 className="mt-3 text-lg font-semibold">Yönetici Özeti</h1><p className="mt-1 text-sm text-slate-500">Karar görünümünü oluşturmak için organizasyon verisi bulunamadı.</p><Link href="/organizasyon" className="mt-4 inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white">Organizasyon verisini yükle</Link></div>
  );

  const pulseLatest = pulse?.latest;
  const pulseDelta = pulse?.latestDelta;

  return (
    <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:.18}} className="futurehr-dashboard space-y-6 pb-6">
      <header className="futurehr-editorial-header flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-8">
        <div><div className="flex items-center gap-2"><span className="enterprise-eyebrow">İK Karar Merkezi</span><span className="h-1 w-1 rounded-full bg-slate-300"/><span className="text-[10px] text-slate-400">Kurum görünümü</span></div><h1 className="futurehr-editorial-title mt-2 text-[32px] leading-none text-slate-950 dark:text-white sm:text-[36px]">Yönetici Özeti</h1><p className="futurehr-dashboard-lede">{attentionCount ? `Bugün dikkatinizi gerektiren ${attentionCount} karar alanı var.` : "Bugün kritik bir karar uyarısı görünmüyor."}</p><p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500">Performans, kanıt, yetenek, halefiyet, gelişim ve deneyim verileri aynı çalışan zincirinden okunur.</p></div>
        <div className="flex flex-wrap gap-2"><ActionLink href="/kalibrasyon" icon={Scale} label="Kalibrasyon"/><ActionLink href="/yetenek-matrisi" icon={Star} label="Yetenek & 9-Box"/><ActionLink href="/yedekleme" icon={Crown} label="Halefiyet"/><ActionLink href="/gelisim-analitigi" icon={GraduationCap} label="Gelişim Etkisi"/><ActionLink href="/maas" icon={Target} label="Ücret Kararları"/></div>
      </header>

      <div className="enterprise-card grid grid-cols-2 overflow-hidden xl:grid-cols-4">
        <MetricCard label="Görünen çalışan" value={scopedOrg.length} note={`${performanceRows.length} performans kaydı`} icon={Users} />
        <MetricCard label="Ort. performans" value={avgPerformance ? avgPerformance.toFixed(2) : "—"} note={`%${performanceCoverage} veri kapsamı`} icon={BarChart3} positive={avgPerformance >= PERFORMANCE_TARGET} />
        <MetricCard label="Kanıt riski" value={lowEvidence.length} note={`Evidence Score < 60 · %${pct(lowEvidence.length, snapshots.length)}`} icon={ShieldCheck} warning={lowEvidence.length > 0} />
        <MetricCard label="Halefiyet riski" value={successionRisk.length} note={`${criticalRoles.length} kritik rol içinde`} icon={Crown} warning={successionRisk.length > 0} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        <section className="enterprise-card p-5">
          <div className="flex items-end justify-between gap-4"><div><p className="enterprise-eyebrow">Yönetim öncelikleri</p><h2 className="mt-1 text-[16px] font-semibold text-slate-900 dark:text-white">Bu hafta karar gerektiren sinyaller</h2></div><span className="text-[10px] text-slate-400">Kural + Evidence Graph</span></div>
          <div className="mt-3">
            <DecisionRow href="/kalibrasyon" icon={Scale} tone={calibrationRequired.length ? "amber" : "green"} title="Performans kalibrasyonu" detail={calibrationRequired.length ? `${calibrationRequired.length} çalışanda KPI ile yönetici gözlemi farkı ≥ 0,75.` : "Belirgin KPI-yönetici puan farkı bulunmuyor."} />
            <DecisionRow href="/yedekleme" icon={Crown} tone={successionRisk.length ? "red" : "green"} title="Kritik rol sürekliliği" detail={successionRisk.length ? `${successionRisk.length} kritik rolde yüksek kanıtla 'Şimdi hazır' halef bulunmuyor.` : "Kritik roller için hazır halef sinyali mevcut."} />
            <DecisionRow href="/gelisim" icon={Target} tone={overduePlans.length ? "amber" : "green"} title="Gelişim aksiyonları" detail={overduePlans.length ? `${overduePlans.length} gelişim planının hedef tarihi geçti.` : "Gecikmiş açık gelişim planı bulunmuyor."} />
            <DecisionRow href="/gelisim-analitigi" icon={GraduationCap} tone={learningImpact.reassessmentDue ? "amber" : "green"} title="Gelişim etkisi / yeniden ölçüm" detail={learningImpact.reassessmentDue ? `${learningImpact.reassessmentDue} doğrulanmış gelişim müdahalesinde yeniden ölçüm zamanı geldi.` : learningImpact.measured ? `${learningImpact.measured} müdahale yeniden ölçüldü; pozitif değişim oranı %${learningImpact.positiveRate ?? 0}.` : "Doğrulanmış gelişimlerde henüz gecikmiş yeniden ölçüm bulunmuyor."} />
            <DecisionRow href="/degerlendirme" icon={ShieldCheck} tone={lowEvidence.length ? "amber" : "green"} title="Kanıt kalitesi" detail={lowEvidence.length ? `${lowEvidence.length} çalışanın Evidence Score'u 60 altında; karar öncesi ek kanıt önerilir.` : "Karar zincirinde düşük Evidence Score kaydı bulunmuyor."} />
          </div>
        </section>

        <section className="enterprise-card p-5">
          <div className="flex items-start justify-between"><div><p className="enterprise-eyebrow">Çalışan deneyimi</p><h2 className="mt-1 text-[16px] font-semibold">Anonim mikro-pulse</h2></div><Heart className="h-4 w-4 text-slate-400"/></div>
          {pulseLatest ? <div className="mt-5"><div className="flex items-end justify-between"><div><p className="text-[32px] font-semibold tracking-[-.04em]">{pulseLatest.average_score?.toFixed(1).replace(".",",") || "—"}<span className="ml-1 text-xs text-slate-400">/10</span></p><p className="mt-1 text-[10px] text-slate-400">{pulseLatest.count} anonim yanıt · k≥{pulse?.anonymity.threshold || 5}</p></div>{pulseDelta !== null && pulseDelta !== undefined && <span className={`inline-flex items-center gap-1 border-l pl-2 text-[10px] font-semibold ${pulseDelta >= 0 ? "text-emerald-700" : "text-red-700"}`}>{pulseDelta>=0?<TrendingUp className="h-3 w-3"/>:<TrendingDown className="h-3 w-3"/>}{pulseDelta>=0?"+":""}{pulseDelta.toFixed(1)}</span>}</div><div className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-600 dark:border-slate-800 dark:text-slate-300">{pulse?.lowestDriver ? `En düşük driver: ${pulse.lowestDriver.label} · ${pulse.lowestDriver.average.toFixed(1)}/5.` : "Driver verisi yeni haftalık check-in'lerle oluşur."}</div><Link href="/calisan-deneyimi" className="mt-3 inline-flex text-[11px] font-semibold text-[#2f6664]">Anonim driver analizini aç →</Link></div> : <div className="mt-5 border-t border-dashed border-slate-200 pt-4 text-xs text-slate-500">Anonimlik eşiğini geçen mikro-pulse verisi henüz yok. <Link href="/calisan-deneyimi" className="font-semibold text-[#2f6664]">Check-in ekranı →</Link></div>}
        </section>
      </div>

      <section className="enterprise-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
          <div><p className="enterprise-eyebrow">Gelişim etkisi</p><h2 className="mt-1 text-[16px] font-semibold">Gelişim müdahalelerinin ölçülen etkisi</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">Yalnız doğrulanmış işe transfer kanıtı ve karşılaştırılabilir yeniden ölçüm sonuçları kullanılır.</p></div>
          <Link href="/gelisim-analitigi" className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Detaylı etkinlik analizi →</Link>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-4 dark:bg-slate-800">
          <ImpactStat label="Doğrulanmış kanıt" value={String(learningImpact.verified)} note="işe transfer doğrulandı" />
          <ImpactStat label="Yeniden ölçülen" value={String(learningImpact.measured)} note={learningImpact.reassessmentDue ? `${learningImpact.reassessmentDue} ölçüm bekliyor` : "gecikmiş ölçüm yok"} warning={learningImpact.reassessmentDue > 0} />
          <ImpactStat label="Pozitif gelişim" value={learningImpact.positiveRate === null ? "—" : `%${learningImpact.positiveRate}`} note={learningImpact.measured ? `${learningImpact.improved}/${learningImpact.measured} ölçümde artış` : "ölçüm oluşmadı"} positive={learningImpact.positiveRate !== null && learningImpact.positiveRate >= 60} />
          <ImpactStat label="Ort. yetkinlik değişimi" value={signed(learningImpact.averageDelta)} note="5 puanlık ölçekte · nedensellik iddiası değil" positive={learningImpact.averageDelta !== null && learningImpact.averageDelta >= 0.15} warning={learningImpact.averageDelta !== null && learningImpact.averageDelta < 0} />
        </div>
        <div className="grid gap-3 border-t border-slate-100 bg-[#fafaf8] p-4 text-[10px] leading-5 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-950/30">
          <p><strong className="text-slate-700 dark:text-slate-200">En güçlü yetkinlik sinyali:</strong> {developmentAnalytics.signals.strongestCompetency ? `${developmentAnalytics.signals.strongestCompetency.label} · ${signed(developmentAnalytics.signals.strongestCompetency.averageDelta)} · n=${developmentAnalytics.signals.strongestCompetency.measured}` : "ölçüm bekleniyor"}</p>
          <p><strong className="text-slate-700 dark:text-slate-200">En güçlü yöntem sinyali:</strong> {developmentAnalytics.signals.strongestMethod ? `${developmentAnalytics.signals.strongestMethod.label} · ${signed(developmentAnalytics.signals.strongestMethod.averageDelta)}` : "ölçüm bekleniyor"}</p>
          <p><strong className="text-slate-700 dark:text-slate-200">Ölçüm kapsamı:</strong> {learningImpact.measurementRate === null ? "—" : `%${learningImpact.measurementRate}`} doğrulanmış müdahale yeniden ölçüldü.</p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="enterprise-card p-5"><div className="flex items-center justify-between"><div><p className="enterprise-eyebrow">Yakın takip</p><h2 className="mt-1 text-[16px] font-semibold">Performans & kanıt öncelikleri</h2></div><AlertTriangle className="h-4 w-4 text-slate-400"/></div><div className="mt-3">{lowPerformers.slice(0,4).map(({person,snapshot})=><Link key={person.id || person["Ad Soyad"]} href="/degerlendirme" className="flex items-center justify-between border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800"><div className="min-w-0"><p className="truncate text-xs font-semibold">{person["Ad Soyad"]}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{person.Departman} · Evidence %{snapshot.evidence.score}</p></div><span className="text-sm font-semibold tabular-nums text-amber-700">{snapshot.performance.score.toFixed(1)}</span></Link>)}{!lowPerformers.length && <EmptyGood text="3,5 altında performans sinyali yok."/>}</div></section>
        <section className="enterprise-card p-5"><div className="flex items-center justify-between"><div><p className="enterprise-eyebrow">Departman görünümü</p><h2 className="mt-1 text-[16px] font-semibold">Performans kapsamı</h2></div><BarChart3 className="h-4 w-4 text-slate-400"/></div><div className="mt-3">{departments.slice(0,6).map((item)=><div key={item.department} className="flex items-center justify-between border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800"><div><p className="text-xs font-semibold">{item.department}</p><p className="mt-0.5 text-[10px] text-slate-400">{item.count} değerlendirilmiş çalışan</p></div><span className={`text-sm font-semibold tabular-nums ${item.average >= PERFORMANCE_TARGET ? "text-emerald-700" : "text-slate-700 dark:text-slate-200"}`}>{item.average.toFixed(2)}</span></div>)}</div></section>
      </div>
    </motion.div>
  );
}

function MetricCard({label,value,note,icon:Icon,positive,warning}:{label:string;value:string|number;note:string;icon:any;positive?:boolean;warning?:boolean}) {
  return <div className="border-b border-r border-slate-100 p-4 last:border-r-0 xl:border-b-0 dark:border-slate-800"><div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-slate-400"/><p className="enterprise-eyebrow">{label}</p></div><p className="mt-3 text-[30px] font-semibold leading-none tracking-[-.04em] text-slate-950 dark:text-white">{typeof value === "number" ? <CountUp value={value}/> : value}</p><p className={`mt-2 text-[10px] ${warning?"text-amber-700":positive?"text-emerald-700":"text-slate-400"}`}>{note}</p></div>;
}
function ImpactStat({label,value,note,positive,warning}:{label:string;value:string;note:string;positive?:boolean;warning?:boolean}) {
  return <div className="bg-white p-4 dark:bg-slate-900"><p className="text-[10px] font-semibold uppercase tracking-[.07em] text-slate-400">{label}</p><p className={`mt-2 text-2xl font-semibold tracking-[-.03em] ${warning?"text-amber-700":positive?"text-emerald-700":"text-slate-950 dark:text-white"}`}>{value}</p><p className={`mt-1 text-[10px] ${warning?"text-amber-700":positive?"text-emerald-700":"text-slate-400"}`}>{note}</p></div>;
}
function ActionLink({href,icon:Icon,label}:{href:string;icon:any;label:string}) { return <Link href={href} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-transparent px-3 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:text-slate-300"><Icon className="h-3.5 w-3.5 text-slate-400"/>{label}</Link>; }
function DecisionRow({href,icon:Icon,tone,title,detail}:{href:string;icon:any;tone:"red"|"amber"|"green";title:string;detail:string}) {
  const toneClass = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-emerald-700";
  return <Link href={href} className="group flex items-start gap-3 border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800"><span className={`mt-0.5 ${toneClass}`}><Icon className="h-4 w-4 shrink-0"/></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-400">{detail}</p></div><span className="mt-1 text-[11px] text-slate-300 transition-transform group-hover:translate-x-0.5">→</span></Link>;
}
function EmptyGood({text}:{text:string}) { return <div className="border-t border-slate-100 py-4 text-xs font-medium text-emerald-700 dark:border-slate-800"><CheckCircle2 className="mr-2 inline h-4 w-4"/>{text}</div>; }
