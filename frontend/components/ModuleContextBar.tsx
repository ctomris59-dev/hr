"use client";

import {
  Plane,
  Building2,
  RefreshCw,
  BarChart3,
  BookOpen,
  Clock,
  MapPin,
  Crown,
  DollarSign,
  UserPlus,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react";

type ModuleConfig = {
  match: string;
  eyebrow: string;
  description: string;
  steps: string[];
  icon: LucideIcon;
  iconClass: string;
  iconBgClass: string;
  dotClass: string;
};

const MODULES: ModuleConfig[] = [
  {
    match: "/izinler",
    eyebrow: "İzin operasyonları",
    description: "İzin bakiyesi, talep, onay ve ekip takvimini tek akışta yönetin.",
    steps: ["Bakiye", "Talep", "Onay", "Takvim"],
    icon: Plane,
    iconClass: "text-teal-700 dark:text-teal-300",
    iconBgClass: "bg-teal-50 dark:bg-teal-950/30",
    dotClass: "bg-teal-500",
  },
  {
    match: "/organizasyon",
    eyebrow: "Organizasyon yönetimi",
    description: "Kadro, departman, hiyerarşi ve çalışan verisini tek organizasyon görünümünde yönetin.",
    steps: ["Kadro", "Departman", "Hiyerarşi", "Raporlama"],
    icon: Building2,
    iconClass: "text-sky-700 dark:text-sky-300",
    iconBgClass: "bg-sky-50 dark:bg-sky-950/30",
    dotClass: "bg-sky-500",
  },
  {
    match: "/degerlendirme",
    eyebrow: "Performans kalibrasyonu",
    description: "360° geri bildirim, yetkinlik puanlama ve performans kararlarını aynı değerlendirme akışında birleştirin.",
    steps: ["Çalışan", "Yetkinlik", "Puanlama", "Kalibrasyon"],
    icon: RefreshCw,
    iconClass: "text-violet-700 dark:text-violet-300",
    iconBgClass: "bg-violet-50 dark:bg-violet-950/30",
    dotClass: "bg-violet-500",
  },
  {
    match: "/yetenek-matrisi",
    eyebrow: "Yetenek karar desteği",
    description: "9-Box, potansiyel ve yetkinlik gap analizinden doğrudan gelişim aksiyonuna geçin.",
    steps: ["9-Box", "Gap", "Potansiyel", "Aksiyon"],
    icon: BarChart3,
    iconClass: "text-indigo-700 dark:text-indigo-300",
    iconBgClass: "bg-indigo-50 dark:bg-indigo-950/30",
    dotClass: "bg-indigo-500",
  },
  {
    match: "/egitim",
    eyebrow: "Öğrenme operasyonları",
    description: "Eğitim ihtiyacını görün, atama yapın ve tamamlama durumunu izleyin.",
    steps: ["İhtiyaç", "Atama", "Takip", "Tamamlama"],
    icon: BookOpen,
    iconClass: "text-cyan-700 dark:text-cyan-300",
    iconBgClass: "bg-cyan-50 dark:bg-cyan-950/30",
    dotClass: "bg-cyan-500",
  },
  {
    match: "/gelisim",
    eyebrow: "Gelişim planlama",
    description: "Yetkinlik açığını kişisel gelişim planına, kaynağa ve ölçülebilir ilerlemeye dönüştürün.",
    steps: ["Gap", "Plan", "Kaynak", "İlerleme"],
    icon: Clock,
    iconClass: "text-emerald-700 dark:text-emerald-300",
    iconBgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    dotClass: "bg-emerald-500",
  },
  {
    match: "/kariyer",
    eyebrow: "Kariyer mimarisi",
    description: "Mevcut rol ile hedef rol arasındaki uygunluğu ve gelişim yol haritasını görün.",
    steps: ["Mevcut Rol", "Hedef Rol", "Uyum", "Yol Haritası"],
    icon: MapPin,
    iconClass: "text-fuchsia-700 dark:text-fuchsia-300",
    iconBgClass: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    dotClass: "bg-fuchsia-500",
  },
  {
    match: "/yedekleme",
    eyebrow: "Halefiyet yönetimi",
    description: "Kritik rolleri, kayıp riskini ve hazır halef adaylarını tek karar ekranında yönetin.",
    steps: ["Kritik Rol", "Risk", "Halef", "Hazırlık"],
    icon: Crown,
    iconClass: "text-amber-700 dark:text-amber-300",
    iconBgClass: "bg-amber-50 dark:bg-amber-950/30",
    dotClass: "bg-amber-500",
  },
  {
    match: "/maas",
    eyebrow: "Ücret & bütçe analitiği",
    description: "Ücret senaryolarını piyasa verisi ve bütçe etkisiyle birlikte simüle edin.",
    steps: ["Veri", "Senaryo", "Piyasa", "Bütçe"],
    icon: DollarSign,
    iconClass: "text-emerald-700 dark:text-emerald-300",
    iconBgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    dotClass: "bg-emerald-500",
  },
  {
    match: "/ise-alim",
    eyebrow: "Aday karar akışı",
    description: "Aday havuzundan yetkinlik testine, mülakata ve işe alım kararına kadar süreci yönetin.",
    steps: ["Aday", "Test", "Mülakat", "Karar"],
    icon: UserPlus,
    iconClass: "text-rose-700 dark:text-rose-300",
    iconBgClass: "bg-rose-50 dark:bg-rose-950/30",
    dotClass: "bg-rose-500",
  },
  {
    match: "/aday-testi",
    eyebrow: "Yetkinlik değerlendirmesi",
    description: "Standart test akışıyla yetkinlik puanlarını güvenli ve izlenebilir biçimde oluşturun.",
    steps: ["Hazırlık", "130 Soru", "Puanlama", "Rapor"],
    icon: FileText,
    iconClass: "text-blue-700 dark:text-blue-300",
    iconBgClass: "bg-blue-50 dark:bg-blue-950/30",
    dotClass: "bg-blue-500",
  },
  {
    match: "/ekip-yonetimi",
    eyebrow: "Erişim & ekip yönetimi",
    description: "Kullanıcı hesaplarını, rolleri ve yönetim kapsamlarını tek merkezden kontrol edin.",
    steps: ["Kullanıcı", "Rol", "Erişim", "Yönetim"],
    icon: Users,
    iconClass: "text-slate-700 dark:text-slate-300",
    iconBgClass: "bg-slate-100 dark:bg-slate-800",
    dotClass: "bg-slate-500",
  },
];

export default function ModuleContextBar({ pathname }: { pathname: string }) {
  if (pathname === "/dashboard") return null;

  const config = MODULES.find(
    (module) => pathname === module.match || pathname.startsWith(`${module.match}/`)
  );
  if (!config) return null;

  const Icon = config.icon;

  return (
    <>
      <section className="module-context mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 px-4 py-3.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${config.iconBgClass} ${config.iconClass}`}>
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500 dark:text-slate-400">
                  {config.eyebrow}
                </span>
              </div>
              <p className="max-w-3xl text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                {config.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Akış</span>
            {config.steps.map((step, index) => (
              <div key={step} className="flex items-center gap-1.5">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {index + 1}. {step}
                </span>
                {index < config.steps.length - 1 && <span className="text-xs text-slate-300 dark:text-slate-600">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .module-page-content {
          min-width: 0;
        }

        .module-page-content .shadow-lg,
        .module-page-content .shadow-xl,
        .module-page-content .shadow-2xl {
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.045) !important;
        }

        .module-page-content .rounded-2xl,
        .module-page-content .rounded-3xl {
          border-radius: 0.875rem !important;
        }

        .module-page-content table {
          font-variant-numeric: tabular-nums;
        }

        .module-page-content thead th {
          background: #f8fafc;
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.055em;
          text-transform: uppercase;
        }

        .dark .module-page-content thead th {
          background: #172033;
          color: #94a3b8;
        }

        .module-page-content tbody tr {
          transition: background-color 140ms ease, box-shadow 140ms ease;
        }

        .module-page-content tbody tr:hover {
          background: rgba(248, 250, 252, 0.82);
        }

        .dark .module-page-content tbody tr:hover {
          background: rgba(30, 41, 59, 0.5);
        }

        .module-page-content input:not([type="checkbox"]):not([type="radio"]),
        .module-page-content select,
        .module-page-content textarea {
          border-radius: 0.55rem !important;
        }

        .module-page-content h1 {
          letter-spacing: -0.035em;
          color: #0f172a;
        }

        .dark .module-page-content h1 {
          color: #f1f5f9;
        }

        .module-page-content .font-mono {
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 1024px) {
          .module-context {
            margin-top: 0.25rem;
          }
        }
      `}</style>
    </>
  );
}
