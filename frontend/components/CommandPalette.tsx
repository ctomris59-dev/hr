"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { BarChart3, Building2, DollarSign, LayoutDashboard, Moon, Plane, Search, Settings2, Sun, Target, UserPlus, Users } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { useTheme } from "next-themes";
import { useAuth } from "../context/AuthContext";
import { canAccessRoute } from "../lib/hr/accessControl";

const pageLinks = [
  { label:"Yönetici Özeti",href:"/dashboard",icon:LayoutDashboard },
  { label:"Çalışanlar & Organizasyon",href:"/organizasyon",icon:Building2 },
  { label:"Performans & Yetkinlik",href:"/degerlendirme",icon:Target },
  { label:"Gelişim Etkinliği",href:"/gelisim-analitigi",icon:BarChart3 },
  { label:"Ücret Karar Merkezi",href:"/maas",icon:DollarSign },
  { label:"İzin Yönetimi",href:"/izinler",icon:Plane },
  { label:"Ekip",href:"/ekip-yonetimi",icon:Users },
  { label:"FutureHR Kurulum",href:"/kurulum",icon:Settings2 },
  { label:"İşe Alım",href:"/ise-alim",icon:UserPlus },
];

export default function CommandPalette(){
  const router=useRouter();const{setTheme}=useTheme();const{currentUserRole}=useAuth();const[open,setOpen]=useState(false);const[query,setQuery]=useState("");const[people,setPeople]=useState<string[]>([]);
  const refreshPeople=()=>{const stored=getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]);setPeople(Array.from(new Set(stored.map(p=>String(p["Ad Soyad"]||"")).filter(Boolean))).sort());};
  useEffect(()=>{refreshPeople();const refresh=()=>refreshPeople();window.addEventListener("dataUpdated",refresh);return()=>window.removeEventListener("dataUpdated",refresh);},[]);
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setOpen(v=>!v);}if(event.key==="Escape")setOpen(false);};document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey);},[]);
  useEffect(()=>{if(!open)setQuery("");},[open]);
  const visiblePages=useMemo(()=>pageLinks.filter(page=>canAccessRoute(currentUserRole,page.href)),[currentUserRole]);
  const canSearchPeople=canAccessRoute(currentUserRole,"/organizasyon");
  const filteredPeople=useMemo(()=>{if(!canSearchPeople)return[];const term=query.trim().toLocaleLowerCase("tr-TR");if(!term)return[];return people.filter(name=>name.toLocaleLowerCase("tr-TR").includes(term)).slice(0,8);},[people,query,canSearchPeople]);
  if(!open)return null;
  const go=(href:string)=>{setOpen(false);router.push(href);};
  return <div className="fixed inset-0 z-[60]"><button aria-label="Komut paletini kapat" className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={()=>setOpen(false)}/><div className="absolute left-1/2 top-[10vh] w-full max-w-2xl -translate-x-1/2 px-3 sm:px-4"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.2)] dark:border-slate-700 dark:bg-slate-900"><Command shouldFilter={false} className="w-full"><div className="flex items-center gap-2 border-b border-slate-200/70 px-4 py-3 text-sm text-slate-500 dark:border-slate-700"><Search className="h-4 w-4"/><Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Yetkiniz dahilindeki sayfa veya personeli ara..." className="flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"/><kbd className="rounded border border-slate-200 px-2 py-0.5 text-[10px] dark:border-slate-700">ESC</kbd></div><Command.List className="max-h-[65vh] overflow-y-auto p-3"><Command.Empty className="py-6 text-center text-sm text-slate-500">Yetkiniz dahilinde sonuç bulunamadı.</Command.Empty><Command.Group heading="Sayfalar" className="text-xs text-slate-500">{visiblePages.map(page=>{const Icon=page.icon;return <Command.Item key={page.href} onSelect={()=>go(page.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"><Icon className="h-4 w-4 text-slate-500"/>{page.label}</Command.Item>;})}</Command.Group><Command.Group heading="Hızlı Aksiyonlar" className="mt-3 text-xs text-slate-500">{canAccessRoute(currentUserRole,"/ekip-yonetimi")&&<Command.Item onSelect={()=>{sessionStorage.setItem("openAddEmployeeModal","true");go("/ekip-yonetimi");}} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"><UserPlus className="h-4 w-4 text-slate-500"/>Yeni Personel Ekle</Command.Item>}<Command.Item onSelect={()=>go("/izinler")} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"><Plane className="h-4 w-4 text-slate-500"/>İzin ekranını aç</Command.Item></Command.Group>{filteredPeople.length>0&&<Command.Group heading="Personel" className="mt-3 text-xs text-slate-500">{filteredPeople.map(name=><Command.Item key={name} onSelect={()=>{sessionStorage.setItem("orgSearch",name);go("/organizasyon");}} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"><Users className="h-4 w-4 text-slate-400"/>{name}</Command.Item>)}</Command.Group>}<Command.Group heading="Tema" className="mt-3 text-xs text-slate-500"><Command.Item onSelect={()=>{setTheme("light");setOpen(false);}} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"><Sun className="h-4 w-4 text-amber-500"/>Açık Mod</Command.Item><Command.Item onSelect={()=>{setTheme("dark");setOpen(false);}} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"><Moon className="h-4 w-4"/>Koyu Mod</Command.Item></Command.Group></Command.List></Command></div></div></div>;
}
