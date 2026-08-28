/**
 * FutureHR position-title canonicalization.
 *
 * Design goals:
 * - Every one of the 178 canonical benchmark roles receives safe Turkish surface variants.
 * - Clear English equivalents are generated for common corporate titles.
 * - Explicit aliases cover high-frequency HRIS/ATS naming conventions.
 * - Ambiguous abbreviations are deliberately NOT auto-resolved (for example CSO).
 * - Alias collisions are detected and exposed to the benchmark health audit.
 */

export function normalizePositionTitle(value: string): string {
  // Turkish lowercase first: İ→i and I→ı. Then fold accents and ı→i.
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const RAW_ALIASES: Record<string, string> = {
  // --- Tepe yönetim / strateji ---
  "CEO": "İcra Kurulu Başkanı (CEO)",
  "Chief Executive Officer": "İcra Kurulu Başkanı (CEO)",
  "Deputy CEO": "İcra Kurulu Başkan Yardımcısı (Deputy CEO)",
  "Deputy Chief Executive Officer": "İcra Kurulu Başkan Yardımcısı (Deputy CEO)",
  "Global CEO": "Grup CEO / Global CEO",
  "Group CEO": "Grup CEO / Global CEO",
  "Regional CEO": "Bölge CEO (EMEA / Americas / APAC)",
  "Chief Strategy Officer": "CSO (Chief Strategy Officer)",
  "Strategy Vice President": "Strateji Başkan Yardımcısı",
  "VP Strategy": "Strateji Başkan Yardımcısı",
  "Corporate Strategy Director": "Kurumsal Strateji Direktörü",
  "Strategic Planning Manager": "Stratejik Planlama Müdürü",
  "Strategy Specialist": "Strateji Uzmanı",
  "Strategy Analyst": "Strateji Analisti",
  "Strategy Assistant": "Strateji Asistanı",
  "Board Chair": "Yönetim Kurulu Başkanı",
  "Board Chairman": "Yönetim Kurulu Başkanı",
  "Chairman of the Board": "Yönetim Kurulu Başkanı",
  "Board Vice Chair": "Yönetim Kurulu Başkan Yardımcısı",
  "Vice Chairman of the Board": "Yönetim Kurulu Başkan Yardımcısı",
  "Board Member": "Yönetim Kurulu Üyesi",

  // --- İnsan Kaynakları ---
  "İnsan Kaynakları Müdürü": "İK Müdürü",
  "Human Resources Manager": "İK Müdürü",
  "HR Manager": "İK Müdürü",
  "People Manager": "İK Müdürü",
  "İnsan Kaynakları Direktörü": "İK Direktörü",
  "Human Resources Director": "İK Direktörü",
  "HR Director": "İK Direktörü",
  "Regional HR Director": "Bölgesel İK Direktörü",
  "Regional Human Resources Director": "Bölgesel İK Direktörü",
  "İnsan Kaynakları Uzmanı": "İK Uzmanı",
  "Human Resources Specialist": "İK Uzmanı",
  "HR Specialist": "İK Uzmanı",
  "İnsan Kaynakları Analisti": "İK Analisti",
  "HR Analyst": "İK Analisti",
  "Human Resources Analyst": "İK Analisti",
  "İnsan Kaynakları Asistanı": "İK Asistanı",
  "HR Assistant": "İK Asistanı",
  "Human Resources Assistant": "İK Asistanı",
  "Talent Acquisition Specialist": "İşe Alım Uzmanı",
  "Recruitment Specialist": "İşe Alım Uzmanı",
  "Recruiter": "İşe Alım Uzmanı",
  "Payroll Specialist": "Bordro Uzmanı",
  "Compensation and Benefits Manager": "Ücret ve Yan Haklar Müdürü",
  "Compensation Benefits Manager": "Ücret ve Yan Haklar Müdürü",
  "Comp Ben Manager": "Ücret ve Yan Haklar Müdürü",
  "Learning and Development Manager": "Eğitim ve Gelişim Müdürü",
  "L&D Manager": "Eğitim ve Gelişim Müdürü",
  "L and D Manager": "Eğitim ve Gelişim Müdürü",
  "Talent Management Manager": "Yetenek Yönetimi Müdürü",
  "Talent Management Lead": "Yetenek Yönetimi Müdürü",
  "Organizational Development Manager": "Organizasyonel Gelişim Müdürü",
  "Organisation Development Manager": "Organizasyonel Gelişim Müdürü",
  "HR Business Partner": "İK İş Ortağı (HR Business Partner)",
  "Human Resources Business Partner": "İK İş Ortağı (HR Business Partner)",
  "HRBP": "İK İş Ortağı (HR Business Partner)",
  "Chief Human Resources Officer": "CHRO (Chief Human Resources Officer)",
  "CHRO": "CHRO (Chief Human Resources Officer)",
  "HR Vice President": "İK Başkan Yardımcısı",
  "VP Human Resources": "İK Başkan Yardımcısı",

  // --- Finans ---
  "Chief Financial Officer": "CFO (Chief Financial Officer)",
  "CFO": "CFO (Chief Financial Officer)",
  "Group CFO": "Grup CFO",
  "Regional CFO": "Bölgesel CFO",
  "Finance Vice President": "Finans Başkan Yardımcısı",
  "VP Finance": "Finans Başkan Yardımcısı",
  "Finance Director": "Finans Direktörü",
  "Financial Director": "Finans Direktörü",
  "Finance Manager": "Finans Müdürü",
  "Financial Manager": "Finans Müdürü",
  "Accounting Manager": "Muhasebe Müdürü",
  "Accountant": "Muhasebe Uzmanı",
  "Accounting Specialist": "Muhasebe Uzmanı",
  "Finance Specialist": "Finans Uzmanı",
  "Financial Analyst": "Finans Analisti",
  "Finance Analyst": "Finans Analisti",
  "Budget and Reporting Manager": "Bütçe ve Raporlama Müdürü",
  "Treasury Manager": "Hazine (Treasury) Müdürü",
  "Cost Accounting Specialist": "Maliyet Muhasebesi Uzmanı",
  "Finance Assistant": "Finans Asistanı",
  "Financial Affairs Director": "Mali İşler Direktörü",

  // --- Satın alma / tedarik ---
  "Chief Procurement Officer": "CPO (Chief Procurement Officer)",
  "CPO": "CPO (Chief Procurement Officer)",
  "Head of Supply Chain": "Tedarik Zinciri Başkanı",
  "Supply Chain Head": "Tedarik Zinciri Başkanı",
  "Procurement Vice President": "Satın Alma Başkan Yardımcısı",
  "VP Procurement": "Satın Alma Başkan Yardımcısı",
  "Procurement Director": "Satın Alma Direktörü",
  "Global Procurement Director": "Global Satın Alma Direktörü",
  "Regional Procurement Director": "Bölgesel Satın Alma Direktörü",
  "Procurement Manager": "Satın Alma Müdürü",
  "Purchasing Manager": "Satın Alma Müdürü",
  "Category Manager": "Kategori Müdürü",
  "Supplier Management Manager": "Tedarikçi Yönetimi Müdürü",
  "Supplier Manager": "Tedarikçi Yönetimi Müdürü",
  "Strategic Procurement Specialist": "Stratejik Satın Alma Uzmanı",
  "Strategic Sourcing Specialist": "Stratejik Satın Alma Uzmanı",
  "Procurement Specialist": "Satın Alma Uzmanı",
  "Purchasing Specialist": "Satın Alma Uzmanı",
  "Procurement Officer": "Satın Alma Sorumlusu",
  "Procurement Analyst": "Satın Alma Analisti",
  "Procurement Assistant": "Satın Alma Asistanı",

  // --- Operasyon / üretim ---
  "Chief Operating Officer": "COO (Chief Operating Officer)",
  "COO": "COO (Chief Operating Officer)",
  "Operations Vice President": "Operasyon Başkan Yardımcısı",
  "VP Operations": "Operasyon Başkan Yardımcısı",
  "Operations Director": "Operasyon Direktörü",
  "Production Director": "Üretim Direktörü",
  "Manufacturing Director": "Üretim Direktörü",
  "Plant Director": "Fabrika Direktörü",
  "Operations Manager": "Operasyon Müdürü",
  "Production Manager": "Üretim Müdürü",
  "Manufacturing Manager": "Üretim Müdürü",
  "Plant Manager": "Üretim Müdürü",
  "Shift Manager": "Vardiya Müdürü",
  "Process Improvement Manager": "Süreç Geliştirme Müdürü",
  "Continuous Improvement Manager": "Süreç Geliştirme Müdürü",
  "Lean Manufacturing Manager": "Yalın Üretim Müdürü",
  "Operations Specialist": "Operasyon Uzmanı",
  "Industrial Engineer": "Üretim Mühendisi",
  "Production Engineer": "Üretim Mühendisi",
  "Field Supervisor": "Saha Süpervizörü",
  "Production Assistant": "Üretim Asistanı",

  // --- Satış / pazarlama ---
  "Chief Commercial Officer": "CCO (Chief Commercial Officer)",
  "CCO": "CCO (Chief Commercial Officer)",
  "Chief Sales Officer": "CSO (Chief Sales Officer)",
  "Chief Marketing Officer": "CMO (Chief Marketing Officer)",
  "CMO": "CMO (Chief Marketing Officer)",
  "Sales Vice President": "Satış Başkan Yardımcısı",
  "VP Sales": "Satış Başkan Yardımcısı",
  "Marketing Vice President": "Pazarlama Başkan Yardımcısı",
  "VP Marketing": "Pazarlama Başkan Yardımcısı",
  "Sales Director": "Satış Direktörü",
  "Global Sales Director": "Global Satış Direktörü",
  "Regional Sales Director": "Bölge Satış Direktörü",
  "Marketing Director": "Pazarlama Direktörü",
  "Brand Director": "Marka Direktörü",
  "Sales Manager": "Satış Müdürü",
  "Regional Sales Manager": "Bölge Satış Müdürü",
  "Corporate Sales Manager": "Kurumsal Satış Müdürü",
  "Business Development Manager": "İş Geliştirme Müdürü",
  "Sales Representative": "Satış Uzmanı / Temsilcisi",
  "Sales Specialist": "Satış Uzmanı / Temsilcisi",
  "Key Account Manager": "Kilit Müşteri Yöneticisi (Key Account Manager)",
  "KAM": "Kilit Müşteri Yöneticisi (Key Account Manager)",
  "Marketing Specialist": "Pazarlama Uzmanı",
  "Digital Marketing Specialist": "Dijital Pazarlama Uzmanı",
  "CRM Specialist": "CRM Uzmanı",
  "Sales Assistant": "Satış Asistanı",

  // --- BT / dijital ---
  "Chief Information Officer": "CIO (Chief Information Officer)",
  "CIO": "CIO (Chief Information Officer)",
  "Chief Technology Officer": "CTO (Chief Technology Officer)",
  "CTO": "CTO (Chief Technology Officer)",
  "Chief Digital Officer": "CDO (Chief Digital Officer)",
  "CDO": "CDO (Chief Digital Officer)",
  "IT Vice President": "IT Başkan Yardımcısı",
  "VP IT": "IT Başkan Yardımcısı",
  "Information Technology Director": "BT Direktörü",
  "Technology Director": "BT Direktörü",
  "IT Director": "BT Direktörü",
  "Digital Transformation Director": "Dijital Dönüşüm Direktörü",
  "Information Technology Manager": "IT Müdürü",
  "IT Manager": "IT Müdürü",
  "Cyber Security Manager": "Siber Güvenlik Müdürü",
  "Cybersecurity Manager": "Siber Güvenlik Müdürü",
  "Information Security Manager": "Siber Güvenlik Müdürü",
  "Infrastructure Manager": "Altyapı Müdürü",
  "Application Development Manager": "Uygulama Geliştirme Müdürü",
  "Software Development Manager": "Uygulama Geliştirme Müdürü",
  "Data Analytics Manager": "Veri Analitiği Müdürü",
  "Analytics Manager": "Veri Analitiği Müdürü",
  "Software Development Lead": "Yazılım Geliştirme Lideri",
  "Software Team Lead": "Yazılım Geliştirme Lideri",
  "Senior Software Engineer": "Kıdemli Yazılım Mühendisi",
  "Software Engineer": "Yazılım Mühendisi",
  "Software Developer": "Yazılım Mühendisi",
  "Data Scientist": "Veri Analisti / Data Scientist",
  "Data Analyst": "Veri Analisti / Data Scientist",
  "Systems Specialist": "Sistem Uzmanı",
  "System Specialist": "Sistem Uzmanı",
  "IT Support Specialist": "IT Destek Uzmanı",
  "IT Support": "IT Destek Uzmanı",
  "IT Assistant": "IT Asistanı",

  // --- Hukuk / uyum ---
  "Chief Legal Officer": "CLO (Chief Legal Officer)",
  "CLO": "CLO (Chief Legal Officer)",
  "General Counsel": "Genel Hukuk Müşaviri",
  "Chief Legal Counsel": "Genel Hukuk Müşaviri",
  "Legal Director": "Hukuk Direktörü",
  "Compliance Director": "Uyum (Compliance) Direktörü",
  "Data Protection Director": "KVKK / GDPR Direktörü",
  "Privacy Director": "KVKK / GDPR Direktörü",
  "DPO Director": "KVKK / GDPR Direktörü",
  "Legal Manager": "Hukuk Müdürü",
  "Contracts Manager": "Sözleşmeler Müdürü",
  "Legal Counsel": "Hukuk Danışmanı",
  "Legal Advisor": "Hukuk Danışmanı",
  "Compliance Specialist": "Uyum Uzmanı",
  "Legal Assistant": "Hukuk Asistanı",

  // --- Kurumsal iletişim / sürdürülebilirlik ---
  "CCAO": "Chief Corporate Affairs Officer",
  "Corporate Affairs Chief": "Chief Corporate Affairs Officer",
  "Corporate Communications Director": "Kurumsal İletişim Direktörü",
  "Corporate Relations Director": "Kurumsal İlişkiler Direktörü",
  "Corporate Affairs Director": "Kurumsal İlişkiler Direktörü",
  "Sustainability Director": "Sürdürülebilirlik Direktörü",
  "Corporate Communications Manager": "Kurumsal İletişim Müdürü",
  "Brand and Reputation Manager": "Marka ve İtibar Müdürü",
  "Reputation Manager": "Marka ve İtibar Müdürü",
  "Public Relations Manager": "Basın ve Medya İlişkileri Müdürü",
  "Media Relations Manager": "Basın ve Medya İlişkileri Müdürü",
  "Internal Communications Specialist": "İç İletişim Uzmanı",
  "Corporate Communications Specialist": "Kurumsal İletişim Uzmanı",
  "Corporate Communications Assistant": "Kurumsal İletişim Asistanı",

  // --- Denetim / risk / kalite ---
  "CAE": "Chief Audit Executive",
  "Head of Internal Audit": "Chief Audit Executive",
  "Internal Audit Director": "İç Denetim Direktörü",
  "Risk Management Director": "Risk Yönetimi Direktörü",
  "Risk Director": "Risk Yönetimi Direktörü",
  "Quality Director": "Kalite Direktörü",
  "Internal Audit Manager": "İç Denetim Müdürü",
  "Risk Management Manager": "Risk Yönetimi Müdürü",
  "Risk Manager": "Risk Yönetimi Müdürü",
  "Quality Assurance Manager": "Kalite Güvence Müdürü",
  "Internal Auditor": "İç Denetçi",
  "Risk Analyst": "Risk Analisti",
  "Quality Specialist": "Kalite Uzmanı",
  "Quality Assistant": "Kalite Asistanı",

  // --- İdari işler ---
  "Administrative Affairs Director": "İdari İşler Direktörü",
  "Administration Director": "İdari İşler Direktörü",
  "Administrative Affairs Manager": "İdari İşler Müdürü",
  "Administration Manager": "İdari İşler Müdürü",
  "Facilities Manager": "Tesis Yönetimi Müdürü",
  "Facility Manager": "Tesis Yönetimi Müdürü",
  "Office Manager": "Ofis Yöneticisi",
  "Executive Assistant": "Yönetici Asistanı (CEO Assistant)",
  "CEO Assistant": "Yönetici Asistanı (CEO Assistant)",
  "Department Assistant": "Departman Asistanı",
  "Secretary": "Sekreter",
  "Office Support Staff": "Ofis Destek Personeli",
  "Office Staff": "Genel - Ofis Personeli",

  // --- TSO / oda-borsa ---
  "General Secretary": "Genel Sekreter",
  "Secretary General": "Genel Sekreter",
  "Deputy General Secretary": "Genel Sekreter Yardımcısı",
  "Presidency Secretariat Lead": "Başkanlık Sekreterya Sorumlusu",
  "Trade Registry Manager": "Ticaret Sicil Servisi Müdürü",
  "Trade Registry Deputy Manager": "Ticaret Sicil Müdür Yardımcısı",
  "Trade Registry Officer": "Ticaret Sicil Tescil Yetkilisi",
  "Capacity Service Lead": "Kapasite Servis Sorumlusu",
  "Capacity Service Officer": "Kapasite Servis Görevlisi",
  "Projects and Industry Lead": "Proje ve Sanayi Sorumlusu",
  "R&D Service Lead": "Arge Servis Sorumlusu",
  "Research and Development Service Lead": "Arge Servis Sorumlusu",
  "Quality and Accreditation Lead": "Kalite ve Akreditasyon Sorumlusu",
  "Research Service Lead": "Araştırma Servis Sorumlusu",
  "Research Service Officer": "Araştırma Servis Görevlisi",
  "Accounting Service Lead": "Muhasebe Servis Sorumlusu",
  "Accounting Service Officer": "Muhasebe Servis Görevlisi",
  "Administrative Records Lead": "Yazı İşleri Servis Sorumlusu",
  "Administrative Records Officer": "Yazı İşleri Servis Görevlisi",
  "Digital Archiving Lead": "Dijital Arşivleme Sorumlusu",
  "Press and Public Relations Lead": "Basın Yayın ve Halkla İlişkiler Sorumlusu",
  "Press and Public Relations Officer": "Basın Yayın ve Halkla İlişkiler Servis Görevlisi",
  "Information Desk Lead": "İletişim ve Danışma Sorumlusu",
  "IT Service Lead": "Bilgi İşlem Servis Sorumlusu",
  "Maintenance Lead": "Bakım Onarım Sorumlusu",
  "Maintenance Officer": "Bakım Onarım Görevlisi",
  "Support Staff Lead": "Destek Personel Sorumlusu",
  "Executive Driver": "Makam Şoförü",
  "Executive Security": "Makam Güvenlik",
  "Training Lead": "Eğitim Sorumlusu"
};

/** Abbreviations that are genuinely ambiguous in this catalog. */
const DELIBERATELY_AMBIGUOUS_ALIASES = new Set([
  "cso", // Chief Strategy Officer vs Chief Sales Officer
]);

const SEMANTIC_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\binsan kaynaklari\b/g, "ik"], [/\bhuman resources\b/g, "ik"], [/\bhr\b/g, "ik"],
  [/\bbilgi teknolojileri\b/g, "it"], [/\binformation technology\b/g, "it"], [/\bbt\b/g, "it"],
  [/\bsatin alma\b/g, "procurement"], [/\bpurchasing\b/g, "procurement"],
  [/\bar ge\b/g, "arge"], [/\br and d\b/g, "arge"],
  [/\bkurumsal iletisim\b/g, "corporate communications"],
];

function semanticKey(value: string): string {
  let key = normalizePositionTitle(value);
  for (const [pattern, replacement] of SEMANTIC_REPLACEMENTS) key = key.replace(pattern, replacement);
  return key.replace(/\s+/g, " ").trim();
}

const TURKISH_SUFFIX_VARIANTS: Array<[RegExp, string]> = [
  [/ Müdürü$/u, " Müdür"],
  [/ Direktörü$/u, " Direktör"],
  [/ Uzmanı$/u, " Uzman"],
  [/ Asistanı$/u, " Asistan"],
  [/ Analisti$/u, " Analist"],
  [/ Mühendisi$/u, " Mühendis"],
  [/ Görevlisi$/u, " Görevli"],
  [/ Sorumlusu$/u, " Sorumlu"],
  [/ Başkanı$/u, " Başkan"],
  [/ Üyesi$/u, " Üye"],
  [/ Yöneticisi$/u, " Yönetici"],
  [/ Danışmanı$/u, " Danışman"],
  [/ Temsilcisi$/u, " Temsilci"],
  [/ Lideri$/u, " Lider"],
  [/ Şoförü$/u, " Şoför"],
];

const ENGLISH_PHRASES: Array<[string, string]> = [
  ["Yönetim Kurulu Başkan Yardımcısı", "Board Vice Chair"],
  ["Yönetim Kurulu Başkanı", "Board Chair"],
  ["Yönetim Kurulu Üyesi", "Board Member"],
  ["İcra Kurulu Başkan Yardımcısı", "Deputy Chief Executive Officer"],
  ["İcra Kurulu Başkanı", "Chief Executive Officer"],
  ["Genel Sekreter Yardımcısı", "Deputy General Secretary"],
  ["Genel Sekreter", "General Secretary"],
  ["Başkan Yardımcısı", "Vice President"],
  ["Ticaret Sicil", "Trade Registry"],
  ["Proje ve Sanayi", "Projects and Industry"],
  ["Kalite ve Akreditasyon", "Quality and Accreditation"],
  ["Basın Yayın ve Halkla İlişkiler", "Press and Public Relations"],
  ["İletişim ve Danışma", "Information Desk"],
  ["Bilgi İşlem", "IT"],
  ["Bakım Onarım", "Maintenance"],
  ["Destek Personel", "Support Staff"],
  ["Dijital Arşivleme", "Digital Archiving"],
  ["Yazı İşleri", "Administrative Records"],
  ["İnsan Kaynakları", "Human Resources"],
  ["Organizasyonel Gelişim", "Organizational Development"],
  ["Yetenek Yönetimi", "Talent Management"],
  ["Eğitim ve Gelişim", "Learning and Development"],
  ["Ücret ve Yan Haklar", "Compensation and Benefits"],
  ["İş Ortağı", "Business Partner"],
  ["İşe Alım", "Recruitment"],
  ["Bütçe ve Raporlama", "Budget and Reporting"],
  ["Maliyet Muhasebesi", "Cost Accounting"],
  ["Mali İşler", "Financial Affairs"],
  ["Tedarik Zinciri", "Supply Chain"],
  ["Tedarikçi Yönetimi", "Supplier Management"],
  ["Stratejik Satın Alma", "Strategic Procurement"],
  ["Satın Alma", "Procurement"],
  ["Süreç Geliştirme", "Process Improvement"],
  ["Yalın Üretim", "Lean Manufacturing"],
  ["İş Geliştirme", "Business Development"],
  ["Kurumsal Satış", "Corporate Sales"],
  ["Kilit Müşteri", "Key Account"],
  ["Dijital Pazarlama", "Digital Marketing"],
  ["Dijital Dönüşüm", "Digital Transformation"],
  ["Siber Güvenlik", "Cybersecurity"],
  ["Uygulama Geliştirme", "Application Development"],
  ["Veri Analitiği", "Data Analytics"],
  ["Yazılım Geliştirme", "Software Development"],
  ["Kıdemli Yazılım", "Senior Software"],
  ["Veri Analisti", "Data Analyst"],
  ["Kurumsal İletişim", "Corporate Communications"],
  ["Kurumsal İlişkiler", "Corporate Relations"],
  ["Marka ve İtibar", "Brand and Reputation"],
  ["Basın ve Medya İlişkileri", "Media Relations"],
  ["İç İletişim", "Internal Communications"],
  ["İç Denetim", "Internal Audit"],
  ["Risk Yönetimi", "Risk Management"],
  ["Kalite Güvence", "Quality Assurance"],
  ["İdari İşler", "Administrative Affairs"],
  ["Tesis Yönetimi", "Facilities"],
  ["Ofis Yöneticisi", "Office Manager"],
  ["Yönetici Asistanı", "Executive Assistant"],
  ["Departman Asistanı", "Department Assistant"],
  ["Makam Şoförü", "Executive Driver"],
  ["Makam Güvenlik", "Executive Security"],
  ["Stratejik Planlama", "Strategic Planning"],
  ["Kurumsal Strateji", "Corporate Strategy"],
  ["Bölgesel", "Regional"],
  ["Bölge", "Regional"],
  ["Grup", "Group"],
  ["Global", "Global"],
  ["Finans", "Finance"],
  ["Muhasebe", "Accounting"],
  ["Hazine", "Treasury"],
  ["Strateji", "Strategy"],
  ["Operasyon", "Operations"],
  ["Üretim", "Production"],
  ["Fabrika", "Plant"],
  ["Vardiya", "Shift"],
  ["Saha", "Field"],
  ["Satış", "Sales"],
  ["Pazarlama", "Marketing"],
  ["Marka", "Brand"],
  ["Altyapı", "Infrastructure"],
  ["Yazılım", "Software"],
  ["Sistem", "Systems"],
  ["Hukuk", "Legal"],
  ["Uyum", "Compliance"],
  ["Sözleşmeler", "Contracts"],
  ["Sürdürülebilirlik", "Sustainability"],
  ["Denetim", "Audit"],
  ["Risk", "Risk"],
  ["Kalite", "Quality"],
  ["Araştırma", "Research"],
  ["Kapasite", "Capacity"],
  ["Eğitim", "Training"],
  ["Bordro", "Payroll"],
];

const ENGLISH_SUFFIXES: Array<[RegExp, string]> = [
  [/ Müdür Yardımcısı$/u, " Deputy Manager"],
  [/ Müdürü$/u, " Manager"],
  [/ Direktörü$/u, " Director"],
  [/ Uzmanı$/u, " Specialist"],
  [/ Asistanı$/u, " Assistant"],
  [/ Analisti$/u, " Analyst"],
  [/ Mühendisi$/u, " Engineer"],
  [/ Görevlisi$/u, " Officer"],
  [/ Sorumlusu$/u, " Lead"],
  [/ Başkanı$/u, " Head"],
  [/ Yöneticisi$/u, " Manager"],
  [/ Danışmanı$/u, " Counsel"],
  [/ Temsilcisi$/u, " Representative"],
  [/ Lideri$/u, " Lead"],
  [/ Asistan$/u, " Assistant"],
  [/ Müdür$/u, " Manager"],
  [/ Direktör$/u, " Director"],
  [/ Uzman$/u, " Specialist"],
  [/ Analist$/u, " Analyst"],
  [/ Mühendis$/u, " Engineer"],
  [/ Görevli$/u, " Officer"],
  [/ Sorumlu$/u, " Lead"],
];

function cleanSurface(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s+([,/])/g, "$1").trim();
}

function stripParentheticals(value: string): string {
  return cleanSurface(value.replace(/\s*\([^)]*\)\s*/g, " "));
}

function extractParentheticals(value: string): string[] {
  return Array.from(value.matchAll(/\(([^)]+)\)/g))
    .map((match) => cleanSurface(match[1] || ""))
    .filter((part) => part.split(/\s+/).length >= 2 || /^(CEO|CFO|CHRO|CPO|COO|CCO|CMO|CIO|CTO|CDO|CLO)$/i.test(part));
}

function safeSlashParts(value: string): string[] {
  return value.split("/").map(cleanSurface).filter((part) => {
    const words = part.split(/\s+/).filter(Boolean);
    return words.length >= 2 || /^(CEO|CFO|CHRO|CPO|COO|CCO|CMO|CIO|CTO|CDO|CLO)$/i.test(part);
  });
}

function translateTurkishTitleToEnglish(canonical: string): string | null {
  let value = stripParentheticals(canonical);
  if (!value || /^[A-Z]{2,5}\b/.test(value)) return null;

  // Replace the grammatical title suffix first, then translate the functional phrase.
  let suffixChanged = false;
  for (const [pattern, replacement] of ENGLISH_SUFFIXES) {
    if (pattern.test(value)) {
      value = value.replace(pattern, replacement);
      suffixChanged = true;
      break;
    }
  }

  for (const [tr, en] of ENGLISH_PHRASES) {
    value = value.split(tr).join(en);
  }

  value = value
    .replace(/\bİK\b/g, "Human Resources")
    .replace(/\bIT\b/g, "IT")
    .replace(/\bBT\b/g, "IT")
    .replace(/\bArge\b/g, "R&D")
    .replace(/\bServisi\b/g, "Service")
    .replace(/\bServis\b/g, "Service")
    .replace(/\bBaşkanlık Sekreterya\b/g, "Presidency Secretariat");

  const normalized = cleanSurface(value);
  if (!suffixChanged && normalized === stripParentheticals(canonical)) return null;
  // Do not publish half-translated aliases.
  if (/[çğıöşüİı]/.test(normalized) || /\b(Müdür|Direktör|Uzman|Asistan|Analist|Mühendis|Sorumlu|Görevli|Başkan|Yönetici)\b/.test(normalized)) return null;
  return normalized;
}

/** Safe alternative surfaces derived from one canonical title. */
export function getGeneratedAliasesForRole(canonical: string): string[] {
  const aliases = new Set<string>();
  const add = (value: string | null | undefined) => {
    const cleaned = cleanSurface(String(value || ""));
    if (cleaned && semanticKey(cleaned) !== semanticKey(canonical)) aliases.add(cleaned);
  };

  const withoutParens = stripParentheticals(canonical);
  add(withoutParens);
  extractParentheticals(canonical).forEach(add);
  safeSlashParts(withoutParens).forEach(add);

  const bases = new Set<string>([canonical, withoutParens, ...safeSlashParts(withoutParens)]);
  for (const base of bases) {
    for (const [pattern, replacement] of TURKISH_SUFFIX_VARIANTS) {
      if (pattern.test(base)) add(base.replace(pattern, replacement));
    }
    if (/\bServisi\b/u.test(base)) add(base.replace(/\bServisi\b/gu, ""));
    if (/\bServis\b/u.test(base)) add(base.replace(/\bServis\b/gu, ""));
    if (/\bArge\b/u.test(base)) {
      add(base.replace(/\bArge\b/gu, "Ar-Ge"));
      add(base.replace(/\bArge\b/gu, "AR-GE"));
    }
  }

  add(translateTurkishTitleToEnglish(canonical));
  return Array.from(aliases);
}

function explicitAliasesForCanonical(canonical: string): string[] {
  return Object.entries(RAW_ALIASES).filter(([, target]) => target === canonical).map(([alias]) => alias);
}

interface AliasRegistry {
  index: Map<string, string>;
  collisions: Map<string, Set<string>>;
  aliasesByRole: Map<string, string[]>;
}

let registryCacheKey = "";
let registryCache: AliasRegistry | null = null;

function buildAliasRegistry(canonicalTitles: string[]): AliasRegistry {
  const cacheKey = canonicalTitles.join("\u0001");
  if (registryCache && registryCacheKey === cacheKey) return registryCache;

  const claims = new Map<string, Set<string>>();
  const surfaces = new Map<string, Set<string>>();
  const claim = (alias: string, canonical: string) => {
    if (!canonicalTitles.includes(canonical)) return;
    const key = semanticKey(alias);
    if (!key || DELIBERATELY_AMBIGUOUS_ALIASES.has(key)) return;
    if (!claims.has(key)) claims.set(key, new Set());
    claims.get(key)!.add(canonical);
    if (!surfaces.has(canonical)) surfaces.set(canonical, new Set());
    if (semanticKey(alias) !== semanticKey(canonical)) surfaces.get(canonical)!.add(cleanSurface(alias));
  };

  Object.entries(RAW_ALIASES).forEach(([alias, canonical]) => claim(alias, canonical));
  canonicalTitles.forEach((canonical) => {
    getGeneratedAliasesForRole(canonical).forEach((alias) => claim(alias, canonical));
  });

  const index = new Map<string, string>();
  const collisions = new Map<string, Set<string>>();
  for (const [key, canonicals] of claims) {
    if (canonicals.size === 1) index.set(key, Array.from(canonicals)[0]);
    else collisions.set(key, canonicals);
  }

  registryCacheKey = cacheKey;
  registryCache = {
    index,
    collisions,
    aliasesByRole: new Map(canonicalTitles.map((role) => [role, Array.from(surfaces.get(role) || [])])),
  };
  return registryCache;
}

/** Explicit aliases only; retained for backwards compatibility and diagnostics. */
export const POSITION_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_ALIASES).map(([alias, canonical]) => [semanticKey(alias), canonical])
);

export interface PositionAliasResolution {
  input: string;
  canonical: string;
  matched: boolean;
  via: "canonical" | "alias" | "normalized" | "none";
}

export function resolveCanonicalPositionTitle(input: string, canonicalTitles: string[]): PositionAliasResolution {
  const raw = String(input || "").trim();
  if (!raw) return { input: raw, canonical: raw, matched: false, via: "none" };
  if (canonicalTitles.includes(raw)) return { input: raw, canonical: raw, matched: true, via: "canonical" };

  const key = semanticKey(raw);
  if (DELIBERATELY_AMBIGUOUS_ALIASES.has(key)) return { input: raw, canonical: raw, matched: false, via: "none" };

  const registry = buildAliasRegistry(canonicalTitles);
  const alias = registry.index.get(key);
  if (alias) return { input: raw, canonical: alias, matched: true, via: "alias" };

  const normalizedIndex = new Map<string, string>();
  const normalizedCollisions = new Set<string>();
  canonicalTitles.forEach((title) => {
    const normalized = semanticKey(title);
    const existing = normalizedIndex.get(normalized);
    if (existing && existing !== title) normalizedCollisions.add(normalized);
    else normalizedIndex.set(normalized, title);
  });
  if (!normalizedCollisions.has(key)) {
    const normalized = normalizedIndex.get(key);
    if (normalized) return { input: raw, canonical: normalized, matched: true, via: "normalized" };
  }

  return { input: raw, canonical: raw, matched: false, via: "none" };
}

export interface PositionAliasAudit {
  canonicalRoleCount: number;
  rolesWithAlternativeAliases: number;
  uncoveredRoles: string[];
  explicitAliasCount: number;
  generatedSurfaceCount: number;
  activeAliasKeyCount: number;
  collisionCount: number;
  collisions: Array<{ key: string; canonicals: string[] }>;
  deliberatelyAmbiguous: string[];
  failedRoundTrips: Array<{ alias: string; expected: string; resolved: string | null }>;
  perRoleMinimumAlternatives: number;
}

/** Full-catalog audit used by /api/health/role-benchmark. */
export function auditPositionAliases(canonicalTitles: string[]): PositionAliasAudit {
  const registry = buildAliasRegistry(canonicalTitles);
  const failedRoundTrips: PositionAliasAudit["failedRoundTrips"] = [];
  const uncoveredRoles: string[] = [];
  let generatedSurfaceCount = 0;
  let minimum = Number.POSITIVE_INFINITY;

  for (const canonical of canonicalTitles) {
    const alternatives = new Set<string>([
      ...explicitAliasesForCanonical(canonical),
      ...getGeneratedAliasesForRole(canonical),
    ].filter((alias) => semanticKey(alias) !== semanticKey(canonical)));
    generatedSurfaceCount += alternatives.size;
    minimum = Math.min(minimum, alternatives.size);
    if (!alternatives.size) uncoveredRoles.push(canonical);

    for (const alias of alternatives) {
      const key = semanticKey(alias);
      if (DELIBERATELY_AMBIGUOUS_ALIASES.has(key) || registry.collisions.has(key)) continue;
      const resolution = resolveCanonicalPositionTitle(alias, canonicalTitles);
      if (!resolution.matched || resolution.canonical !== canonical) {
        failedRoundTrips.push({ alias, expected: canonical, resolved: resolution.matched ? resolution.canonical : null });
      }
    }
  }

  return {
    canonicalRoleCount: canonicalTitles.length,
    rolesWithAlternativeAliases: canonicalTitles.length - uncoveredRoles.length,
    uncoveredRoles,
    explicitAliasCount: Object.keys(RAW_ALIASES).length,
    generatedSurfaceCount,
    activeAliasKeyCount: registry.index.size,
    collisionCount: registry.collisions.size,
    collisions: Array.from(registry.collisions.entries()).map(([key, canonicals]) => ({ key, canonicals: Array.from(canonicals) })),
    deliberatelyAmbiguous: Array.from(DELIBERATELY_AMBIGUOUS_ALIASES),
    failedRoundTrips,
    perRoleMinimumAlternatives: Number.isFinite(minimum) ? minimum : 0,
  };
}
