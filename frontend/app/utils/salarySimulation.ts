// Salary Simulation Utilities - Based on ui_salary_whatif.py

export interface EmployeeData {
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Mevcut Maaş": number;
  Performans: number;
  Potansiyel: number;
  Calisma_Yili: number;
  Profil: string;
  "Piyasa Ortalaması"?: number;
  manager_proposal?: number; // Yöneticinin önerdiği zam oranı (%)
  manager_note?: string; // Yöneticinin gerekçesi
  is_star_performer?: boolean; // Star Performer flag
}

export interface SimulationResult {
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  Profil: string;
  Performans: number;
  Potansiyel: number;
  "Mevcut Maaş": number;
  "Yeni Maaş": number;
  "Zam Tutarı": number;
  "Zam Oranı (%)": number;
  "Zam Açıklaması": string;
  "Eski_CR": number;
  "Yeni_CR": number;
  "Eski Risk": string;
  "Yeni Risk": string;
  "Risk Mesafesi": string;
  "Piyasa_Gelecek": number;
  "Yıllık Bonus (TL)": number;
  "Bonus Oranı (%)": number;
}

export interface MarketReference {
  Departman: string;
  Pozisyon: string;
  "Piyasa Ortalaması": number;
}

// --- 1. KIDEM TAVANI (CR CAP - Hedef Çarpanlar) ---
export function getTenureMaxCap(years: number): number {
  const y = years || 1.0;
  
  if (y <= 2) return 0.75;      // 0-2 Yıl (Çaylak) -> Piyasanın %75'i
  if (y <= 4) return 0.90;      // 3-4 Yıl (Gelişen) -> Piyasanın %90'ı
  if (y <= 9) return 1.00;      // 5-9 Yıl (Tam Piyasa) -> Piyasanın %100'ü
  if (y <= 14) return 1.25;     // 10-14 Yıl (Kıdemli) -> Piyasa + %25
  if (y <= 19) return 1.35;     // 15-19 Yıl (Yüksek Kıdem)
  return 1.50;                  // 20+ Yıl (Duayen)
}

// --- 2. PROFİL MATRİSİ ---
export function getEmployeeSegment(perf: number, pot: number, tenure: number): string {
  // 1. YILDIZ (Perf >= 4.5, Pot >= 4.0)
  if (perf >= 4.5 && pot >= 4.0) return "🌟 YILDIZ";
  
  // 2. YÜKSEK PERFORMANS (Perf >= 4.5, Pot 3.0-3.99)
  if (perf >= 4.5 && pot >= 3.0 && pot < 4.0) return "🚀 YÜKSEK PERFORMANS";
  
  // 3. PERFORMANS (Perf >= 4.5, Pot < 3.0)
  if (perf >= 4.5 && pot < 3.0) return "⚡ PERFORMANS";
  
  // 4. KİLİT OYUNCU GRUBU (Perf 4.0-4.49, Pot >= 4.0)
  if (perf >= 4.0 && perf < 4.5 && pot >= 4.0) {
    if (tenure <= 5) return "🛡️ KİLİT OYUNCU";
    return "⚓ KIDEMLİ KİLİT OYUNCU";
  }

  // 5. STANDART (Perf 4.0-4.49, Pot 3.0-3.99)
  if (perf >= 4.0 && perf < 4.5 && pot >= 3.0 && pot < 4.0) return "⚖️ STANDART";
  
  // 6. GELİŞTİRİLEBİLİR (Perf 4.0-4.49, Pot < 3.0)
  if (perf >= 4.0 && perf < 4.5 && pot < 3.0) return "🌱 GELİŞTİRİLEBİLİR";
  
  // 7. VASAT PERFORMANS (Perf 3.5-3.99, Pot 3.0-3.99)
  if (perf >= 3.5 && perf < 4.0 && pot >= 3.0 && pot < 4.0) return "📉 VASAT PERFORMANS";
  
  // 8. DÜŞÜK PERFORMANS (Perf 3.5-3.99, Pot < 3.0)
  if (perf >= 3.5 && perf < 4.0 && pot < 3.0) return "⚠️ DÜŞÜK PERFORMANS";
  
  // 9. POTANSİYEL YATIRIMI (Perf < 3.5, Pot >= 4.0)
  if (perf < 3.5 && pot >= 4.0) return "💎 POTANSİYEL YATIRIMI";
  
  // 10. KRİTİK ALTI (Diğerleri)
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
export function processEmployeeData(
  orgData: any[],
  data360: any[]
): EmployeeData[] {
  const result: EmployeeData[] = [];
  
  // Create a map for 360 data
  const data360Map = new Map<string, any>();
  data360.forEach((item: any) => {
    const name = item.target || item.Personel || item["Ad Soyad"];
    if (name) {
      data360Map.set(name, item);
    }
  });

  orgData.forEach((row: any) => {
    const name = row["Ad Soyad"] || "Bilinmeyen";
    const dept = row.Departman || "Genel";
    const pos = row.Pozisyon || "Personel";

    // Get performance and potential from 360 data or row
    let perf = 3.0;
    let pot = 3.0;
    
    const data360Item = data360Map.get(name);
    if (data360Item) {
      perf = parseFloat(data360Item.Performans || data360Item.performans || perf);
      pot = parseFloat(data360Item.Potansiyel || data360Item.potansiyel || pot);
    }
    
    if (perf === 3.0) perf = parseFloat(row.Performans || row.performans || "3.0");
    if (pot === 3.0) pot = parseFloat(row.Potansiyel || row.potansiyel || "3.0");

    // Get salary
    let maas = 45000.0;
    if (row["Maaş (TL)"]) {
      maas = parseFloat(row["Maaş (TL)"]) || 45000;
    } else if (row.Maaş) {
      maas = parseFloat(String(row.Maaş).replace(/[.,₺\s]/g, "")) || 45000;
    }

    // Get tenure
    let tenure = 1.0;
    if (row.Calisma_Yili) {
      tenure = parseFloat(row.Calisma_Yili) || 1.0;
    } else if (row["Kıdem (Yıl)"]) {
      tenure = parseFloat(row["Kıdem (Yıl)"]) || 1.0;
    } else {
      const tenureStr = String(row.kıdem || row.kidem || row.calisma || "1");
      const match = tenureStr.match(/\d+\.?\d*/);
      if (match) tenure = parseFloat(match[0]);
    }

    // Get star performer flag from 360 data
    const isStarPerformer = data360Item?.is_star_performer || false;

    result.push({
      "Ad Soyad": name,
      Departman: dept,
      Pozisyon: pos,
      "Mevcut Maaş": maas,
      Performans: perf,
      Potansiyel: pot,
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
    grouped.set(key, {
      total: existing.total + emp["Mevcut Maaş"],
      count: existing.count + 1,
    });
  });

  const result: MarketReference[] = [];
  grouped.forEach((value, key) => {
    const [dept, pos] = key.split("|");
    const avg = Math.round(value.total / value.count / 100) * 100; // Round to nearest 100
    result.push({
      Departman: dept,
      Pozisyon: pos,
      "Piyasa Ortalaması": avg || 45000,
    });
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
  // Create market map
  const marketMap = new Map<string, number>();
  marketRefs.forEach((ref) => {
    marketMap.set(`${ref.Departman}|${ref.Pozisyon}`, ref["Piyasa Ortalaması"]);
  });

  const results: SimulationResult[] = employees.map((emp) => {
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

    let raisePct = 0.0;
    let potentialSalary = current;
    let logicDesc = "";
    
    // STAR PERFORMER BONUS: Tüm senaryolarda +%10 ek zam
    const starPerformerBonus = emp.is_star_performer ? 10.0 : 0.0;

    // --- SENARYO A: BÜTÇE DOSTU MATRİS ---
    if (mode === "A") {
      if (profile === "💎 POTANSİYEL YATIRIMI") {
        raisePct = inflationRate * 0.50;
        logicDesc = "Enf/2 (Riskli)";
      } else if (profile === "⚠️ DÜŞÜK PERFORMANS") {
        raisePct = inflationRate * 0.25;
        logicDesc = "%25 Enf";
      } else if (profile === "📉 VASAT PERFORMANS") {
        raisePct = inflationRate * 0.50;
        logicDesc = "Enf/2";
      } else if (profile === "🌱 GELİŞTİRİLEBİLİR") {
        raisePct = inflationRate * 0.75;
        logicDesc = "%75 Enf";
      } else if (profile === "⚖️ STANDART") {
        raisePct = inflationRate;
        logicDesc = "Tam Enf";
      } else if (profile === "🛡️ KİLİT OYUNCU") {
        raisePct = inflationRate + 2.0;
        logicDesc = "Enf+Düşük Prim";
      } else if (profile === "⚓ KIDEMLİ KİLİT OYUNCU") {
        raisePct = inflationRate + 5.0;
        logicDesc = "Enf+Std Prim";
      } else if (profile === "⚡ PERFORMANS") {
        raisePct = inflationRate + 5.0;
        logicDesc = "Enf+Std Prim";
      } else if (profile === "🚀 YÜKSEK PERFORMANS") {
        raisePct = inflationRate + 5.0;
        logicDesc = "Enf+Std Prim";
      } else if (profile === "🌟 YILDIZ") {
        raisePct = inflationRate + 10.0;
        logicDesc = "Enf+Yüksek Prim";
      } else {
        raisePct = 0.0;
        logicDesc = "0 Zam";
      }

      potentialSalary = current * (1 + raisePct / 100.0);
    }
    // --- SENARYO B: PİYASA KURTARMA & EŞİTLEME MODU ---
    else if (mode === "B") {
      // 1. Adım: Temel Enflasyon Zammı
      let tempRaise = inflationRate;
      if (
        profile.includes("DÜŞÜK") ||
        profile.includes("VASAT") ||
        profile.includes("KRİTİK")
      ) {
        tempRaise = inflationRate * 0.5;
      }

      const testSalary = current * (1 + tempRaise / 100.0);

      // 2. Adım: Değerli Personel Kontrolü
      const valuableProfiles = [
        "🛡️ KİLİT OYUNCU",
        "⚓ KIDEMLİ KİLİT OYUNCU",
        "⚡ PERFORMANS",
        "🚀 YÜKSEK PERFORMANS",
        "🌟 YILDIZ",
      ];

      if (valuableProfiles.includes(profile)) {
        let aggressiveRaise = 0;
        if (profile === "🛡️ KİLİT OYUNCU") {
          aggressiveRaise = inflationRate + 2.0;
        } else if (
          ["⚓ KIDEMLİ KİLİT OYUNCU", "⚡ PERFORMANS", "🚀 YÜKSEK PERFORMANS"].includes(profile)
        ) {
          aggressiveRaise = inflationRate + 5.0;
        } else if (profile === "🌟 YILDIZ") {
          aggressiveRaise = inflationRate + 10.0;
        }

        const salaryWithPremium = current * (1 + aggressiveRaise / 100.0);
        const targetSalary = maxAllowedSalary;

        if (salaryWithPremium < targetSalary) {
          potentialSalary = targetSalary;
          logicDesc = `Alt Banttan Kurtarma (Hedef CR ${capCR})`;
        } else {
          potentialSalary = salaryWithPremium;
          aggressiveRaise += starPerformerBonus;
          logicDesc = `Yüksek Primli Zam (%${aggressiveRaise.toFixed(1)}${starPerformerBonus > 0 ? " 🌟+10%" : ""})`;
        }
      } else {
        tempRaise += starPerformerBonus;
        potentialSalary = testSalary * (1 + starPerformerBonus / 100.0);
        logicDesc = `Standart/Düşük Zam (%${tempRaise.toFixed(1)}${starPerformerBonus > 0 ? " 🌟+10%" : ""})`;
      }
      
      // Star Performer bonus uygula
      if (starPerformerBonus > 0 && potentialSalary === testSalary) {
        potentialSalary = current * (1 + (tempRaise + starPerformerBonus) / 100.0);
      }
    }
    // --- SENARYO C: DENGELEME MODU (Hibrit - Kademeli İyileştirme) ---
    else if (mode === "C") {
      // Hedef: Bandın altındakileri sadece minimum seviyeye taşır, ideal noktaya değil
      // Kademeli iyileştirme yapar, radikal artışlar yapmaz
      
      const minimumCR = 0.80; // Bandın giriş seviyesi (Minimum)
      const minimumSalary = futureMarket * minimumCR;
      
      // Mevcut CR'ye göre strateji belirle
      if (oldCR < 0.80) {
        // Kırmızı Bölge - Sadece minimum seviyeye taşır
        potentialSalary = minimumSalary;
        logicDesc = `Hibrit: Kırmızı Bölgeden Minimum Seviyeye (${minimumCR} CR)`;
      } else if (oldCR >= 0.80 && oldCR < 1.0) {
        // Alt bantta ama minimumun üstünde - kademeli iyileştirme
        const valuableProfiles = [
          "🛡️ KİLİT OYUNCU",
          "⚓ KIDEMLİ KİLİT OYUNCU",
          "⚡ PERFORMANS",
          "🚀 YÜKSEK PERFORMANS",
          "🌟 YILDIZ",
        ];
        
        if (valuableProfiles.includes(profile)) {
          // Değerli personel için orta seviye zam (ideal noktaya değil, kademeli)
          raisePct = inflationRate + 2.0;
          potentialSalary = current * (1 + raisePct / 100.0);
          logicDesc = `Hibrit: Değerli Personel - Kademeli İyileştirme (%${raisePct.toFixed(1)})`;
        } else {
          // Diğerleri için sadece enflasyon
          raisePct = inflationRate;
          potentialSalary = current * (1 + raisePct / 100.0);
          logicDesc = `Hibrit: Standart - Tam Enflasyon`;
        }
      } else if (oldCR >= 1.0 && oldCR <= 1.30) {
        // Dengeli bölgede - performansa göre zam (tavanı aşmayan)
        if (profile === "🌟 YILDIZ") {
          raisePct = inflationRate + 3.0; // Tavanı aşmayan ek zam
          logicDesc = "Hibrit: Yıldız - Kontrollü Prim";
        } else if (profile === "🚀 YÜKSEK PERFORMANS" || profile === "⚡ PERFORMANS") {
          raisePct = inflationRate + 2.0;
          logicDesc = "Hibrit: Yüksek Performans - Kontrollü Prim";
        } else if (profile === "🛡️ KİLİT OYUNCU" || profile === "⚓ KIDEMLİ KİLİT OYUNCU") {
          raisePct = inflationRate + 1.0;
          logicDesc = "Hibrit: Kilit Oyuncu - Hafif Prim";
        } else if (profile === "⚖️ STANDART") {
          raisePct = inflationRate;
          logicDesc = "Hibrit: Standart - Tam Enflasyon";
        } else {
          raisePct = inflationRate * 0.75;
          logicDesc = "Hibrit: Düşük Performans - %75 Enflasyon";
        }
        raisePct += starPerformerBonus;
        if (starPerformerBonus > 0 && logicDesc) {
          logicDesc += " 🌟+10%";
        }
        potentialSalary = current * (1 + raisePct / 100.0);
      } else {
        // Üst bandta (CR > 1.30) - sadece enflasyon
        raisePct = inflationRate + starPerformerBonus;
        if (starPerformerBonus > 0) {
          logicDesc = `Üst Bant - Enflasyon${starPerformerBonus > 0 ? " 🌟+10%" : ""}`;
        } else {
          logicDesc = "Üst Bant - Sadece Enflasyon";
        }
        potentialSalary = current * (1 + inflationRate / 100.0);
        logicDesc = `Hibrit: Üst Bant - Sadece Enflasyon`;
      }
    }
    // --- SENARYO D: BÜTÇE YÖNETİMİ (Yönetici Talepleri) ---
    else if (mode === "D") {
      // Bütçe yönetiminden gelen gerçek verileri kullan
      const budgetRequest = budgetRequests?.find(r => r.employee_id === emp["Ad Soyad"]);
      
      if (budgetRequest && budgetRequest.requested_rate > 0) {
        raisePct = budgetRequest.requested_rate;
        logicDesc = `Yönetici Talebi (%${raisePct.toFixed(1)})`;
      } else {
        raisePct = inflationRate;
        logicDesc = `Varsayılan Enflasyon (%${inflationRate.toFixed(1)})`;
      }
      
      // Star Performer bonus ekle
      raisePct += starPerformerBonus;
      if (starPerformerBonus > 0) {
        logicDesc += " 🌟+10%";
      }
      
      potentialSalary = current * (1 + raisePct / 100.0);
    }

    // TAVAN AŞIMI KONTROLÜ
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

    // Round to nearest 100
    const newSalary = Math.ceil(finalSalary / 100) * 100;
    const raiseAmount = newSalary - current;
    const raisePercentage = (raiseAmount / current) * 100;
    const newCR = newSalary / futureMarket;
    const newRisk = analyzeStrategicStatus(newCR, tenure);

    // Risk Mesafesi
    let riskDistance = "-";
    const targetEntryPoint = capCR - 0.20;
    if (tenure > 2 && newCR < 0.80) {
      const diffPct = (0.80 - newCR) * 100;
      riskDistance = `📉 -%${diffPct.toFixed(1)} (Genel)`;
    } else if (newCR < targetEntryPoint) {
      const diffPct = (targetEntryPoint - newCR) * 100;
      riskDistance = `📉 -%${diffPct.toFixed(1)} (Kendi)`;
    }

    // Performance-Based Bonus Calculation
    // Performans ≥ 4.5: %15 bonus (yıllık maaşın %15'i)
    // Performans ≥ 4.0: %10 bonus
    // Performans ≥ 3.5: %5 bonus
    // Performans < 3.5: 0 bonus
    const perf = emp.Performans || 0;
    let bonusPercentage = 0;
    if (perf >= 4.5) {
      bonusPercentage = 15;
    } else if (perf >= 4.0) {
      bonusPercentage = 10;
    } else if (perf >= 3.5) {
      bonusPercentage = 5;
    }
    const annualBonus = Math.round((newSalary * bonusPercentage) / 100);

    return {
      "Ad Soyad": emp["Ad Soyad"],
      Departman: emp.Departman,
      Pozisyon: emp.Pozisyon,
      Profil: emp.Profil,
      "is_star_performer": emp.is_star_performer || false,  // Star Performer flag for UI
      Performans: emp.Performans,
      Potansiyel: emp.Potansiyel,
      "Mevcut Maaş": current,
      "Yeni Maaş": newSalary,
      "Zam Tutarı": raiseAmount,
      "Zam Oranı (%)": raisePercentage,
      "Zam Açıklaması": explanation,
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

  return results;
}

// --- 7. ENFLASYON/KUR SİMÜLASYONU ---
export interface CurrencySimulationResult {
  dollarIncrease: number; // Dolar artış yüzdesi
  estimatedInflation: number; // Tahmini enflasyon (dolar artışına bağlı)
  currentTotalSalary: number; // Mevcut toplam maaş yükü
  newTotalSalary: number; // Yeni toplam maaş yükü (enflasyon sonrası)
  salaryIncrease: number; // Maaş artışı (TL)
  salaryIncreasePercentage: number; // Maaş artış yüzdesi
  monthlyIncrease: number; // Aylık artış
  yearlyIncrease: number; // Yıllık artış
  scenarioResults: {
    A: { total: number; increase: number; percentage: number };
    B: { total: number; increase: number; percentage: number };
    C: { total: number; increase: number; percentage: number };
    D: { total: number; increase: number; percentage: number };
  };
}

/**
 * Dolar artışına göre maaş yükü simülasyonu
 * @param employees Mevcut çalışan verileri
 * @param marketRefs Piyasa referansları
 * @param dollarIncrease Dolar artış yüzdesi (örn: 20 = %20)
 * @param inflationMultiplier Dolar artışının enflasyona etkisi (varsayılan: 0.6 = %60'ı enflasyona yansır)
 */
export function calculateCurrencyImpact(
  employees: EmployeeData[],
  marketRefs: MarketReference[],
  dollarIncrease: number,
  inflationMultiplier: number = 0.6
): CurrencySimulationResult {
  // Dolar artışının enflasyona etkisi
  // Örnek: Dolar %20 artarsa, enflasyon yaklaşık %12 artar (0.6 * 20 = 12)
  const estimatedInflation = dollarIncrease * inflationMultiplier;

  // Mevcut toplam maaş yükü
  const currentTotalSalary = employees.reduce(
    (sum, emp) => sum + emp["Mevcut Maaş"],
    0
  );

  // Senaryoları hesapla
  const scenarioA = runScenarioLogic(employees, marketRefs, estimatedInflation, "A");
  const scenarioB = runScenarioLogic(employees, marketRefs, estimatedInflation, "B");
  const scenarioC = runScenarioLogic(employees, marketRefs, estimatedInflation, "C");
  const scenarioD = runScenarioLogic(employees, marketRefs, estimatedInflation, "D", undefined);

  const scenarioA_total = scenarioA.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
  const scenarioB_total = scenarioB.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
  const scenarioC_total = scenarioC.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
  const scenarioD_total = scenarioD.reduce((sum, r) => sum + r["Yeni Maaş"], 0);

  // Senaryo C'yi varsayılan olarak kullan (Dengeli)
  const newTotalSalary = scenarioC_total;
  const salaryIncrease = newTotalSalary - currentTotalSalary;
  const salaryIncreasePercentage = (salaryIncrease / currentTotalSalary) * 100;
  const monthlyIncrease = salaryIncrease;
  const yearlyIncrease = salaryIncrease * 12;

  return {
    dollarIncrease,
    estimatedInflation: Math.round(estimatedInflation * 10) / 10,
    currentTotalSalary,
    newTotalSalary,
    salaryIncrease,
    salaryIncreasePercentage: Math.round(salaryIncreasePercentage * 10) / 10,
    monthlyIncrease,
    yearlyIncrease,
    scenarioResults: {
      A: {
        total: scenarioA_total,
        increase: scenarioA_total - currentTotalSalary,
        percentage: Math.round(((scenarioA_total - currentTotalSalary) / currentTotalSalary) * 100 * 10) / 10,
      },
      B: {
        total: scenarioB_total,
        increase: scenarioB_total - currentTotalSalary,
        percentage: Math.round(((scenarioB_total - currentTotalSalary) / currentTotalSalary) * 100 * 10) / 10,
      },
      C: {
        total: scenarioC_total,
        increase: scenarioC_total - currentTotalSalary,
        percentage: Math.round(((scenarioC_total - currentTotalSalary) / currentTotalSalary) * 100 * 10) / 10,
      },
      D: {
        total: scenarioD_total,
        increase: scenarioD_total - currentTotalSalary,
        percentage: Math.round(((scenarioD_total - currentTotalSalary) / currentTotalSalary) * 100 * 10) / 10,
      },
    },
  };
}


