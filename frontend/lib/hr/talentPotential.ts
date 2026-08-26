export interface PotentialFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  source: "assessment" | "profile" | "mixed";
}

export interface PotentialResult {
  score: number;
  confidence: number;
  factors: PotentialFactor[];
  missingInputs: string[];
  label: "Düşük" | "Gelişen" | "Yüksek" | "Çok Yüksek";
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
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 3;

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
): number {
  const available = Object.entries(weights).filter(([code]) => Number.isFinite(map[code]));
  if (!available.length) return 3;
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  const weighted = available.reduce(
    (sum, [code, weight]) => sum + map[code] * weight,
    0
  );
  return clamp(weighted / totalWeight);
}

/**
 * FutureHR Potansiyel Endeksi bir otomatik terfi kararı veya psikometrik olarak
 * valide edilmiş gelecek-performans tahmini değildir; yetenek görüşmelerinde
 * kullanılacak çok faktörlü bir karar-destek göstergesidir.
 *
 * 130 soruluk temel envanter liderliği doğrudan ölçmediği için endekste
 * "liderlik kapasitesi" adıyla türetilmiş bir faktör kullanılmaz.
 * Faktörler testin gerçekten ölçtüğü yapılara dayanır:
 * - Öğrenme çevikliği %30
 * - Analitik / karmaşıklık kapasitesi %20
 * - Dayanıklılık & stres yönetimi %15
 * - İletişim & işbirliği %15
 * - Kariyer isteği %10
 * - Mobilite / yeni sorumluluk isteği %10
 *
 * Eksik profil girdileri nötr 3,0 kabul edilir ve veri güveni düşürülür.
 */
export function calculatePotentialIndex(person: any): PotentialResult {
  const map = extractCompetencyMap(person);
  const aspiration = numeric(person?.career_aspiration ?? person?.careerAspiration);
  const mobility = numeric(person?.mobility_willingness ?? person?.mobilityWillingness);
  const missingInputs: string[] = [];
  if (aspiration === null) missingInputs.push("Kariyer isteği");
  if (mobility === null) missingInputs.push("Mobilite / yeni sorumluluk isteği");

  const factors: PotentialFactor[] = [
    {
      key: "learning",
      label: "Öğrenme çevikliği",
      score: weightedFactorScore(map, { LRN: 0.5, ANA: 0.25, DIG: 0.25 }),
      weight: 0.3,
      source: "assessment",
    },
    {
      key: "complexity",
      label: "Analitik / karmaşıklık kapasitesi",
      score: weightedFactorScore(map, { ANA: 0.6, DET: 0.2, DIG: 0.2 }),
      weight: 0.2,
      source: "assessment",
    },
    {
      key: "resilience",
      label: "Dayanıklılık & stres yönetimi",
      score: weightedFactorScore(map, { STR: 1 }),
      weight: 0.15,
      source: "assessment",
    },
    {
      key: "collaboration",
      label: "İletişim & işbirliği",
      score: weightedFactorScore(map, { COM: 0.6, TEA: 0.4 }),
      weight: 0.15,
      source: "assessment",
    },
    {
      key: "aspiration",
      label: "Kariyer isteği",
      score: aspiration ?? 3,
      weight: 0.1,
      source: "profile",
    },
    {
      key: "mobility",
      label: "Mobilite / yeni sorumluluk isteği",
      score: mobility ?? 3,
      weight: 0.1,
      source: "profile",
    },
  ];

  const score = clamp(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)
  );

  const requiredAssessmentCodes = ["LRN", "ANA", "DIG", "DET", "STR", "COM", "TEA"];
  const assessmentCoverage =
    requiredAssessmentCodes.filter((code) => Number.isFinite(map[code])).length /
    requiredAssessmentCodes.length;
  const profileCoverage =
    ((aspiration !== null ? 1 : 0) + (mobility !== null ? 1 : 0)) / 2;
  const confidence = Math.round(
    Math.min(100, (assessmentCoverage * 0.75 + profileCoverage * 0.25) * 100)
  );
  const label =
    score >= 4.35 ? "Çok Yüksek" : score >= 3.8 ? "Yüksek" : score >= 3.2 ? "Gelişen" : "Düşük";

  return {
    score: Math.round(score * 100) / 100,
    confidence,
    factors,
    missingInputs,
    label,
  };
}

export function getNineBox(performance: number, potential: number): string {
  const perfBand = performance >= 4 ? "high" : performance >= 3 ? "mid" : "low";
  const potBand = potential >= 4 ? "high" : potential >= 3 ? "mid" : "low";
  const labels: Record<string, string> = {
    "high-high": "Yıldız Oyuncu",
    "high-mid": "Güçlü Performans",
    "high-low": "Uzman / Güvenilir",
    "mid-high": "Yüksek Potansiyel",
    "mid-mid": "Kilit Oyuncu",
    "mid-low": "İstikrarlı Katkı",
    "low-high": "Potansiyel Yatırımı",
    "low-mid": "Gelişim Gerekli",
    "low-low": "Kritik Risk",
  };
  return labels[`${perfBand}-${potBand}`];
}
