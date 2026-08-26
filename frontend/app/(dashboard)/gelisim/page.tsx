
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getStorageData, STORAGE_KEYS, setStorageData } from "../../utils/storage";
import { useData } from "../../../context/DataContext";
import { BookOpen, Calendar, CheckCircle, ChevronDown, ChevronUp, X, Clock, Plus, Book, GraduationCap, Play } from "lucide-react";
import { TIERED_EDUCATION_DB } from "../../data/education";
import { filterDataByScope } from "../../utils/hierarchy";
import { createStandardRadarData, extractCompetencyScoresFromTalentMatrix, findEmployeeInTalentMatrix, matchEmployeeName, type CompetencyScores } from "../../utils/calculations";
import { formatScore, toScore } from "../../../lib/score";
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
import { API_BASE_URL } from "@/lib/apiConfig";

const COMPETENCY_NAMES: Record<string, string> = {
  DIG: "Dijital Okuryazarlık",
  ANA: "Analitik Düşünme",
  COM: "İletişim Becerileri",
  STR: "Stratejik Bakış",
  RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen",
  LRN: "Sürekli Öğrenme",
  ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin",
  TEA: "Takım Çalışması",
};

const COMPETENCY_CODES: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG",
  "Analitik Düşünme": "ANA",
  "İletişim Becerileri": "COM",
  "Stratejik Bakış": "STR",
  "Sonuç Odaklılık": "RES",
  "Detaylara Özen": "DET",
  "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH",
  "Öz-Disiplin": "DIS",
  "Takım Çalışması": "TEA",
};

interface TrainingAssignment {
  id: number | string;
  Personel: string;
  "Eğitim Adı": string;
  Yetkinlik?: string;
  Atayan: string;
  "Son Tarih": string;
  Durum: "Atandı" | "Devam Ediyor" | "Tamamlandı" | "Gecikti";
  "Personel Notu"?: string;
  "Atama Tarihi"?: string;
  // Legacy fields for backward compatibility
  personel?: string;
  eğitim_adı?: string;
  yetkinlik?: string;
  atayan?: string;
  son_tarih?: string;
  durum?: string;
}

// Send notification (ready for backend integration)
function sendNotification(toUser: string, message: string, type: string = "info") {
  console.log(`Notification to ${toUser}: ${message} (${type})`);
  // TODO: Implement API call to send notification
  // In production, this would call the backend API
}

// Get training data
function getTrainingData(): TrainingAssignment[] {
  return getStorageData<TrainingAssignment[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
}

// Get tiered recommendation (Python'daki get_tiered_recommendation ile aynı mantık)
function getTieredRecommendation(compCode: string, score: number) {
  // Kod bulunamazsa DEFAULT kullan
  const data = TIERED_EDUCATION_DB[compCode] || TIERED_EDUCATION_DB['DEFAULT'];
  if (!data) return null;
  
  let levelKey: "Level 1" | "Level 2" | "Level 3" = "Level 1";
  let color = "blue";
  
  if (score < 3.0) {
    levelKey = "Level 1";
    color = "red";
  } else if (score < 4.0) {
    levelKey = "Level 2";
    color = "orange";
  } else {
    levelKey = "Level 3";
    color = "green";
  }
  
  const levelData = data[levelKey];
  if (!levelData) return null;
  
  return {
    ...levelData,
    level_name: levelKey,
    color: color,
    title: levelData.title,
    desc: `Analiz: Bu seviye için ${levelData.books.length} kitap ve ${levelData.courses.length} kurs önerisi bulunmaktadır.`,
    books: levelData.books || [],
    courses: levelData.courses || [],
  };
}

function parseRecommendation(text: string) {
  const trimmed = text.trim();
  let title = trimmed;
  let meta = "";

  const parenMatch = trimmed.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) {
    meta = parenMatch[1];
    title = trimmed.replace(parenMatch[0], "").trim();
  }

  if (!meta) {
    const splitDash = trimmed.split(" - ");
    if (splitDash.length > 1) {
      title = splitDash[0].trim();
      meta = splitDash.slice(1).join(" - ").trim();
    } else {
      const splitEmDash = trimmed.split(" — ");
      if (splitEmDash.length > 1) {
        title = splitEmDash[0].trim();
        meta = splitEmDash.slice(1).join(" — ").trim();
      }
    }
  }

  return { title, meta };
}

// Assign training with notification
function assignTraining(
  employee: string,
  assigner: string,
  competency: string,
  title: string,
  dueDate: string
) {
  const newAssignment: TrainingAssignment = {
    id: Date.now(),
    Personel: employee,
    "Eğitim Adı": title,
    Yetkinlik: competency,
    Atayan: assigner,
    "Son Tarih": dueDate,
    Durum: "Atandı",
    "Personel Notu": "",
    "Atama Tarihi": new Date().toISOString().split("T")[0],
  };

  const existing = getTrainingData();
  const updated = [...existing, newAssignment];
  setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, updated);

  // Send notification
  sendNotification(employee, `📚 Size yeni bir eğitim atandı: ${title}`, "warning");
}

export default function GelisimPage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId") ?? searchParams.get("dqiEmployeeId");
  const employeeNameParam = (searchParams.get("employeeName") ?? searchParams.get("dqiEmployeeName") ?? "").trim() || null;
  let contextData;
  try {
    contextData = useData();
  } catch (error) {
    console.error("[GelisimPage] useData error:", error);
    contextData = { orgData: [], history360: [], loading: false };
  }
  
  const { orgData: contextOrgData = [], history360: contextHistory360 = [], loading: dataLoading = false } = contextData;
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [orgData, setOrgData] = useState<any[]>(contextOrgData || []);
  const [history360, setHistory360] = useState<any[]>(contextHistory360 || []);
  const [talentMatrixData, setTalentMatrixData] = useState<any[]>([]); // Backend'den gelen talent matrix verisi
  const [trainingAssignments, setTrainingAssignments] = useState<TrainingAssignment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set());
  const [popoverState, setPopoverState] = useState<{
    type: "book" | "course" | null;
    compCode: string;
    index: number;
    title: string;
  } | null>(null);
  const [selectedDueDate, setSelectedDueDate] = useState<string>("");
  const [hasAppliedQuerySelection, setHasAppliedQuerySelection] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (contextOrgData) {
      setOrgData(contextOrgData);
    }
    if (contextHistory360) {
      setHistory360(contextHistory360);
    }
  }, [contextOrgData, contextHistory360]);

  useEffect(() => {
    try {
      const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
      setUser(currentUser);

      const storedTraining = getTrainingData();
      setTrainingAssignments(storedTraining || []);

      // Storage temizlendiğinde state'leri temizle
      const handleStorageCleared = () => {
        setOrgData([]);
        setHistory360([]);
        setTalentMatrixData([]);
        setSelectedPerson("");
        setSelectedDepartment("");
      };

      window.addEventListener("storageCleared", handleStorageCleared);
      return () => {
        window.removeEventListener("storageCleared", handleStorageCleared);
      };
    } catch (error) {
      console.error("[GelisimPage] useEffect error:", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Backend'den talent matrix verisini çek (360 değerlendirme verisi için)
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
        
        console.log("[Gelişim Planı] Talent Matrix verisi yüklendi:", {
          count: rawData.length,
          sample: rawData[0],
        });
        
        setTalentMatrixData(rawData);
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

  // Get allowed data based on user role (using hierarchy utility)
  const getAllowedData = useMemo(() => {
    if (!user || !orgData || orgData.length === 0) return [];
    try {
      return filterDataByScope(orgData, user);
    } catch (error) {
      console.error("Error filtering data by scope:", error);
      return [];
    }
  }, [orgData, user]);

  const normalizeValue = (value?: string) => (value ?? "").toString().trim().toLowerCase();

  const getDepartmentName = (person: any) =>
    person?.Departman ||
    person?.departman ||
    person?.department ||
    person?.department_name ||
    person?.departmentName ||
    person?.dept_name ||
    person?.dept ||
    "";

  const getPersonName = (person: any) =>
    (
      person?.["Ad Soyad"] ||
      person?.adSoyad ||
      person?.ad_soyad ||
      person?.name ||
      person?.fullName ||
      person?.Personel ||
      person?.personel ||
      ""
    ).trim();

  const findDepartmentByPerson = (personName: string) => {
    if (!personName) return "";
    const normalizedName = normalizeValue(personName);
    const matchInAllowed = getAllowedData.find((p: any) =>
      normalizeValue(getPersonName(p)) === normalizedName
    );
    const matchInOrg = matchInAllowed
      ? matchInAllowed
      : orgData.find((p: any) =>
          normalizeValue(getPersonName(p)) === normalizedName
        );
    return getDepartmentName(matchInOrg);
  };

  const staffListAll = useMemo(() => {
    if (!getAllowedData || getAllowedData.length === 0) return [];
    return getAllowedData
      .map((p: any) => getPersonName(p))
      .filter(Boolean)
      .sort();
  }, [getAllowedData]);

  const departmentList = useMemo(() => {
    if (!getAllowedData || getAllowedData.length === 0) return [];
    const departments = Array.from(
      new Set(
        getAllowedData
          .map((p: any) => getDepartmentName(p))
          .filter((dept: string) => Boolean(dept))
      )
    );
    return departments.sort();
  }, [getAllowedData]);

  const hasDepartmentData = departmentList.length > 0;

  const staffList = useMemo(() => {
    if (!getAllowedData || getAllowedData.length === 0) return [];
    if (!hasDepartmentData) return staffListAll;
    if (!selectedDepartment) return [];
    const normalizedDept = normalizeValue(selectedDepartment);
    return getAllowedData
      .filter((p: any) => normalizeValue(getDepartmentName(p)) === normalizedDept)
      .map((p: any) => getPersonName(p))
      .filter(Boolean)
      .sort();
  }, [getAllowedData, selectedDepartment, staffListAll, hasDepartmentData]);

  useEffect(() => {
    if (!hasDepartmentData) return;
    if (!selectedDepartment && departmentList.length > 0) {
      setSelectedDepartment(departmentList[0]);
      return;
    }
    if (
      selectedDepartment &&
      departmentList.length > 0 &&
      !departmentList.some(
        (dept) => normalizeValue(dept) === normalizeValue(selectedDepartment)
      )
    ) {
      setSelectedDepartment("");
      setSelectedPerson("");
    }
  }, [departmentList, selectedDepartment, hasDepartmentData]);

  useEffect(() => {
    if (!selectedPerson) return;
    if (selectedDepartment && staffList.includes(selectedPerson)) return;
    const dept = findDepartmentByPerson(selectedPerson);
    if (dept && !selectedDepartment) {
      setSelectedDepartment(dept);
      return;
    }
    if (dept && selectedDepartment && normalizeValue(dept) !== normalizeValue(selectedDepartment)) {
      setSelectedPerson("");
    }
  }, [selectedPerson, selectedDepartment, staffList, getAllowedData, orgData]);

  const person360 = useMemo(() => {
    if (!selectedPerson) return null;
    
    console.log("[Gelişim Planı] person360 arama:", {
      selectedPerson,
      history360Length: history360?.length || 0,
      talentMatrixDataLength: talentMatrixData?.length || 0,
    });
    
    // Önce history360 context'inden ara
    if (history360 && history360.length > 0) {
      const found = history360.find((p) => 
        (p.Personel === selectedPerson) || 
        (p.personel === selectedPerson) ||
        (p.target === selectedPerson) ||
        ((p["Ad Soyad"] || p.name) === selectedPerson)
      );
      if (found) {
        console.log("[Gelişim Planı] history360'da bulundu:", found);
        return found;
      }
    }
    
    // Eğer history360'da yoksa, backend'den gelen talent-matrix verisinden oluştur
    if (talentMatrixData && talentMatrixData.length > 0) {
      const emp = talentMatrixData.find((e) => {
        const empName = (e.name || e["Ad Soyad"] || "").trim();
        const selectedName = selectedPerson.trim();
        return empName === selectedName || 
               empName.toLowerCase() === selectedName.toLowerCase() ||
               empName.includes(selectedName) ||
               selectedName.includes(empName);
      });
      
      console.log("[Gelişim Planı] Talent matrix'te arama:", {
        found: !!emp,
        empName: emp?.name || emp?.["Ad Soyad"],
        hasManagerScores: !!(emp?.manager_scores),
        hasScores: !!(emp?.scores),
      });
      
      if (emp) {
        // Backend'den gelen manager_scores veya scores'u 360 değerlendirme formatına dönüştür
        const managerScores = emp.manager_scores || emp.scores || {}; // Fallback: scores kullan
        const converted360: any = {
          Personel: emp.name || emp["Ad Soyad"],
          personel: emp.name || emp["Ad Soyad"],
          target: emp.name || emp["Ad Soyad"],
          name: emp.name || emp["Ad Soyad"],
          "Ad Soyad": emp.name || emp["Ad Soyad"],
          Performans: emp.performance || 3.0,
          Potansiyel: emp.potential || 3.0,
        };
        
        // Yetkinlik kodlarını 360 formatına dönüştür (DIG_Mgr, ANA_Mgr, vb.)
        Object.keys(COMPETENCY_NAMES).forEach((code) => {
          // Önce manager_scores'tan, yoksa scores'tan, yoksa varsayılan değer
          const score = managerScores[code] || emp.scores?.[code] || 3.0;
          converted360[`${code}_Mgr`] = score;
          converted360[`${code}_Mgr1`] = score;
          converted360[`${code}_Mgr2`] = score;
          // Peer ve Self için de varsayılan değerler ekle
          converted360[`${code}_Peer`] = Math.max(1.0, score - 0.2);
          converted360[`${code}_Self`] = Math.max(1.0, score + 0.1);
        });
        
        console.log("[Gelişim Planı] 360 formatına dönüştürüldü:", converted360);
        return converted360;
      }
    }
    
    // Son çare: Organizasyon verisinden varsayılan değerlerle oluştur
    if (orgData && orgData.length > 0) {
      const orgEmp = orgData.find((e) => {
        const empName = (e["Ad Soyad"] || e.name || "").trim();
        const selectedName = selectedPerson.trim();
        return empName === selectedName || 
               empName.toLowerCase() === selectedName.toLowerCase();
      });
      
      if (orgEmp) {
        console.log("[Gelişim Planı] Organizasyon verisinden varsayılan 360 oluşturuluyor:", orgEmp);
        const default360: any = {
          Personel: orgEmp["Ad Soyad"] || orgEmp.name,
          personel: orgEmp["Ad Soyad"] || orgEmp.name,
          target: orgEmp["Ad Soyad"] || orgEmp.name,
          name: orgEmp["Ad Soyad"] || orgEmp.name,
          "Ad Soyad": orgEmp["Ad Soyad"] || orgEmp.name,
          Performans: orgEmp.Performans || 3.0,
          Potansiyel: orgEmp.Potansiyel || 3.0,
        };
        
        // Varsayılan yetkinlik puanları (performans etrafında)
        const baseScore = orgEmp.Performans || 3.0;
        Object.keys(COMPETENCY_NAMES).forEach((code) => {
          const score = baseScore; // Performans puanını kullan
          default360[`${code}_Mgr`] = score;
          default360[`${code}_Mgr1`] = score;
          default360[`${code}_Mgr2`] = score;
          default360[`${code}_Peer`] = Math.max(1.0, score - 0.2);
          default360[`${code}_Self`] = Math.max(1.0, score + 0.1);
        });
        
        console.log("[Gelişim Planı] Varsayılan 360 oluşturuldu:", default360);
        return default360;
      }
    }
    
    console.warn("[Gelişim Planı] person360 bulunamadı:", selectedPerson);
    return null;
  }, [history360, talentMatrixData, selectedPerson, orgData]);

  const personAssignments = useMemo(() => {
    return trainingAssignments.filter((t) => {
      const personelName = t.Personel || t.personel || "";
      return personelName === selectedPerson || personelName.toLowerCase() === selectedPerson.toLowerCase();
    });
  }, [trainingAssignments, selectedPerson]);

  const assignedTitles = useMemo(() => {
    return personAssignments.map((t) => t["Eğitim Adı"] || t.eğitim_adı || "");
  }, [personAssignments]);

  // Yetkinlik skorlarını hesapla (Test + Yönetici ortalaması)
  const getPersonScores = useMemo(() => {
    if (!selectedPerson) return {};
    const scores: Record<string, number | null> = {};
    const codes = Object.keys(COMPETENCY_NAMES);

    const employeeFromBackend = findEmployeeInTalentMatrix(talentMatrixData, selectedPerson);
    if (employeeFromBackend) {
      const competencyScores = extractCompetencyScoresFromTalentMatrix(employeeFromBackend, COMPETENCY_NAMES);
      codes.forEach((code) => {
        const current = toScore(competencyScores.scores[code]);
        const manager = toScore(competencyScores.manager_scores[code]);

        let combined: number | null = null;
        if (current !== null && manager !== null) {
          combined = (current + manager) / 2;
        } else {
          combined = current ?? manager;
        }
        scores[COMPETENCY_NAMES[code]] = combined;
      });
      return scores;
    }

    if (!person360) return {};
    codes.forEach((code) => {
      // Fallback: person360 üzerinden yönetici/peer/self puanları
      const mgrValue = person360[`${code}_Mgr`] || 
                      person360[`${code}_Mgr2`] || 
                      person360[`${code}_Mgr1`] ||
                      person360[`${code}_Peer`] || 
                      person360[`${code}_Self`] || 
                      0;
      const parsedValue = typeof mgrValue === 'string' ? parseFloat(mgrValue) : (mgrValue ?? null);
      scores[COMPETENCY_NAMES[code]] = parsedValue === null || Number.isNaN(Number(parsedValue)) ? null : Number(parsedValue);
    });
    return scores;
  }, [selectedPerson, talentMatrixData, person360]);

  const personScores = getPersonScores;
  const averageCompetencyScore = useMemo(() => {
    const values = Object.values(personScores).filter((value) => value !== null && value > 0) as number[];
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [personScores]);

  // Yetkinlik analizi ve radar verisi (Yetenek Matrisi ve Eğitim modülü ile aynı format)
  const competencyAnalysis = useMemo(() => {
    if (!selectedPerson) return null;
    
    // Backend'den talent matrix verisini kullan (STANDART FONKSİYON)
    const employeeFromBackend = findEmployeeInTalentMatrix(talentMatrixData, selectedPerson);
    
    // Mevcut puanlar (Test) ve Yönetici puanları (360°) - STANDART FONKSİYON ile çıkar
    let currentScoresByCode: Record<string, number | null> = {};
    let managerScoresByCode: Record<string, number | null> = {};
    let targetScoresByCode: Record<string, number | null> = {};
    
    // Backend'den veri varsa onu kullan (STANDART FONKSİYON)
    if (employeeFromBackend) {
      const competencyScores = extractCompetencyScoresFromTalentMatrix(employeeFromBackend, COMPETENCY_NAMES);
      currentScoresByCode = competencyScores.scores;
      managerScoresByCode = competencyScores.manager_scores;
      targetScoresByCode = competencyScores.targets;
    } else {
      if (!person360) return null;
      // Fallback: person360'dan çek (sadece backend'de veri yoksa)
      Object.keys(COMPETENCY_NAMES).forEach((code) => {
        const mgrValue = person360[`${code}_Mgr`] || 
                        person360[`${code}_Mgr2`] || 
                        person360[`${code}_Mgr1`] || 
                        null;
        const parsedValue = typeof mgrValue === 'string' ? parseFloat(mgrValue) : (mgrValue ?? null);
        managerScoresByCode[code] = parsedValue === null || isNaN(Number(parsedValue)) ? null : Number(parsedValue);
        currentScoresByCode[code] = null;
      });
      // Hedef puanlar backend'den gelmediği için boş bırakılır
      targetScoresByCode = {};
    }
    
    // Radar grafiği için veri hazırla - 3 katmanlı: A (Test), B (Yönetici), C (Hedef)
    // Standart fonksiyon kullan (tüm modüllerde aynı mantık)
    const radarData = createStandardRadarData(
      {
        scores: currentScoresByCode,
        manager_scores: managerScoresByCode,
        targets: targetScoresByCode,
      },
      COMPETENCY_NAMES
    );
    
    return { radarData, targetScoresByCode, currentScoresByCode, managerScoresByCode };
  }, [selectedPerson, person360, talentMatrixData, orgData]);

  const gapByCode = useMemo(() => {
    if (!competencyAnalysis) return {};
    const { currentScoresByCode, managerScoresByCode, targetScoresByCode } = competencyAnalysis;
    const gaps: Record<string, { gap: number; current: number; target: number }> = {};
    Object.keys(COMPETENCY_NAMES).forEach((code) => {
      const current = toScore(currentScoresByCode[code]);
      const manager = toScore(managerScoresByCode[code]);
      const target = toScore(targetScoresByCode[code]);
      if (target === null) {
        return;
      }

      let combined = 0;
      if (current !== null && manager !== null) {
        combined = (current + manager) / 2;
      } else if (current !== null || manager !== null) {
        combined = (current ?? manager) as number;
      } else {
        return;
      }

      if (target > 0) {
        gaps[code] = {
          gap: Math.max(0, target - combined),
          current: combined,
          target,
        };
      }
    });
    return gaps;
  }, [competencyAnalysis]);

  const criticalGaps = useMemo(() => {
    return Object.entries(COMPETENCY_NAMES)
      .map(([code, name]) => {
        const gapInfo = gapByCode[code];
        if (!gapInfo || gapInfo.gap <= 0.3) return null;
        return { code, name, ...gapInfo };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.gap || 0) - (a?.gap || 0));
  }, [gapByCode]);

  const topCriticalGaps = useMemo(() => criticalGaps.slice(0, 3), [criticalGaps]);

  const sortedScores = useMemo(() => {
    return Object.entries(personScores).sort((a, b) => {
      const codeA = COMPETENCY_CODES[a[0]] || "";
      const codeB = COMPETENCY_CODES[b[0]] || "";
      const gapA = gapByCode[codeA]?.gap ?? 0;
      const gapB = gapByCode[codeB]?.gap ?? 0;
      const isPriorityA = gapA > 0.3;
      const isPriorityB = gapB > 0.3;
      if (isPriorityA !== isPriorityB) return isPriorityA ? -1 : 1;
      if (isPriorityA && isPriorityB) return gapB - gapA;
      const scoreA = a[1] ?? Number.POSITIVE_INFINITY;
      const scoreB = b[1] ?? Number.POSITIVE_INFINITY;
      return scoreA - scoreB;
    });
  }, [personScores, gapByCode]);

  // Auto-expand low scores
  useEffect(() => {
    if (selectedPerson && sortedScores.length > 0) {
      const lowScores = sortedScores
        .filter(([name, score]) => {
          const code = COMPETENCY_CODES[name] || "";
          const gap = gapByCode[code]?.gap ?? 0;
          return (score !== null && score < 3.5) || gap > 0.3;
        })
        .map(([name]) => name);
      setExpandedCompetencies(new Set(lowScores));
    }
  }, [selectedPerson, sortedScores, gapByCode]);

  const toggleExpanded = (compName: string) => {
    setExpandedCompetencies((prev) => {
      const next = new Set(prev);
      if (next.has(compName)) {
        next.delete(compName);
      } else {
        next.add(compName);
      }
      return next;
    });
  };

  const handleOpenPopover = (
    type: "book" | "course",
    compCode: string,
    index: number,
    title: string
  ) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + (type === "book" ? 21 : 30));
    setSelectedDueDate(defaultDate.toISOString().split("T")[0]);
    setPopoverState({ type, compCode, index, title });
  };

  const handleClosePopover = () => {
    setPopoverState(null);
    setSelectedDueDate("");
  };

  const handleConfirmAssign = () => {
    if (!popoverState || !selectedPerson || !selectedDueDate) return;

    const compName = Object.entries(COMPETENCY_CODES).find(
      ([_, code]) => code === popoverState.compCode
    )?.[0] || "";

    assignTraining(
      selectedPerson,
      user?.name || "Sistem",
      compName,
      popoverState.type === "book" ? `Kitap Okuma: ${popoverState.title}` : popoverState.title,
      selectedDueDate
    );

    // Refresh training assignments
    const updated = getTrainingData();
    setTrainingAssignments(updated);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(`✅ Başarılı! '${popoverState.title}' eğitimi atandı.`);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    handleClosePopover();
  };

  return (
    <div className="min-h-screen">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
            {toastMessage}
          </div>
        </div>
      )}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-semibold text-slate-800">
            ⏳ Kişisel Gelişim Planı (Aksiyon Merkezi)
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          Personelin yetkinlik açıklarına göre <strong>Kitap ve Kurs atamalarını</strong> süre belirterek yapabilirsiniz.
        </p>
        <div className="sr-only">
          <span data-testid="dqi-selected-employee-name">{selectedPerson ?? ""}</span>
          <span data-testid="dqi-selected-employee-id">{selectedEmployeeFromMatrix?.id ?? ""}</span>
          <span data-testid="dqi-test-score">{toScore(selectedEmployeeFromMatrix?.test_score) ?? ""}</span>
          <span data-testid="dqi-manager-score">{toScore(selectedEmployeeFromMatrix?.manager_score) ?? ""}</span>
          <span data-testid="dqi-position-score">{toScore(selectedEmployeeFromMatrix?.position_competency_score ?? selectedEmployeeFromMatrix?.targetCompetencyScore) ?? ""}</span>
        </div>
      </div>

      {!user ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Giriş yapınız.</p>
        </div>
      ) : dataLoading ? (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <Skeleton className="h-5 w-1/4" />
          <div className="mt-4">
            <SkeletonTable rows={6} cols={5} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Personel Seçimi - Python'daki col_sel, col_info mantığı */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                  Departman Seçiniz
                </label>
                <select
                  data-testid="dqi-department-select"
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSelectedPerson("");
                  }}
                  disabled={!hasDepartmentData}
                  className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                    !hasDepartmentData ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="">
                    {hasDepartmentData ? "Departman seçin..." : "Departman bilgisi yok"}
                  </option>
                  {departmentList.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider mt-4">
                  Personel Seçiniz
                </label>
                <select
                  data-testid="dqi-person-select"
                  value={selectedPerson}
                  onChange={(e) => setSelectedPerson(e.target.value)}
                  disabled={hasDepartmentData && !selectedDepartment}
                  className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                    hasDepartmentData && !selectedDepartment ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="">
                    {hasDepartmentData
                      ? selectedDepartment
                        ? "Personel seçin..."
                        : "Önce departman seçin..."
                      : "Personel seçin..."}
                  </option>
                  {staffList.map((name, index) => (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedPerson && (
              <div className="md:col-span-3">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{selectedPerson}</h3>
                      <p className="text-xs text-slate-600">
                        {Object.keys(personScores).length} yetkinlik değerlendirildi • 
                        Ortalama: {averageCompetencyScore.toFixed(1)} / 5.0
                      </p>
                      {topCriticalGaps.length > 0 ? (
                        <div className="mt-2">
                          <div className="text-[11px] font-semibold text-amber-700 mb-1">
                            Kritik farklar:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {topCriticalGaps.map((gap) => (
                              <span
                                key={gap?.name}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-medium"
                              >
                                {gap?.name} +{gap?.gap.toFixed(1)}
                              </span>
                            ))}
                            {criticalGaps.length > topCriticalGaps.length && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-medium">
                                +{criticalGaps.length - topCriticalGaps.length} diğer
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-600 mt-1">
                          Kritik fark bulunamadı.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!selectedPerson && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3 -mt-1" />
              {hasDepartmentData && !selectedDepartment ? (
                <p className="text-sm text-slate-600">Lütfen önce departman seçiniz.</p>
              ) : staffList.length === 0 ? (
                <>
                  <p className="text-sm text-slate-600 mb-2">
                    Personel listesi boş.
                  </p>
                  <p className="text-xs text-slate-500">
                    Lütfen önce organizasyon verilerini yükleyin veya Rich Demo oluşturun.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">Lütfen bir personel seçiniz.</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Sol menüden veya yukarıdaki listeden bir çalışan seçerek yapay zeka destekli gelişim önerilerini görüntüleyebilirsiniz.
                  </p>
                </>
              )}
            </div>
          )}

          {selectedPerson && !competencyAnalysis && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-2 font-medium">
                Bu personel için henüz yetkinlik değerlendirmesi yapılmamış.
              </p>
              <div className="text-xs text-slate-500 space-y-1 mt-3">
                <p>
                  Veri kaynakları kontrol edildi:
                </p>
                <ul className="list-disc list-inside text-left max-w-md mx-auto space-y-1 mt-2">
                  <li>360 Değerlendirme: {history360?.length > 0 ? `✅ ${history360.length} kayıt` : "❌ Veri yok"}</li>
                  <li>Talent Matrix: {talentMatrixData?.length > 0 ? `✅ ${talentMatrixData.length} personel` : "❌ Veri yok"}</li>
                </ul>
                <p className="mt-3 text-slate-600">
                  💡 <strong>Çözüm:</strong> Rich Demo oluşturduysanız, sayfayı yenileyin veya 360 Değerlendirme modülünden bu personel için değerlendirme yapın.
                </p>
              </div>
            </div>
          )}

          {selectedPerson && competencyAnalysis && (
            <>
              {/* Yetkinlik Radar Grafiği - Yetenek Matrisi ile aynı format */}
              {competencyAnalysis && competencyAnalysis.radarData && competencyAnalysis.radarData.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">Yetkinlik Radar Grafiği</h3>
                    {orgData.find((p) => p["Ad Soyad"] === selectedPerson)?.Pozisyon && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
                        Hedef: {orgData.find((p) => p["Ad Soyad"] === selectedPerson)?.Pozisyon}
                      </span>
                    )}
                  </div>
                  <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={competencyAnalysis.radarData}
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                      >
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6B7280' }} />
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
                        formatter={(value: string) => <span style={{ fontSize: '11px', color: '#374151' }}>{value}</span>}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "white", 
                          border: "1px solid #e5e7eb", 
                          borderRadius: "12px",
                          fontSize: "12px",
                          padding: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                        }}
                        formatter={(value: any, name?: string) => [
                          `${Number(value).toFixed(1)} / 5.0`,
                          name ?? ""
                        ]}
                          />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Mevcut Atamalar */}
              {personAssignments.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-sm font-semibold text-slate-800">
                      Mevcut Atamalar
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {personAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between hover:bg-slate-100"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {assignment["Eğitim Adı"] || assignment.eğitim_adı || ""}
                            </p>
                            <p className="text-xs text-slate-600">
                              {assignment.Yetkinlik || assignment.yetkinlik || "Genel"} • Son Tarih: {assignment["Son Tarih"] || assignment.son_tarih || ""}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              (assignment.Durum || assignment.durum) === "Tamamlandı"
                                ? "bg-green-100 text-green-700"
                                : (assignment.Durum || assignment.durum) === "Gecikti"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {assignment.Durum || assignment.durum || "Atandı"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Yetkinlik Kartları - Expander Style */}
              <div className="space-y-2">
                {sortedScores.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
                    <p className="text-sm text-slate-600">
                      Bu personel için yetkinlik skorları bulunamadı.
                    </p>
                  </div>
                ) : (
                  sortedScores.map(([compName, score]) => {
                    const compCode = COMPETENCY_CODES[compName] || "DEFAULT";
                    const gapInfo = gapByCode[compCode];
                    const gapValue = gapInfo?.gap ?? 0;
                    const targetValue = gapInfo?.target ?? 0;
                    const isPriorityGap = gapValue > 0.3;
                    const rec = getTieredRecommendation(compCode, score ?? 0);
                    if (!rec) return null;

                    const isExpanded = expandedCompetencies.has(compName);
                    const statusText =
                      score === null
                        ? "⏳ Bekleniyor"
                        : rec.color === "red"
                        ? "🔴 Gelişim Şart"
                        : rec.color === "orange"
                        ? "🟠 Geliştirilmeli"
                        : "🟢 İyi Durumda";

                    // Filter already assigned items
                    const availableBooks = rec.books.filter(
                      (b: string) => !assignedTitles.includes(`Kitap Okuma: ${b}`)
                    );
                    const availableCourses = rec.courses.filter(
                      (c: string) => !assignedTitles.includes(c)
                    );

                    return (
                      <div
                        key={compName}
                        className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
                      >
                        {/* Expander Header */}
                        <button
                          onClick={() => toggleExpanded(compName)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="text-left">
                            <h3 className="text-sm font-semibold text-slate-800">
                              {compName}
                              {isPriorityGap && (
                                <span className="ml-2 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                  Öncelikli
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-slate-600">
                              Puan: <span className="font-mono">{formatScore(score)}</span> / 5.0 • {statusText}
                              {targetValue > 0 ? (
                                <span className={isPriorityGap ? "text-amber-700" : "text-slate-500"}>
                                  {" "}
                                  • Hedef farkı +{gapValue.toFixed(1)} (Hedef {targetValue.toFixed(1)})
                                </span>
                              ) : null}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {/* Expander Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-slate-200">
                            <div className="pt-3 mb-3">
                              <p className="text-xs font-medium text-slate-700 mb-1">
                                <strong>Hedef:</strong> {rec.title} ({rec.level_name})
                              </p>
                              <p className="text-xs text-slate-500 italic">
                                {rec.desc}
                              </p>
                            </div>
                            
                            <div className="border-t border-slate-200 my-3"></div>

                            <div className="grid md:grid-cols-2 gap-4 mt-3">
                              {/* Kitap Önerileri */}
                              <div>
                                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                  <Book className="w-3.5 h-3.5" />
                                  📖 Kitap Önerileri
                                </h4>
                                {availableBooks.length === 0 ? (
                                  rec.books.length > 0 ? (
                                    <div className="p-2 bg-green-50 rounded border border-green-200">
                                      <p className="text-xs text-green-700 font-medium">
                                        ✅ Tüm kitaplar atandı.
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic">
                                      Bu seviye için kitap önerisi yok.
                                    </p>
                                  )
                                ) : (
                                  <div className="space-y-2">
                                    {availableBooks.map((book: string, idx: number) => {
                                      const { title, meta } = parseRecommendation(book);
                                      return (
                                        <div
                                          key={idx}
                                          className="p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-3 hover:border-slate-300 hover:shadow-sm transition-all"
                                        >
                                          <div className="w-9 h-9 bg-indigo-50 rounded-md flex items-center justify-center text-indigo-600">
                                            <Book className="w-4 h-4" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 truncate">{title}</p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                              {meta || "Yazar bilgisi yok"}
                                            </p>
                                          </div>
                                          <button
                                            onClick={() =>
                                              handleOpenPopover("book", compCode, idx, book)
                                            }
                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1"
                                          >
                                            <Plus className="w-3 h-3" />
                                            Ata
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Kurs Önerileri */}
                              <div>
                                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  🎓 Kurs Önerileri
                                </h4>
                                {availableCourses.length === 0 ? (
                                  rec.courses.length > 0 ? (
                                    <div className="p-2 bg-green-50 rounded border border-green-200">
                                      <p className="text-xs text-green-700 font-medium">
                                        ✅ Tüm kurslar atandı.
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic">
                                      Bu seviye için kurs önerisi yok.
                                    </p>
                                  )
                                ) : (
                                  <div className="space-y-2">
                                    {availableCourses.map((course: string, idx: number) => {
                                      const { title, meta } = parseRecommendation(course);
                                      return (
                                        <div
                                          key={idx}
                                          className="p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-3 hover:border-slate-300 hover:shadow-sm transition-all"
                                        >
                                          <div className="w-9 h-9 bg-emerald-50 rounded-md flex items-center justify-center text-emerald-600">
                                            <Play className="w-4 h-4" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 truncate">{title}</p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                              {meta || "Platform bilgisi yok"}
                                            </p>
                                          </div>
                                          <button
                                            onClick={() =>
                                              handleOpenPopover("course", compCode, idx, course)
                                            }
                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1"
                                          >
                                            <Plus className="w-3 h-3" />
                                            Ata
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Popover Modal - Python'daki popover mantığına benzer */}
          {popoverState && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClosePopover}>
              <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-5 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {popoverState.type === "book" ? "📖 Kitap" : "🎓 Kurs"} Atama
                  </h3>
                  <button
                    onClick={handleClosePopover}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-600 mb-1">
                    <strong>{popoverState.type === "book" ? "Kitap:" : "Kurs:"}</strong>
                  </p>
                  <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">
                    {popoverState.title}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                    Son Tarih
                  </label>
                  <input
                    type="date"
                    value={selectedDueDate}
                    onChange={(e) => setSelectedDueDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleClosePopover}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleConfirmAssign}
                    disabled={!selectedDueDate}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg text-white transition-colors font-medium ${
                      !selectedDueDate
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow"
                    }`}
                  >
                    Onayla ve Ata
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
