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
import { useAuth } from "../context/AuthContext";
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
import AgentActionHandoff from "./AgentActionHandoff";

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
  { path: "/izinler", id: "izinler", title: "İzinler", focus: "İzin bakiyelerini görün, talep oluşturun veya bekleyen talepleri yönetin.", steps: ["Bakiyeyi gör", "Talep oluştur", "Onayla", "Takvimi gör"], icon: Plane, accent: "#3974f6", accent2: "#17aaa5", soft: "#eef4ff" },
  { path: "/calisan-deneyimi", id: "deneyim", title: "Çalışan Deneyimi", focus: "Çalışan geri bildirimlerini görün ve ekip için gerekli aksiyonları belirleyin.", steps: ["Sonucu gör", "Konuyu seç", "Aksiyonu belirle", "Takip et"], icon: Heart, accent: "#ed516d", accent2: "#8255ef", soft: "#fff0f3" },
  { path: "/organizasyon", id: "organizasyon", title: "Çalışanlar & Organizasyon", focus: "Çalışanları, departmanları, pozisyonları ve yönetici ilişkilerini yönetin.", steps: ["Çalışanı bul", "Bilgiyi kontrol et", "Güncelle", "Kaydet"], icon: Building2, accent: "#3974f6", accent2: "#17aaa5", soft: "#eef4ff" },
  { path: "/rol-mimarisi", id: "rol-mimarisi", title: "Roller & Yetkinlikler", focus: "Pozisyonların seviyelerini ve ihtiyaç duyduğu yetkinlikleri tanımlayın.", steps: ["Pozisyonu seç", "Seviyeyi belirle", "Yetkinlikleri seç", "Kaydet"], icon: Target, accent: "#3974f6", accent2: "#8255ef", soft: "#eef4ff" },
  { path: "/degerlendirme", id: "degerlendirme", title: "Performans", focus: "Dönem hedeflerini ve çalışan değerlendirmelerini kolayca yönetin.", steps: ["Dönemi seç", "Çalışanı seç", "Değerlendir", "Kaydet"], icon: RefreshCw, accent: "#5b5ce2", accent2: "#8255ef", soft: "#f0f0ff" },
  { path: "/kalibrasyon", id: "kalibrasyon", title: "Değerlendirmeleri Karşılaştır", focus: "Yönetici değerlendirmeleri arasındaki farkları karşılaştırın ve gerektiğinde gözden geçirin.", steps: ["Dönemi seç", "Farkları gör", "Açıklamayı incele", "Sonucu belirle"], icon: Scale, accent: "#8255ef", accent2: "#3974f6", soft: "#f4f0ff" },
  { path: "/yetenek-matrisi", id: "yetenek-matrisi", title: "Yetenek Değerlendirmesi", focus: "Çalışanların performans ve potansiyel durumunu tek görünümde değerlendirin.", steps: ["Çalışanı seç", "Sonucu gör", "Karşılaştır", "Aksiyon belirle"], icon: BarChart3, accent: "#18a97d", accent2: "#3974f6", soft: "#ebfbf5" },
  { path: "/egitim", id: "egitim", title: "Eğitimler", focus: "Eğitim atayın, tamamlanma durumunu görün ve sonuçları takip edin.", steps: ["Eğitimi seç", "Ata", "Takip et", "Sonucu gör"], icon: BookOpen, accent: "#17aaa5", accent2: "#3974f6", soft: "#eafaf9" },
  { path: "/gelisim", id: "gelisim", title: "Gelişim Planları", focus: "Gelişim hedeflerini belirleyin ve ilerlemeyi düzenli olarak takip edin.", steps: ["İhtiyacı seç", "Hedef koy", "Aksiyon ekle", "Takip et"], icon: Clock3, accent: "#17aaa5", accent2: "#18a97d", soft: "#eafaf9" },
  { path: "/gelisim-analitigi", id: "gelisim-analitigi", title: "Gelişim Sonuçları", focus: "Eğitim ve gelişim faaliyetlerinin işe ne kadar yansıdığını görün.", steps: ["Faaliyeti seç", "Sonucu gör", "Karşılaştır", "Karar ver"], icon: BarChart3, accent: "#18a97d", accent2: "#17aaa5", soft: "#ebfbf5" },
  { path: "/kariyer", id: "kariyer", title: "Kariyer Hazırlığı", focus: "Mevcut rolünüzü, hedef rolü ve hazırlanmanız gereken alanları görün.", steps: ["Mevcut rol", "Hedef rol", "Eksikler", "Yol haritası"], icon: MapPin, accent: "#8255ef", accent2: "#ed516d", soft: "#f4f0ff" },
  { path: "/yedekleme", id: "yedekleme", title: "Kritik Roller & Yedekler", focus: "Kritik pozisyonlar için hazır adayları ve gelişim ihtiyacını takip edin.", steps: ["Rolü seç", "Adayları gör", "Karşılaştır", "Planla"], icon: Crown, accent: "#ed516d", accent2: "#f2a000", soft: "#fff0f3" },
  { path: "/maas", id: "maas", title: "Ücret Yönetimi", focus: "Ücretleri, bütçeyi ve farklı artış seçeneklerini karşılaştırın.", steps: ["Veriyi kontrol et", "Seçenekleri karşılaştır", "Bütçeyi gör", "Onaya gönder"], icon: DollarSign, accent: "#18a97d", accent2: "#3974f6", soft: "#ebfbf5" },
  { path: "/yonetici/maas-talep", id: "maas-talep", title: "Ücret Önerileri", focus: "Yetkili olduğunuz çalışanlar için ücret önerisi oluşturup onaya gönderin.", steps: ["Çalışanı seç", "Öneriyi gir", "Gerekçeyi yaz", "Gönder"], icon: Gauge, accent: "#18a97d", accent2: "#3974f6", soft: "#ebfbf5" },
  { path: "/ise-alim", id: "ise-alim", title: "Adaylar & İşe Alım", focus: "Adayları başvurudan teklife kadar adım adım takip edin.", steps: ["Adayı gör", "Değerlendir", "Görüşme", "Teklif"], icon: UserPlus, accent: "#8255ef", accent2: "#3974f6", soft: "#f4f0ff" },
  { path: "/aday-testi", id: "aday-testi", title: "Aday Değerlendirmeleri", focus: "Aday testlerini başlatın ve sonuçları işe alım kararının bir parçası olarak inceleyin.", steps: ["Testi hazırla", "Gönder", "Sonucu gör", "Değerlendir"], icon: FileText, accent: "#8255ef", accent2: "#3974f6", soft: "#f4f0ff" },
  { path: "/ekip-yonetimi", id: "ekip-yonetimi", title: "Ekibim", focus: "Ekibinizi, açık işleri ve takip etmeniz gereken çalışan konularını görün.", steps: ["Ekibi gör", "Açık işleri gör", "İşlem yap", "Takip et"], icon: Users, accent: "#3974f6", accent2: "#17aaa5", soft: "#eef4ff" },
  { path: "/kurulum", id: "kurulum", title: "Şirket Kurulumu", focus: "FutureHR'ı şirketiniz için birkaç temel adımda kullanıma hazırlayın.", steps: ["Şirket bilgileri", "Çalışanlar", "Dönemler", "Tamamla"], icon: Settings2, accent: "#64748b", accent2: "#3974f6", soft: "#f1f5f9" },
  { path: "/admin/veri-aktarimi", id: "veri-aktarimi", title: "Excel / CSV Veri Aktarımı", focus: "Dosyanızı yükleyin, alanları kontrol edin ve verileri güvenli şekilde aktarın.", steps: ["Dosyayı seç", "Alanları kontrol et", "Önizle", "Aktar"], icon: FileInput, accent: "#17aaa5", accent2: "#3974f6", soft: "#eafaf9" },
  { path: "/admin/guven-kvkk", id: "guven-kvkk", title: "Gizlilik & KVKK", focus: "Veri gizliliği, saklama süresi ve yapay zekâ kullanım kontrollerini yönetin.", steps: ["Kontrolü seç", "Durumu gör", "Gerekirse düzelt", "Kaydet"], icon: LockKeyhole, accent: "#64748b", accent2: "#8255ef", soft: "#f1f5f9" },
  { path: "/ayarlar/yetki-mimarisi", id: "yetki-mimarisi", title: "Gelişmiş Yetki Ayarları", focus: "Hangi rolün hangi alanları görebileceğini ayrıntılı olarak yönetin.", steps: ["Rolü seç", "Alanı seç", "Yetkiyi belirle", "Kaydet"], icon: SlidersHorizontal, accent: "#64748b", accent2: "#3974f6", soft: "#f1f5f9" },
  { path: "/admin", id: "admin", title: "Kullanıcılar & Sistem", focus: "Kullanıcıları, şirket kurulumunu ve sistem ayarlarını tek yerden yönetin.", steps: ["Kullanıcı", "Kurulum", "Veri", "Güvenlik"], icon: ShieldCheck, accent: "#64748b", accent2: "#3974f6", soft: "#f1f5f9" },
];

function findConfig(pathname: string) {
  return [...MODULES].sort((a, b) => b.path.length - a.path.length).find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`));
}

function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function revealOperations(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const details = target.querySelector<HTMLDetailsElement>("details.visual-first-native-shell");
  if (details) details.open = true;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ModuleWorkspace({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { currentUserRole } = useAuth();
  if (pathname === "/dashboard") return <>{children}</>;
  const config = findConfig(pathname);
  if (!config) return <>{children}</>;

  const Icon = config.icon;
  const style = {
    "--module-accent": config.accent,
    "--module-accent-2": config.accent2,
    "--module-soft": config.soft,
  } as CSSProperties;

  // Company-wide visual analytics currently aggregate browser-side datasets. They are
  // intentionally restricted to company-scoped roles. Managers, directors and employees
  // use the native module views below, which already enforce SELF/direct-report scope.
  // This prevents a scoped user from seeing tenant-wide totals, names or distributions.
  const companyAnalyticsAllowed = currentUserRole === "ceo" || currentUserRole === "hr_admin";
  const coreAnalytics = companyAnalyticsAllowed && matches(pathname, ["/organizasyon", "/ise-alim", "/egitim", "/maas"]);
  const visualBoard = companyAnalyticsAllowed && matches(pathname, ["/kariyer", "/yetenek-matrisi"]);
  const universalAnalytics = companyAnalyticsAllowed && matches(pathname, [
    "/degerlendirme", "/kalibrasyon", "/calisan-deneyimi", "/gelisim", "/gelisim-analitigi", "/yedekleme", "/izinler", "/rol-mimarisi", "/aday-testi", "/ekip-yonetimi",
  ]);
  const visualFirst = coreAnalytics || visualBoard || universalAnalytics;
  const salaryCore = pathname === "/maas";
  const quickEntryVisible = visualFirst || salaryCore;
  const operationsTargetId = `module-operations-${config.id}`;
  const organizationTools = pathname === "/organizasyon" ? <><ImportRecoveryPanel /><div className="mb-4"><OrganizationExcelExchange /></div></> : null;
  const salaryTools = salaryCore ? <div className="mb-4"><SalaryExcelExchange /></div> : null;

  return (
    <div className={`module-workspace workspace-${config.id} module-workspace-v2`} data-module={config.id} style={style}>
      <section className="module-hero module-command-hero" aria-label={`${config.title} çalışma akışı`}>
        <div className="module-command-copy">
          <div className="module-command-kicker"><span className="module-command-live-dot" />BU EKRANDA</div>
          <div className="module-command-title-row">
            <span className="module-command-icon" style={{ background: `linear-gradient(135deg,${config.accent},${config.accent2})` }}><Icon strokeWidth={1.7} /></span>
            <div><h1>{config.title}</h1><p>{config.focus}</p></div>
          </div>
        </div>
        <div className="module-command-flow" aria-label="Önerilen adımlar">
          <div className="module-command-flow-label">Nasıl ilerlenir?</div>
          <div className="module-command-flow-steps">
            {config.steps.map((step, index) => <div key={step} className="module-command-flow-step"><span>{index + 1}</span><strong>{step}</strong></div>)}
          </div>
        </div>
      </section>

      {quickEntryVisible && (
        <section
          data-quick-entry="true"
          className="relative mb-5 overflow-hidden rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-5 shadow-[0_16px_40px_rgba(79,70,229,0.14)] ring-1 ring-indigo-100 sm:px-6 sm:py-5 dark:border-indigo-800/70 dark:from-indigo-950/45 dark:via-slate-900 dark:to-violet-950/35 dark:ring-indigo-900/50"
          aria-label={`${config.title} hızlı kayıt ve veri işlemleri`}
        >
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg,${config.accent},${config.accent2})` }} />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/80 shadow-sm" style={{ background: config.soft, color: config.accent }}>
                <FileInput className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-slate-900/90 dark:text-indigo-300">
                  VERİ GİRİŞİ BURADA
                </span>
                <strong className="mt-2 block text-[17px] font-extrabold leading-6 text-slate-950 sm:text-lg dark:text-white">
                  {salaryCore ? "Ücret kayıtlarını ve verileri buradan yönetin" : "Kayıt ve veri girişini buradan başlatın"}
                </strong>
                <p className="mt-1.5 max-w-3xl text-[12px] font-medium leading-5 text-slate-600 sm:text-[13px] dark:text-slate-300">
                  {salaryCore ? "Yeni ücret kaydı, düzenleme, filtreleme ve Excel işlemleri için işlem alanını açın." : "Yeni kayıt eklemek, mevcut veriyi düzenlemek, filtrelemek veya Excel araçlarına ulaşmak için işlem alanını açın."}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Bu alanda yapılabilecek işlemler">
                  {(salaryCore ? ["Ücret kaydı", "Düzenleme", "Excel"] : ["Yeni kayıt", "Düzenleme", "Excel / toplu veri"]).map((item) => (
                    <span key={item} className="rounded-full border border-slate-200/90 bg-white/80 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">{item}</span>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-controls={operationsTargetId}
              onClick={() => revealOperations(operationsTargetId)}
              className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto"
              style={{ background: `linear-gradient(135deg,${config.accent},${config.accent2})` }}
            >
              <FileInput className="h-4 w-4" strokeWidth={2} />
              {salaryCore ? "Ücret işlemlerini aç" : "Veri girişini aç"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      )}

      <div className="module-family-stage"><ModuleFamilyNavigator pathname={pathname} /></div>
      <AgentActionHandoff pathname={pathname} />
      {(pathname === "/degerlendirme" || pathname === "/kalibrasyon") && <PerformanceCycleBar />}
      {(pathname === "/maas" || pathname === "/yonetici/maas-talep") && <CompensationCycleBar />}
      {pathname === "/admin/veri-aktarimi" && <ImportRecoveryPanel />}

      {companyAnalyticsAllowed && <div className="module-decision-stage"><ModuleDecisionSummary pathname={pathname} /></div>}
      {coreAnalytics && <CoreAnalyticsBoard pathname={pathname} />}
      {visualBoard && <VisualModuleBoard pathname={pathname} />}
      {universalAnalytics && <UniversalAnalyticsBoard pathname={pathname} />}

      <section id={operationsTargetId} className="module-detail-stage scroll-mt-24" aria-label={`${config.title} ayrıntılı işlemler`}>
        <header className="module-detail-stage-header">
          <div>
            <span>{salaryCore ? "ÜCRET SEÇENEKLERİ" : companyAnalyticsAllowed ? "KAYIT & VERİ İŞLEMLERİ" : "YETKİLİ KAPSAM"}</span>
            <h2>{salaryCore ? "Ücret seçeneklerini karşılaştır" : companyAnalyticsAllowed ? "Kayıtlar, formlar ve düzenleme" : "Kendi kayıtlarınız ve yetkili olduğunuz ekip"}</h2>
          </div>
          <p>{salaryCore ? "Farklı ücret seçeneklerini ve bütçe etkisini karşılaştırın. Excel araçları aşağıdaki yardımcı bölümde bulunur." : companyAnalyticsAllowed ? "Yeni kayıt ekleme, mevcut kayıtları düzenleme, filtreleme ve toplu veri işlemleri bu alanda bulunur." : "Bu görünüm yalnızca rolünüzün veri kapsamındaki kayıtları gösterir; şirket geneli analitikler bu rolde açılmaz."}</p>
        </header>

        {salaryCore ? (
          <>
            <div className="module-native-content visualized-native-content">{children}</div>
            <details className="visual-first-native-shell mt-4">
              <summary><div className="vf-summary-copy"><span>YARDIMCI ARAÇ</span><strong>Excel ile veri al / ver</strong><small>Toplu veri işlemi yapmanız gerektiğinde kullanın.</small></div></summary>
              <div className="module-native-content visualized-native-content">{salaryTools}</div>
            </details>
          </>
        ) : visualFirst ? (
          <details className="visual-first-native-shell">
            <summary><div className="vf-summary-copy"><span>KAYIT / VERİ GİRİŞİ</span><strong>Kayıt, form ve düzenleme araçlarını aç</strong><small>Yeni kayıt, düzenleme, filtreleme ve varsa Excel işlemleri burada bulunur.</small></div></summary>
            <div className="module-native-content visualized-native-content">{organizationTools}{children}</div>
          </details>
        ) : <div className="module-native-content visualized-native-content">{children}</div>}
      </section>
    </div>
  );
}
