"use client";

import Link from "next/link";
import { BarChart3, BookOpen, Building2, CheckCircle2, ChevronRight, Crown, DollarSign, FileInput, FileText, GraduationCap, Heart, Landmark, LockKeyhole, MapPin, Network, Plane, RefreshCw, Scale, Settings2, ShieldCheck, SlidersHorizontal, Target, UserPlus, Users, WalletCards, type LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { canAccessRoute } from "../lib/hr/accessControl";
import { familyForPath, routeMatches } from "../lib/hr/navigationArchitecture";

const routeIcons:Record<string,LucideIcon>={
  "/organizasyon":Building2,
  "/rol-mimarisi":Target,
  "/degerlendirme":RefreshCw,
  "/kalibrasyon":Scale,
  "/yetenek-matrisi":BarChart3,
  "/yetkinlik-haritasi":Network,
  "/kariyer":MapPin,
  "/yedekleme":Crown,
  "/gelisim":GraduationCap,
  "/egitim":BookOpen,
  "/gelisim-analitigi":BarChart3,
  "/maas":DollarSign,
  "/ucret-adaleti":Scale,
  "/yonetici/maas-talep":WalletCards,
  "/calisan-deneyimi":Heart,
  "/ise-alim":UserPlus,
  "/aday-testi":FileText,
  "/ekip-yonetimi":Users,
  "/izinler":Plane,
  "/admin":ShieldCheck,
  "/kurulum":Settings2,
  "/turkiye-uyum":Landmark,
  "/admin/veri-aktarimi":FileInput,
  "/admin/guven-kvkk":LockKeyhole,
  "/ayarlar/yetki-mimarisi":SlidersHorizontal,
};

function gridClass(count:number){
  if(count===2)return "md:grid-cols-2";
  if(count===3)return "md:grid-cols-3";
  if(count===5)return "md:grid-cols-2 xl:grid-cols-5";
  if(count===6)return "md:grid-cols-2 xl:grid-cols-3";
  return "md:grid-cols-2 xl:grid-cols-4";
}

export default function ModuleFamilyNavigator({pathname}:{pathname:string}){
  const{currentUserRole}=useAuth();
  const family=familyForPath(pathname);
  if(!family)return null;
  const visibleItems=family.items.filter(item=>canAccessRoute(currentUserRole,item.href));
  if(visibleItems.length<2)return null;
  const activeHref=[...visibleItems].filter(item=>routeMatches(pathname,item.href)).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
  return <section className="futurehr-family-nav mb-4 overflow-hidden dark:bg-slate-900" aria-label={`${family.label} modülleri`}>
    <div className="futurehr-family-nav-header px-4 py-3 sm:px-5">
      <div className="grid gap-1.5 md:grid-cols-[minmax(210px,.7fr)_minmax(0,1.3fr)] md:items-end md:gap-7">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-slate-500 dark:text-slate-400">{family.label} çalışma alanı</p><h2 className="mt-0.5 text-[16px] font-semibold text-slate-950 dark:text-white">Bu alanın modülleri</h2></div>
        <p className="max-w-3xl text-[12px] leading-[1.15rem] text-slate-500 dark:text-slate-400">{family.description}</p>
      </div>
    </div>
    <div className={`grid gap-2 p-3 ${gridClass(visibleItems.length)}`}>
      {visibleItems.map((item,index)=>{const Icon=routeIcons[item.href]||ChevronRight;const active=item.href===activeHref;return <Link key={item.href} href={item.href} data-workspace-module={item.href} data-active={active?"true":"false"} className="futurehr-family-card group relative min-h-[96px] overflow-hidden border px-3.5 py-3">
        <div className="flex items-start gap-3">
          <div className="futurehr-family-card-icon flex h-8 w-8 shrink-0 items-center justify-center"><Icon className="h-4 w-4" strokeWidth={1.65}/></div>
          <div className="min-w-0 flex-1 pr-7">
            <div className="flex min-w-0 items-center gap-2"><span className="text-[9.5px] font-semibold tabular-nums text-slate-300 dark:text-slate-600">{String(index+1).padStart(2,"0")}</span><h3 className="truncate text-[14px] font-semibold tracking-[-.015em] text-slate-950 dark:text-slate-100">{item.label}</h3>{active&&<span className="futurehr-family-current-inline inline-flex shrink-0 items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[.05em]"><CheckCircle2 className="h-3 w-3"/>Aktif</span>}</div>
            <p className="mt-1 text-[11.5px] leading-[1.05rem] text-slate-500 dark:text-slate-400">{item.description}</p>
          </div>
        </div>
        <span className="futurehr-family-arrow absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center"><ChevronRight className="h-3.5 w-3.5"/></span>
      </Link>;})}
    </div>
  </section>;
}
