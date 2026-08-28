import { JOB_PROFILES as LEGACY_JOB_PROFILES } from "../../app/data/jobData";
import {
  buildJobProfilesV2,
  JOB_PROFILE_METADATA,
  JOB_PROFILE_WEIGHTS,
  JOB_COMPETENCY_MODEL_VERSION,
  resolveBenchmarkPosition,
} from "./jobCompetencyArchitecture";
import { calculatePotentialIndex, extractCompetencyMap } from "./talentPotential";

export type JobLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

export interface CareerRole {
  title: string;
  canonicalTitle: string;
  family: string;
  level: JobLevel;
  levelRank: number;
  targetProfile: Record<string, number>;
}

export interface TargetProfileResolution {
  profile: Record<string, number>;
  source: "exact" | "family-level" | "level" | "generic";
  referenceCount: number;
  modelVersion?: string;
  evidenceConfidence?: "A" | "B" | "C";
  canonicalPosition?: string;
  aliasMatched?: boolean;
  aliasVia?: "canonical" | "alias" | "normalized" | "none";
}

const JOB_PROFILES = buildJobProfilesV2(LEGACY_JOB_PROFILES);

const LEVEL_LABELS: Record<JobLevel, string> = {
  L1: "Başlangıç / Destek",
  L2: "Uzman / Profesyonel",
  L3: "Kıdemli Uzman / Sorumlu / Süpervizör",
  L4: "Müdür / Takım Lideri",
  L5: "Direktör / Fonksiyon Lideri",
  L6: "Başkan Yardımcısı / Üst Fonksiyon Yönetimi",
  L7: "C-Level / Tepe Yönetim",
};
export const JOB_LEVELS = LEVEL_LABELS;

function canonicalFor(position: string): string {
  const resolution = resolveBenchmarkPosition(position);
  return resolution.matched ? resolution.canonical : String(position || "").trim();
}

export function inferJobLevel(position: string): JobLevel {
  const canonical = canonicalFor(position);
  const p = String(canonical || "").toLocaleLowerCase("tr-TR");
  const metadata = JOB_PROFILE_METADATA[canonical];
  if (metadata?.level) return metadata.level;
  if (/\b(cfo|chro|cpo|coo|cco|cmo|cio|cto|cdo|clo)\b|chief audit executive|chief corporate affairs officer|ceo|genel sekreter$/.test(p)) return "L7";
  if (/başkan yardımcısı|bölgesel cfo|regional cfo/.test(p)) return "L6";
  if (/direktör|director|genel sekreter yardımcısı/.test(p)) return "L5";
  if (/müdür|manager/.test(p)) return "L4";
  if (/kıdemli|senior|lider|lead|süpervizör|supervisor|sorumlu|yetkili|key account manager|kilit müşteri yöneticisi/.test(p)) return "L3";
  if (/uzman|analist|mühendis|danışman|temsilci|denetçi|specialist|engineer|consultant/.test(p)) return "L2";
  return "L1";
}

export function inferJobFamily(position: string): string {
  const canonical = canonicalFor(position);
  const p = String(canonical || "").toLocaleLowerCase("tr-TR");
  const metadata = JOB_PROFILE_METADATA[canonical];
  if (metadata?.family) return metadata.family;
  const rules: Array<[RegExp, string]> = [
    [/insan kaynak|\bik\b|human resources|talent|bordro|ücret/, "İnsan Kaynakları"],
    [/finans|muhasebe|bütçe|hazine|cfo/, "Finans & Muhasebe"],
    [/yazılım|bilgi işlem|\bbt\b|\bit\b|data|veri|dijital|siber|cto|cio|cdo/, "BT & Dijital"],
    [/satış|sales|pazarlama|marketing|crm|müşteri|cco|cmo/, "Satış & Pazarlama"],
    [/operasyon|üretim|fabrika|süreç|saha|coo/, "Operasyon & Üretim"],
    [/satın alma|tedarik|procurement|cpo/, "Satın Alma & Tedarik Zinciri"],
    [/hukuk|uyum|legal|kvkk|compliance|clo/, "Hukuk & Uyum"],
    [/iletişim|basın|marka|sürdürülebilirlik|kurumsal ilişkiler|corporate affairs/, "Kurumsal İletişim & Sürdürülebilirlik"],
    [/denetim|risk|kalite|audit/, "Denetim, Risk & Kalite"],
    [/ticaret sicil|kapasite|proje|arge|araştırma|oda|borsa/, "TSO / Meslek Kuruluşu"],
  ];
  return rules.find(([re]) => re.test(p))?.[1] || "Genel Yönetim & Destek";
}

function averageProfiles(entries: Array<[string, Record<string, number>]>): Record<string, number> {
  if (!entries.length) return {};
  const buckets: Record<string, number[]> = {};
  entries.forEach(([, profile]) => {
    Object.entries(profile || {}).forEach(([label, value]) => {
      const score = Number(value);
      if (!Number.isFinite(score)) return;
      if (!buckets[label]) buckets[label] = [];
      buckets[label].push(score);
    });
  });
  return Object.fromEntries(Object.entries(buckets).map(([label, values]) => [
    label,
    Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100,
  ]));
}

export function resolveTargetProfile(position: string): TargetProfileResolution {
  const aliasResolution = resolveBenchmarkPosition(position);
  const canonicalPosition = aliasResolution.matched ? aliasResolution.canonical : String(position || "").trim();
  const exact = JOB_PROFILES[canonicalPosition];

  if (exact && Object.keys(exact).length) {
    const metadata = JOB_PROFILE_METADATA[canonicalPosition];
    return {
      profile: exact,
      source: "exact",
      referenceCount: 1,
      modelVersion: metadata?.modelVersion || JOB_COMPETENCY_MODEL_VERSION,
      evidenceConfidence: metadata?.confidence,
      canonicalPosition,
      aliasMatched: aliasResolution.matched && canonicalPosition !== String(position || "").trim(),
      aliasVia: aliasResolution.via,
    };
  }

  const level = inferJobLevel(canonicalPosition);
  const family = inferJobFamily(canonicalPosition);
  const all = Object.entries(JOB_PROFILES) as Array<[string, Record<string, number>]>;
  const sameFamilyLevel = all.filter(([title]) => inferJobLevel(title) === level && inferJobFamily(title) === family);
  if (sameFamilyLevel.length) return {
    profile: averageProfiles(sameFamilyLevel),
    source: "family-level",
    referenceCount: sameFamilyLevel.length,
    modelVersion: JOB_COMPETENCY_MODEL_VERSION,
    canonicalPosition,
    aliasMatched: false,
    aliasVia: aliasResolution.via,
  };

  const sameLevel = all.filter(([title]) => inferJobLevel(title) === level);
  if (sameLevel.length) return {
    profile: averageProfiles(sameLevel),
    source: "level",
    referenceCount: sameLevel.length,
    modelVersion: JOB_COMPETENCY_MODEL_VERSION,
    canonicalPosition,
    aliasMatched: false,
    aliasVia: aliasResolution.via,
  };

  const generic = averageProfiles(all);
  return {
    profile: generic,
    source: "generic",
    referenceCount: all.length,
    modelVersion: JOB_COMPETENCY_MODEL_VERSION,
    canonicalPosition,
    aliasMatched: false,
    aliasVia: aliasResolution.via,
  };
}

export function getCareerRole(position: string): CareerRole {
  const resolution = resolveTargetProfile(position);
  const canonicalTitle = resolution.canonicalPosition || position;
  const level = inferJobLevel(canonicalTitle);
  return {
    title: position,
    canonicalTitle,
    family: inferJobFamily(canonicalTitle),
    level,
    levelRank: Number(level.slice(1)),
    targetProfile: resolution.profile,
  };
}

export function buildCareerArchitecture(positions: string[]): Record<string, CareerRole[]> {
  const result: Record<string, CareerRole[]> = {};
  positions.forEach((position) => {
    const role = getCareerRole(position);
    if (!result[role.family]) result[role.family] = [];
    result[role.family].push(role);
  });
  Object.values(result).forEach((roles) => roles.sort((a, b) => a.levelRank - b.levelRank || a.title.localeCompare(b.title, "tr")));
  return result;
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

function competencyFit(person: any, targetPosition: string): { score: number; coverage: number } {
  const resolution = resolveTargetProfile(targetPosition);
  const target = resolution.profile;
  const current = extractCompetencyMap(person);
  const keys = Object.keys(target);
  if (!keys.length) return { score: 0, coverage: 0 };

  const weightKey = resolution.canonicalPosition || targetPosition;
  const roleWeights = JOB_PROFILE_WEIGHTS[weightKey];
  let weightedScore = 0;
  let usedWeight = 0;
  let totalPossibleWeight = 0;
  keys.forEach((label) => {
    const code = COMPETENCY_LABEL_TO_CODE[label] || label;
    const actual = current[code];
    const expected = Number(target[label]);
    const weight = Number(roleWeights?.[label] ?? 1);
    if (!Number.isFinite(expected) || expected <= 0 || !Number.isFinite(weight) || weight <= 0) return;
    totalPossibleWeight += weight;
    if (!Number.isFinite(actual) || actual <= 0) return;
    weightedScore += Math.min(1, actual / expected) * 100 * weight;
    usedWeight += weight;
  });
  return {
    score: usedWeight ? weightedScore / usedWeight : 0,
    coverage: totalPossibleWeight ? Math.round((usedWeight / totalPossibleWeight) * 100) : 0,
  };
}

function tenureInfo(person: any): { years: number; available: boolean } {
  const direct = Number(person?.["Kıdem (Yıl)"] ?? person?.Calisma_Yili ?? person?.tenure);
  if (Number.isFinite(direct) && direct >= 0) return { years: direct, available: true };
  const start = person?.["İşe Giriş Tarihi"] || person?.hireDate;
  if (!start) return { years: 0, available: false };
  const date = new Date(start);
  return Number.isNaN(date.getTime())
    ? { years: 0, available: false }
    : { years: Math.max(0, (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)), available: true };
}

function fivePoint(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

export interface CareerReadiness {
  index: number;
  band: "Hazır" | "Yakın" | "Gelişim Gerekli" | "Uzun Vadeli";
  competencyFit: number;
  performance: number;
  potential: number;
  experience: number;
  aspiration: number;
  levelDistance: number;
  dataCoverage: number;
  notes: string[];
}

export function calculateCareerReadiness(person: any, targetPosition: string): CareerReadiness {
  const currentRole = getCareerRole(person?.Pozisyon || person?.position || "");
  const targetRole = getCareerRole(targetPosition);
  const targetResolution = resolveTargetProfile(targetPosition);
  const levelDistance = Math.max(0, targetRole.levelRank - currentRole.levelRank);
  const fitResult = competencyFit(person, targetPosition);
  const performanceRaw = fivePoint(person?.Performans ?? person?.performance);
  const performanceScore = performanceRaw === null ? 0 : (performanceRaw / 5) * 100;
  const potentialResult = calculatePotentialIndex(person);
  const potentialScore = potentialResult.score > 0 ? (potentialResult.score / 5) * 100 : 0;
  const tenure = tenureInfo(person);
  const experienceScore = tenure.available ? Math.min(100, tenure.years >= 5 ? 100 : tenure.years * 20) : 0;
  const aspirationRaw = fivePoint(person?.career_aspiration ?? person?.careerAspiration);
  const aspirationScore = aspirationRaw === null ? 0 : (aspirationRaw / 5) * 100;

  const components = [
    { key: "competency", score: fitResult.score, weight: 0.5 * (fitResult.coverage / 100), available: fitResult.coverage > 0 },
    { key: "performance", score: performanceScore, weight: 0.2, available: performanceRaw !== null },
    { key: "potential", score: potentialScore, weight: 0.15 * (potentialResult.confidence / 100), available: potentialResult.score > 0 && potentialResult.confidence > 0 },
    { key: "experience", score: experienceScore, weight: 0.1, available: tenure.available },
    { key: "aspiration", score: aspirationScore, weight: 0.05, available: aspirationRaw !== null },
  ].filter((component) => component.available && component.weight > 0);

  const usedWeight = components.reduce((sum, component) => sum + component.weight, 0);
  let index = usedWeight > 0
    ? components.reduce((sum, component) => sum + component.score * component.weight, 0) / usedWeight
    : 0;
  if (levelDistance > 1) index -= Math.min(20, (levelDistance - 1) * 10);
  if (targetRole.family !== currentRole.family) index -= 5;

  const dataCoverage = Math.round(Math.min(100, usedWeight * 100));
  if (dataCoverage < 40) index = Math.min(index, 44);
  else if (dataCoverage < 60) index = Math.min(index, 64);
  index = Math.round(Math.min(100, Math.max(0, index)));
  const band = index >= 80 ? "Hazır" : index >= 65 ? "Yakın" : index >= 45 ? "Gelişim Gerekli" : "Uzun Vadeli";

  const notes: string[] = [];
  if (targetResolution.aliasMatched && targetResolution.canonicalPosition) {
    notes.push(`Pozisyon adı FutureHR kanonik rolüne eşlendi: ${targetPosition} → ${targetResolution.canonicalPosition}.`);
  }
  if (targetResolution.source !== "exact") notes.push(`Pozisyona özel profil bulunmadığı için hedef, ${targetResolution.referenceCount} benzer rol profilinden türetildi.`);
  if (targetResolution.evidenceConfidence) notes.push(`FutureHR rol benchmark güveni: ${targetResolution.evidenceConfidence} · ${targetResolution.modelVersion}.`);
  const weightKey = targetResolution.canonicalPosition || targetPosition;
  if (JOB_PROFILE_WEIGHTS[weightKey]) notes.push("Rol uyumu, FHR-COMP-JOB-2.1 kritik yetkinlik ağırlıklarıyla hesaplandı.");
  if (levelDistance > 1) notes.push(`Hedef rol mevcut seviyenin ${levelDistance} kademe üzerinde.`);
  if (fitResult.coverage < 70) notes.push(`Hedef rol yetkinlik veri kapsamı %${fitResult.coverage}; eksik yetkinlikler nötr puanla doldurulmadı.`);
  if (fitResult.score > 0 && fitResult.score < 70) notes.push("Hedef rol yetkinliklerinde anlamlı gelişim alanı var.");
  if (performanceRaw === null) notes.push("Geçerli performans ölçümü bulunmuyor.");
  if (!tenure.available) notes.push("Deneyim/kıdem bilgisi bulunmuyor.");
  if (aspirationRaw === null) notes.push("Kariyer isteği teyit edilmemiş; hazır bulunuşluk puanına nötr değer eklenmedi.");
  if (potentialResult.missingInputs.length) notes.push(`Potansiyel güveni için eksik: ${potentialResult.missingInputs.join(", ")}.`);
  if (dataCoverage < 60) notes.push(`Karar veri kapsamı %${dataCoverage}; düşük veriyle "Hazır" sonucu üretilmez.`);

  return {
    index,
    band,
    competencyFit: Math.round(fitResult.score),
    performance: Math.round(performanceScore),
    potential: Math.round(potentialScore),
    experience: Math.round(experienceScore),
    aspiration: Math.round(aspirationScore),
    levelDistance,
    dataCoverage,
    notes,
  };
}
