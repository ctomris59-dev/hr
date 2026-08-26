"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Crown,
  DollarSign,
  GraduationCap,
  Grid3X3,
  Plane,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";

type Snapshot = {
  org: any[];
  history: any[];
  leaves: any[];
  candidates: any[];
  candidateResults: any[];
  trainings: any[];
  talent: any[];
  users: Record<string, any>;
};

type BarItem = {
  label: string;
  value: number;
  display?: string;
  hint?: string;
};

type TableRow = {
  primary: string;
  secondary?: string;
  value: string;
  tone?: "good" | "warn" | "risk" | "neutral";
};

type InsightModel = {
  title: string;
  subtitle: string;
  eyebrow: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  kind: "bars" | "donut" | "pipeline" | "matrix";
  bars?: BarItem[];
  donut?: { value: number; label: string; detail: string };
  pipeline?: Array<{ label: string; value: number }>;
  matrix?: Array<{ label: string; value: number; level: "high" | "mid" | "low" }>;
  tableTitle: string;
  rows: TableRow[];
};

const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const num = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const text = (value: unknown) => String(value ?? "").trim();
const nameOf = (p: any) => text(p?.["Ad Soyad"] ?? p?.Personel ?? p?.personel ?? p?.name);
const deptOf = (p: any) => text(p?.Departman ?? p?.department ?? p?.dept ?? "Genel");
const roleOf = (p: any) => text(p?.Pozisyon ?? p?.position ?? p?.role ?? "Belirsiz");
const perfOf = (p: any) => num(p?.Performans ?? p?.performance ?? p?.Performans_Mgr1 ?? p?.manager_score);
const potOf = (p: any) => num(p?.Potansiyel ?? p?.potential ?? p?.position_competency_score);
const salaryOf = (p: any) => num(p?.["Maaş (TL)"] ?? p?.Maaş ?? p?.salary ?? p?.Salary);
const average = (values: number[]) => {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
};
const groupCount = (items: any[], getter: (item: any) => string) => {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = getter(item) || "Belirsiz";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};
const money = (value: number) => {
  if (!value) return "—";
  return `${Math.round(value).toLocaleString("tr-TR")} ₺`;
};
const pct = (value: number) => `%${Math.max(0, Math.min(100, Math.round(value)))}`;

function readSnapshot(): Snapshot {
  const candidates = arr<any>(getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []));
  const results = arr<any>(getStorageData<any[]>(STORAGE_KEYS.CANDIDATE_RESULTS, []));
  return {
    org: arr(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, [])),
    history: arr(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, [])),
    leaves: arr(getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, [])),
    candidates: candidates.length ? candidates : results,
    candidateResults: results,
    trainings: arr(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, [])),
    talent: arr(getStorageData<any[]>("hr_talent_matrix", [])),
    users: getStorageData<Record<string, any>>(STORAGE_KEYS.USERS, {}) || {},
  };
}

function statusOf(item: any) {
  return text(item?.durum ?? item?.Durum ?? item?.status ?? item?.Status).toLowerCase();
}

function buildInsight(pathname: string, s: Snapshot): InsightModel | null {
  const talent = s.talent.length ? s.talent : s.org;

  if (pathname.startsWith("/izinler")) {
    const approved = s.leaves.filter((x) => statusOf(x).includes("onay")).length;
    const rejected = s.leaves.filter((x) => statusOf(x).includes("red")).length;
    const pending = Math.max(0, s.leaves.length - approved - rejected);
    const total = Math.max(1, s.leaves.length);
    const types = groupCount(s.leaves, (x) => text(x?.tur ?? x?.izin_turu ?? "Diğer")).slice(0, 5);
    return {
      title: "İzin talep akışı",
      subtitle: "Talep durumlarını ve en yoğun izin türlerini tek bakışta görün.",
      eyebrow: "Operasyon görünümü",
      accent: "#0f766e",
      icon: Plane,
      kind: "donut",
      donut: { value: (approved / total) * 100, label: "Onay oranı", detail: `${approved} onay · ${pending} bekleyen · ${rejected} red` },
      tableTitle: "İzin türleri",
      rows: types.map(([label, value]) => ({ primary: label, value: `${value} talep`, tone: "neutral" })),
    };
  }

  if (pathname.startsWith("/organizasyon")) {
    const byDept = groupCount(s.org, deptOf).slice(0, 7);
    const managers = s.org.filter((p) => /müdür|direktör|manager|director|başkan|ceo/i.test(roleOf(p))).length;
    return {
      title: "Kadro dağılımı",
      subtitle: "Departman yoğunluğu ve yönetim katmanını karşılaştırın.",
      eyebrow: "Organizasyon analitiği",
      accent: "#0369a1",
      icon: Users,
      kind: "bars",
      bars: byDept.map(([label, value]) => ({ label, value, display: `${value} kişi` })),
      tableTitle: "Yapı özeti",
      rows: [
        { primary: "Toplam çalışan", value: String(s.org.length), tone: "neutral" },
        { primary: "Departman", value: String(groupCount(s.org, deptOf).length), tone: "neutral" },
        { primary: "Yönetici", value: String(managers), tone: "good" },
        { primary: "Yönetici oranı", value: s.org.length ? pct((managers / s.org.length) * 100) : "%0", tone: "neutral" },
      ],
    };
  }

  if (pathname.startsWith("/degerlendirme")) {
    const scores = (s.history.length ? s.history : s.org).map(perfOf).filter((v) => v > 0);
    const bands = [
      { label: "4,5–5,0", value: scores.filter((v) => v >= 4.5).length },
      { label: "4,0–4,49", value: scores.filter((v) => v >= 4 && v < 4.5).length },
      { label: "3,0–3,99", value: scores.filter((v) => v >= 3 && v < 4).length },
      { label: "< 3,0", value: scores.filter((v) => v > 0 && v < 3).length },
    ];
    const people = [...(s.history.length ? s.history : s.org)]
      .filter((p) => perfOf(p) > 0)
      .sort((a, b) => perfOf(b) - perfOf(a))
      .slice(0, 5);
    return {
      title: "Performans kalibrasyonu",
      subtitle: "Puanların hangi bantlarda toplandığını ve üst performansı görün.",
      eyebrow: "360° dağılımı",
      accent: "#7c3aed",
      icon: RefreshCw,
      kind: "bars",
      bars: bands.map((x) => ({ ...x, display: `${x.value} kişi` })),
      tableTitle: "Üst performans",
      rows: people.map((p) => ({ primary: nameOf(p) || "Çalışan", secondary: deptOf(p), value: perfOf(p).toFixed(1).replace(".", ","), tone: perfOf(p) >= 4.5 ? "good" : "neutral" })),
    };
  }

  if (pathname.startsWith("/yetenek-matrisi") || pathname.startsWith("/talent")) {
    const cells = [
      { label: "Yıldız", value: talent.filter((p) => perfOf(p) >= 4 && potOf(p) >= 4).length, level: "high" as const },
      { label: "Yüksek Pot.", value: talent.filter((p) => perfOf(p) >= 3 && perfOf(p) < 4 && potOf(p) >= 4).length, level: "high" as const },
      { label: "Soru İşareti", value: talent.filter((p) => perfOf(p) < 3 && potOf(p) >= 4).length, level: "mid" as const },
      { label: "Yüksek Perf.", value: talent.filter((p) => perfOf(p) >= 4 && potOf(p) >= 3 && potOf(p) < 4).length, level: "high" as const },
      { label: "Kilit", value: talent.filter((p) => perfOf(p) >= 3 && perfOf(p) < 4 && potOf(p) >= 3 && potOf(p) < 4).length, level: "mid" as const },
      { label: "Geliştir", value: talent.filter((p) => perfOf(p) < 3 && potOf(p) >= 3 && potOf(p) < 4).length, level: "mid" as const },
      { label: "Uzman", value: talent.filter((p) => perfOf(p) >= 4 && potOf(p) < 3).length, level: "mid" as const },
      { label: "Güvenilir", value: talent.filter((p) => perfOf(p) >= 3 && perfOf(p) < 4 && potOf(p) < 3).length, level: "low" as const },
      { label: "Riskli", value: talent.filter((p) => perfOf(p) < 3 && potOf(p) < 3).length, level: "low" as const },
    ];
    const risk = talent.filter((p) => perfOf(p) > 0 && perfOf(p) < 3).sort((a, b) => perfOf(a) - perfOf(b)).slice(0, 5);
    return {
      title: "9-Box portföy özeti",
      subtitle: "Yetenek havuzunun dokuz kutudaki dağılımını karar öncesi özetleyin.",
      eyebrow: "Yetenek portföyü",
      accent: "#4f46e5",
      icon: Grid3X3,
      kind: "matrix",
      matrix: cells,
      tableTitle: "Öncelikli aksiyon",
      rows: risk.length ? risk.map((p) => ({ primary: nameOf(p) || "Çalışan", secondary: roleOf(p), value: perfOf(p).toFixed(1).replace(".", ","), tone: "risk" })) : [{ primary: "Kritik risk görünmüyor", value: "İyi", tone: "good" }],
    };
  }

  if (pathname.startsWith("/egitim")) {
    const completed = s.trainings.filter((x) => statusOf(x).includes("tamam")).length;
    const active = s.trainings.filter((x) => !statusOf(x).includes("tamam")).length;
    const total = Math.max(1, s.trainings.length);
    const byCourse = groupCount(s.trainings, (x) => text(x?.Egitim ?? x?.Eğitim ?? x?.egitim ?? x?.course ?? "Eğitim")).slice(0, 5);
    return {
      title: "Öğrenme tamamlama",
      subtitle: "Eğitim portföyünde tamamlanma oranını ve en çok atanan içerikleri görün.",
      eyebrow: "LMS görünümü",
      accent: "#0891b2",
      icon: GraduationCap,
      kind: "donut",
      donut: { value: (completed / total) * 100, label: "Tamamlama", detail: `${completed} tamamlandı · ${active} aktif` },
      tableTitle: "Yoğun eğitimler",
      rows: byCourse.map(([label, value]) => ({ primary: label, value: `${value} atama`, tone: "neutral" })),
    };
  }

  if (pathname.startsWith("/gelisim")) {
    const assigned = new Set(s.trainings.map((x) => text(x?.Personel ?? x?.personel)).filter(Boolean));
    const coverage = s.org.length ? (assigned.size / s.org.length) * 100 : 0;
    const completed = s.trainings.filter((x) => statusOf(x).includes("tamam")).length;
    const active = Math.max(0, s.trainings.length - completed);
    const people = groupCount(s.trainings, (x) => text(x?.Personel ?? x?.personel ?? "Belirsiz")).slice(0, 5);
    return {
      title: "Gelişim kapsaması",
      subtitle: "Kadroda kaç kişinin aktif gelişim aksiyonuna bağlandığını izleyin.",
      eyebrow: "Gelişim portföyü",
      accent: "#059669",
      icon: TrendingUp,
      kind: "donut",
      donut: { value: coverage, label: "Kadro kapsama", detail: `${assigned.size} kişi · ${active} aktif aksiyon · ${completed} tamamlanan` },
      tableTitle: "Aksiyon yoğunluğu",
      rows: people.map(([label, value]) => ({ primary: label, value: `${value} aksiyon`, tone: value > 2 ? "warn" : "neutral" })),
    };
  }

  if (pathname.startsWith("/kariyer")) {
    const byDept = groupCount(talent.filter((p) => potOf(p) >= 4), deptOf).slice(0, 6);
    const candidates = talent.filter((p) => potOf(p) >= 4).sort((a, b) => potOf(b) - potOf(a)).slice(0, 5);
    return {
      title: "Kariyer mobilite havuzu",
      subtitle: "Yüksek potansiyelli çalışanların departman dağılımını ve öncelikli adayları görün.",
      eyebrow: "Mobilite analitiği",
      accent: "#c026d3",
      icon: Target,
      kind: "bars",
      bars: byDept.map(([label, value]) => ({ label, value, display: `${value} aday` })),
      tableTitle: "Mobilite adayları",
      rows: candidates.map((p) => ({ primary: nameOf(p) || "Çalışan", secondary: roleOf(p), value: potOf(p).toFixed(1).replace(".", ","), tone: "good" })),
    };
  }

  if (pathname.startsWith("/yedekleme")) {
    const high = talent.filter((p) => potOf(p) >= 4.3 && perfOf(p) >= 4).length;
    const mid = talent.filter((p) => potOf(p) >= 3.5 && potOf(p) < 4.3).length;
    const low = Math.max(0, talent.length - high - mid);
    const critical = talent
      .filter((p) => /ceo|cfo|cto|direktör|director|müdür|manager|başkan/i.test(roleOf(p)))
      .slice(0, 5);
    return {
      title: "Halefiyet hazırlık seviyesi",
      subtitle: "Hazır, geliştirilebilir ve riskli halef havuzunu birlikte değerlendirin.",
      eyebrow: "Yedekleme riski",
      accent: "#d97706",
      icon: Crown,
      kind: "bars",
      bars: [
        { label: "Hazır", value: high, display: `${high} kişi` },
        { label: "1–2 yıl", value: mid, display: `${mid} kişi` },
        { label: "Geliştir", value: low, display: `${low} kişi` },
      ],
      tableTitle: "Kritik roller",
      rows: critical.length ? critical.map((p) => ({ primary: nameOf(p) || roleOf(p), secondary: roleOf(p), value: potOf(p) ? potOf(p).toFixed(1).replace(".", ",") : "—", tone: potOf(p) >= 4 ? "good" : "warn" })) : [{ primary: "Kritik rol verisi bulunamadı", value: "—", tone: "neutral" }],
    };
  }

  if (pathname.startsWith("/maas")) {
    const groups = new Map<string, number[]>();
    s.org.forEach((p) => {
      const salary = salaryOf(p);
      if (!salary) return;
      const dept = deptOf(p);
      groups.set(dept, [...(groups.get(dept) || []), salary]);
    });
    const deptAvg = [...groups.entries()].map(([label, values]) => ({ label, value: average(values) })).sort((a, b) => b.value - a.value).slice(0, 7);
    const top = [...s.org].filter((p) => salaryOf(p) > 0).sort((a, b) => salaryOf(b) - salaryOf(a)).slice(0, 5);
    return {
      title: "Ücret dağılımı",
      subtitle: "Departmanların ortalama ücret seviyesini ve üst bordro kalemlerini karşılaştırın.",
      eyebrow: "Compensation analytics",
      accent: "#047857",
      icon: DollarSign,
      kind: "bars",
      bars: deptAvg.map((x) => ({ label: x.label, value: x.value, display: money(x.value) })),
      tableTitle: "Üst ücret bandı",
      rows: top.map((p) => ({ primary: nameOf(p) || "Çalışan", secondary: deptOf(p), value: money(salaryOf(p)), tone: "neutral" })),
    };
  }

  if (pathname.startsWith("/ise-alim")) {
    const total = s.candidates.length;
    const tested = s.candidates.filter((x) => x?.raw_scores && Object.keys(x.raw_scores || {}).length > 0).length;
    const interview = s.candidates.filter((x) => /mülakat|interview|incelen|review/i.test(statusOf(x))).length;
    const hired = s.candidates.filter((x) => /işe alınd|hired|teklif kabul|offer accepted/i.test(statusOf(x))).length;
    const recent = [...s.candidates].slice(-5).reverse();
    return {
      title: "Aday dönüşüm funnel'ı",
      subtitle: "Havuzdan teste, mülakata ve işe alıma geçişi aynı akışta görün.",
      eyebrow: "Recruitment pipeline",
      accent: "#e11d48",
      icon: UserPlus,
      kind: "pipeline",
      pipeline: [
        { label: "Aday", value: total },
        { label: "Test", value: tested },
        { label: "Mülakat", value: interview },
        { label: "İşe Alım", value: hired },
      ],
      tableTitle: "Son adaylar",
      rows: recent.map((p) => ({ primary: text(p?.name ?? p?.ad_soyad ?? p?.candidate_name) || "Aday", secondary: text(p?.position ?? p?.pozisyon), value: text(p?.status ?? p?.durum) || "Yeni", tone: /red|olumsuz/i.test(statusOf(p)) ? "risk" : /mülakat|interview/i.test(statusOf(p)) ? "warn" : "neutral" })),
    };
  }

  if (pathname.startsWith("/aday-testi") || pathname.startsWith("/test")) {
    const results = s.candidateResults.length ? s.candidateResults : s.candidates.filter((x) => x?.raw_scores);
    const total = Math.max(1, s.candidates.length || results.length);
    const completion = (results.length / total) * 100;
    const recent = [...results].slice(-5).reverse();
    return {
      title: "Test sonuç kapsaması",
      subtitle: "Tamamlanan testleri ve son sonuçları raporlama öncesinde görün.",
      eyebrow: "Assessment analytics",
      accent: "#2563eb",
      icon: CheckCircle2,
      kind: "donut",
      donut: { value: completion, label: "Tamamlanan", detail: `${results.length} sonuç · 130 soru · 10 yetkinlik` },
      tableTitle: "Son testler",
      rows: recent.map((p) => ({ primary: text(p?.name ?? p?.candidate_name ?? p?.ad_soyad) || "Aday", secondary: text(p?.position ?? p?.pozisyon), value: text(p?.score ?? p?.total_score ?? p?.status) || "Tamamlandı", tone: "good" })),
    };
  }

  if (pathname.startsWith("/ekip-yonetimi") || pathname.startsWith("/kullanici") || pathname.startsWith("/admin")) {
    const byRole = groupCount(s.org, roleOf).slice(0, 6);
    const userCount = Object.keys(s.users).length;
    const coverage = s.org.length ? (userCount / s.org.length) * 100 : 0;
    const depts = groupCount(s.org, deptOf).slice(0, 5);
    return {
      title: "Erişim ve rol dağılımı",
      subtitle: "Kullanıcı kapsamını ve organizasyondaki rol yoğunluğunu yönetin.",
      eyebrow: "Admin analytics",
      accent: "#475569",
      icon: ShieldAlert,
      kind: "bars",
      bars: byRole.map(([label, value]) => ({ label, value, display: `${value} kişi` })),
      tableTitle: "Hesap kapsamı",
      rows: [
        { primary: "Aktif kullanıcı", value: String(userCount), tone: "good" },
        { primary: "Kadro", value: String(s.org.length), tone: "neutral" },
        { primary: "Hesap kapsama", value: pct(coverage), tone: coverage >= 90 ? "good" : "warn" },
        ...depts.slice(0, 2).map(([label, value]) => ({ primary: label, value: `${value} kişi`, tone: "neutral" as const })),
      ],
    };
  }

  return null;
}

function Bars({ items, accent }: { items: BarItem[]; accent: string }) {
  const max = Math.max(1, ...items.map((x) => x.value));
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(90px,150px)_1fr_auto] items-center gap-3">
          <span className="truncate text-[11px] font-medium text-slate-600 dark:text-slate-300" title={item.label}>{item.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, (item.value / max) * 100)}%`, background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 68%, white))` }} />
          </div>
          <span className="min-w-[64px] text-right text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{item.display ?? item.value}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ value, label, detail, accent }: { value: number; label: string; detail: string; accent: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="flex min-h-[166px] items-center justify-center gap-8">
      <div className="relative h-32 w-32 flex-none rounded-full" style={{ background: `conic-gradient(${accent} 0 ${safe}%, #e9eef5 ${safe}% 100%)` }}>
        <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner dark:bg-slate-900">
          <strong className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{pct(safe)}</strong>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
        </div>
      </div>
      <div className="max-w-[250px]">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Activity className="h-4 w-4" /> Canlı durum</div>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{detail}</p>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">Oran, mevcut tarayıcı verisindeki kayıtlar üzerinden hesaplanır.</p>
      </div>
    </div>
  );
}

function Pipeline({ items, accent }: { items: Array<{ label: string; value: number }>; accent: string }) {
  const max = Math.max(1, items[0]?.value || 1);
  return (
    <div className="grid min-h-[166px] grid-cols-4 items-end gap-2 sm:gap-3">
      {items.map((item, index) => {
        const width = Math.max(46, 100 - index * 12);
        const conversion = index === 0 ? 100 : Math.round((item.value / max) * 100);
        return (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <div className="text-center">
              <strong className="block text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{item.value}</strong>
              <span className="text-[9px] uppercase tracking-[0.08em] text-slate-400">%{conversion}</span>
            </div>
            <div className="flex h-[88px] w-full items-end justify-center">
              <div className="rounded-t-xl border border-white/40 shadow-sm" style={{ height: `${Math.max(25, conversion)}%`, width: `${width}%`, background: `linear-gradient(180deg, color-mix(in srgb, ${accent} ${90 - index * 10}%, white), ${accent})`, opacity: 1 - index * 0.08 }} />
            </div>
            <span className="text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Matrix({ items }: { items: Array<{ label: string; value: number; level: "high" | "mid" | "low" }> }) {
  const bg = { high: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50", mid: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50", low: "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50" };
  const fg = { high: "text-emerald-800 dark:text-emerald-300", mid: "text-amber-800 dark:text-amber-300", low: "text-rose-800 dark:text-rose-300" };
  return (
    <div className="grid min-h-[166px] grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className={`flex min-h-[50px] items-center justify-between rounded-xl border px-3 py-2 ${bg[item.level]}`}>
          <span className={`text-[9px] font-semibold leading-3 ${fg[item.level]}`}>{item.label}</span>
          <strong className={`ml-2 text-lg font-semibold tabular-nums ${fg[item.level]}`}>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function toneClasses(tone: TableRow["tone"]) {
  if (tone === "good") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300";
  if (tone === "warn") return "bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300";
  if (tone === "risk") return "bg-rose-50 text-rose-700 dark:bg-rose-950/35 dark:text-rose-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

export default function ModuleInsights({ pathname }: { pathname: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ org: [], history: [], leaves: [], candidates: [], candidateResults: [], trainings: [], talent: [], users: {} }));

  useEffect(() => {
    if (pathname === "/dashboard") return;
    const load = () => setSnapshot(readSnapshot());
    load();
    const events = ["storageCleared", "dataUpdated", "talentMatrixUpdated", "candidatesUpdated", "userChanged"];
    events.forEach((event) => window.addEventListener(event, load));
    window.addEventListener("storage", load);
    const timer = window.setInterval(load, 5000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, load));
      window.removeEventListener("storage", load);
      window.clearInterval(timer);
    };
  }, [pathname]);

  const model = useMemo(() => buildInsight(pathname, snapshot), [pathname, snapshot]);
  if (!model || pathname === "/dashboard") return null;

  const Icon = model.icon;
  return (
    <section data-testid="module-insights" className="mb-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.035)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl" style={{ color: model.accent, background: `color-mix(in srgb, ${model.accent} 10%, white)` }}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{model.eyebrow}</p>
              <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{model.title}</h3>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500 dark:text-slate-400">{model.subtitle}</p>
            </div>
          </div>
          <span className="flex flex-none items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Canlı veri
          </span>
        </div>
        <div className="p-5">
          {model.kind === "bars" && model.bars && <Bars items={model.bars} accent={model.accent} />}
          {model.kind === "donut" && model.donut && <Donut {...model.donut} accent={model.accent} />}
          {model.kind === "pipeline" && model.pipeline && <Pipeline items={model.pipeline} accent={model.accent} />}
          {model.kind === "matrix" && model.matrix && <Matrix items={model.matrix} />}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Karar tablosu</p>
            <h4 className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{model.tableTitle}</h4>
          </div>
          <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {model.rows.length ? model.rows.slice(0, 5).map((row, index) => (
            <div key={`${row.primary}-${index}`} className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/45">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{row.primary}</p>
                {row.secondary && <p className="mt-0.5 truncate text-[9px] text-slate-400">{row.secondary}</p>}
              </div>
              <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-bold tabular-nums ${toneClasses(row.tone)}`}>{row.value}</span>
            </div>
          )) : (
            <div className="px-4 py-10 text-center text-[11px] text-slate-400">Henüz özetlenecek veri yok.</div>
          )}
        </div>
      </div>
    </section>
  );
}
