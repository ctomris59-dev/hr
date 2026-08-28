"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Heart, Loader2, Send, ShieldCheck, SlidersHorizontal } from "lucide-react";
import {
  checkPulseStatus,
  submitPulseAnswer,
  type PulseDriverDefinition,
  type PulseDriverKey,
  type PulseSubmitRequest,
} from "../../app/services/surveyService";

interface WeeklyPulseCardProps {
  userName: string;
  departmentId?: string;
  respectWindow?: boolean;
  onSubmitted?: () => void;
}

const isPulseWindow = () => {
  const day = new Date().getDay();
  return day === 5 || day === 6 || day === 0;
};

export default function WeeklyPulseCard({ userName, departmentId, respectWindow = true, onSubmitted }: WeeklyPulseCardProps) {
  const [score, setScore] = useState(0);
  const [driverScores, setDriverScores] = useState<Partial<Record<PulseDriverKey, number>>>({});
  const [drivers, setDrivers] = useState<PulseDriverDefinition[]>([]);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [serviceReady, setServiceReady] = useState(true);
  const [anonymityThreshold, setAnonymityThreshold] = useState(5);
  const windowOpen = !respectWindow || isPulseWindow();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!userName) {
        if (active) setLoading(false);
        return;
      }
      const status = await checkPulseStatus(userName);
      if (!active) return;
      setHasSubmitted(Boolean(status.hasSubmitted));
      setDrivers(status.drivers || []);
      setAnonymityThreshold(status.anonymityThreshold || 5);
      setServiceReady(Boolean(status.success && status.drivers?.length));
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [userName]);

  const allDriversAnswered = drivers.length > 0 && drivers.every((driver) => Boolean(driverScores[driver.key]));

  const handleSubmit = async () => {
    if (!score || !userName || !allDriversAnswered) return;
    setSubmitting(true);
    try {
      const request: PulseSubmitRequest = {
        user_name: userName,
        score,
        drivers: driverScores,
        feedback: feedback.trim() || undefined,
        department_id: departmentId,
      };
      await submitPulseAnswer(request);
      setHasSubmitted(true);
      window.dispatchEvent(new CustomEvent("pulseUpdated"));
      onSubmitted?.();
    } catch (error: any) {
      alert(error?.message || "Check-in gönderilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;

  if (hasSubmitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/10">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Bu haftanın mikro check-in'i tamamlandı</p>
            <p className="mt-1 text-xs leading-5 text-emerald-700/80 dark:text-emerald-400/80">Yanıtın kaydedildi. Yönetim ekranında bireysel yanıt gösterilmez; yalnızca en az {anonymityThreshold} kişinin bulunduğu anonim toplu sonuçlar görünür.</p>
          </div>
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
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Aynı haftalık pencere, trendlerin karşılaştırılabilir kalmasını sağlar.</p>
        </div>
      </div>
    );
  }

  if (!serviceReady) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
        Çalışan deneyimi servisine şu anda ulaşılamıyor. Yanıt kaybı olmaması için check-in geçici olarak gönderime kapatıldı.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Bu hafta iş deneyimin nasıldı?</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Önce genel deneyimini 1–10 arasında değerlendir; ardından bu haftanın iki kısa driver sorusunu yanıtla.</p>
          </div>
        </div>
        <span className="hidden rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 sm:inline-flex dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">~30 saniye</span>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {[1,2,3,4,5,6,7,8,9,10].map((value) => (
          <button key={value} type="button" onClick={() => setScore(value)} aria-pressed={score === value}
            className={`h-11 rounded-lg border text-sm font-semibold transition-all ${score === value ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
            {value}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400"><span>Çok düşük</span><span>Çok iyi</span></div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/35">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Bu haftanın deneyim driver'ları</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Sorular haftalara göre dönüşümlü gelir; böylece anket kısa kalır.</p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {drivers.map((driver) => (
            <div key={driver.key}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium leading-5 text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">{driver.label}:</span> {driver.question}</p>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">1–5</span>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[1,2,3,4,5].map((value) => (
                  <button key={value} type="button" onClick={() => setDriverScores((prev) => ({ ...prev, [driver.key]: value }))}
                    className={`h-9 rounded-lg border text-xs font-semibold transition ${driverScores[driver.key] === value ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"}`}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="mt-5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Bunu en çok ne etkiledi? <span className="font-normal text-slate-400">(isteğe bağlı)</span></label>
      <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={3} maxLength={500}
        placeholder="İş yükü, ekip iletişimi, süreçler veya başka bir etken..."
        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950" />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-xl items-start gap-2 text-[10px] leading-4 text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>Bireysel yanıt yöneticiye gösterilmez. Toplu skor ve driver analizi ancak en az {anonymityThreshold} yanıt olduğunda açılır.</span>
        </div>
        <button type="button" onClick={handleSubmit} disabled={submitting || score === 0 || !allDriversAnswered}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {submitting ? "Gönderiliyor..." : "Check-in'i gönder"}
        </button>
      </div>
    </div>
  );
}
