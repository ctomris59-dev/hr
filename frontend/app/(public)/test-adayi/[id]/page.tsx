"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  FileText,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Skeleton, { SkeletonTable } from "../../../../components/ui/Skeleton";
import { API_BASE_URL } from "@/lib/apiConfig";

const LIKERT_OPTIONS = [
  { value: 1, label: "Kesinlikle Katılmıyorum" },
  { value: 2, label: "Katılmıyorum" },
  { value: 3, label: "Kararsızım" },
  { value: 4, label: "Katılıyorum" },
  { value: 5, label: "Kesinlikle Katılıyorum" },
];

type Step = "loading" | "error" | "welcome" | "test" | "submitting" | "success";

interface Question {
  id: string;
  text: string;
}

interface Candidate {
  id: string;
  name: string;
  email?: string;
  position?: string;
  status?: string;
}

export default function CandidateTestPage() {
  const params = useParams();
  const candidateId = params.id as string;

  const [step, setStep] = useState<Step>("loading");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Fetch candidate data and questions from API
  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/recruitment/candidate/${candidateId}`
        );
        
        if (!response.ok) {
          if (response.status === 404) {
            setStep("error");
            setErrorMessage("Aday bulunamadı. Link geçersiz olabilir.");
            return;
          }
          throw new Error("API hatası");
        }

        const result = await response.json();
        const data = result.data || result;

        // Extract candidate info
        const candidateData: Candidate = {
          id: data.id || data._id || candidateId,
          name: data.name || data.ad_soyad || "Aday",
          email: data.email || data.e_posta,
          position: data.position || data.pozisyon,
          status: data.status || data.durum || "",
        };

        // Check status
        const status = candidateData.status || "";
        if (status !== "Test Bekliyor" && status !== "test_bekliyor") {
          setStep("error");
          setErrorMessage(
            "Bu test zaten tamamlanmış veya link geçersiz. Lütfen İK departmanı ile iletişime geçin."
          );
          return;
        }

        // Extract questions from data.test_questions
        const testQuestions = data.test_questions || [];
        if (!testQuestions || testQuestions.length === 0) {
          setStep("error");
          setErrorMessage("Test soruları bulunamadı. Lütfen İK departmanı ile iletişime geçin.");
          return;
        }

        // Map questions to expected format
        const formattedQuestions: Question[] = testQuestions.map((q: any) => ({
          id: q.id || q.question_id || "",
          text: q.text || q.question || "",
        }));

        setCandidate(candidateData);
        setQuestions(formattedQuestions);
        setStep("welcome");
      } catch (error) {
        console.error("Fetch error:", error);
        setStep("error");
        setErrorMessage(
          "Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin."
        );
      }
    };

    if (candidateId) {
      fetchCandidateData();
    }
  }, [candidateId]);

  const handleStartTest = () => {
    setStep("test");
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleNext = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ || !answers[currentQ.id]) {
      alert("Lütfen bir seçenek işaretleyiniz.");
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const allAnswered = questions.every((q) => answers[q.id]);
    if (!allAnswered) {
      alert("Lütfen tüm soruları cevaplayınız.");
      return;
    }

    setSubmitting(true);
    setStep("submitting");

    try {
      const response = await fetch(
        API_BASE_URL + "/api/recruitment/submit-test",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate_id: candidateId,
            answers: answers,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gönderim hatası");
      }

      // Success
      setStep("success");
    } catch (error) {
      console.error("Submission error:", error);
      setStep("error");
      setErrorMessage(
        "Test gönderilirken bir hata oluştu. Lütfen tekrar deneyin veya İK departmanı ile iletişime geçin."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const progress = questions.length > 0 
    ? ((currentQuestionIndex + 1) / questions.length) * 100 
    : 0;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">FutureHR Assessment Center</h1>
          <p className="text-sm text-slate-600">Yetkinlik Değerlendirme Testi</p>
        </div>

        <AnimatePresence mode="wait">
          {/* Loading State */}
          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <div className="mx-auto mb-4 w-12">
                <Skeleton className="h-10 w-10 mx-auto rounded-full" />
              </div>
              <p className="text-slate-600">Yükleniyor...</p>
            </motion.div>
          )}

          {/* Error State */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Bağlantı Hatası
                </h2>
                <p className="text-slate-600 mb-6">{errorMessage}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tekrar Dene
                </button>
              </div>
            </motion.div>
          )}

          {/* Welcome Screen */}
          {step === "welcome" && candidate && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  Hoş Geldiniz, {candidate.name}!
                </h1>
                {candidate.position && (
                  <p className="text-slate-600 mb-4">
                    Pozisyon: <strong>{candidate.position}</strong>
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                  Test Hakkında
                </h3>
                <ul className="space-y-2 text-slate-700 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Bu test <strong>{questions.length} soru</strong> içermektedir.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Her soru için <strong>1-5 arası</strong> bir değer
                      seçmeniz gerekmektedir.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Sorular <strong>yetkinlik bazlı</strong> değerlendirme yapmaktadır.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Testi tamamlamak için <strong>tüm soruları</strong> cevaplamanız
                      gerekmektedir.
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
            </motion.div>
          )}

          {/* Test Screen */}
          {step === "test" && currentQuestion && (
            <motion.div
              key="test"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>
                    Soru {currentQuestionIndex + 1} / {questions.length}
                  </span>
                  <span className="font-mono">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Question */}
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-slate-500">
                    Soru {currentQuestionIndex + 1}
                  </span>
                </div>
                <h2 className="text-2xl font-semibold text-slate-800 mb-6">
                  {currentQuestion.text}
                </h2>

                {/* Likert Scale */}
                <div className="space-y-3">
                  {LIKERT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        currentAnswer === option.value
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question_${currentQuestion.id}`}
                        value={option.value}
                        checked={currentAnswer === option.value}
                        onChange={() =>
                          handleAnswerChange(currentQuestion.id, option.value)
                        }
                        className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 mr-4"
                      />
                      <span className="text-base font-medium text-slate-800">
                        {option.value}. {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </motion.div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    currentQuestionIndex === 0
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-slate-600 hover:bg-slate-700 text-white"
                  }`}
                >
                  Önceki
                </button>
                <button
                  onClick={handleNext}
                  disabled={!currentAnswer}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    !currentAnswer
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : currentQuestionIndex === questions.length - 1
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {currentQuestionIndex === questions.length - 1
                    ? "Testi Tamamla"
                    : "Sonraki"}
                  {currentQuestionIndex === questions.length - 1 && (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Submitting State */}
          {step === "submitting" && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <div className="mx-auto mb-4 w-12">
                <Skeleton className="h-10 w-10 mx-auto rounded-full" />
              </div>
              <p className="text-slate-600 text-lg">
                Testiniz gönderiliyor...
              </p>
            </motion.div>
          )}

          {/* Success State */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-green-600" />
              </motion.div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">
                Teşekkürler!
              </h2>
              <p className="text-lg text-slate-600 mb-2">
                Testiniz başarıyla tamamlandı.
              </p>
              <p className="text-slate-600 mb-8">
                İK ekibimiz sonuçları değerlendirecek ve en kısa sürede sizinle
                iletişime geçecektir.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Not:</strong> Test sonuçlarınız sistemimize kaydedilmiştir.
                  Herhangi bir sorunuz olursa lütfen İK departmanı ile iletişime
                  geçin.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

