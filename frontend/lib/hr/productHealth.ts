import { buildTalentDecisionSnapshot } from "./talentDecisionChain";
import { duplicateEmployeeKeys, employeeName, latestEvaluationMap, normalizeEmployeeName } from "./employeeIdentity";

export type ProductHealthSeverity = "kritik" | "yüksek" | "orta" | "bilgi";

export interface ProductHealthIssue {
  severity: ProductHealthSeverity;
  title: string;
  detail: string;
  route: string;
  action: string;
}

export interface ProductHealthResult {
  version: "FHR-V1-HEALTH-1.0";
  score: number;
  band: "Sunuma Hazır" | "İyi" | "Geliştirilmeli" | "Kritik";
  metrics: {
    employeeCount: number;
    organizationCompleteness: number;
    managerIntegrity: number;
    performanceCoverage: number;
    evidenceCoverage: number;
    salaryCoverage: number;
    benchmarkCoverage: number;
    careerProfileCoverage: number;
    duplicateIdentityCount: number;
    brokenManagerReferenceCount: number;
  };
  issues: ProductHealthIssue[];
}

const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;
const validScore = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 5;
};
const validMoney = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  const raw = String(value ?? "").replace(/₺|\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(/,(?=\d{1,2}$)/, ".");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0;
};

export function buildProductHealth(
  org: any[],
  history: any[],
  benchmarks: any[] = []
): ProductHealthResult {
  const employees = Array.isArray(org) ? org : [];
  const evaluations = Array.isArray(history) ? history : [];
  const latest = latestEvaluationMap(evaluations);
  const employeeNames = new Set(employees.map((person) => normalizeEmployeeName(employeeName(person))).filter(Boolean));
  const duplicates = duplicateEmployeeKeys(employees);

  let organizationComplete = 0;
  let managerRefs = 0;
  let validManagerRefs = 0;
  let performanceCovered = 0;
  let evidenceCovered = 0;
  let salaryCovered = 0;
  let careerCovered = 0;

  employees.forEach((person) => {
    const name = employeeName(person);
    const department = String(person?.Departman ?? person?.department ?? "").trim();
    const position = String(person?.Pozisyon ?? person?.position ?? "").trim();
    if (name && department && position) organizationComplete += 1;

    [person?.["Yönetici 1"], person?.["Yönetici 2"]].forEach((manager) => {
      const normalized = normalizeEmployeeName(manager);
      if (!normalized) return;
      managerRefs += 1;
      if (employeeNames.has(normalized)) validManagerRefs += 1;
    });

    const evaluation = latest.get(normalizeEmployeeName(name));
    if (validScore(evaluation?.Performans ?? evaluation?.performance ?? person?.Performans ?? person?.performance)) performanceCovered += 1;

    const snapshot = buildTalentDecisionSnapshot(person, evaluations);
    if (snapshot.evidence.score >= 60) evidenceCovered += 1;

    if (validMoney(person?.["Maaş (TL)"] ?? person?.["Mevcut Maaş"] ?? person?.salary)) salaryCovered += 1;

    const aspiration = Number(evaluation?.career_aspiration ?? evaluation?.careerAspiration ?? person?.career_aspiration ?? person?.careerAspiration);
    const mobility = Number(evaluation?.mobility_willingness ?? evaluation?.mobilityWillingness ?? person?.mobility_willingness ?? person?.mobilityWillingness);
    if (Number.isFinite(aspiration) && aspiration > 0 && Number.isFinite(mobility) && mobility > 0) careerCovered += 1;
  });

  const roleKeys = new Set(employees
    .map((person) => `${String(person?.Departman ?? "").trim()}|${String(person?.Pozisyon ?? "").trim()}`)
    .filter((key) => key !== "|"));
  const benchmarkKeys = new Set((benchmarks || [])
    .filter((item) => Number(item?.["Piyasa Ortalaması"] ?? item?.amount ?? 0) > 0)
    .map((item) => `${String(item?.Departman ?? item?.department ?? "").trim()}|${String(item?.Pozisyon ?? item?.position ?? "").trim()}`));
  const coveredRoles = Array.from(roleKeys).filter((key) => benchmarkKeys.has(key)).length;

  const metrics = {
    employeeCount: employees.length,
    organizationCompleteness: pct(organizationComplete, employees.length),
    managerIntegrity: managerRefs ? pct(validManagerRefs, managerRefs) : 100,
    performanceCoverage: pct(performanceCovered, employees.length),
    evidenceCoverage: pct(evidenceCovered, employees.length),
    salaryCoverage: pct(salaryCovered, employees.length),
    benchmarkCoverage: pct(coveredRoles, roleKeys.size),
    careerProfileCoverage: pct(careerCovered, employees.length),
    duplicateIdentityCount: duplicates.duplicateIds.length + duplicates.duplicateNames.length,
    brokenManagerReferenceCount: Math.max(0, managerRefs - validManagerRefs),
  };

  const weighted =
    metrics.organizationCompleteness * 0.2 +
    metrics.managerIntegrity * 0.1 +
    metrics.performanceCoverage * 0.2 +
    metrics.evidenceCoverage * 0.2 +
    metrics.salaryCoverage * 0.1 +
    metrics.benchmarkCoverage * 0.1 +
    metrics.careerProfileCoverage * 0.1;
  const identityPenalty = Math.min(25, metrics.duplicateIdentityCount * 8 + metrics.brokenManagerReferenceCount * 3);
  const score = Math.max(0, Math.min(100, Math.round(weighted - identityPenalty)));
  const band: ProductHealthResult["band"] = score >= 85 ? "Sunuma Hazır" : score >= 70 ? "İyi" : score >= 50 ? "Geliştirilmeli" : "Kritik";

  const issues: ProductHealthIssue[] = [];
  if (!employees.length) issues.push({ severity: "kritik", title: "Organizasyon verisi yok", detail: "FutureHR karar zinciri çalışan ana verisi olmadan çalışamaz.", route: "/organizasyon", action: "Organizasyon Excel şablonunu yükleyin." });
  if (metrics.duplicateIdentityCount) issues.push({ severity: "kritik", title: "Mükerrer çalışan kimliği", detail: `${metrics.duplicateIdentityCount} mükerrer Personel Kodu/Ad Soyad anahtarı bulundu.`, route: "/organizasyon", action: "Mükerrer kayıtları birleştirin ve Personel Kodu kullanımını standartlaştırın." });
  if (metrics.brokenManagerReferenceCount) issues.push({ severity: "yüksek", title: "Kırık yönetici bağlantıları", detail: `${metrics.brokenManagerReferenceCount} yönetici referansı çalışan dizininde karşılık bulmuyor.`, route: "/organizasyon", action: "Yönetici 1 / Yönetici 2 alanlarını çalışan ana verisiyle eşleştirin." });
  if (employees.length && metrics.performanceCoverage < 70) issues.push({ severity: "yüksek", title: "Performans kapsamı düşük", detail: `Çalışanların yalnızca %${metrics.performanceCoverage}'inde geçerli performans verisi var.`, route: "/degerlendirme", action: "Eksik değerlendirmeleri tamamlayın veya demo veri setini yenileyin." });
  if (employees.length && metrics.evidenceCoverage < 60) issues.push({ severity: "yüksek", title: "Kanıt güveni sınırlı", detail: `Çalışanların %${metrics.evidenceCoverage}'inde Evidence Score 60+ seviyesinde.`, route: "/kalibrasyon", action: "Yönetici kanıtı, rol uyumu ve geçmiş ölçümleri güçlendirin." });
  if (employees.length && metrics.salaryCoverage < 80) issues.push({ severity: "orta", title: "Ücret verisi eksik", detail: `Ücret kapsamı %${metrics.salaryCoverage}.`, route: "/maas", action: "Ücret Excel şablonunu yetkili İK kullanıcısıyla tamamlayın." });
  if (roleKeys.size && metrics.benchmarkCoverage < 50) issues.push({ severity: "orta", title: "Dış benchmark kapsamı düşük", detail: `Rol bazlı dış ücret benchmark kapsamı %${metrics.benchmarkCoverage}.`, route: "/maas", action: "Piyasa Benchmarkı sayfasını doldurun; iç ücret ortalamasını piyasa verisi kabul etmeyin." });
  if (employees.length && metrics.careerProfileCoverage < 60) issues.push({ severity: "orta", title: "Kariyer profili eksik", detail: `Kariyer isteği + mobilite kapsamı %${metrics.careerProfileCoverage}.`, route: "/kariyer", action: "Kariyer isteği ve mobilite bilgisini teyit edin." });
  if (!issues.length) issues.push({ severity: "bilgi", title: "Veri zinciri sağlıklı", detail: "Organizasyon, performans, kanıt, ücret ve kariyer veri kapsamı demo sunumu için dengeli.", route: "/dashboard", action: "FutureHR AI ile yönetim özetini çalıştırabilirsiniz." });

  return { version: "FHR-V1-HEALTH-1.0", score, band, metrics, issues };
}
