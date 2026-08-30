"use client";

import type { CSSProperties, ReactNode } from "react";
import { Activity, BarChart3, BookOpen, Building2, Clock3, Crown, DollarSign, FileInput, FileText, Gauge, Heart, LockKeyhole, MapPin, Plane, RefreshCw, Scale, Settings2, ShieldCheck, SlidersHorizontal, Target, UserPlus, Users, type LucideIcon } from "lucide-react";
import ProductHealthStrip from "./ProductHealthStrip";
import OrganizationExcelExchange from "./hr/OrganizationExcelExchange";
import ImportRecoveryPanel from "./hr/ImportRecoveryPanel";
import PerformanceCycleBar from "./hr/PerformanceCycleBar";
import SalaryExcelExchange from "./salary/SalaryExcelExchange";
import CompensationCycleBar from "./salary/CompensationCycleBar";
import ModuleFamilyNavigator from "./ModuleFamilyNavigator";

type ModuleConfig = { path:string; id:string; title:string; focus:string; steps:string[]; icon:LucideIcon; accent:string; accent2:string; soft:string; };
const MODULES: ModuleConfig[] = [
  { path:"/izinler",id:"izinler",title:"İzin Yönetimi",focus:"Bakiye, talep, onay ve ekip çakışmalarını birlikte yönetin.",steps:["Bakiye","Talep","Onay","Takvim"],icon:Plane,accent:"#0284c7",accent2:"#0f766e",soft:"#eff6ff" },
  { path:"/calisan-deneyimi",id:"deneyim",title:"Çalışan Deneyimi & Nabız",focus:"Mikro-pulse sonuçlarını yalnızca anonim eşik üzerinden driver değişimleriyle yorumlayın.",steps:["Check-in","Anonimlik","Driver","Aksiyon"],icon:Heart,accent:"#e11d48",accent2:"#7c3aed",soft:"#fff1f2" },
  { path:"/organizasyon",id:"organizasyon",title:"Çalışanlar & Organizasyon",focus:"Personel Kodu, rol, yönetici ve Türkiye organizasyon alanlarını tek çalışan ana verisinde tutun.",steps:["Çalışan","Rol","Yönetici","Excel"],icon:Building2,accent:"#2563eb",accent2:"#475569",soft:"#eff6ff" },
  { path:"/rol-mimarisi",id:"rol-mimarisi",title:"Rol & Yetkinlik Mimarisi",focus:"Türkçe pozisyonları kanonik role, seviyeye ve hedef yetkinlik profiline bağlayın.",steps:["Pozisyon","Job Family","Seviye","Hedef Profil"],icon:Target,accent:"#4f46e5",accent2:"#0f766e",soft:"#eef2ff" },
  { path:"/degerlendirme",id:"degerlendirme",title:"Performans",focus:"Eksik veriyi ortalama saymadan KPI, yönetici gözlemi ve yetkinlik kanıtını dönem içinde tamamlayın.",steps:["Dönem","Hedef","Kanıt","Kaydet"],icon:RefreshCw,accent:"#4f46e5",accent2:"#7c3aed",soft:"#eef2ff" },
  { path:"/kalibrasyon",id:"kalibrasyon",title:"Performans Kalibrasyonu",focus:"KPI-yönetici farklarını ve düşük Evidence Score kayıtlarını dönem kilitlenmeden insan değerlendirmesine taşıyın.",steps:["Dönem","Fark","Kanıt","Kalibrasyon"],icon:Scale,accent:"#7c3aed",accent2:"#2563eb",soft:"#f5f3ff" },
  { path:"/yetenek-matrisi",id:"yetenek-matrisi",title:"Yetenek & 9-Box",focus:"Performans, potansiyel ve kanıt güvenini aynı yetenek karar zincirinde değerlendirin.",steps:["Performans","Potansiyel","9-Box","Aksiyon"],icon:BarChart3,accent:"#4f46e5",accent2:"#059669",soft:"#eef2ff" },
  { path:"/egitim",id:"egitim",title:"Eğitim & Müdahaleler",focus:"Eğitimi tek başına hedef değil, gelişim planındaki aksiyonlardan biri olarak yönetin.",steps:["Katalog","Atama","Transfer","Ölçüm"],icon:BookOpen,accent:"#0891b2",accent2:"#2563eb",soft:"#ecfeff" },
  { path:"/gelisim",id:"gelisim",title:"Gelişim Planı",focus:"Yetkinlik açığını stretch assignment, mentorluk, proje ve öğrenme aksiyonuna dönüştürün.",steps:["Gap","Hedef","Aksiyon","İlerleme"],icon:Clock3,accent:"#059669",accent2:"#4f46e5",soft:"#ecfdf5" },
  { path:"/gelisim-analitigi",id:"gelisim-analitigi",title:"Gelişim Etkinliği",focus:"Doğrulanmış işe transferi yeniden ölçümle birleştirerek hangi yetkinlik ve yöntemlerde pozitif değişim sinyali oluştuğunu görün.",steps:["Transfer","Doğrulama","Yeniden Ölçüm","Etkinlik"],icon:BarChart3,accent:"#059669",accent2:"#0f766e",soft:"#ecfdf5" },
  { path:"/kariyer",id:"kariyer",title:"Kariyer & Readiness",focus:"Hazır bulunuşluğu rol uyumu, performans, potansiyel ve veri kapsamıyla birlikte görün.",steps:["Mevcut Rol","Hedef Rol","Kapsam","Yol"],icon:MapPin,accent:"#c026d3",accent2:"#d97706",soft:"#fdf4ff" },
  { path:"/yedekleme",id:"yedekleme",title:"Halefiyet & Yedekleme",focus:"Düşük kanıtla 'Şimdi hazır' üretmeden kritik rol sürekliliğini ve bench depth'i yönetin.",steps:["Kritik Rol","Aday","Kanıt","Hazırlık"],icon:Crown,accent:"#dc2626",accent2:"#d97706",soft:"#fef2f2" },
  { path:"/maas",id:"maas",title:"Ücret & Bütçe",focus:"Ücret, dış benchmark, performans kanıtı ve bütçeyi aşamalı döngüde insan onayıyla yönetin.",steps:["Veri","Yönetici","Bütçe","Onay"],icon:DollarSign,accent:"#0f766e",accent2:"#2563eb",soft:"#f0fdfa" },
  { path:"/yonetici/maas-talep",id:"maas-talep",title:"Yönetici Ücret Önerileri",focus:"Yönetici önerisini doğrudan maaşa yazmadan ücret döngüsüne kontrollü biçimde gönderin.",steps:["Çalışan","Öneri","Bütçe","Gönder"],icon:Gauge,accent:"#0f766e",accent2:"#d97706",soft:"#f0fdfa" },
  { path:"/ise-alim",id:"ise-alim",title:"İşe Alım",focus:"Testi nihai karar değil; yapılandırılmış mülakat, iş örneği ve deneyimle birlikte kanıt olarak kullanın.",steps:["Başvuru","Kanıt","Mülakat","Teklif"],icon:UserPlus,accent:"#7c3aed",accent2:"#0d9488",soft:"#f5f3ff" },
  { path:"/aday-testi",id:"aday-testi",title:"Yetkinlik Testleri",focus:"Sonucu karar etiketi değil, rol uyumu için kalite sinyalleriyle birlikte ölçüm kanıtı olarak kullanın.",steps:["Hazırlık","Test","Kalite","Rapor"],icon:FileText,accent:"#2563eb",accent2:"#4f46e5",soft:"#eff6ff" },
  { path:"/ekip-yonetimi",id:"ekip-yonetimi",title:"Ekip Yönetimi",focus:"Yönetici aksiyonlarını çalışan ana verisiyle karıştırmadan günlük ekip görünümünde yönetin.",steps:["Ekip","Aksiyon","Gelişim","Takip"],icon:Users,accent:"#475569",accent2:"#4f46e5",soft:"#f8fafc" },
  { path:"/kurulum",id:"kurulum",title:"Şirket Kurulumu",focus:"Yeni şirketi organizasyon, rol/yetkinlik, dönem, ücret ve yetki adımlarıyla pilot kullanıma hazırlayın.",steps:["Şirket","Organizasyon","Dönem","Güven"],icon:Settings2,accent:"#4f46e5",accent2:"#059669",soft:"#eef2ff" },
  { path:"/admin/veri-aktarimi",id:"veri-aktarimi",title:"Veri Aktarım Merkezi",focus:"Excel, Logo, Mikro ve Netsis çıktısını önizleyip FutureHR ortak çalışan veri modeline eşleyin.",steps:["Kaynak","Eşleme","Kontrol","Aktarım"],icon:FileInput,accent:"#0f766e",accent2:"#2563eb",soft:"#f0fdfa" },
  { path:"/admin/guven-kvkk",id:"guven-kvkk",title:"Güven & KVKK",focus:"AI kullanım izi, veri minimizasyonu, anonimlik ve saklama risklerini görünür tutun.",steps:["Gizlilik","AI Audit","Saklama","Kontrol"],icon:LockKeyhole,accent:"#334155",accent2:"#7c3aed",soft:"#f8fafc" },
  { path:"/ayarlar/yetki-mimarisi",id:"yetki-mimarisi",title:"Yetki Mimarisi",focus:"Varsayılan erişimi yalnızca daraltan firma politikalarıyla hassas modülleri yönetin.",steps:["Rol","Modül","Kapsam","Politika"],icon:SlidersHorizontal,accent:"#475569",accent2:"#4f46e5",soft:"#f8fafc" },
  { path:"/admin",id:"admin",title:"Yönetim & Ayarlar",focus:"Demo kullanıcıları, kurulum, veri aktarımı, güven ve rol erişimlerini merkezi yönetin.",steps:["Kullanıcı","Kurulum","Veri","Güven"],icon:ShieldCheck,accent:"#334155",accent2:"#d97706",soft:"#f8fafc" },
];
function findConfig(pathname:string){return [...MODULES].sort((a,b)=>b.path.length-a.path.length).find((module)=>pathname===module.path||pathname.startsWith(`${module.path}/`));}

export default function ModuleWorkspace({pathname,children}:{pathname:string;children:ReactNode}){
  if(pathname==="/dashboard")return <><ProductHealthStrip/>{children}</>;
  const config=findConfig(pathname);if(!config)return <>{children}</>;const Icon=config.icon;const style={"--module-accent":config.accent,"--module-accent-2":config.accent2,"--module-soft":config.soft} as CSSProperties;
  return <div className={`module-workspace workspace-${config.id}`} data-module={config.id} style={style}>
    <section className="module-hero mb-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)] dark:border-slate-800 dark:bg-slate-900" aria-label={`${config.title} akış rehberi`}><div className="flex flex-col gap-2.5 px-3.5 py-2.5 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm" style={{background:`linear-gradient(135deg, ${config.accent}, ${config.accent2})`}}><Icon className="h-3.5 w-3.5" strokeWidth={1.9}/></span><div className="min-w-0"><div className="flex items-center gap-1.5"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">Akış rehberi</p><Activity className="h-2.5 w-2.5 text-emerald-500"/></div><p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 lg:truncate">{config.focus}</p></div></div><div className="flex flex-wrap gap-1">{config.steps.map((step,index)=><span key={step} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400"><b className="mr-1 text-slate-300">{index+1}</b>{step}</span>)}</div></div></section>
    <ModuleFamilyNavigator pathname={pathname}/>
    {(pathname==="/degerlendirme"||pathname==="/kalibrasyon")&&<PerformanceCycleBar/>}
    {(pathname==="/maas"||pathname==="/yonetici/maas-talep")&&<CompensationCycleBar/>}
    {(pathname==="/organizasyon"||pathname==="/admin/veri-aktarimi")&&<ImportRecoveryPanel/>}
    {pathname==="/organizasyon"&&<div className="mb-4"><OrganizationExcelExchange/></div>}
    {pathname==="/maas"&&<div className="mb-4"><SalaryExcelExchange/></div>}
    <section className="module-native-content">{children}</section>
  </div>;
}
