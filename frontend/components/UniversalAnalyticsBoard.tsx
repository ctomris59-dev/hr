"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Crown,
  Heart,
  Plane,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { buildTalentDecisionSnapshot } from "../lib/hr/talentDecisionChain";
import { getCareerRole } from "../lib/hr/careerArchitecture";
import { rankSuccessors } from "../lib/hr/succession";

type Tone = "blue" | "violet" | "emerald" | "amber" | "rose" | "teal";
type KPI = { label: string; value: string; hint: string; tone: Tone; bars: number[] };
type BarItem = { label: string; value: number; tone: Tone; meta?: string };
type Board = {
  title: string;
  eyebrow: string;
  subtitle: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
  kpis: KPI[];
  bars: { title: string; subtitle: string; items: BarItem[] };
  quick: { title: string; rows: Array<{ label: string; value: string; meta: string; tone: Tone }> };
  gauge: { label: string; value: number; display: string; note: string };
};

type Snapshot = {
  org: any[];
  history: any[];
  leaves: any[];
  trainings: any[];
  development: any[];
  candidates: any[];
  assessments: any[];
  pulse: any[];
};

const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const txt = (value: unknown) => String(value ?? "").trim();
const num = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const avg = (values: number[]) => {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
};
const pct = (value: number) => `%${Math.max(0, Math.min(100, Math.round(value)))}`;
const deptOf = (row: any) => txt(row?.Departman ?? row?.department ?? "Genel");
const roleOf = (row: any) => txt(row?.Pozisyon ?? row?.position ?? row?.role ?? "Rol belirtilmedi");
const nameOf = (row: any) => txt(row?.["Ad Soyad"] ?? row?.employee ?? row?.name ?? row?.subjectName ?? row?.candidate_name);
const statusOf = (row: any) => txt(row?.status ?? row?.Status ?? row?.durum ?? row?.Durum).toLocaleLowerCase("tr-TR");

const palettes: Record<Tone, { solid: string; soft: string; text: string }> = {
  blue: { solid: "#3974f6", soft: "#eef4ff", text: "#2554ca" },
  violet: { solid: "#8255ef", soft: "#f4f0ff", text: "#6739ca" },
  emerald: { solid: "#18a97d", soft: "#ebfbf5", text: "#087a59" },
  amber: { solid: "#f2a000", soft: "#fff7e2", text: "#b36d00" },
  rose: { solid: "#ed516d", soft: "#fff0f3", text: "#bf2946" },
  teal: { solid: "#17aaa5", soft: "#eafaf9", text: "#087c78" },
};

function group(items: any[], getter: (item: any) => string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = getter(item) || "Belirsiz";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function readSnapshot(): Snapshot {
  return {
    org: arr(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, [])),
    history: arr(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, [])),
    leaves: arr(getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, [])),
    trainings: arr(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, [])),
    development: arr(getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, [])),
    candidates: arr(getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, [])),
    assessments: arr(getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS, [])),
    pulse: arr(getStorageData<any[]>(STORAGE_KEYS.PULSE_ANSWERS, [])),
  };
}

function buildPerformance(snapshot: Snapshot, calibration = false): Board {
  const rows = snapshot.org.map((person) => ({ person, decision: buildTalentDecisionSnapshot(person, snapshot.history) }));
  const scored = rows.filter((row) => row.decision.performance.score > 0);
  const evidence = rows.map((row) => Number(row.decision.evidence.score || 0));
  const perf = scored.map((row) => Number(row.decision.performance.score || 0));
  const avgPerf = avg(perf);
  const avgEvidence = avg(evidence);
  const byDept = new Map<string, number[]>();
  scored.forEach(({ person, decision }) => {
    const key = deptOf(person);
    const list = byDept.get(key) || [];
    list.push(Number(decision.performance.score || 0));
    byDept.set(key, list);
  });
  const deptRows = [...byDept.entries()].map(([label, values]) => ({ label, value: avg(values), count: values.length })).sort((a, b) => b.value - a.value);
  const lowEvidence = rows.filter((row) => row.decision.evidence.score < 60).length;
  const lowPerf = scored.filter((row) => row.decision.performance.score < 3.5).length;
  const strong = scored.filter((row) => row.decision.performance.score >= 4.2).length;
  const gapCount = snapshot.history.filter((row) => {
    const kpi = num(row?.kpi_score);
    const manager = num(row?.manager_performance_score);
    return kpi > 0 && manager > 0 && Math.abs(kpi - manager) >= 0.75;
  }).length;
  return {
    title: calibration ? "Kalibrasyon Analitiği" : "Performans Analitiği",
    eyebrow: calibration ? "CALIBRATION ANALYTICS" : "PERFORMANCE ANALYTICS",
    subtitle: calibration ? "Skor farklarını ve düşük kanıtlı kararları aynı görsel akışta izleyin." : "Performans, veri kapsamı ve evidence kalitesini tabloya girmeden okuyun.",
    accent: calibration ? "#8255ef" : "#5b5ce2",
    icon: calibration ? Scale : BarChart3,
    kpis: [
      { label: "Ort. Performans", value: avgPerf ? `${avgPerf.toFixed(2)} / 5` : "—", hint: `${scored.length}/${rows.length} kapsam`, tone: "violet", bars: perf.slice(0, 8) },
      { label: "Evidence Score", value: avgEvidence ? `${Math.round(avgEvidence)} / 100` : "—", hint: `${lowEvidence} düşük kanıt`, tone: "blue", bars: evidence.slice(0, 8) },
      { label: calibration ? "Kalibrasyon Farkı" : "Güçlü Performans", value: calibration ? String(gapCount) : String(strong), hint: calibration ? "≥ 0,75 puan fark" : "≥ 4,2 skor", tone: calibration && gapCount ? "amber" : "emerald", bars: [gapCount, lowEvidence, lowPerf, strong] },
      { label: "Gelişim Odağı", value: String(lowPerf), hint: "3,5 altı skor", tone: lowPerf ? "amber" : "emerald", bars: [lowPerf, strong, scored.length, lowEvidence] },
    ],
    bars: { title: "Departman Performansı", subtitle: "Ortalama skor", items: deptRows.slice(0, 6).map((item, index) => ({ label: item.label, value: Number(item.value.toFixed(2)), tone: ["blue", "violet", "teal", "emerald", "amber", "rose"][index] as Tone, meta: `${item.count} kişi` })) },
    quick: { title: calibration ? "Kalibrasyon Kuyruğu" : "Performans Öncelikleri", rows: [
      { label: "Düşük evidence", value: String(lowEvidence), meta: "Ek kanıt gerekli", tone: lowEvidence ? "amber" : "emerald" },
      { label: "3,5 altı performans", value: String(lowPerf), meta: "Gelişim görüşmesi", tone: lowPerf ? "rose" : "emerald" },
      { label: "4,2+ performans", value: String(strong), meta: "Güçlü performans", tone: "emerald" },
      { label: "Skor farkı", value: String(gapCount), meta: "Kalibrasyon eşiği", tone: gapCount ? "amber" : "emerald" },
    ] },
    gauge: { label: calibration ? "Karar Tutarlılığı" : "Performans Kapsamı", value: calibration ? Math.max(0, 100 - Math.min(100, gapCount * 12)) : rows.length ? (scored.length / rows.length) * 100 : 0, display: calibration ? pct(Math.max(0, 100 - Math.min(100, gapCount * 12))) : pct(rows.length ? (scored.length / rows.length) * 100 : 0), note: calibration ? "Düşük fark = yüksek tutarlılık" : "Değerlendirme verisi olan çalışan" },
  };
}

function buildExperience(snapshot: Snapshot): Board {
  const answers = snapshot.pulse;
  const scoreOf = (row: any) => num(row?.score ?? row?.value ?? row?.answer ?? row?.rating);
  const scores = answers.map(scoreOf).filter((value) => value > 0);
  const averageScore = avg(scores);
  const byDriver = group(answers, (row) => txt(row?.driver ?? row?.category ?? row?.question ?? "Pulse"));
  const byDept = group(answers, deptOf);
  const positive = scores.filter((value) => value >= 4 || value >= 8).length;
  return {
    title: "Çalışan Deneyimi Analitiği",
    eyebrow: "EMPLOYEE EXPERIENCE",
    subtitle: "Anonim pulse cevaplarını, sürücü yoğunluğunu ve katılım kapsamını sade bir dashboard'da okuyun.",
    accent: "#ed516d",
    icon: Heart,
    kpis: [
      { label: "Pulse Skoru", value: averageScore ? averageScore.toFixed(1) : "—", hint: `${scores.length} yanıt`, tone: "rose", bars: scores.slice(0, 8) },
      { label: "Katılım", value: String(answers.length), hint: `${byDept.length} birim`, tone: "violet", bars: byDept.slice(0, 8).map((item) => item[1]) },
      { label: "Pozitif Sinyal", value: pct(scores.length ? (positive / scores.length) * 100 : 0), hint: "Yüksek skor payı", tone: "emerald", bars: [positive, scores.length - positive, positive, scores.length] },
      { label: "Driver Sayısı", value: String(byDriver.length), hint: "İzlenen deneyim alanı", tone: "blue", bars: byDriver.slice(0, 8).map((item) => item[1]) },
    ],
    bars: { title: "Driver Yoğunluğu", subtitle: "En çok cevaplanan deneyim alanları", items: byDriver.slice(0, 6).map(([label, value], index) => ({ label, value, tone: ["rose", "violet", "blue", "teal", "emerald", "amber"][index] as Tone })) },
    quick: { title: "Katılım Dağılımı", rows: byDept.slice(0, 5).map(([label, value], index) => ({ label, value: `${value} yanıt`, meta: index === 0 ? "en yüksek katılım" : "aktif birim", tone: index === 0 ? "rose" : "blue" })) },
    gauge: { label: "Deneyim", value: averageScore > 5 ? averageScore * 10 : averageScore * 20, display: averageScore ? averageScore.toFixed(1) : "—", note: "Anonim pulse ortalaması" },
  };
}

function buildDevelopment(snapshot: Snapshot, analytics = false): Board {
  const plans = snapshot.development;
  const trainings = snapshot.trainings;
  const completedPlans = plans.filter((row) => /tamam|completed|done|closed/i.test(statusOf(row)) || num(row?.progress ?? row?.ilerleme) >= 100).length;
  const overdue = plans.filter((row) => {
    const raw = row?.dueDate ?? row?.deadline ?? row?.endDate;
    if (!raw) return false;
    const date = new Date(raw);
    return !Number.isNaN(date.getTime()) && date.getTime() < Date.now() && !/tamam|completed|done|closed/i.test(statusOf(row));
  }).length;
  const verified = trainings.filter((row) => row?.managerVerified).length;
  const evidence = trainings.filter((row) => txt(row?.transferEvidence)).length;
  const byAction = group(plans, (row) => txt(row?.actionType ?? row?.type ?? row?.category ?? row?.title ?? "Gelişim"));
  const byEmployee = group(plans, (row) => nameOf(row));
  const completionRate = plans.length ? (completedPlans / plans.length) * 100 : 0;
  return {
    title: analytics ? "Gelişim Etkinliği Analitiği" : "Gelişim Planı Analitiği",
    eyebrow: analytics ? "DEVELOPMENT IMPACT" : "DEVELOPMENT ANALYTICS",
    subtitle: analytics ? "Atama sayısından çok transfer kanıtı, doğrulama ve kapanan aksiyonlara odaklanın." : "Gelişim planlarını, ilerlemeyi ve geciken aksiyonları görsel olarak takip edin.",
    accent: "#17aaa5",
    icon: BookOpen,
    kpis: [
      { label: "Aktif Plan", value: String(Math.max(0, plans.length - completedPlans)), hint: `${plans.length} toplam plan`, tone: "teal", bars: byAction.slice(0, 8).map((item) => item[1]) },
      { label: "Tamamlama", value: pct(completionRate), hint: `${completedPlans} tamamlanan`, tone: "emerald", bars: [completedPlans, plans.length - completedPlans, completedPlans, plans.length] },
      { label: "Transfer Kanıtı", value: String(evidence), hint: `${trainings.length} eğitim ataması`, tone: "violet", bars: [evidence, verified, trainings.length, evidence] },
      { label: "Geciken", value: String(overdue), hint: "Hedef tarihi geçmiş", tone: overdue ? "amber" : "emerald", bars: [overdue, completedPlans, plans.length, overdue] },
    ],
    bars: { title: "Gelişim Aksiyonları", subtitle: "En sık kullanılan müdahale türleri", items: byAction.slice(0, 6).map(([label, value], index) => ({ label, value, tone: ["teal", "blue", "violet", "emerald", "amber", "rose"][index] as Tone })) },
    quick: { title: "Gelişim Yoğunluğu", rows: byEmployee.slice(0, 5).map(([label, value], index) => ({ label: label || "Çalışan", value: `${value} plan`, meta: index === 0 ? "yüksek yoğunluk" : "aktif gelişim", tone: index === 0 ? "amber" : "teal" })) },
    gauge: { label: analytics ? "Etki Kapsamı" : "Plan Tamamlama", value: analytics ? (trainings.length ? (verified / trainings.length) * 100 : 0) : completionRate, display: analytics ? pct(trainings.length ? (verified / trainings.length) * 100 : 0) : pct(completionRate), note: analytics ? "Yönetici doğrulaması" : "Tamamlanan gelişim planı" },
  };
}

function buildSuccession(snapshot: Snapshot): Board {
  const reportCounts = new Map<string, number>();
  snapshot.org.forEach((person) => {
    const manager = txt(person?.["Yönetici 1"]);
    if (manager) reportCounts.set(manager, (reportCounts.get(manager) || 0) + 1);
  });
  const critical = snapshot.org.filter((person) => getCareerRole(roleOf(person)).levelRank >= 4 || (reportCounts.get(nameOf(person)) || 0) >= 2);
  const assessments = critical.map((target) => ({ target, successors: rankSuccessors(target, snapshot.org, snapshot.history) }));
  const readyNow = assessments.filter((row) => row.successors.some((item) => item.assessment.readiness === "Şimdi")).length;
  const atRisk = Math.max(0, critical.length - readyNow);
  const candidateCount = assessments.reduce((sum, row) => sum + row.successors.length, 0);
  const byDept = group(critical, deptOf);
  return {
    title: "Halefiyet Analitiği",
    eyebrow: "SUCCESSION ANALYTICS",
    subtitle: "Kritik rol riskini, hazır aday oranını ve bench depth'i aynı karar görünümünde yönetin.",
    accent: "#ed516d",
    icon: Crown,
    kpis: [
      { label: "Kritik Rol", value: String(critical.length), hint: `${byDept.length} birim`, tone: "rose", bars: byDept.slice(0, 8).map((item) => item[1]) },
      { label: "Şimdi Hazır", value: String(readyNow), hint: "Hazır halefi olan rol", tone: "emerald", bars: [readyNow, atRisk, readyNow, critical.length] },
      { label: "Riskli Rol", value: String(atRisk), hint: "Hazır halefi yok", tone: atRisk ? "amber" : "emerald", bars: [atRisk, critical.length, readyNow, atRisk] },
      { label: "Aday Havuzu", value: String(candidateCount), hint: "Toplam halef adayı", tone: "violet", bars: assessments.slice(0, 8).map((row) => row.successors.length) },
    ],
    bars: { title: "Kritik Rol Dağılımı", subtitle: "Departman bazında", items: byDept.slice(0, 6).map(([label, value], index) => ({ label, value, tone: ["rose", "amber", "violet", "blue", "teal", "emerald"][index] as Tone })) },
    quick: { title: "En Kritik Roller", rows: assessments.slice(0, 5).map((row) => ({ label: nameOf(row.target) || roleOf(row.target), value: `${row.successors.length} aday`, meta: row.successors.some((item) => item.assessment.readiness === "Şimdi") ? "hazır halef var" : "hazır halef yok", tone: row.successors.some((item) => item.assessment.readiness === "Şimdi") ? "emerald" : "rose" })) },
    gauge: { label: "Halefiyet Hazırlığı", value: critical.length ? (readyNow / critical.length) * 100 : 0, display: pct(critical.length ? (readyNow / critical.length) * 100 : 0), note: "Kritik roller içinde hazır halef oranı" },
  };
}

function buildLeave(snapshot: Snapshot): Board {
  const leaves = snapshot.leaves;
  const approved = leaves.filter((row) => /onay|approved/i.test(statusOf(row))).length;
  const pending = leaves.filter((row) => /bek|pending|taslak/i.test(statusOf(row))).length;
  const rejected = leaves.filter((row) => /red|reject/i.test(statusOf(row))).length;
  const byType = group(leaves, (row) => txt(row?.tur ?? row?.type ?? row?.leaveType ?? "Diğer"));
  const byDept = group(leaves, deptOf);
  return {
    title: "İzin Analitiği",
    eyebrow: "LEAVE ANALYTICS",
    subtitle: "Talep hacmini, onay akışını ve izin türü dağılımını tek bakışta yönetin.",
    accent: "#3974f6",
    icon: Plane,
    kpis: [
      { label: "Toplam Talep", value: String(leaves.length), hint: `${byDept.length} birim`, tone: "blue", bars: byType.slice(0, 8).map((item) => item[1]) },
      { label: "Onaylanan", value: String(approved), hint: pct(leaves.length ? (approved / leaves.length) * 100 : 0), tone: "emerald", bars: [approved, pending, rejected, approved] },
      { label: "Bekleyen", value: String(pending), hint: "Onay aksiyonu", tone: pending ? "amber" : "emerald", bars: [pending, approved, pending, leaves.length] },
      { label: "Reddedilen", value: String(rejected), hint: "Karar sonucu", tone: rejected ? "rose" : "blue", bars: [rejected, approved, pending, rejected] },
    ],
    bars: { title: "İzin Türleri", subtitle: "Talep dağılımı", items: byType.slice(0, 6).map(([label, value], index) => ({ label, value, tone: ["blue", "teal", "violet", "emerald", "amber", "rose"][index] as Tone })) },
    quick: { title: "Birim Yoğunluğu", rows: byDept.slice(0, 5).map(([label, value], index) => ({ label, value: `${value} talep`, meta: index === 0 ? "en yoğun birim" : "aktif talep", tone: index === 0 ? "amber" : "blue" })) },
    gauge: { label: "Onay Oranı", value: leaves.length ? (approved / leaves.length) * 100 : 0, display: pct(leaves.length ? (approved / leaves.length) * 100 : 0), note: "Toplam talepler içinde onaylanan" },
  };
}

function buildRoleArchitecture(snapshot: Snapshot): Board {
  const roles = group(snapshot.org, roleOf);
  const depts = group(snapshot.org, deptOf);
  const mapped = snapshot.org.filter((row) => txt(row?.role_family ?? row?.jobFamily ?? row?.["Rol Ailesi"])).length;
  return {
    title: "Rol & Yetkinlik Analitiği",
    eyebrow: "ROLE ARCHITECTURE",
    subtitle: "Rol çeşitliliğini, departman yoğunluğunu ve mimari kapsamını görsel olarak izleyin.",
    accent: "#3974f6",
    icon: Target,
    kpis: [
      { label: "Rol Sayısı", value: String(roles.length), hint: `${snapshot.org.length} çalışan`, tone: "blue", bars: roles.slice(0, 8).map((item) => item[1]) },
      { label: "Departman", value: String(depts.length), hint: "Organizasyon kapsamı", tone: "teal", bars: depts.slice(0, 8).map((item) => item[1]) },
      { label: "Mimari Kapsamı", value: pct(snapshot.org.length ? (mapped / snapshot.org.length) * 100 : 0), hint: `${mapped} eşleşme`, tone: "emerald", bars: [mapped, snapshot.org.length - mapped, mapped, snapshot.org.length] },
      { label: "En Yoğun Rol", value: roles[0]?.[0] || "—", hint: roles[0] ? `${roles[0][1]} kişi` : "Veri yok", tone: "violet", bars: roles.slice(0, 8).map((item) => item[1]) },
    ],
    bars: { title: "Rol Dağılımı", subtitle: "En yaygın roller", items: roles.slice(0, 6).map(([label, value], index) => ({ label, value, tone: ["blue", "violet", "teal", "emerald", "amber", "rose"][index] as Tone })) },
    quick: { title: "Departman Dağılımı", rows: depts.slice(0, 5).map(([label, value], index) => ({ label, value: `${value} kişi`, meta: index === 0 ? "en büyük birim" : "aktif birim", tone: index === 0 ? "blue" : "teal" })) },
    gauge: { label: "Mimari Kapsamı", value: snapshot.org.length ? (mapped / snapshot.org.length) * 100 : 0, display: pct(snapshot.org.length ? (mapped / snapshot.org.length) * 100 : 0), note: "Rol ailesi / job family eşleşmesi" },
  };
}

function buildAssessment(snapshot: Snapshot): Board {
  const tests = snapshot.assessments.length ? snapshot.assessments : snapshot.candidates;
  const completed = tests.filter((row) => /tamam|completed|done/i.test(statusOf(row)) || row?.completedAt).length;
  const scores = tests.map((row) => avg(Object.values(row?.raw_scores || row?.scores || {}).map(num))).filter((value) => value > 0);
  const byRole = group(tests, roleOf);
  const avgScore = avg(scores);
  return {
    title: "Yetkinlik Testi Analitiği",
    eyebrow: "ASSESSMENT ANALYTICS",
    subtitle: "Test hacmini, tamamlama oranını ve rol bazlı değerlendirme yoğunluğunu takip edin.",
    accent: "#8255ef",
    icon: ShieldCheck,
    kpis: [
      { label: "Toplam Test", value: String(tests.length), hint: `${byRole.length} rol`, tone: "violet", bars: byRole.slice(0, 8).map((item) => item[1]) },
      { label: "Tamamlanan", value: String(completed), hint: pct(tests.length ? (completed / tests.length) * 100 : 0), tone: "emerald", bars: [completed, tests.length - completed, completed, tests.length] },
      { label: "Ort. Skor", value: avgScore ? `${avgScore.toFixed(1)} / 5` : "—", hint: `${scores.length} skorlu test`, tone: "blue", bars: scores.slice(0, 8) },
      { label: "Aktif Rol", value: String(byRole.length), hint: "Değerlendirilen rol", tone: "teal", bars: byRole.slice(0, 8).map((item) => item[1]) },
    ],
    bars: { title: "Rol Dağılımı", subtitle: "Test yoğunluğu", items: byRole.slice(0, 6).map(([label, value], index) => ({ label, value, tone: ["violet", "blue", "teal", "emerald", "amber", "rose"][index] as Tone })) },
    quick: { title: "Test Havuzu", rows: tests.slice(0, 5).map((row, index) => ({ label: nameOf(row) || `Test ${index + 1}`, value: statusOf(row) || "aktif", meta: roleOf(row), tone: /tamam|completed|done/i.test(statusOf(row)) ? "emerald" : "violet" })) },
    gauge: { label: "Tamamlama", value: tests.length ? (completed / tests.length) * 100 : 0, display: pct(tests.length ? (completed / tests.length) * 100 : 0), note: "Tamamlanan test oranı" },
  };
}

function buildTeam(snapshot: Snapshot): Board {
  const managers = group(snapshot.org.filter((row) => txt(row?.["Yönetici 1"])), (row) => txt(row?.["Yönetici 1"]));
  const depts = group(snapshot.org, deptOf);
  const maxSpan = managers[0]?.[1] || 0;
  const avgSpan = managers.length ? managers.reduce((sum, item) => sum + item[1], 0) / managers.length : 0;
  return {
    title: "Ekip Analitiği",
    eyebrow: "TEAM ANALYTICS",
    subtitle: "Yönetici span'lerini, ekip dağılımını ve organizasyon yükünü görsel olarak izleyin.",
    accent: "#3974f6",
    icon: Users,
    kpis: [
      { label: "Çalışan", value: String(snapshot.org.length), hint: `${depts.length} birim`, tone: "blue", bars: depts.slice(0, 8).map((item) => item[1]) },
      { label: "Yönetici", value: String(managers.length), hint: "Aktif ekip sahibi", tone: "violet", bars: managers.slice(0, 8).map((item) => item[1]) },
      { label: "Ort. Span", value: avgSpan ? avgSpan.toFixed(1) : "—", hint: "Kişi / yönetici", tone: "teal", bars: managers.slice(0, 8).map((item) => item[1]) },
      { label: "Maks. Span", value: String(maxSpan), hint: managers[0]?.[0] || "Veri yok", tone: maxSpan >= 8 ? "amber" : "emerald", bars: managers.slice(0, 8).map((item) => item[1]) },
    ],
    bars: { title: "Ekip Büyüklükleri", subtitle: "Yönetici bazında span", items: managers.slice(0, 6).map(([label, value], index) => ({ label, value, tone: value >= 8 ? "amber" : (["blue", "violet", "teal", "emerald", "rose", "blue"][index] as Tone) })) },
    quick: { title: "Departman Yapısı", rows: depts.slice(0, 5).map(([label, value], index) => ({ label, value: `${value} kişi`, meta: index === 0 ? "en büyük birim" : "aktif birim", tone: index === 0 ? "blue" : "teal" })) },
    gauge: { label: "Span Dengesi", value: maxSpan ? Math.max(0, 100 - Math.max(0, maxSpan - 6) * 12) : 0, display: maxSpan ? pct(Math.max(0, 100 - Math.max(0, maxSpan - 6) * 12)) : "—", note: "6 kişilik referans span'a göre" },
  };
}

function buildBoard(pathname: string, snapshot: Snapshot): Board | null {
  if (pathname.startsWith("/degerlendirme")) return buildPerformance(snapshot, false);
  if (pathname.startsWith("/kalibrasyon")) return buildPerformance(snapshot, true);
  if (pathname.startsWith("/calisan-deneyimi")) return buildExperience(snapshot);
  if (pathname.startsWith("/gelisim-analitigi")) return buildDevelopment(snapshot, true);
  if (pathname.startsWith("/gelisim")) return buildDevelopment(snapshot, false);
  if (pathname.startsWith("/yedekleme")) return buildSuccession(snapshot);
  if (pathname.startsWith("/izinler")) return buildLeave(snapshot);
  if (pathname.startsWith("/rol-mimarisi")) return buildRoleArchitecture(snapshot);
  if (pathname.startsWith("/aday-testi")) return buildAssessment(snapshot);
  if (pathname.startsWith("/ekip-yonetimi")) return buildTeam(snapshot);
  return null;
}

export default function UniversalAnalyticsBoard({ pathname }: { pathname: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ org: [], history: [], leaves: [], trainings: [], development: [], candidates: [], assessments: [], pulse: [] }));

  useEffect(() => {
    const load = () => setSnapshot(readSnapshot());
    load();
    const events = ["dataUpdated", "storageCleared", "userChanged", "pulseUpdated", "talentMatrixUpdated", "candidatesUpdated"];
    events.forEach((event) => window.addEventListener(event, load));
    window.addEventListener("storage", load);
    const timer = window.setInterval(load, 5000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, load));
      window.removeEventListener("storage", load);
      window.clearInterval(timer);
    };
  }, []);

  const board = useMemo(() => buildBoard(pathname, snapshot), [pathname, snapshot]);
  if (!board) return null;
  const Icon = board.icon;

  return (
    <section className="futurehr-analytics-board">
      <div className="futurehr-analytics-head">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: board.accent }}><Icon className="h-4 w-4" /></span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.13em]" style={{ color: board.accent }}>{board.eyebrow}</p>
            <h2 className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">{board.title}</h2>
            <p className="mt-0.5 text-[10.5px] text-slate-500">{board.subtitle}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[9.5px] font-semibold text-emerald-700"><Sparkles className="h-3 w-3" /> Grafik öncelikli</span>
      </div>

      <div className="futurehr-analytics-kpis">
        {board.kpis.map((kpi) => <KpiCard key={kpi.label} item={kpi} />)}
      </div>

      <div className="futurehr-analytics-grid">
        <div className="space-y-3">
          <article className="futurehr-analytics-panel">
            <div className="futurehr-analytics-panel-header">
              <div><p className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{board.bars.title}</p><h3 className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-white">{board.bars.subtitle}</h3></div>
              <Activity className="h-4 w-4" style={{ color: board.accent }} />
            </div>
            <div className="futurehr-analytics-panel-body"><Bars items={board.bars.items} /></div>
          </article>
          <article className="futurehr-analytics-panel p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">Karar görünümü</p><h3 className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-white">Hızlı yorumlama ölçeği</h3></div><BriefcaseBusiness className="h-4 w-4 text-slate-400" /></div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {board.kpis.map((item) => {
                const p = palettes[item.tone];
                return <div key={item.label} className="rounded-lg p-3" style={{ background: p.soft }}><p className="text-[9px] font-semibold" style={{ color: p.text }}>{item.label}</p><div className="mt-3 flex h-12 items-end gap-1">{item.bars.slice(-6).map((bar, index) => { const max = Math.max(1, ...item.bars.map(Number)); return <span key={index} className="flex-1 rounded-t-[3px]" style={{ height: `${Math.max(12, (Number(bar) / max) * 100)}%`, background: p.solid, opacity: .35 + index * .09 }} />; })}</div></div>;
              })}
            </div>
          </article>
        </div>

        <div className="space-y-3">
          <article className="futurehr-analytics-panel p-4">
            <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{board.gauge.label}</p><h3 className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-white">Ana sağlık göstergesi</h3></div><Target className="h-4 w-4 text-slate-400" /></div>
            <div className="mt-4 grid grid-cols-[118px_1fr] items-center gap-4"><Gauge value={board.gauge.value} display={board.gauge.display} color={board.accent} /><p className="text-[11px] leading-5 text-slate-500">{board.gauge.note}</p></div>
          </article>
          <article className="futurehr-analytics-panel p-4">
            <p className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">Hızlı içgörüler</p>
            <h3 className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-white">{board.quick.title}</h3>
            <div className="mt-3 space-y-2">
              {board.quick.rows.map((row) => { const p = palettes[row.tone]; return <div key={`${row.label}-${row.value}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40"><div className="min-w-0"><p className="truncate text-[10.5px] font-semibold text-slate-700 dark:text-slate-200">{row.label}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{row.meta}</p></div><span className="rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: p.soft, color: p.text }}>{row.value}</span></div>; })}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ item }: { item: KPI }) {
  const p = palettes[item.tone];
  const max = Math.max(1, ...item.bars.map(Number));
  return (
    <article className="rounded-[10px] border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[9.5px] font-semibold text-slate-500">{item.label}</p><p className="mt-1.5 text-[21px] font-semibold tracking-[-.04em] text-slate-900 dark:text-white">{item.value}</p></div><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.solid }} /></div>
      <div className="mt-3 flex h-7 items-end gap-1">{(item.bars.length ? item.bars : [1, 1, 1, 1, 1]).slice(-8).map((bar, index) => <span key={index} className="flex-1 rounded-t-[3px]" style={{ height: `${Math.max(14, (Number(bar) / max) * 100)}%`, background: p.solid, opacity: .26 + index * .08 }} />)}</div>
      <p className="mt-2 text-[9px] text-slate-400">{item.hint}</p>
    </article>
  );
}

function Bars({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (!items.length) return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-[10.5px] text-slate-400">Grafik oluşturmak için yeterli veri henüz yok.</div>;
  return <div className="space-y-3">{items.map((item) => { const p = palettes[item.tone]; return <div key={item.label} className="grid grid-cols-[120px_1fr_64px] items-center gap-3"><div className="min-w-0"><p className="truncate text-[10.5px] font-medium text-slate-600 dark:text-slate-300">{item.label}</p>{item.meta && <p className="text-[8.5px] text-slate-400">{item.meta}</p>}</div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: `${Math.max(5, (item.value / max) * 100)}%`, background: `linear-gradient(90deg,${p.solid},${p.solid}bb)` }} /></div><span className="text-right text-[10.5px] font-semibold text-slate-700 dark:text-slate-200">{Number.isInteger(item.value) ? item.value : item.value.toFixed(2)}</span></div>; })}</div>;
}

function Gauge({ value, display, color }: { value: number; display: string; color: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="relative h-[112px] w-[112px] rounded-full" style={{ background: `conic-gradient(${color} 0 ${safe}%,#e9edf2 ${safe}% 100%)` }}><div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900"><strong className="text-[20px] font-semibold text-slate-900 dark:text-white">{display}</strong><span className="mt-1 text-[8.5px] uppercase tracking-[.1em] text-slate-400">Skor</span></div></div>;
}
