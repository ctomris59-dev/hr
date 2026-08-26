"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Crown,
  DollarSign,
  FileText,
  Gauge,
  MapPin,
  Plane,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

type ModuleConfig = {
  path: string;
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  focus: string;
  steps: string[];
  icon: LucideIcon;
  accent: string;
  accent2: string;
  soft: string;
};

const MODULES: ModuleConfig[] = [
  {
    path: "/izinler",
    id: "izinler",
    title: "İzin Yönetimi",
    eyebrow: "İzin operasyon merkezi",
    description: "Bakiye, talep, yönetici onayı ve ekip takvimini tek akışta yönetin.",
    focus: "Bekleyen talepleri ve ekip çakışmalarını önce çözün.",
    steps: ["Bakiye", "Talep", "Onay", "Takvim"],
    icon: Plane,
    accent: "#0284c7",
    accent2: "#0f766e",
    soft: "#eff6ff",
  },
  {
    path: "/organizasyon",
    id: "organizasyon",
    title: "Çalışanlar & Organizasyon",
    eyebrow: "Kadro ve hiyerarşi",
    description: "Çalışan, departman, pozisyon, yönetici ve kıdem bilgisini tek doğruluk kaynağında yönetin.",
    focus: "Eksik yönetici, pozisyon ve organizasyon bağlantılarını görünür tutun.",
    steps: ["Çalışanlar", "Departman", "Hiyerarşi", "Organizasyon Ağacı"],
    icon: Building2,
    accent: "#2563eb",
    accent2: "#475569",
    soft: "#eff6ff",
  },
  {
    path: "/degerlendirme",
    id: "degerlendirme",
    title: "Performans & Yetkinlik",
    eyebrow: "Değerlendirme ve kalibrasyon",
    description: "Yönetici değerlendirmelerini, 10 temel yetkinliği ve performans trendini tek karar alanında yönetin.",
    focus: "Puanlamayı rol hedefleri ve geçmiş trend ile birlikte değerlendirin.",
    steps: ["Çalışan", "Yetkinlik", "Performans", "Kalibrasyon"],
    icon: RefreshCw,
    accent: "#4f46e5",
    accent2: "#7c3aed",
    soft: "#eef2ff",
  },
  {
    path: "/yetenek-matrisi",
    id: "yetenek-matrisi",
    title: "Yetenek Matrisi",
    eyebrow: "9-Box karar desteği",
    description: "Performans, potansiyel endeksi ve yetkinlik açıklarını aynı yetenek görünümünde birleştirin.",
    focus: "Yıldızları koruyun, kritik riskleri aksiyona ve gelişim planına bağlayın.",
    steps: ["9-Box", "Potansiyel", "Gap", "Aksiyon"],
    icon: BarChart3,
    accent: "#4f46e5",
    accent2: "#059669",
    soft: "#eef2ff",
  },
  {
    path: "/egitim",
    id: "egitim",
    title: "Eğitim",
    eyebrow: "Öğrenme operasyonları",
    description: "Eğitim kataloğu, atamalar, son tarihler ve tamamlanma durumunu operasyonel olarak takip edin.",
    focus: "Geciken eğitimleri kapatın ve tamamlanma oranını yükseltin.",
    steps: ["Katalog", "Atama", "Takip", "Tamamlama"],
    icon: BookOpen,
    accent: "#0891b2",
    accent2: "#2563eb",
    soft: "#ecfeff",
  },
  {
    path: "/gelisim",
    id: "gelisim",
    title: "Gelişim Planı",
    eyebrow: "Yetkinlikten aksiyona",
    description: "Yetkinlik açığını hedef, aksiyon, başarı ölçütü ve takip edilebilir gelişim planına dönüştürün.",
    focus: "Kritik gap’leri ölçülebilir gelişim aksiyonlarına bağlayın.",
    steps: ["Gap", "Hedef", "Aksiyon", "İlerleme"],
    icon: Clock3,
    accent: "#059669",
    accent2: "#4f46e5",
    soft: "#ecfdf5",
  },
  {
    path: "/kariyer",
    id: "kariyer",
    title: "Kariyer Yolu",
    eyebrow: "Rol ve mobilite mimarisi",
    description: "Job family, job level, hedef rol ve hazır bulunuşluk bileşenlerini birlikte değerlendirin.",
    focus: "Kariyer rotasını yalnızca puana değil, seviye ve rol mimarisine bağlayın.",
    steps: ["Mevcut Rol", "Hedef Rol", "Hazırlık", "Yol Haritası"],
    icon: MapPin,
    accent: "#c026d3",
    accent2: "#d97706",
    soft: "#fdf4ff",
  },
  {
    path: "/yedekleme",
    id: "yedekleme",
    title: "Yedekleme & Halefiyet",
    eyebrow: "Kritik rol sürekliliği",
    description: "Kritik roller, halef adayları, hazır olma süresi ve kayıp etkisini aynı plan üzerinde yönetin.",
    focus: "Halefsiz kritik rolleri ve 12 ay içinde hazır hale gelebilecek adayları önceliklendirin.",
    steps: ["Kritik Rol", "Aday", "Hazırlık", "Aksiyon"],
    icon: Crown,
    accent: "#dc2626",
    accent2: "#d97706",
    soft: "#fef2f2",
  },
  {
    path: "/maas",
    id: "maas",
    title: "Maaş Simülasyonu",
    eyebrow: "Ücret ve bütçe kararları",
    description: "İç ücret referansı, dış benchmark, senaryolar ve ücret dönemini kontrollü bir onay akışında yönetin.",
    focus: "Simülasyonu doğrudan maaşa yazmadan bütçe, onay ve kesinleştirme adımlarından geçirin.",
    steps: ["Benchmark", "Simülasyon", "Bütçe", "Kesinleştirme"],
    icon: DollarSign,
    accent: "#0f766e",
    accent2: "#2563eb",
    soft: "#f0fdfa",
  },
  {
    path: "/ise-alim",
    id: "ise-alim",
    title: "İşe Alım",
    eyebrow: "Aday pipeline yönetimi",
    description: "Başvurudan teklife kadar adayları, test içgörülerini ve değerlendirme kanıtlarını tek ATS akışında yönetin.",
    focus: "Test skorunu tek başına karar değil, mülakat ve rol uyumuyla birlikte bir kanıt olarak kullanın.",
    steps: ["Başvuru", "Ön Eleme", "Test", "Mülakat", "Teklif"],
    icon: UserPlus,
    accent: "#7c3aed",
    accent2: "#0d9488",
    soft: "#f5f3ff",
  },
  {
    path: "/aday-testi",
    id: "aday-testi",
    title: "Yetkinlik Testi",
    eyebrow: "FHR-COMP-1.2",
    description: "130 soruluk temel yetkinlik envanterini kontrollü, odaklı ve sürümlenmiş bir değerlendirme akışında uygulayın.",
    focus: "Test sırasında dikkat dağıtıcı öğeleri azaltın; ilerleme, süre ve yanıt kalitesini görünür tutun.",
    steps: ["Hazırlık", "130 Soru", "Yanıt Kalitesi", "Rapor"],
    icon: FileText,
    accent: "#2563eb",
    accent2: "#4f46e5",
    soft: "#eff6ff",
  },
  {
    path: "/ekip-yonetimi",
    id: "ekip-yonetimi",
    title: "Ekip",
    eyebrow: "Yönetici çalışma alanı",
    description: "Bağlı çalışanları, açık aksiyonları ve günlük yönetici ihtiyaçlarını sade bir ekip görünümünden yönetin.",
    focus: "Ekip aksiyonlarını tek ekranda görün; çalışan ana verisini Organizasyon modülünde tutun.",
    steps: ["Ekip", "Aksiyon", "Gelişim", "Takip"],
    icon: Users,
    accent: "#475569",
    accent2: "#4f46e5",
    soft: "#f8fafc",
  },
  {
    path: "/admin",
    id: "admin",
    title: "Kullanıcı & Yetki",
    eyebrow: "Erişim yönetişimi",
    description: "Demo kullanıcı hesaplarını, rol erişimlerini ve sunum verisi yönetimini tek güvenli yönetim alanında tutun.",
    focus: "Sunum verisini gerektiğinde tek tuşla oluşturun; kullanıcı ve çalışan ana verisini birbirinden ayırın.",
    steps: ["Demo", "Kullanıcı", "Rol", "Erişim"],
    icon: ShieldCheck,
    accent: "#334155",
    accent2: "#d97706",
    soft: "#f8fafc",
  },
  {
    path: "/yonetici/maas-talep",
    id: "maas-talep",
    title: "Yönetici Maaş Talepleri",
    eyebrow: "Ücret öneri akışı",
    description: "Yönetici ücret önerilerini aktif ücret dönemine kaydedin ve bütçe kullanımını kontrollü biçimde izleyin.",
    focus: "Önerileri doğrudan maaşa uygulamadan ücret döngüsüne gönderin.",
    steps: ["Çalışan", "Öneri", "Bütçe", "Gönderim"],
    icon: Gauge,
    accent: "#0f766e",
    accent2: "#d97706",
    soft: "#f0fdfa",
  },
];

function findConfig(pathname: string) {
  return [...MODULES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`));
}

export default function ModuleWorkspace({ pathname, children }: { pathname: string; children: ReactNode }) {
  if (pathname === "/dashboard") return <>{children}</>;
  const config = findConfig(pathname);
  if (!config) return <>{children}</>;

  const Icon = config.icon;
  const style = {
    "--module-accent": config.accent,
    "--module-accent-2": config.accent2,
    "--module-soft": config.soft,
  } as CSSProperties;

  return (
    <div className={`module-workspace workspace-${config.id}`} data-module={config.id} style={style}>
      <section className="module-hero">
        <div className="module-hero-glow" aria-hidden="true" />
        <div className="module-hero-main">
          <div className="module-hero-icon"><Icon className="h-5 w-5" strokeWidth={1.8} /></div>
          <div className="min-w-0">
            <div className="module-hero-eyebrow"><Sparkles className="h-3 w-3" />{config.eyebrow}</div>
            <h1 className="module-hero-title">{config.title}</h1>
            <p className="module-hero-description">{config.description}</p>
          </div>
        </div>

        <div className="module-hero-side">
          <div className="module-live-badge"><CheckCircle2 className="h-3.5 w-3.5" />Canlı modül</div>
          <div className="module-focus-card">
            <div className="module-focus-label"><Target className="h-3.5 w-3.5" />Yönetim odağı</div>
            <p>{config.focus}</p>
          </div>
        </div>

        <div className="module-workflow" aria-label={`${config.title} iş akışı`}>
          <div className="module-workflow-label"><Activity className="h-3.5 w-3.5" />Akış</div>
          {config.steps.map((step, index) => (
            <div className="module-workflow-step" key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>{step}
            </div>
          ))}
        </div>
      </section>

      <section className="module-native-content">{children}</section>
    </div>
  );
}
