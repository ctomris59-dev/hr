export type LeaveType = "annual" | "excuse" | "unpaid" | "reward" | "sick";

export interface HolidayRule { date: string; name: string; fraction: 0.5 | 1; }
export interface AnnualLeaveEntitlement {
  eligible: boolean;
  completedYears: number;
  age: number | null;
  statutoryMinimumDays: number;
  reason: string;
  legalBasis: string;
}
export interface AnnualLeaveValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  entitlement: AnnualLeaveEntitlement;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Yıllık İzin", excuse: "Mazeret İzni", unpaid: "Ücretsiz İzin", reward: "Ödül İzni", sick: "Sağlık / Rapor",
};

// 2429 sayılı Kanun kapsamındaki sabit genel tatiller.
function fixedHolidays(year: number): HolidayRule[] {
  return [
    { date: `${year}-01-01`, name: "Yılbaşı", fraction: 1 },
    { date: `${year}-04-23`, name: "Ulusal Egemenlik ve Çocuk Bayramı", fraction: 1 },
    { date: `${year}-05-01`, name: "Emek ve Dayanışma Günü", fraction: 1 },
    { date: `${year}-05-19`, name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", fraction: 1 },
    { date: `${year}-07-15`, name: "Demokrasi ve Millî Birlik Günü", fraction: 1 },
    { date: `${year}-08-30`, name: "Zafer Bayramı", fraction: 1 },
    { date: `${year}-10-28`, name: "Cumhuriyet Bayramı arifesi", fraction: 0.5 },
    { date: `${year}-10-29`, name: "Cumhuriyet Bayramı", fraction: 1 },
  ];
}

const religiousHolidays2026: HolidayRule[] = [
  { date: "2026-03-19", name: "Ramazan Bayramı arifesi", fraction: 0.5 },
  { date: "2026-03-20", name: "Ramazan Bayramı 1. gün", fraction: 1 },
  { date: "2026-03-21", name: "Ramazan Bayramı 2. gün", fraction: 1 },
  { date: "2026-03-22", name: "Ramazan Bayramı 3. gün", fraction: 1 },
  { date: "2026-05-26", name: "Kurban Bayramı arifesi", fraction: 0.5 },
  { date: "2026-05-27", name: "Kurban Bayramı 1. gün", fraction: 1 },
  { date: "2026-05-28", name: "Kurban Bayramı 2. gün", fraction: 1 },
  { date: "2026-05-29", name: "Kurban Bayramı 3. gün", fraction: 1 },
  { date: "2026-05-30", name: "Kurban Bayramı 4. gün", fraction: 1 },
];

export function getPublicHolidays(year: number, custom: HolidayRule[] = []): HolidayRule[] {
  const base = fixedHolidays(year); if (year === 2026) base.push(...religiousHolidays2026);
  const map = new Map<string, HolidayRule>(); [...base, ...custom].forEach((item) => map.set(item.date, item));
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function isoDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function asDate(value: string | Date): Date { if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate()); const [y,m,d]=value.split("-").map(Number); return new Date(y,m-1,d); }
function fullYears(from: Date, to: Date) { let years=to.getFullYear()-from.getFullYear(); const anniversary=new Date(to.getFullYear(),from.getMonth(),from.getDate()); if(anniversary>to) years-=1; return Math.max(0,years); }

/** 4857 sayılı İş Kanunu m.53 tabanlı asgari yıllık ücretli izin hesabı. */
export function annualLeaveEntitlement(hireDateValue: string | Date, birthDateValue?: string | Date | null, asOfValue: string | Date = new Date()): AnnualLeaveEntitlement {
  const hire = asDate(hireDateValue); const asOf = asDate(asOfValue);
  if (Number.isNaN(hire.getTime()) || Number.isNaN(asOf.getTime()) || hire > asOf) return { eligible:false, completedYears:0, age:null, statutoryMinimumDays:0, reason:"Geçerli işe giriş tarihi bulunamadı.", legalBasis:"4857 İş Kanunu m.53" };
  const completedYears = fullYears(hire, asOf);
  let age: number | null = null;
  if (birthDateValue) { const birth=asDate(birthDateValue); if(!Number.isNaN(birth.getTime())) age=fullYears(birth,asOf); }
  if (completedYears < 1) return { eligible:false, completedYears, age, statutoryMinimumDays:0, reason:"Yıllık ücretli izin için en az bir yıllık kıdem şartı henüz tamamlanmadı.", legalBasis:"4857 İş Kanunu m.53" };
  let days = completedYears <= 5 ? 14 : completedYears < 15 ? 20 : 26;
  let reason = completedYears <= 5 ? "1–5 yıl kıdem için asgari 14 gün." : completedYears < 15 ? "5 yıldan fazla, 15 yıldan az kıdem için asgari 20 gün." : "15 yıl ve üzeri kıdem için asgari 26 gün.";
  if (age !== null && (age <= 18 || age >= 50) && days < 20) { days = 20; reason += " Yaş kuralı nedeniyle asgari süre 20 güne yükseltildi."; }
  return { eligible:true, completedYears, age, statutoryMinimumDays:days, reason, legalBasis:"4857 İş Kanunu m.53" };
}

export function validateAnnualLeaveRequest(input: { hireDate: string | Date; birthDate?: string | Date | null; requestedDays: number; remainingDays?: number; priorAnnualLeaveParts?: number[]; asOf?: string | Date; }): AnnualLeaveValidation {
  const entitlement=annualLeaveEntitlement(input.hireDate,input.birthDate,input.asOf||new Date()); const errors:string[]=[]; const warnings:string[]=[];
  if(!entitlement.eligible) errors.push(entitlement.reason);
  if(!(input.requestedDays>0)) errors.push("Talep edilen izin süresi sıfırdan büyük olmalıdır.");
  if(typeof input.remainingDays==="number" && input.requestedDays>input.remainingDays) errors.push(`Talep ${input.requestedDays} gün; kayıtlı bakiye ${input.remainingDays} gün.`);
  const parts=[...(input.priorAnnualLeaveParts||[]), input.requestedDays].filter((v)=>v>0);
  if(parts.length>1 && !parts.some((v)=>v>=10)) warnings.push("Yıllık izin bölünüyorsa tarafların anlaşmasıyla parçalardan en az birinin 10 günden az olmaması kuralı kontrol edilmelidir (4857 m.56). ");
  warnings.push("Toplu iş sözleşmesi veya iş sözleşmesi yasal asgari sürenin üzerinde hak tanıyabilir; şirket politikası ayrıca uygulanmalıdır.");
  return { valid:errors.length===0, errors, warnings, entitlement };
}

export interface LeaveDayResult { days:number; calendarDays:number; excludedWeekendDays:number; excludedHolidayDays:number; partialHolidayDays:number; explanation:string; }

/**
 * Varsayılan FutureHR takvimi Cumartesi/Pazar hafta sonu kabul eder. Kurumun vardiya/hafta tatili düzeni
 * farklıysa PDKS/çalışma takvimi adapter'ı customWorkdays ile belirli tarihleri çalışılan gün olarak işaretleyebilir.
 */
export function calculateLeaveDays(startValue:string|Date,endValue:string|Date,type:LeaveType,customHolidays:HolidayRule[]=[],customWorkdays:string[]=[]):LeaveDayResult{
  const start=asDate(startValue),end=asDate(endValue);if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start)return{days:0,calendarDays:0,excludedWeekendDays:0,excludedHolidayDays:0,partialHolidayDays:0,explanation:"Geçersiz tarih aralığı"};
  const holidayMap=new Map<string,HolidayRule>();for(let year=start.getFullYear();year<=end.getFullYear();year+=1)getPublicHolidays(year,customHolidays).forEach(h=>holidayMap.set(h.date,h));
  const forcedWork=new Set(customWorkdays);let calendarDays=0,chargeable=0,weekends=0,fullHolidays=0,partialHolidays=0;
  for(let cursor=new Date(start);cursor<=end;cursor.setDate(cursor.getDate()+1)){calendarDays+=1;if(type==="sick"){chargeable+=1;continue;}const key=isoDate(cursor);const weekend=(cursor.getDay()===0||cursor.getDay()===6)&&!forcedWork.has(key);if(weekend){weekends+=1;continue;}const holiday=holidayMap.get(key);if(holiday?.fraction===1){fullHolidays+=1;continue;}if(holiday?.fraction===0.5){partialHolidays+=.5;chargeable+=.5;continue;}chargeable+=1;}
  return{days:Math.round(chargeable*2)/2,calendarDays,excludedWeekendDays:weekends,excludedHolidayDays:fullHolidays,partialHolidayDays:partialHolidays,explanation:type==="sick"?`${calendarDays} takvim günü (sağlık/rapor süresi)`:`${Math.round(chargeable*2)/2} iş günü; ${weekends} varsayılan hafta sonu ve ${fullHolidays} tam resmî tatil hariç`};
}

export function normalizeLeaveType(value:string):LeaveType{const v=String(value||"").toLocaleLowerCase("tr-TR");if(v.includes("sağ")||v.includes("hasta")||v.includes("rapor"))return"sick";if(v.includes("mazeret"))return"excuse";if(v.includes("ücretsiz"))return"unpaid";if(v.includes("ödül"))return"reward";return"annual";}
