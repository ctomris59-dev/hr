"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { hasAccess, getDefaultRoute } from "../app/data/roles";

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUserRole } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  // DEVELOPMENT MODE: Bypass all auth checks
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // In development, allow all pages without checks
  useEffect(() => {
    if (isDevelopment) {
      setHasChecked(true);
      return;
    }
  }, [isDevelopment]);

  const publicPages = ["/", "/aday-girisi", "/basvuru", "/aday-testi", "/aday-sinavi", "/test-adayi"];

  useEffect(() => {
    // DEVELOPMENT MODE: Skip all checks
    if (isDevelopment) {
      return;
    }

    // Skip guard for public pages
    if (publicPages.includes(pathname)) {
      setHasChecked(true);
      return;
    }

    // Wait for role to be available
    // AuthContext loads role from storage, give it time
    const timer = setTimeout(() => {
      // If role is loaded, check access
      if (currentUserRole) {
        if (!hasAccess(currentUserRole, pathname)) {
          const defaultRoute = getDefaultRoute(currentUserRole);
          router.replace(defaultRoute);
        } else {
          setHasChecked(true);
        }
      } else {
        // If no role after timeout, allow page to render
        // hasAccess will return false anyway, so it's safe
        setHasChecked(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, currentUserRole, router, isDevelopment]);

  // Additional check for admin-only pages
  useEffect(() => {
    // DEVELOPMENT MODE: Skip all checks
    if (isDevelopment) {
      return;
    }

    if (publicPages.includes(pathname) || !hasChecked || !currentUserRole) return;

    // ekip-yönetimi sayfasına tüm yetkili kullanıcılar erişebilir (sayfa içinde yetki kontrolü var)
    const adminOnlyPages = ["/organizasyon", "/maas", "/kullanici", "/ise-alim"];
    if (adminOnlyPages.includes(pathname) && currentUserRole !== "admin") {
      const defaultRoute = getDefaultRoute(currentUserRole);
      router.replace(defaultRoute);
    }
    
    // /ayarlar/roller sayfasına sadece admin (CEO) erişebilir
    if (pathname === "/ayarlar/roller" && currentUserRole !== "admin") {
      const defaultRoute = getDefaultRoute(currentUserRole);
      router.replace(defaultRoute);
    }
  }, [pathname, currentUserRole, router, hasChecked, isDevelopment]);

  // DEVELOPMENT MODE: Always render children
  if (isDevelopment) {
    return <>{children}</>;
  }

  // Show loading while checking (only for protected pages)
  if (!hasChecked && !publicPages.includes(pathname)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Yükleniyor...</div>
      </div>
    );
  }

  // Don't render children if user doesn't have access (will redirect)
  if (!publicPages.includes(pathname) && currentUserRole && !hasAccess(currentUserRole, pathname)) {
    return null;
  }

  return <>{children}</>;
}
