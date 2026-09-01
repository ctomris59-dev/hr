"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  GraduationCap,
  Grid3X3,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { buildTalentDecisionSnapshot } from "../lib/hr/talentDecisionChain";
import { fetchSaasTalentWorkspace, SAAS_DATA_MODE } from "../lib/hr/saasWorkforceClient";

type Snapshot = {
  org: any[];
  history: any[];
  candidates: any[];
  assessments: any[];
  trainings: any[];
};

type Tone = "blue" | "violet" | "emerald" | "amber" | "rose" | "teal";
type KPI = { label: string; value: string; delta: string; hint: string; spark: number[]; tone: Tone };
type ChartItem = { label: string; value: number; tone?: Tone };
type Board = {
  title: string;
  subtitle: string;
  eyebrow: string;
  accent: string;
  kpis: KPI[];
  spotlight: { label: string; name: string; role: string; score: number; bullets: string[] };
  middle: { title: string; subtitle: string; kind: "bars" | "matrix"; items: ChartItem[] };
  trend: { title: string; subtitle: string; points: ChartItem[]; suffix?: string };
};

const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const txt = (value: unknown) => String(value ?? "").trim();
const num = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const pct = (value: number) => `%${Math.max(0, Math.min(100, Math.round(value)))}`;
const nameOf = (row: any) => txt(row?.["Ad Soyad"] ?? row?.Personel ?? row?.employee ?? row?.name ?? row?.subjectName);
const deptOf = (row: any) => txt(row?.Departman ?? row?.department ?? "Genel");
const roleOf = (row: any) => txt(row?.Pozisyon ?? row?.position ?? row?.role ?? "Rol belirtilmedi");
const statusOf = (row: any) => txt(row?.status ?? row?.Status ?? row?.durum ?? row?.Durum);
const avg = (values: number[]) => {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
};

function group(items: any[], getter: (item: any) => string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = getter(item) || "Belirsiz";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") || "")
    .join("") || "FH";
}

function readLocalSnapshot(): Snapshot {
  return {
    org: arr(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, [])),
    history: arr(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, [])),
    candidates: arr(getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, [])),
    assessments: arr(getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS, [])),
    trainings: arr(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, [])),
  };
}

async function readSnapshot(pathname: string): Promise<Snapshot> {
  const local = readLocalSnapshot();
  const needsTalentData = pathname.startsWith("/yetenek-matrisi") || pathname.startsWith("/kariyer");
  if (!SAAS_DATA_MODE || !needsTalentData) return local;

  try {
    const workspace = await fetchSaasTalentWorkspace();
    return {
      ...local,
      org: workspace.employees,
      history: workspace.evaluations,
    };
  } catch (error) {
    console.warn("VisualModuleBoard SaaS talent data fallback", error);
    return local;
  }
}

function monthSeries(items: any[], getDate: (item: any) => string | undefined) {
  const result: { label: string; value: number }[] = [];
  const now = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ label: date.toLocaleDateString("tr-TR", { month: "short" }).replace(".", ""), value: 0 });
    keys.push(`${date.getFullYear()}-${date.getMonth()}`);
  }
  items.forEach((item) => {
    const raw = getDate(item);
    if (!raw) return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    const index = keys.indexOf(`${date.getFullYear()}-${date.getMonth()}`);
    if (index >= 0) result[index].value += 1;
  });
  return result;
}

function tone(toneName: Tone) {
  return {
    blue: { solid: "#4f7df3", soft: "#eef4ff", text: "#315ad5" },
    violet: { solid: "#8b5cf6", soft: "#f5f3ff", text: "#6d3fd7" },
    emerald: { solid: "#20c997", soft: "#ecfdf7", text: "#0f8f69" },
    amber: { solid: "#f5a524", soft: "#fff8e8", text: "#b87505" },
    rose: { solid: "#f35d78", soft: "#fff0f3", text: "#c42d4b" },
    teal: { solid: "#1ab7b0", soft: "#ecfbfa", text: "#0d817c" },
  }[toneName];
}

function buildRecruitment(snapshot: Snapshot): Board {
  const candidates = snapshot.candidates.filter((item) => txt(item?.type) !== "Mevcut Çalışan");
  const total = candidates.length;
  const tested = candidates.filter((item) => item?.raw_scores && Object.keys(item.raw_scores || {}).length > 0).length;
  const interview = candidates.filter((item) => /mülakat|interview/i.test(statusOf(item))).length;
  const offer = candidates.filter((item) => /teklif|offer/i.test(statusOf(item))).length;
  const hired = candidates.filter((item) => /işe al|hired|kabul/i.test(statusOf(item))).length;
  const evidence = candidates.reduce(
    (sum, item) => sum + (item?.structuredInterviewCompleted ? 1 : 0) + (item?.workSampleAvailable ? 1 : 0) + (item?.recruiterNote ? 1 : 0) + (item?.raw_scores ? 1 : 0),
    0,
  );
  const quality = avg(candidates.map((item) => avg(Object.values(item?.raw_scores || {}).map(num))));
  const months = monthSeries(candidates, (item) => item?.createdAt || item?.date);
  const best = [...candidates].sort(
    (a, b) => avg(Object.values(b?.raw_scores || {}).map(num)) - avg(Object.values(a?.raw_scores || {}).map(num)),
  )[0];

  return {
    title: "İşe Alım Özeti",
    subtitle: "Aday havuzunu, dönüşümü ve rol uyumunu tek bakışta yönetin.",
    eyebrow: "EXECUTIVE RECRUITMENT",
    accent: "#4f7df3",
    kpis: [
      { label: "Aday Kalitesi", value: quality ? `${quality.toFixed(1)} / 5` : "—", delta: total ? `${tested}/${total}` : "0/0", hint: "Test kapsamı", spark: months.map((item) => item.value), tone: "blue" },
      { label: "Açık Pozisyon Süresi", value: total ? `${Math.max(7, Math.round(28 - (hired / Math.max(1, total)) * 10))} gün` : "—", delta: "↘ %10", hint: "Ortalama kapanış", spark: [31, 29, 30, 27, 26, 25], tone: "violet" },
      { label: "Mülakat Oranı", value: pct(total ? (interview / total) * 100 : 0), delta: "↗ %8", hint: "Başvuru → mülakat", spark: [18, 21, 19, 25, 23, 28], tone: "emerald" },
      { label: "İşe Alım Oranı", value: pct(total ? (hired / total) * 100 : 0), delta: "↗ %3", hint: "Başvuru → işe alım", spark: [8, 9, 8, 11, 10, 12], tone: "amber" },
    ],
    spotlight: {
      label: "Rol Uygunluk Önerisi",
      name: nameOf(best) || "Ece Kaya",
      role: roleOf(best) || "İşe Alım Uzmanı",
      score: Math.round(((quality || 4.2) / 5) * 100),
      bullets: [
        `${tested} aday test verisiyle değerlendirildi`,
        `${Math.round(total ? (evidence / (total * 4)) * 100 : 0)}% kanıt kapsamı`,
        "Mülakat + test birlikte yorumlanıyor",
      ],
    },
    middle: {
      title: "Performans Özeti",
      subtitle: "Aday pipeline dağılımı",
      kind: "bars",
      items: [
        { label: "Başvuru", value: total, tone: "blue" },
        { label: "Test", value: tested, tone: "violet" },
        { label: "Mülakat", value: interview, tone: "emerald" },
        { label: "Teklif", value: offer, tone: "amber" },
        { label: "İşe Alım", value: hired, tone: "teal" },
      ],
    },
    trend: { title: "Aylık Başvuru", subtitle: "Son 6 ay", points: months, suffix: "aday" },
  };
}

function buildLearning(snapshot: Snapshot): Board {
  const trainings = snapshot.trainings;
  const total = trainings.length;
  const done = trainings.filter((item) => /tamam/i.test(statusOf(item))).length;
  const verified = trainings.filter((item) => item?.managerVerified).length;
  const overdue = trainings.filter((item) => item?.dueDate && new Date(item.dueDate) < new Date() && !/tamam/i.test(statusOf(item))).length;
  const months = monthSeries(trainings, (item) => item?.assignedAt);
  const byCompetency = group(trainings, (item) => txt(item?.competencyCode ?? item?.trainingName ?? "Diğer")).slice(0, 5);
  const star = [...trainings].sort((a, b) => Number(Boolean(b?.managerVerified)) - Number(Boolean(a?.managerVerified)))[0];

  return {
    title: "Eğitim & Gelişim Özeti",
    subtitle: "Tamamlama, transfer kanıtı ve gelişim yoğunluğunu görselleştirin.",
    eyebrow: "LEARNING ANALYTICS",
    accent: "#1ab7b0",
    kpis: [
      { label: "Tamamlama Oranı", value: pct(total ? (done / total) * 100 : 0), delta: "↗ %12", hint: "Toplam atama", spark: [42, 48, 51, 57, 61, total ? (done / total) * 100 : 0], tone: "teal" },
      { label: "Aktif Eğitim", value: String(Math.max(0, total - done)), delta: `${total} toplam`, hint: "Devam eden", spark: months.map((item) => item.value), tone: "blue" },
      { label: "Transfer Kanıtı", value: pct(done ? (verified / done) * 100 : 0), delta: "↗ %7", hint: "Yönetici doğrulaması", spark: [20, 28, 32, 35, 42, done ? (verified / done) * 100 : 0], tone: "emerald" },
      { label: "Geciken", value: String(overdue), delta: overdue ? "Aksiyon" : "Kontrol", hint: "Son tarih geçmiş", spark: [1, 0, 2, 1, overdue, overdue], tone: "amber" },
    ],
    spotlight: {
      label: "Öğrenme Etkisi",
      name: txt(star?.employee) || "Ayşe Kaya",
      role: txt(star?.trainingName) || "Gelişim müdahalesi",
      score: Math.round(total ? (verified / Math.max(1, total)) * 100 : 76),
      bullets: [`${done} eğitim tamamlandı`, `${verified} yönetici doğrulaması`, "Tamamlama tek başına yetkinlik artışı sayılmıyor"],
    },
    middle: {
      title: "Yetkinlik Dağılımı",
      subtitle: "En yoğun gelişim alanları",
      kind: "bars",
      items: byCompetency.map(([label, value], index) => ({
        label,
        value,
        tone: ["teal", "blue", "violet", "emerald", "amber"][index] as Tone,
      })),
    },
    trend: { title: "Aylık Öğrenme", subtitle: "Son 6 ay atama hacmi", points: months, suffix: "atama" },
  };
}

function talentRows(snapshot: Snapshot) {
  return snapshot.org.map((person) => {
    const decision = buildTalentDecisionSnapshot(person, snapshot.history);
    return {
      ...person,
      _perf: Number(decision.performance.score || 0),
      _pot: Number(decision.talent.potential.score || 0),
      _box: decision.talent.nineBox,
      _confidence: Number(decision.talent.potential.confidence || 0),
    };
  });
}

function buildCareer(snapshot: Snapshot): Board {
  const people = talentRows(snapshot).map((person) => ({ ...person, _asp: num(person?.career_aspiration) }));
  const ready = people.map((person) => ({
    ...person,
    _ready: Math.round(Math.min(100, ((person._perf || 3) / 5) * 42 + ((person._pot || 3) / 5) * 42 + (person._asp ? person._asp * 3.2 : 8))),
  }));
  const avgReady = avg(ready.map((person) => person._ready));
  const highPotential = ready.filter((person) => person._pot >= 4).length;
  const readyNow = ready.filter((person) => person._ready >= 75).length;
  const top = [...ready].sort((a, b) => b._ready - a._ready)[0];
  const departments = group(ready.filter((person) => person._pot >= 4), deptOf).slice(0, 5);
  const aspiration = avg(ready.map((person) => person._asp));

  return {
    title: "Kariyer & Readiness Özeti",
    subtitle: "Hazır bulunuşluk, yüksek potansiyel ve iç mobilite havuzunu tek ekranda görün.",
    eyebrow: "CAREER MOBILITY",
    accent: "#8b5cf6",
    kpis: [
      { label: "Hazır Bulunuşluk", value: pct(avgReady), delta: `${readyNow} hazır`, hint: "Ortalama readiness", spark: ready.slice(0, 6).map((person) => person._ready), tone: "violet" },
      { label: "Yüksek Potansiyel", value: String(highPotential), delta: `${people.length} çalışan`, hint: "Potansiyel ≥ 4", spark: departments.map((item) => item[1]), tone: "blue" },
      { label: "Kariyer İsteği", value: aspiration ? `${aspiration.toFixed(1)} / 5` : "—", delta: "Öz-bildirim", hint: "Çalışan isteği", spark: ready.slice(0, 6).map((person) => person._asp || 0), tone: "emerald" },
      { label: "İç Mobilite", value: String(readyNow + highPotential), delta: "↗ %5", hint: "Hazır + yüksek potansiyel", spark: [4, 5, 7, 6, 8, readyNow + highPotential], tone: "amber" },
    ],
    spotlight: {
      label: "Mobilite Önerisi",
      name: nameOf(top) || "Zeynep Demir",
      role: roleOf(top) || "Kıdemli Uzman",
      score: top ? top._ready : 88,
      bullets: [`${deptOf(top) || "Genel"} içinde güçlü aday`, `${highPotential} yüksek potansiyel çalışan`, "Gelişim kanıtı ile birlikte değerlendirilmeli"],
    },
    middle: {
      title: "Hazır Bulunuşluk",
      subtitle: "Kariyer havuzu dağılımı",
      kind: "bars",
      items: [
        { label: "Hazır", value: readyNow, tone: "emerald" },
        { label: "Yakın", value: ready.filter((person) => person._ready >= 60 && person._ready < 75).length, tone: "amber" },
        { label: "Gelişim", value: ready.filter((person) => person._ready < 60).length, tone: "violet" },
      ],
    },
    trend: { title: "Yüksek Potansiyel", subtitle: "Departman dağılımı", points: departments.map(([label, value]) => ({ label, value })), suffix: "kişi" },
  };
}

function buildTalent(snapshot: Snapshot): Board {
  const people = talentRows(snapshot).filter((person) => person._perf > 0 && person._pot > 0);
  const total = people.length;
  const labels = [
    "Potansiyel Yatırımı",
    "Yüksek Potansiyel",
    "Yıldız Oyuncu",
    "Gelişim Odağı",
    "Çekirdek Yetenek",
    "Güçlü Performans",
    "Kritik Gelişim",
    "İstikrarlı Katkı",
    "Uzman Katkı",
  ] as const;
  const tones: Tone[] = ["blue", "teal", "emerald", "amber", "violet", "blue", "rose", "amber", "violet"];
  const cells: ChartItem[] = labels.map((label, index) => ({
    label,
    value: people.filter((person) => person._box === label).length,
    tone: tones[index],
  }));
  const stars = cells.find((cell) => cell.label === "Yıldız Oyuncu")?.value || 0;
  const highPotential = people.filter((person) => person._pot >= 4).length;
  const risk = people.filter((person) => person._perf < 3 || person._pot < 3).length;
  const coverage = snapshot.org.length ? (total / snapshot.org.length) * 100 : 0;
  const top = [...people].sort((a, b) => b._perf + b._pot - (a._perf + a._pot))[0];
  const departments = group(people.filter((person) => person._pot >= 4), deptOf).slice(0, 5);

  return {
    title: "9-Box Yetenek Özeti",
    subtitle: "Yetenek portföyünü gerçek 3×3 matris, KPI kartları ve departman dağılımıyla okuyun.",
    eyebrow: SAAS_DATA_MODE ? "TALENT PORTFOLIO · SAAS" : "TALENT PORTFOLIO",
    accent: "#20c997",
    kpis: [
      { label: "Yıldız Oyuncu", value: String(stars), delta: pct(total ? (stars / total) * 100 : 0), hint: "Yüksek perf. + potansiyel", spark: [1, 2, 2, 3, stars, stars], tone: "emerald" },
      { label: "Yüksek Potansiyel", value: String(highPotential), delta: `${total} kapsam`, hint: "Potansiyel ≥ 4", spark: departments.map((item) => item[1]), tone: "blue" },
      { label: "Kritik Gelişim", value: String(risk), delta: risk ? "Aksiyon" : "Düşük risk", hint: "Düşük skor segmenti", spark: [risk + 1, risk, risk + 1, risk, risk, risk], tone: "rose" },
      { label: "Matris Kapsamı", value: pct(coverage), delta: `${total}/${snapshot.org.length}`, hint: "Veri yeterliliği", spark: [60, 68, 72, 77, 82, coverage], tone: "violet" },
    ],
    spotlight: {
      label: "Öne Çıkan Yetenek",
      name: nameOf(top) || "Veri bekleniyor",
      role: roleOf(top) || "Yetenek profili",
      score: Math.round((((top?._perf || 0) + (top?._pot || 0)) / 10) * 100),
      bullets: [
        `${total} çalışan matris için hesaplandı`,
        `${stars} yıldız oyuncu`,
        SAAS_DATA_MODE ? "SaaS yetenek veri seti kullanılıyor" : "Yerel demo veri seti kullanılıyor",
      ],
    },
    middle: { title: "9-Box Matrisi", subtitle: "Performans × Potansiyel", kind: "matrix", items: cells },
    trend: { title: "Yüksek Potansiyel", subtitle: "Departman dağılımı", points: departments.map(([label, value]) => ({ label, value })), suffix: "kişi" },
  };
}

function build(pathname: string, snapshot: Snapshot) {
  if (pathname.startsWith("/ise-alim")) return buildRecruitment(snapshot);
  if (pathname.startsWith("/egitim")) return buildLearning(snapshot);
  if (pathname.startsWith("/kariyer")) return buildCareer(snapshot);
  return buildTalent(snapshot);
}

function Spark({ values, t }: { values: number[]; t: Tone }) {
  const palette = tone(t);
  const safe = values.length ? values : [1, 3, 2, 4, 3, 5];
  const minimum = Math.min(...safe);
  const maximum = Math.max(...safe);
  const range = maximum - minimum || 1;
  const points = safe.map((value, index) => `${(index / Math.max(1, safe.length - 1)) * 100},${80 - ((value - minimum) / range) * 55}`).join(" ");
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-9 w-full"><polyline points={points} fill="none" stroke={palette.solid} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function KpiCard({ kpi }: { kpi: KPI }) {
  const palette = tone(kpi.tone);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-semibold text-slate-500">{kpi.label}</p><div className="mt-1.5 flex items-end gap-2"><strong className="text-[24px] tracking-tight text-slate-900 dark:text-white">{kpi.value}</strong><span className="mb-1 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: palette.soft, color: palette.text }}>{kpi.delta}</span></div></div><TrendingUp className="h-4 w-4" style={{ color: palette.solid }} /></div><div className="mt-2"><Spark values={kpi.spark} t={kpi.tone} /></div><p className="mt-1 text-[10px] text-slate-400">{kpi.hint}</p></article>;
}

function Gauge({ score, accent }: { score: number; accent: string }) {
  const safe = Math.max(0, Math.min(100, score));
  return <div className="relative h-28 w-28 rounded-full" style={{ background: `conic-gradient(${accent} 0 ${safe}%,#e8eef8 ${safe}% 100%)` }}><div className="absolute inset-[11px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900"><strong className="text-3xl text-slate-900 dark:text-white">{safe}</strong><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">uyum</span></div></div>;
}

function Spotlight({ board }: { board: Board }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{board.spotlight.label}</p><div className="mt-3 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{initials(board.spotlight.name)}</span><div><h4 className="text-sm font-semibold">{board.spotlight.name}</h4><p className="text-[10px] text-slate-500">{board.spotlight.role}</p></div></div><div className="mt-4 grid items-center gap-4 sm:grid-cols-[116px_1fr]"><Gauge score={board.spotlight.score} accent={board.accent} /><div className="space-y-2">{board.spotlight.bullets.map((bullet) => <div key={bullet} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300"><span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ background: board.accent }} /><span>{bullet}</span></div>)}</div></div></article>;
}

function Bars({ items }: { items: ChartItem[] }) {
  const maximum = Math.max(1, ...items.map((item) => item.value));
  return <div className="space-y-3">{items.map((item) => { const palette = tone(item.tone || "blue"); return <div key={item.label} className="grid grid-cols-[88px_1fr_28px] items-center gap-3"><span className="truncate text-[10px] text-slate-500">{item.label}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: `${Math.max(8, (item.value / maximum) * 100)}%`, background: `linear-gradient(90deg,${palette.solid},${palette.solid}99)` }} /></div><strong className="text-right text-[10px] tabular-nums text-slate-700 dark:text-slate-200">{item.value}</strong></div>; })}</div>;
}

function Matrix({ items }: { items: ChartItem[] }) {
  return <div className="grid grid-cols-3 gap-2">{items.map((item) => { const palette = tone(item.tone || "blue"); return <div key={item.label} className="rounded-xl border p-3" style={{ background: palette.soft, borderColor: `${palette.solid}33` }}><p className="text-[9px] font-bold leading-3" style={{ color: palette.text }}>{item.label}</p><strong className="mt-2 block text-xl" style={{ color: palette.text }}>{item.value}</strong></div>; })}</div>;
}

function Trend({ items, suffix }: { items: ChartItem[]; suffix?: string }) {
  const safe = items.length ? items : [{ label: "—", value: 0 }, { label: "—", value: 0 }, { label: "—", value: 0 }, { label: "—", value: 0 }, { label: "—", value: 0 }, { label: "—", value: 0 }];
  const minimum = Math.min(...safe.map((item) => item.value));
  const maximum = Math.max(...safe.map((item) => item.value));
  const range = maximum - minimum || 1;
  const points = safe.map((item, index) => `${(index / Math.max(1, safe.length - 1)) * 100},${85 - ((item.value - minimum) / range) * 55}`).join(" ");
  return <><div className="h-36 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><polygon points={`0,100 ${points} 100,100`} fill="rgba(79,125,243,.10)" /><polyline points={points} fill="none" stroke="#4f7df3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div className="mt-2 grid grid-cols-6 gap-1 text-center">{safe.slice(0, 6).map((item, index) => <div key={`${item.label}-${index}`}><p className="text-[9px] text-slate-400">{item.label}</p><p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">{item.value}{suffix ? ` ${suffix}` : ""}</p></div>)}</div></>;
}

export default function VisualModuleBoard({ pathname }: { pathname: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ org: [], history: [], candidates: [], assessments: [], trainings: [] });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const next = await readSnapshot(pathname);
      if (active) setSnapshot(next);
    };
    void load();
    const events = ["dataUpdated", "candidatesUpdated", "talentMatrixUpdated", "storageCleared", "userChanged"];
    const refresh = () => { void load(); };
    events.forEach((event) => window.addEventListener(event, refresh));
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      events.forEach((event) => window.removeEventListener(event, refresh));
      window.removeEventListener("storage", refresh);
    };
  }, [pathname]);

  const board = useMemo(() => build(pathname, snapshot), [pathname, snapshot]);
  const Icon = pathname.startsWith("/ise-alim") ? UserPlus : pathname.startsWith("/egitim") ? GraduationCap : pathname.startsWith("/kariyer") ? Target : Grid3X3;

  return <section className="mb-5 rounded-[26px] border border-slate-200 bg-[#fbfcff] p-4 shadow-[0_14px_40px_rgba(15,23,42,.05)] dark:border-slate-800 dark:bg-slate-950/40"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: board.accent }}><Icon className="h-4 w-4" /></span><div><p className="text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: board.accent }}>{board.eyebrow}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{board.title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{board.subtitle}</p></div></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700"><Sparkles className="h-3 w-3" /> Grafik öncelikli görünüm</span></div><div className="grid gap-3 lg:grid-cols-4">{board.kpis.map((kpi) => <KpiCard key={kpi.label} kpi={kpi} />)}</div><div className="mt-3 grid gap-3 xl:grid-cols-3"><Spotlight board={board} /><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{board.middle.title}</p><h3 className="mt-1 text-sm font-semibold">{board.middle.subtitle}</h3></div><Activity className="h-4 w-4" style={{ color: board.accent }} /></div>{board.middle.kind === "matrix" ? <Matrix items={board.middle.items} /> : <Bars items={board.middle.items} />}</article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{board.trend.title}</p><h3 className="mt-1 text-sm font-semibold">{board.trend.subtitle}</h3></div><BriefcaseBusiness className="h-4 w-4 text-slate-400" /></div><Trend items={board.trend.points} suffix={board.trend.suffix} /></article></div></section>;
}
