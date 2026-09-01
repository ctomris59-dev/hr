import { canAccessRoute } from "@/lib/hr/accessControl";
import { normalizeEmployeeName } from "@/lib/hr/employeeIdentity";
import { collectFutureHRData, localAgentFallback } from "@/lib/hr/futureHRAgent";
import { SAAS_DATA_MODE, fetchSaasCompensationWorkspace } from "@/lib/hr/saasWorkforceClient";
import { getPulseAnalytics } from "@/app/services/surveyService";
import {
  buildUniversalAgentAugmentation,
  containsCjk,
  mergeUniversalPackage,
  restoreUniversalAliases,
} from "@/lib/hr/futureHRUniversalData";
import type { AgentAIResponse, AgentPackage, AgentToolResult } from "@/lib/hr/futureHRAgentTypes";

const PERSONAL_SALARY_PATTERNS = [
  /maaşı\s+(?:nedir|ne\s+kadar|kaç)/i,
  /maaş(?:ı|i)?\s+ne\s+kadar/i,
  /mevcut\s+maaş/i,
  /ücreti\s+(?:nedir|ne\s+kadar|kaç)/i,
  /mevcut\s+ücret/i,
  /salary\s+(?:is|amount|how much)/i,
];

const EXPERIENCE_TERMS = [
  "çalışan deneyimi", "calisan deneyimi", "pulse", "moral", "motivasyon", "iş yükü", "is yuku",
  "enerji", "yönetici desteği", "yonetici destegi", "rol netliği", "rol netligi", "memnuniyet",
  "ceo", "yönetici özeti", "yonetici ozeti", "bu hafta", "bu ay", "öncelik", "oncelik",
];
const EXPERIENCE_MANAGEMENT_ROLES = new Set(["CEO", "IK", "ADMIN", "DIRECTOR", "MANAGER", "HR_ADMIN"]);

function isDirectPersonalSalaryQuestion(question: string) {
  return PERSONAL_SALARY_PATTERNS.some((pattern) => pattern.test(question));
}

function parseMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  if (!value) return 0;
  const normalized = String(value)
    .replace(/₺|TL|TRY|\s/gi, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{1,2}$)/, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function employeeSalary(row: any) {
  return parseMoney(
    row?.["Maaş (TL)"] ??
    row?.Maaş ??
    row?.salary ??
    row?.current_salary ??
    row?.salary_amount ??
    row?.gross_salary ??
    row?.currentSalary,
  );
}

function benchmarkAmount(row: any) {
  return parseMoney(
    row?.["Piyasa Ortalaması"] ??
    row?.market_average ??
    row?.marketAverage ??
    row?.benchmark ??
    row?.benchmark_amount,
  );
}

function formatTl(value: number) {
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)} TL`;
}

function accessDeniedAnswer(displayName: string): AgentAIResponse {
  return {
    answer: `${displayName} için bireysel ücret tutarı mevcut rolünüzün erişim kapsamı dışında.`,
    executiveSummary: "Bireysel ücret verisi RBAC nedeniyle gösterilmedi.",
    confidence: "yüksek",
    confidenceReason: "FutureHR ücret modülü erişim politikası doğrudan uygulandı.",
    recommendations: [],
    evidenceSources: [],
    nextActions: [],
    evidenceGaps: ["Bireysel ücret verisine erişim yetkisi bulunmuyor."],
    guardrail: "FutureHR Intelligence yetki kapsamı dışındaki kişisel ücret bilgisini açığa çıkarmaz.",
  };
}

async function directSalaryAnswer(
  question: string,
  agentPackage: AgentPackage,
  currentUserRole: any,
): Promise<AgentAIResponse | null> {
  if (!isDirectPersonalSalaryQuestion(question) || !agentPackage.focusEmployee) return null;

  const displayName = agentPackage.focusEmployee.displayName;
  if (!canAccessRoute(currentUserRole, "/maas")) return accessDeniedAnswer(displayName);

  const baseData = await collectFutureHRData();
  let employees = baseData.org;
  let benchmarks = baseData.benchmarks;

  if (SAAS_DATA_MODE) {
    try {
      const compensation = await fetchSaasCompensationWorkspace();
      employees = compensation.employees;
      benchmarks = compensation.benchmarks;
    } catch {
      // Yetkili compensation endpoint geçici olarak erişilemiyorsa mevcut güvenli paketle devam edilir.
    }
  }

  const employee = employees.find((row: any) =>
    normalizeEmployeeName(row?.["Ad Soyad"] || row?.employee_name || row?.name || row?.full_name) === normalizeEmployeeName(displayName),
  );

  if (!employee) {
    return {
      answer: `${displayName} için FutureHR organizasyon/ücret verisinde eşleşen çalışan kaydı bulunamadı.`,
      executiveSummary: "Çalışan kaydı eşleşmediği için bireysel ücret okunamadı.",
      confidence: "düşük",
      confidenceReason: "Yetki mevcut ancak çalışan kaydı ücret veri kaynağıyla eşleşmedi.",
      recommendations: [{ title: "Ücret kaydını kontrol et", why: "Çalışan kimliği ile ücret kaynağının eşleşmesi doğrulanmalı.", evidence: "FutureHR organizasyon/ücret veri eşleşmesi", route: "/maas" }],
      evidenceSources: [],
      nextActions: [{ label: "Ücret ekranını aç", route: "/maas", actionKind: "open_compensation" }],
      evidenceGaps: ["Çalışan ile ücret kaydı eşleştirilemedi."],
      guardrail: "FutureHR Intelligence tutar uydurmaz; yalnız yetkili ve eşleşen kaydı gösterir.",
    };
  }

  const salary = employeeSalary(employee);
  const department = String(employee?.Departman || agentPackage.focusEmployee.department || "").trim();
  const position = String(employee?.Pozisyon || agentPackage.focusEmployee.position || "").trim();
  const benchmark = benchmarks.find((row: any) =>
    String(row?.Departman || row?.department || "") === department &&
    String(row?.Pozisyon || row?.position || "") === position,
  );
  const market = benchmarkAmount(benchmark);

  if (!(salary > 0)) {
    return {
      answer: `${displayName} için bireysel ücret kaydı erişilebilir, ancak mevcut maaş tutarı FutureHR veri kaynağında boş veya geçersiz görünüyor.`,
      executiveSummary: "Yetki var; kayıtlı geçerli maaş tutarı yok.",
      confidence: "yüksek",
      confidenceReason: "Çalışan kaydı bulundu ancak maaş alanı pozitif sayısal bir tutar içermiyor.",
      recommendations: [{ title: "Ücret verisini doğrula", why: "Çalışan ücret alanı eksik veya hatalı.", evidence: "FutureHR bireysel ücret kaydı", route: "/maas" }],
      evidenceSources: [{ id: "salary-record", label: "Bireysel Ücret Kaydı", detail: `${department || "—"} · ${position || "—"} · tutar eksik`, route: "/maas", domain: "compensation", confidence: "yüksek" }],
      nextActions: [{ label: "Ücret ekranını aç", route: "/maas", actionKind: "open_compensation" }],
      evidenceGaps: ["Mevcut maaş tutarı kayıtlı değil veya geçersiz."],
      guardrail: "FutureHR Intelligence tutar uydurmaz; yalnız yetkili ve doğrulanabilir ücret verisini gösterir.",
    };
  }

  const compaRatio = market > 0 ? salary / market : null;
  const comparison = compaRatio == null
    ? ""
    : ` Aynı rol için kayıtlı piyasa benchmarkı ${formatTl(market)}; mevcut ücret benchmarkın %${(compaRatio * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} seviyesinde.`;

  return {
    answer: `${displayName}'nın FutureHR'da kayıtlı mevcut maaşı ${formatTl(salary)}.${comparison}`,
    executiveSummary: `${displayName} · mevcut maaş ${formatTl(salary)}${market > 0 ? ` · benchmark ${formatTl(market)}` : ""}.`,
    confidence: "yüksek",
    confidenceReason: "Tutar, yetki kontrolünden sonra FutureHR'ın bireysel ücret kaydından doğrudan okundu; dış AI sağlayıcısına gönderilmedi.",
    recommendations: market > 0 ? [{
      title: "Benchmark konumunu incele",
      why: `Mevcut ücret piyasa referansının %${(compaRatio! * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} seviyesinde.`,
      evidence: `${formatTl(salary)} mevcut ücret · ${formatTl(market)} piyasa benchmarkı`,
      route: "/maas",
    }] : [],
    evidenceSources: [
      { id: "salary-record", label: "Bireysel Ücret Kaydı", detail: `${department || "—"} · ${position || "—"}`, route: "/maas", domain: "compensation", confidence: "yüksek", value: formatTl(salary) },
      ...(market > 0 ? [{ id: "salary-benchmark", label: "Piyasa Benchmarkı", detail: `${department || "—"} · ${position || "—"}`, route: "/maas", domain: "compensation" as const, confidence: "orta" as const, value: formatTl(market) }] : []),
    ],
    nextActions: [{ label: "Ücret detayını aç", route: "/maas", actionKind: "open_compensation" }],
    evidenceGaps: market > 0 ? [] : ["Bu rol için karşılaştırılabilir piyasa benchmarkı bulunmuyor."],
    guardrail: "Bu kişisel ücret bilgisi yalnız mevcut RBAC yetkisi kapsamında yerel FutureHR katmanında gösterildi; dış AI sağlayıcısına kişisel ücret tutarı gönderilmedi.",
  };
}

function shouldIncludeExperience(question: string, role: any) {
  const normalizedRole = String(role || "").toUpperCase();
  if (!EXPERIENCE_MANAGEMENT_ROLES.has(normalizedRole)) return false;
  const q = question.toLocaleLowerCase("tr-TR");
  return EXPERIENCE_TERMS.some((term) => q.includes(term));
}

async function attachExperienceAnalytics(question: string, agentPackage: AgentPackage, role: any) {
  if (!shouldIncludeExperience(question, role)) return agentPackage;
  try {
    const data = await collectFutureHRData();
    const roleName = String(role || data.user?.role || "").toUpperCase();
    const userDept = String(data.user?.department || data.user?.dept || "");
    const isAdminScope = roleName === "CEO" || roleName === "IK" || roleName === "ADMIN" || roleName === "HR_ADMIN";
    const analytics = await getPulseAnalytics({
      role: roleName,
      userDept: userDept || undefined,
      department: isAdminScope ? undefined : userDept || undefined,
    });
    if (!analytics) return agentPackage;

    const latest = analytics.latest;
    const tool: AgentToolResult = {
      tool: "employeeExperienceAnalytics",
      label: "Çalışan Deneyimi",
      domain: "executive",
      summary: latest && !latest.suppressed && latest.average_score !== null
        ? `Son anonim deneyim skoru ${latest.average_score}/10; katılım ${latest.participation ?? "—"}%.`
        : `Çalışan deneyimi görünümü anonimlik eşiği nedeniyle korumalı; güncel yanıt ${analytics.anonymity.currentRespondents}/${analytics.anonymity.threshold}.`,
      confidence: latest && !latest.suppressed ? "orta" : "düşük",
      evidence: [{
        id: "employee-experience-aggregate",
        label: "Anonim Çalışan Deneyimi",
        detail: latest && latest.average_score !== null ? `${latest.average_score}/10 · ${latest.count} anonim yanıt` : `${analytics.anonymity.currentRespondents}/${analytics.anonymity.threshold} anonimlik eşiği`,
        route: "/calisan-deneyimi",
        domain: "executive",
        confidence: latest && !latest.suppressed ? "orta" : "düşük",
      }],
      facts: {
        scope: analytics.scope,
        anonymity: analytics.anonymity,
        latest: analytics.latest,
        latestDelta: analytics.latestDelta,
        lowestDriver: analytics.lowestDriver,
        strongestDriver: analytics.strongestDriver,
        trend: analytics.trend.slice(-12),
        privacyNote: analytics.privacyNote,
      },
      evidenceGaps: latest ? [] : ["Anonimlik eşiğini geçen güncel çalışan deneyimi dönemi bulunmuyor."],
      preparedActions: [],
    };

    return {
      ...agentPackage,
      toolsUsed: Array.from(new Set([...agentPackage.toolsUsed, "employeeExperienceAnalytics"])),
      toolResults: [...agentPackage.toolResults, tool],
      evidenceSources: [...agentPackage.evidenceSources, ...tool.evidence]
        .filter((item, index, rows) => rows.findIndex((row) => `${row.route}|${row.label}` === `${item.route}|${item.label}`) === index)
        .slice(0, 16),
      externalContext: {
        ...agentPackage.externalContext,
        employeeExperience: {
          privacySafeAggregateOnly: true,
          scope: analytics.scope,
          anonymity: analytics.anonymity,
          latest: analytics.latest,
          latestDelta: analytics.latestDelta,
          lowestDriver: analytics.lowestDriver,
          strongestDriver: analytics.strongestDriver,
          trend: analytics.trend.slice(-12),
        },
      },
    };
  } catch {
    return agentPackage;
  }
}

/**
 * Adı geriye dönük uyumluluk için korunuyor. V2'de bu fonksiyon yalnız ücret değil,
 * bütün FutureHR veri registry'sini hazırlar. Doğrudan doğrulanabilir soruları yerel
 * deterministik motor yanıtlar; analitik sorular yetkili ve minimize edilmiş registry
 * bağlamıyla AI sentezine gider.
 */
export async function buildLocalSensitiveAnswer(
  question: string,
  agentPackage: AgentPackage,
  currentUserRole: any,
): Promise<AgentAIResponse | null> {
  const salary = await directSalaryAnswer(question, agentPackage, currentUserRole);
  if (salary) return salary;

  const augmentation = await buildUniversalAgentAugmentation(question, agentPackage, currentUserRole);
  let mergedPackage = mergeUniversalPackage(agentPackage, augmentation);
  mergedPackage = await attachExperienceAnalytics(question, mergedPackage, currentUserRole);

  Object.assign(agentPackage, mergedPackage);

  if (augmentation.directAnswer) {
    return restoreUniversalAliases(augmentation.directAnswer, augmentation);
  }

  const fallback = localAgentFallback(mergedPackage) as AgentAIResponse;
  try {
    const response = await fetch("/api/ai/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: mergedPackage.sanitizedQuestion,
        context: mergedPackage.externalContext,
        fallback,
      }),
    });
    const payload = await response.json();
    if (!response.ok) return null;
    const analysis = (payload?.analysis || fallback) as AgentAIResponse;

    const languageSafe = containsCjk(analysis) ? fallback : analysis;
    return restoreUniversalAliases(languageSafe, augmentation);
  } catch {
    return restoreUniversalAliases(fallback, augmentation);
  }
}