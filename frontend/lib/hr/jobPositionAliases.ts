/** Conservative position-title canonicalization for role benchmark lookup. */
export function normalizePositionTitle(value:string):string {
  return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").toLocaleLowerCase("tr-TR").replace(/&/g," and ").replace(/[^a-z0-9çğıöşü\s]/g," ").replace(/\s+/g," ").trim();
}

const RAW_ALIASES: Record<string,string> = {
  "İnsan Kaynakları Müdürü": "İK Müdürü",
  "Human Resources Manager": "İK Müdürü",
  "HR Manager": "İK Müdürü",
  "İnsan Kaynakları Direktörü": "İK Direktörü",
  "Human Resources Director": "İK Direktörü",
  "HR Director": "İK Direktörü",
  "İnsan Kaynakları Uzmanı": "İK Uzmanı",
  "Human Resources Specialist": "İK Uzmanı",
  "HR Specialist": "İK Uzmanı",
  "İnsan Kaynakları Asistanı": "İK Asistanı",
  "HR Assistant": "İK Asistanı",
  "Talent Acquisition Specialist": "İşe Alım Uzmanı",
  "Recruitment Specialist": "İşe Alım Uzmanı",
  "Recruiter": "İşe Alım Uzmanı",
  "Payroll Specialist": "Bordro Uzmanı",
  "Compensation and Benefits Manager": "Ücret ve Yan Haklar Müdürü",
  "Compensation & Benefits Manager": "Ücret ve Yan Haklar Müdürü",
  "Learning and Development Manager": "Eğitim ve Gelişim Müdürü",
  "L&D Manager": "Eğitim ve Gelişim Müdürü",
  "Talent Management Manager": "Yetenek Yönetimi Müdürü",
  "Organizational Development Manager": "Organizasyonel Gelişim Müdürü",
  "HR Business Partner": "İK İş Ortağı (HR Business Partner)",
  "Finance Manager": "Finans Müdürü",
  "Financial Manager": "Finans Müdürü",
  "Accounting Manager": "Muhasebe Müdürü",
  "Accountant": "Muhasebe Uzmanı",
  "Financial Analyst": "Finans Analisti",
  "Budget and Reporting Manager": "Bütçe ve Raporlama Müdürü",
  "Treasury Manager": "Hazine (Treasury) Müdürü",
  "Procurement Manager": "Satın Alma Müdürü",
  "Purchasing Manager": "Satın Alma Müdürü",
  "Procurement Specialist": "Satın Alma Uzmanı",
  "Purchasing Specialist": "Satın Alma Uzmanı",
  "Procurement Analyst": "Satın Alma Analisti",
  "Supply Chain Head": "Tedarik Zinciri Başkanı",
  "Operations Manager": "Operasyon Müdürü",
  "Production Manager": "Üretim Müdürü",
  "Plant Director": "Fabrika Direktörü",
  "Plant Manager": "Üretim Müdürü",
  "Industrial Engineer": "Üretim Mühendisi",
  "Production Engineer": "Üretim Mühendisi",
  "Process Improvement Manager": "Süreç Geliştirme Müdürü",
  "Lean Manufacturing Manager": "Yalın Üretim Müdürü",
  "Sales Manager": "Satış Müdürü",
  "Regional Sales Manager": "Bölge Satış Müdürü",
  "Corporate Sales Manager": "Kurumsal Satış Müdürü",
  "Sales Representative": "Satış Uzmanı / Temsilcisi",
  "Sales Specialist": "Satış Uzmanı / Temsilcisi",
  "Key Account Manager": "Kilit Müşteri Yöneticisi (Key Account Manager)",
  "Business Development Manager": "İş Geliştirme Müdürü",
  "Marketing Specialist": "Pazarlama Uzmanı",
  "Digital Marketing Specialist": "Dijital Pazarlama Uzmanı",
  "CRM Specialist": "CRM Uzmanı",
  "Information Technology Manager": "IT Müdürü",
  "IT Manager": "IT Müdürü",
  "Technology Director": "BT Direktörü",
  "IT Director": "BT Direktörü",
  "Digital Transformation Director": "Dijital Dönüşüm Direktörü",
  "Cyber Security Manager": "Siber Güvenlik Müdürü",
  "Cybersecurity Manager": "Siber Güvenlik Müdürü",
  "Infrastructure Manager": "Altyapı Müdürü",
  "Application Development Manager": "Uygulama Geliştirme Müdürü",
  "Analytics Manager": "Veri Analitiği Müdürü",
  "Software Development Lead": "Yazılım Geliştirme Lideri",
  "Senior Software Engineer": "Kıdemli Yazılım Mühendisi",
  "Software Engineer": "Yazılım Mühendisi",
  "Software Developer": "Yazılım Mühendisi",
  "Data Scientist": "Veri Analisti / Data Scientist",
  "Data Analyst": "Veri Analisti / Data Scientist",
  "Systems Specialist": "Sistem Uzmanı",
  "IT Support Specialist": "IT Destek Uzmanı",
  "Legal Director": "Hukuk Direktörü",
  "Legal Manager": "Hukuk Müdürü",
  "Legal Counsel": "Hukuk Danışmanı",
  "General Counsel": "Genel Hukuk Müşaviri",
  "Compliance Director": "Uyum (Compliance) Direktörü",
  "Compliance Specialist": "Uyum Uzmanı",
  "Contracts Manager": "Sözleşmeler Müdürü",
  "Data Protection Director": "KVKK / GDPR Direktörü",
  "Corporate Communications Director": "Kurumsal İletişim Direktörü",
  "Corporate Communications Manager": "Kurumsal İletişim Müdürü",
  "Corporate Communications Specialist": "Kurumsal İletişim Uzmanı",
  "Public Relations Manager": "Basın ve Medya İlişkileri Müdürü",
  "Media Relations Manager": "Basın ve Medya İlişkileri Müdürü",
  "Internal Communications Specialist": "İç İletişim Uzmanı",
  "Sustainability Director": "Sürdürülebilirlik Direktörü",
  "Internal Audit Director": "İç Denetim Direktörü",
  "Internal Audit Manager": "İç Denetim Müdürü",
  "Internal Auditor": "İç Denetçi",
  "Risk Management Director": "Risk Yönetimi Direktörü",
  "Risk Manager": "Risk Yönetimi Müdürü",
  "Risk Analyst": "Risk Analisti",
  "Quality Director": "Kalite Direktörü",
  "Quality Assurance Manager": "Kalite Güvence Müdürü",
  "Quality Specialist": "Kalite Uzmanı",
  "Administrative Affairs Director": "İdari İşler Direktörü",
  "Administrative Affairs Manager": "İdari İşler Müdürü",
  "Facilities Manager": "Tesis Yönetimi Müdürü",
  "Office Manager": "Ofis Yöneticisi",
  "Executive Assistant": "Yönetici Asistanı (CEO Assistant)",
  "Department Assistant": "Departman Asistanı",
  "Secretary": "Sekreter",
  "Office Support Staff": "Ofis Destek Personeli",
  "General Secretary": "Genel Sekreter",
  "Deputy General Secretary": "Genel Sekreter Yardımcısı"
};

const SEMANTIC_REPLACEMENTS: Array<[RegExp,string]> = [
  [/\binsan kaynaklari\b/g,"ik"], [/\bhuman resources\b/g,"ik"], [/\bhr\b/g,"ik"],
  [/\bbilgi teknolojileri\b/g,"it"], [/\binformation technology\b/g,"it"], [/\bbt\b/g,"it"],
  [/\bsatin alma\b/g,"procurement"], [/\bpurchasing\b/g,"procurement"],
  [/\bkurumsal iletisim\b/g,"corporate communications"]
];

function semanticKey(value:string):string {
  let key=normalizePositionTitle(value);
  for(const [pattern,replacement] of SEMANTIC_REPLACEMENTS) key=key.replace(pattern,replacement);
  return key.replace(/\s+/g," ").trim();
}

export const POSITION_ALIASES: Record<string,string> = Object.fromEntries(
  Object.entries(RAW_ALIASES).map(([alias,canonical])=>[semanticKey(alias),canonical])
);

export interface PositionAliasResolution {
  input:string;
  canonical:string;
  matched:boolean;
  via:"canonical"|"alias"|"normalized"|"none";
}

export function resolveCanonicalPositionTitle(input:string, canonicalTitles:string[]):PositionAliasResolution {
  const raw=String(input||"").trim();
  if(!raw) return {input:raw,canonical:raw,matched:false,via:"none"};
  if(canonicalTitles.includes(raw)) return {input:raw,canonical:raw,matched:true,via:"canonical"};
  const key=semanticKey(raw);
  const alias=POSITION_ALIASES[key];
  if(alias && canonicalTitles.includes(alias)) return {input:raw,canonical:alias,matched:true,via:"alias"};
  const normalizedIndex=new Map(canonicalTitles.map(title=>[semanticKey(title),title] as const));
  const normalized=normalizedIndex.get(key);
  if(normalized) return {input:raw,canonical:normalized,matched:true,via:"normalized"};
  return {input:raw,canonical:raw,matched:false,via:"none"};
}
