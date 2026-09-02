import { annualLeaveEntitlement, calculateLeaveDays, validateAnnualLeaveRequest } from "../lib/hr/leavePolicy.ts";
import { ATTENDANCE_FIELD_DEFINITIONS, PAYROLL_FIELD_DEFINITIONS, autoMapGenericHeaders, canonicalAttendanceFromRow, canonicalPayrollFromRow, detectImportDataset, parseTurkishNumber } from "../lib/hr/dataImport.ts";
import { canManageConnectors, canPersistConnectorDomain, maskEmail, maskIdentifier, maskName } from "../lib/hr/connectorSecurity.ts";
import { normalizeEmployeeMaster, readinessChecklist } from "../lib/hr/turkeyEnterprise.ts";

const results = [];
const add = (name, pass, actual, expected) => results.push({ name, pass, actual, expected });
const asOf = "2026-09-02";

const elevenMonths = annualLeaveEntitlement("2025-10-02", null, asOf);
add("leave_qualification_under_one_year", !elevenMonths.eligible && elevenMonths.statutoryMinimumDays === 0, elevenMonths, "eligible=false, days=0");
const twoYears = annualLeaveEntitlement("2024-01-01", null, asOf);
add("leave_1_to_5_years_is_14", twoYears.eligible && twoYears.statutoryMinimumDays === 14, twoYears.statutoryMinimumDays, 14);
const sixYears = annualLeaveEntitlement("2020-01-01", null, asOf);
add("leave_over_5_under_15_is_20", sixYears.statutoryMinimumDays === 20, sixYears.statutoryMinimumDays, 20);
const fifteenYears = annualLeaveEntitlement("2011-01-01", null, asOf);
add("leave_15_plus_is_26", fifteenYears.statutoryMinimumDays === 26, fifteenYears.statutoryMinimumDays, 26);
const age50 = annualLeaveEntitlement("2024-01-01", "1976-09-02", asOf);
add("leave_age_50_minimum_is_20", age50.age === 50 && age50.statutoryMinimumDays === 20, { age: age50.age, days: age50.statutoryMinimumDays }, { age: 50, days: 20 });
const split = validateAnnualLeaveRequest({ hireDate: "2020-01-01", requestedDays: 4, priorAnnualLeaveParts: [5], remainingDays: 20, asOf });
add("leave_split_requires_10_day_control_signal", split.warnings.some((message) => message.includes("10")), split.warnings, "warning contains 10-day rule");
add("republic_eve_half_day", calculateLeaveDays("2026-10-28", "2026-10-28", "annual").days === 0.5, calculateLeaveDays("2026-10-28", "2026-10-28", "annual").days, 0.5);
add("republic_day_not_charged", calculateLeaveDays("2026-10-29", "2026-10-29", "annual").days === 0, calculateLeaveDays("2026-10-29", "2026-10-29", "annual").days, 0);
add("turkish_money_parser", parseTurkishNumber("75.000,50 TL") === 75000.5, parseTurkishNumber("75.000,50 TL"), 75000.5);
add("detect_employee_sheet", detectImportDataset(["Personel Kodu", "Ad Soyad", "Departman", "Pozisyon"]) === "employee", detectImportDataset(["Personel Kodu", "Ad Soyad", "Departman", "Pozisyon"]), "employee");
add("detect_payroll_sheet", detectImportDataset(["Sicil No", "Bordro Dönemi", "Brüt Ücret"]) === "payroll", detectImportDataset(["Sicil No", "Bordro Dönemi", "Brüt Ücret"]), "payroll");
add("detect_attendance_sheet", detectImportDataset(["Sicil No", "Tarih", "İlk Giriş", "Son Çıkış"]) === "attendance", detectImportDataset(["Sicil No", "Tarih", "İlk Giriş", "Son Çıkış"]), "attendance");

const payrollHeaders = ["Sicil No", "Ad Soyad", "Bordro Dönemi", "Brüt Ücret", "Net Ücret", "Para Birimi"];
const payrollMap = autoMapGenericHeaders(payrollHeaders, PAYROLL_FIELD_DEFINITIONS);
const payroll = canonicalPayrollFromRow({ "Sicil No": "TEST-001", "Ad Soyad": "Test Çalışanı", "Bordro Dönemi": "2026-08", "Brüt Ücret": "75.000,50", "Net Ücret": "56.000,25", "Para Birimi": "TRY" }, payrollMap, "excel");
add("canonical_payroll_mapping", payroll?.employeeCode === "TEST-001" && payroll?.period === "2026-08" && payroll?.grossSalary === 75000.5 && payroll?.netSalary === 56000.25, payroll, "TEST-001/2026-08/75000.5/56000.25");

const attendanceHeaders = ["Sicil No", "Ad Soyad", "Tarih", "İlk Giriş", "Son Çıkış", "Çalışılan Dakika", "Fazla Mesai Dakika"];
const attendanceMap = autoMapGenericHeaders(attendanceHeaders, ATTENDANCE_FIELD_DEFINITIONS);
const attendance = canonicalAttendanceFromRow({ "Sicil No": "TEST-001", "Ad Soyad": "Test Çalışanı", "Tarih": "2026-09-01", "İlk Giriş": "08:30", "Son Çıkış": "17:30", "Çalışılan Dakika": "480", "Fazla Mesai Dakika": "30" }, attendanceMap, "excel");
add("canonical_attendance_mapping", attendance?.employeeCode === "TEST-001" && attendance?.workedMinutes === 480 && attendance?.overtimeMinutes === 30 && attendance?.firstIn === "08:30", attendance, "TEST-001/480/30/08:30");

const master = normalizeEmployeeMaster({ "Sicil No": "TEST-001", "Ad Soyad": "Test Çalışanı", "Departman": "Finans", "Pozisyon": "Finans Uzmanı", "Maliyet Merkezi": "CC-300", "İşe Giriş Tarihi": "2024-01-15" });
add("canonical_employee_master", master?.employeeCode === "TEST-001" && master?.department === "Finans" && master?.position === "Finans Uzmanı" && master?.costCenter === "CC-300", master, "canonical employee fields");

add("connector_rbac_allows_hr_admins", canManageConnectors("CEO") && canManageConnectors("IK") && canManageConnectors("hr-admin"), [canManageConnectors("CEO"), canManageConnectors("IK"), canManageConnectors("hr-admin")], [true, true, true]);
add("connector_rbac_denies_non_admins", !canManageConnectors("MANAGER") && !canManageConnectors("EMPLOYEE") && !canManageConnectors(undefined), [canManageConnectors("MANAGER"), canManageConnectors("EMPLOYEE"), canManageConnectors(undefined)], [false, false, false]);
add("connector_sync_only_persists_employee_master", canPersistConnectorDomain("employees") && !canPersistConnectorDomain("payroll") && !canPersistConnectorDomain("attendance"), [canPersistConnectorDomain("employees"), canPersistConnectorDomain("payroll"), canPersistConnectorDomain("attendance")], [true, false, false]);
add("connector_preview_masking", maskIdentifier("EMP-123456").endsWith("3456") && !maskName("Test Çalışanı").includes("Test Çalışanı") && maskEmail("test@example.com") === "t•••@example.com", { id: maskIdentifier("EMP-123456"), name: maskName("Test Çalışanı"), email: maskEmail("test@example.com") }, "masked values");

const readiness = readinessChecklist();
add("turkey_readiness_has_10_workstreams", readiness.length === 10, readiness.map((item) => item.id), 10);
add("readiness_critical_priorities_present", readiness.filter((item) => item.critical).length >= 6, readiness.filter((item) => item.critical).map((item) => item.id), ">=6 critical");

for (const result of results) console.log(`${result.pass ? "PASS" : "FAIL"} | ${result.name}${result.pass ? "" : ` | actual=${JSON.stringify(result.actual)} expected=${JSON.stringify(result.expected)}`}`);
const passed = results.filter((result) => result.pass).length;
console.log(`TURKEY ENTERPRISE STRESS RESULT pass=${passed} fail=${results.length - passed} total=${results.length}`);
if (passed !== results.length) process.exit(1);
