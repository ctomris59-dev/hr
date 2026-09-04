"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SAAS_DATA_MODE, fetchSaasCompensationWorkspace, fetchSaasDevelopmentWorkspace } from "@/lib/hr/saasWorkforceClient";
import { seedSaasStorage, STORAGE_KEYS } from "@/app/utils/storage";

function mergeById(primary: any[] = [], secondary: any[] = []) {
  const map = new Map<string, any>();
  [...primary, ...secondary].forEach((item, index) => {
    const key = String(item?.id || item?.employee_id || item?.employee || `row-${index}`);
    map.set(key, { ...(map.get(key) || {}), ...item });
  });
  return [...map.values()];
}

async function readBootstrap() {
  const response = await fetch("/api/saas/workforce/state/bootstrap", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`State bootstrap ${response.status}`);
  return response.json();
}

export default function SaasStorageGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!SAAS_DATA_MODE);

  useEffect(() => {
    if (!SAAS_DATA_MODE) return;
    let active = true;
    (async () => {
      const [developmentResult, compensationResult, stateResult] = await Promise.allSettled([
        fetchSaasDevelopmentWorkspace(),
        fetchSaasCompensationWorkspace(),
        readBootstrap(),
      ]);
      if (!active) return;

      const development = developmentResult.status === "fulfilled" ? developmentResult.value : null;
      const compensation = compensationResult.status === "fulfilled" ? compensationResult.value : null;
      const bootstrap = stateResult.status === "fulfilled" ? stateResult.value : { documents: {}, candidates: [] };
      const documents = bootstrap?.documents || {};

      let employees = mergeById(development?.employees || [], compensation?.employees || []);
      const careerProfiles = Array.isArray(documents.career_profiles) ? documents.career_profiles : [];
      if (careerProfiles.length) {
        employees = employees.map((employee) => {
          const profile = careerProfiles.find((item: any) => String(item?.employee_id || "") === String(employee?.id || "") || String(item?.employee || "") === String(employee?.["Ad Soyad"] || ""));
          return profile ? { ...employee, career_aspiration: profile.career_aspiration ?? employee.career_aspiration, mobility_willingness: profile.mobility_willingness ?? employee.mobility_willingness } : employee;
        });
      }

      seedSaasStorage({
        [STORAGE_KEYS.ORG_CHART]: employees,
        [STORAGE_KEYS.HISTORY_360]: mergeById(development?.evaluations || [], compensation?.evaluations || []),
        [STORAGE_KEYS.DEVELOPMENT_PLANS]: development?.plans || [],
        [STORAGE_KEYS.TRAINING_ASSIGNMENTS]: mergeById(development?.assignments || [], documents.training_assignments || []),
        [STORAGE_KEYS.COMPENSATION_CYCLES]: compensation?.cycles || [],
        [STORAGE_KEYS.MARKET_BENCHMARKS]: compensation?.benchmarks || [],
        [STORAGE_KEYS.CANDIDATES]: bootstrap?.candidates || [],
        [STORAGE_KEYS.ASSESSMENTS]: documents.assessments || [],
        [STORAGE_KEYS.CAREER_PROFILES]: careerProfiles,
        [STORAGE_KEYS.DECISION_ACTIONS]: documents.decision_actions || [],
        [STORAGE_KEYS.ROLE_OVERRIDES]: documents.role_overrides || [],
      });
      setReady(true);
      window.dispatchEvent(new CustomEvent("dataUpdated"));
      window.dispatchEvent(new CustomEvent("saasStorageHydrated"));
    })().catch(() => {
      if (active) setReady(true); // Dedicated SaaS modules remain usable even if a bridge namespace is unavailable.
    });
    return () => { active = false; };
  }, []);

  if (!ready) {
    return <div className="mx-auto max-w-7xl space-y-4 p-6" aria-busy="true"><div className="h-24 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800"/><div className="grid gap-3 md:grid-cols-3">{[1,2,3].map((item)=><div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"/>)}</div></div>;
  }
  return <>{children}</>;
}
