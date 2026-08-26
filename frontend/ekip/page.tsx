"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Shield, UserPlus, Search, Filter, MoreHorizontal, 
  Mail, Phone, Loader2, Briefcase, Lock, Trash2, Sparkles
} from 'lucide-react';
import { clearAllHRData } from '../app/utils/storage';
import { API_BASE_URL } from "@/lib/apiConfig";

export default function EkipYonetimiPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tümü");
  const [currentUserRole, setCurrentUserRole] = useState("EMPLOYEE");
  const [clearing, setClearing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // --- VERİ ÇEKME ---
  useEffect(() => {
    // Önce kullanıcı rolünü yükle (her zaman)
    const storedUser = localStorage.getItem("hr_current_user") || localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
        setCurrentUserRole(parsed.role || "CEO");
      } catch (e) {
        try {
          const parsed = JSON.parse(storedUser);
          setCurrentUserRole(parsed.role || "CEO");
        } catch (e2) {
          setCurrentUserRole("CEO");
        }
      }
    } else {
      setCurrentUserRole("CEO");
    }
    
    async function fetchData() {
      // Verilerin temizlenip temizlenmediğini kontrol et
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      if (dataCleared) {
        console.log("[Ekip Page] Veriler temizlenmiş, fetchData atlanıyor");
        setEmployees([]);
        setLoading(false);
        return; // Backend'den veri çekme
      }
      
      let userRole = "CEO";
      let userDept = "Yönetim";

      if (storedUser) {
        try {
          const parsed = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
          userRole = parsed.role || parsed.role;
          userDept = parsed.department || parsed.dept;
        } catch (e) {
          // Fallback: Direkt parse etmeyi dene
          try {
            const parsed = JSON.parse(storedUser);
            userRole = parsed.role || "CEO";
            userDept = parsed.department || parsed.dept || "Yönetim";
          } catch (e2) {}
        }
      }

      try {
        // Build query params with RBAC filtering
        const params = new URLSearchParams();
        if (userRole) params.append('user_role', userRole);
        if (userDept) params.append('user_dept', userDept);
        const storedUser = localStorage.getItem("hr_current_user") || localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsed = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
            if (parsed.name) params.append('user_name', parsed.name);
          } catch (e) {}
        }
        
        const res = await fetch(`${API_BASE_URL}/api/talent-matrix?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const talentData = Array.isArray(json.data) ? json.data : [];
          setEmployees(talentData);
          
          // Eğer veri boşsa, localStorage'dan da temizle
          if (talentData.length === 0) {
            localStorage.setItem("hr_data_cleared", "true");
          } else {
            // Aynı zamanda org-chart verilerini de çek ve localStorage'a kaydet
            try {
              const orgParams = new URLSearchParams();
              if (userRole) orgParams.append('user_role', userRole);
              if (userDept) orgParams.append('user_dept', userDept);
              orgParams.append('_t', Date.now().toString()); // Cache busting
              
              const orgRes = await fetch(`${API_BASE_URL}/api/org-chart?${orgParams.toString()}`);
              if (orgRes.ok) {
                const orgJson = await orgRes.json();
                if (orgJson.success && orgJson.data && orgJson.data.length > 0) {
                  // localStorage'a kaydet
                  localStorage.setItem("hr_org_chart", JSON.stringify(orgJson.data));
                  localStorage.removeItem("hr_data_cleared"); // Flag'i kaldır
                  // Event dispatch
                  window.dispatchEvent(new CustomEvent("dataUpdated"));
                }
              }
            } catch (orgErr) {
              console.warn("Org chart yüklenemedi:", orgErr);
            }
          }
        }
      } catch (err) {
        console.error("Veri hatası:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    
    // Storage event listener - veriler temizlendiğinde veya güncellendiğinde
    const handleStorageCleared = () => {
      setEmployees([]);
    };
    
    const handleDataUpdated = () => {
      // Veri güncellendiğinde yeniden çek - AMA sadece data_cleared flag'i yoksa
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      if (!dataCleared) {
        fetchData();
      }
    };
    
    window.addEventListener("storageCleared", handleStorageCleared);
    window.addEventListener("dataUpdated", handleDataUpdated);
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
      window.removeEventListener("dataUpdated", handleDataUpdated);
    };
  }, []);

  // --- FİLTRELEME ---
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "Tümü" ? true : emp.position.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  // --- VERİ TEMİZLEME ---
  const handleClearData = async () => {
    if (!confirm("⚠️ Tüm verileri temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz!")) {
      return;
    }

    setClearing(true);
    try {
      // Backend sağlık kontrolü
      try {
        const healthCheck = await fetch(API_BASE_URL + "/api/health", {
          signal: AbortSignal.timeout(3000) // 3 saniye timeout
        });
        if (!healthCheck.ok) {
          throw new Error("Backend çalışmıyor!");
        }
      } catch (healthErr: any) {
        const errorMsg = healthErr.name === 'AbortError' 
          ? "Backend'e bağlanılamıyor (timeout)"
          : "Backend çalışmıyor";
        alert(`❌ ${errorMsg}!\n\nBackend'i başlatmak için:\n1. Terminal'de "cd backend" yazın\n2. "START_BACKEND.bat" dosyasını çalıştırın\nveya\n3. "python main.py" komutunu çalıştırın\n\nBackend http://127.0.0.1:8000 adresinde çalışmalı.`);
        console.error("Backend health check failed:", healthErr);
        setClearing(false);
        return;
      }
      
      const response = await fetch(API_BASE_URL + "/api/admin/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Merkezi temizleme fonksiyonunu kullan
        clearAllHRData();
        
        // Employees state'ini de temizle
        setEmployees([]);
        
        // Loading state'ini false yap
        setLoading(false);
        
        alert("✅ Veriler başarıyla temizlendi!");
      } else {
        alert(`❌ Hata: ${result.error || "Bilinmeyen hata"}`);
      }
    } catch (error) {
      console.error("Veri temizleme hatası:", error);
      alert("❌ Veri temizleme sırasında bir hata oluştu.");
    } finally {
      setClearing(false);
    }
  };

  // --- RICH DEMO OLUŞTURMA ---
  const handleGenerateRichDemo = async () => {
    if (!confirm("🚀 Rich demo verisi oluşturulacak. Devam etmek istiyor musunuz?")) {
      return;
    }

    setGenerating(true);
    try {
      // Önce backend'in çalışıp çalışmadığını kontrol et
      try {
        const healthCheck = await fetch(API_BASE_URL + "/api/health", {
          signal: AbortSignal.timeout(3000) // 3 saniye timeout
        });
        if (!healthCheck.ok) {
          throw new Error("Backend çalışmıyor!");
        }
      } catch (healthErr: any) {
        const errorMsg = healthErr.name === 'AbortError' 
          ? "Backend'e bağlanılamıyor (timeout)"
          : "Backend çalışmıyor";
        alert(`❌ ${errorMsg}!\n\nBackend'i başlatmak için:\n1. Terminal'de "cd backend" yazın\n2. "START_BACKEND.bat" dosyasını çalıştırın\nveya\n3. "python main.py" komutunu çalıştırın\n\nBackend http://127.0.0.1:8000 adresinde çalışmalı.`);
        console.error("Backend health check failed:", healthErr);
        setGenerating(false);
        return;
      }
      
      const response = await fetch(API_BASE_URL + "/api/admin/generate-rich-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Rich Demo Response:", result);
      
      if (result.success) {
        // LocalStorage'daki TÜM eski verileri temizle (yeni veri backend'den gelecek)
        localStorage.removeItem("hr_data_cleared");
        localStorage.removeItem("hr_org_chart");
        localStorage.removeItem("hr_talent_matrix");
        // DataContext'in kullandığı storage key'lerini de temizle
        localStorage.removeItem("hr_org_chart_data");
        localStorage.removeItem("hr_360_data");
        
        // Kısa bir bekleme (backend'in dosyayı yazması için)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Backend'den yeni org-chart verilerini çek
        try {
          const orgRes = await fetch(`${API_BASE_URL}/api/org-chart?_t=${Date.now()}`);
          if (orgRes.ok) {
            const orgJson = await orgRes.json();
            if (orgJson.success && orgJson.data && orgJson.data.length > 0) {
              localStorage.setItem("hr_org_chart", JSON.stringify(orgJson.data));
              console.log(`✅ ${orgJson.data.length} personel org-chart'a yüklendi`);
            } else {
              console.warn("Org chart boş döndü:", orgJson);
            }
          }
        } catch (orgErr) {
          console.warn("Org chart yüklenemedi:", orgErr);
        }
        
        // Backend'den yeni talent-matrix verilerini çek
        try {
          const storedUser = localStorage.getItem("hr_current_user") || localStorage.getItem("user");
          let userRole = "CEO";
          let userDept = "Yönetim";
          if (storedUser) {
            try {
              const parsed = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
              userRole = parsed.role || "CEO";
              userDept = parsed.department || parsed.dept || "Yönetim";
            } catch (e) {}
          }
          
          const params = new URLSearchParams();
          if (userRole) params.append('user_role', userRole);
          if (userDept) params.append('user_dept', userDept);
          params.append('_t', Date.now().toString()); // Cache busting
          
          const talentRes = await fetch(`${API_BASE_URL}/api/talent-matrix?${params.toString()}`);
          if (talentRes.ok) {
            const talentJson = await talentRes.json();
            console.log("Talent Matrix Response:", talentJson);
            if (talentJson.success && talentJson.data) {
              if (talentJson.data.length > 0) {
                localStorage.setItem("hr_talent_matrix", JSON.stringify(talentJson.data));
                console.log(`✅ ${talentJson.data.length} personel talent-matrix'e yüklendi`);
              } else {
                console.warn("Talent matrix boş döndü - backend'de veri yok olabilir");
              }
            }
          }
        } catch (talentErr) {
          console.warn("Talent matrix yüklenemedi:", talentErr);
        }
        
        // Event dispatch
        window.dispatchEvent(new CustomEvent("dataUpdated"));
        
        alert(`✅ ${result.count || result.message} personel oluşturuldu! Sayfa yenileniyor...`);
        // Hard reload - cache'i bypass et
        window.location.href = window.location.href;
      } else {
        const errorMsg = result.error || "Bilinmeyen hata";
        const errorType = result.error_type ? ` (${result.error_type})` : "";
        const traceback = result.traceback ? `\n\nDetay:\n${result.traceback.substring(0, 500)}` : "";
        console.error("Rich Demo Hatası:", result);
        alert(`❌ Hata${errorType}: ${errorMsg}${traceback}`);
      }
    } catch (error) {
      console.error("Demo oluşturma hatası:", error);
      alert("❌ Demo verisi oluşturulurken bir hata oluştu.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600"/>
    </div>
  );

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" /> Ekip ve Kullanıcı Yönetimi
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Toplam <strong>{employees.length}</strong> çalışan listeleniyor.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
            {/* YETKİ BUTONU (Sadece CEO Görür) */}
            {currentUserRole === "CEO" && (
                <Link 
                    href="/ayarlar/roller" 
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 font-bold transition-all shadow-sm"
                >
                    <Shield className="w-4 h-4" />
                    Rol ve Yetkileri Yönet
                </Link>
            )}

            {/* VERİ TEMİZLEME BUTONU */}
            <button 
                    onClick={handleClearData}
                    disabled={clearing}
                    className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl hover:bg-red-100 hover:border-red-300 font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {clearing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Temizleniyor...</span>
                        </>
                    ) : (
                        <>
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Verileri Temizle</span>
                        </>
                    )}
                </button>

            {/* RICH DEMO BUTONU */}
            <button 
                    onClick={handleGenerateRichDemo}
                    disabled={generating}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 font-bold shadow-lg shadow-purple-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Oluşturuluyor...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">Rich Demo Oluştur</span>
                        </>
                    )}
                </button>

            <button className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Yeni Personel Ekle</span>
            </button>
        </div>
      </div>

      {/* FİLTRE ALANI */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
            <input 
                type="text" 
                placeholder="İsim veya pozisyon ara..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="relative w-full md:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <select 
                className="w-full pl-10 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none cursor-pointer"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
            >
                <option value="Tümü">Tüm Pozisyonlar</option>
                <option value="Direktör">Sadece Direktörler</option>
                <option value="Müdür">Sadece Müdürler</option>
                <option value="Uzman">Sadece Uzmanlar</option>
            </select>
        </div>
      </div>

      {/* TABLO */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-5 font-bold text-slate-500 text-xs uppercase pl-8">Personel</th>
                        <th className="p-5 font-bold text-slate-500 text-xs uppercase">Departman & Pozisyon</th>
                        <th className="p-5 font-bold text-slate-500 text-xs uppercase">İletişim</th>
                        <th className="p-5 font-bold text-slate-500 text-xs uppercase text-center">Durum</th>
                        <th className="p-5 text-right pr-8">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="p-5 pl-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border border-slate-200">
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{emp.name}</div>
                                        <div className="text-xs text-slate-400 font-mono">ID: #{emp.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5">
                                <div className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400"/> {emp.position}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">{emp.department}</div>
                            </td>
                            <td className="p-5">
                                <div className="text-sm text-slate-500 flex flex-col gap-1">
                                    <span className="flex items-center gap-2"><Mail className="w-3 h-3"/> {emp.email}</span>
                                    <span className="flex items-center gap-2"><Phone className="w-3 h-3"/> {emp.phone}</span>
                                </div>
                            </td>
                            <td className="p-5 text-center">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center gap-1 w-fit mx-auto">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Aktif
                                </span>
                            </td>
                            <td className="p-5 text-right pr-8">
                                <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                                    <MoreHorizontal className="w-5 h-5"/>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}