"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Rocket, Target, Sparkles } from "lucide-react";

// Logo Component
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <Image 
        src="/logo.png" 
        alt="Logo" 
        width={180} 
        height={60} 
        className="object-contain" 
      />
    </div>
  );
}

export default function BasvuruPage() {
  const [examCode, setExamCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!examCode.trim()) {
      setError("Lütfen sınav giriş kodunuzu veya T.C. Kimlik Numaranızı giriniz.");
      setLoading(false);
      return;
    }

    // Store exam code in sessionStorage
    sessionStorage.setItem("examCode", examCode);
    
    // Redirect to exam page
    setTimeout(() => {
      router.push("/aday-testi?mode=candidate&code=" + encodeURIComponent(examCode));
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex">
      {/* SOL TARAF - Vitrin (Yeşil/Turkuaz Tema) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-teal-950 to-cyan-950 relative overflow-hidden">
        {/* Dekoratif Elementler */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 w-full flex flex-col p-12">
          {/* Logo */}
          <div className="mb-12">
            <Logo />
          </div>

          {/* Ana İçerik - Dikeyde Ortalanmış */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
              Kariyerinize İlk Adımı Atın
            </h1>
            <p className="text-lg text-emerald-200 mb-8 leading-relaxed">
              Geleceği birlikte tasarlayalım. Yeteneklerinizi keşfedin ve potansiyelinizi ortaya çıkarın.
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
                  <div key={idx} className="flex items-center gap-3 text-emerald-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-sm">{feature.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Güvenilirlik Rozeti */}
            <div className="border-t border-emerald-800 pt-8">
              <p className="text-xs text-emerald-400 mb-4 uppercase tracking-wider">
                Güvenli Süreç
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-200">Güvenli Veri</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-200">Adil Değerlendirme</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-200">Hızlı Sonuç</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAĞ TARAF - İşlem Merkezi */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo (Mobil için) */}
          <div className="lg:hidden mb-8">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={180} 
              height={60} 
              className="object-contain" 
            />
          </div>

          {/* Başlık */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Aday Sınav Girişi
            </h2>
            <p className="text-sm text-slate-500">
              Sınav giriş kodunuzu veya T.C. Kimlik Numaranızı giriniz
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="examCode"
                className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider"
              >
                Sınav Giriş Kodu / T.C. Kimlik No
              </label>
              <input
                id="examCode"
                type="text"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                required
                className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm transition-all"
                placeholder="Giriş kodunuzu veya T.C. Kimlik Numaranızı girin"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Size verilen sınav giriş kodunu veya T.C. Kimlik Numaranızı girebilirsiniz.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-95"
            >
              {loading ? (
                "Yönlendiriliyor..."
              ) : (
                <>
                  Sınava Başla
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Personel Girişi Linki */}
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/"
                className="block text-center text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Personel girişi için tıklayın
              </Link>
            </div>

            <div className="pt-2">
              <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 backdrop-blur-sm border border-emerald-200 rounded-lg shadow-sm">
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>Bilgi:</strong> Sınav yaklaşık 45 dakika sürmektedir ve 130 sorudan oluşmaktadır. 
                  Başladıktan sonra durdurulamaz. Lütfen sessiz bir ortamda ve yeterli zamanınız olduğundan emin olun.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

