"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { CANDIDATE_QUESTIONS } from "../../data/questions";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { JOB_PROFILES } from "../../data/jobData";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import { API_BASE_URL } from "@/lib/apiConfig";

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

// Get target profile for a position from JOB_PROFILES
function getTargetProfile(roleName: string): Record<string, number> {
  const targets: Record<string, number> = {};
  Object.values(COMPETENCIES_360).forEach((comp) => {
    targets[comp] = 4.0; // Default target
  });

  // Check JOB_PROFILES for exact match
  if (JOB_PROFILES[roleName]) {
    Object.assign(targets, JOB_PROFILES[roleName]);
  } else {
    // Try partial match
    for (const [profileName, profile] of Object.entries(JOB_PROFILES)) {
      if (profileName.includes(roleName) || roleName.includes(profileName)) {
        Object.assign(targets, profile);
        break;
      }
    }
  }

  return targets;
}

// Calculate average score from raw_scores
function calculateAverageScore(rawScores: Record<string, number>): number {
  if (Object.keys(rawScores).length === 0) return 0.0;
  const values = Object.values(rawScores);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Calculate AI recommendation based on position profile
function calculateAIRecommendation(rawScores: Record<string, number>): string {
  if (Object.keys(rawScores).length === 0) return "CV İNCELEME";
  const avgScore = calculateAverageScore(rawScores);
  if (avgScore > 4.0) return "ÖNERİ: KABUL";
  if (avgScore < 3.0) return "KRİTİK";
  return "CV İNCELEME";
}

const TOTAL_QUESTIONS = 130;
const EXAM_DURATION_SECONDS = 45 * 60; // 45 minutes

interface CandidateInfo {
  name: string;
  role: string;
  email: string;
  phone?: string;
}

function AdaySinaviPageContent() {
  const router = useRouter();
  
  const [testActive, setTestActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(EXAM_DURATION_SECONDS);
  const [loading, setLoading] = useState(true);

  // Load candidate info from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("candidateInfo");
    if (stored) {
      try {
        const info = JSON.parse(stored);
        if (info.name && info.role && info.email) {
          setCandidateInfo({
            name: info.name,
            role: info.role,
            email: info.email,
            phone: info.phone || "",
          });
          setLoading(false);
        } else {
          // Missing required info, redirect back
          router.push("/aday-girisi");
        }
      } catch (e) {
        console.error("Failed to parse candidate info", e);
        router.push("/aday-girisi");
      }
    } else {
      // No candidate info, redirect back
      router.push("/aday-girisi");
    }
  }, [router]);

  // Timer effect
  useEffect(() => {
    if (!testActive || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = (new Date().getTime() - startTime.getTime()) / 1000;
      const remaining = EXAM_DURATION_SECONDS - elapsed;
      setTimeRemaining(Math.max(0, Math.floor(remaining)));

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [testActive, startTime]);

  const testQuestions = useMemo(() => {
    return CANDIDATE_QUESTIONS.slice(0, Math.min(CANDIDATE_QUESTIONS.length, TOTAL_QUESTIONS));
  }, []);

  const handleStartTest = () => {
    if (!candidateInfo) {
      alert("Aday bilgileri bulunamadı. Lütfen tekrar giriş yapınız.");
      router.push("/aday-girisi");
      return;
    }
    
    setTestActive(true);
    setStartTime(new Date());
    setCurrentQIndex(0);
    setExamAnswers({});
  };

  const handlePrevious = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
    }
  };

  const handleNext = () => {
    if (!testQuestions || testQuestions.length === 0) return;
    
    const currentQ = testQuestions[currentQIndex];
    if (!currentQ) return;
    
    const answer = examAnswers[currentQ.id];
    
    if (!answer) {
      alert("⚠️ Lütfen bir seçenek işaretleyiniz.");
      return;
    }

    if (currentQIndex < testQuestions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  const handleFinish = async () => {
    if (!testQuestions || testQuestions.length === 0) {
      alert("⚠️ Sorular yüklenemedi.");
      return;
    }

    const currentQ = testQuestions[currentQIndex];
    if (!currentQ) {
      alert("⚠️ Soru bulunamadı.");
      return;
    }

    const answer = examAnswers[currentQ.id];

    if (!answer) {
      alert("⚠️ Son soruyu cevaplayınız.");
      return;
    }

    if (!candidateInfo) {
      alert("⚠️ Aday bilgisi bulunamadı.");
      return;
    }

    // Check if all questions are answered
    const allAnswered = testQuestions.every((q) => examAnswers[q.id]);
    if (!allAnswered) {
      const unanswered = testQuestions.filter((q) => !examAnswers[q.id]);
      alert(`⚠️ Lütfen tüm soruları cevaplayınız. (${unanswered.length} soru eksik)`);
      return;
    }

    // Calculate final scores
    const finalAnswers: Record<string, { score: number; cat: string }> = {};
    
    testQuestions.forEach((q) => {
      let score = examAnswers[q.id] || 3;
      // Reverse scoring for R type questions
      if (q.type === "R") {
        score = 6 - score;
      }
      finalAnswers[`q_${q.id}`] = { score, cat: q.category };
    });

    // Calculate raw scores per competency
    const rawScores: Record<string, number> = {};
    const lieScores: number[] = [];

    Object.keys(COMPETENCIES_360).forEach((code) => {
      const catQuestions = testQuestions.filter((q) => q.category === code);
      const catAnswers = catQuestions
        .map((q) => {
          let score = examAnswers[q.id] || 3;
          if (q.type === "R") score = 6 - score;
          return score;
        })
        .filter((s) => s > 0);

      if (catAnswers.length > 0) {
        const avg = catAnswers.reduce((sum, s) => sum + s, 0) / catAnswers.length;
        rawScores[COMPETENCIES_360[code]] = Math.round(avg * 100) / 100;
      }
    });

    // Calculate lie score from LIE category questions
    const lieQuestions = testQuestions.filter((q) => q.category === "LIE");
    lieQuestions.forEach((q) => {
      const answer = examAnswers[q.id] || 1;
      lieScores.push(answer);
    });
    const lieScore = lieScores.length > 0
      ? Math.round((lieScores.reduce((sum, s) => sum + s, 0) / lieScores.length) * 10) / 10
      : 2.0;
    const manipulationScore = Math.min(100, Math.max(0, Math.floor((lieScore - 1) * 25)));

    // Calculate AI recommendation based on position profile
    const aiRecommendation = calculateAIRecommendation(rawScores);

    // Calculate average score for display
    const avgScore = calculateAverageScore(rawScores);

    // Prepare final record
    const finalRecord: any = {
      type: "Aday",
      name: candidateInfo.name,
      role: candidateInfo.role,
      email: candidateInfo.email,
      phone: candidateInfo.phone || "",
      raw_scores: rawScores,
      lie: lieScore,
      manipulation_score: manipulationScore,
      date: new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0].substring(0, 5),
      status: "İnceleniyor",
      // Add evaluation results
      avg_score: avgScore,
      ai_karar: aiRecommendation,
    };

    // Save to backend API (for recruitment page)
    try {
      const response = await fetch(API_BASE_URL + "/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalRecord),
      });

      if (!response.ok) {
        throw new Error("Backend save failed");
      }
    } catch (error) {
      console.error("Backend save error:", error);
      // Still continue - we'll save to localStorage as backup
    }

    // Also save to localStorage (for frontend recruitment page)
    try {
      // Use the same storage key as the recruitment page expects
      const existingCandidates = getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []);
      existingCandidates.push(finalRecord);
      setStorageData(STORAGE_KEYS.CANDIDATES, existingCandidates);
      
      // Dispatch event to notify recruitment page
      window.dispatchEvent(new CustomEvent('candidatesUpdated'));
      
      // Also trigger storage event for cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.CANDIDATES,
        newValue: JSON.stringify(existingCandidates),
      }));
    } catch (error) {
      console.error("LocalStorage save error:", error);
    }

    // Reset state
    setTestActive(false);
    setExamAnswers({});
    setCurrentQIndex(0);
    setStartTime(null);

    // Clear sessionStorage
    sessionStorage.removeItem("candidateInfo");

    alert("✅ Sınavınız başarıyla kaydedildi. İK ekibimiz sonuçlarınızı değerlendirecek ve sizinle iletişime geçecektir. Teşekkürler!");
    
    // Redirect to home
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mx-auto mb-4 w-12">
            <Skeleton className="h-10 w-10 mx-auto rounded-full" />
          </div>
          <p className="text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!candidateInfo) {
    return null; // Will redirect
  }

  // If time is up
  if (testActive && timeRemaining <= 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-red-600 mb-3">SÜRE DOLDU!</h1>
            <p className="text-sm text-slate-600 mb-4">
              Sınav süreniz dolmuştur. Lütfen formu gönderiniz.
            </p>
            <button
              onClick={handleFinish}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Sonuçları Gönder
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test active screen
  if (testActive) {
    if (!testQuestions || testQuestions.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <SkeletonTable rows={5} cols={4} />
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentQIndex];
    if (!currentQ) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <p className="text-red-600">Soru bulunamadı</p>
        </div>
      );
    }
    const savedAnswer = examAnswers[currentQ.id];
    const progress = ((currentQIndex + 1) / testQuestions.length) * 100;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        {/* Header Branding */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-slate-800 mb-1">FutureHR Assessment Center</h1>
          <p className="text-sm text-slate-600">Yetkinlik Değerlendirme Testi</p>
        </div>

        {/* Timer - Fixed position */}
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="text-lg font-bold">
              ⏱️ {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 mt-16">
          {/* Header */}
          <div className="mb-4 pb-3 border-b border-slate-200">
            <p className="text-xs text-slate-600">
              <strong>Aday:</strong> {candidateInfo.name} | <strong>Pozisyon:</strong> {candidateInfo.role}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-600 mb-1.5">
              <span>Soru {currentQIndex + 1} / {testQuestions.length}</span>
              <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-6 p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-600">
                Soru {currentQ.id} - {currentQ.category}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-slate-800 mb-4">{currentQ.text}</h2>

            {/* Likert Scale */}
            <div className="space-y-3">
              {[
                { value: 1, label: "Kesinlikle Katılmıyorum" },
                { value: 2, label: "Katılmıyorum" },
                { value: 3, label: "Kararsızım" },
                { value: 4, label: "Katılıyorum" },
                { value: 5, label: "Kesinlikle Katılıyorum" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center w-full p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    savedAnswer === option.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question_${currentQ.id}`}
                    value={option.value}
                    checked={savedAnswer === option.value}
                    onChange={(e) => {
                      setExamAnswers({ ...examAnswers, [currentQ.id]: Number(e.target.value) });
                    }}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {option.value}. {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentQIndex === 0}
              className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                currentQIndex === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-slate-600 hover:bg-slate-700 text-white"
              }`}
            >
              Önceki
            </button>
            {currentQIndex < testQuestions.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                Sonraki
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors"
              >
                SINAVI BİTİR
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Initial welcome screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Hoş Geldiniz, {candidateInfo.name}!
          </h1>
          <p className="text-slate-600 mb-4">
            Pozisyon: <strong>{candidateInfo.role}</strong>
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            Test Hakkında
          </h3>
          <ul className="space-y-2 text-slate-700 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Bu test <strong>{TOTAL_QUESTIONS} soru</strong> içermektedir.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Süre: <strong>45 dakika</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Her soru için <strong>1-5 arası</strong> bir değer seçmeniz gerekmektedir.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Testi tamamlamak için <strong>tüm soruları</strong> cevaplamanız gerekmektedir.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>DİKKAT:</strong> Başladıktan sonra durdurulamaz. Süre dolduğunda otomatik olarak sonuçlar gönderilir.
              </span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleStartTest}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          Teste Başla
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function AdaySinaviPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <SkeletonTable rows={5} cols={4} />
        </div>
      </div>
    }>
      <AdaySinaviPageContent />
    </Suspense>
  );
}

