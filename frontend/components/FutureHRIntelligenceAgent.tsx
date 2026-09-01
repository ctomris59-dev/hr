"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Database,
  ExternalLink,
  FileSearch,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { canAccessRoute } from "@/lib/hr/accessControl";
import { buildFutureHRAgentPackage, localAgentFallback } from "@/lib/hr/futureHRAgent";
import type { AgentAIResponse, AgentActionDraft, AgentPackage, AgentPreparedAction } from "@/lib/hr/futureHRAgentTypes";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";

const QUICK = [
  "Bu hafta yönetici olarak hangi insan kararlarına odaklanmalıyım?",
  "Ekibimde gelişim ve eğitim öncelikleri neler?",
  "Performans kalibrasyonu ve kanıt güveni açısından risk var mı?",
  "Hazır halefi olmayan kritik roller var mı?",
  "Ücret ve benchmark tarafında hangi veri açıkları var?",
];

const PAGE_QUICK: Array<{ match: string; prompts: string[] }> = [
  { match: "/egitim", prompts: ["Seçtiğim çalışan için hangi eğitimleri vermeliyiz?", "Hangi eğitimler yeniden ölçüm bekliyor?"] },
  { match: "/gelisim", prompts: ["Bu gelişim planlarında en kritik yetkinlik açıkları hangileri?", "Hangi müdahalelerin işe transfer kanıtı eksik?"] },
  { match: "/degerlendirme", prompts: ["Hangi performans kararlarının kanıt güveni düşük?", "Kalibrasyona gitmesi gereken kayıtları özetle."] },
  { match: "/kariyer", prompts: ["Kariyer hareketine hazırlık açısından hangi kanıtlar eksik?", "Bir üst role hazırlık için hangi gelişim alanları öne çıkıyor?"] },
  { match: "/yedekleme", prompts: ["Kritik rol sürekliliğinde en büyük risk nedir?", "Halef havuzunda hangi veri açıklarını tamamlamalıyız?"] },
  { match: "/maas", prompts: ["Ücret senaryolarında hangi veri riskleri var?", "Benchmark kapsamını ve aktif ücret döngüsünü özetle."] },
  { match: "/ise-alim", prompts: ["İşe alım pipeline'ındaki darboğazı özetle.", "Aday değerlendirmelerinde hangi kanıtlar eksik?"] },
];

type AgentResult = {
  mode?: string;
  provider?: string;
  model?: string;
  analysis?: AgentAIResponse;
  note?: string;
  error?: string;
};

type ConversationItem = {
  id: string;
  question: string;
  package: AgentPackage;
  result: AgentResult;
};

export default function FutureHRIntelligenceAgent({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { currentUserRole } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [drafted, setDrafted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, mounted]);

  const quick = useMemo(() => {
    const page = PAGE_QUICK.find((item) => pathname === item.match || pathname.startsWith(`${item.match}/`));
    return [...(page?.prompts || []), ...QUICK].slice(0, 6);
  }, [pathname]);

  const ask = async (raw: string) => {
    const clean = raw.trim();
    if (!clean || loading) return;
    setLoading(true);
    setQuestion("");
    try {
      const agentPackage = await buildFutureHRAgentPackage(clean, pathname);
      const fallback = localAgentFallback(agentPackage) as AgentAIResponse;
      const response = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: agentPackage.sanitizedQuestion, context: agentPackage.externalContext, fallback }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "FutureHR Intelligence yanıtı alınamadı.");
      const restored = restoreFocus(payload?.analysis || fallback, agentPackage.focusEmployee?.displayName || null);
      const item: ConversationItem = {
        id: `agent-${Date.now()}`,
        question: clean,
        package: agentPackage,
        result: { ...payload, analysis: restored },
      };
      setConversation((rows) => [...rows, item].slice(-8));
      persistHistory(clean, restored, agentPackage);
    } catch (error) {
      const emptyPackage: AgentPackage = {
        question: clean,
        sanitizedQuestion: clean,
        pageContext: pathname,
        scope: "self",
        focusEmployee: null,
        access: { role: String(currentUserRole || ""), scopeLabel: "Mevcut erişim", deniedDomains: [] },
        toolsUsed: [],
        toolResults: [],
        evidenceSources: [],
        evidenceGaps: [],
        preparedActions: [],
        externalContext: {},
      };
      setConversation((rows) => [
        ...rows,
        {
          id: `agent-${Date.now()}`,
          question: clean,
          package: emptyPackage,
          result: { error: error instanceof Error ? error.message : "FutureHR Intelligence servisine ulaşılamadı." },
        },
      ].slice(-8));
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(question);
  };

  const openRoute = (route: string, agentPackage: AgentPackage, source?: string) => {
    if (!canAccessRoute(currentUserRole, route)) return;
    setStorageData(STORAGE_KEYS.AI_FOCUS, {
      route,
      source: source || "FutureHR Intelligence",
      employeeKey: agentPackage.focusEmployee?.employeeKey || null,
      employeeDisplayName: agentPackage.focusEmployee?.displayName || null,
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    router.push(route);
  };

  const prepareAction = (action: AgentPreparedAction, agentPackage: AgentPackage) => {
    if (!canAccessRoute(currentUserRole, action.route)) return;
    const draft: AgentActionDraft = {
      ...action,
      createdAt: new Date().toISOString(),
      status: "draft",
      sourceQuestion: agentPackage.question,
    };
    const existing = getStorageData<AgentActionDraft[]>(STORAGE_KEYS.AI_ACTION_DRAFTS, []);
    setStorageData(STORAGE_KEYS.AI_ACTION_DRAFTS, [draft, ...existing.filter((item) => item.id !== draft.id)].slice(0, 40));
    setStorageData(STORAGE_KEYS.AI_FOCUS, {
      route: action.route,
      source: "FutureHR Intelligence aksiyon taslağı",
      actionDraftId: draft.id,
      employeeKey: action.employeeKey || agentPackage.focusEmployee?.employeeKey || null,
      employeeDisplayName: action.employeeDisplayName || agentPackage.focusEmployee?.displayName || null,
      createdAt: draft.createdAt,
    });
    setDrafted((current) => ({ ...current, [action.id]: true }));
    window.dispatchEvent(new CustomEvent("futurehrAgentDrafted", { detail: draft }));
  };

  const panel = open && mounted ? createPortal(
    <div className="fixed inset-0 z-[2147483000]" role="dialog" aria-modal="true" aria-labelledby="futurehr-agent-title">
      <button
        type="button"
        aria-label="FutureHR Intelligence'ı kapat"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
      />
      <aside className="absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden border-l border-slate-200 bg-[#f5f7f8] shadow-[-24px_0_70px_rgba(15,23,42,.18)] dark:border-slate-800 dark:bg-[#0f151b]">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#141b22]">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#234e4a,#467a75)] text-white shadow-sm">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[.14em] text-[#2f6664]">People Intelligence Agent</p>
                <h2 id="futurehr-agent-title" className="mt-0.5 text-[18px] font-semibold text-slate-900 dark:text-white">FutureHR Intelligence</h2>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Uygulamadaki kanıtları tarar, ilgili araçları çalıştırır ve yöneticinin önüne net cevap getirir.</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[9.5px] font-semibold">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">RBAC kapsamlı</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">Employee 360</span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">Kanıt + deep-link</span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Aksiyon sadece taslak</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f5f7f8] p-5 dark:bg-[#0f151b]">
          {conversation.length === 0 && !loading && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#141b22]">
                <div className="flex min-w-0 items-start gap-3">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#2f6664]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Artık modül aramak zorunda değilsiniz</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Çalışanın adını ve soruyu yazın. Ajan erişiminiz dahilinde performans, rol, eğitim, gelişim, kariyer, halefiyet, ücret ve işe alım kanıtlarından gerekenleri kendisi seçer.</p>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#141b22]">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Örnek sorular</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {quick.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => void ask(prompt)} className="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60">
                      <span className="min-w-0 flex-1 break-words">{prompt}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="space-y-5">
            {conversation.map((item) => (
              <ConversationCard
                key={item.id}
                item={item}
                currentUserRole={currentUserRole}
                drafted={drafted}
                onOpenRoute={openRoute}
                onPrepareAction={prepareAction}
              />
            ))}
          </div>

          {loading && (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center" aria-live="polite">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2f6664] shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <Loader2 className="h-5 w-5 animate-spin" />
              </span>
              <p className="mt-4 text-sm font-semibold">FutureHR kanıtları taranıyor</p>
              <p className="mt-1 max-w-[360px] text-xs leading-5 text-slate-500">Employee 360 → ilgili araçlar → yetki filtresi → kanıt kaynakları → AI sentezi.</p>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#141b22]">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-[#7ba4a1] focus-within:ring-4 focus-within:ring-[#7ba4a1]/10 dark:border-slate-700 dark:bg-slate-900">
            <label className="sr-only" htmlFor="futurehr-agent-question">FutureHR Intelligence sorusu</label>
            <textarea
              id="futurehr-agent-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={2}
              placeholder="Örn. Ayşe Kaya'ya hangi eğitimleri vermeliyiz ve neden?"
              className="min-h-[58px] w-full max-w-full resize-none bg-transparent px-2 py-2 text-xs outline-none placeholder:text-slate-400"
            />
            <div className="flex min-w-0 items-center justify-between gap-3 px-1 pb-1">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[9.5px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">Yetki kapsamı dışındaki veri ajan tarafından kullanılmaz.</span>
              </div>
              <button type="submit" disabled={loading || !question.trim()} aria-label="Soruyu gönder" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2f6664] text-white transition hover:bg-[#285a57] disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#244642] bg-[linear-gradient(135deg,#1f4b47,#315f5b)] px-3 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(47,102,100,0.16)]"
        aria-label="FutureHR Intelligence'ı aç"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sparkles className="h-3.5 w-3.5 text-[#bfe0dc]" />
        <span className="hidden xl:inline">FutureHR Intelligence</span>
      </button>
      {panel}
    </>
  );
}

function ConversationCard({ item, currentUserRole, drafted, onOpenRoute, onPrepareAction }: {
  item: ConversationItem;
  currentUserRole: any;
  drafted: Record<string, boolean>;
  onOpenRoute: (route: string, agentPackage: AgentPackage, source?: string) => void;
  onPrepareAction: (action: AgentPreparedAction, agentPackage: AgentPackage) => void;
}) {
  const analysis = item.result.analysis;
  return (
    <div className="space-y-3">
      <div className="ml-auto max-w-[88%] break-words rounded-2xl rounded-br-md bg-[#173d3a] px-4 py-3 text-xs leading-5 text-white shadow-sm">{item.question}</div>
      {item.result.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{item.result.error}</div>
      ) : analysis ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#141b22]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-[#2f6664]" /><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#2f6664]">FutureHR Intelligence</p></div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9.5px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Kanıt güveni: {analysis.confidence}</span>
            </div>
            {item.package.focusEmployee && <p className="mt-2 text-[10px] font-medium text-slate-500">Odak: {item.package.focusEmployee.displayName} · dış AI sağlayıcısına isim gönderilmedi</p>}
            <p className="mt-3 break-words text-[14px] font-medium leading-6 text-slate-900 dark:text-white">{analysis.answer}</p>
            <p className="mt-2 break-words text-[10.5px] leading-4 text-slate-400">{analysis.confidenceReason}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.package.toolsUsed.map((tool) => <span key={tool} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800">{tool}</span>)}
            </div>
          </section>

          {analysis.recommendations?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#141b22]">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><div className="flex items-center gap-2"><WandSparkles className="h-4 w-4 text-violet-600" /><p className="text-xs font-semibold">Öneriler</p></div></div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {analysis.recommendations.slice(0, 5).map((recommendation, index) => (
                  <div key={`${recommendation.title}-${index}`} className="p-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold text-slate-900 dark:text-white">{index + 1}. {recommendation.title}</p><p className="mt-1.5 break-words text-[10.5px] leading-5 text-slate-500">{recommendation.why}</p><p className="mt-2 break-words text-[10px] leading-4 text-[#2f6664]">Kanıt: {recommendation.evidence}</p></div>
                      {canAccessRoute(currentUserRole, recommendation.route) && <button type="button" onClick={() => onOpenRoute(recommendation.route, item.package, recommendation.title)} className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Aç</button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {item.package.evidenceSources.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#141b22]">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-blue-600" /><p className="text-xs font-semibold">Kullanılan kanıt kaynakları</p></div><span className="text-[9.5px] text-slate-400">{item.package.evidenceSources.length} kaynak</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {item.package.evidenceSources.slice(0, 8).map((source) => (
                  <button key={source.id} type="button" disabled={!canAccessRoute(currentUserRole, source.route)} onClick={() => onOpenRoute(source.route, item.package, source.label)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="flex min-w-0 items-start justify-between gap-2"><p className="min-w-0 flex-1 break-words text-[10.5px] font-semibold text-slate-800 dark:text-slate-100">{source.label}</p><ExternalLink className="h-3 w-3 shrink-0 text-slate-300" /></div>
                    <p className="mt-1 break-words text-[9.5px] leading-4 text-slate-500">{source.detail}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {item.package.preparedActions.length > 0 && (
            <section className="rounded-2xl border border-[#cbdad8] bg-[#f1f6f5] p-4 dark:border-[#315f5c] dark:bg-[#172321]">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#2f6664]" /><p className="text-xs font-semibold text-[#244b48] dark:text-[#a9d0cc]">Kontrollü aksiyonlar</p></div>
              <p className="mt-1 text-[10px] leading-4 text-[#55736f]">Ajan hiçbir işlemi otomatik uygulamaz. Aşağıdaki buton yalnız taslak oluşturur; kullanıcı ilgili modülde doğrular.</p>
              <div className="mt-3 space-y-2">
                {item.package.preparedActions.slice(0, 5).map((action) => {
                  const ready = drafted[action.id];
                  return <div key={action.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-white/70 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="min-w-[180px] flex-1"><p className="break-words text-[10.5px] font-semibold text-slate-800 dark:text-slate-100">{action.label}</p><p className="mt-1 break-words text-[9.5px] leading-4 text-slate-500">{action.description}</p></div>
                    <div className="flex shrink-0 gap-1.5">
                      <button type="button" disabled={ready || !canAccessRoute(currentUserRole, action.route)} onClick={() => onPrepareAction(action, item.package)} className="rounded-lg bg-[#2f6664] px-2.5 py-1.5 text-[9.5px] font-semibold text-white disabled:opacity-55">{ready ? "Taslak hazır" : "Taslak hazırla"}</button>
                      {ready && <button type="button" onClick={() => onOpenRoute(action.route, item.package, action.label)} className="rounded-lg border border-[#b9cfcc] bg-white px-2.5 py-1.5 text-[9.5px] font-semibold text-[#2f6664]">Aç</button>}
                    </div>
                  </div>;
                })}
              </div>
            </section>
          )}

          {analysis.evidenceGaps?.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="text-[10px] font-bold uppercase tracking-[.1em] text-amber-700">Eksik kanıt</p>
              <div className="mt-2 space-y-1.5">{analysis.evidenceGaps.slice(0, 6).map((gap) => <p key={gap} className="break-words text-[10.5px] leading-4 text-amber-800">• {gap}</p>)}</div>
            </section>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-4 text-slate-500 dark:border-slate-800 dark:bg-[#141b22]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2f6664]" /><span className="break-words">{analysis.guardrail}</span></div>
        </>
      ) : null}
    </div>
  );
}

function restoreFocus(analysis: AgentAIResponse, name: string | null): AgentAIResponse {
  if (!name) return analysis;
  const replace = (value: string) => String(value || "").replace(/seçili çalışan/gi, name);
  return {
    ...analysis,
    answer: replace(analysis.answer),
    executiveSummary: replace(analysis.executiveSummary),
    confidenceReason: replace(analysis.confidenceReason),
    recommendations: (analysis.recommendations || []).map((item) => ({ ...item, title: replace(item.title), why: replace(item.why), evidence: replace(item.evidence) })),
    evidenceSources: (analysis.evidenceSources || []).map((item) => ({ ...item, detail: replace(item.detail) })),
    nextActions: (analysis.nextActions || []).map((item) => ({ ...item, label: replace(item.label) })),
    evidenceGaps: (analysis.evidenceGaps || []).map(replace),
    guardrail: replace(analysis.guardrail),
  };
}

function persistHistory(question: string, analysis: AgentAIResponse, agentPackage: AgentPackage) {
  const history = getStorageData<any[]>(STORAGE_KEYS.AI_HISTORY, []);
  const row = {
    id: `history-${Date.now()}`,
    createdAt: new Date().toISOString(),
    question,
    scope: agentPackage.scope,
    focusEmployeeKey: agentPackage.focusEmployee?.employeeKey || null,
    toolsUsed: agentPackage.toolsUsed,
    confidence: analysis.confidence,
    answer: analysis.answer,
  };
  setStorageData(STORAGE_KEYS.AI_HISTORY, [row, ...history].slice(0, 50));
}
