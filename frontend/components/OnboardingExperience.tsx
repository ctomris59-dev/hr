"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Circle, Sparkles, UsersRound, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import {
  DEFAULT_COMPANY_ONBOARDING,
  readOnboardingBundle,
  saveUserOnboarding,
  type CompanyOnboardingState,
  type UserOnboardingState,
} from "@/lib/hr/onboardingState";

type Step = { label: string; description: string; href?: string };
type Experience = {
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  steps: Step[];
  trackedRoutes: string[];
};

const EXPERIENCES: Record<string, Experience> = {
  executive: {
    eyebrow: "İlk kurulum",
    title: "FutureHR'a hoş geldiniz",
    body: "Şirketinizi yaklaşık 10 dakikada kullanıma hazırlayın. İsterseniz önce sistemi inceleyip kuruluma daha sonra devam edebilirsiniz.",
    primaryLabel: "Kuruluma başla",
    primaryHref: "/kurulum",
    trackedRoutes: [],
    steps: [
      { label: "Şirketinizi tanımlayın", description: "Temel şirket ve lokasyon bilgilerini girin." },
      { label: "Çalışan listenizi yükleyin", description: "Excel / CSV ile hızlıca başlayın." },
      { label: "Organizasyonu kontrol edin", description: "Departman, pozisyon ve yönetici ilişkilerini doğrulayın." },
      { label: "İlk dönemleri hazırlayın", description: "Performans ve ücret süreçlerini başlatın." },
      { label: "Yetki ve gizliliği doğrulayın", description: "Erişim kapsamını ve KVKK kontrollerini gözden geçirin." },
    ],
  },
  manager: {
    eyebrow: "Yönetici başlangıcı",
    title: "Ekibinizi 3 adımda tanıyın",
    body: "FutureHR size yalnızca yetkiniz dahilindeki ekibi ve kararları gösterir. İlk birkaç dakikada günlük kullanım akışınızı keşfedin.",
    primaryLabel: "Ekibimi aç",
    primaryHref: "/ekip-yonetimi",
    trackedRoutes: ["/ekip-yonetimi", "/degerlendirme", "/izinler"],
    steps: [
      { label: "Ekibinizi görün", description: "Çalışanlarınızı ve açık aksiyonları kontrol edin.", href: "/ekip-yonetimi" },
      { label: "Performansı keşfedin", description: "Dönem değerlendirmelerinin nereden yapıldığını görün.", href: "/degerlendirme" },
      { label: "Bekleyen işleri yönetin", description: "İzin ve günlük yönetici işlemlerini inceleyin.", href: "/izinler" },
    ],
  },
  employee: {
    eyebrow: "Kişisel başlangıç",
    title: "FutureHR'a hoş geldiniz",
    body: "Kendi iş yaşamınızla ilgili alanları birkaç adımda keşfedin. Şirket yönetim ekranları yerine yalnızca size açık kişisel deneyimi göreceksiniz.",
    primaryLabel: "Benim Alanıma git",
    primaryHref: "/kullanici",
    trackedRoutes: ["/kullanici", "/izinler", "/kariyer"],
    steps: [
      { label: "Profilinizi kontrol edin", description: "Pozisyon, departman ve yönetici bilginizi görün.", href: "/kullanici" },
      { label: "Günlük işlemlerinizi bulun", description: "İzin bakiyesi ve taleplerinize ulaşın.", href: "/izinler" },
      { label: "Kariyer alanınızı keşfedin", description: "Hedef rol ve gelişim alanlarınızı görün.", href: "/kariyer" },
    ],
  },
};

function roleKind(role: string | null) {
  if (role === "ceo" || role === "hr_admin") return "executive";
  if (role === "director" || role === "manager") return "manager";
  return "employee";
}

function currentUser() {
  return getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
}

function pathDone(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function OnboardingExperience() {
  const pathname = decodeURIComponent(usePathname() || "/");
  const router = useRouter();
  const { currentUserRole, authReady } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState<CompanyOnboardingState>(DEFAULT_COMPANY_ONBOARDING);
  const [personal, setPersonal] = useState<UserOnboardingState | null>(null);
  const [orgCount, setOrgCount] = useState(0);
  const kind = roleKind(currentUserRole);
  const experience = EXPERIENCES[kind];

  const refresh = async () => {
    const user = currentUser();
    if (!user) return;
    try {
      const bundle = await readOnboardingBundle(user);
      setCompany(bundle.company);
      setPersonal(bundle.user);
      setOrgCount(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []).length);
      setOpen(!bundle.user || bundle.user.status === "new");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    if (!authReady || !currentUserRole) return;
    void refresh();
    const sync = () => void refresh();
    window.addEventListener("userChanged", sync);
    window.addEventListener("saasStorageHydrated", sync);
    window.addEventListener("onboardingUpdated", sync);
    window.addEventListener("dataUpdated", sync);
    return () => {
      window.removeEventListener("userChanged", sync);
      window.removeEventListener("saasStorageHydrated", sync);
      window.removeEventListener("onboardingUpdated", sync);
      window.removeEventListener("dataUpdated", sync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, currentUserRole]);

  useEffect(() => {
    if (!loaded || !personal || !experience.trackedRoutes.length) return;
    const route = experience.trackedRoutes.find((candidate) => pathDone(pathname, candidate));
    if (!route || personal.completedRoutes.includes(route)) return;
    const completedRoutes = Array.from(new Set([...personal.completedRoutes, route]));
    const complete = experience.trackedRoutes.every((candidate) => completedRoutes.includes(candidate));
    const next: UserOnboardingState = {
      ...personal,
      completedRoutes,
      status: complete ? "completed" : personal.status === "new" ? "started" : personal.status,
      completedAt: complete ? new Date().toISOString() : personal.completedAt,
    };
    setPersonal(next);
    void saveUserOnboarding(currentUser(), next).then((saved) => {
      setPersonal(saved);
      window.dispatchEvent(new CustomEvent("onboardingUpdated"));
    }).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, loaded]);

  const begin = async () => {
    const user = currentUser();
    const now = new Date().toISOString();
    const next = await saveUserOnboarding(user, {
      ...(personal || {}),
      status: "started",
      completedRoutes: personal?.completedRoutes || [],
      seenAt: personal?.seenAt || now,
      startedAt: personal?.startedAt || now,
    }).catch(() => null);
    if (next) setPersonal(next);
    setOpen(false);
    router.push(experience.primaryHref);
  };

  const explore = async () => {
    const user = currentUser();
    const now = new Date().toISOString();
    const next = await saveUserOnboarding(user, {
      ...(personal || {}),
      status: "exploring",
      completedRoutes: personal?.completedRoutes || [],
      seenAt: personal?.seenAt || now,
    }).catch(() => null);
    if (next) setPersonal(next);
    setOpen(false);
  };

  const companyDone = new Set(company.completedSteps || []);
  if (orgCount > 0) companyDone.add(1);
  const companySteps = [0, 1, 2, 3, 4].map((step) => companyDone.has(step));
  const companyProgress = Math.round((companySteps.filter(Boolean).length / companySteps.length) * 100);
  const showCompanyCard = pathname === "/dashboard" && kind === "executive" && !company.completedAt;
  const showPersonalCard = pathname === "/dashboard" && kind !== "executive" && personal?.status !== "completed";

  const personalProgress = useMemo(() => {
    if (!experience.trackedRoutes.length) return 0;
    const completed = personal?.completedRoutes || [];
    return Math.round((experience.trackedRoutes.filter((route) => completed.includes(route)).length / experience.trackedRoutes.length) * 100);
  }, [experience.trackedRoutes, personal]);

  if (!authReady || !currentUserRole) return null;

  return <>
    {(showCompanyCard || showPersonalCard) && (
      <section className="mx-auto mb-5 w-full max-w-[1560px] rounded-[24px] border border-indigo-200 bg-[linear-gradient(135deg,rgba(238,242,255,.96),rgba(255,255,255,.98))] p-5 shadow-sm dark:border-indigo-900/50 dark:bg-[linear-gradient(135deg,rgba(30,27,75,.45),rgba(15,23,42,.96))]" data-testid="onboarding-progress-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white"><Sparkles className="h-4 w-4"/></span><p className="text-[10px] font-bold uppercase tracking-[.12em] text-indigo-700 dark:text-indigo-300">{showCompanyCard ? "FutureHR kurulumu" : "İlk adımlar"}</p></div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{showCompanyCard ? `Kurulum %${companyProgress} tamamlandı` : `FutureHR keşfi %${personalProgress} tamamlandı`}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{showCompanyCard ? "Kurulum bitene kadar bu kart burada kalır; yarım bıraktığınız yerden devam edebilirsiniz." : "Üç temel alanı bir kez ziyaret ettiğinizde bu başlangıç kartı otomatik kapanır."}</p>
          </div>
          <div className="flex min-w-[240px] flex-col gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${showCompanyCard ? companyProgress : personalProgress}%` }}/></div>
            <Link href={showCompanyCard ? "/kurulum" : experience.primaryHref} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm">{showCompanyCard ? "Kuruluma devam et" : "Sonraki adıma git"}<ArrowRight className="h-3.5 w-3.5"/></Link>
          </div>
        </div>
        <div className={`mt-4 grid gap-2 ${showCompanyCard ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
          {(showCompanyCard ? [
            ["Şirket", companySteps[0]], ["Çalışanlar", companySteps[1]], ["Organizasyon", companySteps[2]], ["Dönemler", companySteps[3]], ["Yetki & KVKK", companySteps[4]],
          ] : experience.steps.map((step, index) => [step.label, Boolean(personal?.completedRoutes.includes(experience.trackedRoutes[index]))] as [string, boolean])).map(([label, done]) => (
            <div key={String(label)} className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3 py-2.5 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
              {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600"/> : <Circle className="h-4 w-4 shrink-0 text-slate-300"/>}<span className="truncate">{String(label)}</span>
            </div>
          ))}
        </div>
      </section>
    )}

    {open && loaded && (
      <div className="fixed inset-0 z-[2147482500] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="futurehr-onboarding-title">
        <button type="button" aria-label="Karşılama penceresini kapat" onClick={() => void explore()} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"/>
        <section className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_110px_rgba(15,23,42,.30)] dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,.14),transparent_42%)] p-6 dark:border-slate-800 sm:p-7">
            <button type="button" onClick={() => void explore()} aria-label="Kapat" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4"/></button>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><Sparkles className="h-5 w-5"/></span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[.14em] text-indigo-600">{experience.eyebrow}</p>
            <h2 id="futurehr-onboarding-title" className="mt-1 text-2xl font-semibold tracking-[-.03em] text-slate-950 dark:text-white">{experience.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{experience.body}</p>
          </div>
          <div className="space-y-2.5 p-6 sm:p-7">
            {experience.steps.map((step, index) => (
              <div key={step.label} className="flex gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">{index + 1}</span>
                <div className="min-w-0"><h3 className="text-sm font-semibold text-slate-950 dark:text-white">{step.label}</h3><p className="mt-0.5 text-[11px] leading-5 text-slate-500">{step.description}</p></div>
              </div>
            ))}
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => void explore()} className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Önce sistemi incelemek istiyorum</button>
            <button type="button" onClick={() => void begin()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm">{experience.primaryLabel}<ArrowRight className="h-3.5 w-3.5"/></button>
          </footer>
        </section>
      </div>
    )}
  </>;
}
