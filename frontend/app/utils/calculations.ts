// web_arayuz/app/utils/calculations.ts

import { assertScoreRange, toScore } from "../../lib/score";

// ==========================================
// 1. MAAŞ VE ZAM SİMÜLASYONU
// ==========================================

export interface SalaryBreakdown {
    Brüt: number;
    "SGK (%14)": number;
    "İşsizlik (%1)": number;
    "Gelir Vergisi (%15)": number;
    "Damga Vergisi": number;
    "Net Maaş": number;
  }
  
  export function calculateNetSalary(grossSalary: number): SalaryBreakdown {
    // 2024-2025 Parametreleri
    const sgk_isc = grossSalary * 0.14; // SGK İşçi Payı (%14)
    const issiz_isc = grossSalary * 0.01; // İşsizlik İşçi Payı (%1)
  
    const gelir_vergisi_matrahi = grossSalary - (sgk_isc + issiz_isc);
    
    // Basitleştirilmiş %15 Vergi Dilimi (Python kodundaki mantık)
    const gelir_vergisi = gelir_vergisi_matrahi * 0.15; 
    
    const damga_vergisi = grossSalary * 0.00759; // Damga Vergisi (%0.759)
  
    const kesintiler = sgk_isc + issiz_isc + gelir_vergisi + damga_vergisi;
    const net_maas = grossSalary - kesintiler;
  
    return {
      Brüt: Math.round(grossSalary * 100) / 100,
      "SGK (%14)": Math.round(sgk_isc * 100) / 100,
      "İşsizlik (%1)": Math.round(issiz_isc * 100) / 100,
      "Gelir Vergisi (%15)": Math.round(gelir_vergisi * 100) / 100,
      "Damga Vergisi": Math.round(damga_vergisi * 100) / 100,
      "Net Maaş": Math.round(net_maas * 100) / 100,
    };
  }
  
  export function calculateSalaryWithRaise(
    currentGross: number,
    raisePercentage: number
  ): { newGross: number; breakdown: SalaryBreakdown } {
    const newGross = currentGross * (1 + raisePercentage / 100);
    return {
      newGross: Math.round(newGross * 100) / 100,
      breakdown: calculateNetSalary(newGross),
    };
  }
  
  // Maaş Simülasyonu için Kıdem Çarpanı (Python: ui_salary_whatif.py)
  export const getTenureCap = (years: number): number => {
      if (years <= 2) return 0.75; // Çaylak
      if (years <= 4) return 0.90; // Gelişen
      if (years <= 7) return 1.05; // Deneyimli
      return 1.20;                 // Kıdemli/Uzman
  };
  
  // ==========================================
  // 2. 360 DEĞERLENDİRME & PERFORMANS
  // ==========================================
  
  // 360 Puan Hesaplama (Python: logic.py)
  export const calculate360Score = (mgr: number, peer: number, self: number) => {
      // Ağırlıklar: Yönetici %50, Akran %30, Kendi %20
      const score = (mgr * 0.5) + (peer * 0.3) + (self * 0.2);
      return Number(score.toFixed(2));
  };
  
  // 9-Box Talent Matrix Kategorisi (Python: ui_talent.py)
  export function getTalentBox(performance: number, potential: number): string {
    // 0: Düşük, 1: Orta, 2: Yüksek
    const p_cat = performance < 3.0 ? 0 : performance < 4.0 ? 1 : 2;
    const pot_cat = potential < 3.0 ? 0 : potential < 4.0 ? 1 : 2;
  
    // Grid Mantığı (Python logic.py ile birebir)
    if (pot_cat === 2 && p_cat === 2) return "1. Yıldız Oyuncu (Star)";
    if (pot_cat === 2 && p_cat === 1) return "2. Yüksek Potansiyel (High Pot)";
    if (pot_cat === 1 && p_cat === 2) return "3. Yüksek Performans (High Perf)";
    if (pot_cat === 2 && p_cat === 0) return "4. Soru İşareti (Enigma)";
    if (pot_cat === 1 && p_cat === 1) return "5. Kilit Oyuncu (Core)";
    if (pot_cat === 0 && p_cat === 2) return "6. Güvenilir Profesyonel";
    if (pot_cat === 1 && p_cat === 0) return "7. Uyumsuz (Inconsistent)";
    if (pot_cat === 0 && p_cat === 1) return "8. Etkili Oyuncu (Solid)";
    if (pot_cat === 0 && p_cat === 0) return "9. Riskli (Underperformer)";
    
    return "Tanımsız";
  }
  
  // ==========================================
  // 3. YETKİNLİK GAP (AÇIK) ANALİZİ
  // ==========================================
  
export interface SkillGap {
    competency: string;
  current: number | null;
  target: number | null;
  gap: number | null;
  priority: "Kritik" | "Orta" | "Düşük" | "Bekleniyor";
  }
  
  // Kariyer ve Gelişim Modülü için Gap Analizi (Python: ui_career.py / logic.py)
export function calculateSkillGap(
  currentScores: Record<string, number | null>,
  targetProfile: Record<string, number | null>
): SkillGap[] {
    const gaps: SkillGap[] = [];
  
    Object.entries(targetProfile).forEach(([competency, target]) => {
    const current = toScore(currentScores[competency]);
    const targetScore = toScore(target);
    if (current === null || targetScore === null) {
      gaps.push({
        competency,
        current,
        target: targetScore,
        gap: null,
        priority: "Bekleniyor",
      });
      return;
    }
      
      // Gap hesapla (Negatif çıkarsa hedef aşılmış demektir, pozitifi almayız)
      // Python mantığında: Hedef - Mevcut > 0 ise açık vardır.
    const rawGap = targetScore - current;
      
      // Sadece eksiği olanları (gap > 0) veya tümünü listeyebiliriz. 
      // Burada tümünü listeyip priority atıyoruz.
      
      let priority: "Kritik" | "Orta" | "Düşük" = "Düşük";
      if (rawGap >= 1.5) priority = "Kritik";
      else if (rawGap >= 0.8) priority = "Orta";
  
    gaps.push({
      competency,
      current: Math.round(current * 100) / 100,
      target: Math.round(targetScore * 100) / 100,
      gap: Math.round(rawGap * 100) / 100, // Pozitif değer = Açık var
      priority,
    });
    });
  
    // En büyük açıktan en küçüğe doğru sırala
    return gaps.sort((a, b) => b.gap - a.gap);
  }

  // ==========================================
  // 4. STANDART RADAR GRAFİĞİ VERİSİ OLUŞTURMA (TÜM MODÜLLER İÇİN)
  // ==========================================
  
export interface RadarDataPoint {
    subject: string;
    A: number | null;  // Mevcut (Test)
    B: number | null;  // Yönetici (360°)
    C: number | null;  // Hedef (Rol)
    fullMark: number;
  }

export interface CompetencyScores {
  scores: Record<string, number | null>;        // Test sonuçları (A)
  manager_scores: Record<string, number | null>; // Yönetici puanları (B)
  targets: Record<string, number | null>;        // Hedef puanlar (C)
  }

  /**
   * Standart radar grafiği verisi oluşturur (Tüm modüller için aynı mantık)
   * 
   * @param competencyScores - Yetkinlik puanları (scores, manager_scores, targets)
   * @param competencyMap - Yetkinlik kod -> isim haritası (örn: {STR: "Stratejik Bakış", ...})
   * @returns Radar grafiği için standart veri formatı
   */
  export function createStandardRadarData(
    competencyScores: CompetencyScores,
    competencyMap: Record<string, string>
  ): RadarDataPoint[] {
    const { scores, manager_scores, targets } = competencyScores;
    const radarData: RadarDataPoint[] = [];

    Object.keys(competencyMap).forEach((code) => {
      const name = competencyMap[code];
      if (!name) return;

      // Mevcut (Test) puanı - A
      // Sadece scores'dan al, yoksa veya 0 ise 0 bırak (görünmez olur)
      // Fallback yapma - test puanı yoksa test puanı yok demektir
      const currentVal = assertScoreRange(scores[code]);

      // Yönetici (360°) puanı - B
      // Sadece manager_scores'dan al, yoksa veya 0 ise 0 bırak (görünmez olur)
      // Fallback yapma - manager puanı yoksa manager puanı yok demektir
      const managerVal = assertScoreRange(manager_scores[code]);

      // Hedef (Rol) puanı - C
      // Hedef puanı her zaman olmalı (job profile'dan gelir)
      const targetVal = assertScoreRange(targets[code]);

    // Değerleri 0 ile 5.0 arasında sınırla (null ise null kalır)
    // 0 değerleri gerçek veri olmadığını gösterir (görünmez olacak)
    const normalizedCurrent = currentVal === null ? null : Math.max(0, Math.min(5.0, currentVal));
    const normalizedManager = managerVal === null ? null : Math.max(0, Math.min(5.0, managerVal));
    const normalizedTarget = targetVal === null ? null : Math.max(0.1, Math.min(5.0, targetVal)); // Hedef her zaman görünür olmalı

      radarData.push({
        subject: name,
      A: normalizedCurrent,      // Mevcut (Test)
      B: normalizedManager,      // Yönetici (360°)
      C: normalizedTarget,       // Hedef (Rol)
        fullMark: 5,
      });
    });

    return radarData;
  }

  /**
   * Talent Matrix verisinden standart yetkinlik puanlarını çıkarır (Tüm modüller için aynı mantık)
   * Bu fonksiyon, backend'den gelen talent matrix verisini standart formata dönüştürür.
   * 
   * @param employee - Talent matrix'ten gelen çalışan verisi
   * @param competencyMap - Yetkinlik kod -> isim haritası
   * @returns Standart yetkinlik puanları (scores, manager_scores, targets)
   */
  export function extractCompetencyScoresFromTalentMatrix(
    employee: any,
    competencyMap: Record<string, string>
  ): CompetencyScores {
  const scores: Record<string, number | null> = {};
  const manager_scores: Record<string, number | null> = {};
  const targets: Record<string, number | null> = {};

    Object.keys(competencyMap).forEach((code) => {
      // Test sonuçları (scores) - SAF PARSE (değiştirme yok)
    const scoreVal = employee.scores && typeof employee.scores === 'object'
      ? employee.scores[code]
      : undefined;
    scores[code] = toScore(scoreVal);

      // Yönetici puanları (manager_scores) - SAF PARSE (değiştirme yok)
    const managerVal = employee.manager_scores && typeof employee.manager_scores === 'object'
      ? employee.manager_scores[code]
      : undefined;
    manager_scores[code] = toScore(managerVal);

      // Hedef puanlar (targets) - SAF PARSE (değiştirme yok)
    const targetVal = employee.targets && typeof employee.targets === 'object'
      ? employee.targets[code]
      : undefined;
    targets[code] = toScore(targetVal);
    });

    return { scores, manager_scores, targets };
  }

  /**
   * Esnek isim eşleştirme (Tüm modüller için aynı mantık)
   * 
   * @param name1 - İlk isim
   * @param name2 - İkinci isim
   * @returns Eşleşme durumu
   */
  export function matchEmployeeName(name1: string | undefined | null, name2: string | undefined | null): boolean {
    if (!name1 || !name2) return false;
    const n1 = (name1 || "").trim().toLowerCase();
    const n2 = (name2 || "").trim().toLowerCase();
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

  /**
   * Talent Matrix'ten çalışan verisini bulur (Tüm modüller için aynı mantık)
   * 
   * @param talentMatrixData - Backend'den gelen talent matrix verisi
   * @param employeeName - Aranan çalışan adı
   * @returns Bulunan çalışan verisi veya null
   */
  export function findEmployeeInTalentMatrix(
    talentMatrixData: any[],
    employeeName: string
  ): any | null {
    if (!talentMatrixData || !Array.isArray(talentMatrixData) || !employeeName) {
      return null;
    }

    const employeeNameLower = (employeeName || "").trim().toLowerCase();
    
    return talentMatrixData.find((emp) => {
      const empName = (emp.name || emp["Ad Soyad"] || emp.Personel || "").trim().toLowerCase();
      return matchEmployeeName(empName, employeeNameLower);
    }) || null;
  }