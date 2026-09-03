"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BrainCircuit, ChevronRight, LayoutDashboard, LogOut, Menu, X, Building2, Search as SearchIcon, Heart, Target, BriefcaseBusiness, GraduationCap, WalletCards, UserPlus, Settings2, UsersRound, Sparkles, CircleUserRound, Crown, ShieldCheck, Clock3, CircleCheckBig } from "lucide-react";
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
import FutureHRIntelligenceAgent from "./FutureHRIntelligenceAgent";
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

const familyTone:Partial<Record<NavigationFamilyId,string>>={
  organization:"blue",
  performance:"violet",
  talentCareer:"teal",
  development:"teal",
  compensation:"emerald",
  experience:"rose",
  recruitment:"purple",
  employeeOps:"sky",
  system:"slate",
};

function formatLastLogin(value?:string){
  if(!value)return "Bu oturum";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "Bu oturum";
  const now=new Date();
  const time=date.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
  if(date.toDateString()===now.toDateString())return `Bugün, ${time}`;
  const yesterday=new Date(now);yesterday.setDate(now.getDate()-1);
  if(date.toDateString()===yesterday.toDateString())return `Dün, ${time}`;
  return date.toLocaleDateString("tr-TR",{day:"2-digit",month:"short"});
}

export default function ClientLayout({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const normalizedPathname=decodeURIComponent(pathname||"/");
  const[user,setUser]=useState<any>(null);
  const[profileOpenActions,setProfileOpenActions]=useState(0);
  const[sidebarOpen,setSidebarOpen]=useState(false);
  const[expandedMenuKey,setExpandedMenuKey]=useState<string|null>(null);
  const[policyRevision,setPolicyRevision]=useState(0);
  const router=useRouter();
  const{currentUserRole}=useAuth();

  useEffect(()=>{
    const loadUser=()=>{
      const nextUser=getStorageData(STORAGE_KEYS.CURRENT_USER,null)||null;
      setUser(nextUser);
      const notifications=getStorageData<any[]>(STORAGE_KEYS.NOTIFICATIONS,[]);
      const actionDrafts=getStorageData<any[]>(STORAGE_KEYS.AI_ACTION_DRAFTS,[]);
      const role=String(nextUser?.role||"").toUpperCase();
      const notificationCount=notifications.filter((item:any)=>{
        if(item?.read===true)return false;
        const target=String(item?.targetRole||"").toUpperCase();
        return !target||target==="ALL"||!role||target===role;
      }).length;
      const draftCount=actionDrafts.filter((item:any)=>!(["done","completed","dismissed","closed","cancelled"].includes(String(item?.status||"").toLowerCase()))).length;
      setProfileOpenActions(notificationCount+draftCount);
    };
    const storage=(e:StorageEvent)=>{if(!e.key||e.key.startsWith("hr_"))loadUser();};
    const refresh=()=>loadUser();
    const refreshPolicy=()=>setPolicyRevision(v=>v+1);
    loadUser();
    window.addEventListener("storage",storage);
    window.addEventListener("storageCleared",refresh);
    window.addEventListener("userChanged",refresh);
    window.addEventListener("dataUpdated",refresh);
    window.addEventListener("accessPolicyUpdated",refreshPolicy);
    return()=>{
      window.removeEventListener("storage",storage);
      window.removeEventListener("storageCleared",refresh);
      window.removeEventListener("userChanged",refresh);
      window.removeEventListener("dataUpdated",refresh);
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
    const items:Array<{key:string;href:string;label:string;section:string;icon:typeof LayoutDashboard;routes:string[];familyId?:NavigationFamilyId}>=[];
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
      items.push({key:family.id,href:destination,label,section:family.section,icon:familyIcons[family.id],routes:family.items.map(item=>item.href),familyId:family.id});
    });
    return items;
  },[currentUserRole,policyRevision]);

  const activeMenuKey=[...menuItems]
    .filter(item=>item.routes.some(route=>routeMatches(normalizedPathname,route)))
    .sort((a,b)=>Math.max(...b.routes.map(route=>route.length))-Math.max(...a.routes.map(route=>route.length)))[0]?.key;

  useEffect(()=>{
    if(activeMenuKey)setExpandedMenuKey(activeMenuKey);
  },[activeMenuKey]);

  const userInitials=(user?.name||"FH").split(" ").filter(Boolean).slice(0,2).map((part:string)=>part[0]?.toUpperCase()).join("");
  const userRole=user?.position||user?.role||"Kullanıcı";
  const userDepartment=user?.dept||user?.department||"";
  const normalizedUserRole=String(user?.role||currentUserRole||"").toUpperCase();
  const isExecutive=normalizedUserRole==="CEO"||/genel müdür|ceo/i.test(String(userRole));
  const isHR=["IK","HR","HR_ADMIN"].includes(normalizedUserRole);
  const isManager=isExecutive||isHR||["MANAGER","DIRECTOR"].includes(normalizedUserRole)||/müdür|direktör|manager|lider/i.test(String(userRole));
  const profileTone=isExecutive?"executive":isHR?"hr":isManager?"manager":"employee";
  const profileContextTitle=isExecutive?"Genel Yönetim":isHR?"İnsan & Organizasyon":userDepartment||"FutureHR Hesabı";
  const profileContextSubtitle=isExecutive?"Üst düzey yönetici hesabı":isHR?"İnsan ve organizasyon yönetimi":isManager?"Ekip ve karar sorumluluğu":"Kişisel çalışma alanı";
  const profileAccessLabel=isExecutive?"CEO":isHR?"İK":isManager?"Yönetici":"Çalışan";
  const lastLoginLabel=formatLastLogin(user?.lastLoginAt||user?.last_login_at||user?.lastLogin||user?.loginAt);

  return <div data-testid="app-shell" className="flex h-screen overflow-hidden bg-[#f6f6f3] dark:bg-[#0f151b]">
    <AIGovernanceCapture/>
    <DemoDataHardeningBridge/>

    <button type="button" onClick={()=>setSidebarOpen(value=>!value)} className="fixed left-3 top-3 z-[60] pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label={sidebarOpen?"Menüyü kapat":"Menüyü aç"} aria-expanded={sidebarOpen} aria-controls="futurehr-sidebar">
      {sidebarOpen?<X size={18} aria-hidden="true"/>:<Menu size={18} aria-hidden="true"/>}
    </button>

    <aside id="futurehr-sidebar" data-testid="app-sidebar" data-tour="sidebar" className={`${sidebarOpen?"translate-x-0 pointer-events-auto":"-translate-x-full pointer-events-none"} futurehr-premium-sidebar fixed inset-y-0 left-0 z-40 w-[286px] flex-shrink-0 border-r border-white/[0.07] text-slate-300 transition-transform duration-200 ease-out lg:pointer-events-auto lg:static lg:translate-x-0`}>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <div className="futurehr-sidebar-brand flex h-[88px] flex-shrink-0 items-center px-5">
          <div className="min-w-0">
            <Image src="/futurehr-brand-dark.svg" alt="FutureHR" width={220} height={56} className="h-[38px] w-auto object-contain object-left" priority/>
            <div className="mt-1 flex items-center gap-2 pl-0.5"><span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_0_4px_rgba(94,234,212,.07)]"/><p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-500">People Intelligence Platform</p></div>
          </div>
        </div>

        <nav className="futurehr-sidebar-nav min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Ana menü">
          {menuItems.map((item,index)=>{
            const Icon=item.icon;
            const isActive=item.key===activeMenuKey;
            const showSection=index===0||menuItems[index-1]?.section!==item.section;
            const family=item.familyId?NAVIGATION_FAMILIES.find(entry=>entry.id===item.familyId):undefined;
            const childItems=family?.items.filter(entry=>canAccessRoute(currentUserRole,entry.href))||[];
            const isExpandable=childItems.length>1;
            const isExpanded=isExpandable&&expandedMenuKey===item.key;
            const showChildren=isExpanded;
            const tone=item.familyId?familyTone[item.familyId]||"slate":item.key==="decision"?"ai":item.key==="dashboard"?"dashboard":"slate";
            const isDecision=item.key==="decision";
            const handlePrimaryClick=(event:React.MouseEvent<HTMLAnchorElement>)=>{
              if(isExpandable){
                event.preventDefault();
                setExpandedMenuKey(current=>current===item.key?null:item.key);
                return;
              }
              setSidebarOpen(false);
            };
            return <div key={item.key} className="futurehr-sidebar-group">
              {showSection&&<div className={`${index===0?"mt-0":"mt-4"} futurehr-sidebar-section mb-1.5 flex items-center gap-2 px-2.5`}>
                <span className="text-[9px] font-semibold uppercase leading-4 tracking-[0.18em] text-slate-500">{item.section}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/[0.09] to-transparent"/>
              </div>}
              <Link data-tour-route={item.href} href={item.href} onClick={handlePrimaryClick} aria-current={isActive?"page":undefined} aria-expanded={isExpandable?isExpanded:undefined} data-active={isActive?"true":"false"} data-expanded={isExpanded?"true":"false"} data-tone={tone} className={`futurehr-sidebar-primary group relative mb-1 flex min-h-[44px] items-center gap-3 overflow-hidden rounded-xl px-2.5 text-[13px] leading-5 outline-none transition-all duration-180 focus-visible:ring-2 focus-visible:ring-teal-300/35 ${isDecision?"futurehr-sidebar-ai":""}`}>
                <span className="futurehr-sidebar-accent"/>
                <span className="futurehr-sidebar-primary-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border"><Icon size={17} strokeWidth={1.65}/></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate font-semibold tracking-[-0.012em]">{item.label}</span>{isDecision&&<span className="futurehr-sidebar-ai-badge inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[.08em]"><Sparkles className="h-2.5 w-2.5"/>AI</span>}</span>
                  {isDecision&&<span className="mt-0.5 block truncate text-[9.5px] font-medium text-slate-500">Kanıt tabanlı karar desteği</span>}
                </span>
                <span className={`futurehr-sidebar-primary-arrow flex h-6 w-6 items-center justify-center rounded-lg transition-transform ${isExpanded?"rotate-90":""}`}><ChevronRight className="h-3.5 w-3.5"/></span>
              </Link>
              {showChildren&&<div className="futurehr-sidebar-children mb-2 ml-[18px] border-l border-white/[0.08] pl-[18px]">
                {childItems.map((child,childIndex)=>{
                  const childActive=routeMatches(normalizedPathname,child.href);
                  return <Link key={child.href} href={child.href} onClick={()=>setSidebarOpen(false)} aria-current={childActive?"page":undefined} className={`futurehr-sidebar-child group flex min-h-[34px] items-center gap-2 rounded-lg px-2.5 py-1.5 ${childActive?"is-active":""}`}>
                    <span className="w-[18px] text-[8.5px] font-bold tabular-nums text-slate-600">{String(childIndex+1).padStart(2,"0")}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{child.label}</span>
                    {childActive&&<span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_0_3px_rgba(94,234,212,.08)]"/>}
                  </Link>;
                })}
              </div>}
            </div>;
          })}
        </nav>

        <div className="futurehr-sidebar-footer flex-shrink-0 p-3">
          {user&&<div className="futurehr-profile-card futurehr-identity-zone mb-2.5 overflow-hidden rounded-[20px] border" data-profile-tone={profileTone}>
            <div className="futurehr-profile-main relative p-3.5">
              <div className="futurehr-profile-glow" aria-hidden="true"/>
              <div className="relative flex items-center gap-3">
                <div className="futurehr-profile-avatar relative flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center rounded-[15px] text-[13px] font-semibold tracking-[.04em] text-white">
                  {userInitials||<CircleUserRound className="h-5 w-5"/>}
                  <span className="futurehr-profile-presence absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[3px] border-[#0b1725] bg-emerald-400"/>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="truncate text-[13.5px] font-semibold leading-5 tracking-[-.018em] text-white">{user.name}</p><span className="futurehr-profile-status rounded-full px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-[.08em]">Aktif</span></div>
                  <p className="mt-0.5 truncate text-[10.5px] font-medium leading-4 text-slate-400">{userRole}</p>
                </div>
              </div>
            </div>
            <div className="futurehr-profile-context relative flex items-center gap-2.5 border-t border-white/[0.07] px-3.5 py-2.5">
              <span className="futurehr-profile-context-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[11px] border"><Crown className="h-4 w-4" strokeWidth={1.8}/></span>
              <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-bold uppercase tracking-[.12em]">{profileContextTitle}</p><p className="mt-0.5 truncate text-[9.5px] text-slate-500">{profileContextSubtitle}</p></div>
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" strokeWidth={1.7}/>
            </div>
            <div className="futurehr-profile-stats grid grid-cols-3 gap-1.5 border-t border-white/[0.055] p-2">
              <div className="futurehr-profile-stat rounded-xl px-2 py-2"><ShieldCheck className="h-3.5 w-3.5 text-sky-400" strokeWidth={1.8}/><span className="mt-1 block text-[7.5px] font-medium text-slate-600">Yetki</span><strong className="mt-0.5 block truncate text-[9.5px] font-semibold text-slate-200">{profileAccessLabel}</strong></div>
              <div className="futurehr-profile-stat rounded-xl px-2 py-2"><Clock3 className="h-3.5 w-3.5 text-indigo-400" strokeWidth={1.8}/><span className="mt-1 block text-[7.5px] font-medium text-slate-600">Son giriş</span><strong className="mt-0.5 block truncate text-[9px] font-semibold text-slate-200" title={lastLoginLabel}>{lastLoginLabel}</strong></div>
              <div className="futurehr-profile-stat rounded-xl px-2 py-2"><CircleCheckBig className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.8}/><span className="mt-1 block text-[7.5px] font-medium text-slate-600">Açık aksiyon</span><strong className="mt-0.5 block text-[9.5px] font-semibold text-slate-200">{profileOpenActions}</strong></div>
            </div>
            <div className="futurehr-profile-signature flex items-center justify-between border-t border-white/[0.055] px-3.5 py-2"><span className="text-[7.5px] font-semibold uppercase tracking-[.14em] text-slate-600">FutureHR çalışma kimliği</span><span className="flex items-center gap-1 text-[7.5px] font-semibold text-emerald-400/80"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Güvenli oturum</span></div>
          </div>}
          <button type="button" onClick={handleLogout} className="futurehr-sidebar-logout flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[11.5px] font-medium text-slate-500 transition-colors hover:bg-red-500/[0.08] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/30"><LogOut size={15} strokeWidth={1.7}/><span>Çıkış yap</span></button>
        </div>
      </div>
    </aside>

    {sidebarOpen&&<button type="button" className="fixed inset-0 z-30 pointer-events-auto bg-slate-950/45 backdrop-blur-[1px] lg:hidden" onClick={()=>setSidebarOpen(false)} aria-label="Menüyü kapat"/>}

    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header data-tour="topbar" className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#dfe3e1] bg-[#fbfbf8] px-4 sm:px-5 lg:px-6 dark:border-slate-800 dark:bg-[#141b22]">
        <WelcomeWidget/>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <FutureHRIntelligenceAgent pathname={normalizedPathname}/><DemoPresentationMode/><GuidedOnboarding/><DemoRoleSwitcher/>
          <button type="button" onClick={()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true}))} aria-label="Komut paletini aç, Ctrl K" title="Komut paletini aç (Ctrl+K)" className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-transparent px-3 text-xs font-medium text-slate-500 hover:bg-slate-100/70 xl:flex dark:border-slate-700 dark:text-slate-400"><SearchIcon className="h-3.5 w-3.5"/><span>Ctrl + K</span></button>
          <ThemeToggle/><NotificationBell/>
        </div>
      </header>
      <main data-tour="workspace" className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-7 lg:py-6"><ModuleWorkspace pathname={normalizedPathname}>{children}</ModuleWorkspace></main>
    </div>
    <CommandPalette/>
  </div>;
}
