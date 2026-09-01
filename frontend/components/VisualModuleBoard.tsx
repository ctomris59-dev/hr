"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  CircleGauge,
  GraduationCap,
  Grid3X3,
  MapPinned,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";

type Snapshot = {
  org: any[];
  history: any[];
  candidates: any[];
  assessments: any[];
  trainings: any[];
};

type Kpi = { label: string; value: string; note: string; tone: number };
type Bar = { label: string; value: number; display?: string; tone?: number };

const RECRUITMENT_STAGES = ["Başvuru", "Ön Eleme", "Test", "Mülakat", "Teklif", "İşe Alındı", "Reddedildi"];
const BOX_LABELS = [
  ["Potansiyel Yatırımı", "Yüksek Potansiyel", "Yıldız Oyuncu"],
  ["Gelişim Odağı", "Çekirdek Yetenek", "Güçlü Performans"],
  ["Kritik Gelişim", "İstikrarlı Katkı", "Uzman Katkı"],
] as const;

const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const pct = (value: number) => `%${Math.max(0, Math.min(100, Math.round(value)))}`;
const personName = (row: any) => text(row?.["Ad Soyad"] ?? row?.Personel ?? row?.employee ?? row?.name);
const department = (row: any) => text(row?.Departman ?? row?.department ?? "Belirtilmedi");
const status = (row: any) => text(row?.status ?? row?.Status ?? row?.durum ?? row?.Durum);

function readSnapshot(): Snapshot {
  return {
    org: arr(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, [])),
    history: arr(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, [])),
    candidates: arr(getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, [])),
    assessments: arr(getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS, [])),
    trainings: arr(getStorageData<any[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS, [])),
  };
}

function latestRecord(name: string, history: any[]) {
  return history
    .filter((row) => personName(row) === name || text(row?.employee_name) === name)
    .sort((a, b) => text(b?.date ?? b?.Tarih).localeCompare(text(a?.date ?? a?.Tarih)))[0] || null;
}

function performance(row: any, history: any[]) {
  const latest = latestRecord(personName(row), history) || {};
  return number(latest?.Performans ?? latest?.performance ?? latest?.Performans_Mgr1 ?? row?.Performans ?? row?.performance ?? row?.Performans_Mgr1);
}

function potential(row: any, history: any[]) {
  const latest = latestRecord(personName(row), history) || {};
  return number(latest?.Potansiyel ?? latest?.potential ?? latest?.potential_score ?? row?.Potansiyel ?? row?.potential ?? row?.potential_score ?? row?.position_competency_score);
}

function groupCount<T>(items: T[], getter: (item: T) => string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = getter(item) || "Belirtilmedi";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function scoreBand(value: number) {
  if (value >= 4) return 2;
  if (value >= 3) return 1;
  return 0;
}

function matrixLabel(perf: number, pot: number) {
  const x = scoreBand(perf);
  const y = scoreBand(pot);
  return BOX_LABELS[2 - y][x];
}

function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="vmb-kpi-grid">
      {items.map((item) => (
        <article key={item.label} className={`vmb-kpi vmb-tone-${item.tone}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </article>
      ))}
    </div>
  );
}

function Bars({ items, max: explicitMax }: { items: Bar[]; max?: number }) {
  const max = explicitMax || Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="vmb-bars">
      {items.map((item, index) => (
        <div key={item.label} className="vmb-bar-row">
          <div className="vmb-bar-label"><span>{item.label}</span><strong>{item.display ?? item.value}</strong></div>
          <div className="vmb-bar-track"><i className={`vmb-tone-${item.tone ?? index % 6}`} style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function Donut({ value, label, detail, tone = 0 }: { value: number; label: string; detail: string; tone?: number }) {
  const safe = Math.max(0, Math.min(100, value));
  const style = { "--vmb-pct": `${safe}%` } as CSSProperties;
  return (
    <div className="vmb-donut-wrap">
      <div className={`vmb-donut vmb-donut-tone-${tone}`} style={style}>
        <div><strong>{pct(safe)}</strong><span>{label}</span></div>
      </div>
      <p>{detail}</p>
    </div>
  );
}

function EmptyVisual({ textValue }: { textValue: string }) {
  return <div className="vmb-empty"><Sparkles /><strong>Görsel analiz hazır</strong><p>{textValue}</p></div>;
}

function RecruitmentBoard({ snapshot }: { snapshot: Snapshot }) {
  const candidates = snapshot.candidates.filter((candidate) => text(candidate?.type) !== "Mevcut Çalışan");
  const stageCounts = RECRUITMENT_STAGES.map((label, tone) => ({
    label,
    value: candidates.filter((candidate) => (status(candidate) || "Başvuru") === label).length,
    tone,
  }));
  const active = candidates.filter((candidate) => !["İşe Alındı", "Reddedildi"].includes(status(candidate))).length;
  const interviews = candidates.filter((candidate) => status(candidate) === "Mülakat").length;
  const hired = candidates.filter((candidate) => status(candidate) === "İşe Alındı").length;
  const evidencePoints = candidates.reduce((sum, candidate) => {
    const assessment = snapshot.assessments.find((item) => String(item?.subjectId) === String(candidate?.id) || text(item?.subjectName) === text(candidate?.name));
    return sum + (candidate?.structuredInterviewCompleted ? 1 : 0) + (candidate?.workSampleAvailable ? 1 : 0) + (candidate?.recruiterNote ? 1 : 0) + (assessment || candidate?.raw_scores ? 1 : 0);
  }, 0);
  const evidenceCoverage = candidates.length ? (evidencePoints / (candidates.length * 4)) * 100 : 0;
  const conversion = candidates.length ? (hired / candidates.length) * 100 : 0;
  const topCandidates = candidates.slice(0, 5);

  return (
    <>
      <KpiGrid items={[
        { label: "Aktif aday", value: String(active), note: "Karar akışında", tone: 0 },
        { label: "Mülakat", value: String(interviews), note: "Doğrulama aşamasında", tone: 1 },
        { label: "Kanıt kapsamı", value: pct(evidenceCoverage), note: "Test + mülakat + iş örneği", tone: 2 },
        { label: "İşe alım dönüşümü", value: pct(conversion), note: `${hired} işe alındı`, tone: 4 },
      ]} />
      <div className="vmb-main-grid">
        <article className="vmb-panel vmb-panel-wide">
          <header><div><span>ATS FUNNEL</span><h3>Aday akışı</h3></div><BriefcaseBusiness /></header>
          {candidates.length ? <Bars items={stageCounts} /> : <EmptyVisual textValue="Aday eklendiğinde başvurudan işe alıma renkli funnel burada oluşacak." />}
        </article>
        <article className="vmb-panel">
          <header><div><span>KANIT KALİTESİ</span><h3>Karar güveni</h3></div><CircleGauge /></header>
          <Donut value={evidenceCoverage} label="kanıt" detail="Test, yapılandırılmış mülakat, değerlendirici notu ve iş örneğinin birlikte kapsanma oranı." tone={2} />
        </article>
        <article className="vmb-panel vmb-panel-wide">
          <header><div><span>ADAY KARTLARI</span><h3>Öncelikli adaylar</h3></div><Users /></header>
          <div className="vmb-person-grid">
            {topCandidates.length ? topCandidates.map((candidate, index) => (
              <div className={`vmb-person-card vmb-tone-${index % 6}`} key={candidate.id ?? candidate.name ?? index}>
                <span className="vmb-avatar">{text(candidate?.name).split(/\s+/).slice(0,2).map((x:string)=>x[0]).join("") || "A"}</span>
                <div><strong>{text(candidate?.name) || "Aday"}</strong><small>{text(candidate?.role) || "Rol belirtilmedi"}</small></div>
                <em>{status(candidate) || "Başvuru"}</em>
              </div>
            )) : <EmptyVisual textValue="Aday kartları, durum ve rol bilgisiyle burada gösterilecek." />}
          </div>
        </article>
      </div>
    </>
  );
}

function LearningBoard({ snapshot }: { snapshot: Snapshot }) {
  const items = snapshot.trainings;
  const completed = items.filter((item) => status(item).toLocaleLowerCase("tr-TR").includes("tamam")).length;
  const verified = items.filter((item) => Boolean(item?.managerVerified)).length;
  const pendingEvidence = items.filter((item) => status(item).toLocaleLowerCase("tr-TR").includes("tamam") && !item?.managerVerified).length;
  const overdue = items.filter((item) => !status(item).toLocaleLowerCase("tr-TR").includes("tamam") && item?.dueDate && new Date(item.dueDate) < new Date()).length;
  const completion = items.length ? (completed / items.length) * 100 : 0;
  const verification = completed ? (verified / completed) * 100 : 0;
  const byCompetency = groupCount(items, (item) => text(item?.competencyCode ?? item?.trainingName ?? item?.Egitim ?? "Diğer")).slice(0, 6)
    .map(([label, value], index) => ({ label, value, tone: index }));
  const byState = [
    { label: "Atandı / aktif", value: Math.max(0, items.length - completed), tone: 0 },
    { label: "Tamamlandı", value: completed, tone: 2 },
    { label: "Kanıt bekliyor", value: pendingEvidence, tone: 3 },
    { label: "Doğrulandı", value: verified, tone: 4 },
  ];

  return (
    <>
      <KpiGrid items={[
        { label: "Toplam müdahale", value: String(items.length), note: "Aktif öğrenme portföyü", tone: 0 },
        { label: "Tamamlama", value: pct(completion), note: `${completed} tamamlanan`, tone: 2 },
        { label: "İşe transfer kanıtı", value: pct(verification), note: `${verified} yönetici doğrulaması`, tone: 4 },
        { label: "Geciken", value: String(overdue), note: "Takip gerektiren", tone: 3 },
      ]} />
      <div className="vmb-main-grid">
        <article className="vmb-panel">
          <header><div><span>ÖĞRENME ETKİSİ</span><h3>Tamamlama</h3></div><GraduationCap /></header>
          <Donut value={completion} label="tamamlandı" detail={`${pendingEvidence} tamamlanmış kayıt henüz işe transfer kanıtı bekliyor.`} tone={4} />
        </article>
        <article className="vmb-panel vmb-panel-wide">
          <header><div><span>PORTFÖY DAĞILIMI</span><h3>Yetkinlik / müdahale yoğunluğu</h3></div><Activity /></header>
          {items.length ? <Bars items={byCompetency} /> : <EmptyVisual textValue="Eğitim veya gelişim müdahalesi atandığında yoğunluk grafiği burada oluşacak." />}
        </article>
        <article className="vmb-panel vmb-panel-wide">
          <header><div><span>EVIDENCE FLOW</span><h3>Atamadan doğrulamaya</h3></div><CheckCircle2 /></header>
          {items.length ? <Bars items={byState} max={Math.max(1, items.length)} /> : <EmptyVisual textValue="Atama → tamamlama → kanıt → doğrulama akışı burada izlenecek." />}
        </article>
      </div>
    </>
  );
}

function CareerBoard({ snapshot }: { snapshot: Snapshot }) {
  const people = snapshot.org;
  const aspirations = people.map((person) => number(person?.career_aspiration)).filter((value) => value >= 1 && value <= 5);
  const highAspiration = aspirations.filter((value) => value >= 4).length;
  const mobilityPool = people.filter((person) => performance(person, snapshot.history) >= 3.5 && potential(person, snapshot.history) >= 4).length;
  const verifiedLearning = snapshot.trainings.filter((item) => Boolean(item?.managerVerified)).length;
  const coverage = people.length ? (people.filter((person) => performance(person, snapshot.history) > 0 || potential(person, snapshot.history) > 0).length / people.length) * 100 : 0;
  const aspirationBars: Bar[] = [
    { label: "Yüksek istek (4–5)", value: highAspiration, tone: 4 },
    { label: "Orta (3)", value: aspirations.filter((value) => value === 3).length, tone: 1 },
    { label: "Düşük (1–2)", value: aspirations.filter((value) => value <= 2).length, tone: 3 },
    { label: "Belirtilmedi", value: Math.max(0, people.length - aspirations.length), tone: 5 },
  ];
  const poolByDepartment = groupCount(
    people.filter((person) => performance(person, snapshot.history) >= 3.5 && potential(person, snapshot.history) >= 4),
    department,
  ).slice(0, 6).map(([label, value], index) => ({ label, value, tone: index }));

  return (
    <>
      <KpiGrid items={[
        { label: "Kariyer havuzu", value: String(people.length), note: "Görünür çalışan", tone: 0 },
        { label: "Mobilite adayı", value: String(mobilityPool), note: "Yüksek potansiyel sinyali", tone: 4 },
        { label: "Veri kapsamı", value: pct(coverage), note: "Performans / potansiyel sinyali", tone: 2 },
        { label: "Doğrulanmış öğrenme", value: String(verifiedLearning), note: "Evidence Graph girişi", tone: 1 },
      ]} />
      <div className="vmb-main-grid">
        <article className="vmb-panel vmb-panel-wide">
          <header><div><span>KARİYER İSTEĞİ</span><h3>Mobilite sinyalleri</h3></div><MapPinned /></header>
          {people.length ? <Bars items={aspirationBars} max={Math.max(1, people.length)} /> : <EmptyVisual textValue="Çalışan verisi geldiğinde kariyer isteği dağılımı burada görünecek." />}
        </article>
        <article className="vmb-panel">
          <header><div><span>READINESS DATA</span><h3>Karar kapsamı</h3></div><Target /></header>
          <Donut value={coverage} label="kapsama" detail="Performans veya potansiyel verisi bulunan çalışanların toplam kadroya oranı." tone={1} />
        </article>
        <article className="vmb-panel vmb-panel-wide">
          <header><div><span>MOBİLİTE HAVUZU</span><h3>Departman dağılımı</h3></div><Users /></header>
          {poolByDepartment.length ? <Bars items={poolByDepartment} /> : <EmptyVisual textValue="Yüksek potansiyel + güçlü performans sinyali oluştuğunda mobilite havuzu burada renkli olarak dağılacak." />}
        </article>
      </div>
    </>
  );
}

function NineBoxBoard({ snapshot }: { snapshot: Snapshot }) {
  const plotted = snapshot.org
    .map((person) => ({ person, perf: performance(person, snapshot.history), pot: potential(person, snapshot.history) }))
    .filter((item) => item.perf > 0 && item.pot > 0);
  const counts = new Map<string, number>();
  BOX_LABELS.flat().forEach((label) => counts.set(label, 0));
  plotted.forEach((item) => counts.set(matrixLabel(item.perf, item.pot), (counts.get(matrixLabel(item.perf, item.pot)) || 0) + 1));
  const stars = counts.get("Yıldız Oyuncu") || 0;
  const highPotential = (counts.get("Yüksek Potansiyel") || 0) + stars + (counts.get("Potansiyel Yatırımı") || 0);
  const critical = counts.get("Kritik Gelişim") || 0;
  const coverage = snapshot.org.length ? (plotted.length / snapshot.org.length) * 100 : 0;

  return (
    <>
      <KpiGrid items={[
        { label: "Matrise yerleşen", value: String(plotted.length), note: `${snapshot.org.length} çalışan içinde`, tone: 0 },
        { label: "Yıldız oyuncu", value: String(stars), note: "Yüksek performans + potansiyel", tone: 4 },
        { label: "Yüksek potansiyel", value: String(highPotential), note: "Üst potansiyel bandı", tone: 1 },
        { label: "Kritik gelişim", value: String(critical), note: "Yakın takip", tone: 3 },
      ]} />
      <div className="vmb-main-grid">
        <article className="vmb-panel vmb-panel-superwide">
          <header><div><span>TALENT HEATMAP</span><h3>9-Box dağılımı</h3></div><Grid3X3 /></header>
          {snapshot.org.length ? (
            <div className="vmb-ninebox" aria-label="9-Box yetenek dağılımı">
              {BOX_LABELS.flat().map((label, index) => {
                const value = counts.get(label) || 0;
                const share = plotted.length ? (value / plotted.length) * 100 : 0;
                return <div key={label} className={`vmb-ninebox-cell vmb-nine-${index}`}><span>{label}</span><strong>{value}</strong><small>{pct(share)}</small></div>;
              })}
            </div>
          ) : <EmptyVisual textValue="Performans ve potansiyel verisi geldiğinde 9 kutu otomatik dolacak." />}
          <div className="vmb-axis"><span>← Potansiyel: düşükten yükseğe</span><span>Performans: düşükten yükseğe →</span></div>
        </article>
        <article className="vmb-panel">
          <header><div><span>VERİ GÜVENİ</span><h3>Matris kapsamı</h3></div><CircleGauge /></header>
          <Donut value={coverage} label="kapsama" detail={`${Math.max(0, snapshot.org.length - plotted.length)} çalışan için performans veya potansiyel verisi eksik.`} tone={2} />
        </article>
      </div>
    </>
  );
}

export default function VisualModuleBoard({ pathname }: { pathname: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ org: [], history: [], candidates: [], assessments: [], trainings: [] }));

  useEffect(() => {
    const reload = () => setSnapshot(readSnapshot());
    reload();
    const events = ["dataUpdated", "candidatesUpdated", "talentMatrixUpdated", "storageCleared", "userChanged"];
    events.forEach((event) => window.addEventListener(event, reload));
    window.addEventListener("storage", reload);
    return () => {
      events.forEach((event) => window.removeEventListener(event, reload));
      window.removeEventListener("storage", reload);
    };
  }, []);

  const mode = useMemo(() => {
    if (pathname.startsWith("/ise-alim")) return "recruitment";
    if (pathname.startsWith("/egitim")) return "learning";
    if (pathname.startsWith("/kariyer")) return "career";
    if (pathname.startsWith("/yetenek-matrisi")) return "ninebox";
    return null;
  }, [pathname]);

  if (!mode) return null;

  const meta = mode === "recruitment"
    ? { kicker: "GÖRSEL ATS", title: "İşe alım karar panosu", copy: "Liste okumadan; funnel, kanıt kapsamı ve öncelikli adayları tek ekranda görün.", icon: BriefcaseBusiness }
    : mode === "learning"
      ? { kicker: "LEARNING ANALYTICS", title: "Öğrenme & etki panosu", copy: "Atama sayısından çok tamamlama, işe transfer kanıtı ve doğrulama akışını görün.", icon: GraduationCap }
      : mode === "career"
        ? { kicker: "CAREER INTELLIGENCE", title: "Kariyer mobilite panosu", copy: "Kariyer isteği, veri kapsamı ve mobilite havuzunu görsel sinyaller üzerinden yönetin.", icon: MapPinned }
        : { kicker: "TALENT HEATMAP", title: "9-Box yetenek panosu", copy: "Dokuz kutuyu liste yerine renkli yoğunluk haritası ve kapsam göstergeleriyle okuyun.", icon: Grid3X3 };
  const Icon = meta.icon;

  return (
    <section className={`visual-module-board vmb-${mode}`}>
      <header className="vmb-header">
        <div className="vmb-header-icon"><Icon /></div>
        <div><span>{meta.kicker}</span><h2>{meta.title}</h2><p>{meta.copy}</p></div>
        <div className="vmb-live"><i /> Canlı veri</div>
      </header>
      {mode === "recruitment" && <RecruitmentBoard snapshot={snapshot} />}
      {mode === "learning" && <LearningBoard snapshot={snapshot} />}
      {mode === "career" && <CareerBoard snapshot={snapshot} />}
      {mode === "ninebox" && <NineBoxBoard snapshot={snapshot} />}
    </section>
  );
}
