"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleHelp, Search, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { canAccessRoute } from "../lib/hr/accessControl";

const PAGE_HELP:Array<{match:string;title:string;body:string}> = [
  {match:"/dashboard",title:"Ana Sayfa",body:"Önce Bekleyen İşler bölümüne bakın. Sayı görünen kartlar bugün ilgilenmeniz gereken işlemleri gösterir."},
  {match:"/organizasyon",title:"Çalışanlar & Organizasyon",body:"Çalışan eklemek, bilgileri güncellemek veya yönetici ilişkilerini kontrol etmek için bu ekranı kullanın."},
  {match:"/izinler",title:"İzinler",body:"İzin bakiyesi, yeni talep, onay ve ekip takvimi işlemlerini buradan yapabilirsiniz."},
  {match:"/degerlendirme",title:"Performans",body:"Önce dönemi ve çalışanı seçin; değerlendirmeyi tamamladıktan sonra kaydedin."},
  {match:"/yetenek-matrisi",title:"Yetenek Değerlendirmesi",body:"Performans ve potansiyel sonuçlarını birlikte görün. Matris nihai insan kararının yerine geçmez."},
  {match:"/egitim",title:"Eğitimler",body:"Eğitim atamak ve tamamlanma durumunu takip etmek için bu ekranı kullanın."},
  {match:"/gelisim",title:"Gelişim Planları",body:"Gelişim hedefi belirleyin, aksiyon ekleyin ve ilerlemeyi takip edin."},
  {match:"/kariyer",title:"Kariyer Hazırlığı",body:"Mevcut rolünüzü, hedef rolü ve hazırlanmanız gereken alanları burada görebilirsiniz."},
  {match:"/maas",title:"Ücret Yönetimi",body:"Ücret seçeneklerini ve bütçe etkisini karşılaştırın. Değişiklikler onay sürecinden geçmeden uygulanmaz."},
  {match:"/ise-alim",title:"Adaylar & İşe Alım",body:"Adayları başvurudan görüşme ve teklif aşamasına kadar buradan takip edin."},
  {match:"/kurulum",title:"Şirket Kurulumu",body:"Şirket bilgileri, çalışanlar ve temel dönem ayarlarını sırayla tamamlayın."},
  {match:"/admin/veri-aktarimi",title:"Excel / CSV Veri Aktarımı",body:"Dosyayı seçin, alanları kontrol edin, önizleyin ve ardından aktarımı başlatın."},
  {match:"/admin/entegrasyonlar",title:"Entegrasyonlar",body:"Kullandığınız kurumsal sistemi seçin. “Kurulum gerekiyor” ifadesi hata değil, kurum bağlantı bilgilerinin henüz tanımlanmadığı anlamına gelir."},
  {match:"/turkiye-uyum",title:"Türkiye Ayarları & Hazırlık",body:"Yeşil alanlar hazır, sarı alanlar kurulum gerektiriyor. Kartı açarak yapılması gereken işlemi görebilirsiniz."},
];

export default function GuidedOnboarding(){
  const pathname=decodeURIComponent(usePathname()||"/");
  const {currentUserRole}=useAuth();
  const[open,setOpen]=useState(false);

  useEffect(()=>{
    if(!open)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[open]);

  const pageHelp=useMemo(()=>PAGE_HELP.find(item=>pathname===item.match||pathname.startsWith(`${item.match}/`))||{title:"FutureHR",body:"Sol menüden yapmak istediğiniz işlemi seçin. Ayrıntılı araçlar yalnız gerektiğinde açılır."},[pathname]);
  const homeHref=currentUserRole&&canAccessRoute(currentUserRole,"/dashboard")?"/dashboard":currentUserRole&&canAccessRoute(currentUserRole,"/kariyer")?"/kariyer":"/";

  return <>
    <button type="button" onClick={()=>setOpen(true)} aria-label="Yardımı aç" title="Yardım" className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
      <CircleHelp className="h-4 w-4"/><span className="hidden 2xl:inline">Yardım</span>
    </button>
    {open&&<div className="fixed inset-0 z-[2147482000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="futurehr-help-title">
      <button type="button" aria-label="Yardımı kapat" onClick={()=>setOpen(false)} className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"/>
      <section className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,.22)] dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-start gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"><CircleHelp className="h-5 w-5"/></span>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-indigo-600">Yardım</p><h2 id="futurehr-help-title" className="mt-1 text-lg font-semibold">{pageHelp.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{pageHelp.body}</p></div>
          <button type="button" onClick={()=>setOpen(false)} aria-label="Kapat" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4"/></button>
        </header>
        <div className="space-y-3 p-5">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/30">1</span><div><h3 className="text-sm font-semibold">Önce ana sayfadan başlayın</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">Bekleyen işler ve hızlı işlemler size bugün ne yapmanız gerektiğini söyler.</p></div></div></div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/30"><Search className="h-4 w-4"/></span><div><h3 className="text-sm font-semibold">Bir şeyi bulamazsanız “Ara”yı kullanın</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">Üst menüdeki Ara düğmesi veya Ctrl + K ile ekran ve işlemleri hızlıca bulabilirsiniz.</p></div></div></div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/30"><Sparkles className="h-4 w-4"/></span><div><h3 className="text-sm font-semibold">Ne yapacağınızı sorabilirsiniz</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">FutureHR Intelligence'a doğal dille soru sorun; sistem erişiminiz dahilinde ilgili verileri ve ekranları bulur.</p></div></div></div>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30"><span className="text-[10px] text-slate-500">Esc tuşuyla da kapatabilirsiniz.</span><Link href={homeHref} onClick={()=>setOpen(false)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-[11px] font-semibold text-white">Ana başlangıç ekranı<ArrowRight className="h-3.5 w-3.5"/></Link></footer>
      </section>
    </div>}
  </>;
}
