import { getStorageData, markHRDataActive, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";

const COMP_CODES = ["DIG", "ANA", "RES", "DET", "LRN", "ETH", "DIS", "STR", "TEA", "COM"] as const;

function round2(value: number) { return Math.round(value * 100) / 100; }
function clamp5(value: number) { return Math.max(1, Math.min(5, value)); }
function isoDateMonthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}
function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
function previousWeekKey(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() - offset * 7);
  return isoWeek(date);
}

function competencyScores(seed: number, period: number) {
  return Object.fromEntries(COMP_CODES.map((code, index) => {
    const wave = ((seed * 7 + index * 3 + period * 2) % 15) / 10;
    return [code, round2(clamp5(3.1 + wave))];
  }));
}

function performanceScores(seed: number, period: number) {
  const kpi = round2(clamp5(3.25 + ((seed * 5 + period * 4) % 15) / 10));
  const manager = round2(clamp5(kpi + (((seed + period) % 5) - 2) * 0.12));
  const final = round2(kpi * 0.6 + manager * 0.4);
  return { kpi, manager, final };
}

function roleSalary(position: string, level: number) {
  const base = /müdür|manager/i.test(position) ? 105000 : /kıdemli|senior|lider/i.test(position) ? 82000 : 62000;
  return Math.round((base + level * 4500) / 500) * 500;
}

export interface FutureHRV1DemoData {
  organization: any[];
  history360: any[];
  benchmarks: any[];
  developmentPlans: any[];
  trainingAssignments: any[];
  candidates: any[];
  pulseAnswers: any[];
}

export function buildFutureHRV1DemoData(currentUser?: any): FutureHRV1DemoData {
  const role = String(currentUser?.role || "").toUpperCase();
  const executiveName = role === "CEO" && currentUser?.name ? String(currentUser.name) : "Mert Demir";
  const hrManagerName = role === "IK" && currentUser?.name ? String(currentUser.name) : "Selin Acar";

  const teams = [
    { department: "İnsan Kaynakları", manager: hrManagerName, managerPosition: "İnsan Kaynakları Müdürü", staff: [["Derya Yalçın", "İnsan Kaynakları Uzmanı"], ["Emre Koç", "Bordro Uzmanı"], ["Melis Özkan", "İşe Alım Uzmanı"], ["Burak Şen", "Eğitim ve Gelişim Uzmanı"]] },
    { department: "Finans & Muhasebe", manager: "Onur Kaya", managerPosition: "Finans Müdürü", staff: [["Gizem Arslan", "Finans Uzmanı"], ["Kerem Güneş", "Muhasebe Uzmanı"], ["Ece Tunç", "Bütçe ve Raporlama Uzmanı"], ["Tolga Yıldız", "Finans Analisti"]] },
    { department: "Satış & Pazarlama", manager: "Aslı Özer", managerPosition: "Satış Müdürü", staff: [["Can Polat", "Satış Uzmanı"], ["İrem Aksoy", "Pazarlama Uzmanı"], ["Bora Ergin", "Kilit Müşteri Yöneticisi"], ["Nazlı Erdem", "CRM Uzmanı"]] },
    { department: "Operasyon & Üretim", manager: "Hakan Çetin", managerPosition: "Üretim Müdürü", staff: [["Pelin Yılmaz", "Üretim Mühendisi"], ["Oğuz Kılıç", "Kalite Uzmanı"], ["Cemre Uysal", "Süreç Geliştirme Uzmanı"], ["Kaan Dinç", "Operasyon Uzmanı"]] },
    { department: "BT & Dijital", manager: "Deniz Şahin", managerPosition: "Bilgi Teknolojileri Müdürü", staff: [["Arda Eren", "Yazılım Uzmanı"], ["Elif Başar", "Veri Analisti"], ["Mertcan Işık", "Siber Güvenlik Uzmanı"], ["Seda Çakır", "Dijital Dönüşüm Uzmanı"]] },
    { department: "Proje & İş Geliştirme", manager: "Berk Aydın", managerPosition: "Proje Müdürü", staff: [["Nehir Keskin", "Proje Uzmanı"], ["Umut Karaca", "İş Geliştirme Uzmanı"], ["Zeynep Ekin", "Sürdürülebilirlik Uzmanı"], ["Alp Tekin", "Araştırma Uzmanı"]] },
  ] as const;

  const organization: any[] = [{
    id: "P001", "Ad Soyad": executiveName, Departman: "Genel Yönetim", Pozisyon: "Genel Müdür",
    "İşe Giriş Tarihi": "2018-01-15", "Maaş (TL)": 185000,
  }];

  let personIndex = 2;
  teams.forEach((team, teamIndex) => {
    organization.push({
      id: `P${String(personIndex++).padStart(3, "0")}`,
      "Ad Soyad": team.manager,
      Departman: team.department,
      Pozisyon: team.managerPosition,
      "Yönetici 1": executiveName,
      "İşe Giriş Tarihi": `20${18 + (teamIndex % 4)}-0${(teamIndex % 8) + 1}-15`,
      "Maaş (TL)": roleSalary(team.managerPosition, teamIndex + 5),
    });
    team.staff.forEach(([name, position], staffIndex) => organization.push({
      id: `P${String(personIndex++).padStart(3, "0")}`,
      "Ad Soyad": name,
      Departman: team.department,
      Pozisyon: position,
      "Yönetici 1": team.manager,
      "Yönetici 2": executiveName,
      "İşe Giriş Tarihi": `20${20 + ((teamIndex + staffIndex) % 5)}-${String(((staffIndex * 2 + teamIndex) % 11) + 1).padStart(2, "0")}-10`,
      "Maaş (TL)": roleSalary(position, teamIndex + staffIndex),
    }));
  });

  const history360: any[] = [];
  organization.forEach((person, index) => {
    [1, 0].forEach((period) => {
      const perf = performanceScores(index + 1, period);
      const scores = competencyScores(index + 1, period);
      const competency = round2(Object.values(scores).reduce((sum: number, value: any) => sum + Number(value), 0) / COMP_CODES.length);
      history360.push({
        id: `eval-${person.id}-${period}`,
        employee_id: person.id,
        Personel: person["Ad Soyad"],
        evaluator: person["Yönetici 1"] || "Yönetim Kurulu",
        evaluation_type: "FutureHR V1 Demo",
        date: isoDateMonthsAgo(period ? 7 : 1),
        performance_model_version: "FHR-PERF-2.1",
        kpi_items: [
          { id: "kpi-1", title: "Ana hedef / çıktı", weight: 35, score: perf.kpi },
          { id: "kpi-2", title: "Kalite / doğruluk", weight: 25, score: round2(clamp5(perf.kpi - 0.1)) },
          { id: "kpi-3", title: "Zaman / verimlilik", weight: 20, score: round2(clamp5(perf.kpi + 0.1)) },
          { id: "kpi-4", title: "İşbirliği / müşteri çıktısı", weight: 20, score: perf.manager },
        ],
        kpi_score: perf.kpi,
        manager_performance_score: perf.manager,
        performance_weights: { kpi: 0.6, manager: 0.4 },
        Performans: perf.final,
        competency_score: competency,
        manager_scores: scores,
        career_aspiration: period === 0 ? 3 + ((index + 1) % 3) : undefined,
        mobility_willingness: period === 0 ? 3 + ((index + 2) % 3) : undefined,
        note: period === 0 ? "Somut hedef çıktıları ve rol davranışlarıyla birlikte kalibrasyonda değerlendirildi." : "Önceki dönem ölçümü.",
        is_star_performer: period === 0 && perf.final >= 4.55 && index % 3 === 0,
      });
    });
  });

  const benchmarks = organization.map((person, index) => ({
    id: `bench-${index + 1}`,
    Departman: person.Departman,
    Pozisyon: person.Pozisyon,
    "Piyasa Ortalaması": Math.round((Number(person["Maaş (TL)"]) * (1.05 + (index % 4) * 0.025)) / 500) * 500,
    source: "FutureHR V1 demo piyasa referansı",
    updatedAt: new Date().toISOString(),
  }));

  const developmentPlans = organization.slice(3, 13).map((person, index) => ({
    id: `dev-${person.id}`,
    employee: person["Ad Soyad"],
    employee_id: person.id,
    competency: COMP_CODES[index % COMP_CODES.length],
    actionType: index % 3 === 0 ? "Stretch Assignment" : index % 3 === 1 ? "Mentorluk" : "Proje",
    action: index % 3 === 0 ? "Fonksiyonlar arası iyileştirme çalışmasında sorumluluk al" : index % 3 === 1 ? "Aylık mentor görüşmesi ve saha gözlemi" : "Ölçülebilir çıktı üreten gelişim projesi",
    progress: index < 2 ? 45 : 70 + (index % 3) * 10,
    status: "Devam Ediyor",
    dueDate: index === 0 ? isoDateMonthsAgo(1).slice(0, 10) : isoDateMonthsAgo(-2).slice(0, 10),
  }));

  const trainingAssignments = organization.slice(6, 18).map((person, index) => ({
    id: `training-${person.id}`,
    employee: person["Ad Soyad"],
    title: index % 2 ? "Veriyle Karar Verme" : "Etkili Geri Bildirim",
    status: index % 4 === 0 ? "Tamamlandı" : "Atandı",
    progress: index % 4 === 0 ? 100 : 20 + (index % 3) * 25,
    deadline: isoDateMonthsAgo(-1).slice(0, 10),
  }));

  const candidates = [
    ["Ece Kaya", "İşe Alım Uzmanı", "Mülakat"], ["Buse Yaman", "Finans Uzmanı", "Test"],
    ["Ali Rıza Akın", "Yazılım Uzmanı", "Mülakat"], ["Mina Kurt", "Satış Uzmanı", "Ön Eleme"],
    ["Doruk Sezer", "Üretim Mühendisi", "Teklif"], ["Leyla Sönmez", "Proje Uzmanı", "Başvuru"],
  ].map(([name, position, stage], index) => ({ id: `cand-${index + 1}`, name, position, stage, source: index % 2 ? "Kariyer sitesi" : "Referans", createdAt: isoDateMonthsAgo(0) }));

  const pulseAnswers: any[] = [];
  const driverKeys = ["workload", "energy", "manager_support", "role_clarity", "growth"];
  [3, 2, 1, 0].forEach((weekOffset) => {
    const week = previousWeekKey(weekOffset);
    organization.filter((person) => person.Departman !== "Genel Yönetim").forEach((person, index) => {
      const base = 7 + ((index + weekOffset) % 4) * 0.5;
      const d1 = driverKeys[(weekOffset * 2) % driverKeys.length];
      const d2 = driverKeys[(weekOffset * 2 + 1) % driverKeys.length];
      pulseAnswers.push({
        id: `pulse-${week}-${person.id}`,
        user_name: person["Ad Soyad"],
        department_id: person.Departman,
        department: person.Departman,
        week_number: week,
        score: Math.min(10, Math.round(base)),
        drivers: { [d1]: 3 + ((index + weekOffset) % 3), [d2]: 3 + ((index + weekOffset + 1) % 3) },
        feedback: "",
        created_at: new Date().toISOString(),
        source: "futurehr-demo",
      });
    });
  });

  return { organization, history360, benchmarks, developmentPlans, trainingAssignments, candidates, pulseAnswers };
}

export function applyFutureHRV1DemoData(currentUser?: any): FutureHRV1DemoData {
  const user = currentUser || getStorageData(STORAGE_KEYS.CURRENT_USER, null);
  const data = buildFutureHRV1DemoData(user);
  setStorageData(STORAGE_KEYS.ORG_CHART, data.organization);
  setStorageData(STORAGE_KEYS.HISTORY_360, data.history360);
  setStorageData(STORAGE_KEYS.MARKET_BENCHMARKS, data.benchmarks);
  setStorageData(STORAGE_KEYS.DEVELOPMENT_PLANS, data.developmentPlans);
  setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, data.trainingAssignments);
  setStorageData(STORAGE_KEYS.CANDIDATES, data.candidates);
  setStorageData(STORAGE_KEYS.PULSE_ANSWERS, data.pulseAnswers);
  localStorage.removeItem("hr_talent_matrix");
  markHRDataActive();
  window.dispatchEvent(new CustomEvent("dataUpdated"));
  window.dispatchEvent(new CustomEvent("talentMatrixUpdated"));
  window.dispatchEvent(new CustomEvent("pulseUpdated"));
  return data;
}
