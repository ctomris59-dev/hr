"use client";

import type { CSSProperties, ReactNode } from "react";
import { BarChart3, BookOpen, Building2, Clock3, Crown, DollarSign, FileInput, FileText, Gauge, Heart, LockKeyhole, MapPin, Plane, RefreshCw, Scale, Settings2, ShieldCheck, SlidersHorizontal, Target, UserPlus, Users, type LucideIcon } from "lucide-react";
import ProductHealthStrip from "./ProductHealthStrip";
import OrganizationExcelExchange from "./hr/OrganizationExcelExchange";
import ImportRecoveryPanel from "./hr/ImportRecoveryPanel";
import PerformanceCycleBar from "./hr/PerformanceCycleBar";
import SalaryExcelExchange from "./salary/SalaryExcelExchange";
import CompensationCycleBar from "./salary/CompensationCycleBar";
import ModuleFamilyNavigator from "./ModuleFamilyNavigator";
import ModuleDecisionSummary from "./VisualDecisionSystem";
import VisualModuleBoard from "./VisualModuleBoard";

type ModuleConfig = { path:string; id:string; title:string; focus:string; steps:string[]; icon:LucideIcon; accent:string; accent2:string; soft:string; };
const MODULES: ModuleConfig[] = [
  { path:"/izinler",id:"izinler",title:"İzin Yönetimi",focus:"Bakiye, talep, onay ve ekip çakışmalarını birlikte yönetin.",steps:["Bakiye","Talep","Onay","Takvim"],icon:Plane,accent:"#406b72",accent2:"#406b72",soft:"#eff5f4" },
  { path:"/calisan-deneyimi",id:"deneyim",title:"Çalışan Deneyimi & Nabız",focus:"Mikro-pulse sonuçlarını yalnızca anonim eşik üzerinden driver değişimleriyle yorumlayın.",steps:["Check-in","Anonimlik","Driver","Aksiyon"],icon:Heart,accent:"#7a5861",accent2:"#7a5861",soft:"#f7f1f2" },
  { path:"/organizasyon",id:"organizasyon",title:"Çalışanlar & Organizasyon",focus:"Personel Kodu, rol, yönetici ve Türkiye organizasyon alanlarını tek çalışan ana verisinde tutun.",steps:["Çalışan","Rol","Yönetici","Excel"],icon:Building2,accent:"#4f6575",accent2:"#4f6575",soft:"#f1f4f5" },
  { path:"/rol-mimarisi",id:"rol-mimarisi",title:"Rol & Yetkinlik Mimarisi",focus:"Türkçe pozisyonları kanonik role, seviyeye ve hedef yetkinlik profiline bağlayın.",steps:["Pozisyon","Job Family","Seviye","Hedef Profil"],icon:Target,accent:"#4d626d",accent2:"#4d626d",soft:"#f1f4f5" },
  { path:"/degerlendirme",id:"degerlendirme",title:"Performans",focus:"Eksik veriyi ortalama saymadan KPI, yönetici gözlemi ve yetkinlik kanıtını dönem içinde tamamlayın.",steps:["Dönem","Hedef","Kanıt","Kaydet"],icon:RefreshCw,accent:"#4a6268",accent2:"#4a6268",soft:"#eff4f3" },
  { path:"/kalibrasyon",id:"kalibrasyon",title:"Performans Kalibrasyonu",focus:"KPI-yönetici farklarını ve düşük Evidence Score kayıtlarını dönem kilitlenmeden insan değerlendirmesine taşıyın.",steps:["Dönem","Fark","Kanıt","Kalibrasyon"],icon:Scale,accent:"#665d70",accent2:"#665d70",soft:"#f4f2f5" },
  { path:"/yetenek-matrisi",id:"yetenek-matrisi",title:"Yetenek & 9-Box",focus:"Performans, potansiyel ve kanıt güvenini aynı yetenek karar zincirinde değerlendirin.",steps:["Performans","Potansiyel","9-Box","Aksiyon"],icon:BarChart3,accent:"#3f6862",accent2:"#3f6862",soft:"#eff5f3" },
  { path:"/egitim",id:"egitim",title:"Eğitim & Müdahaleler",focus:"Eğitimi tek başına hedef değil, gelişim planındaki aksiyonlardan biri olarak yönetin.",steps:["Katalog","Atama","Transfer","Ölçüm"],icon:BookOpen,accent:"#466d70",accent2:"#466d70",soft:"#eff5f5" },
  { path:"/gelisim",id:"gelisim",title:"Gelişim Planı",focus:"Yetkinlik açığını stretch assignment, mentorluk, proje ve öğrenme aksiyonuna dönüştürün.",steps:["Gap","Hedef","Aksiyon","İlerleme"],icon:Clock3,accent:"#456a57",accent2:"#456a57",soft:"#f0f5f1" },
  { path:"/gelisim-analitigi",id:"gelisim-analitigi",title:"Gelişim Etkinliği",focus:"Doğrulanmış işe transferi yeniden ölçümle birleştirerek hangi yetkinlik ve yöntemlerde pozitif değişim sinyali oluştuğunu görün.",steps:["Transfer","Doğrulama","Yeniden Ölçüm","Etkinlik"],icon:BarChart3,accent:"#456a57",accent2:"#456a57",soft:"#f0f5f1" },
  { path:"/kariyer",id:"kariyer",title:"Kariyer & Readiness",focus:"Hazır bulunuşluğu rol uyumu, performans, potansiyel ve veri kapsamıyla birlikte görün.",steps:["Mevcut Rol","Hedef Rol","Kapsam","Yol"],icon:MapPin,accent:"#6d5a69",accent2:"#6d5a69",soft:"#f5f1f4" },
  { path:"/yedekleme",id:"yedekleme",title:"Halefiyet & Yedekleme",focus:"Düşük kanıtla 'Şimdi hazır' üretmeden kritik rol sürekliliğini ve bench depth'i yönetin.",steps:["Kritik Rol","Aday","Kanıt","Hazırlık"],icon:Crown,accent:"#7b5a50",accent2:"#7b5a50",soft:"#f6f1ef" },
  { path:"/maas",id:"maas",title:"Ücret & Bütçe",focus:"Ücret, dış benchmark, performans kanıtı ve bütçeyi aşamalı döngüde insan onayıyla yönetin.",steps:["Veri","Yönetici","Bütçe","Onay"],icon:DollarSign,accent:"#356b64",accent2:"#356b64",soft:"#edf5f3" },
  { path:"/yonetici/maas-talep",id:"maas-talep",title:"Yönetici Ücret Önerileri",focus:"Yönetici önerisini doğrudan maaşa yazmadan ücret döngüsüne kontrollü biçimde gönderin.",steps:["Çalışan","Öneri","Bütçe","Gönder"],icon:Gauge,accent:"#356b64",accent2:"#356b64",soft:"#edf5f3" },
  { path:"/ise-alim",id:"ise-alim",title:"İşe Alım",focus:"Testi nihai karar değil; yapılandırılmış mülakat, iş örneği ve deneyimle birlikte kanıt olarak kullanın.",steps:["Başvuru","Kanıt","Mülakat","Teklif"],icon:UserPlus,accent:"#5e626f",accent2:"#5e626f",soft:"#f2f3f5" },
  { path:"/aday-testi",id:"aday-testi",title:"Yetkinlik Testleri",focus:"Sonucu karar etiketi değil, rol uyumu için kalite sinyalleriyle birlikte ölçüm kanıtı olarak kullanın.",steps:["Hazırlık","Test","Kalite","Rapor"],icon:FileText,accent:"#526778",accent2:"#526778",soft:"#f1f4f5" },
  { path:"/ekip-yonetimi",id:"ekip-yonetimi",title:"Ekip Yönetimi",focus:"Yönetici aksiyonlarını çalışan ana verisiyle karıştırmadan günlük ekip görünümünde yönetin.",steps:["Ekip","Aksiyon","Gelişim","Takip"],icon:Users,accent:"#596873",accent2:"#596873",soft:"#f3f5f5" },
  { path:"/kurulum",id:"kurulum",title:"Şirket Kurulumu",focus:"Yeni şirketi organizasyon, rol/yetkinlik, dönem, ücret ve yetki adımlarıyla pilot kullanıma hazırlayın.",steps:["Şirket","Organizasyon","Dönem","Güven"],icon:Settings2,accent:"#52656d",accent2:"#52656d",soft:"#f2f4f4" },
  { path:"/admin/veri-aktarimi",id:"veri-aktarimi",title:"Veri Aktarım Merkezi",focus:"Excel, Logo, Mikro ve Netsis çıktısını önizleyip FutureHR ortak çalışan veri modeline eşleyin.",steps:["Kaynak","Eşleme","Kontrol","Aktarım"],icon:FileInput,accent:"#426b67",accent2:"#426b67",soft:"#eff5f4" },
  { path:"/admin/guven-kvkk",id:"guven-kvkk",title:"Güven & KVKK",focus:"AI kullanım izi, veri minimizasyonu, anonimlik ve saklama risklerini görünür tutun.",steps:["Gizlilik","AI Audit","Saklama","Kontrol"],icon:LockKeyhole,accent:"#53616b",accent2:"#53616b",soft:"#f2f4f5" },
  { path:"/ayarlar/yetki-mimarisi",id:"yetki-mimarisi",title:"Yetki Mimarisi",focus:"Varsayılan erişimi yalnızca daraltan firma politikalarıyla hassas modülleri yönetin.",steps:["Rol","Modül","Kapsam","Politika"],icon:SlidersHorizontal,accent:"#53616b",accent2:"#53616b",soft:"#f2f4f5" },
  { path:"/admin",id:"admin",title:"Yönetim & Ayarlar",focus:"Demo kullanıcıları, kurulum, veri aktarımı, güven ve rol erişimlerini merkezi yönetin.",steps:["Kullanıcı","Kurulum","Veri","Güven"],icon:ShieldCheck,accent:"#53616b",accent2:"#53616b",soft:"#f2f4f5" },
];
function findConfig(pathname:string){return [...MODULES].sort((a,b)=>b.path.length-a.path.length).find((module)=>pathname===module.path||pathname.startsWith(`${module.path}/`));}

export default function ModuleWorkspace({pathname,children}:{pathname:string;children:ReactNode}){
  if(pathname==="/dashboard")return <><ProductHealthStrip/>{children}</>;
  const config=findConfig(pathname);if(!config)return <>{children}</>;const Icon=config.icon;const style={"--module-accent":config.accent,"--module-accent-2":config.accent2,"--module-soft":config.soft} as CSSProperties;
  const visualBoard=["/ise-alim","/egitim","/kariyer","/yetenek-matrisi"].some((path)=>pathname===path||pathname.startsWith(`${path}/`));
  const visualFirst=["/organizasyon","/ise-alim","/egitim","/kariyer","/yetenek-matrisi"].some((path)=>pathname===path||pathname.startsWith(`${path}/`));
  const salaryCore=pathname==="/maas";
  const organizationTools=pathname==="/organizasyon"?<><ImportRecoveryPanel/><div className="mb-4"><OrganizationExcelExchange/></div></>:null;
  const salaryTools=salaryCore?<div className="mb-4"><SalaryExcelExchange/></div>:null;
  return <div className={`module-workspace workspace-${config.id} module-workspace-v2`} data-module={config.id} style={style}>
    <section className="module-hero module-command-hero" aria-label={`${config.title} çalışma akışı`}>
      <div className="module-command-copy">
        <div className="module-command-kicker"><span className="module-command-live-dot"/>FUTUREHR · KARAR ÇALIŞMA ALANI</div>
        <div className="module-command-title-row"><span className="module-command-icon" style={{background:config.accent}}><Icon strokeWidth={1.7}/></span><div><h1>{config.title}</h1><p>{config.focus}</p></div></div>
      </div>
      <div className="module-command-flow" aria-label="İş akışı adımları">
        <div className="module-command-flow-label">İş akışı</div>
        <div className="module-command-flow-steps">{config.steps.map((step,index)=><div key={step} className="module-command-flow-step"><span>{String(index+1).padStart(2,"0")}</span><strong>{step}</strong></div>)}</div>
      </div>
    </section>

    <div className="module-family-stage"><ModuleFamilyNavigator pathname={pathname}/></div>
    {(pathname==="/degerlendirme"||pathname==="/kalibrasyon")&&<PerformanceCycleBar/>}
    {(pathname==="/maas"||pathname==="/yonetici/maas-talep")&&<CompensationCycleBar/>}
    {pathname==="/admin/veri-aktarimi"&&<ImportRecoveryPanel/>}

    <div className="module-decision-stage"><ModuleDecisionSummary pathname={pathname}/></div>
    {visualBoard&&<VisualModuleBoard pathname={pathname}/>}

    <section className="module-detail-stage" aria-label={`${config.title} detaylı çalışma alanı`}>
      <header className="module-detail-stage-header">
        <div><span>{salaryCore?"SİMÜLASYON MERKEZİ":visualFirst?"DETAY KATMANI":"OPERASYON ALANI"}</span><h2>{salaryCore?"Ücret simülasyonları":visualFirst?"Kayıtlar ve işlemler":"Detaylı çalışma alanı"}</h2></div>
        <p>{salaryCore?"A/B/C/D senaryoları, enflasyon varsayımı, benchmark, bütçe etkisi ve ücret döngüsü bu ekranın ana çalışma alanıdır. Simülasyonlar gizlenmez; Excel araçları ikincil kalır.":visualFirst?"Ana görünüm grafik ve karar kartıdır. Liste, Excel ve form ağırlıklı detayları yalnız ihtiyaç olduğunda açın.":"Karar özetindeki sinyalleri burada kayıt, kanıt ve iş akışı seviyesinde yönetin."}</p>
      </header>
      {salaryCore ? (
        <>
          <div className="module-native-content visualized-native-content">{children}</div>
          <details className="visual-first-native-shell mt-4">
            <summary>
              <div className="vf-summary-copy"><span>İSTEĞE BAĞLI ARAÇLAR</span><strong>Excel içe/dışa aktarma araçlarını aç</strong><small>Simülasyon motoru ana ekranda kalır; veri alışverişi araçları burada ikincildir.</small></div>
            </summary>
            <div className="module-native-content visualized-native-content">{salaryTools}</div>
          </details>
        </>
      ) : visualFirst ? (
        <details className="visual-first-native-shell">
          <summary>
            <div className="vf-summary-copy"><span>İSTEĞE BAĞLI DETAY</span><strong>Liste, kayıt ve işlem ekranlarını aç</strong><small>Filtreleme, Excel, düzenleme ve tekil kayıt işlemleri burada korunur.</small></div>
          </summary>
          <div className="module-native-content visualized-native-content">{organizationTools}{children}</div>
        </details>
      ) : <div className="module-native-content visualized-native-content">{children}</div>}
    </section>
  </div>;
}
