"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDefaultRoute } from "../app/data/roles";
import { canAccessRoute, hydrateCompanyAccessPolicy } from "../lib/hr/accessControl";

const PUBLIC_PREFIXES = ["/", "/aday-girisi", "/basvuru", "/aday-testi", "/aday-sinavi", "/test-adayi"];
const isPublicPath = (pathname: string) => pathname === "/" || PUBLIC_PREFIXES.slice(1).some((route) => pathname === route || pathname.startsWith(route + "/"));

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUserRole } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    let cancelled = false;
    setHasChecked(false);
    if (isDevelopment || isPublicPath(pathname)) {
      setHasChecked(true);
      return () => { cancelled = true; };
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        await hydrateCompanyAccessPolicy();
        if (cancelled) return;
        if (!currentUserRole) {
          router.replace("/");
          setHasChecked(true);
          return;
        }
        if (!canAccessRoute(currentUserRole, pathname)) {
          router.replace(getDefaultRoute(currentUserRole));
          setHasChecked(true);
          return;
        }
        setHasChecked(true);
      })();
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, currentUserRole, router, isDevelopment]);

  if (isDevelopment || isPublicPath(pathname)) return <>{children}</>;

  if (!hasChecked) {
    return <div className="flex h-screen items-center justify-center text-sm text-slate-500">Yetki kontrol ediliyor…</div>;
  }

  if (!currentUserRole || !canAccessRoute(currentUserRole, pathname)) return null;
  return <>{children}</>;
}
