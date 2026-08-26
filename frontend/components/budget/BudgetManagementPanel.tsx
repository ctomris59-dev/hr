"use client";

import { useEffect, useState } from "react";
import { getStorageData, STORAGE_KEYS } from "../../app/utils/storage";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, AlertTriangle, CheckCircle, Users, Send } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import { SkeletonCard } from "../ui/Skeleton";
import { API_BASE_URL } from "@/lib/apiConfig";

interface TeamMember {
  employee_id: string;
  employee_name: string;
  position: string;
  department: string;
  current_salary: number;
  performance: number;
  potential: number;
}

interface SalaryRequest {
  employee_id: string;
  requested_rate: number;
  status: "Taslak" | "Gönderildi";
}

interface BudgetManagementPanelProps {
  showHeader?: boolean;
  hideWhenNoAccess?: boolean;
}

const normalizeDept = (value: string) => value.trim().toLowerCase();
const isDirectorPosition = (position: string) => {
  const pos = position.toLowerCase();
  return pos.includes("direktör") || pos.includes("director") || pos.includes("genel müdür");
};

const hasDirectorInDept = (orgData: any[], dept: string) => {
  if (!dept) return false;
  const normalizedDept = normalizeDept(dept);
  return orgData.some((p) => {
    const personDept = normalizeDept(p["Departman"] || "");
    return personDept === normalizedDept && isDirectorPosition(p["Pozisyon"] || "");
  });
};

const canAccessBudget = (role: string, dept: string, orgData: any[]) => {
  if (role === "CEO") return true;
  if (role === "DIRECTOR" || role === "Direktör") return true;
  if (role === "MANAGER") return !hasDirectorInDept(orgData, dept);
  return false;
};

export default function BudgetManagementPanel({
  showHeader = true,
  hideWhenNoAccess = true,
}: BudgetManagementPanelProps) {
  const [user, setUser] = useState<any>(null);
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [salaryRequests, setSalaryRequests] = useState<Record<string, SalaryRequest>>({});
  const [period, setPeriod] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    setPeriod(`${year}-Q${quarter}`);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
        setUser(currentUser);

        if (!currentUser) {
          setLoading(false);
          return;
        }

        const userRole = (currentUser as any).role || "";
        const userName = (currentUser as any).name || "";
        const userDept = (currentUser as any).dept || (currentUser as any).department || "";

        const orgData = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
        if (!canAccessBudget(userRole, userDept, orgData)) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        if (orgData.length === 0) {
          setLoading(false);
          return;
        }

        try {
          const healthCheck = await fetch(API_BASE_URL + "/api/health", {
            signal: AbortSignal.timeout(3000),
          });
          if (!healthCheck.ok) {
            throw new Error(`Backend health check failed: ${healthCheck.status}`);
          }
        } catch (error: any) {
          const errorMsg = error.name === "AbortError"
            ? "Backend'e bağlanılamıyor (timeout)"
            : "Backend çalışmıyor";
          alert(`⚠️ ${errorMsg}!\n\nBackend'i başlatmak için:\n1. Terminal'de "cd backend" yazın\n2. "START_BACKEND.bat" dosyasını çalıştırın\nveya\n3. "python main.py" komutunu çalıştırın\n\nBackend http://127.0.0.1:8000 adresinde çalışmalı.`);
          setLoading(false);
          return;
        }

        const teamRes = await fetch(
          `${API_BASE_URL}/api/budget/team-data?manager_name=${encodeURIComponent(userName)}&manager_role=${encodeURIComponent(userRole)}&manager_dept=${encodeURIComponent(userDept)}`
        );

        if (teamRes.ok) {
          const teamResult = await teamRes.json();
          if (teamResult.success) {
            const teamDataArray = teamResult.data || [];
            setTeamData(teamDataArray);

            const currentPeriod = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;
            const requests: Record<string, SalaryRequest> = {};

            for (const member of teamDataArray) {
              try {
                const params = new URLSearchParams();
                params.append("period", currentPeriod);
                params.append("manager_role", userRole);
                params.append("manager_dept", userDept || "");
                params.append("manager_name", userName);
                const reqRes = await fetch(
                  `${API_BASE_URL}/api/budget/request/${encodeURIComponent(member.employee_id)}?${params.toString()}`
                );
                if (reqRes.ok) {
                  const reqResult = await reqRes.json();
                  if (reqResult.success && reqResult.data) {
                    requests[member.employee_id] = {
                      employee_id: reqResult.data.employee_id,
                      requested_rate: reqResult.data.requested_rate,
                      status: reqResult.data.status,
                    };
                  }
                }
              } catch (error) {
                console.error(`Request load error for ${member.employee_id}:`, error);
              }
            }

            setSalaryRequests(requests);
          }
        } else if (teamRes.status === 403) {
          setAccessDenied(true);
        } else {
          const errorText = await teamRes.text();
          console.error("API Error:", teamRes.status, errorText);
          alert(`Ekip verisi yüklenirken hata oluştu: ${teamRes.status} - ${errorText}`);
        }
      } catch (error) {
        console.error("Data loading error:", error);
        alert(`Veri yükleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleRateChange = async (employeeId: string, rate: number) => {
    if (!user || !period) return;

    const newRequests = {
      ...salaryRequests,
      [employeeId]: {
        employee_id: employeeId,
        requested_rate: rate,
        status: "Taslak" as const,
      },
    };
    setSalaryRequests(newRequests);

    try {
      const managerId = (user as any).name || "";
      await fetch(API_BASE_URL + "/api/budget/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          period: period,
          requested_rate: rate,
          status: "Taslak",
          manager_id: managerId,
          manager_role: (user as any)?.role || "",
          manager_dept: (user as any)?.dept || (user as any)?.department || "",
        }),
      });
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  };

  const handleSubmit = async () => {
    if (!user || !period) return;

    setSubmitting(true);
    try {
      const managerId = (user as any).name || "";
      const submitRes = await fetch(API_BASE_URL + "/api/budget/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: period,
          manager_id: managerId,
          manager_role: (user as any)?.role || "",
          manager_dept: (user as any)?.dept || (user as any)?.department || "",
        }),
      });

      if (submitRes.ok) {
        const result = await submitRes.json();
        if (result.success) {
          alert(`✅ ${result.data.submitted_count} talep başarıyla Finans birimine iletildi!`);

          const updatedRequests = { ...salaryRequests };
          Object.keys(updatedRequests).forEach((key) => {
            if (updatedRequests[key].status === "Taslak") {
              updatedRequests[key].status = "Gönderildi";
            }
          });
          setSalaryRequests(updatedRequests);
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Gönderme hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!user || accessDenied) {
    if (hideWhenNoAccess) return null;
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold">Erişim Yetkisi Yok</p>
        <p className="text-sm text-red-700 mt-1">
          Bu alanı sadece departmanların en üst amirleri ve CEO kullanabilir.
        </p>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Bütçe Yönetimi</h2>
          </div>
          <p className="text-xs text-slate-500">Ekip maaş artış taleplerini yönetin</p>
        </div>
      )}

      <GlassCard className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Ekip Maaş Dağıtım Tablosu
          </h3>
        </div>

        {teamData.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-2 font-semibold">
              {(user as any)?.dept || (user as any)?.department || "Departmanınız"} departmanında yönetebileceğiniz çalışan bulunmuyor.
            </p>
            <div className="text-xs text-slate-500 space-y-2 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 text-left">
                <p className="text-xs font-semibold text-blue-800 mb-2">💡 Çözüm Önerileri:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Organizasyon şemasında {(user as any).dept || (user as any).department || "departmanınız"} içinde çalışan eklediğinizden emin olun</li>
                  <li>Çalışanların departman bilgisinin doğru olduğunu kontrol edin</li>
                  <li>Direktör pozisyonundaki çalışanlar listede görünmez (sadece alt seviye çalışanlar)</li>
                  <li>Tarayıcı konsolunu (F12) açarak detaylı hata mesajlarını kontrol edin</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Personel
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Talep Edilen Zam (%)
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Yeni Maaş (₺)
                  </th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {teamData.map((member, idx) => {
                    const request = salaryRequests[member.employee_id];
                    const requestedRate = request?.requested_rate || 0;
                    const newSalary = member.current_salary * (1 + requestedRate / 100);
                    const hasHighRate = requestedRate > 40 && member.performance < 2.5;

                    return (
                      <motion.tr
                        key={`${member.employee_id}-${idx}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-indigo-700">
                                {member.employee_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{member.employee_name}</p>
                              <p className="text-xs text-slate-500">{member.position}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600">Maaş:</span>
                              <span className="text-sm font-mono font-semibold text-slate-800">
                                {member.current_salary.toLocaleString("tr-TR")} ₺
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600">Performans:</span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  member.performance >= 4.0
                                    ? "bg-green-100 text-green-700"
                                    : member.performance >= 3.0
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {member.performance.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={requestedRate || ""}
                              onChange={(e) => {
                                const rate = parseFloat(e.target.value) || 0;
                                handleRateChange(member.employee_id, rate);
                              }}
                              className="w-24 px-3 py-2 text-sm text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                              placeholder="0.0"
                            />
                            {hasHighRate && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-1 p-1.5 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Performansla uyumsuz yüksek artış
                              </motion.div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <motion.span
                            key={newSalary}
                            initial={{ scale: 1.1, color: "#3b82f6" }}
                            animate={{ scale: 1, color: "#1e293b" }}
                            className="text-sm font-mono font-semibold text-slate-800"
                          >
                            {newSalary.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                          </motion.span>
                          {requestedRate > 0 && (
                            <p className="text-xs text-green-600 mt-0.5">
                              +{((newSalary - member.current_salary) / 1000).toFixed(0)}K ₺
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {request && request.status === "Gönderildi" ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Gönderildi
                            </span>
                          ) : request && request.requested_rate > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">
                              Taslak
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(salaryRequests).length === 0}
            className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              submitting || Object.keys(salaryRequests).length === 0
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl"
            }`}
          >
            {submitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Talepleri Finans Birimine İlet
              </>
            )}
          </button>
          {Object.keys(salaryRequests).length === 0 && (
            <p className="text-xs text-slate-500 text-center mt-2">
              En az bir personel için zam oranı girmelisiniz.
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

