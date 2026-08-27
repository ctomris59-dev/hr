import { NextResponse } from "next/server";
import { CURATED_JOB_PROFILES, CURATED_ROLE_COUNT } from "@/lib/hr/jobCompetencyCatalogV21";
import { FUTUREHR_COMPETENCIES, JOB_COMPETENCY_MODEL_VERSION } from "@/lib/hr/jobCompetencyArchitecture";
import { resolveTargetProfile } from "@/lib/hr/careerArchitecture";

export const dynamic = "force-dynamic";

const CRITICAL_ALIAS_PROBES: Array<[string, string]> = [
  ["İnsan Kaynakları Müdürü", "İK Müdürü"],
  ["HR Manager", "İK Müdürü"],
  ["Human Resources Director", "İK Direktörü"],
  ["Finance Manager", "Finans Müdürü"],
  ["Data Scientist", "Veri Analisti / Data Scientist"],
  ["Software Developer", "Yazılım Mühendisi"],
];

export async function GET() {
  const invalidProfiles: string[] = [];
  const values: number[] = [];

  for (const [role, profile] of Object.entries(CURATED_JOB_PROFILES)) {
    const keys = Object.keys(profile);
    const hasAll = FUTUREHR_COMPETENCIES.every((competency) => Number.isFinite(Number(profile[competency])));
    const onlyCanonical = keys.length === FUTUREHR_COMPETENCIES.length && keys.every((key) => FUTUREHR_COMPETENCIES.includes(key as any));
    const inRange = FUTUREHR_COMPETENCIES.every((competency) => {
      const value = Number(profile[competency]);
      if (Number.isFinite(value)) values.push(value);
      return Number.isFinite(value) && value >= 3 && value <= 5;
    });
    if (!hasAll || !onlyCanonical || !inRange) invalidProfiles.push(role);
  }

  const aliasProbes = CRITICAL_ALIAS_PROBES.map(([input, expected]) => {
    const resolution = resolveTargetProfile(input);
    return {
      input,
      expected,
      canonical: resolution.canonicalPosition || null,
      source: resolution.source,
      aliasMatched: Boolean(resolution.aliasMatched),
      ok: resolution.source === "exact" && resolution.canonicalPosition === expected,
    };
  });

  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const share45Plus = values.length ? values.filter((value) => value >= 4.5).length / values.length : 0;
  const share50 = values.length ? values.filter((value) => value === 5).length / values.length : 0;

  const healthy =
    CURATED_ROLE_COUNT === 178 &&
    invalidProfiles.length === 0 &&
    aliasProbes.every((probe) => probe.ok);

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      modelVersion: JOB_COMPETENCY_MODEL_VERSION,
      roleCount: CURATED_ROLE_COUNT,
      expectedRoleCount: 178,
      competencyCount: FUTUREHR_COMPETENCIES.length,
      totalTargetCells: values.length,
      distribution: {
        mean: Number(mean.toFixed(3)),
        share45Plus: Number(share45Plus.toFixed(3)),
        share50: Number(share50.toFixed(3)),
      },
      invalidProfiles,
      aliasProbes,
    },
    { status: healthy ? 200 : 500 }
  );
}
