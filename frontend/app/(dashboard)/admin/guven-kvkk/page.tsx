"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Database, Download, EyeOff, FileClock, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../../../utils/storage";
import { clearAIGovernanceLog, readAIGovernanceLog, type AIGovernanceEvent } from "@/lib/hr/governanceLog";

const RETENTION_DAYS = 365;

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function candidateCreatedAt(candidate: any): Date | null {
  return parseDate(candidate?.createdAt || candidate?.created_at || candidate?.applicationDate || candidate?.date || candidate?.Tarih);
}

function candidateRetentionUntil(candidate: any): Date | null {
  const explicit = parseDate(candidate?.retentionUntil || candidate?.retention_until || candidate?.consentExpiresAt || candidate?.consent_expires_at);
  if (explicit) return explicit;
  const created = candidateCreatedAt(candidate);
  if (!created) return null;
  return new Date(created.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function kindLabel(kind: string) {
  return ({
    recruitment: "İşe Alım",
    performance: "Performans",
    talent: "Yetenek",
    development: "Gelişim",
    career: "Kariyer",
    succession: "Halefiyet",
    copilot: "FutureHR Copilot",
  } as Record<string, string>)[kind] || kind;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function GuvenKvkkPage() {
  const [events, setEvents] = useState<AIGovernanceEvent[]>([]);
  const [user, setUser] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(readAIGovernanceLog());
    setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
    setCandidates(getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []));
    refresh();
    window.addEventListener("futurehrGovernanceLogUpdated", refresh);
    return () => window.removeEventListener("futurehrGovernanceLogUpdated", refresh);
  }, []);

  const role = String(user?.role || "").toUpperCase();
  const allowed = role === "CEO" || role === "IK" || role === "ADMIN";

  const metrics = useMemo(() => {
    const aiRuns = events.filter((event) => event.mode === "ai").length;
    const fallbackRuns = events.filter((event) => event.fallbackUsed).length;
    const evidenceScores = events.map((event) => event.evidenceScore).filter((value): value is number => value !== null);
    const averageEvidence = evidenceScores.length ? Math.round(evidenceScores.reduce((sum, value) => sum + value, 0) / evidenceScores.length) : null;
    return {
      total: events.length,
      aiRuns,
      fallbackRuns,
      fallbackRate: events.length ? Math.round((fallbackRuns / events.length) * 100) : 0,
      averageEvidence,
    };
  }, [events]);

  const retention = useMemo(() => {
    const now = Date.now();
    let dated = 0;
    let overdue = 0;
    let missingDate = 0;
    candidates.forEach((candidate) => {
      const expiry = candidateRetentionUntil(candidate);
      if (!expiry) {
        missingDate += 1;
        return;
      }
      dated += 1;
      if (expiry.getTime() < now) overdue += 1;
    });
    return { total: candidates.length, dated, overdue, missingDate };
  }, [candidates]);

  const exportLog = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), policy: "FutureHR demo AI governance v1", events }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `futurehr-ai-audit-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!allowed) {
    return (
      <div className="enterprise-card mx-auto max-w-3xl p-8 text-center">
        <LockKeyhole className="mx-auto h-8 w-8 text-slate-300" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Güven & KVKK Merkezi</h1>
        <p className="mt-2 text-sm text-slate-500">Bu görünüm yalnızca CEO ve İK yönetim rollerine açıktır.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="enterprise-eyebrow">Trust · Privacy · AI Governance</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">Güven & KVKK Merkezi</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">AI kullanımını, veri minimizasyonunu, anonimlik kontrollerini ve saklama risklerini tek yönetim görünümünde izleyin.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportLog} disabled={!events.length} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Download className="h-3.5 w-3.5" />Denetim kaydını dışa aktar</button>
          <button type="button" onClick={() => { if (window.confirm("Demo AI denetim kayıtları temizlensin mi?")) clearAIGovernanceLog(); }} disabled={!events.length} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 hover:border-red-200 hover:text-red-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"><Trash2 className="h-3.5 w-3.5" />Demo kayıtlarını temizle</button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        <strong>Uyum notu:</strong> Bu ekran teknik kontrol ve denetim kanıtlarını görünür kılar; tek başına KVKK uygunluğu veya hukuki uygunluk sertifikası değildir. Saklama süreleri, aydınlatma/açık rıza gereksinimleri ve şirket politikaları hukuk/KVKK sorumluları tarafından onaylanmalıdır.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Bot} label="AI karar desteği çağrısı" value={String(metrics.total)} note={`${metrics.aiRuns} gerçek AI yanıtı`} />
        <Metric icon={ShieldCheck} label="Kural bazlı / hata yedeği" value={`%${metrics.fallbackRate}`} note={`${metrics.fallbackRuns} kayıt`} />
        <Metric icon={Database} label="Ortalama Evidence Score" value={metrics.averageEvidence !== null ? `${metrics.averageEvidence}/100` : "—"} note="Kayıtlı modül çağrıları" />
        <Metric icon={FileClock} label="Aday saklama riski" value={String(retention.overdue + retention.missingDate)} note={`${retention.overdue} süresi geçmiş · ${retention.missingDate} tarihsiz`} />
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ControlCard icon={EyeOff} title="Kişisel veri minimizasyonu" status="Aktif" detail="AI katmanına gönderim öncesi ad, e-posta, telefon ve hassas/korunan alanlar çıkarılır. Denetim kaydı ham prompt saklamaz." />
        <ControlCard icon={LockKeyhole} title="Employee Experience anonimliği" status="k ≥ 5" detail="Beşten az yanıt bulunan grup/haftalarda skor, driver ve yorum yönetim görünümünde bastırılır. Copilot yalnızca anonim toplu analitiği alır." />
        <ControlCard icon={ShieldCheck} title="Human-in-the-loop" status="Zorunlu" detail="AI; işe alma, terfi, ücret, disiplin veya halef ataması için nihai karar üretmez. Çıktı kanıt sentezi ve doğrulama desteğidir." />
        <ControlCard icon={Database} title="Denetim izi" status="Demo + backend" detail="Bu prototip tarayıcıda gizlilik güvenli AI kullanım kaydı tutar. Backend tarafında immutable audit altyapısı mevcut; production tenant veritabanına taşınmalıdır." />
      </section>

      <section className="enterprise-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Karar Desteği Denetim Defteri</h2><p className="mt-1 text-[11px] text-slate-500">Prompt veya kişi adı saklanmadan provider, model, amaç, kanıt seviyesi ve fallback kullanımı kaydedilir.</p></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">Son {Math.min(50, events.length)} kayıt</span>
        </div>
        {events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:bg-slate-950/50">
                <tr><th className="px-4 py-3">Zaman</th><th className="px-4 py-3">Amaç</th><th className="px-4 py-3">Provider / model</th><th className="px-4 py-3">Çalışma modu</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Veri güveni</th><th className="px-4 py-3">Gizlilik</th><th className="px-4 py-3">Ekran</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {events.slice(0, 50).map((event) => (
                  <tr key={event.id} className="text-slate-600 dark:text-slate-300">
                    <td className="whitespace-nowrap px-4 py-3 text-[11px]">{formatDate(event.timestamp)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{kindLabel(event.decisionKind)}</td>
                    <td className="px-4 py-3"><p className="font-medium">{event.provider}</p><p className="mt-0.5 max-w-44 truncate text-[9px] text-slate-400">{event.model}</p></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${event.mode === "ai" ? "bg-emerald-50 text-emerald-700" : event.mode === "rules" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{event.mode === "ai" ? "AI" : event.mode === "rules" ? "Güvenli yedek" : "Hata"}</span></td>
                    <td className="px-4 py-3 font-semibold">{event.evidenceScore !== null ? `${event.evidenceScore}/100` : "—"}</td>
                    <td className="px-4 py-3">{event.confidence || "—"}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1"><span className="rounded bg-slate-100 px-1.5 py-1 text-[9px] dark:bg-slate-800">PII redacted</span>{event.privacy.employeeExperienceAggregated && <span className="rounded bg-indigo-50 px-1.5 py-1 text-[9px] text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">EX aggregate{event.privacy.anonymityThreshold ? ` k≥${event.privacy.anonymityThreshold}` : ""}</span>}</div></td>
                    <td className="px-4 py-3 text-[10px] text-slate-400">{event.route}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center"><Bot className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">Henüz AI denetim kaydı yok</p><p className="mt-1 text-xs text-slate-400">FutureHR AI veya modül içi AI karar desteği çalıştırıldığında kayıtlar burada oluşur.</p></div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <div className="enterprise-card p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Aday verisi saklama kontrolü</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">Prototipte 12 aylık saklama hedefi üzerinden veri kalitesi kontrolü yapılır. Nihai süre şirketin hukuki işleme amacı ve politikasına göre belirlenmelidir.</p></div><FileClock className="h-5 w-5 text-indigo-500" /></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SmallStat label="Aday kaydı" value={retention.total} />
            <SmallStat label="Tarihli" value={retention.dated} />
            <SmallStat label="Süresi geçmiş" value={retention.overdue} danger={retention.overdue > 0} />
            <SmallStat label="Tarih eksik" value={retention.missingDate} danger={retention.missingDate > 0} />
          </div>
        </div>

        <div className="enterprise-card p-5">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Production'a geçmeden önce</h2></div>
          <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            <p>• AI denetim kayıtlarını tenant bazlı PostgreSQL tablosuna immutable olarak taşı.</p>
            <p>• Kullanılan evidence ID'leri, model/policy sürümü ve insanın nihai karar/override gerekçesini kaydet.</p>
            <p>• Aday saklama süresini otomatik silme/yeniden izin workflow'una bağla.</p>
            <p>• Veri sahibi başvuru, dışa aktarma ve silme taleplerini audit event olarak izle.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: any; label: string; value: string; note: string }) {
  return <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p><Icon className="h-4 w-4 text-indigo-500" /></div><p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p></div>;
}

function ControlCard({ icon: Icon, title, status, detail }: { icon: any; title: string; status: string; detail: string }) {
  return <div className="enterprise-card p-4"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><Icon className="h-4 w-4" /></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{status}</span></div><h3 className="mt-3 text-xs font-semibold text-slate-900 dark:text-white">{title}</h3><p className="mt-1.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{detail}</p></div>;
}

function SmallStat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className={`rounded-xl border px-3 py-3 ${danger ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/15" : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40"}`}><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-xl font-semibold ${danger ? "text-red-700 dark:text-red-300" : "text-slate-900 dark:text-white"}`}>{value}</p></div>;
}
