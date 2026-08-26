export type LeaveType = "annual" | "excuse" | "unpaid" | "reward" | "sick";

export interface HolidayRule {
  date: string; // YYYY-MM-DD
  name: string;
  fraction: 0.5 | 1;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Yıllık İzin",
  excuse: "Mazeret İzni",
  unpaid: "Ücretsiz İzin",
  reward: "Ödül İzni",
  sick: "Sağlık / Rapor",
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

// Diyanet'in 2026 resmî tatil takvimindeki dinî bayram günleri.
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
  const base = fixedHolidays(year);
  if (year === 2026) base.push(...religiousHolidays2026);
  const map = new Map<string, HolidayRule>();
  [...base, ...custom].forEach((item) => map.set(item.date, item));
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function asDate(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export interface LeaveDayResult {
  days: number;
  calendarDays: number;
  excludedWeekendDays: number;
  excludedHolidayDays: number;
  partialHolidayDays: number;
  explanation: string;
}

/**
 * Yıllık, mazeret, ücretsiz ve ödül izinleri iş günü bazında hesaplanır.
 * Sağlık/rapor izinleri rapor süresini temsil ettiği için takvim günü bazındadır.
 * Yarım gün resmî tatilde iş günü izinlerinden yalnızca 0,5 gün düşülür.
 */
export function calculateLeaveDays(
  startValue: string | Date,
  endValue: string | Date,
  type: LeaveType,
  customHolidays: HolidayRule[] = []
): LeaveDayResult {
  const start = asDate(startValue);
  const end = asDate(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { days: 0, calendarDays: 0, excludedWeekendDays: 0, excludedHolidayDays: 0, partialHolidayDays: 0, explanation: "Geçersiz tarih aralığı" };
  }

  const holidayMap = new Map<string, HolidayRule>();
  for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
    getPublicHolidays(year, customHolidays).forEach((h) => holidayMap.set(h.date, h));
  }

  let calendarDays = 0;
  let chargeable = 0;
  let weekends = 0;
  let fullHolidays = 0;
  let partialHolidays = 0;

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    calendarDays += 1;
    if (type === "sick") {
      chargeable += 1;
      continue;
    }

    const day = cursor.getDay();
    const weekend = day === 0 || day === 6;
    if (weekend) {
      weekends += 1;
      continue;
    }

    const holiday = holidayMap.get(isoDate(cursor));
    if (holiday?.fraction === 1) {
      fullHolidays += 1;
      continue;
    }
    if (holiday?.fraction === 0.5) {
      partialHolidays += 0.5;
      chargeable += 0.5;
      continue;
    }
    chargeable += 1;
  }

  return {
    days: Math.round(chargeable * 2) / 2,
    calendarDays,
    excludedWeekendDays: weekends,
    excludedHolidayDays: fullHolidays,
    partialHolidayDays: partialHolidays,
    explanation:
      type === "sick"
        ? `${calendarDays} takvim günü (sağlık/rapor süresi)`
        : `${Math.round(chargeable * 2) / 2} iş günü; ${weekends} hafta sonu ve ${fullHolidays} tam resmî tatil hariç`,
  };
}

export function normalizeLeaveType(value: string): LeaveType {
  const v = String(value || "").toLocaleLowerCase("tr-TR");
  if (v.includes("sağ") || v.includes("hasta") || v.includes("rapor")) return "sick";
  if (v.includes("mazeret")) return "excuse";
  if (v.includes("ücretsiz")) return "unpaid";
  if (v.includes("ödül")) return "reward";
  return "annual";
}
