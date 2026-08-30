export type NavigationFamilyId =
  | "organization"
  | "performance"
  | "talentCareer"
  | "development"
  | "compensation"
  | "experience"
  | "recruitment"
  | "employeeOps"
  | "system";

export type NavigationFamilyItem = {
  href: string;
  label: string;
  description: string;
};

export type NavigationFamily = {
  id: NavigationFamilyId;
  label: string;
  section: "İnsan & Organizasyon" | "Operasyon" | "Sistem";
  description: string;
  items: NavigationFamilyItem[];
};

export const NAVIGATION_FAMILIES: NavigationFamily[] = [
  {
    id: "organization",
    label: "Organizasyon",
    section: "İnsan & Organizasyon",
    description: "Çalışan ana verisini, organizasyon yapısını ve rol-yetkinlik mimarisini aynı çalışma alanında yönetin.",
    items: [
      { href: "/organizasyon", label: "Çalışanlar & Organizasyon", description: "Çalışan, yönetici, departman ve organizasyon ana verisi." },
      { href: "/rol-mimarisi", label: "Rol & Yetkinlik Mimarisi", description: "Job family, seviye ve hedef yetkinlik profilleri." },
    ],
  },
  {
    id: "performance",
    label: "Performans",
    section: "İnsan & Organizasyon",
    description: "Değerlendirme dönemini ve kalibrasyonu tek performans karar akışında ilerletin.",
    items: [
      { href: "/degerlendirme", label: "Değerlendirmeler", description: "KPI, yönetici gözlemi, yetkinlik ve dönem sonuçları." },
      { href: "/kalibrasyon", label: "Kalibrasyon", description: "Farkları, kanıt kalitesini ve nihai insan değerlendirmesini yönetin." },
    ],
  },
  {
    id: "talentCareer",
    label: "Yetenek & Kariyer",
    section: "İnsan & Organizasyon",
    description: "9-Box, kariyer hazır bulunuşluğu ve halefiyeti aynı yetenek karar zincirinde görün.",
    items: [
      { href: "/yetenek-matrisi", label: "Yetenek & 9-Box", description: "Performans, potansiyel ve Evidence Score ile yetenek görünümü." },
      { href: "/kariyer", label: "Kariyer & Readiness", description: "Mevcut rol, hedef rol, gap ve hazır bulunuşluk görünümü." },
      { href: "/yedekleme", label: "Halefiyet & Yedekleme", description: "Kritik roller, aday havuzu, bench depth ve hazırlık durumu." },
    ],
  },
  {
    id: "development",
    label: "Gelişim",
    section: "İnsan & Organizasyon",
    description: "Gelişim reçetesinden eğitime, transfer kanıtından yeniden ölçüme kadar tüm öğrenme döngüsü.",
    items: [
      { href: "/gelisim", label: "Gelişim Planı", description: "Yetkinlik gap'lerini hedef ve gelişim aksiyonlarına dönüştürün." },
      { href: "/egitim", label: "Eğitim & Müdahaleler", description: "Kanıta dayalı gelişim müdahalelerini atayın ve takip edin." },
      { href: "/gelisim-analitigi", label: "Gelişim Etkinliği", description: "Transfer, doğrulama, yeniden ölçüm ve değişim sinyallerini analiz edin." },
    ],
  },
  {
    id: "compensation",
    label: "Ücret & Bütçe",
    section: "İnsan & Organizasyon",
    description: "Ücret kararını benchmark, bütçe, yönetici önerisi ve onay döngüsüyle yönetin.",
    items: [
      { href: "/maas", label: "Ücret Karar Merkezi", description: "Ücret analizi, benchmark, bütçe ve karar görünümü." },
      { href: "/yonetici/maas-talep", label: "Yönetici Önerileri", description: "Yönetici ücret önerilerini kontrollü onay akışına gönderin." },
    ],
  },
  {
    id: "experience",
    label: "Çalışan Deneyimi & Nabız",
    section: "İnsan & Organizasyon",
    description: "Anonim pulse, driver değişimleri ve aksiyon sinyallerini izleyin.",
    items: [
      { href: "/calisan-deneyimi", label: "Çalışan Deneyimi & Nabız", description: "Anonim check-in, driver analizi ve aksiyon görünümü." },
    ],
  },
  {
    id: "recruitment",
    label: "İşe Alım",
    section: "Operasyon",
    description: "Aday sürecini ve değerlendirme araçlarını ana menüyü kalabalıklaştırmadan tek işe alım alanında yönetin.",
    items: [
      { href: "/ise-alim", label: "İşe Alım Süreci", description: "Başvuru, kanıt, mülakat ve teklif akışı." },
      { href: "/aday-testi", label: "Yetkinlik Testleri", description: "Testleri nihai karar değil, yapılandırılmış değerlendirme kanıtı olarak kullanın." },
    ],
  },
  {
    id: "employeeOps",
    label: "Çalışan İşlemleri",
    section: "Operasyon",
    description: "Günlük ekip ve izin işlemlerini karar zekâsı modüllerinden ayrı, sade bir operasyon alanında tutun.",
    items: [
      { href: "/ekip-yonetimi", label: "Ekip Yönetimi", description: "Günlük ekip görünümü ve yönetici aksiyonları." },
      { href: "/izinler", label: "İzin Yönetimi", description: "Bakiye, talep, onay ve ekip çakışmaları." },
    ],
  },
  {
    id: "system",
    label: "Yönetim & Ayarlar",
    section: "Sistem",
    description: "Kurulum, kullanıcı, veri aktarımı, güven ve erişim politikalarını tek sistem alanında yönetin.",
    items: [
      { href: "/admin", label: "Kullanıcı & Yetki", description: "Demo kullanıcıları, roller ve erişim yönetimi." },
      { href: "/kurulum", label: "Şirket Kurulumu", description: "Organizasyon, dönem, ücret ve güven adımlarını yapılandırın." },
      { href: "/admin/veri-aktarimi", label: "Veri Aktarımı", description: "Excel, Logo, Mikro ve Netsis dosyalarını kontrollü aktarın." },
      { href: "/admin/guven-kvkk", label: "Güven & KVKK", description: "AI audit, veri minimizasyonu, anonimlik ve saklama kontrolleri." },
      { href: "/ayarlar/yetki-mimarisi", label: "Yetki Mimarisi", description: "Rol, modül ve kapsam politikalarını yönetin." },
      { href: "/ayarlar/roller", label: "Rol Ayarları", description: "Sistem rol yapılandırmasını yönetin." },
    ],
  },
];

export function routeMatches(pathname: string, href: string) {
  const normalized = decodeURIComponent(pathname || "/");
  const target = decodeURIComponent(href);
  return normalized === target || normalized.startsWith(`${target}/`);
}

export function familyForPath(pathname: string) {
  return NAVIGATION_FAMILIES.find((family) => family.items.some((item) => routeMatches(pathname, item.href))) || null;
}
