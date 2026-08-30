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
  return <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,.055)] dark:border-slate-800 dark:bg-slate-900" aria-label={`${family.label} modülleri`}>
    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 px-4 py-3.5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 sm:px-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-indigo-500">{family.label} çalışma alanı</p><h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">Bu alanın modülleri</h2></div>
        <p className="max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">{family.description}</p>
      </div>
    </div>
    <div className={`grid gap-3 p-3 sm:p-4 ${visibleItems.length===2?"md:grid-cols-2":visibleItems.length===3?"md:grid-cols-3":"md:grid-cols-2 xl:grid-cols-3"}`}>
      {visibleItems.map((item,index)=>{const Icon=routeIcons[item.href]||ChevronRight;const active=routeMatches(pathname,item.href);return <Link key={item.href} href={item.href} data-workspace-module={item.href} className={`group relative min-h-[112px] overflow-hidden rounded-xl border p-4 transition-all duration-200 ${active?"border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-teal-50/70 shadow-[0_8px_22px_rgba(79,70,229,.10)] ring-1 ring-indigo-100 dark:border-indigo-700 dark:from-indigo-950/35 dark:via-slate-900 dark:to-teal-950/20 dark:ring-indigo-900":"border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_8px_22px_rgba(15,23,42,.07)] dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-indigo-800"}`}>
        {active&&<span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white"><CheckCircle2 className="h-3 w-3"/>Şu an</span>}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition-transform group-hover:scale-105 dark:bg-slate-100 dark:text-slate-900"><Icon className="h-5 w-5" strokeWidth={1.8}/></div>
        <div className="mt-3 pr-16"><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">{String(index+1).padStart(2,"0")}</span><h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.label}</h3></div><p className="mt-1.5 text-[11px] leading-[1.15rem] text-slate-500 dark:text-slate-400">{item.description}</p></div>
        <span className={`absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg transition-all ${active?"bg-indigo-600 text-white":"bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:group-hover:bg-indigo-950"}`}><ChevronRight className="h-4 w-4"/></span>
      </Link>;})}
    </div>
  </section>;
}
