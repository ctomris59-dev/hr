"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Plus,
  Settings2,
  Target,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { canAccessRoute, roleLabel } from "../lib/hr/accessControl";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import PremiumExecutiveDashboard from "./premium/PremiumExecutiveDashboard";

type ActionCard = {
  title: string;
  description: string;
  href: string;
  icon: typeof Users;
};

type TaskCard = {
  title: string;
  description: string;
  href: string;
  count: number;
  icon: typeof Clock3;
};

const isDone = (row: any) => /tamam|complete|done|closed|approved|onaylandı/i.test(String(row?.status || row?.durum || "")) || Number(row?.progress ?? row?.ilerleme ?? 0) >= 100;
const isPending = (row: any) => /bekli|pending|talep|submitted|review|incele/i.test(String(row?.status || row?.durum || ""));
const isOverdue = (row: any) => {
  if (isDone(row)) return false;
  const raw = row?.dueDate || row?.deadline || row?.endDate || row?.targetDate || row?.bitisTarihi;
  if (!raw) return false;
  const date = new Date(raw);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};

function firstName(value: string | null) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

export default function ZeroTrainingDashboard() {
  const { currentUserRole, userName } = useAuth();
  const { orgData, history360, loading } = useData();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [revision, setRevision] = useState(0);

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

  const snapshot = useMemo(() => {
    void revision;
    return {
      leave: getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, []),
      training: getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []),
      development: getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []),
      notifications: getStorageData<any[]>(STORAGE_KEYS.NOTIFICATIONS, []),
    };
  }, [revision]);

  const role = currentUserRole;
  const has = (href: string) => Boolean(role && canAccessRoute(role, href));
  const pendingLeave = snapshot.leave.filter((row) => !isDone(row) && (isPending(row) || !row?.status)).length;
  const overdueDevelopment = snapshot.development.filter(isOverdue).length;
  const incompleteTraining = snapshot.training.filter((row) => !isDone(row)).length;
  const unreadNotifications = snapshot.notifications.filter((row) => row?.read !== true).length;
  const evaluatedNames = new Set((history360 || []).map((row: any) => String(row?.["Ad Soyad"] || row?.employee || row?.name || "")).filter(Boolean));
  const missingPerformance = Math.max(0, (orgData || []).filter((row: any) => !evaluatedNames.has(String(row?.["Ad Soyad"] || ""))).length);

  const tasks = useMemo<TaskCard[]>(() => {
    const candidates: TaskCard[] = [
      { title: "İzin taleplerini incele", description: "Bekleyen izinleri tek ekrandan onaylayın veya geri gönderin.", href: "/izinler", count: pendingLeave, icon: CalendarDays },
      { title: "Performans değerlendirmelerini tamamla", description: "Henüz değerlendirme kaydı olmayan çalışanları gözden geçirin.", href: "/degerlendirme", count: missingPerformance, icon: Target },
      { title: "Geciken gelişim planlarını gözden geçir", description: "Son tarihi geçen açık gelişim aksiyonlarını kapatın veya güncelleyin.", href: "/gelisim", count: overdueDevelopment, icon: Clock3 },
      { title: "Eğitim takibini tamamla", description: "Devam eden eğitim atamalarını ve tamamlanma durumlarını kontrol edin.", href: "/egitim", count: incompleteTraining, icon: BookOpenCheck },
    ];
    return candidates.filter((item) => has(item.href)).sort((a, b) => b.count - a.count).slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, pendingLeave, missingPerformance, overdueDevelopment, incompleteTraining]);

  const quickActions = useMemo<ActionCard[]>(() => {
    const executive: ActionCard[] = [
      { title: "Çalışan ekle", description: "Yeni çalışan veya organizasyon kaydı oluşturun.", href: "/organizasyon", icon: Plus },
      { title: "İzin işlemleri", description: "Talep, onay ve bakiye işlemlerine gidin.", href: "/izinler", icon: CalendarDays },
      { title: "Performans değerlendir", description: "Dönem ve çalışan değerlendirmelerini yönetin.", href: "/degerlendirme", icon: Target },
      { title: "Rapor al", description: "Yönetim özetleri ve karar raporlarını açın.", href: "/yonetici-raporlari", icon: FileText },
    ];
    const manager: ActionCard[] = [
      { title: "Ekibimi gör", description: "Doğrudan ekibinizi ve açık aksiyonları görün.", href: "/ekip-yonetimi", icon: Users },
      { title: "İzinleri yönet", description: "Ekip izin taleplerini inceleyin.", href: "/izinler", icon: CalendarDays },
      { title: "Performans değerlendir", description: "Ekibinizin dönem değerlendirmelerini tamamlayın.", href: "/degerlendirme", icon: Target },
      { title: "Gelişimi takip et", description: "Gelişim planı ve eğitim durumlarını görün.", href: "/gelisim", icon: BookOpenCheck },
    ];
    const base = role === "ceo" || role === "hr_admin" ? executive : manager;
    return base.filter((item) => has(item.href)).slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (loading) {
    return <main className="mx-auto max-w-[1560px] space-y-4 pb-8" aria-busy="true"><div className="h-40 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"/><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((item)=><div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800"/>)}</div></main>;
  }

  const needsSetup = (orgData || []).length === 0;
  const attentionCount = tasks.reduce((sum, task) => sum + task.count, 0) + unreadNotifications;

  return (
    <main className="mx-auto max-w-[1560px] space-y-5 pb-8" data-testid="zero-training-dashboard">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-teal-700 dark:text-teal-300">Ana Sayfa</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-white">{firstName(userName) ? `Merhaba ${firstName(userName)}` : "Yönetici Özeti"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {needsSetup
                ? "FutureHR'ı kullanmaya başlamak için önce çalışan verinizi ekleyin. Sistem sizi adım adım yönlendirecek."
                : attentionCount > 0
                  ? `Bugün ilgilenmeniz gereken ${attentionCount} açık işlem var. Önce aşağıdaki bekleyen işleri tamamlayabilirsiniz.`
                  : "Bugün bekleyen kritik bir işlem görünmüyor. Hızlı işlemlerden yeni bir çalışma başlatabilirsiniz."}
            </p>
            {role && <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/>{roleLabel(role)} görünümü</div>}
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40"><p className="text-[10px] font-semibold text-slate-500">Açık işler</p><strong className="mt-1 block text-2xl text-slate-950 dark:text-white">{attentionCount}</strong></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40"><p className="text-[10px] font-semibold text-slate-500">Çalışan</p><strong className="mt-1 block text-2xl text-slate-950 dark:text-white">{orgData.length}</strong></div>
          </div>
        </div>
      </section>

      {needsSetup ? (
        <section className="rounded-[24px] border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20" data-testid="getting-started-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-indigo-700 dark:text-indigo-300">İlk Kurulum</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">4 adımda kullanıma başlayın</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Teknik ayarlarla uğraşmadan önce temel şirket verinizi hazırlayın.</p></div>
            {has("/admin/veri-aktarimi") && <Link href="/admin/veri-aktarimi" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm">Çalışanları ekle<ArrowRight className="h-4 w-4"/></Link>}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">{[
            ["1", "Çalışanları ekle", "Excel/CSV ile toplu aktarın veya organizasyon ekranından başlayın."],
            ["2", "Organizasyonu kontrol et", "Departman, pozisyon ve yönetici ilişkilerini doğrulayın."],
            ["3", "İlk dönemi başlat", "Performans ve gelişim dönemlerinizi oluşturun."],
            ["4", "Kullanmaya başla", "Bekleyen işler ana sayfada otomatik görünür."],
          ].map(([step,title,description])=><div key={step} className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{step}</span><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{description}</p></div>)}</div>
        </section>
      ) : (
        <section aria-labelledby="today-title">
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Bugün</p><h2 id="today-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Bekleyen işler</h2></div><p className="hidden text-xs text-slate-500 sm:block">Önce sayı görünen işlemleri tamamlayın.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {tasks.map((task) => {
              const Icon = task.icon;
              const clear = task.count === 0;
              return <Link key={task.title} href={task.href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${clear ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30"}`}><Icon className="h-4.5 w-4.5"/></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${clear ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"}`}>{clear ? "Tamam" : `${task.count} bekliyor`}</span></div>
                <h3 className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">{task.title}</h3><p className="mt-1.5 min-h-10 text-[11px] leading-5 text-slate-500">{clear ? "Şu anda bu alanda bekleyen işlem yok." : task.description}</p><span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">{clear ? "Ekranı aç" : "İncele"}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"/></span>
              </Link>;
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="quick-title">
        <div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Kısayollar</p><h2 id="quick-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Hızlı işlemler</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{quickActions.map((action)=>{const Icon=action.icon;return <Link key={action.title} href={action.href} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon className="h-4.5 w-4.5"/></span><span className="min-w-0 flex-1"><strong className="block text-sm font-semibold text-slate-950 dark:text-white">{action.title}</strong><small className="mt-1 block text-[10px] leading-4 text-slate-500">{action.description}</small></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"/></Link>;})}</div>
      </section>

      {(role === "ceo" || role === "hr_admin" || role === "director" || role === "manager") && (
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <button type="button" onClick={()=>setShowAnalytics((value)=>!value)} aria-expanded={showAnalytics} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"><BarChart3 className="h-4.5 w-4.5"/></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold">Detaylı şirket göstergeleri</strong><small className="mt-1 block text-[10px] leading-4 text-slate-500">Grafikler, trendler ve ileri seviye karar göstergeleri. Günlük kullanım için açmanız gerekmez.</small></span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showAnalytics ? "rotate-180" : ""}`}/>
          </button>
          {showAnalytics && <div className="border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5"><PremiumExecutiveDashboard/></div>}
        </section>
      )}

      {(role === "ceo" || role === "hr_admin") && has("/kurulum") && <div className="flex justify-end"><Link href="/kurulum" className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><Settings2 className="h-3.5 w-3.5"/>Şirket ve sistem ayarları</Link></div>}
    </main>
  );
}
