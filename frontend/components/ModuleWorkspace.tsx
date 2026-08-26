"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Plane,
  Building2,
  RefreshCw,
  BarChart3,
  BookOpen,
  Clock,
  MapPin,
  Crown,
  DollarSign,
  UserPlus,
  FileText,
  Users,
  Target,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  BriefcaseBusiness,
  type LucideIcon,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";

type Snapshot = {
  org: any[];
  history: any[];
  leaves: any[];
  candidates: any[];
  trainings: any[];
  talent: any[];
  users: Record<string, any>;
  currentUser: any;
};

type Metric = {
  label: string;
  value: string;
  hint?: string;
};

type ModuleConfig = {
  path: string;
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  focus: string;
  steps: string[];
  icon: LucideIcon;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  metrics: (snapshot: Snapshot) => Metric[];
};

const safeArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const average = (values: number[]) => {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const formatCompactTl = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} Mn ₺`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} Bin ₺`;
  return `${Math.round(value).toLocaleString("tr-TR")} ₺`;
};

const unique = (values: Array<string | undefined | null>) =>
  Array.from(new Set(values.map((value) => (value || "").trim()).filter(Boolean)));

const getSalary = (person: any) =>
  safeNumber(person?.["Maaş (TL)"] ?? person?.Maaş ?? person?.salary ?? person?.Salary);

const getPerformance = (person: any) =>
  safeNumber(person?.Performans ?? person?.performance ?? person?.Performans_Mgr1 ?? person?.manager_score);

const getPotential = (person: any) =>
  safeNumber(person?.Potansiyel ?? person?.potential);

const getPersonName = (person: any) =>
  String(person?.["Ad Soyad"] ?? person?.Personel ?? person?.personel ?? person?.name ?? "").trim();

const getPosition = (person: any) =>
  String(person?.Pozisyon ?? person?.position ?? person?.role ?? "").trim();

const getDepartment = (person: any) =>
  String(person?.Departman ?? person?.department ?? person?.dept ?? "").trim();

const MODULES: ModuleConfig[] = [
  {
    path: "/izinler",
    id: "izinler",
    title: "İzin Yönetimi",
    eyebrow: "İzin operasyon merkezi",
    description: "Bakiye, talepler, yönetici onayları ve ekip takvimini tek operasyon alanında yönetin.",
    focus: "Bekleyen talepleri ve ekip çakışmalarını önce çözün; ardından kişisel izin planını optimize edin.",
    steps: ["Bakiye", "Talep", "Onay", "Takvim"],
    icon: Plane,
    accent: "#0f766e",
    accentSoft: "#f0fdfa",
    accentBorder: "#99f6e4",
    metrics: (s) => {
      const pending = s.leaves.filter((item) => ["Bekliyor", "Beklemede"].includes(item?.durum)).length;
      const approved = s.leaves.filter((item) => item?.durum === "Onaylandı").length;
      const myName = s.currentUser?.name || "";
      const myApprovedDays = s.leaves
        .filter((item) => item?.personel === myName && item?.durum === "Onaylandı" && item?.tur === "Yıllık İzin")
        .reduce((sum, item) => sum + safeNumber(item?.gun ?? item?.gun_sayisi), 0);
      const me = s.org.find((person) => getPersonName(person) === myName);
      const quota = safeNumber(me?.Izin_Hakki ?? me?.["İzin Hakkı (Gün)"]) || 14;
      return [
        { label: "Bekleyen", value: String(pending), hint: "Onay kuyruğu" },
        { label: "Onaylanan", value: String(approved), hint: "Toplam kayıt" },
        { label: "Kalan İzin", value: `${Math.max(0, quota - myApprovedDays)} gün`, hint: "Kişisel bakiye" },
        { label: "Ekip", value: String(s.org.length), hint: "Aktif personel" },
      ];
    },
  },
  {
    path: "/organizasyon",
    id: "organizasyon",
    title: "Organizasyon",
    eyebrow: "Kadro & yapı yönetimi",
    description: "Çalışan envanteri, departman yapısı, yöneticiler ve temel kadro göstergelerini yönetin.",
    focus: "Organizasyon verisini tek doğruluk kaynağı olarak tutun; eksik departman, pozisyon ve yönetici alanlarını temizleyin.",
    steps: ["Kadro", "Departman", "Hiyerarşi", "Raporlama"],
    icon: Building2,
    accent: "#0369a1",
    accentSoft: "#f0f9ff",
    accentBorder: "#bae6fd",
    metrics: (s) => {
      const departments = unique(s.org.map(getDepartment));
      const salaries = s.org.map(getSalary).filter((value) => value > 0);
      const managers = s.org.filter((person) => /müdür|direktör|manager|director|başkan|ceo/i.test(getPosition(person))).length;
      return [
        { label: "Çalışan", value: String(s.org.length), hint: "Toplam kadro" },
        { label: "Departman", value: String(departments.length), hint: "Aktif birim" },
        { label: "Ort. Maaş", value: formatCompactTl(average(salaries)), hint: "Kadro ortalaması" },
        { label: "Yönetici", value: String(managers), hint: "Yönetim rolleri" },
      ];
    },
  },
  {
    path: "/degerlendirme",
    id: "degerlendirme",
    title: "360 Değerlendirme",
    eyebrow: "Performans kalibrasyonu",
    description: "Yönetici puanlarını, yetkinlikleri ve performans sonuçlarını kalibrasyon odaklı yönetin.",
    focus: "Önce değerlendirilecek kişiyi ve değerlendirme tipini seçin; puanlama sonrası departman ortalamasıyla kalibre edin.",
    steps: ["Çalışan", "Yetkinlik", "Puanlama", "Kalibrasyon"],
    icon: RefreshCw,
    accent: "#7c3aed",
    accentSoft: "#f5f3ff",
    accentBorder: "#ddd6fe",
    metrics: (s) => {
      const evaluatedPeople = unique(s.history.map(getPersonName));
      const scores = s.history.map(getPerformance).filter((value) => value > 0);
      const stars = s.history.filter((item) => item?.is_star_performer || getPerformance(item) >= 4.5).length;
      return [
        { label: "Değerlendirilen", value: String(evaluatedPeople.length), hint: "Benzersiz çalışan" },
        { label: "Kayıt", value: String(s.history.length), hint: "360 geçmişi" },
        { label: "Ort. Puan", value: scores.length ? average(scores).toFixed(1).replace(".", ",") : "—", hint: "Performans" },
        { label: "Yıldız", value: String(stars), hint: "Üst performans" },
      ];
    },
  },
  {
    path: "/yetenek-matrisi",
    id: "yetenek-matrisi",
    title: "Yetenek Matrisi",
    eyebrow: "9-Box karar desteği",
    description: "Performans, potansiyel ve yetkinlik açıklarını tek karar ekranında birleştirin.",
    focus: "Yıldızları koruyun, riskli kutuları aksiyona bağlayın ve kritik gap'leri gelişim planına aktarın.",
    steps: ["9-Box", "Gap", "Potansiyel", "Aksiyon"],
    icon: BarChart3,
    accent: "#4f46e5",
    accentSoft: "#eef2ff",
    accentBorder: "#c7d2fe",
    metrics: (s) => {
      const source = s.talent.length ? s.talent : s.org;
      const stars = source.filter((item) => getPerformance(item) >= 4 && getPotential(item) >= 4.5).length;
      const risky = source.filter((item) => getPerformance(item) > 0 && getPerformance(item) < 3).length;
      const highPotential = source.filter((item) => getPotential(item) >= 4).length;
      return [
        { label: "Kadro", value: String(source.length), hint: "Analiz kapsamı" },
        { label: "Yıldız", value: String(stars), hint: "Yüksek P/Y" },
        { label: "Yüksek Pot.", value: String(highPotential), hint: "Potansiyel ≥ 4" },
        { label: "Riskli", value: String(risky), hint: "Performans < 3" },
      ];
    },
  },
  {
    path: "/egitim",
    id: "egitim",
    title: "Eğitim",
    eyebrow: "Öğrenme operasyonları",
    description: "Eğitim ihtiyacını atamaya dönüştürün, son tarihleri ve tamamlama durumunu izleyin.",
    focus: "Geciken eğitimleri kapatın; kritik yetkinlik açığı olan çalışanlarda atama ve tamamlanma oranını artırın.",
    steps: ["İhtiyaç", "Atama", "Takip", "Tamamlama"],
    icon: BookOpen,
    accent: "#0891b2",
    accentSoft: "#ecfeff",
    accentBorder: "#a5f3fc",
    metrics: (s) => {
      const today = new Date();
      const completed = s.trainings.filter((item) => String(item?.Durum ?? item?.durum).toLowerCase().includes("tamam")).length;
      const overdue = s.trainings.filter((item) => {
        const status = String(item?.Durum ?? item?.durum).toLowerCase();
        const due = new Date(item?.["Son Tarih"] ?? item?.son_tarih ?? "");
        return !status.includes("tamam") && !Number.isNaN(due.getTime()) && due < today;
      }).length;
      const active = Math.max(0, s.trainings.length - completed);
      return [
        { label: "Atama", value: String(s.trainings.length), hint: "Toplam eğitim" },
        { label: "Aktif", value: String(active), hint: "Devam eden" },
        { label: "Tamamlanan", value: String(completed), hint: "Kapanan atama" },
        { label: "Geciken", value: String(overdue), hint: "Aksiyon gerekli" },
      ];
    },
  },
  {
    path: "/gelisim",
    id: "gelisim",
    title: "Gelişim Planı",
    eyebrow: "Yetkinlik gelişimi",
    description: "Yetkinlik açığını kişisel gelişim planına, kaynağa ve ölçülebilir ilerlemeye dönüştürün.",
    focus: "Önceliği kritik gap'lere verin; atanan kaynakların ilerleme ve son tarih takibini aynı planda tutun.",
    steps: ["Gap", "Plan", "Kaynak", "İlerleme"],
    icon: Clock,
    accent: "#059669",
    accentSoft: "#ecfdf5",
    accentBorder: "#a7f3d0",
    metrics: (s) => {
      const assignedPeople = unique(s.trainings.map((item) => item?.Personel ?? item?.personel));
      const completed = s.trainings.filter((item) => String(item?.Durum ?? item?.durum).toLowerCase().includes("tamam")).length;
      const active = Math.max(0, s.trainings.length - completed);
      const coverage = s.org.length ? Math.round((assignedPeople.length / s.org.length) * 100) : 0;
      return [
        { label: "Planlı Kişi", value: String(assignedPeople.length), hint: "Gelişim kapsamı" },
        { label: "Aktif Aksiyon", value: String(active), hint: "Açık eğitim" },
        { label: "Tamamlanan", value: String(completed), hint: "Kapanan aksiyon" },
        { label: "Kapsama", value: `%${coverage}`, hint: "Kadro oranı" },
      ];
    },
  },
  {
    path: "/kariyer",
    id: "kariyer",
    title: "Kariyer Yolu",
    eyebrow: "Rol & mobilite analizi",
    description: "Mevcut rol ile hedef rol arasındaki uygunluğu, yetkinlik farkını ve kariyer rotasını yönetin.",
    focus: "Yüksek potansiyelli çalışanları hedef rollerle eşleştirin ve gerekli gelişim adımlarını görünür hale getirin.",
    steps: ["Mevcut Rol", "Hedef Rol", "Uyum", "Yol Haritası"],
    icon: MapPin,
    accent: "#c026d3",
    accentSoft: "#fdf4ff",
    accentBorder: "#f5d0fe",
    metrics: (s) => {
      const source = s.talent.length ? s.talent : s.org;
      const roles = unique(source.map(getPosition));
      const highPotential = source.filter((item) => getPotential(item) >= 4).length;
      const avgPerf = average(source.map(getPerformance));
      return [
        { label: "Çalışan", value: String(source.length), hint: "Kariyer havuzu" },
        { label: "Rol", value: String(roles.length), hint: "Benzersiz pozisyon" },
        { label: "Yüksek Pot.", value: String(highPotential), hint: "Mobilite adayı" },
        { label: "Ort. Perf.", value: avgPerf ? avgPerf.toFixed(1).replace(".", ",") : "—", hint: "Havuz skoru" },
      ];
    },
  },
  {
    path: "/yedekleme",
    id: "yedekleme",
    title: "Yedekleme",
    eyebrow: "Halefiyet & risk",
    description: "Kritik rolleri, kayıp riskini ve hazır halef adaylarını yönetim kararı için bir araya getirin.",
    focus: "Önce kritik rol ve yüksek kayıp etkisini ele alın; her kritik pozisyon için en az bir hazır halef belirleyin.",
    steps: ["Kritik Rol", "Risk", "Halef", "Hazırlık"],
    icon: Crown,
    accent: "#d97706",
    accentSoft: "#fffbeb",
    accentBorder: "#fde68a",
    metrics: (s) => {
      const source = s.talent.length ? s.talent : s.org;
      const criticalRoles = source.filter((item) => /ceo|cfo|cto|direktör|director|müdür|manager|başkan/i.test(getPosition(item))).length;
      const highPotential = source.filter((item) => getPotential(item) >= 4).length;
      const stars = source.filter((item) => getPotential(item) >= 4.5 && getPerformance(item) >= 4).length;
      return [
        { label: "Kritik Rol", value: String(criticalRoles), hint: "Yönetim rolleri" },
        { label: "Halef Havuzu", value: String(highPotential), hint: "Potansiyel ≥ 4" },
        { label: "Yıldız", value: String(stars), hint: "Transfer riski" },
        { label: "Kapsam", value: String(source.length), hint: "Analiz edilen" },
      ];
    },
  },
  {
    path: "/maas",
    id: "maas",
    title: "Maaş Simülasyonu",
    eyebrow: "Ücret & bütçe analitiği",
    description: "Ücret senaryolarını piyasa benchmarkı ve toplam bütçe etkisiyle birlikte simüle edin.",
    focus: "Önce veri kalitesini ve piyasa farkını görün; sonra senaryoları toplam bordro etkisine göre karşılaştırın.",
    steps: ["Veri", "Senaryo", "Piyasa", "Bütçe"],
    icon: DollarSign,
    accent: "#047857",
    accentSoft: "#ecfdf5",
    accentBorder: "#a7f3d0",
    metrics: (s) => {
      const salaries = s.org.map(getSalary).filter((value) => value > 0);
      const payroll = salaries.reduce((sum, value) => sum + value, 0);
      const departments = unique(s.org.map(getDepartment));
      return [
        { label: "Aylık Bordro", value: formatCompactTl(payroll), hint: "Mevcut toplam" },
        { label: "Ort. Maaş", value: formatCompactTl(average(salaries)), hint: "Kadro ortalaması" },
        { label: "Çalışan", value: String(s.org.length), hint: "Simülasyon kapsamı" },
        { label: "Departman", value: String(departments.length), hint: "Bütçe birimi" },
      ];
    },
  },
  {
    path: "/ise-alim",
    id: "ise-alim",
    title: "İşe Alım",
    eyebrow: "Aday karar merkezi",
    description: "Aday havuzunu test, mülakat ve işe alım kararı boyunca pipeline mantığıyla yönetin.",
    focus: "Adayları statü bazında ilerletin; test skoru ve risk göstergelerini mülakat kararından önce birlikte değerlendirin.",
    steps: ["Aday", "Test", "Mülakat", "Karar"],
    icon: UserPlus,
    accent: "#e11d48",
    accentSoft: "#fff1f2",
    accentBorder: "#fecdd3",
    metrics: (s) => {
      const interview = s.candidates.filter((item) => /mülakat|interview/i.test(String(item?.status))).length;
      const reviewed = s.candidates.filter((item) => /incelen|review/i.test(String(item?.status))).length;
      const hired = s.candidates.filter((item) => /işe alınd|teklif kabul|hired|offer accepted/i.test(String(item?.status))).length;
      const tested = s.candidates.filter((item) => item?.raw_scores && Object.keys(item.raw_scores).length > 0).length;
      return [
        { label: "Aday", value: String(s.candidates.length), hint: "Toplam havuz" },
        { label: "Testli", value: String(tested), hint: "Yetkinlik sonucu" },
        { label: "Mülakat", value: String(interview || reviewed), hint: "Aktif pipeline" },
        { label: "İşe Alım", value: String(hired), hint: "Kapanan süreç" },
      ];
    },
  },
  {
    path: "/aday-testi",
    id: "aday-testi",
    title: "Yetkinlik Testi",
    eyebrow: "Standart değerlendirme",
    description: "130 soruluk standart test akışını süre, ilerleme ve sonuç kaydı odaklı yönetin.",
    focus: "Test sırasında dikkat dağıtan öğeleri en aza indirin; ilerleme ve kalan süreyi her an görünür tutun.",
    steps: ["Hazırlık", "130 Soru", "Puanlama", "Rapor"],
    icon: FileText,
    accent: "#2563eb",
    accentSoft: "#eff6ff",
    accentBorder: "#bfdbfe",
    metrics: (s) => {
      const completedTests = s.candidates.filter((item) => item?.raw_scores && Object.keys(item.raw_scores).length > 0).length;
      return [
        { label: "Soru", value: "130", hint: "Standart set" },
        { label: "Süre", value: "45 dk", hint: "Test limiti" },
        { label: "Tamamlanan", value: String(completedTests), hint: "Kayıtlı sonuç" },
        { label: "Yetkinlik", value: "10", hint: "Ölçüm alanı" },
      ];
    },
  },
  {
    path: "/ekip-yonetimi",
    id: "ekip-yonetimi",
    title: "Ekip & Kullanıcı",
    eyebrow: "Erişim & kullanıcı yönetimi",
    description: "Çalışan hesaplarını, rolleri ve yönetim kapsamlarını operasyonel bir admin konsolundan yönetin.",
    focus: "Kullanıcı hesabı olmayan çalışanları tamamlayın ve yetkileri organizasyon hiyerarşisiyle tutarlı tutun.",
    steps: ["Kullanıcı", "Rol", "Erişim", "Yönetim"],
    icon: Users,
    accent: "#475569",
    accentSoft: "#f8fafc",
    accentBorder: "#cbd5e1",
    metrics: (s) => {
      const users = Object.keys(s.users || {}).length;
      const managers = s.org.filter((person) => /müdür|direktör|manager|director|başkan|ceo/i.test(getPosition(person))).length;
      const coverage = s.org.length ? Math.round((users / s.org.length) * 100) : 0;
      return [
        { label: "Çalışan", value: String(s.org.length), hint: "Organizasyon" },
        { label: "Kullanıcı", value: String(users), hint: "Aktif hesap" },
        { label: "Yönetici", value: String(managers), hint: "Yetkili rol" },
        { label: "Hesap Kapsama", value: `%${coverage}`, hint: "Kadro oranı" },
      ];
    },
  },
];

function readSnapshot(): Snapshot {
  return {
    org: safeArray(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, [])),
    history: safeArray(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, [])),
    leaves: safeArray(getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, [])),
    candidates: safeArray(getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, [])),
    trainings: safeArray(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, [])),
    talent: safeArray(getStorageData<any[]>("hr_talent_matrix", [])),
    users: getStorageData<Record<string, any>>(STORAGE_KEYS.USERS, {}) || {},
    currentUser: getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null),
  };
}

export default function ModuleWorkspace({ pathname, children }: { pathname: string; children: ReactNode }) {
  const config = MODULES.find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`));
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    org: [],
    history: [],
    leaves: [],
    candidates: [],
    trainings: [],
    talent: [],
    users: {},
    currentUser: null,
  }));

  useEffect(() => {
    if (!config) return;
    const load = () => setSnapshot(readSnapshot());
    load();

    const events = [
      "storageCleared",
      "dataUpdated",
      "talentMatrixUpdated",
      "candidatesUpdated",
      "userChanged",
    ];
    events.forEach((event) => window.addEventListener(event, load));
    window.addEventListener("storage", load);
    const interval = window.setInterval(load, 5000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, load));
      window.removeEventListener("storage", load);
      window.clearInterval(interval);
    };
  }, [config?.path]);

  const metrics = useMemo(() => (config ? config.metrics(snapshot) : []), [config, snapshot]);

  if (!config || pathname === "/dashboard") {
    return <>{children}</>;
  }

  const Icon = config.icon;
  const workspaceStyle = {
    "--module-accent": config.accent,
    "--module-accent-soft": config.accentSoft,
    "--module-accent-border": config.accentBorder,
  } as CSSProperties;

  return (
    <div
      className={`module-workspace workspace-${config.id}`}
      style={workspaceStyle}
      data-module={config.id}
    >
      <div className="module-workspace-grid grid min-w-0 gap-5 2xl:grid-cols-[278px_minmax(0,1fr)]">
        <aside className="module-workspace-rail min-w-0 2xl:sticky 2xl:top-0 2xl:self-start">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-4 dark:border-slate-800" style={{ borderTop: `3px solid ${config.accent}` }}>
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg border"
                  style={{ background: config.accentSoft, borderColor: config.accentBorder, color: config.accent }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{config.eyebrow}</p>
                  <h1 className="truncate text-[17px] font-semibold tracking-[-0.025em] text-slate-900 dark:text-slate-100">{config.title}</h1>
                </div>
              </div>
              <p className="text-[12px] leading-5 text-slate-500 dark:text-slate-400">{config.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800">
              {metrics.slice(0, 4).map((metric) => (
                <div key={metric.label} className="min-h-[88px] bg-white p-3.5 dark:bg-slate-900">
                  <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-slate-400">{metric.label}</p>
                  <p className="mt-1 text-[20px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-slate-100">{metric.value}</p>
                  {metric.hint && <p className="mt-0.5 text-[10px] text-slate-400">{metric.hint}</p>}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Çalışma akışı</span>
              </div>
              <div className="space-y-2">
                {config.steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-2.5">
                    <span
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[9px] font-bold"
                      style={{ background: config.accentSoft, color: config.accent }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{step}</span>
                    {index < config.steps.length - 1 && <span className="ml-auto h-px w-4 bg-slate-200 dark:bg-slate-700" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-3.5 w-3.5" style={{ color: config.accent }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Yönetim odağı</span>
              </div>
              <p className="text-[11px] leading-[1.65] text-slate-500 dark:text-slate-400">{config.focus}</p>
            </div>
          </div>
        </aside>

        <section className="module-workspace-main min-w-0">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="h-2 w-2 rounded-full" style={{ background: config.accent }} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Aktif çalışma alanı</p>
                <p className="truncate text-[12px] font-medium text-slate-600 dark:text-slate-300">{config.steps.join("  →  ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Canlı organizasyon verisi
            </div>
          </div>

          <div className="module-native-content min-w-0">{children}</div>
        </section>
      </div>

      <style jsx global>{`
        .module-workspace .module-native-content > div {
          min-height: 0 !important;
          background: transparent !important;
        }

        .module-workspace .module-native-content > div[class*="p-6"],
        .module-workspace .module-native-content > div[class*="p-8"] {
          padding: 0 !important;
        }

        .module-workspace .module-native-content .bg-\[\#FAFAFA\],
        .module-workspace .module-native-content .bg-\[\#fafafa\],
        .module-workspace .module-native-content .bg-slate-50 {
          background-color: transparent !important;
        }

        .module-workspace .module-native-content .rounded-\[2rem\],
        .module-workspace .module-native-content .rounded-\[1\.5rem\],
        .module-workspace .module-native-content .rounded-2xl,
        .module-workspace .module-native-content .rounded-3xl {
          border-radius: 0.875rem !important;
        }

        .module-workspace .module-native-content .shadow-lg,
        .module-workspace .module-native-content .shadow-xl,
        .module-workspace .module-native-content .shadow-2xl {
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.045) !important;
        }

        .module-workspace .module-native-content button.bg-blue-600,
        .module-workspace .module-native-content a.bg-blue-600 {
          background-color: var(--module-accent) !important;
        }

        .module-workspace .module-native-content .text-blue-600,
        .module-workspace .module-native-content .text-blue-700 {
          color: var(--module-accent) !important;
        }

        .module-workspace .module-native-content .bg-blue-50,
        .module-workspace .module-native-content .bg-blue-100 {
          background-color: var(--module-accent-soft) !important;
        }

        .module-workspace .module-native-content .border-blue-200,
        .module-workspace .module-native-content .border-blue-300 {
          border-color: var(--module-accent-border) !important;
        }

        .module-workspace .module-native-content table {
          font-variant-numeric: tabular-nums;
        }

        .module-workspace .module-native-content thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #f8fafc !important;
          color: #64748b !important;
          font-size: 0.67rem !important;
          font-weight: 700 !important;
          letter-spacing: 0.055em;
          text-transform: uppercase;
        }

        .dark .module-workspace .module-native-content thead th {
          background: #172033 !important;
          color: #94a3b8 !important;
        }

        .module-workspace .module-native-content tbody tr {
          transition: background-color 140ms ease, transform 140ms ease;
        }

        .module-workspace .module-native-content tbody tr:hover {
          background: rgba(248, 250, 252, 0.9) !important;
        }

        .dark .module-workspace .module-native-content tbody tr:hover {
          background: rgba(30, 41, 59, 0.52) !important;
        }

        .module-workspace .module-native-content input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
        .module-workspace .module-native-content select,
        .module-workspace .module-native-content textarea {
          min-height: 38px;
          border-radius: 0.6rem !important;
          border-color: #dbe3ee !important;
          background: #fff;
        }

        .dark .module-workspace .module-native-content input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
        .dark .module-workspace .module-native-content select,
        .dark .module-workspace .module-native-content textarea {
          border-color: #334155 !important;
          background: #0f172a !important;
        }

        .module-workspace .module-native-content input[type="range"] {
          accent-color: var(--module-accent) !important;
        }

        .module-workspace .module-native-content h1,
        .module-workspace .module-native-content h2 {
          letter-spacing: -0.028em;
        }

        /* Hide redundant legacy page headers; the workspace rail now owns page identity. */
        .workspace-izinler .module-native-content > div > .mb-4:first-child,
        .workspace-organizasyon .module-native-content > div > .mb-4:first-child,
        .workspace-degerlendirme .module-native-content > div > .mb-4:first-child {
          display: none !important;
        }

        /* Leave: operational segmented tabs */
        .workspace-izinler .module-native-content > div > .mb-4:nth-child(2) .border-b {
          display: inline-flex !important;
          gap: 4px !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0.7rem;
          padding: 4px;
          background: #fff;
        }

        .workspace-izinler .module-native-content > div > .mb-4:nth-child(2) button {
          border: 0 !important;
          border-radius: 0.5rem !important;
          padding: 8px 12px !important;
        }

        /* Organisation: denser data-management canvas */
        .workspace-organizasyon .module-native-content .grid.grid-cols-3 {
          gap: 10px !important;
        }

        .workspace-organizasyon .module-native-content table {
          border-collapse: separate;
          border-spacing: 0 4px;
        }

        /* 360: scoring workbench */
        .workspace-degerlendirme .module-native-content input[type="range"] {
          height: 4px;
        }

        .workspace-degerlendirme .module-native-content .grid.md\:grid-cols-2 > div {
          border-radius: 0.75rem;
        }

        /* Talent: analytic canvas */
        .workspace-yetenek-matrisi .module-native-content svg,
        .workspace-kariyer .module-native-content svg {
          shape-rendering: geometricPrecision;
        }

        /* Education/development: course cards feel like an LMS */
        .workspace-egitim .module-native-content button,
        .workspace-gelisim .module-native-content button {
          font-weight: 600;
        }

        /* Succession: remove old giant paddings/radii */
        .workspace-yedekleme .module-native-content > div > div:first-child {
          margin-top: 0 !important;
        }

        .workspace-yedekleme .module-native-content .rounded-full {
          border-radius: 0.65rem !important;
        }

        /* Salary: financial data density */
        .workspace-maas .module-native-content {
          font-variant-numeric: tabular-nums;
        }

        .workspace-maas .module-native-content table td,
        .workspace-maas .module-native-content table th {
          white-space: nowrap;
        }

        /* Recruitment: pipeline-like cards */
        .workspace-ise-alim .module-native-content [class*="status"],
        .workspace-ise-alim .module-native-content select {
          font-weight: 600;
        }

        /* Test: focus mode automatically removes the rail when the fixed timer appears. */
        .workspace-aday-testi:has(.module-native-content .fixed) .module-workspace-rail,
        .workspace-aday-testi:has(.module-native-content .fixed) .module-workspace-main > div:first-child {
          display: none !important;
        }

        .workspace-aday-testi:has(.module-native-content .fixed) .module-workspace-grid {
          display: block !important;
        }

        .workspace-aday-testi:has(.module-native-content .fixed) .module-native-content > div {
          padding-top: 0 !important;
        }

        /* Team & users: admin-console density */
        .workspace-ekip-yonetimi .module-native-content table td {
          vertical-align: middle;
        }

        @media (max-width: 1535px) {
          .module-workspace-rail > div {
            display: grid;
            grid-template-columns: minmax(220px, 1.2fr) minmax(240px, 1fr) minmax(220px, 1fr);
          }

          .module-workspace-rail > div > div:first-child,
          .module-workspace-rail > div > div:last-child {
            border-bottom: 0;
          }

          .module-workspace-rail > div > div:nth-child(2) {
            border-left: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
          }
        }

        @media (max-width: 900px) {
          .module-workspace-rail > div {
            display: block;
          }

          .module-workspace-rail > div > div:nth-child(2) {
            border-left: 0;
            border-right: 0;
          }
        }
      `}</style>
    </div>
  );
}
