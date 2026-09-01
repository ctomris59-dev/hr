"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Crown,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { USERS } from "../data/users";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../utils/storage";
import { applyFutureHRV1DemoData } from "@/lib/hr/demoV1";
import { DEMO_PERSONAS } from "@/lib/hr/demoPersonas";

const stats = [
  {
    label: "Karar güveni",
    value: "%86",
    note: "Kanıt, yönetici gözlemi ve veri kalitesi birlikte değerlendirilir.",
    icon: ShieldCheck,
    tone: "blue",
  },
  {
    label: "Ücret simülasyonu",
    value: "4 senaryo",
    note: "Bütçe etkisi ve benchmark tek ekranda karşılaştırılır.",
    icon: WalletCards,
    tone: "emerald",
  },
  {
    label: "İç mobilite",
    value: "%34",
    note: "Hazır çalışan havuzu ve kariyer geçişleri görünür hale gelir.",
    icon: MapPin,
    tone: "violet",
  },
  {
    label: "Yönetici kapsaması",
    value: "5 alan",
    note: "İnsan, yetenek, gelişim, ücret ve işe alım tek dilde yönetilir.",
    icon: LayoutDashboard,
    tone: "amber",
  },
] as const;

const workspaces = [
  {
    title: "İnsan & Organizasyon",
    text: "Çalışan yapısı, ekip görünümü ve operasyon akışını sade biçimde yönetin.",
    icon: Building2,
  },
  {
    title: "Performans & Yetenek",
    text: "Skorları, kalibrasyonu ve 9-Box dağılımını tek karar zincirinde görün.",
    icon: TrendingUp,
  },
  {
    title: "Gelişim & Kariyer",
    text: "Gelişim aksiyonlarını, eğitimleri ve kariyer readiness seviyesini aynı akışta yönetin.",
    icon: GraduationCap,
  },
  {
    title: "Ücret & İşe Alım",
    text: "Ücret kararları, bütçe senaryoları ve aday kalitesini birlikte değerlendirin.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Halefiyet & Süreklilik",
    text: "Kritik roller için hazır adayları ve organizasyon risklerini erken görün.",
    icon: Crown,
  },
] as const;

const decisionFlow = [
  {
    title: "Ayşe Kaya için gelişim adımı",
    text: "Rol-yetkinlik farkı ve yönetici doğrulamasıyla gelişim önerisi üretildi.",
    icon: Users,
    tone: "blue",
  },
  {
    title: "Kalibrasyon uyarısı",
    text: "3 kayıt için KPI ile yönetici değerlendirmesi arasında fark tespit edildi.",
    icon: BarChart3,
    tone: "amber",
  },
  {
    title: "Ücret senaryosu hazır",
    text: "Piyasa referansı ve bütçe etkisiyle karar vermeye hazır karşılaştırma oluştu.",
    icon: WalletCards,
    tone: "emerald",
  },
] as const;

function toneStyles(tone: string) {
  if (tone === "emerald") {
    return {
      soft: "bg-emerald-50 text-emerald-700",
      icon: "bg-emerald-100 text-emerald-700",
      border: "border-emerald-100",
      line: "bg-emerald-500",
    };
  }
  if (tone === "violet") {
    return {
      soft: "bg-violet-50 text-violet-700",
      icon: "bg-violet-100 text-violet-700",
      border: "border-violet-100",
      line: "bg-violet-500",
    };
  }
  if (tone === "amber") {
    return {
      soft: "bg-amber-50 text-amber-700",
      icon: "bg-amber-100 text-amber-700",
      border: "border-amber-100",
      line: "bg-amber-500",
    };
  }
  return {
    soft: "bg-blue-50 text-blue-700",
    icon: "bg-blue-100 text-blue-700",
    border: "border-blue-100",
    line: "bg-blue-500",
  };
}

function FeatureCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-[#2643d2]">
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.015em] text-slate-900">{title}</h3>
      <p className="mt-2 text-[13px] leading-6 text-slate-500">{text}</p>
    </div>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const existingUsers = getStorageData(STORAGE_KEYS.USERS, {});
    setStorageData(STORAGE_KEYS.USERS, { ...existingUsers, ...USERS });
  }, []);

  const loginAs = (nextUsername: string, nextPassword: string, forceDemoSeed = false) => {
    const users = { ...getStorageData(STORAGE_KEYS.USERS, {}), ...USERS };
    const user = users[nextUsername];

    if (!user || user.password !== nextPassword) {
      setError("Kullanıcı adı veya şifre hatalı.");
      return false;
    }

    const userData = { username: nextUsername, ...user, authMode: "demo" as const };
    setStorageData(STORAGE_KEYS.CURRENT_USER, userData);

    const hasOrgData = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []).length > 0;
    if (forceDemoSeed || !hasOrgData) {
      applyFutureHRV1DemoData(DEMO_PERSONAS.ceo);
    }

    window.dispatchEvent(new CustomEvent("userChanged", { detail: userData }));
    router.push("/dashboard");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    loginAs(username, password);
    setLoading(false);
  };

  const handleDemoLogin = () => {
    setError("");
    setLoading(true);
    setUsername("ceo");
    setPassword("123");
    loginAs("ceo", "123", true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 text-slate-950 sm:p-5">
      <div className="relative mx-auto max-w-[1560px] overflow-hidden rounded-[32px] border border-slate-200/90 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.07)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.09),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.06),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,0.95),_rgba(255,255,255,0.96))]" />
          <div className="absolute -left-10 top-24 h-40 w-40 rounded-full bg-blue-100/50 blur-3xl" />
          <div className="absolute right-8 top-28 h-48 w-48 rounded-full bg-violet-100/40 blur-3xl" />
        </div>

        <div className="relative z-10 border-b border-slate-100 px-6 py-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="select-none text-[42px] font-bold lowercase leading-[0.9] tracking-[-0.065em] text-[#2842d6] sm:text-[52px]">
                future hr
              </div>
              <p className="mt-2 text-sm font-medium text-slate-500">İnsan kararlarını daha net, daha adil ve daha anlatılabilir hale getirin.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 shadow-sm">
                <Heart className="h-4 w-4 text-rose-500" /> İnsan odaklı SaaS deneyimi
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 shadow-sm">
                <Sparkles className="h-4 w-4" /> Sistem önerir, kararı insan verir
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-10 lg:py-10">
          <section className="min-w-0">
            <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
              People intelligence platform
            </span>
            <h1 className="mt-4 max-w-[760px] text-[34px] font-semibold tracking-[-0.045em] text-slate-950 sm:text-[44px] sm:leading-[1.08]">
              Performans, yetenek, gelişim, ücret ve işe alımı
              <span className="text-[#2842d6]"> tek bir çalışma alanında</span> yönetin.
            </h1>
            <p className="mt-5 max-w-[720px] text-[16px] leading-8 text-slate-600 sm:text-[18px]">
              FutureHR; yöneticilere sadece veri sunmaz. Hangi kararı neden vereceğinizi görünür hale getirir. Karmaşık İK süreçlerini daha sade, daha güvenli ve daha insani bir ürün deneyimine dönüştürür.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "5 ana çalışma alanı",
                "Yönetici diline uygun ekranlar",
                "Simülasyon ve karar desteği",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[#10255a] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(16,37,90,0.18)] transition hover:-translate-y-0.5 hover:bg-[#14316f] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? "Demo hazırlanıyor..." : "V1 Demo'yu Aç"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("username")?.focus()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Kurumsal Giriş
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {stats.map((item) => {
                const Icon = item.icon;
                const tone = toneStyles(item.tone);
                return (
                  <div key={item.label} className={`rounded-[22px] border ${tone.border} bg-white/95 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500">{item.label}</p>
                        <p className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-slate-900">{item.value}</p>
                      </div>
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${tone.line}`} style={{ width: item.label === "Karar güveni" ? "86%" : item.label === "Ücret simülasyonu" ? "72%" : item.label === "İç mobilite" ? "34%" : "88%" }} />
                    </div>
                    <p className="mt-3 text-[12px] leading-5 text-slate-500">{item.note}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-[26px] border border-slate-200 bg-[#fbfcfe] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Günün karar akışı</p>
                  <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-slate-900">Sistemin değerini ilk bakışta anlatan iş akışları</h2>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 sm:inline-flex">Demo verisiyle hazır</span>
              </div>
              <div className="mt-5 space-y-3">
                {decisionFlow.map((item) => {
                  const Icon = item.icon;
                  const tone = toneStyles(item.tone);
                  return (
                    <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className={`h-12 w-1 rounded-full ${tone.line}`} />
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-slate-800">{item.title}</p>
                        <p className="mt-1 text-[12px] leading-5 text-slate-500">{item.text}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="min-w-0">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-8">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-600">Kurumsal giriş</p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[#101d3b]">FutureHR çalışma alanı</h2>
                <p className="mt-3 text-[13px] leading-6 text-slate-500">
                  Sunumlar için demo erişimi korunur. Gerçek kullanımda kurum hesabı, çalışan verisi ve kullanıcı yetkileri ayrı şekilde yönetilir.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2842d6] shadow-sm">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">Yapay değil, insan merkezli deneyim</p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">Sistem otomatik öneri üretir; son karar her zaman yönetici ve İK ekiplerinde kalır.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="username" className="mb-2 block text-xs font-semibold text-slate-700">Kullanıcı Adı</label>
                  <div className="relative">
                    <CircleUserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="Kullanıcı adınızı girin"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-xs font-semibold text-slate-700">Şifre</label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Şifrenizi girin"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700">{error}</div> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10255a] px-4 text-sm font-semibold text-white transition hover:bg-[#14316f] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3 text-[11px] text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />veya<div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link href="/aday-girisi" className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-blue-600 transition hover:bg-blue-50">
                <span className="flex items-center gap-2"><CircleUserRound className="h-4 w-4" /> Aday girişi</span>
                <ChevronRight className="h-4 w-4" />
              </Link>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Demo kullanımı</p>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-slate-700">"V1 Demo'yu Aç" akışı sahneye hazır veri üretir ve ürün anlatımını kolaylaştırır.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Kurumsal güven</p>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-slate-700">Gerçek kullanıcı, veri güvenliği ve yetki kurgusu demo erişiminden ayrı tutulur.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="relative z-10 border-t border-slate-100 bg-[#fbfcfe] px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Çalışma alanları</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">Sistemi modül listesiyle değil, karar akışıyla anlatın</h2>
              <p className="mt-2 max-w-[720px] text-[14px] leading-7 text-slate-500">
                FutureHR, firmaya ekran ekran değil; insan, yetenek, gelişim, ücret ve işe alım kararlarını birleştiren premium bir SaaS çalışma alanı olarak sunulur.
              </p>
            </div>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 shadow-sm">Premium, sade ve anlatılabilir arayüz</span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {workspaces.map((item) => (
              <FeatureCard key={item.title} icon={item.icon} title={item.title} text={item.text} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
