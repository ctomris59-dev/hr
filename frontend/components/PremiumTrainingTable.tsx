"use client";

import { BookOpen, CalendarDays, GraduationCap } from "lucide-react";

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
}

const TRAINING_META: Record<string, { category: string; duration: string }> = {
  digital: { category: "Dijital", duration: "6 saat" },
  analytics: { category: "Yetkinlik", duration: "8 saat" },
  communication: { category: "Yetkinlik", duration: "6 saat" },
  leadership: { category: "Liderlik", duration: "10 saat" },
  strategy: { category: "Liderlik", duration: "8 saat" },
  compliance: { category: "Uyum", duration: "4 saat" },
};

function initials(name: string) {
  return String(name || "FH")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FH";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PremiumTrainingTable({
  title,
  description,
  rows,
  editable = false,
  onStatus,
  overdue,
}: {
  title: string;
  description: string;
  rows: PremiumTrainingRow[];
  editable?: boolean;
  onStatus?: (id: string, status: PremiumTrainingRow["status"]) => void;
  overdue: (item: PremiumTrainingRow) => boolean;
}) {
  const completeCount = rows.filter((item) => item.status === "Tamamlandı").length;
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
          {completeCount > 0 && <span className="premium-status premium-status-green">{completeCount} tamamlanan</span>}
        </div>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="premium-data-table min-w-[820px]">
            <thead>
              <tr>
                <th className="text-left">Çalışan</th>
                <th className="text-left">Eğitim</th>
                <th className="text-left">Atama</th>
                <th className="text-left">Son Tarih</th>
                <th className="text-left">Durum</th>
                {editable && <th className="text-right">Güncelle</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const meta = TRAINING_META[item.trainingId];
                const isOverdue = overdue(item);
                const statusLabel = isOverdue ? "Gecikti" : item.status;
                const statusClass = item.status === "Tamamlandı"
                  ? "premium-status-green"
                  : isOverdue
                    ? "premium-status-red"
                    : item.status === "Devam Ediyor"
                      ? "premium-status-blue"
                      : "premium-status-violet";

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
                          <p className="premium-cell-primary max-w-[300px]">{item.trainingName}</p>
                          <p className="premium-cell-secondary">{meta ? `${meta.category} · ${meta.duration}` : item.source || "Atanmış eğitim"}</p>
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
                      <p className="premium-cell-secondary">{isOverdue ? "Son tarih geçti" : item.dueDate ? "Planlanan bitiş" : "Son tarih yok"}</p>
                    </td>
                    <td><span className={`premium-status ${statusClass}`}>{statusLabel}</span></td>
                    {editable && (
                      <td className="text-right">
                        <select value={item.status} onChange={(event) => onStatus?.(item.id, event.target.value as PremiumTrainingRow["status"])}>
                          <option>Atandı</option>
                          <option>Devam Ediyor</option>
                          <option>Tamamlandı</option>
                        </select>
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
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Henüz eğitim kaydı yok</p>
            <p className="mt-1 text-xs">Yeni bir eğitim atandığında burada görünecek.</p>
          </div>
        </div>
      )}
    </section>
  );
}
