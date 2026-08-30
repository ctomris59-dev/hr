export type ImportSource = "excel" | "logo" | "mikro" | "netsis";
export type CanonicalField = "employeeCode" | "name" | "department" | "position" | "manager1" | "manager2" | "hireDate" | "salary" | "location" | "branch" | "costCenter" | "employmentType" | "workforceType" | "headcountStatus";

export interface CanonicalFieldDefinition { key: CanonicalField; label: string; required?: boolean; sensitive?: boolean; aliases: string[]; }
export interface ImportLogEntry { id: string; timestamp: string; source: ImportSource; fileName: string; totalRows: number; importedRows: number; skippedRows: number; updatedRows: number; createdRows: number; mappedFields: number; }
export const IMPORT_LOG_KEY = "futurehr_data_import_log_v1";

export const FIELD_DEFINITIONS: CanonicalFieldDefinition[] = [
  { key: "employeeCode", label: "Personel Kodu", aliases: ["personel kodu","sicil no","sicil numarası","sicil numarasi","sicil","personel no","employee id","employee code","kod"] },
  { key: "name", label: "Ad Soyad", required: true, aliases: ["ad soyad","adı soyadı","adi soyadi","personel adı","personel adi","çalışan","calisan","employee name","full name","adsoyad"] },
  { key: "department", label: "Departman", required: true, aliases: ["departman","bölüm","bolum","birim","organizasyon birimi","department"] },
  { key: "position", label: "Pozisyon / Ünvan", required: true, aliases: ["pozisyon","ünvan","unvan","görev","gorev","job title","position","title"] },
  { key: "manager1", label: "1. Yönetici", aliases: ["yönetici 1","yonetici 1","birinci yönetici","bağlı olduğu yönetici","amir","manager","manager 1"] },
  { key: "manager2", label: "2. Yönetici", aliases: ["yönetici 2","yonetici 2","ikinci yönetici","üst yönetici","manager 2"] },
  { key: "hireDate", label: "İşe Giriş Tarihi", aliases: ["işe giriş tarihi","ise giris tarihi","giriş tarihi","işe başlama tarihi","hire date","start date"] },
  { key: "salary", label: "Brüt / Mevcut Ücret", sensitive: true, aliases: ["maaş","maas","ücret","ucret","brüt ücret","brut ucret","brüt maaş","salary","gross salary"] },
  { key: "location", label: "Lokasyon", aliases: ["lokasyon","location","çalışma lokasyonu","calisma lokasyonu","işyeri lokasyonu"] },
  { key: "branch", label: "Şube", aliases: ["şube","sube","branch","işyeri","isyeri","sgk işyeri"] },
  { key: "costCenter", label: "Maliyet Merkezi", aliases: ["maliyet merkezi","masraf merkezi","cost center","costcentre"] },
  { key: "employmentType", label: "Çalışan Tipi", aliases: ["çalışan tipi","calisan tipi","istihdam tipi","employment type","sözleşme tipi","sozlesme tipi"] },
  { key: "workforceType", label: "İşgücü Tipi", aliases: ["işgücü tipi","isgucu tipi","yaka","mavi yaka","beyaz yaka","workforce type","collar"] },
  { key: "headcountStatus", label: "Kadro Durumu", aliases: ["kadro durumu","kadro","headcount status","fte status","pozisyon durumu"] },
];

const COMMON: Record<CanonicalField,string[]> = Object.fromEntries(FIELD_DEFINITIONS.map((f)=>[f.key,[]])) as Record<CanonicalField,string[]>;
const SOURCE_HINTS: Record<ImportSource, Record<CanonicalField, string[]>> = {
  excel: COMMON,
  logo: { ...COMMON, employeeCode:["sicil no","sicilnumarası","personel kodu"],name:["adı soyadı","ad soyad"],department:["bölüm","departman"],position:["ünvan","görev"],manager1:["amir"],hireDate:["işe giriş tarihi"],salary:["brüt ücret"],branch:["işyeri"],costCenter:["masraf merkezi"] },
  mikro: { ...COMMON, employeeCode:["personel kodu","sicil no"],name:["personel adı","adı soyadı"],department:["departman","birim"],position:["görev","ünvan"],manager1:["yönetici"],hireDate:["işe giriş tarihi"],salary:["brüt maaş"],costCenter:["maliyet merkezi"] },
  netsis: { ...COMMON, employeeCode:["sicil no","personel no"],name:["ad soyad","personel adı"],department:["bölüm","departman"],position:["ünvan","görev"],manager1:["amir"],hireDate:["giriş tarihi"],salary:["ücret","brüt ücret"],branch:["işyeri"],costCenter:["masraf merkezi"] },
};

export function normalizeHeader(value: unknown): string { return String(value??"").trim().toLocaleLowerCase("tr-TR").replace(/[._\-/\\]+/g," ").replace(/\s+/g," "); }
export function parseTurkishNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let raw=String(value??"").trim().replace(/[^0-9,.-]/g,""); if(!raw) return null;
  const comma=raw.lastIndexOf(","), dot=raw.lastIndexOf(".");
  if(comma>dot){ raw=raw.replace(/\./g,"").replace(",","."); }
  else if(dot>comma && comma>=0){ raw=raw.replace(/,/g,""); }
  else if(comma>=0){ const decimals=raw.length-comma-1; raw=decimals<=2?raw.replace(",","."):raw.replace(/,/g,""); }
  else if(dot>=0){ const decimals=raw.length-dot-1; if(decimals===3 && raw.split(".").length===2) raw=raw.replace(".",""); else if(raw.split(".").length>2) raw=raw.replace(/\./g,""); }
  const n=Number(raw); return Number.isFinite(n)?n:null;
}

export function autoMapHeaders(headers:string[],source:ImportSource):Partial<Record<CanonicalField,string>>{const normalized=headers.map(raw=>({raw,normalized:normalizeHeader(raw)}));const result:Partial<Record<CanonicalField,string>>={};FIELD_DEFINITIONS.forEach(field=>{const candidates=[...(SOURCE_HINTS[source]?.[field.key]||[]),...field.aliases].map(normalizeHeader);const exact=normalized.find(h=>candidates.includes(h.normalized));if(exact){result[field.key]=exact.raw;return;}const fuzzy=normalized.find(h=>candidates.some(c=>c.length>=4&&(h.normalized.includes(c)||c.includes(h.normalized))));if(fuzzy)result[field.key]=fuzzy.raw;});return result;}
export function readImportLog():ImportLogEntry[]{if(typeof window==="undefined")return[];try{const parsed=JSON.parse(localStorage.getItem(IMPORT_LOG_KEY)||"[]");return Array.isArray(parsed)?parsed:[];}catch{return[];}}
export function appendImportLog(entry:Omit<ImportLogEntry,"id"|"timestamp">):ImportLogEntry{const record={...entry,id:typeof crypto!=="undefined"&&"randomUUID"in crypto?crypto.randomUUID():`import-${Date.now()}`,timestamp:new Date().toISOString()};if(typeof window!=="undefined"){try{localStorage.setItem(IMPORT_LOG_KEY,JSON.stringify([record,...readImportLog()].slice(0,100)));window.dispatchEvent(new CustomEvent("futurehrImportLogUpdated",{detail:record}));}catch{}}return record;}

export function canonicalEmployeeFromRow(row:Record<string,any>,mapping:Partial<Record<CanonicalField,string>>){const value=(key:CanonicalField)=>{const header=mapping[key];return header?row[header]:undefined;};const salary=parseTurkishNumber(value("salary"));return{
  id:value("employeeCode")?String(value("employeeCode")).trim():undefined,
  "Ad Soyad":String(value("name")??"").trim(),Departman:String(value("department")??"").trim(),Pozisyon:String(value("position")??"").trim(),
  "Yönetici 1":String(value("manager1")??"").trim()||undefined,"Yönetici 2":String(value("manager2")??"").trim()||undefined,
  "İşe Giriş Tarihi":value("hireDate")?String(value("hireDate")).trim():undefined,
  Lokasyon:String(value("location")??"").trim()||undefined,"Şube":String(value("branch")??"").trim()||undefined,"Maliyet Merkezi":String(value("costCenter")??"").trim()||undefined,
  "Çalışan Tipi":String(value("employmentType")??"").trim()||undefined,"İşgücü Tipi":String(value("workforceType")??"").trim()||undefined,"Kadro Durumu":String(value("headcountStatus")??"").trim()||undefined,
  ...(salary!==null&&salary>0?{"Maaş (TL)":salary}:{}),
};}
export function isValidCanonicalEmployee(employee:Record<string,any>):boolean{return Boolean(String(employee["Ad Soyad"]||"").trim()&&String(employee.Departman||"").trim()&&String(employee.Pozisyon||"").trim());}

export function validateCanonicalBatch(employees:Record<string,any>[]) {
  const errors:string[]=[]; const warnings:string[]=[]; const ids=new Set<string>(); const names=new Set<string>();
  employees.forEach((employee,index)=>{const row=index+2;const id=String(employee.id||"").trim();const name=normalizeHeader(employee["Ad Soyad"]);if(!isValidCanonicalEmployee(employee))errors.push(`Satır ${row}: zorunlu çalışan alanı eksik.`);if(id){if(ids.has(id))errors.push(`Satır ${row}: mükerrer Personel Kodu ${id}.`);ids.add(id);}if(name){if(names.has(name))warnings.push(`Satır ${row}: aynı Ad Soyad tekrar ediyor; Personel Kodu ile ayrıştırın.`);names.add(name);}});
  return { valid: errors.length===0, errors, warnings };
}
