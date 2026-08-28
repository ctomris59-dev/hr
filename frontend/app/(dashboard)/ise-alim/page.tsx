"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Sparkles, UserPlus } from "lucide-react";
import { POSITIONS } from "../../data/jobData";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";

const STAGES = ["Başvuru", "Ön Eleme", "Test", "Mülakat", "Teklif", "İşe Alındı", "Reddedildi"] as const;
type CandidateStage = (typeof STAGES)[number];

interface Candidate {
  id: string | number;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  status?: CandidateStage;
  createdAt?: string;
  type?: string;
  raw_scores?: Record<string, number>;
  isDemo?: boolean;
  [key: string]: any;
}

const DEMO_CANDIDATE: Candidate = {
  id: "demo-candidate-futurehr",
  name: "Ece Kaya",
  role: "İşe Alım Uzmanı",
  email: "ece.kaya.demo@futurehr.local",
  phone: "+90 5xx xxx xx xx",
  status: "Mülakat",
  createdAt: "2026-08-25T09:30:00.000Z",
  type: "Demo Aday",
  isDemo: true,
  raw_scores: {
    "Dijital Okuryazarlık": 4.3,
    "Analitik Düşünme": 4.1,
    "Sonuç Odaklılık": 4.4,
    "Detaylara Özen": 4.2,
    "Sürekli Öğrenme": 4.6,
    "Etik ve Uyum": 4.7,
    "Öz-Disiplin": 4.3,
    "Dayanıklılık & Stres Yönetimi": 4.0,
    "Takım Çalışması": 4.5,
    "İletişim Becerileri": 4.6,
  },
};

export default function IseAlimPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | undefined>();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "" });
  const [ai, setAi] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const reload = () => {
    const stored = getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, [])
      .filter((candidate) => candidate.type !== "Mevcut Çalışan" && candidate.type !== "Demo Aday" && !candidate.isDemo)
      .map((candidate, index) => ({
        ...candidate,
        id: candidate.id ?? `cand-${index}`,
        status: (candidate.status || "Başvuru") as CandidateStage,
        createdAt: candidate.createdAt || candidate.date || new Date().toISOString(),
      }));

    setCandidates([DEMO_CANDIDATE, ...stored]);
    setAssessments(getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS, []));
  };

  useEffect(() => reload(), []);
  useEffect(() => {
    if (selectedId === undefined && candidates.length) setSelectedId(candidates[0].id);
  }, [candidates, selectedId]);

  const selected = candidates.find((candidate) => candidate.id === selectedId);
  const assessment = selected
    ? assessments.find(
        (item) =>
          item.subjectType === "candidate" &&
          (String(item.subjectId) === String(selected.id) || item.subjectName === selected.name)
      )
    : null;

  const legacyScores = selected?.raw_scores;
  const scores = assessment?.scores || legacyScores || {};
  const scoreValues = Object.values(scores).map(Number).filter(Number.isFinite);
  const testScore = scoreValues.length
    ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length
    : null;
  const responseQuality = selected?.isDemo ? "Yüksek" : assessment?.responseConsistency?.band || "—";

  const save = (next: Candidate[]) => {
    setCandidates(next);
    setStorageData(
      STORAGE_KEYS.CANDIDATES,
      next.filter((candidate) => !candidate.isDemo && candidate.type !== "Demo Aday")
    );
    window.dispatchEvent(new CustomEvent("candidatesUpdated"));
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.role || !form.email.trim()) return;

    const item: Candidate = {
      id: `cand-${Date.now()}`,
      name: form.name.trim(),
      role: form.role,
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: "Başvuru",
      createdAt: new Date().toISOString(),
      type: "Aday",
    };

    save([item, ...candidates]);
    setSelectedId(item.id);
    setForm({ name: "", role: "", email: "", phone: "" });
    setShowNew(false);
  };

  const move = (id: string | number, status: CandidateStage) =>
    save(candidates.map((candidate) => (candidate.id === id ? { ...candidate, status } : candidate)));

  const requestAI = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAi(null);

    try {
      const response = await fetch("/api/ai/hr-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "recruitment",
          context: {
            candidate: { name: selected.name, role: selected.role, status: selected.status },
            testScore,
            assessmentAvailable: Boolean(assessment || legacyScores),
            evidenceNotice:
              "Test skoru yalnızca bir veri noktasıdır; nihai işe alım kararı üretilmemelidir.",
          },
        }),
      });
      setAi(await response.json());
    } catch {
      setAi({
        mode: "rules",
        recommendation:
          "Yetkinlik testi yalnızca bir veri noktasıdır. Ön eleme, deneyim, teknik/iş örneği, yapılandırılmış mülakat ve rol gereksinimlerini birlikte değerlendirin.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-600">Aday karar akışı</p>
          <h1 className="mt-1 text-2xl font-semibold">İşe Alım</h1>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">
            Tüm adayları başvurudan işe alıma kadar aynı ATS akışında yönetin: Başvuru → Ön Eleme → Test → Mülakat → Teklif → İşe Alındı / Reddedildi.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="mr-1 inline h-4 w-4" />Başvuru ekle
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-violet-900/60 dark:from-violet-950/25 dark:to-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-black tracking-[.1em] text-white">DEMO</span>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Ece Kaya · İşe Alım Uzmanı</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Örnek aday Mülakat aşamasında ve yetkinlik testi tamamlanmış durumda. Kartı seçerek test içgörüsünü, aşama değişimini ve karar desteğini deneyebilirsiniz. Demo kayıt gerçek aday verisine kaydedilmez.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedId(DEMO_CANDIDATE.id);
            setAi(null);
          }}
          className="shrink-0 rounded-xl border border-violet-200 bg-white px-3.5 py-2 text-xs font-bold text-violet-700 shadow-sm hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300"
        >
          Demoyu aç
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {STAGES.map((stage) => (
          <div key={stage} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{stage}</p>
            <p className="mt-2 text-2xl font-semibold">{candidates.filter((candidate) => candidate.status === stage).length}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex min-w-max gap-3">
          {STAGES.map((stage) => (
            <div key={stage} className="w-[250px]">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-300">{stage}</h2>
                <span className="text-[10px] text-slate-400">{candidates.filter((candidate) => candidate.status === stage).length}</span>
              </div>
              <div className="space-y-2">
                {candidates
                  .filter((candidate) => candidate.status === stage)
                  .map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => {
                        setSelectedId(candidate.id);
                        setAi(null);
                      }}
                      className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm transition dark:bg-slate-900 ${
                        selectedId === candidate.id
                          ? "border-violet-400 ring-2 ring-violet-100 dark:ring-violet-950"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{candidate.name}</p>
                        {candidate.isDemo && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-black text-violet-700">DEMO</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{candidate.role}</p>
                      <p className="mt-2 text-[10px] text-slate-400">{candidate.email || "E-posta yok"}</p>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Briefcase className="h-4 w-4 text-violet-600" />
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  {selected.isDemo && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black text-violet-700">DEMO ADAY</span>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{selected.role} · {selected.email}</p>
              </div>
              <select
                value={selected.status}
                onChange={(event) => move(selected.id, event.target.value as CandidateStage)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {STAGES.map((stage) => <option key={stage}>{stage}</option>)}
              </select>
            </div>

            {selected.isDemo && (
              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-xs leading-5 text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-300">
                Bu örnek, adayın test sonrası Mülakat aşamasına geçtiği bir senaryoyu gösterir. Aşamayı değiştirebilirsiniz; sayfa yenilendiğinde demo başlangıç durumuna döner.
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Mini label="Aşama" value={selected.status || "Başvuru"} />
              <Mini label="Yetkinlik testi" value={testScore !== null ? `${testScore.toFixed(1)} / 5` : "Henüz yok"} />
              <Mini label="Yanıt kalitesi" value={responseQuality} />
            </div>

            {scoreValues.length > 0 ? (
              <div className="mt-5">
                <h3 className="text-sm font-semibold">Test içgörüsü</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Bu skor yalnızca rol uyum değerlendirmesine girdi sağlar; tek başına “kabul/red” kararı değildir.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(scores).slice(0, 10).map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                      <span>{key}</span><strong>{Number(value).toFixed(1)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Aday henüz yetkinlik testini tamamlamadı. ATS kaydı yine de süreçte kalır.
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Link
                href={`/aday-testi?mode=candidate&candidateId=${selected.id}`}
                className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
              >
                Test bağlantısı / test ekranı
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 dark:border-violet-900/60 dark:bg-violet-950/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-700" />
              <h2 className="text-sm font-semibold text-violet-950 dark:text-violet-200">Karar desteği</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-violet-800 dark:text-violet-300">
              AI varsa aday hakkında nihai kabul/red kararı üretmez; mevcut kanıtı özetler ve bir sonraki doğrulama adımını önerir.
            </p>
            <button
              onClick={requestAI}
              disabled={aiLoading}
              className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {aiLoading ? "Analiz ediliyor..." : "Öneri oluştur"}
            </button>
            {ai && (
              <div className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  {ai.mode === "ai" ? "AI Karar Desteği" : "Kural Bazlı Öneri"}
                </p>
                <div className="whitespace-pre-wrap">{ai.recommendation}</div>
                {ai.note && <p className="mt-2 text-xs text-slate-400">{ai.note}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <form onSubmit={add} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-violet-600" /><h2 className="text-lg font-semibold">Yeni başvuru</h2></div>
            <div className="mt-5 space-y-3">
              <input placeholder="Ad Soyad" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                <option value="">Pozisyon seçin</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}
              </select>
              <input type="email" placeholder="E-posta" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
              <input placeholder="Telefon" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700">Vazgeç</button>
              <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Başvuruyu kaydet</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
