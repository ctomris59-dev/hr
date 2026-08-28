import { NextResponse } from "next/server";
import { CURATED_JOB_PROFILES, CURATED_ROLE_COUNT } from "@/lib/hr/jobCompetencyCatalogV21";
import { FUTUREHR_COMPETENCIES, JOB_COMPETENCY_MODEL_VERSION } from "@/lib/hr/jobCompetencyArchitecture";
import { auditPositionAliases } from "@/lib/hr/jobPositionAliases";
import { resolveTargetProfile } from "@/lib/hr/careerArchitecture";

export const dynamic = "force-dynamic";

const CRITICAL_ALIAS_PROBES: Array<[string, string]> = [
  ["İnsan Kaynakları Müdürü", "İK Müdürü"],
  ["HR Manager", "İK Müdürü"],
  ["Human Resources Director", "İK Direktörü"],
  ["Finance Manager", "Finans Müdürü"],
  ["Procurement Manager", "Satın Alma Müdürü"],
  ["Operations Manager", "Operasyon Müdürü"],
  ["Production Manager", "Üretim Müdürü"],
  ["Sales Manager", "Satış Müdürü"],
  ["Marketing Director", "Pazarlama Direktörü"],
  ["Data Scientist", "Veri Analisti / Data Scientist"],
  ["Software Developer", "Yazılım Mühendisi"],
  ["Cybersecurity Manager", "Siber Güvenlik Müdürü"],
  ["Legal Counsel", "Hukuk Danışmanı"],
  ["Compliance Director", "Uyum (Compliance) Direktörü"],
  ["Corporate Communications Director", "Kurumsal İletişim Direktörü"],
  ["Internal Audit Manager", "İç Denetim Müdürü"],
  ["Risk Manager", "Risk Yönetimi Müdürü"],
  ["Administrative Affairs Manager", "İdari İşler Müdürü"],
  ["Executive Assistant", "Yönetici Asistanı (CEO Assistant)"],
  ["Trade Registry Manager", "Ticaret Sicil Servisi Müdürü"],
  ["General Secretary", "Genel Sekreter"],
];

export async function GET() {
  const invalidProfiles: string[] = [];
  const values: number[] = [];
  const canonicalRoles = Object.keys(CURATED_JOB_PROFILES);

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

  const aliasAudit = auditPositionAliases(canonicalRoles);
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

  // Deliberately ambiguous abbreviations must remain unresolved rather than silently choosing the wrong role.
  const ambiguousProbe = resolveTargetProfile("CSO");
  const ambiguousAbbreviationSafe = ambiguousProbe.source !== "exact" || !ambiguousProbe.aliasMatched;

  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const share45Plus = values.length ? values.filter((value) => value >= 4.5).length / values.length : 0;
  const share50 = values.length ? values.filter((value) => value === 5).length / values.length : 0;

  const healthy =
    CURATED_ROLE_COUNT === 178 &&
    invalidProfiles.length === 0 &&
    aliasAudit.canonicalRoleCount === 178 &&
    aliasAudit.uncoveredRoles.length === 0 &&
    aliasAudit.failedRoundTrips.length === 0 &&
    aliasProbes.every((probe) => probe.ok) &&
    ambiguousAbbreviationSafe;

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
      aliasAudit: {
        canonicalRoleCount: aliasAudit.canonicalRoleCount,
        rolesWithAlternativeAliases: aliasAudit.rolesWithAlternativeAliases,
        uncoveredRoles: aliasAudit.uncoveredRoles,
        explicitAliasCount: aliasAudit.explicitAliasCount,
        generatedSurfaceCount: aliasAudit.generatedSurfaceCount,
        activeAliasKeyCount: aliasAudit.activeAliasKeyCount,
        perRoleMinimumAlternatives: aliasAudit.perRoleMinimumAlternatives,
        collisionCount: aliasAudit.collisionCount,
        collisions: aliasAudit.collisions,
        deliberatelyAmbiguous: aliasAudit.deliberatelyAmbiguous,
        failedRoundTripCount: aliasAudit.failedRoundTrips.length,
        failedRoundTrips: aliasAudit.failedRoundTrips.slice(0, 25),
      },
      aliasProbes,
      ambiguousAbbreviationProbe: {
        input: "CSO",
        safe: ambiguousAbbreviationSafe,
        source: ambiguousProbe.source,
        canonical: ambiguousProbe.canonicalPosition || null,
      },
    },
    { status: healthy ? 200 : 500 }
  );
}
