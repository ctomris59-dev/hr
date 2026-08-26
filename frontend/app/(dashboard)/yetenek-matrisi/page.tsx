"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ReferenceLine
} from '@/components/charts/recharts';
import { 
  Trophy, TrendingUp, CheckCircle, XCircle, BrainCircuit, Filter, Sparkles, Lightbulb, Target, BookOpen, Clock, Map
} from 'lucide-react';
import { getStorageData, STORAGE_KEYS } from '../../utils/storage';
import { createStandardRadarData, extractCompetencyScoresFromTalentMatrix } from '../../utils/calculations';
import { toScore, formatScore } from '../../../lib/score';
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";

// --- TİP TANIMLAMALARI ---
interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  performance: number;
  potential: number;
  salary: number;
  scores: { [key: string]: number };  // Mevcut Puanlar (Test sonuçları)
  manager_scores?: { [key: string]: number };  // Yönetici Puanları (360'dan)
  targets: { [key: string]: number }; // Hedef Puanlar (Backend'den gelir)
  targetCompetencyScore?: number | null;
  test_score?: number | null;
  manager_score?: number | null;
  position_competency_score?: number | null;
}

// Görselleştirme için Yetkinlik Kod -> İsim Haritası (Backend config.py ile uyumlu)
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

// --- YARDIMCI FONKSİYONLAR ---

const categorize9Box = (perf: number, pot: number): string => {
  const pCat = perf < 3.0 ? 0 : (perf < 4.0 ? 1 : 2);
  const potCat = pot < 3.0 ? 0 : (pot < 4.0 ? 1 : 2);
  const boxes = [
    ["9. Riskli", "6. Güvenilir", "3. Yüksek Performans"],
    ["8. Etkili", "5. Kilit Oyuncu", "2. Yüksek Potansiyel"],
    ["7. Uyumsuz", "4. Soru İşareti", "1. Yıldız Oyuncu"]
  ];
  return boxes[potCat][pCat];
};

// Dinamik Gap Analizi (3 katmanlı: Mevcut, Yönetici, Hedef)
const analyzeGapDynamic = (employee: Employee) => {
  if (!employee) return { radarData: [], analysisReport: { criticalFail: [], moderateGap: [], strength: [] }, avgTarget: 3, avgCombined: 3 };

  const analysisReport = { criticalFail: [] as any[], moderateGap: [] as any[], strength: [] as any[] };
  
  let totalTarget = 0;
  let totalCombined = 0;
  let counted = 0;
  
  // STANDART FONKSİYON ile yetkinlik puanlarını çıkar (Tüm modüllerde aynı mantık)
  const competencyScores = extractCompetencyScoresFromTalentMatrix(employee, COMPETENCIES_MAP);
  const empScores = competencyScores.scores;  // Test sonuçları
  const managerScores = competencyScores.manager_scores;  // Yönetici puanları (360'dan)
  const empTargets = competencyScores.targets; // Hedef puanlar (Job Profiles'dan)

  // Radar verisi için standart fonksiyonu kullan (tüm modüllerde aynı mantık)
  const radarData = createStandardRadarData(
    {
      scores: empScores,
      manager_scores: managerScores,
      targets: empTargets,
    },
    COMPETENCIES_MAP
  );

  // Gap analizi için birleşik puan hesapla (Rapor için)
  Object.keys(COMPETENCIES_MAP).forEach((code) => {
    const name = COMPETENCIES_MAP[code];
    
    // Verileri güvenli çek (radar verisi zaten oluşturuldu, burada gap analizi için kullanıyoruz)
    const currentVal = toScore(empScores[code]);
    const managerRaw = toScore(managerScores[code]);
    const targetVal = toScore(empTargets[code]);
    const baseVal = currentVal ?? managerRaw;
    if (baseVal === null || targetVal === null) {
      return;
    }
    const managerVal = managerRaw ?? baseVal;
    
    // Birleşik puan: (Test + Yönetici) / 2
    const combinedVal = (baseVal + managerVal) / 2;
    
    totalTarget += targetVal;
    totalCombined += combinedVal;
    counted += 1;
    
    // Gap analizi için birleşik puanı kullan
    const gap = combinedVal - targetVal;
    
    // Kritiklik: Eğer iş profili bu yetkinlik için 4.5+ istiyorsa kritiktir.
    const isCritical = targetVal >= 4.5;

    // Rapor Oluştur (Birleşik puan üzerinden)
    if (gap < 0) {
      const detail = { name, current: combinedVal, target: targetVal, gap, isCritical };
      if (isCritical && gap <= -0.5) analysisReport.criticalFail.push(detail);
      else analysisReport.moderateGap.push(detail);
    } else if (gap >= 0.5) {
      analysisReport.strength.push({ name, val: combinedVal });
    }
  });

  const avgTarget = counted > 0 ? totalTarget / counted : 0;
  const avgCombined = counted > 0 ? totalCombined / counted : 0;
  return { radarData, analysisReport, avgTarget, avgCombined };
};

const formatDeptCompare = (personScore: number | null, deptAvg: number | null) => {
  if (personScore === null || deptAvg === null) return null;
  const delta = personScore - deptAvg;
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const deltaText = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
  return `Departman Ort.: ${deptAvg.toFixed(1)} (${arrow} ${deltaText})`;
};

// Yapay Zeka Tavsiyeleri Üretici Fonksiyon
const generateAIRecommendations = (analysisReport: any, position: string, avgCombined: number, avgTarget: number): string[] => {
  const recommendations: string[] = [];
  
  // Genel Durum Analizi
  const overallGap = avgCombined - avgTarget;
  if (overallGap < -0.5) {
    recommendations.push(`📊 Genel performans hedefin ${Math.abs(overallGap).toFixed(1)} puan altında. Öncelikle en kritik yetkinliklerden başlayarak kademeli bir gelişim planı oluşturulmalı.`);
  }
  
  // Kritik Eksikler için Tavsiyeler
  analysisReport.criticalFail.forEach((item: any) => {
    const gap = Math.abs(item.gap);
    switch(item.name) {
      case "Stratejik Bakış":
        recommendations.push(`🎯 Stratejik Bakış: ${gap.toFixed(1)} puan eksik. Üst düzey yönetim toplantılarına katılım, stratejik planlama workshop'ları ve sektör trend analizi çalışmaları önerilir.`);
        break;
      case "Analitik Düşünme":
        recommendations.push(`📈 Analitik Düşünme: ${gap.toFixed(1)} puan eksik. Veri analizi kursları (Excel, SQL, Python), case study çalışmaları ve problem çözme teknikleri eğitimi faydalı olacaktır.`);
        break;
      case "İletişim Becerileri":
        recommendations.push(`💬 İletişim Becerileri: ${gap.toFixed(1)} puan eksik. Etkili sunum teknikleri, topluluk önünde konuşma pratikleri ve yazılı iletişim workshop'ları önerilir.`);
        break;
      case "Takım Çalışması":
        recommendations.push(`👥 Takım Çalışması: ${gap.toFixed(1)} puan eksik. Cross-functional projelerde aktif rol alma, takım liderliği eğitimleri ve işbirliği odaklı aktivitelere katılım gelişim sağlayacaktır.`);
        break;
      case "Sonuç Odaklılık":
        recommendations.push(`🎯 Sonuç Odaklılık: ${gap.toFixed(1)} puan eksik. SMART hedef belirleme teknikleri, proje yönetimi metodolojileri (Agile/Scrum) ve KPI takip sistemleri öğrenilmelidir.`);
        break;
      case "Dijital Okuryazarlık":
        recommendations.push(`💻 Dijital Okuryazarlık: ${gap.toFixed(1)} puan eksik. Dijital araçlar eğitimi, otomasyon çözümleri öğrenimi ve teknoloji trend takibi için online platformlar kullanılmalıdır.`);
        break;
      case "Detaylara Özen":
        recommendations.push(`🔍 Detaylara Özen: ${gap.toFixed(1)} puan eksik. Kalite kontrol süreçleri, checklist metodolojileri ve dikkat geliştirme teknikleri uygulanmalıdır.`);
        break;
      case "Sürekli Öğrenme":
        recommendations.push(`📚 Sürekli Öğrenme: ${gap.toFixed(1)} puan eksik. Kişisel öğrenme planı oluşturma, online kurs platformları (Coursera, Udemy) ve sektör yayınları takibi önerilir.`);
        break;
      case "Etik ve Uyum":
        recommendations.push(`⚖️ Etik ve Uyum: ${gap.toFixed(1)} puan eksik. Kurumsal etik eğitimleri, uyum yönetimi workshop'ları ve etik karar verme senaryoları çalışılmalıdır.`);
        break;
      case "Öz-Disiplin":
        recommendations.push(`⏰ Öz-Disiplin: ${gap.toFixed(1)} puan eksik. Zaman yönetimi teknikleri (Pomodoro, Eisenhower Matrix), öz-farkındalık çalışmaları ve mentorluk desteği alınmalıdır.`);
        break;
      default:
        recommendations.push(`🔧 ${item.name}: ${gap.toFixed(1)} puan eksik. Bu yetkinlik için özel gelişim planı oluşturulmalı ve düzenli geri bildirim alınmalıdır.`);
    }
  });
  
  // Gelişim Alanları için Tavsiyeler
  if (analysisReport.moderateGap.length > 0) {
    const topGaps = analysisReport.moderateGap.slice(0, 3); // En önemli 3 gelişim alanı
    if (topGaps.length > 0) {
      recommendations.push(`💡 Öncelikli Gelişim Odakları: ${topGaps.map((g: any) => g.name).join(", ")} alanlarında kısa vadeli hedefler belirlenmeli ve aylık ilerleme takibi yapılmalıdır.`);
    }
  }
  
  // Güçlü Yönler için Güçlendirme Tavsiyeleri
  if (analysisReport.strength.length > 0) {
    const topStrengths = analysisReport.strength.slice(0, 2);
    recommendations.push(`⭐ Güçlü Yönlerinizi Kullanın: ${topStrengths.map((s: any) => s.name).join(" ve ")} yetkinlikleriniz yüksek. Bu alanlarda mentorluk yaparak hem kendinizi geliştirin hem de ekibe değer katın.`);
  }
  
  // Pozisyon Bazlı Özel Tavsiyeler
  if (position.includes("Müdür") || position.includes("Direktör") || position.includes("Genel Müdür")) {
    if (analysisReport.criticalFail.length > 0 || analysisReport.moderateGap.length > 0) {
      recommendations.push(`👔 Yönetim Seviyesi Önerisi: Liderlik gelişimi için executive coaching, stratejik düşünme programları ve peer learning gruplarına katılım düşünülebilir.`);
    }
  }
  
  // Eğer hiç tavsiye yoksa genel bir mesaj
  if (recommendations.length === 0) {
    recommendations.push(`✅ Harika! Tüm yetkinlikler hedef seviyede. Mevcut performansınızı korumak ve sürekli gelişim için yeni zorluklar arayın.`);
  }
  
  return recommendations;
};

export default function YetenekMatrisiPage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId") ?? searchParams.get("dqiEmployeeId");
  const employeeNameParam = (searchParams.get("employeeName") ?? searchParams.get("dqiEmployeeName") ?? "").trim() || null;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<number>(0);
  const [filterText, setFilterText] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasAppliedQuerySelection, setHasAppliedQuerySelection] = useState(false);
  const normalizeName = (value: string) =>
    value.toLowerCase().replace(/\s+/g, " ").trim();

  // Kullanıcı bilgisini yükle
  useEffect(() => {
    const storedUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setCurrentUser(storedUser);
  }, []);

  // Auto-select employee from query params (optional)
  useEffect(() => {
    if (hasAppliedQuerySelection) return;
    if (!employeeIdParam && !employeeNameParam) return;
    if (employees.length === 0) return;
    const match = employees.find((emp) => {
      if (employeeIdParam && String(emp.id) === String(employeeIdParam)) return true;
      if (employeeNameParam && emp.name === employeeNameParam) return true;
      return false;
    });
    if (match && match.id !== selectedPersonId) {
      setSelectedPersonId(match.id);
    }
    setHasAppliedQuerySelection(true);
  }, [employees, employeeIdParam, employeeNameParam, selectedPersonId, hasAppliedQuerySelection]);

  // --- API VERİ ÇEKME ---
  useEffect(() => {
    async function fetchTalentData() {
      try {
        // Verilerin temizlenip temizlenmediğini kontrol et
        const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
        
        // Kullanıcı bilgisini al
        const user = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
        const userRole = user?.role || "EMPLOYEE";
        const userDept = user?.dept || user?.department || "";
        const userName = user?.name || user?.userName || "";
        
        // Backend'e kullanıcı bilgilerini gönder (Next.js API route üzerinden)
        const params = new URLSearchParams();
        if (userRole) params.append('user_role', userRole);
        if (userDept) params.append('user_dept', userDept);
        if (userName) params.append('user_name', userName);
        params.append('_t', Date.now().toString()); // Cache bypass
        
        const response = await fetch(`/api/talent-matrix?${params.toString()}`);
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.error('Talent matrix fetch error:', response.status, errorText);
          throw new Error(`Veri çekilemedi: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        const rawData = Array.isArray(result) ? result : (result.data || []);

        if (dataCleared && rawData.length > 0) {
          localStorage.removeItem("hr_data_cleared");
        }
        
        console.log("Talent Matrix Raw Data:", rawData.slice(0, 2)); // Debug: İlk 2 kaydı göster
        
        // VERİYİ OLDUĞU GİBİ KULLAN - DEĞİŞTİRME (Tüm modüllerde aynı veri olmalı)
        // extractCompetencyScoresFromTalentMatrix fonksiyonu zaten fallback mantığını yapacak
        const employeesArray = rawData.map((emp: any, index: number) => {
          // Backend'den gelen ham veriyi olduğu gibi sakla (değiştirme)
          // Fallback mantığı createStandardRadarData ve extractCompetencyScoresFromTalentMatrix'te
          return {
            id: emp.id || index + 1,
            name: emp.name || 'İsimsiz',
            position: emp.position || 'Belirsiz',
            department: emp.department || 'Genel',
            performance: Number(emp.performance || 3.0),
            potential: Number(emp.potential || 3.0),
            salary: Number(emp.salary || 0),
            // Backend'den gelen ham veriyi olduğu gibi sakla (değiştirme)
            scores: emp.scores || {},   // MEVCUT PUANLAR (Test sonuçları) - HAM VERİ
            manager_scores: emp.manager_scores || {},  // YÖNETİCİ PUANLARI (360'dan) - HAM VERİ
            targets: emp.targets || {},  // HEDEF PUANLAR (Job Profiles'dan) - HAM VERİ
            targetCompetencyScore: emp.targetCompetencyScore ?? null,
            test_score: emp.test_score ?? null,
            manager_score: emp.manager_score ?? null,
            position_competency_score: emp.position_competency_score ?? null,
          };
        });
        
        // Hiyerarşi kontrolü: Frontend'de de filtreleme yap (ekstra güvenlik)
        let filteredEmployees = employeesArray;
        const normalizedUserName = normalizeName(userName || "");
        const isEmployeeRole = userRole === "EMPLOYEE" || userRole === "PERSONEL";

        if (userRole !== "CEO" && userRole !== "IK") {
          if (userRole === "DIRECTOR" || userRole === "MANAGER") {
            // Direktör ve Müdürler sadece kendi departmanlarını görebilir
            filteredEmployees = employeesArray.filter((emp: Employee) => {
              return emp.department === userDept;
            });
          } else if (isEmployeeRole) {
            const self = employeesArray.find((emp: Employee) => {
              const candidate = normalizeName(emp.name || "");
              return (
                candidate === normalizedUserName ||
                candidate.includes(normalizedUserName) ||
                normalizedUserName.includes(candidate)
              );
            });
            filteredEmployees = self ? [self] : [];
          } else {
            // Diğer roller hiçbir şey göremez
            filteredEmployees = [];
          }
        }
        
        setEmployees(filteredEmployees);
        if (filteredEmployees.length > 0) setSelectedPersonId(filteredEmployees[0].id);
      } catch (error) {
        console.error("API Hatası:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTalentData();
    
    // Storage temizlendiğinde verileri temizle
    const handleStorageCleared = () => {
      setEmployees([]);
      setSelectedPersonId(0);
      setLoading(false);
    };
    
    // Talent Matrix güncellendiğinde yeniden yükle
    const handleTalentMatrixUpdate = () => {
      fetchTalentData();
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

  // Yetkinlik skorlarının ortalamasını hesapla (Potansiyel olarak kullanılacak)
  // Test puanı ve Yönetici puanının ortalaması
  const calculateAverageCompetencyScore = (emp: Employee): number => {
    if (!emp) return 0;
    
    // STANDART FONKSİYON ile veriyi çıkar (tüm modüllerde aynı mantık)
    const competencyScores = extractCompetencyScoresFromTalentMatrix(emp, COMPETENCIES_MAP);
    const testScores = competencyScores.scores;
    const managerScores = competencyScores.manager_scores;
    
    let totalCombined = 0;
    let count = 0;
    
    Object.keys(COMPETENCIES_MAP).forEach((code) => {
    const testVal = toScore(testScores[code]);
    const managerRaw = toScore(managerScores[code]);
    const baseVal = testVal ?? managerRaw;
    if (baseVal === null) return;
    const managerVal = managerRaw ?? baseVal;
    const combinedVal = (baseVal + managerVal) / 2;
    totalCombined += combinedVal;
    count++;
    });
    
    return count > 0 ? totalCombined / count : 0;
  };

  const selectedPerson = useMemo(() => employees.find(e => e.id === selectedPersonId) || employees[0], [employees, selectedPersonId]);

  const scatterData = useMemo(() => {
    return employees.map(emp => {
      const calculatedPotential = calculateAverageCompetencyScore(emp);
      return {
        ...emp,
        potential: calculatedPotential, // Potansiyeli (test + yönetici) / 2 ortalamasından hesapla
        boxLabel: categorize9Box(emp.performance, calculatedPotential)
      };
    });
  }, [employees]);

  const boxLabels = useMemo(() => ([
    { x: 1, y: 5, label: "Yıldızlar" },
    { x: 3, y: 5, label: "Yüksek Pot." },
    { x: 5, y: 5, label: "Lider Adayı" },
    { x: 1, y: 3, label: "Geliştir" },
    { x: 3, y: 3, label: "Dengeli" },
    { x: 5, y: 3, label: "Kritik Rol" },
    { x: 1, y: 1, label: "Riskli" },
    { x: 3, y: 1, label: "Destek" },
    { x: 5, y: 1, label: "Uzman" },
  ]), []);

  const filteredOptions = useMemo(() => employees.filter(e => e.name.toLowerCase().includes(filterText.toLowerCase())), [employees, filterText]);

  const targetCompetencyScore = useMemo(() => {
    const raw = selectedPerson?.targetCompetencyScore;
    if (raw === null || raw === undefined || raw === "") return null;
    const value = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
    return Number.isFinite(value) ? value : null;
  }, [selectedPerson?.targetCompetencyScore]);

  const deptScoreAverages = useMemo(() => {
    const stats: Record<string, { testSum: number; testCount: number; managerSum: number; managerCount: number; positionSum: number; positionCount: number }> = {};
    employees.forEach((emp) => {
      const dept = emp.department;
      if (!dept) return;
      if (!stats[dept]) {
        stats[dept] = { testSum: 0, testCount: 0, managerSum: 0, managerCount: 0, positionSum: 0, positionCount: 0 };
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
      const positionScore = toScore(emp.position_competency_score ?? emp.targetCompetencyScore);
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
  }, [employees]);

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
  if (!selectedPerson) return <div className="p-10 text-center text-zinc-500">Veri bulunamadı.</div>;

  // ANALİZ
  const { radarData, analysisReport, avgTarget, avgCombined } = analyzeGapDynamic(selectedPerson);
  const currentAvgScore = calculateAverageCompetencyScore(selectedPerson);
  const isReady = currentAvgScore >= avgTarget;
  const boxName = categorize9Box(selectedPerson.performance, currentAvgScore);
  const deptAvgScores = selectedPerson ? deptScoreAverages[selectedPerson.department] : null;
  const personTestScore = toScore(selectedPerson.test_score);
  const personManagerScore = toScore(selectedPerson.manager_score);
  const personPositionScore = toScore(selectedPerson.position_competency_score ?? selectedPerson.targetCompetencyScore);
  const testCompareLine = formatDeptCompare(personTestScore, deptAvgScores?.testAvg ?? null);
  const managerCompareLine = formatDeptCompare(personManagerScore, deptAvgScores?.managerAvg ?? null);
  const positionCompareLine = formatDeptCompare(personPositionScore, deptAvgScores?.positionAvg ?? null);
  const dqiChartTestValue = toScore(radarData.find((d) => d.subject === COMPETENCIES_MAP.STR)?.A);
  const dqiTableTestValue = toScore(selectedPerson.scores?.STR);
  const quickEmployeeQuery = selectedPersonId ? `?employeeId=${selectedPersonId}` : "";

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">📊 Yetenek Matrisi</h2>
          <p className="text-zinc-500 mt-1">Sistemdeki <strong className="text-indigo-600">{employees.length} Personelin</strong> Canlı Analizi</p>
        </div>
        <div className="w-full lg:w-96 space-y-3">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-zinc-200">
             <label className="text-xs font-semibold text-zinc-400 mb-2 block flex items-center gap-1"><Filter className="w-3 h-3" /> Personel Filtrele</label>
             <div className="space-y-2">
               <input data-testid="dqi-person-search" type="text" placeholder="İsim ara..." className="w-full p-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-indigo-500" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
               <select data-testid="dqi-person-select" className="w-full p-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 focus:outline-none" value={selectedPersonId} onChange={(e) => setSelectedPersonId(Number(e.target.value))}>
                 {filteredOptions.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.position}</option>)}
               </select>
             </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-zinc-200">
            <p className="text-xs font-semibold text-zinc-400 mb-2">Sonraki Adım</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/yetenek-matrisi${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700 hover:bg-indigo-100">
                <TrendingUp className="w-3 h-3" />
                Yetenek Matrisi
              </Link>
              <Link href={`/degerlendirme${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-1 text-[11px] text-orange-700 hover:bg-orange-100">
                <Target className="w-3 h-3" />
                360 Değerlendirme
              </Link>
              <Link href={`/egitim${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-700 hover:bg-blue-100">
                <BookOpen className="w-3 h-3" />
                Eğitim
              </Link>
              <Link href={`/gelisim${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2 py-1 text-[11px] text-violet-700 hover:bg-violet-100">
                <Clock className="w-3 h-3" />
                Gelişim Planı
              </Link>
              <Link href={`/kariyer${quickEmployeeQuery}`} className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-100">
                <Map className="w-3 h-3" />
                Kariyer Yolu
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 9-BOX SCATTER CHART */}
      <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-6 h-[500px]">
        <h3 className="font-semibold text-lg text-zinc-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> Organizasyon Dağılımı (9-Box)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              type="number"
              dataKey="performance"
              name="Performans"
              domain={[0, 6]}
              label={{ value: "Performans →", position: "insideBottomRight", offset: -6, fill: "#94a3b8", fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="potential"
              name="Potansiyel"
              domain={[0, 6]}
              label={{ value: "↑ Potansiyel", angle: -90, position: "insideLeft", offset: 0, fill: "#94a3b8", fontSize: 12 }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return <div className="bg-white p-3 rounded-xl shadow-xl border border-zinc-200"><p className="font-bold text-indigo-600">{data.name}</p><p className="text-xs text-zinc-500">{data.position}</p><p className="text-[10px] text-zinc-400 mt-1 uppercase">{data.boxLabel}</p></div>;
                }
                return null;
            }} />
            <ReferenceLine x={2} stroke="#E5E7EB" strokeWidth={2} />
            <ReferenceLine x={4} stroke="#E5E7EB" strokeWidth={2} />
            <ReferenceLine y={2} stroke="#E5E7EB" strokeWidth={2} />
            <ReferenceLine y={4} stroke="#E5E7EB" strokeWidth={2} />
            <Scatter
              data={boxLabels}
              shape={(props: any) => (
                <text
                  x={props.cx}
                  y={props.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#e5e7eb"
                  fontSize={12}
                >
                  {props.payload.label}
                </text>
              )}
            />
            <Scatter name="Çalışanlar" data={scatterData} fill="#6366F1">
                {scatterData.map((entry, index) => (
                    <circle key={`cell-${index}`} cx={0} cy={0} r={entry.id === selectedPersonId ? 10 : 6} fill={entry.id === selectedPersonId ? '#F43F5E' : 'rgba(99, 102, 241, 0.6)'} stroke={entry.id === selectedPersonId ? '#fff' : 'none'} strokeWidth={2} />
                ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* DETAIL ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PROFİL */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-8 -mt-8"></div>
             <h3 className="text-xl font-bold text-zinc-800">{selectedPerson.name}</h3>
             <p className="text-sm text-zinc-500">{selectedPerson.position}</p>
             <div className="sr-only">
               <span data-testid="dqi-selected-employee-name">{selectedPerson.name}</span>
               <span data-testid="dqi-selected-employee-id">{selectedPerson.id}</span>
               <span data-testid="dqi-test-score">{toScore(selectedPerson.test_score) ?? ""}</span>
               <span data-testid="dqi-manager-score">{toScore(selectedPerson.manager_score) ?? ""}</span>
               <span data-testid="dqi-position-score">{toScore(selectedPerson.position_competency_score ?? selectedPerson.targetCompetencyScore) ?? ""}</span>
               <span data-testid="dqi-chart-test-score">{dqiChartTestValue ?? ""}</span>
               <span data-testid="dqi-table-test-score">{dqiTableTestValue ?? ""}</span>
             </div>
             <span className="inline-block mt-2 px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-full">{boxName}</span>
             <div className="grid grid-cols-2 gap-4 mt-6">
               <div className="bg-zinc-50 p-3 rounded-xl text-center"><span className="text-xs text-zinc-400">Perf</span><span className="block text-xl font-bold">{formatScore(selectedPerson.performance)}</span></div>
               <div className="bg-zinc-50 p-3 rounded-xl text-center"><span className="text-xs text-zinc-400">Pot</span><span className="block text-xl font-bold">{formatScore(currentAvgScore)}</span></div>
             </div>
           </div>
           
           <div className={`bg-white rounded-[2rem] border shadow-sm p-6 border-l-[6px] min-h-[350px] h-full flex flex-col ${isReady ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
             <h4 className="font-semibold text-zinc-800 flex items-center gap-2 mb-3"><Trophy className="w-5 h-5 text-amber-500" /> Profil Uyumluluğu</h4>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Hedef Yetkinlik Puanı:</span>
                  <span className="font-medium">{formatScore(targetCompetencyScore)}</span>
                </div>
                <div className="flex justify-between"><span>Gereken Ort. Puan:</span> <span className="font-medium">{formatScore(avgTarget)}</span></div>
                <div className="flex justify-between"><span>Mevcut Ort. Puan:</span> <span className="font-medium">{formatScore(currentAvgScore)}</span></div>
               {(personTestScore !== null || personManagerScore !== null || personPositionScore !== null) && (
                 <div className="mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500 space-y-2">
                   {personTestScore !== null && (
                     <div>
                       <div className="flex justify-between">
                         <span>Test Skoru:</span>
                         <span className="font-medium">{formatScore(personTestScore)}</span>
                       </div>
                       {testCompareLine && <div className="text-[10px] text-zinc-400">{testCompareLine}</div>}
                     </div>
                   )}
                   {personManagerScore !== null && (
                     <div>
                       <div className="flex justify-between">
                         <span>Yönetici Skoru:</span>
                         <span className="font-medium">{formatScore(personManagerScore)}</span>
                       </div>
                       {managerCompareLine && <div className="text-[10px] text-zinc-400">{managerCompareLine}</div>}
                     </div>
                   )}
                   {personPositionScore !== null && (
                     <div>
                       <div className="flex justify-between">
                         <span>Hedef Skoru:</span>
                         <span className="font-medium">{formatScore(personPositionScore)}</span>
                       </div>
                       {positionCompareLine && <div className="text-[10px] text-zinc-400">{positionCompareLine}</div>}
                     </div>
                   )}
                 </div>
               )}
                {isReady ? <div className="text-green-600 font-bold flex gap-2 mt-2"><CheckCircle className="w-5 h-5"/> UYUMLU</div> : <div className="text-yellow-600 font-bold flex gap-2 mt-2"><XCircle className="w-5 h-5"/> GELİŞİM GEREKLİ</div>}
             </div>
           </div>
        </div>

        {/* RADAR CHART */}
        <div className="lg:col-span-2 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-4 flex flex-col items-center justify-center min-h-[350px] h-full">
                <div className="w-full flex justify-between items-center px-4 mb-2">
                    <h4 className="text-sm font-semibold text-zinc-500">Yetkinlik Analizi</h4>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">Hedef: {selectedPerson.position}</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  {radarData && radarData.length > 0 ? (
                    <RadarChart 
                      key={`radar-${selectedPersonId}-${radarData.length}`}
                      cx="50%" 
                      cy="50%" 
                      outerRadius="70%" 
                      data={radarData}
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
                        formatter={(value: any, name: string) => [
                          `${formatScore(value)} / 5.0`,
                          name
                        ]}
                      />
                    </RadarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400">Veri yükleniyor...</div>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-6 flex flex-col">
                 <h4 className="font-semibold text-zinc-800 flex items-center gap-2 mb-4"><BrainCircuit className="w-5 h-5 text-violet-500" /> Analiz Raporu</h4>
                 <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {analysisReport.criticalFail.length > 0 && <div className="p-3 bg-red-50 rounded-xl text-xs text-red-700"><strong>🚨 Kritik Eksikler:</strong><ul className="list-disc pl-4 mt-1">{analysisReport.criticalFail.map((i,k) => <li key={k}>{i.name} (Hedef: {i.target})</li>)}</ul></div>}
                    {analysisReport.moderateGap.length > 0 && <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-700"><strong>⚠️ Gelişim Alanları:</strong><ul className="list-disc pl-4 mt-1">{analysisReport.moderateGap.map((i,k) => <li key={k}>{i.name} (-{Math.abs(i.gap).toFixed(1)})</li>)}</ul></div>}
                    {analysisReport.strength.length > 0 && <div className="p-3 bg-green-50 rounded-xl text-xs text-green-700"><strong>💎 Güçlü Yönler:</strong> {analysisReport.strength.map(s => s.name).join(", ")}</div>}
                    {analysisReport.criticalFail.length === 0 && analysisReport.moderateGap.length === 0 && <div className="text-center py-4 text-green-600 font-bold">Tam Uyum!</div>}
                 </div>
                 
                 {/* Yapay Zeka Tavsiyeleri Bölümü */}
                 {(() => {
                   const aiRecommendations = generateAIRecommendations(
                     analysisReport, 
                     selectedPerson.position, 
                     avgCombined, 
                     avgTarget
                   );
                   return aiRecommendations.length > 0 ? (
                     <div className="mt-4 pt-4 border-t border-zinc-200">
                       <h5 className="font-semibold text-sm text-zinc-800 flex items-center gap-2 mb-3">
                         <Sparkles className="w-4 h-4 text-violet-500" />
                         🤖 Yapay Zeka Tavsiyeleri
                       </h5>
                       <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                         {aiRecommendations.map((rec, idx) => (
                           <div key={idx} className="p-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg border border-violet-100 text-xs text-zinc-700 leading-relaxed">
                             <div className="flex items-start gap-2">
                               <Lightbulb className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                               <span>{rec}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   ) : null;
                 })()}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}