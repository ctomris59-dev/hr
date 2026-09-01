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
  { label: "Karar Güveni", value: "%86", detail: "Kanıt + yönetici gözlemi", icon: ShieldCheck, gradient: "from-blue-600 to-indigo-600", soft: "from-blue-50 to-indigo-50" },
  { label: "Ücret Simülasyonu", value: "4 Senaryo", detail: "Bütçe + benchmark", icon: WalletCards, gradient: "from-emerald-500 to-teal-600", soft: "from-emerald-50 to-teal-50" },
  { label: "İç Mobilite", value: "%34", detail: "Hazır çalışan havuzu", icon: MapPin, gradient: "from-violet-500 to-fuchsia-600", soft: "from-violet-50 to-fuchsia-50" },
  { label: "Çalışma Alanı", value: "5", detail: "İş akışı odaklı yapı", icon: LayoutDashboard, gradient: "from-amber-500 to-orange-500", soft: "from-amber-50 to-orange-50" },
] as const;

const flowItems = [
  { title: "Gelişim kararı hazır", text: "Rol-yetkinlik farkı netleşti.", dot: "bg-blue-500" },
  { title: "Kalibrasyon uyarısı", text: "3 kayıt insan değerlendirmesi bekliyor.", dot: "bg-amber-500" },
  { title: "Ücret senaryosu hazır", text: "Bütçe ve piyasa uyumu karşılaştırıldı.", dot: "bg-emerald-500" },
] as const;

function WorkspacePill({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/70 bg-white/72 px-3 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#2943d3]">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </div>
      <span className="truncate text-[10.5px] font-semibold text-slate-700">{title}</span>
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
    if (forceDemoSeed || !hasOrgData) applyFutureHRV1DemoData(DEMO_PERSONAS.ceo);
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
    <main className="h-dvh max-h-dvh overflow-hidden bg-[linear-gradient(180deg,#eef4ff_0%,#f7f9fd_48%,#f3f6fb_100%)] p-2.5 text-slate-950 sm:p-3 lg:p-4">
      <div className="relative mx-auto h-full max-h-full max-w-[1620px] overflow-hidden rounded-[32px] border border-white/65 bg-white/78 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[42%] bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(124,58,237,0.085)_40%,rgba(20,184,166,0.065)_72%,rgba(255,255,255,0)_100%)]" />
          <div className="absolute -left-24 top-4 h-72 w-72 rounded-full bg-blue-300/22 blur-3xl" />
          <div className="absolute left-[44%] bottom-[-13%] h-80 w-80 rounded-full bg-cyan-200/24 blur-3xl" />
          <div className="absolute right-[-5%] top-[8%] h-80 w-80 rounded-full bg-violet-300/20 blur-3xl" />
          <div className="absolute bottom-[-16%] right-[8%] h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
        </div>

        <div className="relative z-10 grid h-full min-h-0 grid-cols-1 gap-4 p-4 xl:grid-cols-[1.23fr_0.77fr] xl:gap-5 xl:p-5">
          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
            <header className="flex items-start justify-between gap-4">
              <div>
                <div className="select-none text-[38px] font-bold lowercase leading-[0.88] tracking-[-0.065em] text-[#2842d6] 2xl:text-[46px]">future hr</div>
                <p className="mt-1.5 text-[12px] font-medium text-slate-500 2xl:text-[13px]">İnsan kararlarını daha net, daha adil ve daha anlatılabilir hale getirin.</p>
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/75 px-3 py-1.5 text-[10px] font-medium text-slate-600 shadow-sm">
                  <HeartHandshake className="h-3.5 w-3.5 text-rose-500" /> İnsan merkezli SaaS
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1.5 text-[10px] font-medium text-blue-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" /> Sistem önerir, kararı insan verir
                </span>
              </div>
            </header>

            <div className="grid min-h-0 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="grid min-h-0 grid-rows-[auto_auto_auto] content-between overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.93),rgba(248,250,255,0.9)_58%,rgba(238,245,255,0.96))] p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)] 2xl:p-6">
                <div>
                  <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-blue-700">People intelligence platform</span>
                  <h1 className="mt-3 max-w-[620px] text-[30px] font-semibold leading-[1.05] tracking-[-0.05em] text-slate-950 2xl:text-[40px]">
                    Performans, gelişim, ücret ve işe alım kararlarını
                    <span className="bg-[linear-gradient(135deg,#2842d6,#5d63ff_45%,#1f9db1)] bg-clip-text text-transparent"> tek çalışma alanında</span> yönetin.
                  </h1>
                  <p className="mt-3 max-w-[620px] text-[13px] leading-6 text-slate-600 2xl:text-[14px]">
                    FutureHR yalnızca veri göstermez; yöneticinin neye bakacağını, neden karar verdiğini ve sonraki adımı görünür hale getirir.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button type="button" onClick={handleDemoLogin} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#10255a,#2842d6)] px-5 text-[12px] font-semibold text-white shadow-[0_14px_28px_rgba(40,66,214,0.22)] transition hover:-translate-y-0.5 disabled:opacity-70">
                      {loading ? "Demo hazırlanıyor..." : "V1 Demo'yu Aç"}<ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => document.getElementById("username")?.focus()} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 text-[12px] font-semibold text-slate-700 shadow-sm">Kurumsal Giriş</button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {metricCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-[20px] border border-white/75 bg-white/88 p-3 shadow-[0_8px_18px_rgba(15,23,42,0.045)]">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[9.5px] font-semibold text-slate-500">{item.label}</p>
                            <p className="mt-1 text-[20px] font-semibold tracking-[-0.04em] text-slate-900 2xl:text-[22px]">{item.value}</p>
                          </div>
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.soft} text-slate-700`}><Icon className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-gradient-to-r ${item.gradient}`} style={{ width: item.label === "Karar Güveni" ? "86%" : item.label === "Ücret Simülasyonu" ? "74%" : item.label === "İç Mobilite" ? "34%" : "92%" }} /></div>
                        <p className="mt-2 text-[9.5px] leading-4 text-slate-500">{item.detail}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-5 gap-2">
                  {workspaceCards.map((item) => <WorkspacePill key={item.title} title={item.title} icon={item.icon} />)}
                </div>
              </div>

              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3.5 overflow-hidden">
                <div className="rounded-[26px] border border-white/70 bg-white/82 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">Günün karar akışı</p>
                      <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-slate-900">Ürün değerini ilk bakışta gösterin</h2>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-700">V1 hazır</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {flowItems.map((item) => (
                      <div key={item.title} className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5">
                        <div className={`h-8 w-1 rounded-full ${item.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-slate-800">{item.title}</p>
                          <p className="mt-0.5 truncate text-[9.5px] text-slate-500">{item.text}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 overflow-hidden rounded-[26px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(245,248,255,0.95))] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">Tek ürün hikâyesi</p>
                      <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-slate-900">Modül değil, karar akışı</h2>
                    </div>
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  </div>
                  <div className="mt-3 rounded-2xl border border-blue-100/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(245,243,255,0.9),rgba(236,253,245,0.85))] p-3.5">
                    <p className="text-[11px] font-semibold leading-5 text-slate-800">İnsan verisi → performans → yetenek → gelişim → ücret → işe alım</p>
                    <p className="mt-1 text-[9.5px] leading-4 text-slate-500">Her ekran tek bir soruya cevap verir; detay listeleri yalnızca işlem gerektiğinde açılır.</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {["Yönetici dilinde", "Kanıt zinciri", "Simülasyon odaklı", "İnsan onaylı"].map((label) => (
                      <div key={label} className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/85 px-2.5 py-2 text-[9.5px] font-semibold text-slate-600"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] overflow-hidden rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(249,251,255,0.94))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] 2xl:p-6">
            <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(39,67,211,0.07),rgba(16,185,129,0.045),rgba(255,255,255,0.72))] p-4">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-blue-700">Kurumsal giriş</p>
              <h2 className="mt-1.5 text-[24px] font-semibold tracking-[-0.045em] text-[#122041] 2xl:text-[27px]">FutureHR çalışma alanı</h2>
              <p className="mt-1.5 text-[10.5px] leading-5 text-slate-500">Demo erişimi sunum için hazırdır. Kurumsal kullanıcı, veri ve yetki yapısı ayrı korunur.</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">İnsan odaklı</p><p className="mt-1.5 text-[10.5px] font-medium leading-5 text-slate-700">Sistem önerir; son karar yöneticide kalır.</p></div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">Güvenli erişim</p><p className="mt-1.5 text-[10.5px] font-medium leading-5 text-slate-700">Demo ve canlı kullanım ayrıştırılır.</p></div>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 self-start space-y-3">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-[10.5px] font-semibold text-slate-700">Kullanıcı Adı</label>
                <div className="relative"><CircleUserRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" placeholder="Kullanıcı adınızı girin" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[11.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /></div>
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-[10.5px] font-semibold text-slate-700">Şifre</label>
                <div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Şifrenizi girin" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-[11.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}>{showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button></div>
              </div>
              {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-medium text-red-700">{error}</div> : null}
              <button type="submit" disabled={loading} className="flex h-10 w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#10255a,#2842d6)] px-4 text-[11.5px] font-semibold text-white shadow-[0_12px_24px_rgba(40,66,214,0.18)] disabled:opacity-70">{loading ? "Giriş yapılıyor..." : "Giriş Yap"}</button>
            </form>

            <div className="my-3 flex items-center gap-3 text-[9.5px] text-slate-400"><div className="h-px flex-1 bg-slate-200" />veya<div className="h-px flex-1 bg-slate-200" /></div>

            <Link href="/aday-girisi" className="flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-medium text-blue-600 transition hover:bg-blue-50"><span className="flex items-center gap-2"><CircleUserRound className="h-3.5 w-3.5" /> Aday girişi</span><ChevronRight className="h-3.5 w-3.5" /></Link>
          </section>
        </div>
      </div>
    </main>
  );
}
