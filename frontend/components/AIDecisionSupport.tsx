"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Network, ShieldCheck } from "lucide-react";
import { buildEvidenceGraph, evidenceSourceLabel } from "@/lib/hr/evidenceGraph";

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
  groq: "Groq",
  openai: "OpenAI",
  rules: "Kural motoru",
};

export default function AIDecisionSupport({
  kind,
  context,
  title = "Karar Desteği",
  description,
  buttonLabel = "Kanıt analizini oluştur",
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
  const evidenceGraph = useMemo(() => buildEvidenceGraph(kind, context || {}), [kind, context]);
  const evidenceSources = useMemo(
    () => Array.from(new Set(evidenceGraph.nodes.map((node) => node.source))).filter((source) => source !== "derived" && source !== "other").slice(0, 6),
    [evidenceGraph.nodes]
  );

  const statusText = useMemo(() => {
    if (status === null) return "Bağlantı kontrol ediliyor";
    if (!configured) return "Kural motoru hazır";
    return `${providerLabel} hazır`;
  }, [configured, providerLabel, status]);

  const requestAI = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/ai/hr-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, context: { ...context, evidenceScore: evidenceGraph.score, evidenceBand: evidenceGraph.band, evidenceMissingSignals: evidenceGraph.missingSignals } }),
      });
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        mode: "rules",
        provider: "rules",
        configured: false,
        recommendation: "Analiz servisine ulaşılamadı. Mevcut kanıtları manuel olarak doğrulayın ve eksik veri noktalarını tamamlayın.",
        note: "Bağlantı hatası nedeniyle kural bazlı güvenli yedek gösteriliyor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`rounded-[10px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[.1em] text-[#2f6664]">Kanıta dayalı karar desteği</p>
              <h2 className="mt-0.5 text-[15px] font-semibold text-slate-950 dark:text-slate-100">{title}</h2>
            </div>
          </div>
          <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <span className={`border-l-2 pl-2 text-[9px] font-semibold ${configured ? "border-emerald-500 text-emerald-700" : "border-slate-300 text-slate-500"}`}>
            {statusText}
          </span>
          {model && <span className="max-w-[220px] truncate text-[9px] text-slate-400">{model}</span>}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Network className="h-4 w-4" strokeWidth={1.7} /></span>
            <div>
              <div className="flex items-center gap-2"><p className="text-xs font-semibold text-slate-900 dark:text-white">Evidence Score</p><span className={`border-l pl-2 text-[9px] font-semibold ${evidenceTone(evidenceGraph.band)}`}>{evidenceGraph.band}</span></div>
              <p className="mt-0.5 text-[10px] text-slate-400">Kanıt kapsamı, çeşitliliği ve izlenebilirliği</p>
            </div>
          </div>
          <div className="flex items-end gap-1"><strong className="text-3xl tracking-[-0.05em] text-slate-950 dark:text-white">{evidenceGraph.score}</strong><span className="mb-1 text-[10px] font-semibold text-slate-400">/100</span></div>
        </div>

        <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
          <EvidenceFactor label="Kaynak kapsamı" value={evidenceGraph.sourceCoverage} />
          <EvidenceFactor label="Doğrudan kanıt" value={evidenceGraph.directEvidenceShare} />
          <EvidenceFactor label="İzlenebilirlik" value={evidenceGraph.traceability} />
          <EvidenceFactor label="İnsan kanıtı" value={evidenceGraph.humanEvidence} />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {evidenceSources.map((source) => <span key={source} className="text-[9px] font-medium text-slate-500 dark:text-slate-400">• {evidenceSourceLabel(source)}</span>)}
          {!evidenceSources.length && <span className="text-[10px] text-slate-400">Henüz bağımsız kanıt kaynağı bulunmuyor.</span>}
        </div>

        {evidenceGraph.missingSignals.length > 0 && (
          <div className="mt-3 border-l-2 border-amber-400 bg-amber-50/50 px-3 py-2 text-[10px] leading-4 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            <strong>Eksik kanıt:</strong> {evidenceGraph.missingSignals.join(" · ")}
          </div>
        )}
        <p className="mt-2 text-[9px] leading-4 text-slate-400">{evidenceGraph.note}</p>
      </div>

      <button
        type="button"
        onClick={requestAI}
        disabled={loading}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
      >
        {loading ? "Kanıtlar analiz ediliyor..." : buttonLabel}
      </button>

      {result?.note && (
        <div className="mt-3 flex items-start gap-2 border-l-2 border-amber-400 bg-amber-50/50 px-3 py-2 text-[10px] leading-4 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{result.note}</span>
        </div>
      )}

      {analysis ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="xl:col-span-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#2f6664]" />
                <p className="text-[10px] font-semibold uppercase tracking-[.07em] text-[#2f6664]">{result.mode === "ai" ? `${providerLabel} analizi` : "Kural bazlı güvenli yedek"}</p>
              </div>
              <span className={`border-l pl-2 text-[9px] font-semibold ${confidenceTone(analysis.confidence)}`}>Veri güveni: {analysis.confidence}</span>
            </div>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-800 dark:text-slate-100">{analysis.summary}</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">{analysis.confidenceReason}</p>
          </div>

          <AIList title="Güçlü kanıtlar" items={analysis.evidenceStrengths} empty="Henüz yeterli güçlü kanıt yok." />
          <AIList title="Eksik / doğrulanacak kanıtlar" items={analysis.evidenceGaps} empty="Belirgin veri açığı bulunmadı." />
          <AIList title="Önerilen sonraki adımlar" items={analysis.nextActions} empty="Ek aksiyon üretilmedi." />
          <AIList title={questionTitle} items={analysis.interviewQuestions} empty="Ek doğrulama sorusu üretilmedi." />

          <div className="xl:col-span-2 flex items-start gap-2 border-t border-slate-200 pt-3 text-[9px] leading-4 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{analysis.guardrail || "Bu çıktı nihai İK kararı değildir."}</span>
          </div>
        </div>
      ) : result?.recommendation ? (
        <div className="mt-4 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:text-slate-300">
          {result.recommendation}
        </div>
      ) : null}
    </section>
  );
}

function EvidenceFactor({ label, value }: { label: string; value: number }) {
  return <div className="bg-white px-3 py-2.5 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><span className="text-[9px] text-slate-400">{label}</span><strong className="text-[10px] text-slate-700 dark:text-slate-200">%{value}</strong></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-[#2f6664]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function AIList({ title, items, empty }: { title: string; items?: string[]; empty: string }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
      <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-slate-500">{title}</p>
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
  if (confidence === "yüksek") return "border-emerald-300 text-emerald-700";
  if (confidence === "düşük") return "border-amber-300 text-amber-700";
  return "border-slate-300 text-slate-600";
}

function evidenceTone(band: string) {
  if (band === "Yüksek") return "border-emerald-300 text-emerald-700";
  if (band === "Düşük") return "border-amber-300 text-amber-700";
  return "border-slate-300 text-slate-600";
}
