"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export type AIDecisionKind = "talent" | "recruitment" | "performance" | "development" | "career" | "succession";

type Confidence = "düşük" | "orta" | "yüksek";

interface AIAnalysis {
  summary: string;
  confidence: Confidence;
  confidenceReason: string;
  evidenceStrengths: string[];
  evidenceGaps: string[];
  nextActions: string[];
  interviewQuestions: string[];
  guardrail: string;
}

interface AIResult {
  mode?: "ai" | "rules";
  provider?: "groq" | "openai" | "rules" | string;
  configured?: boolean;
  model?: string;
  analysis?: AIAnalysis;
  recommendation?: string;
  note?: string;
}

interface AIStatus {
  provider?: string;
  configured?: boolean;
  model?: string;
}

interface Props {
  kind: AIDecisionKind;
  context: Record<string, any>;
  title?: string;
  description: string;
  buttonLabel?: string;
  resetKey?: string | number | null;
  className?: string;
  questionTitle?: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  groq: "Groq AI",
  openai: "OpenAI",
  rules: "Kural motoru",
};

export default function AIDecisionSupport({
  kind,
  context,
  title = "AI Karar Desteği",
  description,
  buttonLabel = "AI analizini oluştur",
  resetKey,
  className = "",
  questionTitle = "Doğrulama soruları",
}: Props) {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/ai/hr-recommendation", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (active) setStatus(data); })
      .catch(() => { if (active) setStatus({ configured: false, provider: "rules", model: "rule-based" }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setResult(null);
  }, [resetKey]);

  const analysis = result?.analysis;
  const provider = result?.provider || status?.provider || "rules";
  const providerLabel = PROVIDER_LABEL[provider] || provider;
  const configured = result?.configured ?? status?.configured ?? false;
  const model = result?.model || status?.model;

  const statusText = useMemo(() => {
    if (status === null) return "AI kontrol ediliyor";
    if (!configured) return "API anahtarı gerekli";
    return `${providerLabel} hazır`;
  }, [configured, providerLabel, status]);

  const requestAI = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/ai/hr-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, context }),
      });
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        mode: "rules",
        provider: "rules",
        configured: false,
        recommendation: "AI servisine ulaşılamadı. Mevcut kanıtları manuel olarak doğrulayın ve eksik veri noktalarını tamamlayın.",
        note: "Bağlantı hatası nedeniyle kural bazlı güvenli yedek gösteriliyor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-white p-5 shadow-sm dark:border-violet-900/60 dark:from-violet-950/25 dark:via-slate-900 dark:to-slate-900 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-violet-950 dark:text-violet-100">{title}</h2>
              <p className="mt-0.5 text-[10px] text-violet-700/70 dark:text-violet-300/70">Kanıt sentezi · veri açığı · doğrulama aksiyonu</p>
            </div>
          </div>
          <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${configured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
            {statusText}
          </span>
          {model && <span className="max-w-[220px] truncate text-[9px] text-slate-400">{model}</span>}
        </div>
      </div>

      <button
        type="button"
        onClick={requestAI}
        disabled={loading}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "AI kanıtları analiz ediyor..." : buttonLabel}
      </button>

      {result?.note && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{result.note}</span>
        </div>
      )}

      {analysis ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="xl:col-span-2 rounded-xl border border-violet-100 bg-white p-4 dark:border-violet-900/50 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">{result.mode === "ai" ? `${providerLabel} analizi` : "Kural bazlı güvenli yedek"}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${confidenceTone(analysis.confidence)}`}>Veri güveni: {analysis.confidence}</span>
            </div>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-800 dark:text-slate-100">{analysis.summary}</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">{analysis.confidenceReason}</p>
          </div>

          <AIList title="Güçlü kanıtlar" items={analysis.evidenceStrengths} empty="Henüz yeterli güçlü kanıt yok." />
          <AIList title="Eksik / doğrulanacak kanıtlar" items={analysis.evidenceGaps} empty="Belirgin veri açığı bulunmadı." />
          <AIList title="Önerilen sonraki adımlar" items={analysis.nextActions} empty="Ek aksiyon üretilmedi." />
          <AIList title={questionTitle} items={analysis.interviewQuestions} empty="Ek doğrulama sorusu üretilmedi." />

          <div className="xl:col-span-2 flex items-start gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[9px] leading-4 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{analysis.guardrail || "Bu çıktı nihai İK kararı değildir."}</span>
          </div>
        </div>
      ) : result?.recommendation ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          {result.recommendation}
        </div>
      ) : null}
    </section>
  );
}

function AIList({ title, items, empty }: { title: string; items?: string[]; empty: string }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {list.length ? (
        <div className="mt-2 space-y-2 text-xs leading-5 text-slate-700 dark:text-slate-300">
          {list.map((item, index) => <p key={`${title}-${index}`}>• {item}</p>)}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-400">{empty}</p>
      )}
    </div>
  );
}

function confidenceTone(confidence?: string) {
  if (confidence === "yüksek") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (confidence === "düşük") return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300";
}
