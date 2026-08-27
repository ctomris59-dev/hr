/**
 * FutureHR Role Competency Architecture — FHR-COMP-JOB-2.1
 *
 * 178 canonical roles have explicit, individually reviewed target profiles.
 * Family models are used for weighting/evidence metadata only; they no longer generate
 * canonical target scores. Unknown/custom company titles may fall back to comparable roles.
 */
import { CURATED_JOB_PROFILES, CURATED_ROLE_COUNT } from "./jobCompetencyCatalogV21";
import { resolveCanonicalPositionTitle, type PositionAliasResolution } from "./jobPositionAliases";

export const JOB_COMPETENCY_MODEL_VERSION = "FHR-COMP-JOB-2.1" as const;
export const RESILIENCE_LABEL = "Dayanıklılık & Stres Yönetimi" as const;
export const LEGACY_STRATEGY_LABEL = "Stratejik Bakış" as const;

export const FUTUREHR_COMPETENCIES = [
  "Dijital Okuryazarlık",
  "Analitik Düşünme",
  "Sonuç Odaklılık",
  "Detaylara Özen",
  "Sürekli Öğrenme",
  "Etik ve Uyum",
  "Öz-Disiplin",
  RESILIENCE_LABEL,
  "Takım Çalışması",
  "İletişim Becerileri",
] as const;

export type FutureHRCompetency = (typeof FUTUREHR_COMPETENCIES)[number];
export type CompetencyProfile = Record<FutureHRCompetency, number>;
export type CompetencyWeights = Record<FutureHRCompetency, number>;
export type EvidenceConfidence = "A" | "B" | "C";
export type EvidenceLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

export interface JobProfileMetadata {
  modelVersion: typeof JOB_COMPETENCY_MODEL_VERSION;
  family: string;
  level: EvidenceLevel;
  confidence: EvidenceConfidence;
  evidence: string[];
  rationale: string;
  status: "curated-v2.1" | "legacy-fallback";
  smeValidationRecommended: boolean;
}

export const EVIDENCE_REFERENCES = {
  onet: "O*NET 30.3 occupational information / Work Styles impact and distinctiveness",
  esco: "ESCO v1.2.1 Skills-Occupations Matrix / ISCO crosswalk",
  opm: "U.S. OPM Job Analysis: job relatedness, importance/criticality and SME confirmation",
} as const;

const C = {
  DIG:"Dijital Okuryazarlık", ANA:"Analitik Düşünme", RES:"Sonuç Odaklılık",
  DET:"Detaylara Özen", LRN:"Sürekli Öğrenme", ETH:"Etik ve Uyum",
  DIS:"Öz-Disiplin", STR:RESILIENCE_LABEL, TEA:"Takım Çalışması", COM:"İletişim Becerileri",
} as const;

type FamilyKey = "tso"|"executive"|"strategy"|"finance"|"hr"|"procurement"|"operations"|"sales"|"technology"|"legal"|"communications"|"audit"|"administration"|"general";

interface FamilyEvidence {
  label:string;
  evidence:string[];
  baseWeights:CompetencyWeights;
  rationale:string;
}

const weights=(DIG:number,ANA:number,RES:number,DET:number,LRN:number,ETH:number,DIS:number,STR:number,TEA:number,COM:number):CompetencyWeights => ({
  [C.DIG]:DIG,[C.ANA]:ANA,[C.RES]:RES,[C.DET]:DET,[C.LRN]:LRN,[C.ETH]:ETH,[C.DIS]:DIS,[C.STR]:STR,[C.TEA]:TEA,[C.COM]:COM,
} as CompetencyWeights);
const O=EVIDENCE_REFERENCES.onet,E=EVIDENCE_REFERENCES.esco,P=EVIDENCE_REFERENCES.opm;

const FAMILY_EVIDENCE:Record<FamilyKey,FamilyEvidence>={
  tso:{label:"TSO / Meslek Kuruluşu",evidence:[O,E,P],baseWeights:weights(8,12,10,15,10,14,12,6,6,7),rationale:"Yerel oda/borsa rolleri için görev benzerliği, mevzuat/kayıt hassasiyeti ve SME doğrulaması birlikte kullanılır."},
  executive:{label:"Tepe Yönetim",evidence:["O*NET 11-1011 Chief Executives",E,P],baseWeights:weights(6,13,17,4,9,11,9,12,8,11),rationale:"Kurumsal sonuç, karar, dayanıklılık, etik ve paydaş iletişimi tepe yönetim rollerinde ayırt edicidir."},
  strategy:{label:"Strateji",evidence:["O*NET 13-1111 Management Analysts proxy",E,P],baseWeights:weights(8,20,11,11,15,7,7,6,6,9),rationale:"Analitik düşünme, öğrenme ve karmaşık karar desteği strateji ailesinin çekirdeğidir."},
  finance:{label:"Finans & Muhasebe",evidence:["O*NET 11-3031 Financial Managers","O*NET 13-2011 Accountants and Auditors",E,P],baseWeights:weights(7,17,10,18,6,15,10,5,4,8),rationale:"Analitik muhakeme, finansal doğruluk, etik ve güvenilirlik kritik; alt uzmanlığa göre profil şekillenir."},
  hr:{label:"İnsan Kaynakları",evidence:["O*NET 11-3121 Human Resources Managers","O*NET 13-1071 Human Resources Specialists",E,P],baseWeights:weights(7,10,8,8,11,11,8,7,13,17),rationale:"İletişim, işbirliği, etik ve insan odaklı karar verme; uzmanlığa göre analitik, öğrenme veya detay gerekliliği artar."},
  procurement:{label:"Satın Alma & Tedarik Zinciri",evidence:["O*NET 11-3061 Purchasing Managers",E,P],baseWeights:weights(7,14,14,12,7,12,10,7,7,10),rationale:"Ticari analiz, sonuç, tedarik riski, etik, doğruluk ve müzakere/paydaş iletişimi birlikte rol başarısını belirler."},
  operations:{label:"Operasyon & Üretim",evidence:["O*NET 11-1021 General and Operations Managers","O*NET 17-2112 Industrial Engineers",E,P],baseWeights:weights(6,12,17,15,7,9,13,10,7,4),rationale:"Teslim/süreklilik, disiplin, detay, problem çözme ve stres altında işlevsellik temel eksendir."},
  sales:{label:"Satış & Pazarlama",evidence:["O*NET 11-2022 Sales Managers","O*NET 11-2021 Marketing Managers",E,P],baseWeights:weights(8,9,18,5,8,7,8,10,9,18),rationale:"Sonuç, müşteri iletişimi, dayanıklılık ve pazar öğrenmesi ticari rolleri ayrıştırır."},
  technology:{label:"BT & Dijital",evidence:["O*NET 11-3021 Computer and Information Systems Managers","O*NET 15-1252 Software Developers","O*NET 15-2051 Data Scientists",E,P],baseWeights:weights(18,17,8,14,15,8,6,4,5,5),rationale:"Dijital yetkinlik, analitik düşünme, detay ve sürekli öğrenme çekirdektir; takım/iletişim modern teknik çalışma için korunur."},
  legal:{label:"Hukuk & Uyum",evidence:["O*NET 23-1011 Lawyers","O*NET 13-1041 Compliance Officers",E,P],baseWeights:weights(5,16,7,18,8,18,10,5,4,9),rationale:"Hukuki muhakeme, detay doğruluğu, etik/uyum ve disiplin temel gerekliliklerdir."},
  communications:{label:"Kurumsal İletişim & Sürdürülebilirlik",evidence:["O*NET 11-2032 Public Relations Managers","O*NET 27-3031 Public Relations Specialists",E,P],baseWeights:weights(8,7,9,6,8,8,7,9,12,26),rationale:"İletişim, işbirliği, uyarlanabilirlik ve itibar/paydaş yönetimi belirleyicidir."},
  audit:{label:"Denetim, Risk & Kalite",evidence:["O*NET 13-2011 Accountants and Auditors","O*NET 13-1041 Compliance Officers",E,P],baseWeights:weights(6,16,8,19,7,17,12,6,4,5),rationale:"Analitik inceleme, hata yakalama, etik bağımsızlık ve disiplin yüksek hata maliyeti nedeniyle belirleyicidir."},
  administration:{label:"İdari İşler & Destek",evidence:["O*NET 11-3012 Administrative Services Managers","O*NET 43-6011 Executive Secretaries and Executive Administrative Assistants",E,P],baseWeights:weights(5,6,11,17,6,13,16,9,8,9),rationale:"İş sürekliliği, düzen, güvenilirlik, gizlilik, detay ve servis iletişimi rol seviyesine göre dengelenir."},
  general:{label:"Genel Yönetim & Destek",evidence:[O,E,P],baseWeights:weights(7,10,13,10,8,12,11,9,9,11),rationale:"Doğrudan aile eşleşmesi olmayan roller için genel benchmark; kurum içi SME doğrulaması özellikle önemlidir."},
};

function text(role:string){return String(role||"").toLocaleLowerCase("tr-TR");}
function inferFamilyKey(role:string):FamilyKey{
  const r=text(role);
  if(/genel sekreter|ticaret sicil|kapasite servis|proje ve sanayi|arge servis|araştırma servis|muhasebe servis|yazı işleri|dijital arşiv|basın yayın|iletişim ve danışma|bilgi işlem servis|bakım onarım|destek personel|makam |eğitim sorumlusu/.test(r)) return "tso";
  if(/yönetim kurulu|\bceo\b|global ceo|bölge ceo|deputy ceo/.test(r)) return "executive";
  if(/strategy officer|strateji/.test(r)) return "strategy";
  if(/\bcfo\b|finans|mali işler|muhasebe müdürü|bütçe|hazine|treasury|maliyet muhasebesi/.test(r)) return "finance";
  if(/chro|\bik\b|insan kaynak|organizasyonel gelişim|yetenek yönetimi|eğitim ve gelişim|ücret ve yan hak|iş ortağı|bordro|işe alım/.test(r)) return "hr";
  if(/\bcpo\b|satın alma|tedarik|kategori müdürü|procurement/.test(r)) return "procurement";
  if(/\bcoo\b|operasyon|üretim|fabrika|vardiya|süreç geliştirme|yalın üretim|saha süpervizörü/.test(r)) return "operations";
  if(/\bcco\b|chief sales|\bcmo\b|satış|pazarlama|marka direktörü|iş geliştirme|key account|kilit müşteri|crm/.test(r)) return "sales";
  if(/\bcio\b|\bcto\b|\bcdo\b|\bit\b|\bbt\b|dijital dönüşüm|siber|altyapı|uygulama geliştirme|veri analitiği|yazılım|data scientist|sistem uzmanı/.test(r)) return "technology";
  if(/\bclo\b|hukuk|uyum|compliance|kvkk|gdpr|sözleşme/.test(r)) return "legal";
  if(/corporate affairs|kurumsal iletişim|kurumsal ilişkiler|sürdürülebilirlik|marka ve itibar|basın ve medya|iç iletişim/.test(r)) return "communications";
  if(/chief audit|denetim|risk yönetimi|risk analisti|kalite direktörü|kalite güvence|kalite uzmanı|kalite asistanı/.test(r)) return "audit";
  if(/idari işler|tesis yönetimi|ofis yöneticisi|yönetici asistanı|departman asistanı|sekreter|ofis destek|genel - ofis/.test(r)) return "administration";
  return "general";
}

function inferLevel(role:string):EvidenceLevel{
  const r=text(role);
  if(/\b(ceo|cfo|chro|cpo|coo|cco|cmo|cio|cto|cdo|clo)\b|chief audit executive|chief corporate affairs officer|yönetim kurulu başkanı/.test(r)) return "L7";
  if(/başkan yardımcısı|bölgesel cfo|regional cfo|yönetim kurulu başkan yardımcısı/.test(r)) return "L6";
  if(/direktör|director|genel sekreter yardımcısı/.test(r)) return "L5";
  if(/müdür|manager|genel sekreter$/.test(r)) return "L4";
  if(/kıdemli|senior|lider|lead|süpervizör|supervisor|sorumlu|yetkili|key account manager|kilit müşteri yöneticisi/.test(r)) return "L3";
  if(/uzman|analist|mühendis|danışman|temsilci|denetçi|specialist|engineer|consultant/.test(r)) return "L2";
  return "L1";
}

function confidence(role:string,family:FamilyKey):EvidenceConfidence{
  if(family==="tso") return /muhasebe servis|bilgi işlem servis|bakım onarım|makam şoförü|makam güvenlik/.test(text(role))?"B":"C";
  if(family==="general") return "C";
  return "A";
}

function normalizeWeights(raw:CompetencyWeights):CompetencyWeights{
  const total=FUTUREHR_COMPETENCIES.reduce((s,c)=>s+Number(raw[c]||0),0)||100;
  const out={} as CompetencyWeights; let used=0;
  FUTUREHR_COMPETENCIES.forEach((c,i)=>{
    if(i===FUTUREHR_COMPETENCIES.length-1) out[c]=Math.round((100-used)*10)/10;
    else {out[c]=Math.round((raw[c]/total*100)*10)/10;used+=out[c];}
  });
  return out;
}

/** Weighting uses occupational-family importance plus the explicit target's role-criticality signal. */
function buildWeights(role:string,profile:Record<string,number>):CompetencyWeights{
  const base=FAMILY_EVIDENCE[inferFamilyKey(role)].baseWeights;
  const raw={} as CompetencyWeights;
  FUTUREHR_COMPETENCIES.forEach(c=>{
    const target=Number(profile[c]||4);
    const criticalityBoost=Math.max(-2,Math.min(5,(target-4.0)*5));
    raw[c]=Math.max(1,Number(base[c]||1)+criticalityBoost);
  });
  return normalizeWeights(raw);
}

export const CANONICAL_JOB_TITLES=Object.keys(CURATED_JOB_PROFILES);
export { CURATED_ROLE_COUNT };

export function resolveBenchmarkPosition(position:string):PositionAliasResolution{
  return resolveCanonicalPositionTitle(position,CANONICAL_JOB_TITLES);
}

export const JOB_PROFILE_METADATA:Record<string,JobProfileMetadata>=Object.fromEntries(
  CANONICAL_JOB_TITLES.map(role=>{
    const family=inferFamilyKey(role), f=FAMILY_EVIDENCE[family];
    return [role,{
      modelVersion:JOB_COMPETENCY_MODEL_VERSION,
      family:f.label,
      level:inferLevel(role),
      confidence:confidence(role,family),
      evidence:f.evidence,
      rationale:`${f.rationale} Bu kanonik rolün 10 hedef puanı FHR-COMP-JOB-2.1 kapsamında rol bazında açıkça gözden geçirilmiş ve sabitlenmiştir.`,
      status:"curated-v2.1",
      smeValidationRecommended:true,
    } satisfies JobProfileMetadata];
  })
);

export const JOB_PROFILE_WEIGHTS:Record<string,CompetencyWeights>=Object.fromEntries(
  CANONICAL_JOB_TITLES.map(role=>[role,buildWeights(role,CURATED_JOB_PROFILES[role])])
);

function normalizeLegacyFallback(profile:Record<string,number>):CompetencyProfile{
  const out={} as CompetencyProfile;
  FUTUREHR_COMPETENCIES.forEach(c=>{
    // Old "Stratejik Bakış" must never be interpreted as resilience evidence.
    out[c]=c===RESILIENCE_LABEL?3.5:Number(profile?.[c]??3.5);
  });
  return out;
}

function addLegacyAlias(profile:Record<string,number>){
  Object.defineProperty(profile,LEGACY_STRATEGY_LABEL,{enumerable:false,configurable:false,get:()=>profile[RESILIENCE_LABEL]});
  return profile;
}

/**
 * The canonical 178 roles always use the explicit curated catalog. Legacy data exists only
 * so unknown historical/custom titles do not crash before a company-specific role is mapped.
 */
export function buildJobProfilesV2(legacyProfiles:Record<string,Record<string,number>>):Record<string,Record<string,number>>{
  const result:Record<string,Record<string,number>>={};
  for(const [role,profile] of Object.entries(CURATED_JOB_PROFILES)) result[role]=addLegacyAlias({...profile});
  for(const [role,profile] of Object.entries(legacyProfiles||{})) if(!result[role]) result[role]=addLegacyAlias({...normalizeLegacyFallback(profile)});
  return result;
}

export function getJobProfileEvidence(position:string):JobProfileMetadata{
  const resolution=resolveBenchmarkPosition(position);
  if(resolution.matched && JOB_PROFILE_METADATA[resolution.canonical]) return JOB_PROFILE_METADATA[resolution.canonical];
  return {
    modelVersion:JOB_COMPETENCY_MODEL_VERSION,
    family:"Şirket özel / eşleştirilmemiş rol",
    level:inferLevel(position),
    confidence:"C",
    evidence:[P],
    rationale:"Kanonik FutureHR rolüyle eşleşmedi. Aile/seviye fallback yalnız geçici karar desteğidir; şirket iş analizi ve SME eşleştirmesi gerekir.",
    status:"legacy-fallback",
    smeValidationRecommended:true,
  };
}
