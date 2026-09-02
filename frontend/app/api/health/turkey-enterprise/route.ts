import { NextResponse } from "next/server";
import { annualLeaveEntitlement, calculateLeaveDays, validateAnnualLeaveRequest } from "@/lib/hr/leavePolicy";
import {
  ATTENDANCE_FIELD_DEFINITIONS,
  PAYROLL_FIELD_DEFINITIONS,
  autoMapGenericHeaders,
  canonicalAttendanceFromRow,
  canonicalPayrollFromRow,
  detectImportDataset,
  parseTurkishNumber,
} from "@/lib/hr/dataImport";
import { normalizeEmployeeMaster, readinessChecklist } from "@/lib/hr/turkeyEnterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = { name: string; pass: boolean; actual?: unknown; expected?: unknown };
const checks: Check[] = [];
function check(name: string, pass: boolean, actual?: unknown, expected?: unknown) { checks.push({ name, pass, actual, expected }); }

export async function GET() {
  checks.length = 0;
  const asOf = "2026-09-02";

  const elevenMonths = annualLeaveEntitlement("2025-10-02", null, asOf);
  check("leave_qualification_under_one_year", !elevenMonths.eligible && elevenMonths.statutoryMinimumDays === 0, elevenMonths, "eligible=false, days=0");

  const twoYears = annualLeaveEntitlement("2024-01-01", null, asOf);
  check("leave_1_to_5_years_is_14", twoYears.eligible && twoYears.statutoryMinimumDays === 14, twoYears.statutoryMinimumDays, 14);

  const sixYears = annualLeaveEntitlement("2020-01-01", null, asOf);
  check("leave_over_5_under_15_is_20", sixYears.statutoryMinimumDays === 20, sixYears.statutoryMinimumDays, 20);

  const fifteenYears = annualLeaveEntitlement("2011-01-01", null, asOf);
  check("leave_15_plus_is_26", fifteenYears.statutoryMinimumDays === 26, fifteenYears.statutoryMinimumDays, 26);

  const age50 = annualLeaveEntitlement("2024-01-01", "1976-09-02", asOf);
  check("leave_age_50_minimum_is_20", age50.age === 50 && age50.statutoryMinimumDays === 20, { age: age50.age, days: age50.statutoryMinimumDays }, { age: 50, days: 20 });

  const split = validateAnnualLeaveRequest({ hireDate: "2020-01-01", requestedDays: 4, priorAnnualLeaveParts: [5], remainingDays: 20, asOf });
  check("leave_split_requires_10_day_control_signal", split.warnings.some((message) => message.includes("10")), split.warnings, "warning contains 10-day rule");

  const halfHoliday = calculateLeaveDays("2026-10-28", "2026-10-28", "annual");
  check("republic_eve_half_day", halfHoliday.days === 0.5, halfHoliday.days, 0.5);

  const fullHoliday = calculateLeaveDays("2026-10-29", "2026-10-29", "annual");
  check("republic_day_not_charged", fullHoliday.days === 0, fullHoliday.days, 0);

  const parsedMoney = parseTurkishNumber("75.000,50 TL");
  check("turkish_money_parser", parsedMoney === 75000.5, parsedMoney, 75000.5);

  check("detect_employee_sheet", detectImportDataset(["Personel Kodu", "Ad Soyad", "Departman", "Pozisyon"]) === "employee", detectImportDataset(["Personel Kodu", "Ad Soyad", "Departman", "Pozisyon"]), "employee");
  check("detect_payroll_sheet", detectImportDataset(["Sicil No", "Bordro Dönemi", "Brüt Ücret"]) === "payroll", detectImportDataset(["Sicil No", "Bordro Dönemi", "Brüt Ücret"]), "payroll");
  check("detect_attendance_sheet", detectImportDataset(["Sicil No", "Tarih", "İlk Giriş", "Son Çıkış"]) === "attendance", detectImportDataset(["Sicil No", "Tarih", "İlk Giriş", "Son Çıkış"]), "attendance");

  const payrollHeaders = ["Sicil No", "Ad Soyad", "Bordro Dönemi", "Brüt Ücret", "Net Ücret", "Para Birimi"];
  const payrollMap = autoMapGenericHeaders(payrollHeaders, PAYROLL_FIELD_DEFINITIONS);
  const payroll = canonicalPayrollFromRow({ "Sicil No": "P001", "Ad Soyad": "Örnek Çalışan", "Bordro Dönemi": "2026-08", "Brüt Ücret": "75.000,50", "Net Ücret": "56.000,25", "Para Birimi": "TRY" }, payrollMap, "excel");
  check("canonical_payroll_mapping", payroll?.employeeCode === "P001" && payroll?.period === "2026-08" && payroll?.grossSalary === 75000.5 && payroll?.netSalary === 56000.25, payroll, "P001/2026-08/75000.5/56000.25");

  const attendanceHeaders = ["Sicil No", "Ad Soyad", "Tarih", "İlk Giriş", "Son Çıkış", "Çalışılan Dakika", "Fazla Mesai Dakika"];
  const attendanceMap = autoMapGenericHeaders(attendanceHeaders, ATTENDANCE_FIELD_DEFINITIONS);
  const attendance = canonicalAttendanceFromRow({ "Sicil No": "P001", "Ad Soyad": "Örnek Çalışan", "Tarih": "2026-09-01", "İlk Giriş": "08:30", "Son Çıkış": "17:30", "Çalışılan Dakika": "480", "Fazla Mesai Dakika": "30" }, attendanceMap, "excel");
  check("canonical_attendance_mapping", attendance?.employeeCode === "P001" && attendance?.workedMinutes === 480 && attendance?.overtimeMinutes === 30 && attendance?.firstIn === "08:30", attendance, "P001/480/30/08:30");

  const master = normalizeEmployeeMaster({ "Sicil No": "P001", "Ad Soyad": "Ayşe Yılmaz", "Departman": "Finans", "Pozisyon": "Finans Uzmanı", "Maliyet Merkezi": "CC-300", "İşe Giriş Tarihi": "2024-01-15" });
  check("canonical_employee_master", master?.employeeCode === "P001" && master?.department === "Finans" && master?.position === "Finans Uzmanı" && master?.costCenter === "CC-300", master, "canonical employee fields");

  const readiness = readinessChecklist();
  check("turkey_readiness_has_10_workstreams", readiness.length === 10, readiness.map((item) => item.id), 10);
  check("readiness_critical_priorities_present", readiness.filter((item) => item.critical).length >= 6, readiness.filter((item) => item.critical).map((item) => item.id), ">=6 critical");

  const passed = checks.filter((item) => item.pass).length;
  return NextResponse.json({ ok: passed === checks.length, passed, total: checks.length, failed: checks.filter((item) => !item.pass), checks }, { headers: { "Cache-Control": "no-store" } });
}
