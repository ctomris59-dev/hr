export type ImportSource = "excel" | "logo" | "mikro" | "netsis";
export type ImportDataset = "employee" | "payroll" | "attendance";
export type CanonicalField = "employeeCode" | "name" | "department" | "position" | "manager1" | "manager2" | "hireDate" | "salary" | "location" | "branch" | "costCenter" | "employmentType" | "workforceType" | "headcountStatus";
export type PayrollField = "employeeCode" | "employeeName" | "period" | "grossSalary" | "netSalary" | "currency";
export type AttendanceField = "employeeCode" | "employeeName" | "date" | "firstIn" | "lastOut" | "workedMinutes" | "overtimeMinutes" | "absenceMinutes";

export interface CanonicalFieldDefinition { key: CanonicalField; label: string; required?: boolean; sensitive?: boolean; aliases: string[]; }
export interface GenericFieldDefinition<T extends string> { key: T; label: string; required?: boolean; sensitive?: boolean; aliases: string[]; }
export interface ImportLogEntry { id: string; timestamp: string; source: ImportSource; fileName: string; totalRows: number; importedRows: number; skippedRows: number; updatedRows: number; createdRows: number; mappedFields: number; dataset?: ImportDataset; }
export interface CanonicalPayrollImport { employeeCode: string; employeeName?: string; period: string; grossSalary?: number; netSalary?: number; currency: string; source: ImportSource; }
export interface CanonicalAttendanceImport { employeeCode: string; employeeName?: string; date: string; firstIn?: string; lastOut?: string; workedMinutes?: number; overtimeMinutes?: number; absenceMinutes?: number; source: ImportSource; }

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

export const PAYROLL_FIELD_DEFINITIONS: GenericFieldDefinition<PayrollField>[] = [
  { key: "employeeCode", label: "Personel Kodu", aliases: ["personel kodu","personel no","sicil no","sicil","employee id","employee code"] },
  { key: "employeeName", label: "Ad Soyad", aliases: ["ad soyad","adı soyadı","adi soyadi","personel adı","employee name","full name"] },
  { key: "period", label: "Bordro Dönemi", required: true, aliases: ["dönem","donem","bordro dönemi","payroll period","period","ay"] },
  { key: "grossSalary", label: "Brüt Ücret", sensitive: true, aliases: ["brüt ücret","brut ucret","brüt maaş","brut maas","gross salary","gross pay"] },
  { key: "netSalary", label: "Net Ücret", sensitive: true, aliases: ["net ücret","net ucret","net maaş","net maas","net salary","net pay"] },
  { key: "currency", label: "Para Birimi", aliases: ["para birimi","currency","döviz","doviz"] },
];

export const ATTENDANCE_FIELD_DEFINITIONS: GenericFieldDefinition<AttendanceField>[] = [
  { key: "employeeCode", label: "Personel Kodu", aliases: ["personel kodu","personel no","sicil no","sicil","employee id","employee code"] },
  { key: "employeeName", label: "Ad Soyad", aliases: ["ad soyad","adı soyadı","adi soyadi","personel adı","employee name","full name"] },
  { key: "date", label: "Tarih", required: true, aliases: ["tarih","date","gün","gun","work date"] },
  { key: "firstIn", label: "İlk Giriş", aliases: ["ilk giriş","ilk giris","giriş","giris","first in","clock in"] },
  { key: "lastOut", label: "Son Çıkış", aliases: ["son çıkış","son cikis","çıkış","cikis","last out","clock out"] },
  { key: "workedMinutes", label: "Çalışılan Dakika", aliases: ["çalışılan dakika","calisilan dakika","worked minutes","çalışma dakika","work minutes"] },
  { key: "overtimeMinutes", label: "Fazla Mesai Dakika", aliases: ["fazla mesai dakika","fazla mesai","overtime minutes","overtime"] },
  { key: "absenceMinutes", label: "Eksik Çalışma Dakika", aliases: ["eksik mesai dakika","eksik çalışma","absence minutes","missing minutes"] },
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

export function autoMapGenericHeaders<T extends string>(headers:string[],definitions:GenericFieldDefinition<T>[]):Partial<Record<T,string>> {
  const normalized=headers.map(raw=>({raw,normalized:normalizeHeader(raw)}));
  const result:Partial<Record<T,string>>={};
  definitions.forEach(field=>{const candidates=field.aliases.map(normalizeHeader);const exact=normalized.find(h=>candidates.includes(h.normalized));if(exact){result[field.key]=exact.raw;return;}const fuzzy=normalized.find(h=>candidates.some(c=>c.length>=4&&(h.normalized.includes(c)||c.includes(h.normalized))));if(fuzzy)result[field.key]=fuzzy.raw;});
  return result;
}

export function autoMapHeaders(headers:string[],source:ImportSource):Partial<Record<CanonicalField,string>>{const normalized=headers.map(raw=>({raw,normalized:normalizeHeader(raw)}));const result:Partial<Record<CanonicalField,string>>={};FIELD_DEFINITIONS.forEach(field=>{const candidates=[...(SOURCE_HINTS[source]?.[field.key]||[]),...field.aliases].map(normalizeHeader);const exact=normalized.find(h=>candidates.includes(h.normalized));if(exact){result[field.key]=exact.raw;return;}const fuzzy=normalized.find(h=>candidates.some(c=>c.length>=4&&(h.normalized.includes(c)||c.includes(h.normalized))));if(fuzzy)result[field.key]=fuzzy.raw;});return result;}

function scoreDefinitions<T extends string>(headers:string[],definitions:GenericFieldDefinition<T>[]) {
  const normalized=headers.map(normalizeHeader);
  return definitions.reduce((score,field)=>score+(normalized.some(header=>field.aliases.map(normalizeHeader).some(alias=>header===alias||header.includes(alias)||alias.includes(header)))?(field.required?3:1):0),0);
}

export function detectImportDataset(headers:string[]):ImportDataset {
  const employeeScore=scoreDefinitions(headers,FIELD_DEFINITIONS);
  const payrollScore=scoreDefinitions(headers,PAYROLL_FIELD_DEFINITIONS);
  const attendanceScore=scoreDefinitions(headers,ATTENDANCE_FIELD_DEFINITIONS);
  if(attendanceScore>=payrollScore&&attendanceScore>employeeScore&&attendanceScore>=4)return "attendance";
  if(payrollScore>attendanceScore&&payrollScore>employeeScore&&payrollScore>=4)return "payroll";
  return "employee";
}

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

export function canonicalPayrollFromRow(row:Record<string,any>,mapping:Partial<Record<PayrollField,string>>,source:ImportSource):CanonicalPayrollImport|null {
  const value=(key:PayrollField)=>{const header=mapping[key];return header?row[header]:undefined;};
  const employeeCode=String(value("employeeCode")??"").trim();const employeeName=String(value("employeeName")??"").trim();const period=String(value("period")??"").trim();
  if((!employeeCode&&!employeeName)||!period)return null;
  const grossSalary=parseTurkishNumber(value("grossSalary"));const netSalary=parseTurkishNumber(value("netSalary"));
  return {employeeCode:employeeCode||employeeName,employeeName:employeeName||undefined,period,grossSalary:grossSalary??undefined,netSalary:netSalary??undefined,currency:String(value("currency")??"TRY").trim()||"TRY",source};
}

export function canonicalAttendanceFromRow(row:Record<string,any>,mapping:Partial<Record<AttendanceField,string>>,source:ImportSource):CanonicalAttendanceImport|null {
  const value=(key:AttendanceField)=>{const header=mapping[key];return header?row[header]:undefined;};
  const employeeCode=String(value("employeeCode")??"").trim();const employeeName=String(value("employeeName")??"").trim();const date=String(value("date")??"").trim();
  if((!employeeCode&&!employeeName)||!date)return null;
  const minutes=(key:AttendanceField)=>{const n=parseTurkishNumber(value(key));return n===null?undefined:Math.round(n);};
  return {employeeCode:employeeCode||employeeName,employeeName:employeeName||undefined,date,firstIn:String(value("firstIn")??"").trim()||undefined,lastOut:String(value("lastOut")??"").trim()||undefined,workedMinutes:minutes("workedMinutes"),overtimeMinutes:minutes("overtimeMinutes"),absenceMinutes:minutes("absenceMinutes"),source};
}

export function isValidCanonicalEmployee(employee:Record<string,any>):boolean{return Boolean(String(employee["Ad Soyad"]||"").trim()&&String(employee.Departman||"").trim()&&String(employee.Pozisyon||"").trim());}
export function validateCanonicalBatch(employees:Record<string,any>[]) {
  const errors:string[]=[]; const warnings:string[]=[]; const ids=new Set<string>(); const names=new Set<string>();
  employees.forEach((employee,index)=>{const row=index+2;const id=String(employee.id||"").trim();const name=normalizeHeader(employee["Ad Soyad"]);if(!isValidCanonicalEmployee(employee))errors.push(`Satır ${row}: zorunlu çalışan alanı eksik.`);if(id){if(ids.has(id))errors.push(`Satır ${row}: mükerrer Personel Kodu ${id}.`);ids.add(id);}if(name){if(names.has(name))warnings.push(`Satır ${row}: aynı Ad Soyad tekrar ediyor; Personel Kodu ile ayrıştırın.`);names.add(name);}});
  return { valid: errors.length===0, errors, warnings };
}

export function validatePayrollBatch(records:(CanonicalPayrollImport|null)[]) {
  const errors:string[]=[];const warnings:string[]=[];const valid=records.filter((record):record is CanonicalPayrollImport=>Boolean(record));
  records.forEach((record,index)=>{if(!record)errors.push(`Satır ${index+2}: Personel Kodu/Ad Soyad ve Bordro Dönemi zorunludur.`);else if(record.grossSalary==null&&record.netSalary==null)warnings.push(`Satır ${index+2}: Brüt veya net ücret bulunamadı.`);});
  return {valid:errors.length===0,errors,warnings,records:valid};
}

export function validateAttendanceBatch(records:(CanonicalAttendanceImport|null)[]) {
  const errors:string[]=[];const warnings:string[]=[];const valid=records.filter((record):record is CanonicalAttendanceImport=>Boolean(record));
  records.forEach((record,index)=>{if(!record)errors.push(`Satır ${index+2}: Personel Kodu/Ad Soyad ve Tarih zorunludur.`);else if(record.workedMinutes==null&&!record.firstIn&&!record.lastOut)warnings.push(`Satır ${index+2}: Giriş/çıkış veya çalışılan dakika bilgisi bulunamadı.`);});
  return {valid:errors.length===0,errors,warnings,records:valid};
}
