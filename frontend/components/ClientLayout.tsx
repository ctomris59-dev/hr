"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
  Plane,
  Building2,
  RefreshCw,
  BarChart3,
  Clock,
  MapPin,
  Crown,
  DollarSign,
  UserPlus,
  FileText,
  Search as SearchIcon,
  ShieldCheck,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { useAuth } from "../context/AuthContext";
import { hasAccess } from "../app/data/roles";
import WelcomeWidget from "./WelcomeWidget";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import CommandPalette from "./CommandPalette";
import DemoRoleSwitcher from "./DemoRoleSwitcher";

const menuItems = [
  { href: "/dashboard", label: "Yönetici Özeti", icon: LayoutDashboard, section: "Genel" },
  { href: "/izinler", label: "İzin Yönetimi", icon: Plane, section: "Genel" },
  { href: "/organizasyon", label: "Çalışanlar & Organizasyon", icon: Building2, adminOnly: true, section: "Genel" },
  { href: "/degerlendirme", label: "Performans & Yetkinlik", icon: RefreshCw, section: "Performans & Yetenek" },
  { href: "/yetenek-matrisi", label: "Yetenek Matrisi", icon: BarChart3, section: "Performans & Yetenek" },
  { href: "/egitim", label: "Eğitim", icon: BookOpen, section: "Gelişim" },
  { href: "/gelisim", label: "Gelişim Planı", icon: Clock, section: "Gelişim" },
  { href: "/kariyer", label: "Kariyer Yolu", icon: MapPin, section: "Gelişim" },
  { href: "/yedekleme", label: "Yedekleme", icon: Crown, section: "Gelişim" },
  { href: "/maas", label: "Maaş Simülasyonu", icon: DollarSign, adminOnly: true, section: "Operasyon" },
  { href: "/ise-alim", label: "İşe Alım", icon: UserPlus, adminOnly: true, section: "Operasyon" },
  { href: "/aday-testi", label: "Yetkinlik Testi", icon: FileText, section: "Operasyon" },
  { href: "/ekip-yonetimi", label: "Ekip", icon: Users, section: "Yönetim" },
  { href: "/admin", label: "Kullanıcı & Yetki", icon: ShieldCheck, adminOnly: true, section: "Yönetim" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { currentUserRole } = useAuth();

  useEffect(() => {
    const loadUser = () => setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null) || null);
    loadUser();
    const handleStorageChange = (e: StorageEvent) => { if (e.key === STORAGE_KEYS.CURRENT_USER) loadUser(); };
    const handleCustomStorageChange = () => loadUser();
    const handleUserChanged = () => loadUser();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("storageCleared", handleCustomStorageChange);
    window.addEventListener("userChanged", handleUserChanged);
    const interval = setInterval(loadUser, 2000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storageCleared", handleCustomStorageChange);
      window.removeEventListener("userChanged", handleUserChanged);
      clearInterval(interval);
    };
  }, [pathname]);

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    router.push("/");
    router.refresh();
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.adminOnly && currentUserRole !== "admin") return false;
    return hasAccess(currentUserRole, item.href);
  });

  const userInitials = (user?.name || "FH").split(" ").filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join("");

  return (
    <div data-testid="app-shell" className="flex h-screen overflow-hidden bg-[#f5f7fa] dark:bg-slate-950">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-3 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Menüyü aç/kapat">
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside data-testid="app-sidebar" className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-[248px] flex-shrink-0 border-r border-slate-800 bg-[#111827] text-slate-300 transition-transform duration-200 ease-out`}>
        <div className="flex h-screen flex-col overflow-hidden">
          <div className="flex h-16 flex-shrink-0 items-center border-b border-white/[0.07] px-5">
            <Image src="/logo.png" alt="FutureHR" width={500} height={500} className="h-10 w-auto origin-left object-contain brightness-0 invert" priority />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {filteredMenuItems.map((item, index) => {
              const Icon = item.icon;
              const normalizedPathname = decodeURIComponent(pathname);
              const normalizedHref = decodeURIComponent(item.href);
              const isActive = normalizedPathname === normalizedHref || normalizedPathname.startsWith(normalizedHref + "/");
              const showSection = index === 0 || filteredMenuItems[index - 1]?.section !== item.section;
              return <div key={item.href}>
                {showSection && <div className={`${index === 0 ? "mt-0" : "mt-5"} mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600`}>{item.section}</div>}
                <Link href={item.href} onClick={() => setSidebarOpen(false)} className={`group relative mb-0.5 flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium ${isActive ? "bg-white/[0.09] text-white" : "text-slate-400 hover:bg-white/[0.055] hover:text-slate-200"}`}>
                  {isActive && <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-indigo-400" />}
                  <Icon size={16} strokeWidth={1.8} className={isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </div>;
            })}
          </nav>
          <div className="flex-shrink-0 border-t border-white/[0.07] p-3">
            {user && <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-200 ring-1 ring-white/[0.08]">{userInitials}</div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-slate-200">{user.name}</p><p className="truncate text-[10px] text-slate-500">{user.position || user.role}</p></div></div>}
            <button onClick={handleLogout} className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[12px] font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-300"><LogOut size={15} /><span>Çıkış Yap</span></button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-slate-950/45" onClick={() => setSidebarOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-6 dark:border-slate-800 dark:bg-slate-900">
          <WelcomeWidget />
          <div className="flex items-center gap-2">
            <DemoRoleSwitcher />
            <button type="button" onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))} className="hidden sm:flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"><SearchIcon className="h-3.5 w-3.5" /><span>Ctrl + K</span></button>
            <ThemeToggle /><NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-6 lg:py-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
