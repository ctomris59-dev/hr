"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStorageData, STORAGE_KEYS, setStorageData } from "../../utils/storage";
import { useData } from "../../../context/DataContext";
import { getWeek, getDay } from "date-fns";
import {
  BookOpen,
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Info,
  Trash2,
  Play,
  Heart,
  Sparkles,
  BrainCircuit,
} from "lucide-react";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "@/components/charts/recharts";
import { JOB_PROFILES } from "../../data/jobData";
import { createStandardRadarData, extractCompetencyScoresFromTalentMatrix, findEmployeeInTalentMatrix, matchEmployeeName } from "../../utils/calculations";
import { toScore, formatScore } from "../../../lib/score";
import { API_BASE_URL } from "@/lib/apiConfig";

// COMPETENCIES_360 mapping
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

// Frontend için yetkinlik kodları (Liderlik hariç)
const COMPETENCY_KEYS = ["STR", "RES", "COM", "ETH", "ANA", "DIG", "DET", "LRN", "TEA", "DIS"];

// Yetkinlik isimlerini kodlara çevir
const nameToCode: Record<string, string> = Object.fromEntries(
  Object.entries(COMPETENCIES_360).map(([code, name]) => [name, code])
);

// Job Profiles'dan hedef puanları çek
function getTargetScoresForPosition(positionName: string): Record<string, number> {
  // 1. Tam eşleşme
  if (positionName in JOB_PROFILES) {
    const profile = JOB_PROFILES[positionName];
    const targets: Record<string, number> = {};
    Object.entries(profile).forEach(([compName, score]) => {
      const code = nameToCode[compName];
      if (code && COMPETENCY_KEYS.includes(code)) {
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
        if (code && COMPETENCY_KEYS.includes(code)) {
          targets[code] = score;
        }
      });
      return targets;
    }
  }
  
  // 3. Varsayılan
  const defaultKey = Object.keys(JOB_PROFILES)[Object.keys(JOB_PROFILES).length - 1];
  const profile = JOB_PROFILES[defaultKey];
  const targets: Record<string, number> = {};
  Object.entries(profile).forEach(([compName, score]) => {
    const code = nameToCode[compName];
    if (code && COMPETENCY_KEYS.includes(code)) {
      targets[code] = score;
    }
  });
  return targets;
}

// Test sonuçlarını yükle
function loadTestResults(): Record<string, Record<string, number>> {
  try {
    const candidates = getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []);
    const testResults: Record<string, Record<string, number>> = {};
    candidates.forEach((candidate) => {
      const name = candidate.name;
      if (name && candidate.raw_scores) {
        if (!testResults[name]) {
          testResults[name] = candidate.raw_scores;
        }
      }
    });
    return testResults;
  } catch {
    return {};
  }
}

// Test sonuçlarındaki yetkinlik isimlerini kodlara çevir
function convertTestScoresToCodes(rawScores: Record<string, number>): Record<string, number> {
  const scoresByCode: Record<string, number> = {};
  Object.entries(rawScores).forEach(([compName, score]) => {
    const code = nameToCode[compName];
    if (code && COMPETENCY_KEYS.includes(code)) {
      scoresByCode[code] = score;
    }
  });
  return scoresByCode;
}

// Training Catalog
const TRAINING_CATALOG = [
  { id: "TR_001", name: "İleri Excel ve Veri Analizi", category: "Teknik", competency: "ANA" },
  { id: "TR_002", name: "Etkili İletişim Teknikleri", category: "Soft Skill", competency: "COM" },
  { id: "TR_003", name: "Liderlik ve Takım Yönetimi", category: "Liderlik", competency: "TEA" },
  { id: "TR_004", name: "Zaman Yönetimi", category: "Soft Skill", competency: "DIS" },
  { id: "TR_005", name: "Python ile Veri Bilimine Giriş", category: "Teknik", competency: "DIG" },
  { id: "TR_006", name: "Problem Çözme Teknikleri", category: "Soft Skill", competency: "RES" },
  { id: "TR_007", name: "KVKK ve Bilgi Güvenliği", category: "Uyum", competency: "ETH" },
  { id: "TR_008", name: "Satış Kapama Teknikleri", category: "Satış", competency: "COM" },
];

interface TrainingAssignment {
  id: number;
  Personel: string;
  Atayan: string;
  Yetkinlik: string;
  "Eğitim Adı": string;
  "Son Tarih": string;
  Durum: "Atandı" | "Devam Ediyor" | "Tamamlandı";
  "Personel Notu": string;
  "Atama Tarihi": string;
}

// Check if training is overdue
function checkOverdue(dueDateStr: string, status: string): { isLate: boolean; daysLate: number } {
  if (status === "Tamamlandı") return { isLate: false, daysLate: 0 };
  try {
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (today > due) {
      const delta = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      return { isLate: true, daysLate: delta };
    }
  } catch {}
  return { isLate: false, daysLate: 0 };
}

// Get competency gaps - Backend'den talent matrix verisini kullan (Yetenek Matrisi ile aynı kaynak)
function getMyCompetencyGaps(
  userName: string,
  data360: any[],
  orgData: any[],
  talentMatrixData: any[] // Backend'den gelen talent matrix verisi
): { 
  scores: Record<string, number>; 
  targets: Record<string, number>;
  perf: number | null; 
  pot: number | null;
  radarData: Array<{ subject: string; A: number | null; B: number | null; C: number | null; fullMark: number }>;
  analysisReport: {
    criticalFail: Array<{ name: string; current: number; target: number; gap: number }>;
    moderateGap: Array<{ name: string; current: number; target: number; gap: number }>;
    strength: Array<{ name: string; val: number }>;
  };
} {
  // ÖNCE: Backend'den gelen talent matrix verisinden kullanıcıyı bul (STANDART FONKSİYON)
  const employeeFromBackend = findEmployeeInTalentMatrix(talentMatrixData, userName);
  
  // Analiz raporu için
  const analysisReport = {
    criticalFail: [] as Array<{ name: string; current: number; target: number; gap: number }>,
    moderateGap: [] as Array<{ name: string; current: number; target: number; gap: number }>,
    strength: [] as Array<{ name: string; val: number }>,
  };
  
  // Eğer backend'den veri varsa, onu kullan (Yetenek Matrisi ile aynı veri)
  if (employeeFromBackend) {
    // Backend'den gelen verileri STANDART FONKSİYON ile çıkar (tüm modüllerde aynı mantık)
    // SADECE backend'den gelen veriyi kullan - fallback mantığı createStandardRadarData'da
    const competencyScores = extractCompetencyScoresFromTalentMatrix(employeeFromBackend, COMPETENCIES_360);
    const currentScoresByCode = competencyScores.scores; // Test sonuçları
    const managerScoresByCode = competencyScores.manager_scores; // Yönetici (360°) puanları
    const targetScoresByCode = competencyScores.targets; // Hedef (Rol) puanları
    
    // Gap analizi yap - Birleşik puan (Test + Yönetici) / 2 kullan
    COMPETENCY_KEYS.forEach((code) => {
      const name = COMPETENCIES_360[code];
      const currentVal = toScore(currentScoresByCode[code]);
      const managerVal = toScore(managerScoresByCode[code]) ?? currentVal;
      const targetVal = toScore(targetScoresByCode[code]);
      if (currentVal === null || managerVal === null || targetVal === null) {
        return;
      }
      const combinedVal = (currentVal + managerVal) / 2; // Birleşik puan
      const gap = combinedVal - targetVal;
      
      // Kritiklik: Hedef puan 4.5+ ise kritik yetkinlik
      const isCritical = targetVal >= 4.5;
      
      if (gap < 0) {
        // Eksik var
        const detail = { name, current: combinedVal, target: targetVal, gap };
        if (isCritical && gap <= -0.5) {
          analysisReport.criticalFail.push(detail);
        } else {
          analysisReport.moderateGap.push(detail);
        }
      } else if (gap >= 0.5) {
        // Güçlü yön
        analysisReport.strength.push({ name, val: combinedVal });
      }
    });
    
    // Yetkinlik isimleri ile scores oluştur (eski format için uyumluluk)
    // Öncelik: manager_scores (360 değerlendirme), sonra currentScores (test)
    const scores: Record<string, number> = {};
    COMPETENCY_KEYS.forEach((code) => {
      const name = COMPETENCIES_360[code];
      if (name) {
        // Manager scores öncelikli (360 değerlendirme daha güvenilir)
        const score = toScore(managerScoresByCode[code]) ?? toScore(currentScoresByCode[code]);
        if (score !== null) {
          scores[name] = score;
        }
      }
    });
    
    // Targets'ı da isim formatına çevir
    const targets: Record<string, number> = {};
    Object.entries(targetScoresByCode).forEach(([code, val]) => {
      const name = COMPETENCIES_360[code];
      const targetVal = toScore(val);
      if (name && targetVal !== null) {
        targets[name] = targetVal;
      }
    });
    
    // Radar grafiği için veri hazırla - 3 katmanlı: A (Test), B (Yönetici), C (Hedef)
    // Standart fonksiyon kullan (tüm modüllerde aynı mantık)
    const radarData = createStandardRadarData(
      {
        scores: currentScoresByCode,
        manager_scores: managerScoresByCode,
        targets: targetScoresByCode,
      },
      COMPETENCIES_360
    );
    
    // Debug: Veri kaynağını logla
    console.log("[Eğitim Modülü] Radar Verisi:", {
      userName,
      hasBackendData: !!employeeFromBackend,
      currentScoresCount: Object.keys(currentScoresByCode).length,
      managerScoresCount: Object.keys(managerScoresByCode).length,
      targetScoresCount: Object.keys(targetScoresByCode).length,
      sampleCurrent: currentScoresByCode[COMPETENCY_KEYS[0]],
      sampleManager: managerScoresByCode[COMPETENCY_KEYS[0]],
      sampleTarget: targetScoresByCode[COMPETENCY_KEYS[0]],
    });
    
    // Performans ve Potansiyel - Önce backend'den, sonra 360'dan, sonra org'dan
    let perf = toScore(employeeFromBackend.performance);
    let pot = toScore(employeeFromBackend.potential);
    
    // Eğer backend'den 0 geliyorsa, 360 verisinden veya org verisinden çek
    if (perf === null || pot === null) {
      const myData = data360.find(
        (p) => p.Personel === userName || p.target === userName || p["Ad Soyad"] === userName
      );
      if (myData) {
        if (perf === null) perf = toScore(myData.Performans);
        if (pot === null) pot = toScore(myData.Potansiyel);
      }
      
      // Hala 0 ise org verisinden çek
      if ((perf === null || pot === null) && orgData && orgData.length > 0) {
        const orgEmp = orgData.find((p) => p["Ad Soyad"] === userName);
        if (orgEmp) {
          if (perf === null) perf = toScore(orgEmp.Performans);
          if (pot === null) pot = toScore(orgEmp.Potansiyel);
        }
      }
      
      // Hala 0 ise yetkinlik ortalamasından hesapla (fallback)
      const scoreValues = Object.values(scores)
        .map((value) => toScore(value))
        .filter((value): value is number => value !== null);
      if (perf === null && scoreValues.length > 0) {
        perf = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
      }
      if (pot === null && scoreValues.length > 0) {
        pot = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
      }
    }
    
    console.log("[Eğitim Modülü] Performans ve Potansiyel:", {
      userName,
      perf,
      pot,
      fromBackend: !!employeeFromBackend.performance || !!employeeFromBackend.potential,
    });
    
    return { scores, targets, perf, pot, radarData, analysisReport };
  }
  
  // FALLBACK: Backend verisi yoksa eski mantık (uyumluluk için)
  const person = orgData.find((p) => p["Ad Soyad"] === userName);
  const position = person?.Pozisyon || "";
  
  // Hedef puanları Job Profiles'dan çek
  const targetScoresByCode = getTargetScoresForPosition(position);
  
  // Mevcut puanları (Test) ve Yönetici puanlarını (360°) çek
  let currentScoresByCode: Record<string, number> = {}; // Test sonuçları
  let managerScoresByCode: Record<string, number> = {}; // Yönetici (360°) puanları
  const myData = data360.find(
    (p) => p.Personel === userName || p.target === userName
  );
  
  // Test sonuçlarını yükle
  const testResults = loadTestResults();
  const userTestScores = convertTestScoresToCodes(testResults[userName] || {});
  
  if (myData) {
    COMPETENCY_KEYS.forEach((code) => {
      // Test puanı (öncelik: test results, sonra myData'dan)
      const testVal = toScore(userTestScores[code]) ?? toScore(myData[code]);
      if (testVal !== null) {
        currentScoresByCode[code] = testVal;
      }
      
      // Yönetici puanı (360°)
      let managerVal = toScore(myData[`${code}_Mgr`]);
      if (managerVal === null) managerVal = toScore(myData[`${code}_Mgr1`]);
      if (managerVal === null) managerVal = toScore(myData[`${code}_Mgr2`]);
      
      // Yönetici puanı yoksa test puanını kullan (fallback)
      if (managerVal !== null) {
        managerScoresByCode[code] = managerVal;
      } else if (currentScoresByCode[code] !== undefined) {
        managerScoresByCode[code] = currentScoresByCode[code];
      }
    });
  } else {
    COMPETENCY_KEYS.forEach((code) => {
      const testVal = userTestScores[code] || 3.0;
      currentScoresByCode[code] = testVal;
      managerScoresByCode[code] = testVal; // Fallback: test puanını kullan
    });
  }
  
  // Eksik yetkinlikler için varsayılan değer ekle
  COMPETENCY_KEYS.forEach((code) => {
    if (!currentScoresByCode[code]) {
      currentScoresByCode[code] = 3.0;
    }
    if (!targetScoresByCode[code]) {
      targetScoresByCode[code] = 3.0;
    }
  });
  
  // Gap analizi yap - Birleşik puan (Test + Yönetici) / 2 kullan
  COMPETENCY_KEYS.forEach((code) => {
    const name = COMPETENCIES_360[code];
    const currentVal = toScore(currentScoresByCode[code]);
    const managerVal = toScore(managerScoresByCode[code]) ?? currentVal;
    const targetVal = toScore(targetScoresByCode[code]);
    if (currentVal === null || managerVal === null || targetVal === null) {
      return;
    }
    const combinedVal = (currentVal + managerVal) / 2; // Birleşik puan
    const gap = combinedVal - targetVal;
    
    // Kritiklik: Hedef puan 4.5+ ise kritik yetkinlik
    const isCritical = targetVal >= 4.5;
    
    if (gap < 0) {
      // Eksik var
      const detail = { name, current: combinedVal, target: targetVal, gap };
      if (isCritical && gap <= -0.5) {
        analysisReport.criticalFail.push(detail);
      } else {
        analysisReport.moderateGap.push(detail);
      }
    } else if (gap >= 0.5) {
      // Güçlü yön
      analysisReport.strength.push({ name, val: combinedVal });
    }
  });
  
  // Yetkinlik isimleri ile scores oluştur
  // Öncelik: manager_scores (360 değerlendirme), sonra currentScores (test)
  const scores: Record<string, number> = {};
  COMPETENCY_KEYS.forEach((code) => {
    const name = COMPETENCIES_360[code];
    if (name) {
      // Manager scores öncelikli (360 değerlendirme daha güvenilir)
      const score = managerScoresByCode[code] || currentScoresByCode[code] || 3.0;
      scores[name] = score;
    }
  });
  
    // Radar grafiği için veri hazırla - 3 katmanlı: A (Test), B (Yönetici), C (Hedef)
    // Standart fonksiyon kullan (tüm modüllerde aynı mantık)
    const radarData = createStandardRadarData(
      {
        scores: currentScoresByCode,
        manager_scores: managerScoresByCode,
        targets: targetScoresByCode,
      },
      COMPETENCIES_360
    );
  
  // Performans ve Potansiyel - Önce 360'dan, sonra org'dan, sonra yetkinlik ortalamasından
  let perf = myData ? toScore(myData.Performans) : null;
  let pot = myData ? toScore(myData.Potansiyel) : null;
  
  // Eğer 360'dan 0 geliyorsa, org verisinden çek
  if ((perf === null || pot === null) && orgData && orgData.length > 0) {
    const orgEmp = orgData.find((p) => p["Ad Soyad"] === userName);
    if (orgEmp) {
      if (perf === null) perf = toScore(orgEmp.Performans);
      if (pot === null) pot = toScore(orgEmp.Potansiyel);
    }
  }
  
  // Hala 0 ise yetkinlik ortalamasından hesapla (fallback)
  const scoreValues = Object.values(scores)
    .map((value) => toScore(value))
    .filter((value): value is number => value !== null);
  if (perf === null && scoreValues.length > 0) {
    perf = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  }
  if (pot === null && scoreValues.length > 0) {
    pot = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  }
  
  console.log("[Eğitim Modülü Fallback] Performans ve Potansiyel:", {
    userName,
    perf,
    pot,
    from360: !!myData,
    scoresCount: Object.keys(scores).length,
  });
  
  // Targets'ı da isim formatına çevir
  const targets: Record<string, number> = {};
  Object.entries(targetScoresByCode).forEach(([code, val]) => {
    const name = COMPETENCIES_360[code];
    if (name) {
      targets[name] = val;
    }
  });

  return { scores, targets, perf, pot, radarData, analysisReport };
}

export default function EgitimPage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId") ?? searchParams.get("dqiEmployeeId");
  const employeeNameParam = (searchParams.get("employeeName") ?? searchParams.get("dqiEmployeeName") ?? "").trim() || null;
  const { orgData: contextOrgData, history360: contextHistory360, loading: dataLoading } = useData();
  const [orgData, setOrgData] = useState<any[]>(contextOrgData);
  const [history360, setHistory360] = useState<any[]>(contextHistory360);
  const [talentMatrixData, setTalentMatrixData] = useState<any[]>([]); // Backend'den gelen talent matrix verisi
  const [trainingAssignments, setTrainingAssignments] = useState<TrainingAssignment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"development" | "management">("development");
  const [showCompleteForm, setShowCompleteForm] = useState<number | null>(null);
  const [completeNote, setCompleteNote] = useState("");
  const [pulseScore, setPulseScore] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pulseAnswers, setPulseAnswers] = useState<any[]>([]);
  const [hasAppliedQuerySelection, setHasAppliedQuerySelection] = useState(false);

  const selectedEmployeeFromMatrix = useMemo(() => {
    if (!selectedPerson) return null;
    return findEmployeeInTalentMatrix(talentMatrixData, selectedPerson);
  }, [selectedPerson, talentMatrixData]);

  // Auto-select employee from query params (optional)
  useEffect(() => {
    if (hasAppliedQuerySelection) return;
    if (!employeeIdParam && !employeeNameParam) return;
    if (talentMatrixData.length === 0) return;
    const candidate = talentMatrixData.find((emp: any) => {
      if (employeeIdParam && String(emp.id) === String(employeeIdParam)) return true;
      if (employeeNameParam && emp.name === employeeNameParam) return true;
      return false;
    });
    if (candidate?.name && candidate.name !== selectedPerson) {
      setSelectedPerson(candidate.name);
    }
    setHasAppliedQuerySelection(true);
  }, [employeeIdParam, employeeNameParam, talentMatrixData, selectedPerson, hasAppliedQuerySelection]);

  // Sync with context data
  useEffect(() => {
    setOrgData(contextOrgData);
    setHistory360(contextHistory360);
  }, [contextOrgData, contextHistory360]);

  // Storage temizlendiğinde state'leri temizle
  useEffect(() => {
    const handleStorageCleared = () => {
      setOrgData([]);
      setHistory360([]);
      setSelectedPerson("");
    };

    window.addEventListener("storageCleared", handleStorageCleared);
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
    };
  }, []);

  // Backend'den talent matrix verisini çek (Yetenek Matrisi ile aynı kaynak)
  useEffect(() => {
    async function fetchTalentMatrixData() {
      try {
        // Verilerin temizlenip temizlenmediğini kontrol et
        const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
        
        // Kullanıcı bilgilerini al (RBAC için gerekli)
        const currentUser = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
        const userRole = currentUser?.role || "EMPLOYEE";
        const userDept = currentUser?.dept || currentUser?.department || "";
        
        // Query parametrelerini oluştur
        const params = new URLSearchParams();
        if (userRole) params.append('user_role', userRole);
        if (userDept) params.append('user_dept', userDept);
        params.append('_t', Date.now().toString()); // Cache bypass
        
        const response = await fetch(`${API_BASE_URL}/api/talent-matrix?${params.toString()}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Talent Matrix API Hatası:", errorText);
          throw new Error('Veri çekilemedi');
        }
        
        const result = await response.json();
        const rawData = Array.isArray(result) ? result : (result.data || []);

        if (dataCleared && rawData.length > 0) {
          localStorage.removeItem("hr_data_cleared");
        }
        
        console.log("[Eğitim] Talent Matrix verisi yüklendi:", {
          count: rawData.length,
          sample: rawData[0],
        });
        
        const employeesArray = rawData.map((emp: any, index: number) => ({
          id: emp.id || index + 1,
          name: emp.name || 'İsimsiz',
          position: emp.position || 'Belirsiz',
          department: emp.department || 'Genel',
          performance: toScore(emp.performance),
          potential: toScore(emp.potential),
          salary: Number(emp.salary ?? 0),
          scores: emp.scores || {},   // MEVCUT PUANLAR (Backend'den)
          manager_scores: emp.manager_scores || {}, // YÖNETİCİ PUANLARI (360'dan)
          targets: emp.targets || {},  // HEDEF PUANLAR (Backend'den)
          test_score: emp.test_score ?? null,
          manager_score: emp.manager_score ?? null,
          position_competency_score: emp.position_competency_score ?? emp.targetCompetencyScore ?? null,
        }));
        
        setTalentMatrixData(employeesArray);
      } catch (error) {
        console.error("Talent Matrix API Hatası:", error);
        setTalentMatrixData([]); // Hata durumunda boş array
      }
    }
    fetchTalentMatrixData();
    
    // Storage temizlendiğinde talent matrix verisini de temizle
    const handleStorageCleared = () => {
      setTalentMatrixData([]);
    };
    
    // Talent Matrix güncellendiğinde yeniden yükle
    const handleTalentMatrixUpdate = () => {
      fetchTalentMatrixData();
    };
    
    window.addEventListener("storageCleared", handleStorageCleared);
    window.addEventListener("talentMatrixUpdated", handleTalentMatrixUpdate);
    window.addEventListener("dataUpdated", handleTalentMatrixUpdate);
    
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
      window.removeEventListener("talentMatrixUpdated", handleTalentMatrixUpdate);
      window.removeEventListener("dataUpdated", handleTalentMatrixUpdate);
    };
  }, []);

  useEffect(() => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setUser(currentUser);

    const storedTraining = getStorageData<TrainingAssignment[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
    setTrainingAssignments(storedTraining);

    const storedPulse = getStorageData<any[]>(STORAGE_KEYS.PULSE_ANSWERS, []);
    setPulseAnswers(storedPulse);
  }, []);

  const isManager = user?.role === "MANAGER" || user?.role === "DIRECTOR" || user?.role === "CEO" || user?.role === "IK";

  // Get my tasks
  const myTasks = useMemo(() => {
    if (!user) return [];
    const userName = user.name || user.username || "";
    if (!userName) return [];
    
    // Flexible matching: trim and case-insensitive comparison
    return trainingAssignments.filter((t) => {
      const personelName = (t.Personel || "").trim();
      return personelName === userName.trim() || 
             personelName.toLowerCase() === userName.toLowerCase();
    });
  }, [trainingAssignments, user]);

  // Update training status
  const handleUpdateStatus = (id: number, newStatus: "Devam Ediyor" | "Tamamlandı", note?: string) => {
    const updated = trainingAssignments.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          Durum: newStatus,
          "Personel Notu": note || t["Personel Notu"],
        };
      }
      return t;
    });
    setTrainingAssignments(updated);
    setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, updated);
    setShowCompleteForm(null);
    setCompleteNote("");
  };

  // Delete training
  const handleDeleteTraining = (id: number) => {
    if (confirm("Bu eğitimi silmek istediğinize emin misiniz?")) {
      const updated = trainingAssignments.filter((t) => t.id !== id);
      setTrainingAssignments(updated);
      setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, updated);
    }
  };

  // Get competency analysis - Backend'den talent matrix verisini kullan (Yetenek Matrisi ile aynı kaynak)
  const competencyAnalysis = useMemo(() => {
    if (!user || !user.name) {
      console.log("[Eğitim] User veya user.name yok:", { user });
      return null;
    }
    const result = getMyCompetencyGaps(user.name, history360, orgData, talentMatrixData);
    console.log("[Eğitim] Competency Analysis Sonucu:", {
      hasResult: !!result,
      hasRadarData: !!(result?.radarData),
      radarDataLength: result?.radarData?.length || 0,
      sampleRadarData: result?.radarData?.[0],
      scoresCount: Object.keys(result?.scores || {}).length,
    });
    return result;
  }, [user, history360, orgData, talentMatrixData]);

  // Haftalık Check-in Logic
  const today = new Date();
  const isFriday = getDay(today) === 5; // 0 = Sunday, 5 = Friday
  const currentWeekNumber = getWeek(today, { weekStartsOn: 1 }); // ISO week (Monday start)
  const currentYear = today.getFullYear();
  const weekKey = `${currentYear}-W${currentWeekNumber}`;

  // Check if user already submitted this week
  const hasSubmittedThisWeek = useMemo(() => {
    if (!user) return false;
    const userName = user.name || user.username || "";
    return pulseAnswers.some(
      (answer) =>
        answer.employee_name === userName &&
        answer.week_number === weekKey
    );
  }, [pulseAnswers, user, weekKey]);

  // Kart görünürlüğü: Cuma günü VEYA bu hafta henüz oy kullanılmadıysa (test için esnek)
  const shouldShowPulseCard = !hasSubmittedThisWeek;

  // Submit pulse answer
  const handleSubmitPulse = async () => {
    if (!user || pulseScore === null) return;

    const userName = user.name || user.username || "";
    const userDept = user.dept || "";
    
    // Find employee in org chart to get department
    const employee = orgData.find((e) => e["Ad Soyad"] === userName);
    const departmentName = employee?.Departman || userDept;
    const departmentId = departmentName; // Simple mapping

    const pulseData = {
      employee_id: userName,
      employee_name: userName,
      department_id: departmentId,
      department_name: departmentName,
      score: pulseScore,
      week_number: weekKey,
    };

    try {
      // First save to localStorage (always works)
      const newAnswer = { ...pulseData, id: pulseAnswers.length + 1, created_at: new Date().toISOString() };
      const updated = [...pulseAnswers, newAnswer];
      setStorageData(STORAGE_KEYS.PULSE_ANSWERS, updated);
      setPulseAnswers(updated); // Update state immediately
      
      // Try to save to backend (optional, non-blocking)
      try {
        const response = await fetch(API_BASE_URL + "/api/pulse-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pulseData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn("Backend kayıt hatası (localStorage'a kaydedildi):", errorText);
        }
      } catch (backendError) {
        // Backend çalışmıyor veya erişilemiyor, ama localStorage'a kaydedildi
        console.warn("Backend erişilemedi (localStorage'a kaydedildi):", backendError);
      }
      
      // Show confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
      // Reset
      setPulseScore(null);
    } catch (error) {
      console.error("Pulse submission error:", error);
      alert(`Kayıt sırasında bir hata oluştu: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
    }
  };

  if (dataLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Skeleton className="h-5 w-1/4" />
        <div className="mt-4">
          <SkeletonTable rows={6} cols={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-800">Eğitim Takip</h1>
        </div>
        <p className="text-xs text-slate-500">Eğitim atama, takip ve gelişim analizi</p>
        {isManager && (
          <div className="mt-3">
            <Link
              href="/gelisim"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Kişisel Gelişim Planı (Aksiyon Merkezi)
            </Link>
          </div>
        )}
        <div className="sr-only">
          <span data-testid="dqi-selected-employee-name">{selectedPerson ?? ""}</span>
          <span data-testid="dqi-selected-employee-id">{selectedEmployeeFromMatrix?.id ?? ""}</span>
          <span data-testid="dqi-test-score">{toScore(selectedEmployeeFromMatrix?.test_score) ?? ""}</span>
          <span data-testid="dqi-manager-score">{toScore(selectedEmployeeFromMatrix?.manager_score) ?? ""}</span>
          <span data-testid="dqi-position-score">{toScore(selectedEmployeeFromMatrix?.position_competency_score ?? selectedEmployeeFromMatrix?.targetCompetencyScore) ?? ""}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("development")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "development"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Gelişim & Görevlerim
          </button>
        </div>
          </div>

          <div>
        {activeTab === "development" && (
          <>
            {/* Haftalık Check-in Card */}
            {shouldShowPulseCard && (
              <div className="mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl shadow-lg p-6 relative overflow-hidden">
                {showConfetti && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Sparkles className="w-16 h-16 text-yellow-400 animate-pulse" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Haftalık Check-in</h3>
                    <p className="text-xs text-slate-600">Bu hafta nasıl geçti?</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-slate-700 mb-3">
                    Haftanızı aşağıdaki emoji kartlarıyla değerlendirin:
                  </p>
                  
                  {/* Emoji Alternative */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    {[
                      { emoji: "😢", score: 1, label: "Çok Kötü" },
                      { emoji: "😕", score: 3, label: "Kötü" },
                      { emoji: "😐", score: 5, label: "Orta" },
                      { emoji: "🙂", score: 7, label: "İyi" },
                      { emoji: "😊", score: 9, label: "Harika" },
                    ].map(({ emoji, score, label }) => (
                      <button
                        key={score}
                        onClick={() => setPulseScore(score)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          pulseScore === score
                            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                            : "border-slate-300 bg-white hover:border-blue-400"
                        }`}
                      >
                        <div className="text-2xl mb-1">{emoji}</div>
                        <div className="text-xs text-slate-600">{label}</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitPulse}
                      disabled={pulseScore === null}
                      className={`w-auto px-5 py-2.5 rounded-lg font-semibold text-white transition-all ${
                        pulseScore === null
                          ? "bg-slate-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
                      }`}
                    >
                      {showConfetti ? "🎉 Gönderildi!" : "Gönder"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis View */}
            <details className="mb-4 bg-white border border-slate-200 rounded-lg shadow-sm" open>
              <summary className="cursor-pointer px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800">
                Yetkinlik Analizimi ve Puanlarımı Göster
              </summary>
              <div className="p-4">
              {competencyAnalysis && Object.keys(competencyAnalysis.scores).length > 0 ? (
                <>
                  {/* Performance Summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-slate-600 mb-1 uppercase tracking-wider">Yıl Sonu Perf.</p>
                      <p className="text-xl font-semibold text-slate-800 font-mono">
                        {formatScore(competencyAnalysis.perf)} / 5.0
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Yönetici puanı
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                      <p className="text-xs text-slate-600 mb-1 uppercase tracking-wider">Potansiyel</p>
                      <p className="text-xl font-semibold text-slate-800 font-mono">
                        {formatScore(competencyAnalysis.pot)} / 5.0
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Gelecek potansiyeli
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded border border-purple-200">
                      <p className="text-xs text-slate-600 mb-1 uppercase tracking-wider">Yetkinlik Ort.</p>
                      <p className="text-xl font-semibold text-slate-800 font-mono">
                        {(() => {
                          const scoreValues = Object.values(competencyAnalysis.scores)
                            .map((score) => toScore(score))
                            .filter((score): score is number => score !== null);
                          if (scoreValues.length === 0) {
                            return "—";
                          }
                          const avg = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
                          return formatScore(avg);
                        })()}{" "}
                        / 5.0
                      </p>
          </div>
        </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Radar Chart - Yetenek Matrisi ile aynı format */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-slate-800">Yetkinlik Radar Grafiği</h3>
                        {user && orgData.find((p) => p["Ad Soyad"] === user.name)?.Pozisyon && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
                            Hedef: {orgData.find((p) => p["Ad Soyad"] === user.name)?.Pozisyon}
                          </span>
                        )}
                      </div>
                      {competencyAnalysis?.radarData && competencyAnalysis.radarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart 
                          key={`radar-${user?.name || 'default'}-${competencyAnalysis.radarData.length}-${Date.now()}`}
                          data={competencyAnalysis.radarData}
                          cx="50%" 
                          cy="50%" 
                          outerRadius="70%"
                          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                          <PolarGrid stroke="#E5E7EB" />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: '#6B7280', fontSize: 10 }} 
                            style={{ fontSize: '10px' }}
                          />
                          <PolarRadiusAxis 
                            angle={30} 
                            domain={[0, 5]} 
                            tick={{ fill: '#9CA3AF', fontSize: 9 }}
                            tickCount={6}
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
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                            formatter={(value) => <span style={{ fontSize: '12px', color: '#374151' }}>{value}</span>}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '12px', 
                              backgroundColor: 'white',
                              border: '1px solid #E5E7EB',
                              padding: '8px 12px'
                            }}
                            formatter={(value: any, name?: string) => [
                              `${formatScore(value)} / 5.0`,
                              name ?? ""
                            ]}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[400px] text-slate-400">
                          <div className="text-center">
                            <BrainCircuit className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium mb-1">Radar grafiği verisi yükleniyor...</p>
                            <p className="text-xs text-slate-500">
                              {!competencyAnalysis 
                                ? "Yetkinlik analizi yapılamadı. Lütfen giriş yaptığınızdan emin olun."
                                : !competencyAnalysis.radarData || competencyAnalysis.radarData.length === 0
                                ? "Lütfen 360 Değerlendirme modülünden değerlendirme yapın veya Yetenek Matrisi'nden veri oluşturun."
                                : "Veri yükleniyor..."}
                            </p>
                            {competencyAnalysis && (
                              <p className="text-xs text-slate-400 mt-2">
                                Debug: radarData length = {competencyAnalysis.radarData?.length || 0}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Development Areas - Gap Analizi ile */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-violet-500" />
                        Gelişim Fırsatları
                      </h3>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {/* Kritik Eksikler */}
                        {competencyAnalysis.analysisReport.criticalFail.length > 0 && (
                          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                            <p className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              🚨 Kritik Eksikler (Pozisyon için Zorunlu)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {competencyAnalysis.analysisReport.criticalFail.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-full border border-red-200 bg-red-100 text-[11px] text-red-700 font-medium"
                                >
                                  {item.name} · Mevcut {formatScore(item.current)} / Hedef {formatScore(item.target)} · Eksik {formatScore(Math.abs(item.gap))}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Gelişim Alanları */}
                        {competencyAnalysis.analysisReport.moderateGap.length > 0 && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              ⚠️ Gelişim Alanları
                            </p>
                            <ul className="space-y-1.5">
                              {competencyAnalysis.analysisReport.moderateGap.map((item, idx) => (
                                <li key={idx} className="text-xs text-amber-700 pl-2 border-l-2 border-amber-300">
                                  <strong>{item.name}</strong>: Mevcut {formatScore(item.current)} / Hedef {formatScore(item.target)}
                                  <span className="ml-1 text-amber-600">(Eksik: {formatScore(Math.abs(item.gap))})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Güçlü Yönler */}
                        {competencyAnalysis.analysisReport.strength.length > 0 && (
                          <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                            <p className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              💎 Güçlü Yönler
                            </p>
                            <p className="text-xs text-green-700">
                              {competencyAnalysis.analysisReport.strength.map(s => s.name).join(", ")}
                            </p>
                          </div>
                        )}
                        
                        {/* Tam Uyum */}
                        {competencyAnalysis.analysisReport.criticalFail.length === 0 && 
                         competencyAnalysis.analysisReport.moderateGap.length === 0 && (
                          <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-center">
                            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                            <p className="text-xs font-bold text-green-800">Tam Uyum!</p>
                            <p className="text-xs text-green-600 mt-1">Tüm yetkinlikler hedef seviyede veya üzerinde.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-sm text-slate-600">
                    Henüz yetkinlik değerlendirmesi yapılmamış.
                  </p>
                </div>
              )}
              </div>
            </details>

            {/* Employee View */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {user?.name} - Eğitimlerim
                </h2>
              </div>
              <div className="p-4">
              {myTasks.length === 0 ? (
                <div className="p-6 text-center bg-green-50 rounded border border-green-200">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-green-800 font-medium">
                    Bekleyen eğitiminiz veya göreviniz yok.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map((task) => {
                    const { isLate, daysLate } = checkOverdue(task["Son Tarih"], task.Durum);
                    return (
                      <div
                        key={task.id}
                        className="p-3 border border-slate-200 rounded bg-slate-50 hover:bg-slate-100"
                      >
                        {isLate && (
                          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs text-red-800 font-semibold">
                              BU EĞİTİMİN SÜRESİ {daysLate} GÜN GEÇTİ!
                            </p>
                          </div>
                        )}

                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <p className="font-semibold text-slate-800">{task["Eğitim Adı"]}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              Son Tarih: {task["Son Tarih"]}
                            </p>
                          </div>
                          <div>
                            {task.Durum === "Atandı" && (
                              <>
                                <div className="mb-2">
                                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                    Başlanmadı
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleUpdateStatus(task.id, "Devam Ediyor")}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                  <Play className="w-4 h-4" />
                                  Başla ▶️
                                </button>
                              </>
                            )}
                            {task.Durum === "Devam Ediyor" && (
                              <>
                                <div className="mb-2">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    Sürüyor
                                  </span>
                                </div>
                                {showCompleteForm === task.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={completeNote}
                                      onChange={(e) => setCompleteNote(e.target.value)}
                                      placeholder="Tamamlama Notunuz (Varsa):"
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                      rows={2}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleUpdateStatus(task.id, "Tamamlandı", completeNote)
                                        }
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                      >
                                        Tamamlandı İşaretle
                                      </button>
                                      <button
                                        onClick={() => {
                                          setShowCompleteForm(null);
                                          setCompleteNote("");
                                        }}
                                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                                      >
                                        İptal
                                      </button>
                                    </div>
        </div>
      ) : (
                                  <button
                                    onClick={() => setShowCompleteForm(task.id)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Bitir ✅
                                  </button>
                                )}
                              </>
                            )}
                            {task.Durum === "Tamamlandı" && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                Tamamlandı
                              </span>
                            )}
                          </div>
                          <div>
                            {task["Personel Notu"] && (
                              <div className="p-2 bg-blue-50 rounded text-sm text-blue-800">
                                💬 <strong>Notunuz:</strong> {task["Personel Notu"]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
