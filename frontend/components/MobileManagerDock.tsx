"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  CircleUserRound,
  LayoutDashboard,
  Menu,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { canAccessRoute } from "@/lib/hr/accessControl";
import { useAuth } from "@/context/AuthContext";

type DockItem = { href: string; label: string; icon: typeof LayoutDashboard };

export default function MobileManagerDock() {
  const pathname = usePathname();
  const { currentUserRole } = useAuth();

  const executive: DockItem[] = [
    { href: "/dashboard", label: "Özet", icon: LayoutDashboard },
    { href: "/organizasyon", label: "Çalışanlar", icon: UsersRound },
    { href: "/karar-merkezi", label: "Kararlar", icon: BrainCircuit },
    { href: "/maas", label: "Ücret", icon: WalletCards },
  ];
  const manager: DockItem[] = [
    { href: "/dashboard", label: "Özet", icon: LayoutDashboard },
    { href: "/ekip-yonetimi", label: "Ekibim", icon: UsersRound },
    { href: "/degerlendirme", label: "Performans", icon: Target },
    { href: "/izinler", label: "İzinler", icon: CalendarDays },
  ];
  const employee: DockItem[] = [
    { href: "/kullanici", label: "Benim", icon: CircleUserRound },
    { href: "/izinler", label: "İzin", icon: CalendarDays },
    { href: "/kariyer", label: "Kariyer", icon: BriefcaseBusiness },
    { href: "/egitim", label: "Eğitim", icon: BookOpenCheck },
  ];

  const source = currentUserRole === "ceo" || currentUserRole === "hr_admin"
    ? executive
    : currentUserRole === "manager" || currentUserRole === "director"
      ? manager
      : employee;

  const candidates = source.filter((item) => canAccessRoute(currentUserRole, item.href)).slice(0, 4);
  if (!currentUserRole || !candidates.length) return null;

  const openMenu = () => document.querySelector<HTMLButtonElement>('button[aria-controls="futurehr-sidebar"]')?.click();
  const columns = candidates.length + 1;

  return (
    <nav
      aria-label="Mobil hızlı menü"
      className="futurehr-mobile-dock fixed inset-x-2 bottom-[max(.5rem,env(safe-area-inset-bottom))] z-50 grid min-h-[62px] items-center rounded-[20px] border border-white/10 bg-[#0d1925]/95 px-1.5 py-1 shadow-[0_20px_55px_rgba(2,8,23,.4)] backdrop-blur-xl lg:hidden"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {candidates.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[50px] min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-[9.5px] font-semibold transition active:scale-[.98] ${active ? "bg-white/10 text-teal-300 shadow-inner" : "text-slate-400"}`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={openMenu}
        className="flex min-h-[50px] min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-[9.5px] font-semibold text-slate-400 transition active:scale-[.98]"
        aria-label="Tüm menüyü aç"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={1.8} />
        <span>Menü</span>
      </button>
    </nav>
  );
}
