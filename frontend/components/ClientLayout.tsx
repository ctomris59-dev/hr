"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, LogOut, Menu, X, Building2, Search as SearchIcon, Heart, Target, BriefcaseBusiness, GraduationCap, WalletCards, UserPlus, Settings2, UsersRound } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { useAuth } from "../context/AuthContext";
import { canAccessRoute } from "../lib/hr/accessControl";
import { NAVIGATION_FAMILIES, routeMatches, type NavigationFamilyId } from "../lib/hr/navigationArchitecture";
import WelcomeWidget from "./WelcomeWidget";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import CommandPalette from "./CommandPalette";
import DemoRoleSwitcher from "./DemoRoleSwitcher";
import DemoPresentationMode from "./DemoPresentationMode";
import DemoDataHardeningBridge from "./DemoDataHardeningBridge";
import ModuleWorkspace from "./ModuleWorkspace";
import GuidedOnboarding from "./GuidedOnboarding";
import FutureHRCopilot from "./FutureHRCopilot";
import AIGovernanceCapture from "./AIGovernanceCapture";

const familyIcons:Record<NavigationFamilyId,typeof Building2>={
  organization:Building2,
  performance:Target,
  talentCareer:BriefcaseBusiness,
  development:GraduationCap,
  compensation:WalletCards,
  experience:Heart,
  recruitment:UserPlus,
  employeeOps:UsersRound,
  system:Settings2,
};

export default function ClientLayout({children}:{children:React.ReactNode}){
  const pathname=usePathname();const normalizedPathname=decodeURIComponent(pathname||"/");const[user,setUser]=useState<any>(null);const[sidebarOpen,setSidebarOpen]=useState(false);const[policyRevision,setPolicyRevision]=useState(0);const router=useRouter();const{currentUserRole}=useAuth();
  useEffect(()=>{const loadUser=()=>setUser(getStorageData(STORAGE_KEYS.CURRENT_USER,null)||null);const storage=(e:StorageEvent)=>{if(!e.key||e.key===STORAGE_KEYS.CURRENT_USER)loadUser();};const refresh=()=>loadUser();const refreshPolicy=()=>setPolicyRevision(v=>v+1);loadUser();window.addEventListener("storage",storage);window.addEventListener("storageCleared",refresh);window.addEventListener("userChanged",refresh);window.addEventListener("accessPolicyUpdated",refreshPolicy);return()=>{window.removeEventListener("storage",storage);window.removeEventListener("storageCleared",refresh);window.removeEventListener("userChanged",refresh);window.removeEventListener("accessPolicyUpdated",refreshPolicy);};},[]);
  const handleLogout=async()=>{if(typeof window==="undefined")return;const secure=user?.authMode==="secure";if(secure)await fetch("/api/secure-auth/logout",{method:"POST"}).catch(()=>null);localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);window.dispatchEvent(new CustomEvent("userChanged"));router.push(secure?"/sistem-girisi":"/");router.refresh();};
  const menuItems=useMemo(()=>{
    const items:Array<{key:string;href:string;label:string;section:string;icon:typeof LayoutDashboard;routes:string[]}>=[];
    if(canAccessRoute(currentUserRole,"/dashboard"))items.push({key:"dashboard",href:"/dashboard",label:"Yönetici Özeti",section:"Karar Merkezi",icon:LayoutDashboard,routes:["/dashboard"]});
    NAVIGATION_FAMILIES.forEach((family)=>{
      const accessible=family.items.filter(item=>canAccessRoute(currentUserRole,item.href));
      if(accessible.length===0)return;
      const destination=accessible[0].href;
      let label=family.label;
      if(accessible.length===1&&family.id==="talentCareer"&&destination==="/kariyer")label=currentUserRole==="employee"?"Kariyerim":"Kariyer";
      if(accessible.length===1&&family.id==="compensation"&&destination==="/yonetici/maas-talep")label="Ücret Önerileri";
      if(accessible.length===1&&family.id==="organization"&&destination==="/rol-mimarisi")label="Rol & Yetkinlik";
      if(accessible.length===1&&family.id==="employeeOps"&&destination==="/izinler")label="İzinler";
      items.push({key:family.id,href:destination,label,section:family.section,icon:familyIcons[family.id],routes:family.items.map(item=>item.href)});
    });
    return items;
  },[currentUserRole,policyRevision]);
  const activeMenuKey=[...menuItems].filter(item=>item.routes.some(route=>routeMatches(normalizedPathname,route))).sort((a,b)=>Math.max(...b.routes.map(route=>route.length))-Math.max(...a.routes.map(route=>route.length)))[0]?.key;
  const userInitials=(user?.name||"FH").split(" ").filter(Boolean).slice(0,2).map((part:string)=>part[0]?.toUpperCase()).join("");
  return <div data-testid="app-shell" className="flex h-screen overflow-hidden bg-[#f4f6f9] dark:bg-slate-950"><AIGovernanceCapture/><DemoDataHardeningBridge/><button onClick={()=>setSidebarOpen(!sidebarOpen)} className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Menüyü aç/kapat">{sidebarOpen?<X size={18}/>:<Menu size={18}/>}</button>
    <aside data-testid="app-sidebar" data-tour="sidebar" className={`${sidebarOpen?"translate-x-0":"-translate-x-full"} fixed inset-y-0 left-0 z-40 w-[248px] flex-shrink-0 border-r border-slate-800 bg-[#101722] text-slate-300 transition-transform duration-200 ease-out lg:static lg:translate-x-0`}><div className="flex h-[100dvh] flex-col overflow-hidden"><div className="futurehr-sidebar-brand flex h-16 flex-shrink-0 items-center border-b border-white/[0.07] px-5"><Image src="/futurehr-brand-dark.svg" alt="FutureHR" width={220} height={56} className="h-10 w-auto object-contain" priority/></div><nav className="futurehr-sidebar-nav min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5">{menuItems.map((item,index)=>{const Icon=item.icon;const isActive=item.key===activeMenuKey;const showSection=index===0||menuItems[index-1]?.section!==item.section;return <div key={item.key}>{showSection&&<div className={`${index===0?"mt-0":"mt-4"} futurehr-sidebar-section mb-1.5 px-2.5 text-[9px] font-semibold uppercase leading-3 tracking-[0.13em] text-slate-600`}>{item.section}</div>}<Link data-tour-route={item.href} href={item.href} onClick={()=>setSidebarOpen(false)} className={`futurehr-sidebar-item group relative mb-1 flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all ${isActive?"bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.035)]":"text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"}`}>{isActive&&<span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-gradient-to-b from-indigo-400 to-teal-400"/>}<Icon size={15} strokeWidth={1.8} className={isActive?"text-indigo-300":"text-slate-500 transition-colors group-hover:text-slate-300"}/><span className="truncate">{item.label}</span></Link></div>;})}</nav><div className="futurehr-sidebar-footer flex-shrink-0 border-t border-white/[0.07] p-2.5">{user&&<div className="futurehr-sidebar-user mb-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-teal-500/15 text-[10px] font-semibold text-slate-200 ring-1 ring-white/[0.08]">{userInitials}</div><div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-semibold text-slate-200">{user.name}</p><p className="futurehr-sidebar-user-role truncate text-[9.5px] text-slate-500">{user.position||user.role}</p></div></div>}<button onClick={handleLogout} className="futurehr-sidebar-logout flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[11px] font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-300"><LogOut size={14}/><span>Çıkış Yap</span></button></div></div></aside>
    {sidebarOpen&&<div className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[1px] lg:hidden" onClick={()=>setSidebarOpen(false)}/>}<div className="flex min-w-0 flex-1 flex-col overflow-hidden"><header data-tour="topbar" className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-4 sm:px-5 lg:px-6 dark:border-slate-800 dark:bg-slate-900"><WelcomeWidget/><div className="flex min-w-0 items-center gap-1.5 sm:gap-2"><FutureHRCopilot pathname={normalizedPathname}/><DemoPresentationMode/><GuidedOnboarding/><DemoRoleSwitcher/><button type="button" onClick={()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true}))} className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 hover:bg-slate-50 xl:flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"><SearchIcon className="h-3.5 w-3.5"/><span>Ctrl + K</span></button><ThemeToggle/><NotificationBell/></div></header><main data-tour="workspace" className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-6 lg:py-5"><ModuleWorkspace pathname={normalizedPathname}>{children}</ModuleWorkspace></main></div><CommandPalette/>
  </div>;
}
