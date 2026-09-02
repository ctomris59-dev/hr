"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
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

const routeAccents:Record<string,[string,string,string]>={
  "/organizasyon":["#3974f6","#17aaa5","#eef4ff"],
  "/rol-mimarisi":["#4f46e5","#17aaa5","#eef2ff"],
  "/degerlendirme":["#5b5ce2","#8255ef","#f0f0ff"],
  "/kalibrasyon":["#8255ef","#3974f6","#f4f0ff"],
  "/yetenek-matrisi":["#18a97d","#3974f6","#ebfbf5"],
  "/yetkinlik-haritasi":["#3974f6","#5b5ce2","#eef4ff"],
  "/kariyer":["#8255ef","#c026d3","#f4f0ff"],
  "/yedekleme":["#ed516d","#f2a000","#fff0f3"],
  "/gelisim":["#17aaa5","#18a97d","#eafaf9"],
  "/egitim":["#3974f6","#5b5ce2","#eef4ff"],
  "/gelisim-analitigi":["#18a97d","#17aaa5","#ebfbf5"],
  "/maas":["#18a97d","#3974f6","#ebfbf5"],
  "/ucret-adaleti":["#0f766e","#18a97d","#f0fdfa"],
  "/yonetici/maas-talep":["#3974f6","#18a97d","#eef4ff"],
  "/calisan-deneyimi":["#ed516d","#8255ef","#fff0f3"],
  "/ise-alim":["#8255ef","#3974f6","#f4f0ff"],
  "/aday-testi":["#3974f6","#8255ef","#eef4ff"],
  "/ekip-yonetimi":["#3974f6","#17aaa5","#eef4ff"],
  "/izinler":["#0284c7","#17aaa5","#eff6ff"],
  "/admin":["#475569","#3974f6","#f1f5f9"],
  "/kurulum":["#64748b","#3974f6","#f1f5f9"],
  "/turkiye-uyum":["#b45309","#dc2626","#fffbeb"],
  "/admin/veri-aktarimi":["#17aaa5","#3974f6","#eafaf9"],
  "/admin/guven-kvkk":["#475569","#8255ef","#f1f5f9"],
  "/ayarlar/yetki-mimarisi":["#64748b","#3974f6","#f1f5f9"],
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
    <div className={`futurehr-family-grid grid gap-3 p-3 ${gridClass(visibleItems.length)}`}>
      {visibleItems.map((item,index)=>{const Icon=routeIcons[item.href]||ChevronRight;const active=item.href===activeHref;const[accent,accent2,soft]=routeAccents[item.href]||["#3974f6","#17aaa5","#eef4ff"];const cardStyle={"--family-accent":accent,"--family-accent-2":accent2,"--family-soft":soft} as CSSProperties;return <Link key={item.href} href={item.href} aria-current={active?"page":undefined} data-workspace-module={item.href} data-active={active?"true":"false"} className="futurehr-family-card group relative overflow-hidden border" style={cardStyle}>
        <div className="futurehr-family-card-content flex items-center gap-3.5">
          <div className="futurehr-family-card-icon flex shrink-0 items-center justify-center"><Icon className="futurehr-family-icon-glyph" strokeWidth={1.8}/></div>
          <div className="min-w-0 flex-1">
            <div className="futurehr-family-card-meta flex min-w-0 items-center gap-2">
              <span className="futurehr-family-index tabular-nums">{String(index+1).padStart(2,"0")}</span>
              {active&&<span className="futurehr-family-current-inline inline-flex shrink-0 items-center gap-1"><CheckCircle2 className="h-3 w-3"/>Aktif</span>}
            </div>
            <h3 className="futurehr-family-title mt-1 truncate">{item.label}</h3>
            <p className="futurehr-family-description mt-1 line-clamp-2">{item.description}</p>
          </div>
          <span className="futurehr-family-arrow flex shrink-0 items-center justify-center" aria-hidden="true"><ChevronRight className="h-4 w-4"/></span>
        </div>
        <span className="futurehr-family-card-sheen" aria-hidden="true" />
      </Link>;})}
    </div>
  </section>;
}
