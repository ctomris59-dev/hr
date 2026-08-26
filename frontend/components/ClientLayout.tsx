"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Target,
  TrendingUp,
  UserCheck,
  GraduationCap,
  BookOpen,
  Calendar,
  Calculator,
  UserPlus,
  Settings,
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
  FileText,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { useAuth } from "../context/AuthContext";
import { hasAccess } from "../app/data/roles";
import WelcomeWidget from "./WelcomeWidget";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import CommandPalette from "./CommandPalette";
import { Search as SearchIcon } from "lucide-react";

const menuItems = [
  { href: "/dashboard", label: "Yönetici Özet", icon: LayoutDashboard },
  { href: "/izinler", label: "İzin Yönetimi", icon: Plane },
  { href: "/organizasyon", label: "Organizasyon", icon: Building2, adminOnly: true },
  { href: "/degerlendirme", label: "360 Değerlendirme", icon: RefreshCw },
  { href: "/yetenek-matrisi", label: "Yetenek Matrisi", icon: BarChart3 },
  { href: "/egitim", label: "Eğitim", icon: BookOpen },
  { href: "/gelisim", label: "Gelişim Planı", icon: Clock },
  { href: "/kariyer", label: "Kariyer Yolu", icon: MapPin },
  { href: "/yedekleme", label: "Yedekleme", icon: Crown },
  { href: "/maas", label: "Maaş Simülasyonu", icon: DollarSign, adminOnly: true },
  { href: "/ise-alim", label: "İşe Alım", icon: UserPlus, adminOnly: true },
  { href: "/aday-testi", label: "Yetkinlik Testi", icon: FileText },
  { href: "/ekip-yonetimi", label: "Ekip & Kullanıcı Yönetimi", icon: Users },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { currentUserRole } = useAuth();

  // Load user data on mount and listen for changes
  useEffect(() => {
    const loadUser = () => {
      const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    };

    // Load on mount
    loadUser();

    // Listen for storage changes (when user logs in/out or switches)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CURRENT_USER) {
        loadUser();
      }
    };

    // Listen for custom storage events (same-tab updates)
    const handleCustomStorageChange = () => {
      loadUser();
    };

    const handleUserChanged = () => {
      loadUser();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("storageCleared", handleCustomStorageChange);
    window.addEventListener("userChanged", handleUserChanged);
    
    // Also check periodically (in case localStorage is updated directly)
    const interval = setInterval(loadUser, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storageCleared", handleCustomStorageChange);
      window.removeEventListener("userChanged", handleUserChanged);
      clearInterval(interval);
    };
  }, [pathname]); // Re-check when pathname changes

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      router.push("/");
      router.refresh();
    }
  };

  // Route groups handle public vs dashboard separation now
  // This layout is only used for dashboard routes via (dashboard) route group
  // No need to check for public pages - they use (public) route group

  // Filter menu items based on current user role
  const filteredMenuItems = menuItems.filter((item) => {
    // Check if item is admin-only
    if (item.adminOnly && currentUserRole !== "admin") {
      return false;
    }
    // Check if user has access to this route
    return hasAccess(currentUserRole, item.href);
  });

  return (
    <div data-testid="app-shell" className="flex h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-950/60 overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg shadow-indigo-100/20 border border-indigo-50 active:scale-95 transition-all duration-200"
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar - Glassmorphism */}
      <aside
        data-testid="app-sidebar"
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-56 bg-slate-900/95 backdrop-blur-xl text-slate-400 transition-transform duration-300 ease-in-out flex-shrink-0 border-r border-white/10`}
      >
        <div className="h-screen flex flex-col justify-between overflow-hidden">
          {/* Header - Fixed Height */}
          <div className="h-12 flex items-center px-3 border-b border-white/10 flex-shrink-0">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={500} 
              height={500} 
              className="h-8 w-auto object-contain brightness-0 invert" 
            />
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto py-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              // Normalize pathname for comparison (handle URL encoding)
              const normalizedPathname = decodeURIComponent(pathname);
              const normalizedHref = decodeURIComponent(item.href);
              const isActive = normalizedPathname === normalizedHref || normalizedPathname.startsWith(normalizedHref + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-95 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 border-l-2 border-violet-400"
                      : "text-slate-400 hover:bg-gradient-to-r hover:from-indigo-600/20 hover:to-violet-600/20 hover:text-white hover:shadow-md hover:shadow-indigo-500/10"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer - Fixed Height */}
          <div className="border-t border-white/10 flex-shrink-0">
            {user && (
              <div className="px-3 py-1.5 border-b border-white/10">
                <p className="text-[11px] font-medium text-slate-300 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.position || user.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium text-slate-400 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 hover:text-red-300 transition-all duration-200 active:scale-95"
            >
              <LogOut size={16} className="flex-shrink-0" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
          {/* Left: Welcome Widget */}
          <WelcomeWidget />
          
          {/* Right: Notification Bell */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const event = new KeyboardEvent("keydown", {
                  key: "k",
                  ctrlKey: true,
                });
                document.dispatchEvent(event);
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white/70 shadow-sm hover:shadow-md transition-all active:scale-95 dark:border-slate-700 dark:bg-slate-800/70"
            >
              <SearchIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 dark:text-slate-300">Ctrl + K</span>
            </button>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
