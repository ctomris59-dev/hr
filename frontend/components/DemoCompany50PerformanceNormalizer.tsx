"use client";

import { useEffect } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";

const NORMALIZATION_KEY = "hr_demo_performance_normalized_v1";
const CURRENT_PERIOD = "2026 Q2";
const PREVIOUS_PERIOD = "2025 Q4";

function iso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function fallbackRow(person: any, current: boolean, index: number) {
  const kpi = round2(Math.min(4.8, 3.25 + ((index * 7 + (current ? 3 : 0)) % 14) / 10));
  const manager = round2(Math.max(2.5, Math.min(4.9, kpi + (((index + (current ? 1 : 0)) % 5) - 2) * 0.1)));
  const codes = ["DIG", "ANA", "RES", "DET", "LRN", "ETH", "DIS", "STR", "TEA", "COM"];
  const scores = Object.fromEntries(codes.map((code, competencyIndex) => [code, round2(Math.min(4.9, 3 + ((index * 5 + competencyIndex * 3 + (current ? 2 : 0)) % 17) / 10))]));
  return {
    id: `eval-${person.id}-${current ? "current" : "prev"}`,
    employee_id: person.id,
    Personel: person["Ad Soyad"],
    "Ad Soyad": person["Ad Soyad"],
    Departman: person.Departman,
    Pozisyon: person.Pozisyon,
    evaluator: person["Yönetici 1"] || "Yönetim Kurulu",
    evaluation_type: "FutureHR 50 Kişilik Demo",
    period: current ? CURRENT_PERIOD : PREVIOUS_PERIOD,
    date: iso(current ? -30 : -210),
    kpi_score: kpi,
    "KPI Score": kpi,
    manager_performance_score: manager,
    "Manager Score": manager,
    Performans: round2(kpi * 0.6 + manager * 0.4),
    manager_scores: scores,
    ...scores,
    ...Object.fromEntries(Object.entries(scores).map(([code, value]) => [`${code}_Mgr`, value])),
    competency_score: round2(Object.values(scores).reduce((sum, value) => sum + Number(value), 0) / codes.length),
    note: current ? "Güncel dönem kalibrasyon kaydı." : "Önceki dönem karşılaştırma kaydı.",
  };
}

export default function DemoCompany50PerformanceNormalizer() {
  useEffect(() => {
    let applying = false;

    const normalize = () => {
      if (applying || typeof window === "undefined") return;
      if (localStorage.getItem(NORMALIZATION_KEY) === "1") return;

      const profile = getStorageData<any>("hr_company_demo_profile", null);
      const organization = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      if (profile?.demoVersion !== "FHR-DEMO-50-1" || organization.length !== 50) return;

      applying = true;
      try {
        const rawHistory = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
        const byId = new Map(organization.map((person) => [String(person.id || ""), person]));
        const byName = new Map(organization.map((person) => [String(person["Ad Soyad"] || ""), person]));
        const normalized: any[] = [];

        organization.forEach((person, personIndex) => {
          const rows = rawHistory
            .filter((row) => String(row?.employee_id || "") === String(person.id || "") || String(row?.Personel || row?.["Ad Soyad"] || "") === String(person["Ad Soyad"] || ""))
            .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));

          let previous = rows.find((row) => row?.period === PREVIOUS_PERIOD || /-(?:1|prev)$/.test(String(row?.id || ""))) || rows[0];
          let current = rows.find((row) => row?.period === CURRENT_PERIOD || /-(?:0|current)$/.test(String(row?.id || ""))) || rows[rows.length - 1];

          if (!previous || previous === current) previous = fallbackRow(person, false, personIndex);
          if (!current || current === previous) current = fallbackRow(person, true, personIndex);

          [previous, current].forEach((row, periodIndex) => {
            const isCurrent = periodIndex === 1;
            const resolvedPerson = byId.get(String(row?.employee_id || "")) || byName.get(String(row?.Personel || row?.["Ad Soyad"] || "")) || person;
            normalized.push({
              ...row,
              employee_id: resolvedPerson.id,
              Personel: resolvedPerson["Ad Soyad"],
              "Ad Soyad": resolvedPerson["Ad Soyad"],
              Departman: resolvedPerson.Departman,
              Pozisyon: resolvedPerson.Pozisyon,
              evaluator: row?.evaluator || resolvedPerson["Yönetici 1"] || "Yönetim Kurulu",
              evaluation_type: row?.evaluation_type || "FutureHR 50 Kişilik Demo",
              period: isCurrent ? CURRENT_PERIOD : PREVIOUS_PERIOD,
              date: row?.date || iso(isCurrent ? -30 : -210),
              isCurrentPeriod: isCurrent,
            });
          });
        });

        const currentRows = normalized.filter((row) => row.period === CURRENT_PERIOD);
        const previousRows = normalized.filter((row) => row.period === PREVIOUS_PERIOD);
        if (normalized.length !== 100 || currentRows.length !== 50 || previousRows.length !== 50) {
          throw new Error(`Performans demo kapsamı eksik: toplam=${normalized.length}, güncel=${currentRows.length}, önceki=${previousRows.length}`);
        }

        localStorage.setItem(NORMALIZATION_KEY, "1");
        setStorageData(STORAGE_KEYS.HISTORY_360, normalized);
        setStorageData("hr_performance_entries", currentRows);
        setStorageData("hr_performance_history", previousRows);
        setStorageData("hr_company_demo_profile", {
          ...profile,
          coverage: {
            ...(profile?.coverage || {}),
            performanceRecords: 100,
            currentPerformanceRecords: 50,
            previousPerformanceRecords: 50,
          },
        });
        window.dispatchEvent(new CustomEvent("performanceUpdated"));
        window.dispatchEvent(new CustomEvent("dataUpdated"));
      } catch (error) {
        localStorage.removeItem(NORMALIZATION_KEY);
        console.error("50 kişilik demo performans normalizasyonu başarısız", error);
      } finally {
        applying = false;
      }
    };

    normalize();
    window.addEventListener("dataUpdated", normalize);
    window.addEventListener("demoCompany50Ready", normalize);
    return () => {
      window.removeEventListener("dataUpdated", normalize);
      window.removeEventListener("demoCompany50Ready", normalize);
    };
  }, []);

  return null;
}
