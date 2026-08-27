"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { USERS } from "../data/users";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../utils/storage";

const demoUsers = [
  { label: "CEO", username: "ceo", password: "123" },
  { label: "İK Direktörü", username: "ik_dir", password: "123" },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const existingUsers = getStorageData(STORAGE_KEYS.USERS, {});
    setStorageData(STORAGE_KEYS.USERS, { ...USERS, ...existingUsers });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const users = getStorageData(STORAGE_KEYS.USERS, USERS);
    const user = users[username];

    if (user && user.password === password) {
      const userData = { username, ...user };
      setStorageData(STORAGE_KEYS.CURRENT_USER, userData);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("userChanged", { detail: userData }));
      }

      router.push("/dashboard");
    } else {
      setError("Kullanıcı adı veya şifre hatalı.");
    }

    setLoading(false);
  };

  const useDemo = (item: (typeof demoUsers)[number]) => {
    setUsername(item.username);
    setPassword(item.password);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <Image src="/logo.png" alt="FutureHR" width={24} height={24} className="h-6 w-6 object-contain" priority />
            </div>
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-950">FutureHR</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Human Resources Platform</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-[11px] font-medium text-slate-500 sm:flex">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            Rol bazlı güvenli erişim
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20 lg:py-14">
          <section className="max-w-2xl">
            <div className="mb-6 h-px w-12 bg-indigo-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">FutureHR</p>
            <h1 className="mt-4 max-w-[650px] text-[42px] font-semibold leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-[52px] lg:text-[62px]">
              İnsan yönetiminin daha net hali.
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-7 text-slate-600 sm:text-[17px]">
              Performans, yetenek, gelişim, kariyer ve ücret kararlarını tek bir kurumsal çalışma alanında yönetin.
            </p>

            <div className="mt-10 grid max-w-xl gap-0 border-y border-slate-200 sm:grid-cols-3">
              {["Rol bazlı erişim", "Karar destek akışları", "Tek merkezden yönetim"].map((item) => (
                <div key={item} className="flex items-center gap-2 border-b border-slate-200 py-4 text-sm font-medium text-slate-700 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
                  <Check className="h-4 w-4 flex-shrink-0 text-indigo-600" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="mb-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Personel Girişi</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950">Hesabınıza giriş yapın</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">FutureHR çalışma alanınıza devam edin.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="mb-2 block text-xs font-semibold text-slate-600">Kullanıcı adı</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Kullanıcı adınız"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-xs font-semibold text-slate-600">Şifre</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Şifreniz"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Giriş yapılıyor..." : <>Giriş yap <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Demo kullanıcıları</p>
                  <span className="text-[10px] text-slate-400">Tek tıkla doldur</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {demoUsers.map((item) => (
                    <button
                      key={item.username}
                      type="button"
                      onClick={() => useDemo(item)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-white"
                    >
                      <span className="block text-xs font-semibold text-slate-700">{item.label}</span>
                      <span className="mt-0.5 block font-mono text-[10px] text-slate-400">{item.username} / {item.password}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-xs">
                <span className="text-slate-400">FutureHR demo ortamı</span>
                <Link href="/aday-girisi" className="font-medium text-indigo-600 transition hover:text-indigo-700">Aday girişi</Link>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-200 py-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 FutureHR</span>
          <span>Kurumsal insan kaynakları yönetim platformu</span>
        </footer>
      </div>
    </main>
  );
}
