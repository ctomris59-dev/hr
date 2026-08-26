"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ButceYonetimiPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/degerlendirme");
  }, [router]);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <p className="text-amber-800 font-semibold">Bütçe Yönetimi taşındı</p>
      <p className="text-sm text-amber-700 mt-1">
        Bütçe Yönetimi artık 360 Değerlendirme modülü içinde. Yönlendiriliyorsunuz...
      </p>
    </div>
  );
}

