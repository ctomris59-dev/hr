"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Database, KeyRound, LoaderCircle, Shield, Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import { clearAllHRData, getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { useNotifications } from "../../../context/NotificationContext";
import { applyFutureHRV1DemoData } from "../../../lib/hr/demoV1";
import { buildProductHealth } from "../../../lib/hr/productHealth";

function normalizeUsername(name: string) {
  return name.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]/g, "");
}

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function readDemoCoverage() {
  const organization = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
  const history = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
  const benchmarks = getStorageData<any[]>(STORAGE_KEYS.MARKET_BENCHMARKS, []);
  const development = getStorageData<any[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []);
  const training = getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
  const career = getStorageData<any[]>(STORAGE_KEYS.CAREER_PROFILES, []);
  const assessments = getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS, []);
  const candidates = getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []);
  const pulse = getStorageData<any[]>(STORAGE_KEYS.PULSE_ANSWERS, []);
  const leave = getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, []);
  const cycles = getStorageData<any[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []);
  const users = getStorageData<Record<string, any>>(STORAGE_KEYS.USERS, {});
  const activities = getStorageData<any[]>("hr_activities", []);
  const skills = getStorageData<any[]>("hr_skills", []);
  const succession = getStorageData<any[]>("hr_succession_plans", []);
  const currentPerformance = getStorageData<any[]>("hr_performance_entries", []);
  const profile = getStorageData<any>("hr_company_demo_profile", null);

  return {
    organization,
    history,
    benchmarks,
    development,
    training,
    career,
    assessments,
    candidates,
    pulse,
    leave,
    cycles,
    users,
    activities,
    skills,
    succession,
    currentPerformance,
    profile,
    compensationResults: Array.isArray(cycles?.[0]?.results) ? cycles[0].results.length : 0,
  };
}

function isComplete50PersonDemo(coverage: ReturnType<typeof readDemoCoverage>) {
  return coverage.profile?.demoVersion === "FHR-DEMO-50-1"
    && coverage.organization.length === 50
    && coverage.history.length === 100
    && coverage.currentPerformance.length === 50
    && coverage.benchmarks.length === 50
    && coverage.development.length === 49
    && coverage.training.length === 49
    && coverage.career.length === 49
    && coverage.assessments.length === 49
    && coverage.compensationResults === 49
    && coverage.candidates.length >= 24
    && coverage.pulse.length >= 392
    && Object.keys(coverage.users).length === 50
    && coverage.activities.length >= 64
    && coverage.skills.length >= 245
    && coverage.succession.length >= 6;
}

async function waitForCompleteDemo(timeoutMs = 2200) {
  const started = Date.now();
  let coverage = readDemoCoverage();
  while (!isComplete50PersonDemo(coverage) && Date.now() - started < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    coverage = readDemoCoverage();
  }
  return coverage;
}

export default function AdminPage() {
  const { showToast } = useNotifications();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PERSONEL");
  const [demoAction, setDemoAction] = useState<"generate" | "clear" | null>(null);
  const [demoMessage, setDemoMessage] = useState("");
  const [demoCoverage, setDemoCoverage] = useState<ReturnType<typeof readDemoCoverage> | null>(null);

  const reload = () => {
    setCurrentUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
    setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
    setUsers(getStorageData<Record<string, any>>(STORAGE_KEYS.USERS, {}));
    setDemoCoverage(readDemoCoverage());
  };

  useEffect(() => {
    reload();
    const refresh = () => reload();
    window.addEventListener("dataUpdated", refresh);
    window.addEventListener("demoCompany50Ready", refresh);
    window.addEventListener("performanceUpdated", refresh);
    return () => {
      window.removeEventListener("dataUpdated", refresh);
      window.removeEventListener("demoCompany50Ready", refresh);
      window.removeEventListener("performanceUpdated", refresh);
    };
  }, []);

  const currentRole = String(currentUser?.role || "").toUpperCase();
  const allowed = currentRole === "CEO" || currentRole === "IK" || process.env.NODE_ENV === "development";
  const accountNames = useMemo(() => new Set(Object.values(users).map((u: any) => u.name).filter(Boolean)), [users]);
  const withoutAccount = orgData.filter((employee) => !accountNames.has(employee["Ad Soyad"]));

  const selectEmployee = (name: string) => {
    setSelectedEmployee(name);
    const employee = orgData.find((item) => item["Ad Soyad"] === name);
    setUsername(`${normalizeUsername(name)}${Math.floor(1000 + Math.random() * 9000)}`);
    setPassword(randomPassword());
    const position = String(employee?.Pozisyon || "").toLocaleLowerCase("tr-TR");
    setRole(/direktör|director/.test(position) ? "DIRECTOR" : /müdür|manager|lider/.test(position) ? "MANAGER" : "PERSONEL");
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEmployee || !username || !password) return;
    if (users[username]) return showToast("Bu kullanıcı adı zaten var.", "error");
    const employee = orgData.find((item) => item["Ad Soyad"] === selectedEmployee);
    const next = {
      ...users,
      [username]: {
        username,
        password,
        name: selectedEmployee,
        role,
        dept: employee?.Departman || "",
        department: employee?.Departman || "",
        position: employee?.Pozisyon || "",
        employee_id: employee?.id,
        active: true,
        createdAt: new Date().toISOString(),
      },
    };
    setUsers(next);
    setStorageData(STORAGE_KEYS.USERS, next);
    showToast("Demo kullanıcı hesabı oluşturuldu.", "success");
    setSelectedEmployee("");
    setUsername("");
    setPassword("");
  };

  const toggle = (key: string) => {
    const next = { ...users, [key]: { ...users[key], active: users[key].active === false } };
    setUsers(next);
    setStorageData(STORAGE_KEYS.USERS, next);
  };

  const remove = (key: string) => {
    if (!confirm("Bu demo kullanıcı hesabı silinsin mi? Çalışan kaydı silinmez.")) return;
    const next = { ...users };
    delete next[key];
    setUsers(next);
    setStorageData(STORAGE_KEYS.USERS, next);
  };

  const handleGenerateDemo = async () => {
    if (!confirm("50 kişilik tam FutureHR şirket demosu oluşturulsun mu? Mevcut demo verileri yenilenecektir.")) return;
    setDemoAction("generate");
    setDemoMessage("50 kişilik şirket; tüm HR modülleri ve faaliyetleriyle hazırlanıyor…");
    try {
      clearAllHRData();
      applyFutureHRV1DemoData(currentUser);
      const coverage = await waitForCompleteDemo();
      if (!isComplete50PersonDemo(coverage)) {
        throw new Error(`Tam demo kapsamı oluşmadı: çalışan ${coverage.organization.length}/50, performans ${coverage.history.length}/100, güncel dönem ${coverage.currentPerformance.length}/50, gelişim ${coverage.development.length}/49, eğitim ${coverage.training.length}/49, pulse ${coverage.pulse.length}/392.`);
      }
      const health = buildProductHealth(coverage.organization, coverage.history, coverage.benchmarks);
      setOrgData(coverage.organization);
      setUsers(coverage.users);
      setDemoCoverage(coverage);
      setDemoMessage(`50 çalışanlık tam şirket demosu hazır · 100 performans kaydı · 49 gelişim planı · 49 eğitim ataması · 24 aday · ${coverage.pulse.length} pulse yanıtı · veri hazırlık skoru ${health.score}/100 (${health.band}).`);
      showToast("50 kişilik FutureHR demo şirketi tüm modülleriyle hazırlandı.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      console.error("Demo oluşturma hatası:", error);
      setDemoMessage(`Demo oluşturulamadı: ${message}`);
      showToast("Tam şirket demo verisi oluşturulamadı.", "error");
    } finally {
      setDemoAction(null);
    }
  };

  const handleClearDemo = async () => {
    if (!confirm("Demo verilerinin tamamı temizlenecek. Giriş oturumunuz korunur. Devam edilsin mi?")) return;
    setDemoAction("clear");
    setDemoMessage("Demo verileri temizleniyor…");
    try {
      clearAllHRData();
      setOrgData([]);
      setUsers({});
      setDemoCoverage(null);
      setDemoMessage("Demo verileri temizlendi; 50 kişilik şirket demosu yeniden kurulmaya hazır.");
      showToast("Demo verileri temizlendi.", "success");
      void fetch("/api/admin/clear-data", { method: "POST", headers: { "Content-Type": "application/json" } }).catch(() => null);
    } finally {
      setDemoAction(null);
    }
  };

  if (!allowed) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Kullanıcı, yetki ve demo şirket yönetimine yalnızca CEO / İK erişebilir.</div>;
  }

  const generating = demoAction === "generate";
  const clearing = demoAction === "clear";
  const complete = demoCoverage ? isComplete50PersonDemo(demoCoverage) : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-600">Hesap & demo şirket yönetişimi</p>
          <h1 className="mt-1 text-2xl font-semibold">Kullanıcı & Yetki Yönetimi</h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">FutureHR'ı boş ekranlarla değil, birbirine bağlı HR faaliyetleri olan gerçekçi 50 çalışanlı bir şirket senaryosuyla sunun.</p>
        </div>
        <Link href="/ayarlar/roller" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Shield className="mr-1 inline h-4 w-4" />Rol izin matrisi</Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm dark:border-indigo-900/70 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-indigo-100 bg-indigo-50/55 p-5 lg:flex-row lg:items-center lg:justify-between dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-indigo-200 bg-white p-2.5 text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300"><Building2 className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">50 Kişilik FutureHR Demo Şirketi</h2>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">Full-company</span>
                {complete && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" />Tam kapsam</span>}
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-400">Organizasyon, iki dönem performans ve yetkinlik, 9-Box, gelişim, eğitim, kariyer, halefiyet, ücret, işe alım, çalışan deneyimi, izinler, skills graph, riskler ve yönetim faaliyetleri aynı 50 çalışan kimliği üzerinden oluşturulur.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleGenerateDemo} disabled={demoAction !== null} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">{generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{generating ? "Demo Şirketi Kuruluyor…" : "50 Kişilik Demo Şirketi Oluştur"}</button>
            <button type="button" onClick={handleClearDemo} disabled={demoAction !== null} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300">{clearing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{clearing ? "Temizleniyor…" : "Demo Verilerini Temizle"}</button>
          </div>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-3">
          <DemoInfo label="1 · Şirketi kur" text="50 çalışan, 7 departman, yönetici zinciri, ücret ve organizasyon ana verisi tek tıkla hazırlanır." />
          <DemoInfo label="2 · Tüm modülleri doldur" text="100 performans kaydı, 49 gelişim planı, 49 eğitim ataması, kariyer/halefiyet, işe alım, pulse, izin ve ücret süreçleri oluşur." />
          <DemoInfo label="3 · Gerçek senaryo sun" text="64+ şirket faaliyeti, 245 skills bağlantısı, riskler, AI audit ve farklı karar durumları sayesinde ekranlar boş kalmaz." />
        </div>

        {demoCoverage && demoCoverage.organization.length > 0 && (
          <div className="grid gap-2 border-t border-slate-100 px-5 py-4 sm:grid-cols-3 xl:grid-cols-6 dark:border-slate-800">
            <CoverageStat label="Çalışan" value={`${demoCoverage.organization.length}/50`} good={demoCoverage.organization.length === 50} />
            <CoverageStat label="Performans" value={`${demoCoverage.history.length}/100`} good={demoCoverage.history.length === 100} />
            <CoverageStat label="Gelişim" value={`${demoCoverage.development.length}/49`} good={demoCoverage.development.length === 49} />
            <CoverageStat label="Eğitim" value={`${demoCoverage.training.length}/49`} good={demoCoverage.training.length === 49} />
            <CoverageStat label="Aday" value={`${demoCoverage.candidates.length}/24`} good={demoCoverage.candidates.length >= 24} />
            <CoverageStat label="Pulse" value={`${demoCoverage.pulse.length}/392`} good={demoCoverage.pulse.length >= 392} />
          </div>
        )}
        {demoMessage && <div className="border-t border-slate-100 px-5 py-3 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">{demoMessage}</div>}
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        <strong>Demo güvenlik notu:</strong> Demo kullanıcı hesapları tarayıcı verisinde tutulur. Production/SaaS modunda parola ve yetki doğrulaması sunucu tarafındaki secure auth/tenant katmanında kalır.
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-slate-700 dark:text-slate-300" /><h2 className="text-sm font-semibold">Çalışana demo hesabı ata</h2></div>
          <div className="mt-4 space-y-3">
            <select value={selectedEmployee} onChange={(event) => selectEmployee(event.target.value)} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">Çalışan seçin</option>{withoutAccount.map((employee) => <option key={employee.id ?? employee["Ad Soyad"]}>{employee["Ad Soyad"]}</option>)}</select>
            <label className="block text-xs font-medium text-slate-500">Kullanıcı adı<input value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
            <label className="block text-xs font-medium text-slate-500">Geçici parola<div className="mt-1 flex gap-2"><input value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" /><button type="button" onClick={() => setPassword(randomPassword())} className="rounded-xl border border-slate-200 px-3 dark:border-slate-700" aria-label="Yeni parola oluştur"><KeyRound className="h-4 w-4" /></button></div></label>
            <label className="block text-xs font-medium text-slate-500">Rol<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option>PERSONEL</option><option>MANAGER</option><option>DIRECTOR</option><option>IK</option></select></label>
            <button className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Hesabı oluştur</button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-600 dark:text-slate-400" /><h2 className="text-sm font-semibold">Demo kullanıcı hesapları</h2></div><span className="text-xs text-slate-400">{Object.keys(users).length} hesap</span></div>
          <div className="max-h-[520px] overflow-auto"><table className="w-full"><thead><tr><th>Çalışan</th><th>Kullanıcı</th><th>Rol</th><th>Departman</th><th>Durum</th><th></th></tr></thead><tbody>{Object.entries(users).map(([key, user]: any) => <tr key={key}><td>{user.name || "—"}</td><td className="font-mono text-xs">{key}</td><td>{user.role || "—"}</td><td>{user.dept || user.department || "—"}</td><td><button type="button" onClick={() => toggle(key)} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${user.active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{user.active === false ? "Pasif" : "Aktif"}</button></td><td className="text-right"><button type="button" onClick={() => remove(key)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`${user.name || key} hesabını sil`}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
        </div>
      </div>
    </div>
  );
}

function DemoInfo({ label, text }: { label: string; text: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-600 dark:text-indigo-400">{label}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{text}</p></div>;
}

function CoverageStat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <div className={`rounded-xl border px-3 py-2 ${good ? "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20" : "border-amber-100 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20"}`}><p className="text-[9px] font-semibold uppercase tracking-[.08em] text-slate-500">{label}</p><div className="mt-1 flex items-center gap-1.5"><span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>{good && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}</div></div>;
}
