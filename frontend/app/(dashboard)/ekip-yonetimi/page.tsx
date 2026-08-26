"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, Shield, UserPlus, Search, Filter, MoreHorizontal, 
  Mail, Phone, Briefcase, Trash2, Sparkles, RefreshCw,
  Key, UserCheck, X, CheckCircle, Copy
} from 'lucide-react';
import { clearAllHRData, getStorageData, setStorageData, STORAGE_KEYS } from '../../utils/storage';
import { getManageableEmployees, extractRoleFromPosition } from '../../utils/hierarchy';
import { USERS } from '../../data/users';
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import { API_BASE_URL } from "@/lib/apiConfig";

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "-";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
};

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function EkipYonetimiPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tümü");
  const [currentUserRole, setCurrentUserRole] = useState("EMPLOYEE");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clearing, setClearing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [users, setUsers] = useState<Record<string, any>>({});
  
  // Kullanıcı atama modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [assignUsername, setAssignUsername] = useState("");
  const [assignPassword, setAssignPassword] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  
  // Yeni personel modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState("");
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    department: "",
    position: "",
    salary: "",
  });

  // --- VERİ ÇEKME ---
  useEffect(() => {
    // STRICT ACCESS CONTROL: CEO, Direktör ve Müdürler erişebilir
    const storedUser = localStorage.getItem("hr_current_user") || localStorage.getItem("user");
    let userRole = "EMPLOYEE";
    let parsedUser: any = null;
    
    if (storedUser) {
      try {
        parsedUser = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
        userRole = parsedUser.role || "EMPLOYEE";
        setCurrentUserRole(userRole);
        setCurrentUser(parsedUser);
      } catch (e) {
        try {
          parsedUser = JSON.parse(storedUser);
          userRole = parsedUser.role || "EMPLOYEE";
          setCurrentUserRole(userRole);
          setCurrentUser(parsedUser);
        } catch (e2) {
          setCurrentUserRole("EMPLOYEE");
        }
      }
    } else {
      setCurrentUserRole("EMPLOYEE");
    }
    
    // Block access if not CEO, DIRECTOR, or MANAGER
    if (userRole !== "CEO" && userRole !== "IK" && userRole !== "DIRECTOR" && userRole !== "MANAGER") {
      alert("Bu sayfaya erişim yetkiniz yok. Ekip Yönetimi sadece CEO, Direktör ve Müdürler için erişilebilir.");
      window.location.href = "/dashboard";
      return;
    }
    
    // Load users
    const storedUsers = getStorageData<Record<string, any>>(STORAGE_KEYS.USERS, USERS);
    setUsers(storedUsers);
    
    async function fetchData() {
      // Verilerin temizlenip temizlenmediğini kontrol et
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      
      let userRole = "CEO";
      let userDept = "Yönetim";
      let userName = "";

      if (storedUser) {
        try {
          const parsed = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
          userRole = parsed.role || parsed.role;
          userDept = parsed.department || parsed.dept;
          userName = parsed.name || parsed.userName || "";
        } catch (e) {
          // Fallback: Direkt parse etmeyi dene
          try {
            const parsed = JSON.parse(storedUser);
            userRole = parsed.role || "CEO";
            userDept = parsed.department || parsed.dept || "Yönetim";
            userName = parsed.name || parsed.userName || "";
          } catch (e2) {}
        }
      }

      try {
        // Backend'den veri çek (cache-busting için timestamp ekle)
        const params = new URLSearchParams();
        params.append('user_role', userRole);
        params.append('user_dept', userDept);
        if (userName) {
          params.append('user_name', userName);
        }
        params.append('_t', Date.now().toString()); // Cache busting
        
        const res = await fetch(
          `/api/talent-matrix?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (res.ok) {
          try {
            // Content-Type kontrolü
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              console.warn('[Ekip Yönetimi] Response JSON değil:', contentType);
              setEmployees([]);
              return;
            }
            
            const json = await res.json();
            const talentData = Array.isArray(json.data) ? json.data : [];
            console.log(`[Ekip Yönetimi] Backend'den ${talentData.length} personel geldi`);
            setEmployees(talentData);
            if (dataCleared && talentData.length > 0) {
              localStorage.removeItem("hr_data_cleared");
            }

            // Aynı zamanda org-chart verilerini de çek ve localStorage'a kaydet
            try {
              const orgParams = new URLSearchParams();
              orgParams.append('user_role', userRole);
              orgParams.append('user_dept', userDept);
              if (userName) {
                orgParams.append('user_name', userName);
              }
              orgParams.append('_t', Date.now().toString()); // Cache busting
              
              const orgRes = await fetch(`/api/org-chart?${orgParams.toString()}`);
              if (orgRes.ok) {
                const orgContentType = orgRes.headers.get('content-type');
                if (orgContentType && orgContentType.includes('application/json')) {
                  const orgJson = await orgRes.json();
                  if (orgJson.success && orgJson.data && orgJson.data.length > 0) {
                    // localStorage'a kaydet
                    localStorage.setItem("hr_org_chart", JSON.stringify(orgJson.data));
                    setOrgData(orgJson.data); // State'e de kaydet
                    localStorage.removeItem("hr_data_cleared"); // Flag'i kaldır
                    // Event dispatch
                    window.dispatchEvent(new CustomEvent("dataUpdated"));
                  }
                }
              }
            } catch (orgErr) {
              console.warn("Org chart yüklenemedi:", orgErr);
            }
          } catch (jsonError) {
            console.error('[Ekip Yönetimi] JSON parse hatası:', jsonError);
            setEmployees([]);
            // Backend çalışmıyor olabilir veya hata döndürmüş olabilir
            const text = await res.text();
            console.error('[Ekip Yönetimi] Response body:', text);
          }
        } else {
          // Response OK değilse
          let errorDetails = "";
          try {
            const errorJson = await res.json();
            errorDetails = errorJson.error || errorJson.details || "";
            console.error(`[Ekip Yönetimi] Backend hatası: ${res.status} ${res.statusText}`, errorJson);
          } catch (e) {
            const errorText = await res.text().catch(() => "");
            errorDetails = errorText;
            console.error(`[Ekip Yönetimi] Backend hatası: ${res.status} ${res.statusText}`, errorText);
          }
          
          // Show user-friendly error message
          if (res.status === 502) {
            alert(`❌ Backend bağlantı hatası!\n\nBackend servisi çalışmıyor olabilir.\nLütfen backend'in çalıştığından emin olun.\n\nHata: ${errorDetails || "Backend'e ulaşılamıyor"}`);
          } else {
            console.error(`[Ekip Yönetimi] Backend hatası: ${res.status} ${res.statusText}`);
          }
          setEmployees([]);
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    
    // Storage event listener - veriler temizlendiğinde veya güncellendiğinde
    const handleStorageCleared = () => {
      console.log("[Ekip Yönetimi] storageCleared event alındı, tüm state'ler temizleniyor");
      // TÜM state'leri temizle
      setEmployees([]);
      setUsers({});
      setOrgData([]);
      setLoading(false);
      // Storage'dan da kontrol et
      const storedUsers = getStorageData<Record<string, any>>(STORAGE_KEYS.USERS, {});
      if (Object.keys(storedUsers).length === 0) {
        setUsers({});
      }
    };
    
    const handleDataUpdated = () => {
      // Veri güncellendiğinde yeniden çek - AMA sadece data_cleared flag'i yoksa
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      if (dataCleared) {
        // Veriler temizlendi, state'leri sıfırla
        setEmployees([]);
        setUsers({});
        setOrgData([]);
        setLoading(false);
      } else {
        // Veriler güncellendi, yeniden yükle
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

  // Org-chart verilerini localStorage'dan yükle
  useEffect(() => {
    const storedOrg = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    if (storedOrg.length > 0 && orgData.length === 0) {
      setOrgData(storedOrg);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldOpen = sessionStorage.getItem("openAddEmployeeModal");
    if (shouldOpen === "true") {
      sessionStorage.removeItem("openAddEmployeeModal");
      handleOpenAddModal();
    }
  }, []);

  // Yönetilebilir personelleri hesapla (hiyerarşi kurallarına göre)
  const manageableEmployees = useMemo(() => {
    if (!currentUser || !orgData.length) {
      console.log("[Ekip Yönetimi] manageableEmployees boş - currentUser:", currentUser, "orgData length:", orgData.length);
      return [];
    }
    const manageable = getManageableEmployees(currentUser, orgData);
    console.log(`[Ekip Yönetimi] ${currentUser.role} için ${manageable.length} yönetilebilir personel bulundu:`, manageable.map(e => e["Ad Soyad"]));
    return manageable;
  }, [currentUser, orgData]);

  // --- FİLTRELEME ---
  // Önce yönetilebilir personelleri belirle (hiyerarşi kurallarına göre)
  const manageableEmployeeNames = useMemo(() => {
    const names = new Set(manageableEmployees.map(emp => emp["Ad Soyad"]));
    console.log("[Ekip Yönetimi] Yönetilebilir personel isimleri:", Array.from(names));
    return names;
  }, [manageableEmployees]);

  // Sadece yönetilebilir personelleri göster ve filtrele
  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter(emp => {
      // Önce hiyerarşi kontrolü: Bu personel yönetilebilir mi?
      const isManageable = manageableEmployeeNames.has(emp.name);
      if (!isManageable) {
        return false;
      }
      
      // Sonra arama ve rol filtresi
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "Tümü" ? true : emp.position.includes(roleFilter);
      return matchesSearch && matchesRole;
    }).map(emp => {
      const orgEntry = orgData.find((e: any) => e["Ad Soyad"] === emp.name);
      const managerName =
        orgEntry?.["Yönetici 1"] ||
        orgEntry?.["Yönetici 2"] ||
        orgEntry?.Yönetici ||
        "-";
      return { ...emp, managerName };
    });
    console.log(`[Ekip Yönetimi] ${employees.length} personel arasından ${filtered.length} yönetilebilir personel gösteriliyor`);
    return filtered;
  }, [employees, manageableEmployeeNames, searchTerm, roleFilter, orgData]);

  // Rastgele şifre oluştur
  const generateRandomPassword = (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Kullanıcı atama modal'ını aç
  const handleOpenAssignModal = (emp: any) => {
    // Hiyerarşi kontrolü - Bu personel yönetilebilir mi?
    const empInOrg = orgData.find((e: any) => e["Ad Soyad"] === emp.name);
    if (!empInOrg) {
      alert("Bu personel organizasyon şemasında bulunamadı.");
      return;
    }

    const manageable = manageableEmployees.find((e: any) => e["Ad Soyad"] === emp.name);
    if (!manageable) {
      const empRole = extractRoleFromPosition(emp.position);
      let errorMsg = "";
      if (currentUserRole === "CEO" || currentUserRole === "IK") {
        errorMsg = "CEO sadece Direktörlere kullanıcı atayabilir.";
      } else if (currentUserRole === "DIRECTOR") {
        errorMsg = "Direktör sadece kendi departmanındaki Müdürlere kullanıcı atayabilir.";
      } else if (currentUserRole === "MANAGER") {
        errorMsg = "Müdür sadece kendi departmanındaki Çalışanlara kullanıcı atayabilir.";
      } else {
        errorMsg = "Bu personel için kullanıcı atama yetkiniz yok.";
      }
      alert(errorMsg);
      return;
    }

    // Zaten kullanıcı hesabı var mı kontrol et
    const existingUser = Object.values(users).find((u: any) => u.name === emp.name);
    if (existingUser) {
      const existingUsername = Object.keys(users).find(key => users[key].name === emp.name);
      alert(`Bu personel için zaten bir kullanıcı hesabı mevcut.\nKullanıcı Adı: ${existingUsername}`);
      return;
    }

    // Modal'ı aç
    setSelectedEmployee(emp);
    setAssignUsername(emp.name.toLowerCase().replace(/\s+/g, '.').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c'));
    setAssignPassword(generateRandomPassword(10));
    setAssignError("");
    setAssignSuccess("");
    setShowAssignModal(true);
  };

  // Kullanıcı atama işlemini tamamla
  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError("");
    setAssignSuccess("");

    if (!selectedEmployee || !assignUsername || !assignPassword) {
      setAssignError("Lütfen tüm alanları doldurun.");
      return;
    }

    // Kullanıcı adı kontrolü
    if (users[assignUsername]) {
      setAssignError("Bu kullanıcı adı zaten kullanılıyor.");
      return;
    }

    // Personel organizasyon şemasında var mı?
    const empInOrg = orgData.find((e: any) => e["Ad Soyad"] === selectedEmployee.name);
    if (!empInOrg) {
      setAssignError("Personel organizasyon şemasında bulunamadı.");
      return;
    }

    // Hiyerarşi kontrolü
    const empRole = extractRoleFromPosition(selectedEmployee.position);
    const empPosition = (empInOrg.Pozisyon || selectedEmployee.position || "").toLowerCase();
    
    if (currentUserRole === "CEO" || currentUserRole === "IK") {
      // CEO: Sadece Direktör ve Genel Müdürlere atama yapabilir
      const isDirector = empRole === "DIRECTOR";
      const isGenelMudur = empPosition.includes("genel müdür");
      
      if (!isDirector && !isGenelMudur) {
        setAssignError("CEO sadece Direktör ve Genel Müdürlere kullanıcı atayabilir.");
        return;
      }
    } else if (currentUserRole === "DIRECTOR") {
      // Direktör: Sadece kendi departmanındaki Müdürlere atama yapabilir
      if (empRole !== "MANAGER") {
        setAssignError("Direktör sadece kendi departmanındaki Müdürlere kullanıcı atayabilir.");
        return;
      }
      // Aynı departmanda mı kontrol et
      const userDept = currentUser.dept || currentUser.department || "";
      if (empInOrg.Departman !== userDept) {
        setAssignError("Direktör sadece kendi departmanındaki Müdürlere kullanıcı atayabilir.");
        return;
      }
      // Genel Müdür'e atama yapamaz
      if (empPosition.includes("genel müdür")) {
        setAssignError("Direktör Genel Müdürlere kullanıcı atayamaz.");
        return;
      }
    } else if (currentUserRole === "MANAGER") {
      // Müdür: Sadece kendi departmanındaki çalışanlara (PERSONEL rolü) atama yapabilir
      if (empRole !== "PERSONEL") {
        setAssignError("Müdür sadece kendi departmanındaki çalışanlara kullanıcı atayabilir.");
        return;
      }
      // Aynı departmanda mı kontrol et
      const userDept = currentUser.dept || currentUser.department || "";
      if (empInOrg.Departman !== userDept) {
        setAssignError("Müdür sadece kendi departmanındaki çalışanlara kullanıcı atayabilir.");
        return;
      }
      // Yönetici kontrolü: Bu çalışan bu müdürün altında mı?
      const yonetici1 = empInOrg["Yönetici 1"] || "";
      const yonetici2 = empInOrg["Yönetici 2"] || "";
      const currentUserName = currentUser.name || "";
      
      if (yonetici1 !== currentUserName && yonetici2 !== currentUserName) {
        setAssignError("Bu çalışan sizin ekibinizde değil. Müdür sadece kendi ekibindeki çalışanlara kullanıcı atayabilir.");
        return;
      }
    }

    // Kullanıcı hesabı oluştur
    const newUser: any = {
      password: assignPassword,
      name: selectedEmployee.name,
      role: empRole,
      dept: empInOrg.Departman,
      department: empInOrg.Departman,
      position: empInOrg.Pozisyon || selectedEmployee.position,
    };

    // Manager ID ekle
    if (currentUserRole === "DIRECTOR" || currentUserRole === "MANAGER") {
      newUser.managerId = currentUser.name;
    }

    // Storage'a kaydet
    const updatedUsers = {
      ...users,
      [assignUsername]: newUser,
    };

    setUsers(updatedUsers);
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);

    setAssignSuccess(`✅ ${selectedEmployee.name} için kullanıcı hesabı oluşturuldu!`);
    
    // 2 saniye sonra modal'ı kapat
    setTimeout(() => {
      setShowAssignModal(false);
      setSelectedEmployee(null);
      setAssignUsername("");
      setAssignPassword("");
      setAssignSuccess("");
    }, 2000);
  };

  // Şifreyi kopyala
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(assignPassword);
    alert("Şifre panoya kopyalandı!");
  };

  const rowCellClass =
    "bg-white px-4 py-4 align-middle shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5 border border-transparent group-hover:border-blue-200";

  const handleOpenAddModal = () => {
    setAddError("");
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddError("");
    setNewEmployee({
      firstName: "",
      lastName: "",
      department: "",
      position: "",
      salary: "",
    });
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const firstName = newEmployee.firstName.trim();
    const lastName = newEmployee.lastName.trim();
    const department = newEmployee.department.trim();
    const position = newEmployee.position.trim();
    const salaryValue = Number(String(newEmployee.salary).replace(/[^\d]/g, ""));

    if (!firstName || !lastName || !department || !position || !salaryValue) {
      setAddError("Lütfen tüm alanları doldurun.");
      return;
    }

    const fullName = `${firstName} ${lastName}`;
    const exists = orgData.some((e: any) => e["Ad Soyad"] === fullName);
    if (exists) {
      setAddError("Bu isimle bir personel zaten mevcut.");
      return;
    }

    const managerName =
      currentUserRole === "MANAGER"
        ? currentUser?.name || currentUser?.userName || "-"
        : "-";

    const newOrgEntry = {
      "Ad Soyad": fullName,
      Departman: department,
      Pozisyon: position,
      "Maaş (TL)": salaryValue,
      "Yönetici 1": managerName,
      "Yönetici 2": "-",
    };

    const updatedOrg = [...orgData, newOrgEntry];
    setOrgData(updatedOrg);
    setStorageData(STORAGE_KEYS.ORG_CHART, updatedOrg);

    const newEmpRow = {
      id: Date.now(),
      name: fullName,
      position,
      department,
    };
    setEmployees((prev) => [...prev, newEmpRow]);

    window.dispatchEvent(new CustomEvent("dataUpdated"));
    handleCloseAddModal();
  };

  // Personel için kullanıcı hesabı var mı kontrol et
  const hasUserAccount = (empName: string): boolean => {
    return Object.values(users).some((u: any) => u.name === empName);
  };

  // Personel için kullanıcı adını bul
  const getUserAccount = (empName: string): string | null => {
    const userEntry = Object.entries(users).find(([_, u]: [string, any]) => u.name === empName);
    return userEntry ? userEntry[0] : null;
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
        // Önce tüm state'leri temizle
        setEmployees([]);
        setUsers({});
        setOrgData([]);
        
        // Sonra merkezi temizleme fonksiyonunu kullan (bu storageCleared event'ini dispatch edecek)
        clearAllHRData();
        
        // Tüm sayfaları bilgilendir (dashboard dahil) - storageCleared'den sonra
        window.dispatchEvent(new CustomEvent("dataUpdated"));
        
        // Flag'i kontrol et ve tüm sayfaları zorla yenile
        localStorage.setItem("hr_data_cleared", "true");
        
        // Kısa bir gecikmeden sonra sayfayı yenile (tüm modüllerin güncellenmesi için)
        setTimeout(() => {
          alert("✅ Veriler başarıyla temizlendi! Sayfa yenileniyor...");
          // Tüm açık sekmelere bildir
          window.dispatchEvent(new CustomEvent("storageCleared"));
          window.location.reload();
        }, 300);
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
        const healthCheck = await fetch("/api/health", {
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
      
      const response = await fetch("/api/admin/generate-rich-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      let result;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === "") {
          throw new Error("Empty response from server");
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error("Invalid response format from server");
      }
      
      console.log("Rich Demo Response:", result);
      
      if (result && result.success) {
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
        // Handle error response
        const errorMsg = result?.error || result?.message || "Bilinmeyen hata";
        const errorType = result?.error_type ? ` (${result.error_type})` : "";
        const traceback = result?.traceback ? `\n\nDetay:\n${result.traceback.substring(0, 500)}` : "";
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
      <div className="w-full max-w-3xl bg-white rounded-2xl p-8 shadow-sm">
        <div className="mb-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4 mt-3" />
        </div>
        <SkeletonTable rows={6} cols={5} />
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* --- HEADER --- */}
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
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {clearing ? (
                        <>
                            <Skeleton variant="circular" width={16} height={16} />
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
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generating ? (
                        <>
                            <Skeleton variant="circular" width={16} height={16} />
                            <span className="hidden sm:inline">Oluşturuluyor...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">Rich Demo Oluştur</span>
                        </>
                    )}
                </button>

            <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
            >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Yeni Personel Ekle</span>
            </button>
        </div>
      </div>

      {/* --- FİLTRE ÇUBUĞU --- */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
            <input 
                type="text" 
                placeholder="İsim veya pozisyon ara..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700 font-medium transition-all focus:border-indigo-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="relative w-full md:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <select 
                className="w-full pl-10 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none cursor-pointer appearance-none hover:border-slate-300"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
            >
                <option value="Tümü">Tüm Pozisyonlar</option>
                <option value="Direktör">Sadece Direktörler</option>
                <option value="Müdür">Sadece Müdürler</option>
                <option value="Uzman">Sadece Uzmanlar</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
      </div>

      {/* --- TABLO --- */}
      <div className="bg-slate-50/60 rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
        {filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                        <tr>
                            <th className="p-4 pl-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Personel</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Departman & Pozisyon</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">İletişim</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Yönetici</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Durum</th>
                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right pr-6">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map((emp) => (
                            <tr key={emp.id} className="group">
                                {/* İSİM & AVATAR */}
                                <td className={`${rowCellClass} pl-6 rounded-l-xl`}>
                                    <div className="flex items-center gap-4">
                                        {emp.photo || emp.avatar || emp.image ? (
                                            <img
                                                src={emp.photo || emp.avatar || emp.image}
                                                alt={emp.name}
                                                className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                                            />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-slate-700 font-semibold text-sm shadow-sm ${getAvatarColor(emp.name)} ring-2 ring-white`}>
                                                {getInitials(emp.name)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-slate-800 text-base">{emp.name}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">ID: #{1000 + emp.id}</div>
                                        </div>
                                    </div>
                                </td>

                                {/* DEPARTMAN */}
                                <td className={rowCellClass}>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400"/>
                                            {emp.position}
                                        </div>
                                        <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit">
                                            {emp.department}
                                        </div>
                                    </div>
                                </td>

                                {/* İLETİŞİM (MOCK) */}
                                <td className={rowCellClass}>
                                    <div className="flex flex-col gap-1 text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 opacity-50"/>
                                            <span className="truncate max-w-[150px]">{emp.name.toLowerCase().replace(/ /g, '.')}@futurehr.com</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 opacity-50"/>
                                            <span>+90 532 555 00 {emp.id < 10 ? `0${emp.id}` : emp.id}</span>
                                        </div>
                                    </div>
                                </td>

                                {/* YÖNETİCİ */}
                                <td className={rowCellClass}>
                                    <span className="text-xs text-slate-700 font-medium">
                                        {emp.managerName || "-"}
                                    </span>
                                </td>

                                {/* DURUM & KULLANICI HESABI */}
                                <td className={`${rowCellClass} text-center`}>
                                    <div className="flex flex-col gap-2 items-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            Aktif
                                        </span>
                                        {hasUserAccount(emp.name) ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                <UserCheck className="w-3 h-3" />
                                                Hesap: {getUserAccount(emp.name)}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                Hesap Yok
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* İŞLEM BUTONU */}
                                <td className={`${rowCellClass} text-right pr-6 rounded-r-xl`}>
                                    <div className="flex items-center justify-end gap-2">
                                        {!hasUserAccount(emp.name) && manageableEmployees.some(m => m["Ad Soyad"] === emp.name) && (
                                            <button
                                                onClick={() => handleOpenAssignModal(emp)}
                                                className="px-3 py-1.5 border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                                                title="Kullanıcı Adı ve Şifre Ata"
                                            >
                                                <Key className="w-3.5 h-3.5" />
                                                Kullanıcı Ata
                                            </button>
                                        )}
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <MoreHorizontal className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-slate-300"/>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Sonuç Bulunamadı</h3>
                <button 
                    onClick={() => {setSearchTerm(""); setRoleFilter("Tümü")}}
                    className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
                >
                    Filtreleri Temizle
                </button>
            </div>
        )}
      </div>

      {/* Yeni Personel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Yeni Personel Ekle</h3>
                  <p className="text-sm text-slate-500">Temel bilgileri girin.</p>
                </div>
              </div>
              <button
                onClick={handleCloseAddModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={newEmployee.firstName}
                    onChange={(e) => setNewEmployee((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ad"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={newEmployee.lastName}
                    onChange={(e) => setNewEmployee((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Soyad"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                  Departman
                </label>
                <input
                  type="text"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Örn: İnsan Kaynakları"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                  Pozisyon
                </label>
                <input
                  type="text"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, position: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Örn: Kıdemli Uzman"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                  Maaş (TL)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newEmployee.salary}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, salary: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Örn: 65000"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
                >
                  Personeli Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kullanıcı Atama Modal */}
      {showAssignModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Key className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Kullanıcı Hesabı Oluştur</h3>
                  <p className="text-sm text-slate-500">{selectedEmployee.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedEmployee(null);
                  setAssignUsername("");
                  setAssignPassword("");
                  setAssignError("");
                  setAssignSuccess("");
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-semibold">{assignSuccess}</p>
                </div>
                <div className="mt-3 p-3 bg-white rounded border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Kullanıcı Adı:</span>
                    <span className="font-mono text-sm text-slate-800">{assignUsername}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Şifre:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-800">{assignPassword}</span>
                      <button
                        onClick={handleCopyPassword}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Şifreyi Kopyala"
                      >
                        <Copy className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAssignUser} className="space-y-4">
                {assignError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{assignError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={assignUsername}
                    onChange={(e) => setAssignUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                    Şifre
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assignPassword}
                      onChange={(e) => setAssignPassword(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setAssignPassword(generateRandomPassword(10))}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                      title="Yeni Rastgele Şifre Oluştur"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                      title="Şifreyi Kopyala"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Şifre otomatik oluşturuldu. İsterseniz değiştirebilir veya yeni bir şifre oluşturabilirsiniz.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Bilgi:</strong> Bu personel için kullanıcı hesabı oluşturulacak. 
                    Kullanıcı adı ve şifreyi güvenli bir şekilde paylaşın.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedEmployee(null);
                      setAssignUsername("");
                      setAssignPassword("");
                      setAssignError("");
                      setAssignSuccess("");
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Hesap Oluştur
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}