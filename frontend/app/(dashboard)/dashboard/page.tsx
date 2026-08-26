"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { useData } from "../../../context/DataContext";
import { filterDataByScope } from "../../utils/hierarchy";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Star,
  Filter,
  LayoutDashboard,
  Building2,
  DollarSign,
  BarChart3,
  Target,
  Heart,
  Gift,
  Calendar,
} from "lucide-react";
import { JOB_PROFILES } from "../../data/jobData";
import { motion } from "framer-motion";
import GlassCard from "../../../components/ui/GlassCard";
import CountUp from "../../../components/ui/CountUp";
import Skeleton, { SkeletonCard, SkeletonList, SkeletonTable } from "@/components/ui/Skeleton";
import { toScore, formatScore } from "../../../lib/score";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
  LineChart,
  Line,
  Legend,
  Area,
} from "@/components/charts/recharts";
import { API_BASE_URL } from "@/lib/apiConfig";

const TARGET_SCORE = 4.5;

// Hafta numarası hesaplama fonksiyonu
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const formatDeptCompare = (personScore: number | null, deptAvg: number | null) => {
  if (personScore === null || deptAvg === null) return null;
  const delta = personScore - deptAvg;
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const deltaText = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
  return `Departman Ort.: ${deptAvg.toFixed(1)} (${arrow} ${deltaText})`;
};

const COMPETENCIES_360: Record<string, string> = {
  DIG: "Dijital Okuryazarlık",
  ANA: "Analitik Düşünme",
  RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen",
  LRN: "Sürekli Öğrenme",
  ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin",
  STR: "Stratejik Bakış",
  TEA: "Takım Çalışması",
  COM: "İletişim Becerileri",
};

interface OrgChartEntry {
  "Ad Soyad": string;
  Pozisyon: string;
  Departman: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  Performans?: number;
  Potansiyel?: number;
  "Maaş (TL)"?: number;
  [key: string]: any;
}

// Get allowed data based on user role (using hierarchy utility)
function getAllowedData(
  orgData: OrgChartEntry[],
  user: any
): OrgChartEntry[] {
  if (!user || !orgData.length) return [];
  return filterDataByScope(orgData, user);
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId") ?? searchParams.get("dqiEmployeeId");
  const employeeNameParam = (searchParams.get("employeeName") ?? searchParams.get("dqiEmployeeName") ?? "").trim() || null;
  const { orgData: contextOrgData, history360: contextHistory360, loading: dataLoading } = useData();
  const [orgData, setOrgData] = useState<OrgChartEntry[]>(contextOrgData);
  const [history360, setHistory360] = useState<any[]>(contextHistory360);
  const [user, setUser] = useState<any>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "departments" | "charts" | "competencies" | "performance"
  >("overview");
  const [pulseTrends, setPulseTrends] = useState<any[]>([]);
  const [selectedPulseDepartment, setSelectedPulseDepartment] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [missingTestScore, setMissingTestScore] = useState(false);

  // Sync with context data
  useEffect(() => {
    setOrgData(contextOrgData);
    setHistory360(contextHistory360);
  }, [contextOrgData, contextHistory360]);

  useEffect(() => {
    const loadUserData = () => {
      const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
      setUser(currentUser);
      
      // Check if user is admin/CEO
      const userRole = currentUser && typeof currentUser === "object" && "role" in currentUser 
        ? (currentUser as any).role 
        : null;
      
      // DEVELOPMENT MODE: Bypass all role checks
      const isDevelopment = process.env.NODE_ENV === "development";
      
      // STRICT ACCESS CONTROL: Dashboard is NOT accessible to Employees (only in production)
      if (!isDevelopment && (userRole === "EMPLOYEE" || userRole === "PERSONEL")) {
        alert("Bu sayfaya erişim yetkiniz yok. Dashboard sadece CEO, Direktör ve Müdürler için erişilebilir.");
        window.location.href = "/izinler"; // Redirect to leave management (self-service)
        return;
      }
      
      // In development, always set as admin
      setIsAdmin(isDevelopment || userRole === "CEO" || userRole === "IK" || userRole === "admin");
    };
    
    loadUserData();
    
    // Storage temizlendiğinde veya güncellendiğinde verileri yeniden yükle
    const handleStorageCleared = () => {
      // Direkt state'leri temizle - DataContext zaten temizleyecek
      setOrgData([]);
      setHistory360([]);
      loadUserData();
      // Force context to update by refreshing
      if (window.location.pathname === "/dashboard") {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };
    
    const handleDataUpdated = () => {
      // Veri güncellendiğinde yeniden yükle
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      if (dataCleared) {
        // Veriler temizlendi, state'leri sıfırla ve sayfayı yenile
        setOrgData([]);
        setHistory360([]);
        if (window.location.pathname === "/dashboard") {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } else {
        loadUserData();
      }
    };
    
    window.addEventListener("storageCleared", handleStorageCleared);
    window.addEventListener("dataUpdated", handleDataUpdated);
    
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
      window.removeEventListener("dataUpdated", handleDataUpdated);
    };
  }, []);

  useEffect(() => {
    const checkTestScore = async () => {
      if (!user) return;
      const userName = user?.name || user?.username || "";
      if (!userName) return;
      let talentData = getStorageData<any[]>("hr_talent_matrix", []);
      if (!Array.isArray(talentData) || talentData.length === 0) {
        try {
          const params = new URLSearchParams();
          const userRole = user?.role || "EMPLOYEE";
          const userDept = user?.dept || user?.department || "";
          params.append("user_role", userRole);
          if (userDept) params.append("user_dept", userDept);
          params.append("user_name", userName);
          const response = await fetch(`/api/talent-matrix?${params.toString()}`);
          if (response.ok) {
            const result = await response.json();
            talentData = Array.isArray(result) ? result : (result.data || []);
          }
        } catch {
          talentData = [];
        }
      }

      const userKey = (userName || "").trim().toLowerCase();
      const entry = (talentData || []).find((item: any) => {
        const candidate = (item?.name || item?.["Ad Soyad"] || "").trim().toLowerCase();
        return candidate === userKey || candidate.includes(userKey) || userKey.includes(candidate);
      });

      const testScore = toScore(entry?.test_score);
      setMissingTestScore(testScore === null);
    };

    checkTestScore();
  }, [user]);

  // Direktör ve Müdürler için otomatik departman seçimi
  useEffect(() => {
    if (!user) return;
    
    const userRole = user.role;
    const userDept = user.dept || user.department || "";
    
    // Direktör veya Müdür ise, otomatik olarak kendi departmanını seç
    if ((userRole === "DIRECTOR" || userRole === "MANAGER") && userDept && !selectedPulseDepartment) {
      setSelectedPulseDepartment(userDept);
    }
  }, [user, selectedPulseDepartment]);

  // Load pulse trends
  useEffect(() => {
    const loadPulseTrends = async () => {
      if (!user) return;
      
      const userRole = user.role;
      const userDept = user.dept || user.department || "";
      
      try {
        const params = new URLSearchParams();
        
        // CEO/Admin ise seçilen departmanı gönder, değilse kullanıcının kendi departmanını gönder
        if (isAdmin && selectedPulseDepartment) {
          params.append("department_id", selectedPulseDepartment);
        } else if ((userRole === "DIRECTOR" || userRole === "MANAGER") && userDept) {
          // Direktör ve Müdürler için otomatik olarak kendi departmanlarını gönder
          params.append("department_id", userDept);
          params.append("user_department", userDept);
        }
        
        params.append("user_role", userRole);
        if (userDept) {
          params.append("user_dept", userDept);
          params.append("user_department", userDept);
        }
        
        const response = await fetch(`/api/pulse-trends?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          setPulseTrends(result.data || []);
        }
      } catch (error) {
        console.error("Pulse trends load error:", error);
        // Fallback to localStorage - Sadece kullanıcının departmanına ait verileri göster
        const pulseAnswers = getStorageData<any[]>(STORAGE_KEYS.PULSE_ANSWERS, []);
        
        // Direktör ve Müdürler için sadece kendi departmanlarının verilerini filtrele
        let filteredAnswers = pulseAnswers;
        if ((userRole === "DIRECTOR" || userRole === "MANAGER") && userDept) {
          filteredAnswers = pulseAnswers.filter((answer: any) => 
            answer.department === userDept || answer.departman === userDept || answer.department_name === userDept
          );
        }
        
        // Group by week and calculate averages
        const weekMap: Record<string, number[]> = {};
        filteredAnswers.forEach((answer) => {
          const week = answer.week_number;
          if (week) {
            if (!weekMap[week]) weekMap[week] = [];
            const score = toScore(answer.score);
            if (score !== null) {
              weekMap[week].push(score);
            }
          }
        });
        
        let trends = Object.entries(weekMap)
          .map(([week, scores]) => ({
            week,
            average_score: scores.reduce((a, b) => a + b, 0) / scores.length,
            count: scores.length,
          }))
          .sort((a, b) => a.week.localeCompare(b.week));
        
        // Eğer hala veri yoksa, demo veri oluştur
        if (trends.length === 0) {
          const currentDate = new Date();
          const demoTrends = [];
          
          // Departman bazlı mutluluk skorları
          const baseScores: Record<string, [number, number]> = {
            "İnsan Kaynakları": [7.2, 8.5],
            "Bilgi Teknolojileri": [6.8, 8.2],
            "Finans": [7.0, 8.0],
            "Satış": [6.5, 7.8],
            "Pazarlama": [6.8, 7.9],
            "Operasyon": [6.8, 7.9],
            "AR-GE": [7.0, 8.2],
            "Hukuk": [7.2, 8.3],
            "Yönetim": [7.5, 9.0],
          };
          
          const scoreRange = baseScores[userDept] || [6.5, 8.0];
          
          for (let weekOffset = 12; weekOffset > 0; weekOffset--) {
            const weekDate = new Date(currentDate);
            weekDate.setDate(weekDate.getDate() - (weekOffset * 7));
            const year = weekDate.getFullYear();
            const weekNum = getWeekNumber(weekDate);
            const weekNumber = `${year}-W${weekNum.toString().padStart(2, '0')}`;
            
            // Haftalara göre trend (başlangıçta düşük, sonra yükseliyor)
            const trendFactor = 0.85 + (12 - weekOffset) * 0.012;
            
            // Baz skor + trend + rastgele varyasyon
            const baseScore = scoreRange[0] + (scoreRange[1] - scoreRange[0]) * trendFactor;
            const score = baseScore + (Math.random() * 0.6 - 0.3); // -0.3 ile +0.3 arası
            const finalScore = Math.max(5.0, Math.min(10.0, score));
            
            demoTrends.push({
              week: weekNumber,
              average_score: Math.round(finalScore * 100) / 100,
              count: Math.floor(Math.random() * 20) + 15 // 15-35 arası
            });
          }
          
          trends = demoTrends;
        }
        
        setPulseTrends(trends);
      }
    };
    
    loadPulseTrends();
  }, [user, selectedPulseDepartment, isAdmin]);

  // Talent Matrix verilerini çek (yetkinlik skorları için)
  const [talentMatrixData, setTalentMatrixData] = useState<any[]>([]);
  
  useEffect(() => {
    const loadTalentMatrix = async () => {
      if (!user) return;
      
      const userRole = user.role;
      const userDept = user.dept || user.department || "";
      const userName = user.name || "";
      
      try {
        const params = new URLSearchParams();
        if (userRole) params.append("user_role", userRole);
        if (userDept) params.append("user_dept", userDept);
        if (userName) params.append("user_name", userName);
        params.append("_t", Date.now().toString()); // Cache bypass
        
        const requestUrl = `/api/talent-matrix?${params.toString()}`;
        if (process.env.NODE_ENV !== "production") {
          console.debug("[TalentMatrix] request", {
            url: requestUrl,
            params: Object.fromEntries(params.entries())
          });
        }

        const response = await fetch(requestUrl);
        if (response.ok) {
          const result = await response.json();
          if (process.env.NODE_ENV !== "production") {
            console.debug("[TalentMatrix] response", result);
          }
          setTalentMatrixData(result.data || []);
        }
      } catch (error) {
        console.error("Talent matrix load error:", error);
      }
    };
    
    loadTalentMatrix();
    
    // Talent Matrix güncellendiğinde yeniden yükle
    const handleTalentMatrixUpdate = () => {
      loadTalentMatrix();
    };
    
    window.addEventListener("talentMatrixUpdated", handleTalentMatrixUpdate);
    window.addEventListener("dataUpdated", handleTalentMatrixUpdate);
    
    return () => {
      window.removeEventListener("talentMatrixUpdated", handleTalentMatrixUpdate);
      window.removeEventListener("dataUpdated", handleTalentMatrixUpdate);
    };
  }, [user]);

  // Merge org and 360 data with talent matrix data
  const mergedData = useMemo(() => {
    const allowed = getAllowedData(orgData, user);
    if (allowed.length === 0 && talentMatrixData.length > 0) {
      return talentMatrixData.map((t) => {
        const merged: any = {
          "Ad Soyad": t.name || t.Personel || t.target || "",
          Departman: t.department || t.Departman || "",
          Pozisyon: t.position || t.Pozisyon || "",
          Performans: t.performance ?? t.Performans ?? 0,
          Potansiyel: t.potential ?? t.Potansiyel ?? 0,
          test_score: t.test_score ?? null,
          manager_score: t.manager_score ?? null,
          position_competency_score: t.position_competency_score ?? t.targetCompetencyScore ?? null,
        };

        if (t.manager_scores && typeof t.manager_scores === "object") {
          Object.entries(t.manager_scores).forEach(([code, score]) => {
            merged[`${code}_Mgr`] = score;
          });
        }

        if (t.scores && typeof t.scores === "object") {
          Object.entries(t.scores).forEach(([code, score]) => {
            merged[`${code}_Test`] = score;
            merged[code] = score;
          });
        }

        return merged;
      });
    }
    if (!history360.length && !talentMatrixData.length) {
      return allowed.map((p) => ({
        ...p,
        Performans: p.Performans || 0,
        Potansiyel: p.Potansiyel || 0,
      }));
    }

    return allowed.map((person) => {
      const personName = person["Ad Soyad"];
      
      // Önce talent-matrix'ten veri çek (manager_scores ve scores objeleri için)
      const talentData = talentMatrixData.find(
        (t) => t.name === personName
      );
      
      // Sonra history360'dan veri çek
      const person360 = history360.find(
        (p) => p.Personel === personName || p.target === personName
      );

      const merged: any = { ...person };
      
      // Talent matrix verilerini ekle (öncelikli)
      if (talentData) {
        merged.Performans = talentData.performance || person.Performans || 0;
        merged.Potansiyel = talentData.potential || person.Potansiyel || 0;
        merged.test_score = talentData.test_score ?? null;
        merged.manager_score = talentData.manager_score ?? null;
        merged.position_competency_score = talentData.position_competency_score ?? talentData.targetCompetencyScore ?? null;
        
        // manager_scores objesini _Mgr kolonlarına dönüştür
        if (talentData.manager_scores && typeof talentData.manager_scores === 'object') {
          Object.entries(talentData.manager_scores).forEach(([code, score]) => {
            merged[`${code}_Mgr`] = score;
          });
        }
        
        // scores objesini _Test kolonlarına dönüştür
        if (talentData.scores && typeof talentData.scores === 'object') {
          Object.entries(talentData.scores).forEach(([code, score]) => {
            merged[`${code}_Test`] = score;
            merged[code] = score;
          });
        }
      }
      
      // History360 verilerini ekle (eğer talent matrix'te yoksa)
      if (person360) {
        Object.keys(person360).forEach((key) => {
          if (key !== "Personel" && key !== "target" && !merged[key]) {
            merged[key] = person360[key];
          }
        });
        
        // Eğer talent matrix'te manager_scores yoksa, history360'dan ekle
        if (!talentData?.manager_scores && person360.manager_scores && typeof person360.manager_scores === 'object') {
          Object.entries(person360.manager_scores).forEach(([code, score]) => {
            if (!merged[`${code}_Mgr`]) {
              merged[`${code}_Mgr`] = score;
            }
          });
        }
        
        // Eğer talent matrix'te scores yoksa, history360'dan ekle
        if (!talentData?.scores && person360.scores && typeof person360.scores === 'object') {
          Object.entries(person360.scores).forEach(([code, score]) => {
            if (!merged[`${code}_Test`]) {
              merged[`${code}_Test`] = score;
              merged[code] = score;
            }
          });
        }
        
        // Performans ve Potansiyel değerlerini güncelle (eğer yoksa)
        if (!merged.Performans) merged.Performans = person360.Performans || person.Performans || 0;
        if (!merged.Potansiyel) merged.Potansiyel = person360.Potansiyel || person.Potansiyel || 0;
      }
      
      // Eğer hiç veri yoksa, varsayılan değerler
      if (!talentData && !person360) {
        merged.Performans = person.Performans || 0;
        merged.Potansiyel = person.Potansiyel || 0;
      }
      
      return merged;
    });
  }, [orgData, history360, talentMatrixData, user]);

  // Filter by selected departments
  const filteredData = useMemo(() => {
    if (selectedDepartments.length === 0) {
      // Initialize with all departments
      const allDepts = Array.from(
        new Set(mergedData.map((p) => p.Departman).filter(Boolean))
      ).sort();
      if (allDepts.length > 0 && selectedDepartments.length === 0) {
        setSelectedDepartments(allDepts);
        return mergedData;
      }
      return [];
    }
    return mergedData.filter((p) => selectedDepartments.includes(p.Departman));
  }, [mergedData, selectedDepartments]);

  // Initialize departments on first load
  useEffect(() => {
    if (selectedDepartments.length === 0 && mergedData.length > 0) {
      const allDepts = Array.from(
        new Set(mergedData.map((p) => p.Departman).filter(Boolean))
      ).sort();
      setSelectedDepartments(allDepts);
    }
  }, [mergedData, selectedDepartments.length]);

  // Calculate KPIs
  const activeData = useMemo(
    () => filteredData.filter((p) => (p.Performans || 0) > 0),
    [filteredData]
  );

  const selectedPersonFromQuery = useMemo(() => {
    if (!employeeIdParam && !employeeNameParam) return null;
    return filteredData.find((p) => {
      if (employeeIdParam && String(p.id ?? "") === String(employeeIdParam)) return true;
      if (employeeNameParam && p["Ad Soyad"] === employeeNameParam) return true;
      return false;
    }) || null;
  }, [filteredData, employeeIdParam, employeeNameParam]);

  const quickEmployeeQuery = useMemo(() => {
    if (selectedPersonFromQuery?.id) {
      return `?employeeId=${selectedPersonFromQuery.id}`;
    }
    if (selectedPersonFromQuery?.["Ad Soyad"]) {
      return `?employeeName=${encodeURIComponent(selectedPersonFromQuery["Ad Soyad"])}`;
    }
    return "";
  }, [selectedPersonFromQuery]);

  const avgPerformance = useMemo(() => {
    if (activeData.length === 0) return 0;
    const sum = activeData.reduce((acc, p) => acc + (p.Performans || 0), 0);
    return sum / activeData.length;
  }, [activeData]);

  const starsCount = useMemo(
    () =>
      filteredData.filter(
        (p) => (p.Performans || 0) >= 4.5 && (p.Potansiyel || 0) >= 4.0
      ).length,
    [filteredData]
  );

  const riskyCount = useMemo(
    () =>
      filteredData.filter(
        (p) => (p.Performans || 0) > 0 && (p.Performans || 0) < 3.5
      ).length,
    [filteredData]
  );

  // Performance Warning System: Employees needing PIP
  const pipCandidates = useMemo(() => {
    return filteredData
      .filter((p) => {
        const perf = p.Performans || 0;
        return perf > 0 && perf < 3.0; // Critical: < 3.0
      })
      .map((p) => ({
        name: p["Ad Soyad"],
        department: p.Departman,
        performance: p.Performans || 0,
        potential: p.Potansiyel || 0,
        riskLevel: (p.Performans || 0) < 2.5 ? "KRİTİK" : "YÜKSEK",
      }))
      .sort((a, b) => a.performance - b.performance);
  }, [filteredData]);

  // All departments for filter
  const allDepartments = useMemo(() => {
    return Array.from(
      new Set(mergedData.map((p) => p.Departman).filter(Boolean))
    ).sort();
  }, [mergedData]);

  if (dataLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <Skeleton className="h-6 w-1/3" />
        <div className="mt-4">
          <SkeletonTable rows={6} cols={5} />
        </div>
      </div>
    );
  }

  if (filteredData.length === 0 && selectedDepartments.length > 0) {
    return (
      <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-800">⚠️ Seçilen departmanlarda veri bulunamadı.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard className="w-4 h-4 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-800">
            Yönetici Kokpiti
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          Hoş geldiniz, {user?.name} ({user?.role}) • Hedef: {TARGET_SCORE}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm">
          <span className="font-semibold text-slate-700">Sonraki Adım:</span>
          <div className="flex flex-wrap gap-1.5">
            <Link href={`/yetenek-matrisi${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700 hover:bg-indigo-100">
              <TrendingUp className="w-3 h-3" />
              Yetenek Matrisi
            </Link>
            <Link href={`/degerlendirme${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-1 text-[11px] text-orange-700 hover:bg-orange-100">
              <Target className="w-3 h-3" />
              360 Değerlendirme
            </Link>
            <Link href={`/egitim${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-700 hover:bg-blue-100">
              <Calendar className="w-3 h-3" />
              Eğitim
            </Link>
            <Link href={`/gelisim${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2 py-1 text-[11px] text-violet-700 hover:bg-violet-100">
              <Heart className="w-3 h-3" />
              Gelişim Planı
            </Link>
            <Link href={`/kariyer${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-100">
              <Star className="w-3 h-3" />
              Kariyer Yolu
            </Link>
          </div>
        </div>
      </div>

      {missingTestScore && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <span>
              Yetkinlik testiniz henüz tamamlanmadı. Profilinizin oluşması için lütfen testi çözün.
            </span>
          </div>
          <Link
            href="/aday-testi"
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
          >
            Testi Başlat
          </Link>
        </div>
      )}

      {/* Filters */}
      <details className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20 p-4 mb-4 hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-200" open>
        <summary className="cursor-pointer font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Departman Filtreleri
        </summary>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600 mb-2 uppercase tracking-wider">
            Departmanları Filtrele
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allDepartments.map((dept) => (
              <label
                key={dept}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 hover:bg-indigo-50 rounded cursor-pointer transition-all duration-200 border border-indigo-100 active:scale-95"
              >
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(dept)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDepartments([...selectedDepartments, dept]);
                    } else {
                      setSelectedDepartments(
                        selectedDepartments.filter((d) => d !== dept)
                      );
                    }
                  }}
                  className="rounded w-3 h-3"
                />
                <span className="text-xs text-slate-700">{dept}</span>
              </label>
            ))}
          </div>
          {selectedDepartments.length === 0 && (
            <p className="text-red-600 text-xs mt-2">
              Lütfen en az bir departman seçin.
            </p>
          )}
        </div>
      </details>

      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <GlassCard className="border-l-4 border-indigo-500">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Ekip</p>
            <p className="text-2xl font-semibold text-slate-800 font-mono">
              <CountUp value={filteredData.length} />
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Personel</p>
            <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Geçen aya göre +2
            </p>
          </GlassCard>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <GlassCard className="border-l-4 border-green-500">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Ort. Perf.</p>
            <p className="text-2xl font-semibold text-slate-800 font-mono">
              <CountUp value={avgPerformance} decimals={1} />
            </p>
            <p
              className={`text-xs mt-0.5 font-medium ${
                avgPerformance >= TARGET_SCORE
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {avgPerformance >= TARGET_SCORE ? "+" : ""}
              <CountUp value={avgPerformance - TARGET_SCORE} decimals={1} />
            </p>
          </GlassCard>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <GlassCard className="border-l-4 border-red-500">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Riskli</p>
            <p className="text-2xl font-semibold text-slate-800 font-mono">
              <CountUp value={riskyCount} />
            </p>
            <p className="text-xs text-red-600 mt-0.5 font-medium">Aksiyon Gerekli</p>
          </GlassCard>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <GlassCard className="border-l-4 border-yellow-500">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Yıldızlar</p>
            <p className="text-2xl font-semibold text-slate-800 font-mono">
              <CountUp value={starsCount || 0} />
            </p>
            <p className="text-xs text-yellow-600 mt-0.5 font-medium">Top Performans</p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Şirket Mutluluk Grafiği (Pulse Trends) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <h3 className="text-lg font-semibold text-slate-800">
              {isAdmin ? "Şirket Mutluluk Grafiği" : `${user?.dept || user?.department || ""} Mutluluk Grafiği`}
            </h3>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Departman:</label>
              <select
                value={selectedPulseDepartment || ""}
                onChange={(e) => setSelectedPulseDepartment(e.target.value || null)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Tüm Şirket</option>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isAdmin && (user?.role === "DIRECTOR" || user?.role === "MANAGER") && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {user?.dept || user?.department || ""}
              </span>
            </div>
          )}
        </div>
        
        {pulseTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={pulseTrends}>
              <defs>
                <linearGradient id="pulseAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbcfe8" stopOpacity={0.28} />
                  <stop offset="70%" stopColor="#fbcfe8" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="#fbcfe8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="week" 
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[0, 10]}
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                label={{ value: "Ortalama Puan", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white", 
                  border: "1px solid #e5e7eb", 
                  borderRadius: "6px",
                  fontSize: "12px",
                  padding: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                }}
                formatter={(value: any) => [`${value.toFixed(2)} / 10`, "Ortalama Puan"]}
                labelFormatter={(label) => `Hafta: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="average_score"
                stroke="none"
                fill="url(#pulseAreaGradient)"
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Line 
                type="monotone" 
                dataKey="average_score" 
                stroke="#ec4899" 
                strokeWidth={3}
                dot={{ fill: "#ec4899", r: 5 }}
                activeDot={{ r: 7 }}
                name="Ortalama Mutluluk"
              />
              <ReferenceLine y={7} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Hedef (7)", position: "right" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-center">
              <Heart className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Henüz veri bulunmuyor</p>
              <p className="text-xs text-slate-500 mt-1">Haftalık check-in'ler grafikte görünecek</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Insights */}
      {avgPerformance > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Stratejik Analiz
          </h3>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-2">
              {avgPerformance >= TARGET_SCORE ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 text-xs font-medium">
                    <strong>Harika Durum:</strong> Ekip ortalaması {avgPerformance.toFixed(1)}, hedefi aşıyor. Yüksek performansı ödüllendirme zamanı.
                  </p>
                </div>
              ) : avgPerformance >= TARGET_SCORE - 0.5 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 text-xs font-medium">
                    <strong>Takip Gerekli:</strong> Ekip ortalaması {avgPerformance.toFixed(1)}, hedefe yakın ancak desteklenmeli.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-xs font-medium">
                    <strong>Kritik:</strong> Ekip ortalaması {avgPerformance.toFixed(1)}, hedefin çok altında. Acil gelişim planı gerekli.
                  </p>
                </div>
              )}

              {starsCount > 0 && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 text-xs">
                    <strong>Tavsiye:</strong> {starsCount} adet 'Yıldız Personel' tespit edildi. Yedekleme Planı'na dahil edin.
                  </p>
                </div>
              )}

              {riskyCount > 0 && (
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-orange-800 text-xs">
                    <strong>Aksiyon:</strong> {riskyCount} personel kritik seviyenin altında. Koçluk veya eğitim ataması yapın.
                  </p>
              </div>
              )}

              {/* Performance Improvement Plan (PIP) Warning */}
              {pipCandidates.length > 0 && (
                <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800 mb-1">
                        ⚠️ Performans İyileştirme Planı (PIP) Gerekli
                      </p>
                      <p className="text-xs text-red-700 mb-2">
                        {pipCandidates.length} çalışanın performans skoru 3.0'ın altında. Acil müdahale gerekiyor.
                      </p>
                      <div className="space-y-1.5">
                        {pipCandidates.slice(0, 3).map((emp, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                            <div>
                              <span className="text-xs font-semibold text-slate-800">{emp.name}</span>
                              <span className="text-xs text-slate-500 ml-2">({emp.department})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                emp.riskLevel === "KRİTİK" ? "bg-red-200 text-red-800" : "bg-orange-200 text-orange-800"
                              }`}>
                                {emp.riskLevel}
                              </span>
                              <span className="text-xs font-mono text-red-700">
                                Perf: {emp.performance.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {pipCandidates.length > 3 && (
                          <p className="text-xs text-red-600 mt-1">
                            +{pipCandidates.length - 3} kişi daha...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              {(() => {
                const deptStats: Record<string, { sum: number; count: number }> = filteredData
                  .filter((p) => (p.Performans || 0) > 0)
                  .reduce((acc, p) => {
                    const dept = p.Departman;
                    if (!acc[dept]) {
                      acc[dept] = { sum: 0, count: 0 };
                    }
                    acc[dept].sum += p.Performans || 0;
                    acc[dept].count += 1;
                    return acc;
                  }, {} as Record<string, { sum: number; count: number }>);

                const deptAverages = Object.entries(deptStats).map(([dept, stats]) => ({
                  dept,
                  avg: stats.sum / stats.count,
                }));

                if (deptAverages.length > 0) {
                  const worst = deptAverages.reduce((min, curr) =>
                    curr.avg < min.avg ? curr : min
                  );
                  if (worst.avg < TARGET_SCORE) {
                    return (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                        <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Odaklanılması Gereken</p>
                        <p className="text-sm font-semibold text-slate-800">{worst.dept}</p>
                        <p className="text-xs text-red-600 mt-1 font-mono">
                          {worst.avg.toFixed(1)}
                  </p>
                </div>
                    );
                  }
                }
                return null;
              })()}
                </div>
              </div>
            </div>
      )}

      {/* Tabs */}
      <div className="mb-4">
        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "border-b-2 border-indigo-600 text-indigo-600 font-semibold"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Özet
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "departments"
                ? "border-b-2 border-indigo-600 text-indigo-600 font-semibold"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Departman
          </button>
          <button
            onClick={() => setActiveTab("charts")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "charts"
                ? "border-b-2 border-indigo-600 text-indigo-600 font-semibold"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Grafikler
          </button>
          <button
            onClick={() => setActiveTab("competencies")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "competencies"
                ? "border-b-2 border-indigo-600 text-indigo-600 font-semibold"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Yetkinlik
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "performance"
                ? "border-b-2 border-indigo-600 text-indigo-600 font-semibold"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Performans
          </button>
        </div>
          </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab filteredData={filteredData} user={user} />
        )}
        {activeTab === "departments" && (
          <DepartmentsTab filteredData={filteredData} />
        )}
        {activeTab === "charts" && <ChartsTab filteredData={filteredData} />}
        {activeTab === "competencies" && (
          <CompetenciesTab
            filteredData={filteredData}
            user={user}
            selectedPersonFromQuery={selectedPersonFromQuery}
          />
        )}
        {activeTab === "performance" && (
          <PerformanceTab filteredData={filteredData} />
        )}
      </div>
    </motion.div>
  );
}

// Overview Tab Component
function OverviewTab({ filteredData, user }: { filteredData: OrgChartEntry[]; user: any }) {
  const top10 = useMemo(() => {
    return filteredData
      .map((p) => {
        const perf = toScore(p.Performans);
        const pot = toScore(p.Potansiyel);
        return {
          ...p,
          Score: perf !== null && pot !== null ? perf + pot : null,
        };
      })
      .sort((a, b) => {
        const aScore = typeof a.Score === "number" ? a.Score : -Infinity;
        const bScore = typeof b.Score === "number" ? b.Score : -Infinity;
        return bScore - aScore;
      })
      .slice(0, 10)
      .filter((p) => p.Score > 0);
  }, [filteredData]);

  const riskList = useMemo(() => {
    return filteredData
      .filter((p) => (p.Performans || 0) > 0 && (p.Performans || 0) < 3.5)
      .sort((a, b) => (a.Performans || 0) - (b.Performans || 0))
      .slice(0, 10); // En fazla 10 kişi göster
  }, [filteredData]);

  // Performans analizi metrikleri
  const performanceStats = useMemo(() => {
    const active = filteredData.filter((p) => (p.Performans || 0) > 0);
    if (active.length === 0) {
      return {
        avg: 0,
        median: 0,
        min: 0,
        max: 0,
        excellent: 0, // >= 4.5
        good: 0, // 4.0 - 4.4
        average: 0, // 3.0 - 3.9
        below: 0, // < 3.0
        distribution: []
      };
    }

    const performances = active.map((p) => p.Performans || 0).sort((a, b) => a - b);
    const avg = performances.reduce((a, b) => a + b, 0) / performances.length;
    const median = performances[Math.floor(performances.length / 2)];
    const min = performances[0];
    const max = performances[performances.length - 1];

    const excellent = active.filter((p) => (p.Performans || 0) >= 4.5).length;
    const good = active.filter((p) => {
      const perf = p.Performans || 0;
      return perf >= 4.0 && perf < 4.5;
    }).length;
    const average = active.filter((p) => {
      const perf = p.Performans || 0;
      return perf >= 3.0 && perf < 4.0;
    }).length;
    const below = active.filter((p) => (p.Performans || 0) < 3.0).length;

    // Dağılım için histogram (0-5 arası 0.5'lik gruplar)
    const distribution = Array.from({ length: 10 }, (_, i) => {
      const minVal = i * 0.5;
      const maxVal = (i + 1) * 0.5;
      const count = active.filter((p) => {
        const perf = p.Performans || 0;
        return perf >= minVal && perf < maxVal;
      }).length;
      return { range: `${minVal.toFixed(1)}-${maxVal.toFixed(1)}`, count, value: (minVal + maxVal) / 2 };
    });

    return { avg, median, min, max, excellent, good, average, below, distribution };
  }, [filteredData]);

  return (
    <div className="space-y-4">
      {/* Performans Analizi Bölümü */}
      <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
        <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Performans Analizi
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 font-medium mb-1">Ortalama</p>
              <p className="text-2xl font-bold text-green-800">{performanceStats.avg.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 font-medium mb-1">Medyan</p>
              <p className="text-2xl font-bold text-blue-800">{performanceStats.median.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-700 font-medium mb-1">Minimum</p>
              <p className="text-2xl font-bold text-purple-800">{performanceStats.min.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200">
              <p className="text-xs text-orange-700 font-medium mb-1">Maksimum</p>
              <p className="text-2xl font-bold text-orange-800">{performanceStats.max.toFixed(1)}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700 font-medium">Mükemmel (≥4.5)</span>
                <span className="text-lg font-bold text-green-800">{performanceStats.excellent}</span>
              </div>
              <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(performanceStats.excellent / filteredData.filter(p => (p.Performans || 0) > 0).length) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700 font-medium">İyi (4.0-4.4)</span>
                <span className="text-lg font-bold text-blue-800">{performanceStats.good}</span>
              </div>
              <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(performanceStats.good / filteredData.filter(p => (p.Performans || 0) > 0).length) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-700 font-medium">Orta (3.0-3.9)</span>
                <span className="text-lg font-bold text-yellow-800">{performanceStats.average}</span>
              </div>
              <div className="mt-2 h-2 bg-yellow-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 rounded-full transition-all"
                  style={{ width: `${(performanceStats.average / filteredData.filter(p => (p.Performans || 0) > 0).length) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-700 font-medium">Düşük (&lt;3.0)</span>
                <span className="text-lg font-bold text-red-800">{performanceStats.below}</span>
              </div>
              <div className="mt-2 h-2 bg-red-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${(performanceStats.below / filteredData.filter(p => (p.Performans || 0) > 0).length) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Performans Dağılım Grafiği */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Performans Dağılımı</h4>
            <div className="flex items-end gap-1 h-32">
              {performanceStats.distribution.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                    <div
                      className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                      style={{ 
                        height: `${(item.count / Math.max(...performanceStats.distribution.map(d => d.count), 1)) * 100}%`,
                        minHeight: item.count > 0 ? '4px' : '0px'
                      }}
                      title={`${item.range}: ${item.count} kişi`}
                    ></div>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 text-center leading-tight">{item.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
          <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Top 10 Yetenek
            </h3>
          </div>
          {top10.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Ad Soyad</th>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Departman</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Perf.</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Pot.</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((p, idx) => (
                    <tr key={idx} className="border-b border-indigo-50 hover:bg-indigo-50/30 hover:border-l-2 hover:border-indigo-500 transition-all duration-200">
                      <td className="px-3 py-2 text-sm text-slate-800">{p["Ad Soyad"]}</td>
                      <td className="px-3 py-2 text-sm text-slate-600">{p.Departman}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${
                            (p.Performans || 0) >= 4 ? "text-green-700" :
                            (p.Performans || 0) >= 3 ? "text-yellow-700" :
                            "text-red-700"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              (p.Performans || 0) >= 4 ? "bg-green-500" :
                              (p.Performans || 0) >= 3 ? "bg-yellow-500" :
                              "bg-red-500"
                            }`}></span>
                            {formatScore(p.Performans)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${
                          (p.Potansiyel || 0) >= 4 ? "text-green-700" :
                          (p.Potansiyel || 0) >= 3 ? "text-yellow-700" :
                          "text-red-700"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            (p.Potansiyel || 0) >= 4 ? "bg-green-500" :
                            (p.Potansiyel || 0) >= 3 ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}></span>
                          {formatScore(p.Potansiyel)}
                        </span>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-xs p-4">Yeterli veri yok.</p>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
          <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Riskli Grup (Top 10)
            </h3>
          </div>
          {riskList.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Ad Soyad</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Departman</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Perf.</th>
                      <th className="text-center px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">PIP Durumu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskList.map((p, idx) => {
                      const perf = p.Performans || 0;
                      const needsPIP = perf < 3.0;
                      const isCritical = perf < 2.5;
                      return (
                        <tr key={idx} className="border-b border-indigo-50 hover:bg-indigo-50/30 hover:border-l-2 hover:border-indigo-500 transition-all duration-200">
                          <td className="px-3 py-2 text-sm text-slate-800">{p["Ad Soyad"]}</td>
                          <td className="px-3 py-2 text-sm text-slate-600">{p.Departman}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-red-700">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              {perf.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {needsPIP ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                isCritical 
                                  ? "bg-red-200 text-red-800" 
                                  : "bg-orange-200 text-orange-800"
                              }`}>
                                {isCritical ? "🚨 KRİTİK" : "⚠️ PIP Gerekli"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-500">
                                İzleme
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 text-xs">Riskli personel bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>

      {/* Yaklaşan Doğum Günleri Widget */}
      <details className="mb-4" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 px-1 py-2">
          Yaklaşan Doğum Günleri
        </summary>
        <UpcomingBirthdaysWidget user={user} />
      </details>

      <details className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <summary className="cursor-pointer px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800">
          Tüm Personel Listesi
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Ad Soyad</th>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Departman</th>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Pozisyon</th>
                <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Performans</th>
                <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Potansiyel</th>
                <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Maaş (TL)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((p, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm text-slate-800">{p["Ad Soyad"]}</td>
                  <td className="px-3 py-2 text-sm text-slate-600">{p.Departman}</td>
                  <td className="px-3 py-2 text-sm text-slate-600">{p.Pozisyon}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${
                      (p.Performans || 0) >= 4 ? "bg-green-100 text-green-700" :
                      (p.Performans || 0) >= 3 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {formatScore(p.Performans)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${
                      (p.Potansiyel || 0) >= 4 ? "bg-green-100 text-green-700" :
                      (p.Potansiyel || 0) >= 3 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {formatScore(p.Potansiyel)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-slate-600 font-mono">
                    {p["Maaş (TL)"]?.toLocaleString("tr-TR") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// Departments Tab Component
function DepartmentsTab({ filteredData }: { filteredData: OrgChartEntry[] }) {
  const deptStats = useMemo(() => {
    const stats = filteredData
      .filter((p) => (p.Performans || 0) > 0)
      .reduce((acc, p) => {
        const dept = p.Departman;
        if (!acc[dept]) {
          acc[dept] = { perfSum: 0, potSum: 0, count: 0 };
        }
        acc[dept].perfSum += p.Performans || 0;
        acc[dept].potSum += p.Potansiyel || 0;
        acc[dept].count += 1;
        return acc;
      }, {} as Record<string, { perfSum: number; potSum: number; count: number }>);

    return Object.entries(stats).map(([dept, data]) => ({
      Departman: dept,
      Performans: data.perfSum / data.count,
      Potansiyel: data.potSum / data.count,
    }));
  }, [filteredData]);

  const barData = deptStats.map((d) => ({
    name: d.Departman,
    value: d.Performans,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Departman Bazlı Performans
          </h3>
        </div>
        <div className="p-4">
        {deptStats.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "white", 
                    border: "1px solid #e5e7eb", 
                    borderRadius: "6px",
                    fontSize: "12px",
                    padding: "8px"
                  }}
                />
                <ReferenceLine y={TARGET_SCORE} stroke="#6b7280" strokeDasharray="3 3" />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.value >= TARGET_SCORE
                          ? "#22c55e"
                          : entry.value >= TARGET_SCORE - 0.5
                          ? "#eab308"
                          : "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Departman</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Performans</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Potansiyel</th>
                  </tr>
                </thead>
                <tbody>
                  {deptStats
                    .sort((a, b) => b.Performans - a.Performans)
                    .map((d, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-100 hover:bg-slate-50 ${
                          d.Performans === Math.max(...deptStats.map((s) => s.Performans))
                            ? "bg-green-50"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-sm text-slate-800 font-medium">{d.Departman}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${
                            d.Performans >= TARGET_SCORE ? "bg-green-100 text-green-700" :
                            d.Performans >= TARGET_SCORE - 0.5 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {d.Performans.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${
                            d.Potansiyel >= 4 ? "bg-green-100 text-green-700" :
                            d.Potansiyel >= 3 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {d.Potansiyel.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
          </div>
        </>
        ) : (
          <p className="text-slate-500 text-xs p-4">Grafik için yeterli veri yok.</p>
        )}
        </div>
      </div>
    </div>
  );
}

// Charts Tab Component
function ChartsTab({ filteredData }: { filteredData: OrgChartEntry[] }) {
  const plotData = useMemo(() => {
    return filteredData
      .filter((p) => (p.Performans || 0) > 0)
      .map((p) => ({
        name: p["Ad Soyad"],
        Performans: p.Performans || 0,
        Potansiyel: p.Potansiyel || 0,
        Departman: p.Departman,
        Maaş: p["Maaş (TL)"] || 0,
      }));
  }, [filteredData]);

  const pieData = useMemo(() => {
    const categories = {
      "Yüksek (Yıldız)": 0,
      "Orta (Standart)": 0,
      "Düşük (Risk)": 0,
      "Veri Yok": 0,
    };

    filteredData.forEach((p) => {
      const perf = p.Performans || 0;
      if (perf === 0) {
        categories["Veri Yok"]++;
      } else if (perf < 3.5) {
        categories["Düşük (Risk)"]++;
      } else if (perf < 4.5) {
        categories["Orta (Standart)"]++;
      } else {
        categories["Yüksek (Yıldız)"]++;
      }
    });

    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const COLORS = {
    "Yüksek (Yıldız)": "#4CAF50",
    "Orta (Standart)": "#FFC107",
    "Düşük (Risk)": "#F44336",
    "Veri Yok": "#9E9E9E",
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
          <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Talent Matrix
            </h3>
          </div>
          <div className="p-4">
          {plotData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  dataKey="Performans"
                  name="Performans"
                  domain={[0.5, 5.5]}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="Potansiyel"
                  name="Potansiyel"
                  domain={[0.5, 5.5]}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ 
                    backgroundColor: "white", 
                    border: "1px solid #e5e7eb", 
                    borderRadius: "6px",
                    fontSize: "12px",
                    padding: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div>
                          <p className="font-semibold text-slate-800 text-xs mb-1">{data.name}</p>
                          <p className="text-xs text-slate-600">
                            Performans: <span className="font-mono">{data.Performans.toFixed(1)}</span>
                          </p>
                          <p className="text-xs text-slate-600">
                            Potansiyel: <span className="font-mono">{data.Potansiyel.toFixed(1)}</span>
                          </p>
                          <p className="text-xs text-slate-500">{data.Departman}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={3.0} stroke="#9ca3af" strokeDasharray="3 3" />
                <ReferenceLine x={4.0} stroke="#9ca3af" strokeDasharray="3 3" />
                <ReferenceLine y={3.0} stroke="#9ca3af" strokeDasharray="3 3" />
                <ReferenceLine y={4.0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Scatter name="Personel" data={plotData} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-xs p-4">Grafik için yeterli veri yok.</p>
          )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
          <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Maaş vs Performans
            </h3>
          </div>
          <div className="p-4">
          {plotData.length > 0 && plotData.some((p) => p.Maaş > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" dataKey="Performans" name="Performans" domain={[0, 5]} tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="Maaş" name="Maaş (TL)" tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ 
                    backgroundColor: "white", 
                    border: "1px solid #e5e7eb", 
                    borderRadius: "6px",
                    fontSize: "12px",
                    padding: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div>
                          <p className="font-semibold text-slate-800 text-xs mb-1">{data.name}</p>
                          <p className="text-xs text-slate-600">
                            Performans: <span className="font-mono">{data.Performans.toFixed(1)}</span>
                          </p>
                          <p className="text-xs text-slate-600">
                            Maaş: <span className="font-mono">{data.Maaş.toLocaleString("tr-TR")} ₺</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Personel" data={plotData} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 text-xs">
                Maaş verisi olmadığı için bu grafik gösterilemiyor.
              </p>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">Performans Dağılımı</h3>
        </div>
        <div className="p-4">
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name as keyof typeof COLORS] || "#8884d8"}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "white", 
                  border: "1px solid #e5e7eb", 
                  borderRadius: "6px",
                  fontSize: "12px",
                  padding: "8px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-xs p-4">Grafik için yeterli veri yok.</p>
        )}
        </div>
      </div>
    </div>
  );
}

// Competencies Tab Component
function CompetenciesTab({
  filteredData,
  user,
  selectedPersonFromQuery,
}: {
  filteredData: OrgChartEntry[];
  user: any;
  selectedPersonFromQuery: OrgChartEntry | null;
}) {
  // Get competency columns
  const compCols = useMemo(() => {
    const cols: string[] = [];
    Object.keys(COMPETENCIES_360).forEach((code) => {
      const colMgr = `${code}_Mgr`;
      // Veri yapısında _Mgr kolonu var mı kontrol et
      const hasMgrCol = filteredData.some((p) => {
        const val = p[colMgr];
        return val !== undefined && val !== null && val !== '';
      });
      
      // Eğer _Mgr kolonu yoksa, alternatif kolonları kontrol et
      if (!hasMgrCol) {
        const hasTestCol = filteredData.some((p) => {
          const val = p[`${code}_Test`] || p[code];
          return val !== undefined && val !== null && val !== '';
        });
        if (hasTestCol) {
          // Test kolonu varsa, _Mgr kolonunu ekle (fallback olarak test değerlerini kullanacağız)
          cols.push(colMgr);
        }
      } else {
        cols.push(colMgr);
      }
    });
    
    // Eğer hiç kolon bulunamadıysa, tüm yetkinlikleri ekle (fallback için)
    if (cols.length === 0 && filteredData.length > 0) {
      console.warn("No competency columns found, using all competencies as fallback");
      Object.keys(COMPETENCIES_360).forEach((code) => {
        cols.push(`${code}_Mgr`);
      });
    }
    
    return cols;
  }, [filteredData]);

  const renameMap = useMemo(() => {
    const map: Record<string, string> = {};
    compCols.forEach((col) => {
      const code = col.replace("_Mgr", "");
      map[col] = COMPETENCIES_360[code] || code;
    });
    return map;
  }, [compCols]);


  // Helper: Get target scores for a position from JOB_PROFILES
  const getTargetScoresForPosition = (positionName: string): Record<string, number> => {
    // Yetkinlik isimlerini kodlara çevirmek için ters mapping
    const nameToCode: Record<string, string> = {};
    Object.entries(COMPETENCIES_360).forEach(([code, name]) => {
      nameToCode[name] = code;
    });

    // 1. Tam eşleşme
    if (positionName in JOB_PROFILES) {
      const profile = JOB_PROFILES[positionName];
      const targets: Record<string, number> = {};
      Object.entries(profile).forEach(([compName, score]) => {
        const code = nameToCode[compName];
        if (code) {
          targets[code] = score;
        }
      });
      return targets;
    }

    // 2. Kısmi eşleşme
    for (const [profileName, profile] of Object.entries(JOB_PROFILES)) {
      if (profileName.includes(positionName) || positionName.includes(profileName)) {
        const targets: Record<string, number> = {};
        Object.entries(profile).forEach(([compName, score]) => {
          const code = nameToCode[compName];
          if (code) {
            targets[code] = score;
          }
        });
        return targets;
      }
    }

    // 3. Varsayılan (son profil)
    const defaultKey = Object.keys(JOB_PROFILES)[Object.keys(JOB_PROFILES).length - 1];
    const defaultProfile = JOB_PROFILES[defaultKey];
    const targets: Record<string, number> = {};
    Object.entries(defaultProfile).forEach(([compName, score]) => {
      const code = nameToCode[compName];
      if (code) {
        targets[code] = score;
      }
    });
    return targets;
  };

  // Calculate 3-layer radar data: Target, Manager (360°), Current (Test)
  const radarData = useMemo(() => {
    if (compCols.length === 0) {
      console.warn("Competency columns not found in data");
      return [];
    }
    
    console.log("CompCols:", compCols);
    console.log("FilteredData sample:", filteredData.slice(0, 2));

    // Manager scores (360°) - from _Mgr columns
    const managerSums = compCols.map(() => 0);

    // Test scores - from test columns (if available) or use manager scores as fallback
    const testSums = compCols.map(() => 0);

    // Target scores - calculate weighted average based on positions
    const targetSums = compCols.map(() => 0);
    const targetCounts = compCols.map(() => 0);

    filteredData.forEach((p) => {
      // Get target scores for this person's position
      const position = p.Pozisyon || "";
      const personTargets = getTargetScoresForPosition(position);

      compCols.forEach((col, idx) => {
        const code = col.replace("_Mgr", "");
        let managerVal = p[col];
        
        // Eğer _Mgr kolonu yoksa, manager_scores objesinden çek
        if ((managerVal === undefined || managerVal === null || managerVal === '') && p.manager_scores && typeof p.manager_scores === 'object') {
          managerVal = p.manager_scores[code] || null;
        }
        
        // Test puanı için farklı kolon isimlerini dene
        let testVal = p[`${code}_Test`] || p[`${code}`] || p[code] || null;
        
        // Eğer test puanı yoksa, scores objesinden çek
        if ((testVal === undefined || testVal === null || testVal === '') && p.scores && typeof p.scores === 'object') {
          testVal = p.scores[code] || null;
        }
        
        const targetVal = personTargets[code] || TARGET_SCORE; // Pozisyon bazlı hedef, yoksa varsayılan

        // Manager puanı kontrolü - string olarak gelebilir, Number() ile dönüştür
        if (managerVal !== undefined && managerVal !== null && managerVal !== '') {
          const numVal = toScore(managerVal);
          if (numVal !== null && numVal >= 0.1 && numVal <= 5) {
            managerSums[idx] += numVal;
          }
        }

        // Test puanı kontrolü - string olarak gelebilir
        if (testVal !== undefined && testVal !== null && testVal !== '') {
          const numVal = toScore(testVal);
          if (numVal !== null && numVal >= 0.1 && numVal <= 5) {
            testSums[idx] += numVal;
          }
        }

        // Target scores - weighted by position
        if (targetVal !== undefined && targetVal !== null) {
          targetSums[idx] += Number(targetVal);
          targetCounts[idx]++;
        }
      });
    });

    // Manager counts - her yetkinlik için ayrı ayrı say
    const managerCounts = compCols.map(() => 0);
    filteredData.forEach((p) => {
      compCols.forEach((col, idx) => {
        const code = col.replace("_Mgr", "");
        let managerVal = p[col];
        
        // Eğer _Mgr kolonu yoksa, manager_scores objesinden çek
        if ((managerVal === undefined || managerVal === null || managerVal === '') && p.manager_scores && typeof p.manager_scores === 'object') {
          managerVal = p.manager_scores[code] || null;
        }
        
        if (managerVal !== undefined && managerVal !== null && managerVal !== '') {
          const numVal = toScore(managerVal);
          if (numVal !== null && numVal >= 0.1 && numVal <= 5) {
            managerCounts[idx]++;
          }
        }
      });
    });
    
    console.log("Manager counts:", managerCounts);
    console.log("Manager sums:", managerSums);
    
    // Test counts - her yetkinlik için ayrı ayrı say
    const testCounts = compCols.map(() => 0);
    filteredData.forEach((p) => {
      compCols.forEach((col, idx) => {
        const code = col.replace("_Mgr", "");
        let testVal = p[`${code}_Test`] || p[`${code}`] || p[code] || null;
        
        // Eğer test puanı yoksa, scores objesinden çek
        if ((testVal === undefined || testVal === null || testVal === '') && p.scores && typeof p.scores === 'object') {
          testVal = p.scores[code] || null;
        }
        
        if (testVal !== undefined && testVal !== null && testVal !== '') {
          const numVal = toScore(testVal);
          if (numVal !== null && numVal >= 0.1 && numVal <= 5) {
            testCounts[idx]++;
          }
        }
      });
    });
    
    console.log("Test counts:", testCounts);
    console.log("Test sums:", testSums);
    
    // Manager averages
    const managerAvgs = managerSums.map((sum, idx) => {
      if (managerCounts[idx] > 0) {
        const avg = sum / managerCounts[idx];
        return avg;
      }
      // Manager puanı yoksa, test puanlarını kullan (fallback)
      return testCounts[idx] > 0 ? testSums[idx] / testCounts[idx] : TARGET_SCORE;
    });
    
    console.log("Manager averages:", managerAvgs);
    
    const testAvgs = testSums.map((sum, idx) => {
      if (testCounts[idx] > 0) {
        return sum / testCounts[idx];
      }
      // Test puanı yoksa, manager puanlarını kullan (fallback)
      return managerCounts[idx] > 0 ? managerSums[idx] / managerCounts[idx] : TARGET_SCORE;
    });
    
    // Target averages - weighted average of position-based targets
    const targetAvgs = targetSums.map((sum, idx) => 
      targetCounts[idx] > 0 ? sum / targetCounts[idx] : TARGET_SCORE
    );

    // Create radar data with 3 layers
    const result = compCols.map((col, idx) => {
      const managerVal = managerAvgs[idx] || 0;
      const currentVal = testAvgs[idx] || 0;
      const targetVal = targetAvgs[idx] || TARGET_SCORE;
      
      return {
        subject: renameMap[col],
        A: currentVal,      // Mevcut (Test) - her yetkinlik için ayrı hesaplanmış
        B: managerVal,      // Yönetici (360°) - her yetkinlik için ayrı hesaplanmış
        C: targetVal,       // Hedef (Rol) - pozisyon bazlı ortalama
        fullMark: 5,
      };
    });
    
    console.log("Radar data result:", result);
    return result;
  }, [filteredData, compCols, renameMap]);

  // Department breakdown
  const deptCompData = useMemo(() => {
    if (compCols.length === 0) return [];

    const deptStats: Record<string, Record<string, { sum: number; count: number }>> = {};

    filteredData.forEach((p) => {
      const dept = p.Departman;
      if (!dept) return; // Departman yoksa atla
      
      if (!deptStats[dept]) {
        deptStats[dept] = {};
        compCols.forEach((col) => {
          deptStats[dept][col] = { sum: 0, count: 0 };
        });
      }

      compCols.forEach((col) => {
        // Önce _Mgr kolonunu kontrol et
        let val = p[col];
        
        // Eğer _Mgr kolonu yoksa, manager_scores objesinden çek
        if ((val === undefined || val === null || val === '') && col.includes('_Mgr')) {
          const code = col.replace("_Mgr", "");
          
          // manager_scores objesi varsa ondan çek
          if (p.manager_scores && typeof p.manager_scores === 'object') {
            val = p.manager_scores[code] || null;
          }
          
          // Hala yoksa, alternatif kolonları dene
          if (val === undefined || val === null || val === '') {
            val = p[`${code}_Test`] || p[`${code}`] || p[code] || null;
          }
          
          // Eğer test puanı yoksa, scores objesinden çek (fallback)
          if ((val === undefined || val === null || val === '') && p.scores && typeof p.scores === 'object') {
            val = p.scores[code] || null;
          }
        }
        
        // Değer kontrolü - sadece geçerli sayısal değerleri kabul et
        if (val !== undefined && val !== null && val !== '') {
          const numVal = toScore(val);
          // 0 dahil değil, sadece 0.1-5.0 arası değerleri kabul et
          if (numVal !== null && numVal >= 0.1 && numVal <= 5) {
            deptStats[dept][col].sum += numVal;
            deptStats[dept][col].count += 1;
          }
        }
      });
    });

    return Object.entries(deptStats).map(([dept, stats]) => {
      const row: any = { Departman: dept, __counts: {} as Record<string, number> };
      compCols.forEach((col) => {
        const stat = stats[col];
        const label = renameMap[col];
        row[label] = stat.count > 0 ? (stat.sum / stat.count) : null;
        row.__counts[label] = stat.count;
      });
      return row;
    });
  }, [filteredData, compCols, renameMap]);

  const deptScoreAverages = useMemo(() => {
    const stats: Record<
      string,
      {
        testSum: number;
        testCount: number;
        managerSum: number;
        managerCount: number;
        positionSum: number;
        positionCount: number;
      }
    > = {};
    filteredData.forEach((p) => {
      const dept = p.Departman;
      if (!dept) return;
      if (!stats[dept]) {
        stats[dept] = {
          testSum: 0,
          testCount: 0,
          managerSum: 0,
          managerCount: 0,
          positionSum: 0,
          positionCount: 0,
        };
      }
      const testScore = toScore(p.test_score);
      if (testScore !== null) {
        stats[dept].testSum += testScore;
        stats[dept].testCount += 1;
      }
      const managerScore = toScore(p.manager_score);
      if (managerScore !== null) {
        stats[dept].managerSum += managerScore;
        stats[dept].managerCount += 1;
      }
      const positionScore = toScore(p.position_competency_score ?? p.targetCompetencyScore);
      if (positionScore !== null) {
        stats[dept].positionSum += positionScore;
        stats[dept].positionCount += 1;
      }
    });

    return Object.entries(stats).reduce((acc, [dept, stat]) => {
      acc[dept] = {
        testAvg: stat.testCount > 0 ? stat.testSum / stat.testCount : null,
        managerAvg: stat.managerCount > 0 ? stat.managerSum / stat.managerCount : null,
        positionAvg: stat.positionCount > 0 ? stat.positionSum / stat.positionCount : null,
      };
      return acc;
    }, {} as Record<string, { testAvg: number | null; managerAvg: number | null; positionAvg: number | null }>);
  }, [filteredData]);

  // Person details
  const personData = useMemo(() => {
    const cols = ["Ad Soyad", "Departman", ...compCols];
    return filteredData.map((p) => {
      const deptAverages = deptScoreAverages[p.Departman] || {
        testAvg: null,
        managerAvg: null,
        positionAvg: null,
      };
      const row: any = {
        "Ad Soyad": p["Ad Soyad"],
        Departman: p.Departman,
        __dqi_test_score: p.test_score ?? null,
        __dqi_manager_score: p.manager_score ?? null,
        __dqi_position_score: p.position_competency_score ?? p.targetCompetencyScore ?? null,
        __dqi_employee_id: p.id ?? null,
        __dept_avg_test: deptAverages.testAvg,
        __dept_avg_manager: deptAverages.managerAvg,
        __dept_avg_position: deptAverages.positionAvg,
      };
      compCols.forEach((col) => {
        const code = col.replace("_Mgr", "");
        let val = p[col];
        
        // Eğer _Mgr kolonu yoksa, manager_scores objesinden çek
        if ((val === undefined || val === null || val === '') && col.includes('_Mgr')) {
          if (p.manager_scores && typeof p.manager_scores === 'object') {
            val = p.manager_scores[code] || null;
          }
          
          // Hala yoksa, alternatif kolonları dene
          if (val === undefined || val === null || val === '') {
            val = p[`${code}_Test`] || p[`${code}`] || p[code] || null;
          }
          
          // Eğer test puanı yoksa, scores objesinden çek
          if ((val === undefined || val === null || val === '') && p.scores && typeof p.scores === 'object') {
            val = p.scores[code] || null;
          }
        }
        
        // Değeri sayıya dönüştür
        const numVal = toScore(val);
        
        // Geçerli sayısal değer kontrolü
        row[renameMap[col]] = (numVal !== null && numVal >= 0.1 && numVal <= 5) ? numVal : null;
      });
      return row;
    });
  }, [filteredData, compCols, renameMap, deptScoreAverages]);

  if (compCols.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <p className="text-yellow-800">Henüz yetkinlik verisi oluşmamış.</p>
      </div>
    );
  }

  // Close the radar chart (connect first and last point)
  const closedRadarData = useMemo(() => {
    if (radarData.length === 0) return [];
    return [...radarData, { ...radarData[0] }];
  }, [radarData]);

  return (
    <div className="space-y-4">
      <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-2xl shadow-xl shadow-indigo-100/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-violet-50/80 to-purple-50/80">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Genel Yetkinlik Radarı
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 rounded-full border border-indigo-100">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="font-medium text-slate-700">Hedef (Rol)</span>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 rounded-full border border-indigo-100">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="font-medium text-slate-700">Yönetici (360°)</span>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 rounded-full border border-indigo-100">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="font-medium text-slate-700">Mevcut (Test)</span>
              </span>
            </div>
          </div>
        </div>
        <div className="p-6 bg-gradient-to-br from-white via-indigo-50/20 to-violet-50/20">
        {closedRadarData.length > 1 ? (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={closedRadarData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <PolarGrid 
                stroke="#E5E7EB" 
                strokeWidth={1}
                strokeDasharray="3 3"
                radialLines={true}
              />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ 
                  fontSize: 11, 
                  fill: '#6B7280',
                  fontWeight: 500,
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
                tickLine={false}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 5]} 
                tick={{ 
                  fontSize: 10, 
                  fill: '#9CA3AF',
                  fontWeight: 400
                }}
                tickCount={6}
                axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              />
              {/* HEDEF (Rol) - Kırmızı, en arkada */}
              <Radar
                name="Hedef (Rol)"
                dataKey="C"
                stroke="#EF4444"
                fill="#EF4444"
                fillOpacity={0.12}
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
              {/* YÖNETİCİ (360°) - Turuncu, ortada */}
              <Radar
                name="Yönetici (360°)"
                dataKey="B"
                stroke="#F97316"
                fill="#F97316"
                fillOpacity={0.22}
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#F97316', strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={true}
                animationDuration={700}
                animationEasing="ease-out"
              />
              {/* MEVCUT (Test) - Mavi, en önde */}
              <Radar
                name="Mevcut (Test)"
                dataKey="A"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.35}
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '20px',
                  fontSize: '12px',
                  fontWeight: 500
                }}
                iconType="circle"
                formatter={(value) => <span className="text-slate-700">{value}</span>}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.98)", 
                  border: "1px solid #E5E7EB", 
                  borderRadius: "12px",
                  fontSize: "12px",
                  padding: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  backdropFilter: "blur(8px)"
                }}
                formatter={(value: any, name?: string) => {
                  return [`${formatScore(value)} / 5.0`, name || ''];
                }}
                labelStyle={{ 
                  fontWeight: 600, 
                  color: '#1F2937',
                  marginBottom: '4px',
                  fontSize: '13px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-slate-500 text-sm">Grafik için yeterli veri yok.</p>
          </div>
        )}
        </div>
      </div>

      {deptCompData.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
          <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Departman Bazlı Yetkinlik
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Departman</th>
                  {Object.values(renameMap).map((name) => (
                    <th key={name} className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptCompData.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-sm text-slate-800 font-medium">{row.Departman}</td>
                    {Object.values(renameMap).map((name) => {
                      const score = row[name];
                      const count = row.__counts?.[name] ?? 0;
                      const hasData = typeof score === "number" && count > 0;
                      return (
                        <td key={name} className="px-3 py-2 text-right">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${
                            !hasData ? "bg-slate-100 text-slate-500" :
                            score >= 4 ? "bg-green-100 text-green-700" :
                            score >= 3 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {hasData ? formatScore(score) : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Kişi Bazlı Yetkinlik Detayı
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Ad Soyad</th>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Departman</th>
                {Object.values(renameMap).map((name) => (
                  <th key={name} className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personData.map((row, idx) => {
                const isQuerySelected = selectedPersonFromQuery && row["Ad Soyad"] === selectedPersonFromQuery["Ad Soyad"];
                return (
                <tr
                  key={idx}
                  className={`border-b border-slate-100 hover:bg-slate-50 ${isQuerySelected ? "bg-indigo-50/40" : ""}`}
                  data-dqi-employee={row["Ad Soyad"]}
                  data-dqi-employee-id={row.__dqi_employee_id ?? ""}
                >
                  <td className="px-3 py-2 text-sm text-slate-800">
                    <div className="flex flex-col gap-1">
                      <span>{row["Ad Soyad"]}</span>
                      {isQuerySelected && (() => {
                        const testScore = toScore(row.__dqi_test_score);
                        const managerScore = toScore(row.__dqi_manager_score);
                        const positionScore = toScore(row.__dqi_position_score);
                        const testCompare = formatDeptCompare(testScore, row.__dept_avg_test);
                        const managerCompare = formatDeptCompare(managerScore, row.__dept_avg_manager);
                        const positionCompare = formatDeptCompare(positionScore, row.__dept_avg_position);
                        const hasAny = testScore !== null || managerScore !== null || positionScore !== null;
                        if (!hasAny) return null;
                        return (
                          <div className="text-[10px] text-slate-500 space-y-1">
                            {testScore !== null && (
                              <div>
                                <span className="font-medium text-slate-600">Test:</span> {formatScore(testScore)}
                                {testCompare && (
                                  <div className="text-[10px] text-slate-400">{testCompare}</div>
                                )}
                              </div>
                            )}
                            {managerScore !== null && (
                              <div>
                                <span className="font-medium text-slate-600">Yönetici:</span> {formatScore(managerScore)}
                                {managerCompare && (
                                  <div className="text-[10px] text-slate-400">{managerCompare}</div>
                                )}
                              </div>
                            )}
                            {positionScore !== null && (
                              <div>
                                <span className="font-medium text-slate-600">Hedef:</span> {formatScore(positionScore)}
                                {positionCompare && (
                                  <div className="text-[10px] text-slate-400">{positionCompare}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <span className="sr-only" data-testid="dqi-selected-employee-name">{row["Ad Soyad"] ?? ""}</span>
                    <span className="sr-only" data-testid="dqi-selected-employee-id">{row.__dqi_employee_id ?? ""}</span>
                    <span className="sr-only" data-testid="dqi-test-score">{toScore(row.__dqi_test_score) ?? ""}</span>
                    <span className="sr-only" data-testid="dqi-manager-score">{toScore(row.__dqi_manager_score) ?? ""}</span>
                    <span className="sr-only" data-testid="dqi-position-score">{toScore(row.__dqi_position_score) ?? ""}</span>
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-600">{row.Departman}</td>
                  {Object.values(renameMap).map((name) => {
                    const score = toScore(row[name]);
                    // Trend oku için geçmiş veriyi kontrol et (gerçek uygulamada history'den gelir)
                    const hasIncrease = false; // Demo için, gerçekte history'den kontrol edilir
                    const increaseAmount = 0.2; // Demo değer
                    
                    return (
                      <td key={name} className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${
                            score === null ? "bg-slate-100 text-slate-500" :
                            score >= 4 ? "bg-green-100 text-green-700" :
                            score >= 3 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {formatScore(score)}
                          </span>
                          {hasIncrease && (
                            <span className="text-green-600 text-xs font-semibold" title={`Son değişiklik: +${increaseAmount.toFixed(1)}`}>
                              ⬆ <span className="text-[10px]">+{increaseAmount.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gelişim Günlüğü (Timeline) */}
      {user && user.name && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm mt-6">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Gelişim Tarihçesi
            </h3>
          </div>
          <CompetencyHistoryTimeline employeeName={(user as any).name || ""} />
        </div>
      )}
    </div>
  );
}

// Gelişim Günlüğü Component
function CompetencyHistoryTimeline({ employeeName }: { employeeName: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/competency/history/${encodeURIComponent(employeeName)}`
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Son 10 kaydı göster, tarihe göre sırala
            const sorted = (result.data || [])
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10);
            setHistory(sorted);
          }
        }
      } catch (error) {
        console.error("Gelişim geçmişi yükleme hatası:", error);
      } finally {
        setLoading(false);
      }
    };

    if (employeeName) {
      loadHistory();
    }
  }, [employeeName]);

  if (loading) {
    return (
      <div className="p-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm">
        Henüz gelişim kaydı bulunmuyor.
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
        
        {/* Timeline Items */}
        <div className="space-y-4">
          {history.map((entry, index) => {
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric"
            });
            const change = entry.change || 0;
            const isPositive = change > 0;

            return (
              <div key={entry.id || index} className="relative pl-12">
                {/* Timeline Dot */}
                <div className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 border-white ${
                  isPositive ? "bg-green-500" : "bg-red-500"
                }`} />
                
                {/* Content */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-800">
                        {dateStr}
                      </p>
                      <p className="text-sm text-slate-700 mt-1">
                        <strong>{entry.competency_name}</strong>: {entry.source_detail || entry.source}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-600">
                          Eski: <strong>{entry.old_score?.toFixed(1) || "N/A"}</strong>
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="text-xs text-slate-600">
                          Yeni: <strong>{entry.new_score?.toFixed(1) || "N/A"}</strong>
                        </span>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}>
                      {isPositive ? "⬆" : "⬇"} {Math.abs(change).toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Performance Tab Component
function PerformanceTab({ filteredData }: { filteredData: OrgChartEntry[] }) {
  // Genel performans istatistikleri
  const performanceStats = useMemo(() => {
    const active = filteredData.filter((p) => (p.Performans || 0) > 0);
    if (active.length === 0) {
      return {
        avg: 0,
        median: 0,
        min: 0,
        max: 0,
        excellent: 0,
        good: 0,
        average: 0,
        below: 0,
        distribution: []
      };
    }

    const performances = active.map((p) => p.Performans || 0).sort((a, b) => a - b);
    const avg = performances.reduce((a, b) => a + b, 0) / performances.length;
    const median = performances[Math.floor(performances.length / 2)];
    const min = performances[0];
    const max = performances[performances.length - 1];

    const excellent = active.filter((p) => (p.Performans || 0) >= 4.5).length;
    const good = active.filter((p) => {
      const perf = p.Performans || 0;
      return perf >= 4.0 && perf < 4.5;
    }).length;
    const average = active.filter((p) => {
      const perf = p.Performans || 0;
      return perf >= 3.0 && perf < 4.0;
    }).length;
    const below = active.filter((p) => (p.Performans || 0) < 3.0).length;

    const distribution = Array.from({ length: 10 }, (_, i) => {
      const minVal = i * 0.5;
      const maxVal = (i + 1) * 0.5;
      const count = active.filter((p) => {
        const perf = p.Performans || 0;
        return perf >= minVal && perf < maxVal;
      }).length;
      return { range: `${minVal.toFixed(1)}-${maxVal.toFixed(1)}`, count, value: (minVal + maxVal) / 2 };
    });

    return { avg, median, min, max, excellent, good, average, below, distribution };
  }, [filteredData]);

  // Departman bazlı performans analizi
  const departmentPerformance = useMemo(() => {
    const deptMap: Record<string, { sum: number; count: number; employees: OrgChartEntry[] }> = {};
    
    filteredData.forEach((p) => {
      const dept = p.Departman || "Belirsiz";
      const perf = p.Performans || 0;
      
      if (!deptMap[dept]) {
        deptMap[dept] = { sum: 0, count: 0, employees: [] };
      }
      
      if (perf > 0) {
        deptMap[dept].sum += perf;
        deptMap[dept].count++;
      }
      deptMap[dept].employees.push(p);
    });

    return Object.entries(deptMap)
      .map(([dept, data]) => ({
        department: dept,
        avgPerformance: data.count > 0 ? data.sum / data.count : 0,
        employeeCount: data.employees.length,
        activeCount: data.count,
        excellent: data.employees.filter((p) => (p.Performans || 0) >= 4.5).length,
        good: data.employees.filter((p) => {
          const perf = p.Performans || 0;
          return perf >= 4.0 && perf < 4.5;
        }).length,
        average: data.employees.filter((p) => {
          const perf = p.Performans || 0;
          return perf >= 3.0 && perf < 4.0;
        }).length,
        below: data.employees.filter((p) => (p.Performans || 0) < 3.0).length,
        employees: data.employees.sort((a, b) => (b.Performans || 0) - (a.Performans || 0))
      }))
      .sort((a, b) => b.avgPerformance - a.avgPerformance);
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Genel Performans Özeti */}
      <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
        <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Genel Performans Özeti
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 font-medium mb-1">Ortalama</p>
              <p className="text-2xl font-bold text-green-800">{performanceStats.avg.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 font-medium mb-1">Medyan</p>
              <p className="text-2xl font-bold text-blue-800">{performanceStats.median.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-700 font-medium mb-1">Minimum</p>
              <p className="text-2xl font-bold text-purple-800">{performanceStats.min.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200">
              <p className="text-xs text-orange-700 font-medium mb-1">Maksimum</p>
              <p className="text-2xl font-bold text-orange-800">{performanceStats.max.toFixed(1)}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-green-700 font-medium">Mükemmel (≥4.5)</span>
                <span className="text-lg font-bold text-green-800">{performanceStats.excellent}</span>
              </div>
              <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(performanceStats.excellent / filteredData.filter(p => (p.Performans || 0) > 0).length) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-blue-700 font-medium">İyi (4.0-4.4)</span>
                <span className="text-lg font-bold text-blue-800">{performanceStats.good}</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(performanceStats.good / filteredData.filter(p => (p.Performans || 0) > 0).length) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-yellow-700 font-medium">Orta (3.0-3.9)</span>
                <span className="text-lg font-bold text-yellow-800">{performanceStats.average}</span>
              </div>
              <div className="h-2 bg-yellow-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 rounded-full transition-all"
                  style={{ width: `${(performanceStats.average / filteredData.filter(p => (p.Performans || 0) > 0).length) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-red-700 font-medium">Düşük (&lt;3.0)</span>
                <span className="text-lg font-bold text-red-800">{performanceStats.below}</span>
              </div>
              <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${(performanceStats.below / filteredData.filter(p => (p.Performans || 0) > 0).length) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Departman Bazlı Performans */}
      <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
        <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Departman Bazlı Performans Analizi
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Departman</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Ort. Perf.</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Personel</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Mükemmel</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">İyi</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Orta</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Düşük</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Durum</th>
              </tr>
            </thead>
            <tbody>
              {departmentPerformance.map((dept, idx) => (
                <tr key={idx} className="border-b border-indigo-50 hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-800 font-medium">{dept.department}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-bold ${
                      dept.avgPerformance >= 4.5 ? "bg-green-100 text-green-700" :
                      dept.avgPerformance >= 4.0 ? "bg-blue-100 text-blue-700" :
                      dept.avgPerformance >= 3.5 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {dept.avgPerformance.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">{dept.employeeCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-green-700">{dept.excellent}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-blue-700">{dept.good}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-yellow-700">{dept.average}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-red-700">{dept.below}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                      dept.avgPerformance >= TARGET_SCORE ? "bg-green-100 text-green-800" :
                      dept.avgPerformance >= TARGET_SCORE - 0.5 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {dept.avgPerformance >= TARGET_SCORE ? "✓ Hedef Üstü" :
                       dept.avgPerformance >= TARGET_SCORE - 0.5 ? "⚠ Yakın" :
                       "⚠ Hedef Altı"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kişi Bazlı Performans Detayı */}
      <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20">
        <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Kişi Bazlı Performans Detayı
          </h3>
        </div>
        <div className="p-4">
          {departmentPerformance.map((dept, deptIdx) => (
            <details key={deptIdx} className="mb-4 last:mb-0">
              <summary className="cursor-pointer px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium text-sm text-slate-800 flex items-center justify-between">
                <span>{dept.department} ({dept.employeeCount} personel)</span>
                <span className={`text-xs font-bold ${
                  dept.avgPerformance >= 4.5 ? "text-green-700" :
                  dept.avgPerformance >= 4.0 ? "text-blue-700" :
                  dept.avgPerformance >= 3.5 ? "text-yellow-700" :
                  "text-red-700"
                }`}>
                  Ort: {dept.avgPerformance.toFixed(1)}
                </span>
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase">Ad Soyad</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase">Pozisyon</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase">Performans</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase">Potansiyel</th>
                      <th className="text-center px-3 py-2 text-xs text-slate-500 font-medium uppercase">Kategori</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dept.employees.map((emp, empIdx) => {
                      const perf = emp.Performans || 0;
                      const pot = emp.Potansiyel || 0;
                      const category = perf >= 4.5 ? "Mükemmel" :
                                      perf >= 4.0 ? "İyi" :
                                      perf >= 3.0 ? "Orta" : "Düşük";
                      return (
                        <tr key={empIdx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-sm text-slate-800">{emp["Ad Soyad"]}</td>
                          <td className="px-3 py-2 text-sm text-slate-600">{emp.Pozisyon}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono font-bold ${
                              perf >= 4.5 ? "bg-green-100 text-green-700" :
                              perf >= 4.0 ? "bg-blue-100 text-blue-700" :
                              perf >= 3.0 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {perf > 0 ? perf.toFixed(1) : "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono ${
                              pot >= 4.0 ? "bg-green-100 text-green-700" :
                              pot >= 3.0 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {pot > 0 ? pot.toFixed(1) : "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                              category === "Mükemmel" ? "bg-green-100 text-green-800" :
                              category === "İyi" ? "bg-blue-100 text-blue-800" :
                              category === "Orta" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {category}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

// Yaklaşan Doğum Günleri Widget Component
function UpcomingBirthdaysWidget({ user }: { user: any }) {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBirthdays = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/summary");
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setBirthdays(result.data.upcoming_birthdays || []);
          }
        }
      } catch (error) {
        console.error("Birthdays load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBirthdays();
    
    // Her 5 dakikada bir yenile
    const interval = setInterval(loadBirthdays, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-4">
        <SkeletonTable rows={3} cols={3} />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-slate-800">
            Yaklaşan Doğum Günleri
          </h3>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
          Önümüzdeki 30 gün
        </span>
      </div>

      {birthdays.length > 0 ? (
        <div className="space-y-2">
          {birthdays.slice(0, 10).map((person, idx) => {
            const birthdayDate = new Date(person.birthday_date);
            const formattedDate = birthdayDate.toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
            });

            // Gün sayısına göre renk belirle
            const daysUntil = person.days_until;
            let badgeColor = "bg-blue-100 text-blue-800";
            let badgeText = `${daysUntil} gün sonra`;
            
            if (daysUntil === 0) {
              badgeColor = "bg-pink-100 text-pink-800";
              badgeText = "Bugün! 🎉";
            } else if (daysUntil === 1) {
              badgeColor = "bg-purple-100 text-purple-800";
              badgeText = "Yarın";
            } else if (daysUntil <= 7) {
              badgeColor = "bg-orange-100 text-orange-800";
              badgeText = `${daysUntil} gün sonra`;
            }

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50/50 to-purple-50/50 rounded-lg border border-pink-100 hover:border-pink-300 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white font-semibold text-sm">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {person.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {person.department} • {person.position}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">Doğum Günü</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formattedDate}
                    </p>
                    {person.age && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {person.age} yaşında
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${badgeColor}`}
                  >
                    {badgeText}
                  </span>
                </div>
              </div>
            );
          })}
          {birthdays.length > 10 && (
            <p className="text-xs text-slate-500 text-center mt-2">
              +{birthdays.length - 10} kişi daha...
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Yaklaşan doğum günü yok</p>
            <p className="text-xs text-slate-500 mt-1">
              Önümüzdeki 30 gün içinde doğum günü olan personel bulunmuyor
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
