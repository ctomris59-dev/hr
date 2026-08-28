"use client";

import { useEffect, useMemo, useState } from "react";
import { Map, Target, TrendingUp } from "lucide-react";
import AIDecisionSupport from "@/components/AIDecisionSupport";
import { POSITIONS } from "../../data/jobData";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { buildCareerArchitecture, calculateCareerReadiness, getCareerRole, JOB_LEVELS } from "../../../lib/hr/careerArchitecture";

export default function KariyerPage() {
  const [user, setUser] = useState<any>(null);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [targetPosition, setTargetPosition] = useState("");

  useEffect(() => {
    setUser(getStorageData(STORAGE_KEYS.CURRENT_USER, null));
    setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []));
    setHistory(getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []));
  }, []);

  const role = String(user?.role || "").toUpperCase();
  const people = useMemo(() => {
    if (!user) return [];
    if (role === "CEO" || role === "IK") return orgData;
    try {
      return getManageableEmployees(user, orgData);
    } catch {
      return [];
    }
  }, [user, orgData, role]);

  useEffect(() => {
    if (!selectedName && people.length) setSelectedName(people[0]["Ad Soyad"]);
  }, [people, selectedName]);

  const orgPerson = orgData.find((p) => p["Ad Soyad"] === selectedName) || {};
  const assessment = history.find((p) => (p.Personel || p.target) === selectedName) || {};
  const person = { ...orgPerson, ...assessment };
  const currentRole = getCareerRole(orgPerson.Pozisyon || "");
  const architecture = useMemo(() => buildCareerArchitecture(POSITIONS), []);
  const familyRoles = architecture[currentRole.family] || [];

  useEffect(() => {
    if (!targetPosition && currentRole.title) {
      const next = familyRoles.find((r) => r.levelRank > currentRole.levelRank) || familyRoles.find((r) => r.title !== currentRole.title);
      if (next) setTargetPosition(next.title);
    }
  }, [currentRole.title, currentRole.levelRank, familyRoles, targetPosition]);

  const readiness = targetPosition ? calculateCareerReadiness(person, targetPosition) : null;
  const targetRole = targetPosition ? getCareerRole(targetPosition) : null;

  const updateAspiration = (value: number) => {
    const next = orgData.map((p) => p["Ad Soyad"] === selectedName ? { ...p, career_aspiration: value } : p);
    setOrgData(next);
    setStorageData(STORAGE_KEYS.ORG_CHART, next);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
  };

  const aiContext = readiness && targetRole ? {
    module: "career_readiness",
    employee: {
      currentPosition: currentRole.title,
      currentFamily: currentRole.family,
      currentLevel: currentRole.level,
      targetPosition: targetRole.title,
      targetFamily: targetRole.family,
      targetLevel: targetRole.level,
    },
    readiness: {
      index: readiness.index,
      band: readiness.band,
      competencyFit: readiness.competencyFit,
      performance: readiness.performance,
      potential: readiness.potential,
      experience: readiness.experience,
      aspiration: readiness.aspiration,
      notes: readiness.notes,
    },
    careerSignals: {
      aspiration: Number(orgPerson.career_aspiration ?? 3),
      levelDistance: targetRole.levelRank - currentRole.levelRank,
      familyChange: targetRole.family !== currentRole.family,
    },
    evidence: {
      performance: Number(assessment.Performans || assessment.performance || 0) || null,
      competencyScore: Number(assessment.competency_score || 0) || null,
      evaluationDate: assessment.date || assessment.Tarih || null,
    },
    instruction: "Hazır bulunuşluk yüzdesini tek başına karar olarak yorumlama. Hedef rol geçişindeki güçlü kanıtları, eksikleri, seviye/aile mesafesini ve gelişim gereksinimlerini açıklayarak kariyer görüşmesi için doğrulama soruları üret. Terfi kararı verme.",
  } : {};

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">Kariyer mimarisi</p>
        <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Kariyer Yolu</h1>
        <p className="mt-1 max-w-5xl text-xs leading-5 text-slate-500">
          Hazır bulunuşluk; hedef rol yetkinlik uyumu %50, performans %20, potansiyel %15, deneyim %10 ve kariyer isteği %5 ile hesaplanır. Sonuç terfi kararı değil, gelişim göstergesidir.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="text-xs font-medium text-slate-500">
              Çalışan
              <select
                value={selectedName}
                onChange={(e) => { setSelectedName(e.target.value); setTargetPosition(""); }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
              >
                {people.map((p: any) => <option key={p.id ?? p["Ad Soyad"]}>{p["Ad Soyad"]}</option>)}
              </select>
            </label>

            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">Mevcut rol</p>
              <p className="mt-1 text-sm font-semibold text-amber-950 dark:text-amber-100">{currentRole.title || "—"}</p>
              <p className="mt-1 text-[11px] leading-4 text-amber-800 dark:text-amber-300">{currentRole.family} · {currentRole.level} {JOB_LEVELS[currentRole.level]}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">Kariyer isteği</p>
              <strong className="text-sm text-slate-900 dark:text-white">{Number(orgPerson.career_aspiration ?? 3).toFixed(1)} / 5</strong>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>1 düşük</span><span>5 yüksek</span></div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={Number(orgPerson.career_aspiration ?? 3)}
              onChange={(e) => updateAspiration(Number(e.target.value))}
              className="mt-1.5 w-full"
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-amber-600" />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentRole.family} kariyer mimarisi</h2>
                <p className="mt-0.5 text-[10px] text-slate-400">Aynı kariyer ailesindeki roller seviye sırasıyla gösterilir.</p>
              </div>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {familyRoles.map((careerRole, index) => {
                const isCurrent = careerRole.title === currentRole.title;
                const isTarget = careerRole.title === targetPosition;
                return (
                  <button
                    key={careerRole.title}
                    onClick={() => setTargetPosition(careerRole.title)}
                    className={`min-w-0 rounded-xl border p-3 text-left transition-all ${
                      isCurrent
                        ? "border-slate-900 bg-slate-950 text-white shadow-md dark:border-slate-100 dark:bg-white dark:text-slate-950"
                        : isTarget
                          ? "border-amber-300 bg-amber-50 shadow-sm dark:border-amber-700 dark:bg-amber-950/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[9px] font-bold uppercase tracking-[0.07em] opacity-60">{careerRole.level} · {JOB_LEVELS[careerRole.level]}</p>
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{index + 1}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold leading-4">{careerRole.title}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="text-xs font-medium text-slate-500">
              Hedef rol
              <select value={targetPosition} onChange={(e) => setTargetPosition(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm">
                <optgroup label={`${currentRole.family} içi`}>
                  {familyRoles.filter((r) => r.title !== currentRole.title).map((r) => <option key={r.title}>{r.title}</option>)}
                </optgroup>
                <optgroup label="Diğer roller">
                  {POSITIONS.filter((p) => getCareerRole(p).family !== currentRole.family).map((p) => <option key={p}>{p}</option>)}
                </optgroup>
              </select>
            </label>

            {readiness && (
              <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[175px_minmax(0,1fr)]">
                <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/10">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">Hazır bulunuşluk</p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-4xl font-semibold tracking-[-0.05em]">%{readiness.index}</p>
                    <span className={`mb-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${readiness.band === "Hazır" ? "bg-emerald-400/20 text-emerald-300" : readiness.band === "Yakın" ? "bg-amber-400/20 text-amber-300" : "bg-slate-700 text-slate-200"}`}>{readiness.band}</span>
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-slate-400">Otomatik terfi önerisi değildir.</p>
                </div>

                <div className="min-w-0 grid gap-x-5 gap-y-3 md:grid-cols-2">
                  <Factor label="Yetkinlik uyumu" value={readiness.competencyFit} weight="%50" />
                  <Factor label="Performans" value={readiness.performance} weight="%20" />
                  <Factor label="Potansiyel" value={readiness.potential} weight="%15" />
                  <Factor label="Deneyim / kıdem" value={readiness.experience} weight="%10" />
                  <Factor label="Kariyer isteği" value={readiness.aspiration} weight="%5" />
                </div>
              </div>
            )}

            {readiness?.notes.length ? (
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-[11px] leading-5 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
                {readiness.notes.map((note) => <p key={note}>• {note}</p>)}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {readiness && targetRole && <AIDecisionSupport
        kind="career"
        context={aiContext}
        resetKey={`${selectedName}-${targetPosition}`}
        title="AI Kariyer Karar Desteği"
        description="Hazır bulunuşluk endeksini oluşturan yetkinlik uyumu, performans, potansiyel, deneyim ve kariyer isteğini birlikte yorumlar. AI terfi önermez; hedef role geçişte güçlü kanıtları, açıkları ve kariyer görüşmesinde doğrulanması gereken noktaları çıkarır."
        buttonLabel="Kariyer analizini oluştur"
        questionTitle="Kariyer görüşmesi soruları"
      />}

      <div className="grid gap-3 md:grid-cols-3">
        <Info icon={Target} title="Job family" text="Benzer uzmanlık alanındaki roller aynı kariyer ailesinde gruplanır." />
        <Info icon={TrendingUp} title="Job level" text="L1 başlangıçtan L6 üst yönetime kadar rol seviyesi ayrı tutulur." />
        <Info icon={Map} title="Çapraz kariyer" text="Başka aileye geçiş mümkün; rol ailesi ve seviye mesafesi açıkça görünür." />
      </div>
    </div>
  );
}

function Factor({ label, value, weight }: { label: string; value: number; weight: string }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="truncate text-slate-600 dark:text-slate-300">{label} <span className="text-slate-400">{weight}</span></span>
        <strong className="flex-none text-slate-900 dark:text-white">%{safeValue}</strong>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-amber-500" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function Info({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">{text}</p>
        </div>
      </div>
    </div>
  );
}
