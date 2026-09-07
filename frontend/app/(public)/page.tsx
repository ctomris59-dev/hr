"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { USERS } from "../data/users";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../utils/storage";
import { applyFutureHRV1DemoData } from "@/lib/hr/demoV1";
import { DEMO_PERSONAS } from "@/lib/hr/demoPersonas";

const trustPoints = [
  "Rol bazlı erişim",
  "Kanıt temelli kararlar",
  "İnsan onaylı karar desteği",
];

const decisionSignals = [
  { label: "Kritik yetenek", value: "12", note: "görünür", icon: Users },
  { label: "Ücret sinyali", value: "4", note: "inceleme", icon: BarChart3 },
  { label: "Halef adayı", value: "2", note: "hazır", icon: Target },
];

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

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
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
    <main className="fixed inset-0 overflow-hidden bg-[#f4f6fa] text-[#10213c]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(19,45,78,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(19,45,78,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        <div className="absolute left-[-12%] top-[-18%] h-[520px] w-[520px] rounded-full bg-indigo-300/15 blur-[110px]" />
        <div className="absolute right-[-10%] top-[12%] h-[460px] w-[460px] rounded-full bg-sky-200/25 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex h-dvh min-h-0 w-full max-w-[1540px] flex-col px-4 py-3 sm:px-8 sm:py-4 lg:px-12 xl:px-16">
        <header className="flex shrink-0 items-center justify-between border-b border-[#183354]/10 pb-3 sm:pb-4">
          <div>
            <div className="select-none text-[32px] font-bold lowercase leading-none tracking-[-0.07em] text-[#2844d8] sm:text-[38px] lg:text-[42px]">
              future hr
            </div>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.01em] text-[#60708a] sm:text-[11px]">
              People Intelligence System
            </p>
          </div>

          <div className="hidden items-center gap-5 text-[11px] font-semibold text-[#53657f] md:flex">
            <span>Performans</span>
            <span>Yetenek</span>
            <span>Ücret</span>
            <span>Kariyer</span>
            <button
              type="button"
              onClick={() => document.getElementById("username")?.focus()}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#183354]/15 bg-white px-4 text-[#183354] shadow-[0_8px_24px_rgba(26,46,76,.06)] transition hover:-translate-y-0.5 hover:border-[#2844d8]/30"
            >
              Kurumsal giriş
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 items-center gap-3 py-3 sm:gap-5 sm:py-4 lg:grid-cols-[minmax(0,1.03fr)_minmax(430px,0.97fr)] lg:gap-12 lg:py-5 xl:gap-16">
          <section className="min-h-0 max-w-[800px]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2844d8]/12 bg-white/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#2844d8] shadow-[0_8px_28px_rgba(32,57,98,.05)] backdrop-blur sm:mb-5 sm:px-3.5 sm:py-2 sm:text-[10px] sm:tracking-[0.16em]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              İnsan Merkezli Uygulama Sistemi
            </div>

            <h1 className="max-w-[760px] tracking-[-0.055em]">
              <span className="block font-serif text-[clamp(32px,5.15vw,78px)] font-medium leading-[0.96] text-[#111b2f]">
                İnsan kararlarını
              </span>
              <span className="mt-0.5 block text-[clamp(30px,4.8vw,72px)] font-semibold leading-[0.99] text-[#2844d8] sm:mt-1">
                daha güçlü hale getirin.
              </span>
            </h1>

            <p className="mt-3 max-w-[700px] text-[clamp(13px,1.35vw,21px)] leading-[1.45] tracking-[-0.018em] text-[#61718b] sm:mt-5 lg:mt-6">
              Yeteneği görünür kılın, doğru kişiyi doğru rolle eşleştirin ve insan kararlarını güvenilir verilerle destekleyin.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#183a76] px-4 text-[12px] font-semibold text-white shadow-[0_14px_30px_rgba(24,58,118,0.18)] transition hover:-translate-y-0.5 hover:bg-[#153467] hover:shadow-[0_18px_38px_rgba(24,58,118,0.23)] disabled:cursor-wait disabled:opacity-70 sm:h-12 sm:px-5 sm:text-[13px]"
              >
                {loading ? "Demo hazırlanıyor..." : "Canlı Demoyu İncele"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => document.getElementById("username")?.focus()}
                className="hidden h-10 items-center justify-center gap-2 rounded-xl border border-[#183354]/15 bg-white/80 px-4 text-[12px] font-semibold text-[#263b58] shadow-[0_8px_24px_rgba(26,46,76,.05)] transition hover:-translate-y-0.5 hover:bg-white sm:inline-flex sm:h-12 sm:px-5 sm:text-[13px]"
              >
                Kurumsal Giriş
                <ChevronRight className="h-4 w-4 text-[#7c8ca3]" />
              </button>
            </div>

            <div className="mt-5 hidden flex-wrap gap-x-6 gap-y-3 border-t border-[#183354]/10 pt-5 sm:flex lg:mt-7 lg:pt-6">
              {trustPoints.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#5c6d86] lg:text-[11.5px]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="relative mx-auto min-h-0 w-full max-w-[560px] lg:mx-0 lg:max-w-none">
            <div className="relative hidden rounded-[28px] border border-[#183354]/10 bg-[#152b4d] p-3 shadow-[0_36px_90px_rgba(30,48,77,0.17)] lg:block xl:p-4">
              <div className="rounded-[21px] bg-[#f9fbfd] p-4">
                <div className="flex items-center justify-between gap-4 border-b border-[#183354]/8 pb-3">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#7a8aa1]">Demo çalışma alanı</p>
                    <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.03em] text-[#172941] xl:text-[18px]">Bugünün insan kararları</h2>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[8px] font-bold text-emerald-700 xl:text-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Canlı
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {decisionSignals.map(({ label, value, note, icon: Icon }) => (
                    <div key={label} className="rounded-2xl border border-[#183354]/8 bg-white p-3 shadow-[0_6px_20px_rgba(34,55,83,.04)]">
                      <div className="flex items-center justify-between gap-2">
                        <Icon className="h-3.5 w-3.5 text-[#526783]" />
                        <span className="text-[7.5px] font-semibold uppercase tracking-[0.08em] text-[#93a0b2]">{note}</span>
                      </div>
                      <strong className="mt-2 block text-[21px] font-semibold tracking-[-0.04em] text-[#172941]">{value}</strong>
                      <span className="mt-0.5 block text-[9px] font-semibold text-[#6e7d93]">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-2xl border border-[#183354]/8 bg-white p-3 shadow-[0_6px_20px_rgba(34,55,83,.035)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a97a9]">Karar görünümü</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#213751]">Performans → potansiyel → aksiyon</p>
                    </div>
                    <Sparkles className="h-4 w-4 text-[#2844d8]" />
                  </div>
                  <div className="mt-3 flex h-10 items-end gap-1.5 xl:h-12">
                    {[38, 48, 43, 62, 57, 72, 66, 78, 70, 86, 81, 91].map((height, index) => (
                      <span
                        key={`${height}-${index}`}
                        className="flex-1 rounded-t-sm bg-[#dfe6f2] last:bg-[#2844d8]"
                        style={{ height: `${height}%`, opacity: index > 8 ? 1 : 0.78 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-[22px] border border-[#183354]/10 bg-white p-4 shadow-[0_24px_60px_rgba(31,48,77,0.14)] sm:p-5 lg:mx-5 lg:-mt-3 lg:rounded-[24px] xl:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#2844d8] sm:text-[9px]">Kurumsal giriş</p>
                  <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.035em] text-[#172941] sm:text-[20px] lg:text-[21px]">Çalışma alanınıza girin</h2>
                  <p className="mt-1 hidden text-[10px] leading-4 text-[#738196] sm:block lg:text-[11px] lg:leading-5">Gerçek kullanıcı erişimi ile demo akışı birbirinden ayrıdır.</p>
                </div>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#2844d8] sm:h-10 sm:w-10">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-3 grid gap-2.5 sm:mt-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div>
                  <label htmlFor="username" className="mb-1 block text-[9.5px] font-semibold text-[#45566f] sm:text-[10px]">Kullanıcı adı</label>
                  <div className="relative">
                    <CircleUserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#95a2b4]" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="Kullanıcı adınız"
                      className="h-10 w-full rounded-xl border border-[#183354]/12 bg-[#fbfcfe] pl-10 pr-4 text-[12px] text-[#172941] outline-none transition placeholder:text-[#9aa6b6] focus:border-[#2844d8]/45 focus:bg-white focus:ring-4 focus:ring-[#2844d8]/5 sm:h-11"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1 block text-[9.5px] font-semibold text-[#45566f] sm:text-[10px]">Şifre</label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#95a2b4]" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Şifreniz"
                      className="h-10 w-full rounded-xl border border-[#183354]/12 bg-[#fbfcfe] pl-10 pr-11 text-[12px] text-[#172941] outline-none transition placeholder:text-[#9aa6b6] focus:border-[#2844d8]/45 focus:bg-white focus:ring-4 focus:ring-[#2844d8]/5 sm:h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#95a2b4] transition hover:text-[#53657d]"
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10.5px] font-medium text-red-700 sm:col-span-2 lg:col-span-1 xl:col-span-2">{error}</div> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#183a76] px-4 text-[12px] font-semibold text-white shadow-[0_10px_22px_rgba(24,58,118,0.16)] transition hover:bg-[#153467] disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2 sm:h-11 lg:col-span-1 xl:col-span-2"
                >
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              <div className="mt-2.5 flex items-center justify-between gap-4 border-t border-[#183354]/8 pt-2.5 sm:mt-3 sm:pt-3">
                <p className="hidden text-[9.5px] leading-4 text-[#7b899d] sm:block">
                  Sistem önerir; insan değerlendirir ve kararı verir.
                </p>
                <Link href="/aday-girisi" className="inline-flex shrink-0 items-center gap-1.5 text-[10.5px] font-semibold text-[#2844d8] transition hover:text-[#183a76]">
                  Aday girişi
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>
        </div>

        <footer className="hidden shrink-0 items-center justify-between border-t border-[#183354]/10 py-3 text-[9.5px] font-medium text-[#8190a4] lg:flex">
          <span>FutureHR · People Intelligence System</span>
          <span>İnsan kararlarında görünürlük, tutarlılık ve güven.</span>
        </footer>
      </div>
    </main>
  );
}
