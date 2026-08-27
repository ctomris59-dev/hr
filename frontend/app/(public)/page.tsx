"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { USERS } from "../data/users";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../utils/storage";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Image src="/logo.png" alt="FutureHR" width={28} height={28} className="h-7 w-7 object-contain" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">FutureHR</p>
        <p className="text-sm font-semibold text-slate-900">Kurumsal İnsan Yönetimi</p>
      </div>
    </div>
  );
}

const demoUsers = [
  { label: "CEO Demo", username: "ceo", password: "123" },
  { label: "İK Direktörü", username: "ik_dir", password: "123" },
];

const capabilityCards = [
  {
    icon: BriefcaseBusiness,
    title: "Performans & Yetkinlik",
    text: "Hedef başarısı, yönetici değerlendirmesi ve yetkinlik verisini tek akışta yönetin.",
  },
  {
    icon: BarChart3,
    title: "Ücret & Karar Senaryoları",
    text: "Maaş kararlarını senaryo bazlı kurgulayın, bütçe etkisini görün, kontrollü onay süreci kurun.",
  },
  {
    icon: GraduationCap,
    title: "Eğitim, Gelişim & Kariyer",
    text: "Yetkinlik açıklarını eğitim, gelişim planı ve kariyer akışıyla somut aksiyonlara dönüştürün.",
  },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const existingUsers = getStorageData(STORAGE_KEYS.USERS, {});
    const mergedUsers = { ...USERS, ...existingUsers };
    setStorageData(STORAGE_KEYS.USERS, mergedUsers);
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

  const applyDemoUser = (user: (typeof demoUsers)[number]) => {
    setUsername(user.username);
    setPassword(user.password);
    setError("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.12),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0))]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[32px] border border-slate-200/80 bg-white px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8">
              <div className="flex items-start justify-between gap-4">
                <Logo />
                <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex sm:items-center sm:gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Kurumsal SaaS Deneyimi
                </div>
              </div>

              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  İnsan kaynakları süreçleri için bütünleşik yönetim platformu
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[56px] lg:leading-[1.02]">
                  Profesyonel ekipler için
                  <span className="block text-indigo-600">ölçeklenebilir HR operating system</span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Organizasyon, performans, yetenek, eğitim, kariyer, ücret ve halefiyet akışlarını tek platformda daha açıklanabilir, daha kontrollü ve daha kurumsal şekilde yönetin.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {capabilityCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.06)]"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                        <Icon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Neden FutureHR?</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      "CEO, İK, yönetici ve çalışan için rol bazlı görünüm",
                      "Senaryo tabanlı ücret yönetimi ve kontrollü karar akışı",
                      "Yetenek matrisi, halefiyet ve gelişim bağlantısı",
                      "Demo anlatımı için hazır, canlı sunuma uygun kurgu",
                    ].map((text) => (
                      <div key={text} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600" />
                        <span className="text-sm leading-6 text-slate-700">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_48px_rgba(15,23,42,0.18)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Güven & Uyum</p>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <LockKeyhole className="mt-0.5 h-5 w-5 text-indigo-300" />
                      <div>
                        <p className="text-sm font-semibold">Güvenli erişim mantığı</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">Rol bazlı erişim, hassas veri segmentasyonu ve kurallı görünürlük yaklaşımıyla tasarlanmıştır.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-2xl font-semibold">13</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">Ana Modül</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-2xl font-semibold">360°</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">HR Görünümü</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full rounded-[32px] border border-slate-200/90 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:p-8 lg:p-10">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kurumsal Giriş</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Hesabınıza giriş yapın</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    FutureHR çalışma alanınıza güvenli şekilde erişin ve organizasyon yönetimini kaldığınız yerden sürdürün.
                  </p>
                </div>
                <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:flex">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="username" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Kullanıcı adı
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Örn. ceo"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Şifre
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Şifrenizi girin"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? (
                    "Giriş yapılıyor..."
                  ) : (
                    <>
                      Sisteme giriş yap
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Demo erişimi</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Sunum sırasında hızlı giriş için aşağıdaki hazır kullanıcıları kullanabilirsiniz.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {demoUsers.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => applyDemoUser(item)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300 hover:shadow-sm"
                    >
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs font-mono text-slate-500">
                        {item.username} / {item.password}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Demo erişimi güvenli kurgu ve rol bazlı görünüm mantığı ile sunulur.
                </div>
                <Link
                  href="/aday-girisi"
                  className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                >
                  Aday girişi →
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
