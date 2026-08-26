"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { useData } from "../../../context/DataContext";
import { Target, Save, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { JOB_PROFILES } from "../../data/jobData";
import { getManageableEmployees } from "../../utils/hierarchy";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import {
  createStandardRadarData,
  extractCompetencyScoresFromTalentMatrix,
  findEmployeeInTalentMatrix,
} from "../../utils/calculations";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "@/components/charts/recharts";
import { toScore } from "../../../lib/score";
import BudgetManagementPanel from "../../../components/budget/BudgetManagementPanel";
import { API_BASE_URL } from "@/lib/apiConfig";

interface History360Entry {
  Personel: string;
  Departman?: string;
  Pozisyon?: string;
  Performans: number;
  Potansiyel: number;
  date: string;
  is_star_performer?: boolean;  // Star Performer flag
  DIG_Mgr?: number;
  DIG_Mgr2?: number;
  ANA_Mgr?: number;
  ANA_Mgr2?: number;
  RES_Mgr?: number;
  RES_Mgr2?: number;
  DET_Mgr?: number;
  DET_Mgr2?: number;
  LRN_Mgr?: number;
  LRN_Mgr2?: number;
  ETH_Mgr?: number;
  ETH_Mgr2?: number;
  DIS_Mgr?: number;
  DIS_Mgr2?: number;
  STR_Mgr?: number;
  STR_Mgr2?: number;
  TEA_Mgr?: number;
  TEA_Mgr2?: number;
  COM_Mgr?: number;
  COM_Mgr2?: number;
  Performans_Mgr1?: number;
  Performans_Mgr2?: number;
}

interface OrgChartEntry {
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
}

interface Competency {
  code: string;
  name: string;
}

const formatDeptCompare = (personScore: number | null, deptAvg: number | null) => {
  if (personScore === null || deptAvg === null) return null;
  const delta = personScore - deptAvg;
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const deltaText = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
  return `Departman Ort.: ${deptAvg.toFixed(1)} (${arrow} ${deltaText})`;
};

const COMPETENCIES: Competency[] = [
  { code: "DIG", name: "Dijital Okuryazarlık" },
  { code: "ANA", name: "Analitik Düşünme" },
  { code: "RES", name: "Sonuç Odaklılık" },
  { code: "DET", name: "Detaylara Özen" },
  { code: "LRN", name: "Sürekli Öğrenme" },
  { code: "ETH", name: "Etik ve Uyum" },
  { code: "DIS", name: "Öz-Disiplin" },
  { code: "STR", name: "Stratejik Bakış" },
  { code: "TEA", name: "Takım Çalışması" },
  { code: "COM", name: "İletişim Becerileri" },
];

const COMPETENCY_MAP: Record<string, string> = Object.fromEntries(
  COMPETENCIES.map((comp) => [comp.code, comp.name])
);

export default function DegerlendirmePage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId") ?? searchParams.get("dqiEmployeeId");
  const employeeNameParam = (searchParams.get("employeeName") ?? searchParams.get("dqiEmployeeName") ?? "").trim() || null;
  const { orgData: contextOrgData, history360: contextHistory360, loading: dataLoading } = useData();
  const [history360, setHistory360] = useState<History360Entry[]>(contextHistory360);
  const [orgData, setOrgData] = useState<OrgChartEntry[]>(contextOrgData);
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [hasAppliedQuerySelection, setHasAppliedQuerySelection] = useState(false);
  const [evalType, setEvalType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [talentMatrixData, setTalentMatrixData] = useState<any[]>([]);
  
  // Form state
  const [competencyScores, setCompetencyScores] = useState<Record<string, number>>({});
  const [performanceScore, setPerformanceScore] = useState<number>(3.0);
  const [isStarPerformer, setIsStarPerformer] = useState<boolean>(false);
  const [salaryRecommendation, setSalaryRecommendation] = useState<number | "">("");
  const [salaryRecommendationLoading, setSalaryRecommendationLoading] = useState(false);
  const [salaryRecommendationError, setSalaryRecommendationError] = useState<string | null>(null);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
  }, []);

  const normalizeDept = (value: string) => value.trim().toLowerCase();
  const isDirectorPosition = (position: string) => {
    const pos = position.toLowerCase();
    return pos.includes("direktör") || pos.includes("director") || pos.includes("genel müdür");
  };
  const isManagerPosition = (position: string) => {
    const pos = position.toLowerCase();
    return pos.includes("müdür") || pos.includes("manager");
  };
  const getScoreColor = (score: number) => {
    if (score < 2.5) return "#ef4444"; // red
    if (score < 3.75) return "#f59e0b"; // amber
    return "#22c55e"; // green
  };

  // Sync with context data
  useEffect(() => {
    setHistory360(contextHistory360);
    setOrgData(contextOrgData);
  }, [contextHistory360, contextOrgData]);

  useEffect(() => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    if (!currentUser) {
      return;
    }
    setUser(currentUser);

    // Storage temizlendiğinde state'leri temizle
    const handleStorageCleared = () => {
      setHistory360([]);
      setOrgData([]);
      setSelectedPerson("");
      setCompetencyScores({});
    };

    window.addEventListener("storageCleared", handleStorageCleared);
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
    };
  }, []);

  useEffect(() => {
    const loadTalentMatrix = async () => {
      if (!user) return;

      const controller = new AbortController();
      try {
        const params = new URLSearchParams();
        const userRole = user.role;
        const userDept = user.dept || user.department || "";
        const userName = user.name || "";
        if (userRole) params.append("user_role", userRole);
        if (userDept) params.append("user_dept", userDept);
        if (userName) params.append("user_name", userName);
        params.append("_t", Date.now().toString());

        const response = await fetch(`/api/talent-matrix?${params.toString()}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setTalentMatrixData(result.data || []);
            localStorage.setItem("hr_talent_matrix", JSON.stringify(result.data || []));
            return;
          }
        }
      } catch (error) {
        console.warn("Talent matrix load error:", error);
      }

      const cached = getStorageData<any[]>("hr_talent_matrix", []);
      if (cached.length > 0) {
        setTalentMatrixData(cached);
      }
    };

    loadTalentMatrix();
  }, [user]);

  // Get selectable employees based on user role using hierarchy utility
  const selectableEmployees = useMemo(() => {
    if (!user || orgData.length === 0) return [];
    
    const manageable = getManageableEmployees(user, orgData);
    const currentUserName = user.name || "";
    
    // Filter out self and return sorted names
    return manageable
      .map((p) => p["Ad Soyad"])
      .filter((name) => name !== currentUserName)
      .sort();
  }, [user, orgData]);

  const selectedPersonInfo = useMemo(() => {
    if (!selectedPerson) return null;
    return orgData.find((p) => p["Ad Soyad"] === selectedPerson) || null;
  }, [selectedPerson, orgData]);

  const userDept = user?.dept || user?.department || "";
  const userRole = user?.role || "";

  const hasDirectorInDepartment = (deptName: string) => {
    if (!deptName || orgData.length === 0) return false;
    const normalizedDept = normalizeDept(deptName);
    return orgData.some((p) => {
      const dept = normalizeDept(p["Departman"] || "");
      return dept === normalizedDept && isDirectorPosition(p["Pozisyon"] || "");
    });
  };

  const hasDirectorInDept = useMemo(() => {
    return hasDirectorInDepartment(userDept);
  }, [orgData, userDept]);

  const canCeoManagePerson = (person: OrgChartEntry | null) => {
    if (!person) return false;
    if (isDirectorPosition(person.Pozisyon || "")) return true;
    if (isManagerPosition(person.Pozisyon || "") && !hasDirectorInDepartment(person.Departman || "")) {
      return true;
    }
    return false;
  };

  const canRecommendSalary = useMemo(() => {
    if (!selectedPersonInfo) return false;
    if (userRole === "CEO") return canCeoManagePerson(selectedPersonInfo);
    const personDept = selectedPersonInfo?.Departman || "";
    if (normalizeDept(userDept) !== normalizeDept(personDept)) return false;
    if (userRole === "DIRECTOR" || userRole === "Direktör") return true;
    if (userRole === "MANAGER") return !hasDirectorInDept;
    return false;
  }, [selectedPersonInfo, userDept, userRole, hasDirectorInDept]);

  const salaryRecommendationBlockedReason = useMemo(() => {
    if (!selectedPersonInfo) return "";
    if (userRole === "CEO") {
      if (canCeoManagePerson(selectedPersonInfo)) return "";
      return "CEO sadece direktörlere veya direktör olmayan departmanların en üst amirlerine maaş tavsiyesi verebilir.";
    }
    const personDept = selectedPersonInfo?.Departman || "";
    if (!personDept || normalizeDept(userDept) !== normalizeDept(personDept)) {
      return "Farklı departman personeli için maaş tavsiyesi verilemez.";
    }
    if (userRole === "MANAGER" && hasDirectorInDept) {
      return "Bu departmanda direktör bulunduğu için maaş tavsiyesini direktör vermelidir.";
    }
    if (userRole === "DIRECTOR" || userRole === "Direktör" || userRole === "MANAGER") return "";
    return "Bu personel için maaş tavsiyesi verilemez.";
  }, [selectedPersonInfo, userDept, userRole, hasDirectorInDept]);

  // Get evaluation type options based on user role and selected person
  const getEvaluationTypeOptions = (): string[] => {
    if (!selectedPerson || !user) return [];
    
    const currentUserName = user.name;
    const currentUserRole = user.role;
    const personInfo = selectedPersonInfo;
    
    if (!personInfo) return [];

    const mgr1Name = personInfo["Yönetici 1"] || "";
    const mgr2Name = personInfo["Yönetici 2"] || "";

    const options: string[] = [];

    if (currentUserName === mgr1Name) {
      options.push("1. Yönetici (Doğrudan Amir)");
    } else if (currentUserName === mgr2Name) {
      options.push("2. Yönetici (Üst Amir/Direktör)");
    } else if (currentUserRole === "IK") {
      options.push("1. Yönetici (Doğrudan Amir)");
      options.push("2. Yönetici (Üst Amir/Direktör)");
    } else if (currentUserRole === "CEO") {
      options.push("1. Yönetici (Doğrudan Amir)");
    } else if (currentUserRole === "DIRECTOR") {
      options.push("2. Yönetici (Üst Amir/Direktör)");
    }

    return options;
  };

  // Load existing scores when person or eval type changes
  useEffect(() => {
    if (!selectedPerson || !evalType) {
      // Reset scores
      const defaultScores: Record<string, number> = {};
      COMPETENCIES.forEach((comp) => {
        defaultScores[comp.code] = 3.0;
      });
      setCompetencyScores(defaultScores);
      setPerformanceScore(3.0);
      return;
    }

    const personRecord = history360.find((p) => p.Personel === selectedPerson);
    if (personRecord) {
      const suffix = evalType.includes("1. Yönetici") ? "_Mgr" : "_Mgr2";
      const perfKey = evalType.includes("1. Yönetici") ? "Performans_Mgr1" : "Performans_Mgr2";

      const scores: Record<string, number> = {};
      COMPETENCIES.forEach((comp) => {
        const key = `${comp.code}${suffix}` as keyof History360Entry;
        scores[comp.code] = (personRecord[key] as number) || 3.0;
      });
      setCompetencyScores(scores);
      setPerformanceScore((personRecord[perfKey as keyof History360Entry] as number) || 3.0);
      setIsStarPerformer(personRecord.is_star_performer || false);
    } else {
      // Default scores
      const defaultScores: Record<string, number> = {};
      COMPETENCIES.forEach((comp) => {
        defaultScores[comp.code] = 3.0;
      });
      setCompetencyScores(defaultScores);
      setPerformanceScore(3.0);
      setIsStarPerformer(false);
    }
  }, [selectedPerson, evalType, history360]);

  useEffect(() => {
    const loadSalaryRecommendation = async () => {
      if (!selectedPerson || !currentPeriod) {
        setSalaryRecommendation("");
        return;
      }
      setSalaryRecommendationLoading(true);
      setSalaryRecommendationError(null);
      try {
        const params = new URLSearchParams();
        params.append("period", currentPeriod);
        if (userRole) params.append("manager_role", userRole);
        if (userDept) params.append("manager_dept", userDept);
        if (user?.name) params.append("manager_name", user.name);

        const response = await fetch(
          `${API_BASE_URL}/api/budget/request/${encodeURIComponent(selectedPerson)}?${params.toString()}`
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.requested_rate !== undefined) {
            setSalaryRecommendation(Number(result.data.requested_rate));
          } else {
            setSalaryRecommendation("");
          }
        } else {
          setSalaryRecommendation("");
        }
      } catch (error: any) {
        setSalaryRecommendationError("Maaş tavsiyesi yüklenemedi.");
      } finally {
        setSalaryRecommendationLoading(false);
      }
    };

    loadSalaryRecommendation();
  }, [selectedPerson, currentPeriod, userRole, userDept, user]);

  // Handle save
  const handleSave = async () => {
    if (!selectedPerson || !evalType) {
      alert("Lütfen personel ve değerlendirme tipi seçin");
      return;
    }

    setSaving(true);
    const personInfo = selectedPersonInfo;
    if (!personInfo) {
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(API_BASE_URL + "/api/360-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personel: selectedPerson,
          departman: personInfo.Departman,
          pozisyon: personInfo.Pozisyon,
          eval_type: evalType,
          competencies: competencyScores,
          performans: performanceScore,
          is_star_performer: isStarPerformer,  // Star Performer flag
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP Error:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        let salarySaveNote = "";
        if (canRecommendSalary && salaryRecommendation !== "") {
          try {
            const payload = {
              employee_id: selectedPerson,
              period: currentPeriod,
              requested_rate: Number(salaryRecommendation),
              status: "Gönderildi",
              manager_id: user?.name || "",
              manager_role: userRole,
              manager_dept: userDept,
            };
            const budgetRes = await fetch(API_BASE_URL + "/api/budget/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (budgetRes.ok) {
              salarySaveNote = "💰 Maaş tavsiyesi kaydedildi (Senaryo D).";
            } else {
              salarySaveNote = "⚠️ Maaş tavsiyesi kaydedilemedi.";
            }
          } catch (budgetError) {
            console.error("Budget save error:", budgetError);
            salarySaveNote = "⚠️ Maaş tavsiyesi kaydedilemedi.";
          }
        }

        // Reload data
        try {
          const data360Response = await fetch(API_BASE_URL + "/api/360-data");
          if (data360Response.ok) {
            const data360 = await data360Response.json();
            if (data360.success) {
              const data = data360.data || [];
              setHistory360(data);
              setStorageData(STORAGE_KEYS.HISTORY_360, data);
              
              // DataContext'e bildir
              window.dispatchEvent(new CustomEvent("dataUpdated"));
              
              // Tüm modülleri yenilemek için storage'ı temizle ve yeniden yükle
              // Talent Matrix ve Dashboard verilerini yenile
              const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
              if (currentUser) {
                const userRole = currentUser.role;
                const userDept = currentUser.dept || currentUser.department || "";
                const userName = currentUser.name || "";
                
                // Talent Matrix verilerini yenile
                const talentParams = new URLSearchParams();
                if (userRole) talentParams.append("user_role", userRole);
                if (userDept) talentParams.append("user_dept", userDept);
                if (userName) talentParams.append("user_name", userName);
                
                // Talent Matrix verilerini yenile (cache'i temizlemek için)
                fetch(`${API_BASE_URL}/api/talent-matrix?${talentParams.toString()}&_t=${Date.now()}`)
                  .then(r => r.json())
                  .then(talentResult => {
                    if (talentResult.success && talentResult.data) {
                      console.log("Talent Matrix verileri güncellendi");
                      // Tüm sayfaları yenilemek için event gönder
                      window.dispatchEvent(new CustomEvent("talentMatrixUpdated"));
                    }
                  })
                  .catch(err => console.error("Talent Matrix reload error:", err));
                
                // Org Chart verilerini de yenile
                fetch(`${API_BASE_URL}/api/org-chart?${talentParams.toString()}&_t=${Date.now()}`)
                  .then(r => r.json())
                  .then(orgResult => {
                    if (orgResult.success && orgResult.data) {
                      console.log("Org Chart verileri güncellendi");
                      setStorageData(STORAGE_KEYS.ORG_CHART, orgResult.data);
                      window.dispatchEvent(new CustomEvent("orgChartUpdated"));
                    }
                  })
                  .catch(err => console.error("Org Chart reload error:", err));
              }
            }
          }
        } catch (reloadError) {
          console.error("Data reload error:", reloadError);
        }
        
        // Impact bilgisi varsa göster
        if (result.impact && result.impact.length > 0) {
          const impact = result.impact[0];
          const competencyName = impact.competency_name || impact.competency_code;
          const change = impact.change > 0 ? `+${impact.change.toFixed(1)}` : impact.change.toFixed(1);
          alert(`✅ Değerlendirme kaydedildi!\n\n${competencyName}: ${change} puan değişti.\n\nTüm modüller otomatik güncellendi.${salarySaveNote ? `\n\n${salarySaveNote}` : ""}`);
        } else {
          alert(`✅ Değerlendirme başarıyla kaydedildi!${salarySaveNote ? `\n\n${salarySaveNote}` : ""}`);
        }
      } else {
        const errorMsg = result.error || "Bilinmeyen hata";
        console.error("Backend error:", result);
        alert(`❌ Kayıt sırasında bir hata oluştu:\n\n${errorMsg}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      const errorMsg = error instanceof Error ? error.message : "Bilinmeyen hata";
      alert(`❌ Kayıt sırasında bir hata oluştu:\n\n${errorMsg}\n\nLütfen konsolu kontrol edin.`);
    } finally {
      setSaving(false);
    }
  };

  const evalTypeOptions = getEvaluationTypeOptions();
  const personInfo = selectedPersonInfo;
  const personPosition = personInfo?.Pozisyon || "";

  // Calculate average scores from all evaluations for a person
  const calculateAverageScores = (personName: string) => {
    const personEvaluations = history360.filter((p) => p.Personel === personName);
    if (personEvaluations.length === 0) return null;

    const avgScores: Record<string, number> = {};
    let avgPerformance = 0;
    let avgPotential = 0;
    let validPerfCount = 0;
    let validPotCount = 0;

    COMPETENCIES.forEach((comp) => {
      const mgrValues: number[] = [];
      const mgr2Values: number[] = [];

      personEvaluations.forEach((evaluation) => {
        const mgrVal = (evaluation[`${comp.code}_Mgr` as keyof History360Entry] as number) || 0;
        const mgr2Val = (evaluation[`${comp.code}_Mgr2` as keyof History360Entry] as number) || 0;

        if (mgrVal > 0) mgrValues.push(mgrVal);
        if (mgr2Val > 0) mgr2Values.push(mgr2Val);
      });

      // Average of all evaluations
      const allValues = [...mgrValues, ...mgr2Values];
      avgScores[comp.code] = allValues.length > 0 
        ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length 
        : 0;
    });

    // Average performance and potential
    personEvaluations.forEach((evaluation) => {
      if (evaluation.Performans && !isNaN(evaluation.Performans)) {
        avgPerformance += evaluation.Performans;
        validPerfCount++;
      }
      if (evaluation.Potansiyel && !isNaN(evaluation.Potansiyel)) {
        avgPotential += evaluation.Potansiyel;
        validPotCount++;
      }
    });

    return {
      competencies: avgScores,
      performance: validPerfCount > 0 ? avgPerformance / validPerfCount : 0,
      potential: validPotCount > 0 ? avgPotential / validPotCount : 0,
    };
  };

  // Radar chart için veri hazırlama (ortalama puanlarla)
  const avgScores = selectedPerson ? calculateAverageScores(selectedPerson) : null;
  const radarData = useMemo(() => {
    if (!selectedPerson || talentMatrixData.length === 0) return [];
    const employee = findEmployeeInTalentMatrix(talentMatrixData, selectedPerson);
    if (!employee) return [];

    const competencyScores = extractCompetencyScoresFromTalentMatrix(employee, COMPETENCY_MAP);
    const standardRadar = createStandardRadarData(competencyScores, COMPETENCY_MAP);
    // 3 katmanlı radar: A (Test), B (Yönetici), C (Hedef)
    return standardRadar.map(({ subject, A, B, C, fullMark }) => ({
      subject,
      test: A,      // Mevcut (Test) puanı
      manager: B,   // Yönetici (360°) puanı
      target: C,    // Hedef (Rol) puanı
      fullMark,
    }));
  }, [selectedPerson, talentMatrixData]);

  const selectedEmployeeFromMatrix = useMemo(() => {
    if (!selectedPerson || talentMatrixData.length === 0) return null;
    return findEmployeeInTalentMatrix(talentMatrixData, selectedPerson);
  }, [selectedPerson, talentMatrixData]);

  const dqiTestScore = useMemo(() => toScore(selectedEmployeeFromMatrix?.test_score), [selectedEmployeeFromMatrix]);
  const dqiManagerScore = useMemo(() => toScore(selectedEmployeeFromMatrix?.manager_score), [selectedEmployeeFromMatrix]);
  const getTargetAverageScore = (employee: any): number | null => {
    if (!employee) return null;
    const { targets } = extractCompetencyScoresFromTalentMatrix(employee, COMPETENCY_MAP);
    const values = Object.values(targets)
      .map((val) => toScore(val))
      .filter((val): val is number => val !== null);
    if (values.length > 0) {
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    return toScore(employee.position_competency_score ?? employee.targetCompetencyScore);
  };

  const dqiPositionScore = useMemo(
    () => getTargetAverageScore(selectedEmployeeFromMatrix),
    [selectedEmployeeFromMatrix]
  );

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
    talentMatrixData.forEach((emp: any) => {
      const dept = emp.department || emp.Departman;
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
      const testScore = toScore(emp.test_score);
      if (testScore !== null) {
        stats[dept].testSum += testScore;
        stats[dept].testCount += 1;
      }
      const managerScore = toScore(emp.manager_score);
      if (managerScore !== null) {
        stats[dept].managerSum += managerScore;
        stats[dept].managerCount += 1;
      }
      const positionScore = getTargetAverageScore(emp);
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
  }, [talentMatrixData]);

  const deptAvgScores = useMemo(() => {
    const dept = selectedEmployeeFromMatrix?.department || personInfo?.Departman || "";
    return dept ? deptScoreAverages[dept] ?? null : null;
  }, [deptScoreAverages, personInfo?.Departman, selectedEmployeeFromMatrix?.department]);

  const personTestScore = useMemo(() => toScore(selectedEmployeeFromMatrix?.test_score), [selectedEmployeeFromMatrix]);
  const personManagerScore = useMemo(() => toScore(selectedEmployeeFromMatrix?.manager_score), [selectedEmployeeFromMatrix]);
  const personPositionScore = useMemo(
    () => getTargetAverageScore(selectedEmployeeFromMatrix),
    [selectedEmployeeFromMatrix]
  );

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

  // Geçmiş performans trendi (ortalama puanlarla)
  const historicalData = selectedPerson && avgScores
    ? [
        {
          date: "Ortalama",
          Performans: avgScores.performance,
          Potansiyel: avgScores.potential,
        },
      ]
    : history360
        .filter((p) => p.Personel === selectedPerson)
        .sort((a, b) => new Date(a.date || "").getTime() - new Date(b.date || "").getTime())
        .map((p) => ({
          date: p.date ? new Date(p.date).toLocaleDateString("tr-TR", {
            month: "short",
            year: "numeric",
          }) : "Tarih Yok",
          Performans: p.Performans || 0,
          Potansiyel: p.Potansiyel || 0,
        }));

  const perfPercentage = Math.round((performanceScore / 5.0) * 100);
  const perfColor = getScoreColor(performanceScore);

  if (!user) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Skeleton className="h-5 w-1/3" />
        <div className="mt-4">
          <SkeletonTable rows={5} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-800">360 Değerlendirme</h1>
        </div>
        <p className="text-xs text-slate-500">Performans değerlendirme girişi ve analizi</p>
        <div className="sr-only">
          <span data-testid="dqi-selected-employee-name">{selectedPerson ?? ""}</span>
          <span data-testid="dqi-selected-employee-id">{selectedEmployeeFromMatrix?.id ?? ""}</span>
          <span data-testid="dqi-test-score">{dqiTestScore ?? ""}</span>
          <span data-testid="dqi-manager-score">{dqiManagerScore ?? ""}</span>
          <span data-testid="dqi-position-score">{dqiPositionScore ?? ""}</span>
        </div>
      </div>

      {dataLoading ? (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <Skeleton className="h-5 w-1/3" />
          <div className="mt-4">
            <SkeletonTable rows={6} cols={5} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bütçe Yönetimi (360 içinde) */}
          <BudgetManagementPanel />

          {/* Personel ve Değerlendirme Tipi Seçimi */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                  Değerlendirilen Personel
                </label>
                <select
                  data-testid="dqi-person-select"
                  value={selectedPerson}
                  onChange={(e) => {
                    setSelectedPerson(e.target.value);
                    setEvalType("");
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Personel seçin...</option>
                  {selectableEmployees.map((name, index) => (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {!selectableEmployees.length && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Değerlendirilecek uygun personel bulunamadı.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                  Değerlendirme Tipi
                </label>
                <select
                  value={evalType}
                  onChange={(e) => setEvalType(e.target.value)}
                  disabled={!selectedPerson}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  <option value="">Değerlendirme tipi seçin...</option>
                  {evalTypeOptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {selectedPerson && !evalTypeOptions.length && (
                  <p className="text-xs text-red-600 mt-1.5">
                    Bu personeli değerlendirme yetkiniz bulunmuyor.
                  </p>
                )}
              </div>
            </div>

            {selectedPerson && personInfo && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-slate-700">
                  <strong>Pozisyon:</strong> {personInfo.Pozisyon}
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  <strong>1. Amir:</strong> {personInfo["Yönetici 1"] || "-"}
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  <strong>2. Amir:</strong> {personInfo["Yönetici 2"] || "-"}
                </p>
                {(personTestScore !== null || personManagerScore !== null || personPositionScore !== null) && deptAvgScores && (
                  <div className="mt-3 pt-3 border-t border-blue-200 text-[10px] text-slate-500 space-y-2">
                    {personTestScore !== null && (
                      <div>
                        <div>
                          <span className="font-medium text-slate-600">Test:</span> {personTestScore.toFixed(1)}
                        </div>
                        {formatDeptCompare(personTestScore, deptAvgScores.testAvg) && (
                          <div className="text-[10px] text-slate-400">
                            {formatDeptCompare(personTestScore, deptAvgScores.testAvg)}
                          </div>
                        )}
                      </div>
                    )}
                    {personManagerScore !== null && (
                      <div>
                        <div>
                          <span className="font-medium text-slate-600">Yönetici:</span> {personManagerScore.toFixed(1)}
                        </div>
                        {formatDeptCompare(personManagerScore, deptAvgScores.managerAvg) && (
                          <div className="text-[10px] text-slate-400">
                            {formatDeptCompare(personManagerScore, deptAvgScores.managerAvg)}
                          </div>
                        )}
                      </div>
                    )}
                    {personPositionScore !== null && (
                      <div>
                        <div>
                          <span className="font-medium text-slate-600">Hedef:</span> {personPositionScore.toFixed(1)}
                        </div>
                        {formatDeptCompare(personPositionScore, deptAvgScores.positionAvg) && (
                          <div className="text-[10px] text-slate-400">
                            {formatDeptCompare(personPositionScore, deptAvgScores.positionAvg)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Değerlendirme Formu */}
          {selectedPerson && evalType && (
            <>
              {/* Yetkinlik Puanları */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <h2 className="text-sm font-semibold text-slate-800 mb-4">
                  {selectedPerson} İçin Puanlama
                </h2>
                <h3 className="text-xs font-medium text-slate-600 mb-3 uppercase tracking-wider">Yetkinlikler</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COMPETENCIES.map((comp) => {
                    const score = competencyScores[comp.code] || 3.0;
                    return (
                      <div key={comp.code} className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">
                          {comp.name}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="0.1"
                          value={score}
                          onChange={(e) =>
                            setCompetencyScores({
                              ...competencyScores,
                              [comp.code]: parseFloat(e.target.value),
                            })
                          }
                          className="w-full"
                          style={{ accentColor: getScoreColor(score) }}
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>1.0</span>
                          <span className="font-semibold" style={{ color: getScoreColor(score) }}>
                            {score.toFixed(1)}
                          </span>
                          <span>5.0</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performans Değerlendirmesi */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <h3 className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                  Genel Performans Değerlendirmesi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-medium text-slate-600">
                      KPI / Hedef Gerçekleşme Skoru
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={performanceScore}
                      onChange={(e) => setPerformanceScore(parseFloat(e.target.value))}
                      className="w-full"
                      style={{ accentColor: perfColor }}
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>1.0</span>
                      <span className="font-semibold font-mono" style={{ color: perfColor }}>
                        {performanceScore.toFixed(1)}
                      </span>
                      <span>5.0</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-full">
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ backgroundColor: perfColor, width: `${perfPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 text-center font-mono">
                        %{perfPercentage}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performans Yorumu */}
                <div className="mt-3 p-3 rounded border">
                  {perfPercentage < 60 ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <TrendingDown className="w-4 h-4" />
                      <p className="text-xs font-medium">
                        %{perfPercentage}: Hedeflerin gerisinde (Beklenti Altı).
                      </p>
                    </div>
                  ) : perfPercentage < 99 ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <TrendingUp className="w-4 h-4" />
                      <p className="text-xs font-medium">
                        %{perfPercentage}: Hedeflere yaklaşılıyor (Gelişim Sürüyor).
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <p className="text-xs font-medium">
                        %{perfPercentage}: Yıllık hedefler tam olarak gerçekleşti.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Star Performer Checkbox */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="starPerformer"
                    checked={isStarPerformer}
                    onChange={(e) => setIsStarPerformer(e.target.checked)}
                    className="w-5 h-5 text-yellow-500 border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 cursor-pointer"
                  />
                  <label htmlFor="starPerformer" className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xl">🌟</span>
                    <div>
                      <span className="text-sm font-medium text-slate-800 block">
                        Yüksek Performans (Star Performer)
                      </span>
                      <span className="text-xs text-slate-600">
                        Bu personel işaretlenirse, maaş simülasyonlarında otomatik +%10 ek zam alır.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Maaş Tavsiyesi (Senaryo D) */}
              {(userRole === "CEO" || userRole === "DIRECTOR" || userRole === "Direktör" || userRole === "MANAGER") && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                  <h3 className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                    Maaş Tavsiyesi (Senaryo D)
                  </h3>
                  {canRecommendSalary ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        <label className="text-xs font-medium text-slate-600">
                          Önerilen Zam Oranı (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            step={0.5}
                            value={salaryRecommendation}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSalaryRecommendation(value === "" ? "" : Number(value));
                            }}
                            className="w-full pr-8 pl-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                            %
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Bu öneri Senaryo D’ye aktarılır.
                        </span>
                      </div>
                      {salaryRecommendationLoading && (
                        <p className="text-xs text-slate-500">Mevcut tavsiye yükleniyor...</p>
                      )}
                      {salaryRecommendationError && (
                        <p className="text-xs text-red-600">{salaryRecommendationError}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">
                      {salaryRecommendationBlockedReason || "Bu personel için maaş tavsiyesi verilemez."}
                    </p>
                  )}
                </div>
              )}

              {/* Kaydet Butonu */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <Skeleton variant="circular" width={16} height={16} />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Değerlendirmeyi Kaydet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Görüntüleme: Radar Chart */}
          {selectedPerson && radarData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">
                  {selectedPerson} - Yetkinlik Analizi
                </h2>
              </div>
              <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
                  {/* HEDEF (Rol) - Kırmızı, en arkada */}
                  <Radar
                    name="Hedef (Rol)"
                    dataKey="target"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.12}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }}
                  />
                  {/* YÖNETİCİ (360°) - Turuncu, ortada */}
                  <Radar
                    name="Yönetici (360°)"
                    dataKey="manager"
                    stroke="#F97316"
                    fill="#F97316"
                    fillOpacity={0.22}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F97316', strokeWidth: 2, stroke: '#fff' }}
                  />
                  {/* MEVCUT (Test) - Mavi, en önde */}
                  <Radar
                    name="Mevcut (Test)"
                    dataKey="test"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.35}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
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
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Görüntüleme: Geçmiş Trend */}
          {selectedPerson && historicalData.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-800">Performans Trendi</h2>
              </div>
              <div className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
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
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line
                    type="monotone"
                    dataKey="Performans"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="Potansiyel"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Görüntüleme: Detaylı Bilgiler */}
          {selectedPerson && avgScores && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Detaylı Bilgiler</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Performans</p>
                  <p className="text-xl font-semibold text-blue-600 font-mono">
                    {avgScores ? avgScores.performance.toFixed(1) : "0.0"}
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Potansiyel</p>
                  <p className="text-xl font-semibold text-green-600 font-mono">
                    {avgScores ? avgScores.potential.toFixed(1) : "0.0"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!selectedPerson && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Lütfen bir personel seçin</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
