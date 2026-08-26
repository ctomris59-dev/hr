"use client";

import { useEffect, useState, useMemo } from "react";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";
import { TrendingUp, Info, Target } from "lucide-react";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import {
  createStandardRadarData,
  extractCompetencyScoresFromTalentMatrix,
  findEmployeeInTalentMatrix,
  getTalentBox,
} from "../../utils/calculations";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
} from "@/components/charts/recharts";
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

// Role critical competencies mapping
const ROLE_CRITICAL_MAP: Record<string, string[]> = {
  Yönetici: ["STR", "RES", "COM", "TEA"],
  Satış: ["COM", "RES", "ETH", "TEA"],
  Teknik: ["ANA", "DIG", "DET", "LRN"],
  Operasyon: ["DET", "TEA", "RES", "DIS"],
  Genel: ["COM", "TEA", "RES"],
};

// Role-based target profiles (matches backend ROLE_TARGET_PROFILES)
const ROLE_TARGET_PROFILES: Record<string, Record<string, number>> = {
  "Teknik Lider": {
    ANA: 4.5, DIG: 4.5, DET: 4.0, LRN: 4.5,
    LID: 3.5, COM: 3.0, STR: 3.0,
    RES: 4.0, TEA: 3.5, ETH: 3.5, DIS: 3.5
  },
  "Satış Müdürü": {
    COM: 5.0, RES: 4.5, ETH: 4.5, TEA: 4.0,
    LID: 4.5, STR: 4.0,
    ANA: 2.5, DIG: 2.5, DET: 3.0, LRN: 3.0,
    DIS: 3.5
  },
  "Genel Yönetici": {
    LID: 4.5, STR: 4.5, COM: 4.0, RES: 4.0,
    TEA: 4.0, ETH: 4.0, DIS: 4.0,
    ANA: 3.5, DIG: 3.0, DET: 3.5, LRN: 3.5
  },
  "Kıdemli Uzman": {
    ANA: 4.0, DIG: 4.0, DET: 4.0, LRN: 4.0,
    RES: 3.5, TEA: 3.5, ETH: 3.5, DIS: 3.5,
    LID: 2.5, COM: 3.0, STR: 2.5
  },
  "Uzman": {
    ANA: 3.5, DIG: 3.5, DET: 3.5, LRN: 3.5,
    RES: 3.0, TEA: 3.0, ETH: 3.0, DIS: 3.0,
    LID: 2.0, COM: 3.0, STR: 2.0
  },
  "Direktörlük/Liderlik": {
    LID: 5.0, STR: 5.0, COM: 4.5, RES: 4.5,
    TEA: 4.5, ETH: 4.5, DIS: 4.5,
    ANA: 4.0, DIG: 3.5, DET: 4.0, LRN: 4.0
  },
  "Yöneticilik": {
    LID: 4.0, STR: 4.0, COM: 4.0, RES: 4.0,
    TEA: 4.0, ETH: 4.0, DIS: 4.0,
    ANA: 3.5, DIG: 3.0, DET: 3.5, LRN: 3.5
  },
  "Kıdemli Uzmanlık": {
    ANA: 4.0, DIG: 4.0, DET: 4.0, LRN: 4.0,
    RES: 3.5, TEA: 3.5, ETH: 3.5, DIS: 3.5,
    LID: 2.5, COM: 3.0, STR: 2.5
  },
  "Uzmanlık": {
    ANA: 3.5, DIG: 3.5, DET: 3.5, LRN: 3.5,
    RES: 3.0, TEA: 3.0, ETH: 3.0, DIS: 3.0,
    LID: 2.0, COM: 3.0, STR: 2.0
  },
  "default": {
    ANA: 3.5, DIG: 3.5, DET: 3.5, LRN: 3.5,
    RES: 3.5, TEA: 3.5, ETH: 3.5, DIS: 3.5,
    LID: 3.5, COM: 3.5, STR: 3.5
  }
};

// Get next level target profile based on position
function getNextLevelTarget(positionName: string): {
  targetProfile: Record<string, number>;
  targetRoleName: string;
  avgTargetScore: number;
} {
  const pos = positionName.toLowerCase();
  let targetRole = "Bir Üst Rol";

  if (
    pos.includes("müdür") ||
    pos.includes("yönetici") ||
    pos.includes("lider") ||
    pos.includes("manager") ||
    pos.includes("head")
  ) {
    targetRole = "Direktörlük/Liderlik";
  } else if (
    pos.includes("kıdemli") ||
    pos.includes("senior") ||
    pos.includes("chief") ||
    pos.includes("lead")
  ) {
    targetRole = "Yöneticilik";
  } else if (
    pos.includes("uzman") ||
    pos.includes("specialist") ||
    pos.includes("mühendis") ||
    pos.includes("analist") ||
    pos.includes("sorumlu")
  ) {
    targetRole = "Kıdemli Uzmanlık";
  } else if (
    pos.includes("asistan") ||
    pos.includes("stajyer") ||
    pos.includes("yardımcı") ||
    pos.includes("eleman")
  ) {
    targetRole = "Uzmanlık";
  }

  // Select profile based on role or position type
  let profile: Record<string, number>;
  if (targetRole in ROLE_TARGET_PROFILES) {
    profile = { ...ROLE_TARGET_PROFILES[targetRole] };
  } else if (pos.includes("satış") || pos.includes("sales") || pos.includes("müşteri")) {
    profile = { ...ROLE_TARGET_PROFILES["Satış Müdürü"] };
    targetRole = "Satış Müdürü";
  } else if (pos.includes("teknik") || pos.includes("mühendis") || pos.includes("yazılım") || pos.includes("it") || pos.includes("developer")) {
    profile = { ...ROLE_TARGET_PROFILES["Teknik Lider"] };
    targetRole = "Teknik Lider";
  } else {
    profile = { ...ROLE_TARGET_PROFILES["default"] };
  }

  // Fill missing competencies with default values
  Object.keys(COMPETENCIES_360).forEach((code) => {
    if (!(code in profile)) {
      profile[code] = ROLE_TARGET_PROFILES["default"][code] || 3.5;
    }
  });

  // Calculate average target score
  const avgTargetScore = Object.values(profile).reduce((sum, val) => sum + val, 0) / Object.values(profile).length;

  return { targetProfile: profile, targetRoleName: targetRole, avgTargetScore };
}

// Check readiness
function checkReadiness(
  score: number,
  targetScore: number,
  context: "promotion" | "recruitment" = "promotion"
): { isReady: boolean; gap: number; tolerance: number } {
  const tolerance = context === "recruitment" ? 1.0 : context === "promotion" ? 0.5 : 0.0;
  const gap = targetScore - score;

  if (score >= targetScore) {
    return { isReady: true, gap, tolerance };
  } else if (gap <= tolerance) {
    return { isReady: true, gap, tolerance };
  } else {
    return { isReady: false, gap, tolerance };
  }
}

// Generate personalized AI recommendations
function generateAIRecommendations(
  personData: any,
  gapAnalysis: ReturnType<typeof analyzeGapSmart> | null,
  promotionReadiness: ReturnType<typeof checkReadiness> | null,
  boxCategory: string
): Array<{ type: "success" | "warning" | "error" | "info"; title: string; description: string; action: string }> {
  const recommendations: Array<{ type: "success" | "warning" | "error" | "info"; title: string; description: string; action: string }> = [];

  if (!personData || !gapAnalysis) {
    return recommendations;
  }

  const perf = personData.Performans || 0;
  const pot = personData.Potansiyel || 0;
  const position = personData.Pozisyon || "Uzman";

  // 1. 9-Box Category Based Recommendations
  if (boxCategory.includes("Yıldız Oyuncu")) {
    recommendations.push({
      type: "success",
      title: "🌟 Yıldız Oyuncu - Terfi Planlaması",
      description: "Yüksek performans ve potansiyel gösteriyorsunuz. Terfi için hazırsınız.",
      action: "Hemen terfi planlaması yapın ve yedekleme planına dahil edin."
    });
    recommendations.push({
      type: "info",
      title: "💼 Liderlik Gelişimi",
      description: "Bir üst seviye rol için liderlik becerilerinizi geliştirin.",
      action: "Liderlik eğitim programına katılın ve mentorluk alın."
    });
  } else if (boxCategory.includes("Yüksek Potansiyel")) {
    recommendations.push({
      type: "warning",
      title: "📈 Performans İyileştirme",
      description: "Potansiyeliniz yüksek ancak performansınızı artırmanız gerekiyor.",
      action: "Koçluk desteği alın ve hedef belirleme çalışması yapın."
    });
    recommendations.push({
      type: "info",
      title: "🎯 Odaklanma Programı",
      description: "Performans hedeflerinize ulaşmak için odaklanma teknikleri öğrenin.",
      action: "Verimlilik ve zaman yönetimi eğitimine katılın."
    });
  } else if (boxCategory.includes("Yüksek Performans")) {
    recommendations.push({
      type: "info",
      title: "⭐ Mevcut Rolde Mükemmelleşme",
      description: "Mevcut rolünüzde çok başarılısınız. Potansiyelinizi geliştirmek için fırsatlar yaratın.",
      action: "Yedekleme planına dahil edin ve cross-functional projelere katılın."
    });
  } else if (boxCategory.includes("Soru İşareti")) {
    recommendations.push({
      type: "error",
      title: "🔍 Performans Araştırması",
      description: "Potansiyeliniz yüksek ama performansınız düşük. Nedenlerini araştıralım.",
      action: "360 derece geri bildirim toplayın ve performans değerlendirmesi yapın."
    });
    recommendations.push({
      type: "warning",
      title: "💡 Motivasyon ve Destek",
      description: "Motivasyon sorunları veya destek eksikliği olabilir.",
      action: "Birebir görüşme yapın ve destek mekanizmaları kurun."
    });
  } else if (boxCategory.includes("Riskli")) {
    recommendations.push({
      type: "error",
      title: "🚨 Acil Müdahale Gerekli",
      description: "Performans ve potansiyel düşük. Acil aksiyon planı oluşturulmalı.",
      action: "Performance Improvement Plan (PIP) uygulayın veya ayrılma planı düşünün."
    });
    recommendations.push({
      type: "warning",
      title: "📋 Detaylı Değerlendirme",
      description: "Kök neden analizi yapın ve gelişim planı oluşturun.",
      action: "HR ile birlikte detaylı değerlendirme toplantısı yapın."
    });
  }

  // 2. Gap Analysis Based Recommendations
  if (gapAnalysis) {
    if (gapAnalysis.analysis.critical_fail.length > 0) {
      const critical = gapAnalysis.analysis.critical_fail[0];
      recommendations.push({
        type: "error",
        title: `🚨 Kritik Yetkinlik Eksikliği: ${critical.name}`,
        description: `Bu yetkinlik pozisyonunuz için hayati önem taşıyor. Mevcut: ${critical.current.toFixed(1)}, Hedef: ${critical.target.toFixed(1)}`,
        action: `Acil eğitim programına katılın ve ${critical.name} üzerine odaklanın.`
      });
    }

    if (gapAnalysis.analysis.moderate_gap.length > 0) {
      const moderate = gapAnalysis.analysis.moderate_gap.filter(g => g.is_critical)[0] || gapAnalysis.analysis.moderate_gap[0];
      recommendations.push({
        type: "warning",
        title: `⚠️ Gelişim Gerekli: ${moderate.name}`,
        description: `Bu yetkinlikte hedefe ulaşmak için desteğe ihtiyacınız var. Fark: ${moderate.gap.toFixed(1)} puan`,
        action: `Koçluk veya eğitim desteği alın. ${moderate.name} üzerine çalışma planı oluşturun.`
      });
    }

    if (gapAnalysis.analysis.strength.length > 0) {
      const strengths = gapAnalysis.analysis.strength.map(s => s.name).slice(0, 3).join(", ");
      recommendations.push({
        type: "success",
        title: `💎 Güçlü Yönleriniz: ${strengths}`,
        description: "Bu yetkinliklerde beklentinin üzerinde performans gösteriyorsunuz.",
        action: "Bu güçlü yönlerinizi mentorluk veya ekip liderliği için kullanın."
      });
    }
  }

  // 3. Promotion Readiness Based Recommendations
  if (promotionReadiness) {
    if (promotionReadiness.isReady && pot >= promotionReadiness.targetScore) {
      recommendations.push({
        type: "success",
        title: "✅ Terfi İçin Hazırsınız",
        description: `Bir üst rol (${promotionReadiness.targetRoleName}) için gereken potansiyel skoruna ulaştınız.`,
        action: "Terfi sürecini başlatın ve yeni rol için hazırlık yapın."
      });
    } else if (promotionReadiness.isReady && pot < promotionReadiness.targetScore) {
      recommendations.push({
        type: "warning",
        title: "🟡 Terfi İçin Destek Gerekli",
        description: `Terfi için tolerans dahilindesiniz ancak ek destekle daha hazır hale gelebilirsiniz.`,
        action: "Koçluk ve gelişim programına katılarak terfi hazırlığınızı güçlendirin."
      });
    } else {
      recommendations.push({
        type: "error",
        title: "⛔ Terfi İçin Hazır Değilsiniz",
        description: `Bir üst rol için gereken potansiyel skorunun ${promotionReadiness.gap.toFixed(1)} puan altındasınız.`,
        action: `Gelişim planı oluşturun ve ${promotionReadiness.gap.toFixed(1)} puanlık farkı kapatmak için çalışın.`
      });
    }
  }

  // 4. Performance vs Potential Balance
  if (perf >= 4.0 && pot < 3.0) {
    recommendations.push({
      type: "info",
      title: "📊 Potansiyel Geliştirme",
      description: "Mevcut rolünüzde mükemmelsiniz ancak potansiyelinizi geliştirmek için fırsatlar yaratın.",
      action: "Yeni projeler ve sorumluluklar alarak potansiyelinizi artırın."
    });
  }

  if (perf < 3.0 && pot >= 4.0) {
    recommendations.push({
      type: "warning",
      title: "⚡ Performans Artırma",
      description: "Potansiyeliniz yüksek ancak performansınızı artırmanız gerekiyor.",
      action: "Performans engellerini belirleyin ve çözüm planı oluşturun."
    });
  }

  return recommendations;
}

// Analyze gap smart
function analyzeGapSmart(
  personName: string,
  position: string,
  data360: any[],
  standardRadarBySubject?: Record<string, { A: number }>
): {
  radarData: Array<{ subject: string; current: number; target: number; fullMark: number }>;
  analysis: {
    critical_fail: Array<{ name: string; current: number; target: number; gap: number }>;
    moderate_gap: Array<{ name: string; current: number; target: number; gap: number; is_critical: boolean }>;
    strength: Array<{ name: string; val: number }>;
  };
} | null {
  if (!data360 || data360.length === 0) return null;

  const personData = data360.find(
    (p) => p.Personel === personName || p.target === personName
  );
  if (!personData) return null;

  const { targetProfile, avgTargetScore } = getNextLevelTarget(position);

  // Determine role type
  const posLower = position.toLowerCase();
  let roleType = "Genel";
  if (posLower.includes("müdür") || posLower.includes("yönetici")) {
    roleType = "Yönetici";
  } else if (posLower.includes("satış")) {
    roleType = "Satış";
  } else if (posLower.includes("uzman") || posLower.includes("mühendis")) {
    roleType = "Teknik";
  } else if (posLower.includes("operasyon")) {
    roleType = "Operasyon";
  }

  const criticalCodes = ROLE_CRITICAL_MAP[roleType] || ROLE_CRITICAL_MAP["Genel"];

  const radarData: Array<{ subject: string; current: number; target: number; fullMark: number }> = [];
  const analysis = {
    critical_fail: [] as Array<{ name: string; current: number; target: number; gap: number }>,
    moderate_gap: [] as Array<{ name: string; current: number; target: number; gap: number; is_critical: boolean }>,
    strength: [] as Array<{ name: string; val: number }>,
  };

  Object.entries(COMPETENCIES_360).forEach(([code, name]) => {
    const standardVal = standardRadarBySubject?.[name]?.A;
    const val =
      standardVal !== undefined && standardVal !== null
        ? standardVal
        : parseFloat(personData[`${code}_Mgr`] || personData[`${code}_Mgr2`] || personData[`${code}_Peer`] || "0") || 0;

    // Each competency has its own target from the profile
    const targetScore = targetProfile[code] || ROLE_TARGET_PROFILES["default"][code] || 3.5;

    radarData.push({
      subject: name,
      current: val,
      target: targetScore,
      fullMark: 5,
    });

    const gap = val - targetScore;
    const isCritical = criticalCodes.includes(code);

    if (gap < 0) {
      const detail = {
        name,
        current: val,
        target: targetScore,
        gap: Math.abs(gap),
      };
      if (isCritical && gap <= -0.5) {
        analysis.critical_fail.push(detail);
      } else {
        analysis.moderate_gap.push({ ...detail, is_critical: isCritical });
      }
    } else if (gap >= 0.5) {
      analysis.strength.push({ name, val });
    }
  });

  // Close the polygon
  if (radarData.length > 0) {
    radarData.push({ ...radarData[0] });
  }

  return { radarData, analysis };
}

export default function TalentPage() {
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history360, setHistory360] = useState<any[]>([]);
  const [talentMatrixData, setTalentMatrixData] = useState<any[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [selectedBox, setSelectedBox] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Verilerin temizlenip temizlenmediğini kontrol et
        const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
        if (dataCleared) {
          setOrgData([]);
          setHistory360([]);
          setLoading(false);
          return;
        }

        const storedOrg = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
        const stored360 = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
        const storedTalent = getStorageData<any[]>("hr_talent_matrix", []);

        if (storedOrg.length > 0) {
          setOrgData(storedOrg);
          setHistory360(stored360);
          if (storedTalent.length > 0) {
            setTalentMatrixData(storedTalent);
          }
        } else {
          const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
          const userRole = currentUser && typeof currentUser === "object" && "role" in currentUser 
            ? (currentUser as any).role 
            : null;
          const userDept = currentUser && typeof currentUser === "object" && "dept" in currentUser
            ? (currentUser as any).dept || (currentUser as any).department
            : null;
          const userName = currentUser && typeof currentUser === "object" && "name" in currentUser
            ? (currentUser as any).name
            : null;

          const params = new URLSearchParams();
          if (userRole) params.append("user_role", userRole);
          if (userDept) params.append("user_dept", userDept);
          if (userName) params.append("user_name", userName);
          params.append("_t", Date.now().toString());

          const [orgRes, data360Res, talentRes] = await Promise.all([
            fetch("/api/org-chart").catch(() => null),
            fetch("/api/360-data").catch(() => null),
            fetch(`/api/talent-matrix?${params.toString()}`).catch(() => null),
          ]);

          if (orgRes?.ok) {
            const orgData = await orgRes.json();
            if (orgData.success && orgData.data) {
              setOrgData(orgData.data);
            }
          }

          if (data360Res?.ok) {
            const data360 = await data360Res.json();
            if (data360.success && data360.data) {
              setHistory360(data360.data);
            }
          }

          if (talentRes?.ok) {
            const talentData = await talentRes.json();
            if (talentData.success && talentData.data) {
              setTalentMatrixData(talentData.data);
              localStorage.setItem("hr_talent_matrix", JSON.stringify(talentData.data));
            }
          }
        }
      } catch (error) {
        console.error("Data loading error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Storage temizlendiğinde verileri temizle
    const handleStorageCleared = () => {
      setOrgData([]);
      setHistory360([]);
      setSelectedPerson("");
      setSelectedBox("");
      setSelectedDepartment("");
    };

    window.addEventListener("storageCleared", handleStorageCleared);
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
    };
  }, []);

  // Merge org and 360 data
  const mergedData = useMemo(() => {
    return orgData.map((person) => {
      const data360 = history360.find(
        (h) => h.Personel === person["Ad Soyad"] || h.target === person["Ad Soyad"]
      );
      return {
        ...person,
        Performans: parseFloat(data360?.Performans || person.Performans || "3.0"),
        Potansiyel: parseFloat(data360?.Potansiyel || person.Potansiyel || "3.0"),
      };
    });
  }, [orgData, history360]);

  // Scatter chart data
  const chartData = useMemo(() => {
    return mergedData.map((person) => ({
      name: person["Ad Soyad"],
      performance: person.Performans || 0,
      potential: person.Potansiyel || 0,
      department: person.Departman || "Bilinmiyor",
      salary: person["Maaş (TL)"] || person.Maaş || 0,
      position: person.Pozisyon || "Uzman",
      boxCategory: getTalentBox(person.Performans || 0, person.Potansiyel || 0),
    }));
  }, [mergedData]);

  // Filtered chart data based on selected box and department
  const filteredChartData = useMemo(() => {
    let filtered = chartData;
    if (selectedBox) {
      filtered = filtered.filter((d) => d.boxCategory === selectedBox);
    }
    if (selectedDepartment) {
      filtered = filtered.filter((d) => d.department === selectedDepartment);
    }
    return filtered;
  }, [chartData, selectedBox, selectedDepartment]);

  const COLORS = {
    "İnsan Kaynakları": "#3b82f6",
    "Bilgi Teknolojileri": "#10b981",
    Finans: "#f59e0b",
    Satış: "#ef4444",
    Operasyon: "#8b5cf6",
    Yönetim: "#ec4899",
    Bilinmiyor: "#6b7280",
  };

  // Selected person data
  const selectedPersonData = useMemo(() => {
    if (!selectedPerson) return null;
    return mergedData.find((p) => p["Ad Soyad"] === selectedPerson);
  }, [selectedPerson, mergedData]);

  // Gap analysis for selected person (from API)
  const [talentAnalysis, setTalentAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    const fetchTalentAnalysis = async () => {
      if (!selectedPerson) {
        setTalentAnalysis(null);
        return;
      }

      setLoadingAnalysis(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/talent/analyze/${encodeURIComponent(selectedPerson)}`
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setTalentAnalysis(result.data);
          }
        }
      } catch (error) {
        console.error("Talent analysis error:", error);
      } finally {
        setLoadingAnalysis(false);
      }
    };

    fetchTalentAnalysis();
  }, [selectedPerson]);

  // Legacy gap analysis (fallback)
  const standardRadarDataForPerson = useMemo(() => {
    if (!selectedPersonData || talentMatrixData.length === 0) return [];
    const employee = findEmployeeInTalentMatrix(talentMatrixData, selectedPersonData["Ad Soyad"] || "");
    if (!employee) return [];
    const competencyScores = extractCompetencyScoresFromTalentMatrix(employee, COMPETENCIES_360);
    return createStandardRadarData(competencyScores, COMPETENCIES_360);
  }, [selectedPersonData, talentMatrixData]);

  const standardRadarBySubject = useMemo(() => {
    const map: Record<string, { A: number }> = {};
    standardRadarDataForPerson.forEach((item) => {
      map[item.subject] = { A: item.A };
    });
    return map;
  }, [standardRadarDataForPerson]);

  const gapAnalysis = useMemo(() => {
    if (talentAnalysis) {
      // Convert API response to legacy format
      const radarData = Object.entries(COMPETENCIES_360).map(([code, name]) => {
        const standardCurrent = standardRadarBySubject[name]?.A;
        const current = standardCurrent !== undefined
          ? standardCurrent
          : talentAnalysis.current_scores_coded?.[code] || 0;
        const target = talentAnalysis.target_scores_coded?.[code] || 3.5;
        return {
          subject: name,
          current,
          target,
          fullMark: 5,
        };
      });
      
      // Close the polygon
      if (radarData.length > 0) {
        radarData.push({ ...radarData[0] });
      }

      return {
        radarData,
        analysis: {
          critical_fail: talentAnalysis.critical_gaps || [],
          moderate_gap: talentAnalysis.moderate_gaps || [],
          strength: talentAnalysis.strengths || [],
        },
        readiness_status: talentAnalysis.readiness_status,
        target_role: talentAnalysis.target_role,
      };
    }
    
    // Fallback to local analysis
    if (!selectedPersonData) return null;
    return analyzeGapSmart(
      selectedPersonData["Ad Soyad"],
      selectedPersonData.Pozisyon || "Uzman",
      history360,
      standardRadarBySubject
    );
  }, [talentAnalysis, selectedPersonData, history360, standardRadarBySubject]);

  // Promotion readiness - fetch from backend
  const [promotionReadiness, setPromotionReadiness] = useState<any>(null);

  useEffect(() => {
    const loadPromotionReadiness = async () => {
      if (!selectedPersonData) {
        setPromotionReadiness(null);
        return;
      }

      try {
    const pos = selectedPersonData.Pozisyon || "Uzman";
    const pot = selectedPersonData.Potansiyel || 0;

        // Backend'den hedef puanı al
        const targetRes = await fetch(
          `${API_BASE_URL}/api/talent/next-level-target?position_name=${encodeURIComponent(pos)}`
        );
        if (targetRes.ok) {
          const targetData = await targetRes.json();
          if (targetData.success) {
            const targetScore = targetData.data.target_score;
            const targetRoleName = targetData.data.target_role_name;

            // Hazırlık kontrolü
            const readinessRes = await fetch(
              `${API_BASE_URL}/api/talent/check-readiness?score=${pot}&target_score=${targetScore}&context=promotion`
            );
            if (readinessRes.ok) {
              const readinessData = await readinessRes.json();
              if (readinessData.success) {
                setPromotionReadiness({
                  ...readinessData.data,
                  targetScore,
                  targetRoleName,
                  targetProfile: {} // Profil detayı gerekirse ayrı endpoint'ten çekilebilir
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Terfi hazırlık kontrolü hatası:", error);
        // Fallback to local calculation
        if (selectedPersonData) {
          const pos = selectedPersonData.Pozisyon || "Uzman";
          const { targetProfile, targetRoleName, avgTargetScore } = getNextLevelTarget(pos);
          const pot = selectedPersonData.Potansiyel || 0;
          setPromotionReadiness({
            ...checkReadiness(pot, avgTargetScore, "promotion"),
            targetScore: avgTargetScore,
            targetRoleName,
            targetProfile
          });
        }
      }
    };

    loadPromotionReadiness();
  }, [selectedPersonData]);

  // AI Recommendations
  const aiRecommendations = useMemo(() => {
    if (!selectedPersonData || !gapAnalysis) return [];
    const boxCategory = getTalentBox(selectedPersonData.Performans, selectedPersonData.Potansiyel);
    return generateAIRecommendations(selectedPersonData, gapAnalysis, promotionReadiness, boxCategory);
  }, [selectedPersonData, gapAnalysis, promotionReadiness]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Skeleton className="h-5 w-1/4" />
        <div className="mt-4">
          <SkeletonTable rows={6} cols={5} />
        </div>
      </div>
    );
  }

  if (mergedData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <p className="text-yellow-800">⚠️ Görüntülenecek veri yok.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Yetenek Matrisi (Analiz ve Teşhis)
            </h1>
            <p className="text-slate-600 mt-1">
              Performans ve Potansiyel Analizi (9-Box)
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Kategori Filtresi:
            </label>
            <select
              value={selectedBox}
              onChange={(e) => setSelectedBox(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Kategoriler</option>
              {[
                "1. Yıldız Oyuncu (Star)",
                "2. Yüksek Potansiyel (High Pot)",
                "3. Yüksek Performans (High Perf)",
                "4. Soru İşareti (Enigma)",
                "5. Kilit Oyuncu (Core)",
                "6. Güvenilir Profesyonel",
                "7. Uyumsuz (Inconsistent)",
                "8. Etkili Oyuncu (Solid)",
                "9. Riskli (Underperformer)",
              ].map((box) => (
                <option key={box} value={box}>
                  {box}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Departman Filtresi:
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Departmanlar</option>
              {Array.from(new Set(chartData.map((d) => d.department)))
                .sort()
                .map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-end">
            {(selectedBox || selectedDepartment) && (
              <button
                onClick={() => {
                  setSelectedBox("");
                  setSelectedDepartment("");
                }}
                className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 9-Box Statistics */}
      <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-6">
        {[
          { name: "Yıldız Oyuncu", fullName: "1. Yıldız Oyuncu (Star)", color: "bg-green-500", perf: "≥4.0", pot: "≥4.0" },
          { name: "Yüksek Potansiyel", fullName: "2. Yüksek Potansiyel (High Pot)", color: "bg-blue-500", perf: "3.0-4.0", pot: "≥4.0" },
          { name: "Yüksek Performans", fullName: "3. Yüksek Performans (High Perf)", color: "bg-yellow-500", perf: "≥4.0", pot: "3.0-4.0" },
          { name: "Soru İşareti", fullName: "4. Soru İşareti (Enigma)", color: "bg-purple-500", perf: "<3.0", pot: "≥4.0" },
          { name: "Kilit Oyuncu", fullName: "5. Kilit Oyuncu (Core)", color: "bg-indigo-500", perf: "3.0-4.0", pot: "3.0-4.0" },
          { name: "Güvenilir Profesyonel", fullName: "6. Güvenilir Profesyonel", color: "bg-teal-500", perf: "≥4.0", pot: "<3.0" },
          { name: "Uyumsuz", fullName: "7. Uyumsuz (Inconsistent)", color: "bg-orange-500", perf: "<3.0", pot: "3.0-4.0" },
          { name: "Etkili Oyuncu", fullName: "8. Etkili Oyuncu (Solid)", color: "bg-cyan-500", perf: "3.0-4.0", pot: "<3.0" },
          { name: "Riskli", fullName: "9. Riskli (Underperformer)", color: "bg-red-500", perf: "<3.0", pot: "<3.0" },
        ].map((box, idx) => {
          const count = chartData.filter((d) => d.boxCategory === box.fullName).length;
          const isSelected = selectedBox === box.fullName;
          return (
            <button
              key={idx}
              onClick={() => setSelectedBox(isSelected ? "" : box.fullName)}
              className={`${box.color} ${isSelected ? "ring-4 ring-blue-300 ring-offset-2" : ""} text-white rounded-lg p-3 text-center shadow-md hover:shadow-lg transition-all cursor-pointer`}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs mt-1 font-medium">{box.name}</div>
              <div className="text-xs mt-1 opacity-90">P:{box.perf} Pot:{box.pot}</div>
            </button>
          );
        })}
      </div>

      {/* 9-Box Scatter Chart with Enhanced Grid */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Genel Yetenek Dağılımı (9-Box Matrisi)
        </h2>
          <div className="text-sm text-slate-600">
            {selectedBox || selectedDepartment ? (
              <>
                Filtrelenmiş: <strong>{filteredChartData.length}</strong> / Toplam: <strong>{chartData.length}</strong> personel
              </>
            ) : (
              <>
                Toplam: <strong>{chartData.length}</strong> personel
              </>
            )}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={600}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
            <defs>
              {/* Grid background colors for 9 boxes */}
              <pattern id="grid-pattern" x="0" y="0" width="100%" height="100%">
                <rect x="0" y="0" width="33.33%" height="33.33%" fill="rgba(239, 68, 68, 0.05)" />
                <rect x="33.33%" y="0" width="33.33%" height="33.33%" fill="rgba(249, 115, 22, 0.05)" />
                <rect x="66.66%" y="0" width="33.33%" height="33.33%" fill="rgba(234, 179, 8, 0.05)" />
                <rect x="0" y="33.33%" width="33.33%" height="33.33%" fill="rgba(6, 182, 212, 0.05)" />
                <rect x="33.33%" y="33.33%" width="33.33%" height="33.33%" fill="rgba(99, 102, 241, 0.05)" />
                <rect x="66.66%" y="33.33%" width="33.33%" height="33.33%" fill="rgba(139, 92, 246, 0.05)" />
                <rect x="0" y="66.66%" width="33.33%" height="33.33%" fill="rgba(20, 184, 166, 0.05)" />
                <rect x="33.33%" y="66.66%" width="33.33%" height="33.33%" fill="rgba(59, 130, 246, 0.05)" />
                <rect x="66.66%" y="66.66%" width="33.33%" height="33.33%" fill="rgba(34, 197, 94, 0.05)" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="performance"
              name="Performans"
              domain={[0.5, 5.5]}
              tick={{ fontSize: 12 }}
              label={{
                value: "Performans",
                position: "insideBottom",
                offset: -10,
                style: { fontSize: 14, fontWeight: "bold" },
              }}
            />
            <YAxis
              type="number"
              dataKey="potential"
              name="Potansiyel"
              domain={[0.5, 5.5]}
              tick={{ fontSize: 12 }}
              label={{
                value: "Potansiyel",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 14, fontWeight: "bold" },
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  const boxCategory = getTalentBox(data.performance, data.potential);
                  return (
                    <div 
                      className="bg-white p-4 border border-slate-200 rounded-lg shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
                      onClick={() => setSelectedPerson(data.name)}
                    >
                      <p className="font-bold text-slate-800 text-base mb-2">{data.name}</p>
                      <p className="text-sm text-slate-600 mb-1">
                        <strong>Kategori:</strong> {boxCategory}
                      </p>
                      <p className="text-sm text-slate-600 mb-1">
                        <strong>Performans:</strong> {data.performance.toFixed(1)} / 5.0
                      </p>
                      <p className="text-sm text-slate-600 mb-1">
                        <strong>Potansiyel:</strong> {data.potential.toFixed(1)} / 5.0
                      </p>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Departman:</strong> {data.department}
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-2">
                        👆 Detaylı analiz için tıklayın
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Thick reference lines for 9-box grid */}
            <ReferenceLine x={3.0} stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" />
            <ReferenceLine x={4.0} stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" />
            <ReferenceLine y={3.0} stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" />
            <ReferenceLine y={4.0} stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" />
            {/* Box labels */}
            <ReferenceLine x={1.75} stroke="rgba(0,0,0,0)" label={{ value: "Düşük", position: "top", style: { fontSize: 11, fill: "#6b7280" } }} />
            <ReferenceLine x={3.5} stroke="rgba(0,0,0,0)" label={{ value: "Orta", position: "top", style: { fontSize: 11, fill: "#6b7280" } }} />
            <ReferenceLine x={4.75} stroke="rgba(0,0,0,0)" label={{ value: "Yüksek", position: "top", style: { fontSize: 11, fill: "#6b7280" } }} />
            <ReferenceLine y={1.75} stroke="rgba(0,0,0,0)" label={{ value: "Düşük", angle: -90, position: "left", style: { fontSize: 11, fill: "#6b7280" } }} />
            <ReferenceLine y={3.5} stroke="rgba(0,0,0,0)" label={{ value: "Orta", angle: -90, position: "left", style: { fontSize: 11, fill: "#6b7280" } }} />
            <ReferenceLine y={4.75} stroke="rgba(0,0,0,0)" label={{ value: "Yüksek", angle: -90, position: "left", style: { fontSize: 11, fill: "#6b7280" } }} />
            <Scatter 
              data={filteredChartData} 
              fill="#3b82f6" 
              shape="circle"
            >
              {filteredChartData.map((entry, index) => {
                const perf = entry.performance;
                const pot = entry.potential;
                const isSelected = selectedPerson === entry.name;
                // Determine color based on 9-box position
                let fillColor = "#6b7280";
                if (pot >= 4.0 && perf >= 4.0) fillColor = "#22c55e"; // Green - Star
                else if (pot >= 4.0 && perf >= 3.0 && perf < 4.0) fillColor = "#3b82f6"; // Blue - High Pot
                else if (pot >= 3.0 && pot < 4.0 && perf >= 4.0) fillColor = "#eab308"; // Yellow - High Perf
                else if (pot >= 4.0 && perf < 3.0) fillColor = "#a855f7"; // Purple - Enigma
                else if (pot >= 3.0 && pot < 4.0 && perf >= 3.0 && perf < 4.0) fillColor = "#6366f1"; // Indigo - Core
                else if (pot < 3.0 && perf >= 4.0) fillColor = "#14b8a6"; // Teal - Reliable
                else if (pot >= 3.0 && pot < 4.0 && perf < 3.0) fillColor = "#f97316"; // Orange - Inconsistent
                else if (pot < 3.0 && perf >= 3.0 && perf < 4.0) fillColor = "#06b6d4"; // Cyan - Solid
                else if (pot < 3.0 && perf < 3.0) fillColor = "#ef4444"; // Red - Underperformer
                
                return (
                <Cell
                  key={`cell-${index}`}
                    fill={fillColor}
                    stroke={isSelected ? "#000000" : fillColor}
                    strokeWidth={isSelected ? 4 : 2}
                    style={{ cursor: "pointer" }}
                />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="mt-6 grid grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Yıldız Oyuncu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Yüksek Potansiyel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span>Yüksek Performans</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span>Soru İşareti</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-indigo-500"></div>
            <span>Kilit Oyuncu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-teal-500"></div>
            <span>Güvenilir Profesyonel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span>Uyumsuz</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cyan-500"></div>
            <span>Etkili Oyuncu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span>Riskli</span>
          </div>
        </div>
      </div>

      {/* Department-based 9-Box View */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">
          Departman Bazlı 9-Box Analizi
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(new Set(chartData.map((d) => d.department))).map((dept) => {
            const deptData = chartData.filter((d) => d.department === dept);
            const boxCounts: Record<string, number> = {};
            deptData.forEach((d) => {
              const box = getTalentBox(d.performance, d.potential);
              boxCounts[box] = (boxCounts[box] || 0) + 1;
            });
            return (
              <div key={dept} className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        COLORS[dept as keyof typeof COLORS] || "#6b7280",
                    }}
                  ></div>
                  {dept}
                </h3>
                <div className="space-y-2">
                  <div className="text-sm text-slate-600">
                    Toplam: <strong>{deptData.length}</strong> personel
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {Object.entries(boxCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([box, count]) => (
                        <div
                          key={box}
                          className="bg-slate-50 rounded p-1 text-center"
                        >
                          <div className="font-bold text-slate-800">{count}</div>
                          <div className="text-slate-600 truncate">
                            {box.split("(")[0].trim()}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9-Box Category Descriptions */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          📋 9-Box Kategori Açıklamaları
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              name: "1. Yıldız Oyuncu (Star)",
              desc: "Yüksek performans ve yüksek potansiyel. Terfi için öncelikli adaylar.",
              action: "Hemen terfi planlaması yapın",
              color: "bg-green-100 border-green-300",
            },
            {
              name: "2. Yüksek Potansiyel (High Pot)",
              desc: "Orta performans ama yüksek potansiyel. Gelişim programına dahil edin.",
              action: "Koçluk ve eğitim desteği verin",
              color: "bg-blue-100 border-blue-300",
            },
            {
              name: "3. Yüksek Performans (High Perf)",
              desc: "Yüksek performans ama orta potansiyel. Mevcut rolde tutun, yedekleme planına dahil edin.",
              action: "Mevcut rolde ödüllendirin",
              color: "bg-yellow-100 border-yellow-300",
            },
            {
              name: "4. Soru İşareti (Enigma)",
              desc: "Düşük performans ama yüksek potansiyel. Performans sorunlarını araştırın.",
              action: "Performans değerlendirmesi yapın",
              color: "bg-purple-100 border-purple-300",
            },
            {
              name: "5. Kilit Oyuncu (Core)",
              desc: "Orta performans ve orta potansiyel. Şirketin omurgası, stabil güç.",
              action: "Mevcut durumu koruyun",
              color: "bg-indigo-100 border-indigo-300",
            },
            {
              name: "6. Güvenilir Profesyonel",
              desc: "Yüksek performans ama düşük potansiyel. Mevcut rolde mükemmel, terfi için uygun değil.",
              action: "Mevcut rolde tutun ve ödüllendirin",
              color: "bg-teal-100 border-teal-300",
            },
            {
              name: "7. Uyumsuz (Inconsistent)",
              desc: "Düşük performans ve orta potansiyel. Performans iyileştirme planı gerekli.",
              action: "PIP (Performance Improvement Plan) uygulayın",
              color: "bg-orange-100 border-orange-300",
            },
            {
              name: "8. Etkili Oyuncu (Solid)",
              desc: "Orta performans ama düşük potansiyel. Mevcut rolde yeterli, gelişim fırsatları sunun.",
              action: "Hedef belirleme ve geri bildirim verin",
              color: "bg-cyan-100 border-cyan-300",
            },
            {
              name: "9. Riskli (Underperformer)",
              desc: "Düşük performans ve düşük potansiyel. Acil müdahale gerekli.",
              action: "PIP veya ayrılma planı düşünün",
              color: "bg-red-100 border-red-300",
            },
          ].map((category, idx) => (
            <div
              key={idx}
              className={`${category.color} border-2 rounded-lg p-4 hover:shadow-lg transition-shadow`}
            >
              <h3 className="font-bold text-slate-800 mb-2">{category.name}</h3>
              <p className="text-sm text-slate-700 mb-3">{category.desc}</p>
              <p className="text-xs font-semibold text-slate-600">
                💡 {category.action}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 my-6"></div>

      {/* Detailed Analysis */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">
          🔍 Kişi Bazlı Derinlemesine Analiz
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Selection and Info */}
          <div className="md:col-span-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Analiz Edilecek Personel:
              </label>
              <select
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Personel seçin...</option>
                {mergedData
                  .map((p) => p["Ad Soyad"])
                  .filter((name): name is string => Boolean(name))
                  .sort()
                  .map((name, idx) => (
                    <option key={`${name}-${idx}`} value={name}>
                      {name}
                    </option>
                  ))}
              </select>
            </div>

            {selectedPersonData && (
              <>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    📍 {getTalentBox(selectedPersonData.Performans, selectedPersonData.Potansiyel)}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Pozisyon:</strong> {selectedPersonData.Pozisyon || "Uzman"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-slate-600">Perf.</p>
                      <p className="text-lg font-bold text-slate-800">
                        {selectedPersonData.Performans.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-slate-600">Pot.</p>
                      <p className="text-lg font-bold text-slate-800">
                        {selectedPersonData.Potansiyel.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Promotion Status */}
                {promotionReadiness && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      🚀 Terfi Durumu
                    </h3>
                    <p className="text-xs text-slate-600 mb-2">
                      Bir Üst Rol Hedefi: <strong>{promotionReadiness.targetRoleName}</strong>
                    </p>
                    {promotionReadiness.isReady ? (
                      selectedPersonData.Potansiyel >= promotionReadiness.targetScore ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm font-semibold text-green-800">
                            ✅ TAM HAZIR
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            (Puan: {selectedPersonData.Potansiyel.toFixed(1)} &gt;= {promotionReadiness.targetScore})
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm font-semibold text-yellow-800">
                            🟡 TOLERANS DAHİLİNDE
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            (Hedef: {promotionReadiness.targetScore}, Puan: {selectedPersonData.Potansiyel.toFixed(1)})
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            *Destekle Terfi Edilebilir.*
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-semibold text-red-800">
                          ⛔ HAZIR DEĞİL
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          (Hedef: {promotionReadiness.targetScore}, Puan: {selectedPersonData.Potansiyel.toFixed(1)})
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          *Fark ({promotionReadiness.gap.toFixed(1)}), 0.50 toleransın üzerinde.*
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Radar Chart and Analysis */}
          <div className="md:col-span-2">
            {loadingAnalysis ? (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <SkeletonTable rows={5} cols={4} />
              </div>
            ) : gapAnalysis && gapAnalysis.radarData && gapAnalysis.radarData.length > 0 ? (
              <>
                {/* Readiness Status Badge */}
                {talentAnalysis && (
                  <div className={`mb-4 p-4 rounded-lg border-2 ${
                    talentAnalysis.readiness_status === "READY"
                      ? "bg-green-50 border-green-300"
                      : talentAnalysis.readiness_status === "DEVELOPMENT_NEEDED"
                      ? "bg-yellow-50 border-yellow-300"
                      : "bg-red-50 border-red-300"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 mb-1">
                          {talentAnalysis.readiness_status === "READY" && "✅ Hazır"}
                          {talentAnalysis.readiness_status === "DEVELOPMENT_NEEDED" && "🟡 Gelişim Gerekli"}
                          {talentAnalysis.readiness_status === "NOT_READY" && "⛔ Hazır Değil"}
                        </h3>
                        <p className="text-sm text-slate-600">
                          Hedef Rol: <strong>{talentAnalysis.target_role}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Ortalama</p>
                        <p className="text-lg font-bold text-slate-800">
                          Mevcut: {talentAnalysis.average_current?.toFixed(1) || "0.0"}
                        </p>
                        <p className="text-lg font-bold text-slate-800">
                          Hedef: {talentAnalysis.average_target?.toFixed(1) || "0.0"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Radar Chart - Yetkinlik Kıyaslaması */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-6 mb-6 border-2 border-slate-200 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                      <Target className="w-6 h-6 text-blue-600" />
                      Yetkinlik Kıyaslaması: Mevcut vs Hedef
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 bg-white/60 rounded-lg p-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                    <strong>Kırmızı alan:</strong> {talentAnalysis?.target_role || "Bir üst rol"} için hedef yetkinlik seviyesi | 
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2 ml-2"></span>
                    <strong>Mavi alan:</strong> Mevcut yetkinlik seviyeniz
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <ResponsiveContainer width="100%" height={450}>
                      <RadarChart 
                        data={gapAnalysis?.radar_data ? 
                          // Backend formatını frontend formatına çevir
                          gapAnalysis.radar_data.categories.map((cat: string, idx: number) => ({
                            subject: cat,
                            current: gapAnalysis.radar_data.current[idx] || 0,
                            target: gapAnalysis.radar_data.target[idx] || 0,
                            fullMark: 5
                          })) : 
                          (gapAnalysis?.radarData || [])
                        } 
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fontSize: 12, fill: "#4b5563", fontWeight: 500 }}
                          tickLine={{ stroke: "#9ca3af" }}
                        />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 5]} 
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          tickCount={6}
                        />
                    <Radar
                          name={`Hedef Profil (${talentAnalysis?.target_role || "Bir Üst Rol"})`}
                      dataKey="target"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.15}
                          strokeWidth={3}
                          dot={{ fill: "#ef4444", r: 5, strokeWidth: 2 }}
                    />
                    <Radar
                      name="Mevcut Puan"
                      dataKey="current"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.35}
                          strokeWidth={3}
                          dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2 }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0].payload;
                              const currentVal = payload.find(p => p.dataKey === "current")?.value as number || 0;
                              const targetVal = payload.find(p => p.dataKey === "target")?.value as number || 0;
                              const diff = currentVal - targetVal;
                              return (
                                <div className="bg-white p-4 border-2 border-slate-300 rounded-lg shadow-xl">
                                  <p className="font-bold text-slate-800 text-base mb-3">{data.subject}</p>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-600">Mevcut:</span>
                                      <strong className="text-blue-600 text-lg">{currentVal.toFixed(1)}</strong>
                                      <span className="text-xs text-slate-500">/ 5.0</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-600">Hedef:</span>
                                      <strong className="text-red-600 text-lg">{targetVal.toFixed(1)}</strong>
                                      <span className="text-xs text-slate-500">/ 5.0</span>
                                    </div>
                                    <div className="border-t border-slate-200 pt-2 mt-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">Fark:</span>
                                        <strong className={`text-lg ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                                          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
                                        </strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-8 text-sm">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-slate-200">
                      <div className="w-5 h-5 rounded-full bg-red-500/20 border-2 border-red-500"></div>
                      <span className="font-medium text-slate-700">Hedef Seviye</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-slate-200">
                      <div className="w-5 h-5 rounded-full bg-blue-500/30 border-2 border-blue-500"></div>
                      <span className="font-medium text-slate-700">Mevcut Seviye</span>
                    </div>
                  </div>
                </div>

                {/* AI Career Coach Card */}
                <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 shadow-lg">
                  <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-purple-600" />
                    🤖 Yapay Zeka Kariyer Koçu
                  </h3>

                  <div className="space-y-4">
                    {/* Critical Gaps */}
                    {gapAnalysis.analysis.critical_fail.length > 0 && (
                      <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                        <p className="font-bold text-red-800 mb-3 text-lg">
                          🚨 Kritik Eksiklikler
                        </p>
                        <p className="text-sm text-red-700 mb-3">
                          Bu yetkinlikler hedef rol için <strong>hayati önem taşıyor</strong> (Hedef ≥ 4.0). 
                          Acil gelişim gerekiyor:
                        </p>
                        <ul className="space-y-2">
                          {gapAnalysis.analysis.critical_fail.map((item: any, idx: number) => (
                            <li key={idx} className="bg-white rounded-lg p-3 border border-red-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <strong className="text-red-800">{item.name}</strong>
                                  <p className="text-xs text-red-600 mt-1">
                                    Hedef: <strong>{item.target.toFixed(1)}</strong> | 
                                    Sen: <strong>{item.current.toFixed(1)}</strong> | 
                                    Eksik: <strong>-{item.gap.toFixed(1)}</strong>
                                  </p>
                                </div>
                                <span className="text-2xl">⚠️</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Moderate Gaps */}
                    {gapAnalysis.analysis.moderate_gap.length > 0 && (
                      <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <p className="font-bold text-yellow-800 mb-3 text-lg">
                          ⚠️ Gelişim Alanları
                        </p>
                        <p className="text-sm text-yellow-700 mb-3">
                          Bu yetkinliklerde hedefe ulaşmak için desteğe ihtiyacın var:
                        </p>
                        <ul className="space-y-2">
                          {gapAnalysis.analysis.moderate_gap.map((item: any, idx: number) => (
                            <li key={idx} className="bg-white rounded-lg p-3 border border-yellow-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <strong className="text-yellow-800">{item.name}</strong>
                                  <p className="text-xs text-yellow-600 mt-1">
                                    Hedef: <strong>{item.target.toFixed(1)}</strong> | 
                                    Sen: <strong>{item.current.toFixed(1)}</strong> | 
                                    Eksik: <strong>-{item.gap.toFixed(1)}</strong>
                                  </p>
                                </div>
                                <span className="text-2xl">📈</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Strengths */}
                    {gapAnalysis.analysis.strength.length > 0 && (
                      <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                        <p className="font-bold text-green-800 mb-3 text-lg">
                          ✅ Güçlü Yönler
                        </p>
                        <p className="text-sm text-green-700 mb-3">
                          Bu yetkinliklerde beklentinin üzerinde performans gösteriyorsun:
                        </p>
                        <ul className="space-y-2">
                          {gapAnalysis.analysis.strength.map((item: any, idx: number) => (
                            <li key={idx} className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <strong className="text-green-800">{item.name}</strong>
                                  <p className="text-xs text-green-600 mt-1">
                                    Sen: <strong>{item.val.toFixed(1)}</strong> / 5.0
                                  </p>
                                </div>
                                <span className="text-2xl">💎</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Perfect Profile */}
                    {(!gapAnalysis?.analysis?.critical_fail || gapAnalysis.analysis.critical_fail.length === 0) &&
                      (!gapAnalysis?.analysis?.moderate_gap || gapAnalysis.analysis.moderate_gap.length === 0) && (
                        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg text-center">
                          <p className="font-bold text-green-800 mb-2 text-lg">
                            🏆 Mükemmel Profil!
                          </p>
                          <p className="text-sm text-green-700">
                            Tüm yetkinliklerde hedefin üzerindesin. Terfi için hazırsın! 🎉
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="mt-6 p-4 bg-white rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800 font-semibold mb-2">
                      💡 Önerilen Aksiyonlar:
                    </p>
                    <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
                      <li>Kritik eksiklikler için acil eğitim programına katıl</li>
                      <li>Gelişim alanları için koçluk desteği al</li>
                      <li>Güçlü yönlerini mentorluk için kullan</li>
                      <li>Gelişim Planı sekmesinden detaylı plan oluştur</li>
                    </ul>
                  </div>
                </div>

                {/* AI Recommendations */}
                {aiRecommendations.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Info className="w-5 h-5 text-purple-600" />
                      🤖 Kişiye Özel Yapay Zeka Önerileri
                    </h3>
                    <div className="space-y-3">
                      {aiRecommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border-2 ${
                            rec.type === "success"
                              ? "bg-green-50 border-green-300"
                              : rec.type === "warning"
                              ? "bg-yellow-50 border-yellow-300"
                              : rec.type === "error"
                              ? "bg-red-50 border-red-300"
                              : "bg-blue-50 border-blue-300"
                          }`}
                        >
                          <h4 className="font-bold text-slate-800 mb-2">{rec.title}</h4>
                          <p className="text-sm text-slate-700 mb-2">{rec.description}</p>
                          <p className="text-xs font-semibold text-slate-600 bg-white/50 rounded px-2 py-1 inline-block">
                            💡 {rec.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : selectedPerson ? (
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-yellow-800">
                  ⚠️ Bu personel için 360 verisi bulunamadı.
                </p>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <p className="text-slate-600">
                  Lütfen analiz edilecek personeli seçin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
