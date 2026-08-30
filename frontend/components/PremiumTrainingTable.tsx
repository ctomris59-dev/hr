"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, RefreshCcw, TrendingDown, TrendingUp } from "lucide-react";
import { findDevelopmentIntervention } from "@/lib/hr/developmentLibrary";
import { learningEvidenceLabel, learningEvidenceState } from "@/lib/hr/learningEvidence";
import { learningImpactForAssignment, learningImpactSummary, type LearningImpactResult } from "@/lib/hr/learningImpact";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";

export interface PremiumTrainingRow {
  id: string;
  employee: string;
  trainingId: string;
  trainingName: string;
  source?: string;
  assignedBy?: string;
  assignedAt: string;
  dueDate?: string;
  status: "Atandı" | "Devam Ediyor" | "Tamamlandı";
  completedAt?: string;
  competencyCode?: string;
  developmentLevel?: number;
  interventionType?: string;
  transferTask?: string;
  successMetric?: string;
  transferEvidence?: string;
  managerVerified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  reassessDueAt?: string;
}

function initials(name: string) {
  return String(name || "FH").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FH";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function evidenceClass(state: ReturnType<typeof learningEvidenceState>) {
  if (state === "verified") return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (state === "transfer-submitted") return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300";
  if (state === "completed") return "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-300";
  return "bg-slate-50 text-slate-500 ring-slate-100 dark:bg-slate-800 dark:text-slate-400";
}

function impactClass(impact: LearningImpactResult) {
  if (impact.state === "measured" && impact.direction === "improved") return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (impact.state === "measured" && impact.direction === "declined") return "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/30 dark:text-red-300";
  if (impact.state === "due" || impact.state === "baseline-missing") return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300";
  if (impact.state === "scheduled") return "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300";
  return "bg-slate-50 text-slate-500 ring-slate-100 dark:bg-slate-800 dark:text-slate-400";
}

function deltaLabel(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export default function PremiumTrainingTable({
  title,
  description,
  rows,
  editable = false,
  onStatus,
  onEvidence,
  overdue,
}: {
  title: string;
  description: string;
  rows: PremiumTrainingRow[];
  editable?: boolean;
  onStatus?: (id: string, status: PremiumTrainingRow["status"]) => void;
  onEvidence?: (item: PremiumTrainingRow) => void;
  overdue: (item: PremiumTrainingRow) => boolean;
}) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const reload = () => setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
    reload();
    window.addEventListener("dataUpdated", reload);
    return () => window.removeEventListener("dataUpdated", reload);
  }, []);

  const impactById = useMemo(() => new Map(rows.map((item) => [item.id, learningImpactForAssignment(item, history)])), [rows, history]);
  const impactSummary = useMemo(() => learningImpactSummary(rows, history), [rows, history]);
  const verifiedCount = rows.filter((item) => learningEvidenceState(item) === "verified").length;
  const pendingEvidenceCount = rows.filter((item) => ["completed", "transfer-submitted"].includes(learningEvidenceState(item))).length;
  const overdueCount = rows.filter(overdue).length;

  return (
    <section className="premium-table-card self-start">
      <div className="premium-table-header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="premium-table-title">{title}</h2>
            <p className="premium-table-description">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="premium-table-meta">{rows.length} kayıt</span>
          {overdueCount > 0 && <span className="premium-status premium-status-red">{overdueCount} geciken</span>}
          {pendingEvidenceCount > 0 && <span className="premium-status premium-status-blue">{pendingEvidenceCount} kanıt bekliyor</span>}
          {verifiedCount > 0 && <span className="premium-status premium-status-green">{verifiedCount} doğrulanmış</span>}
          {impactSummary.due > 0 && <span className="premium-status premium-status-red">{impactSummary.due} yeniden ölçüm gerekli</span>}
          {impactSummary.measured > 0 && <span className="premium-status premium-status-green">{impactSummary.measured} etki ölçüldü</span>}
          {impactSummary.averageDelta !== null && <span className="premium-table-meta">Ort. Δ {deltaLabel(impactSummary.averageDelta)}</span>}
        </div>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="premium-data-table min-w-[1260px]">
            <thead>
              <tr>
                <th className="text-left">Çalışan</th>
                <th className="text-left">Gelişim Müdahalesi</th>
                <th className="text-left">Atama</th>
                <th className="text-left">Son Tarih / Ölçüm</th>
                <th className="text-left">Öğrenme</th>
                <th className="text-left">Kanıt Durumu</th>
                <th className="text-left">Etki / Yeniden Ölçüm</th>
                {(editable || onEvidence) && <th className="text-right">İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const intervention = findDevelopmentIntervention(item.trainingId);
                const isOverdue = overdue(item);
                const state = learningEvidenceState(item);
                const impact = impactById.get(item.id) ?? learningImpactForAssignment(item, history);
                const statusLabel = isOverdue ? "Gecikti" : item.status;
                const statusClass = item.status === "Tamamlandı"
                  ? "premium-status-green"
                  : isOverdue
                    ? "premium-status-red"
                    : item.status === "Devam Ediyor"
                      ? "premium-status-blue"
                      : "premium-status-violet";
                const meta = intervention
                  ? `${intervention.competencyCode} · L${intervention.level} ${intervention.levelLabel} · ${intervention.type}`
                  : item.interventionType || item.source || "Atanmış gelişim";
                const canManageEvidence = Boolean(onEvidence && item.status === "Tamamlandı");

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="premium-person-cell">
                        <span className="premium-avatar">{initials(item.employee)}</span>
                        <div className="min-w-0">
                          <p className="premium-cell-primary">{item.employee}</p>
                          <p className="premium-cell-secondary">Çalışan</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                          <BookOpen className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="premium-cell-primary max-w-[320px]">{item.trainingName}</p>
                          <p className="premium-cell-secondary">{meta}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="premium-cell-primary font-medium">{formatDate(item.assignedAt)}</p>
                      <p className="premium-cell-secondary">{item.assignedBy ? `${item.assignedBy} tarafından` : "Sistem ataması"}</p>
                    </td>
                    <td>
                      <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${isOverdue ? "text-red-600" : "text-slate-700 dark:text-slate-300"}`}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(item.dueDate)}
                      </div>
                      <p className="premium-cell-secondary">
                        {item.status === "Tamamlandı" && item.reassessDueAt
                          ? `Yeniden ölçüm ${formatDate(item.reassessDueAt)}`
                          : isOverdue
                            ? "Son tarih geçti"
                            : item.dueDate
                              ? "Planlanan bitiş"
                              : "Son tarih yok"}
                      </p>
                    </td>
                    <td><span className={`premium-status ${statusClass}`}>{statusLabel}</span></td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ring-1 ${evidenceClass(state)}`}>
                        {state === "verified" ? <CheckCircle2 className="h-3 w-3" /> : <ClipboardCheck className="h-3 w-3" />}
                        {learningEvidenceLabel(state)}
                      </span>
                      {state === "verified" && item.verifiedBy && <p className="premium-cell-secondary mt-1">{item.verifiedBy} · {formatDate(item.verifiedAt)}</p>}
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ring-1 ${impactClass(impact)}`}>
                        {impact.state === "measured" && impact.direction === "improved" ? <TrendingUp className="h-3 w-3" /> : impact.state === "measured" && impact.direction === "declined" ? <TrendingDown className="h-3 w-3" /> : <RefreshCcw className="h-3 w-3" />}
                        {impact.label}
                      </span>
                      {impact.state === "measured" ? (
                        <p className="premium-cell-secondary mt-1">{impact.competency}: {impact.baseline?.toFixed(2)} → {impact.post?.toFixed(2)} · Δ {deltaLabel(impact.delta)}</p>
                      ) : impact.state === "scheduled" ? (
                        <p className="premium-cell-secondary mt-1">{impact.daysUntilDue !== null ? `${Math.max(0, impact.daysUntilDue)} gün` : formatDate(impact.reassessDueAt)} sonra</p>
                      ) : impact.state === "due" ? (
                        <p className="premium-cell-secondary mt-1">Başlangıç {impact.baseline?.toFixed(2)} · yeni ölçüm bekleniyor</p>
                      ) : impact.state === "baseline-missing" ? (
                        <p className="premium-cell-secondary mt-1">Müdahale öncesi karşılaştırma verisi yok</p>
                      ) : null}
                    </td>
                    {(editable || onEvidence) && (
                      <td className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {editable && (
                            <select value={item.status} onChange={(event) => onStatus?.(item.id, event.target.value as PremiumTrainingRow["status"])}>
                              <option>Atandı</option>
                              <option>Devam Ediyor</option>
                              <option>Tamamlandı</option>
                            </select>
                          )}
                          {canManageEvidence && (
                            <button type="button" onClick={() => onEvidence?.(item)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              Kanıtı yönet
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="premium-empty-state">
          <span className="premium-empty-icon"><BookOpen className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Henüz gelişim kaydı yok</p>
            <p className="mt-1 text-xs">Yeni bir gelişim müdahalesi atandığında burada görünecek.</p>
          </div>
        </div>
      )}
    </section>
  );
}