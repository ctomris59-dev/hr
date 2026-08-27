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
  SlidersHorizontal,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { useAuth } from "../context/AuthContext";
import { canAccessRoute } from "../lib/hr/accessControl";
import WelcomeWidget from "./WelcomeWidget";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import CommandPalette from "./CommandPalette";
import DemoRoleSwitcher from "./DemoRoleSwitcher";
import ModuleWorkspace from "./ModuleWorkspace";
import GuidedOnboarding from "./GuidedOnboarding";

const menuItems = [
  { href: "/dashboard", label: "Yönetici Özeti", icon: LayoutDashboard, section: "Genel" },
  { href: "/izinler", label: "İzin Yönetimi", icon: Plane, section: "Genel" },
  { href: "/organizasyon", label: "Çalışanlar & Organizasyon", icon: Building2, section: "Genel" },
  { href: "/degerlendirme", label: "Performans & Yetkinlik", icon: RefreshCw, section: "Performans & Yetenek" },
  { href: "/yetenek-matrisi", label: "Yetenek Matrisi", icon: BarChart3, section: "Performans & Yetenek" },
  { href: "/egitim", label: "Eğitim", icon: BookOpen, section: "Gelişim" },
  { href: "/gelisim", label: "Gelişim Planı", icon: Clock, section: "Gelişim" },
  { href: "/kariyer", label: "Kariyer Yolu", icon: MapPin, section: "Gelişim" },
  { href: "/yedekleme", label: "Yedekleme", icon: Crown, section: "Gelişim" },
  { href: "/maas", label: "Maaş Simülasyonu", icon: DollarSign, section: "Operasyon" },
  { href: "/ise-alim", label: "İşe Alım", icon: UserPlus, section: "Operasyon" },
  { href: "/aday-testi", label: "Yetkinlik Testi", icon: FileText, section: "Operasyon" },
  { href: "/ekip-yonetimi", label: "Ekip", icon: Users, section: "Yönetim" },
  { href: "/admin", label: "Kullanıcı & Yetki", icon: ShieldCheck, section: "Yönetim" },
  { href: "/ayarlar/yetki-mimarisi", label: "Yetki Mimarisi", icon: SlidersHorizontal, section: "Yönetim" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalizedPathname = decodeURIComponent(pathname || "/");
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setPolicyRevision] = useState(0);
  const router = useRouter();
  const { currentUserRole } = useAuth();

  useEffect(() => {
    const loadUser = () => setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null) || null);
    loadUser();
    const handleStorageChange = (e: StorageEvent) => { if (e.key === STORAGE_KEYS.CURRENT_USER) loadUser(); };
    const refresh = () => loadUser();
    const refreshPolicy = () => setPolicyRevision((value) => value + 1);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("storageCleared", refresh);
    window.addEventListener("userChanged", refresh);
    window.addEventListener("accessPolicyUpdated", refreshPolicy);
    const interval = setInterval(loadUser, 2000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storageCleared", refresh);
      window.removeEventListener("userChanged", refresh);
      window.removeEventListener("accessPolicyUpdated", refreshPolicy);
      clearInterval(interval);
    };
  }, [pathname]);

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    router.push("/");
    router.refresh();
  };

  const filteredMenuItems = menuItems.filter((item) => canAccessRoute(currentUserRole, item.href));
  const userInitials = (user?.name || "FH").split(" ").filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join("");

  return (
    <div data-testid="app-shell" className="flex h-screen overflow-hidden bg-[#f4f6f9] dark:bg-slate-950">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-3 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Menüyü aç/kapat">
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside data-testid="app-sidebar" data-tour="sidebar" className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-[248px] flex-shrink-0 border-r border-slate-800 bg-[#101722] text-slate-300 transition-transform duration-200 ease-out`}>
        <div className="flex h-screen flex-col overflow-hidden">
          <div className="flex h-16 flex-shrink-0 items-center border-b border-white/[0.07] px-5">
            <Image src="/logo.png" alt="FutureHR" width={500} height={500} className="h-10 w-auto origin-left object-contain brightness-0 invert" priority />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {filteredMenuItems.map((item, index) => {
              const Icon = item.icon;
              const normalizedHref = decodeURIComponent(item.href);
              const isActive = normalizedPathname === normalizedHref || normalizedPathname.startsWith(normalizedHref + "/");
              const showSection = index === 0 || filteredMenuItems[index - 1]?.section !== item.section;
              return <div key={item.href}>
                {showSection && <div className={`${index === 0 ? "mt-0" : "mt-5"} mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600`}>{item.section}</div>}
                <Link data-tour-route={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`group relative mb-0.5 flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all ${isActive ? "bg-white/[0.095] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.035)]" : "text-slate-400 hover:bg-white/[0.055] hover:text-slate-200"}`}>
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

      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[1px]" onClick={() => setSidebarOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header data-tour="topbar" className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-5 backdrop-blur lg:px-6 dark:border-slate-800 dark:bg-slate-900/95">
          <WelcomeWidget />
          <div className="flex items-center gap-2">
            <GuidedOnboarding />
            <DemoRoleSwitcher />
            <button type="button" onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))} className="hidden sm:flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"><SearchIcon className="h-3.5 w-3.5" /><span>Ctrl + K</span></button>
            <ThemeToggle /><NotificationBell />
          </div>
        </header>
        <main data-tour="workspace" className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <ModuleWorkspace pathname={normalizedPathname}>{children}</ModuleWorkspace>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
