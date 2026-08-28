import { resolveTargetProfile } from "../../lib/hr/careerArchitecture";

// Salary Simulation Utilities - FutureHR compensation decision support

export interface EmployeeData {
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Mevcut Maaş": number;
  Performans: number;
  Potansiyel: number;
  Yetkinlik: number | null;
  Rol_Uyumu: number | null;
  Calisma_Yili: number;
  Profil: string;
  "Piyasa Ortalaması"?: number;
  manager_proposal?: number;
  manager_note?: string;
  is_star_performer?: boolean;
}

export interface SimulationResult {
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  Profil: string;
  Performans: number;
  Potansiyel: number;
  Yetkinlik: number | null;
  Rol_Uyumu: number | null;
  Calisma_Yili: number;
  "Mevcut Maaş": number;
  "Yeni Maaş": number;
  "Zam Tutarı": number;
  "Zam Oranı (%)": number;
  "Zam Açıklaması": string;
  "Yetkinlik Etkisi (puan)": number;
  "Eski_CR": number;
  "Yeni_CR": number;
  "Eski Risk": string;
  "Yeni Risk": string;
  "Risk Mesafesi": string;
  "Piyasa_Gelecek": number;
  "Yıllık Bonus (TL)": number;
  "Bonus Oranı (%)": number;
  is_star_performer?: boolean;
}

export interface MarketReference {
  Departman: string;
  Pozisyon: string;
  "Piyasa Ortalaması": number;
}

const COMPETENCY_LABEL_TO_CODE: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG",
  "Analitik Düşünme": "ANA",
  "Sonuç Odaklılık": "RES",
  "Detaylara Özen": "DET",
  "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH",
  "Öz-Disiplin": "DIS",
  "Dayanıklılık & Stres Yönetimi": "STR",
  "Takım Çalışması": "TEA",
  "İletişim Becerileri": "COM",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

function numericScore(value: unknown): number | null {
  const score = Number(value);
  return Number.isFinite(score) && score >= 1 && score <= 5 ? score : null;
}

function evaluationCompetencyScore(evaluation: any, row: any): number | null {
  const direct = numericScore(
    evaluation?.competency_score ??
    evaluation?.Yetkinlik ??
    evaluation?.yetkinlik ??
    row?.competency_score ??
    row?.Yetkinlik ??
    row?.yetkinlik
  );
  if (direct !== null) return direct;

  const scores = evaluation?.manager_scores;
  if (!scores || typeof scores !== "object") return null;
  const values = Object.values(scores).map(numericScore).filter((value): value is number => value !== null);
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function roleFitScore(position: string, evaluation: any): number | null {
  const target = resolveTargetProfile(position).profile;
  const scores = evaluation?.manager_scores;
  if (!scores || typeof scores !== "object" || !Object.keys(target).length) return null;

  let total = 0;
  let count = 0;
  Object.entries(target).forEach(([label, expectedValue]) => {
    const expected = Number(expectedValue);
    const code = COMPETENCY_LABEL_TO_CODE[label] || label;
    const actual = numericScore(scores[code] ?? scores[label]);
    if (actual === null || !Number.isFinite(expected) || expected <= 0) return;
    total += clamp((actual / expected) * 100, 0, 120);
    count += 1;
  });

  if (!count) return null;
  return Math.round(total / count);
}

/**
 * Yetkinlik ve rol uyumu mevcut ücret stratejisini bozmadan küçük bir merit sinyali üretir.
 * Performans zaten çalışan segmentinde ayrıca kullanıldığı için bu düzeltme ±2 puan ile sınırlıdır.
 */
export function getCompetencyMeritModifier(competency: number | null, roleFit: number | null): number {
  if (competency === null && roleFit === null) return 0;
  let modifier = 0;

  if (roleFit !== null) {
    if (roleFit >= 100) modifier += 1.5;
    else if (roleFit >= 90) modifier += 1.0;
    else if (roleFit >= 80) modifier += 0.5;
    else if (roleFit < 65) modifier -= 1.5;
    else if (roleFit < 75) modifier -= 0.5;
  }

  if (competency !== null) {
    if (competency >= 4.5) modifier += 0.5;
    else if (competency < 3.0) modifier -= 0.5;
  }

  return round1(clamp(modifier, -2, 2));
}

// --- 1. KIDEM TAVANI (CR CAP - Hedef Çarpanlar) ---
export function getTenureMaxCap(years: number): number {
  const y = years || 1.0;
  if (y <= 2) return 0.75;
  if (y <= 4) return 0.90;
  if (y <= 9) return 1.00;
  if (y <= 14) return 1.25;
  if (y <= 19) return 1.35;
  return 1.50;
}

// --- 2. PROFİL MATRİSİ ---
export function getEmployeeSegment(perf: number, pot: number, tenure: number): string {
  if (perf >= 4.5 && pot >= 4.0) return "🌟 YILDIZ";
  if (perf >= 4.5 && pot >= 3.0 && pot < 4.0) return "🚀 YÜKSEK PERFORMANS";
  if (perf >= 4.5 && pot < 3.0) return "⚡ PERFORMANS";
  if (perf >= 4.0 && perf < 4.5 && pot >= 4.0) {
    if (tenure <= 5) return "🛡️ KİLİT OYUNCU";
    return "⚓ KIDEMLİ KİLİT OYUNCU";
  }
  if (perf >= 4.0 && perf < 4.5 && pot >= 3.0 && pot < 4.0) return "⚖️ STANDART";
  if (perf >= 4.0 && perf < 4.5 && pot < 3.0) return "🌱 GELİŞTİRİLEBİLİR";
  if (perf >= 3.5 && perf < 4.0 && pot >= 3.0 && pot < 4.0) return "📉 VASAT PERFORMANS";
  if (perf >= 3.5 && perf < 4.0 && pot < 3.0) return "⚠️ DÜŞÜK PERFORMANS";
  if (perf < 3.5 && pot >= 4.0) return "💎 POTANSİYEL YATIRIMI";
  return "⛔ KRİTİK ALTI";
}

// --- 3. DURUM ANALİZİ ---
export function analyzeStrategicStatus(cr: number, tenure: number): string {
  const limit = getTenureMaxCap(tenure);
  if (cr > limit + 0.02) return `🔵 Limit Üstü (> ${limit})`;
  if (tenure > 2 && cr < 0.80) return "🟠 Kritik Düşük";
  if (cr < (limit - 0.15)) return `🟡 Alt Bant`;
  return "🟢 Dengeli";
}

// --- 4. VERİ YÜKLEME VE İŞLEME ---
export function processEmployeeData(orgData: any[], data360: any[]): EmployeeData[] {
  const result: EmployeeData[] = [];
  const data360Map = new Map<string, any>();
  data360.forEach((item: any) => {
    const name = item.target || item.Personel || item["Ad Soyad"];
    if (name) data360Map.set(name, item);
  });

  orgData.forEach((row: any) => {
    const name = row["Ad Soyad"] || "Bilinmeyen";
    const dept = row.Departman || "Genel";
    const pos = row.Pozisyon || "Personel";
    const data360Item = data360Map.get(name);

    let perf = 3.0;
    let pot = 3.0;
    if (data360Item) {
      perf = parseFloat(data360Item.Performans || data360Item.performans || perf);
      pot = parseFloat(data360Item.Potansiyel || data360Item.potansiyel || pot);
    }
    if (perf === 3.0) perf = parseFloat(row.Performans || row.performans || "3.0");
    if (pot === 3.0) pot = parseFloat(row.Potansiyel || row.potansiyel || "3.0");

    let maas = 45000.0;
    if (row["Maaş (TL)"]) maas = parseFloat(row["Maaş (TL)"]) || 45000;
    else if (row.Maaş) maas = parseFloat(String(row.Maaş).replace(/[.,₺\s]/g, "")) || 45000;

    let tenure = 1.0;
    if (row.Calisma_Yili) tenure = parseFloat(row.Calisma_Yili) || 1.0;
    else if (row["Kıdem (Yıl)"]) tenure = parseFloat(row["Kıdem (Yıl)"]) || 1.0;
    else {
      const tenureStr = String(row.kıdem || row.kidem || row.calisma || "1");
      const match = tenureStr.match(/\d+\.?\d*/);
      if (match) tenure = parseFloat(match[0]);
    }

    const competency = evaluationCompetencyScore(data360Item, row);
    const roleFit = roleFitScore(pos, data360Item);
    const isStarPerformer = data360Item?.is_star_performer || false;

    result.push({
      "Ad Soyad": name,
      Departman: dept,
      Pozisyon: pos,
      "Mevcut Maaş": maas,
      Performans: perf,
      Potansiyel: pot,
      Yetkinlik: competency,
      Rol_Uyumu: roleFit,
      Calisma_Yili: tenure,
      Profil: getEmployeeSegment(perf, pot, tenure),
      manager_proposal: row.manager_proposal ? parseFloat(row.manager_proposal) : undefined,
      manager_note: row.manager_note || undefined,
      is_star_performer: isStarPerformer,
    });
  });

  return result;
}

// --- 5. BENCHMARK YÖNETİMİ ---
export function calculateMarketAverages(employees: EmployeeData[]): MarketReference[] {
  const grouped = new Map<string, { total: number; count: number }>();
  employees.forEach((emp) => {
    const key = `${emp.Departman}|${emp.Pozisyon}`;
    const existing = grouped.get(key) || { total: 0, count: 0 };
    grouped.set(key, { total: existing.total + emp["Mevcut Maaş"], count: existing.count + 1 });
  });

  const result: MarketReference[] = [];
  grouped.forEach((value, key) => {
    const [dept, pos] = key.split("|");
    const avg = Math.round(value.total / value.count / 100) * 100;
    result.push({ Departman: dept, Pozisyon: pos, "Piyasa Ortalaması": avg || 45000 });
  });
  return result;
}

// --- 6. SENARYO HESAPLAMA MOTORU ---
interface BudgetRequest {
  employee_id: string;
  requested_rate: number;
  status: "Taslak" | "Gönderildi";
}

export function runScenarioLogic(
  employees: EmployeeData[],
  marketRefs: MarketReference[],
  inflationRate: number,
  mode: "A" | "B" | "C" | "D" = "A",
  budgetRequests?: BudgetRequest[]
): SimulationResult[] {
  const marketMap = new Map<string, number>();
  marketRefs.forEach((ref) => marketMap.set(`${ref.Departman}|${ref.Pozisyon}`, ref["Piyasa Ortalaması"]));

  return employees.map((emp) => {
    const marketKey = `${emp.Departman}|${emp.Pozisyon}`;
    const baseMarket = marketMap.get(marketKey) || 45000;
    const futureMarket = baseMarket * (1 + inflationRate / 100.0);
    const current = emp["Mevcut Maaş"];
    const profile = emp.Profil;
    const tenure = emp.Calisma_Yili;
    const capCR = getTenureMaxCap(tenure);
    const maxAllowedSalary = futureMarket * capCR;
    const oldCR = current / futureMarket;
    const oldRisk = analyzeStrategicStatus(oldCR, tenure);
    const competencyModifier = getCompetencyMeritModifier(emp.Yetkinlik, emp.Rol_Uyumu);

    let raisePct = 0.0;
    let potentialSalary = current;
    let logicDesc = "";
    const starPerformerBonus = emp.is_star_performer ? 10.0 : 0.0;

    if (mode === "A") {
      if (profile === "💎 POTANSİYEL YATIRIMI") { raisePct = inflationRate * 0.50; logicDesc = "Enf/2 (Riskli)"; }
      else if (profile === "⚠️ DÜŞÜK PERFORMANS") { raisePct = inflationRate * 0.25; logicDesc = "%25 Enf"; }
      else if (profile === "📉 VASAT PERFORMANS") { raisePct = inflationRate * 0.50; logicDesc = "Enf/2"; }
      else if (profile === "🌱 GELİŞTİRİLEBİLİR") { raisePct = inflationRate * 0.75; logicDesc = "%75 Enf"; }
      else if (profile === "⚖️ STANDART") { raisePct = inflationRate; logicDesc = "Tam Enf"; }
      else if (profile === "🛡️ KİLİT OYUNCU") { raisePct = inflationRate + 2.0; logicDesc = "Enf+Düşük Prim"; }
      else if (["⚓ KIDEMLİ KİLİT OYUNCU", "⚡ PERFORMANS", "🚀 YÜKSEK PERFORMANS"].includes(profile)) { raisePct = inflationRate + 5.0; logicDesc = "Enf+Std Prim"; }
      else if (profile === "🌟 YILDIZ") { raisePct = inflationRate + 10.0; logicDesc = "Enf+Yüksek Prim"; }
      else { raisePct = 0.0; logicDesc = "0 Zam"; }
      potentialSalary = current * (1 + raisePct / 100.0);
    } else if (mode === "B") {
      let tempRaise = inflationRate;
      if (profile.includes("DÜŞÜK") || profile.includes("VASAT") || profile.includes("KRİTİK")) tempRaise = inflationRate * 0.5;
      const testSalary = current * (1 + tempRaise / 100.0);
      const valuableProfiles = ["🛡️ KİLİT OYUNCU", "⚓ KIDEMLİ KİLİT OYUNCU", "⚡ PERFORMANS", "🚀 YÜKSEK PERFORMANS", "🌟 YILDIZ"];

      if (valuableProfiles.includes(profile)) {
        let aggressiveRaise = profile === "🛡️ KİLİT OYUNCU" ? inflationRate + 2.0 : profile === "🌟 YILDIZ" ? inflationRate + 10.0 : inflationRate + 5.0;
        const salaryWithPremium = current * (1 + aggressiveRaise / 100.0);
        if (salaryWithPremium < maxAllowedSalary) {
          potentialSalary = maxAllowedSalary;
          logicDesc = `Alt Banttan Kurtarma (Hedef CR ${capCR})`;
        } else {
          aggressiveRaise += starPerformerBonus;
          potentialSalary = current * (1 + aggressiveRaise / 100.0);
          logicDesc = `Yüksek Primli Zam (%${aggressiveRaise.toFixed(1)}${starPerformerBonus > 0 ? " 🌟+10%" : ""})`;
        }
      } else {
        tempRaise += starPerformerBonus;
        potentialSalary = current * (1 + tempRaise / 100.0);
        logicDesc = `Standart/Düşük Zam (%${tempRaise.toFixed(1)}${starPerformerBonus > 0 ? " 🌟+10%" : ""})`;
      }
      if (starPerformerBonus > 0 && potentialSalary === testSalary) potentialSalary = current * (1 + (tempRaise + starPerformerBonus) / 100.0);
    } else if (mode === "C") {
      const minimumCR = 0.80;
      const minimumSalary = futureMarket * minimumCR;
      if (oldCR < 0.80) {
        potentialSalary = minimumSalary;
        logicDesc = `Hibrit: Kırmızı Bölgeden Minimum Seviyeye (${minimumCR} CR)`;
      } else if (oldCR < 1.0) {
        const valuableProfiles = ["🛡️ KİLİT OYUNCU", "⚓ KIDEMLİ KİLİT OYUNCU", "⚡ PERFORMANS", "🚀 YÜKSEK PERFORMANS", "🌟 YILDIZ"];
        if (valuableProfiles.includes(profile)) {
          raisePct = inflationRate + 2.0;
          logicDesc = `Hibrit: Değerli Personel - Kademeli İyileştirme (%${raisePct.toFixed(1)})`;
        } else {
          raisePct = inflationRate;
          logicDesc = "Hibrit: Standart - Tam Enflasyon";
        }
        potentialSalary = current * (1 + raisePct / 100.0);
      } else if (oldCR <= 1.30) {
        if (profile === "🌟 YILDIZ") { raisePct = inflationRate + 3.0; logicDesc = "Hibrit: Yıldız - Kontrollü Prim"; }
        else if (profile === "🚀 YÜKSEK PERFORMANS" || profile === "⚡ PERFORMANS") { raisePct = inflationRate + 2.0; logicDesc = "Hibrit: Yüksek Performans - Kontrollü Prim"; }
        else if (profile === "🛡️ KİLİT OYUNCU" || profile === "⚓ KIDEMLİ KİLİT OYUNCU") { raisePct = inflationRate + 1.0; logicDesc = "Hibrit: Kilit Oyuncu - Hafif Prim"; }
        else if (profile === "⚖️ STANDART") { raisePct = inflationRate; logicDesc = "Hibrit: Standart - Tam Enflasyon"; }
        else { raisePct = inflationRate * 0.75; logicDesc = "Hibrit: Düşük Performans - %75 Enflasyon"; }
        raisePct += starPerformerBonus;
        if (starPerformerBonus > 0) logicDesc += " 🌟+10%";
        potentialSalary = current * (1 + raisePct / 100.0);
      } else {
        raisePct = inflationRate + starPerformerBonus;
        potentialSalary = current * (1 + inflationRate / 100.0);
        logicDesc = "Hibrit: Üst Bant - Sadece Enflasyon";
      }
    } else {
      const budgetRequest = budgetRequests?.find((request) => request.employee_id === emp["Ad Soyad"]);
      if (budgetRequest && budgetRequest.requested_rate > 0) {
        raisePct = budgetRequest.requested_rate;
        logicDesc = `Yönetici Talebi (%${raisePct.toFixed(1)})`;
      } else {
        raisePct = inflationRate;
        logicDesc = `Varsayılan Enflasyon (%${inflationRate.toFixed(1)})`;
      }
      raisePct += starPerformerBonus;
      if (starPerformerBonus > 0) logicDesc += " 🌟+10%";
      potentialSalary = current * (1 + raisePct / 100.0);
    }

    if (mode !== "D" && oldCR >= 0.80 && potentialSalary > current && competencyModifier !== 0) {
      const baseRaise = ((potentialSalary / current) - 1) * 100;
      const adjustedRaise = Math.max(0, baseRaise + competencyModifier);
      potentialSalary = current * (1 + adjustedRaise / 100);
      logicDesc += ` · Yetkinlik/Rol ${competencyModifier > 0 ? "+" : ""}${competencyModifier.toFixed(1)} puan`;
    }

    let finalSalary = potentialSalary;
    let explanation = logicDesc;
    if (potentialSalary > maxAllowedSalary) {
      if (current > maxAllowedSalary) {
        finalSalary = current;
        explanation = `Limit Üstü (${capCR} CR) - Dondurma`;
      } else {
        finalSalary = maxAllowedSalary;
        explanation = `${logicDesc} (Limitlendi: ${capCR} CR)`;
      }
    }

    const newSalary = Math.ceil(finalSalary / 100) * 100;
    const raiseAmount = newSalary - current;
    const raisePercentage = current > 0 ? (raiseAmount / current) * 100 : 0;
    const newCR = newSalary / futureMarket;
    const newRisk = analyzeStrategicStatus(newCR, tenure);

    let riskDistance = "-";
    const targetEntryPoint = capCR - 0.20;
    if (tenure > 2 && newCR < 0.80) riskDistance = `📉 -%${((0.80 - newCR) * 100).toFixed(1)} (Genel)`;
    else if (newCR < targetEntryPoint) riskDistance = `📉 -%${((targetEntryPoint - newCR) * 100).toFixed(1)} (Kendi)`;

    let bonusPercentage = 0;
    if (emp.Performans >= 4.5) bonusPercentage = 15;
    else if (emp.Performans >= 4.0) bonusPercentage = 10;
    else if (emp.Performans >= 3.5) bonusPercentage = 5;
    const annualBonus = Math.round((newSalary * bonusPercentage) / 100);

    return {
      "Ad Soyad": emp["Ad Soyad"],
      Departman: emp.Departman,
      Pozisyon: emp.Pozisyon,
      Profil: emp.Profil,
      is_star_performer: emp.is_star_performer || false,
      Performans: emp.Performans,
      Potansiyel: emp.Potansiyel,
      Yetkinlik: emp.Yetkinlik,
      Rol_Uyumu: emp.Rol_Uyumu,
      Calisma_Yili: emp.Calisma_Yili,
      "Mevcut Maaş": current,
      "Yeni Maaş": newSalary,
      "Zam Tutarı": raiseAmount,
      "Zam Oranı (%)": raisePercentage,
      "Zam Açıklaması": explanation,
      "Yetkinlik Etkisi (puan)": competencyModifier,
      "Eski_CR": oldCR,
      "Yeni_CR": newCR,
      "Eski Risk": oldRisk,
      "Yeni Risk": newRisk,
      "Risk Mesafesi": riskDistance,
      "Piyasa_Gelecek": futureMarket,
      "Yıllık Bonus (TL)": annualBonus,
      "Bonus Oranı (%)": bonusPercentage,
    };
  });
}

// --- 7. ENFLASYON/KUR SİMÜLASYONU ---
export interface CurrencySimulationResult {
  dollarIncrease: number;
  estimatedInflation: number;
  currentTotalSalary: number;
  newTotalSalary: number;
  salaryIncrease: number;
  salaryIncreasePercentage: number;
  monthlyIncrease: number;
  yearlyIncrease: number;
  scenarioResults: {
    A: { total: number; increase: number; percentage: number };
    B: { total: number; increase: number; percentage: number };
    C: { total: number; increase: number; percentage: number };
    D: { total: number; increase: number; percentage: number };
  };
}

export function calculateCurrencyImpact(
  employees: EmployeeData[],
  marketRefs: MarketReference[],
  dollarIncrease: number,
  inflationMultiplier: number = 0.6
): CurrencySimulationResult {
  const estimatedInflation = dollarIncrease * inflationMultiplier;
  const currentTotalSalary = employees.reduce((sum, emp) => sum + emp["Mevcut Maaş"], 0);
  const scenarioA = runScenarioLogic(employees, marketRefs, estimatedInflation, "A");
  const scenarioB = runScenarioLogic(employees, marketRefs, estimatedInflation, "B");
  const scenarioC = runScenarioLogic(employees, marketRefs, estimatedInflation, "C");
  const scenarioD = runScenarioLogic(employees, marketRefs, estimatedInflation, "D", undefined);
  const scenarioA_total = scenarioA.reduce((sum, row) => sum + row["Yeni Maaş"], 0);
  const scenarioB_total = scenarioB.reduce((sum, row) => sum + row["Yeni Maaş"], 0);
  const scenarioC_total = scenarioC.reduce((sum, row) => sum + row["Yeni Maaş"], 0);
  const scenarioD_total = scenarioD.reduce((sum, row) => sum + row["Yeni Maaş"], 0);
  const newTotalSalary = scenarioC_total;
  const salaryIncrease = newTotalSalary - currentTotalSalary;
  const salaryIncreasePercentage = currentTotalSalary ? (salaryIncrease / currentTotalSalary) * 100 : 0;

  return {
    dollarIncrease,
    estimatedInflation: round1(estimatedInflation),
    currentTotalSalary,
    newTotalSalary,
    salaryIncrease,
    salaryIncreasePercentage: round1(salaryIncreasePercentage),
    monthlyIncrease: salaryIncrease,
    yearlyIncrease: salaryIncrease * 12,
    scenarioResults: {
      A: { total: scenarioA_total, increase: scenarioA_total - currentTotalSalary, percentage: currentTotalSalary ? round1(((scenarioA_total - currentTotalSalary) / currentTotalSalary) * 100) : 0 },
      B: { total: scenarioB_total, increase: scenarioB_total - currentTotalSalary, percentage: currentTotalSalary ? round1(((scenarioB_total - currentTotalSalary) / currentTotalSalary) * 100) : 0 },
      C: { total: scenarioC_total, increase: scenarioC_total - currentTotalSalary, percentage: currentTotalSalary ? round1(((scenarioC_total - currentTotalSalary) / currentTotalSalary) * 100) : 0 },
      D: { total: scenarioD_total, increase: scenarioD_total - currentTotalSalary, percentage: currentTotalSalary ? round1(((scenarioD_total - currentTotalSalary) / currentTotalSalary) * 100) : 0 },
    },
  };
}
