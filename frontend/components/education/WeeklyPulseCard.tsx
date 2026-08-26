"use client";

import { useState, useEffect } from "react";
import { checkPulseStatus, submitPulseAnswer, type PulseSubmitRequest } from "../../app/services/surveyService";
import { getStorageData, STORAGE_KEYS } from "../../app/utils/storage";
import { Heart, Sparkles } from "lucide-react";

interface WeeklyPulseCardProps {
  userName: string;
  departmentId?: string;
}

export default function WeeklyPulseCard({ userName, departmentId }: WeeklyPulseCardProps) {
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Haftanın gününü kontrol et (Cuma, Cumartesi, Pazar)
  const shouldShowCard = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Pazar, 5 = Cuma, 6 = Cumartesi
    return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Cuma, Cumartesi, Pazar
  };

  // Hafta başlangıcını hesapla (Pazartesi)
  const getWeekStart = (date?: Date): string => {
    const d = date || new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Pazartesi'ye git
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  };

  useEffect(() => {
    const checkStatus = async () => {
      if (!shouldShowCard()) {
        setShowCard(false);
        return;
      }

      try {
        const status = await checkPulseStatus(userName);
        setHasSubmitted(status.hasSubmitted);
        setShowCard(!status.hasSubmitted); // Eğer henüz cevap vermediyse göster
      } catch (error) {
        console.error("Status check error:", error);
        setShowCard(shouldShowCard()); // Hata durumunda gün kontrolüne göre göster
      }
    };

    checkStatus();
  }, [userName]);

  const handleSubmit = async () => {
    if (score === 0) {
      alert("Lütfen bir puan seçin!");
      return;
    }

    setSubmitting(true);
    try {
      const request: PulseSubmitRequest = {
        user_name: userName,
        score: score,
        feedback: feedback.trim() || undefined,
        department_id: departmentId,
      };

      await submitPulseAnswer(request);
      setSubmitted(true);
      setShowCard(false);
      
      // Konfeti animasyonu
      triggerConfetti();
    } catch (error: any) {
      alert(error.message || "Anket gönderilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  // Basit konfeti animasyonu
  const triggerConfetti = () => {
    // Canvas ile basit konfeti efekti
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
    }> = [];

    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

    // Partiküller oluştur
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3,
      });
    }

    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2; // Yerçekimi

        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Partiküller ekrandan çıktıysa veya süre dolduysa durdur
      const allOut = particles.every(
        (p) => p.y > canvas.height || p.x < 0 || p.x > canvas.width
      );

      if (!allOut) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          document.body.removeChild(canvas);
        }, 1000);
      }
    };

    animate();
  };

  if (!showCard || submitted) {
    if (submitted) {
      return (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
          <p className="text-sm text-green-800 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Teşekkürler! İyi Dersler. 🎉
          </p>
        </div>
      );
    }
    return null;
  }

  const emojiMap: Record<number, string> = {
    1: "😡",
    2: "😡",
    3: "😐",
    4: "😐",
    5: "🙂",
    6: "🙂",
    7: "🙂",
    8: "🤩",
    9: "🤩",
    10: "🤩",
  };

  return (
    <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-lg">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Heart className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            👋 Haftan Nasıl Geçti?
          </h3>
          <p className="text-sm text-slate-600">
            Bu hafta iş yerinde kendini ne kadar mutlu ve üretken hissettin?
          </p>
        </div>
      </div>

      {/* Emoji Bar - 1-10 arası puanlama */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              onClick={() => setScore(num)}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                score === num
                  ? "border-blue-500 bg-blue-100 scale-110"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <div className="text-2xl mb-1">{emojiMap[num]}</div>
              <div className="text-xs font-medium text-slate-600">{num}</div>
            </button>
          ))}
        </div>
        {score > 0 && (
          <p className="text-xs text-center text-slate-500 mt-2">
            Seçtiğiniz puan: <span className="font-semibold">{score}/10</span> {emojiMap[score]}
          </p>
        )}
      </div>

      {/* Opsiyonel Feedback */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Bunu ne etkiledi? (Opsiyonel)
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Bu haftayı etkileyen faktörleri paylaşabilirsin..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-slate-400 mt-1 text-right">
          {feedback.length}/500
        </p>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || score === 0}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Gönderiliyor...
          </>
        ) : (
          <>
            Gönder ve Devam Et
            <Sparkles className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}


