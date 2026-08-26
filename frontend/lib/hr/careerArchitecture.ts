import { JOB_PROFILES } from "../../app/data/jobData";
import { calculatePotentialIndex, extractCompetencyMap } from "./talentPotential";

export type JobLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

export interface CareerRole {
  title: string;
  family: string;
  level: JobLevel;
  levelRank: number;
  targetProfile: Record<string, number>;
}

const LEVEL_LABELS: Record<JobLevel, string> = {
  L1: "Başlangıç / Destek",
  L2: "Uzman",
  L3: "Kıdemli Uzman / Sorumlu",
  L4: "Müdür / Takım Lideri",
  L5: "Direktör / Fonksiyon Lideri",
  L6: "Üst Yönetim",
};

export const JOB_LEVELS = LEVEL_LABELS;

export function inferJobLevel(position: string): JobLevel {
  const p = String(position || "").toLocaleLowerCase("tr-TR");
  if (/ceo|cfo|coo|chro|cto|cio|başkan|genel sekreter$|genel müdür|başkan yardımcısı/.test(p)) return "L6";
  if (/direktör|director|genel sekreter yardımcısı/.test(p)) return "L5";
  if (/müdür|manager|lider|lead|head|servis sorumlusu/.test(p)) return "L4";
  if (/kıdemli|senior|sorumlu|chief|yetkili/.test(p)) return "L3";
  if (/uzman|analist|mühendis|danışman|temsilci|specialist|engineer/.test(p)) return "L2";
  return "L1";
}

export function inferJobFamily(position: string): string {
  const p = String(position || "").toLocaleLowerCase("tr-TR");
  const rules: Array<[RegExp, string]> = [
    [/insan kaynak|ik |human resources|talent|bordro|ücret/, "İnsan Kaynakları"],
    [/finans|muhasebe|bütçe|hazine|cfo/, "Finans"],
    [/yazılım|bilgi işlem| bt | it |data|veri|dijital|siber|cto|cio/, "Teknoloji & Dijital"],
    [/satış|sales|pazarlama|marketing|crm|müşteri/, "Satış & Pazarlama"],
    [/operasyon|üretim|fabrika|süreç|saha|coo/, "Operasyon"],
    [/satın alma|tedarik|procurement/, "Satın Alma & Tedarik"],
    [/hukuk|uyum|legal|kvkk|compliance/, "Hukuk & Uyum"],
    [/iletişim|basın|marka|sürdürülebilirlik|kurumsal ilişkiler/, "Kurumsal İletişim"],
    [/denetim|risk|kalite|audit/, "Denetim, Risk & Kalite"],
    [/ticaret sicil|kapasite|proje|arge|araştırma|oda|borsa/, "TSO / Meslek Kuruluşu"],
  ];
  return rules.find(([re]) => re.test(p))?.[1] || "Genel Yönetim & Destek";
}

export function getCareerRole(position: string): CareerRole {
  return {
    title: position,
    family: inferJobFamily(position),
    level: inferJobLevel(position),
    levelRank: Number(inferJobLevel(position).slice(1)),
    targetProfile: JOB_PROFILES[position] || {},
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
  "Stratejik Bakış": "STR",
  "Takım Çalışması": "TEA",
  "İletişim Becerileri": "COM",
};

function competencyFit(person: any, targetPosition: string): number {
  const target = JOB_PROFILES[targetPosition] || {};
  const current = extractCompetencyMap(person);
  const keys = Object.keys(target);
  if (!keys.length) return 50;
  let weighted = 0;
  let count = 0;
  keys.forEach((label) => {
    const code = COMPETENCY_LABEL_TO_CODE[label] || label;
    const actual = current[code];
    const expected = Number(target[label]);
    if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected <= 0) return;
    weighted += Math.min(1, actual / expected) * 100;
    count += 1;
  });
  return count ? weighted / count : 50;
}

function tenureYears(person: any): number {
  const direct = Number(person?.["Kıdem (Yıl)"] ?? person?.Calisma_Yili ?? person?.tenure);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const start = person?.["İşe Giriş Tarihi"] || person?.hireDate;
  if (!start) return 0;
  const date = new Date(start);
  return Number.isNaN(date.getTime()) ? 0 : Math.max(0, (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
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
  notes: string[];
}

/**
 * Bu değer bir "terfi kararı" değildir; hedef role hazır bulunuşluk endeksidir.
 * Yetkinlik uyumu %50, performans %20, potansiyel %15, deneyim %10,
 * kariyer isteği %5 ağırlık alır. Hedef rol birden fazla kademe uzaktaysa endeks düşürülür.
 */
export function calculateCareerReadiness(person: any, targetPosition: string): CareerReadiness {
  const currentRole = getCareerRole(person?.Pozisyon || person?.position || "");
  const targetRole = getCareerRole(targetPosition);
  const levelDistance = Math.max(0, targetRole.levelRank - currentRole.levelRank);
  const fit = competencyFit(person, targetPosition);
  const performanceScore = Math.min(100, Math.max(0, (Number(person?.Performans ?? person?.performance ?? 0) / 5) * 100));
  const potentialResult = calculatePotentialIndex(person);
  const potentialScore = (potentialResult.score / 5) * 100;
  const years = tenureYears(person);
  const experienceScore = Math.min(100, years >= 5 ? 100 : years * 20);
  const aspirationRaw = Number(person?.career_aspiration ?? person?.careerAspiration ?? 3);
  const aspirationScore = Math.min(100, Math.max(0, (aspirationRaw / 5) * 100));
  let index = fit * 0.5 + performanceScore * 0.2 + potentialScore * 0.15 + experienceScore * 0.1 + aspirationScore * 0.05;
  if (levelDistance > 1) index -= Math.min(20, (levelDistance - 1) * 10);
  if (targetRole.family !== currentRole.family) index -= 5;
  index = Math.round(Math.min(100, Math.max(0, index)));
  const band = index >= 80 ? "Hazır" : index >= 65 ? "Yakın" : index >= 45 ? "Gelişim Gerekli" : "Uzun Vadeli";
  const notes: string[] = [];
  if (levelDistance > 1) notes.push(`Hedef rol mevcut seviyenin ${levelDistance} kademe üzerinde.`);
  if (fit < 70) notes.push("Hedef rol yetkinliklerinde anlamlı gelişim alanı var.");
  if (potentialResult.missingInputs.length) notes.push(`Potansiyel güveni için eksik: ${potentialResult.missingInputs.join(", ")}.`);
  return { index, band, competencyFit: Math.round(fit), performance: Math.round(performanceScore), potential: Math.round(potentialScore), experience: Math.round(experienceScore), aspiration: Math.round(aspirationScore), levelDistance, notes };
}
