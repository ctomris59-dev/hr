"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  LockKeyhole,
  Network,
  PieChart,
  PlayCircle,
  Route,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { USERS } from "../data/users";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../utils/storage";

const modules = [
  { label: "Performans", icon: TrendingUp, pos: "top-[18%] left-[6%]" },
  { label: "Yetenek", icon: Users, pos: "top-[36%] left-[4%]" },
  { label: "Eğitim", icon: GraduationCap, pos: "top-[55%] left-[6%]" },
  { label: "İşe Alım", icon: BriefcaseBusiness, pos: "top-[72%] left-[13%]" },
  { label: "Halefiyet", icon: Network, pos: "top-[18%] right-[6%]" },
  { label: "İzin", icon: CalendarDays, pos: "top-[38%] right-[5%]" },
  { label: "Maaş", icon: WalletCards, pos: "top-[57%] right-[7%]" },
  { label: "Analitik", icon: PieChart, pos: "top-[73%] right-[13%]" },
  { label: "Kariyer", icon: Route, pos: "bottom-[8%] right-[31%]" },
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
    setStorageData(STORAGE_KEYS.USERS, { ...USERS, ...existingUsers });
  }, []);

  const loginAs = (nextUsername: string, nextPassword: string) => {
    const users = getStorageData(STORAGE_KEYS.USERS, USERS);
    const user = users[nextUsername];

    if (!user || user.password !== nextPassword) {
      setError("Kullanıcı adı veya şifre hatalı.");
      return false;
    }

    const userData = { username: nextUsername, ...user };
    setStorageData(STORAGE_KEYS.CURRENT_USER, userData);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("userChanged", { detail: userData }));
    }

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
    setUsername("ceo");
    setPassword("123");
    loginAs("ceo", "123");
  };

  return (
    <main className="min-h-screen bg-[#f5f6f8] p-3 text-slate-950 sm:p-4">
      <div className="relative mx-auto min-h-[calc(100vh-24px)] max-w-[1580px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_60px_rgba(15,23,42,0.05)] sm:min-h-[calc(100vh-32px)]">
        <div className="absolute left-6 top-5 z-20 sm:left-10 sm:top-7">
          <div className="select-none text-[48px] font-bold lowercase leading-[0.9] tracking-[-0.065em] text-[#2637c5] sm:text-[58px] lg:text-[68px]">
            future hr
          </div>
          <p className="mt-2 text-[12px] font-semibold tracking-[-0.01em] text-slate-600 sm:text-[14px]">
            &apos;potansiyeli performansa dönüştürün&apos;
          </p>
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute left-1/2 top-[46%] h-[1240px] w-[1240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/70" />
          <div className="absolute left-1/2 top-[46%] h-[1030px] w-[1030px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/70" />
          <div className="absolute left-1/2 top-[46%] h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/70" />
          <div className="absolute left-1/2 top-[46%] h-[610px] w-[610px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/70" />
          <div className="absolute bottom-[9%] left-[30%] h-40 w-[420px] rounded-full bg-blue-100/80 blur-3xl" />
          <div className="absolute left-[14%] top-[39%] h-1.5 w-1.5 rounded-full bg-blue-200" />
          <div className="absolute bottom-[33%] right-[24%] h-1.5 w-1.5 rounded-full bg-blue-200" />
        </div>

        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`absolute ${item.pos} flex w-[104px] flex-col items-center gap-2.5`}>
                <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                  <Icon className="h-7 w-7 text-blue-600" strokeWidth={1.8} />
                </div>
                <span className="text-[13px] font-medium text-slate-700">{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-32px)] max-w-[980px] items-center gap-10 px-6 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:px-0 lg:py-16">
          <section className="lg:-translate-y-6 lg:pl-2">
            <p className="max-w-[540px] text-[18px] font-medium leading-8 text-slate-600 sm:text-[20px] sm:leading-9">
              Yetkinlikleri görünür kılın, kurum içindeki yetenekleri keşfedin ve doğru insanı doğru rolle eşleştirerek potansiyeli performansa dönüştürün.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[#0c1f4d] px-6 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(12,31,77,0.18)] transition hover:-translate-y-0.5 hover:bg-[#10285f]"
              >
                Demo ile Giriş
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("username")?.focus()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <PlayCircle className="h-4 w-4 text-blue-600" />
                Ürünü Keşfet
              </button>
            </div>

            <div className="relative mt-12 w-full max-w-[430px] space-y-2.5 lg:ml-[90px] lg:mt-14">
              <div className="flex min-h-[70px] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                <div className="h-10 w-1 rounded-full bg-blue-500" />
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">AK</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-800"><span className="font-bold">Ayşe Kaya</span> için Gelişim Planı atandı</p>
                  <p className="mt-1 text-[11px] text-slate-400">Liderlik Programı · 10:30</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText className="h-4 w-4" /></div>
              </div>

              <div className="ml-2 flex min-h-[70px] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                <div className="h-10 w-1 rounded-full bg-amber-400" />
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Users className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">3 değerlendirme bekliyor</p>
                  <p className="mt-1 text-[11px] text-slate-400">Performans Döngüsü Q2</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><ChevronRight className="h-4 w-4" /></div>
              </div>

              <div className="ml-4 flex min-h-[70px] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                <div className="h-10 w-1 rounded-full bg-emerald-400" />
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><WalletCards className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">Maaş Senaryosu B hazır</p>
                  <p className="mt-1 text-[11px] text-slate-400">2026 Ücret Dönemi</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><BarChart3 className="h-4 w-4" /></div>
              </div>
            </div>
          </section>

          <section className="self-center lg:-translate-y-2">
            <div className="rounded-[24px] border border-slate-200 bg-white/95 p-6 shadow-[0_22px_54px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="mb-7">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-600">Personel Girişi</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[#101d3b]">FutureHR çalışma alanı</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0c1f4d] px-4 text-sm font-semibold text-white transition hover:bg-[#10285f] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3 text-[11px] text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                veya
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link href="/aday-girisi" className="flex items-center justify-between rounded-xl px-2 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50">
                <span className="flex items-center gap-2"><CircleUserRound className="h-4 w-4" /> Aday girişi</span>
                <ChevronRight className="h-4 w-4" />
              </Link>

              <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
                Demo kullanıcıları: <button type="button" onClick={() => { setUsername("ceo"); setPassword("123"); }} className="font-mono font-medium text-slate-500 hover:text-blue-600">ceo / 123</button> · <button type="button" onClick={() => { setUsername("ik_dir"); setPassword("123"); }} className="font-mono font-medium text-slate-500 hover:text-blue-600">ik_dir / 123</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
