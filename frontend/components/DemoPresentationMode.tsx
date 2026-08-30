"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Play, Presentation, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { applyFutureHRV1DemoData } from "@/lib/hr/demoV1";

const STEPS = [
  { role: "ceo" as const, route: "/dashboard", title: "1 · CEO: Karar sinyalini gör", detail: "Dashboard'da performans, halefiyet, kanıt ve gelişim etkisini tek yönetici özetinde gösterin." },
  { role: "ceo" as const, route: "/gelisim-analitigi", title: "2 · Gelişim yatırımının etkisini aç", detail: "Doğrulanmış işe transfer ve yeniden ölçüm sonuçlarını yetkinlik/yöntem bazında inceleyin." },
  { role: "hr_admin" as const, route: "/organizasyon", title: "3 · İK: Tek çalışan ana verisi", detail: "Organizasyon, rol ve yönetici ilişkilerinin tek veri zincirini beslediğini gösterin." },
  { role: "hr_admin" as const, route: "/degerlendirme", title: "4 · Performans & yetkinlik kanıtı", detail: "Eksik verinin ortalama kabul edilmediğini ve dönemsel ölçüm disiplinini gösterin." },
  { role: "manager" as const, route: "/egitim", title: "5 · Yönetici: Gelişim reçetesi ve kanıt", detail: "Yetkinlik gap'inden atanan müdahaleyi, işe transfer kanıtını ve yönetici doğrulamasını gösterin." },
  { role: "employee" as const, route: "/kariyer", title: "6 · Personel: Kariyer ve gelişim", detail: "Çalışanın hedef rolünü, veri kapsamını ve kendi gelişim aksiyonlarını self-service olarak gösterin." },
  { role: "ceo" as const, route: "/yedekleme", title: "7 · CEO: Halefiyet sürekliliği", detail: "Düşük kanıtla 'şimdi hazır' üretilmediğini ve kritik rol riskinin görünür olduğunu gösterin." },
  { role: "hr_admin" as const, route: "/maas", title: "8 · İK: Ücret karar döngüsü", detail: "Benchmark, performans kanıtı, bütçe ve insan onayının aynı kontrollü süreçte ilerlediğini gösterin." },
] as const;

export default function DemoPresentationMode() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUserRole, switchRole, authMode } = useAuth();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const active = useMemo(() => pathname === step.route && currentUserRole === step.role, [pathname, currentUserRole, step]);
  if (authMode === "secure") return null;

  const go = (next: number) => {
    const bounded = Math.max(0, Math.min(STEPS.length - 1, next));
    setIndex(bounded);
    const target = STEPS[bounded];
    if (currentUserRole !== target.role) switchRole(target.role);
    else router.push(target.route);
  };
  const start = () => {
    applyFutureHRV1DemoData();
    setOpen(true); setIndex(0);
    if (currentUserRole !== "ceo") switchRole("ceo"); else router.push("/dashboard");
  };

  return <>
    <button type="button" onClick={start} className="hidden h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 2xl:flex dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300"><Presentation className="h-3.5 w-3.5"/>Demo Turu</button>
    {open && <div className="fixed bottom-4 right-4 z-[75] w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.25)] dark:border-violet-900 dark:bg-slate-900">
      <div className="flex items-start justify-between bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white"><div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-violet-100">FutureHR V1 · 8 dakikalık hikâye</p><h3 className="mt-1 text-sm font-semibold">{step.title}</h3></div><button onClick={()=>setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="h-4 w-4"/></button></div>
      <div className="p-4"><p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{step.detail}</p><div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50">{active ? "✓ Doğru persona ve ekran açık. Bu ekranı anlatın." : "Bu adım için ilgili persona/ekrana geçin."}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-violet-600" style={{width:`${((index+1)/STEPS.length)*100}%`}}/></div><div className="mt-3 flex items-center justify-between"><button type="button" disabled={index===0} onClick={()=>go(index-1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"><ChevronLeft className="h-3.5 w-3.5"/>Geri</button><span className="text-[9px] font-semibold text-slate-400">{index+1}/{STEPS.length}</span>{index<STEPS.length-1?<button type="button" onClick={()=>go(index+1)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[10px] font-semibold text-white hover:bg-violet-700">Sonraki<ChevronRight className="h-3.5 w-3.5"/></button>:<button type="button" onClick={()=>setOpen(false)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[10px] font-semibold text-white"><Play className="h-3.5 w-3.5"/>Turu bitir</button>}</div></div>
    </div>}
  </>;
}
