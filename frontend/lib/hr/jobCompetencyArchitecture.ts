/**
 * FutureHR Role Competency Architecture v2 — FHR-COMP-JOB-2.0
 *
 * Scientific / professional basis:
 * - O*NET 30.3 occupational information and Work Styles impact/distinctiveness
 * - ESCO v1.2.1 Skills–Occupations Matrix / ISCO crosswalk
 * - U.S. OPM job-analysis principles: job relatedness, importance/criticality and SME validation
 *
 * IMPORTANT: These values are evidence-informed occupational benchmarks, not clinical or
 * psychometric norms and not automatic hiring/promotion decisions. Company job analysis and
 * current SME validation remain the final organizational calibration layer.
 */
import { BATCH1_PROFILES, BATCH1_METADATA, BATCH1_WEIGHTS } from "./jobCompetencyBatch1";

export const JOB_COMPETENCY_MODEL_VERSION = "FHR-COMP-JOB-2.0" as const;
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
  status: "recalibrated-v2" | "legacy-normalized";
  smeValidationRecommended: boolean;
}

export const EVIDENCE_REFERENCES = {
  onet: "O*NET 30.3 occupational information / Work Styles impact and distinctiveness",
  esco: "ESCO v1.2.1 Skills-Occupations Matrix / ISCO crosswalk",
  opm: "U.S. OPM Job Analysis: job relatedness, importance/criticality and SME confirmation",
} as const;

const C = {
  DIG: "Dijital Okuryazarlık",
  ANA: "Analitik Düşünme",
  RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen",
  LRN: "Sürekli Öğrenme",
  ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin",
  STR: RESILIENCE_LABEL,
  TEA: "Takım Çalışması",
  COM: "İletişim Becerileri",
} as const;

type CompCode = keyof typeof C;
type FamilyKey =
  | "hr"
  | "finance"
  | "procurement"
  | "operations"
  | "sales"
  | "technology"
  | "legal"
  | "communications"
  | "audit"
  | "administration"
  | "general";

const p = (DIG:number,ANA:number,RES:number,DET:number,LRN:number,ETH:number,DIS:number,STR:number,TEA:number,COM:number):CompetencyProfile => ({
  [C.DIG]:DIG,[C.ANA]:ANA,[C.RES]:RES,[C.DET]:DET,[C.LRN]:LRN,[C.ETH]:ETH,[C.DIS]:DIS,[C.STR]:STR,[C.TEA]:TEA,[C.COM]:COM,
} as CompetencyProfile);
const w = (DIG:number,ANA:number,RES:number,DET:number,LRN:number,ETH:number,DIS:number,STR:number,TEA:number,COM:number):CompetencyWeights => ({
  [C.DIG]:DIG,[C.ANA]:ANA,[C.RES]:RES,[C.DET]:DET,[C.LRN]:LRN,[C.ETH]:ETH,[C.DIS]:DIS,[C.STR]:STR,[C.TEA]:TEA,[C.COM]:COM,
} as CompetencyWeights);

interface FamilyModel {
  label: string;
  base: CompetencyProfile;
  weights: CompetencyWeights;
  evidence: string[];
  rationale: string;
}

const O = EVIDENCE_REFERENCES.onet;
const E = EVIDENCE_REFERENCES.esco;
const P = EVIDENCE_REFERENCES.opm;

/** Baselines represent a solid experienced-professional / L3 requirement, before level and role-context adjustments. */
const FAMILY_MODELS: Record<FamilyKey, FamilyModel> = {
  hr: {
    label:"İnsan Kaynakları",
    base:p(4.1,4.1,4.2,4.2,4.5,4.7,4.4,4.2,4.6,4.7),
    weights:w(7,10,8,8,12,10,8,7,13,17),
    evidence:["O*NET 11-3121 Human Resources Managers / 13-1071 Human Resources Specialists",E,P],
    rationale:"İnsan odaklı karar, işbirliği, iletişim, öğrenme ve etik; rol alt türüne göre analitik/detay gereklilikleriyle dengelenir.",
  },
  finance: {
    label:"Finans & Muhasebe",
    base:p(4.2,4.7,4.4,4.8,4.2,4.9,4.7,4.2,4.0,4.1),
    weights:w(7,17,10,18,6,15,10,6,4,7),
    evidence:["O*NET 11-3031 Financial Managers / 13-2011 Accountants and Auditors / 13-2051 Financial and Investment Analysts",E,P],
    rationale:"Analitik muhakeme, finansal doğruluk, etik, güvenilirlik ve sonuç üretme; alt uzmanlığa göre farklılaştırılır.",
  },
  procurement: {
    label:"Satın Alma & Tedarik Zinciri",
    base:p(4.2,4.5,4.6,4.5,4.3,4.7,4.6,4.3,4.3,4.5),
    weights:w(7,14,14,12,7,12,10,7,7,10),
    evidence:["O*NET 11-3061 Purchasing Managers and related purchasing occupations",E,P],
    rationale:"Ticari analiz, sonuç, tedarik riski, etik, doğruluk ve müzakere/paydaş iletişimi birlikte rol başarısını belirler.",
  },
  operations: {
    label:"Operasyon & Üretim",
    base:p(3.9,4.3,4.7,4.6,4.1,4.6,4.8,4.6,4.4,4.1),
    weights:w(6,12,17,15,7,9,13,10,7,4),
    evidence:["O*NET 11-1021 General and Operations Managers / 17-2112 Industrial Engineers and production-management proxies",E,P],
    rationale:"Teslim ve süreklilik, disiplin, detay, problem çözme, stres altında işlevsellik ve saha koordinasyonu temel eksendir.",
  },
  sales: {
    label:"Satış & Pazarlama",
    base:p(4.4,4.2,4.8,4.0,4.5,4.4,4.4,4.5,4.6,4.9),
    weights:w(8,9,18,5,8,7,8,10,9,18),
    evidence:["O*NET 11-2022 Sales Managers / 11-2021 Marketing Managers and related commercial occupations",E,P],
    rationale:"Sonuç, müşteri/paydaş iletişimi, dayanıklılık, sosyal işbirliği ve pazar öğrenmesi; ticari alt role göre ayrıştırılır.",
  },
  technology: {
    label:"BT & Dijital",
    base:p(4.9,4.8,4.2,4.7,4.9,4.5,4.4,4.2,4.0,4.0),
    weights:w(18,17,8,14,15,8,6,4,5,5),
    evidence:["O*NET 11-3021 Computer and Information Systems Managers / 15-1252 Software Developers / 15-2051 Data Scientists / 15-1212 Information Security Analysts",E,P],
    rationale:"Dijital yetkinlik, analitik düşünme, detay ve sürekli öğrenme çekirdektir; modern teknik roller için takım ve iletişim tabanı korunur.",
  },
  legal: {
    label:"Hukuk & Uyum",
    base:p(4.0,4.7,4.1,4.9,4.5,5.0,4.7,4.3,3.9,4.4),
    weights:w(5,16,7,18,8,18,10,5,4,9),
    evidence:["O*NET 23-1011 Lawyers / 13-1041 Compliance Officers",E,P],
    rationale:"Hukuki muhakeme, detay doğruluğu, etik/uyum ve disiplin temel; sözleşme, veri koruma ve danışmanlık bağlamına göre farklılaşır.",
  },
  communications: {
    label:"Kurumsal İletişim & Sürdürülebilirlik",
    base:p(4.5,4.0,4.5,4.0,4.5,4.6,4.4,4.5,4.6,5.0),
    weights:w(8,7,9,6,8,8,7,9,12,26),
    evidence:["O*NET 11-2032 Public Relations Managers / 27-3031 Public Relations Specialists",E,P],
    rationale:"İletişim, sosyal işbirliği, uyarlanabilirlik/dayanıklılık, itibar ve sürekli öğrenme; iletişim alt alanına göre kalibre edilir.",
  },
  audit: {
    label:"Denetim, Risk & Kalite",
    base:p(4.2,4.7,4.2,4.9,4.5,5.0,4.8,4.4,4.0,4.1),
    weights:w(6,16,8,19,7,17,12,6,4,5),
    evidence:["O*NET 13-2011 Accountants and Auditors / 13-1041 Compliance Officers / 17-2112 Industrial Engineers as quality-process proxy",E,P],
    rationale:"Analitik inceleme, hata yakalama, etik bağımsızlık, disiplin ve risk farkındalığı yüksek hata maliyeti nedeniyle belirleyicidir.",
  },
  administration: {
    label:"İdari İşler & Destek",
    base:p(3.7,3.7,4.3,4.7,4.0,4.8,4.8,4.2,4.2,4.4),
    weights:w(5,6,11,17,6,13,16,9,8,9),
    evidence:["O*NET 11-3012 Administrative Services Managers / 43-6011 Executive Secretaries and Executive Administrative Assistants",E,P],
    rationale:"İş sürekliliği, düzen, güvenilirlik, gizlilik/etik, detay ve servis iletişimi rol seviyesine göre dengelenir.",
  },
  general: {
    label:"Genel Yönetim & Destek",
    base:p(4.0,4.1,4.5,4.3,4.3,4.8,4.7,4.4,4.4,4.5),
    weights:w(7,10,13,10,8,12,11,9,9,11),
    evidence:[O,E,P],
    rationale:"Doğrudan aile eşleşmesi olmayan kurumsal roller için genel occupational benchmark; SME doğrulaması özellikle önemlidir.",
  },
};

const LEVEL_ADJUSTMENTS: Record<EvidenceLevel, Partial<Record<FutureHRCompetency,number>>> = {
  L1:{[C.DIG]:-0.4,[C.ANA]:-0.5,[C.RES]:-0.4,[C.LRN]:-0.2,[C.ETH]:-0.1,[C.STR]:-0.3,[C.TEA]:-0.2,[C.COM]:-0.2},
  L2:{[C.DIG]:-0.1,[C.DET]:0.1,[C.TEA]:-0.1,[C.COM]:-0.1},
  L3:{[C.ANA]:0.1,[C.RES]:0.1,[C.DET]:0.1,[C.LRN]:0.1,[C.DIS]:0.1,[C.STR]:0.1},
  L4:{[C.ANA]:0.1,[C.RES]:0.2,[C.LRN]:0.1,[C.DIS]:0.1,[C.STR]:0.2,[C.TEA]:0.2,[C.COM]:0.2},
  L5:{[C.DIG]:0.1,[C.ANA]:0.2,[C.RES]:0.3,[C.DET]:-0.1,[C.LRN]:0.2,[C.DIS]:0.1,[C.STR]:0.3,[C.TEA]:0.3,[C.COM]:0.3},
  L6:{[C.DIG]:0.1,[C.ANA]:0.2,[C.RES]:0.4,[C.DET]:-0.2,[C.LRN]:0.2,[C.DIS]:0.2,[C.STR]:0.4,[C.TEA]:0.3,[C.COM]:0.4},
  L7:{[C.DIG]:0.1,[C.ANA]:0.2,[C.RES]:0.4,[C.DET]:-0.2,[C.LRN]:0.2,[C.DIS]:0.2,[C.STR]:0.4,[C.TEA]:0.3,[C.COM]:0.4},
};

const LEVEL_WEIGHT_BUMPS: Record<EvidenceLevel, Partial<Record<FutureHRCompetency,number>>> = {
  L1:{[C.DET]:3,[C.DIS]:2,[C.RES]:-1},
  L2:{},
  L3:{[C.ANA]:1,[C.DET]:1},
  L4:{[C.RES]:2,[C.STR]:1,[C.TEA]:2,[C.COM]:2,[C.DET]:-2},
  L5:{[C.ANA]:1,[C.RES]:3,[C.STR]:2,[C.TEA]:2,[C.COM]:3,[C.DET]:-3},
  L6:{[C.ANA]:2,[C.RES]:4,[C.STR]:3,[C.TEA]:2,[C.COM]:4,[C.DET]:-4},
  L7:{[C.ANA]:2,[C.RES]:4,[C.STR]:3,[C.TEA]:2,[C.COM]:4,[C.DET]:-4},
};

function round1(value:number){ return Math.round(value*10)/10; }
function clamp(value:number,min:number,max:number){ return Math.min(max,Math.max(min,value)); }
function titleText(role:string){ return String(role||"").toLocaleLowerCase("tr-TR"); }

function inferEvidenceLevel(role:string): EvidenceLevel {
  const r=titleText(role);
  if (/\b(cfo|chro|cpo|coo|cco|cmo|cio|cto|cdo|clo)\b|chief audit executive|chief corporate affairs officer/.test(r)) return "L7";
  if (/başkan yardımcısı|bölgesel cfo|regional cfo|başkanlığı/.test(r)) return "L6";
  if (/direktör|director/.test(r)) return "L5";
  if (/müdür|manager/.test(r)) return "L4";
  if (/kıdemli|senior|lider|lead|süpervizör|supervisor|sorumlu|kilit müşteri yöneticisi|key account manager/.test(r)) return "L3";
  if (/uzman|analist|mühendis|danışman|temsilci|denetçi|specialist|analyst|engineer|consultant/.test(r)) return "L2";
  return "L1";
}

function inferFamily(role:string): FamilyKey {
  const r=titleText(role);
  if (/chro|insan kaynak|\bik\b|yetenek yönetimi|organizasyonel gelişim|eğitim ve gelişim|ücret ve yan hak|hr business partner|bordro|işe alım/.test(r)) return "hr";
  if (/\bcfo\b|finans|mali işler|muhasebe|bütçe|hazine|treasury|maliyet muhasebesi/.test(r)) return "finance";
  if (/\bcpo\b|satın alma|tedarik|procurement|kategori müdürü/.test(r)) return "procurement";
  if (/\bcoo\b|operasyon|üretim|fabrika|vardiya|süreç geliştirme|yalın üretim|saha süpervizörü/.test(r)) return "operations";
  if (/\bcco\b|chief sales|\bcmo\b|satış|pazarlama|marketing|sales|marka direktörü|iş geliştirme|key account|kilit müşteri|crm/.test(r)) return "sales";
  if (/\bcio\b|\bcto\b|\bcdo\b|bilgi işlem|\bit\b|\bbt\b|dijital dönüşüm|siber|altyapı|uygulama geliştirme|veri analitiği|yazılım|data scientist|sistem uzmanı/.test(r)) return "technology";
  if (/\bclo\b|hukuk|uyum|compliance|kvkk|gdpr|sözleşme|legal/.test(r)) return "legal";
  if (/corporate affairs|kurumsal iletişim|kurumsal ilişkiler|sürdürülebilirlik|marka ve itibar|basın|medya|iç iletişim/.test(r)) return "communications";
  if (/chief audit|denetim|risk yönetimi|risk analisti|kalite direktörü|kalite güvence|kalite uzmanı|audit/.test(r)) return "audit";
  if (/idari işler|tesis yönetimi|ofis yöneticisi|yönetici asistanı|departman asistanı|sekreter|ofis destek|genel - ofis/.test(r)) return "administration";
  return "general";
}

interface RoleSignals {
  score: Partial<Record<FutureHRCompetency,number>>;
  weight: Partial<Record<FutureHRCompetency,number>>;
  tags:string[];
}

function roleSignals(role:string,family:FamilyKey):RoleSignals {
  const r=titleText(role);
  const score:Partial<Record<FutureHRCompetency,number>>={};
  const weight:Partial<Record<FutureHRCompetency,number>>={};
  const tags:string[]=[];
  const add=(competency:FutureHRCompetency,delta:number,weightDelta=0)=>{
    score[competency]=(score[competency]||0)+delta;
    weight[competency]=(weight[competency]||0)+weightDelta;
  };
  const tag=(name:string)=>{ if(!tags.includes(name)) tags.push(name); };

  if(family==="hr"){
    if(/işe alım/.test(r)){add(C.COM,.2,5);add(C.TEA,.1,3);add(C.ANA,.1,2);tag("işe alım/paydaş etkileşimi");}
    if(/bordro/.test(r)){add(C.DET,.2,5);add(C.ETH,.1,3);add(C.DIS,.1,2);tag("bordro doğruluğu");}
    if(/ücret ve yan hak/.test(r)){add(C.ANA,.2,5);add(C.DET,.2,5);add(C.ETH,.1,2);tag("ücret analitiği ve gizlilik");}
    if(/organizasyonel gelişim|yetenek yönetimi|eğitim ve gelişim/.test(r)){add(C.LRN,.2,5);add(C.ANA,.1,2);add(C.COM,.1,2);add(C.TEA,.1,2);tag("gelişim/yetenek mimarisi");}
    if(/iş ortağı|business partner/.test(r)){add(C.COM,.2,5);add(C.TEA,.2,4);add(C.ANA,.1,2);tag("business partnering");}
    if(/analist/.test(r)){add(C.ANA,.2,5);add(C.DIG,.1,3);add(C.DET,.1,2);tag("people analytics");}
  }
  if(family==="finance"){
    if(/muhasebe|maliyet muhasebesi/.test(r)){add(C.DET,.2,5);add(C.ETH,.1,3);add(C.DIS,.1,2);tag("finansal kayıt doğruluğu");}
    if(/bütçe|raporlama|finans analisti/.test(r)){add(C.ANA,.2,5);add(C.DET,.1,3);add(C.DIG,.1,2);tag("analiz ve raporlama");}
    if(/hazine|treasury/.test(r)){add(C.ANA,.1,3);add(C.STR,.2,4);add(C.RES,.1,3);tag("likidite/piyasa baskısı");}
    if(/cfo/.test(r)){add(C.ANA,.2,4);add(C.RES,.2,4);add(C.STR,.2,4);add(C.COM,.2,4);tag("kurumsal finans liderliği");}
  }
  if(family==="procurement"){
    if(/stratejik|kategori/.test(r)){add(C.ANA,.2,5);add(C.RES,.1,3);add(C.COM,.1,2);tag("kategori/stratejik sourcing");}
    if(/tedarikçi/.test(r)){add(C.COM,.2,5);add(C.TEA,.1,3);add(C.ETH,.1,2);tag("tedarikçi yönetimi");}
    if(/analist/.test(r)){add(C.ANA,.2,5);add(C.DIG,.1,3);add(C.DET,.1,2);tag("satın alma analitiği");}
  }
  if(family==="operations"){
    if(/üretim mühendisi/.test(r)){add(C.ANA,.2,4);add(C.DET,.2,5);add(C.DIG,.1,2);add(C.TEA,.1,2);tag("endüstriyel mühendislik/süreç doğruluğu");}
    if(/vardiya|saha süpervizörü/.test(r)){add(C.STR,.2,5);add(C.DIS,.1,3);add(C.TEA,.2,4);add(C.COM,.1,2);tag("saha/gerçek zamanlı koordinasyon");}
    if(/süreç geliştirme|yalın/.test(r)){add(C.ANA,.2,5);add(C.LRN,.2,4);add(C.DIG,.1,2);add(C.RES,.1,2);tag("süreç iyileştirme");}
    if(/fabrika|üretim direktörü/.test(r)){add(C.RES,.2,5);add(C.STR,.2,4);add(C.DIS,.1,2);tag("üretim sürekliliği");}
    if(/\bcoo\b/.test(r)){add(C.RES,.2,4);add(C.STR,.2,4);add(C.COM,.1,2);tag("operasyon liderliği");}
  }
  if(family==="sales"){
    if(/satış|sales/.test(r)){add(C.RES,.2,5);add(C.COM,.2,5);add(C.STR,.1,3);tag("ticari sonuç ve müşteri etkileşimi");}
    if(/pazarlama|marketing/.test(r)){add(C.DIG,.1,3);add(C.LRN,.1,2);add(C.COM,.1,3);add(C.ANA,.1,2);tag("pazar/kanal öğrenmesi");}
    if(/dijital pazarlama/.test(r)){add(C.DIG,.2,5);add(C.ANA,.1,3);tag("dijital kanal analitiği");}
    if(/marka/.test(r)){add(C.COM,.2,5);add(C.LRN,.1,2);tag("marka anlatısı");}
    if(/kilit müşteri|key account/.test(r)){add(C.COM,.2,5);add(C.TEA,.1,2);add(C.STR,.1,2);tag("stratejik müşteri ilişkisi");}
    if(/crm/.test(r)){add(C.DIG,.2,5);add(C.ANA,.2,5);add(C.DET,.1,2);tag("müşteri verisi/CRM");}
    if(/iş geliştirme/.test(r)){add(C.ANA,.1,3);add(C.COM,.2,4);add(C.LRN,.1,2);add(C.RES,.1,3);tag("fırsat geliştirme");}
  }
  if(family==="technology"){
    if(/siber/.test(r)){add(C.ETH,.2,4);add(C.DET,.2,5);add(C.STR,.2,4);tag("siber risk ve olay baskısı");}
    if(/altyapı|sistem uzmanı/.test(r)){add(C.DET,.2,5);add(C.STR,.1,3);add(C.DIS,.1,2);tag("altyapı sürekliliği");}
    if(/yazılım/.test(r)){add(C.DIG,.1,3);add(C.ANA,.1,3);add(C.LRN,.1,3);add(C.TEA,.1,2);add(C.COM,.1,2);tag("yazılım geliştirme ve takım teslimi");}
    if(/veri analitiği|data scientist|veri analisti/.test(r)){add(C.ANA,.2,5);add(C.DET,.1,3);add(C.DIG,.1,3);add(C.COM,.1,2);tag("veri bilimi ve bulgu iletişimi");}
    if(/destek/.test(r)){add(C.COM,.2,5);add(C.RES,.1,3);add(C.TEA,.1,2);tag("kullanıcı destek hizmeti");}
    if(/dijital dönüşüm|\bcdo\b/.test(r)){add(C.DIG,.1,3);add(C.LRN,.2,4);add(C.COM,.1,2);add(C.TEA,.1,2);tag("dijital dönüşüm");}
    if(/\bcio\b|\bcto\b/.test(r)){add(C.RES,.1,3);add(C.STR,.1,2);add(C.COM,.1,2);tag("teknoloji liderliği");}
  }
  if(family==="legal"){
    if(/uyum|compliance/.test(r)){add(C.ETH,.1,4);add(C.DET,.1,3);add(C.ANA,.1,3);tag("uyum gözetimi");}
    if(/kvkk|gdpr/.test(r)){add(C.DIG,.2,4);add(C.DET,.1,3);add(C.ETH,.1,3);tag("veri koruma");}
    if(/sözleşme/.test(r)){add(C.DET,.2,5);add(C.ANA,.1,3);add(C.COM,.1,2);tag("sözleşme risk/doğruluk");}
    if(/danışman|müşavir/.test(r)){add(C.ANA,.1,3);add(C.COM,.1,3);tag("hukuki danışmanlık");}
  }
  if(family==="communications"){
    if(/basın|medya|halkla ilişkiler|public relations/.test(r)){add(C.COM,.2,6);add(C.STR,.1,3);tag("medya/kamu iletişimi");}
    if(/sürdürülebilirlik/.test(r)){add(C.ANA,.1,3);add(C.LRN,.1,3);add(C.ETH,.1,3);add(C.COM,.1,2);tag("ESG/sürdürülebilirlik paydaşlığı");}
    if(/iç iletişim/.test(r)){add(C.TEA,.2,5);add(C.COM,.1,3);tag("çalışan iletişimi");}
    if(/marka|itibar/.test(r)){add(C.COM,.2,5);add(C.STR,.1,2);tag("itibar yönetimi");}
    if(/kurumsal ilişkiler|corporate affairs/.test(r)){add(C.COM,.1,3);add(C.TEA,.1,3);add(C.ANA,.1,2);tag("kurumsal paydaş ilişkileri");}
  }
  if(family==="audit"){
    if(/denetim|audit|denetçi/.test(r)){add(C.ETH,.1,4);add(C.DET,.2,5);add(C.ANA,.1,3);tag("bağımsız denetim ve kanıt");}
    if(/risk/.test(r)){add(C.ANA,.2,5);add(C.DET,.1,3);add(C.STR,.1,2);tag("risk analizi");}
    if(/kalite/.test(r)){add(C.DET,.2,5);add(C.ETH,.1,3);add(C.DIS,.1,2);tag("kalite güvence");}
  }
  if(family==="administration"){
    if(/tesis/.test(r)){add(C.RES,.2,4);add(C.STR,.2,4);add(C.DIS,.1,2);tag("tesis sürekliliği");}
    if(/ofis yöneticisi/.test(r)){add(C.DET,.1,3);add(C.COM,.1,3);add(C.TEA,.1,2);tag("ofis koordinasyonu");}
    if(/yönetici asistanı/.test(r)){add(C.DET,.2,5);add(C.DIS,.2,5);add(C.ETH,.1,3);add(C.COM,.1,3);add(C.STR,.1,2);tag("üst yönetim desteği/gizlilik");}
    if(/departman asistanı|sekreter/.test(r)){add(C.DET,.2,5);add(C.DIS,.1,3);add(C.COM,.1,3);tag("idari doğruluk ve koordinasyon");}
    if(/ofis destek|genel - ofis/.test(r)){add(C.DIS,.1,3);add(C.TEA,.1,2);tag("servis güvenilirliği");}
    if(/idari işler/.test(r)){add(C.RES,.1,3);add(C.DET,.1,2);add(C.COM,.1,2);tag("idari hizmet yönetimi");}
  }
  return {score,weight,tags};
}

function normalizeLegacyProfile(profile: Record<string, number>): CompetencyProfile {
  const normalized: Record<string, number> = {};
  for (const competency of FUTUREHR_COMPETENCIES) {
    // IMPORTANT: legacy Stratejik Bakış is never treated as resilience evidence in v2.
    normalized[competency] = competency === RESILIENCE_LABEL
      ? 3.5
      : Number(profile[competency] ?? 3.5);
  }
  return normalized as CompetencyProfile;
}

function addLegacyAlias(profile: Record<string, number>) {
  Object.defineProperty(profile, LEGACY_STRATEGY_LABEL, {
    enumerable: false,
    configurable: false,
    get: () => profile[RESILIENCE_LABEL],
  });
  return profile;
}

function addAdjustments(base:CompetencyProfile,adjustments:Partial<Record<FutureHRCompetency,number>>):CompetencyProfile{
  const out={...base} as CompetencyProfile;
  FUTUREHR_COMPETENCIES.forEach(comp=>{out[comp]=Number(out[comp]||0)+Number(adjustments[comp]||0);});
  return out;
}

function normalizedWeights(base:CompetencyWeights,...adjustments:Array<Partial<Record<FutureHRCompetency,number>>>):CompetencyWeights{
  const raw={...base} as CompetencyWeights;
  for(const adj of adjustments){
    FUTUREHR_COMPETENCIES.forEach(comp=>{raw[comp]=Math.max(1,Number(raw[comp]||0)+Number(adj[comp]||0));});
  }
  const total=FUTUREHR_COMPETENCIES.reduce((sum,comp)=>sum+raw[comp],0)||100;
  const out={} as CompetencyWeights;
  let running=0;
  FUTUREHR_COMPETENCIES.forEach((comp,index)=>{
    if(index===FUTUREHR_COMPETENCIES.length-1){out[comp]=round1(100-running);}
    else {out[comp]=round1((raw[comp]/total)*100);running+=out[comp];}
  });
  return out;
}

function confidenceForRole(role:string,family:FamilyKey):EvidenceConfidence{
  const r=titleText(role);
  if(/genel - ofis/.test(r)) return "C";
  const direct:Record<FamilyKey,RegExp>={
    hr:/chro|ik müdürü|ik uzmanı|işe alım uzmanı|bordro uzmanı|human resources/,
    finance:/cfo|finans müdürü|muhasebe müdürü|finans uzmanı|finans analisti|muhasebe uzmanı/,
    procurement:/cpo|satın alma müdürü|satın alma uzmanı|purchasing/,
    operations:/coo|operasyon müdürü|üretim müdürü|üretim mühendisi|industrial/,
    sales:/satış müdürü|pazarlama direktörü|satış uzmanı|marketing|sales/,
    technology:/cio|cto|yazılım mühendisi|data scientist|siber güvenlik|it müdürü/,
    legal:/clo|hukuk müdürü|hukuk danışmanı|uyum uzmanı|compliance/,
    communications:/kurumsal iletişim müdürü|basın|medya|public relations/,
    audit:/iç denetim müdürü|iç denetçi|risk analisti|kalite uzmanı/,
    administration:/idari işler müdürü|tesis yönetimi müdürü|ofis yöneticisi|yönetici asistanı|sekreter/,
    general:/$a/,
  };
  if(direct[family].test(r)) return "A";
  return family==="general"?"C":"B";
}

function generateRoleProfile(role:string,rawLegacy:Record<string,number>){
  const family=inferFamily(role);
  const level=inferEvidenceLevel(role);
  const model=FAMILY_MODELS[family];
  const signals=roleSignals(role,family);
  let evidenceBase=addAdjustments(model.base,LEVEL_ADJUSTMENTS[level]);
  evidenceBase=addAdjustments(evidenceBase,signals.score);
  const legacy=normalizeLegacyProfile(rawLegacy);
  const profile={} as CompetencyProfile;

  FUTUREHR_COMPETENCIES.forEach(comp=>{
    let value=evidenceBase[comp];
    // Legacy catalog is retained only as a small expert-prior signal for non-STR dimensions.
    // The old Stratejik Bakış value is deliberately excluded from resilience calibration.
    if(comp!==RESILIENCE_LABEL){
      const deviation=clamp(Number(legacy[comp]||model.base[comp])-model.base[comp],-0.4,0.4);
      value+=deviation*0.25;
    }
    profile[comp]=round1(clamp(value,3.0,5.0));
  });

  const weights=normalizedWeights(model.weights,LEVEL_WEIGHT_BUMPS[level],signals.weight);
  const confidence=confidenceForRole(role,family);
  const metadata:JobProfileMetadata={
    modelVersion:JOB_COMPETENCY_MODEL_VERSION,
    family:model.label,
    level,
    confidence,
    evidence:model.evidence,
    rationale:`${model.rationale} Seviye: ${level}.${signals.tags.length?` Rol bağlamı: ${signals.tags.join(", ")}.`:""} 0,1 hassasiyetli hedefler occupational benchmark + seviye + rol bağlamı + sınırlı legacy expert-prior ile üretilmiştir.`,
    status:"recalibrated-v2",
    smeValidationRecommended:true,
  };
  return {profile,weights,metadata};
}

export const JOB_PROFILE_METADATA: Record<string, JobProfileMetadata> = {
  ...(BATCH1_METADATA as Record<string,JobProfileMetadata>),
};
export const JOB_PROFILE_WEIGHTS: Record<string, CompetencyWeights> = {
  ...(BATCH1_WEIGHTS as Record<string,CompetencyWeights>),
};

/**
 * Canonicalizes and recalibrates the entire legacy catalog.
 * Batch-1 roles keep their manually reviewed v2 values; every remaining role is generated
 * from the documented family + level + role-context evidence model. All returned profiles
 * expose only the canonical ten competencies. A hidden legacy alias protects old direct
 * lookups without allowing Stratejik Bakış to re-enter calculations as a separate construct.
 */
export function buildJobProfilesV2(legacyProfiles: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const [role, raw] of Object.entries(legacyProfiles)) {
    const batchProfile=BATCH1_PROFILES[role];
    if(batchProfile){
      result[role]=addLegacyAlias({...batchProfile});
      continue;
    }
    const generated=generateRoleProfile(role,raw);
    result[role]=addLegacyAlias({...generated.profile});
    JOB_PROFILE_METADATA[role]=generated.metadata;
    JOB_PROFILE_WEIGHTS[role]=generated.weights;
  }
  return result;
}

export function getJobProfileEvidence(role: string): JobProfileMetadata {
  return JOB_PROFILE_METADATA[role] || {
    modelVersion: JOB_COMPETENCY_MODEL_VERSION,
    family: "Unmapped / company-specific role",
    level: "L3",
    confidence: "C",
    evidence: [EVIDENCE_REFERENCES.esco,EVIDENCE_REFERENCES.opm],
    rationale: "Katalog dışında kalan rol için şirket iş analizi ve SME kalibrasyonu gereklidir.",
    status: "legacy-normalized",
    smeValidationRecommended: true,
  };
}

export function getJobProfileWeights(role:string):CompetencyWeights|undefined{
  return JOB_PROFILE_WEIGHTS[role];
}

export function getJobProfileCoverage(){
  const entries=Object.values(JOB_PROFILE_METADATA);
  return {
    total:entries.length,
    recalibrated:entries.filter(item=>item.status==="recalibrated-v2").length,
    confidenceA:entries.filter(item=>item.confidence==="A").length,
    confidenceB:entries.filter(item=>item.confidence==="B").length,
    confidenceC:entries.filter(item=>item.confidence==="C").length,
    modelVersion:JOB_COMPETENCY_MODEL_VERSION,
  };
}
