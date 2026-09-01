"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Crown,
  Eye,
  EyeOff,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { USERS } from "../data/users";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../utils/storage";
import { applyFutureHRV1DemoData } from "@/lib/hr/demoV1";
import { DEMO_PERSONAS } from "@/lib/hr/demoPersonas";

const workspaceCards = [
  { title: "İnsan & Organizasyon", icon: Building2 },
  { title: "Performans & Yetenek", icon: TrendingUp },
  { title: "Gelişim & Kariyer", icon: GraduationCap },
  { title: "Ücret & İşe Alım", icon: BriefcaseBusiness },
  { title: "Halefiyet", icon: Crown },
] as const;

const metricCards = [
  {
    label: "Karar Güveni",
    value: "%86",
    detail: "Kanıt + yönetici gözlemi",
    icon: ShieldCheck,
    accent: "from-blue-600 to-indigo-600",
    soft: "from-blue-50 to-indigo-50",
  },
  {
    label: "Ücret Simülasyonu",
    value: "4 Senaryo",
    detail: "Bütçe ve benchmark birlikte",
    icon: WalletCards,
    accent: "from-emerald-500 to-teal-600",
    soft: "from-emerald-50 to-teal-50",
  },
  {
    label: "İç Mobilite",
    value: "%34",
    detail: "Hazır çalışan havuzu",
    icon: MapPin,
    accent: "from-violet-500 to-fuchsia-600",
    soft: "from-violet-50 to-fuchsia-50",
  },
  {
    label: "Çalışma Alanı",
    value: "5",
    detail: "Modül değil iş akışı dili",
    icon: LayoutDashboard,
    accent: "from-amber-500 to-orange-500",
    soft: "from-amber-50 to-orange-50",
  },
] as const;

const flowItems = [
  {
    title: "Gelişim kararı hazır",
    text: "Rol-yetkinlik farkı netleştirildi.",
    tone: "bg-blue-500",
  },
  {
    title: "Kalibrasyon uyarısı",
    text: "3 kayıt insan değerlendirmesi bekliyor.",
    tone: "bg-amber-500",
  },
  {
    title: "Ücret senaryosu hazır",
    text: "Bütçe etkisi ve piyasa uyumu oluşturuldu.",
    tone: "bg-emerald-500",
  },
] as const;

function WorkspacePill({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-[#2943d3]">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[-0.01em] text-slate-800">{title}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Çalışma alanı</p>
        </div>
      </div>
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
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#eef4ff_0%,#f6f8fc_42%,#f4f7fb_100%)] p-3 text-slate-950 sm:p-4 lg:p-5">
      <div className="relative mx-auto flex min-h-[calc(100vh-24px)] max-w-[1600px] overflow-hidden rounded-[34px] border border-white/60 bg-white/78 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:min-h-[calc(100vh-32px)] lg:min-h-[calc(100vh-40px)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[38%] bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(124,58,237,0.08)_38%,rgba(16,185,129,0.06)_72%,rgba(255,255,255,0)_100%)]" />
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="absolute left-[42%] top-[64%] h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />
          <div className="absolute right-[-3%] top-[10%] h-80 w-80 rounded-full bg-violet-300/18 blur-3xl" />
          <div className="absolute bottom-[-8%] right-[20%] h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
        </div>

        <div className="relative z-10 grid w-full gap-6 px-5 py-5 sm:px-7 sm:py-6 xl:grid-cols-[1.18fr_0.82fr] xl:gap-8 xl:px-8 xl:py-7">
          <section className="flex min-h-0 flex-col">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="select-none text-[40px] font-bold lowercase leading-[0.88] tracking-[-0.065em] text-[#2842d6] sm:text-[48px] xl:text-[54px]">
                  future hr
                </div>
                <p className="mt-2 text-[13px] font-medium text-slate-500 sm:text-[14px]">
                  İnsan kararlarını daha net, daha adil ve daha anlatılabilir hale getirin.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-sm">
                  <HeartHandshake className="h-4 w-4 text-rose-500" /> İnsan merkezli SaaS
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/90 px-3 py-2 text-[11px] font-medium text-blue-700 shadow-sm">
                  <Sparkles className="h-4 w-4" /> Sistem önerir, kararı insan verir
                </span>
              </div>
            </header>

            <div className="mt-5 grid min-h-0 flex-1 gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="flex min-h-0 flex-col justify-between rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,255,0.9)_58%,rgba(238,245,255,0.96))] p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] xl:p-7">
                <div>
                  <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-700">
                    Premium people intelligence platform
                  </span>
                  <h1 className="mt-4 max-w-[640px] text-[32px] font-semibold leading-[1.08] tracking-[-0.05em] text-slate-950 sm:text-[38px] xl:text-[46px]">
                    Performans, gelişim, ücret ve işe alım kararlarını
                    <span className="bg-[linear-gradient(135deg,#2842d6,#5d63ff_45%,#1f9db1)] bg-clip-text text-transparent"> tek ekranda başlayan</span> bir premium SaaS deneyimine dönüştürün.
                  </h1>
                  <p className="mt-4 max-w-[620px] text-[15px] leading-7 text-slate-600 xl:text-[16px]">
                    FutureHR veriyi gösteren bir panel değil; yöneticinin neye bakacağını, hangi kararı neden vereceğini ve sonraki adımın ne olduğunu açıkça gösteren modern bir çalışma alanıdır.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      disabled={loading}
                      className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[linear-gradient(135deg,#10255a,#2842d6)] px-6 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(40,66,214,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(40,66,214,0.28)] disabled:cursor-wait disabled:opacity-70"
                    >
                      {loading ? "Demo hazırlanıyor..." : "V1 Demo'yu Aç"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById("username")?.focus()}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Kurumsal Giriş
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:mt-8">
                  {metricCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`rounded-[24px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.8))] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)]`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
                            <p className="mt-1.5 text-[24px] font-semibold tracking-[-0.04em] text-slate-900">{item.value}</p>
                          </div>
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.soft} text-slate-700`}>
                            <Icon className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${item.accent}`}
                            style={{ width: item.label === "Karar Güveni" ? "86%" : item.label === "Ücret Simülasyonu" ? "74%" : item.label === "İç Mobilite" ? "34%" : "92%" }}
                          />
                        </div>
                        <p className="mt-2.5 text-[11px] leading-5 text-slate-500">{item.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-4">
                <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(248,250,255,0.92),rgba(255,255,255,0.82))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] xl:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Günün karar akışı</p>
                      <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-slate-900">Demo başlar başlamaz ürün değerini gösterin</h2>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-medium text-slate-500">V1 hazır</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {flowItems.map((item) => (
                      <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-3 shadow-sm">
                        <div className={`h-10 w-1 rounded-full ${item.tone}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-800">{item.title}</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.text}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(249,250,255,0.96))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] xl:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Çalışma alanları</p>
                      <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-slate-900">Modül listesi değil, iş akışı mantığı</h2>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {workspaceCards.map((item) => (
                      <WorkspacePill key={item.title} title={item.title} icon={item.icon} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,251,255,0.93))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:p-6 xl:p-7">
            <div className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(39,67,211,0.06),rgba(16,185,129,0.04),rgba(255,255,255,0.72))] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Kurumsal giriş</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.045em] text-[#122041]">FutureHR çalışma alanı</h2>
              <p className="mt-2 text-[12px] leading-6 text-slate-500">
                Sunum için demo erişimi hazırdır. Kurumsal giriş alanı gerçek kullanıcı, veri güvenliği ve yetki mimarisi için korunur.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">İnsan odaklı</p>
                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-700">AI öneri üretir; son karar yöneticide ve İK ekibinde kalır.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Güvenli erişim</p>
                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-700">Demo akışı ile canlı kullanım erişimi birbirinden ayrıştırılır.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 flex-1 space-y-4">
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#10255a,#2842d6)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(40,66,214,0.18)] transition hover:shadow-[0_18px_32px_rgba(40,66,214,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[11px] text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />veya<div className="h-px flex-1 bg-slate-200" />
            </div>

            <Link href="/aday-girisi" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-blue-600 transition hover:bg-blue-50">
              <span className="flex items-center gap-2"><CircleUserRound className="h-4 w-4" /> Aday girişi</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
