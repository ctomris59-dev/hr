"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "../../../context/DataContext";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { filterDataByScope } from "../../utils/hierarchy";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Filter,
  Heart,
  LayoutDashboard,
  ShieldCheck,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import GlassCard from "../../../components/ui/GlassCard";
import CountUp from "../../../components/ui/CountUp";
import Skeleton from "@/components/ui/Skeleton";
import { toScore } from "../../../lib/score";
const PERFORMANCE_TARGET = 4.5;
const PULSE_TARGET = 7.0;

interface OrgChartEntry {
  id?: string | number;
  "Ad Soyad": string;
  Pozisyon: string;
  Departman: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  Performans?: number;
  Potansiyel?: number;
  [key: string]: any;
}

interface PulseTrend {
  week: string;
  average_score: number;
  count?: number;
}

const normalizeName = (value: string) =>
  String(value || "").trim().toLocaleLowerCase("tr-TR");

const formatPercent = (part: number, total: number) =>
  total > 0 ? `%${((part / total) * 100).toFixed(1).replace(".", ",")}` : "%0,0";

export default function DashboardPage() {
  const {
    orgData: contextOrgData,
    history360: contextHistory360,
    loading: dataLoading,
  } = useData();

  const [orgData, setOrgData] = useState<OrgChartEntry[]>(contextOrgData);
  const [history360, setHistory360] = useState<any[]>(contextHistory360);
  const [talentMatrixData, setTalentMatrixData] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userReady, setUserReady] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [pulseTrends, setPulseTrends] = useState<PulseTrend[]>([]);
  const [selectedPulseDepartment, setSelectedPulseDepartment] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setOrgData(contextOrgData);
    setHistory360(contextHistory360);
  }, [contextOrgData, contextHistory360]);

  useEffect(() => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setUser(currentUser);

    const role = currentUser?.role || "EMPLOYEE";
    const isDevelopment = process.env.NODE_ENV === "development";
    const admin = isDevelopment || role === "CEO" || role === "IK" || role === "admin";
    setIsAdmin(admin);

    if (!isDevelopment && (role === "EMPLOYEE" || role === "PERSONEL")) {
      window.location.href = "/izinler";
      return;
    }

    const dept = currentUser?.dept || currentUser?.department || "";
    if ((role === "DIRECTOR" || role === "MANAGER") && dept) {
      setSelectedPulseDepartment(dept);
    }

    setUserReady(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadTalentMatrix = async () => {
      try {
        const params = new URLSearchParams();
        const role = user?.role || "EMPLOYEE";
        const dept = user?.dept || user?.department || "";
        const name = user?.name || "";
        params.append("user_role", role);
        if (dept) params.append("user_dept", dept);
        if (name) params.append("user_name", name);
        params.append("_t", Date.now().toString());

        const response = await fetch(`/api/talent-matrix?${params.toString()}`);
        if (!response.ok) return;
        const result = await response.json();
        const data = Array.isArray(result) ? result : result.data || [];
        setTalentMatrixData(data);
        localStorage.setItem("hr_talent_matrix", JSON.stringify(data));
      } catch (error) {
        console.warn("Talent matrix load failed:", error);
        const cached = getStorageData<any[]>("hr_talent_matrix", []);
        setTalentMatrixData(cached);
      }
    };

    void loadTalentMatrix();

    const refresh = () => void loadTalentMatrix();
    window.addEventListener("talentMatrixUpdated", refresh);
    window.addEventListener("dataUpdated", refresh);
    return () => {
      window.removeEventListener("talentMatrixUpdated", refresh);
      window.removeEventListener("dataUpdated", refresh);
    };
  }, [user]);

  const mergedData = useMemo(() => {
    if (!user) return [];

    const allowedOrg = filterDataByScope(orgData || [], user) as OrgChartEntry[];

    if (allowedOrg.length === 0 && talentMatrixData.length > 0) {
      return talentMatrixData.map((item: any, index: number) => ({
        id: item.id ?? index + 1,
        "Ad Soyad": item.name || item.Personel || item.target || "",
        Departman: item.department || item.Departman || "Belirtilmemiş",
        Pozisyon: item.position || item.Pozisyon || "Belirtilmemiş",
        Performans: toScore(item.performance ?? item.Performans) ?? 0,
        Potansiyel: toScore(item.potential ?? item.Potansiyel) ?? 0,
      }));
    }

    return allowedOrg.map((person) => {
      const personName = normalizeName(person["Ad Soyad"]);
      const talent = talentMatrixData.find(
        (item: any) => normalizeName(item.name || item.Personel || item.target) === personName
      );
      const evaluation = history360.find(
        (item: any) => normalizeName(item.Personel || item.target || item["Ad Soyad"]) === personName
      );

      return {
        ...person,
        Performans:
          toScore(talent?.performance ?? talent?.Performans) ??
          toScore(evaluation?.Performans) ??
          toScore(person.Performans) ??
          0,
        Potansiyel:
          toScore(talent?.potential ?? talent?.Potansiyel) ??
          toScore(evaluation?.Potansiyel) ??
          toScore(person.Potansiyel) ??
          0,
      };
    });
  }, [orgData, history360, talentMatrixData, user]);

  const allDepartments = useMemo(
    () =>
      Array.from(
        new Set(mergedData.map((person) => person.Departman).filter(Boolean))
      ).sort(),
    [mergedData]
  );

  useEffect(() => {
    if (allDepartments.length > 0 && selectedDepartments.length === 0) {
      setSelectedDepartments(allDepartments);
    }
  }, [allDepartments, selectedDepartments.length]);

  const filteredData = useMemo(() => {
    if (selectedDepartments.length === 0) return [];
    return mergedData.filter((person) => selectedDepartments.includes(person.Departman));
  }, [mergedData, selectedDepartments]);

  const performanceData = useMemo(
    () => filteredData.filter((person) => (toScore(person.Performans) ?? 0) > 0),
    [filteredData]
  );

  const avgPerformance = useMemo(() => {
    if (performanceData.length === 0) return 0;
    return (
      performanceData.reduce((sum, person) => sum + (toScore(person.Performans) ?? 0), 0) /
      performanceData.length
    );
  }, [performanceData]);

  const riskyPeople = useMemo(
    () =>
      performanceData
        .filter((person) => (toScore(person.Performans) ?? 0) < 3.5)
        .sort(
          (a, b) =>
            (toScore(a.Performans) ?? 0) - (toScore(b.Performans) ?? 0)
        ),
    [performanceData]
  );

  const criticalPeople = useMemo(
    () => riskyPeople.filter((person) => (toScore(person.Performans) ?? 0) < 3.0),
    [riskyPeople]
  );

  const starPeople = useMemo(
    () =>
      filteredData.filter(
        (person) =>
          (toScore(person.Performans) ?? 0) >= 4.5 &&
          (toScore(person.Potansiyel) ?? 0) >= 4.0
      ),
    [filteredData]
  );

  const departmentPerformance = useMemo(() => {
    const stats = new Map<string, { total: number; count: number }>();
    performanceData.forEach((person) => {
      const dept = person.Departman || "Belirtilmemiş";
      const current = stats.get(dept) || { total: 0, count: 0 };
      current.total += toScore(person.Performans) ?? 0;
      current.count += 1;
      stats.set(dept, current);
    });

    return Array.from(stats.entries())
      .map(([department, stat]) => ({
        department,
        average: stat.count > 0 ? stat.total / stat.count : 0,
        count: stat.count,
      }))
      .sort((a, b) => a.average - b.average);
  }, [performanceData]);

  const lowestDepartment = departmentPerformance[0] || null;
  const highestDepartment = departmentPerformance[departmentPerformance.length - 1] || null;
  const performanceCoverage = filteredData.length > 0
    ? (performanceData.length / filteredData.length) * 100
    : 0;

  useEffect(() => {
    if (!user) return;

    const loadPulseTrends = async () => {
      const role = user?.role || "EMPLOYEE";
      const dept = user?.dept || user?.department || "";

      try {
        const params = new URLSearchParams();
        if (isAdmin && selectedPulseDepartment) {
          params.append("department_id", selectedPulseDepartment);
        } else if ((role === "DIRECTOR" || role === "MANAGER") && dept) {
          params.append("department_id", dept);
        }
        params.append("user_role", role);
        if (dept) params.append("user_dept", dept);

        const response = await fetch(`/api/pulse-trends?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          const data = (result.data || [])
            .map((item: any) => ({
              week: String(item.week || item.week_number || ""),
              average_score: Number(item.average_score ?? item.score ?? 0),
              count: Number(item.count ?? 0),
            }))
            .filter((item: PulseTrend) => item.week && item.average_score > 0)
            .sort((a: PulseTrend, b: PulseTrend) => a.week.localeCompare(b.week));
          setPulseTrends(data);
          return;
        }
      } catch (error) {
        console.warn("Pulse trends API unavailable, local data will be used:", error);
      }

      const answers = getStorageData<any[]>(STORAGE_KEYS.PULSE_ANSWERS, []);
      const scopedAnswers = answers.filter((answer: any) => {
        const answerDept = answer.department || answer.departman || answer.department_name || "";
        if (isAdmin && selectedPulseDepartment) return answerDept === selectedPulseDepartment;
        if ((role === "DIRECTOR" || role === "MANAGER") && dept) return answerDept === dept;
        return true;
      });

      const weekMap = new Map<string, number[]>();
      scopedAnswers.forEach((answer: any) => {
        const week = String(answer.week_number || answer.week || "");
        const score = toScore(answer.score);
        if (!week || score === null) return;
        const values = weekMap.get(week) || [];
        values.push(score);
        weekMap.set(week, values);
      });

      const localTrends = Array.from(weekMap.entries())
        .map(([week, values]) => ({
          week,
          average_score: values.reduce((sum, value) => sum + value, 0) / values.length,
          count: values.length,
        }))
        .sort((a, b) => a.week.localeCompare(b.week));

      setPulseTrends(localTrends);
    };

    void loadPulseTrends();
  }, [user, isAdmin, selectedPulseDepartment]);

  const latestPulse = pulseTrends.length > 0 ? pulseTrends[pulseTrends.length - 1] : null;
  const previousPulse = pulseTrends.length > 1 ? pulseTrends[pulseTrends.length - 2] : null;
  const pulseDelta = latestPulse && previousPulse
    ? latestPulse.average_score - previousPulse.average_score
    : null;

  const pulseScopeEmployeeCount = useMemo(() => {
  const role = user?.role || "EMPLOYEE";
  const dept = user?.dept || user?.department || "";
  if (isAdmin && selectedPulseDepartment) {
    return mergedData.filter((person) => person.Departman === selectedPulseDepartment).length;
  }
  if ((role === "DIRECTOR" || role === "MANAGER") && dept) {
    return mergedData.filter((person) => person.Departman === dept).length;
  }
  return mergedData.length;
}, [isAdmin, selectedPulseDepartment, mergedData, user]);

const latestPulseResponses = latestPulse?.count ?? 0;
const pulseParticipation = pulseScopeEmployeeCount > 0 && latestPulseResponses > 0
  ? Math.min(100, (latestPulseResponses / pulseScopeEmployeeCount) * 100)
  : 0;
const pulseStatus = latestPulse
  ? latestPulse.average_score >= PULSE_TARGET
    ? "Hedef üstü"
    : "Gelişim alanı"
  : "Veri bekleniyor";

  if (dataLoading || !userReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-72" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (mergedData.length === 0) {
    return (
      <div className="enterprise-card p-8 text-center">
        <LayoutDashboard className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Yönetici Özeti
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Yönetici görünümünü oluşturmak için organizasyon verisi bulunamadı.
        </p>
        <Link
          href="/organizasyon"
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Organizasyona Git
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="pb-3"
    >
      {/* Executive header */}
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="enterprise-eyebrow">Yönetim paneli</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[11px] font-medium text-slate-400">
              Performans hedefi {PERFORMANCE_TARGET.toFixed(1).replace(".", ",")}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                Yönetici Özeti
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {user?.role === "CEO" || user?.role === "IK"
                  ? "Şirket genelindeki kritik insan ve performans sinyalleri"
                  : `${user?.dept || user?.department || "Ekibiniz"} için kritik yönetim sinyalleri`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/izinler"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> İzin Onayları
          </Link>
          <Link
            href="/degerlendirme"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <Target className="h-3.5 w-3.5" /> Değerlendirme
          </Link>
          <Link
            href="/yetenek-matrisi"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <TrendingUp className="h-3.5 w-3.5" /> Yetenek
          </Link>
          <Link
            href="/yedekleme"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Yedekleme
          </Link>
        </div>
      </div>

      {/* Compact scope filter */}
      <details className="enterprise-card mb-4 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span>Görünüm kapsamı</span>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {selectedDepartments.length}/{allDepartments.length} departman
          </span>
        </summary>
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            {allDepartments.map((department) => {
              const checked = selectedDepartments.includes(department);
              return (
                <button
                  key={department}
                  type="button"
                  onClick={() =>
                    setSelectedDepartments((current) =>
                      checked
                        ? current.filter((item) => item !== department)
                        : [...current, department]
                    )
                  }
                  className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    checked
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                  }`}
                >
                  {department}
                </button>
              );
            })}
          </div>
          {selectedDepartments.length === 0 && (
            <p className="mt-2 text-xs font-medium text-red-600">
              Yönetici özetini görmek için en az bir departman seçin.
            </p>
          )}
        </div>
      </details>

      {/* Executive KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GlassCard className="h-full p-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="enterprise-eyebrow">Görünen ekip</p>
              <p className="mt-1 text-[11px] text-slate-400">Seçili kapsam</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-slate-900 dark:text-slate-100">
              <CountUp value={filteredData.length} />
            </p>
            <span className="text-[10px] font-semibold text-slate-500">
              {performanceData.length}/{filteredData.length} değerlendirildi
            </span>
          </div>
        </GlassCard>

        <GlassCard className="h-full p-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="enterprise-eyebrow">Ort. performans</p>
              <p className="mt-1 text-[11px] text-slate-400">
                %{performanceCoverage.toFixed(0)} veri kapsamı
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-slate-900 dark:text-slate-100">
              <CountUp value={avgPerformance} decimals={1} />
            </p>
            <span
              className={`text-[10px] font-semibold ${
                avgPerformance >= PERFORMANCE_TARGET
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {avgPerformance >= PERFORMANCE_TARGET ? "+" : ""}
              {(avgPerformance - PERFORMANCE_TARGET).toFixed(1).replace(".", ",")} hedef farkı
            </span>
          </div>
        </GlassCard>

        <GlassCard className="h-full p-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="enterprise-eyebrow">Yakın takip</p>
              <p className="mt-1 text-[11px] text-slate-400">Performans &lt; 3,5</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-slate-900 dark:text-slate-100">
              <CountUp value={riskyPeople.length} />
            </p>
            <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {formatPercent(riskyPeople.length, performanceData.length)}
            </span>
          </div>
        </GlassCard>

        <GlassCard className="h-full p-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="enterprise-eyebrow">Yıldız segment</p>
              <p className="mt-1 text-[11px] text-slate-400">Yüksek performans & potansiyel</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-slate-900 dark:text-slate-100">
              <CountUp value={starPeople.length} />
            </p>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              {formatPercent(starPeople.length, filteredData.length)}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Employee experience summary */}
<div className="enterprise-card mb-4 p-4">
  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300">
        <Heart className="h-4 w-4" />
      </div>
      <div>
        <p className="enterprise-eyebrow">Çalışan deneyimi</p>
        <h2 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
Haftalık check-in özeti
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-400">
{isAdmin
  ? selectedPulseDepartment || "Tüm şirket"
  : user?.dept || user?.department || "Ekibiniz"} · çalışanların 1–10 deneyim yanıtlarından otomatik oluşur.
        </p>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      {isAdmin && (
        <select
value={selectedPulseDepartment || ""}
onChange={(event) => setSelectedPulseDepartment(event.target.value || null)}
className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none hover:border-slate-300 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
aria-label="Çalışan deneyimi departmanı"
        >
<option value="">Tüm Şirket</option>
{allDepartments.map((department) => (
  <option key={department} value={department}>
    {department}
  </option>
))}
        </select>
      )}
      <Link
        href="/calisan-deneyimi"
        className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-indigo-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300"
      >
        Check-in ekranı →
      </Link>
    </div>
  </div>

  {latestPulse ? (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40">
<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Deneyim skoru</p>
<div className="mt-1.5 flex items-end gap-1.5">
  <span className="text-xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
    {latestPulse.average_score.toFixed(1).replace(".", ",")}
  </span>
  <span className="pb-0.5 text-[10px] font-medium text-slate-400">/ 10</span>
</div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40">
<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Katılım</p>
<div className="mt-1.5 flex items-end justify-between gap-2">
  <span className="text-xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
    %{pulseParticipation.toFixed(0)}
  </span>
  <span className="pb-0.5 text-[10px] font-medium text-slate-400">{latestPulseResponses} yanıt</span>
</div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40">
<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Önceki haftaya göre</p>
<div className="mt-1.5 flex items-center gap-1.5">
  {pulseDelta !== null ? (
    <>
      {pulseDelta >= 0 ? (
        <TrendingUp className="h-4 w-4 text-emerald-600" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-500" />
      )}
      <span className={`text-xl font-semibold tracking-[-0.03em] ${pulseDelta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
        {pulseDelta >= 0 ? "+" : ""}{pulseDelta.toFixed(1).replace(".", ",")}
      </span>
    </>
  ) : (
    <span className="text-xl font-semibold text-slate-400">—</span>
  )}
</div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40">
<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Durum</p>
<div className="mt-1.5 flex items-center justify-between gap-2">
  <span className={`text-sm font-semibold ${latestPulse.average_score >= PULSE_TARGET ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
    {pulseStatus}
  </span>
  <span className="text-[10px] font-medium text-slate-400">Hedef {PULSE_TARGET.toFixed(1).replace(".", ",")}</span>
</div>
        </div>
      </div>

      <div className={`mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${latestPulse.average_score >= PULSE_TARGET ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/10" : "border-amber-100 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/10"}`}>
        {latestPulse.average_score >= PULSE_TARGET ? (
<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
        ) : (
<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        )}
        <p className="text-[11px] leading-5 text-slate-600 dark:text-slate-300">
Son haftada {latestPulseResponses} çalışan check-in verdi. Deneyim skoru {latestPulse.average_score.toFixed(1).replace(".", ",")} / 10
{pulseDelta !== null ? ` ve önceki haftaya göre ${Math.abs(pulseDelta).toFixed(1).replace(".", ",")} puan ${pulseDelta >= 0 ? "yükseldi" : "geriledi"}.` : "."}
        </p>
      </div>
    </>
  ) : (
    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/30">
      <div className="flex items-center gap-3">
        <Heart className="h-5 w-5 flex-shrink-0 text-slate-300" />
        <div>
<p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Henüz check-in verisi yok</p>
<p className="mt-0.5 text-[11px] text-slate-400">İlk çalışan yanıtı geldiğinde skor, katılım ve haftalık değişim burada otomatik oluşacak.</p>
        </div>
      </div>
      <Link
        href="/calisan-deneyimi"
        className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        İlk check-in'i başlat →
      </Link>
    </div>
  )}
</div>
      {/* Decision support */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <div className="enterprise-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="enterprise-eyebrow">Karar desteği</p>
              <h2 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Bu hafta yöneticinin dikkat etmesi gerekenler
              </h2>
            </div>
            <span className="text-[10px] font-medium text-slate-400">Kural bazlı yönetim sinyalleri</span>
          </div>

          <div className="space-y-2.5">
            <div className={`rounded-lg border p-3 ${
              avgPerformance >= PERFORMANCE_TARGET
                ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                : "border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/10"
            }`}>
              <div className="flex items-start gap-2.5">
                {avgPerformance >= PERFORMANCE_TARGET ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <BarChart3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Performans görünümü
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Ortalama {avgPerformance.toFixed(1).replace(".", ",")}. Hedefe göre {Math.abs(avgPerformance - PERFORMANCE_TARGET).toFixed(1).replace(".", ",")} puan {avgPerformance >= PERFORMANCE_TARGET ? "üzerinde" : "altında"}.
                    {lowestDepartment && ` En düşük departman ortalaması ${lowestDepartment.department}: ${lowestDepartment.average.toFixed(1).replace(".", ",")}.`}
                  </p>
                </div>
                <Link href="/degerlendirme" className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                  İncele →
                </Link>
              </div>
            </div>

            <div className={`rounded-lg border p-3 ${
              criticalPeople.length > 0
                ? "border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/10"
                : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/30"
            }`}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${criticalPeople.length > 0 ? "text-red-600" : "text-slate-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Kritik performans aksiyonu
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    {criticalPeople.length > 0
                      ? `${criticalPeople.length} çalışan 3,0 performans seviyesinin altında. İlk görüşme ve gelişim aksiyonu planlanmalı.`
                      : "3,0 seviyesinin altında kritik performans sinyali bulunmuyor."}
                  </p>
                </div>
                {criticalPeople.length > 0 && (
                  <Link href="/gelisim" className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                    Aksiyon →
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/10">
              <div className="flex items-start gap-2.5">
                <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Yetenek fırsatı
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    {starPeople.length > 0
                      ? `${starPeople.length} çalışan yıldız segmentte. Kritik roller, gelişim ve halefiyet açısından değerlendirilmesi önerilir.`
                      : "Mevcut kriterlere göre yıldız segmentte çalışan görünmüyor."}
                    {highestDepartment && ` En güçlü departman ortalaması ${highestDepartment.department}: ${highestDepartment.average.toFixed(1).replace(".", ",")}.`}
                  </p>
                </div>
                <Link href="/yetenek-matrisi" className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                  Gör →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="enterprise-card p-4">
          <div className="mb-3">
            <p className="enterprise-eyebrow">Öncelikli kişiler</p>
            <h2 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              En yakın takip gerektirenler
            </h2>
          </div>

          {riskyPeople.length > 0 ? (
            <div className="space-y-2">
              {riskyPeople.slice(0, 3).map((person) => {
                const performance = toScore(person.Performans) ?? 0;
                return (
                  <Link
                    key={person.id || person["Ad Soyad"]}
                    href={`/degerlendirme?employeeName=${encodeURIComponent(person["Ad Soyad"])}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {person["Ad Soyad"]}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        {person.Departman} · {person.Pozisyon}
                      </p>
                    </div>
                    <span className={`ml-3 rounded-md px-2 py-1 text-[10px] font-semibold ${
                      performance < 3
                        ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                    }`}>
                      {performance.toFixed(1).replace(".", ",")}
                    </span>
                  </Link>
                );
              })}
              {riskyPeople.length > 3 && (
                <Link
                  href="/degerlendirme"
                  className="block pt-1 text-center text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  +{riskyPeople.length - 3} kişiyi daha incele →
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 text-center dark:border-emerald-900/40 dark:bg-emerald-950/10">
              <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Yakın takip gerektiren çalışan yok
              </p>
            </div>
          )}

          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Veri kapsamı</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                %{performanceCoverage.toFixed(0)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.min(performanceCoverage, 100)}%` }}
              />
            </div>
            {performanceCoverage < 80 && (
              <p className="mt-2 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
                Karar kalitesini artırmak için eksik değerlendirmeleri tamamlayın.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
