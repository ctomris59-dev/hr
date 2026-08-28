"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, EyeOff, HeartPulse, ShieldCheck, Sparkles, Users } from "lucide-react";
import WeeklyPulseCard from "../../../components/education/WeeklyPulseCard";
import { getPulseAnalytics, type PulseAnalyticsResponse, type PulseDriverMetric } from "../../services/surveyService";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";

const MANAGEMENT_ROLES = new Set(["CEO", "IK", "ADMIN", "DIRECTOR", "MANAGER"]);

function driverTone(metric: PulseDriverMetric | null) {
  if (!metric) return "text-slate-500";
  if (metric.average >= 4) return "text-emerald-600";
  if (metric.average >= 3.4) return "text-amber-600";
  return "text-red-600";
}

export default function CalisanDeneyimiPage() {
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [analytics, setAnalytics] = useState<PulseAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  useEffect(() => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setUser(currentUser);
    setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
    const role = String(currentUser?.role || "").toUpperCase();
    const dept = currentUser?.dept || currentUser?.department || "";
    if ((role === "DIRECTOR" || role === "MANAGER") && dept) setSelectedDepartment(dept);
    setReady(true);
  }, []);

  const role = String(user?.role || "").toUpperCase();
  const isManagerView = MANAGEMENT_ROLES.has(role);
  const userName = user?.name || user?.username || "";
  const department = user?.dept || user?.department || "";
  const isAdminScope = role === "CEO" || role === "IK" || role === "ADMIN";
  const departments = useMemo(() => Array.from(new Set(orgData.map((item) => item.Departman).filter(Boolean))).sort(), [orgData]);

  const loadAnalytics = useCallback(async () => {
    if (!isManagerView) return;
    setAnalyticsLoading(true);
    const data = await getPulseAnalytics({
      department: isAdminScope ? selectedDepartment || undefined : department || undefined,
      role,
      userDept: department || undefined,
    });
    setAnalytics(data);
    setAnalyticsLoading(false);
  }, [department, isAdminScope, isManagerView, role, selectedDepartment]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  if (!ready) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;

  const latest = analytics?.latest || null;
  const latestDrivers = latest ? Object.values(latest.drivers || {}).filter(Boolean) as PulseDriverMetric[] : [];
  const currentProtected = analytics?.anonymity.currentProtected ?? true;
  const threshold = analytics?.anonymity.threshold || 5;
  const respondents = analytics?.anonymity.currentRespondents || 0;
  const population = analytics?.scope.population || 0;
  const participation = latest?.participation ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="enterprise-eyebrow">Employee Experience Intelligence</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Çalışan Deneyimi</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">Haftalık genel deneyim skoru, dönüşümlü mikro-driver soruları ve gizlilik eşiği ile çalışan deneyiminin neden değiştiğini ölçün.</p>
        </div>
        {isManagerView && isAdminScope && departments.length > 0 && (
          <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Analiz kapsamı
            <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} className="mt-1.5 block h-10 min-w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <option value="">Tüm şirket</option>
              {departments.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className={`grid items-start gap-4 ${isManagerView ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-[minmax(0,1fr)_320px]"}`}>
        <div className="enterprise-card p-5">
          {userName ? (
            <WeeklyPulseCard userName={userName} departmentId={department} respectWindow={false} onSubmitted={loadAnalytics} />
          ) : (
            <p className="text-sm text-slate-500">Check-in için aktif kullanıcı bilgisi bulunamadı.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="enterprise-card p-4">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Anonimlik kuralı</h2></div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Bireysel yanıtlar ve yorumlar yönetim ekranında gösterilmez. Bir grup veya hafta en az <strong className="text-slate-800 dark:text-slate-200">{threshold} yanıt</strong> üretmeden skor ve driver sonuçları açılmaz.</p>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950/40">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bu hafta</span>
              <span className={`text-xs font-bold ${respondents >= threshold ? "text-emerald-600" : "text-amber-600"}`}>{respondents}/{threshold} anonimlik eşiği</span>
            </div>
          </div>

          <div className="enterprise-card p-4">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Neyi ölçüyoruz?</h2></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              {["İş Yükü", "Enerji", "Yönetici Desteği", "Rol Netliği", "Gelişim"].map((item) => <div key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">{item}</div>)}
            </div>
            <p className="mt-3 text-[10px] leading-4 text-slate-400">Her hafta yalnızca iki driver sorusu gelir. Beş driver dönüşümlü ölçülerek anket yorgunluğu azaltılır.</p>
          </div>
        </div>
      </div>

      {isManagerView && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-600">Yönetim görünümü</p><h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Anonim deneyim analizi</h2></div>
            {analyticsLoading && <span className="text-xs text-slate-400">Güncelleniyor…</span>}
          </div>

          {!analytics ? (
            <div className="enterprise-card p-6 text-sm text-slate-500">Çalışan deneyimi analitiği henüz alınamadı.</div>
          ) : currentProtected && !latest ? (
            <div className="enterprise-card flex items-start gap-3 p-6">
              <EyeOff className="mt-0.5 h-5 w-5 text-amber-500" />
              <div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Korunan görünüm aktif</h3><p className="mt-1 text-xs leading-5 text-slate-500">Bu kapsamda anonimlik eşiğini geçen bir hafta henüz oluşmadı. {respondents} yanıt var; skor ve driver analizi {threshold} yanıta ulaşıldığında açılacak.</p></div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Deneyim skoru" value={latest ? `${latest.average_score?.toFixed(1)} / 10` : "—"} note="Son anonim hafta" icon={HeartPulse} />
                <MetricCard label="Katılım" value={participation !== null ? `%${participation.toFixed(0)}` : "—"} note={population ? `${population} çalışanlık kapsam` : "Kapsam bilgisi yok"} icon={Users} />
                <MetricCard label="Haftalık değişim" value={analytics.latestDelta !== null ? `${analytics.latestDelta > 0 ? "+" : ""}${analytics.latestDelta.toFixed(1)}` : "—"} note="Önceki anonim haftaya göre" icon={analytics.latestDelta !== null && analytics.latestDelta < 0 ? ArrowDownRight : ArrowUpRight} />
                <MetricCard label="Ölçülen driver" value={String(latestDrivers.length)} note="Bu haftada görünür driver" icon={Activity} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
                <div className="enterprise-card p-5">
                  <div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Driver analizi</h3><p className="mt-1 text-[11px] text-slate-500">1–5 ortalaması. Değişim aynı driver'ın önceki anonim ölçümüne göredir.</p></div>
                  {latestDrivers.length ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {latestDrivers.map((metric) => (
                        <div key={metric.key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{metric.label}</p><p className={`mt-1 text-2xl font-semibold ${driverTone(metric)}`}>{metric.average.toFixed(1)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${metric.delta === null ? "bg-slate-100 text-slate-500" : metric.delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{metric.delta === null ? "İlk ölçüm" : `${metric.delta > 0 ? "+" : ""}${metric.delta.toFixed(1)}`}</span></div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (metric.average / 5) * 100)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-4 text-xs text-slate-500">Bu anonim haftada driver verisi henüz yeterli değil.</p>}
                </div>

                <div className="enterprise-card p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Yönetim içgörüsü</h3>
                  <div className="mt-4 space-y-3">
                    <Insight title="Öncelikli driver" metric={analytics.lowestDriver} empty="Henüz yeterli driver verisi yok." />
                    <Insight title="Güçlü driver" metric={analytics.strongestDriver} empty="Henüz yeterli driver verisi yok." positive />
                  </div>
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-[11px] leading-5 text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300">Skor düşüşünü tek başına “memnuniyetsizlik” olarak yorumlamayın. Önce driver değişimini, katılım oranını ve en az birkaç haftalık trendi birlikte değerlendirin.</div>
                </div>
              </div>

              <div className="enterprise-card p-5">
                <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">12 haftalık anonim trend</h3><p className="mt-1 text-[11px] text-slate-500">Eşik altındaki haftalar bilinçli olarak puansız gösterilir.</p></div><span className="text-[10px] font-semibold text-slate-400">Hedef 7,0 / 10</span></div>
                <div className="mt-5 flex h-36 items-end gap-2">
                  {analytics.trend.length ? analytics.trend.map((week) => {
                    const visible = !week.suppressed && week.average_score !== null;
                    const height = visible ? Math.max(8, (Number(week.average_score) / 10) * 100) : 8;
                    return <div key={week.week} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className={`relative w-full max-w-10 rounded-t-md ${visible ? "bg-indigo-500/80" : "border border-dashed border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"}`} style={{ height: `${height}%` }} title={visible ? `${week.week}: ${week.average_score?.toFixed(1)} (${week.count} yanıt)` : `${week.week}: gizlilik eşiği altında (${week.count}/${threshold})`} /><span className="max-w-full truncate text-[8px] text-slate-400">{week.week.replace(/^\d{4}-W/, "H")}</span></div>;
                  }) : <p className="self-center text-xs text-slate-400">Henüz trend verisi yok.</p>}
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: any }) {
  return <div className="enterprise-card p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p><Icon className="h-4 w-4 text-indigo-500" /></div><p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p></div>;
}

function Insight({ title, metric, empty, positive = false }: { title: string; metric: PulseDriverMetric | null; empty: string; positive?: boolean }) {
  if (!metric) return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-xs text-slate-500">{empty}</p></div>;
  return <div className={`rounded-xl border p-3 ${positive ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/15" : "border-amber-100 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/15"}`}><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p><div className="mt-1 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{metric.label}</p><span className="text-sm font-bold text-slate-900 dark:text-white">{metric.average.toFixed(1)}/5</span></div><p className="mt-1 text-[10px] leading-4 text-slate-500">{positive ? "Korunması gereken olumlu deneyim sinyali." : "İlk inceleme ve doğrulama için en düşük anonim driver."}</p></div>;
}
