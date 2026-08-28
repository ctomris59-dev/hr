"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Heart, Send } from "lucide-react";
import { checkPulseStatus, submitPulseAnswer, type PulseSubmitRequest } from "../../app/services/surveyService";

interface WeeklyPulseCardProps {
  userName: string;
  departmentId?: string;
  respectWindow?: boolean;
}

const isPulseWindow = () => {
  const day = new Date().getDay();
  return day === 5 || day === 6 || day === 0;
};

export default function WeeklyPulseCard({ userName, departmentId, respectWindow = true }: WeeklyPulseCardProps) {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const windowOpen = !respectWindow || isPulseWindow();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!userName) {
        if (active) setLoading(false);
        return;
      }
      const status = await checkPulseStatus(userName);
      if (active) {
        setHasSubmitted(Boolean(status.hasSubmitted));
        setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [userName]);

  const handleSubmit = async () => {
    if (!score || !userName) return;
    setSubmitting(true);
    try {
      const request: PulseSubmitRequest = {
        user_name: userName,
        score,
        feedback: feedback.trim() || undefined,
        department_id: departmentId,
      };
      await submitPulseAnswer(request);
      setHasSubmitted(true);
      window.dispatchEvent(new CustomEvent("pulseUpdated"));
    } catch (error: any) {
      alert(error?.message || "Check-in gönderilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }

  if (hasSubmitted) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Bu haftanın check-in'i tamamlandı</p>
          <p className="mt-1 text-xs leading-5 text-emerald-700/80 dark:text-emerald-400/80">Yanıtınız haftalık çalışan deneyimi özetine dahil edildi. Yeni check-in gelecek hafta açılır.</p>
        </div>
      </div>
    );
  }

  if (!windowOpen) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <CalendarDays className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-500" />
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Haftalık check-in Cuma–Pazar arasında açılır</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Bu pencere, yanıtların aynı haftalık dönemde toplanmasını ve trendlerin tutarlı kalmasını sağlar.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Bu hafta iş deneyimin nasıldı?</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Genel iş deneyimini, enerji ve üretkenlik hissini birlikte düşünerek 1–10 arasında değerlendir.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {[1,2,3,4,5,6,7,8,9,10].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScore(value)}
            aria-pressed={score === value}
            className={`h-11 rounded-lg border text-sm font-semibold transition-all ${score === value ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400">
        <span>Çok düşük</span><span>Çok iyi</span>
      </div>

      <label className="mt-5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        Bunu en çok ne etkiledi? <span className="font-normal text-slate-400">(isteğe bağlı)</span>
      </label>
      <textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        rows={3}
        maxLength={500}
        placeholder="İş yükü, ekip iletişimi, odaklanma, süreçler veya başka bir etken..."
        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] leading-4 text-slate-400">Yanıt, çalışan deneyimi raporlarında toplu skor ve trend üretmek için kullanılır.</p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || score === 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Gönderiliyor..." : "Check-in'i gönder"}
        </button>
      </div>
    </div>
  );
}
