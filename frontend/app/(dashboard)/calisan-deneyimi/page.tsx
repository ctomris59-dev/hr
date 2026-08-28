"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import WeeklyPulseCard from "../../../components/education/WeeklyPulseCard";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";

export default function CalisanDeneyimiPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  const userName = user?.name || user?.username || "";
  const department = user?.dept || user?.department || "";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <p className="enterprise-eyebrow">Çalışan deneyimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Haftalık Check-in</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Kısa haftalık geri bildirimler, yönetim panelindeki çalışan deneyimi skorunu ve katılım göstergelerini doğrudan oluşturur.</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_280px]">
        <div className="enterprise-card p-5">
          {userName ? (
            <WeeklyPulseCard userName={userName} departmentId={department} respectWindow={false} />
          ) : (
            <p className="text-sm text-slate-500">Check-in için aktif kullanıcı bilgisi bulunamadı.</p>
          )}
        </div>

        <div className="enterprise-card p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nasıl kullanılıyor?</h2>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            <p>Her çalışan haftada bir kez 1–10 arasında genel deneyim skoru verir.</p>
            <p>Departman ve şirket görünümündeki skorlar gerçek check-in yanıtlarından otomatik hesaplanır.</p>
            <p>Serbest metin geri bildirimi isteğe bağlıdır ve deneyimin bağlamını anlamaya yardımcı olur.</p>
          </div>
          {department && (
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-900/50">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Kapsam</p>
              <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{department}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
