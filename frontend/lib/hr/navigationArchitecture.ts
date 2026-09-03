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

export type NavigationFamilyItem = { href: string; label: string; description: string; };
export type NavigationFamily = { id: NavigationFamilyId; label: string; section: "Çalışma Alanları" | "Sistem"; description: string; items: NavigationFamilyItem[]; };

export const NAVIGATION_FAMILIES: NavigationFamily[] = [
  { id:"organization", label:"Çalışanlar", section:"Çalışma Alanları", description:"Çalışan bilgileri, organizasyon, ekip ve izin işlemleri.", items:[
    { href:"/organizasyon", label:"Çalışanlar & Organizasyon", description:"Çalışanları, departmanları, pozisyonları ve yöneticileri yönetin." },
    { href:"/calisan-deneyimi", label:"Çalışan Deneyimi", description:"Çalışan geri bildirimlerini ve ekip nabzını takip edin." },
    { href:"/ekip-yonetimi", label:"Ekibim", description:"Ekibinizi ve açık yönetici işlemlerini görün." },
    { href:"/izinler", label:"İzinler", description:"İzin bakiyesi, talep, onay ve takvim işlemlerini yönetin." },
  ]},
  { id:"performance", label:"Performans & Yetenek", section:"Çalışma Alanları", description:"Performans değerlendirmeleri, yetenek görünümü ve karar desteği.", items:[
    { href:"/degerlendirme", label:"Performans", description:"Hedefleri ve dönem değerlendirmelerini yönetin." },
    { href:"/kalibrasyon", label:"Değerlendirmeleri Karşılaştır", description:"Puan farklarını ve değerlendirme kanıtlarını karşılaştırın." },
    { href:"/yetenek-matrisi", label:"Yetenek Değerlendirmesi", description:"Performans ve potansiyeli 9-Box görünümünde değerlendirin." },
    { href:"/yetkinlik-haritasi", label:"Yetkinlikler", description:"Rol ve çalışan yetkinliklerini karşılaştırın." },
    { href:"/rol-mimarisi", label:"Roller & Yetkinlikler", description:"Pozisyon, seviye ve hedef yetkinlikleri tanımlayın." },
    { href:"/karar-merkezi", label:"Karar Desteği", description:"Önemli insan kararlarını açıklanabilir sinyallerle inceleyin." },
  ]},
  { id:"talentCareer", label:"Gelişim & Kariyer", section:"Çalışma Alanları", description:"Gelişim planları, eğitimler, kariyer hazırlığı ve yedekleme.", items:[
    { href:"/gelisim", label:"Gelişim Planları", description:"Gelişim hedeflerini ve aksiyonlarını yönetin." },
    { href:"/egitim", label:"Eğitimler", description:"Eğitim atamalarını ve tamamlanma durumlarını takip edin." },
    { href:"/gelisim-analitigi", label:"Gelişim Sonuçları", description:"Gelişim faaliyetlerinin işe yansıyıp yansımadığını görün." },
    { href:"/kariyer", label:"Kariyer Hazırlığı", description:"Mevcut rol, hedef rol ve hazırlık durumunu görün." },
    { href:"/yedekleme", label:"Kritik Roller & Yedekler", description:"Kritik roller için hazır adayları takip edin." },
  ]},
  { id:"compensation", label:"Ücret", section:"Çalışma Alanları", description:"Ücret kararları, adalet kontrolleri ve yönetici önerileri.", items:[
    { href:"/maas", label:"Ücret Yönetimi", description:"Ücret, piyasa karşılaştırması ve bütçe senaryolarını yönetin." },
    { href:"/ucret-adaleti", label:"Ücret Adaleti", description:"Benzer roller arasındaki ücret farklarını kontrol edin." },
    { href:"/yonetici/maas-talep", label:"Ücret Önerileri", description:"Yönetici ücret önerilerini onay sürecine gönderin." },
  ]},
  { id:"recruitment", label:"İşe Alım", section:"Çalışma Alanları", description:"Adayları başvurudan teklife kadar tek akışta yönetin.", items:[
    { href:"/ise-alim", label:"Adaylar & İşe Alım", description:"Adayları, görüşmeleri ve teklif sürecini takip edin." },
    { href:"/aday-testi", label:"Aday Değerlendirmeleri", description:"Yetkinlik testlerini ve değerlendirme sonuçlarını görün." },
  ]},
  { id:"system", label:"Sistem Yönetimi", section:"Sistem", description:"Kurulum, kullanıcılar, veri, entegrasyonlar ve güvenlik ayarları.", items:[
    { href:"/admin", label:"Kullanıcılar & Yetkiler", description:"Kullanıcı hesaplarını ve temel erişimleri yönetin." },
    { href:"/kurulum", label:"Şirket Kurulumu", description:"FutureHR'ı şirketiniz için adım adım hazırlayın." },
    { href:"/turkiye-uyum", label:"Türkiye Kuralları", description:"İzin, İş Kanunu ve yerel uyum kontrollerini görün." },
    { href:"/admin/entegrasyonlar", label:"Entegrasyonlar", description:"ERP, bordro, PDKS ve diğer sistem bağlantılarını yönetin." },
    { href:"/admin/veri-aktarimi", label:"Excel / CSV Veri Aktarımı", description:"Çalışan ve diğer verileri kontrollü şekilde içe aktarın." },
    { href:"/yonetici-raporlari", label:"Yönetim Raporları", description:"Yönetim özetlerini ve raporları oluşturun." },
    { href:"/admin/guven-kvkk", label:"Gizlilik & KVKK", description:"Veri gizliliği, saklama ve AI kullanım kontrollerini yönetin." },
    { href:"/ayarlar/yetki-mimarisi", label:"Gelişmiş Yetki Ayarları", description:"Rol ve modül bazlı gelişmiş erişim kurallarını yönetin." },
  ]},
];

export function routeMatches(pathname:string,href:string){const normalized=decodeURIComponent(pathname||"/");const target=decodeURIComponent(href);return normalized===target||normalized.startsWith(`${target}/`);}
export function familyForPath(pathname:string){return NAVIGATION_FAMILIES.find(family=>family.items.some(item=>routeMatches(pathname,item.href)))||null;}
