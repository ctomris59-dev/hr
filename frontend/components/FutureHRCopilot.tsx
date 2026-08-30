"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, ExternalLink, Loader2, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { buildTalentDecisionSnapshot } from "@/lib/hr/talentDecisionChain";
import { getCareerRole } from "@/lib/hr/careerArchitecture";
import { employeeKey, latestEvaluationForEmployee, latestEvaluationMap, normalizeEmployeeName } from "@/lib/hr/employeeIdentity";
import { rankSuccessors } from "@/lib/hr/succession";
import { learningImpactForAssignment, learningImpactSummary } from "@/lib/hr/learningImpact";
import { processEmployeeData } from "@/app/utils/salarySimulation";

interface Props { pathname: string; }
type Severity = "kritik" | "yüksek" | "orta" | "bilgi";
type Analysis = {
  answer: string;
  confidence: "düşük" | "orta" | "yüksek";
  confidenceReason: string;
  priorities: Array<{ severity: Severity; title: string; evidence: string; action: string; route: string }>;
  nextActions: string[];
  evidenceGaps: string[];
  guardrail: string;
};
type Result = { mode?: "ai" | "rules"; provider?: string; model?: string; configured?: boolean; analysis?: Analysis; note?: string; error?: string };

const QUICK_PROMPTS = [
  "Bu ay yönetim olarak nelere dikkat etmeliyim?",
  "Performans kalibrasyonu gereken alanları özetle.",
  "Gelişim yatırımlarının ölçülen etkisi ne durumda?",
  "Hazır halefi olmayan kritik roller var mı?",
  "Ücret kararlarında hangi veri açıkları var?",
];

const severityStyle: Record<Severity, string> = {
  kritik: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300",
  yüksek: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300",
  orta: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-300",
  bilgi: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function numeric(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dueDate(plan: any): Date | null {
  const raw = plan?.dueDate || plan?.deadline || plan?.endDate || plan?.targetDate || plan?.bitisTarihi;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCompleted(plan: any) {
  const status = String(plan?.status || plan?.durum || "").toLocaleLowerCase("tr-TR");
  return /tamam|completed|done|closed/.test(status) || Number(plan?.progress || plan?.ilerleme || 0) >= 100;
}

function pulseScore(answer: any) {
  const n = Number(answer?.score ?? answer?.puan ?? answer?.value);
  return Number.isFinite(n) && n >= 1 && n <= 10 ? n : null;
}

function safeAverage(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
}

function buildCompanyContext(question: string, pathname: string) {
  const org = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
  const history = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
  const development = getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []);
  const training = getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
  const benchmarks = getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS, []);
  const pulse = getStorageData<any[]>(STORAGE_KEYS.PULSE_ANSWERS, []);
  const latest = latestEvaluationMap(history);
  const snapshots = org.map((person) => buildTalentDecisionSnapshot(person, history));
  const snapshotByKey = new Map(snapshots.map((snapshot) => [snapshot.identity.employeeKey, snapshot]));
  const learningSummary = learningImpactSummary(training, history);

  let calibrationRequired = 0;
  latest.forEach((evaluation) => {
    const kpi = numeric(evaluation?.kpi_score);
    const manager = numeric(evaluation?.manager_performance_score);
    if (kpi > 0 && manager > 0 && Math.abs(kpi - manager) >= 0.75) calibrationRequired += 1;
  });

  const reportCounts: Record<string, number> = {};
  org.forEach((person) => {
    const manager = String(person?.["Yönetici 1"] || "");
    if (manager) reportCounts[normalizeEmployeeName(manager)] = (reportCounts[normalizeEmployeeName(manager)] || 0) + 1;
  });
  const criticalRoles = org.filter((person) =>
    getCareerRole(person?.Pozisyon || "").levelRank >= 4 ||
    (reportCounts[normalizeEmployeeName(person?.["Ad Soyad"])] || 0) >= 2
  );
  let criticalRolesWithoutReadySuccessor = 0;
  let singleSuccessorPool = 0;
  criticalRoles.forEach((target) => {
    const candidates = rankSuccessors(target, org, history).slice(0, 8);
    if (!candidates.some((item) => item.assessment.readiness === "Şimdi")) criticalRolesWithoutReadySuccessor += 1;
    if (candidates.length <= 1) singleSuccessorPool += 1;
  });

  const salaryRows = processEmployeeData(org, history);
  const benchmarkKeys = new Set(benchmarks.map((item) => `${item?.Departman}|${item?.Pozisyon}`));
  const compensationDataWarnings = salaryRows.filter((row) => !row["Mevcut Maaş"] || (row.Kanıt_Güveni ?? 0) < 60 || !benchmarkKeys.has(`${row.Departman}|${row.Pozisyon}`)).length;
  const missingSalaryCount = salaryRows.filter((row) => !row["Mevcut Maaş"]).length;
  const lowEvidenceEmployees = snapshots.filter((snapshot) => snapshot.evidence.score < 60).length;
  const overdueDevelopmentPlans = development.filter((plan) => { const due = dueDate(plan); return due && due.getTime() < Date.now() && !isCompleted(plan); }).length;
  const pulseValues = pulse.map(pulseScore).filter((value): value is number => value !== null);

  const departmentMap = new Map<string, { count: number; performance: number[]; evidence: number[] }>();
  org.forEach((person) => {
    const department = String(person?.Departman || "Belirtilmemiş");
    const snapshot = snapshotByKey.get(employeeKey(person));
    const bucket = departmentMap.get(department) || { count: 0, performance: [], evidence: [] };
    bucket.count += 1;
    if (snapshot?.performance.score) bucket.performance.push(snapshot.performance.score);
    if (snapshot) bucket.evidence.push(snapshot.evidence.score);
    departmentMap.set(department, bucket);
  });
  const departments = Array.from(departmentMap.entries()).map(([department, value]) => ({
    department,
    employeeCount: value.count,
    averagePerformance: safeAverage(value.performance),
    averageEvidence: safeAverage(value.evidence),
  })).slice(0, 12);

  const normalized = normalizeEmployeeName(question);
  const matched = [...org]
    .filter((person) => {
      const name = String(person?.["Ad Soyad"] || "");
      return name.length >= 3 && normalized.includes(normalizeEmployeeName(name));
    })
    .sort((a, b) => String(b["Ad Soyad"]).length - String(a["Ad Soyad"]).length)[0];
  const focusName = matched ? String(matched["Ad Soyad"]) : null;
  const redactedQuestion = focusName ? question.replace(new RegExp(focusName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "seçili çalışan") : question;
  const focusSnapshot = matched ? buildTalentDecisionSnapshot(matched, history) : null;
  const focusEvaluation = matched ? latestEvaluationForEmployee(matched, history) : null;
  const focusAssignments = focusName ? training.filter((item) => normalizeEmployeeName(item?.employee) === normalizeEmployeeName(focusName)) : [];
  const focusLearningSummary = focusName ? learningImpactSummary(focusAssignments, history) : null;
  const focusMeasuredLearning = focusAssignments
    .map((item) => learningImpactForAssignment(item, history))
    .filter((item) => item.state === "measured")
    .slice(0, 5)
    .map((item) => ({ competency: item.competency, baseline: item.baseline, post: item.post, delta: item.delta, direction: item.direction }));

  return {
    focusName,
    outboundQuestion: redactedQuestion,
    context: {
      pageContext: pathname,
      scope: focusSnapshot ? "selected_employee" : "company",
      metrics: {
        employeeCount: org.length,
        evaluationCount: history.length,
        calibrationRequired,
        lowEvidenceEmployees,
        criticalRoleCount: criticalRoles.length,
        criticalRolesWithoutReadySuccessor,
        singleSuccessorPool,
        overdueDevelopmentPlans,
        learningVerified: learningSummary.verified,
        learningMeasured: learningSummary.measured,
        learningReassessmentDue: learningSummary.due,
        learningScheduled: learningSummary.scheduled,
        learningPositiveRate: learningSummary.positiveRate,
        learningAverageDelta: learningSummary.averageDelta,
        compensationDataWarnings,
        missingSalaryCount,
        externalBenchmarkCount: benchmarks.length,
        pulseResponseCount: pulseValues.length,
        pulseAverage: safeAverage(pulseValues),
      },
      departments,
      targetEmployee: focusSnapshot ? {
        position: focusSnapshot.identity.position,
        department: focusSnapshot.identity.department,
        performance: focusSnapshot.performance,
        competency: focusSnapshot.competency,
        talent: { potential: focusSnapshot.talent.potential, nineBox: focusSnapshot.talent.nineBox },
        careerSignals: focusSnapshot.profile,
        evidence: { score: focusSnapshot.evidence.score, band: focusSnapshot.evidence.band, missingSignals: focusSnapshot.evidence.missingSignals },
        calibration: focusEvaluation ? {
          kpiScore: numeric(focusEvaluation?.kpi_score) || null,
          managerScore: numeric(focusEvaluation?.manager_performance_score) || null,
          difference: numeric(focusEvaluation?.kpi_score) && numeric(focusEvaluation?.manager_performance_score) ? Math.round(Math.abs(numeric(focusEvaluation.kpi_score) - numeric(focusEvaluation.manager_performance_score)) * 100) / 100 : null,
        } : null,
        learningImpact: focusLearningSummary ? {
          verified: focusLearningSummary.verified,
          measured: focusLearningSummary.measured,
          due: focusLearningSummary.due,
          positiveRate: focusLearningSummary.positiveRate,
          averageDelta: focusLearningSummary.averageDelta,
          measuredCompetencies: focusMeasuredLearning,
        } : null,
      } : null,
      evidenceGaps: [
        ...(history.length ? [] : ["Performans geçmişi bulunmuyor."]),
        ...(benchmarks.length ? [] : ["Dış piyasa ücret benchmarkı bulunmuyor."]),
        ...(pulseValues.length >= 5 ? [] : ["Çalışan deneyimi yanıt kapsamı anonim trend yorumu için sınırlı."]),
        ...(learningSummary.verified > 0 && learningSummary.measured === 0 ? ["Doğrulanmış gelişim kanıtları var ancak karşılaştırılabilir yeniden ölçüm sonucu henüz oluşmadı."] : []),
        ...(learningSummary.due > 0 ? [`${learningSummary.due} doğrulanmış gelişim müdahalesinde yeniden ölçüm zamanı geldi.`] : []),
      ],
    },
  };
}

function replaceFocus(text: string, focusName: string | null) {
  return focusName ? text.replace(/seçili çalışan/gi, focusName) : text;
}

export default function FutureHRCopilot({ pathname }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [focusName, setFocusName] = useState<string | null>(null);
  const analysis = result?.analysis;

  const providerLabel = useMemo(() => {
    if (!result?.provider) return "FutureHR AI";
    if (result.provider === "groq") return "Groq · FutureHR AI";
    if (result.provider === "openai") return "OpenAI · FutureHR AI";
    return "FutureHR Kural Motoru";
  }, [result?.provider]);

  const ask = async (rawQuestion: string) => {
    const clean = rawQuestion.trim();
    if (!clean || loading) return;
    setQuestion(clean);
    setLoading(true);
    setResult(null);
    const built = buildCompanyContext(clean, pathname);
    setFocusName(built.focusName);
    try {
      const response = await fetch("/api/ai/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: built.outboundQuestion, context: built.context }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Copilot yanıtı alınamadı.");
      if (data?.analysis && built.focusName) {
        data.analysis = {
          ...data.analysis,
          answer: replaceFocus(data.analysis.answer || "", built.focusName),
          priorities: (data.analysis.priorities || []).map((item: any) => ({ ...item, title: replaceFocus(item.title || "", built.focusName), evidence: replaceFocus(item.evidence || "", built.focusName), action: replaceFocus(item.action || "", built.focusName) })),
          nextActions: (data.analysis.nextActions || []).map((item: string) => replaceFocus(item, built.focusName)),
          evidenceGaps: (data.analysis.evidenceGaps || []).map((item: string) => replaceFocus(item, built.focusName)),
        };
      }
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Copilot servisine ulaşılamadı." });
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(question); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500" aria-label="FutureHR AI Copilot'u aç">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">FutureHR AI</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Copilot'u kapat" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-slate-200 bg-[#f7f8fb] shadow-[-24px_0_70px_rgba(15,23,42,.18)] dark:border-slate-800 dark:bg-slate-950">
            <header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-sm"><Bot className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-indigo-600">İK Karar Zekâsı</p><h2 className="mt-0.5 text-base font-semibold text-slate-950 dark:text-white">FutureHR AI Copilot</h2><p className="mt-1 text-[11px] text-slate-500">Modüller arası kanıtları tek yönetici cevabında birleştirir.</p></div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {!result && !loading && (
                <div>
                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 dark:border-indigo-900/50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-violet-950/20">
                    <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600"/><div><p className="text-sm font-semibold text-slate-900 dark:text-white">Bugün neyi anlamak istiyorsunuz?</p><p className="mt-1 text-xs leading-5 text-slate-500">Copilot; performans, yetenek, kariyer, halefiyet, gelişim etkisi ve ücret kanıtlarını birlikte tarar. Kişi adı yazarsanız ad sunucuya gönderilmeden ilgili çalışanın anonim karar profili kullanılır.</p></div></div>
                  </div>
                  <div className="mt-4 space-y-2">{QUICK_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-xs font-medium text-slate-700 shadow-sm hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><span>{prompt}</span><ArrowRight className="h-3.5 w-3.5 text-slate-300"/></button>)}</div>
                </div>
              )}

              {loading && <div className="flex min-h-[320px] flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg"><Loader2 className="h-5 w-5 animate-spin"/></span><p className="mt-4 text-sm font-semibold">FutureHR kanıtları birleştiriyor</p><p className="mt-1 text-xs text-slate-500">Performans → gelişim etkisi → yetenek → kariyer → halefiyet → ücret sinyalleri taranıyor.</p></div>}

              {result?.error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"><AlertTriangle className="mr-2 inline h-4 w-4"/>{result.error}</div>}

              {analysis && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-indigo-600">{providerLabel}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Veri güveni: {analysis.confidence}</span></div>
                    {focusName && <p className="mt-2 text-[10px] font-semibold text-violet-600">Odak çalışan: {focusName} · isim AI servisine gönderilmedi</p>}
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-850 dark:text-slate-100">{analysis.answer}</p><p className="mt-2 text-[10px] leading-4 text-slate-400">{analysis.confidenceReason}</p>
                  </div>

                  {analysis.priorities?.length > 0 && <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Yönetim öncelikleri</p><div className="space-y-2">{analysis.priorities.map((item,index)=><button key={`${item.title}-${index}`} type="button" onClick={()=>{setOpen(false);router.push(item.route)}} className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-px hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${severityStyle[item.severity]}`}>{item.severity}</span><ExternalLink className="h-3.5 w-3.5 text-slate-300"/></div><p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">{item.title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.evidence}</p><p className="mt-2 text-[10px] font-medium leading-4 text-indigo-700 dark:text-indigo-300">→ {item.action}</p></button>)}</div></div>}

                  <div className="grid gap-3 sm:grid-cols-2"><MiniList title="Sonraki aksiyonlar" items={analysis.nextActions} icon="check"/><MiniList title="Eksik / doğrulanacak veri" items={analysis.evidenceGaps} icon="warn"/></div>
                  {result.note && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">{result.note}</p>}
                  <div className="flex items-start gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[9px] leading-4 text-slate-500 dark:bg-slate-900"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/><span>{analysis.guardrail}</span></div>
                  <button type="button" onClick={()=>{setResult(null);setFocusName(null);setQuestion("")}} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Yeni soru sor</button>
                </div>
              )}
            </div>

            <form onSubmit={submit} className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-indigo-950/40"><textarea value={question} onChange={(event)=>setQuestion(event.target.value)} rows={2} maxLength={700} placeholder="Örn. Bu ay hangi İK kararları dikkat gerektiriyor?" className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"/><button type="submit" disabled={!question.trim()||loading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"><Send className="h-3.5 w-3.5"/></button></div>
              <p className="mt-2 text-center text-[9px] text-slate-400">AI karar vermez; kanıtı sentezler, veri açığını ve insan doğrulama adımını gösterir.</p>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}

function MiniList({ title, items, icon }: { title: string; items?: string[]; icon: "check" | "warn" }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2">{icon==="check"?<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/>:<AlertTriangle className="h-3.5 w-3.5 text-amber-500"/>}<p className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">{title}</p></div><div className="mt-2 space-y-1.5">{list.length?list.map((item,index)=><p key={index} className="text-[10px] leading-4 text-slate-600 dark:text-slate-300">• {item}</p>):<p className="text-[10px] text-slate-400">Belirgin kayıt yok.</p>}</div></div>;
}
