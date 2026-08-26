"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { getStorageData, STORAGE_KEYS, setStorageData } from "../../utils/storage";
import { useData } from "../../../context/DataContext";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingDown,
  Info,
  AlertTriangle,
  Sparkles,
  X,
  Send,
  ArrowRight,
} from "lucide-react";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import { API_BASE_URL } from "@/lib/apiConfig";

interface LeaveRequest {
  id?: number;
  personel: string;
  departman?: string;
  department_id?: string; // Legacy support
  tur: string;
  baslangic?: string;
  bitis?: string;
  baslangic_tarihi?: string; // Legacy support
  bitis_tarihi?: string; // Legacy support
  start_date?: string; // Legacy support
  end_date?: string; // Legacy support
  gun: number;
  gun_sayisi?: number; // Legacy support
  aciklama?: string;
  durum: "Bekliyor" | "Beklemede" | "Onaylandı" | "Reddedildi";
  talep_tarihi?: string;
  yonetici_notu?: string;
}

const LeaveCalendar = dynamic(() => import("@/components/calendar/LeaveCalendar"), { ssr: false });

// Get person leave statistics with performance-based bonus
function getPersonLeaveStats(
  personName: string,
  orgChart: any[],
  allRequests: LeaveRequest[],
  history360?: any[]
): {
  totalQuota: number;
  baseQuota: number;
  performanceBonus: number;
  usedAnnual: number;
  remaining: number;
  myRequests: LeaveRequest[];
  performanceScore: number;
} {
  // 1. Get defined quota from org chart
  const userRecord = orgChart.find((p) => p["Ad Soyad"] === personName);
  const baseQuota = userRecord
    ? parseInt(String(userRecord.Izin_Hakki || userRecord["İzin Hakkı (Gün)"] || 14))
    : 14;

  // 2. Get performance score from 360 data
  let performanceScore = 0;
  if (history360 && history360.length > 0) {
    const person360 = history360.find(
      (h: any) => h.Personel === personName || h.target === personName
    );
    performanceScore = person360?.Performans || userRecord?.Performans || 0;
  } else {
    performanceScore = userRecord?.Performans || 0;
  }

  // 3. Calculate performance-based bonus days
  // Performans ≥ 4.5: +3 gün ek izin
  // Performans ≥ 4.0: +2 gün ek izin
  // Performans ≥ 3.5: +1 gün ek izin
  let performanceBonus = 0;
  if (performanceScore >= 4.5) {
    performanceBonus = 3;
  } else if (performanceScore >= 4.0) {
    performanceBonus = 2;
  } else if (performanceScore >= 3.5) {
    performanceBonus = 1;
  }

  const totalQuota = baseQuota + performanceBonus;

  // 4. Get used (approved annual leaves)
  const myRequests = allRequests.filter((r) => r.personel === personName);
  const usedAnnual = myRequests
    .filter((r) => r.durum === "Onaylandı" && r.tur === "Yıllık İzin")
    .reduce((sum, r) => sum + (r.gun || r.gun_sayisi || 0), 0);

  // 5. Remaining
  const remaining = totalQuota - usedAnnual;

  return { 
    totalQuota, 
    baseQuota,
    performanceBonus,
    usedAnnual, 
    remaining, 
    myRequests,
    performanceScore
  };
}

// Send notification (ready for backend integration)
function sendNotification(toUser: string, message: string, type: string = "info") {
  // This would call the backend API in production
  console.log(`Notification to ${toUser}: ${message} (${type})`);
  // TODO: Implement API call to send notification
}

export default function IzinlerPage() {
  const { history360 } = useData();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"my" | "approvals" | "team">("my");
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("");
  const [formData, setFormData] = useState({
    tur: "Yıllık İzin",
    aciklama: "",
    baslangic: "",
    bitis: "",
  });
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [pendingApproval, setPendingApproval] = useState<{reqId: number | undefined, status: "Onaylandı" | "Reddedildi", note: string} | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);

  useEffect(() => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setUser(currentUser);

    const loadData = async () => {
      try {
    const stored = getStorageData<LeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS, []);
        const storedOrg = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    
        if (stored.length > 0 && storedOrg.length > 0) {
      setLeaveRequests(stored);
          setOrgData(storedOrg);
    } else {
          const [leavesRes, orgRes] = await Promise.all([
            fetch(API_BASE_URL + "/api/leave-requests").catch(() => null),
            fetch(API_BASE_URL + "/api/org-chart").catch(() => null),
          ]);

          if (leavesRes?.ok) {
            const leaves = await leavesRes.json();
            if (leaves.success && leaves.data) {
              setLeaveRequests(leaves.data);
              setStorageData(STORAGE_KEYS.LEAVE_REQUESTS, leaves.data);
            }
          }

          if (orgRes?.ok) {
            const org = await orgRes.json();
            if (org.success && org.data) {
              setOrgData(org.data);
            }
          }
        }
      } catch (error) {
        console.error("Data loading error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load smart suggestions and holidays
  useEffect(() => {
    const loadData = async () => {
      try {
        const [suggestionsRes, holidaysRes] = await Promise.all([
          fetch(API_BASE_URL + "/api/leave/suggestions").catch(() => null),
          fetch(API_BASE_URL + "/api/holidays").catch(() => null),
        ]);
        
        if (suggestionsRes?.ok) {
          const result = await suggestionsRes.json();
          setSmartSuggestions(result.data || []);
        }
        
        if (holidaysRes?.ok) {
          const result = await holidaysRes.json();
          setHolidays(result.data || []);
        }
      } catch (error) {
        console.error("Data load error:", error);
      }
    };
    loadData();
  }, []);

  const isManager =
    user?.role === "MANAGER" ||
    user?.role === "DIRECTOR" ||
    user?.role === "CEO" ||
    user?.role === "IK";

  // Get team members
  const myTeamNames = useMemo(() => {
    if (!isManager || !orgData.length) return [];
    if (user?.role === "CEO" || user?.role === "IK") {
      return orgData
        .map((p) => p["Ad Soyad"])
        .filter((name): name is string => Boolean(name) && name !== user?.name);
    }
    return orgData
      .filter(
        (p) =>
          p["Yönetici 1"] === user?.name || p["Yönetici 2"] === user?.name
      )
      .map((p) => p["Ad Soyad"])
      .filter((name): name is string => Boolean(name));
  }, [isManager, orgData, user]);

  // Get my leave stats
  const myStats = useMemo(() => {
    if (!user) return { 
      totalQuota: 14, 
      baseQuota: 14,
      performanceBonus: 0,
      usedAnnual: 0, 
      remaining: 14, 
      myRequests: [],
      performanceScore: 0
    };
    return getPersonLeaveStats(user.name, orgData, leaveRequests, history360);
  }, [user, orgData, leaveRequests, history360]);

  // Pending requests for managers
  const pendingRequests = useMemo(() => {
    if (!isManager) return [];
    return leaveRequests.filter(
      (r) => (r.durum === "Bekliyor" || r.durum === "Beklemede") && myTeamNames.includes(r.personel)
    );
  }, [isManager, leaveRequests, myTeamNames]);

  // Calculate days difference
  const daysDiff = useMemo(() => {
    if (!formData.baslangic || !formData.bitis) return 0;
    const start = new Date(formData.baslangic);
    const end = new Date(formData.bitis);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, [formData.baslangic, formData.bitis]);

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (daysDiff <= 0) {
      alert("Tarihleri kontrol ediniz.");
      return;
    }
    if (formData.tur === "Yıllık İzin" && daysDiff > myStats.remaining) {
      alert(
        `Yetersiz Bakiye! (${daysDiff} gün istediniz, ${myStats.remaining} gününüz var)`
      );
      return;
    }

    const newRequest: LeaveRequest = {
      id: Date.now(),
      personel: user?.name || "Bilinmeyen",
      departman: user?.dept || "-",
      tur: formData.tur,
      baslangic: formData.baslangic,
      bitis: formData.bitis,
      gun: daysDiff,
      aciklama: formData.aciklama,
      durum: "Bekliyor",
      talep_tarihi: new Date().toISOString().split("T")[0],
      yonetici_notu: "",
    };

    const updated = [...leaveRequests, newRequest];
    setLeaveRequests(updated);
    setStorageData(STORAGE_KEYS.LEAVE_REQUESTS, updated);

    // Send notification to manager
    const userRecord = orgData.find((p) => p["Ad Soyad"] === user?.name);
    if (userRecord) {
      const managerName = userRecord["Yönetici 1"] || userRecord["Yönetici 2"];
      if (managerName && managerName !== "-" && managerName !== "Yok") {
        sendNotification(
          managerName,
          `📢 ${user?.name} yeni bir izin talebi oluşturdu.`,
          "info"
        );
      }
    }

    alert("Talep iletildi!");
    setFormData({ tur: "Yıllık İzin", aciklama: "", baslangic: "", bitis: "" });
    setShowNewRequestForm(false);
  };

  // Handle approval/rejection with conflict check
  const handleUpdateStatus = async (
    reqId: number | undefined,
    newStatus: "Onaylandı" | "Reddedildi",
    note: string
  ) => {
    if (!reqId) return;

    // Onaylama durumunda conflict check yap
    if (newStatus === "Onaylandı") {
      const req = leaveRequests.find((r) => r.id === reqId);
      if (req) {
        const startDate = req.baslangic || req.baslangic_tarihi || req.start_date;
        const endDate = req.bitis || req.bitis_tarihi || req.end_date;
        const department = req.departman || req.department_id;

        if (startDate && endDate && department) {
          try {
            const response = await fetch(API_BASE_URL + "/api/leave-conflict-check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                department_id: department,
                start_date: startDate,
                end_date: endDate,
                exclude_request_id: reqId,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.data?.warning) {
                // Conflict var, modal göster
                setConflictData(result.data);
                setPendingApproval({ reqId, status: newStatus, note });
                setShowConflictModal(true);
                return; // Onaylamayı durdur, modal'dan sonra devam edecek
              }
            }
          } catch (error) {
            console.error("Conflict check error:", error);
            // Hata durumunda devam et
          }
        }
      }
    }

    // Conflict yoksa veya red durumunda direkt onayla
    proceedWithApproval(reqId, newStatus, note);
  };

  // Actual approval logic
  const proceedWithApproval = (
    reqId: number | undefined,
    newStatus: "Onaylandı" | "Reddedildi",
    note: string
  ) => {
    if (!reqId) return;

    const updated = leaveRequests.map((r) => {
      if (r.id === reqId) {
        return {
          ...r,
          durum: newStatus,
          yonetici_notu: note,
        };
      }
      return r;
    });

    setLeaveRequests(updated);
    setStorageData(STORAGE_KEYS.LEAVE_REQUESTS, updated);

    // Send notification
    const req = leaveRequests.find((r) => r.id === reqId);
    if (req) {
      if (newStatus === "Onaylandı") {
        sendNotification(
          req.personel,
          `✅ İzin talebiniz ONAYLANDI. (${req.baslangic || req.baslangic_tarihi || ""})`,
          "success"
        );
      } else {
        sendNotification(req.personel, `❌ İzin talebiniz REDDEDİLDİ.`, "error");
      }
    }

    // Modal'ı kapat
    setShowConflictModal(false);
    setConflictData(null);
    setPendingApproval(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Skeleton className="h-5 w-1/4" />
        <div className="mt-4">
          <SkeletonTable rows={5} cols={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-800">İzin Yönetimi</h1>
            </div>
        <p className="text-xs text-slate-500">İzin talepleri ve durumları</p>
            </div>

      {/* Tabs */}
      <div className="mb-4">
        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "my"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            İzinlerim
          </button>
          {isManager && (
            <>
              <button
                onClick={() => setActiveTab("approvals")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "approvals"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Onay Bekleyenler
              </button>
        <button
                onClick={() => setActiveTab("team")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "team"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Ekip Durumu
        </button>
            </>
          )}
        </div>
      </div>

          <div>
        {/* MY LEAVES TAB */}
        {activeTab === "my" && (
          <div className="space-y-4">
            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 border-l-2 border-blue-500">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Toplam</p>
                <p className="text-xl font-semibold text-slate-800 font-mono">{myStats.totalQuota} Gün</p>
                <div className="text-xs text-slate-400 mt-0.5">
                  {myStats.baseQuota} Temel
                  {myStats.performanceBonus > 0 && (
                    <span className="text-green-600 font-semibold ml-1">
                      +{myStats.performanceBonus} Performans Bonusu
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 border-l-2 border-orange-500">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Kullanılan</p>
                <p className="text-xl font-semibold text-slate-800 font-mono">{myStats.usedAnnual} Gün</p>
                <p className="text-xs text-slate-400 mt-0.5">Onaylanan</p>
          </div>
              <div
                className={`bg-white border border-slate-200 rounded-lg shadow-sm p-4 border-l-2 ${
                  myStats.remaining > 3 ? "border-green-500" : "border-red-500"
                }`}
              >
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Bakiye</p>
                <p className="text-xl font-semibold text-slate-800 font-mono">{myStats.remaining} Gün</p>
                <p className="text-xs text-slate-400 mt-0.5">Kalan</p>
        </div>
      </div>

            {/* Performance Bonus Info */}
            {myStats.performanceBonus > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-800">
                    <strong>Performans Bonusu:</strong> Performans skorunuz ({myStats.performanceScore.toFixed(1)}) sayesinde 
                    <strong className="ml-1">+{myStats.performanceBonus} gün ek izin</strong> kazandınız!
                  </p>
                </div>
              </div>
            )}

            {/* 🏖️ Tatil Fırsatları (Akıllı Öneriler) */}
            {smartSuggestions.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-bold text-slate-800">🏖️ Tatil Fırsatları (Akıllı Öneriler)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto pb-2">
                  {smartSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 border-l-4 border-l-orange-500 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden min-w-[280px]"
                    >
                      {/* Slogan */}
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-slate-500 font-semibold text-xs uppercase tracking-wide">{suggestion.slogan}</p>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <h4 className="font-semibold text-slate-800 text-sm">{suggestion.holiday_name}</h4>
                        </div>
                        
                        <p className="text-xs text-slate-600 mb-3">{suggestion.description}</p>
                        
                        <div className="space-y-1.5 mb-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tatil Tarihi:</span>
                            <span className="font-mono text-slate-700">{suggestion.holiday_date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Önerilen İzin:</span>
                            <span className="font-mono text-slate-700">
                              {suggestion.suggested_start_date === suggestion.suggested_end_date
                                ? suggestion.suggested_start_date
                                : `${suggestion.suggested_start_date} - ${suggestion.suggested_end_date}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Alınacak Gün:</span>
                            <span className="font-semibold text-slate-800">{suggestion.days_to_take} Gün</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Toplam Tatil:</span>
                            <span className="font-semibold text-slate-800">{suggestion.total_off_days} Gün</span>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <button
                          onClick={() => {
                            setFormData({
                              tur: "Yıllık İzin",
                              aciklama: `${suggestion.holiday_name} için önerilen izin`,
                              baslangic: suggestion.suggested_start_date,
                              bitis: suggestion.suggested_end_date,
                            });
                            setShowNewRequestForm(true);
                            // Scroll to form
                            setTimeout(() => {
                              const formElement = document.querySelector('details[open]');
                              if (formElement) {
                                formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }
                            }, 100);
                          }}
                          className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <ArrowRight className="w-4 h-4" />
                          Bunu Planla
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Visualization */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">İzin Takvimi</h3>
              <LeaveCalendar
                leaveRequests={leaveRequests}
                holidays={holidays}
                userName={user?.name || user?.username || ""}
              />
            </div>

            {/* New Request Form */}
            <details 
              className="bg-white border border-slate-200 rounded-lg shadow-sm"
              open={showNewRequestForm}
              onToggle={(e) => setShowNewRequestForm((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800">
                Yeni İzin Talebi Oluştur
              </summary>
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                      İzin Türü
                    </label>
                    <select
                      value={formData.tur}
                      onChange={(e) => setFormData({ ...formData, tur: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Yıllık İzin">Yıllık İzin</option>
                      <option value="Mazeret İzni">Mazeret İzni</option>
                      <option value="Hastalık Raporu">Hastalık Raporu</option>
                      <option value="Evden Çalışma">Evden Çalışma</option>
                    </select>
                    {formData.tur === "Yıllık İzin" && (
                      <p className="text-xs text-slate-400 mt-1">
                        Bakiyeden düşecektir. (Mevcut: {myStats.remaining})
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                      Açıklama
                    </label>
                    <input
                      type="text"
                      value={formData.aciklama}
                      onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                      placeholder="Sebep belirtiniz..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
              <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                      Başlangıç
                </label>
                <input
                  type="date"
                      value={formData.baslangic}
                      onChange={(e) => setFormData({ ...formData, baslangic: e.target.value })}
                  required
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                      Bitiş
                </label>
                <input
                  type="date"
                      value={formData.bitis}
                      onChange={(e) => setFormData({ ...formData, bitis: e.target.value })}
                  required
                      min={formData.baslangic}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
                <div className="p-2.5 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    Talep Edilen Süre: <strong className="font-mono">{daysDiff} Gün</strong>
                  </p>
            </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Talebi Gönder
                </button>
              </div>
              </form>
            </details>

            {/* Leave History */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-800">İzin Hareket Dökümü</h3>
              </div>
              {myStats.myRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Talep Tarihi
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Tür</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Açıklama
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Başlangıç
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Bitiş</th>
                        <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Gün</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Durum</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Bakiye Etkisi
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Yönetici Notu
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {myStats.myRequests.map((req, index) => {
                        const balanceImpact =
                          req.durum === "Onaylandı" && req.tur === "Yıllık İzin"
                            ? `⬇️ -${req.gun || req.gun_sayisi || 0}`
                            : `⏳ ${req.gun || req.gun_sayisi || 0}`;
                        const statusColor =
                          req.durum === "Onaylandı"
                            ? "bg-green-100 text-green-800"
                            : req.durum === "Reddedildi"
                            ? "bg-red-100 text-red-800"
                            : req.durum === "Bekliyor" || req.durum === "Beklemede"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-slate-100 text-slate-800";

                        return (
                          <tr
                            key={index}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-3 py-2 text-sm text-slate-800">
                              {req.talep_tarihi || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-800">{req.tur}</td>
                            <td className="px-3 py-2 text-sm text-slate-800">{req.aciklama || "-"}</td>
                            <td className="px-3 py-2 text-sm text-slate-800">
                              {req.baslangic || req.baslangic_tarihi || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-800">
                              {req.bitis || req.bitis_tarihi || "-"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-mono text-sm text-slate-800">
                                {req.gun || req.gun_sayisi || 0}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor}`}
                              >
                                {req.durum}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-800">{balanceImpact}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">
                              {req.yonetici_notu || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded text-center">
                  <p className="text-sm text-slate-600">Henüz bir izin hareketiniz yok.</p>
                </div>
              )}
            </div>
        </div>
      )}

        {/* MANAGER APPROVALS TAB */}
        {activeTab === "approvals" && isManager && (
        <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-green-800 font-medium">
                  Onay bekleyen izin talebi yok.
                </p>
            </div>
          ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const memberStats = getPersonLeaveStats(req.personel, orgData, leaveRequests, history360);
                  return (
                    <div
                      key={req.id}
                      className="bg-white border border-slate-200 rounded-lg shadow-sm p-4"
                    >
                      <div className="grid md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <p className="font-semibold text-slate-800 text-sm mb-1">
                            {req.personel}
                          </p>
                          <p className="text-xs text-slate-600 mb-2">
                            Tarih: {req.talep_tarihi || "-"}
                          </p>
                          <p className="font-medium text-slate-800 text-sm mb-1">
                            {req.tur} (<span className="font-mono">{req.gun}</span> Gün)
                          </p>
                          <p className="text-xs text-slate-600 mb-2">
                            {req.baslangic || req.baslangic_tarihi || "-"} ➡️{" "}
                            {req.bitis || req.bitis_tarihi || "-"}
                          </p>
                          {req.aciklama && (
                            <div className="p-2 bg-blue-50 rounded border border-blue-200 text-xs text-blue-800 mb-2">
                              "{req.aciklama}"
                      </div>
                          )}
                          {req.tur === "Yıllık İzin" && (
                            <p className="text-xs text-slate-600">
                              Mevcut Bakiye: <strong className="font-mono">{memberStats.remaining} Gün</strong>
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() =>
                              handleUpdateStatus(req.id, "Onaylandı", "Yönetici onayı.")
                            }
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Onayla
                          </button>
                      </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() =>
                              handleUpdateStatus(req.id, "Reddedildi", "Uygun görülmedi.")
                            }
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Reddet
                          </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TEAM OVERVIEW TAB */}
        {activeTab === "team" && isManager && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-800">
                Ekibinizdeki herkesin izin durumunu ve geçmişini buradan inceleyebilirsiniz.
              </p>
            </div>

            {myTeamNames.length > 0 ? (
              <>
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-800">Ekip İzin Karnesi</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Personel
                          </th>
                          <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Toplam Hak
                          </th>
                          <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Kullanılan
                          </th>
                          <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Kalan Bakiye
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {myTeamNames
                          .map((name) => {
                            const stats = getPersonLeaveStats(name, orgData, leaveRequests, history360);
                            return { name, ...stats };
                          })
                          .sort((a, b) => a.remaining - b.remaining)
                          .map((member, index) => {
                            const balanceColor =
                              member.remaining > 7
                                ? "text-green-600"
                                : member.remaining > 3
                                ? "text-yellow-600"
                                : "text-red-600";

                            return (
                              <tr
                                key={index}
                                className="border-b border-slate-100 hover:bg-slate-50"
                              >
                                <td className="px-3 py-2 text-sm text-slate-800 font-medium">
                                  {member.name}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className="font-mono text-sm text-slate-800">
                                    {member.totalQuota}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className="font-mono text-sm text-slate-800">
                                    {member.usedAnnual}
                    </span>
                                </td>
                                <td className={`px-3 py-2 text-right font-semibold font-mono text-sm ${balanceColor}`}>
                                  {member.remaining}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">
                      Detaylı İnceleme
                    </h3>
                    <select
                      value={selectedTeamMember}
                      onChange={(e) => setSelectedTeamMember(e.target.value)}
                      className="w-full md:w-64 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    >
                      <option value="">Personel seçin...</option>
                      {myTeamNames.map((name, idx) => (
                        <option key={`${name}-${idx}`} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>

                    {selectedTeamMember && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-3">
                          {selectedTeamMember} - İzin Geçmişi
                        </h4>
                        {(() => {
                          const stats = getPersonLeaveStats(
                            selectedTeamMember,
                            orgData,
                            leaveRequests,
                            history360
                          );
                          return stats.myRequests.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-slate-50 sticky top-0">
                                  <tr>
                                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                                      Tür
                                    </th>
                                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                                      Başlangıç
                                    </th>
                                    <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                                      Gün
                                    </th>
                                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                                      Durum
                                    </th>
                                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                                      Açıklama
                                    </th>
                                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                                      Yönetici Notu
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stats.myRequests.map((req: LeaveRequest, idx: number) => {
                                    const statusColor =
                                      req.durum === "Onaylandı"
                                        ? "bg-green-100 text-green-800"
                                        : req.durum === "Reddedildi"
                                        ? "bg-red-100 text-red-800"
                                        : req.durum === "Bekliyor" || req.durum === "Beklemede"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-slate-100 text-slate-800";

                                    return (
                                      <tr
                                        key={idx}
                                        className="border-b border-slate-100 hover:bg-slate-50"
                                      >
                                        <td className="px-3 py-2 text-sm text-slate-800">{req.tur}</td>
                                        <td className="px-3 py-2 text-sm text-slate-800">
                                          {req.baslangic || req.baslangic_tarihi || "-"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <span className="font-mono text-sm text-slate-800">
                                            {req.gun || req.gun_sayisi || 0}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor}`}
                                          >
                                            {req.durum}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-600">
                                          {req.aciklama || "-"}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-600">
                                          {req.yonetici_notu || "-"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                  </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Bu personelin geçmiş izin kaydı yok.
                            </p>
                          );
                        })()}
                  </div>
                )}
              </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <p className="text-yellow-800">Ekibinizde personel bulunamadı.</p>
              </div>
          )}
        </div>
      )}

      {/* Conflict Warning Modal */}
      {showConflictModal && conflictData && pendingApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Kritik Uyarı!</h3>
              </div>
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setConflictData(null);
                  setPendingApproval(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-700 mb-2">
                ⚠️ Bu tarihlerde <strong>{conflictData.department_total > 0 ? conflictData.department_id : "departman"}</strong> departmanının <strong>%{conflictData.conflict_ratio}</strong>'u ({conflictData.on_leave_count}/{conflictData.department_total}) zaten izinli.
              </p>
              <p className="text-sm text-red-700 font-semibold">
                Operasyon aksayabilir. Yine de onaylıyor musunuz?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setConflictData(null);
                  setPendingApproval(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (pendingApproval) {
                    proceedWithApproval(
                      pendingApproval.reqId,
                      pendingApproval.status,
                      pendingApproval.note
                    );
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Yine de Onayla
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
