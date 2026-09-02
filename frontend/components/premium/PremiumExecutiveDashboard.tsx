"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Crown,
  GraduationCap,
  Heart,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { getStorageData, STORAGE_KEYS } from "../../app/utils/storage";
import { filterDataByScope } from "../../app/utils/hierarchy";
import { buildTalentDecisionSnapshot } from "../../lib/hr/talentDecisionChain";
import { getCareerRole } from "../../lib/hr/careerArchitecture";
import { rankSuccessors } from "../../lib/hr/succession";
import { getPulseAnalytics, type PulseAnalyticsResponse } from "../../app/services/surveyService";
import PremiumEmptyState from "./PremiumEmptyState";
import { PremiumAreaTrendChart, PremiumBarChart, PremiumDonutChart } from "./PremiumCharts";
import { SkeletonChart, SkeletonKpiGrid, SkeletonList } from "../ui/Skeleton";

const COLORS = {
  blue: "#5b7cfa",
  cyan: "#22c7b8",
  violet: "#8b6ff8",
  emerald: "#2ac78c",
  amber: "#f4b740",
  rose: "#ef6a82",
  slate: "#7b8ca2",
};

const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const pct = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0;
const num = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

function isCompleted(row: any) {
  const status = String(row?.status || row?.durum || "").toLocaleLowerCase("tr-TR");
  return /tamam|complete|done|closed/.test(status) || num(row?.progress ?? row?.ilerleme) >= 100;
}

function isOverdue(row: any) {
  if (isCompleted(row)) return false;
  const raw = row?.dueDate || row?.deadline || row?.endDate || row?.targetDate || row?.bitisTarihi;
  if (!raw) return false;
  const date = new Date(raw);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function evaluationScore(row: any) {
  return num(row?.Performans ?? row?.performance ?? row?.manager_performance_score ?? row?.kpi_score);
}

function evaluationPeriod(row: any) {
  const explicit = String(row?.period || row?.Dönem || row?.donem || "").trim();
  if (explicit) return explicit;
  const raw = row?.date || row?.Tarih || row?.createdAt || row?.timestamp;
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function performanceTrend(history: any[]) {
  const groups = new Map<string, number[]>();
  history.forEach((row) => {
    const label = evaluationPeriod(row);
    const score = evaluationScore(row);
    if (!label || !(score > 0)) return;
    const values = groups.get(label) || [];
    values.push(score);
    groups.set(label, values);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "tr"))
    .slice(-6)
    .map(([label, values]) => ({
      label,
      performance: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    }));
}

function MetricCard({
  label,
  value,
  suffix,
  note,
  icon: Icon,
  color,
  progress,
}: {
  label: string;
  value: string;
  suffix?: string;
  note: string;
  icon: LucideIcon;
  color: string;
  progress?: number;
}) {
  return (
    <motion.article whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="pe-metric-card" style={{ "--pe-card-accent": color } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="pe-metric-label">{label}</p>
          <div className="mt-2 flex items-end gap-1.5">
            <strong className="pe-metric-value">{value}</strong>
            {suffix && <span className="mb-1 text-[10px] font-semibold text-[var(--pe-subtle)]">{suffix}</span>}
          </div>
        </div>
        <span className="pe-metric-icon"><Icon className="h-[17px] w-[17px]" strokeWidth={1.7} /></span>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-[var(--pe-muted)]">{note}</p>
      {progress != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--pe-surface-3)]">
          <motion.div initial={{ width: 0 }} animate={{ width: `${clamp(progress)}%` }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full" style={{ background: color }} />
        </div>
      )}
    </motion.article>
  );
}

function PanelHeading({ eyebrow, title, subtitle, icon: Icon, action }: { eyebrow: string; title: string; subtitle: string; icon: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="pe-panel-heading">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-[var(--pe-subtle)]" /><p>{eyebrow}</p></div>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      {action}
    </div>
  );
}

function QueueItem({ label, detail, count, color, href }: { label: string; detail: string; count: number; color: string; href: string }) {
  const clear = count === 0;
  return (
    <Link href={href} className="pe-queue-item group">
      <span className="pe-queue-status" style={{ background: clear ? COLORS.emerald : color }} />
      <span className="min-w-0 flex-1">
        <strong>{label}</strong>
        <small>{clear ? "Kontrol altında" : detail}</small>
      </span>
      <span className="pe-queue-count" data-clear={clear ? "true" : "false"}>{clear ? <CheckCircle2 className="h-3.5 w-3.5" /> : count}</span>
      <ArrowUpRight className="h-3.5 w-3.5 text-[var(--pe-subtle)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function PremiumExecutiveDashboard() {
  const { orgData, history360, loading } = useData();
  const reduced = useReducedMotion();
  const [user, setUser] = useState<any>(null);
  const [pulse, setPulse] = useState<PulseAnalyticsResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setUser(current);
    setReady(true);
  }, []);

  const scopedOrg = useMemo(() => user ? (filterDataByScope(orgData || [], user) as any[]) : [], [orgData, user]);
  const snapshots = useMemo(() => scopedOrg.map((person) => ({ person, snapshot: buildTalentDecisionSnapshot(person, history360 || []) })), [scopedOrg, history360]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const role = String(user.role || "").toUpperCase();
    const dept = String(user.dept || user.department || "");
    const query = { role, userDept: dept, department: role === "DIRECTOR" || role === "MANAGER" ? dept : undefined };
    void getPulseAnalytics(query).then((result) => { if (active) setPulse(result); }).catch(() => null);
    return () => { active = false; };
  }, [user]);

  const performanceRows = snapshots.filter(({ snapshot }) => snapshot.performance.score > 0);
  const avgPerformance = performanceRows.length ? performanceRows.reduce((sum, item) => sum + item.snapshot.performance.score, 0) / performanceRows.length : 0;
  const performanceCoverage = pct(performanceRows.length, snapshots.length);
  const avgEvidence = snapshots.length ? snapshots.reduce((sum, item) => sum + Number(item.snapshot.evidence.score || 0), 0) / snapshots.length : 0;
  const lowEvidence = snapshots.filter(({ snapshot }) => snapshot.evidence.score < 60).length;
  const lowPerformance = performanceRows.filter(({ snapshot }) => snapshot.performance.score < 3.5).length;

  const reportCounts = useMemo(() => {
    const map = new Map<string, number>();
    scopedOrg.forEach((person) => {
      const manager = String(person?.["Yönetici 1"] || "");
      if (manager) map.set(manager, (map.get(manager) || 0) + 1);
    });
    return map;
  }, [scopedOrg]);

  const criticalRoles = useMemo(() => scopedOrg.filter((person) => getCareerRole(person?.Pozisyon || "").levelRank >= 4 || (reportCounts.get(String(person?.["Ad Soyad"] || "")) || 0) >= 2), [scopedOrg, reportCounts]);
  const successionRisk = useMemo(() => criticalRoles.filter((target) => !rankSuccessors(target, scopedOrg, history360 || []).some((item) => item.assessment.readiness === "Şimdi")).length, [criticalRoles, scopedOrg, history360]);
  const successionReady = criticalRoles.length ? 100 - pct(successionRisk, criticalRoles.length) : 0;

  const plans = getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []);
  const assignments = getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
  const scopedNames = new Set(scopedOrg.map((person) => String(person?.["Ad Soyad"] || "")));
  const scopedPlans = plans.filter((row) => !row?.employee || scopedNames.has(String(row.employee)));
  const scopedAssignments = assignments.filter((row) => !row?.employee || scopedNames.has(String(row.employee)));
  const overduePlans = scopedPlans.filter(isOverdue).length;
  const completedTraining = scopedAssignments.filter(isCompleted).length;
  const learningCompletion = scopedAssignments.length ? pct(completedTraining, scopedAssignments.length) : 0;

  const departments = useMemo(() => {
    const map = new Map<string, number[]>();
    snapshots.forEach(({ person, snapshot }) => {
      if (!(snapshot.performance.score > 0)) return;
      const key = String(person?.Departman || "Belirtilmemiş");
      const values = map.get(key) || [];
      values.push(snapshot.performance.score);
      map.set(key, values);
    });
    return [...map.entries()].map(([label, values]) => ({ label, value: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) })).sort((a, b) => b.value - a.value);
  }, [snapshots]);

  const talent = useMemo(() => {
    const result = { star: 0, strong: 0, core: 0, development: 0 };
    snapshots.forEach(({ snapshot }) => {
      const box = snapshot.talent.nineBox;
      if (box === "Yıldız Oyuncu") result.star += 1;
      else if (["Yüksek Potansiyel", "Güçlü Performans", "Potansiyel Yatırımı"].includes(box)) result.strong += 1;
      else if (["Çekirdek Yetenek", "İstikrarlı Katkı", "Uzman Katkı"].includes(box)) result.core += 1;
      else result.development += 1;
    });
    return result;
  }, [snapshots]);

  const trend = useMemo(() => performanceTrend(history360 || []), [history360]);
  const pulseScore = Number(pulse?.latest?.average_score || 0);
  const health = [
    { label: "Performans", value: clamp(avgPerformance * 20), color: COLORS.blue },
    { label: "Kanıt", value: clamp(avgEvidence), color: COLORS.violet },
    { label: "Halefiyet", value: clamp(successionReady), color: COLORS.emerald },
    { label: "Deneyim", value: clamp(pulseScore * 10), color: COLORS.rose },
    { label: "Gelişim", value: clamp(learningCompletion), color: COLORS.cyan },
  ];
  const healthAverage = Math.round(health.reduce((sum, item) => sum + item.value, 0) / Math.max(1, health.length));
  const attention = [lowEvidence, successionRisk, overduePlans, lowPerformance].filter((value) => value > 0).length;

  if (loading || !ready) {
    return (
      <div className="premium-page-skeleton mx-auto max-w-[1680px] space-y-4 pb-6" aria-busy="true" aria-label="Yönetici özeti yükleniyor">
        <div className="h-[154px] premium-skeleton rounded-[22px]" />
        <SkeletonKpiGrid count={5} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_390px]"><SkeletonChart height={280} /><SkeletonList count={5} /></div>
      </div>
    );
  }

  if (!scopedOrg.length) {
    return <PremiumEmptyState title="Yönetici görünümü veri bekliyor" description="Executive dashboard, organizasyon verisi ve çalışan karar sinyalleri oluştuğunda otomatik olarak dolacak." actionLabel="Organizasyonu aç" actionHref="/organizasyon" kind="data" />;
  }

  return (
    <motion.main initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className="futurehr-dashboard pe-executive-dashboard mx-auto max-w-[1680px] space-y-4 pb-6">
      <section className="pe-executive-hero">
        <div className="pe-executive-hero-copy">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pe-live-pill"><span />FutureHR Intelligence</span>
            <span className="pe-context-pill">Executive Command Center</span>
          </div>
          <h1>Yönetici Özeti</h1>
          <p>{attention ? `Bugün ${attention} karar alanı yönetim dikkati istiyor. Sistem, performans, yetenek, gelişim ve çalışan deneyimi sinyallerini tek kanıt zincirinde birleştiriyor.` : "Kritik karar alanları kontrol altında. Kurum sağlığı ve yetenek sinyalleri canlı olarak izleniyor."}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/karar-merkezi" className="pe-button pe-button-primary"><BrainCircuit className="h-3.5 w-3.5" />Karar Motorunu Aç</Link>
            <Link href="/yetenek-matrisi" className="pe-button pe-button-secondary"><Star className="h-3.5 w-3.5" />9-Box Portföyü</Link>
            <Link href="/yedekleme" className="pe-button pe-button-secondary"><Crown className="h-3.5 w-3.5" />Halefiyet</Link>
          </div>
        </div>
        <div className="pe-health-orb" style={{ "--pe-health": `${healthAverage * 3.6}deg` } as React.CSSProperties}>
          <div><Sparkles className="h-4 w-4" /><strong>{healthAverage}</strong><span>Kurum sağlığı</span></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Toplam çalışan" value={String(scopedOrg.length)} note={`${performanceRows.length} çalışan değerlendirme kapsamında`} icon={Users} color={COLORS.blue} progress={performanceCoverage} />
        <MetricCard label="Ort. performans" value={avgPerformance ? avgPerformance.toFixed(2) : "—"} suffix="/5" note={`%${performanceCoverage} değerlendirme kapsamı`} icon={BarChart3} color={COLORS.violet} progress={avgPerformance * 20} />
        <MetricCard label="Evidence score" value={String(Math.round(avgEvidence))} suffix="/100" note={`${lowEvidence} çalışan düşük kanıt güveninde`} icon={ShieldCheck} color={COLORS.cyan} progress={avgEvidence} />
        <MetricCard label="Halefiyet hazırlığı" value={`%${successionReady}`} note={`${criticalRoles.length} kritik rol · ${successionRisk} açık risk`} icon={Crown} color={COLORS.emerald} progress={successionReady} />
        <MetricCard label="Çalışan deneyimi" value={pulseScore ? pulseScore.toFixed(1).replace(".", ",") : "—"} suffix="/10" note={pulse?.latest?.count ? `${pulse.latest.count} anonim pulse yanıtı` : "Anonim pulse verisi bekleniyor"} icon={Heart} color={COLORS.rose} progress={pulseScore * 10} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_390px]">
        <article className="pe-panel">
          <PanelHeading eyebrow="PERFORMANCE SIGNAL" title="Performans trendi" subtitle="Mevcut değerlendirme dönemlerinden hesaplanan kurum ortalaması" icon={Zap} action={<Link href="/degerlendirme" className="pe-text-link">Performansı aç <ArrowUpRight className="h-3 w-3" /></Link>} />
          <div className="pe-panel-body">
            {trend.length ? <PremiumAreaTrendChart data={trend} series={[{ key: "performance", label: "Ort. performans", color: COLORS.blue }]} height={286} ariaLabel="Dönem bazında ortalama performans trendi" valueFormatter={(value) => `${value.toFixed(2)} / 5`} /> : <PremiumEmptyState compact kind="insight" title="Trend için dönem verisi gerekiyor" description="En az bir tarih veya dönem etiketi taşıyan performans değerlendirmesi oluştuğunda trend burada gösterilecek." />}
          </div>
        </article>

        <article className="pe-panel">
          <PanelHeading eyebrow="DECISION QUEUE" title="Yönetim aksiyon kuyruğu" subtitle="Bugün kontrol edilmesi gereken karar sinyalleri" icon={Target} />
          <div className="pe-panel-body space-y-2">
            <QueueItem label="Düşük kanıt güveni" detail="Ek kanıt / yönetici doğrulaması" count={lowEvidence} color={COLORS.amber} href="/degerlendirme" />
            <QueueItem label="Halefiyet riski" detail="Şimdi hazır halef bulunmayan rol" count={successionRisk} color={COLORS.rose} href="/yedekleme" />
            <QueueItem label="Geciken gelişim planı" detail="Hedef tarihi geçmiş aksiyon" count={overduePlans} color={COLORS.amber} href="/gelisim" />
            <QueueItem label="Performans odağı" detail="3,5 altı performans sinyali" count={lowPerformance} color={COLORS.violet} href="/degerlendirme" />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <article className="pe-panel">
          <PanelHeading eyebrow="DECISION HEALTH" title="Karar sağlığı profili" subtitle="Beş ana yönetim sinyalini aynı 0–100 ölçeğinde karşılaştırın" icon={Sparkles} />
          <div className="pe-panel-body">
            <PremiumBarChart data={health.map((item) => ({ label: item.label, value: Math.round(item.value), color: item.color }))} height={260} ariaLabel="FutureHR karar sağlığı göstergeleri" valueFormatter={(value) => `%${Math.round(value)}`} />
          </div>
        </article>

        <article className="pe-panel">
          <PanelHeading eyebrow="TALENT PORTFOLIO" title="Yetenek portföyü" subtitle="9-Box sinyallerinin yönetici seviyesinde sadeleştirilmiş dağılımı" icon={Star} action={<Link href="/yetenek-matrisi" className="pe-text-link">Detayı aç <ArrowUpRight className="h-3 w-3" /></Link>} />
          <div className="pe-panel-body">
            <PremiumDonutChart
              data={[
                { label: "Yıldız Oyuncu", value: talent.star, color: COLORS.emerald },
                { label: "Güçlü / Yüksek Potansiyel", value: talent.strong, color: COLORS.blue },
                { label: "Çekirdek / İstikrarlı", value: talent.core, color: COLORS.violet },
                { label: "Gelişim Odağı", value: talent.development, color: COLORS.amber },
              ]}
              centerValue={snapshots.length}
              centerLabel="Çalışan"
              ariaLabel="Yetenek portföyü dağılımı"
            />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <article className="pe-panel">
          <PanelHeading eyebrow="ORGANIZATION" title="Departman performans karşılaştırması" subtitle="Kurum içindeki ekiplerin güncel ortalama performans görünümü" icon={BriefcaseBusiness} action={<Link href="/organizasyon" className="pe-text-link">Organizasyonu aç <ArrowUpRight className="h-3 w-3" /></Link>} />
          <div className="pe-panel-body">
            {departments.length ? <PremiumBarChart data={departments.slice(0, 8).map((item, index) => ({ ...item, color: [COLORS.blue, COLORS.violet, COLORS.cyan, COLORS.emerald, COLORS.amber, COLORS.rose, COLORS.slate][index % 7] }))} height={280} ariaLabel="Departmanlara göre ortalama performans" valueFormatter={(value) => `${value.toFixed(2)} / 5`} /> : <PremiumEmptyState compact title="Departman karşılaştırması için veri yok" description="Performans değerlendirmeleri departman bilgisiyle eşleştiğinde bu alan otomatik dolacak." />}
          </div>
        </article>

        <article className="pe-panel pe-learning-card">
          <PanelHeading eyebrow="LEARNING IMPACT" title="Gelişim döngüsü" subtitle="Atama sayısından çok kapanan ve geciken gelişim aksiyonları" icon={GraduationCap} />
          <div className="pe-panel-body">
            <div className="grid grid-cols-2 gap-3">
              <div className="pe-mini-stat"><span>Aktif eğitim</span><strong>{Math.max(0, scopedAssignments.length - completedTraining)}</strong><small>{scopedAssignments.length} toplam atama</small></div>
              <div className="pe-mini-stat"><span>Tamamlama</span><strong>%{learningCompletion}</strong><small>{completedTraining} tamamlanan</small></div>
              <div className="pe-mini-stat"><span>Geciken plan</span><strong>{overduePlans}</strong><small>yeniden takip gerekli</small></div>
              <div className="pe-mini-stat"><span>Evidence</span><strong>{Math.round(avgEvidence)}</strong><small>kurum ortalaması</small></div>
            </div>
            <Link href="/gelisim-analitigi" className="pe-button pe-button-secondary mt-4 w-full justify-center">Gelişim etkinliğini aç <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
        </article>
      </section>
    </motion.main>
  );
}
