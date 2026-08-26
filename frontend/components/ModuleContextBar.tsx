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
  title: string;
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
    title: "İzin Yönetimi",
    eyebrow: "İzin operasyonları",
    description: "Bakiye, talep, yönetici onayı, çakışma kontrolü ve ekip takvimini tek operasyon akışında yönetin.",
    steps: ["Bakiye", "Talep", "Onay", "Takvim"],
    icon: Plane,
    iconClass: "text-teal-700 dark:text-teal-300",
    iconBgClass: "bg-teal-50 dark:bg-teal-950/30",
    dotClass: "bg-teal-500",
  },
  {
    match: "/organizasyon",
    title: "Organizasyon",
    eyebrow: "Organizasyon yönetimi",
    description: "Kadro, departman, pozisyon, yönetici ilişkileri ve çalışan ana verisini veri-yoğun bir yönetim ekranında yönetin.",
    steps: ["Kadro", "Departman", "Hiyerarşi", "Raporlama"],
    icon: Building2,
    iconClass: "text-sky-700 dark:text-sky-300",
    iconBgClass: "bg-sky-50 dark:bg-sky-950/30",
    dotClass: "bg-sky-500",
  },
  {
    match: "/degerlendirme",
    title: "360 Değerlendirme",
    eyebrow: "Performans kalibrasyonu",
    description: "Çalışan seçimi, yetkinlik puanlama, performans değerlendirmesi ve kalibrasyon kararlarını odaklı bir değerlendirme çalışma alanında birleştirin.",
    steps: ["Çalışan", "Yetkinlik", "Puanlama", "Kalibrasyon"],
    icon: RefreshCw,
    iconClass: "text-violet-700 dark:text-violet-300",
    iconBgClass: "bg-violet-50 dark:bg-violet-950/30",
    dotClass: "bg-violet-500",
  },
  {
    match: "/yetenek-matrisi",
    title: "Yetenek Matrisi",
    eyebrow: "Yetenek karar desteği",
    description: "9-Box konumlandırması, potansiyel, yetkinlik gap analizi ve önerilen aksiyonları yönetici karar ekranında değerlendirin.",
    steps: ["9-Box", "Gap", "Potansiyel", "Aksiyon"],
    icon: BarChart3,
    iconClass: "text-indigo-700 dark:text-indigo-300",
    iconBgClass: "bg-indigo-50 dark:bg-indigo-950/30",
    dotClass: "bg-indigo-500",
  },
  {
    match: "/egitim",
    title: "Eğitim",
    eyebrow: "Öğrenme operasyonları",
    description: "Yetkinlik ihtiyacını eğitim atamasına dönüştürün; son tarih, ilerleme ve tamamlanma durumunu operasyonel olarak izleyin.",
    steps: ["İhtiyaç", "Atama", "Takip", "Tamamlama"],
    icon: BookOpen,
    iconClass: "text-cyan-700 dark:text-cyan-300",
    iconBgClass: "bg-cyan-50 dark:bg-cyan-950/30",
    dotClass: "bg-cyan-500",
  },
  {
    match: "/gelisim",
    title: "Gelişim Planı",
    eyebrow: "Gelişim planlama",
    description: "Yetkinlik açığını kişisel plana, önerilen kaynağa, sorumluluğa ve ölçülebilir ilerlemeye dönüştüren gelişim çalışma alanı.",
    steps: ["Gap", "Plan", "Kaynak", "İlerleme"],
    icon: Clock,
    iconClass: "text-emerald-700 dark:text-emerald-300",
    iconBgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    dotClass: "bg-emerald-500",
  },
  {
    match: "/kariyer",
    title: "Kariyer Yolu",
    eyebrow: "Kariyer mimarisi",
    description: "Mevcut rol ile hedef rol arasındaki uyumu, eksikleri ve bir sonraki kariyer adımını rota mantığıyla değerlendirin.",
    steps: ["Mevcut Rol", "Hedef Rol", "Uyum", "Yol Haritası"],
    icon: MapPin,
    iconClass: "text-fuchsia-700 dark:text-fuchsia-300",
    iconBgClass: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    dotClass: "bg-fuchsia-500",
  },
  {
    match: "/yedekleme",
    title: "Yedekleme",
    eyebrow: "Halefiyet yönetimi",
    description: "Kritik rol sahiplerini, kayıp etkisini, hazır halef adaylarını ve hazırlık seviyesini risk odaklı karar ekranında yönetin.",
    steps: ["Kritik Rol", "Risk", "Halef", "Hazırlık"],
    icon: Crown,
    iconClass: "text-amber-700 dark:text-amber-300",
    iconBgClass: "bg-amber-50 dark:bg-amber-950/30",
    dotClass: "bg-amber-500",
  },
  {
    match: "/maas",
    title: "Maaş Simülasyonu",
    eyebrow: "Ücret & bütçe analitiği",
    description: "Ücret senaryolarını piyasa benchmarkı, enflasyon ve bütçe etkisiyle birlikte finansal karar çalışma alanında simüle edin.",
    steps: ["Veri", "Senaryo", "Piyasa", "Bütçe"],
    icon: DollarSign,
    iconClass: "text-emerald-700 dark:text-emerald-300",
    iconBgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    dotClass: "bg-emerald-500",
  },
  {
    match: "/ise-alim",
    title: "İşe Alım",
    eyebrow: "Aday karar akışı",
    description: "Aday havuzu, yetkinlik testi, güvenilirlik göstergeleri, mülakat ve nihai kararı tek işe alım pipeline'ında yönetin.",
    steps: ["Aday", "Test", "Mülakat", "Karar"],
    icon: UserPlus,
    iconClass: "text-rose-700 dark:text-rose-300",
    iconBgClass: "bg-rose-50 dark:bg-rose-950/30",
    dotClass: "bg-rose-500",
  },
  {
    match: "/aday-testi",
    title: "Yetkinlik Testi",
    eyebrow: "Yetkinlik değerlendirmesi",
    description: "130 soruluk standart değerlendirmeyi dikkat dağıtmayan sınav deneyimi, süre takibi ve tutarlı puanlama akışıyla yürütün.",
    steps: ["Hazırlık", "130 Soru", "Puanlama", "Rapor"],
    icon: FileText,
    iconClass: "text-blue-700 dark:text-blue-300",
    iconBgClass: "bg-blue-50 dark:bg-blue-950/30",
    dotClass: "bg-blue-500",
  },
  {
    match: "/ekip-yonetimi",
    title: "Ekip & Kullanıcı",
    eyebrow: "Erişim & ekip yönetimi",
    description: "Çalışan kayıtlarını, kullanıcı hesaplarını, rollerini ve yönetim kapsamlarını güvenlik odaklı bir yönetim konsolunda kontrol edin.",
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
        <div className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${config.iconBgClass} ${config.iconClass}`}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500 dark:text-slate-400">
                  {config.eyebrow}
                </span>
              </div>
              <h1 className="text-[18px] font-semibold leading-6 tracking-[-0.025em] text-slate-900 dark:text-slate-100">
                {config.title}
              </h1>
              <p className="mt-0.5 max-w-3xl text-[11.5px] leading-5 text-slate-500 dark:text-slate-400">
                {config.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 xl:max-w-[48%] xl:justify-end">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">İş akışı</span>
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

        /* The dashboard never receives any of these module-* workspace classes. */
        .module-page-content[class*="module-"] {
          --mw-accent: #4f46e5;
          --mw-accent-strong: #4338ca;
          --mw-soft: #eef2ff;
          --mw-border: #c7d2fe;
          --mw-ink: #172033;
        }

        .module-izinler { --mw-accent: #0f766e; --mw-accent-strong: #115e59; --mw-soft: #f0fdfa; --mw-border: #99f6e4; }
        .module-organizasyon { --mw-accent: #0369a1; --mw-accent-strong: #075985; --mw-soft: #f0f9ff; --mw-border: #bae6fd; }
        .module-degerlendirme { --mw-accent: #7c3aed; --mw-accent-strong: #6d28d9; --mw-soft: #f5f3ff; --mw-border: #ddd6fe; }
        .module-yetenek-matrisi { --mw-accent: #4f46e5; --mw-accent-strong: #4338ca; --mw-soft: #eef2ff; --mw-border: #c7d2fe; }
        .module-egitim { --mw-accent: #0e7490; --mw-accent-strong: #155e75; --mw-soft: #ecfeff; --mw-border: #a5f3fc; }
        .module-gelisim { --mw-accent: #047857; --mw-accent-strong: #065f46; --mw-soft: #ecfdf5; --mw-border: #a7f3d0; }
        .module-kariyer { --mw-accent: #a21caf; --mw-accent-strong: #86198f; --mw-soft: #fdf4ff; --mw-border: #f5d0fe; }
        .module-yedekleme { --mw-accent: #b45309; --mw-accent-strong: #92400e; --mw-soft: #fffbeb; --mw-border: #fde68a; }
        .module-maas { --mw-accent: #047857; --mw-accent-strong: #065f46; --mw-soft: #ecfdf5; --mw-border: #a7f3d0; }
        .module-ise-alim { --mw-accent: #be123c; --mw-accent-strong: #9f1239; --mw-soft: #fff1f2; --mw-border: #fecdd3; }
        .module-aday-testi { --mw-accent: #1d4ed8; --mw-accent-strong: #1e40af; --mw-soft: #eff6ff; --mw-border: #bfdbfe; }
        .module-ekip-yonetimi { --mw-accent: #334155; --mw-accent-strong: #1e293b; --mw-soft: #f8fafc; --mw-border: #cbd5e1; }

        /* Remove duplicated legacy page title blocks now that the workspace header owns hierarchy. */
        .module-page-content[class*="module-"] > div > .mb-4:first-child:has(h1),
        .module-page-content[class*="module-"] > div > .mb-5:first-child:has(h1),
        .module-page-content[class*="module-"] > div > .mb-6:first-child:has(h1) {
          display: none;
        }

        /* Shared enterprise surface treatment, scoped only to the 12 module workspaces. */
        .module-page-content[class*="module-"] div.bg-white.border.border-slate-200,
        .module-page-content[class*="module-"] section.bg-white.border.border-slate-200 {
          border-color: #e2e8f0 !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.035), 0 6px 18px rgba(15, 23, 42, 0.025) !important;
        }

        .module-page-content[class*="module-"] .shadow-lg,
        .module-page-content[class*="module-"] .shadow-xl,
        .module-page-content[class*="module-"] .shadow-2xl {
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.045) !important;
        }

        .module-page-content[class*="module-"] .rounded-2xl,
        .module-page-content[class*="module-"] .rounded-3xl {
          border-radius: 0.875rem !important;
        }

        .module-page-content[class*="module-"] h2,
        .module-page-content[class*="module-"] h3 {
          color: #172033;
          letter-spacing: -0.018em;
        }

        .dark .module-page-content[class*="module-"] h2,
        .dark .module-page-content[class*="module-"] h3 {
          color: #e5e7eb;
        }

        .module-page-content[class*="module-"] input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
        .module-page-content[class*="module-"] select,
        .module-page-content[class*="module-"] textarea {
          min-height: 2.35rem;
          border-radius: 0.55rem !important;
          border-color: #cbd5e1 !important;
          box-shadow: none !important;
        }

        .module-page-content[class*="module-"] input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):focus,
        .module-page-content[class*="module-"] select:focus,
        .module-page-content[class*="module-"] textarea:focus {
          border-color: var(--mw-accent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--mw-accent) 12%, transparent) !important;
          outline: none !important;
        }

        .module-page-content[class*="module-"] button.bg-blue-600,
        .module-page-content[class*="module-"] a.bg-blue-600,
        .module-page-content[class*="module-"] button.bg-indigo-600,
        .module-page-content[class*="module-"] a.bg-indigo-600 {
          background: var(--mw-accent) !important;
        }

        .module-page-content[class*="module-"] button.bg-blue-600:hover,
        .module-page-content[class*="module-"] a.bg-blue-600:hover,
        .module-page-content[class*="module-"] button.bg-indigo-600:hover,
        .module-page-content[class*="module-"] a.bg-indigo-600:hover {
          background: var(--mw-accent-strong) !important;
        }

        .module-page-content[class*="module-"] .text-blue-600:not(.text-semantic),
        .module-page-content[class*="module-"] .text-indigo-600:not(.text-semantic) {
          color: var(--mw-accent) !important;
        }

        .module-page-content[class*="module-"] .border-blue-600,
        .module-page-content[class*="module-"] .border-indigo-600 {
          border-color: var(--mw-accent) !important;
        }

        .module-page-content[class*="module-"] table {
          width: 100%;
          font-variant-numeric: tabular-nums;
          border-collapse: separate;
          border-spacing: 0;
        }

        .module-page-content[class*="module-"] thead th {
          background: #f8fafc;
          color: #64748b;
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.055em;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
        }

        .dark .module-page-content[class*="module-"] thead th {
          background: #172033;
          color: #94a3b8;
          border-bottom-color: #334155;
        }

        .module-page-content[class*="module-"] tbody tr {
          transition: background-color 140ms ease, box-shadow 140ms ease;
        }

        .module-page-content[class*="module-"] tbody tr:hover {
          background: rgba(248, 250, 252, 0.9);
        }

        .dark .module-page-content[class*="module-"] tbody tr:hover {
          background: rgba(30, 41, 59, 0.52);
        }

        .module-page-content[class*="module-"] .font-mono {
          font-variant-numeric: tabular-nums;
        }

        /* IZIN — operational, calendar-first workspace */
        .module-izinler div.border-b.border-slate-200:has(> button) {
          width: fit-content;
          max-width: 100%;
          display: flex;
          gap: 0.25rem !important;
          padding: 0.25rem;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0.65rem;
          background: #fff;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
        }

        .module-izinler div.border-b.border-slate-200:has(> button) > button {
          border: 0 !important;
          border-radius: 0.48rem;
          padding: 0.48rem 0.8rem !important;
          font-size: 0.76rem !important;
        }

        .module-izinler div.border-b.border-slate-200:has(> button) > button.border-blue-600 {
          background: var(--mw-accent) !important;
          color: #fff !important;
          box-shadow: 0 1px 2px rgba(15, 118, 110, 0.18);
        }

        .module-izinler .fc .fc-toolbar-title {
          font-size: 0.9rem !important;
          font-weight: 650 !important;
          color: #172033;
        }

        .module-izinler .fc .fc-button-primary {
          background: #fff !important;
          border-color: #cbd5e1 !important;
          color: #475569 !important;
          box-shadow: none !important;
        }

        .module-izinler .fc .fc-button-primary:not(:disabled).fc-button-active,
        .module-izinler .fc .fc-button-primary:not(:disabled):active {
          background: var(--mw-soft) !important;
          border-color: var(--mw-border) !important;
          color: var(--mw-accent) !important;
        }

        .module-izinler div.bg-white.border.border-slate-200:has(.text-xl.font-semibold) {
          border-top: 2px solid var(--mw-border) !important;
        }

        /* ORGANIZATION — dense data management and hierarchy workspace */
        .module-organizasyon table {
          font-size: 0.76rem;
        }

        .module-organizasyon thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          white-space: nowrap;
        }

        .module-organizasyon tbody td {
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        .module-organizasyon tbody tr:last-child td {
          border-bottom: 0;
        }

        .module-organizasyon div.bg-white.border.border-slate-200:has(.text-xl.font-semibold.font-mono) {
          border-top: 2px solid var(--mw-accent) !important;
          background: linear-gradient(180deg, var(--mw-soft) 0%, #fff 48%) !important;
        }

        .module-organizasyon button:has(svg),
        .module-organizasyon a:has(svg) {
          font-weight: 550;
        }

        /* 360 — focused scoring workbench */
        .module-degerlendirme input[type="range"] {
          width: 100%;
          height: 0.38rem;
          accent-color: var(--mw-accent);
          cursor: pointer;
        }

        .module-degerlendirme div.bg-blue-50.border.border-blue-200 {
          background: var(--mw-soft) !important;
          border-color: var(--mw-border) !important;
        }

        .module-degerlendirme div.bg-white.border.border-slate-200:has(> h2),
        .module-degerlendirme div.bg-white.border.border-slate-200:has(> h3) {
          border-left: 3px solid color-mix(in srgb, var(--mw-accent) 58%, white) !important;
        }

        .module-degerlendirme label.uppercase {
          color: #64748b !important;
          letter-spacing: 0.07em !important;
        }

        /* TALENT MATRIX — analytical decision canvas */
        .module-yetenek-matrisi div.bg-white.border.border-slate-200:has(svg) {
          border-top: 2px solid color-mix(in srgb, var(--mw-accent) 48%, white) !important;
        }

        .module-yetenek-matrisi [class~="bg-indigo-50"],
        .module-yetenek-matrisi [class~="bg-blue-50"] {
          background: var(--mw-soft) !important;
        }

        .module-yetenek-matrisi .recharts-cartesian-grid line {
          stroke: #e9eef5;
        }

        /* EDUCATION — learning operations / assignment cards */
        .module-egitim div.bg-white.border.border-slate-200:has(button) {
          border-left: 3px solid color-mix(in srgb, var(--mw-accent) 45%, white) !important;
        }

        .module-egitim button:has(svg),
        .module-egitim a:has(svg) {
          border-radius: 0.55rem !important;
        }

        .module-egitim .bg-blue-50,
        .module-egitim .bg-cyan-50 {
          background: var(--mw-soft) !important;
        }

        /* DEVELOPMENT — competency gap to plan workspace */
        .module-gelisim div.bg-white.border.border-slate-200:has(button.w-full) {
          border-left: 3px solid color-mix(in srgb, var(--mw-accent) 52%, white) !important;
        }

        .module-gelisim button.w-full {
          text-align: left;
        }

        .module-gelisim .bg-green-50,
        .module-gelisim .bg-emerald-50 {
          background: var(--mw-soft) !important;
        }

        /* CAREER — route / target-role workspace */
        .module-kariyer div.bg-white.border.border-slate-200:has(select) {
          border-top: 2px solid color-mix(in srgb, var(--mw-accent) 48%, white) !important;
        }

        .module-kariyer select {
          font-weight: 550;
        }

        .module-kariyer .bg-purple-50,
        .module-kariyer .bg-fuchsia-50,
        .module-kariyer .bg-violet-50 {
          background: var(--mw-soft) !important;
        }

        /* SUCCESSION — risk and successor decision cards */
        .module-yedekleme div.bg-white.border.border-slate-200 {
          border-top: 2px solid color-mix(in srgb, var(--mw-accent) 35%, white) !important;
        }

        .module-yedekleme .bg-red-50,
        .module-yedekleme .bg-orange-50,
        .module-yedekleme .bg-amber-50 {
          border-radius: 0.6rem;
        }

        .module-yedekleme .text-red-600,
        .module-yedekleme .text-orange-600,
        .module-yedekleme .text-amber-600 {
          font-weight: 650;
        }

        /* SALARY — financial simulation workspace */
        .module-maas div.border-b.border-slate-200:has(> button) {
          display: inline-flex;
          gap: 0.25rem !important;
          padding: 0.25rem;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0.65rem;
          background: #fff;
        }

        .module-maas div.border-b.border-slate-200:has(> button) > button {
          border: 0 !important;
          border-radius: 0.48rem;
        }

        .module-maas div.border-b.border-slate-200:has(> button) > button.border-blue-600 {
          background: var(--mw-accent) !important;
          color: #fff !important;
        }

        .module-maas .text-xl,
        .module-maas .text-2xl,
        .module-maas .text-3xl {
          font-variant-numeric: tabular-nums;
        }

        .module-maas div.bg-white.border.border-slate-200:has(.font-mono) {
          border-top: 2px solid color-mix(in srgb, var(--mw-accent) 48%, white) !important;
        }

        /* RECRUITMENT — candidate pipeline / decision workspace */
        .module-ise-alim div.bg-white.border.border-slate-200:has(.rounded-full) {
          border-left: 3px solid color-mix(in srgb, var(--mw-accent) 42%, white) !important;
        }

        .module-ise-alim .bg-blue-50,
        .module-ise-alim .bg-indigo-50 {
          background: var(--mw-soft) !important;
        }

        .module-ise-alim button:has(svg),
        .module-ise-alim a:has(svg) {
          border-radius: 0.55rem !important;
        }

        /* COMPETENCY TEST — distraction-free assessment workspace */
        .module-aday-testi > div {
          max-width: 1180px;
          margin-left: auto;
          margin-right: auto;
        }

        .module-aday-testi div.bg-white.border.border-slate-200 {
          border-top: 2px solid color-mix(in srgb, var(--mw-accent) 38%, white) !important;
        }

        .module-aday-testi input[type="radio"] {
          accent-color: var(--mw-accent);
        }

        .module-aday-testi .bg-blue-50,
        .module-aday-testi .bg-indigo-50 {
          background: var(--mw-soft) !important;
        }

        /* TEAM & USERS — security-oriented admin console */
        .module-ekip-yonetimi table {
          font-size: 0.76rem;
        }

        .module-ekip-yonetimi thead th {
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .module-ekip-yonetimi div.bg-white.border.border-slate-200:has(.rounded-full),
        .module-ekip-yonetimi div.bg-white.border.border-slate-200:has(.rounded-lg) {
          border-left: 3px solid #cbd5e1 !important;
        }

        .module-ekip-yonetimi .bg-blue-50,
        .module-ekip-yonetimi .bg-indigo-50 {
          background: #f8fafc !important;
        }

        @media (max-width: 1024px) {
          .module-context {
            margin-top: 0.25rem;
          }

          .module-page-content[class*="module-"] table {
            min-width: 720px;
          }
        }

        @media (max-width: 640px) {
          .module-page-content[class*="module-"] > div {
            min-width: 0;
          }

          .module-page-content[class*="module-"] div.border-b.border-slate-200:has(> button) {
            width: 100%;
            overflow-x: auto;
          }
        }
      `}</style>
    </>
  );
}
