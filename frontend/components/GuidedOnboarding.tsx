"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CircleHelp, Compass, Play, Sparkles, X } from "lucide-react";

const SEEN_KEY = "fhr_demo_tour_seen_v1";

type Step = {
  title: string;
  body: string;
  selector: string | string[];
};

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

const pick = (selector: string | string[]) => {
  const selectors = Array.isArray(selector) ? selector : [selector];
  for (const value of selectors) {
    const node = document.querySelector(value) as HTMLElement | null;
    if (node) return node;
  }
  return null;
};

const GLOBAL_STEPS: Step[] = [
  {
    title: "FutureHR çalışma alanı",
    body: "Sol menü HR sürecini uçtan uca modüllere ayırır. Rolünüze göre yalnızca yetkili olduğunuz alanlar görünür.",
    selector: '[data-tour="sidebar"]',
  },
  {
    title: "Yönetici Özeti",
    body: "Yöneticinin dikkat etmesi gereken temel göstergeler ve açık aksiyonlar burada özetlenir.",
    selector: '[data-tour-route="/dashboard"]',
  },
  {
    title: "Organizasyonu doğru kurun",
    body: "Çalışan, pozisyon, departman ve özellikle Yönetici 1 / Yönetici 2 bağlantıları diğer modüllerin yetki ve hesaplama temelidir.",
    selector: '[data-tour-route="/organizasyon"]',
  },
  {
    title: "Performans ve yetkinlik",
    body: "KPI başarısı, yönetici gözlemi ve 10 yetkinlik ayrı tutulur. Çalışanı yalnızca tanımlı yönetici ilişkisi üzerinden değerlendirebilirsiniz.",
    selector: '[data-tour-route="/degerlendirme"]',
  },
  {
    title: "Yetenek karar desteği",
    body: "9-Box, potansiyel ve rol yetkinlik farkları gelişim ve kariyer kararlarını destekler; otomatik insan kararı vermez.",
    selector: '[data-tour-route="/yetenek-matrisi"]',
  },
  {
    title: "Gelişim akışı",
    body: "Eğitim, gelişim planı ve kariyer yolu birbirine bağlıdır. Yetkinlik açığını somut aksiyona dönüştürmek için bu alanları kullanın.",
    selector: ['[data-tour-route="/egitim"]', '[data-tour-route="/gelisim"]'],
  },
  {
    title: "Maaş senaryoları",
    body: "FutureHR'ın güçlü farklarından biri A/B/C/D ücret senaryolarını bütçe etkisiyle karşılaştırmasıdır. Simülasyon sonucu doğrudan maaşa yazılmaz; onay akışından geçer.",
    selector: '[data-tour-route="/maas"]',
  },
  {
    title: "Kullanıcı ve yetki yönetişimi",
    body: "CEO, İK, Direktör, Yönetici ve Personel ayrı rollerdir. Hassas maaş, yetenek ve halefiyet verileri ayrıca korunur.",
    selector: ['[data-tour-route="/ayarlar/yetki-mimarisi"]', '[data-tour-route="/admin"]'],
  },
];

const MODULE_COPY: Record<string, { title: string; steps: Step[] }> = {
  "/dashboard": {
    title: "Yönetici Özeti",
    steps: [
      { title: "Yönetici Özeti", body: "Bu ekran günlük karar noktalarını tek bakışta toplar. Önce açık aksiyonlara ve kritik göstergelere bakın.", selector: '[data-tour="workspace"]' },
      { title: "Hızlı karar alanı", body: "Kartlar ayrıntılı modüllerin özetidir. Detay gerektiğinde ilgili modüle geçin; burada ham veri yönetmeyin.", selector: ['main section', 'main'] },
    ],
  },
  "/izinler": {
    title: "İzin Yönetimi",
    steps: [
      { title: "İzin akışı", body: "Bakiye, talep, onay ve ekip takvimi aynı süreçte takip edilir.", selector: ".module-hero" },
      { title: "Talep ve onay", body: "Çalışan kendi talebini oluşturur; yönetici yalnızca yetkili olduğu ekip taleplerini değerlendirir.", selector: ['.module-native-content form', '.module-native-content button'] },
      { title: "Çakışmaları görün", body: "Liste ve takvim görünümü ekipte aynı tarihe yığılan izinleri fark etmek için kullanılır.", selector: ['.module-native-content table', '.module-native-content'] },
    ],
  },
  "/organizasyon": {
    title: "Çalışanlar & Organizasyon",
    steps: [
      { title: "Ana personel verisi", body: "Bu modül diğer tüm modüllerin referans aldığı çalışan, departman, pozisyon ve yönetici ilişkilerini tutar.", selector: ".module-hero" },
      { title: "Yönetici bağları kritik", body: "Yönetici 1 ve Yönetici 2 alanları performans, izin, ekip ve yetki kapsamlarını doğrudan etkiler.", selector: ['.module-native-content table', '.module-native-content'] },
      { title: "Toplu veri işlemleri", body: "Demo veya müşteri kurulumunda Excel ile çalışan listesini içe/dışa aktarabilirsiniz.", selector: ['.module-native-content button', '.module-native-content'] },
    ],
  },
  "/degerlendirme": {
    title: "Performans & Yetkinlik",
    steps: [
      { title: "Değerlendirme modeli", body: "Performans = KPI/Hedef Başarısı %60 + Yönetici Gözlemi %40. Yetkinlik skoru ayrı tutulur.", selector: ".module-hero" },
      { title: "Kimi puanlayabilirsiniz?", body: "Sistem çalışan listesini organizasyondaki Yönetici 1 / Yönetici 2 ilişkisine göre sınırlar; unvana bakarak serbest puanlama vermez.", selector: ['.module-native-content select', '.module-native-content'] },
      { title: "Hedefleri ve puanları girin", body: "KPI ağırlıkları toplamı %100 olmalıdır. Yetkinlik puanları performansa gizlice eklenmez; ayrı analiz edilir.", selector: ['.module-native-content section', '.module-native-content'] },
    ],
  },
  "/yetenek-matrisi": {
    title: "Yetenek Matrisi",
    steps: [
      { title: "9-Box karar desteği", body: "X ekseni performans, Y ekseni potansiyeldir. Matris insan kararı yerine geçmez; kalibrasyon için kanıt sunar.", selector: ".module-hero" },
      { title: "Rol yetkinlik farkı", body: "Seçili çalışanın mevcut yetkinlikleri rol hedefiyle karşılaştırılır; açıklar gelişim planına taşınabilir.", selector: ['.module-native-content table', '.module-native-content'] },
      { title: "Hassas veri", body: "Potansiyel ve 9-Box sonuçları varsayılan olarak çalışan self-service görünümüne açılmaz.", selector: '.module-native-content' },
    ],
  },
  "/egitim": {
    title: "Eğitim",
    steps: [
      { title: "Üç görünüm", body: "Atanan Eğitimler, Eğitim Kataloğu ve yetkiniz varsa Ekip Eğitimleri arasında buradan geçiş yaparsınız.", selector: ".module-hero" },
      { title: "Görünüm değiştirici", body: "Bu belirgin kartlar hangi eğitim listesini yönettiğinizi gösterir. Sayılar ilgili görünümdeki kayıt adedidir.", selector: ['.module-native-content button[aria-pressed]', '.module-native-content button'] },
      { title: "Takip tablosu", body: "Atama, son tarih ve durum bilgileriyle geciken eğitimleri ve tamamlanma sürecini izleyin.", selector: ['.module-native-content table', '.module-native-content'] },
    ],
  },
  "/gelisim": {
    title: "Gelişim Planı",
    steps: [
      { title: "Yetkinlikten aksiyona", body: "Burada amaç bir açığı sadece göstermek değil; hedef, aksiyon, ölçüt ve tarihe bağlamaktır.", selector: ".module-hero" },
      { title: "Aksiyon oluşturun", body: "Gelişim aksiyonunu eğitim, iş başı görev veya başka ölçülebilir bir faaliyetle ilişkilendirin.", selector: ['.module-native-content button', '.module-native-content'] },
      { title: "İlerlemeyi takip edin", body: "Plan tamamlandı demek yerine başarı ölçütü ve ilerleme durumu üzerinden takip edin.", selector: ['.module-native-content table', '.module-native-content'] },
    ],
  },
  "/kariyer": {
    title: "Kariyer Yolu",
    steps: [
      { title: "Rol mimarisi", body: "Kariyer yolu job family ve job level yapısına dayanır; yalnızca puan yükseldi diye otomatik terfi önermez.", selector: ".module-hero" },
      { title: "Hedef rol ve hazırlık", body: "Mevcut rol ile hedef rol arasındaki seviye, yetkinlik ve hazır bulunuşluk farklarını birlikte okuyun.", selector: ['.module-native-content section', '.module-native-content'] },
      { title: "Yol haritası", body: "Eksikleri gelişim ve eğitim aksiyonlarına bağlayarak çalışan için açıklanabilir bir kariyer rotası oluşturun.", selector: '.module-native-content' },
    ],
  },
  "/yedekleme": {
    title: "Yedekleme & Halefiyet",
    steps: [
      { title: "Kritik rol sürekliliği", body: "Önce kritik rolü seçin; sistem uygun halef adaylarını veri sinyalleriyle sıralar.", selector: ".module-hero" },
      { title: "Halef Havuzu", body: "Toplam uyum tek başına karar değildir. Rol uyumu, seviye, performans trendi, potansiyel ve hazırlık süresini birlikte değerlendirin.", selector: ['.module-native-content table', '.module-native-content'] },
      { title: "Hassas yönetim verisi", body: "Halefiyet listeleri çalışan self-service alanına açılmaz; CEO/İK erişimi ayrıca korunur.", selector: '.module-native-content' },
    ],
  },
  "/maas": {
    title: "Maaş Simülasyonu",
    steps: [
      { title: "Senaryo motoru", body: "Bu ekranın ana farkı ücret kararını tek zam oranına indirmemesi; A/B/C/D senaryolarını karşılaştırmasıdır.", selector: ".module-hero" },
      { title: "Senaryo kartlarını karşılaştırın", body: "Her senaryo farklı bir ücret stratejisini, ortalama artışı ve bütçe etkisini gösterir. Kartı seçerek sonuç tablosunu değiştirirsiniz.", selector: ['.module-native-content button', '.module-native-content'] },
      { title: "Karar mantığını inceleyin", body: "Çalışan bazında yeni ücretin neden oluştuğunu Karar Mantığı sütunundan okuyun. Simülasyon doğrudan bordroya uygulanmaz.", selector: ['.module-native-content table', '.module-native-content'] },
    ],
  },
  "/yonetici/maas-talep": {
    title: "Yönetici Maaş Talepleri",
    steps: [
      { title: "Yönetici öneri alanı", body: "Yönetici yalnızca yetkili çalışanları için ücret önerisi girer; şirket çapı maaş simülasyonunu görmesi gerekmez.", selector: ".module-hero" },
      { title: "Öneriyi gerekçelendirin", body: "Talep oranı ve gerekçe ücret döngüsüne gönderilir; mevcut maaşı doğrudan değiştirmez.", selector: ['.module-native-content table', '.module-native-content form', '.module-native-content'] },
    ],
  },
  "/ise-alim": {
    title: "İşe Alım",
    steps: [
      { title: "ATS pipeline", body: "Adayı başvurudan teklif aşamasına kadar pipeline üzerinden takip edin.", selector: ".module-hero" },
      { title: "Aday kanıtlarını birlikte okuyun", body: "Yetkinlik testi bir içgörüdür; mülakat ve rol uyumuyla birlikte değerlendirilir, otomatik işe alım kararı vermez.", selector: ['.module-native-content table', '.module-native-content'] },
    ],
  },
  "/aday-testi": {
    title: "Yetkinlik Testi",
    steps: [
      { title: "FHR-COMP-1.2", body: "130 soruluk temel envanter 10 yetkinlik ve yanıt kalitesi göstergelerini üretir.", selector: ".module-hero" },
      { title: "Karar desteği", body: "Test sonucu tek başına işe alım, terfi veya maaş kararının nedeni olarak kullanılmaz.", selector: '.module-native-content' },
    ],
  },
  "/ekip-yonetimi": {
    title: "Ekip",
    steps: [
      { title: "Yönetici çalışma alanı", body: "Yönetici burada yalnızca kendi kapsamındaki ekip ve açık aksiyonları görür.", selector: ".module-hero" },
      { title: "Detay modüllere bağlıdır", body: "Performans, eğitim, gelişim ve maaş talebi gibi işlemler ilgili uzman modüllerde yapılır.", selector: ['.module-native-content table', '.module-native-content'] },
    ],
  },
  "/admin": {
    title: "Kullanıcı & Yetki",
    steps: [
      { title: "Kullanıcı hesabı ≠ çalışan kaydı", body: "Çalışan ana verisi Organizasyon'da, giriş hesabı ve sistem rolü burada yönetilir.", selector: ".module-hero" },
      { title: "Demo sunum yönetimi", body: "Sunum verisini tek işlemle oluşturabilir veya temizleyebilirsiniz. Bu alan demo ortamını hızlı hazırlamak içindir.", selector: ['.module-native-content button', '.module-native-content'] },
      { title: "Yetki Mimarisine geçin", body: "Firma bazlı modül görünürlüğü ve performans yönetişimi kuralları ayrı Yetki Mimarisi ekranında yönetilir.", selector: ['.module-native-content a[href="/ayarlar/yetki-mimarisi"]', '.module-native-content'] },
    ],
  },
  "/ayarlar/yetki-mimarisi": {
    title: "Yetki Mimarisi",
    steps: [
      { title: "Firma bazlı erişim", body: "CEO, İK, Direktör, Yönetici ve Personel için modül görünürlüğünü güvenli taban sınırlar içinde düzenleyin.", selector: ['main h1', '[data-tour="workspace"]'] },
      { title: "Performans yönetişimi", body: "Yönetici 2 değerlendirme yetkisi ve İK override gibi politikaları şirket ihtiyacına göre buradan belirleyin.", selector: ['main button', 'main'] },
      { title: "Hassas veriler ayrı korunur", body: "Maaş, potansiyel/9-Box ve halefiyet normal menü izninden ayrı bir güvenlik sınırına sahiptir.", selector: ['main table', 'main'] },
    ],
  },
};

function moduleFor(pathname: string) {
  return Object.entries(MODULE_COPY)
    .sort(([a], [b]) => b.length - a.length)
    .find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] || null;
}

export default function GuidedOnboarding() {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const moduleTour = useMemo(() => moduleFor(pathname), [pathname]);
  const [welcome, setWelcome] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const active = steps.length > 0;
  const step = steps[index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(SEEN_KEY)) {
      const timer = window.setTimeout(() => setWelcome(true), 500);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!active || !step) return;
    let timer = 0;
    const update = () => {
      const element = pick(step.selector) || document.querySelector('[data-tour="workspace"]') as HTMLElement | null;
      if (!element) return setRect(null);
      const box = element.getBoundingClientRect();
      const padding = 7;
      setRect({
        top: Math.max(6, box.top - padding),
        left: Math.max(6, box.left - padding),
        right: Math.min(window.innerWidth - 6, box.right + padding),
        bottom: Math.min(window.innerHeight - 6, box.bottom + padding),
        width: Math.min(window.innerWidth - 12, box.width + padding * 2),
        height: Math.min(window.innerHeight - 12, box.height + padding * 2),
      });
    };
    const element = pick(step.selector);
    element?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    timer = window.setTimeout(update, 260);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, index, step]);

  useEffect(() => {
    if (!active) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSteps([]);
      if (event.key === "ArrowRight" && index < steps.length - 1) setIndex((value) => value + 1);
      if (event.key === "ArrowLeft" && index > 0) setIndex((value) => value - 1);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [active, index, steps.length]);

  const start = (candidate: Step[]) => {
    const available = candidate.filter((item) => Boolean(pick(item.selector)));
    setMenuOpen(false);
    setWelcome(false);
    localStorage.setItem(SEEN_KEY, "1");
    setSteps(available.length ? available : candidate);
    setIndex(0);
  };

  const skipWelcome = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setWelcome(false);
  };

  const finish = () => {
    setSteps([]);
    setIndex(0);
    setRect(null);
  };

  const tooltipStyle = (() => {
    if (!rect) return { left: 24, top: 96, width: "min(360px, calc(100vw - 32px))" } as const;
    const width = Math.min(360, window.innerWidth - 32);
    const gap = 14;
    let left = rect.right + gap;
    let top = Math.max(16, Math.min(rect.top, window.innerHeight - 300));
    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, rect.left - width - gap);
    }
    if (rect.width > window.innerWidth * 0.62 || left < 16) {
      left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
      top = rect.bottom + gap;
      if (top > window.innerHeight - 280) top = Math.max(16, rect.top - 250 - gap);
    }
    return { left, top, width };
  })();

  return (
    <>
      <div className="relative" data-onboarding-launcher>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
          aria-label="Ekran rehberini aç"
          title="Ekran rehberi"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-11 z-[70] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => start(GLOBAL_STEPS)} className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
              <Compass className="mt-0.5 h-4 w-4 text-indigo-600" />
              <span><span className="block text-xs font-semibold text-slate-900 dark:text-white">Genel tanıtım turu</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">FutureHR'ın ana akışını yeniden göster.</span></span>
            </button>
            {moduleTour && <button type="button" onClick={() => start(moduleTour.steps)} className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><Play className="mt-0.5 h-4 w-4 text-emerald-600"/><span><span className="block text-xs font-semibold text-slate-900 dark:text-white">Bu ekranı tanıt</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{moduleTour.title} adımlarını açıkla.</span></span></button>}
          </div>
        )}
      </div>

      {welcome && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-[26px] border border-white/15 bg-white shadow-[0_30px_100px_rgba(15,23,42,.35)] dark:bg-slate-900">
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-6 text-white">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-indigo-100"><Sparkles className="h-4 w-4"/>FutureHR Demo</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-.02em]">Sistemi 2 dakikada tanıyın</h2>
              <p className="mt-2 text-sm leading-6 text-indigo-100">İsterseniz kısa bir turla hangi modülün ne işe yaradığını gösterebiliriz. Turu geçerseniz demo mevcut haliyle normal çalışmaya devam eder.</p>
            </div>
            <div className="space-y-3 p-6">
              {["Ana modüllerin ne işe yaradığını görün", "Maaş, performans ve yetenek akışlarının farkını anlayın", "Her ekranda ? butonundan modül rehberini tekrar açın"].map((item, i)=><div key={item} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{i+1}</span>{item}</div>)}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={skipWelcome} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Geç</button>
                <button type="button" onClick={() => start(GLOBAL_STEPS)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"><Play className="h-4 w-4"/>Tanıtımı Başlat</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {active && step && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {rect ? <>
            <div className="fixed left-0 right-0 top-0 bg-slate-950/62" style={{height: rect.top}} />
            <div className="fixed left-0 bg-slate-950/62" style={{top: rect.top, width: rect.left, height: rect.height}} />
            <div className="fixed right-0 bg-slate-950/62" style={{top: rect.top, left: rect.right, height: rect.height}} />
            <div className="fixed bottom-0 left-0 right-0 bg-slate-950/62" style={{top: rect.bottom}} />
            <div className="fixed rounded-2xl border-2 border-indigo-400 shadow-[0_0_0_4px_rgba(129,140,248,.22),0_18px_70px_rgba(15,23,42,.32)]" style={{top: rect.top, left: rect.left, width: rect.width, height: rect.height}} />
          </> : <div className="fixed inset-0 bg-slate-950/62" />}

          <div className="pointer-events-auto fixed rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,.32)] dark:border-slate-700 dark:bg-slate-900" style={tooltipStyle}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-indigo-600">Rehber · {index + 1}/{steps.length}</p><h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">{step.title}</h3></div>
              <button type="button" onClick={finish} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><X className="h-4 w-4"/></button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex gap-1">{steps.map((_, i)=><span key={i} className={`h-1.5 rounded-full transition-all ${i===index?"w-5 bg-indigo-600":"w-1.5 bg-slate-200 dark:bg-slate-700"}`}/>)}</div>
              <div className="flex gap-2">
                {index > 0 && <button type="button" onClick={()=>setIndex((value)=>value-1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><ChevronLeft className="h-3.5 w-3.5"/>Geri</button>}
                {index < steps.length - 1 ? <button type="button" onClick={()=>setIndex((value)=>value+1)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-700">Sonraki<ChevronRight className="h-3.5 w-3.5"/></button> : <button type="button" onClick={finish} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-700">Turu Bitir</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
