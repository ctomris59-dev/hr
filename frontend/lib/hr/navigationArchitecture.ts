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
  { id:"organization", label:"İnsan & Organizasyon", section:"Çalışma Alanları", description:"Kim nerede, kime bağlı, ekip deneyimi nasıl ve günlük insan operasyonlarında ne oluyor?", items:[
    { href:"/organizasyon", label:"Çalışanlar & Organizasyon", description:"Çalışan, yönetici, departman ve organizasyon ana verisi." },
    { href:"/calisan-deneyimi", label:"Çalışan Deneyimi & Nabız", description:"Anonim check-in, driver analizi ve aksiyon görünümü." },
    { href:"/ekip-yonetimi", label:"Ekip Yönetimi", description:"Günlük ekip görünümü ve yönetici aksiyonları." },
    { href:"/izinler", label:"İzin Yönetimi", description:"Bakiye, talep, onay ve Türkiye izin kuralları." },
  ]},
  { id:"performance", label:"Performans & Yetenek", section:"Çalışma Alanları", description:"Kim nasıl performans gösteriyor, hangi karar kanıta dayanıyor ve kim kritik yetenek segmentinde?", items:[
    { href:"/rol-mimarisi", label:"Rol & Yetkinlik Mimarisi", description:"Job family, seviye ve hedef yetkinlik profilleri." },
    { href:"/degerlendirme", label:"Performans", description:"KPI, yönetici gözlemi, yetkinlik ve dönem sonuçları." },
    { href:"/kalibrasyon", label:"Kalibrasyon", description:"Skor farkları, kanıt kalitesi ve nihai insan değerlendirmesi." },
    { href:"/yetenek-matrisi", label:"Yetenek & 9-Box", description:"Performans, potansiyel ve Evidence Score ile yetenek görünümü." },
    { href:"/yetkinlik-haritasi", label:"Yetkinlik Haritası", description:"Çalışan, rol ve yetkinlik bağlarını Skills Graph üzerinde görün." },
  ]},
  { id:"talentCareer", label:"Gelişim & Kariyer", section:"Çalışma Alanları", description:"Kimi nasıl geliştirmeli, bir sonraki role ne kadar hazır ve kritik rollerde kim yedek olabilir?", items:[
    { href:"/gelisim", label:"Gelişim Planı", description:"Yetkinlik gap'lerini hedef ve gelişim aksiyonlarına dönüştürün." },
    { href:"/egitim", label:"Eğitim & Müdahaleler", description:"Kanıta dayalı gelişim müdahalelerini atayın ve takip edin." },
    { href:"/gelisim-analitigi", label:"Gelişim Etkinliği", description:"Transfer, doğrulama, yeniden ölçüm ve değişim sinyallerini analiz edin." },
    { href:"/kariyer", label:"Kariyer & Readiness", description:"Mevcut rol, hedef rol, gap ve hazır bulunuşluk görünümü." },
    { href:"/yedekleme", label:"Halefiyet & Yedekleme", description:"Kritik roller, aday havuzu, bench depth ve hazırlık durumu." },
  ]},
  { id:"compensation", label:"Ücret & İşgücü Kararları", section:"Çalışma Alanları", description:"Kime ne kadar ve neden? Piyasa, iç adalet, bütçe ve yönetici önerilerini aynı karar alanında yönetin.", items:[
    { href:"/maas", label:"Ücret Karar Merkezi", description:"Ücret analizi, benchmark, bütçe ve karar görünümü." },
    { href:"/ucret-adaleti", label:"Ücret Adaleti & Sıkışma", description:"Compa-ratio, piyasa farkı, iç emsal ve sıkışma sinyalleri." },
    { href:"/yonetici/maas-talep", label:"Yönetici Önerileri", description:"Yönetici ücret önerilerini kontrollü onay akışına gönderin." },
  ]},
  { id:"recruitment", label:"İşe Alım", section:"Çalışma Alanları", description:"Doğru adayı seçmek için başvuru, test, mülakat, iş örneği ve teklif kanıtlarını tek akışta yönetin.", items:[
    { href:"/ise-alim", label:"İşe Alım Süreci", description:"Başvuru, kanıt, mülakat ve teklif akışı." },
    { href:"/aday-testi", label:"Yetkinlik Testleri", description:"Testleri nihai karar değil, yapılandırılmış değerlendirme kanıtı olarak kullanın." },
  ]},
  { id:"system", label:"Yönetim & Ayarlar", section:"Sistem", description:"Kurulum, kullanıcı, Türkiye uyumu, entegrasyon, veri aktarımı, güven ve erişim politikalarını tek sistem alanında yönetin.", items:[
    { href:"/admin", label:"Kullanıcı & Yetki", description:"Kullanıcılar, roller ve erişim yönetimi." },
    { href:"/kurulum", label:"Şirket Kurulumu", description:"Organizasyon, dönem, ücret ve güven adımlarını yapılandırın." },
    { href:"/turkiye-uyum", label:"Türkiye Uyum", description:"KVKK, İş Kanunu, SSO ve entegrasyon readiness görünümü." },
    { href:"/admin/entegrasyonlar", label:"Entegrasyon Merkezi", description:"Logo, Netsis, Mikro, SAP, PDKS ve bordro connector yönetimi." },
    { href:"/admin/veri-aktarimi", label:"Veri Aktarımı", description:"Excel/CSV onboarding, alan eşleme ve kalite kontrolü." },
    { href:"/yonetici-raporlari", label:"Yönetici Raporları", description:"Türkçe yönetim özeti, riskler ve karar aksiyonları." },
    { href:"/admin/guven-kvkk", label:"Güven & KVKK", description:"AI audit, veri minimizasyonu, anonimlik ve saklama kontrolleri." },
    { href:"/ayarlar/yetki-mimarisi", label:"Yetki Mimarisi", description:"Rol, modül ve kapsam politikalarını yönetin." },
  ]},
];

export function routeMatches(pathname:string,href:string){const normalized=decodeURIComponent(pathname||"/");const target=decodeURIComponent(href);return normalized===target||normalized.startsWith(`${target}/`);}
export function familyForPath(pathname:string){return NAVIGATION_FAMILIES.find(family=>family.items.some(item=>routeMatches(pathname,item.href)))||null;}
