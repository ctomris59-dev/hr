"use client";

import { useEffect, useState, useMemo } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS, clearAllHRData } from "../../utils/storage";
import { Users, UserPlus, CheckCircle, AlertTriangle, Key, RefreshCw, Trash2, Sparkles } from "lucide-react";
import Skeleton, { SkeletonTable } from "../../../components/ui/Skeleton";
import { ROLE_PERMISSIONS, mapToUserRole } from "../../data/roles";
import { USERS } from "../../data/users";
import { useData } from "../../../context/DataContext";
import { getManageableEmployees, extractRoleFromPosition } from "../../utils/hierarchy";
import { API_BASE_URL } from "@/lib/apiConfig";

// Department list (from jobData or static)
const DEPARTMENTS = [
  "İnsan Kaynakları",
  "Finans",
  "Teknoloji",
  "Satış",
  "Pazarlama",
  "Operasyon",
  "Yönetim",
];

// Normalize username from name
function normalizeUsername(name: string): string {
  const replacements: Record<string, string> = {
    ı: "i",
    İ: "i",
    ğ: "g",
    Ğ: "g",
    ü: "u",
    Ü: "u",
    ş: "s",
    Ş: "s",
    ö: "o",
    Ö: "o",
    ç: "c",
    Ç: "c",
    " ": "",
  };
  let normalized = name.toLowerCase();
  Object.entries(replacements).forEach(([src, dest]) => {
    normalized = normalized.replace(new RegExp(src, "g"), dest);
  });
  if (normalized.includes("(")) normalized = normalized.split("(")[0];
  return normalized.trim();
}

// Generate strong random password
function generateStrongPassword(length: number = 10): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%&*";
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = "";
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

interface NewUser {
  username: string;
  password: string;
  name: string;
  role: string;
  dept: string;
  position: string;
  department: string;
  managerId?: string;
}

export default function AdminPage() {
  const { orgData: contextOrgData } = useData();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState<NewUser>({
    username: "",
    password: "",
    name: "",
    role: "",
    dept: "",
    position: "",
    department: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"new" | "assign">("assign");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [assignPassword, setAssignPassword] = useState<string>("");
  const [assignUsername, setAssignUsername] = useState<string>("");
  const [clearing, setClearing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setUser(currentUser);

    // Load existing users
    const storedUsers = getStorageData<Record<string, any>>(STORAGE_KEYS.USERS, USERS);
    setUsers(storedUsers);
    setLoading(false);

    // Auto-fill department if user is Director or Manager
    if (currentUser && typeof currentUser === "object" && "role" in currentUser) {
      const userRole = (currentUser as any).role;
      if (userRole === "DIRECTOR" || userRole === "MANAGER") {
        setFormData((prev) => ({
          ...prev,
          dept: (currentUser as any).dept || (currentUser as any).department || "",
          department: (currentUser as any).dept || (currentUser as any).department || "",
        }));
      }
    }
  }, []);

  // Get manageable employees for user assignment (must be before conditional returns)
  // Use empty array as default to ensure consistent hook calls
  const manageableEmployees = useMemo(() => {
    if (!user || !contextOrgData || !Array.isArray(contextOrgData) || contextOrgData.length === 0) {
      return [];
    }
    try {
      return getManageableEmployees(user, contextOrgData);
    } catch (error) {
      console.error("Error getting manageable employees:", error);
      return [];
    }
  }, [user, contextOrgData]);

  // Get employees without user accounts (must be before conditional returns)
  const employeesWithoutAccounts = useMemo(() => {
    if (!Array.isArray(manageableEmployees) || manageableEmployees.length === 0) {
      return [];
    }
    try {
      const existingUserNames = new Set(
        Object.values(users)
          .map((u: any) => u?.name || "")
          .filter(Boolean)
      );
      return manageableEmployees.filter((emp) => {
        const empName = emp?.["Ad Soyad"];
        return empName && !existingUserNames.has(empName);
      });
    } catch (error) {
      console.error("Error filtering employees:", error);
      return [];
    }
  }, [manageableEmployees, users]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Skeleton className="h-5 w-1/4" />
        <div className="mt-4">
          <SkeletonTable rows={6} cols={5} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-600">Giriş yapmalısınız.</p>
      </div>
    );
  }

  const userRole = mapToUserRole(user.role);
  const permissions = ROLE_PERMISSIONS[userRole];

  // Check if user can create users
  if (permissions.canCreateRoles.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-800">Ekip Yönetimi</h1>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Sadece CEO, Direktör ve Müdürler kullanıcı oluşturabilir.
          </p>
        </div>
      </div>
    );
  }

  // Get available roles based on current user
  const availableRoles = permissions.canCreateRoles.map((role) => {
    const roleNames: Record<string, string> = {
      DIRECTOR: "Direktör",
      MANAGER: "Müdür",
      PERSONEL: "Çalışan",
    };
    return { value: role, label: roleNames[role] || role };
  });

  // Get available departments
  const availableDepartments = permissions.canAccessDepartments === "all" 
    ? DEPARTMENTS 
    : [user.dept || user.department || ""].filter(Boolean);

  // Get available managers (for assigning managerId)
  const availableManagers = Object.values(users).filter((u: any) => {
    if (userRole === "admin") {
      // CEO can assign to any Director
      return u.role === "DIRECTOR";
    } else if (userRole === "director") {
      // Director can assign to themselves
      return u.name === user.name;
    }
    return false;
  });

  // Handle employee selection for user assignment
  const handleEmployeeSelect = (employeeName: string) => {
    setSelectedEmployee(employeeName);
    const employee = manageableEmployees.find((e) => e["Ad Soyad"] === employeeName);
    if (employee) {
      // Auto-generate username
      const baseUsername = normalizeUsername(employeeName);
      // Add random 4-digit number to ensure uniqueness
      const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
      setAssignUsername(`${baseUsername}${randomSuffix}`);
      
      // Generate random password
      setAssignPassword(generateStrongPassword());
      
      // Auto-fill role based on position
      const empRole = extractRoleFromPosition(employee.Pozisyon);
      setFormData((prev) => ({
        ...prev,
        name: employeeName,
        role: empRole,
        dept: employee.Departman,
        department: employee.Departman,
        position: employee.Pozisyon,
      }));
    }
  };

  // Handle user assignment to existing employee
  const handleAssignUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedEmployee || !assignUsername || !assignPassword) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    // Check if username already exists
    if (users[assignUsername]) {
      setError("Bu kullanıcı adı zaten kullanılıyor.");
      return;
    }

    // Check if employee already has an account
    const existingUser = Object.values(users).find((u: any) => u.name === selectedEmployee);
    if (existingUser) {
      setError("Bu personel için zaten bir kullanıcı hesabı mevcut.");
      return;
    }

    setSaving(true);

    const employee = manageableEmployees.find((e) => e["Ad Soyad"] === selectedEmployee);
    if (!employee) {
      setError("Personel bulunamadı.");
      setSaving(false);
      return;
    }

    // Determine role from position
    const empRole = extractRoleFromPosition(employee.Pozisyon);
    
    // Validate role assignment based on hierarchy
    if (userRole === "admin" && empRole !== "DIRECTOR") {
      setError("CEO sadece Direktörlere kullanıcı atayabilir.");
      setSaving(false);
      return;
    }
    if (userRole === "director" && empRole !== "MANAGER") {
      setError("Direktör sadece Müdürlere kullanıcı atayabilir.");
      setSaving(false);
      return;
    }
    if (userRole === "manager" && empRole !== "PERSONEL") {
      setError("Müdür sadece Çalışanlara kullanıcı atayabilir.");
      setSaving(false);
      return;
    }

    // Create user account
    const newUser: any = {
      password: assignPassword,
      name: selectedEmployee,
      role: empRole,
      dept: employee.Departman,
      department: employee.Departman,
      position: employee.Pozisyon,
    };

    // Set managerId
    if (userRole === "director") {
      newUser.managerId = user.name;
    } else if (userRole === "manager") {
      newUser.managerId = user.name;
    }

    // Save to storage
    const updatedUsers = {
      ...users,
      [assignUsername]: newUser,
    };

    setUsers(updatedUsers);
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);

    setSuccess(`✅ ${selectedEmployee} için kullanıcı hesabı oluşturuldu! Kullanıcı Adı: ${assignUsername}, Şifre: ${assignPassword}`);
    
    // Reset form
    setSelectedEmployee("");
    setAssignUsername("");
    setAssignPassword("");

    setSaving(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!formData.username || !formData.password || !formData.name || !formData.role || !formData.dept) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    // Check if username already exists
    if (users[formData.username]) {
      setError("Bu kullanıcı adı zaten kullanılıyor.");
      return;
    }

    setSaving(true);

    // Create new user
    const newUser: any = {
      password: formData.password,
      name: formData.name,
      role: formData.role,
      dept: formData.dept,
      department: formData.dept,
      position: formData.position || `${formData.role} - ${formData.dept}`,
    };

    // Add managerId if applicable
    if (formData.managerId) {
      newUser.managerId = formData.managerId;
    } else if (userRole === "director") {
      // If Director is creating, set themselves as manager
      newUser.managerId = user.name;
    } else if (userRole === "manager") {
      // If Manager is creating, set themselves as manager
      newUser.managerId = user.name;
    }

    // Save to storage
    const updatedUsers = {
      ...users,
      [formData.username]: newUser,
    };

    setUsers(updatedUsers);
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);

    setSuccess(`✅ ${formData.name} kullanıcısı başarıyla oluşturuldu!`);
    
    // Reset form
    setFormData({
      username: "",
      password: "",
      name: "",
      role: "",
      dept: user.dept || user.department || "",
      position: "",
      department: user.dept || user.department || "",
    });

    setSaving(false);
  };

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
          signal: AbortSignal.timeout(3000)
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
        
        // Tüm sayfaları bilgilendir (dashboard dahil)
        window.dispatchEvent(new CustomEvent("dataUpdated"));
        
        // Sayfayı yenile
        alert("✅ Veriler başarıyla temizlendi! Sayfa yenileniyor...");
        window.location.reload();
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
        // LocalStorage temizleme flag'ini kaldır
        localStorage.removeItem("hr_data_cleared");
        
        // Backend'den org-chart verilerini çek ve localStorage'a kaydet
        try {
          const orgRes = await fetch(API_BASE_URL + '/api/org-chart');
          if (orgRes.ok) {
            const orgJson = await orgRes.json();
            if (orgJson.success && orgJson.data && orgJson.data.length > 0) {
              localStorage.setItem("hr_org_chart", JSON.stringify(orgJson.data));
            }
          }
        } catch (orgErr) {
          console.warn("Org chart yüklenemedi:", orgErr);
        }
        
        // Event dispatch
        window.dispatchEvent(new CustomEvent("dataUpdated"));
        
        alert(`✅ ${result.count || result.message} personel oluşturuldu! Sayfa yenileniyor...`);
        window.location.reload();
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

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <h1 className="text-xl font-semibold text-slate-800">Ekip Yönetimi</h1>
          </div>
          {/* VERİ YÖNETİMİ BUTONLARI (Sadece CEO) */}
          {user && (user.role === "CEO" || user.role === "admin") && (
            <div className="flex gap-2">
              <button 
                onClick={handleClearData}
                disabled={clearing}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearing ? (
                  <>
                      <Skeleton variant="circular" width={12} height={12} />
                    Temizleniyor...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    Verileri Temizle
                  </>
                )}
              </button>
              <button 
                onClick={handleGenerateRichDemo}
                disabled={generating}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                      <Skeleton variant="circular" width={12} height={12} />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Rich Demo
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">Kullanıcı oluşturma ve yönetimi</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-indigo-100">
        <button
          onClick={() => setActiveTab("assign")}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
            activeTab === "assign"
              ? "border-b-2 border-indigo-600 text-indigo-600 font-semibold"
              : "text-slate-600 hover:text-indigo-600"
          }`}
        >
          Mevcut Personellere Kullanıcı Atama
        </button>
        <button
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
            activeTab === "new"
              ? "border-b-2 border-indigo-600 text-indigo-600 font-semibold"
              : "text-slate-600 hover:text-indigo-600"
          }`}
        >
          Yeni Kullanıcı Oluştur
        </button>
      </div>

      {/* Tab: Mevcut Personellere Kullanıcı Atama */}
      {activeTab === "assign" && (
        <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20 p-4 hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-200">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Mevcut Personellere Kullanıcı Adı ve Şifre Atama
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Mevcut rolünüz: <strong>{user.role}</strong> - Atayabileceğiniz roller:{" "}
              <strong>{availableRoles.map((r) => r.label).join(", ")}</strong>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-800 whitespace-pre-line">{success}</p>
            </div>
          )}

          {employeesWithoutAccounts.length === 0 ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Tüm yetkili personeller için kullanıcı hesabı tanımlanmış.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAssignUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                    Personel Seç
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all duration-200"
                    required
                  >
                    <option value="">Personel seçin...</option>
                    {employeesWithoutAccounts.map((emp) => {
                      const empRole = extractRoleFromPosition(emp.Pozisyon);
                      const roleLabel = empRole === "DIRECTOR" ? "Direktör" : 
                                       empRole === "MANAGER" ? "Müdür" : "Çalışan";
                      return (
                        <option key={emp["Ad Soyad"]} value={emp["Ad Soyad"]}>
                          {emp["Ad Soyad"]} - {emp.Pozisyon} ({roleLabel})
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {employeesWithoutAccounts.length} personel için hesap oluşturulabilir
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                    Kullanıcı Adı
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assignUsername}
                      onChange={(e) => setAssignUsername(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEmployee) {
                          const baseUsername = normalizeUsername(selectedEmployee);
                          const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
                          setAssignUsername(`${baseUsername}${randomSuffix}`);
                        }
                      }}
                      className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                      title="Kullanıcı adını yeniden oluştur"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                    Şifre
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assignPassword}
                      onChange={(e) => setAssignPassword(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setAssignPassword(generateStrongPassword())}
                      className="px-3 py-2 text-xs bg-gradient-to-r from-indigo-100 to-violet-100 hover:from-indigo-200 hover:to-violet-200 text-indigo-700 rounded-lg border border-indigo-300 transition-all duration-200 active:scale-95 flex items-center gap-1 shadow-sm shadow-indigo-100/20"
                      title="Yeni rastgele şifre oluştur"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Yenile</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Güvenli rastgele şifre otomatik oluşturuldu
                  </p>
                </div>

                {selectedEmployee && (
                  <div className="md:col-span-2">
                    <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 backdrop-blur-sm border border-indigo-200 rounded-lg shadow-sm">
                      <p className="text-xs text-blue-800">
                        <strong>Seçilen Personel:</strong> {selectedEmployee}
                      </p>
                      <p className="text-xs text-blue-800 mt-1">
                        <strong>Pozisyon:</strong> {formData.position} | <strong>Departman:</strong> {formData.dept}
                      </p>
                      <p className="text-xs text-blue-800 mt-1">
                        <strong>Atanacak Rol:</strong> {availableRoles.find((r) => r.value === formData.role)?.label || formData.role}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-indigo-100">
                <button
                  type="submit"
                  disabled={saving || !selectedEmployee}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-lg shadow-indigo-500/30"
                >
                  {saving ? (
                    <>
                      <Skeleton variant="circular" width={16} height={16} />
                      <span>Atanıyor...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Kullanıcı Hesabı Ata</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab: Yeni Kullanıcı Oluştur */}
      {activeTab === "new" && (
      <div className="bg-white/80 backdrop-blur-sm border border-indigo-50 rounded-lg shadow-lg shadow-indigo-100/20 p-4 hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-200">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Yeni Kullanıcı Oluştur
          </h2>
          <p className="text-xs text-slate-600 mb-4">
            Mevcut rolünüz: <strong>{user.role}</strong> - Oluşturabileceğiniz roller:{" "}
            <strong>{availableRoles.map((r) => r.label).join(", ")}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                Şifre
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, password: generateStrongPassword() })}
                  className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300 transition-colors flex items-center gap-1"
                  title="Rastgele şifre oluştur"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rastgele</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Güvenli rastgele şifre oluşturmak için "Rastgele" butonuna tıklayın
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                Ad Soyad
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all duration-200"
                required
              >
                <option value="">Rol seçin...</option>
                {availableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                Departman
              </label>
              <select
                value={formData.dept}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dept: e.target.value,
                    department: e.target.value,
                  })
                }
                disabled={permissions.canAccessDepartments === "own"}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                required
              >
                <option value="">Departman seçin...</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {permissions.canAccessDepartments === "own" && (
                <p className="text-xs text-slate-500 mt-1">
                  Sadece kendi departmanınıza ({user.dept || user.department}) kullanıcı ekleyebilirsiniz.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                Pozisyon (Opsiyonel)
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Örn: İnsan Kaynakları Müdürü"
                className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all duration-200"
              />
            </div>

            {userRole === "admin" && availableManagers.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                  Bağlı Olduğu Yönetici (Opsiyonel)
                </label>
                <select
                  value={formData.managerId || ""}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all duration-200"
                >
                  <option value="">Yönetici seçin...</option>
                  {availableManagers.map((mgr: any, idx: number) => (
                    <option key={`${mgr.name}-${idx}`} value={mgr.name}>
                      {mgr.name} ({mgr.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-lg shadow-indigo-500/30"
            >
              {saving ? (
                <>
                  <Skeleton variant="circular" width={16} height={16} />
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Kullanıcı Oluştur</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}

