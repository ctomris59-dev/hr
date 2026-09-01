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
  return <div className={`module-workspace workspace-${config.id}`} data-module={config.id} style={style}>
    <section className="module-hero mb-3 overflow-hidden border bg-white dark:border-slate-800 dark:bg-slate-900" aria-label={`${config.title} çalışma akışı`}><div className="grid gap-2.5 px-4 py-2.5 md:grid-cols-[minmax(0,1.35fr)_auto] md:items-center"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center text-white" style={{background:config.accent}}><Icon className="h-4 w-4" strokeWidth={1.7}/></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-slate-400">Çalışma akışı</p><p className="mt-0.5 text-[12.5px] leading-[1.1rem] text-slate-600 dark:text-slate-300">{config.focus}</p></div></div><div className="futurehr-workflow-steps flex flex-wrap items-center gap-x-3 gap-y-1.5">{config.steps.map((step,index)=><span key={step} className="futurehr-workflow-step inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400"><b className="font-semibold tabular-nums text-slate-400">{String(index+1).padStart(2,"0")}</b><span>{step}</span></span>)}</div></div></section>
    <ModuleFamilyNavigator pathname={pathname}/>
    {(pathname==="/degerlendirme"||pathname==="/kalibrasyon")&&<PerformanceCycleBar/>}
    {(pathname==="/maas"||pathname==="/yonetici/maas-talep")&&<CompensationCycleBar/>}
    {(pathname==="/organizasyon"||pathname==="/admin/veri-aktarimi")&&<ImportRecoveryPanel/>}
    {pathname==="/organizasyon"&&<div className="mb-4"><OrganizationExcelExchange/></div>}
    {pathname==="/maas"&&<div className="mb-4"><SalaryExcelExchange/></div>}
    <ModuleDecisionSummary pathname={pathname}/>
    <section className="module-native-content visualized-native-content">{children}</section>
  </div>;
}