"use client";

import { useEffect } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";

const SALARY_COVERAGE_VERSION = 2;

function parseMoney(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  if (!value) return 0;
  const normalized = String(value)
    .replace(/₺|TL|TRY|\s/gi, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{1,2}$)/, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function existingSalary(person: any) {
  return parseMoney(person?.["Maaş (TL)"] ?? person?.["Mevcut Maaş"] ?? person?.Maaş ?? person?.salary ?? person?.currentSalary);
}

function deterministicDemoSalary(position: string, index: number) {
  const role = String(position || "").toLocaleLowerCase("tr-TR");
  let base = 61000;
  if (/genel müdür|ceo/.test(role)) base = 185000;
  else if (/direktör/.test(role)) base = 128000;
  else if (/müdür|manager/.test(role)) base = 106000;
  else if (/takım lideri|team lead|lider/.test(role)) base = 90000;
  else if (/kıdemli|senior/.test(role)) base = 82000;
  else if (/mühendis|analist|developer|yazılım/.test(role)) base = 73000;
  else if (/uzman/.test(role)) base = 65000;
  const amount = base + (index % 7) * 2750 + Math.floor(index / 7) * 1250;
  return Math.round(amount / 500) * 500;
}

function personName(person: any) {
  return String(person?.["Ad Soyad"] || person?.employee || person?.employee_name || "").trim();
}

function isDemoCompany(org: any[], profile: any, user: any) {
  if (user?.authMode === "secure") return false;
  if (profile?.id === "futurehr-demo-50" || String(profile?.demoVersion || "").startsWith("FHR-DEMO")) return true;
  const names = new Set(org.map((person) => personName(person)));
  return org.length >= 25 && names.has("Pelin Yılmaz");
}

export default function DemoSalaryCoverageBridge() {
  useEffect(() => {
    let repairing = false;

    const repair = () => {
      if (repairing) return;
      const user = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
      const org = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      const profile = getStorageData<any>("hr_company_demo_profile", null);
      if (!org.length || !isDemoCompany(org, profile, user)) return;

      const nonExecutive = org.filter((person) => String(person?.Departman || "") !== "Genel Yönetim");
      const salaryComplete = org.every((person) => existingSalary(person) > 0);
      const cycles = getStorageData<any[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []);
      const coveredCycleEmployees = new Set(
        cycles.flatMap((cycle) => Array.isArray(cycle?.results) ? cycle.results : [])
          .filter((row) => parseMoney(row?.currentSalary ?? row?.["Mevcut Maaş"] ?? row?.["Maaş (TL)"]) > 0)
          .map((row) => String(row?.employee_id || row?.employee || "")),
      );
      const cycleComplete = nonExecutive.every((person) => {
        const id = String(person?.id || person?.employee_id || "");
        const name = personName(person);
        return coveredCycleEmployees.has(id) || coveredCycleEmployees.has(name);
      });

      if (salaryComplete && cycleComplete && Number(profile?.salaryCoverageVersion || 0) >= SALARY_COVERAGE_VERSION) return;

      repairing = true;
      try {
        let changed = false;
        const upgradedOrg = org.map((person, index) => {
          const salary = existingSalary(person);
          if (salary > 0) return person;
          changed = true;
          return { ...person, "Maaş (TL)": deterministicDemoSalary(String(person?.Pozisyon || ""), index) };
        });

        const byId = new Map(upgradedOrg.map((person) => [String(person?.id || person?.employee_id || ""), person]));
        const byName = new Map(upgradedOrg.map((person) => [personName(person), person]));
        const employees = upgradedOrg.filter((person) => String(person?.Departman || "") !== "Genel Yönetim");

        const upgradedCycles = cycles.map((cycle) => {
          const rows = Array.isArray(cycle?.results) ? cycle.results : [];
          const seen = new Set<string>();
          const results = rows.map((row: any) => {
            const employee = byId.get(String(row?.employee_id || "")) || byName.get(String(row?.employee || ""));
            const key = String(employee?.id || employee?.employee_id || row?.employee_id || personName(employee) || row?.employee || "");
            if (key) seen.add(key);
            if (!employee) return row;
            const salary = existingSalary(employee);
            if (parseMoney(row?.currentSalary ?? row?.["Mevcut Maaş"] ?? row?.["Maaş (TL)"]) > 0) return row;
            changed = true;
            return { ...row, employee_id: employee?.id || employee?.employee_id, employee: personName(employee), department: employee?.Departman, currentSalary: salary };
          });

          employees.forEach((employee, index) => {
            const id = String(employee?.id || employee?.employee_id || "");
            const name = personName(employee);
            if ((id && seen.has(id)) || (name && seen.has(name))) return;
            changed = true;
            results.push({
              employee_id: employee?.id || employee?.employee_id,
              employee: name,
              department: employee?.Departman,
              currentSalary: existingSalary(employee),
              proposedIncrease: 15 + (index % 7) * 1.5,
              proposedSalary: Math.round(existingSalary(employee) * (1 + (15 + (index % 7) * 1.5) / 100) / 500) * 500,
              evidenceScore: 64 + (index % 8) * 4,
              source: "FutureHR demo salary coverage repair",
            });
          });

          return { ...cycle, results };
        });

        if (changed || !salaryComplete) setStorageData(STORAGE_KEYS.ORG_CHART, upgradedOrg);
        if (upgradedCycles.length && (changed || !cycleComplete)) setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES, upgradedCycles);

        const salaryRecords = upgradedOrg.filter((person) => existingSalary(person) > 0).length;
        setStorageData("hr_company_demo_profile", {
          ...(profile || {}),
          salaryCoverageVersion: SALARY_COVERAGE_VERSION,
          coverage: { ...(profile?.coverage || {}), salaryRecords, compensationEmployees: employees.length },
        });

        window.dispatchEvent(new CustomEvent("dataUpdated"));
        window.dispatchEvent(new CustomEvent("futurehrSalaryCoverageReady", { detail: { salaryRecords } }));
      } finally {
        repairing = false;
      }
    };

    repair();
    window.addEventListener("dataUpdated", repair);
    window.addEventListener("demoCompany50Ready", repair);
    return () => {
      window.removeEventListener("dataUpdated", repair);
      window.removeEventListener("demoCompany50Ready", repair);
    };
  }, []);

  return null;
}
