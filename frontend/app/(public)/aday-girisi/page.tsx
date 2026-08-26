"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Users, Rocket, Target, Sparkles } from "lucide-react";
import { POSITIONS } from "../../data/jobData";

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

export default function CandidateLoginPage() {
  const [candidateName, setCandidateName] = useState("");
  const [candidateRole, setCandidateRole] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCandidateLogin = () => {
    if (!candidateName || !candidateRole || !candidateEmail) {
      setError("Lütfen tüm alanları doldurunuz.");
      return;
    }
    
    // Store candidate info in sessionStorage to pass to test page
    const candidateInfo = {
      name: candidateName,
      role: candidateRole,
      email: candidateEmail,
      phone: candidatePhone,
      mode: "candidate" as const,
    };
    
    sessionStorage.setItem("candidateInfo", JSON.stringify(candidateInfo));
    router.push("/aday-sinavi");
  };

  return (
    <div className="min-h-screen flex">
      {/* SOL TARAF - Vitrin */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-purple-950 to-pink-950 relative overflow-hidden">
        {/* Dekoratif Elementler */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 w-full flex flex-col p-12">
          {/* Logo */}
          <div className="mb-8">
            <Logo />
          </div>

          {/* Ana İçerik - Dikeyde Ortalanmış */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-4">
              Kariyerinize İlk Adımı Atın
            </h1>
            <p className="text-base text-indigo-200 mb-8 leading-relaxed">
              İşe alım sürecine başlamak için bilgilerinizi girin. Yetkinlik testi ile potansiyelinizi keşfedin.
            </p>

            {/* Özellikler */}
            <div className="space-y-4 mb-12">
              {[
                { icon: Rocket, text: "Hızlı ve Kolay Başvuru" },
                { icon: Target, text: "Yetkinlik Bazlı Değerlendirme" },
                { icon: Sparkles, text: "Kariyer Fırsatları" },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex items-center gap-3 text-indigo-200">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-indigo-400" />
                    </div>
                    <span className="text-sm">{feature.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Güvenilirlik Rozeti */}
            <div className="border-t border-indigo-800 pt-8">
              <p className="text-xs text-indigo-400 mb-4 uppercase tracking-wider">
                Güvenli Süreç
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-indigo-200">Güvenli Veri</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-indigo-200">Adil Değerlendirme</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-indigo-200">Hızlı Sonuç</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAĞ TARAF - İşlem Merkezi */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-lg flex flex-col justify-center">
          {/* Logo (Mobil için) */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={200} 
              height={200} 
              className="h-auto w-auto object-contain max-w-[200px]" 
            />
          </div>

          {/* Başlık */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Aday Girişi
            </h2>
            <p className="text-sm text-slate-500">
              İşe alım sürecine başlamak için bilgilerinizi girin
            </p>
          </div>

          {/* Form İçeriği */}
          <div className="space-y-5">
            <div className="p-7 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    İşe Alım Yetkinlik Testi
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    İşe alım sürecine başvurmak için lütfen bilgilerinizi giriniz. Test sonuçları İşe Alım modülüne kaydedilecektir.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="candidateName"
                  className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider"
                >
                  Ad Soyad
                </label>
                <input
                  id="candidateName"
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  required
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-base transition-all"
                  placeholder="Adınız ve soyadınız"
                />
              </div>

              <div>
                <label
                  htmlFor="candidateRole"
                  className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider"
                >
                  Başvurulan Pozisyon
                </label>
                <select
                  id="candidateRole"
                  value={candidateRole}
                  onChange={(e) => setCandidateRole(e.target.value)}
                  required
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-base transition-all"
                >
                  <option value="">Pozisyon seçin...</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="candidateEmail"
                  className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider"
                >
                  E-Posta Adresi
                </label>
                <input
                  id="candidateEmail"
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  required
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-base transition-all"
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="candidatePhone"
                  className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider"
                >
                  Telefon Numarası
                </label>
                <input
                  id="candidatePhone"
                  type="tel"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-base transition-all"
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCandidateLogin}
              disabled={!candidateName || !candidateRole || !candidateEmail}
              className="w-full h-12 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 disabled:from-purple-300 disabled:via-indigo-300 disabled:to-blue-300 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              Sınava Başla
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-4">
                Test 130 sorudan oluşmaktadır ve yaklaşık 45 dakika sürmektedir. Başladıktan sonra durdurulamaz.
              </p>
            </div>

            {/* Personel Girişi Linki */}
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/"
                className="block text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Personel girişi için tıklayın
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

