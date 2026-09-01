"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { buildTalentDecisionSnapshot } from "../lib/hr/talentDecisionChain";

type Tone = "blue" | "teal" | "green" | "amber" | "violet" | "slate";
type BarDatum = { label: string; value: number; note?: string };
type Kpi = {
  label: string;
  value: string;
  note: string;
  tone: Tone;
  values: number[];
  icon: typeof Activity;
};
type VisualModel = {
  eyebrow: string;
  title: string;
  description: string;
  kpis: Kpi[];
  bars: BarDatum[];
  barTitle: string;
  barNote: string;
  insights: Array<{ title: string; detail: string; tone: Tone }>;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const pct = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0;
const fmt = (value: number, digits = 1) => Number.isFinite(value) ? value.toFixed(digits).replace(".", ",") : "—";

function numberFrom(record: unknown, keys: string[]): number {
  if (!record || typeof record !== "object") return 0;
  const row = record as Record<string, unknown>;
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function textFrom(record: unknown, keys: string[]): string {
  if (!record || typeof record !== "object") return "";
  const row = record as Record<string, unknown>;
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
}

function compactName(person: unknown) {
  return textFrom(person, ["Ad Soyad", "name", "employee", "candidateName", "fullName"]) || "Kayıt";
}

function scoreSeries(rows: unknown[]): number[] {
  return rows
    .map((row) => numberFrom(row, ["Performans", "performance", "final_score", "manager_performance_score", "kpi_score", "score", "average_score", "value"]))
    .filter((value) => value > 0)
    .map((value) => value > 10 ? value / 20 : value);
}

function progressSeries(rows: unknown[]): number[] {
  return rows
    .map((row) => numberFrom(row, ["progress", "ilerleme", "completion", "completionRate", "score"]))
    .filter((value) => value >= 0)
    .map((value) => value <= 1 ? value * 100 : value);
}

function topCounts(values: string[], limit = 5): BarDatum[] {
  const map = new Map<string, number>();
  values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function scoreBands(values: number[]): BarDatum[] {
  const bands = [
    { label: "< 3,0", min: 0, max: 3 },
    { label: "3,0–3,5", min: 3, max: 3.5 },
    { label: "3,5–4,0", min: 3.5, max: 4 },
    { label: "4,0–4,5", min: 4, max: 4.5 },
    { label: "4,5+", min: 4.5, max: 99 },
  ];
  return bands.map((band) => ({
    label: band.label,
    value: values.filter((value) => value >= band.min && value < band.max).length,
  }));
}

function isComplete(record: unknown) {
  const status = textFrom(record, ["status", "durum", "state"]).toLocaleLowerCase("tr-TR");
  const progress = numberFrom(record, ["progress", "ilerleme", "completion", "completionRate"]);
  return /tamam|completed|done|closed|finalized|effective/.test(status) || progress >= 100;
}

function modelFor(
  pathname: string,
  orgData: unknown[],
  history360: unknown[],
  snapshots: ReturnType<typeof buildTalentDecisionSnapshot>[],
  storage: {
    candidates: unknown[];
    assessments: unknown[];
    candidateResults: unknown[];
    training: unknown[];
    development: unknown[];
    career: unknown[];
    compensation: unknown[];
    benchmarks: unknown[];
    pulse: unknown[];
  },
): VisualModel | null {
  const performanceScores = snapshots.map((item) => item.performance.score).filter((value) => value > 0);
  const potentialScores = snapshots.map((item) => item.talent.potential.score).filter((value) => value > 0);
  const roleFits = snapshots.map((item) => item.competency.currentRoleFit).filter((value) => value > 0);
  const evidenceScores = snapshots.map((item) => item.evidence.score).filter((value) => value > 0);
  const measured = performanceScores.length;
  const people = orgData.length;
  const lowEvidence = snapshots.filter((item) => item.evidence.score > 0 && item.evidence.score < 60).length;
  const perfSeries = scoreSeries(history360).slice(-12);

  if (pathname === "/degerlendirme" || pathname === "/kalibrasyon") {
    const high = performanceScores.filter((value) => value >= 4.2).length;
    const low = performanceScores.filter((value) => value < 3.5).length;
    return {
      eyebrow: "Performans karar görünümü",
      title: "Skorları değil, karar sinyallerini okuyun",
      description: "Performans seviyesi, veri kapsamı ve kanıt güvenini tek bakışta gösterir. Ayrıntılı kayıtlar aşağıdaki çalışma alanında korunur.",
      kpis: [
        { label: "Ort. performans", value: measured ? `${fmt(avg(performanceScores), 2)} / 5` : "—", note: `${measured} ölçülmüş çalışan`, tone: "blue", values: perfSeries, icon: BarChart3 },
        { label: "Veri kapsamı", value: `%${pct(measured, people)}`, note: `${people} görünür çalışan içinde`, tone: "teal", values: [people, measured], icon: Users },
        { label: "Üst performans", value: String(high), note: "4,20 ve üzeri", tone: "green", values: performanceScores, icon: TrendingUp },
        { label: "Kanıt riski", value: String(lowEvidence), note: "Evidence Score < 60", tone: lowEvidence ? "amber" : "green", values: evidenceScores, icon: ShieldCheck },
      ],
      bars: scoreBands(performanceScores),
      barTitle: "Performans dağılımı",
      barNote: "5 puanlık ölçekte güncel çalışan dağılımı",
      insights: [
        { title: "Yüksek performans", detail: high ? `${high} çalışan güçlü performans bandında.` : "4,20 üzerinde ölçülmüş çalışan yok.", tone: "green" },
        { title: "Yakın takip", detail: low ? `${low} çalışan 3,50 altında; yönetici kanıtı ile incelenmeli.` : "3,50 altında performans sinyali yok.", tone: low ? "amber" : "teal" },
        { title: "Kanıt kapsamı", detail: lowEvidence ? `${lowEvidence} kayıtta karar öncesi ek kanıt öneriliyor.` : "Düşük kanıt güveni sinyali görünmüyor.", tone: lowEvidence ? "amber" : "green" },
      ],
    };
  }

  if (pathname === "/yetenek-matrisi") {
    const highPotential = potentialScores.filter((value) => value >= 4).length;
    const avgRoleFit = avg(roleFits);
    const boxes = topCounts(snapshots.map((item) => item.talent.nineBox || "Veri yok"), 6);
    const top = [...snapshots].filter((item) => item.talent.potential.score > 0).sort((a, b) => b.talent.potential.score - a.talent.potential.score)[0];
    return {
      eyebrow: "Yetenek portföyü",
      title: "9-Box yoğunluğunu ve yetenek kalitesini birlikte görün",
      description: "Matrisin tamamını açmadan önce portföy dağılımı, rol uyumu ve potansiyel sinyallerini özetler.",
      kpis: [
        { label: "Ort. potansiyel", value: potentialScores.length ? `${fmt(avg(potentialScores), 2)} / 5` : "—", note: `${potentialScores.length} ölçülmüş profil`, tone: "violet", values: potentialScores, icon: Sparkles },
        { label: "Yüksek potansiyel", value: String(highPotential), note: "4,00 ve üzeri", tone: "green", values: potentialScores, icon: UserCheck },
        { label: "Ort. rol uyumu", value: roleFits.length ? `%${Math.round(avgRoleFit)}` : "—", note: `${roleFits.length} doğrulanmış profil`, tone: "teal", values: roleFits, icon: Target },
        { label: "Kanıt riski", value: String(lowEvidence), note: "düşük güvenli yetenek kararı", tone: lowEvidence ? "amber" : "green", values: evidenceScores, icon: ShieldCheck },
      ],
      bars: boxes,
      barTitle: "9-Box portföy dağılımı",
      barNote: "En yoğun segmentler · detay için matrisi kullanın",
      insights: [
        { title: "En güçlü potansiyel sinyali", detail: top ? `${compactName(orgData[snapshots.indexOf(top)])}: ${fmt(top.talent.potential.score, 1)} / 5.` : "Potansiyel ölçümü bekleniyor.", tone: "violet" },
        { title: "Rol uyumu", detail: roleFits.length ? `Ölçülmüş profillerde ortalama rol uyumu %${Math.round(avgRoleFit)}.` : "Rol uyumu kanıtı henüz oluşmadı.", tone: "teal" },
        { title: "Karar güveni", detail: lowEvidence ? `${lowEvidence} profil düşük kanıtla sınıflanıyor.` : "Düşük kanıtlı yetenek profili görünmüyor.", tone: lowEvidence ? "amber" : "green" },
      ],
    };
  }

  if (pathname === "/kariyer" || pathname === "/yedekleme") {
    const ready = snapshots.filter((item) => (item.career.targetReadiness?.index || 0) >= 75).length;
    const strongFit = roleFits.filter((value) => value >= 80).length;
    const careerProfiles = storage.career.length;
    const levels = topCounts(snapshots.map((item) => item.career.currentRole.level || item.career.currentRole.levelName || "Rol"), 5);
    return {
      eyebrow: pathname === "/kariyer" ? "Kariyer karar görünümü" : "Halefiyet karar görünümü",
      title: pathname === "/kariyer" ? "Hazırlık, rol uyumu ve kariyer isteğini birlikte okuyun" : "Kritik rol sürekliliğini portföy mantığıyla izleyin",
      description: "Tek bir yüzde yerine rol uyumu, kanıt ve hazır bulunuşluk sinyallerini aynı görsel çerçevede toplar.",
      kpis: [
        { label: "Güçlü rol uyumu", value: String(strongFit), note: "%80 ve üzeri", tone: "teal", values: roleFits, icon: Target },
        { label: "Hazır profil", value: String(ready), note: "readiness ≥ 75", tone: "green", values: snapshots.map((item) => item.career.targetReadiness?.index || 0), icon: UserCheck },
        { label: "Kariyer profili", value: String(careerProfiles), note: "istek / hedef verisi", tone: "violet", values: [people, careerProfiles], icon: BriefcaseBusiness },
        { label: "Kanıt riski", value: String(lowEvidence), note: "karar öncesi ek kanıt", tone: lowEvidence ? "amber" : "green", values: evidenceScores, icon: ShieldCheck },
      ],
      bars: levels,
      barTitle: "Rol seviyesi görünümü",
      barNote: "Görünür çalışanların kariyer mimarisi dağılımı",
      insights: [
        { title: "Rol uyumu", detail: roleFits.length ? `${strongFit}/${roleFits.length} profil %80+ uyum bandında.` : "Rol uyumu ölçümü bekleniyor.", tone: "teal" },
        { title: "Hazır bulunuşluk", detail: ready ? `${ready} profil yüksek readiness sinyali taşıyor.` : "Yüksek readiness seviyesinde hedef profil görünmüyor.", tone: ready ? "green" : "amber" },
        { title: "İnsan kararı", detail: "Hazırlık sınıfı tek başına otomatik terfi veya halef ataması üretmez.", tone: "slate" },
      ],
    };
  }

  if (pathname === "/gelisim" || pathname === "/gelisim-analitigi" || pathname === "/egitim") {
    const completedPlans = storage.development.filter(isComplete).length;
    const completedTraining = storage.training.filter(isComplete).length;
    const progress = progressSeries(storage.development);
    const planTypes = topCounts(storage.development.map((item) => textFrom(item, ["type", "actionType", "method", "category", "competency", "yetkinlik"]) || "Gelişim planı"), 5);
    return {
      eyebrow: "Gelişim portföyü",
      title: "Plan, müdahale ve ilerleme aynı görsel zincirde",
      description: "Uzun aksiyon listelerinden önce portföy büyüklüğünü, tamamlama hızını ve yeniden ölçüm ihtiyacını özetler.",
      kpis: [
        { label: "Aktif plan", value: String(Math.max(0, storage.development.length - completedPlans)), note: `${storage.development.length} toplam plan`, tone: "blue", values: progress, icon: Target },
        { label: "Plan tamamlama", value: `%${pct(completedPlans, storage.development.length)}`, note: `${completedPlans} tamamlanan`, tone: "green", values: progress, icon: CheckCircle2 },
        { label: "Eğitim ataması", value: String(storage.training.length), note: `${completedTraining} tamamlandı`, tone: "teal", values: progressSeries(storage.training), icon: GraduationCap },
        { label: "Ölçüm kapsamı", value: `%${pct(Math.min(history360.length, storage.development.length), storage.development.length)}`, note: "yeniden ölçüm sinyali", tone: "violet", values: scoreSeries(history360), icon: Activity },
      ],
      bars: planTypes,
      barTitle: "Gelişim aksiyonu dağılımı",
      barNote: "En sık kullanılan müdahale / hedef başlıkları",
      insights: [
        { title: "Tamamlama", detail: storage.development.length ? `${completedPlans}/${storage.development.length} plan tamamlandı.` : "Gelişim planı bulunmuyor.", tone: completedPlans ? "green" : "slate" },
        { title: "Öğrenme portföyü", detail: storage.training.length ? `${storage.training.length} eğitim ataması çalışan planlarına bağlı.` : "Eğitim ataması bulunmuyor.", tone: "teal" },
        { title: "Etkiyi doğrula", detail: "Tamamlama, gelişim etkisi değildir; yeniden ölçüm ve işe transfer kanıtı ile birlikte okunur.", tone: "violet" },
      ],
    };
  }

  if (pathname === "/maas" || pathname === "/yonetici/maas-talep") {
    const finalized = storage.compensation.filter((item) => /finalized|effective|tamam/i.test(textFrom(item, ["stage", "status", "state"]))).length;
    const benchmarkCoverage = pct(storage.benchmarks.length, people);
    const benchmarkValues = storage.benchmarks
      .map((item) => numberFrom(item, ["p50", "median", "marketMedian", "mid", "value", "salary"]))
      .filter((value) => value > 0)
      .slice(0, 12);
    const cycleStages = topCounts(storage.compensation.map((item) => textFrom(item, ["stage", "status", "state"]) || "Döngü"), 5);
    return {
      eyebrow: "Ücret karar görünümü",
      title: "Piyasa, döngü ve bütçe sinyallerini birlikte okuyun",
      description: "Ücret kararını yalnız tekil maaş satırından değil, benchmark kapsamı ve onay döngüsünden okunur hale getirir.",
      kpis: [
        { label: "Ücret döngüsü", value: String(storage.compensation.length), note: `${finalized} sonuçlanmış`, tone: "blue", values: storage.compensation.map((_, index) => index + 1), icon: CircleDollarSign },
        { label: "Benchmark kaydı", value: String(storage.benchmarks.length), note: `%${benchmarkCoverage} çalışan karşılığı`, tone: "teal", values: benchmarkValues, icon: BarChart3 },
        { label: "Rol uyumu kapsamı", value: roleFits.length ? `%${pct(roleFits.length, people)}` : "—", note: "ücret kararına bağlanabilir profil", tone: "violet", values: roleFits, icon: Target },
        { label: "Kanıt riski", value: String(lowEvidence), note: "ücret kararı öncesi kontrol", tone: lowEvidence ? "amber" : "green", values: evidenceScores, icon: ShieldCheck },
      ],
      bars: cycleStages.length ? cycleStages : topCounts(storage.benchmarks.map((item) => textFrom(item, ["jobFamily", "family", "position", "role"]) || "Benchmark"), 5),
      barTitle: cycleStages.length ? "Ücret döngüsü aşamaları" : "Benchmark kapsamı",
      barNote: "Karar yoğunluğunu listeye girmeden görün",
      insights: [
        { title: "Piyasa verisi", detail: storage.benchmarks.length ? `${storage.benchmarks.length} benchmark kaydı karar desteğine hazır.` : "Benchmark verisi henüz bulunmuyor.", tone: "teal" },
        { title: "Onay zinciri", detail: storage.compensation.length ? `${finalized}/${storage.compensation.length} döngü sonuçlanmış durumda.` : "Aktif ücret döngüsü bulunmuyor.", tone: finalized ? "green" : "slate" },
        { title: "İnsan onayı", detail: "Piyasa ve performans sinyalleri öneri üretir; nihai ücret değişikliği onay akışından geçer.", tone: "violet" },
      ],
    };
  }

  if (pathname === "/ise-alim" || pathname === "/aday-testi") {
    const candidateStatuses = topCounts(storage.candidates.map((item) => textFrom(item, ["status", "stage", "durum"]) || "Başvuru"), 6);
    const scored = storage.candidateResults.filter((item) => numberFrom(item, ["score", "totalScore", "fitScore", "result"]) > 0).length;
    const assessmentRate = pct(storage.assessments.length, storage.candidates.length);
    return {
      eyebrow: "İşe alım karar görünümü",
      title: "Pipeline, kanıt ve değerlendirme kapsamını tek bakışta görün",
      description: "Aday listesini açmadan önce başvuru hacmi, değerlendirme kapsamı ve karar kanıtını görünür hale getirir.",
      kpis: [
        { label: "Aday", value: String(storage.candidates.length), note: "aktif demo / tenant pipeline", tone: "blue", values: candidateStatuses.map((item) => item.value), icon: Users },
        { label: "Değerlendirme", value: String(storage.assessments.length), note: `%${assessmentRate} aday karşılığı`, tone: "teal", values: [storage.candidates.length, storage.assessments.length], icon: UserCheck },
        { label: "Skorlu sonuç", value: String(scored), note: `${storage.candidateResults.length} sonuç içinde`, tone: "violet", values: scoreSeries(storage.candidateResults), icon: Activity },
        { label: "Kanıtlı karar", value: `%${pct(Math.min(storage.assessments.length + scored, storage.candidates.length), storage.candidates.length)}`, note: "test + yapılandırılmış kanıt", tone: "green", values: [storage.candidates.length, storage.assessments.length, scored], icon: ShieldCheck },
      ],
      bars: candidateStatuses,
      barTitle: "Aday pipeline dağılımı",
      barNote: "Süreç aşamalarındaki aday yoğunluğu",
      insights: [
        { title: "Değerlendirme kapsamı", detail: storage.candidates.length ? `Adayların yaklaşık %${assessmentRate}'i assessment kaydıyla eşleşiyor.` : "Aday verisi bulunmuyor.", tone: "teal" },
        { title: "Skor kullanımı", detail: scored ? `${scored} adayda ölçülmüş sonuç var; nihai karar olarak kullanılmamalı.` : "Skorlu aday sonucu henüz yok.", tone: "violet" },
        { title: "Pipeline odağı", detail: candidateStatuses[0] ? `En yoğun aşama: ${candidateStatuses[0].label} (${candidateStatuses[0].value}).` : "Pipeline dağılımı bekleniyor.", tone: "blue" },
      ],
    };
  }

  if (pathname === "/calisan-deneyimi") {
    const pulseScores = storage.pulse
      .map((item) => numberFrom(item, ["score", "average_score", "value", "rating", "answer"]))
      .filter((value) => value > 0)
      .map((value) => value > 10 ? value / 10 : value);
    const avgPulse = avg(pulseScores);
    const drivers = topCounts(storage.pulse.map((item) => textFrom(item, ["driver", "category", "question", "dimension"]) || "Pulse"), 5);
    return {
      eyebrow: "Çalışan deneyimi görünümü",
      title: "Pulse hacmini ve deneyim sinyalini sade grafiklerle izleyin",
      description: "Anonim eşik korunarak yanıt hacmi, skor seviyesi ve en çok ölçülen deneyim driver'larını özetler.",
      kpis: [
        { label: "Anonim yanıt", value: String(storage.pulse.length), note: "pulse kayıt hacmi", tone: "blue", values: pulseScores, icon: HeartPulse },
        { label: "Ort. pulse", value: pulseScores.length ? `${fmt(avgPulse, 1)} / 10` : "—", note: `${pulseScores.length} skorlu yanıt`, tone: "teal", values: pulseScores, icon: Activity },
        { label: "Katılım sinyali", value: `%${pct(storage.pulse.length, people)}`, note: "görünür çalışan karşılığı", tone: "violet", values: [people, storage.pulse.length], icon: Users },
        { label: "Pozitif sinyal", value: String(pulseScores.filter((value) => value >= 7).length), note: "7/10 ve üzeri yanıt", tone: "green", values: pulseScores, icon: TrendingUp },
      ],
      bars: drivers,
      barTitle: "Deneyim driver görünümü",
      barNote: "En çok ölçülen anonim driver başlıkları",
      insights: [
        { title: "Genel deneyim", detail: pulseScores.length ? `Ortalama pulse skoru ${fmt(avgPulse, 1)}/10.` : "Anonimlik eşiğini geçen skor yok.", tone: "teal" },
        { title: "Katılım", detail: storage.pulse.length ? `${storage.pulse.length} anonim yanıt analiz havuzunda.` : "Pulse yanıtı bulunmuyor.", tone: "blue" },
        { title: "Gizlilik", detail: "Bireysel yanıtlar karar kartına taşınmaz; yalnız anonim toplulaştırma gösterilir.", tone: "green" },
      ],
    };
  }

  return null;
}

export default function ModuleDecisionSummary({ pathname }: { pathname: string }) {
  const { orgData, history360 } = useData();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("dataUpdated", refresh);
    window.addEventListener("storageCleared", refresh);
    window.addEventListener("demoDataUpdated", refresh);
    window.addEventListener("compensationUpdated", refresh);
    window.addEventListener("careerProfileUpdated", refresh);
    return () => {
      window.removeEventListener("dataUpdated", refresh);
      window.removeEventListener("storageCleared", refresh);
      window.removeEventListener("demoDataUpdated", refresh);
      window.removeEventListener("compensationUpdated", refresh);
      window.removeEventListener("careerProfileUpdated", refresh);
    };
  }, []);

  const snapshots = useMemo(
    () => (orgData || []).map((person) => buildTalentDecisionSnapshot(person, history360 || [])),
    [orgData, history360],
  );

  const storage = useMemo(() => ({
    candidates: getStorageData<unknown[]>(STORAGE_KEYS.CANDIDATES, []),
    assessments: getStorageData<unknown[]>(STORAGE_KEYS.ASSESSMENTS, []),
    candidateResults: getStorageData<unknown[]>(STORAGE_KEYS.CANDIDATE_RESULTS, []),
    training: getStorageData<unknown[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []),
    development: getStorageData<unknown[]>(STORAGE_KEYS.DEVELOPMENT_PLANS, []),
    career: getStorageData<unknown[]>(STORAGE_KEYS.CAREER_PROFILES, []),
    compensation: getStorageData<unknown[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []),
    benchmarks: getStorageData<unknown[]>(STORAGE_KEYS.MARKET_BENCHMARKS, []),
    pulse: getStorageData<unknown[]>(STORAGE_KEYS.PULSE_ANSWERS, []),
  }), [revision, orgData.length, history360.length]);

  const hasData = orgData.length > 0 || history360.length > 0 || Object.values(storage).some((rows) => rows.length > 0);
  const model = useMemo(
    () => hasData ? modelFor(pathname, orgData || [], history360 || [], snapshots, storage) : null,
    [hasData, pathname, orgData, history360, snapshots, storage],
  );

  if (!model) return null;

  return (
    <section className="visual-decision-system" data-testid="visual-decision-summary" aria-label={`${model.eyebrow} görsel özeti`}>
      <div className="visual-decision-heading">
        <div>
          <div className="visual-decision-eyebrow"><Sparkles aria-hidden="true" />{model.eyebrow}</div>
          <h2>{model.title}</h2>
          <p>{model.description}</p>
        </div>
        <span className="visual-decision-badge"><Activity aria-hidden="true" /> Canlı karar özeti</span>
      </div>

      <div className="visual-kpi-grid">
        {model.kpis.map((item) => <DecisionKpi key={item.label} item={item} />)}
      </div>

      <div className="visual-decision-lower-grid">
        <DecisionBarPanel title={model.barTitle} note={model.barNote} data={model.bars} />
        <div className="visual-insight-panel">
          <div className="visual-panel-heading">
            <div><span>Karar notları</span><strong>Ne anlama geliyor?</strong></div>
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="visual-insight-list">
            {model.insights.map((item) => (
              <div className="visual-insight-row" key={`${item.title}-${item.detail}`}>
                <span className={`visual-insight-dot tone-${item.tone}`} />
                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DecisionKpi({ item }: { item: Kpi }) {
  const Icon = item.icon;
  return (
    <article className={`visual-kpi-card tone-${item.tone}`}>
      <div className="visual-kpi-top"><span className="visual-kpi-icon"><Icon aria-hidden="true" /></span><span>{item.label}</span></div>
      <div className="visual-kpi-value">{item.value}</div>
      <div className="visual-kpi-bottom"><span>{item.note}</span><MiniSparkline values={item.values} /></div>
    </article>
  );
}

function MiniSparkline({ values }: { values: number[] }) {
  const clean = values.filter((value) => Number.isFinite(value)).slice(-12);
  if (clean.length < 2) return <span className="visual-spark-placeholder" aria-hidden="true" />;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const spread = max - min || 1;
  const points = clean.map((value, index) => `${(index / (clean.length - 1)) * 68},${22 - ((value - min) / spread) * 17}`).join(" ");
  return (
    <svg className="visual-sparkline" viewBox="0 0 68 24" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 22 H68" className="visual-spark-base" />
      <polyline points={points} className="visual-spark-line" />
    </svg>
  );
}

function DecisionBarPanel({ title, note, data }: { title: string; note: string; data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="visual-bar-panel">
      <div className="visual-panel-heading">
        <div><span>Dağılım</span><strong>{title}</strong><p>{note}</p></div>
        <BarChart3 aria-hidden="true" />
      </div>
      <div className="visual-bar-chart" role="img" aria-label={`${title} çubuk grafiği`}>
        {data.length ? data.map((item, index) => (
          <div className="visual-bar-row" key={`${item.label}-${index}`}>
            <div className="visual-bar-label"><span>{item.label}</span><strong>{item.value}</strong></div>
            <div className="visual-bar-track"><span style={{ width: `${clamp((item.value / max) * 100, item.value ? 7 : 0, 100)}%` }} /></div>
          </div>
        )) : <div className="visual-chart-empty">Dağılım için yeterli kayıt henüz oluşmadı.</div>}
      </div>
    </div>
  );
}

export function DecisionRing({ value, label, detail }: { value: number; label: string; detail?: ReactNode }) {
  const safe = clamp(value);
  return (
    <div className="visual-ring-block">
      <div className="visual-ring" style={{ "--ring-value": `${safe * 3.6}deg` } as React.CSSProperties}>
        <div><strong>{Math.round(safe)}</strong><span>%</span></div>
      </div>
      <div><strong>{label}</strong>{detail ? <p>{detail}</p> : null}</div>
    </div>
  );
}
