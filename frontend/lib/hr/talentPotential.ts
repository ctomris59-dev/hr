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
  "Stratejik Bakış": "STR",
  "Takım Çalışması": "TEA",
  "İletişim Becerileri": "COM",
};

const clamp = (value: number, min = 1, max = 5) => Math.min(max, Math.max(min, value));
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 3);

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

  return Object.fromEntries(Object.entries(buckets).map(([code, values]) => [code, avg(values)]));
}

function factorScore(map: Record<string, number>, codes: string[]): number {
  return clamp(avg(codes.map((code) => map[code]).filter((v): v is number => Number.isFinite(v))));
}

/**
 * Potansiyel mevcut performansın tekrarı değildir.
 * Endeks; öğrenme çevikliği, liderlik kapasitesi, uyum, karmaşıklık yönetimi,
 * kariyer isteği ve mobilite isteğini ayrı faktörler olarak ele alır.
 * Eksik öz-bildirim alanları nötr 3,0 kabul edilir ve güven skoru düşürülür.
 */
export function calculatePotentialIndex(person: any): PotentialResult {
  const map = extractCompetencyMap(person);
  const aspiration = numeric(person?.career_aspiration ?? person?.careerAspiration);
  const mobility = numeric(person?.mobility_willingness ?? person?.mobilityWillingness);
  const missingInputs: string[] = [];
  if (aspiration === null) missingInputs.push("Kariyer isteği");
  if (mobility === null) missingInputs.push("Mobilite isteği");

  const factors: PotentialFactor[] = [
    { key: "learning", label: "Öğrenme çevikliği", score: factorScore(map, ["LRN", "ANA", "DIG"]), weight: 0.30, source: "assessment" },
    { key: "leadership", label: "Liderlik kapasitesi", score: factorScore(map, ["STR", "COM", "TEA", "RES"]), weight: 0.25, source: "assessment" },
    { key: "adaptability", label: "Uyum & değişim", score: factorScore(map, ["LRN", "DIG", "DIS"]), weight: 0.15, source: "assessment" },
    { key: "complexity", label: "Karmaşıklık yönetimi", score: factorScore(map, ["ANA", "STR", "DET"]), weight: 0.10, source: "assessment" },
    { key: "aspiration", label: "Kariyer isteği", score: aspiration ?? 3, weight: 0.10, source: "profile" },
    { key: "mobility", label: "Mobilite isteği", score: mobility ?? 3, weight: 0.10, source: "profile" },
  ];

  const score = clamp(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0));
  const assessmentCoverage = Object.keys(map).length / 10;
  const profileCoverage = ((aspiration !== null ? 1 : 0) + (mobility !== null ? 1 : 0)) / 2;
  const confidence = Math.round(Math.min(100, (assessmentCoverage * 0.75 + profileCoverage * 0.25) * 100));
  const label = score >= 4.35 ? "Çok Yüksek" : score >= 3.8 ? "Yüksek" : score >= 3.2 ? "Gelişen" : "Düşük";

  return { score: Math.round(score * 100) / 100, confidence, factors, missingInputs, label };
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
