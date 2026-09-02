export interface PotentialFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  source: "assessment" | "profile" | "mixed";
  available: boolean;
}

export interface PotentialResult {
  score: number;
  confidence: number;
  factors: PotentialFactor[];
  missingInputs: string[];
  label: "Veri Yok" | "Düşük" | "Gelişen" | "Yüksek" | "Çok Yüksek";
}

const LABEL_TO_CODE: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG",
  "Analitik Düşünme": "ANA",
  "Sonuç Odaklılık": "RES",
  "Detaylara Özen": "DET",
  "Sürekli Öğrenme": "LRN",
  "Etik ve Uyum": "ETH",
  "Öz-Disiplin": "DIS",
  "Dayanıklılık & Stres Yönetimi": "STR",
  // Eski kayıtların okunabilmesi için geriye dönük uyumluluk.
  "Stratejik Bakış": "STR",
  "Takım Çalışması": "TEA",
  "İletişim Becerileri": "COM",
};

const clamp = (value: number, min = 1, max = 5) => Math.min(max, Math.max(min, value));
const avg = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

function numeric(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? clamp(n) : null;
}

export function extractCompetencyMap(person: any): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  const add = (code: string, value: unknown) => {
    const n = numeric(value);
    if (n === null) return;
    if (!buckets[code]) buckets[code] = [];
    buckets[code].push(n);
  };

  const sources = [person?.scores, person?.raw_scores, person?.manager_scores];
  sources.forEach((source) => {
    if (!source || typeof source !== "object") return;
    Object.entries(source).forEach(([key, value]) => add(LABEL_TO_CODE[key] || key, value));
  });

  Object.keys(LABEL_TO_CODE).forEach((label) => add(LABEL_TO_CODE[label], person?.[label]));
  Object.values(LABEL_TO_CODE).forEach((code) => {
    add(code, person?.[code]);
    add(code, person?.[`${code}_Test`]);
    add(code, person?.[`${code}_Mgr`]);
  });

  return Object.fromEntries(
    Object.entries(buckets).map(([code, values]) => [code, avg(values)])
  );
}

function weightedFactorScore(
  map: Record<string, number>,
  weights: Record<string, number>
): number | null {
  const available = Object.entries(weights).filter(([code]) => Number.isFinite(map[code]) && map[code] > 0);
  if (!available.length) return null;
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  const weighted = available.reduce(
    (sum, [code, weight]) => sum + map[code] * weight,
    0
  );
  return totalWeight > 0 ? clamp(weighted / totalWeight) : null;
}

/**
 * FutureHR Potansiyel Endeksi bir otomatik terfi kararı veya psikometrik olarak
 * valide edilmiş gelecek-performans tahmini değildir; yetenek görüşmelerinde
 * kullanılacak çok faktörlü bir karar-destek göstergesidir.
 *
 * Eksik sinyaller artık nötr 3,0 olarak puana eklenmez. Yalnızca gerçekten mevcut
 * faktörler kendi ağırlıkları oranında yeniden normalize edilir; eksik veri ayrıca
 * confidence ve missingInputs ile görünür tutulur. Böylece "veri yok" durumu
 * yanlışlıkla orta potansiyel olarak görünmez.
 */
export function calculatePotentialIndex(person: any): PotentialResult {
  const map = extractCompetencyMap(person);
  const aspiration = numeric(person?.career_aspiration ?? person?.careerAspiration);
  const mobility = numeric(person?.mobility_willingness ?? person?.mobilityWillingness);
  const missingInputs: string[] = [];

  const factorInputs: Array<Omit<PotentialFactor, "score" | "available"> & { value: number | null }> = [
    {
      key: "learning",
      label: "Öğrenme çevikliği",
      value: weightedFactorScore(map, { LRN: 0.5, ANA: 0.25, DIG: 0.25 }),
      weight: 0.3,
      source: "assessment",
    },
    {
      key: "complexity",
      label: "Analitik / karmaşıklık kapasitesi",
      value: weightedFactorScore(map, { ANA: 0.6, DET: 0.2, DIG: 0.2 }),
      weight: 0.2,
      source: "assessment",
    },
    {
      key: "resilience",
      label: "Dayanıklılık & stres yönetimi",
      value: weightedFactorScore(map, { STR: 1 }),
      weight: 0.15,
      source: "assessment",
    },
    {
      key: "collaboration",
      label: "İletişim & işbirliği",
      value: weightedFactorScore(map, { COM: 0.6, TEA: 0.4 }),
      weight: 0.15,
      source: "assessment",
    },
    {
      key: "aspiration",
      label: "Kariyer isteği",
      value: aspiration,
      weight: 0.1,
      source: "profile",
    },
    {
      key: "mobility",
      label: "Mobilite / yeni sorumluluk isteği",
      value: mobility,
      weight: 0.1,
      source: "profile",
    },
  ];

  const factors: PotentialFactor[] = factorInputs.map((factor) => {
    const available = factor.value !== null;
    if (!available) missingInputs.push(factor.label);
    return {
      key: factor.key,
      label: factor.label,
      score: factor.value ?? 0,
      weight: factor.weight,
      source: factor.source,
      available,
    };
  });

  const availableFactors = factors.filter((factor) => factor.available);
  const availableWeight = availableFactors.reduce((sum, factor) => sum + factor.weight, 0);
  const score = availableWeight > 0
    ? availableFactors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / availableWeight
    : 0;

  const requiredAssessmentCodes = ["LRN", "ANA", "DIG", "DET", "STR", "COM", "TEA"];
  const assessmentCoverage =
    requiredAssessmentCodes.filter((code) => Number.isFinite(map[code]) && map[code] > 0).length /
    requiredAssessmentCodes.length;
  const profileCoverage =
    ((aspiration !== null ? 1 : 0) + (mobility !== null ? 1 : 0)) / 2;
  const confidence = Math.round(
    Math.min(100, (assessmentCoverage * 0.75 + profileCoverage * 0.25) * 100)
  );
  const label: PotentialResult["label"] =
    availableWeight === 0 ? "Veri Yok" : score >= 4.35 ? "Çok Yüksek" : score >= 3.8 ? "Yüksek" : score >= 3.2 ? "Gelişen" : "Düşük";

  return {
    score: availableWeight > 0 ? Math.round(score * 100) / 100 : 0,
    confidence,
    factors,
    missingInputs,
    label,
  };
}

/**
 * FutureHR'ın kanonik 9-Box sınıflandırması.
 * Tüm özet ve detay ekranları aynı Türkçe hücre adlarını kullanmalıdır.
 */
export function getNineBox(performance: number, potential: number): string {
  if (!(performance > 0) || !(potential > 0)) return "Veri Eksik";
  const perfBand = performance >= 4 ? "high" : performance >= 3 ? "mid" : "low";
  const potBand = potential >= 4 ? "high" : potential >= 3 ? "mid" : "low";
  const labels: Record<string, string> = {
    "high-high": "Yıldız Oyuncu",
    "high-mid": "Güçlü Performans",
    "high-low": "Uzman Katkı",
    "mid-high": "Yüksek Potansiyel",
    "mid-mid": "Çekirdek Yetenek",
    "mid-low": "İstikrarlı Katkı",
    "low-high": "Potansiyel Yatırımı",
    "low-mid": "Gelişim Odağı",
    "low-low": "Kritik Gelişim",
  };
  return labels[`${perfBand}-${potBand}`];
}
