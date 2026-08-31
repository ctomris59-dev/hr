"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  fetchDigitalTwin,
  fetchSkillsGraph,
  type DigitalTwin,
  type SkillsGraph,
} from "@/lib/hr/decisionIntelligenceClient";
import { resolveTargetProfile } from "@/lib/hr/careerArchitecture";
import { SAAS_DATA_MODE } from "@/lib/hr/saasWorkforceClient";
import { getStorageData, STORAGE_KEYS } from "../../utils/storage";

const LABELS: Record<string, string> = {
  ANA: "Analitik Düşünme",
  COM: "İletişim Becerileri",
  LRN: "Sürekli Öğrenme",
  RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen",
  DIG: "Dijital Okuryazarlık",
  ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin",
  STR: "Dayanıklılık & Stres Yönetimi",
  TEA: "Takım Çalışması",
};

const SKILL_ALIASES: Record<string, string> = {
  "analitik düşünme": "ANA",
  "iletişim": "COM",
  "iletişim becerileri": "COM",
  "sürekli öğrenme": "LRN",
  "sonuç odaklılık": "RES",
  "detaylara özen": "DET",
  "dijital okuryazarlık": "DIG",
  "etik & uyum": "ETH",
  "etik ve uyum": "ETH",
  "öz disiplin": "DIS",
  "öz-disiplin": "DIS",
  "dayanıklılık / stratejik bakış": "STR",
  "dayanıklılık & stres yönetimi": "STR",
  "stratejik bakış": "STR",
  "takım çalışması": "TEA",
};

type DemoRow = Record<string, unknown>;
type ArchitectureRecord = {
  title: string;
  canonicalTitle?: string;
  source?: string;
  referenceCount?: number;
  competencies?: Array<{ label: string; target: number }>;
};

type CompetencyRow = {
  key: string;
  label: string;
  employeeScore: number | null;
  targetScore: number;
  gap: number | null;
  source: string;
  sampleSize: number;
};

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

function canonicalSkill(raw: string) {
  const value = String(raw || "").replace(/^skill:/, "").trim();
  if (LABELS[value]) return value;
  return SKILL_ALIASES[normalizeText(value)] || value;
}

function displaySkill(raw: string) {
  const key = canonicalSkill(raw);
  return LABELS[key] || raw.replace(/^skill:/, "");
}

function roleKey(value: string) {
  return normalizeText(value || "");
}

function shortAxis(label: string) {
  return label.length <= 18 ? label : `${label.slice(0, 16)}…`;
}

function localGraph(): SkillsGraph {
  const org = getStorageData<DemoRow[]>(STORAGE_KEYS.ORG_CHART, []);
  const history = getStorageData<DemoRow[]>(STORAGE_KEYS.HISTORY_360, []);
  const latest = new Map<string, DemoRow>();

  [...history]
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .forEach((row) => latest.set(String(row.Personel || row["Ad Soyad"] || ""), row));

  const nodes: SkillsGraph["nodes"] = [];
  const edges: SkillsGraph["edges"] = [];
  const values: Record<string, Record<string, number[]>> = {};
  const skillSet = new Set<string>();
  const roleSet = new Set<string>();

  org.forEach((person, index) => {
    const id = String(person.id || `demo-${index}`);
    const name = String(person["Ad Soyad"] || "Çalışan");
    const role = String(person.Pozisyon || "Tanımsız rol");
    const record = latest.get(name) || {};

    nodes.push({ id, name, department: String(person.Departman || ""), position: role });
    roleSet.add(role);
    edges.push({ source: id, target: `role:${role}`, type: "holds_role" });

    Object.entries(record).forEach(([key, raw]) => {
      if (!/(?:_Mgr$|^(ANA|COM|LRN|RES|DET|DIG|ETH|DIS|STR|TEA)$)/.test(key)) return;
      const score = Number(raw);
      if (!(score > 0 && score <= 5)) return;
      const code = key.replace(/_Mgr$/, "");
      const skill = `skill:${code}`;
      skillSet.add(code);
      edges.push({ source: id, target: skill, type: "demonstrates", score });
      values[role] ??= {};
      values[role][code] ??= [];
      values[role][code].push(score);
    });
  });

  roleSet.forEach((role) => nodes.push({ id: `role:${role}`, label: role, type: "role" }));
  skillSet.forEach((skill) => nodes.push({ id: `skill:${skill}`, label: skill, type: "skill" }));

  const role_requirements: SkillsGraph["role_requirements"] = [];
  Object.entries(values).forEach(([role, skills]) =>
    Object.entries(skills).forEach(([skill, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const target = Math.min(5, Math.max(3.5, avg + 0.25));
      role_requirements.push({
        role,
        skill,
        target: Number(target.toFixed(2)),
        sample_size: scores.length,
        source: "tenant_evidence_baseline",
      });
      edges.push({
        source: `role:${role}`,
        target: `skill:${skill}`,
        type: "requires",
        target_score: Number(target.toFixed(2)),
      });
    }),
  );

  return {
    nodes,
    edges,
    role_requirements,
    method: "Demo modunda rol hedefleri mevcut performans kanıtlarından türetilen şirket içi baseline'dır.",
  };
}

async function ensureRoleRequirements(data: SkillsGraph): Promise<SkillsGraph> {
  const requirements = new Map<string, SkillsGraph["role_requirements"][number]>();
  const nodes = [...(data.nodes || [])];
  const edges = [...(data.edges || [])];
  const nodeIds = new Set(nodes.map((node) => node.id));

  (data.role_requirements || []).forEach((row) => {
    requirements.set(`${roleKey(row.role)}::${canonicalSkill(row.skill)}`, row);
  });

  const response = await fetch("/api/job-architecture?limit=100", { cache: "no-store" }).catch(() => null);
  if (response?.ok) {
    const payload = await response.json().catch(() => null);
    const records: ArchitectureRecord[] = Array.isArray(payload?.data) ? payload.data : [];

    records.forEach((record) => {
      const role = String(record.canonicalTitle || record.title || "").trim();
      if (!role) return;

      const roleId = `role:${role}`;
      if (!nodeIds.has(roleId)) {
        nodes.push({ id: roleId, label: role, type: "role" });
        nodeIds.add(roleId);
      }

      (record.competencies || []).forEach((competency) => {
        const skill = String(competency.label || "").trim();
        const target = Number(competency.target);
        if (!skill || !(target > 0 && target <= 5)) return;

        const key = `${roleKey(role)}::${canonicalSkill(skill)}`;
        const current = requirements.get(key);
        if (!current) {
          requirements.set(key, {
            role,
            skill,
            target: Number(target.toFixed(2)),
            sample_size: Math.max(0, Number(record.referenceCount || 0)),
            source: `job_architecture_${record.source || "reference"}`,
          });
        }

        const skillId = `skill:${canonicalSkill(skill)}`;
        if (!nodeIds.has(skillId)) {
          nodes.push({ id: skillId, label: displaySkill(skill), type: "skill" });
          nodeIds.add(skillId);
        }
        if (!edges.some((edge) => edge.source === roleId && canonicalSkill(edge.target) === canonicalSkill(skill) && edge.type === "requires")) {
          edges.push({ source: roleId, target: skillId, type: "requires", target_score: Number(target.toFixed(2)) });
        }
      });
    });
  }

  const merged = Array.from(requirements.values());
  const hasTenantEvidence = merged.some((row) => row.source === "tenant_evidence_baseline");
  return {
    nodes,
    edges,
    role_requirements: merged,
    method: hasTenantEvidence
      ? "Doğrulanmış tenant kanıtı bulunan rol/yetkinliklerde şirket içi baseline önceliklidir; veri bulunmayan roller FutureHR Rol & Yetkinlik Mimarisi referansıyla tamamlanır."
      : "Henüz yeterli tenant kanıtı bulunmadığı için FutureHR Rol & Yetkinlik Mimarisi referans profili kullanılır. Referans kaynak her zaman görünür tutulur.",
  };
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function developmentAction(label: string) {
  const key = canonicalSkill(label);
  if (key === "ANA") return "Vaka analizi + iş başı problem çözme projesi";
  if (key === "COM") return "Paydaş sunumu + yapılandırılmış geri bildirim döngüsü";
  if (key === "DIG") return "Dijital araç uygulaması + gerçek iş senaryosu";
  if (key === "LRN") return "Öğrenme sprinti + 60 günlük uygulama çıktısı";
  if (key === "TEA") return "Çapraz ekip görevi + yönetici gözlemi";
  return "Hedefli uygulama + yönetici gözlemi + 60–90 gün yeniden ölçüm";
}

export default function YetkinlikHaritasiPage() {
  const [graph, setGraph] = useState<SkillsGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [twin, setTwin] = useState<DigitalTwin | null>(null);
  const [twinLoading, setTwinLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const source = SAAS_DATA_MODE ? await fetchSkillsGraph() : localGraph();
        const data = await ensureRoleRequirements(source);
        if (active) setGraph(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Yetkinlik haritası yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const employees = useMemo(
    () =>
      (graph?.nodes || [])
        .filter((node) => !node.type && !String(node.id).startsWith("role:") && !String(node.id).startsWith("skill:"))
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "tr")),
    [graph],
  );

  useEffect(() => {
    if (!employees.length) return;
    if (!employees.some((employee) => String(employee.id) === selectedEmployeeId)) {
      setSelectedEmployeeId(String(employees[0].id));
    }
  }, [employees, selectedEmployeeId]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id) === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  useEffect(() => {
    if (!SAAS_DATA_MODE || !selectedEmployeeId) {
      setTwin(null);
      return;
    }
    let active = true;
    setTwinLoading(true);
    setTwin(null);
    fetchDigitalTwin(selectedEmployeeId)
      .then((data) => {
        if (active) setTwin(data);
      })
      .catch(() => {
        if (active) setTwin(null);
      })
      .finally(() => {
        if (active) setTwinLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedEmployeeId]);

  const selectedRequirements = useMemo(() => {
    const rawPosition = String(selectedEmployee?.position || twin?.employee.position || "").trim();
    const position = roleKey(rawPosition);
    if (!position) return [];

    const rows = (graph?.role_requirements || []).filter((row) => roleKey(row.role) === position);
    const unique = new Map<string, SkillsGraph["role_requirements"][number]>();
    rows.forEach((row) => {
      const key = canonicalSkill(row.skill);
      const current = unique.get(key);
      if (!current || (row.source === "tenant_evidence_baseline" && current.source !== "tenant_evidence_baseline")) {
        unique.set(key, row);
      }
    });

    const fallback = resolveTargetProfile(rawPosition);
    Object.entries(fallback.profile || {}).forEach(([skill, targetRaw]) => {
      const target = Number(targetRaw);
      const key = canonicalSkill(skill);
      if (!key || !(target > 0 && target <= 5) || unique.has(key)) return;
      unique.set(key, {
        role: rawPosition,
        skill,
        target: Number(target.toFixed(2)),
        sample_size: Math.max(0, Number(fallback.referenceCount || 0)),
        source: `job_architecture_${fallback.source}`,
      });
    });

    return Array.from(unique.values());
  }, [graph, selectedEmployee, twin]);

  const employeeScores = useMemo(() => {
    const scores = new Map<string, number>();
    (graph?.edges || [])
      .filter((edge) => edge.type === "demonstrates" && String(edge.source) === selectedEmployeeId)
      .forEach((edge) => {
        const score = Number(edge.score);
        if (score > 0 && score <= 5) scores.set(canonicalSkill(edge.target), score);
      });
    Object.entries(twin?.skills || {}).forEach(([skill, raw]) => {
      const score = Number(raw);
      if (score > 0 && score <= 5) scores.set(canonicalSkill(skill), score);
    });
    return scores;
  }, [graph, selectedEmployeeId, twin]);

  const competencyRows = useMemo<CompetencyRow[]>(() => {
    return selectedRequirements
      .map((row) => {
        const key = canonicalSkill(row.skill);
        const employeeScore = employeeScores.get(key) ?? null;
        const gap = employeeScore === null ? null : Number((employeeScore - row.target).toFixed(2));
        return {
          key,
          label: displaySkill(row.skill),
          employeeScore,
          targetScore: row.target,
          gap,
          source: row.source,
          sampleSize: row.sample_size,
        };
      })
      .sort((a, b) => {
        if (a.gap === null && b.gap !== null) return 1;
        if (a.gap !== null && b.gap === null) return -1;
        return Number(a.gap ?? 99) - Number(b.gap ?? 99) || b.targetScore - a.targetScore;
      });
  }, [selectedRequirements, employeeScores]);

  const measuredRows = competencyRows.filter((row) => row.employeeScore !== null);
  const missingRows = competencyRows.filter((row) => row.employeeScore === null);
  const strengths = measuredRows.filter((row) => Number(row.gap) >= 0).sort((a, b) => Number(b.gap) - Number(a.gap)).slice(0, 3);
  const gaps = measuredRows.filter((row) => Number(row.gap) < 0).sort((a, b) => Number(a.gap) - Number(b.gap)).slice(0, 3);
  const criticalGapCount = measuredRows.filter((row) => Number(row.gap) <= -0.5).length;
  const coverage = competencyRows.length ? Math.round((measuredRows.length / competencyRows.length) * 100) : 0;
  const employeeAverage = average(measuredRows.map((row) => Number(row.employeeScore)));
  const referenceAverage = average(competencyRows.map((row) => row.targetScore));
  const roleFit = measuredRows.length >= 3
    ? Math.round(
        (measuredRows.reduce((sum, row) => sum + Math.min(Number(row.employeeScore) / row.targetScore, 1), 0) / measuredRows.length) * 100,
      )
    : null;

  const radarRows = [...measuredRows]
    .sort((a, b) => Math.abs(Number(b.gap)) - Math.abs(Number(a.gap)) || b.targetScore - a.targetScore)
    .slice(0, 10)
    .map((row) => ({ axis: shortAxis(row.label), label: row.label, employee: row.employeeScore, reference: row.targetScore }));

  const profileSource = selectedRequirements.some((row) => row.source === "tenant_evidence_baseline")
    ? "Tenant kanıt baseline'ı"
    : selectedRequirements.length
      ? "FutureHR rol mimarisi"
      : "Referans bulunamadı";
  const evidenceScore = twin?.evidence.score ?? coverage;
  const evidenceBand = twin?.evidence.band ?? (coverage >= 80 ? "yüksek" : coverage >= 50 ? "orta" : "düşük");
  const selectedName = twin?.employee.full_name || selectedEmployee?.name || "Çalışan";
  const selectedPosition = twin?.employee.position || selectedEmployee?.position || "Rol tanımsız";
  const selectedDepartment = twin?.employee.department || selectedEmployee?.department || "Departman tanımsız";

  if (loading) return <div className="enterprise-card p-8 text-sm text-slate-500">Rol uyum profili hazırlanıyor…</div>;

  if (!employees.length) {
    return (
      <div className="enterprise-card p-8 text-center">
        <UserRound className="mx-auto h-8 w-8 text-slate-300" />
        <h2 className="mt-3 text-sm font-semibold">Rol uyumu için çalışan bulunamadı</h2>
        <p className="mt-1 text-xs text-slate-500">Çalışan ve rol verisi oluştuğunda bu ekran kişi bazlı yetkinlik karşılaştırmasını gösterecek.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="role-fit-v2">
      <header className="futurehr-page-header">
        <p className="futurehr-page-eyebrow">Skills Intelligence</p>
        <h1 className="futurehr-page-title">Rol Uyum Grafiği</h1>
        <p className="futurehr-page-lede">Seçilen çalışanın ölçülmüş yetkinliklerini kendi rol referans profiliyle karşılaştırır. Başka rollerin verileri bu görünüme karıştırılmaz; eksik kanıt düşük skor gibi yorumlanmaz.</p>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}

      <section className="enterprise-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2f1] text-[#2f6664]"><UserRound className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="enterprise-eyebrow">Rol uyum profili</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-white">{selectedName}</h2>
              <p className="mt-1 text-xs text-slate-500">{selectedPosition} · {selectedDepartment}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {SAAS_DATA_MODE && <span className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Tenant veri katmanı</span>}
            <label className="text-[11px] font-semibold text-slate-500">Çalışan
              <select aria-label="Rol uyumu çalışan seçimi" value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className="mt-1 h-10 min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                {employees.map((employee) => <option key={String(employee.id)} value={String(employee.id)}>{employee.name} · {employee.position || "Rol tanımsız"}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ProfileMetric label="Rol uyumu" value={roleFit === null ? "—" : `%${roleFit}`} note={roleFit === null ? "En az 3 ölçüm gerekli" : "Ölçülmüş yetkinliklerde"} />
          <ProfileMetric label="Mevcut yetkinlik ort." value={employeeAverage === null ? "—" : `${employeeAverage.toFixed(2)} / 5`} note={`${measuredRows.length} ölçülmüş yetkinlik`} />
          <ProfileMetric label="Referans ort." value={referenceAverage === null ? "—" : `${referenceAverage.toFixed(2)} / 5`} note={profileSource} />
          <ProfileMetric label="Kritik açık" value={String(criticalGapCount)} note="Gap ≤ -0.50" attention={criticalGapCount > 0} />
        </div>
      </section>

      {!selectedRequirements.length ? (
        <section className="enterprise-card p-8 text-center">
          <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold">Bu çalışan için rol referansı bulunamadı</h2>
          <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-slate-500">{selectedPosition} rolü için yetkinlik hedef profili tanımlandığında kişi–rol karşılaştırması otomatik oluşacak.</p>
          <Link href="/rol-mimarisi" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#2f6664] px-4 py-2.5 text-xs font-semibold text-white">Rol profilini tanımla <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </section>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <div className="enterprise-card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="enterprise-eyebrow">Kişi vs rol referansı</p><h2 className="mt-1 text-base font-semibold">Yetkinlik Profili</h2><p className="mt-1 text-xs leading-5 text-slate-500">Radar yalnız ölçülmüş yetkinlikleri gösterir; kanıtı olmayan alanlar sıfır puan olarak çizilmez.</p></div>
                <div className="flex flex-wrap gap-2 text-[10.5px] font-semibold"><span className="rounded-full bg-[#eaf2f1] px-2.5 py-1 text-[#255452]">Çalışan profili</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Rol referansı</span></div>
              </div>

              {radarRows.length >= 3 ? (
                <div className="mt-4 hidden h-[420px] md:block" data-testid="role-fit-radar">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarRows} outerRadius="72%">
                      <PolarGrid stroke="#d7dfdd" />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: "#475569", fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} tick={{ fill: "#94a3b8", fontSize: 9 }} />
                      <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)} / 5`, name === "employee" ? "Çalışan" : "Rol referansı"]} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.label || "Yetkinlik")} />
                      <Radar name="reference" dataKey="reference" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.22} strokeWidth={2} />
                      <Radar name="employee" dataKey="employee" stroke="#2f6664" fill="#2f6664" fillOpacity={0.28} strokeWidth={2.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center dark:border-slate-700"><ChartNoAxesCombined className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-semibold">Radar için yeterli ölçüm yok</p><p className="mt-1 text-xs text-slate-500">Radar grafiği için en az 3 rol yetkinliğinde doğrulanmış çalışan skoru gerekir.</p></div>
              )}
              <div className="mt-4 md:hidden"><p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">Mobil görünümde okunabilirliği korumak için radar yerine aşağıdaki karşılaştırmalı gap grafiği kullanılır.</p></div>
            </div>

            <aside className="space-y-3">
              <InsightCard icon={TrendingUp} eyebrow="En güçlü alan" title={strengths[0]?.label || "Henüz doğrulanmadı"} value={strengths[0]?.gap === null || strengths[0]?.gap === undefined ? "—" : `+${Number(strengths[0].gap).toFixed(2)}`} note={strengths[0] ? "Rol referansının üzerinde" : "Pozitif fark için ölçüm gerekli"} />
              <InsightCard icon={Target} eyebrow="En kritik açık" title={gaps[0]?.label || "Kritik açık yok"} value={gaps[0]?.gap === null || gaps[0]?.gap === undefined ? "—" : Number(gaps[0].gap).toFixed(2)} note={gaps[0] ? "Öncelikli gelişim alanı" : "Ölçülen alanlarda negatif fark yok"} attention={Boolean(gaps[0])} />
              <InsightCard icon={BadgeCheck} eyebrow="Profil güveni" title={`${String(evidenceBand).toLocaleUpperCase("tr-TR")} · %${evidenceScore}`} value={`${measuredRows.length}/${competencyRows.length}`} note="Rol yetkinliğinde güncel kanıt" />
              {twinLoading && <p className="px-1 text-[10.5px] text-slate-400">Kanıt zinciri güncelleniyor…</p>}
            </aside>
          </section>

          <section className="enterprise-card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="enterprise-eyebrow">Karşılaştırmalı grafik</p><h2 className="mt-1 text-base font-semibold">Yetkinlik Farkları</h2><p className="mt-1 text-xs text-slate-500">En kritik açıklar üstte. Kanıt olmayan yetkinlikler skorlanmaz ve ayrı işaretlenir.</p></div>
              <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{profileSource}</span>
            </div>
            <div className="mt-5 space-y-3" data-testid="role-fit-gap-chart">{competencyRows.map((row) => <GapBar key={row.key} row={row} />)}</div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <DecisionPanel title="Güçlü Alanlar" eyebrow="Strength surplus" icon={TrendingUp} tone="positive">{strengths.length ? strengths.map((row) => <DecisionRow key={row.key} row={row} />) : <EmptyDecision text="Rol referansının üzerinde doğrulanmış yetkinlik henüz yok." />}</DecisionPanel>
            <DecisionPanel title="Gelişim Açıkları" eyebrow="Priority gaps" icon={Target} tone="attention">{gaps.length ? gaps.map((row) => <DecisionRow key={row.key} row={row} />) : <EmptyDecision text="Ölçülen yetkinliklerde negatif rol farkı bulunmuyor." />}</DecisionPanel>
            <DecisionPanel title="Eksik Kanıt" eyebrow="Evidence gaps" icon={AlertTriangle} tone="neutral">{missingRows.length ? missingRows.slice(0, 5).map((row) => <div key={row.key} className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700"><p className="text-xs font-semibold">{row.label}</p><p className="mt-1 text-[10.5px] text-slate-500">Referans {row.targetScore.toFixed(1)} · çalışan ölçümü yok</p></div>) : <EmptyDecision text="Rol profilindeki tüm yetkinlikler için ölçüm mevcut." />}</DecisionPanel>
          </section>

          <section className="enterprise-card p-5">
            <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-[#2f6664]" /><div><p className="enterprise-eyebrow">Aksiyon katmanı</p><h2 className="mt-1 text-base font-semibold">Önerilen Gelişim Aksiyonları</h2><p className="mt-1 text-xs leading-5 text-slate-500">Öneriler yalnız ölçülmüş negatif gap’lerden türetilir; nihai gelişim kararı kullanıcıdadır.</p></div></div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {gaps.length ? gaps.map((row) => <div key={row.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/70"><span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#2f6664]">Kural bazlı gelişim önerisi</span><h3 className="mt-2 text-sm font-semibold">{row.label}</h3><p className="mt-1 text-[11px] text-slate-500">Mevcut {Number(row.employeeScore).toFixed(1)} → Referans {row.targetScore.toFixed(1)} · Gap {Number(row.gap).toFixed(2)}</p><p className="mt-3 text-xs leading-5 text-slate-700 dark:text-slate-300">{developmentAction(row.label)}</p><Link href="/gelisim" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2f6664]">Gelişim planını aç <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>) : <div className="lg:col-span-3 rounded-xl border border-slate-200 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700">Ölçülmüş negatif gap bulunmadığı için otomatik gelişim aksiyonu önerilmedi.</div>}
            </div>
          </section>

          <details className="enterprise-card group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div><p className="enterprise-eyebrow">Explainability</p><h2 className="mt-1 text-sm font-semibold">Bu profil nasıl hesaplandı?</h2></div><span className="text-xs font-semibold text-[#2f6664] group-open:hidden">Kanıt zincirini aç</span><span className="hidden text-xs font-semibold text-[#2f6664] group-open:inline">Kapat</span></summary>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><EvidenceItem label="Ölçülen yetkinlik" value={`${measuredRows.length}/${competencyRows.length}`} note={`Kapsam %${coverage}`} /><EvidenceItem label="Referans kaynağı" value={profileSource} note={selectedPosition} /><EvidenceItem label="Kanıt güveni" value={`%${evidenceScore}`} note={String(evidenceBand)} /><EvidenceItem label="Eksik kanıt" value={String(missingRows.length)} note={twin?.evidence.missing?.slice(0, 2).join(" · ") || "Rol yetkinliği kapsamı"} /></div>
            <div className="mt-4 rounded-xl border border-[#cbdad8] bg-[#f1f6f5] p-3 text-[11px] leading-5 text-[#315f5c]"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />{graph?.method || "Veri modeli hazırlanıyor."} Rol uyum yüzdesi yalnız ölçülmüş yetkinliklerde kişi/rol oranının 100’de sınırlandırılmış eşit ağırlıklı ortalamasıdır; eksik ölçüm sıfır puan sayılmaz.</div>
          </details>
        </>
      )}
    </div>
  );
}

function ProfileMetric({ label, value, note, attention = false }: { label: string; value: string; note: string; attention?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60"><p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-slate-500">{label}</p><p className={`mt-2 text-2xl font-semibold tabular-nums ${attention ? "text-amber-700" : "text-slate-900 dark:text-white"}`}>{value}</p><p className="mt-1 text-[10.5px] text-slate-500">{note}</p></div>;
}

function InsightCard({ icon: Icon, eyebrow, title, value, note, attention = false }: { icon: typeof Target; eyebrow: string; title: string; value: string; note: string; attention?: boolean }) {
  return <div className="enterprise-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.07em] text-slate-500">{eyebrow}</p><p className="mt-2 truncate text-sm font-semibold">{title}</p><p className="mt-1 text-[10.5px] text-slate-500">{note}</p></div><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${attention ? "bg-amber-50 text-amber-700" : "bg-[#eaf2f1] text-[#2f6664]"}`}><Icon className="h-4 w-4" /></div></div><p className={`mt-4 text-xl font-semibold tabular-nums ${attention ? "text-amber-700" : "text-slate-900 dark:text-white"}`}>{value}</p></div>;
}

function GapBar({ row }: { row: CompetencyRow }) {
  const actualWidth = row.employeeScore === null ? 0 : Math.max(0, Math.min(100, (row.employeeScore / 5) * 100));
  const targetWidth = Math.max(0, Math.min(100, (row.targetScore / 5) * 100));
  const status = row.gap === null ? "Kanıt yok" : row.gap >= 0 ? `+${row.gap.toFixed(2)} Güçlü` : row.gap <= -0.5 ? `${row.gap.toFixed(2)} Açık` : `${row.gap.toFixed(2)} Yakın`;
  const statusClass = row.gap === null ? "text-slate-500" : row.gap >= 0 ? "text-emerald-700" : row.gap <= -0.5 ? "text-amber-700" : "text-slate-600";
  return <div className="grid gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 md:grid-cols-[220px_minmax(0,1fr)_92px] md:items-center dark:border-slate-700"><div><p className="text-xs font-semibold">{row.label}</p><p className="mt-1 text-[10.5px] text-slate-500">{row.source === "tenant_evidence_baseline" ? `Tenant kanıtı · n=${row.sampleSize}` : "Rol mimarisi referansı"}</p></div><div className="space-y-2"><div className="grid grid-cols-[58px_minmax(0,1fr)_38px] items-center gap-2"><span className="text-[10px] font-medium text-slate-500">Çalışan</span><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#2f6664]" style={{ width: `${actualWidth}%` }} /></div><span className="text-right text-[10.5px] font-semibold tabular-nums">{row.employeeScore === null ? "—" : row.employeeScore.toFixed(1)}</span></div><div className="grid grid-cols-[58px_minmax(0,1fr)_38px] items-center gap-2"><span className="text-[10px] font-medium text-slate-500">Referans</span><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-slate-400" style={{ width: `${targetWidth}%` }} /></div><span className="text-right text-[10.5px] font-semibold tabular-nums">{row.targetScore.toFixed(1)}</span></div></div><span className={`text-right text-[10.5px] font-semibold ${statusClass}`}>{status}</span></div>;
}

function DecisionPanel({ title, eyebrow, icon: Icon, tone, children }: { title: string; eyebrow: string; icon: typeof Target; tone: "positive" | "attention" | "neutral"; children: React.ReactNode }) {
  const iconClass = tone === "positive" ? "bg-emerald-50 text-emerald-700" : tone === "attention" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <section className="enterprise-card p-4"><div className="flex items-center gap-2"><div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconClass}`}><Icon className="h-4 w-4" /></div><div><p className="text-[9.5px] font-semibold uppercase tracking-[.07em] text-slate-500">{eyebrow}</p><h2 className="mt-0.5 text-sm font-semibold">{title}</h2></div></div><div className="mt-4 space-y-2">{children}</div></section>;
}

function DecisionRow({ row }: { row: CompetencyRow }) {
  const positive = Number(row.gap) >= 0;
  return <div className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">{row.label}</p><span className={`text-xs font-semibold tabular-nums ${positive ? "text-emerald-700" : "text-amber-700"}`}>{positive ? "+" : ""}{Number(row.gap).toFixed(2)}</span></div><p className="mt-1 text-[10.5px] text-slate-500">{Number(row.employeeScore).toFixed(1)} / {row.targetScore.toFixed(1)} referans</p></div>;
}

function EmptyDecision({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-[11px] leading-5 text-slate-500 dark:border-slate-700">{text}</p>;
}

function EvidenceItem({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[9.5px] font-semibold uppercase tracking-[.06em] text-slate-500">{label}</p><p className="mt-1.5 text-sm font-semibold">{value}</p><p className="mt-1 text-[10px] text-slate-500">{note}</p></div>;
}
