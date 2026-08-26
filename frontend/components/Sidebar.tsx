"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  TrendingUp,
  BookOpen,
  Calendar,
  Calculator,
  LogOut,
  ShieldCheck,
  Map,
  Briefcase,
  Award,
  UserCog,
  Lock,
  Settings,
  Clock
} from "lucide-react";

type UserRole = "CEO" | "DIRECTOR" | "MANAGER" | "EMPLOYEE";

interface MenuItem {
  href: string;
  label: string;
  icon: any;
  roles: UserRole[];
}

const MENU_ITEMS: MenuItem[] = [
  { href: "/dashboard", label: "Yönetici Özet", icon: LayoutDashboard, roles: ["CEO", "DIRECTOR", "MANAGER"] }, 
  { href: "/izinler", label: "İzin Yönetimi", icon: Calendar, roles: ["CEO", "DIRECTOR", "MANAGER", "EMPLOYEE"] },
  { href: "/egitim", label: "Eğitim", icon: BookOpen, roles: ["CEO", "DIRECTOR", "MANAGER", "EMPLOYEE"] },
  { href: "/test", label: "Yetkinlik Testi", icon: Award, roles: ["CEO", "DIRECTOR", "MANAGER", "EMPLOYEE"] },
  { href: "/degerlendirme", label: "Performans & Yetkinlik", icon: Target, roles: ["CEO", "DIRECTOR", "MANAGER"] },
  { href: "/yetenek-matrisi", label: "Yetenek Matrisi", icon: TrendingUp, roles: ["CEO", "DIRECTOR", "MANAGER"] },
  { href: "/gelisim", label: "Gelişim Planı", icon: Clock, roles: ["CEO", "DIRECTOR", "MANAGER"] },
  { href: "/kariyer", label: "Kariyer Yolu", icon: Map, roles: ["CEO", "DIRECTOR", "MANAGER"] },
  { href: "/yedekleme", label: "Yedekleme Planı", icon: ShieldCheck, roles: ["CEO", "DIRECTOR", "MANAGER"] },
  { href: "/ise-alim", label: "İşe Alım", icon: Briefcase, roles: ["CEO", "DIRECTOR", "MANAGER"] },
  { href: "/maas", label: "Maaş Simülasyonu", icon: Calculator, roles: ["CEO"] },
  { href: "/organizasyon", label: "Çalışanlar & Organizasyon", icon: Users, roles: ["CEO", "DIRECTOR", "MANAGER"] },
  { href: "/ekip-yonetimi", label: "Ekip", icon: UserCog, roles: ["CEO", "DIRECTOR", "MANAGER"] },
  { href: "/ayarlar/roller", label: "Rol ve Yetkiler", icon: Lock, roles: ["CEO"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: UserRole; department: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Kullanıcı verisi okunamadı", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!isMounted) return null;

  const userRole = user?.role || "EMPLOYEE";
  const userDept = user?.department || "";
  
  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    if (!item.roles.includes(userRole)) return false;

    if (item.href === "/ise-alim") {
      if (userRole === "CEO") return true;
      if (userRole === "DIRECTOR" && userDept.includes("İnsan Kaynakları")) return true;
      if (userRole === "MANAGER" && userDept.includes("İnsan Kaynakları")) return true;
      return false;
    }

    if (item.href === "/maas") {
      if (userRole === "CEO") return true;
      if (userRole === "DIRECTOR" && (userDept.includes("Finans") || userDept.includes("Finance"))) return true;
      if (userRole === "MANAGER" && (userDept.includes("Finans") || userDept.includes("Finance"))) return true;
      return false;
    }

    return true;
  });

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          FutureHR
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide">YETENEK YÖNETİM SİSTEMİ</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={20} className={isActive ? "text-white" : "text-slate-500 group-hover:text-white transition-colors"} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        {user && (
          <div className="mb-4 px-2">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-700 font-mono text-blue-300 uppercase">
                {user.role}
              </span>
              <span className="truncate max-w-[100px] opacity-70">{user.department}</span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-all text-sm font-medium"
        >
          <LogOut size={16} />
          <span>Oturumu Kapat</span>
        </button>
      </div>
    </div>
  );
}
