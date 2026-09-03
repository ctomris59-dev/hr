"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Building2, GraduationCap, Heart, LayoutDashboard, Moon, Search, Settings2, Sun, Target, UserPlus, Users, UsersRound, WalletCards, type LucideIcon } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { useTheme } from "next-themes";
import { useAuth } from "../context/AuthContext";
import { canAccessRoute } from "../lib/hr/accessControl";
import { NAVIGATION_FAMILIES, type NavigationFamilyId } from "../lib/hr/navigationArchitecture";

const familyIcons:Record<NavigationFamilyId,LucideIcon>={organization:Building2,performance:Target,talentCareer:BriefcaseBusiness,development:GraduationCap,compensation:WalletCards,experience:Heart,recruitment:UserPlus,employeeOps:UsersRound,system:Settings2};

export default function CommandPalette(){
  const router=useRouter();const{setTheme}=useTheme();const{currentUserRole}=useAuth();const[open,setOpen]=useState(false);const[query,setQuery]=useState("");const[people,setPeople]=useState<string[]>([]);const[policyRevision,setPolicyRevision]=useState(0);
  const refreshPeople=()=>{const stored=getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]);setPeople(Array.from(new Set(stored.map(p=>String(p["Ad Soyad"]||"")).filter(Boolean))).sort());};
  useEffect(()=>{refreshPeople();const refresh=()=>refreshPeople();const policy=()=>setPolicyRevision(v=>v+1);window.addEventListener("dataUpdated",refresh);window.addEventListener("accessPolicyUpdated",policy);return()=>{window.removeEventListener("dataUpdated",refresh);window.removeEventListener("accessPolicyUpdated",policy);};},[]);
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setOpen(v=>!v);}if(event.key==="Escape")setOpen(false);};document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey);},[]);
  useEffect(()=>{if(!open)setQuery("");},[open]);
  const visiblePages=useMemo(()=>{
    const pages:Array<{label:string;description:string;href:string;icon:LucideIcon}>=[];
    if(canAccessRoute(currentUserRole,"/dashboard"))pages.push({label:"Ana Sayfa",description:"Bekleyen işler ve hızlı işlemler",href:"/dashboard",icon:LayoutDashboard});
    NAVIGATION_FAMILIES.forEach(family=>{
      const Icon=familyIcons[family.id];
      family.items.forEach(item=>{
        if(!canAccessRoute(currentUserRole,item.href))return;
        pages.push({label:item.label,description:item.description,href:item.href,icon:Icon});
      });
    });
    return Array.from(new Map(pages.map(page=>[page.href,page])).values());
  },[currentUserRole,policyRevision]);
  const normalizedQuery=query.trim().toLocaleLowerCase("tr-TR");
  const filteredPages=useMemo(()=>{if(!normalizedQuery)return visiblePages;return visiblePages.filter(page=>`${page.label} ${page.description}`.toLocaleLowerCase("tr-TR").includes(normalizedQuery));},[visiblePages,normalizedQuery]);
  const canSearchPeople=canAccessRoute(currentUserRole,"/organizasyon");
  const filteredPeople=useMemo(()=>{if(!canSearchPeople||!normalizedQuery)return[];return people.filter(name=>name.toLocaleLowerCase("tr-TR").includes(normalizedQuery)).slice(0,8);},[people,normalizedQuery,canSearchPeople]);
  if(!open)return null;
  const go=(href:string)=>{setOpen(false);router.push(href);};
  return <div className="fixed inset-0 z-[2147482500]"><button aria-label="Aramayı kapat" className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={()=>setOpen(false)}/><div className="absolute left-1/2 top-[10vh] w-full max-w-2xl -translate-x-1/2 px-3 sm:px-4"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.2)] dark:border-slate-700 dark:bg-slate-900"><Command shouldFilter={false} className="w-full"><div className="flex items-center gap-2 border-b border-slate-200/70 px-4 py-3 text-sm text-slate-500 dark:border-slate-700"><Search className="h-4 w-4"/><Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Ne yapmak istiyorsunuz? Örn. izin, çalışan, performans..." className="flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"/><kbd className="rounded border border-slate-200 px-2 py-0.5 text-[10px] dark:border-slate-700">ESC</kbd></div><Command.List className="max-h-[65vh] overflow-y-auto p-3"><Command.Empty className="py-6 text-center text-sm text-slate-500">Aradığınız işlemi bulamadık. Farklı bir kelime deneyin.</Command.Empty>{filteredPages.length>0&&<Command.Group heading="Sayfalar ve işlemler" className="text-xs text-slate-500">{filteredPages.map(page=>{const Icon=page.icon;return <Command.Item key={page.href} onSelect={()=>go(page.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"><Icon className="h-4 w-4 shrink-0 text-slate-500"/><span className="min-w-0 flex-1"><strong className="block font-medium">{page.label}</strong><small className="mt-0.5 block truncate text-[10px] text-slate-400">{page.description}</small></span></Command.Item>;})}</Command.Group>}<Command.Group heading="Hızlı işlemler" className="mt-3 text-xs text-slate-500">{canAccessRoute(currentUserRole,"/organizasyon")&&<Command.Item onSelect={()=>{sessionStorage.setItem("openAddEmployeeModal","true");go("/organizasyon");}} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"><UserPlus className="h-4 w-4 text-slate-500"/>Yeni çalışan ekle</Command.Item>} {canAccessRoute(currentUserRole,"/izinler")&&<Command.Item onSelect={()=>go("/izinler")} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"><Users className="h-4 w-4 text-slate-500"/>İzin işlemlerini aç</Command.Item>}</Command.Group>{filteredPeople.length>0&&<Command.Group heading="Çalışanlar" className="mt-3 text-xs text-slate-500">{filteredPeople.map(name=><Command.Item key={name} onSelect={()=>{sessionStorage.setItem("orgSearch",name);go("/organizasyon");}} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"><Users className="h-4 w-4 text-slate-400"/>{name}</Command.Item>)}</Command.Group>}<Command.Group heading="Görünüm" className="mt-3 text-xs text-slate-500"><Command.Item onSelect={()=>{setTheme("light");setOpen(false);}} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"><Sun className="h-4 w-4 text-amber-500"/>Açık tema</Command.Item><Command.Item onSelect={()=>{setTheme("dark");setOpen(false);}} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"><Moon className="h-4 w-4"/>Koyu tema</Command.Item></Command.Group></Command.List></Command></div></div></div>;
}
