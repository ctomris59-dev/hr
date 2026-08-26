"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getStorageData, STORAGE_KEYS, setStorageData } from "../../../utils/storage";
import { getManageableEmployees } from "../../../utils/hierarchy";
import type { OrgChartEntry, CurrentUser } from "../../../types";
import { Send, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useNotifications } from "../../../../context/NotificationContext";
import Image from "next/image";

interface ManagerProposal {
  employeeName: string;
  currentSalary: number;
  systemProposal: number; // Senaryo B'den gelen öneri
  managerProposal: number | null; // Yöneticinin önerdiği zam oranı (%)
  managerNote: string; // Gerekçe
}

export default function YoneticiMaasTalepPage() {
  const router = useRouter();
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<OrgChartEntry[]>([]);
  const [proposals, setProposals] = useState<Record<string, ManagerProposal>>({});
  const [budgetLimit, setBudgetLimit] = useState(30); // Varsayılan bütçe limiti (%)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const user = getStorageData<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) {
      router.replace("/");
      return;
    }

    // Sadece director ve manager rolündekiler girebilir
    const userRole = user.role?.toUpperCase();
    if (userRole !== "DIRECTOR" && userRole !== "MANAGER") {
      showToast("Bu sayfaya erişim yetkiniz bulunmamaktadır.", "error");
      router.replace("/dashboard");
      return;
    }

    setCurrentUser(user);
    loadData();
  }, [router, showToast]);

  const loadData = useCallback(async () => {
    try {
      const orgData = getStorageData<OrgChartEntry[]>(STORAGE_KEYS.ORG_CHART, []);
      const user = getStorageData<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
      
      if (!user) return;

      // Yöneticinin yönetebileceği çalışanları getir
      const manageableEmployees = getManageableEmployees(user, orgData);
      setEmployees(manageableEmployees);

      // Senaryo B sonuçlarını hesapla (referans olarak)
      // Gerçek hesaplama için salarySimulation.ts kullan
      const { processEmployeeData, calculateMarketAverages, runScenarioLogic } = await import("../../../utils/salarySimulation");
      const data360 = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
      
      const processedEmployees = processEmployeeData(orgData, data360);
      const marketRefs = calculateMarketAverages(processedEmployees);
      const inflationRate = 35; // Varsayılan enflasyon
      
      // Senaryo B sonuçlarını hesapla
      const scenarioBResults = runScenarioLogic(processedEmployees, marketRefs, inflationRate, "B");
      
      const initialProposals: Record<string, ManagerProposal> = {};
      manageableEmployees.forEach((emp) => {
        const currentSalary = emp["Maaş (TL)"] || emp.Maaş || 0;
        // Senaryo B sonucunu bul
        const scenarioBResult = scenarioBResults.find((r) => r["Ad Soyad"] === emp["Ad Soyad"]);
        const systemProposal = scenarioBResult ? scenarioBResult["Yeni Maaş"] : currentSalary * 1.35;

        initialProposals[emp["Ad Soyad"]] = {
          employeeName: emp["Ad Soyad"],
          currentSalary,
          systemProposal,
          managerProposal: emp.manager_proposal || null,
          managerNote: emp.manager_note || "",
        };
      });

      setProposals(initialProposals);
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  }, []);

  const handleProposalChange = (employeeName: string, value: number | null) => {
    setProposals((prev) => ({
      ...prev,
      [employeeName]: {
        ...prev[employeeName],
        managerProposal: value,
      },
    }));
  };

  const handleNoteChange = (employeeName: string, note: string) => {
    setProposals((prev) => ({
      ...prev,
      [employeeName]: {
        ...prev[employeeName],
        managerNote: note,
      },
    }));
  };

  // Bütçe hesaplama
  const budgetAnalysis = useMemo(() => {
    const totalCurrentSalary = employees.reduce((sum, emp) => {
      const salary = emp["Maaş (TL)"] || emp.Maaş || 0;
      return sum + salary;
    }, 0);

    const totalProposedIncrease = Object.values(proposals).reduce((sum, prop) => {
      if (prop.managerProposal !== null && prop.managerProposal !== undefined) {
        const increaseAmount = (prop.currentSalary * prop.managerProposal) / 100;
        return sum + increaseAmount;
      }
      return sum;
    }, 0);

    const totalProposedSalary = totalCurrentSalary + totalProposedIncrease;
    const budgetPercentage = (totalProposedIncrease / totalCurrentSalary) * 100;
    const isOverBudget = budgetPercentage > budgetLimit;

    return {
      totalCurrentSalary,
      totalProposedIncrease,
      totalProposedSalary,
      budgetPercentage,
      isOverBudget,
    };
  }, [proposals, employees, budgetLimit]);

  const handleSubmit = useCallback(() => {
    try {
      const orgData = getStorageData<OrgChartEntry[]>(STORAGE_KEYS.ORG_CHART, []);
      
      // Yönetici önerilerini orgData'ya kaydet
      const updatedOrgData = orgData.map((emp) => {
        const proposal = proposals[emp["Ad Soyad"]];
        if (proposal) {
          return {
            ...emp,
            manager_proposal: proposal.managerProposal || undefined,
            manager_note: proposal.managerNote || undefined,
          };
        }
        return emp;
      });

      setStorageData(STORAGE_KEYS.ORG_CHART, updatedOrgData);
      showToast("Maaş talepleri başarıyla İK'ya gönderildi!", "success");
      
      // Backend'e de gönder (eğer API varsa)
      // fetch("http://127.0.0.1:8000/api/org-chart", { method: "POST", body: JSON.stringify(updatedOrgData) });
      
      router.push("/dashboard");
    } catch (error) {
      console.error("Error submitting proposals:", error);
      showToast("Talepler gönderilirken bir hata oluştu.", "error");
    }
  }, [proposals, router, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="Future HR Logo"
              width={140}
              height={45}
              className="object-contain dark:brightness-0 dark:invert"
            />
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                Yönetici Maaş Talepleri
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Departmanınızdaki çalışanlar için maaş artış taleplerinizi girin
              </p>
            </div>
          </div>
        </div>

        {/* Bütçe Bar */}
        <div className="bg-white dark:bg-slate-900/50 rounded-xl shadow-md p-6 mb-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Bütçe Durumu
              </h3>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Mevcut Maaş</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {budgetAnalysis.totalCurrentSalary.toLocaleString("tr-TR")} ₺
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Önerilen Artış</p>
                  <p className={`text-xl font-bold ${budgetAnalysis.isOverBudget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {budgetAnalysis.totalProposedIncrease.toLocaleString("tr-TR")} ₺
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Bütçe Kullanımı</p>
                  <p className={`text-xl font-bold ${budgetAnalysis.isOverBudget ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-100"}`}>
                    %{budgetAnalysis.budgetPercentage.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Bütçe Limiti</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    %{budgetLimit}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {budgetAnalysis.isOverBudget ? (
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                budgetAnalysis.isOverBudget
                  ? "bg-red-600 dark:bg-red-500"
                  : budgetAnalysis.budgetPercentage > budgetLimit * 0.8
                  ? "bg-amber-500 dark:bg-amber-400"
                  : "bg-green-600 dark:bg-green-500"
              }`}
              style={{
                width: `${Math.min((budgetAnalysis.budgetPercentage / budgetLimit) * 100, 100)}%`,
              }}
            />
          </div>
          {budgetAnalysis.isOverBudget && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Bütçe limitini aştınız! Lütfen taleplerinizi gözden geçirin.
            </p>
          )}
        </div>

        {/* Tablo */}
        <div className="bg-white dark:bg-slate-900/50 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-300 font-semibold">
                    Personel Adı
                  </th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-300 font-semibold">
                    Mevcut Maaş
                  </th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-300 font-semibold">
                    Sistem Önerisi (Senaryo B)
                  </th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-300 font-semibold">
                    Yönetici Önerisi (%)
                  </th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-300 font-semibold">
                    Gerekçe
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const proposal = proposals[emp["Ad Soyad"]];
                  if (!proposal) return null;

                  const proposedSalary = proposal.managerProposal
                    ? proposal.currentSalary * (1 + proposal.managerProposal / 100)
                    : proposal.currentSalary;

                  return (
                    <tr
                      key={idx}
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-4 px-6 text-slate-800 dark:text-slate-200 font-medium">
                        {emp["Ad Soyad"]}
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                        {proposal.currentSalary.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                        {proposal.systemProposal.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={proposal.managerProposal ?? ""}
                            onChange={(e) =>
                              handleProposalChange(
                                emp["Ad Soyad"],
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="0.0"
                          />
                          <span className="text-slate-600 dark:text-slate-400">%</span>
                          {proposal.managerProposal !== null && (
                            <span className="text-sm text-slate-500 dark:text-slate-500">
                              ({proposedSalary.toLocaleString("tr-TR")} ₺)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          value={proposal.managerNote}
                          onChange={(e) => handleNoteChange(emp["Ad Soyad"], e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Gerekçe yazın..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={budgetAnalysis.isOverBudget}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              budgetAnalysis.isOverBudget
                ? "bg-slate-400 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl"
            }`}
          >
            <Send className="w-5 h-5" />
            Talepleri İK'ya Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

