"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Shield, Zap, Users } from "lucide-react";
import { USERS } from "../data/users";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../utils/storage";

// Logo Component
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <Image 
        src="/logo.png" 
        alt="Logo" 
        width={200} 
        height={200} 
        className="h-auto w-auto object-contain max-w-[200px]" 
      />
    </div>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // localStorage'daki users verisini ilk yüklemede USERS ile birleştir (yeni kullanıcıları koru)
  useEffect(() => {
    // Mevcut localStorage'daki kullanıcıları al
    const existingUsers = getStorageData(STORAGE_KEYS.USERS, {});
    
    // USERS sabitindeki kullanıcıları mevcut kullanıcılarla birleştir
    // Mevcut kullanıcılar öncelikli (yeni oluşturulan kullanıcıları koru)
    const mergedUsers = { ...USERS, ...existingUsers };
    
    // Birleştirilmiş kullanıcıları kaydet
    setStorageData(STORAGE_KEYS.USERS, mergedUsers);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // localStorage'dan users verisini al
    const users = getStorageData(STORAGE_KEYS.USERS, USERS);

    // Kullanıcı kontrolü
    const user = users[username];
    if (user && user.password === password) {
      const userData = { username, ...user };
      setStorageData(STORAGE_KEYS.CURRENT_USER, userData);
      
      // Dispatch custom event to notify other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
        // Also dispatch a custom event for same-tab updates
        window.dispatchEvent(new CustomEvent("userChanged", { detail: userData }));
      }
      
      router.push("/dashboard");
    } else {
      setError("Kullanıcı adı veya şifre hatalı");
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50">
      {/* Mesh Gradient Blobs */}
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-indigo-200/60 blur-[140px]" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-purple-200/60 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-indigo-100/50 blur-[120px]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Sol içerik */}
          <div className="hidden lg:flex flex-col gap-6">
            <div className="w-14 h-14 rounded-2xl bg-white/60 border border-white/50 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-600 tracking-widest uppercase">FutureHR</p>
              <h1 className="text-5xl font-bold text-slate-900 tracking-tight mt-2">
                Premium HR <span className="text-indigo-600">Platformu</span>
              </h1>
            </div>
            <p className="text-lg text-slate-600 leading-relaxed">
              Kurumsal ölçekli ekipler için güvenli, şık ve hızlı yetenek yönetimi deneyimi.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                ISO 27001
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                GDPR Uyumlu
              </span>
            </div>
          </div>

          {/* Form alanı */}
          <div className="w-full">
            <div className="bg-white/30 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-8 md:p-10">
              <div className="mb-8 text-center">
                <div className="lg:hidden mb-6 flex justify-center">
                  <Logo />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Personel Girişi
                </h2>
                <p className="text-sm text-slate-600 mt-2">
                  Devam etmek için hesabınıza giriş yapın
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider"
                  >
                    Kullanıcı Adı
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full h-12 px-4 bg-white/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-base transition-all"
                    placeholder="Kullanıcı adınızı girin"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider"
                  >
                    Şifre
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 px-4 bg-white/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-base transition-all"
                    placeholder="Şifrenizi girin"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    "Giriş yapılıyor..."
                  ) : (
                    <>
                      Sisteme Giriş Yap
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-4 border-t border-white/50">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Test Kullanıcıları:</p>
                  <div className="space-y-1 text-xs text-slate-600 font-mono">
                    <p>ceo / 123</p>
                    <p>ik_dir / 123</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/50">
                  <Link
                    href="/aday-girisi"
                    className="block text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                  >
                    Aday girişi için tıklayın
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
