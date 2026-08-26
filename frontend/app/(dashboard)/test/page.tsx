"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toScore } from "../../../lib/score";
import { API_BASE_URL } from "@/lib/apiConfig";

export default function TestPage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId") ?? searchParams.get("dqiEmployeeId");
  const employeeNameParam = (searchParams.get("employeeName") ?? searchParams.get("dqiEmployeeName") ?? "").trim() || null;
  const [scores, setScores] = useState<{ test: number | null; manager: number | null; position: number | null } | null>(null);
  const [sampleEmployee, setSampleEmployee] = useState<{ id?: string | null; name?: string | null } | null>(null);

  useEffect(() => {
    const loadScores = async () => {
      try {
        const healthRes = await fetch(API_BASE_URL + "/api/demo/health/scores");
        const health = await healthRes.json();
        const sampleName = health?.sampleEmployeeName;
        const sampleId = health?.sampleEmployeeId;
        const overrideName = employeeNameParam || null;
        const overrideId = employeeIdParam ? String(employeeIdParam) : null;
        setSampleEmployee({ id: overrideId ?? (sampleId ? String(sampleId) : null), name: overrideName ?? sampleName ?? null });
        if (!sampleName && !overrideName) {
          setScores(null);
          return;
        }

        const tmRes = await fetch(API_BASE_URL + "/api/talent-matrix");
        const tm = await tmRes.json();
        const data = Array.isArray(tm?.data) ? tm.data : [];
        const employee = data.find((e: any) => {
          if (overrideId && String(e.id) === String(overrideId)) return true;
          const targetName = overrideName || sampleName;
          return targetName ? e.name === targetName || e["Ad Soyad"] === targetName : false;
        });
        if (!employee) {
          setScores(null);
          return;
        }

        setScores({
          test: toScore(employee.test_score),
          manager: toScore(employee.manager_score),
          position: toScore(employee.position_competency_score ?? employee.targetCompetencyScore),
        });
      } catch (error) {
        console.error("DQI test score load failed:", error);
        setScores(null);
      }
    };

    loadScores();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Yetkinlik Testi</h1>
      <p>Bu sayfa DQI smoke testi için kullanılır.</p>
      <div className="sr-only">
        <span data-testid="dqi-selected-employee-name">{sampleEmployee?.name ?? ""}</span>
        <span data-testid="dqi-selected-employee-id">{sampleEmployee?.id ?? ""}</span>
        <span data-testid="dqi-test-score">{scores?.test ?? ""}</span>
        <span data-testid="dqi-manager-score">{scores?.manager ?? ""}</span>
        <span data-testid="dqi-position-score">{scores?.position ?? ""}</span>
      </div>
    </div>
  );
}

