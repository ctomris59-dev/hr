"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BrainCircuit, LayoutDashboard, LogOut, Menu, X, Building2, Search as SearchIcon, Heart, Target, BriefcaseBusiness, GraduationCap, WalletCards, UserPlus, Settings2, UsersRound } from "lucide-react";
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
import FutureHRCopilotV2 from "./FutureHRCopilotV2";
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

const familyMenuLabels:Partial<Record<NavigationFamilyId,string>>={
  experience:"Çalışan Deneyimi",
  employeeOps:"Ekip İşlemleri",
};

export default function ClientLayout({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const normalizedPathname=decodeURIComponent(pathname||"/");
  const[user,setUser]=useState<any>(null);
  const[sidebarOpen,setSidebarOpen]=useState(false);
  const[policyRevision,setPolicyRevision]=useState(0);
  const router=useRouter();
  const{currentUserRole}=useAuth();

  useEffect(()=>{
    const loadUser=()=>setUser(getStorageData(STORAGE_KEYS.CURRENT_USER,null)||null);
    const storage=(e:StorageEvent)=>{if(!e.key||e.key===STORAGE_KEYS.CURRENT_USER)loadUser();};
    const refresh=()=>loadUser();
    const refreshPolicy=()=>setPolicyRevision(v=>v+1);
    loadUser();
    window.addEventListener("storage",storage);
    window.addEventListener("storageCleared",refresh);
    window.addEventListener("userChanged",refresh);
    window.addEventListener("accessPolicyUpdated",refreshPolicy);
    return()=>{
      window.removeEventListener("storage",storage);
      window.removeEventListener("storageCleared",refresh);
      window.removeEventListener("userChanged",refresh);
      window.removeEventListener("accessPolicyUpdated",refreshPolicy);
    };
  },[]);

  useEffect(()=>{
    if(!sidebarOpen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setSidebarOpen(false);};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[sidebarOpen]);

  useEffect(()=>{setSidebarOpen(false);},[normalizedPathname]);

  const handleLogout=async()=>{
    if(typeof window==="undefined")return;
    const secure=user?.authMode==="secure";
    if(secure)await fetch("/api/secure-auth/logout",{method:"POST"}).catch(()=>null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    window.dispatchEvent(new CustomEvent("userChanged"));
    router.push(secure?"/sistem-girisi":"/");
    router.refresh();
  };

  const menuItems=useMemo(()=>{
    const items:Array<{key:string;href:string;label:string;section:string;icon:typeof LayoutDashboard;routes:string[]}>=[];
    if(canAccessRoute(currentUserRole,"/dashboard"))items.push({key:"dashboard",href:"/dashboard",label:"Yönetici Özeti",section:"Karar Merkezi",icon:LayoutDashboard,routes:["/dashboard"]});
    if(canAccessRoute(currentUserRole,"/karar-merkezi"))items.push({key:"decision",href:"/karar-merkezi",label:"Karar Motoru",section:"Karar Merkezi",icon:BrainCircuit,routes:["/karar-merkezi"]});
    NAVIGATION_FAMILIES.forEach((family)=>{
      const accessible=family.items.filter(item=>canAccessRoute(currentUserRole,item.href));
      if(accessible.length===0)return;
      const destination=accessible[0].href;
      let label=familyMenuLabels[family.id]||family.label;
      if(accessible.length===1&&family.id==="talentCareer"&&destination==="/kariyer")label=currentUserRole==="employee"?"Kariyerim":"Kariyer";
      if(accessible.length===1&&family.id==="compensation"&&destination==="/yonetici/maas-talep")label="Ücret Önerileri";
      if(accessible.length===1&&family.id==="organization"&&destination==="/rol-mimarisi")label="Rol & Yetkinlik";
      if(accessible.length===1&&family.id==="employeeOps"&&destination==="/izinler")label="İzinler";
      items.push({key:family.id,href:destination,label,section:family.section,icon:familyIcons[family.id],routes:family.items.map(item=>item.href)});
    });
    return items;
  },[currentUserRole,policyRevision]);

  const activeMenuKey=[...menuItems]
    .filter(item=>item.routes.some(route=>routeMatches(normalizedPathname,route)))
    .sort((a,b)=>Math.max(...b.routes.map(route=>route.length))-Math.max(...a.routes.map(route=>route.length)))[0]?.key;

  const userInitials=(user?.name||"FH").split(" ").filter(Boolean).slice(0,2).map((part:string)=>part[0]?.toUpperCase()).join("");
  const userRole=user?.position||user?.role||"Kullanıcı";
  const userDepartment=user?.dept||user?.department||"";

  return <div data-testid="app-shell" className="flex h-screen overflow-hidden bg-[#f6f6f3] dark:bg-[#0f151b]">
    <AIGovernanceCapture/>
    <DemoDataHardeningBridge/>

    <button type="button" onClick={()=>setSidebarOpen(value=>!value)} className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label={sidebarOpen?"Menüyü kapat":"Menüyü aç"} aria-expanded={sidebarOpen} aria-controls="futurehr-sidebar">
      {sidebarOpen?<X size={18} aria-hidden="true"/>:<Menu size={18} aria-hidden="true"/>}
    </button>

    <aside id="futurehr-sidebar" data-testid="app-sidebar" data-tour="sidebar" className={`${sidebarOpen?"translate-x-0":"-translate-x-full"} fixed inset-y-0 left-0 z-40 w-[280px] flex-shrink-0 border-r border-white/[0.07] bg-[#0b1521] text-slate-300 shadow-[8px_0_30px_rgba(15,23,42,0.05)] transition-transform duration-200 ease-out lg:static lg:translate-x-0`}>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <div className="flex h-[84px] flex-shrink-0 items-center border-b border-white/[0.07] px-5">
          <div className="min-w-0">
            <Image src="/futurehr-brand-dark.svg" alt="FutureHR" width={220} height={56} className="h-[38px] w-auto object-contain object-left" priority/>
            <p className="mt-0.5 pl-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">People Intelligence Platform</p>
          </div>
        </div>

        <nav className="futurehr-sidebar-nav min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5" aria-label="Ana menü">
          {menuItems.map((item,index)=>{
            const Icon=item.icon;
            const isActive=item.key===activeMenuKey;
            const showSection=index===0||menuItems[index-1]?.section!==item.section;
            return <div key={item.key}>
              {showSection&&<div className={`${index===0?"mt-0":"mt-2"} mb-0.5 flex items-center gap-2 px-2.5`}>
                <span className="text-[9.5px] font-semibold uppercase leading-4 tracking-[0.17em] text-slate-500">{item.section}</span>
                <span className="h-px flex-1 bg-white/[0.045]"/>
              </div>}
              <Link
                data-tour-route={item.href}
                href={item.href}
                onClick={()=>setSidebarOpen(false)}
                aria-current={isActive?"page":undefined}
                className={`group relative mb-0.5 flex h-9 items-center gap-3 overflow-hidden rounded-[10px] px-3 text-[13.5px] leading-5 outline-none transition-[background-color,color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-[#79aaa6]/45 ${isActive?"bg-[linear-gradient(90deg,rgba(72,115,112,0.24),rgba(255,255,255,0.075))] font-semibold text-white ring-1 ring-inset ring-white/[0.055]":"font-medium text-slate-300/90 hover:bg-white/[0.055] hover:text-white"}`}
              >
                {isActive&&<span className="absolute inset-y-[8px] left-0 w-[3px] rounded-r-full bg-[#79aaa6]"/>}
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] border transition-colors ${isActive?"border-[#79aaa6]/20 bg-[#79aaa6]/10 text-[#a7cbc8]":"border-transparent bg-transparent text-slate-500 group-hover:text-slate-300"}`}>
                  <Icon size={17.5} strokeWidth={1.65}/>
                </span>
                <span className="min-w-0 flex-1 truncate tracking-[-0.012em]">{item.label}</span>
                {isActive&&<span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#79aaa6] shadow-[0_0_0_3px_rgba(121,170,166,0.10)]"/>}
              </Link>
            </div>;
          })}
        </nav>

        <div className="futurehr-sidebar-footer flex-shrink-0 border-t border-white/[0.07] bg-[#09131e] p-3.5">
          {user&&<div className="mb-2 rounded-[11px] border border-white/[0.06] bg-white/[0.035] p-2.5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/[0.09] bg-[#172534] text-[11px] font-semibold text-slate-100">
                {userInitials}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#09131e] bg-emerald-500"/>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold leading-4 text-slate-100">{user.name}</p>
                <p className="mt-0.5 truncate text-[10.5px] leading-4 text-slate-400">{userRole}</p>
              </div>
            </div>
            {userDepartment&&<div className="mt-2 border-t border-white/[0.055] pt-2 text-[9.5px] font-medium uppercase tracking-[0.08em] text-slate-600">{userDepartment}</div>}
          </div>}
          <button type="button" onClick={handleLogout} className="flex h-9 w-full items-center gap-3 rounded-[9px] px-3 text-[12px] font-medium text-slate-500 transition-colors hover:bg-red-500/[0.08] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/30">
            <LogOut size={15} strokeWidth={1.7}/><span>Çıkış yap</span>
          </button>
        </div>
      </div>
    </aside>

    {sidebarOpen&&<button type="button" className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[1px] lg:hidden" onClick={()=>setSidebarOpen(false)} aria-label="Menüyü kapat"/>}

    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header data-tour="topbar" className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#dfe3e1] bg-[#fbfbf8] px-4 sm:px-5 lg:px-6 dark:border-slate-800 dark:bg-[#141b22]">
        <WelcomeWidget/>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <FutureHRCopilotV2 pathname={normalizedPathname}/><DemoPresentationMode/><GuidedOnboarding/><DemoRoleSwitcher/>
          <button type="button" onClick={()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true}))} aria-label="Komut paletini aç, Ctrl K" title="Komut paletini aç (Ctrl+K)" className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-transparent px-3 text-xs font-medium text-slate-500 hover:bg-slate-100/70 xl:flex dark:border-slate-700 dark:text-slate-400"><SearchIcon className="h-3.5 w-3.5"/><span>Ctrl + K</span></button>
          <ThemeToggle/><NotificationBell/>
        </div>
      </header>
      <main data-tour="workspace" className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-7 lg:py-6"><ModuleWorkspace pathname={normalizedPathname}>{children}</ModuleWorkspace></main>
    </div>
    <CommandPalette/>
  </div>;
}
