"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  Clock3,
  Crown,
  DollarSign,
  FileInput,
  FileText,
  Gauge,
  Heart,
  LockKeyhole,
  MapPin,
  Plane,
  RefreshCw,
  Scale,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import ProductHealthStrip from "./ProductHealthStrip";
import OrganizationExcelExchange from "./hr/OrganizationExcelExchange";
import ImportRecoveryPanel from "./hr/ImportRecoveryPanel";
import PerformanceCycleBar from "./hr/PerformanceCycleBar";
import SalaryExcelExchange from "./salary/SalaryExcelExchange";
import CompensationCycleBar from "./salary/CompensationCycleBar";
import ModuleFamilyNavigator from "./ModuleFamilyNavigator";
import ModuleDecisionSummary from "./VisualDecisionSystem";
import VisualModuleBoard from "./VisualModuleBoard";
import CoreAnalyticsBoard from "./CoreAnalyticsBoard";
import UniversalAnalyticsBoard from "./UniversalAnalyticsBoard";

type ModuleConfig = {
  path: string;
  id: string;
  title: string;
  focus: string;
  steps: string[];
  icon: LucideIcon;
  accent: string;
  accent2: string;
  soft: string;
};

const MODULES: ModuleConfig[] = [
  { path: "/izinler", id: "izinler", title: "İzin Yönetimi", focus: "Bakiye, talep, onay ve ekip çakışmalarını birlikte yönetin.", steps: ["Bakiye", "Talep", "Onay", "Takvim"], icon: Plane, accent: "#3974f6", accent2: "#17aaa5", soft: "#eef4ff" },
  { path: "/calisan-deneyimi", id: "deneyim", title: "Çalışan Deneyimi & Nabız", focus: "Mikro-pulse sonuçlarını yalnızca anonim eşik üzerinden driver değişimleriyle yorumlayın.", steps: ["Check-in", "Anonimlik", "Driver", "Aksiyon"], icon: Heart, accent: "#ed516d", accent2: "#8255ef", soft: "#fff0f3" },
  { path: "/organizasyon", id: "organizasyon", title: "Çalışanlar & Organizasyon", focus: "Personel, rol, yönetici ve organizasyon yapısını grafik öncelikli bir çalışma alanında yönetin.", steps: ["Çalışan", "Rol", "Yönetici", "Excel"], icon: Building2, accent: "#3974f6", accent2: "#17aaa5", soft: "#eef4ff" },
  { path: "/rol-mimarisi", id: "rol-mimarisi", title: "Rol & Yetkinlik Mimarisi", focus: "Pozisyonları rol ailesi, seviye ve hedef yetkinlik profiline bağlayın.", steps: ["Pozisyon", "Job Family", "Seviye", "Hedef Profil"], icon: Target, accent: "#3974f6", accent2: "#8255ef", soft: "#eef4ff" },
  { path: "/degerlendirme", id: "degerlendirme", title: "Performans", focus: "KPI, yönetici gözlemi ve yetkinlik kanıtını aynı performans görünümünde yönetin.", steps: ["Dönem", "Hedef", "Kanıt", "Kaydet"], icon: RefreshCw, accent: "#5b5ce2", accent2: "#8255ef", soft: "#f0f0ff" },
  { path: "/kalibrasyon", id: "kalibrasyon", title: "Performans Kalibrasyonu", focus: "KPI-yönetici farklarını ve düşük evidence kayıtlarını görsel olarak kalibre edin.", steps: ["Dönem", "Fark", "Kanıt", "Kalibrasyon"], icon: Scale, accent: "#8255ef", accent2: "#3974f6", soft: "#f4f0ff" },
  { path: "/yetenek-matrisi", id: "yetenek-matrisi", title: "Yetenek & 9-Box", focus: "Performans, potansiyel ve evidence güvenini aynı yetenek karar zincirinde değerlendirin.", steps: ["Performans", "Potansiyel", "9-Box", "Aksiyon"], icon: BarChart3, accent: "#18a97d", accent2: "#3974f6", soft: "#ebfbf5" },
  { path: "/egitim", id: "egitim", title: "Eğitim & Müdahaleler", focus: "Atamayı değil; tamamlama, transfer kanıtı ve doğrulanmış etkiyi izleyin.", steps: ["Katalog", "Atama", "Transfer", "Ölçüm"], icon: BookOpen, accent: "#17aaa5", accent2: "#3974f6", soft: "#eafaf9" },
  { path: "/gelisim", id: "gelisim", title: "Gelişim Planı", focus: "Yetkinlik açığını aksiyona, ilerlemeye ve yeniden ölçüme dönüştürün.", steps: ["Gap", "Hedef", "Aksiyon", "İlerleme"], icon: Clock3, accent: "#17aaa5", accent2: "#18a97d", soft: "#eafaf9" },
  { path: "/gelisim-analitigi", id: "gelisim-analitigi", title: "Gelişim Etkinliği", focus: "Transfer kanıtı ile yeniden ölçümü birleştirerek gelişim etkisini görün.", steps: ["Transfer", "Doğrulama", "Yeniden Ölçüm", "Etkinlik"], icon: BarChart3, accent: "#18a97d", accent2: "#17aaa5", soft: "#ebfbf5" },
  { path: "/kariyer", id: "kariyer", title: "Kariyer & Readiness", focus: "Hazır bulunuşluğu rol uyumu, performans, potansiyel ve veri kapsamıyla birlikte görün.", steps: ["Mevcut Rol", "Hedef Rol", "Kapsam", "Yol"], icon: MapPin, accent: "#8255ef", accent2: "#ed516d", soft: "#f4f0ff" },
  { path: "/yedekleme", id: "yedekleme", title: "Halefiyet & Yedekleme", focus: "Kritik rol sürekliliğini, hazır aday oranını ve bench depth'i görsel olarak yönetin.", steps: ["Kritik Rol", "Aday", "Kanıt", "Hazırlık"], icon: Crown, accent: "#ed516d", accent2: "#f2a000", soft: "#fff0f3" },
  { path: "/maas", id: "maas", title: "Ücret & Bütçe", focus: "Benchmark, bütçe etkisi ve A/B/C/D simülasyonlarını aynı ücret karar merkezinde yönetin.", steps: ["Veri", "Yönetici", "Bütçe", "Onay"], icon: DollarSign, accent: "#18a97d", accent2: "#3974f6", soft: "#ebfbf5" },
  { path: "/yonetici/maas-talep", id: "maas-talep", title: "Yönetici Ücret Önerileri", focus: "Yönetici önerisini bütçe ve benchmark ile birlikte kontrollü ücret döngüsüne gönderin.", steps: ["Çalışan", "Öneri", "Bütçe", "Gönder"], icon: Gauge, accent: "#18a97d", accent2: "#3974f6", soft: "#ebfbf5" },
  { path: "/ise-alim", id: "ise-alim", title: "İşe Alım", focus: "Aday kalitesi, pipeline dönüşümü ve kanıt kapsamını aynı işe alım dashboard'unda yönetin.", steps: ["Başvuru", "Kanıt", "Mülakat", "Teklif"], icon: UserPlus, accent: "#8255ef", accent2: "#3974f6", soft: "#f4f0ff" },
  { path: "/aday-testi", id: "aday-testi", title: "Yetkinlik Testleri", focus: "Test hacmini, kalite sinyalini ve rol uyumunu görsel karar desteğiyle yönetin.", steps: ["Hazırlık", "Test", "Kalite", "Rapor"], icon: FileText, accent: "#8255ef", accent2: "#3974f6", soft: "#f4f0ff" },
  { path: "/ekip-yonetimi", id: "ekip-yonetimi", title: "Ekip Yönetimi", focus: "Yönetici span'lerini, ekip yükünü ve günlük aksiyonları tek ekip görünümünde izleyin.", steps: ["Ekip", "Aksiyon", "Gelişim", "Takip"], icon: Users, accent: "#3974f6", accent2: "#17aaa5", soft: "#eef4ff" },
  { path: "/kurulum", id: "kurulum", title: "Şirket Kurulumu", focus: "Yeni şirketi organizasyon, dönem, ücret ve yetki adımlarıyla pilot kullanıma hazırlayın.", steps: ["Şirket", "Organizasyon", "Dönem", "Güven"], icon: Settings2, accent: "#64748b", accent2: "#3974f6", soft: "#f1f5f9" },
  { path: "/admin/veri-aktarimi", id: "veri-aktarimi", title: "Veri Aktarım Merkezi", focus: "Excel ve kaynak sistem verisini ortak çalışan veri modeline eşleyin.", steps: ["Kaynak", "Eşleme", "Kontrol", "Aktarım"], icon: FileInput, accent: "#17aaa5", accent2: "#3974f6", soft: "#eafaf9" },
  { path: "/admin/guven-kvkk", id: "guven-kvkk", title: "Güven & KVKK", focus: "AI kullanım izi, veri minimizasyonu, anonimlik ve saklama risklerini görünür tutun.", steps: ["Gizlilik", "AI Audit", "Saklama", "Kontrol"], icon: LockKeyhole, accent: "#64748b", accent2: "#8255ef", soft: "#f1f5f9" },
  { path: "/ayarlar/yetki-mimarisi", id: "yetki-mimarisi", title: "Yetki Mimarisi", focus: "Hassas modülleri rol, kapsam ve firma politikalarıyla yönetin.", steps: ["Rol", "Modül", "Kapsam", "Politika"], icon: SlidersHorizontal, accent: "#64748b", accent2: "#3974f6", soft: "#f1f5f9" },
  { path: "/admin", id: "admin", title: "Yönetim & Ayarlar", focus: "Kullanıcı, kurulum, veri aktarımı, güven ve erişim politikalarını merkezi yönetin.", steps: ["Kullanıcı", "Kurulum", "Veri", "Güven"], icon: ShieldCheck, accent: "#64748b", accent2: "#3974f6", soft: "#f1f5f9" },
];

function findConfig(pathname: string) {
  return [...MODULES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`));
}

function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function ModuleWorkspace({ pathname, children }: { pathname: string; children: ReactNode }) {
  if (pathname === "/dashboard") return <><ProductHealthStrip />{children}</>;
  const config = findConfig(pathname);
  if (!config) return <>{children}</>;

  const Icon = config.icon;
  const style = {
    "--module-accent": config.accent,
    "--module-accent-2": config.accent2,
    "--module-soft": config.soft,
  } as CSSProperties;

  const coreAnalytics = matches(pathname, ["/organizasyon", "/ise-alim", "/egitim", "/maas"]);
  const visualBoard = matches(pathname, ["/kariyer", "/yetenek-matrisi"]);
  const universalAnalytics = matches(pathname, [
    "/degerlendirme",
    "/kalibrasyon",
    "/calisan-deneyimi",
    "/gelisim",
    "/gelisim-analitigi",
    "/yedekleme",
    "/izinler",
    "/rol-mimarisi",
    "/aday-testi",
    "/ekip-yonetimi",
  ]);
  const visualFirst = coreAnalytics || visualBoard || universalAnalytics;
  const salaryCore = pathname === "/maas";
  const organizationTools = pathname === "/organizasyon" ? <><ImportRecoveryPanel /><div className="mb-4"><OrganizationExcelExchange /></div></> : null;
  const salaryTools = salaryCore ? <div className="mb-4"><SalaryExcelExchange /></div> : null;

  return (
    <div className={`module-workspace workspace-${config.id} module-workspace-v2`} data-module={config.id} style={style}>
      <section className="module-hero module-command-hero" aria-label={`${config.title} çalışma akışı`}>
        <div className="module-command-copy">
          <div className="module-command-kicker"><span className="module-command-live-dot" />FUTUREHR · ANALİTİK ÇALIŞMA ALANI</div>
          <div className="module-command-title-row">
            <span className="module-command-icon" style={{ background: `linear-gradient(135deg,${config.accent},${config.accent2})` }}><Icon strokeWidth={1.7} /></span>
            <div><h1>{config.title}</h1><p>{config.focus}</p></div>
          </div>
        </div>
        <div className="module-command-flow" aria-label="İş akışı adımları">
          <div className="module-command-flow-label">İş akışı</div>
          <div className="module-command-flow-steps">
            {config.steps.map((step, index) => <div key={step} className="module-command-flow-step"><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></div>)}
          </div>
        </div>
      </section>

      <div className="module-family-stage"><ModuleFamilyNavigator pathname={pathname} /></div>
      {(pathname === "/degerlendirme" || pathname === "/kalibrasyon") && <PerformanceCycleBar />}
      {(pathname === "/maas" || pathname === "/yonetici/maas-talep") && <CompensationCycleBar />}
      {pathname === "/admin/veri-aktarimi" && <ImportRecoveryPanel />}

      <div className="module-decision-stage"><ModuleDecisionSummary pathname={pathname} /></div>
      {coreAnalytics && <CoreAnalyticsBoard pathname={pathname} />}
      {visualBoard && <VisualModuleBoard pathname={pathname} />}
      {universalAnalytics && <UniversalAnalyticsBoard pathname={pathname} />}

      <section className="module-detail-stage" aria-label={`${config.title} detaylı çalışma alanı`}>
        <header className="module-detail-stage-header">
          <div>
            <span>{salaryCore ? "SİMÜLASYON MERKEZİ" : visualFirst ? "OPERASYON & DETAY" : "OPERASYON ALANI"}</span>
            <h2>{salaryCore ? "Ücret simülasyonları" : visualFirst ? "Kayıtlar, formlar ve detaylar" : "Detaylı çalışma alanı"}</h2>
          </div>
          <p>
            {salaryCore
              ? "Üstte ücret analitiğini okuyun; burada A/B/C/D senaryoları, enflasyon varsayımı, benchmark, bütçe etkisi ve ücret döngüsü ana çalışma alanı olarak açık kalır."
              : visualFirst
                ? "Önce grafik ve karar özetini okuyun. Liste, Excel ve tekil kayıt işlemlerine yalnız gerektiğinde inin."
                : "Karar özetindeki sinyalleri burada kayıt, kanıt ve iş akışı seviyesinde yönetin."}
          </p>
        </header>

        {salaryCore ? (
          <>
            <div className="module-native-content visualized-native-content">{children}</div>
            <details className="visual-first-native-shell mt-4">
              <summary><div className="vf-summary-copy"><span>ARAÇLAR</span><strong>Excel içe/dışa aktarma</strong><small>Simülasyon motoru ana ekranda kalır; veri alışverişi araçları ikincildir.</small></div></summary>
              <div className="module-native-content visualized-native-content">{salaryTools}</div>
            </details>
          </>
        ) : visualFirst ? (
          <details className="visual-first-native-shell">
            <summary><div className="vf-summary-copy"><span>DETAY</span><strong>Liste, kayıt ve işlem ekranlarını aç</strong><small>Filtreleme, Excel, düzenleme ve tekil kayıt işlemleri burada korunur.</small></div></summary>
            <div className="module-native-content visualized-native-content">{organizationTools}{children}</div>
          </details>
        ) : <div className="module-native-content visualized-native-content">{children}</div>}
      </section>
    </div>
  );
}
