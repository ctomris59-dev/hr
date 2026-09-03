"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  DollarSign,
  GraduationCap,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { EMPLOYEE_SAAS_MODE, fetchSaasEmployees } from "../lib/hr/employeeClient";
import { fetchSaasCompensationWorkspace, SAAS_DATA_MODE } from "../lib/hr/saasWorkforceClient";

type Snapshot = {
  org: any[];
  candidates: any[];
  trainings: any[];
  benchmarks: any[];
  cycles: any[];
};

type Tone = "blue" | "violet" | "emerald" | "amber" | "rose" | "teal";
type KPI = { label: string; value: string; delta: string; hint: string; spark: number[]; tone: Tone };
type ChartItem = { label: string; value: number; tone?: Tone };
type TrendSeries = { label: string; color: string; values: number[] };
type QuickRow = { label: string; value: string; meta: string; tone?: Tone };
type Board = {
  title: string;
  subtitle: string;
  eyebrow: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
  kpis: KPI[];
  spotlight: { label: string; name: string; role: string; score: number; bullets: string[] };
  middle: { title: string; subtitle: string; items: ChartItem[] };
  trend: { title: string; subtitle: string; labels: string[]; series: TrendSeries[] };
  quick: { title: string; subtitle: string; rows: QuickRow[] };
};

const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const txt = (value: unknown) => String(value ?? "").trim();
const num = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const pct = (value: number) => `%${Math.max(0, Math.min(100, Math.round(value)))}`;
const money = (value: number) => `${Math.round(value).toLocaleString("tr-TR")} ₺`;
const deptOf = (row: any) => txt(row?.Departman ?? row?.department ?? "Genel");
const roleOf = (row: any) => txt(row?.Pozisyon ?? row?.position ?? row?.role ?? "Rol belirtilmedi");
const nameOf = (row: any) => txt(row?.["Ad Soyad"] ?? row?.employee ?? row?.name ?? row?.subjectName);
const statusOf = (row: any) => txt(row?.status ?? row?.Status ?? row?.durum ?? row?.Durum);
const salaryOf = (row: any) => num(row?.["Maaş (TL)"] ?? row?.salary ?? row?.Salary ?? row?.current_salary);
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
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("tr-TR") || "").join("") || "FH";
}

function tone(toneName: Tone) {
  return {
    blue: { solid: "#3974f6", soft: "#eef4ff", text: "#2554ca" },
    violet: { solid: "#8255ef", soft: "#f4f0ff", text: "#6739ca" },
    emerald: { solid: "#18a97d", soft: "#ebfbf5", text: "#087a59" },
    amber: { solid: "#f2a000", soft: "#fff7e2", text: "#b36d00" },
    rose: { solid: "#ed516d", soft: "#fff0f3", text: "#bf2946" },
    teal: { solid: "#17aaa5", soft: "#eafaf9", text: "#087c78" },
  }[toneName];
}

function monthBuckets() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("tr-TR", { month: "short" }).replace(".", ""),
      date,
    };
  });
}

function monthlySeries(items: any[], getDate: (item: any) => string | undefined, filter?: (item: any) => boolean) {
  const buckets = monthBuckets();
  const values = buckets.map(() => 0);
  items.forEach((item) => {
    if (filter && !filter(item)) return;
    const raw = getDate(item);
    if (!raw) return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const index = buckets.findIndex((bucket) => bucket.key === key);
    if (index >= 0) values[index] += 1;
  });
  return { labels: buckets.map((bucket) => bucket.label), values };
}

function tenureYears(row: any) {
  const direct = num(row?.["Kıdem (Yıl)"] ?? row?.Calisma_Yili ?? row?.tenure);
  if (direct > 0) return direct;
  const raw = row?.["İşe Giriş Tarihi"] ?? row?.hireDate ?? row?.hire_date;
  if (!raw) return 0;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : Math.max(0, (Date.now() - date.getTime()) / (365.25 * 86400000));
}

function readLocalSnapshot(): Snapshot {
  return {
    org: arr(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, [])),
    candidates: arr(getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, [])),
    trainings: arr(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, [])),
    benchmarks: arr(getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS, [])),
    cycles: arr(getStorageData<any[]>(STORAGE_KEYS.COMPENSATION_CYCLES, [])),
  };
}

async function readSnapshot(pathname: string): Promise<Snapshot> {
  const local = readLocalSnapshot();
  if (pathname.startsWith("/organizasyon") && EMPLOYEE_SAAS_MODE) {
    try { return { ...local, org: await fetchSaasEmployees() }; }
    catch (error) { console.warn("CoreAnalyticsBoard organization SaaS fallback", error); }
  }
  if (pathname.startsWith("/maas") && SAAS_DATA_MODE) {
    try {
      const workspace = await fetchSaasCompensationWorkspace();
      return { ...local, org: workspace.employees, benchmarks: workspace.benchmarks, cycles: workspace.cycles };
    } catch (error) { console.warn("CoreAnalyticsBoard compensation SaaS fallback", error); }
  }
  return local;
}

function buildOrganization(snapshot: Snapshot): Board {
  const people = snapshot.org;
  const departments = group(people, deptOf);
  const managers = group(people.filter((row) => txt(row?.["Yönetici 1"])), (row) => txt(row?.["Yönetici 1"]));
  const avgTenure = avg(people.map(tenureYears));
  const hires = monthlySeries(people, (row) => row?.["İşe Giriş Tarihi"] ?? row?.hireDate ?? row?.hire_date);
  const buckets = monthBuckets();
  const headcount = buckets.map((bucket) => {
    const end = new Date(bucket.date.getFullYear(), bucket.date.getMonth() + 1, 0, 23, 59, 59).getTime();
    return people.filter((row) => {
      const raw = row?.["İşe Giriş Tarihi"] ?? row?.hireDate ?? row?.hire_date;
      if (!raw) return true;
      const date = new Date(raw).getTime();
      return Number.isNaN(date) || date <= end;
    }).length;
  });
  const largest = departments[0];
  return {
    title: "Organizasyon Analitiği",
    subtitle: "Çalışan yapısını, departman yoğunluğunu ve yönetici span'lerini tabloya girmeden görün.",
    eyebrow: "PEOPLE & ORGANIZATION",
    accent: "#3974f6",
    icon: Building2,
    kpis: [
      { label: "Toplam Çalışan", value: String(people.length), delta: `${departments.length} departman`, hint: "Aktif organizasyon", spark: headcount, tone: "blue" },
      { label: "Yönetici Sayısı", value: String(managers.length), delta: people.length ? pct((managers.length / people.length) * 100) : "%0", hint: "Yönetici / çalışan", spark: managers.slice(0, 6).map((item) => item[1]), tone: "violet" },
      { label: "Ort. Kıdem", value: avgTenure ? `${avgTenure.toFixed(1)} yıl` : "—", delta: `${hires.values.reduce((sum, value) => sum + value, 0)} yeni`, hint: "Son 6 ay işe giriş", spark: hires.values, tone: "emerald" },
      { label: "En Büyük Birim", value: largest?.[0] || "—", delta: largest ? pct((largest[1] / Math.max(1, people.length)) * 100) : "%0", hint: largest ? `${largest[1]} çalışan` : "Veri yok", spark: departments.slice(0, 6).map((item) => item[1]), tone: "amber" },
    ],
    spotlight: {
      label: "Organizasyon Odağı",
      name: largest?.[0] || "Organizasyon",
      role: largest ? `${largest[1]} çalışan · ${pct((largest[1] / Math.max(1, people.length)) * 100)} pay` : "Çalışan verisi bekleniyor",
      score: largest ? Math.round((largest[1] / Math.max(1, people.length)) * 100) : 0,
      bullets: [`${departments.length} aktif departman`, `${managers.length} yönetici ilişkisi`, avgTenure ? `${avgTenure.toFixed(1)} yıl ortalama kıdem` : "Kıdem verisi sınırlı"],
    },
    middle: { title: "Departman Dağılımı", subtitle: "Çalışan yoğunluğu", items: departments.slice(0, 6).map(([label, value], index) => ({ label, value, tone: ["blue", "violet", "emerald", "amber", "teal", "rose"][index] as Tone })) },
    trend: { title: "Organizasyon Trendi", subtitle: "Headcount ve son 6 ay işe giriş hareketi", labels: hires.labels, series: [{ label: "Headcount", color: "#3974f6", values: headcount }, { label: "Yeni işe giriş", color: "#18a97d", values: hires.values }] },
    quick: { title: "Yönetici Span'leri", subtitle: "En büyük ekipler", rows: managers.slice(0, 5).map(([label, value]) => ({ label, value: `${value} kişi`, meta: value >= 8 ? "yüksek span" : value >= 5 ? "orta span" : "dengeli", tone: value >= 8 ? "amber" : "blue" })) },
  };
}

function buildRecruitment(snapshot: Snapshot): Board {
  const candidates = snapshot.candidates.filter((item) => txt(item?.type) !== "Mevcut Çalışan");
  const total = candidates.length;
  const tested = candidates.filter((item) => item?.raw_scores && Object.keys(item.raw_scores || {}).length > 0).length;
  const interview = candidates.filter((item) => /mülakat|interview/i.test(statusOf(item))).length;
  const offer = candidates.filter((item) => /teklif|offer/i.test(statusOf(item))).length;
  const hired = candidates.filter((item) => /işe al|hired|kabul/i.test(statusOf(item))).length;
  const evidence = candidates.reduce((sum, item) => sum + (item?.structuredInterviewCompleted ? 1 : 0) + (item?.workSampleAvailable ? 1 : 0) + (item?.recruiterNote ? 1 : 0) + (item?.raw_scores ? 1 : 0), 0);
  const quality = avg(candidates.map((item) => avg(Object.values(item?.raw_scores || {}).map(num))));
  const base = monthlySeries(candidates, (item) => item?.createdAt || item?.date);
  const testedSeries = monthlySeries(candidates, (item) => item?.createdAt || item?.date, (item) => Boolean(item?.raw_scores && Object.keys(item.raw_scores || {}).length));
  const hiredSeries = monthlySeries(candidates, (item) => item?.createdAt || item?.date, (item) => /işe al|hired|kabul/i.test(statusOf(item)));
  const best = [...candidates].sort((a, b) => avg(Object.values(b?.raw_scores || {}).map(num)) - avg(Object.values(a?.raw_scores || {}).map(num)))[0];
  const roleGroups = group(candidates, roleOf).slice(0, 5);
  return {
    title: "İşe Alım Analitiği",
    subtitle: "Aday havuzunu, dönüşümü, rol kalitesini ve kanıt kapsamını tek dashboard'da yönetin.",
    eyebrow: "RECRUITMENT ANALYTICS",
    accent: "#8255ef",
    icon: UserPlus,
    kpis: [
      { label: "Aday Kalitesi", value: quality ? `${quality.toFixed(1)} / 5` : "—", delta: total ? `${tested}/${total}` : "0/0", hint: "Test kapsaması", spark: base.values, tone: "violet" },
      { label: "Mülakat Oranı", value: pct(total ? (interview / total) * 100 : 0), delta: `${interview} aday`, hint: "Başvuru → mülakat", spark: testedSeries.values, tone: "blue" },
      { label: "Teklif Oranı", value: pct(total ? (offer / total) * 100 : 0), delta: `${offer} teklif`, hint: "Aday havuzu", spark: [total, tested, interview, offer, offer, hired], tone: "amber" },
      { label: "İşe Alım Oranı", value: pct(total ? (hired / total) * 100 : 0), delta: `${hired} işe alım`, hint: "Başvuru → işe alım", spark: hiredSeries.values, tone: "emerald" },
    ],
    spotlight: { label: "Rol Uygunluk Önerisi", name: nameOf(best) || "Ece Kaya", role: roleOf(best) || "İşe Alım Uzmanı", score: Math.round(((quality || 4.2) / 5) * 100), bullets: [`${tested} aday test verisiyle değerlendirildi`, `${Math.round(total ? (evidence / Math.max(1, total * 4)) * 100 : 0)}% kanıt kapsamı`, "Mülakat + test + iş örneği birlikte yorumlanır"] },
    middle: { title: "Pipeline Dağılımı", subtitle: "Başvurudan işe alıma dönüşüm", items: [{ label: "Başvuru", value: total, tone: "violet" }, { label: "Test", value: tested, tone: "blue" }, { label: "Mülakat", value: interview, tone: "teal" }, { label: "Teklif", value: offer, tone: "amber" }, { label: "İşe Alım", value: hired, tone: "emerald" }] },
    trend: { title: "Aday Trendi", subtitle: "Son 6 ay başvuru, test ve işe alım hareketi", labels: base.labels, series: [{ label: "Başvuru", color: "#8255ef", values: base.values }, { label: "Test", color: "#3974f6", values: testedSeries.values }, { label: "İşe alım", color: "#18a97d", values: hiredSeries.values }] },
    quick: { title: "Rol Talebi", subtitle: "Aday havuzunun yoğunlaştığı roller", rows: roleGroups.map(([label, value], index) => ({ label, value: `${value} aday`, meta: index === 0 ? "en yoğun rol" : "aktif havuz", tone: index === 0 ? "violet" : "blue" })) },
  };
}

function buildLearning(snapshot: Snapshot): Board {
  const trainings = snapshot.trainings;
  const total = trainings.length;
  const done = trainings.filter((item) => /tamam/i.test(statusOf(item))).length;
  const verified = trainings.filter((item) => item?.managerVerified).length;
  const evidenceSubmitted = trainings.filter((item) => txt(item?.transferEvidence)).length;
  const overdue = trainings.filter((item) => item?.dueDate && new Date(item.dueDate) < new Date() && !/tamam/i.test(statusOf(item))).length;
  const assignedSeries = monthlySeries(trainings, (item) => item?.assignedAt);
  const completedSeries = monthlySeries(trainings, (item) => item?.completedAt, (item) => Boolean(item?.completedAt));
  const verifiedSeries = monthlySeries(trainings, (item) => item?.verifiedAt, (item) => Boolean(item?.managerVerified));
  const byCompetency = group(trainings, (item) => txt(item?.competencyCode ?? item?.trainingName ?? "Diğer")).slice(0, 6);
  const star = [...trainings].sort((a, b) => Number(Boolean(b?.managerVerified)) - Number(Boolean(a?.managerVerified)))[0];
  const byEmployee = group(trainings, (item) => txt(item?.employee)).slice(0, 5);
  return {
    title: "Eğitim & Gelişim Analitiği",
    subtitle: "Atamayı değil; tamamlama, işe transfer kanıtı ve doğrulanmış etkiyi izleyin.",
    eyebrow: "LEARNING ANALYTICS",
    accent: "#17aaa5",
    icon: GraduationCap,
    kpis: [
      { label: "Tamamlama Oranı", value: pct(total ? (done / total) * 100 : 0), delta: `${done}/${total || 0}`, hint: "Toplam atama", spark: completedSeries.values, tone: "teal" },
      { label: "Aktif Gelişim", value: String(Math.max(0, total - done)), delta: `${total} toplam`, hint: "Devam eden", spark: assignedSeries.values, tone: "blue" },
      { label: "Transfer Kanıtı", value: pct(done ? (evidenceSubmitted / done) * 100 : 0), delta: `${evidenceSubmitted} kanıt`, hint: "İşe transfer", spark: [0, 0, evidenceSubmitted, evidenceSubmitted, done, evidenceSubmitted], tone: "violet" },
      { label: "Doğrulama Oranı", value: pct(done ? (verified / done) * 100 : 0), delta: overdue ? `${overdue} geciken` : "zamanında", hint: "Yönetici doğrulaması", spark: verifiedSeries.values, tone: overdue ? "amber" : "emerald" },
    ],
    spotlight: { label: "Öğrenme Etkisi", name: txt(star?.employee) || "Gelişim havuzu", role: txt(star?.trainingName) || "Yetkinlik müdahalesi", score: Math.round(done ? (verified / Math.max(1, done)) * 100 : 0), bullets: [`${done} eğitim tamamlandı`, `${evidenceSubmitted} işe transfer kanıtı`, `${verified} yönetici doğrulaması`] },
    middle: { title: "Yetkinlik Dağılımı", subtitle: "En yoğun gelişim alanları", items: byCompetency.map(([label, value], index) => ({ label, value, tone: ["teal", "blue", "violet", "emerald", "amber", "rose"][index] as Tone })) },
    trend: { title: "Öğrenme Trendi", subtitle: "Atama → tamamlama → doğrulama hareketi", labels: assignedSeries.labels, series: [{ label: "Atama", color: "#3974f6", values: assignedSeries.values }, { label: "Tamamlama", color: "#8255ef", values: completedSeries.values }, { label: "Doğrulama", color: "#18a97d", values: verifiedSeries.values }] },
    quick: { title: "Gelişim Yoğunluğu", subtitle: "En fazla gelişim ataması alan çalışanlar", rows: byEmployee.map(([label, value], index) => ({ label, value: `${value} atama`, meta: index === 0 ? "yüksek yoğunluk" : "aktif plan", tone: index === 0 ? "amber" : "teal" })) },
  };
}

function buildSalary(snapshot: Snapshot): Board {
  const people = snapshot.org.filter((row) => salaryOf(row) > 0);
  const currentPayroll = people.reduce((sum, row) => sum + salaryOf(row), 0);
  const avgSalary = avg(people.map(salaryOf));
  const activeCycle = snapshot.cycles.find((cycle) => txt(cycle?.stage) !== "EFFECTIVE") || snapshot.cycles[0];
  const results = arr<any>(activeCycle?.results);
  const simulatedPayroll = results.length ? results.reduce((sum, row) => sum + num(row?.["Yeni Maaş"] ?? row?.new_salary), 0) : currentPayroll;
  const budgetImpact = currentPayroll ? ((simulatedPayroll - currentPayroll) / currentPayroll) * 100 : 0;
  const benchmarks = snapshot.benchmarks;
  const benchmarkKeys = new Set(benchmarks.map((row) => `${deptOf(row)}|${roleOf(row)}`));
  const benchmarkCoverage = people.length ? (people.filter((row) => benchmarkKeys.has(`${deptOf(row)}|${roleOf(row)}`)).length / people.length) * 100 : 0;
  const departmentGroups = group(people, deptOf).slice(0, 6);
  const departmentStats = departmentGroups.map(([department]) => {
    const rows = people.filter((row) => deptOf(row) === department);
    const current = avg(rows.map(salaryOf));
    const matching = benchmarks.filter((row) => deptOf(row) === department);
    const market = avg(matching.map((row) => num(row?.["Piyasa Ortalaması"] ?? row?.market_average)));
    return { department, current, market };
  });
  const cycleStage = txt(activeCycle?.stage) || "DRAFT";
  const biggestPayroll = [...departmentStats].sort((a, b) => b.current - a.current)[0];
  return {
    title: "Ücret & Bütçe Analitiği",
    subtitle: "Simülasyon motoruna girmeden önce ücret tabanını, benchmark kapsamını ve bütçe etkisini okuyun.",
    eyebrow: "COMPENSATION ANALYTICS",
    accent: "#18a97d",
    icon: DollarSign,
    kpis: [
      { label: "Aylık Ücret Bütçesi", value: money(currentPayroll), delta: `${people.length} çalışan`, hint: "Mevcut payroll", spark: departmentStats.map((item) => item.current), tone: "emerald" },
      { label: "Ort. Ücret", value: avgSalary ? money(avgSalary) : "—", delta: `${departmentGroups.length} birim`, hint: "Çalışan ortalaması", spark: departmentStats.map((item) => item.current), tone: "blue" },
      { label: "Benchmark Kapsamı", value: pct(benchmarkCoverage), delta: `${benchmarks.length} referans`, hint: "Rol / pozisyon eşleşmesi", spark: departmentStats.map((item) => item.market), tone: "violet" },
      { label: "Simülasyon Etkisi", value: results.length ? `${budgetImpact >= 0 ? "+" : ""}${budgetImpact.toFixed(1)}%` : "Taslak yok", delta: cycleStage, hint: results.length ? money(simulatedPayroll - currentPayroll) : "A/B/C/D simülasyonu", spark: results.slice(0, 6).map((row) => num(row?.["Zam Oranı (%)"] ?? row?.raise_rate)), tone: budgetImpact > 15 ? "amber" : "teal" },
    ],
    spotlight: { label: "Ücret Odağı", name: biggestPayroll?.department || "Ücret tabanı", role: biggestPayroll ? `Ort. ${money(biggestPayroll.current)}` : "Benchmark ve simülasyon bekleniyor", score: Math.round(Math.min(100, benchmarkCoverage)), bullets: [`${benchmarks.length} dış / iç benchmark referansı`, results.length ? `Aktif simülasyon bütçe etkisi ${budgetImpact.toFixed(1)}%` : "Henüz kayıtlı simülasyon sonucu yok", `Ücret döngüsü: ${cycleStage}`] },
    middle: { title: "Departman Ücretleri", subtitle: "Ortalama mevcut ücret", items: departmentStats.map((item, index) => ({ label: item.department, value: Math.round(item.current), tone: ["emerald", "blue", "violet", "amber", "teal", "rose"][index] as Tone })) },
    trend: { title: "Ücret / Piyasa Karşılaştırması", subtitle: "Departman bazında mevcut ortalama ve benchmark", labels: departmentStats.map((item) => item.department.length > 10 ? `${item.department.slice(0, 10)}…` : item.department), series: [{ label: "Mevcut ücret", color: "#18a97d", values: departmentStats.map((item) => item.current) }, { label: "Piyasa", color: "#8255ef", values: departmentStats.map((item) => item.market) }] },
    quick: { title: "Ücret Döngüsü", subtitle: "Simülasyon öncesi kontrol noktaları", rows: [{ label: "Aktif aşama", value: cycleStage, meta: activeCycle?.name || "Ücret dönemi", tone: "emerald" }, { label: "Simülasyon", value: results.length ? `${results.length} çalışan` : "Bekliyor", meta: results.length ? "sonuç kaydedildi" : "A/B/C/D senaryosu çalıştırın", tone: results.length ? "blue" : "amber" }, { label: "Benchmark", value: `${benchmarks.length} kayıt`, meta: `${pct(benchmarkCoverage)} kapsama`, tone: "violet" }, { label: "Bütçe etkisi", value: results.length ? `${budgetImpact.toFixed(1)}%` : "—", meta: results.length ? money(simulatedPayroll - currentPayroll) : "simülasyon bekliyor", tone: budgetImpact > 15 ? "amber" : "teal" }] },
  };
}

function buildBoard(pathname: string, snapshot: Snapshot): Board | null {
  if (pathname.startsWith("/organizasyon")) return buildOrganization(snapshot);
  if (pathname.startsWith("/ise-alim")) return buildRecruitment(snapshot);
  if (pathname.startsWith("/egitim")) return buildLearning(snapshot);
  if (pathname.startsWith("/maas")) return buildSalary(snapshot);
  return null;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const safe = values.length >= 2 ? values : [0, ...(values.length ? values : [0]), 0];
  const min = Math.min(...safe); const max = Math.max(...safe); const range = max - min || 1;
  const points = safe.map((value, index) => `${(index / Math.max(1, safe.length - 1)) * 100},${82 - ((value - min) / range) * 58}`).join(" ");
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-full"><polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points}/></svg>;
}

function KpiCard({ kpi }: { kpi: KPI }) {
  const palette = tone(kpi.tone);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold text-slate-500">{kpi.label}</p><p className="mt-2 text-[22px] font-semibold tracking-[-.04em] text-slate-950 dark:text-white">{kpi.value}</p></div><span className="rounded-full px-2 py-1 text-[9px] font-bold" style={{ background: palette.soft, color: "#334155" }}>{kpi.delta}</span></div><div className="mt-2"><Sparkline values={kpi.spark} color={palette.solid}/></div><p className="mt-1 text-[9px] text-slate-400">{kpi.hint}</p></article>;
}

function LineChart({ trend }: { trend: Board["trend"] }) {
  const all = trend.series.flatMap((series) => series.values).filter(Number.isFinite);
  const max = Math.max(1, ...all); const min = Math.min(0, ...all); const range = max - min || 1;
  const points = (values: number[]) => values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${88 - ((value - min) / range) * 68}`).join(" ");
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{trend.title}</p><h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{trend.subtitle}</h3></div><div className="flex flex-wrap gap-2">{trend.series.map((series)=><span key={series.label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><span className="h-2 w-2 rounded-full" style={{background:series.color}}/>{series.label}</span>)}</div></div><div className="mt-4 rounded-2xl bg-[#fbfcff] p-3 dark:bg-slate-950/60"><div className="relative h-[220px]"><div className="absolute inset-0 grid grid-rows-4">{[0,1,2,3].map((item)=><div key={item} className="border-b border-dashed border-slate-100 last:border-0 dark:border-slate-800"/>)}</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full">{trend.series.map((series)=><polyline key={series.label} fill="none" stroke={series.color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" points={points(series.values)}/>)}{trend.series.flatMap((series)=>series.values.map((value,index)=>{const x=(index/Math.max(1,series.values.length-1))*100;const y=88-((value-min)/range)*68;return <circle key={`${series.label}-${index}`} cx={x} cy={y} r="1.7" fill={series.color}/>;}))}</svg></div><div className="mt-2 grid gap-2 text-center" style={{gridTemplateColumns:`repeat(${Math.max(1,trend.labels.length)},minmax(0,1fr))`}}>{trend.labels.map((label)=><span key={label} className="truncate text-[9px] text-slate-400">{label}</span>)}</div></div></article>;
}

function Bars({ items }: { items: ChartItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return <div className="space-y-3">{items.map((item) => { const palette=tone(item.tone || "blue"); return <div key={item.label} className="grid grid-cols-[92px_1fr_auto] items-center gap-3"><span className="truncate text-[10px] font-medium text-slate-500">{item.label}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{width:`${Math.max(5,(item.value/max)*100)}%`,background:`linear-gradient(90deg,${palette.solid},${palette.solid}aa)`}}/></div><span className="min-w-[40px] text-right text-[10px] font-semibold text-slate-700 dark:text-slate-200">{item.value.toLocaleString("tr-TR")}</span></div>;})}</div>;
}

function Spotlight({ board }: { board: Board }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{board.spotlight.label}</p><div className="mt-4 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{initials(board.spotlight.name)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{board.spotlight.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{board.spotlight.role}</p></div></div><div className="mt-5 flex items-center gap-4"><div className="relative h-24 w-24 shrink-0 rounded-full" style={{background:`conic-gradient(${board.accent} 0 ${Math.max(0,Math.min(100,board.spotlight.score))}%,#e8edf5 ${Math.max(0,Math.min(100,board.spotlight.score))}% 100%)`}}><div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900"><strong className="text-xl font-semibold">{board.spotlight.score}</strong><span className="text-[8px] text-slate-400">/100</span></div></div><div className="space-y-2">{board.spotlight.bullets.map((bullet)=><p key={bullet} className="flex items-start gap-2 text-[10px] leading-4 text-slate-600 dark:text-slate-300"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{background:board.accent}}/>{bullet}</p>)}</div></div></article>;
}

function QuickRows({ quick }: { quick: Board["quick"] }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{quick.title}</p><h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{quick.subtitle}</h3><div className="mt-4 space-y-2">{quick.rows.length ? quick.rows.map((row)=>{const palette=tone(row.tone || "blue");return <div key={`${row.label}-${row.value}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">{row.label}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{row.meta}</p></div><span className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{background:palette.soft,color: "#334155"}}>{row.value}</span></div>;}) : <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[10px] text-slate-400">Veri oluştukça burada içgörüler görünür.</p>}</div></article>;
}

export default function CoreAnalyticsBoard({ pathname }: { pathname: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => readLocalSnapshot());
  useEffect(() => {
    let active = true;
    const load = async () => { const next = await readSnapshot(pathname); if (active) setSnapshot(next); };
    void load();
    const refresh = () => void load();
    ["dataUpdated", "storageCleared", "candidatesUpdated", "userChanged"].forEach((event) => window.addEventListener(event, refresh));
    window.addEventListener("storage", refresh);
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; ["dataUpdated", "storageCleared", "candidatesUpdated", "userChanged"].forEach((event) => window.removeEventListener(event, refresh)); window.removeEventListener("storage", refresh); window.clearInterval(timer); };
  }, [pathname]);
  const board = useMemo(() => buildBoard(pathname, snapshot), [pathname, snapshot]);
  if (!board) return null;
  const Icon = board.icon;
  return <section className="mb-5 overflow-hidden rounded-[26px] border border-slate-200 bg-[#f7f8fb] shadow-[0_16px_42px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-950/40"><div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{background:`linear-gradient(135deg,${board.accent},${board.accent}bb)`}}><Icon className="h-4 w-4"/></span><div><p className="text-[9px] font-bold uppercase tracking-[.14em]" style={{color:board.accent}}>{board.eyebrow}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{board.title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{board.subtitle}</p></div></div><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Activity className="h-3 w-3"/>Genel</span><span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[9px] font-semibold text-blue-700"><TrendingUp className="h-3 w-3"/>Trend</span><span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[9px] font-semibold text-violet-700"><BriefcaseBusiness className="h-3 w-3"/>Dağılım</span><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[9px] font-semibold text-emerald-700"><Sparkles className="h-3 w-3"/>Aksiyon</span></div></div></div><div className="p-4 sm:p-5"><div className="grid gap-3 lg:grid-cols-4">{board.kpis.map((kpi)=><KpiCard key={kpi.label} kpi={kpi}/>)}</div><div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_340px]"><div className="space-y-4"><LineChart trend={board.trend}/><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{board.middle.title}</p><h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{board.middle.subtitle}</h3></div><Activity className="h-4 w-4" style={{color:board.accent}}/></div><Bars items={board.middle.items}/></article></div><div className="space-y-4"><Spotlight board={board}/><QuickRows quick={board.quick}/></div></div></div></section>;
}
