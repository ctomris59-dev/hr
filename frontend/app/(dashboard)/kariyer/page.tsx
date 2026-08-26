"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip
} from '@/components/charts/recharts';
import { 
  Map, TrendingUp, AlertTriangle, CheckCircle, XCircle, 
  BrainCircuit, ArrowRight, BookOpen, Wallet, Award, Sparkles,
  Users, Search, Star, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { POSITIONS, JOB_PROFILES as FRONTEND_JOB_PROFILES } from '../../data/jobData';
import { getStorageData, STORAGE_KEYS } from '../../utils/storage';
import { createStandardRadarData, extractCompetencyScoresFromTalentMatrix } from '../../utils/calculations';
import { toScore } from '../../../lib/score';
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import { API_BASE_URL } from "@/lib/apiConfig";

// --- SABİTLER (Python config.py'den - Backend ile uyumlu) ---
const COMPETENCIES_MAP: { [key: string]: string } = {
  "STR": "Stratejik Bakış",
  "RES": "Sonuç Odaklılık",
  "COM": "İletişim Becerileri",
  "TEA": "Takım Çalışması",
  "ETH": "Etik ve Uyum",
  "ANA": "Analitik Düşünme",
  "DIG": "Dijital Okuryazarlık",
  "DET": "Detaylara Özen",
  "LRN": "Sürekli Öğrenme",
  "DIS": "Öz-Disiplin"
};

// Türkçe isimleri kodlara çevir (Reverse mapping) - Sabit
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COMPETENCIES_MAP).map(([code, name]) => [name, code])
);

export default function KariyerPage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId") ?? searchParams.get("dqiEmployeeId");
  const employeeNameParam = (searchParams.get("employeeName") ?? searchParams.get("dqiEmployeeName") ?? "").trim() || null;
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobProfiles, setJobProfiles] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Seçim State'leri
  const [selectedEmpId, setSelectedEmpId] = useState<number>(0);
  const [targetPosition, setTargetPosition] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [hasAppliedQuerySelection, setHasAppliedQuerySelection] = useState(false);
  const [analysisLoadingId, setAnalysisLoadingId] = useState<number | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<{
    topDepartment: string;
    trainingNeedCount: number;
    averageScore: number;
    totalEmployees: number;
  } | null>(null);
  const [analysisDepartment, setAnalysisDepartment] = useState<string | null>(null);

  // Kullanıcı bilgisini yükle
  useEffect(() => {
    const storedUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setCurrentUser(storedUser);
  }, []);

  // 1. VERİLERİ ÇEK (Backend ile tam entegrasyon)
  useEffect(() => {
    async function fetchData() {
      try {
        // Verilerin temizlenip temizlenmediğini kontrol et
        const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
        if (dataCleared) {
          setEmployees([]);
          setJobProfiles({});
          setLoading(false);
          return;
        }
        
        // Kullanıcı bilgisini al
        const user = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
        const userRole = user?.role || "EMPLOYEE";
        const userDept = user?.dept || user?.department || "";
        
        // Personel verisi ve Meta verileri (Job Profiles) paralel çekilir
        const params = new URLSearchParams();
        if (userRole) params.append('user_role', userRole);
        if (userDept) params.append('user_dept', userDept);
        params.append('_t', Date.now().toString()); // Cache bypass
        
        const [resEmp, resMeta] = await Promise.all([
          fetch(`${API_BASE_URL}/api/talent-matrix?${params.toString()}`),
          fetch(`${API_BASE_URL}/api/metadata?_t=${Date.now()}`)
        ]);

        const jsonEmp = await resEmp.json();
        const jsonMeta = await resMeta.json();

        let empData = Array.isArray(jsonEmp.data) ? jsonEmp.data : [];
        
        // Hiyerarşi kontrolü: Frontend'de de filtreleme yap (ekstra güvenlik)
        if (userRole !== "CEO" && userRole !== "IK") {
          if (userRole === "DIRECTOR" || userRole === "MANAGER") {
            // Direktör ve Müdürler sadece kendi departmanlarını görebilir
            empData = empData.filter((emp: any) => {
              return emp.department === userDept;
            });
          } else {
            // Diğer roller hiçbir şey göremez
            empData = [];
          }
        }
        
        setEmployees(empData);
        
        // Job profiles yapısını kontrol et ve düzelt
        const profiles = jsonMeta.data?.job_profiles || jsonMeta.job_profiles || {};
        setJobProfiles(profiles);
        
        console.log('Job Profiles loaded:', Object.keys(profiles).slice(0, 5)); // Debug

        if (empData.length > 0) {
          setSelectedEmpId(empData[0].id);
          // Varsayılan hedef olarak listedeki ilk benzersiz pozisyonu seç
          const uniquePositions = Array.from(new Set(empData.map((e: any) => e.position))) as string[];
          // Kendi pozisyonu dışında bir hedef seçmeye çalış
          const defaultTarget = uniquePositions.find(p => p !== empData[0].position) || uniquePositions[0];
          setTargetPosition(defaultTarget || "");
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    
    // Storage temizlendiğinde verileri temizle
    const handleStorageCleared = () => {
      setEmployees([]);
      setJobProfiles({});
      setSelectedEmpId(0);
      setTargetPosition("");
      setLoading(false);
    };
    
    window.addEventListener("storageCleared", handleStorageCleared);
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
    };
  }, []);

  // 2. HEDEF POZİSYONLAR: TÜM pozisyonlar (organizasyondaki, job profiles'daki ve jobData.ts'deki tüm pozisyonlar)
  const activePositions = useMemo(() => {
    const empPositions = employees.length > 0 
      ? Array.from(new Set(employees.map((e: any) => e.position))).filter(Boolean)
      : [];
    const profilePositions = Object.keys(jobProfiles || {}).filter(Boolean);
    
    // Frontend'deki tüm pozisyonları da ekle (jobData.ts'den)
    const allPositionsFromData = POSITIONS || [];
    
    // Birleştir ve sırala (tüm kaynaklardan)
    const allPositions = Array.from(new Set([
      ...empPositions, 
      ...profilePositions, 
      ...allPositionsFromData
    ])).sort();
    
    return allPositions;
  }, [employees, jobProfiles]);

  // Hedef pozisyonun bulunduğu departmanı bul
  const targetPositionDepartment = useMemo(() => {
    if (!targetPosition || employees.length === 0) return null;
    
    // Hedef pozisyonun hangi departmanda olduğunu bul
    // Önce tam eşleşme ara
    let empWithTargetPosition = employees.find((emp: any) => 
      emp.position?.toLowerCase().trim() === targetPosition.toLowerCase().trim()
    );
    
    // Tam eşleşme yoksa, kısmi eşleşme ara (pozisyon ismi içinde geçiyor mu?)
    if (!empWithTargetPosition) {
      empWithTargetPosition = employees.find((emp: any) => {
        const empPos = emp.position?.toLowerCase().trim() || "";
        const targetPos = targetPosition.toLowerCase().trim();
        return empPos.includes(targetPos) || targetPos.includes(empPos);
      });
    }
    
    return empWithTargetPosition?.department || null;
  }, [targetPosition, employees]);

  // Filtrelenmiş çalışanlar (arama ve hedef pozisyon departmanı için)
  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    
    // Hedef pozisyon seçildiyse, sadece o pozisyonun bulunduğu departmandaki personelleri göster
    if (targetPosition && targetPositionDepartment) {
      filtered = filtered.filter((emp: any) => 
        emp.department === targetPositionDepartment
      );
    }
    
    // Arama terimi varsa, filtrele
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((emp: any) => 
        emp.name?.toLowerCase().includes(term) || 
        emp.position?.toLowerCase().includes(term) ||
        emp.department?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [employees, searchTerm, targetPosition, targetPositionDepartment]);

  // Seçili personel - Önce filteredEmployees'da ara, yoksa employees'da ara
  const selectedEmp = useMemo(() => {
    const fromFiltered = filteredEmployees.find((e: any) => e.id === selectedEmpId);
    if (fromFiltered) return fromFiltered;
    return filteredEmployees[0] || employees.find((e: any) => e.id === selectedEmpId) || employees[0];
  }, [filteredEmployees, employees, selectedEmpId]);

  const dqiTestScore = useMemo(() => toScore(selectedEmp?.test_score), [selectedEmp]);
  const dqiManagerScore = useMemo(() => toScore(selectedEmp?.manager_score), [selectedEmp]);
  const dqiPositionScore = useMemo(
    () => toScore(selectedEmp?.position_competency_score ?? selectedEmp?.targetCompetencyScore),
    [selectedEmp]
  );

  // Auto-select employee from query params (optional)
  useEffect(() => {
    if (hasAppliedQuerySelection) return;
    if (!employeeIdParam && !employeeNameParam) return;
    if (!employees.length) return;
    const candidate = employees.find((emp: any) => {
      if (employeeIdParam && String(emp.id) === String(employeeIdParam)) return true;
      if (employeeNameParam && emp.name === employeeNameParam) return true;
      return false;
    });
    if (candidate && candidate.id !== selectedEmpId) {
      setSelectedEmpId(candidate.id);
    }
    setHasAppliedQuerySelection(true);
  }, [employeeIdParam, employeeNameParam, employees, selectedEmpId, hasAppliedQuerySelection]);

  // Hedef pozisyon değiştiğinde, filtrelenmiş listeden ilk personeli seç
  useEffect(() => {
    if (targetPosition && filteredEmployees.length > 0) {
      // Seçili personel filtrelenmiş listede yoksa, ilk personeli seç
      const currentSelected = filteredEmployees.find((e: any) => e.id === selectedEmpId);
      if (!currentSelected) {
        setSelectedEmpId(filteredEmployees[0].id);
      }
    } else if (targetPosition && filteredEmployees.length === 0) {
      // Hedef pozisyon seçili ama uygun personel yoksa seçimi sıfırla
      setSelectedEmpId(0);
    }
  }, [targetPosition, filteredEmployees, selectedEmpId]);

  // Çalışanların ortalama yetkinlik skorunu hesapla
  const getAverageScore = (scores: Record<string, number>) => {
    const values = Object.values(scores || {}).filter(v => v > 0);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const getCombinedAverageScore = (emp: any) => {
    if (!emp) return 0;
    const { scores, manager_scores } = extractCompetencyScoresFromTalentMatrix(emp, COMPETENCIES_MAP);
    const combinedValues: number[] = [];
    Object.keys(COMPETENCIES_MAP).forEach((code) => {
      const testVal = toScore(scores[code]);
      const managerVal = toScore(manager_scores[code]);
      const baseVal = testVal ?? managerVal;
      if (baseVal === null) return;
      const managerScore = managerVal ?? baseVal;
      combinedValues.push((baseVal + managerScore) / 2);
    });
    if (combinedValues.length === 0) return 0;
    return combinedValues.reduce((sum, val) => sum + val, 0) / combinedValues.length;
  };

  const buildAnalysisSummary = (sourceEmployees: any[]) => {
    if (!sourceEmployees || sourceEmployees.length === 0) {
      return {
        topDepartment: "Veri yok",
        trainingNeedCount: 0,
        averageScore: 0,
        totalEmployees: 0,
      };
    }

    const departmentTotals: Record<string, { total: number; count: number }> = {};
    let totalScore = 0;
    let scoredEmployees = 0;
    let trainingNeedCount = 0;

    sourceEmployees.forEach((emp: any) => {
      const { scores, manager_scores } = extractCompetencyScoresFromTalentMatrix(emp, COMPETENCIES_MAP);
      const combinedScores = Object.keys(COMPETENCIES_MAP)
        .map((code) => {
          let current = scores[code] || 0;
          let manager = manager_scores[code] || 0;
          if (typeof current === "string") current = parseFloat(current) || 0;
          if (typeof manager === "string") manager = parseFloat(manager) || 0;
          if (manager === 0) manager = current;
          return (current + manager) / 2;
        })
        .filter((value) => value > 0);

      const avgScore = combinedScores.length > 0
        ? combinedScores.reduce((sum, v) => sum + v, 0) / combinedScores.length
        : 0;

      if (avgScore > 0) {
        totalScore += avgScore;
        scoredEmployees += 1;
        if (avgScore < 4) {
          trainingNeedCount += 1;
        }
      }

      const dept = emp.department || "Genel";
      if (!departmentTotals[dept]) {
        departmentTotals[dept] = { total: 0, count: 0 };
      }
      departmentTotals[dept].total += avgScore;
      departmentTotals[dept].count += 1;
    });

    const topDepartment = Object.entries(departmentTotals).reduce(
      (best, [dept, stats]) => {
        const avg = stats.count > 0 ? stats.total / stats.count : 0;
        if (!best || avg > best.avg) {
          return { dept, avg };
        }
        return best;
      },
      null as null | { dept: string; avg: number }
    );

    return {
      topDepartment: topDepartment?.dept || "Veri yok",
      trainingNeedCount,
      averageScore: scoredEmployees > 0 ? totalScore / scoredEmployees : 0,
      totalEmployees: sourceEmployees.length,
    };
  };

  const handleAnalyze = (empId?: number) => {
    console.log("Analiz butonu tıklandı");
    if (typeof empId === "number") {
      setSelectedEmpId(empId);
    }
    if (analysisLoadingId !== null) return;
    const loadingKey = typeof empId === "number" ? empId : -1;
    setAnalysisLoadingId(loadingKey);
    setTimeout(() => {
      const targetEmployee = typeof empId === "number"
        ? employees.find((emp: any) => emp.id === empId)
        : selectedEmp;
      const targetDepartment = targetEmployee?.department;
      setAnalysisDepartment(targetDepartment ?? null);
      const source = targetDepartment
        ? employees.filter((emp: any) => emp.department === targetDepartment)
        : employees;
      const summary = buildAnalysisSummary(source);
      setAnalysisSummary(summary);
      setIsAnalysisModalOpen(true);
      setAnalysisLoadingId(null);
    }, 0);
  };

  const closeAnalysisModal = () => {
    setIsAnalysisModalOpen(false);
    setAnalysisDepartment(null);
  };

  // 3. ANALİZ MOTORU (Python'daki mantığın aynısı)
  const analysis = useMemo(() => {
    if (!selectedEmp || !targetPosition) {
      return null;
    }
    
    // Job profiles yoksa bile analiz yap (varsayılan hedeflerle)
    if (!jobProfiles || Object.keys(jobProfiles).length === 0) {
      console.warn("[Kariyer] Job profiles bulunamadı, varsayılan hedefler kullanılıyor");
    }

    // Hedef Profili Bul - Önce backend'den, sonra frontend'den
    let targetScoresRaw: any = null;
    
    // Backend ve frontend job profiles'ı birleştir
    const allJobProfiles = { ...jobProfiles, ...FRONTEND_JOB_PROFILES };
    
    // 1. Tam eşleşme (büyük/küçük harf duyarsız) - Önce backend'den
    const exactMatch = Object.keys(allJobProfiles).find(
      k => k.toLowerCase().trim() === targetPosition.toLowerCase().trim()
    );
    if (exactMatch) {
      const profile = allJobProfiles[exactMatch];
      targetScoresRaw = profile.competencies || profile;
    }
    
    // 2. Kısmi eşleşme (pozisyon ismi içinde geçiyor mu?)
    if (!targetScoresRaw) {
      const partialMatch = Object.keys(allJobProfiles).find(k => {
        const kLower = k.toLowerCase().trim();
        const targetLower = targetPosition.toLowerCase().trim();
        return kLower.includes(targetLower) || targetLower.includes(kLower);
      });
      if (partialMatch) {
        const profile = allJobProfiles[partialMatch];
        targetScoresRaw = profile.competencies || profile;
      }
    }

    // 3. Türkçe isimleri kodlara çevir
    const targetScores: Record<string, number> = {};
    if (targetScoresRaw && typeof targetScoresRaw === 'object' && !Array.isArray(targetScoresRaw)) {
      Object.entries(targetScoresRaw).forEach(([name, score]) => {
        const code = NAME_TO_CODE[name];
        if (code && typeof score === 'number') {
          targetScores[code] = score;
        }
      });
    }

    // Eğer hiç hedef puan bulunamadıysa, varsayılan değerler kullan
    const hasTargetScores = Object.keys(targetScores).length > 0;

    const gapList: any[] = [];
    let totalGap = 0;

    // STANDART FONKSİYON ile yetkinlik puanlarını çıkar (Tüm modüllerde aynı mantık)
    const competencyScores = extractCompetencyScoresFromTalentMatrix(selectedEmp, COMPETENCIES_MAP);
    const currentScores = competencyScores.scores; // Test sonuçları
    const managerScores = competencyScores.manager_scores; // Yönetici (360°) puanları
    
    // Hedef puanları belirle - Önce backend'den gelen targets (ÖNCELİK), sonra job profiles, sonra varsayılan
    const targetsForRadar: Record<string, number> = {};
    Object.keys(COMPETENCIES_MAP).forEach((code) => {
      // ÖNCELİK 1: Backend'den gelen targets (zaten job profiles'dan hesaplanmış)
      if (competencyScores.targets[code] && competencyScores.targets[code] > 0) {
        targetsForRadar[code] = competencyScores.targets[code];
      } 
      // ÖNCELİK 2: Frontend job profiles'dan hesaplanmış targets
      else if (hasTargetScores && targetScores[code]) {
        targetsForRadar[code] = targetScores[code];
      } 
      // ÖNCELİK 3: 0 bırak, createStandardRadarData fallback yapacak (3.0)
      else {
        targetsForRadar[code] = 0; // createStandardRadarData fallback kullanacak
      }
    });
    
    // Radar verisi için standart fonksiyonu kullan (tüm modüllerde aynı mantık)
    const rData = createStandardRadarData(
      {
        scores: currentScores,
        manager_scores: managerScores,
        targets: targetsForRadar,
      },
      COMPETENCIES_MAP
    );

    // GAP Analizi için ayrı döngü
    Object.entries(COMPETENCIES_MAP).forEach(([code, name]) => {
      // Mevcut puan (Test): scores'dan, yoksa 0
      let current = currentScores[code] || 0;
      // Eğer string ise parse et
      if (typeof current === 'string') {
        current = parseFloat(current) || 0;
      }
      
      // Yönetici puanı (360°): manager_scores'dan, yoksa test puanını kullan (fallback)
      let manager = managerScores[code] || 0;
      if (typeof manager === 'string') {
        manager = parseFloat(manager) || 0;
      }
      if (manager === 0) {
        manager = current; // Fallback: test puanını kullan
      }
      
      // Birleşik puan: (Test + Yönetici) / 2 (Gap analizi için)
      const combined = (current + manager) / 2;
      
      // Hedef puan: Önce job profiles'dan, yoksa varsayılan 4.0
      const target = hasTargetScores ? (targetScores[code] || 4.0) : 4.0;
      const diff = target - combined; // Birleşik puan üzerinden gap hesapla

      // GAP Analizi: Fark > 0.3 ise listeye ekle
      if (diff > 0.3) {
        gapList.push({ name, current: combined, target, diff });
        totalGap += diff;
      }
    });

    // Hazır Bulunuşluk Formülü (Python: readiness = max(0, 100 - (total_gap * 8)))
    const readinessScore = Math.max(0, 100 - (totalGap * 8));
    
    // En büyük eksik (AI Koç için)
    const topGap = gapList.sort((a, b) => b.diff - a.diff)[0];

    // Debug log
    console.log('Analysis updated:', { 
      targetPosition, 
      foundProfile: !!targetScoresRaw,
      targetScoresCount: Object.keys(targetScores).length,
      targetScores,
      radarDataLength: rData.length 
    });

    return { radarData: rData, gaps: gapList, readiness: readinessScore, topGap };
  }, [selectedEmp, targetPosition, jobProfiles]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
      <div className="w-full max-w-3xl bg-white rounded-xl p-8 shadow-sm">
        <Skeleton className="h-6 w-1/3" />
        <div className="mt-4">
          <SkeletonTable rows={6} cols={5} />
        </div>
      </div>
    </div>
  );
  if (!selectedEmp) return <div className="p-10 text-center">Veri yok.</div>;

  const { radarData, gaps, readiness, topGap } = analysis || { radarData: [], gaps: [], readiness: 0, topGap: null };
  const isReady = readiness > 80;
  const analysisSnapshot = analysisSummary || {
    topDepartment: "Veri yok",
    trainingNeedCount: 0,
    averageScore: 0,
    totalEmployees: 0,
  };

  return (
    <div className="p-6 md:p-8 min-h-screen pb-20 bg-[#FAFAFA] bg-[radial-gradient(#E5E7EB_1px,transparent_1px)] [background-size:24px_24px]">
      
      {/* HEADER */}
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
          <Map className="w-8 h-8 text-indigo-600" /> Kariyer Yolu ve Terfi Planlama
        </h2>
        <p className="text-zinc-500">Mevcut çalışanların yetkinlikleri ile <strong>organizasyondaki hedef pozisyonlar</strong> arasındaki fark analizi.</p>
        <div className="sr-only">
          <span data-testid="dqi-selected-employee-name">{selectedEmp?.name ?? ""}</span>
          <span data-testid="dqi-selected-employee-id">{selectedEmp?.id ?? ""}</span>
          <span data-testid="dqi-test-score">{dqiTestScore ?? ""}</span>
          <span data-testid="dqi-manager-score">{dqiManagerScore ?? ""}</span>
          <span data-testid="dqi-position-score">{dqiPositionScore ?? ""}</span>
        </div>
      </div>

      {/* KONTROL PANELİ (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 1. Çalışan Seçimi */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-zinc-200">
          <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase tracking-wider">1. Çalışan Seçiniz</label>
          <select 
            data-testid="dqi-person-select"
            className="w-full p-3 rounded-xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-zinc-700 cursor-pointer"
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(Number(e.target.value))}
          >
            {filteredEmployees.map((e:any) => <option key={e.id} value={e.id}>{e.name} — {e.position}</option>)}
          </select>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">Mevcut Rol</span>
            <span className="text-sm font-medium text-zinc-600">{selectedEmp.position}</span>
          </div>
        </div>

        {/* 2. Hedef Pozisyon Seçimi */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-zinc-200">
          <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase tracking-wider">2. Hedef Pozisyon Seçiniz</label>
          <div className="flex gap-2">
            <div className="flex-1">
                <select 
                    className="w-full p-3 rounded-xl bg-zinc-50 border-none outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-zinc-700 cursor-pointer"
                    value={targetPosition}
                    onChange={(e) => setTargetPosition(e.target.value)}
                >
                    {activePositions.map((pos: any) => (
                    <option key={pos} value={pos}>{pos}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center justify-center bg-orange-100 w-12 rounded-xl text-orange-600">
                <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold">Hedef Rol</span>
            <span className="text-sm font-medium text-zinc-600">{targetPosition}</span>
          </div>
        </div>
      </div>

      {/* ANALİZ ALANI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SOL: RADAR GRAFİĞİ */}
        <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-6 flex flex-col items-center justify-center min-h-[420px]">
            <div className="w-full flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-zinc-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" /> Yetkinlik Kıyaslaması
                </h3>
                <div className="flex gap-2 text-[10px] font-bold uppercase">
                    <span className="flex items-center gap-1 text-red-500"><span className="w-2 h-2 rounded-full bg-red-500"></span> Hedef</span>
                    <span className="flex items-center gap-1 text-orange-500"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Yönetici</span>
                    <span className="flex items-center gap-1 text-blue-500"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Mevcut</span>
                </div>
            </div>
            
            <div className="w-full h-full min-h-[350px]">
                {radarData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-400">
                        <div className="text-center">
                            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Yetkinlik verisi bulunamadı</p>
                            <p className="text-xs mt-1">Lütfen 360 Değerlendirme modülünden değerlendirme yapın</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ width: '100%', height: '100%', minHeight: '350px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart 
                          key={`${selectedEmp?.id}-${targetPosition}`}
                          cx="50%" 
                          cy="50%" 
                          outerRadius="75%" 
                          data={radarData}
                        >
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} />
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
                          wrapperStyle={{ paddingTop: '10px' }}
                          iconType="line"
                          formatter={(value) => <span style={{ fontSize: '11px', color: '#374151' }}>{value}</span>}
                        />
                        <Tooltip 
                            contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 30px -10px rgba(0,0,0,0.1)'}} 
                            itemStyle={{fontSize:'12px', fontWeight:'bold'}}
                            formatter={(value: any, name: string) => [
                              `${value.toFixed(1)} / 5.0`,
                              name
                            ]}
                        />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>

        {/* SAĞ: GAP ANALİZİ VE SONUÇLAR */}
        <div className="space-y-6">
            
            {/* 1. HAZIR BULUNUŞLUK SKOR KARTI */}
            <div className={`bg-white rounded-[2rem] border shadow-sm p-6 border-l-[8px] ${
                readiness > 80 ? 'border-l-green-500' : (readiness > 50 ? 'border-l-yellow-500' : 'border-l-red-500')
            }`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Hazır Bulunuşluk Skoru</h4>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-5xl font-black text-zinc-800">%{readiness.toFixed(0)}</span>
                            <span className={`text-sm font-bold px-2 py-1 rounded-full ${readiness > 80 ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                {readiness > 80 ? "YÜKSEK" : (readiness > 50 ? "ORTA" : "DÜŞÜK")}
                            </span>
                        </div>
                    </div>
                    {readiness > 80 ? <CheckCircle className="w-12 h-12 text-green-500 opacity-20"/> : 
                     (readiness > 50 ? <AlertTriangle className="w-12 h-12 text-yellow-500 opacity-20"/> : <XCircle className="w-12 h-12 text-red-500 opacity-20"/>)}
                </div>
                
                <div className="mt-4 pt-4 border-t border-zinc-100">
                    {readiness > 80 ? (
                        <p className="text-green-700 text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4"/> Bu pozisyona terfi için uygun.
                        </p>
                    ) : (
                        <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
                            {readiness > 50 ? "⏳ Gelişim planı ile desteklenmeli." : "❌ Şu an için hazır değil."}
                        </p>
                    )}
                </div>
            </div>

            {/* 2. AI KOÇ ÖNERİSİ */}
            <div className="bg-gradient-to-br from-indigo-900 to-violet-800 rounded-[2rem] shadow-lg p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h4 className="font-bold flex items-center gap-2 mb-3 text-indigo-100">
                    <BrainCircuit className="w-5 h-5" /> AI Koç Önerisi
                </h4>
                {readiness > 80 ? (
                    <p className="text-green-300 font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4"/> Harika! {targetPosition} pozisyonuna terfi için hazırsınız.
                    </p>
                ) : topGap ? (
                    <p className="text-indigo-50 text-sm leading-relaxed">
                        Sayın <span className="font-bold text-white">{selectedEmp.name}</span>, 
                        <span className="font-bold text-white"> {targetPosition}</span> pozisyonuna geçiş sürecini hızlandırmak için öncelikle 
                        <span className="font-bold text-yellow-300 bg-white/10 px-2 py-0.5 rounded ml-1 mr-1">{topGap.name}</span> 
                        yetkinliğine odaklanmalısınız. (Fark: <span className="font-mono">-{topGap.diff.toFixed(1)}</span>)
                    </p>
                ) : (
                    <p className="text-indigo-50 text-sm leading-relaxed">
                        Sayın <span className="font-bold text-white">{selectedEmp.name}</span>, 
                        <span className="font-bold text-white"> {targetPosition}</span> pozisyonuna geçiş için yetkinlik skorlarınızı geliştirmeniz gerekiyor. 
                        Lütfen 360 Değerlendirme modülünden yetkinlik değerlendirmesi yapın.
                    </p>
                )}
            </div>

            {/* 3. EKSİK YÖNLER LİSTESİ */}
            {gaps.length > 0 && (
                <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-6">
                    <h4 className="font-bold text-zinc-800 mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500"/> Geliştirilmesi Gereken Alanlar
                    </h4>
                    <div className="space-y-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                        {gaps.map((g, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-red-50/50 border border-red-100 rounded-xl text-sm transition-all hover:bg-red-50">
                                <span className="font-bold text-zinc-700">{g.name}</span>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="block text-[10px] text-zinc-400 uppercase">Hedef</span>
                                        <span className="font-mono font-bold text-zinc-600">{g.target}</span>
                                    </div>
                                    <span className="text-red-600 font-bold bg-white px-2 py-1 rounded-lg border border-red-100 text-xs shadow-sm">
                                        -{g.diff.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* 4. TERFİ SİMÜLASYONU */}
      <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-8 mt-6">
         <h4 className="font-bold text-lg text-zinc-800 mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-600" /> Terfi Etki Analizi (Simülasyon)
         </h4>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-green-50 rounded-[1.5rem] border border-green-100 flex flex-col items-center text-center hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-3">
                    <Wallet className="w-6 h-6" />
                </div>
                <span className="text-xs text-green-600 font-bold uppercase tracking-widest">Maaş Artışı</span>
                <span className="text-3xl font-black text-green-800 mt-2">+%25</span>
                <span className="text-[10px] text-green-600/70 mt-1 font-medium">Piyasa ortalamasına göre</span>
            </div>

            <div className="p-6 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex flex-col items-center text-center hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-xs text-blue-600 font-bold uppercase tracking-widest">Sorumluluk</span>
                <span className="text-xl font-bold text-blue-800 mt-2">Genişleyecek</span>
                <span className="text-[10px] text-blue-600/70 mt-1 font-medium">Takım yönetimi & Bütçe</span>
            </div>

            <div className="p-6 bg-purple-50 rounded-[1.5rem] border border-purple-100 flex flex-col items-center text-center hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-3">
                    <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-xs text-purple-600 font-bold uppercase tracking-widest">Eğitim İhtiyacı</span>
                <span className="text-xl font-bold text-purple-800 mt-2">Liderlik 101</span>
                <span className="text-[10px] text-purple-600/70 mt-1 font-medium">Önerilen zorunlu eğitim</span>
            </div>
         </div>
      </div>

      {/* 5. POLİVALANCE TABLOSU - Mevcut Çalışanlar */}
      <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-8 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-bold text-lg text-zinc-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Çalışan Polivalance Tablosu
          </h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Çalışan</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Pozisyon</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Departman</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Ort. Yetkinlik</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Performans</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Potansiyel</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredEmployees.map((emp: any) => {
                const avgScore = getAverageScore(emp.scores || {});
                const potentialScore = getCombinedAverageScore(emp);
                const isSelected = emp.id === selectedEmpId;
                
                return (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`hover:bg-zinc-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedEmpId(emp.id);
                      // Kendi pozisyonu dışında bir hedef seç
                      const otherPositions = activePositions.filter(p => p !== emp.position);
                      if (otherPositions.length > 0 && !otherPositions.includes(targetPosition)) {
                        setTargetPosition(otherPositions[0]);
                      }
                    }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-zinc-200 text-zinc-600'
                        }`}>
                          {emp.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-800">{emp.name || 'İsimsiz'}</div>
                          {isSelected && (
                            <div className="text-xs text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3" />
                              Seçili
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-zinc-700 font-medium">{emp.position || 'Belirsiz'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-zinc-600">{emp.department || 'Genel'}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex-1 max-w-[80px] bg-zinc-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              avgScore >= 4.0
                                ? 'bg-green-500'
                                : avgScore >= 3.0
                                ? 'bg-blue-500'
                                : avgScore >= 2.0
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${(avgScore / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-zinc-700 min-w-[40px] text-right">
                          {avgScore.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        emp.performance >= 4.0
                          ? 'bg-green-100 text-green-700'
                          : emp.performance >= 3.0
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {emp.performance?.toFixed(1) || '0.0'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        potentialScore >= 4.0
                          ? 'bg-purple-100 text-purple-700'
                          : potentialScore >= 3.0
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {potentialScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmpId(emp.id);
                          const otherPositions = activePositions.filter(p => p !== emp.position);
                          if (otherPositions.length > 0) {
                            setTargetPosition(otherPositions[0]);
                          }
                          handleAnalyze(emp.id);
                        }}
                        disabled={analysisLoadingId === emp.id}
                        className={`px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors ${
                          analysisLoadingId === emp.id ? 'opacity-70 cursor-wait' : ''
                        }`}
                      >
                        {analysisLoadingId === emp.id ? (
                          <span className="inline-flex items-center gap-1">
                            <Skeleton variant="circular" width={12} height={12} />
                            Analiz...
                          </span>
                        ) : (
                          "Analiz Et"
                        )}
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Arama kriterlerine uygun çalışan bulunamadı.</p>
          </div>
        )}
      </div>

      {isAnalysisModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeAnalysisModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-zinc-200 w-full max-w-lg mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-600" />
                Polivalans Analizi Özeti
                {analysisDepartment ? (
                  <span className="text-sm font-semibold text-zinc-500">
                    — {analysisDepartment}
                  </span>
                ) : null}
              </h3>
              <button
                type="button"
                onClick={closeAnalysisModal}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p className="text-[11px] uppercase tracking-wider text-indigo-600 font-bold">
                  En Yetkin Departman
                </p>
                <p className="text-sm font-semibold text-zinc-800 mt-1">
                  {analysisSnapshot.topDepartment}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[11px] uppercase tracking-wider text-amber-700 font-bold">
                  Eğitim İhtiyacı
                </p>
                <p className="text-sm font-semibold text-zinc-800 mt-1">
                  {analysisSnapshot.trainingNeedCount} kişi
                </p>
                <Link
                  href="/gelisim"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
                >
                  Gelişim modülüne git
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-bold">
                  Ortalama Skor
                </p>
                <p className="text-sm font-semibold text-zinc-800 mt-1">
                  {analysisSnapshot.averageScore.toFixed(2)} / 5.0
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mt-4">
              Analiz edilen personel sayısı: <strong className="text-zinc-700">{analysisSnapshot.totalEmployees}</strong>
            </p>

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={closeAnalysisModal}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}