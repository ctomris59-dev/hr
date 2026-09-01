"use client";

import { useEffect } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { ensurePerformanceCycle } from "@/lib/hr/performanceCycle";
import { createCompensationCycle } from "@/lib/hr/compensationWorkflow";

const COST_CENTERS: Record<string, string> = {
  "Genel Yönetim": "CC-100",
  "İnsan Kaynakları": "CC-200",
  "Finans & Muhasebe": "CC-300",
  "Satış & Pazarlama": "CC-400",
  "Operasyon & Üretim": "CC-500",
  "BT & Dijital": "CC-600",
  "Proje & İş Geliştirme": "CC-700",
};

const COMPETENCY_CODES = ["DIG", "ANA", "RES", "DET", "LRN", "ETH", "DIS", "STR", "TEA", "COM"];
const DEMO_ROLE_FIT_CALIBRATION_VERSION = 2;

function isV1Demo(org: any[]) {
  const names = new Set(org.map((person) => String(person?.["Ad Soyad"] || "")));
  return org.length >= 25 && names.has("Pelin Yılmaz");
}

function dateFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function demoUsername(name: string) {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

function calibratedDemoCompetencyScore(rawScore: number, personIndex: number, totalPeople: number, competencyIndex: number) {
  const population = Math.max(2, totalPeople);
  const permutedRank = (personIndex * 13) % population;
  const personBias = (permutedRank / (population - 1)) * 1.8 - 0.9;
  const competencyShape = ((((personIndex + 1) * (competencyIndex + 3) * 7) % 11) - 5) * 0.07;
  const calibrated = rawScore + personBias + competencyShape;
  return Math.round(Math.max(2.25, Math.min(4.95, calibrated)) * 100) / 100;
}

export default function DemoDataHardeningBridge() {
  useEffect(() => {
    let applying = false;

    const harden = () => {
      if (applying) return;
      const user = getStorageData<any>(STORAGE_KEYS.CURRENT_USER, null);
      if (user?.authMode === "secure") return;

      const org = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      if (!isV1Demo(org)) return;

      applying = true;
      try {
        ensurePerformanceCycle();

        const enrichedOrg = org.map((person, index) => {
          const dept = String(person.Departman || "");
          const operation = dept === "Operasyon & Üretim";
          const tenure = Math.max(1, new Date().getFullYear() - Number(String(person["İşe Giriş Tarihi"] || "2022").slice(0, 4) || 2022));
          return {
            ...person,
            Lokasyon: person.Lokasyon || (operation ? "Çorlu" : "İstanbul / Hibrit"),
            "Şube": person["Şube"] || (operation ? "Çorlu Fabrika" : "Merkez Ofis"),
            "Maliyet Merkezi": person["Maliyet Merkezi"] || COST_CENTERS[dept] || "CC-900",
            "Çalışan Tipi": person["Çalışan Tipi"] || "Tam Zamanlı",
            "İşgücü Tipi": person["İşgücü Tipi"] || "Beyaz Yaka",
            "Kadro Durumu": person["Kadro Durumu"] || "Aktif",
            "Çalışma Yılı": person["Çalışma Yılı"] || tenure,
            "Yıllık İzin Hakkı": person["Yıllık İzin Hakkı"] || (tenure >= 15 ? 26 : tenure >= 5 ? 20 : 14),
            Eposta: person.Eposta || `${demoUsername(String(person["Ad Soyad"] || `calisan${index + 1}`))}@futurehr.demo`,
          };
        });
        setStorageData(STORAGE_KEYS.ORG_CHART, enrichedOrg);

        // Rol Uyum Grafiği yalnız doğrulanmış ölçümleri kullanır. Demo 360 kayıtlarındaki
        // manager_scores haritasını düz yetkinlik alanlarına açarken çalışan bazlı kalibre
        // ederiz. Böylece demo radarları ve rol uyumu yüzdeleri tek bir %93 şablonuna
        // kilitlenmez; aynı çalışan ise sayfa yenilense bile aynı deterministik profili korur.
        const employeeOrder = new Map(enrichedOrg.map((person, index) => [String(person["Ad Soyad"] || ""), index]));
        const history = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
        const hardenedHistory = history.map((row, rowIndex) => {
          const nested = row?.manager_scores && typeof row.manager_scores === "object" ? row.manager_scores : {};
          const flattened: Record<string, number> = {};
          const calibratedNested: Record<string, number> = { ...nested };
          const personName = String(row?.Personel || row?.["Ad Soyad"] || "");
          const personIndex = employeeOrder.get(personName) ?? (rowIndex % Math.max(1, enrichedOrg.length));
          const alreadyCalibrated = Number(row?.demo_role_fit_calibration_version) === DEMO_ROLE_FIT_CALIBRATION_VERSION;

          COMPETENCY_CODES.forEach((code, competencyIndex) => {
            const rawScore = Number(nested[code] ?? row[code] ?? row[`${code}_Mgr`]);
            if (!(rawScore > 0 && rawScore <= 5)) return;
            const score = alreadyCalibrated
              ? rawScore
              : calibratedDemoCompetencyScore(rawScore, personIndex, enrichedOrg.length, competencyIndex);
            calibratedNested[code] = score;
            flattened[code] = score;
            flattened[`${code}_Mgr`] = score;
          });

          return {
            ...row,
            manager_scores: calibratedNested,
            ...flattened,
            demo_role_fit_calibration_version: DEMO_ROLE_FIT_CALIBRATION_VERSION,
          };
        });
        setStorageData(STORAGE_KEYS.HISTORY_360, hardenedHistory);

        const candidates = getStorageData<any[]>(STORAGE_KEYS.CANDIDATES, []).map((candidate, index) => ({
          ...candidate,
          role: candidate.role || candidate.position || "Uzman",
          type: candidate.type || "Aday",
          email: candidate.email || `aday${index + 1}@futurehr.demo`,
          phone: candidate.phone || `+90 555 100 ${String(10 + index).padStart(2, "0")}`,
          score: candidate.score || 68 + index * 4,
          fitScore: candidate.fitScore || 64 + index * 5,
        }));
        setStorageData(STORAGE_KEYS.CANDIDATES, candidates);

        const employees = enrichedOrg.filter((person) => person.Departman !== "Genel Yönetim");
        const managers = enrichedOrg.filter((person) => /müdür|direktör/i.test(String(person.Pozisyon || "")));

        if (!getStorageData<any[]>(STORAGE_KEYS.LEAVE_REQUESTS, []).length) {
          const leaveRequests = employees.slice(0, 12).map((person, index) => ({
            id: `leave-demo-${index + 1}`,
            employee_id: person.id,
            employee: person["Ad Soyad"],
            department: person.Departman,
            type: index % 5 === 0 ? "sick" : index % 4 === 0 ? "excuse" : "annual",
            start: dateFromNow(index - 8),
            end: dateFromNow(index - 7 + (index % 3)),
            days: 1 + (index % 3),
            status: index % 3 === 0 ? "Bekliyor" : index % 4 === 0 ? "Reddedildi" : "Onaylandı",
            note: index % 2 ? "Planlı kişisel izin" : "Takvim ve ekip kapasitesi dikkate alınarak oluşturuldu.",
            createdAt: isoFromNow(-25 + index),
            approvedBy: index % 3 === 0 ? undefined : person["Yönetici 1"],
          }));
          setStorageData(STORAGE_KEYS.LEAVE_REQUESTS, leaveRequests);
        }

        if (!getStorageData<any[]>(STORAGE_KEYS.REWARD_LEAVE, []).length) {
          setStorageData(
            STORAGE_KEYS.REWARD_LEAVE,
            employees.slice(5, 10).map((person, index) => ({
              id: `reward-demo-${index + 1}`,
              employee_id: person.id,
              employee: person["Ad Soyad"],
              days: index % 2 === 0 ? 1 : 2,
              reason: index % 2 === 0 ? "Kritik proje katkısı" : "Dönem hedefinin üzerinde performans",
              grantedBy: person["Yönetici 1"],
              createdAt: isoFromNow(-40 + index * 4),
            })),
          );
        }

        if (!getStorageData<any[]>(STORAGE_KEYS.NOTIFICATIONS, []).length) {
          setStorageData(STORAGE_KEYS.NOTIFICATIONS, [
            { id: 91001, message: "2 izin talebi yönetici onayı bekliyor.", type: "warning", read: false, timestamp: isoFromNow(-1), targetRole: "CEO", link: "/izinler", source: "leave" },
            { id: 91002, message: "Ücret dönemi yönetici girdileri bütçe kontrolüne hazır.", type: "info", read: false, timestamp: isoFromNow(-2), targetRole: "CEO", link: "/maas", source: "compensation" },
            { id: 91003, message: "3 çalışan için gelişim yeniden ölçümü yaklaşıyor.", type: "info", read: true, timestamp: isoFromNow(-4), link: "/gelisim-analitigi", source: "development" },
            { id: 91004, message: "Yetenek kalibrasyonu için kritik rol havuzu güncellendi.", type: "success", read: false, timestamp: isoFromNow(-6), link: "/yetenek-matrisi", source: "talent" },
          ]);
        }

        if (!getStorageData<any[]>(STORAGE_KEYS.CAREER_PROFILES, []).length) {
          setStorageData(
            STORAGE_KEYS.CAREER_PROFILES,
            employees.slice(0, 14).map((person, index) => ({
              id: `career-${person.id}`,
              employee_id: person.id,
              employee: person["Ad Soyad"],
              currentRole: person.Pozisyon,
              aspiration: index % 3 === 0 ? "Yönetim" : index % 3 === 1 ? "Uzmanlıkta Derinleşme" : "Yatay Gelişim",
              mobility: index % 4 !== 0,
              readiness: index % 4 === 0 ? "12+ ay" : index % 3 === 0 ? "6-12 ay" : "0-6 ay",
              updatedAt: isoFromNow(-20 + index),
            })),
          );
        }

        if (!getStorageData<any[]>(STORAGE_KEYS.ASSESSMENTS, []).length) {
          setStorageData(
            STORAGE_KEYS.ASSESSMENTS,
            employees.slice(0, 8).map((person, index) => ({
              id: `assessment-${person.id}`,
              employee_id: person.id,
              person: person["Ad Soyad"],
              role: person.Pozisyon,
              version: "FHR-ASSESS-DEMO-1",
              score: 72 + index * 3,
              status: "Tamamlandı",
              completedAt: isoFromNow(-60 + index * 4),
            })),
          );
        }

        if (!getStorageData<any[]>(STORAGE_KEYS.CANDIDATE_RESULTS, []).length) {
          setStorageData(
            STORAGE_KEYS.CANDIDATE_RESULTS,
            candidates.slice(0, 5).map((candidate, index) => ({
              id: `candidate-result-${candidate.id}`,
              candidateId: candidate.id,
              candidate: candidate.name,
              role: candidate.role,
              score: candidate.score || 70 + index * 4,
              competencyFit: candidate.fitScore || 66 + index * 5,
              recommendation: index < 2 ? "İleri aşama" : index < 4 ? "Değerlendir" : "Yedek havuz",
              completedAt: isoFromNow(-20 + index * 2),
            })),
          );
        }

        const cycles = getStorageData<any[]>(STORAGE_KEYS.COMPENSATION_CYCLES, []);
        if (!cycles.length) {
          const cycle = createCompensationCycle(`${new Date().getFullYear()} Ücret Dönemi`);
          const managerRequests = managers.slice(0, 6).map((manager, index) => ({
            id: `comp-req-${index + 1}`,
            manager: manager["Ad Soyad"],
            department: manager.Departman,
            requestedIncrease: 22 + index * 1.5,
            status: index % 3 === 0 ? "Revizyon" : "Gönderildi",
          }));
          const results = employees.slice(0, 18).map((person, index) => ({
            employee_id: person.id,
            employee: person["Ad Soyad"],
            department: person.Departman,
            currentSalary: Number(person["Maaş (TL)"] || 0),
            proposedIncrease: 18 + (index % 6) * 2,
            performance: 3.4 + (index % 7) * 0.2,
          }));
          setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES, [{
            ...cycle,
            stage: "BUDGET_REVIEW",
            budgetLimit: 24,
            scenario: "B",
            inflationRate: 19.5,
            managerRequests,
            results,
            stageHistory: [
              ...(cycle.stageHistory || []),
              { stage: "MANAGER_INPUT", at: isoFromNow(-12), by: "İK" },
              { stage: "BUDGET_REVIEW", at: isoFromNow(-2), by: "İK" },
            ],
          }]);
        }

        if (!Object.keys(getStorageData<Record<string, any>>(STORAGE_KEYS.USERS, {})).length) {
          const accounts: Record<string, any> = {};
          enrichedOrg.slice(0, 16).forEach((person) => {
            const username = demoUsername(String(person["Ad Soyad"] || "demo"));
            const position = String(person.Pozisyon || "");
            accounts[username] = {
              username,
              password: "Demo123!",
              name: person["Ad Soyad"],
              role: /genel müdür/i.test(position) ? "CEO" : /müdür|direktör/i.test(position) ? "MANAGER" : "PERSONEL",
              dept: person.Departman,
              department: person.Departman,
              position,
              active: true,
              createdAt: isoFromNow(-90),
            };
          });
          setStorageData(STORAGE_KEYS.USERS, accounts);
        }
      } finally {
        applying = false;
      }
    };

    harden();
    window.addEventListener("dataUpdated", harden);
    window.addEventListener("userChanged", harden);
    return () => {
      window.removeEventListener("dataUpdated", harden);
      window.removeEventListener("userChanged", harden);
    };
  }, []);

  return null;
}