"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { USERS } from "../data/users";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../utils/storage";
import { applyFutureHRV1DemoData } from "@/lib/hr/demoV1";
import { DEMO_PERSONAS } from "@/lib/hr/demoPersonas";

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
    <main className="fixed inset-0 overflow-hidden bg-[#f8fafc] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(59,130,246,0.08),transparent_27%),radial-gradient(circle_at_75%_80%,rgba(14,165,233,0.05),transparent_28%)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -right-[12%] -top-[28%] h-[138%] w-[58%] opacity-[0.98] blur-[0.2px]"
          style={{
            clipPath: "polygon(24% 0%, 100% 0%, 84% 100%, 53% 73%, 35% 38%)",
            background:
              "linear-gradient(148deg,#bfe0ff 0%,#8fa8ff 17%,#7b61ff 31%,#f04fd6 53%,#ff5f8c 66%,#ff8a2a 82%,#ffd45a 100%)",
          }}
        />
        <div
          className="absolute -right-[6%] -top-[18%] h-[128%] w-[43%] opacity-[0.92] mix-blend-multiply"
          style={{
            clipPath: "polygon(35% 0%, 100% 0%, 73% 100%, 56% 68%, 46% 36%)",
            background:
              "linear-gradient(160deg,rgba(255,246,136,0.25) 0%,#ffbb38 18%,#ff7a1a 44%,#ff3f86 69%,#c345ff 100%)",
          }}
        />
        <div
          className="absolute right-[2%] top-[-12%] h-[112%] w-[29%] opacity-[0.95]"
          style={{
            clipPath: "polygon(40% 0%, 100% 0%, 56% 100%, 47% 64%)",
            background: "linear-gradient(176deg,#ffd85a 0%,#ff9d2d 38%,#ff5d91 70%,#d858ff 100%)",
          }}
        />
        <div
          className="absolute -right-[2%] bottom-[-24%] h-[66%] w-[42%] opacity-[0.6] blur-2xl"
          style={{
            clipPath: "polygon(18% 0%,100% 30%,82% 100%,0% 72%)",
            background: "linear-gradient(135deg,#5aa9ff 0%,#6d5dfc 42%,#f04fd6 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto h-full max-w-[1560px] px-[clamp(28px,5vw,76px)] py-[clamp(22px,4vh,46px)]">
        <header className="flex items-start justify-between">
          <div>
            <div className="select-none text-[clamp(42px,4vw,60px)] font-bold lowercase leading-[0.88] tracking-[-0.07em] text-[#2942d6]">
              future hr
            </div>
            <p className="mt-2 text-[12px] font-medium tracking-[-0.01em] text-slate-500 sm:text-[13px]">
              potansiyeli performansa dönüştürün
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur lg:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            İnsan merkezli karar desteği
          </div>
        </header>

        <div className="grid h-[calc(100%-78px)] grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] xl:grid-cols-[minmax(0,1.28fr)_minmax(390px,0.72fr)]">
          <section className="max-w-[850px] self-center pb-[2vh]">
            <div className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              FutureHR V1 · People Decision Infrastructure
            </div>

            <h1 className="text-[clamp(42px,5.1vw,76px)] font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950">
              İnsan kararlarını
              <br />
              <span className="bg-[linear-gradient(90deg,#4f63a7_0%,#5d66b9_23%,#7456d6_46%,#e14db6_70%,#ff7a29_100%)] bg-clip-text text-transparent">
                güçlü bir sisteme dönüştürün.
              </span>
            </h1>

            <p className="mt-6 max-w-[780px] text-[clamp(18px,1.65vw,25px)] leading-[1.38] tracking-[-0.025em] text-[#667394]">
              Şirketinizdeki yeteneği görünür kılın, insan kaynağınızı adil, ölçülebilir ve veriye dayalı yönetin.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#4f46e5,#635bff)] px-5 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(79,70,229,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(79,70,229,0.3)] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? "Demo hazırlanıyor..." : "V1 Demo'yu Aç"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => document.getElementById("username")?.focus()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-white"
              >
                Kurumsal Giriş
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-medium text-slate-500">
              {["5 ana çalışma alanı", "4 ücret senaryosu", "9-Box & halefiyet", "Kanıt tabanlı karar akışı"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="relative hidden h-full items-center justify-end lg:flex">
            <div className="relative z-20 w-full max-w-[390px] rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_28px_70px_rgba(39,51,90,0.16)] backdrop-blur-xl xl:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600">Kurumsal giriş</p>
                  <h2 className="mt-1.5 text-[24px] font-semibold tracking-[-0.04em] text-slate-950">Çalışma alanına girin</h2>
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">Gerçek kullanıcı erişimi ile demo akışı birbirinden ayrıdır.</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-[11px] font-semibold text-slate-700">Kullanıcı Adı</label>
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
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-[11px] font-semibold text-slate-700">Şifre</label>
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
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
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

                {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-medium text-red-700">{error}</div> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#162a5b,#344ed8)] px-4 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(52,78,216,0.18)] transition hover:shadow-[0_16px_30px_rgba(52,78,216,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3 text-[10px] text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />veya<div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link href="/aday-girisi" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-medium text-indigo-600 transition hover:bg-indigo-50">
                <span>Aday girişi</span>
                <ChevronRight className="h-4 w-4" />
              </Link>

              <div className="mt-4 rounded-2xl bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-500">
                <span className="font-semibold text-slate-700">FutureHR ilkesi:</span> Sistem önerir; insan değerlendirir ve kararı verir.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
