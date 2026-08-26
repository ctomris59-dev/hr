"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import {
  ASSESSMENT_VERSION,
  CANDIDATE_QUESTIONS,
  COMPETENCY_LABELS,
  type AssessmentQuestion,
} from "../../data/questions";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { calculateAssessmentQuality } from "../../../lib/hr/assessmentQuality";
import {
  buildControlledQuestionOrder,
  selectValidationScenarios,
  summarizeScenarioEvidence,
  type ValidationScenario,
} from "../../../lib/hr/assessmentDesign";

const DURATION_SECONDS = 45 * 60;
const SCALE_ITEMS_PER_COMPETENCY = 12;

type Phase = "idle" | "inventory" | "scenarios" | "done";

const OPTIONS = [
  { value: 1, label: "Kesinlikle Katılmıyorum" },
  { value: 2, label: "Katılmıyorum" },
  { value: 3, label: "Kararsızım" },
  { value: 4, label: "Katılıyorum" },
  { value: 5, label: "Kesinlikle Katılıyorum" },
];

function AssessmentPage() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode") === "candidate" ? "candidate" : "employee";
  const candidateId = params.get("candidateId");

  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [coreDurationSeconds, setCoreDurationSeconds] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(DURATION_SECONDS);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [questionOrder, setQuestionOrder] = useState<AssessmentQuestion[]>([]);
  const [scenarioSet, setScenarioSet] = useState<ValidationScenario[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, string>>({});
  const [attemptSeed, setAttemptSeed] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const currentUser = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
    setUser(currentUser);
    const organization = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    setOrgData(organization);
    const candidateRows = getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []).filter(
      (candidate) => candidate.type !== "Mevcut Çalışan"
    );
    setCandidates(candidateRows);
    if (mode === "candidate" && candidateId) {
      const candidate = candidateRows.find(
        (item) => String(item.id) === String(candidateId)
      );
      if (candidate) setSelectedPerson(candidate.name);
    }
  }, [mode, candidateId]);

  const role = String(user?.role || "").toUpperCase();
  const availablePeople = useMemo(() => {
    if (mode === "candidate" || !user) return [];
    const self = orgData.find(
      (employee) => employee["Ad Soyad"] === (user.name || user.username)
    );
    if (role === "EMPLOYEE" || role === "PERSONEL") return self ? [self] : [];
    if (role === "CEO" || role === "IK") return orgData;
    try {
      return getManageableEmployees(user, orgData);
    } catch {
      return [];
    }
  }, [mode, user, orgData, role]);

  useEffect(() => {
    if (mode !== "employee" || selectedPerson || !availablePeople.length) return;
    const self = availablePeople.find(
      (employee: any) => employee["Ad Soyad"] === (user?.name || user?.username)
    );
    setSelectedPerson((self || availablePeople[0])["Ad Soyad"]);
  }, [mode, availablePeople, selectedPerson, user]);

  const candidate =
    mode === "candidate"
      ? candidateId
        ? candidates.find((item) => String(item.id) === String(candidateId))
        : candidates.find((item) => item.name === selectedPerson)
      : null;
  const employee = orgData.find((item) => item["Ad Soyad"] === selectedPerson);
  const subjectRole = mode === "candidate" ? candidate?.role : employee?.Pozisyon;
  const canStart = Boolean(selectedPerson && subjectRole);
  const currentQuestion = questionOrder[index];
  const currentScenario = scenarioSet[scenarioIndex];

  useEffect(() => {
    if (phase !== "inventory" || !startedAt) return;
    const timer = window.setInterval(() => {
      const next = Math.max(
        0,
        DURATION_SECONDS - Math.floor((Date.now() - startedAt) / 1000)
      );
      setRemaining(next);
      if (next === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, startedAt]);

  const start = () => {
    if (!canStart) return;
    const stamp = Date.now();
    const seed = `${mode}|${selectedPerson}|${subjectRole}|${stamp}`;
    setAttemptSeed(seed);
    setQuestionOrder(buildControlledQuestionOrder(CANDIDATE_QUESTIONS, seed));
    setScenarioSet(selectValidationScenarios(seed, 4));
    setScenarioAnswers({});
    setScenarioIndex(0);
    setAnswers({});
    setIndex(0);
    setStartedAt(stamp);
    setCoreDurationSeconds(null);
    setRemaining(DURATION_SECONDS);
    setResult(null);
    setPhase("inventory");
  };

  const moveToScenarios = () => {
    const missing = CANDIDATE_QUESTIONS.filter(
      (question) => !Number.isFinite(answers[question.id])
    );
    if (missing.length && remaining > 0) {
      alert(`${missing.length} soru henüz cevaplanmadı.`);
      return;
    }
    const duration = startedAt
      ? Math.min(DURATION_SECONDS, Math.round((Date.now() - startedAt) / 1000))
      : null;
    setCoreDurationSeconds(duration);
    setPhase("scenarios");
    setScenarioIndex(0);
  };

  const finishAssessment = () => {
    if (!selectedPerson || !subjectRole) return;
    const duration =
      coreDurationSeconds ??
      (startedAt
        ? Math.min(DURATION_SECONDS, Math.round((Date.now() - startedAt) / 1000))
        : null);

    const scores: Record<string, number> = {};
    const scaleCoverage: Record<string, number> = {};

    Object.entries(COMPETENCY_LABELS).forEach(([code, label]) => {
      const scaleQuestions = CANDIDATE_QUESTIONS.filter(
        (question) => question.category === code
      );
      const values = scaleQuestions
        .filter((question) => Number.isFinite(answers[question.id]))
        .map((question) => {
          const raw = answers[question.id];
          return question.type === "R" ? 6 - raw : raw;
        });
      if (values.length) {
        scores[label] =
          Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) /
          100;
      }
      scaleCoverage[label] = Math.round(
        (values.length / SCALE_ITEMS_PER_COMPETENCY) * 100
      );
    });

    const responseQuality = calculateAssessmentQuality(
      CANDIDATE_QUESTIONS,
      answers,
      duration
    );
    const scenarioEvidence = summarizeScenarioEvidence(scenarioSet, scenarioAnswers);

    const assessment = {
      id: `assessment-${Date.now()}`,
      instrumentVersion: ASSESSMENT_VERSION,
      subjectType: mode,
      subjectId:
        mode === "candidate"
          ? candidate?.id || candidateId
          : employee?.id || selectedPerson,
      subjectName: selectedPerson,
      role: subjectRole,
      scores,
      scaleCoverage,
      responseQuality,
      // Eski sonuç ekranları için uyumluluk alanı.
      responseConsistency: {
        score: responseQuality.score,
        band: responseQuality.band,
        note: responseQuality.note,
      },
      scenarioEvidence,
      rawAnswers: answers,
      questionOrder: questionOrder.map((question) => question.id),
      scenarioAnswers,
      scenarioIds: scenarioSet.map((scenario) => scenario.id),
      attemptSeed,
      completedAt: new Date().toISOString(),
      durationSeconds: duration,
      questionCount: CANDIDATE_QUESTIONS.length,
      scenarioCount: scenarioSet.length,
      scoringMethod:
        "Her yetkinlikte 12 madde; R maddeleri 6-cevap ile ters puanlanır. LIE maddeleri yetkinlik puanına katılmaz. Davranışsal senaryolar ayrı kanıt katmanıdır.",
    };

    const existing = getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS, []);
    setStorageData(STORAGE_KEYS.ASSESSMENTS, [assessment, ...existing]);

    if (mode === "candidate") {
      const nextCandidates = candidates.map((item) =>
        String(item.id) === String(candidate?.id || candidateId)
          ? {
              ...item,
              status:
                item.status === "Başvuru" || item.status === "Ön Eleme"
                  ? "Test"
                  : item.status,
              testCompletedAt: new Date().toISOString(),
            }
          : item
      );
      setStorageData(STORAGE_KEYS.CANDIDATES, nextCandidates);
      window.dispatchEvent(new CustomEvent("candidatesUpdated"));
    }

    window.dispatchEvent(new CustomEvent("dataUpdated"));
    setResult(assessment);
    setPhase("done");
  };

  if (result) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 text-xl font-semibold text-emerald-950">
            Değerlendirme tamamlandı
          </h1>
          <p className="mt-1 text-sm text-emerald-800">
            {result.subjectName} · {result.role} · {result.instrumentVersion}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Yetkinlik sonuçları</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {Object.entries(result.scores).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between rounded-xl bg-slate-50 p-3 text-xs"
                >
                  <span>{label}</span>
                  <strong>{Number(value).toFixed(1)} / 5</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-950">
                Yanıt Kalitesi: %{result.responseQuality.score} · {result.responseQuality.band}
              </p>
              <p className="mt-2 text-xs leading-5 text-blue-800">
                Tamamlama %{result.responseQuality.completeness} · İdealize kendini sunma %{result.responseQuality.idealizedSelfPresentation}
              </p>
              {result.responseQuality.flags?.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-blue-800">
                  {result.responseQuality.flags.map((flag: string) => (
                    <li key={flag}>• {flag}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] leading-5 text-blue-700">
                {result.responseQuality.note}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-semibold text-violet-950">
                Davranışsal senaryo uyumu: %{result.scenarioEvidence.alignmentPercent}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-violet-800">
                {result.scenarioEvidence.note}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(mode === "candidate" ? "/ise-alim" : "/yetenek-matrisi")}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Sonuç ekranına dön
        </button>
      </div>
    );
  }

  if (phase === "scenarios" && currentScenario) {
    const selected = scenarioAnswers[currentScenario.id];
    const progress = ((scenarioIndex + 1) / scenarioSet.length) * 100;
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
              <FlaskConical className="h-4 w-4" /> Davranışsal doğrulama
            </div>
            <p className="mt-1 text-sm font-semibold text-violet-950">
              Senaryo {scenarioIndex + 1} / {scenarioSet.length}
            </p>
          </div>
          <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-violet-700">
            Puanın parçası değil
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-violet-100">
          <div className="h-full bg-violet-600" style={{ width: `${progress}%` }} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">
            {currentScenario.title}
          </p>
          <h2 className="mt-3 text-base font-semibold leading-7 text-slate-900">
            {currentScenario.prompt}
          </h2>
          <div className="mt-6 space-y-2">
            {currentScenario.options.map((option) => (
              <button
                key={option.id}
                onClick={() =>
                  setScenarioAnswers((current) => ({
                    ...current,
                    [currentScenario.id]: option.id,
                  }))
                }
                className={`w-full rounded-xl border p-3 text-left text-sm ${
                  selected === option.id
                    ? "border-violet-500 bg-violet-50 text-violet-950"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              disabled={scenarioIndex === 0}
              onClick={() => setScenarioIndex(Math.max(0, scenarioIndex - 1))}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-30"
            >
              Önceki
            </button>
            {scenarioIndex === scenarioSet.length - 1 ? (
              <button
                disabled={!selected}
                onClick={finishAssessment}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
              >
                Değerlendirmeyi tamamla
              </button>
            ) : (
              <button
                disabled={!selected}
                onClick={() => setScenarioIndex(scenarioIndex + 1)}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
              >
                Sonraki senaryo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "inventory" && currentQuestion) {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const progress = ((index + 1) / questionOrder.length) * 100;
    const answered = answers[currentQuestion.id];
    const isLast = index === questionOrder.length - 1;

    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="sticky top-0 z-20 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-xs text-slate-500">
              {selectedPerson} · {subjectRole}
            </p>
            <p className="mt-1 text-sm font-semibold">
              Soru {index + 1} / {questionOrder.length}
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm font-semibold ${
              remaining < 300 ? "bg-red-50 text-red-700" : "bg-indigo-50 text-indigo-700"
            }`}
          >
            <Clock className="h-4 w-4" />
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-indigo-600" style={{ width: `${progress}%` }} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <FileText className="h-4 w-4" /> Yetkinlik değerlendirmesi
          </div>
          <h2 className="mt-4 text-base font-semibold leading-7 text-slate-900">
            {currentQuestion.text}
          </h2>

          <div className="mt-6 space-y-2">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setAnswers((current) => ({
                    ...current,
                    [currentQuestion.id]: option.value,
                  }))
                }
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm ${
                  answered === option.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{option.label}</span>
                <span className="font-mono text-xs">{option.value}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              disabled={index === 0}
              onClick={() => setIndex(Math.max(0, index - 1))}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-30"
            >
              Önceki
            </button>
            {isLast || remaining === 0 ? (
              <button
                onClick={moveToScenarios}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Davranışsal senaryolara geç
              </button>
            ) : (
              <button
                disabled={!answered}
                onClick={() => setIndex(index + 1)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
              >
                Sonraki
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-indigo-600">
          Yetkinlik değerlendirmesi · {ASSESSMENT_VERSION}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Yetkinlik Testi</h1>
        <p className="mt-1 text-sm text-slate-500">
          130 çekirdek soru · 45 dakika + 4 kısa davranışsal doğrulama senaryosu.
          Çekirdek sorular kontrollü biçimde karıştırılır; aynı yetkinlik maddeleri blok halinde gösterilmez.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold">Değerlendirilecek kişi</h2>
          </div>

          {mode === "employee" ? (
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-500">
                Çalışan
                <select
                  value={selectedPerson}
                  onChange={(event) => setSelectedPerson(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                >
                  {availablePeople.map((person: any) => (
                    <option key={person.id ?? person["Ad Soyad"]}>
                      {person["Ad Soyad"]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Personel yalnızca kendi adına test başlatabilir. Yönetici/direktör yalnızca
                hiyerarşik kapsamındaki çalışanları seçebilir; CEO/İK tüm çalışanları görebilir.
              </p>
            </div>
          ) : candidate ? (
            <div className="mt-4 rounded-xl bg-violet-50 p-4">
              <p className="text-sm font-semibold text-violet-950">{candidate.name}</p>
              <p className="mt-1 text-xs text-violet-800">
                {candidate.role} · {candidate.email}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-xs text-red-700">
              Geçerli aday kaydı bulunamadı. Testi İşe Alım ekranından başlatın.
            </div>
          )}

          <button
            onClick={start}
            disabled={!canStart}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Testi başlat
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-semibold text-amber-950">Yanıt Kalitesi Endeksi</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-amber-800">
              Sistem artık yalnız son 10 maddeye bakmıyor. Tamamlama, idealize kendini sunma,
              tek seçeneğe yığılma, ters madde uyumu ve olağandışı hız birlikte değerlendirilir.
              Bu endeks yalan veya dürüstlük ölçümü değildir.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-violet-700" />
              <h2 className="text-sm font-semibold text-violet-950">Davranışsal kanıt katmanı</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-violet-800">
              Dört senaryo self-report puanını değiştirmez. Sonuçları destekleyen bağımsız bir
              doğrulama sinyali olarak kaydedilir ve ileride psikometrik validasyonda ayrı analiz edilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdayTestiPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Test yükleniyor...</div>}>
      <AssessmentPage />
    </Suspense>
  );
}
