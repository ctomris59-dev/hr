"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useNotifications, type NotificationType } from "../context/NotificationContext";

function relative(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (mins < 1) return "Az önce"; if (mins < 60) return `${mins} dk önce`; if (hours < 24) return `${hours} saat önce`; if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
function Icon({ type }: { type: NotificationType }) {
  if (type === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-500"/>;
  if (type === "error") return <XCircle className="h-4 w-4 text-red-500"/>;
  if (type === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500"/>;
  return <Info className="h-4 w-4 text-blue-500"/>;
}

export default function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{top:number;left:number}|null>(null);

  const position = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 16);
    setStyle({ top: rect.bottom + 8, left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)) });
  };
  useEffect(() => {
    if (!open) return;
    position();
    const close = (event: MouseEvent) => { const node = event.target as Node; if (!buttonRef.current?.contains(node) && !panelRef.current?.contains(node)) setOpen(false); };
    const update = () => position();
    document.addEventListener("mousedown", close); window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, notifications.length]);

  const activate = (item: any) => {
    if (!item.read) markAsRead(item.id);
    if (item.link) { setOpen(false); router.push(item.link); }
  };

  return <div className="relative">
    <button ref={buttonRef} onClick={() => setOpen((value) => !value)} aria-label="Bildirimler" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Bell className="h-4 w-4"/>{unreadCount>0&&<span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{unreadCount>9?"9+":unreadCount}</span>}</button>
    {open && createPortal(<div ref={panelRef} style={style||undefined} className="fixed z-[9999] w-[min(360px,calc(100vw-16px))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,.18)] dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800"><div><h3 className="text-sm font-semibold">Bildirimler</h3><p className="mt-0.5 text-[10px] text-slate-400">Gerçek FutureHR iş olaylarından üretilir.</p></div><div className="flex items-center gap-2">{notifications.length>0&&<button onClick={clearAll} className="text-[10px] font-semibold text-slate-500 hover:text-slate-800">Tümünü okundu say</button>}<button onClick={()=>setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4"/></button></div></div>
      <div className="max-h-[420px] overflow-y-auto">{notifications.length===0?<div className="px-4 py-8 text-center"><Bell className="mx-auto h-8 w-8 text-slate-200"/><p className="mt-2 text-xs text-slate-400">Şu anda aksiyon bekleyen bildirim yok.</p></div>:<div className="divide-y divide-slate-100 dark:divide-slate-800">{notifications.map((item)=><button key={item.id} type="button" onClick={()=>activate(item)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!item.read?"bg-indigo-50/40 dark:bg-indigo-950/10":""}`}><span className="mt-0.5"><Icon type={item.type}/></span><span className="min-w-0 flex-1"><span className={`block text-xs leading-5 ${!item.read?"font-semibold text-slate-900 dark:text-white":"text-slate-600 dark:text-slate-300"}`}>{item.message}</span><span className="mt-1 flex items-center gap-2 text-[9px] text-slate-400"><span>{relative(item.timestamp)}</span>{item.source&&<span>· {item.source}</span>}{item.link&&<span className="font-semibold text-indigo-500">Aç →</span>}</span></span>{!item.read&&<span className="mt-2 h-2 w-2 rounded-full bg-indigo-500"/>}</button>)}</div>}</div>
    </div>, document.body)}
  </div>;
}
