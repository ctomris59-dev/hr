"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Crown,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
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

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function signed(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
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

  const scopedOrg = useMemo(() => (user ? (filterDataByScope(orgData || [], user) as any[]) : []), [orgData, user]);
  const latest = useMemo(() => latestEvaluationMap(history360 || []), [history360]);
  const snapshots = useMemo(
    () => scopedOrg.map((person) => ({ person, snapshot: buildTalentDecisionSnapshot(person, history360 || []) })),
    [scopedOrg, history360],
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    const role = String(user.role || "").toUpperCase();
    const dept = String(user.dept || user.department || "");
    const query = { role, userDept: dept, department: role === "DIRECTOR" || role === "MANAGER" ? dept : undefined };
    const refresh = () => void getPulseAnalytics(query).then((result) => { if (active) setPulse(result); });
    refresh();
    window.addEventListener("pulseUpdated", refresh);
    window.addEventListener("dataUpdated", refresh);
    return () => {
      active = false;
      window.removeEventListener("pulseUpdated", refresh);
      window.removeEventListener("dataUpdated", refresh);
    };
  }, [user]);

  const performanceRows = snapshots.filter(({ snapshot }) => snapshot.performance.score > 0);
  const avgPerformance = performanceRows.length
    ? performanceRows.reduce((sum, row) => sum + row.snapshot.performance.score, 0) / performanceRows.length
    : 0;
  const performanceCoverage = pct(performanceRows.length, snapshots.length);
  const avgEvidence = snapshots.length
    ? snapshots.reduce((sum, row) => sum + Number(row.snapshot.evidence.score || 0), 0) / snapshots.length
    : 0;
  const lowEvidence = snapshots.filter(({ snapshot }) => snapshot.evidence.score < 60);
  const calibrationRequired = snapshots.filter(({ person }) => {
    const evaluation = latest.get(normalizeEmployeeName(person?.["Ad Soyad"]));
    const kpi = Number(evaluation?.kpi_score);
    const manager = Number(evaluation?.manager_performance_score);
    return Number.isFinite(kpi) && kpi > 0 && Number.isFinite(manager) && manager > 0 && Math.abs(kpi - manager) >= 0.75;
  });
  const lowPerformers = performanceRows
    .filter(({ snapshot }) => snapshot.performance.score < 3.5)
    .sort((a, b) => a.snapshot.performance.score - b.snapshot.performance.score);

  const reportCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scopedOrg.forEach((person) => {
      const manager = String(person?.["Yönetici 1"] || "");
      if (manager) counts.set(manager, (counts.get(manager) || 0) + 1);
    });
    return counts;
  }, [scopedOrg]);

  const criticalRoles = useMemo(
    () => scopedOrg.filter((person) => getCareerRole(person?.Pozisyon || "").levelRank >= 4 || (reportCounts.get(String(person?.["Ad Soyad"] || "")) || 0) >= 2),
    [scopedOrg, reportCounts],
  );
  const successionRisk = useMemo(
    () => criticalRoles.filter((target) => !rankSuccessors(target, scopedOrg, history360 || []).some((item) => item.assessment.readiness === "Şimdi")),
    [criticalRoles, scopedOrg, history360],
  );
  const successionReadyRate = criticalRoles.length ? 100 - pct(successionRisk.length, criticalRoles.length) : 0;

  const development = getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []);
  const overduePlans = development.filter((plan) => {
    const due = dueDate(plan);
    return Boolean(due && due.getTime() < Date.now() && !isCompleted(plan));
  });
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
      const values = map.get(dept) || [];
      values.push(snapshot.performance.score);
      map.set(dept, values);
    });
    return Array.from(map.entries())
      .map(([department, values]) => ({ department, average: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }))
      .sort((a, b) => b.average - a.average);
  }, [snapshots]);

  const talentSegments = useMemo(() => {
    const result = { star: 0, strong: 0, core: 0, development: 0 };
    snapshots.forEach(({ snapshot }) => {
      const performance = Number(snapshot.performance.score || 0);
      const potential = Number(snapshot.talent.potential.score || 0);
      if (performance >= 4 && potential >= 4) result.star += 1;
      else if (performance >= 4 || potential >= 4) result.strong += 1;
      else if (performance >= 3 && potential >= 3) result.core += 1;
      else result.development += 1;
    });
    return result;
  }, [snapshots]);

  const attentionCount = [calibrationRequired.length, successionRisk.length, overduePlans.length, learningImpact.reassessmentDue, lowEvidence.length]
    .filter((value) => Number(value) > 0).length;

  if (loading || !ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-72" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!scopedOrg.length) {
    return (
      <div className="enterprise-card p-8 text-center">
        <LayoutDashboard className="mx-auto h-8 w-8 text-slate-300" />
        <h1 className="mt-3 text-lg font-semibold">Yönetici Özeti</h1>
        <p className="mt-1 text-sm text-slate-500">Karar görünümünü oluşturmak için organizasyon verisi bulunamadı.</p>
        <Link href="/organizasyon" className="mt-4 inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white">Organizasyon verisini yükle</Link>
      </div>
    );
  }

  const pulseLatest = pulse?.latest;
  const pulseDelta = pulse?.latestDelta;
  const profile = [
    { label: "Performans", value: clamp(avgPerformance * 20), color: "#3974f6" },
    { label: "Kanıt", value: clamp(avgEvidence), color: "#8255ef" },
    { label: "Halefiyet", value: clamp(successionReadyRate), color: "#18a97d" },
    { label: "Deneyim", value: clamp(Number(pulseLatest?.average_score || 0) * 10), color: "#ed516d" },
    { label: "Gelişim", value: clamp(Number(learningImpact.positiveRate || 0)), color: "#17aaa5" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="futurehr-dashboard space-y-4 pb-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="enterprise-eyebrow">FutureHR · Executive dashboard</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[10px] font-semibold text-emerald-600">Canlı kurum görünümü</span>
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-.04em] text-slate-950 dark:text-white">Yönetici Özeti</h1>
          <p className="mt-1 text-[12px] text-slate-500">
            {attentionCount ? `Bugün dikkatinizi gerektiren ${attentionCount} karar alanı var.` : "Bugün kritik bir karar uyarısı görünmüyor."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href="/kalibrasyon" icon={Scale} label="Kalibrasyon" />
          <ActionLink href="/yetenek-matrisi" icon={Star} label="9-Box" />
          <ActionLink href="/yedekleme" icon={Crown} label="Halefiyet" />
          <ActionLink href="/maas" icon={Target} label="Ücret" />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Çalışan" value={String(scopedOrg.length)} note={`${performanceRows.length} değerlendirme kaydı`} icon={Users} tone="blue" bars={departments.slice(0, 7).map((item) => item.count)} />
        <KpiCard label="Ort. performans" value={avgPerformance ? avgPerformance.toFixed(2) : "—"} suffix="/5" note={`%${performanceCoverage} kapsama`} icon={BarChart3} tone="violet" bars={performanceRows.slice(0, 7).map((row) => row.snapshot.performance.score)} />
        <KpiCard label="Evidence score" value={String(Math.round(avgEvidence))} suffix="/100" note={`${lowEvidence.length} düşük güven`} icon={ShieldCheck} tone="cyan" bars={snapshots.slice(0, 7).map((row) => row.snapshot.evidence.score)} />
        <KpiCard label="Halefiyet hazırlığı" value={`%${successionReadyRate}`} note={`${criticalRoles.length} kritik rol`} icon={Crown} tone="emerald" bars={[criticalRoles.length, criticalRoles.length - successionRisk.length, successionRisk.length, criticalRoles.length]} />
        <KpiCard label="Çalışan deneyimi" value={pulseLatest?.average_score ? pulseLatest.average_score.toFixed(1).replace(".", ",") : "—"} suffix="/10" note={pulseDelta == null ? "Anonim pulse" : `${pulseDelta >= 0 ? "+" : ""}${pulseDelta.toFixed(1)} değişim`} icon={Heart} tone="rose" bars={[Number(pulseLatest?.average_score || 0), Number(pulseLatest?.count || 0), Number(pulse?.anonymity.threshold || 5), Number(pulseLatest?.average_score || 0)]} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <article className="enterprise-card p-4 sm:p-5">
          <PanelHeader eyebrow="Karar profili" title="Kurumun ana karar göstergeleri" subtitle="Beş ana sinyali aynı 0–100 ölçeğinde karşılaştırın." icon={Sparkles} />
          <DecisionProfileChart items={profile} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <SignalTile label="Kalibrasyon" value={calibrationRequired.length} detail="uyuşmayan kayıt" href="/kalibrasyon" tone={calibrationRequired.length ? "amber" : "green"} />
            <SignalTile label="Halefiyet" value={successionRisk.length} detail="riske açık rol" href="/yedekleme" tone={successionRisk.length ? "red" : "green"} />
            <SignalTile label="Gelişim" value={overduePlans.length} detail="geciken aksiyon" href="/gelisim" tone={overduePlans.length ? "amber" : "green"} />
            <SignalTile label="Kanıt" value={lowEvidence.length} detail="düşük güven" href="/degerlendirme" tone={lowEvidence.length ? "amber" : "green"} />
          </div>
        </article>

        <div className="space-y-4">
          <article className="enterprise-card p-4">
            <PanelHeader eyebrow="Çalışan deneyimi" title="Anonim mikro-pulse" subtitle="Güncel deneyim skoru" icon={Heart} />
            {pulseLatest ? (
              <div className="mt-4 grid grid-cols-[128px_1fr] items-center gap-4">
                <Gauge value={Number(pulseLatest.average_score || 0) * 10} display={`${pulseLatest.average_score?.toFixed(1).replace(".", ",") || "—"}/10`} color="#ed516d" />
                <div className="space-y-2 text-[11px]">
                  <StatLine label="Anonim yanıt" value={String(pulseLatest.count)} />
                  <StatLine label="Anonimlik eşiği" value={`k≥${pulse?.anonymity.threshold || 5}`} />
                  <StatLine label="Dönem değişimi" value={pulseDelta == null ? "—" : `${pulseDelta >= 0 ? "+" : ""}${pulseDelta.toFixed(1)}`} positive={pulseDelta != null ? pulseDelta >= 0 : undefined} />
                </div>
              </div>
            ) : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">Anonimlik eşiğini geçen pulse verisi henüz oluşmadı.</p>}
            <Link href="/calisan-deneyimi" className="mt-4 inline-flex text-[11px] font-semibold text-rose-600">Driver analizini aç →</Link>
          </article>

          <article className="enterprise-card p-4">
            <PanelHeader eyebrow="Karar kuyruğu" title="Öncelikli aksiyonlar" subtitle="Bugün ilk bakılması gereken alanlar" icon={AlertTriangle} />
            <div className="mt-3 space-y-2">
              <QueueRow label="Performans kalibrasyonu" value={calibrationRequired.length} tone={calibrationRequired.length ? "amber" : "green"} />
              <QueueRow label="Kritik rol sürekliliği" value={successionRisk.length} tone={successionRisk.length ? "red" : "green"} />
              <QueueRow label="Gelişim yeniden ölçüm" value={Number(learningImpact.reassessmentDue || 0)} tone={learningImpact.reassessmentDue ? "amber" : "green"} />
              <QueueRow label="Düşük evidence" value={lowEvidence.length} tone={lowEvidence.length ? "amber" : "green"} />
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr_.8fr]">
        <article className="enterprise-card p-4 sm:p-5">
          <PanelHeader eyebrow="Performans" title="Departman görünümü" subtitle="Ortalama skor ve ekip büyüklüğü" icon={BarChart3} />
          <div className="mt-4 space-y-3">
            {departments.slice(0, 7).map((item, index) => <DepartmentBar key={item.department} item={item} index={index} />)}
            {!departments.length && <EmptyState text="Departman performans verisi oluştuğunda burada görünür." />}
          </div>
        </article>

        <article className="enterprise-card p-4 sm:p-5">
          <PanelHeader eyebrow="Yetenek" title="Yetenek dağılımı" subtitle="Performans × potansiyel segmentleri" icon={Star} />
          <TalentDonut segments={talentSegments} />
        </article>

        <article className="enterprise-card p-4 sm:p-5">
          <PanelHeader eyebrow="Learning impact" title="Gelişim etkisi" subtitle="Transferden ölçüme ilerleme" icon={GraduationCap} />
          <div className="mt-4 space-y-3">
            <ProgressRow label="Doğrulanmış kanıt" value={Number(learningImpact.verified || 0)} max={Math.max(1, scopedTrainingAssignments.length)} tone="#3974f6" />
            <ProgressRow label="Yeniden ölçülen" value={Number(learningImpact.measured || 0)} max={Math.max(1, scopedTrainingAssignments.length)} tone="#17aaa5" />
            <ProgressRow label="Pozitif gelişim" value={Number(learningImpact.improved || 0)} max={Math.max(1, scopedTrainingAssignments.length)} tone="#18a97d" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniMetric label="Pozitif oran" value={learningImpact.positiveRate == null ? "—" : `%${learningImpact.positiveRate}`} />
            <MiniMetric label="Ort. değişim" value={signed(learningImpact.averageDelta)} />
          </div>
          <Link href="/gelisim-analitigi" className="mt-4 inline-flex text-[11px] font-semibold text-cyan-700">Etki analizini aç →</Link>
        </article>
      </section>

      {lowPerformers.length > 0 && (
        <section className="enterprise-card p-4">
          <PanelHeader eyebrow="Yakın takip" title="Performans ve kanıt öncelikleri" subtitle="3,5 altı performans sinyalleri" icon={BriefcaseBusiness} />
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {lowPerformers.slice(0, 4).map(({ person, snapshot }) => (
              <Link key={person.id || person["Ad Soyad"]} href="/degerlendirme" className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">{person["Ad Soyad"]}</p>
                    <p className="mt-1 truncate text-[10px] text-slate-500">{person.Departman} · Evidence %{snapshot.evidence.score}</p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{snapshot.performance.score.toFixed(1)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

function ActionLink({ href, icon: Icon, label }: { href: string; icon: typeof Scale; label: string }) {
  return (
    <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10.5px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <Icon className="h-3.5 w-3.5" />{label}
    </Link>
  );
}

const toneMap = {
  blue: { soft: "#eef4ff", solid: "#3974f6", text: "#2554ca" },
  violet: { soft: "#f4f0ff", solid: "#8255ef", text: "#6739ca" },
  cyan: { soft: "#eafaf9", solid: "#17aaa5", text: "#087c78" },
  emerald: { soft: "#ebfbf5", solid: "#18a97d", text: "#087a59" },
  rose: { soft: "#fff0f3", solid: "#ed516d", text: "#bf2946" },
};

type KpiTone = keyof typeof toneMap;

function KpiCard({ label, value, suffix, note, icon: Icon, tone, bars }: { label: string; value: string; suffix?: string; note: string; icon: typeof Users; tone: KpiTone; bars: number[] }) {
  const palette = toneMap[tone];
  const max = Math.max(1, ...bars.map(Number));
  return (
    <article className="enterprise-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold text-slate-500">{label}</p>
          <p className="mt-1.5 text-[24px] font-semibold tracking-[-.04em] text-slate-900 dark:text-white">
            {value}{suffix && <span className="ml-1 text-[11px] font-medium text-slate-400">{suffix}</span>}
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: palette.soft, color: palette.text }}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-3 flex h-8 items-end gap-1">
        {(bars.length ? bars : [1, 1, 1, 1, 1, 1]).slice(-8).map((bar, index) => (
          <span key={index} className="flex-1 rounded-t-[3px]" style={{ height: `${Math.max(18, (Number(bar) / max) * 100)}%`, background: palette.solid, opacity: 0.28 + index * 0.08 }} />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">{note}</p>
    </article>
  );
}

function PanelHeader({ eyebrow, title, subtitle, icon: Icon }: { eyebrow: string; title: string; subtitle: string; icon: typeof Sparkles }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-1 text-[14px] font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-[10.5px] text-slate-500">{subtitle}</p>
      </div>
      <Icon className="h-4 w-4 text-slate-400" />
    </div>
  );
}

function DecisionProfileChart({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const width = 720;
  const height = 230;
  const padX = 36;
  const padY = 24;
  const step = (width - padX * 2) / Math.max(1, items.length - 1);
  const points = items.map((item, index) => `${padX + index * step},${height - padY - (clamp(item.value) / 100) * (height - padY * 2)}`).join(" ");
  return (
    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] w-full" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = height - padY - (tick / 100) * (height - padY * 2);
          return <line key={tick} x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e7ebf0" strokeDasharray="5 5" />;
        })}
        <polyline fill="rgba(57,116,246,.10)" points={`${padX},${height - padY} ${points} ${width - padX},${height - padY}`} />
        <polyline fill="none" stroke="#3974f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {items.map((item, index) => {
          const x = padX + index * step;
          const y = height - padY - (clamp(item.value) / 100) * (height - padY * 2);
          return <g key={item.label}><circle cx={x} cy={y} r="5" fill={item.color} stroke="white" strokeWidth="3" /></g>;
        })}
      </svg>
      <div className="grid grid-cols-5 gap-2 text-center">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-xs font-semibold" style={{ color: item.color }}>%{Math.round(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalTile({ label, value, detail, href, tone }: { label: string; value: number; detail: string; href: string; tone: "amber" | "red" | "green" }) {
  const palette = tone === "red" ? ["#fff0f3", "#bf2946"] : tone === "amber" ? ["#fff7e2", "#b36d00"] : ["#ebfbf5", "#087a59"];
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-slate-700">{label}</p>
        <span className="rounded-md px-2 py-1 text-[11px] font-bold" style={{ background: palette[0], color: palette[1] }}>{value}</span>
      </div>
      <p className="mt-1 text-[9.5px] text-slate-400">{detail}</p>
    </Link>
  );
}

function Gauge({ value, display, color }: { value: number; display: string; color: string }) {
  const safe = clamp(value);
  return (
    <div className="relative h-[118px] w-[118px] rounded-full" style={{ background: `conic-gradient(${color} 0 ${safe}%,#e9edf2 ${safe}% 100%)` }}>
      <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
        <strong className="text-[20px] font-semibold text-slate-900 dark:text-white">{display}</strong>
        <span className="mt-1 text-[9px] uppercase tracking-[.1em] text-slate-400">Pulse</span>
      </div>
    </div>
  );
}

function StatLine({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"><span className="text-slate-500">{label}</span><span className={`font-semibold ${positive === true ? "text-emerald-600" : positive === false ? "text-rose-600" : "text-slate-800 dark:text-white"}`}>{value}</span></div>;
}

function QueueRow({ label, value, tone }: { label: string; value: number; tone: "amber" | "red" | "green" }) {
  const color = tone === "red" ? "#ed516d" : tone === "amber" ? "#f2a000" : "#18a97d";
  return <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-950/40"><span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</span><span className="min-w-8 rounded-md px-2 py-1 text-center text-[11px] font-bold text-white" style={{ background: color }}>{value}</span></div>;
}

function DepartmentBar({ item, index }: { item: { department: string; average: number; count: number }; index: number }) {
  const colors = ["#3974f6", "#8255ef", "#17aaa5", "#18a97d", "#f2a000", "#ed516d", "#64748b"];
  const color = colors[index % colors.length];
  return (
    <div className="grid grid-cols-[120px_1fr_78px] items-center gap-3">
      <div className="min-w-0"><p className="truncate text-[10.5px] font-medium text-slate-600">{item.department}</p><p className="text-[9px] text-slate-400">{item.count} çalışan</p></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(8, (item.average / 5) * 100)}%`, background: color }} /></div>
      <span className="text-right text-[11px] font-semibold text-slate-700">{item.average.toFixed(2)} / 5</span>
    </div>
  );
}

function TalentDonut({ segments }: { segments: { star: number; strong: number; core: number; development: number } }) {
  const total = Math.max(1, segments.star + segments.strong + segments.core + segments.development);
  const values = [segments.star, segments.strong, segments.core, segments.development];
  const colors = ["#18a97d", "#3974f6", "#8255ef", "#f2a000"];
  let cursor = 0;
  const stops = values.map((value, index) => {
    const start = cursor;
    cursor += (value / total) * 100;
    return `${colors[index]} ${start}% ${cursor}%`;
  }).join(",");
  return (
    <div className="mt-4 grid grid-cols-[130px_1fr] items-center gap-4">
      <div className="relative h-[120px] w-[120px] rounded-full" style={{ background: `conic-gradient(${stops})` }}><div className="absolute inset-[16px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900"><strong className="text-xl font-semibold">{total}</strong><span className="text-[9px] text-slate-400">çalışan</span></div></div>
      <div className="space-y-2 text-[10px]">
        <Legend label="Yıldız" value={segments.star} color={colors[0]} />
        <Legend label="Güçlü" value={segments.strong} color={colors[1]} />
        <Legend label="Çekirdek" value={segments.core} color={colors[2]} />
        <Legend label="Gelişim" value={segments.development} color={colors[3]} />
      </div>
    </div>
  );
}

function Legend({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span><strong className="text-slate-800 dark:text-white">{value}</strong></div>;
}

function ProgressRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return <div><div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-[10.5px] text-slate-500">{label}</span><strong className="text-[11px] text-slate-800 dark:text-white">{value}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(value ? 7 : 0, (value / Math.max(1, max)) * 100)}%`, background: tone }} /></div></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/40"><p className="text-[9px] uppercase tracking-[.08em] text-slate-400">{label}</p><p className="mt-1 text-[16px] font-semibold text-slate-800 dark:text-white">{value}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400"><CheckCircle2 className="mx-auto mb-2 h-4 w-4" />{text}</div>;
}
