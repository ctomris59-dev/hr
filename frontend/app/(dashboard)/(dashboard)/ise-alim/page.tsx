"use client";

import { useEffect, useState, useMemo } from "react";
import { getStorageData, STORAGE_KEYS, setStorageData } from "../../utils/storage";
import { UserPlus, Link2, Wrench, Target } from "lucide-react";
import { JOB_PROFILES } from "../../data/jobData";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";

// Access control check
function checkRecruitmentAccess(userRole: string, userDept: string): boolean {
  // Only CEO, HR Director, HR Manager can access
  if (userRole === "CEO" || userRole === "IK") return true;
  if (userRole === "DIRECTOR" && ("İnsan Kaynakları" in userDept || "HR" in userDept)) return true;
  if (userRole === "MANAGER" && ("İnsan Kaynakları" in userDept || "HR" in userDept)) return true;
  return false;
}
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

interface Candidate {
  id?: string;
  name: string;
  role: string;
  email?: string;
  exp?: number;
  lie?: number;
  manipulation_score?: number;
  raw_scores?: Record<string, number>;
  avg_score?: number;
  ai_karar?: string;
  date?: string;
  status?: string;
  status_date?: string;
  type?: string;
}

// Generate candidate ID from name (for candidates without IDs)
function generateCandidateId(name: string): string {
  // Simple hash function to create a consistent ID from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

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

// Yetkinlik kodlarını isimlere çevir (Reverse mapping)
const CODE_TO_NAME: Record<string, string> = {
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

// Yetkinlik isimlerini kodlara çevir (Forward mapping)
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CODE_TO_NAME).map(([code, name]) => [name, code])
);

// getTargetProfile fonksiyonunu component dışına taşıdık ama backendJobProfiles'a erişmek için closure kullanacağız
// Bu yüzden fonksiyonu component içinde tanımlayacağız

function calculateAverageScore(candidate: Candidate): number {
  if (typeof candidate.avg_score === "number") return candidate.avg_score;
  const scores = candidate.raw_scores || {};
  if (Object.keys(scores).length === 0) return 0.0;
  const values = Object.values(scores);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getScoreBarClass(score: number): string {
  if (score < 3.0) return "bg-red-500";
  if (score < 4.0) return "bg-amber-500";
  return "bg-emerald-500";
}

function getRiskBarClass(riskScore: number): string {
  if (riskScore > 65) return "bg-red-500";
  if (riskScore > 35) return "bg-amber-500";
  return "bg-emerald-500";
}

// calculateAIRecommendation fonksiyonu component içinde tanımlanacak (getTargetProfile'a erişmek için)

function generateDemoCandidates(): Candidate[] {
  const fakeNames = [
    "Ayşe Yılmaz",
    "Mert Demir",
    "Zeynep Kaya",
    "Canan Çelik",
    "Burak Öztürk",
    "Elif Şahin",
    "Okan Yıldız",
    "Selin Aras",
  ];
  const roles = [
    "CFO (Chief Financial Officer)",
    "Yazılım Uzmanı",
    "Satış Müdürü",
    "İK Yöneticisi",
  ];
  const possibleStatuses = ["İnceleniyor", "İnceleniyor", "Mülakat", "İnceleniyor"];

  return fakeNames.map((name) => {
    const profileType = [
      "Star",
      "Average",
      "Risky",
      "Weak",
      "Mixed",
    ][Math.floor(Math.random() * 5)];

    let scoreRange: [number, number];
    let lieScore: number;
    let manipulation: number;

    if (profileType === "Star") {
      scoreRange = [4.2, 5.0];
      lieScore = 1.0 + Math.random() * 1.0;
      manipulation = Math.floor(Math.random() * 15) + 5;
    } else if (profileType === "Average") {
      scoreRange = [3.2, 4.2];
      lieScore = 2.0 + Math.random() * 1.5;
      manipulation = Math.floor(Math.random() * 20) + 20;
    } else if (profileType === "Risky") {
      scoreRange = [4.0, 4.8];
      lieScore = 4.0 + Math.random() * 1.0;
      manipulation = Math.floor(Math.random() * 35) + 45;
    } else if (profileType === "Weak") {
      scoreRange = [2.0, 3.2];
      lieScore = 1.5 + Math.random() * 1.5;
      manipulation = Math.floor(Math.random() * 20) + 10;
    } else {
      // Mixed
      scoreRange = [3.5, 4.5];
      lieScore = 3.0 + Math.random() * 1.2;
      manipulation = Math.floor(Math.random() * 20) + 30;
    }

    const rawScores: Record<string, number> = {};
    Object.values(COMPETENCIES_360).forEach((comp) => {
      rawScores[comp] = Math.round(
        (scoreRange[0] + Math.random() * (scoreRange[1] - scoreRange[0])) * 100
      ) / 100;
    });

    return {
      name,
      role: roles[Math.floor(Math.random() * roles.length)],
      email: `${name.toLowerCase().replace(" ", ".")}@email.com`,
      exp: Math.floor(Math.random() * 13) + 2,
      lie: Math.round(lieScore * 10) / 10,
      manipulation_score: manipulation,
      raw_scores: rawScores,
      date: new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0].substring(0, 5),
      type: "Aday",
      status: possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)],
    };
  });
}

export default function IseAlimPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateName, setSelectedCandidateName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showDemoTools, setShowDemoTools] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string>("http://localhost:3000");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [backendJobProfiles, setBackendJobProfiles] = useState<any>({});

  // Veri yükleme fonksiyonu
  const loadCandidates = async () => {
    setLoading(true);
    const stored = getStorageData<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    let backendCandidates: Candidate[] = [];

    try {
      const role = (currentUser as any)?.role || "CEO";
      const dept = (currentUser as any)?.dept || (currentUser as any)?.department || "";
      const response = await fetch(API_BASE_URL + "/api/candidates", {
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": encodeURIComponent(role),
          "X-User-Dept": encodeURIComponent(dept),
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result.data)) {
          backendCandidates = result.data;
          setStorageData(STORAGE_KEYS.CANDIDATES, backendCandidates);
        }
      }
    } catch (error) {
      console.warn("Aday listesi API hatası (localStorage kullanılacak):", error);
    }

    const source = backendCandidates.length > 0 ? backendCandidates : stored;
    // Sadece "Aday" tipindeki kayıtları ve raw_scores'u olanları göster
    const filtered = source.filter((c) => 
      c.type === "Aday" && c.raw_scores && Object.keys(c.raw_scores).length > 0
    );
    setCandidates(filtered);
    setLoading(false);
  };

  // Check access: Only CEO, HR Director, HR Manager
  useEffect(() => {
    const user = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setCurrentUser(user);
    
    if (user && typeof user === "object" && "role" in user) {
      const userRole = (user as any).role;
      const userDept = (user as any).dept || (user as any).department || "";
      
      // CEO has access
      if (userRole === "CEO" || userRole === "IK") {
        setHasAccess(true);
        return;
      }
      
      // HR Director or HR Manager has access
      if ((userRole === "DIRECTOR" || userRole === "MANAGER") && 
          ("İnsan Kaynakları" in userDept || "HR" in userDept || "Human Resources" in userDept)) {
        setHasAccess(true);
        return;
      }
    }
    
    // Access denied - redirect
    setHasAccess(false);
    alert("Bu sayfaya erişim yetkiniz yok. İşe Alım modülü sadece CEO, İK Direktörü ve İK Müdürü için erişilebilir.");
    window.location.href = "/dashboard";
  }, []);

  // Backend'den job profiles çek
  useEffect(() => {
    async function fetchJobProfiles() {
      try {
        const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
        if (dataCleared) {
          setBackendJobProfiles({});
          return;
        }
        
        const response = await fetch(API_BASE_URL + '/api/metadata');
        if (!response.ok) {
          console.warn("Metadata endpoint not available, using frontend job profiles only");
          setBackendJobProfiles({});
          return;
        }
        
        const result = await response.json();
        const profiles = result.data?.job_profiles || result.job_profiles || {};
        setBackendJobProfiles(profiles);
      } catch (error) {
        console.warn("Job Profiles API Hatası (frontend job profiles kullanılacak):", error);
        setBackendJobProfiles({}); // Empty object, will use frontend JOB_PROFILES
      }
    }
    fetchJobProfiles();
  }, []);

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    
    void loadCandidates();
    
    // Storage değişikliklerini dinle (yeni test sonuçları için)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CANDIDATES) {
        void loadCandidates();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Aynı tab'de değişiklikleri dinlemek için custom event
    const handleCustomStorageChange = () => {
      void loadCandidates();
    };
    
    window.addEventListener('candidatesUpdated', handleCustomStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('candidatesUpdated', handleCustomStorageChange);
    };
  }, [hasAccess, currentUser]);

  const handleStatusUpdate = (name: string, newStatus: string) => {
    const updated = candidates.map((c) =>
      c.name === name
        ? {
            ...c,
            status: newStatus,
            status_date: new Date().toISOString().split("T")[0],
          }
        : c
    );
    setCandidates(updated);
    setStorageData(STORAGE_KEYS.CANDIDATES, updated);
    alert(`✅ Durum güncellendi: ${newStatus}`);
  };

  const handleGenerateDemo = () => {
    const newCandidates = generateDemoCandidates();
    const existing = getStorageData<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const updated = [...existing, ...newCandidates];
    setCandidates(updated.filter((c) => c.type === "Aday" && c.raw_scores && Object.keys(c.raw_scores).length > 0));
    setStorageData(STORAGE_KEYS.CANDIDATES, updated);
    alert(`✅ ${newCandidates.length} aday eklendi! Tablo yenileniyor...`);
  };

  // getTargetProfile fonksiyonu - backend ve frontend job profiles'ı birleştirir
  const getTargetProfile = (roleName: string): Record<string, number> => {
    // Varsayılan hedefler (tüm yetkinlikler için 4.0)
    const targets: Record<string, number> = {};
    Object.values(COMPETENCIES_360).forEach((comp) => {
      targets[comp] = 4.0;
    });

    // Backend ve frontend job profiles'ı birleştir
    const allJobProfiles = { ...JOB_PROFILES, ...backendJobProfiles };
    
    // 1. Tam eşleşme (büyük/küçük harf duyarsız)
    let foundProfile: Record<string, number> | null = null;
    const exactMatch = Object.keys(allJobProfiles).find(
      k => k.toLowerCase().trim() === roleName.toLowerCase().trim()
    );
    if (exactMatch) {
      foundProfile = allJobProfiles[exactMatch];
    }
    
    // 2. Kısmi eşleşme (pozisyon ismi içinde geçiyor mu?)
    if (!foundProfile) {
      const partialMatch = Object.keys(allJobProfiles).find(k => {
        const kLower = k.toLowerCase().trim();
        const roleLower = roleName.toLowerCase().trim();
        return kLower.includes(roleLower) || roleLower.includes(kLower);
      });
      if (partialMatch) {
        foundProfile = allJobProfiles[partialMatch];
      }
    }
    
    // 3. Eğer profil bulunduysa, yetkinlik isimlerini targets'a ata
    if (foundProfile) {
      Object.entries(foundProfile).forEach(([name, score]) => {
        // JOB_PROFILES'daki key'ler Türkçe yetkinlik isimleri
        if (typeof score === 'number' && targets.hasOwnProperty(name)) {
          targets[name] = score;
        }
      });
    }

    // 4. Eğer hala bulunamadıysa, eski manuel kuralları kullan (fallback)
    if (!foundProfile) {
      if (roleName.includes("CFO") || roleName.includes("Finans")) {
        targets["Analitik Düşünme"] = 5.0;
        targets["Etik ve Uyum"] = 5.0;
        targets["Stratejik Bakış"] = 5.0;
      } else if (roleName.includes("Yazılım") || roleName.includes("Developer")) {
        targets["Dijital Okuryazarlık"] = 5.0;
        targets["Sürekli Öğrenme"] = 5.0;
        targets["Analitik Düşünme"] = 4.8;
      } else if (roleName.includes("Satış") || roleName.includes("Sales")) {
        targets["İletişim Becerileri"] = 5.0;
        targets["Sonuç Odaklılık"] = 5.0;
      }
    }

    return targets;
  };

  // calculateAIRecommendation fonksiyonu - getTargetProfile'a erişmek için component içinde
  const calculateAIRecommendation = (candidate: Candidate): string => {
    if (candidate.ai_karar) return candidate.ai_karar;
    const scores = candidate.raw_scores || {};
    if (Object.keys(scores).length === 0) return "CV İNCELEME";

    const avgScore = calculateAverageScore(candidate);
    if (avgScore > 4.0) return "ÖNERİ: KABUL";
    if (avgScore < 3.0) return "KRİTİK";
    return "CV İNCELEME";
  };

  const selectedCandidate = useMemo(() => {
    return candidates.find((c) => c.name === selectedCandidateName) || null;
  }, [candidates, selectedCandidateName]);

  const candidatesWithScores = useMemo(() => {
    return candidates.map((c) => ({
      ...c,
      avg_score: calculateAverageScore(c),
      ai_karar: calculateAIRecommendation(c),
    }));
  }, [candidates, backendJobProfiles]);

  // Generate test link for a specific candidate
  const getCandidateTestLink = (candidate: Candidate): string => {
    const candidateId = candidate.id || generateCandidateId(candidate.name);
    return `${baseUrl}/test-adayi/${candidateId}`;
  };

  // Gap analysis for selected candidate
  const gapAnalysis = useMemo(() => {
    if (!selectedCandidate || !selectedCandidate.raw_scores) return null;

    const targets = getTargetProfile(selectedCandidate.role);
    const scores = selectedCandidate.raw_scores;
    const gaps: Record<string, number> = {};

    Object.keys(scores).forEach((comp) => {
      gaps[comp] = scores[comp] - (targets[comp] || 4.0);
    });

    const strengths = Object.entries(gaps)
      .filter(([_, gap]) => gap >= 0.2)
      .map(([comp, gap]) => ({ comp, gap }));
    const weaknesses = Object.entries(gaps)
      .filter(([_, gap]) => gap <= -0.5)
      .map(([comp, gap]) => ({ comp, gap }));

    return { strengths, weaknesses, gaps };
  }, [selectedCandidate, backendJobProfiles]);

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="w-4 h-4 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-800">
            İşe Alım Yönetim Merkezi
          </h1>
        </div>
        <p className="text-xs text-slate-500">Aday testi sonuçları ve değerlendirme</p>
      </div>

      {/* Demo Tools */}
      <details className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          Sunum Modu / Demo Veri Araçları
        </summary>
        <div className="mt-3">
          <button
            onClick={handleGenerateDemo}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            🤖 Demo Aday Verisi Üret (AI Analizli)
          </button>
        </div>
      </details>

      {/* Domain Configuration */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
              Domain (Test Linkleri İçin)
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:3000"
            />
          </div>
          <div className="flex items-end">
            <p className="text-xs text-slate-500">
              ℹ️ Her aday için test linki tabloda "Test Linki" butonunda mevcuttur.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <Skeleton className="h-5 w-1/4" />
          <div className="mt-4">
            <SkeletonTable rows={6} cols={6} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Candidate List Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">
                Aday Listesi ve Puan Durumu
              </h2>
            </div>
            {candidates.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600">⚠️ Başvuru yok. Yukarıdan demo veri üretebilirsiniz.</p>
              </div>
            ) : (
              <>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 sticky top-0">
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase tracking-wider">Aday</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase tracking-wider">
                          Yapay Zeka Önerisi
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase tracking-wider">Genel Puan</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase tracking-wider">Pozisyon</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase tracking-wider">Risk %</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase tracking-wider">Tarih</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase tracking-wider">Test Linki</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatesWithScores.map((candidate, idx) => {
                        const avgScore = candidate.avg_score;
                        const aiRec = candidate.ai_karar;
                        const riskScore = candidate.manipulation_score || 0;
                        const scorePercent = ((avgScore / 5.0) * 100).toFixed(0);
                        const scoreBarClass = getScoreBarClass(avgScore);
                        const riskBarClass = getRiskBarClass(riskScore);

                        return (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                            onClick={() => setSelectedCandidateName(candidate.name)}
                          >
                            <td className="px-3 py-2 text-sm text-slate-800 font-medium">
                              {candidate.name}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`text-xs font-medium ${
                                  aiRec.includes("RED") || aiRec.includes("KRİTİK")
                                    ? "text-red-600"
                                    : aiRec.includes("KABUL")
                                    ? "text-green-600"
                                    : "text-yellow-600"
                                }`}
                              >
                                {aiRec}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className={`${scoreBarClass} h-1.5 rounded-full`}
                                    style={{ width: `${scorePercent}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-mono text-slate-700 w-10 text-right">
                                  {avgScore.toFixed(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-600">{candidate.role}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${riskBarClass}`}
                                    style={{ width: `${riskScore}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-mono text-slate-700 w-10 text-right">
                                  {riskScore}%
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-600 font-mono">
                              {candidate.date || "-"}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                  const testLink = getCandidateTestLink(candidate);
                                  window.open(testLink, "_blank", "noopener,noreferrer");
                                }}
                                className="px-3 py-1.5 bg-white border border-blue-500 text-blue-600 hover:bg-blue-50 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                                title="Test linkini yeni sekmede aç"
                              >
                                <Link2 className="w-3 h-3" />
                                Test Linki
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  ℹ️ Listeden detaylarını görmek istediğiniz adayı tıklayınız.
                </p>
              </>
            )}
          </div>

          {/* Detailed Profile View */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">
                Detaylı Profil İncelemesi
              </h2>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                İncelemek İçin Aday Seçiniz
              </label>
              <select
                value={selectedCandidateName}
                onChange={(e) => setSelectedCandidateName(e.target.value)}
                className="w-full md:w-64 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Aday seçin...</option>
                {candidates.map((c, idx) => (
                  <option key={`${c.name}-${c.id || idx}`} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCandidate && (
              <div className="grid md:grid-cols-3 gap-4">
                {/* Left Column - Candidate Info */}
                <div className="md:col-span-1">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">
                    {selectedCandidate.name}
                  </h3>
                  <p className="text-xs text-slate-600 mb-3">
                    Başvuru: {selectedCandidate.role}
                  </p>

                  {/* AI Recommendation Box */}
                  {(() => {
                    const aiRec = calculateAIRecommendation(selectedCandidate);
                    if (aiRec.includes("KABUL")) {
                      return (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                          <p className="text-xs text-green-800 font-medium">{aiRec}</p>
                        </div>
                      );
                    } else if (aiRec.includes("RED")) {
                      return (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                          <p className="text-xs text-red-800 font-medium">{aiRec}</p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                          <p className="text-xs text-yellow-800 font-medium">{aiRec}</p>
                        </div>
                      );
                    }
                  })()}

                  {/* Status Update */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                      Mevcut Durum
                    </label>
                    <select
                      value={selectedCandidate.status || "İnceleniyor"}
                      onChange={(e) =>
                        handleStatusUpdate(selectedCandidate.name, e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="İnceleniyor">İnceleniyor</option>
                      <option value="Mülakat">Mülakat</option>
                      <option value="Teklif">Teklif</option>
                      <option value="Red">Red</option>
                      <option value="İşe Alındı">İşe Alındı</option>
                    </select>
                  </div>
                </div>

                {/* Right Column - Gap Analysis */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-800">
                      Yetkinlik Gap Analizi (Aday vs Hedef)
                    </h3>
                  </div>

                  {selectedCandidate.raw_scores && gapAnalysis ? (
                    <>
                      {/* Radar Chart */}
                      <div className="mb-4 bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart data={(() => {
                            const targets = getTargetProfile(selectedCandidate.role);
                            return Object.entries(selectedCandidate.raw_scores).map(([comp, score]) => ({
                              subject: comp,
                              Aday: score,
                              Hedef: targets[comp] || 4.0,
                              fullMark: 5,
                            }));
                          })()}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
                            <Radar
                              name="Hedef"
                              dataKey="Hedef"
                              stroke="#94a3b8"
                              fill="#94a3b8"
                              fillOpacity={0.2}
                              strokeWidth={2}
                              strokeDasharray="5 5"
                            />
                            <Radar
                              name="Aday"
                              dataKey="Aday"
                              stroke="#4f46e5"
                              fill="#4f46e5"
                              fillOpacity={0.3}
                              strokeWidth={2}
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
                            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Strengths and Weaknesses */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 mb-2 uppercase tracking-wider">
                          Kritik Yetkinlik Açıklamaları
                        </h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {/* Strengths */}
                          <div>
                            {gapAnalysis.strengths.length > 0 ? (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs font-semibold text-green-800 mb-1.5">
                                  🌟 Güçlü Yönler (Beklenti Üstü)
                                </p>
                                <ul className="space-y-0.5 text-xs text-green-700">
                                  {gapAnalysis.strengths.map((item, idx) => (
                                    <li key={idx}>
                                      • <strong>{item.comp}:</strong> Hedefin +{item.gap.toFixed(1)}{" "}
                                      puan üzerinde.
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-800">
                                  Belirgin bir güçlü yön yok.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Weaknesses */}
                          <div>
                            {gapAnalysis.weaknesses.length > 0 ? (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs font-semibold text-red-800 mb-1.5">
                                  📉 Gelişim Alanları (Beklenti Altı)
                                </p>
                                <div className="flex flex-wrap gap-1.5 text-xs text-red-700">
                                  {gapAnalysis.weaknesses.map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 font-semibold"
                                    >
                                      <strong>{item.comp}:</strong> Hedefin {item.gap.toFixed(1)} puan gerisinde.
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-800">
                                  Tüm yetkinlikler beklentiyi karşılıyor.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-600">Grafik verisi yok.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
