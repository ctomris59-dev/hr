"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KullaniciPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to ekip-yönetimi
    router.replace("/ekip-yonetimi");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-600">Yönlendiriliyor...</p>
    </div>
  );
}
