"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  HeartPulse,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import EmployeeAvatar from "@/components/hr/EmployeeAvatar";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { canAccessRoute, roleLabel } from "@/lib/hr/accessControl";
import {
  EMPLOYEE_SAAS_MODE,
  employeeAvatarUrl,
  fetchSaasCurrentEmployee,
  type SaaSEmployee,
} from "@/lib/hr/employeeClient";

type JourneyEvent = {
  key: string;
  date: Date | null;
  title: string;
  description: string;
  icon: LucideIcon;
};

type TodayItem = {
  key: string;
  title: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  tone: "blue" | "teal" | "amber" | "violet";
};

const normalize = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("tr-TR");

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: unknown) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "Henüz tanımlı değil";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatShortDate(value: Date | null) {
  if (!value) return "Güncel";
  return value.toLocaleDateString("tr-TR", { month: "short", year: "numeric" });
}

function formatTenure(value: unknown) {
  const start = parseDate(value);
  if (!start) return "Henüz tanımlı değil";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years > 0 && remaining > 0) return `${years} yıl ${remaining} ay`;
  if (years > 0) return `${years} yıl`;
  return `${remaining} ay`;
}

function isDone(row: any) {
  const status = String(row?.status || row?.durum || row?.state || "");
  return /tamam|complete|completed|done|closed|approved|onaylandı|bitti/i.test(status) || Number(row?.progress ?? row?.ilerleme ?? 0) >= 100;
}

function isPending(row: any) {
  const status = String(row?.status || row?.durum || row?.state || "");
  return /bekli|pending|submitted|review|incele|talep|planlandı|planned|in_progress|devam/i.test(status) || (!status && !isDone(row));
}

function latestByDate<T extends any>(rows: T[], fields: string[]) {
  return [...rows].sort((a, b) => {
    const aDate = fields.map((field) => parseDate(a?.[field])).find(Boolean)?.getTime() || 0;
    const bDate = fields.map((field) => parseDate(b?.[field])).find(Boolean)?.getTime() || 0;
    return bDate - aDate;
  })[0];
}

function performanceScore(row: any): number | null {
  const values = [row?.Performans, row?.performance, row?.performanceScore, row?.score, row?.manager_performance_score, row?.kpi_score, row?.["KPI Score"]];
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function displayPerformance(score: number | null) {
  if (score === null) return "Kayıt yok";
  if (score <= 5) return `${score.toFixed(1)} / 5`;
  if (score <= 100) return `%${Math.round(score)}`;
  return String(Math.round(score));
}

function findSelfEmployee(orgData: any[], user: any) {
  const userIds = [user?.employeeId, user?.employee_id, user?.id].map(normalize).filter(Boolean);
  const userName = normalize(user?.name || user?.employee_name || user?.username);
  return orgData.find((row) => {
    const rowIds = [row?.id, row?.employee_id, row?.employeeId, row?.["Personel Kodu"]].map(normalize).filter(Boolean);
    if (userIds.some((id) => rowIds.includes(id))) return true;
    return Boolean(userName) && normalize(row?.["Ad Soyad"] || row?.name) === userName;
  }) || null;
}

function belongsToSelf(row: any, user: any, employee: any) {
  const identityIds = [user?.employeeId, user?.employee_id, user?.id, employee?.id, employee?.employee_id, employee?.employeeId, employee?.["Personel Kodu"]]
    .map(normalize)
    .filter(Boolean);
  const rowIds = [row?.employee_id, row?.employeeId, row?.employeeKey, row?.personId, row?.personel_id, row?.personnelId]
    .map(normalize)
    .filter(Boolean);
  if (identityIds.some((id) => rowIds.includes(id))) return true;

  const identityNames = [user?.name, user?.employee_name, employee?.["Ad Soyad"], employee?.name]
    .map(normalize)
    .filter(Boolean);
  const rowNames = [row?.employee, row?.Personel, row?.["Ad Soyad"], row?.employeeName, row?.personnelName]
    .map(normalize)
    .filter(Boolean);
  return identityNames.some((name) => rowNames.includes(name));
}

function MetricCard({ icon: Icon, label, value, helper, href, tone }: { icon: LucideIcon; label: string; value: string; helper: string; href?: string; tone: "blue" | "teal" | "violet" | "amber" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  }[tone];
  const content = (
    <div className="group h-full rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_32px_rgba(15,23,42,.07)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-5 w-5" strokeWidth={1.8} /></span>
        {href && <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600" />}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[.08em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-.035em] text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{content}</Link> : content;
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Icon className="h-4 w-4" /></span>
    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-100">{value || "Henüz tanımlı değil"}</p></div>
  </div>;
}

export default function KullaniciPage() {
  const { currentUserRole, userName } = useAuth();
  const { orgData, history360, loading } = useData();
  const [revision, setRevision] = useState(0);
  const [saasEmployee, setSaasEmployee] = useState<SaaSEmployee | null>(null);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("dataUpdated", refresh);
    window.addEventListener("storageCleared", refresh);
    window.addEventListener("userChanged", refresh);
    return () => {
      window.removeEventListener("dataUpdated", refresh);
      window.removeEventListener("storageCleared", refresh);
      window.removeEventListener("userChanged", refresh);
    };
  }, []);

  useEffect(() => {
    if (!EMPLOYEE_SAAS_MODE) {
      setSaasEmployee(null);
      return;
    }
    let active = true;
    void fetchSaasCurrentEmployee()
      .then((employee) => { if (active) setSaasEmployee(employee); })
      .catch(() => { if (active) setSaasEmployee(null); });
    return () => { active = false; };
  }, [revision]);

  const snapshot = useMemo(() => {
    void revision;
    return {
      currentUser: getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null),
      leave: getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, []),
      training: getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []),
      development: getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []),
      career: getStorageData<any[]>(STORAGE_KEYS.CAREER_PROFILES, []),
      notifications: getStorageData<any[]>(STORAGE_KEYS.NOTIFICATIONS, []),
    };
  }, [revision]);

  const currentUser = snapshot.currentUser || { name: userName || "FutureHR Kullanıcısı" };
  const selfEmployee = useMemo(() => findSelfEmployee(orgData || [], currentUser), [orgData, currentUser]);
  const ownLeave = useMemo(() => snapshot.leave.filter((row) => belongsToSelf(row, currentUser, selfEmployee)), [snapshot.leave, currentUser, selfEmployee]);
  const ownTraining = useMemo(() => snapshot.training.filter((row) => belongsToSelf(row, currentUser, selfEmployee)), [snapshot.training, currentUser, selfEmployee]);
  const ownDevelopment = useMemo(() => snapshot.development.filter((row) => belongsToSelf(row, currentUser, selfEmployee)), [snapshot.development, currentUser, selfEmployee]);
  const ownCareer = useMemo(() => snapshot.career.filter((row) => belongsToSelf(row, currentUser, selfEmployee)), [snapshot.career, currentUser, selfEmployee]);
  const ownPerformance = useMemo(() => (history360 || []).filter((row: any) => belongsToSelf(row, currentUser, selfEmployee)), [history360, currentUser, selfEmployee]);

  const role = currentUserRole;
  const canGo = (href: string) => Boolean(role && canAccessRoute(role, href));
  const profileName = String(saasEmployee?.full_name || currentUser?.name || currentUser?.employee_name || userName || selfEmployee?.["Ad Soyad"] || "FutureHR Kullanıcısı");
  const position = String(saasEmployee?.position || selfEmployee?.Pozisyon || currentUser?.position || currentUser?.title || (role ? roleLabel(role) : "Kullanıcı"));
  const department = String(saasEmployee?.department || selfEmployee?.Departman || currentUser?.department || currentUser?.dept || "Henüz tanımlı değil");
  const manager = String(selfEmployee?.["Yönetici 1"] || selfEmployee?.manager || currentUser?.manager || "Henüz tanımlı değil");
  const location = String(saasEmployee?.location || selfEmployee?.Lokasyon || selfEmployee?.location || currentUser?.location || "Henüz tanımlı değil");
  const employeeCode = String(saasEmployee?.external_id || selfEmployee?.["Personel Kodu"] || selfEmployee?.employeeCode || currentUser?.employeeId || currentUser?.employee_id || "Henüz tanımlı değil");
  const email = String(saasEmployee?.email || selfEmployee?.Eposta || selfEmployee?.email || currentUser?.email || currentUser?.username || "Henüz tanımlı değil");
  const startDate = saasEmployee?.hire_date || selfEmployee?.["İşe Giriş Tarihi"] || selfEmployee?.hireDate || selfEmployee?.startDate || currentUser?.hireDate;
  const avatarSrc = EMPLOYEE_SAAS_MODE
    ? (saasEmployee?.has_avatar && saasEmployee.id ? employeeAvatarUrl(saasEmployee.id) : null)
    : (selfEmployee?.avatarDataUrl || currentUser?.avatarDataUrl || null);

  const openLeave = ownLeave.filter((row) => !isDone(row)).length;
  const completedTraining = ownTraining.filter(isDone).length;
  const activeTraining = ownTraining.filter((row) => !isDone(row)).length;
  const activeDevelopment = ownDevelopment.filter((row) => !isDone(row));
  const developmentProgress = ownDevelopment.length
    ? Math.round(ownDevelopment.reduce((sum, row) => sum + Math.max(0, Math.min(100, Number(row?.progress ?? row?.ilerleme ?? (isDone(row) ? 100 : 0)) || 0)), 0) / ownDevelopment.length)
    : 0;
  const latestPerformance = latestByDate(ownPerformance, ["date", "updatedAt", "createdAt", "periodDate"]);
  const latestScore = performanceScore(latestPerformance);

  const unreadNotifications = snapshot.notifications.filter((item: any) => {
    if (item?.read === true) return false;
    const targetRole = normalize(item?.targetRole);
    const userRole = normalize(currentUser?.role);
    return !targetRole || targetRole === "all" || !userRole || targetRole === userRole;
  });

  const todayItems = useMemo<TodayItem[]>(() => {
    const items: TodayItem[] = [];
    const pendingLeave = ownLeave.find((row) => !isDone(row) && isPending(row));
    if (pendingLeave) items.push({ key: "leave", title: "İzin talebiniz takipte", description: "Talebinizin güncel durumunu İzinlerim ekranından görebilirsiniz.", href: canGo("/izinler") ? "/izinler" : undefined, icon: CalendarDays, tone: "blue" });
    const training = ownTraining.find((row) => !isDone(row));
    if (training) items.push({ key: "training", title: String(training?.title || training?.name || "Devam eden eğitiminiz var"), description: "Eğitim atamanız henüz tamamlanmadı.", href: canGo("/egitim") ? "/egitim" : undefined, icon: GraduationCap, tone: "teal" });
    const development = ownDevelopment.find((row) => !isDone(row));
    if (development) items.push({ key: "development", title: "Gelişim planınız devam ediyor", description: String(development?.goal || development?.action || "Açık gelişim aksiyonlarınızı gözden geçirin."), href: canGo("/gelisim") ? "/gelisim" : undefined, icon: Target, tone: "violet" });
    if (unreadNotifications.length > 0) items.push({ key: "notifications", title: `${unreadNotifications.length} okunmamış bildiriminiz var`, description: "Üst menüdeki bildirim alanından güncel mesajları görüntüleyebilirsiniz.", icon: Sparkles, tone: "amber" });
    return items.slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownLeave, ownTraining, ownDevelopment, unreadNotifications.length, role]);

  const journey = useMemo<JourneyEvent[]>(() => {
    const events: JourneyEvent[] = [];
    const joinedAt = parseDate(startDate);
    if (joinedAt) events.push({ key: "joined", date: joinedAt, title: "FutureHR yolculuğunuz başladı", description: `${position} rolüyle şirkete katıldınız.`, icon: BriefcaseBusiness });

    const completed = latestByDate(ownTraining.filter(isDone), ["completionDate", "endDate", "updatedAt"]);
    if (completed) events.push({ key: `training-${completed?.id || "latest"}`, date: parseDate(completed?.completionDate || completed?.endDate || completed?.updatedAt), title: "Eğitim tamamlandı", description: String(completed?.title || completed?.name || "Atanan eğitim başarıyla tamamlandı."), icon: GraduationCap });

    if (latestPerformance) events.push({ key: `performance-${latestPerformance?.id || "latest"}`, date: parseDate(latestPerformance?.date || latestPerformance?.updatedAt || latestPerformance?.createdAt), title: "Performans değerlendirmesi", description: latestScore !== null ? `${latestPerformance?.period || "Son dönem"} sonucu: ${displayPerformance(latestScore)}` : `${latestPerformance?.period || "Son dönem"} değerlendirme kaydı oluşturuldu.`, icon: Target });

    const latestDevelopment = latestByDate(ownDevelopment, ["createdAt", "start", "startDate", "updatedAt"]);
    if (latestDevelopment) events.push({ key: `development-${latestDevelopment?.id || "latest"}`, date: parseDate(latestDevelopment?.createdAt || latestDevelopment?.start || latestDevelopment?.startDate || latestDevelopment?.updatedAt), title: "Gelişim planı oluşturuldu", description: String(latestDevelopment?.goal || latestDevelopment?.interventionName || "Yeni gelişim hedefiniz tanımlandı."), icon: BookOpenCheck });

    if (ownCareer.length > 0) {
      const career = latestByDate(ownCareer, ["updatedAt", "createdAt", "date"]);
      events.push({ key: `career-${career?.id || "latest"}`, date: parseDate(career?.updatedAt || career?.createdAt || career?.date), title: "Kariyer hedefi güncellendi", description: String(career?.targetRole || career?.target_role || career?.aspiration || "Kariyer yolunuz güncellendi."), icon: BriefcaseBusiness });
    }

    return events.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0)).slice(-5);
  }, [startDate, position, ownTraining, latestPerformance, latestScore, ownDevelopment, ownCareer]);

  const quickActions = [
    { href: "/izinler", label: "İzinlerim", description: "Talep oluştur ve durumunu gör", icon: CalendarDays },
    { href: "/egitim", label: "Eğitimlerim", description: "Atamalarını ve tamamlananları gör", icon: GraduationCap },
    { href: "/gelisim", label: "Gelişimim", description: "Kişisel gelişim planını takip et", icon: Target },
    { href: "/kariyer", label: "Kariyerim", description: "Hedef rol ve hazırlık alanlarını gör", icon: BriefcaseBusiness },
    { href: "/calisan-deneyimi", label: "Geri Bildirim", description: "Çalışan deneyimine katkı ver", icon: HeartPulse },
  ].filter((item) => canGo(item.href));

  if (loading) {
    return <div className="mx-auto max-w-[1480px] space-y-4 pb-10" aria-busy="true"><div className="h-52 animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-slate-800"/><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((item)=><div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800"/>)}</div></div>;
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-10" data-testid="personal-workspace">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="p-6 sm:p-8 lg:p-9">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-teal-700 dark:text-teal-300"><ShieldCheck className="h-4 w-4"/>Benim Alanım</div>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <EmployeeAvatar name={profileName} src={avatarSrc} size="lg" showStatus />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-[-.04em] text-slate-950 dark:text-white">{profileName}</h1><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3"/>Aktif</span></div>
                <p className="mt-1.5 text-base font-medium text-slate-700 dark:text-slate-200">{position}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{department}{location !== "Henüz tanımlı değil" ? ` • ${location}` : ""}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"><strong className="font-semibold text-slate-700 dark:text-slate-200">Şirkette:</strong> {formatTenure(startDate)}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"><strong className="font-semibold text-slate-700 dark:text-slate-200">Yöneticim:</strong> {manager}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm leading-6 text-teal-900 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-100">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0"/><p><strong className="font-semibold">Burası size ait.</strong> Bu ekran kendi iş hayatınızı, gelişiminizi ve kişisel işlemlerinizi tek yerde toplar; ekip veya başka çalışanların özel kayıtlarını göstermez.</p>
            </div>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50/70 p-6 lg:border-l lg:border-t-0 lg:p-7 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Kişisel özet</p><h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">İş hayatım</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"><UserRound className="h-5 w-5"/></span></div>
            <div className="mt-4">
              <DetailRow icon={Building2} label="Departman" value={department}/>
              <DetailRow icon={UsersRound} label="Yönetici" value={manager}/>
              <DetailRow icon={CalendarDays} label="İşe giriş" value={formatDate(startDate)}/>
              <DetailRow icon={BadgeCheck} label="Çalışan no" value={employeeCode}/>
            </div>
          </aside>
        </div>
      </section>

      <section aria-label="Kişisel göstergeler" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={CalendarDays} label="İzinlerim" value={openLeave ? `${openLeave} açık` : "Güncel"} helper={ownLeave.length ? `${ownLeave.length} toplam izin kaydı` : "Henüz izin kaydı bulunmuyor"} href={canGo("/izinler") ? "/izinler" : undefined} tone="blue" />
        <MetricCard icon={Target} label="Performansım" value={displayPerformance(latestScore)} helper={latestPerformance?.period ? String(latestPerformance.period) : "Son değerlendirme sonucu"} tone="violet" />
        <MetricCard icon={BookOpenCheck} label="Gelişimim" value={ownDevelopment.length ? `%${developmentProgress}` : "Plan yok"} helper={activeDevelopment.length ? `${activeDevelopment.length} açık gelişim aksiyonu` : ownDevelopment.length ? "Açık aksiyon bulunmuyor" : "Henüz gelişim planı oluşturulmadı"} href={canGo("/gelisim") ? "/gelisim" : undefined} tone="teal" />
        <MetricCard icon={GraduationCap} label="Eğitimlerim" value={ownTraining.length ? `${completedTraining}/${ownTraining.length}` : "Atama yok"} helper={activeTraining ? `${activeTraining} eğitim devam ediyor` : ownTraining.length ? "Tüm atamalar tamamlandı" : "Henüz eğitim ataması bulunmuyor"} href={canGo("/egitim") ? "/egitim" : undefined} tone="amber" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,.8fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,.04)] sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-blue-600 dark:text-blue-300">Bugün</p><h2 className="mt-1 text-xl font-semibold tracking-[-.025em] text-slate-950 dark:text-white">Benim için ne var?</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{todayItems.length} konu</span></div>
          <div className="mt-5 space-y-2">
            {todayItems.length === 0 ? <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300"/><div><p className="font-semibold text-emerald-900 dark:text-emerald-100">Bugün bekleyen kritik bir kişisel işlem yok.</p><p className="mt-1 text-sm leading-6 text-emerald-700 dark:text-emerald-200/80">Aşağıdaki hızlı işlemlerden izin, eğitim, gelişim veya kariyer alanınıza geçebilirsiniz.</p></div></div> : todayItems.map((item) => {
              const Icon = item.icon;
              const tone = { blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300", teal: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300", amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300", violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300" }[item.tone];
              const content = <div className="group flex items-start gap-3 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/40"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5"/></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 dark:text-white">{item.title}</p><p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{item.description}</p></div>{item.href && <ArrowRight className="mt-2 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"/>}</div>;
              return item.href ? <Link href={item.href} key={item.key}>{content}</Link> : <div key={item.key}>{content}</div>;
            })}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,.04)] sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-teal-600 dark:text-teal-300">Hızlı erişim</p><h2 className="mt-1 text-xl font-semibold tracking-[-.025em] text-slate-950 dark:text-white">Kendi işlemlerim</h2></div>
          <div className="mt-4 grid gap-2">
            {quickActions.map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.href} className="group flex items-center gap-3 rounded-2xl border border-slate-100 px-3.5 py-3 transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Icon className="h-4.5 w-4.5"/></span><span className="min-w-0 flex-1"><strong className="block text-sm font-semibold text-slate-900 dark:text-white">{item.label}</strong><small className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">{item.description}</small></span><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"/></Link>; })}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,.04)] sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Clock3 className="h-5 w-5"/></span><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-violet-600 dark:text-violet-300">Geçmiş & gelişim</p><h2 className="mt-0.5 text-xl font-semibold tracking-[-.025em] text-slate-950 dark:text-white">Çalışan yolculuğum</h2></div></div>
          {journey.length ? <div className="relative mt-6 space-y-5 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-slate-200 dark:before:bg-slate-700">{journey.map((event) => { const Icon = event.icon; return <div className="relative flex gap-4" key={event.key}><span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-slate-600 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-300"><Icon className="h-4 w-4"/></span><div className="min-w-0 pb-1"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-slate-400">{formatShortDate(event.date)}</p><h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{event.title}</h3><p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{event.description}</p></div></div>; })}</div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-5 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">İşe giriş, eğitim, performans ve gelişim kayıtlarınız oluştukça kişisel yolculuğunuz burada kronolojik olarak görünecek.</div>}
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,.04)] sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Kişisel kayıt</p><h2 className="mt-1 text-xl font-semibold tracking-[-.025em] text-slate-950 dark:text-white">Bilgilerim</h2></div><ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300"/></div>
          <div className="mt-4">
            <DetailRow icon={BriefcaseBusiness} label="Pozisyon" value={position}/>
            <DetailRow icon={Mail} label="E-posta / kullanıcı" value={email}/>
            <DetailRow icon={MapPin} label="Lokasyon" value={location}/>
            <DetailRow icon={FileText} label="Çalışan numarası" value={employeeCode}/>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"><strong className="font-semibold text-slate-700 dark:text-slate-200">Veri sahipliği:</strong> Kurumsal alanlar ve profil fotoğrafı İK tarafından yönetilir. Kişisel iletişim ve tercih alanları için düzenleme akışı güvenli profil servisine bağlandığında bu ekrandan yönetilebilecek.</div>
        </section>
      </div>
    </div>
  );
}
