"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, LayoutDashboard, Menu, UsersRound, WalletCards } from "lucide-react";
import { canAccessRoute } from "@/lib/hr/accessControl";
import type { UserRole } from "@/app/data/roles";

export default function MobileManagerDock({ role, onMenu }:{role:UserRole|null|undefined;onMenu:()=>void}){
  const pathname=usePathname();
  const candidates=[
    {href:"/dashboard",label:"Özet",icon:LayoutDashboard},
    {href:"/karar-merkezi",label:"Karar",icon:BrainCircuit},
    {href:"/ekip-yonetimi",label:"Ekip",icon:UsersRound},
    {href:"/maas",label:"Ücret",icon:WalletCards},
  ].filter(item=>canAccessRoute(role,item.href)).slice(0,4);
  return <nav aria-label="Mobil hızlı menü" className="fixed inset-x-2 bottom-2 z-50 grid min-h-14 grid-cols-5 items-center rounded-2xl border border-white/10 bg-[#0d1925]/95 px-1.5 shadow-[0_20px_55px_rgba(2,8,23,.4)] backdrop-blur-xl lg:hidden">
    {candidates.map(item=>{const Icon=item.icon;const active=pathname===item.href||pathname.startsWith(`${item.href}/`);return <Link key={item.href} href={item.href} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-semibold ${active?"bg-white/10 text-teal-300":"text-slate-400"}`}><Icon className="h-4 w-4"/><span>{item.label}</span></Link>})}
    <button type="button" onClick={onMenu} className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-semibold text-slate-400"><Menu className="h-4 w-4"/><span>Menü</span></button>
  </nav>
}
