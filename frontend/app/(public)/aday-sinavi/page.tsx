"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { CANDIDATE_QUESTIONS, COMPETENCY_LABELS } from "../../data/questions";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import { API_BASE_URL } from "@/lib/apiConfig";
import { resolveTargetProfile } from "@/lib/hr/careerArchitecture";

const COMPETENCIES_360: Record<string, string> = COMPETENCY_LABELS;

// Resolve the evidence-based FHR-COMP-JOB-2.0 target profile.
function getTargetProfile(roleName: string): Record<string, number> {
  return resolveTargetProfile(roleName).profile;
}

function calculateAverageScore(rawScores: Record<string, number>): number {
  if (Object.keys(rawScores).length === 0) return 0.0;
  const values = Object.values(rawScores);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateAIRecommendation(rawScores: Record<string, number>): string {
  if (Object.keys(rawScores).length === 0) return "CV İNCELEME";
  const avgScore = calculateAverageScore(rawScores);
  if (avgScore > 4.0) return "ÖNERİ: KABUL";
  if (avgScore < 3.0) return "KRİTİK";
  return "CV İNCELEME";
}

const TOTAL_QUESTIONS = 130;
const EXAM_DURATION_SECONDS = 45 * 60;

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

  useEffect(() => {
    const stored = sessionStorage.getItem("candidateInfo");
    if (stored) {
      try {
        const info = JSON.parse(stored);
        if (info.name && info.role && info.email) {
          setCandidateInfo({ name: info.name, role: info.role, email: info.email, phone: info.phone || "" });
          setLoading(false);
        } else router.push("/aday-girisi");
      } catch (e) {
        console.error("Failed to parse candidate info", e);
        router.push("/aday-girisi");
      }
    } else router.push("/aday-girisi");
  }, [router]);

  useEffect(() => {
    if (!testActive || !startTime) return;
    const interval = setInterval(() => {
      const elapsed = (new Date().getTime() - startTime.getTime()) / 1000;
      const remaining = EXAM_DURATION_SECONDS - elapsed;
      setTimeRemaining(Math.max(0, Math.floor(remaining)));
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [testActive, startTime]);

  const testQuestions = useMemo(() => CANDIDATE_QUESTIONS.slice(0, Math.min(CANDIDATE_QUESTIONS.length, TOTAL_QUESTIONS)), []);

  const handleStartTest = () => {
    if (!candidateInfo) { alert("Aday bilgileri bulunamadı. Lütfen tekrar giriş yapınız."); router.push("/aday-girisi"); return; }
    setTestActive(true); setStartTime(new Date()); setCurrentQIndex(0); setExamAnswers({});
  };

  const handlePrevious = () => { if (currentQIndex > 0) setCurrentQIndex(currentQIndex - 1); };
  const handleNext = () => {
    if (!testQuestions.length) return;
    const currentQ = testQuestions[currentQIndex]; if (!currentQ) return;
    if (!examAnswers[currentQ.id]) { alert("⚠️ Lütfen bir seçenek işaretleyiniz."); return; }
    if (currentQIndex < testQuestions.length - 1) setCurrentQIndex(currentQIndex + 1);
  };

  const handleFinish = async () => {
    if (!testQuestions.length) { alert("⚠️ Sorular yüklenemedi."); return; }
    const currentQ = testQuestions[currentQIndex]; if (!currentQ) { alert("⚠️ Soru bulunamadı."); return; }
    if (!examAnswers[currentQ.id]) { alert("⚠️ Son soruyu cevaplayınız."); return; }
    if (!candidateInfo) { alert("⚠️ Aday bilgisi bulunamadı."); return; }
    const allAnswered = testQuestions.every((q) => examAnswers[q.id]);
    if (!allAnswered) { const unanswered = testQuestions.filter((q) => !examAnswers[q.id]); alert(`⚠️ Lütfen tüm soruları cevaplayınız. (${unanswered.length} soru eksik)`); return; }

    const finalAnswers: Record<string, { score: number; cat: string }> = {};
    testQuestions.forEach((q) => { let score = examAnswers[q.id] || 3; if (q.type === "R") score = 6 - score; finalAnswers[`q_${q.id}`] = { score, cat: q.category }; });

    const rawScores: Record<string, number> = {};
    const lieScores: number[] = [];
    Object.keys(COMPETENCIES_360).forEach((code) => {
      const catQuestions = testQuestions.filter((q) => q.category === code);
      const catAnswers = catQuestions.map((q) => { let score = examAnswers[q.id] || 3; if (q.type === "R") score = 6 - score; return score; }).filter((s) => s > 0);
      if (catAnswers.length) rawScores[COMPETENCIES_360[code]] = Math.round((catAnswers.reduce((sum, s) => sum + s, 0) / catAnswers.length) * 100) / 100;
    });

    const lieQuestions = testQuestions.filter((q) => q.category === "LIE");
    lieQuestions.forEach((q) => lieScores.push(examAnswers[q.id] || 1));
    const lieScore = lieScores.length ? Math.round((lieScores.reduce((sum, s) => sum + s, 0) / lieScores.length) * 10) / 10 : 2.0;
    const manipulationScore = Math.min(100, Math.max(0, Math.floor((lieScore - 1) * 25)));
    const aiRecommendation = calculateAIRecommendation(rawScores);
    const avgScore = calculateAverageScore(rawScores);
    const targetProfile = getTargetProfile(candidateInfo.role);

    const finalRecord: any = {
      type: "Aday", name: candidateInfo.name, role: candidateInfo.role, email: candidateInfo.email, phone: candidateInfo.phone || "",
      raw_scores: rawScores, target_profile: targetProfile, competency_model_version: "FHR-COMP-JOB-2.0",
      lie: lieScore, manipulation_score: manipulationScore,
      date: new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0].substring(0, 5),
      status: "İnceleniyor", avg_score: avgScore, ai_karar: aiRecommendation,
    };

    try {
      const response = await fetch(API_BASE_URL + "/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(finalRecord) });
      if (!response.ok) throw new Error("Backend save failed");
    } catch (error) { console.error("Backend save error:", error); }

    try {
      const existingCandidates = getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []);
      existingCandidates.push(finalRecord); setStorageData(STORAGE_KEYS.CANDIDATES, existingCandidates);
      window.dispatchEvent(new CustomEvent("candidatesUpdated"));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.CANDIDATES, newValue: JSON.stringify(existingCandidates) }));
    } catch (error) { console.error("LocalStorage save error:", error); }

    setTestActive(false); setExamAnswers({}); setCurrentQIndex(0); setStartTime(null); sessionStorage.removeItem("candidateInfo");
    alert("✅ Sınavınız başarıyla kaydedildi. İK ekibimiz sonuçlarınızı değerlendirecek ve sizinle iletişime geçecektir. Teşekkürler!");
    router.push("/");
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center"><div className="bg-white rounded-2xl shadow-lg p-8 text-center"><div className="mx-auto mb-4 w-12"><Skeleton className="h-10 w-10 mx-auto rounded-full" /></div><p className="text-slate-600">Yükleniyor...</p></div></div>;
  if (!candidateInfo) return null;

  if (testActive && timeRemaining <= 0) return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4"><div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8"><div className="text-center"><AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3"/><h1 className="text-xl font-semibold text-red-600 mb-3">SÜRE DOLDU!</h1><p className="text-sm text-slate-600 mb-4">Sınav süreniz dolmuştur. Lütfen formu gönderiniz.</p><button onClick={handleFinish} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Sonuçları Gönder</button></div></div></div>;

  if (testActive) {
    if (!testQuestions.length) return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center"><div className="bg-white rounded-2xl p-6 shadow-sm"><SkeletonTable rows={5} cols={4} /></div></div>;
    const currentQ = testQuestions[currentQIndex]; if (!currentQ) return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center"><p className="text-red-600">Soru bulunamadı</p></div>;
    const savedAnswer = examAnswers[currentQ.id]; const progress = ((currentQIndex + 1) / testQuestions.length) * 100; const minutes = Math.floor(timeRemaining / 60); const seconds = timeRemaining % 60;
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4"><div className="text-center mb-4"><h1 className="text-xl font-bold text-slate-800 mb-1">FutureHR Assessment Center</h1><p className="text-sm text-slate-600">Yetkinlik Değerlendirme Testi</p></div><div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50"><div className="flex items-center gap-2"><Clock className="w-5 h-5"/><span className="text-lg font-bold">⏱️ {String(minutes).padStart(2,"0")}:{String(seconds).padStart(2,"0")}</span></div></div><div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 mt-16"><div className="mb-4 pb-3 border-b border-slate-200"><p className="text-xs text-slate-600"><strong>Aday:</strong> {candidateInfo.name} | <strong>Pozisyon:</strong> {candidateInfo.role}</p></div><div className="mb-4"><div className="flex justify-between text-xs text-slate-600 mb-1.5"><span>Soru {currentQIndex+1} / {testQuestions.length}</span><span className="font-mono">{Math.round(progress)}%</span></div><div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{width:`${progress}%`}}/></div></div><div className="mb-6 p-4 border border-slate-200 rounded-lg"><div className="flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-blue-600"/><span className="text-xs font-medium text-slate-600">Soru {currentQ.id} - {COMPETENCIES_360[currentQ.category] || "Yanıt Kalitesi"}</span></div><p className="text-base text-slate-800 leading-relaxed">{currentQ.text}</p></div><div className="space-y-2 mb-6">{[1,2,3,4,5].map((value)=><button key={value} onClick={()=>setExamAnswers({...examAnswers,[currentQ.id]:value})} className={`w-full p-3 text-left border-2 rounded-lg transition-all ${savedAnswer===value?"border-blue-600 bg-blue-50":"border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"}`}><div className="flex items-center gap-3"><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${savedAnswer===value?"border-blue-600 bg-blue-600":"border-slate-300"}`}>{savedAnswer===value&&<CheckCircle className="w-3 h-3 text-white"/>}</div><span className="text-sm text-slate-700">{value===1?"Kesinlikle Katılmıyorum":value===2?"Katılmıyorum":value===3?"Kararsızım":value===4?"Katılıyorum":"Kesinlikle Katılıyorum"}</span></div></button>)}</div><div className="flex justify-between"><button onClick={handlePrevious} disabled={currentQIndex===0} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50">Önceki</button>{currentQIndex===testQuestions.length-1?<button onClick={handleFinish} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">Sınavı Bitir<CheckCircle className="w-4 h-4"/></button>:<button onClick={handleNext} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">Sonraki<ArrowRight className="w-4 h-4"/></button>}</div></div></div>;
  }

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4"><div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8"><div className="text-center mb-6"><h1 className="text-2xl font-bold text-slate-800 mb-2">FutureHR Assessment Center</h1><p className="text-sm text-slate-600">Yetkinlik Değerlendirme Testi · FHR-COMP-1.2</p></div><div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-sm text-blue-900"><strong>Aday:</strong> {candidateInfo.name}</p><p className="text-sm text-blue-900 mt-1"><strong>Pozisyon:</strong> {candidateInfo.role}</p></div><div className="space-y-3 mb-6 text-sm text-slate-600"><p>• Test 130 sorudan oluşmaktadır.</p><p>• Tahmini süre 45 dakikadır.</p><p>• Cevaplarınız FutureHR’ın 10 kanonik yetkinliği üzerinden değerlendirilir.</p><p>• Sonuçlar tek başına işe alım kararı değildir; İK değerlendirmesine karar desteği sağlar.</p></div><button onClick={handleStartTest} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Sınava Başla</button></div></div>;
}

export default function AdaySinaviPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Skeleton className="h-10 w-40"/></div>}><AdaySinaviPageContent/></Suspense>;
}
