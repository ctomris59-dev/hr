"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileText, CheckCircle, Clock, AlertTriangle, ClipboardCheck } from "lucide-react";
import { CANDIDATE_QUESTIONS } from "../../data/questions";
import { getStorageData, STORAGE_KEYS, setStorageData } from "../../utils/storage";
import { POSITIONS } from "../../data/jobData";
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

const TOTAL_QUESTIONS = 130;
const EXAM_DURATION_SECONDS = 45 * 60; // 45 minutes

interface UserInfo {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  mode: "employee" | "candidate";
}

function AdayTestiPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") === "candidate" ? "candidate" : "employee";
  
  const [testActive, setTestActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [orgData, setOrgData] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(EXAM_DURATION_SECONDS);
  
  // Candidate form state (only for candidate mode)
  const [candidateName, setCandidateName] = useState("");
  const [candidateRole, setCandidateRole] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  
  // Load candidate info from sessionStorage if in candidate mode
  useEffect(() => {
    if (mode === "candidate") {
      const stored = sessionStorage.getItem("candidateInfo");
      if (stored) {
        try {
          const info = JSON.parse(stored);
          setCandidateName(info.name || "");
          setCandidateRole(info.role || "");
          setCandidateEmail(info.email || "");
          setCandidatePhone(info.phone || "");
        } catch (e) {
          console.error("Failed to parse candidate info", e);
        }
      }
    }
  }, [mode]);

  useEffect(() => {
    const storedOrg = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    setOrgData(storedOrg);
  }, []);

  // Get selected person's role
  const selectedPersonRole = useMemo(() => {
    if (!selectedPerson || !orgData.length) return "";
    const person = orgData.find((p) => p["Ad Soyad"] === selectedPerson);
    return person?.Pozisyon || "";
  }, [selectedPerson, orgData]);

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

  // Security lock: prevent test from continuing without user info
  useEffect(() => {
    if (testActive && !userInfo) {
      setTestActive(false);
    }
  }, [testActive, userInfo]);

  const testQuestions = useMemo(() => {
    return CANDIDATE_QUESTIONS.slice(0, Math.min(CANDIDATE_QUESTIONS.length, TOTAL_QUESTIONS));
  }, []);

  // Get available staff (must be called before any early returns)
  const availableStaff = useMemo(() => {
    if (!orgData.length) return [];
    // Remove duplicates by using Set, then convert back to array and sort
    const uniqueNames = Array.from(
      new Set(
        orgData
          .map((p) => p["Ad Soyad"])
          .filter((name): name is string => Boolean(name))
      )
    );
    return uniqueNames.sort();
  }, [orgData]);

  const handleStartTest = () => {
    if (mode === "employee") {
      if (!selectedPerson || !selectedPersonRole) {
        alert("Lütfen personel seçiniz.");
        return;
      }

      setUserInfo({
        name: selectedPerson,
        role: selectedPersonRole,
        mode: "employee",
      });
    } else {
      // Candidate mode
      if (!candidateName || !candidateRole || !candidateEmail) {
        alert("Lütfen tüm alanları doldurunuz.");
        return;
      }

      setUserInfo({
        name: candidateName,
        role: candidateRole,
        email: candidateEmail,
        phone: candidatePhone,
        mode: "candidate",
      });
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

  const handleFinish = () => {
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

    if (!userInfo) {
      alert("⚠️ Kullanıcı bilgisi bulunamadı.");
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

    // Prepare final record
    const finalRecord: any = {
      type: userInfo.mode === "candidate" ? "Aday" : "Mevcut Çalışan",
      name: userInfo.name,
      role: userInfo.role,
      raw_scores: rawScores,
      lie: lieScore,
      manipulation_score: manipulationScore,
      date: new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0].substring(0, 5),
    };
    
    // Add email and phone for candidates
    if (userInfo.mode === "candidate") {
      finalRecord.email = userInfo.email;
      finalRecord.phone = userInfo.phone;
    }

    // Save to storage
    const existingCandidates = getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []);
    existingCandidates.push(finalRecord);
    setStorageData(STORAGE_KEYS.CANDIDATES, existingCandidates);

    // İşe Alım sayfasını güncellemek için event dispatch et
    window.dispatchEvent(new CustomEvent('candidatesUpdated'));

    // Try to save to backend
    fetch(API_BASE_URL + "/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalRecord),
    }).catch(() => {
      console.log("Backend save failed, using local storage only");
    });

    // Reset state
    setTestActive(false);
    setUserInfo(null);
    setExamAnswers({});
    setCurrentQIndex(0);
    setStartTime(null);

    alert("✅ Sınavınız başarıyla kaydedildi. Teşekkürler!");
    
    // Clear sessionStorage for candidate mode
    if (userInfo.mode === "candidate") {
      sessionStorage.removeItem("candidateInfo");
    }
    
    // Redirect based on mode
    if (userInfo.mode === "candidate") {
      router.push("/");
    } else {
      router.push("/");
    }
  };

  // If time is up
  if (testActive && timeRemaining <= 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-red-600 mb-3">SÜRE DOLDU!</h1>
            <p className="text-sm text-slate-600 mb-4">
              Sınav süreniz dolmuştur. Lütfen formu gönderiniz.
            </p>
            <button
              onClick={handleFinish}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Sonuçları Gönder
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test active screen
  if (testActive && userInfo) {
    if (!testQuestions || testQuestions.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <SkeletonTable rows={5} cols={4} />
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentQIndex];
    if (!currentQ) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-red-600">Soru bulunamadı</p>
        </div>
      );
    }
    const savedAnswer = examAnswers[currentQ.id];
    const progress = ((currentQIndex + 1) / testQuestions.length) * 100;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
      <div className="min-h-screen bg-slate-50 p-4">
        {/* Timer - Fixed position */}
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="text-lg font-bold">
              ⏱️ {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm p-6 mt-16">
          {/* Header */}
          <div className="mb-4 pb-3 border-b border-slate-200">
            <p className="text-xs text-slate-600">
              <strong>Aday:</strong> {userInfo.name} | <strong>Pozisyon:</strong> {userInfo.role}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-600 mb-1.5">
              <span>Soru {currentQIndex + 1} / {testQuestions.length}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-slate-500">%{Math.round(progress)} Tamamlandı</div>
          </div>

          {/* Question */}
          <div className="mb-6 p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-600">
                Soru {currentQIndex + 1}
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
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300"
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

  // Employee mode: Check if org data is empty
  if (mode === "employee" && orgData.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-slate-800 mb-2">
              Personel Yetkinlik Envanteri
            </h1>
            <p className="text-sm text-slate-600">
              Çalışan listesi boş. Lütfen önce organizasyon şemasına personel ekleyiniz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Candidate mode form
  if (mode === "candidate") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="text-center mb-6">
            <ClipboardCheck className="w-14 h-14 text-blue-600 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-slate-800 mb-1">
              İşe Alım Yetkinlik Testi
            </h1>
            <p className="text-xs text-slate-500">Hoşgeldiniz. Lütfen bilgilerinizi giriniz ve teste başlayınız.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                Ad Soyad
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Adınız ve soyadınız"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                Başvurulan Pozisyon
              </label>
              <select
                value={candidateRole}
                onChange={(e) => setCandidateRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pozisyon seçin...</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                E-Posta Adresi
              </label>
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ornek@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                Telefon Numarası
              </label>
              <input
                type="tel"
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="05XX XXX XX XX"
              />
            </div>
          </div>

          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              <strong>DİKKAT:</strong> Sınav 130 sorudan oluşmaktadır. Başladıktan sonra durdurulamaz. Süre: 45 dakika.
            </p>
          </div>

          <button
            onClick={handleStartTest}
            disabled={!candidateName || !candidateRole || !candidateEmail}
            className={`mt-4 w-full py-3 px-4 rounded text-lg font-semibold transition-colors ${
              !candidateName || !candidateRole || !candidateEmail
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            Bilgileri Onayla ve Başlat
          </button>
        </div>
      </div>
    );
  }

  // Employee mode form
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="text-center mb-6">
          <ClipboardCheck className="w-14 h-14 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-slate-800 mb-1">
            Personel Yetkinlik Envanteri
          </h1>
          <p className="text-xs text-slate-500">Hoşgeldiniz. Lütfen isminizi seçip teste başlayınız.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
              Adınız Soyadınız
            </label>
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Personel seçin...</option>
              {availableStaff.map((name, index) => (
                <option key={`${name}-${index}`} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
              Pozisyonunuz
            </label>
            <input
              type="text"
              value={selectedPersonRole}
              disabled
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-slate-50 text-slate-600"
            />
          </div>
        </div>

        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            <strong>DİKKAT:</strong> Sınav 130 sorudan oluşmaktadır. Başladıktan sonra durdurulamaz. Süre: 45 dakika.
          </p>
        </div>

        <button
          onClick={handleStartTest}
          disabled={!selectedPerson || !selectedPersonRole}
          className={`mt-4 w-full py-3 px-4 rounded text-lg font-semibold transition-colors ${
            !selectedPerson || !selectedPersonRole
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Bilgileri Onayla ve Başlat
        </button>
      </div>
    </div>
  );
}

export default function AdayTestiPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <SkeletonTable rows={5} cols={4} />
        </div>
      </div>
    }>
      <AdayTestiPageContent />
    </Suspense>
  );
}
