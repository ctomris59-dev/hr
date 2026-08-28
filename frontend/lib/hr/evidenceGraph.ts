export type EvidenceSource =
  | "kpi"
  | "manager"
  | "assessment"
  | "interview"
  | "work-sample"
  | "history"
  | "profile"
  | "role-model"
  | "development"
  | "derived"
  | "other";

export interface EvidenceNode {
  id: string;
  path: string;
  label: string;
  source: EvidenceSource;
  direct: boolean;
  value: string | number | boolean;
  weight: number;
}

export interface EvidenceGraphResult {
  score: number;
  band: "Düşük" | "Orta" | "Yüksek";
  nodes: EvidenceNode[];
  sourceCoverage: number;
  directEvidenceShare: number;
  traceability: number;
  humanEvidence: number;
  missingSignals: string[];
  note: string;
}

const SKIP_KEYS = new Set([
  "instruction",
  "module",
  "analysisPurpose",
  "guardrail",
  "summary",
  "notes",
]);

const SOURCE_LABELS: Record<EvidenceSource, string> = {
  kpi: "KPI / hedef sonucu",
  manager: "Yönetici kanıtı",
  assessment: "Yetkinlik / değerlendirme",
  interview: "Yapılandırılmış görüşme",
  "work-sample": "İş örneği",
  history: "Geçmiş trend",
  profile: "Çalışan profili / tercih",
  "role-model": "Rol hedef modeli",
  development: "Gelişim aksiyonu",
  derived: "Türetilmiş gösterge",
  other: "Diğer kanıt",
};

export const evidenceSourceLabel = (source: EvidenceSource) => SOURCE_LABELS[source];

function meaningful(value: unknown): value is string | number | boolean {
  if (typeof value === "boolean") return value === true;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

function classify(path: string): { source: EvidenceSource; direct: boolean; weight: number } {
  const p = path.toLowerCase();
  if (/worksample|work_sample|iş.?örne/.test(p)) return { source: "work-sample", direct: true, weight: 1.15 };
  if (/interview|mülakat|görüşme/.test(p)) return { source: "interview", direct: true, weight: 1.1 };
  if (/kpi|goal|hedef/.test(p)) return { source: "kpi", direct: true, weight: 1.15 };
  if (/manager|yönetici|recruiternote|noteavailable/.test(p)) return { source: "manager", direct: true, weight: 1.05 };
  if (/assessment|competency|yetkinlik|testscore|responsequality/.test(p)) return { source: "assessment", direct: true, weight: 1 };
  if (/history|trend|evaluationdate|date/.test(p)) return { source: "history", direct: true, weight: 0.95 };
  if (/aspiration|mobility|career_aspiration|careeraspiration|profile/.test(p)) return { source: "profile", direct: true, weight: 0.8 };
  if (/roletarget|rolefit|role_target|targetprofile|referencecount|source$/.test(p)) return { source: "role-model", direct: false, weight: 0.7 };
  if (/plan|development|action|successmetric/.test(p)) return { source: "development", direct: true, weight: 0.8 };
  if (/readiness|potential|score|index|band|difference|fit|risk|summary/.test(p)) return { source: "derived", direct: false, weight: 0.45 };
  return { source: "other", direct: false, weight: 0.35 };
}

function humanizeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}

function flatten(value: unknown, path = "", nodes: EvidenceNode[] = [], depth = 0): EvidenceNode[] {
  if (depth > 5 || nodes.length >= 80 || value === null || value === undefined) return nodes;
  if (Array.isArray(value)) {
    value.slice(0, 12).forEach((item, index) => flatten(item, `${path}[${index}]`, nodes, depth + 1));
    return nodes;
  }
  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      if (SKIP_KEYS.has(key)) return;
      flatten(child, path ? `${path}.${key}` : key, nodes, depth + 1);
    });
    return nodes;
  }
  if (!meaningful(value)) return nodes;

  const leaf = path.split(".").pop()?.replace(/\[\d+\]$/, "") || path;
  if (SKIP_KEYS.has(leaf)) return nodes;
  const classification = classify(path);
  nodes.push({
    id: `${path}-${nodes.length}`,
    path,
    label: humanizeKey(leaf),
    source: classification.source,
    direct: classification.direct,
    value,
    weight: classification.weight,
  });
  return nodes;
}

const REQUIRED_BY_KIND: Record<string, Array<{ sources: EvidenceSource[]; label: string }>> = {
  performance: [
    { sources: ["kpi"], label: "KPI / hedef sonucu" },
    { sources: ["manager"], label: "Yönetici davranış kanıtı" },
    { sources: ["assessment"], label: "Yetkinlik kanıtı" },
    { sources: ["history"], label: "Geçmiş dönem trendi" },
  ],
  talent: [
    { sources: ["assessment"], label: "Yetkinlik / potansiyel girdileri" },
    { sources: ["history", "kpi"], label: "Performans trendi" },
    { sources: ["profile"], label: "Kariyer isteği / mobilite" },
    { sources: ["role-model"], label: "Rol hedef modeli" },
  ],
  career: [
    { sources: ["role-model"], label: "Hedef rol profili" },
    { sources: ["assessment"], label: "Yetkinlik kanıtı" },
    { sources: ["history", "kpi"], label: "Performans kanıtı" },
    { sources: ["profile"], label: "Kariyer isteği" },
  ],
  succession: [
    { sources: ["role-model"], label: "Hedef rol uyumu" },
    { sources: ["history", "kpi"], label: "Performans trendi" },
    { sources: ["assessment"], label: "Yetkinlik / potansiyel kanıtı" },
    { sources: ["profile"], label: "Kariyer isteği / mobilite" },
  ],
  development: [
    { sources: ["assessment"], label: "Yetkinlik açığı" },
    { sources: ["role-model"], label: "Rol hedefi" },
    { sources: ["development"], label: "Ölçülebilir gelişim aksiyonu" },
  ],
  recruitment: [
    { sources: ["assessment"], label: "Test / yetkinlik kanıtı" },
    { sources: ["interview", "manager"], label: "Yapılandırılmış mülakat kanıtı" },
    { sources: ["work-sample"], label: "İş örneği / teknik kanıt" },
    { sources: ["role-model"], label: "Rol hedef profili" },
  ],
};

export function buildEvidenceGraph(kind: string, context: Record<string, unknown>): EvidenceGraphResult {
  const nodes = flatten(context).filter((node) => node.source !== "other" || node.weight >= 0.5);
  const sources = new Set<EvidenceSource>(
    nodes.map((node) => node.source).filter((source) => source !== "derived" && source !== "other")
  );
  const directNodes = nodes.filter((node) => node.direct);
  const totalWeight = nodes.reduce((sum, node) => sum + node.weight, 0) || 1;
  const directWeight = directNodes.reduce((sum, node) => sum + node.weight, 0);

  const sourceCoverage = Math.round(Math.min(100, (sources.size / 5) * 100));
  const directEvidenceShare = Math.round(Math.min(100, (directWeight / totalWeight) * 100));

  const traceNodes = nodes.filter((node) => /date|version|source|reference|quality|confidence/i.test(node.path));
  const traceability = Math.round(Math.min(100, 25 + traceNodes.length * 15));
  const humanNodes = nodes.filter((node) => ["manager", "interview", "work-sample"].includes(node.source));
  const humanEvidence = Math.round(Math.min(100, humanNodes.length * 28));
  const volume = Math.min(100, nodes.reduce((sum, node) => sum + node.weight, 0) * 6);

  const required = REQUIRED_BY_KIND[kind] || [];
  const missingSignals = required
    .filter((requirement) => !requirement.sources.some((source) => sources.has(source)))
    .map((requirement) => requirement.label);
  const completeness = required.length ? ((required.length - missingSignals.length) / required.length) * 100 : sourceCoverage;

  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        sourceCoverage * 0.24 +
          directEvidenceShare * 0.2 +
          traceability * 0.14 +
          humanEvidence * 0.14 +
          volume * 0.08 +
          completeness * 0.2
      )
    )
  );
  const band: EvidenceGraphResult["band"] = score >= 75 ? "Yüksek" : score >= 50 ? "Orta" : "Düşük";

  return {
    score,
    band,
    nodes,
    sourceCoverage,
    directEvidenceShare,
    traceability,
    humanEvidence,
    missingSignals,
    note: "Evidence Score, FutureHR içindeki kanıt kapsamı ve izlenebilirlik göstergesidir; bilimsel doğruluk olasılığı veya otomatik İK kararı değildir.",
  };
}
