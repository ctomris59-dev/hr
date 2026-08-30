"use client";

import Link from "next/link";
import { BarChart3, BookOpen, Building2, CheckCircle2, ChevronRight, Crown, DollarSign, FileInput, FileText, GraduationCap, Heart, LockKeyhole, MapPin, Plane, RefreshCw, Scale, Settings2, ShieldCheck, SlidersHorizontal, Target, UserPlus, Users, WalletCards, type LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { canAccessRoute } from "../lib/hr/accessControl";
import { familyForPath, routeMatches } from "../lib/hr/navigationArchitecture";

const routeIcons:Record<string,LucideIcon>={
  "/organizasyon":Building2,
  "/rol-mimarisi":Target,
  "/degerlendirme":RefreshCw,
  "/kalibrasyon":Scale,
  "/yetenek-matrisi":BarChart3,
  "/kariyer":MapPin,
  "/yedekleme":Crown,
  "/gelisim":GraduationCap,
  "/egitim":BookOpen,
  "/gelisim-analitigi":BarChart3,
  "/maas":DollarSign,
  "/yonetici/maas-talep":WalletCards,
  "/calisan-deneyimi":Heart,
  "/ise-alim":UserPlus,
  "/aday-testi":FileText,
  "/ekip-yonetimi":Users,
  "/izinler":Plane,
  "/admin":ShieldCheck,
  "/kurulum":Settings2,
  "/admin/veri-aktarimi":FileInput,
  "/admin/guven-kvkk":LockKeyhole,
  "/ayarlar/yetki-mimarisi":SlidersHorizontal,
};

export default function ModuleFamilyNavigator({pathname}:{pathname:string}){
  const{currentUserRole}=useAuth();
  const family=familyForPath(pathname);
  if(!family)return null;
  const visibleItems=family.items.filter(item=>canAccessRoute(currentUserRole,item.href));
  if(visibleItems.length<2)return null;
  const activeHref=[...visibleItems].filter(item=>routeMatches(pathname,item.href)).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
  return <section className="futurehr-family-nav mb-6 overflow-hidden dark:bg-slate-900" aria-label={`${family.label} modülleri`}>
    <div className="futurehr-family-nav-header px-4 py-4 sm:px-5">
      <div className="grid gap-2 md:grid-cols-[minmax(220px,.75fr)_minmax(0,1.25fr)] md:items-end md:gap-8">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500 dark:text-slate-400">{family.label} çalışma alanı</p><h2 className="mt-1 text-[18px] font-semibold text-slate-950 dark:text-white">Bu alanın modülleri</h2></div>
        <p className="max-w-3xl text-[12px] leading-5 text-slate-500 dark:text-slate-400">{family.description}</p>
      </div>
    </div>
    <div className={`grid gap-2.5 p-3 sm:p-4 ${visibleItems.length===2?"md:grid-cols-2":visibleItems.length===3?"md:grid-cols-3":"md:grid-cols-2 xl:grid-cols-3"}`}>
      {visibleItems.map((item,index)=>{const Icon=routeIcons[item.href]||ChevronRight;const active=item.href===activeHref;return <Link key={item.href} href={item.href} data-workspace-module={item.href} data-active={active?"true":"false"} className="futurehr-family-card group relative min-h-[124px] overflow-hidden border p-4">
        {active&&<span className="futurehr-family-current absolute right-3 top-3 inline-flex items-center gap-1 px-2 py-1 text-[9px] font-semibold uppercase tracking-[.06em]"><CheckCircle2 className="h-3 w-3"/>Şu an</span>}
        <div className="futurehr-family-card-icon flex h-9 w-9 items-center justify-center"><Icon className="h-[18px] w-[18px]" strokeWidth={1.65}/></div>
        <div className="mt-3 pr-14"><div className="flex items-baseline gap-2"><span className="text-[10px] font-semibold tabular-nums text-slate-300 dark:text-slate-600">{String(index+1).padStart(2,"0")}</span><h3 className="text-[14px] font-semibold tracking-[-.015em] text-slate-950 dark:text-slate-100">{item.label}</h3></div><p className="mt-1.5 text-[12px] leading-[1.2rem] text-slate-500 dark:text-slate-400">{item.description}</p></div>
        <span className="futurehr-family-arrow absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center"><ChevronRight className="h-4 w-4"/></span>
      </Link>;})}
    </div>
  </section>;
}
