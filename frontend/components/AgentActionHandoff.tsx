"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import type { AgentActionDraft } from "@/lib/hr/futureHRAgentTypes";

export default function AgentActionHandoff({ pathname }: { pathname: string }) {
  const [focus, setFocus] = useState<any>(null);
  const [drafts, setDrafts] = useState<AgentActionDraft[]>([]);

  const load = () => {
    setFocus(getStorageData(STORAGE_KEYS.AI_FOCUS, null));
    setDrafts(getStorageData<AgentActionDraft[]>(STORAGE_KEYS.AI_ACTION_DRAFTS, []));
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("futurehrAgentDrafted", refresh as EventListener);
    window.addEventListener("storage", refresh as EventListener);
    return () => {
      window.removeEventListener("futurehrAgentDrafted", refresh as EventListener);
      window.removeEventListener("storage", refresh as EventListener);
    };
  }, []);

  const activeDraft = useMemo(() => {
    if (!focus?.actionDraftId) return null;
    if (!(pathname === focus.route || pathname.startsWith(`${focus.route}/`))) return null;
    return drafts.find((item) => item.id === focus.actionDraftId) || null;
  }, [drafts, focus, pathname]);

  const activeFocus = focus && (pathname === focus.route || pathname.startsWith(`${focus.route}/`)) ? focus : null;
  if (!activeFocus && !activeDraft) return null;

  const dismiss = () => {
    setStorageData(STORAGE_KEYS.AI_FOCUS, null);
    setFocus(null);
  };

  return (
    <div className="mb-3 rounded-xl border border-[#c7d9d6] bg-[linear-gradient(90deg,#f1f7f6,#ffffff)] px-4 py-3 shadow-sm dark:border-[#315f5c] dark:bg-[#172321]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2f6664] text-white"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#2f6664]">FutureHR Intelligence handoff</p>
              {activeDraft && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Taslak hazır</span>}
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">{activeDraft?.label || activeFocus.source || "FutureHR Intelligence bu ekrana yönlendirdi."}</p>
            <p className="mt-1 text-[10.5px] leading-4 text-slate-500">
              {activeDraft?.description || (activeFocus.employeeDisplayName ? `${activeFocus.employeeDisplayName} için ilgili kanıtı bu modülde doğrulayın.` : "İlgili kanıtı bu modülde doğrulayın.")}
            </p>
            {activeDraft?.payload && Object.keys(activeDraft.payload).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(activeDraft.payload).slice(0, 5).map(([key, value]) => (
                  <span key={key} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] text-slate-500 dark:border-slate-700 dark:bg-slate-900"><strong className="font-semibold text-slate-600 dark:text-slate-300">{key}:</strong> {String(value)}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="FutureHR Intelligence yönlendirmesini kapat" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-800"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
