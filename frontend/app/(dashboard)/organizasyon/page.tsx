"use client";

import { useEffect, useState, useMemo } from "react";
import { getStorageData, STORAGE_KEYS, setStorageData } from "../../utils/storage";
import { Users, Search, Download, Upload, Plus, Save, FileSpreadsheet, Info, X, Building2, TrendingUp, Target } from "lucide-react";
import { DEPARTMENTS, JOB_PROFILES } from "../../data/jobData";
import { useData } from "../../../context/DataContext";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import { API_BASE_URL } from "@/lib/apiConfig";

interface OrgChartEntry {
  "Ad Soyad": string;
  Pozisyon: string;
  Departman: string;
  "Maaş (TL)"?: number;
  "Kıdem (Yıl)"?: number;
  "İzin Hakkı (Gün)"?: number;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  Performans?: number;
  Potansiyel?: number;
  Calisma_Yili?: number;
  Izin_Hakki?: number;
  birth_date?: string; // Doğum Tarihi (YYYY-MM-DD formatında)
}

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

export default function OrganizasyonPage() {
  const { history360 } = useData();
  const [orgData, setOrgData] = useState<OrgChartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("Tümü");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [editingData, setEditingData] = useState<OrgChartEntry[]>([]);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState<string>("Tümü"); // Performans filtresi

  const rowCellClass =
    "bg-white px-3 py-3 align-middle shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5 border border-transparent group-hover:border-blue-200";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSearch = sessionStorage.getItem("orgSearch");
    if (storedSearch) {
      sessionStorage.removeItem("orgSearch");
      setSearchTerm(storedSearch);
    }
  }, []);

  // Yeni personel form state
  const [newPerson, setNewPerson] = useState<Partial<OrgChartEntry>>({
    "Ad Soyad": "",
    Departman: DEPARTMENTS[0] || "",
    Pozisyon: Object.keys(JOB_PROFILES)[0] || "",
    "Maaş (TL)": 35000,
    "Kıdem (Yıl)": 1.0,
    "İzin Hakkı (Gün)": 14,
    "Yönetici 1": "-",
    "Yönetici 2": "-",
    Performans: 3.0,
    Potansiyel: 3.0,
    birth_date: undefined,
  });

  const loadOrgData = () => {
    // localStorage'dan veri yükle
    const storedOrg = getStorageData<OrgChartEntry[]>(STORAGE_KEYS.ORG_CHART, []);
    
    // Verilerin temizlenip temizlenmediğini kontrol et
    const dataCleared = typeof window !== "undefined" && localStorage.getItem("hr_data_cleared") === "true";
    const orgKey = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.ORG_CHART) : null;
    
    // Eğer veriler açıkça temizlenmişse (boş array kaydedilmişse), backend'den çekme
    if (dataCleared || orgKey === "[]") {
      setOrgData([]);
      setEditingData([]);
      setLoading(false);
      return;
    }
    
    if (storedOrg.length > 0) {
      setOrgData(storedOrg);
      setEditingData([...storedOrg]);
      setLoading(false);
    } else {
      // Backend'den çek (backend çalışmıyorsa sessizce devam et)
      fetch(API_BASE_URL + "/api/org-chart", {
        signal: AbortSignal.timeout(5000), // 5 saniye timeout
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.success && data.data && data.data.length > 0) {
            setOrgData(data.data);
            setEditingData([...data.data]);
            setStorageData(STORAGE_KEYS.ORG_CHART, data.data);
          } else {
            // Backend'den boş veri geldiyse, boş array ile devam et
            setOrgData([]);
            setEditingData([]);
          }
        })
        .catch((error) => {
          // Backend çalışmıyorsa veya network hatası varsa sessizce devam et
          // localStorage'dan veri yoksa boş array ile devam et
          console.warn("Backend API'ye bağlanılamadı, localStorage kullanılıyor:", error.message);
          setOrgData([]);
          setEditingData([]);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadOrgData();
    
    // Storage temizlendiğinde veya güncellendiğinde verileri yeniden yükle
    const handleStorageCleared = () => {
      // Direkt state'leri temizle
      setOrgData([]);
      setEditingData([]);
      setLoading(false);
    };
    
    const handleDataUpdated = () => {
      // Veri güncellendiğinde yeniden yükle
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      if (!dataCleared) {
        loadOrgData();
      }
    };
    
    window.addEventListener("storageCleared", handleStorageCleared);
    window.addEventListener("dataUpdated", handleDataUpdated);
    
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
      window.removeEventListener("dataUpdated", handleDataUpdated);
    };
  }, []);

  // İstatistikler
  const stats = useMemo(() => {
    if (orgData.length === 0) {
      return { total: 0, avgSalary: 0, avgTenure: 0 };
    }
    const total = orgData.length;
    const salaries = orgData
      .map((p) => (p["Maaş (TL)"] as number) || (p["Maaş"] as number) || 0)
      .filter((s) => s > 0);
    const avgSalary = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
    const tenures = orgData
      .map((p) => p["Kıdem (Yıl)"] || p.Calisma_Yili || 0)
      .filter((t) => t > 0);
    const avgTenure = tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;
    return { total, avgSalary, avgTenure };
  }, [orgData]);

  const departments = useMemo(() => {
    const depts = Array.from(
      new Set(
        orgData
          .map((p) => p.Departman)
          .filter((dept): dept is string => Boolean(dept))
      )
    );
    return ["Tümü", ...depts];
  }, [orgData]);

  // Merge 360 data with org data for performance and potential
  const mergedData = useMemo(() => {
    return orgData.map((person) => {
      const name = person["Ad Soyad"];
      // Find 360 data for this person
      const person360 = history360.find(
        (h: any) => h.Personel === name || h.target === name
      );
      
      return {
        ...person,
        Performans: person360?.Performans || person.Performans || 0,
        Potansiyel: person360?.Potansiyel || person.Potansiyel || 0,
      };
    });
  }, [orgData, history360]);

  const formatSalary = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${safeValue.toLocaleString("tr-TR")} ₺`;
  };

  const parseSalaryInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, "");
    return Number(digits || 0);
  };

  const filteredData = useMemo(() => {
    let data = mergedData;
    if (searchTerm) {
      data = data.filter((person) => {
        const matchesSearch =
          person["Ad Soyad"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.Pozisyon?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.Departman?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      });
    }
    if (selectedDept !== "Tümü") {
      data = data.filter((p) => p.Departman === selectedDept);
    }
    // Performance filter
    if (performanceFilter !== "Tümü") {
      if (performanceFilter === "Yüksek (≥4.0)") {
        data = data.filter((p) => (p.Performans || 0) >= 4.0);
      } else if (performanceFilter === "İyi (3.5-3.9)") {
        data = data.filter((p) => {
          const perf = p.Performans || 0;
          return perf >= 3.5 && perf < 4.0;
        });
      } else if (performanceFilter === "Düşük (<3.5)") {
        data = data.filter((p) => (p.Performans || 0) < 3.5);
      }
    }
    return data;
  }, [mergedData, searchTerm, selectedDept, performanceFilter]);

  // Mevcut personel isimleri (yönetici seçimi için)
  const currentNames = useMemo(() => {
    return ["-", ...orgData.map((p) => p["Ad Soyad"]).filter(Boolean)];
  }, [orgData]);

  // Pozisyon listesi
  const positions = useMemo(() => {
    return Object.keys(JOB_PROFILES);
  }, []);

  // Akıllı Excel şablonu oluştur
  const generateSmartExcelTemplate = async () => {
    if (isGeneratingTemplate) return; // Çift tıklamayı önle
    
    setIsGeneratingTemplate(true);
    try {
      console.log("Excel şablonu oluşturuluyor...", { DEPARTMENTS, positions, currentNames });
      
      // ExcelJS kütüphanesini yükle
      let ExcelJS;
      try {
        const exceljsModule = await import("exceljs");
        ExcelJS = exceljsModule.default || exceljsModule;
        console.log("ExcelJS yüklendi", ExcelJS);
      } catch (importError) {
        console.error("ExcelJS import hatası:", importError);
        alert("ExcelJS kütüphanesi yüklenemedi. Lütfen npm install exceljs komutunu çalıştırın.");
        setIsGeneratingTemplate(false);
        return;
      }
      
      const workbook = new ExcelJS.Workbook();
      
      // Ana veri sayfası
      const worksheet = workbook.addWorksheet("Personel Listesi");
      
      // Başlıklar
      worksheet.columns = [
        { header: "Ad Soyad", key: "name", width: 25 },
        { header: "Departman", key: "department", width: 30 },
        { header: "Pozisyon", key: "position", width: 30 },
        { header: "Maaş (TL)", key: "salary", width: 15 },
        { header: "Kıdem (Yıl)", key: "tenure", width: 15 },
        { header: "İzin Hakkı (Gün)", key: "leave", width: 15 },
        { header: "Doğum Tarihi", key: "birthDate", width: 15 },
        { header: "Yönetici 1 (Ad Soyad)", key: "manager1", width: 25 },
        { header: "Yönetici 2 (Opsiyonel)", key: "manager2", width: 25 },
      ];

      // Örnek satır - pozisyon ve departman kontrolü
      const defaultDept = DEPARTMENTS.length > 0 ? DEPARTMENTS[0] : "İnsan Kaynakları";
      const defaultPos = positions.length > 0 ? positions[0] : "Uzman";
      
      worksheet.addRow({
        name: "Yeni Personel Adı",
        department: defaultDept,
        position: defaultPos,
        salary: 35000,
        tenure: 1.0,
        leave: 14,
        birthDate: "1990-01-15",
        manager1: "-",
        manager2: "-",
      });

      // Referans sayfası (gizli)
      const refSheet = workbook.addWorksheet("Referanslar");
      refSheet.state = "hidden";

      // Listeleri referans sayfasına yaz
      refSheet.getColumn("A").values = ["Departmanlar", ...DEPARTMENTS];
      refSheet.getColumn("B").values = ["Pozisyonlar", ...positions];
      refSheet.getColumn("C").values = ["Yöneticiler", ...currentNames.filter((n) => n !== "-")];

      // Data validation ekle (sadece pozisyon ve departman varsa)
      if (DEPARTMENTS.length > 0) {
        const deptRange = `Referanslar!$A$2:$A$${DEPARTMENTS.length + 1}`;
        worksheet.getColumn("B").eachCell((cell, rowNumber) => {
          if (rowNumber > 1) {
            cell.dataValidation = {
              type: "list",
              allowBlank: false,
              formulae: [deptRange],
            };
          }
        });
      }

      if (positions.length > 0) {
        const posRange = `Referanslar!$B$2:$B$${positions.length + 1}`;
        worksheet.getColumn("C").eachCell((cell, rowNumber) => {
          if (rowNumber > 1) {
            cell.dataValidation = {
              type: "list",
              allowBlank: false,
              formulae: [posRange],
            };
          }
        });
      }

      if (currentNames.length > 0) {
        const mgrRange = `Referanslar!$C$2:$C$${currentNames.length}`;
        // Doğum Tarihi eklendi, Yönetici sütunları I ve J oldu
        worksheet.getColumn("I").eachCell((cell, rowNumber) => {
          if (rowNumber > 1) {
            cell.dataValidation = {
              type: "list",
              allowBlank: true,
              formulae: [mgrRange],
            };
          }
        });

        worksheet.getColumn("J").eachCell((cell, rowNumber) => {
          if (rowNumber > 1) {
            cell.dataValidation = {
              type: "list",
              allowBlank: true,
              formulae: [mgrRange],
            };
          }
        });
      }

      console.log("Excel dosyası oluşturuluyor...");
      const buffer = await workbook.xlsx.writeBuffer();
      console.log("Buffer oluşturuldu, boyut:", buffer.byteLength);
      
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      
      const url = window.URL.createObjectURL(blob);
      console.log("Blob URL oluşturuldu:", url);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `Personel_Listesi_Sablonu_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link); // DOM'a ekle (bazı tarayıcılar için gerekli)
      link.click();
      document.body.removeChild(link); // DOM'dan kaldır
      
      // URL'i temizle
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log("Excel şablonu indirildi!");
      alert("✅ Excel şablonu başarıyla indirildi!");
    } catch (error: any) {
      console.error("Excel template generation error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      alert(`❌ Excel şablonu oluşturulurken hata oluştu: ${error.message || "Bilinmeyen hata"}\n\nLütfen konsolu kontrol edin (F12).`);
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  // Excel import
  const handleExcelImport = async (file: File) => {
    try {
      let ExcelJS;
      try {
        const exceljsModule = await import("exceljs");
        ExcelJS = exceljsModule.default || exceljsModule;
      } catch (importError) {
        console.error("ExcelJS import hatası:", importError);
        alert("ExcelJS kütüphanesi yüklenemedi. Lütfen npm install exceljs komutunu çalıştırın.");
        return;
      }
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.getWorksheet(0);
      if (!worksheet) throw new Error("Excel dosyasında veri sayfası bulunamadı");

      const newRecords: OrgChartEntry[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const values = row.values as any[];
        if (!values[1] || values[1] === "Yeni Personel Adı") return; // Skip empty or example row

        // Doğum tarihi formatını kontrol et ve düzelt
        let birthDate: string | undefined = undefined;
        const birthDateRaw = values[7]; // Doğum Tarihi 7. sütunda (0-indexed)
        
        if (birthDateRaw !== undefined && birthDateRaw !== null && birthDateRaw !== "") {
          try {
            // Excel tarih formatından string'e çevir
            if (typeof birthDateRaw === "number") {
              // Excel serial date (1900-01-01'den itibaren gün sayısı)
              const excelEpoch = new Date(1899, 11, 30);
              const date = new Date(excelEpoch.getTime() + birthDateRaw * 24 * 60 * 60 * 1000);
              birthDate = date.toISOString().split("T")[0]; // YYYY-MM-DD formatı
            } else if (typeof birthDateRaw === "string") {
              // String formatını kontrol et
              if (birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
                birthDate = birthDateRaw;
              } else {
                // Diğer formatları parse et
                const parsed = new Date(birthDateRaw);
                if (!isNaN(parsed.getTime())) {
                  birthDate = parsed.toISOString().split("T")[0];
                }
              }
            } else if (birthDateRaw instanceof Date) {
              birthDate = birthDateRaw.toISOString().split("T")[0];
            }
          } catch (error) {
            console.warn("Doğum tarihi formatı hatalı:", birthDateRaw, error);
          }
        }

        const record: OrgChartEntry = {
          "Ad Soyad": String(values[1] || ""),
          Departman: String(values[2] || DEPARTMENTS[0]),
          Pozisyon: String(values[3] || positions[0]),
          "Maaş (TL)": Number(values[4]) || 35000,
          "Kıdem (Yıl)": Number(values[5]) || 1.0,
          "İzin Hakkı (Gün)": Number(values[6]) || 14,
          "Yönetici 1": String(values[8] || "-"), // Yönetici 1 artık 8. sütunda
          "Yönetici 2": String(values[9] || "-"), // Yönetici 2 artık 9. sütunda
          Performans: 3.0,
          Potansiyel: 3.0,
          Calisma_Yili: Number(values[5]) || 1.0,
          Izin_Hakki: Number(values[6]) || 14,
        };
        
        // Doğum tarihi varsa ekle
        if (birthDate) {
          record.birth_date = birthDate;
        }

        if (record["Ad Soyad"]) {
          newRecords.push(record);
        }
      });

      if (newRecords.length > 0) {
        const updatedData = [...orgData, ...newRecords];
        setOrgData(updatedData);
        setEditingData([...updatedData]);
        setStorageData(STORAGE_KEYS.ORG_CHART, updatedData);
        alert(`✅ ${newRecords.length} personel başarıyla eklendi!`);
        setShowExcelUpload(false);
      } else {
        alert("Excel dosyasında geçerli veri bulunamadı.");
      }
    } catch (error) {
      console.error("Excel import error:", error);
      alert("Excel dosyası okunamadı. Formatı kontrol edin.");
    }
  };

  // Manuel personel ekle
  const handleAddPerson = async () => {
    console.log("handleAddPerson çağrıldı", { newPerson, positions, DEPARTMENTS });
    
    if (!newPerson["Ad Soyad"] || !newPerson["Ad Soyad"].trim()) {
      alert("⚠️ İsim zorunludur.");
      return;
    }

    // Pozisyon kontrolü
    const selectedPosition = newPerson.Pozisyon || (positions.length > 0 ? positions[0] : "");
    if (!selectedPosition) {
      console.error("Pozisyon bulunamadı!", { positions, newPerson });
      alert("⚠️ Pozisyon seçilmelidir. Lütfen sayfayı yenileyin.");
      return;
    }

    // Departman kontrolü
    const selectedDept = newPerson.Departman || (DEPARTMENTS.length > 0 ? DEPARTMENTS[0] : "");
    if (!selectedDept) {
      console.error("Departman bulunamadı!", { DEPARTMENTS, newPerson });
      alert("⚠️ Departman seçilmelidir. Lütfen sayfayı yenileyin.");
      return;
    }

    // Doğum tarihi validasyonu
    let birthDate: string | undefined = undefined;
    if (newPerson.birth_date) {
      // YYYY-MM-DD formatında olmalı
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(newPerson.birth_date)) {
        // Geçerli tarih kontrolü
        const date = new Date(newPerson.birth_date);
        if (!isNaN(date.getTime())) {
          // Gelecek tarih kontrolü
          if (date <= new Date()) {
            birthDate = newPerson.birth_date;
          } else {
            alert("⚠️ Doğum tarihi gelecek bir tarih olamaz.");
            return;
          }
        } else {
          alert("⚠️ Geçersiz doğum tarihi formatı. Lütfen YYYY-MM-DD formatında girin.");
          return;
        }
      } else {
        alert("⚠️ Geçersiz doğum tarihi formatı. Lütfen YYYY-MM-DD formatında girin.");
        return;
      }
    }

    const newEntry: OrgChartEntry = {
      "Ad Soyad": newPerson["Ad Soyad"].trim(),
      Departman: selectedDept,
      Pozisyon: selectedPosition,
      "Maaş (TL)": newPerson["Maaş (TL)"] || 35000,
      "Kıdem (Yıl)": newPerson["Kıdem (Yıl)"] || 1.0,
      "İzin Hakkı (Gün)": newPerson["İzin Hakkı (Gün)"] || 14,
      "Yönetici 1": newPerson["Yönetici 1"] || "-",
      "Yönetici 2": newPerson["Yönetici 2"] || "-",
      Performans: newPerson.Performans || 3.0,
      Potansiyel: newPerson.Potansiyel || 3.0,
      Calisma_Yili: newPerson["Kıdem (Yıl)"] || 1.0,
      Izin_Hakki: newPerson["İzin Hakkı (Gün)"] || 14,
      birth_date: birthDate,
    };

    try {
      const updatedData = [...orgData, newEntry];
      setOrgData(updatedData);
      setEditingData([...updatedData]);
      setStorageData(STORAGE_KEYS.ORG_CHART, updatedData);
      
      // Backend'e kaydet (hata olsa bile devam et)
      try {
        await fetch(API_BASE_URL + "/api/org-chart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData),
        }).catch(() => {
          console.warn("Backend save failed, using local storage only");
        });
      } catch (e) {
        console.warn("Backend save error:", e);
      }
      
      // Formu sıfırla
      setNewPerson({
        "Ad Soyad": "",
        Departman: DEPARTMENTS[0] || "",
        Pozisyon: positions.length > 0 ? positions[0] : "",
        "Maaş (TL)": 35000,
        "Kıdem (Yıl)": 1.0,
        "İzin Hakkı (Gün)": 14,
        "Yönetici 1": "-",
        "Yönetici 2": "-",
        Performans: 3.0,
        Potansiyel: 3.0,
        birth_date: undefined,
      });
      setShowAddForm(false);
      alert(`✅ ${newEntry["Ad Soyad"]} başarıyla eklendi!`);
    } catch (error: any) {
      console.error("Personel ekleme hatası:", error);
      alert(`❌ Hata: ${error.message || "Personel eklenirken bir hata oluştu."}`);
    }
  };

  // Tablo değişikliklerini kaydet
  const handleSaveTableChanges = () => {
    setOrgData([...editingData]);
    setStorageData(STORAGE_KEYS.ORG_CHART, editingData);
    alert("Veriler güncellendi.");
  };

  // Excel export
  const handleExportExcel = async () => {
    try {
      let ExcelJS;
      try {
        const exceljsModule = await import("exceljs");
        ExcelJS = exceljsModule.default || exceljsModule;
      } catch (importError) {
        console.error("ExcelJS import hatası:", importError);
        alert("ExcelJS kütüphanesi yüklenemedi. Lütfen npm install exceljs komutunu çalıştırın.");
        return;
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Personel Listesi");

      worksheet.columns = [
        { header: "Ad Soyad", key: "name", width: 25 },
        { header: "Pozisyon", key: "position", width: 30 },
        { header: "Departman", key: "department", width: 20 },
        { header: "Maaş (TL)", key: "salary", width: 15 },
        { header: "Kıdem (Yıl)", key: "seniority", width: 15 },
        { header: "İzin Hakkı (Gün)", key: "leave", width: 15 },
        { header: "Yönetici 1", key: "manager1", width: 25 },
        { header: "Yönetici 2", key: "manager2", width: 25 },
      ];

      filteredData.forEach((person) => {
        worksheet.addRow({
          name: person["Ad Soyad"],
          position: person.Pozisyon,
          department: person.Departman,
          salary: person["Maaş (TL)"] || 0,
          seniority: person["Kıdem (Yıl)"] || person.Calisma_Yili || 0,
          leave: person["İzin Hakkı (Gün)"] || person.Izin_Hakki || 0,
          manager1: person["Yönetici 1"] || "-",
          manager2: person["Yönetici 2"] || "-",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `organizasyon_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel export hatası oluştu.");
    }
  };

  // Departman bazlı gruplama
  const groupedByDept = useMemo(() => {
    return filteredData.reduce((acc, person) => {
      const dept = person.Departman || "Belirtilmemiş";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(person);
      return acc;
    }, {} as Record<string, OrgChartEntry[]>);
  }, [filteredData]);

  return (
    <div>
      {/* Başlık ve İstatistikler */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-800">Organizasyon Şeması</h1>
        </div>
        <p className="text-xs text-slate-500">Personel yönetimi ve organizasyon bilgileri</p>
      </div>

      {/* İstatistik Kartları */}
      {orgData.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Toplam</div>
            <div className="text-xl font-semibold text-slate-800 font-mono">{stats.total}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ort. Maaş</div>
            <div className="text-xl font-semibold text-slate-800 font-mono">
              {stats.avgSalary.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ort. Kıdem</div>
            <div className="text-xl font-semibold text-slate-800 font-mono">
              {stats.avgTenure.toFixed(1)} Yıl
            </div>
          </div>
        </div>
      )}

      {/* Excel ile Toplu Yükleme */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-4">
        <button
          onClick={() => setShowExcelUpload(!showExcelUpload)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800">Excel ile Toplu Veri Yükle</h2>
          </div>
          {showExcelUpload ? <X size={16} /> : <Plus size={16} />}
        </button>

        {showExcelUpload && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-200 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <strong>Özellik:</strong> Excel şablonunda Departman, Pozisyon ve Yöneticiler{" "}
                <strong>açılır liste (dropdown)</strong> olarak gelir.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Excel Dosyası Yükle (.xlsx)
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleExcelImport(file);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    generateSmartExcelTemplate();
                  }}
                  disabled={isGeneratingTemplate}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isGeneratingTemplate
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                >
                  {isGeneratingTemplate ? (
                    <>
                      <Skeleton variant="circular" width={20} height={20} />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      📥 Akıllı Şablonu İndir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manuel Tek Personel Ekle */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-4">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800">Manuel Personel Ekle</h2>
          </div>
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
        </button>

        {showAddForm && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Ad Soyad *</label>
                <input
                  type="text"
                  value={newPerson["Ad Soyad"] || ""}
                  onChange={(e) => setNewPerson({ ...newPerson, "Ad Soyad": e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Departman</label>
                <select
                  value={newPerson.Departman || DEPARTMENTS[0]}
                  onChange={(e) => setNewPerson({ ...newPerson, Departman: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Pozisyon</label>
                <select
                  value={newPerson.Pozisyon || (positions.length > 0 ? positions[0] : "")}
                  onChange={(e) => setNewPerson({ ...newPerson, Pozisyon: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={positions.length === 0}
                >
                  {positions.length === 0 ? (
                    <option value="">Yükleniyor...</option>
                  ) : (
                    positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Maaş (TL)</label>
                <input
                  type="number"
                  min={17002}
                  step={1000}
                  value={newPerson["Maaş (TL)"] || 35000}
                  onChange={(e) => setNewPerson({ ...newPerson, "Maaş (TL)": Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Kıdem (Yıl)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={newPerson["Kıdem (Yıl)"] || 1.0}
                  onChange={(e) => setNewPerson({ ...newPerson, "Kıdem (Yıl)": Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">İzin Hakkı (Gün)</label>
                <input
                  type="number"
                  min={0}
                  value={newPerson["İzin Hakkı (Gün)"] || 14}
                  onChange={(e) => setNewPerson({ ...newPerson, "İzin Hakkı (Gün)": Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Doğum Tarihi</label>
                <input
                  type="date"
                  value={newPerson.birth_date || ""}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    if (selectedDate) {
                      // Gelecek tarih kontrolü
                      const date = new Date(selectedDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date > today) {
                        alert("⚠️ Doğum tarihi gelecek bir tarih olamaz.");
                        return;
                      }
                    }
                    setNewPerson({ ...newPerson, birth_date: selectedDate || undefined });
                  }}
                  max={new Date().toISOString().split("T")[0]} // Bugünden önceki tarihler
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Format: YYYY-MM-DD</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Yönetici 1</label>
                <select
                  value={newPerson["Yönetici 1"] || "-"}
                  onChange={(e) => setNewPerson({ ...newPerson, "Yönetici 1": e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {currentNames.map((name, idx) => (
                    <option key={`${name}-${idx}`} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Yönetici 2</label>
                <select
                  value={newPerson["Yönetici 2"] || "-"}
                  onChange={(e) => setNewPerson({ ...newPerson, "Yönetici 2": e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {currentNames.map((name, idx) => (
                    <option key={`${name}-${idx}`} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleAddPerson();
                }}
                className="w-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Liste ve Düzenleme */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Personel Listesi
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleSaveTableChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
            >
              <Save size={14} />
              Kaydet
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
            >
              <Download size={14} />
              Excel
            </button>
          </div>
        </div>

        {/* Filtreler */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Personel ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Tümü">Tüm Performanslar</option>
            <option value="Yüksek (≥4.0)">Yüksek (≥4.0)</option>
            <option value="İyi (3.5-3.9)">İyi (3.5-3.9)</option>
            <option value="Düşük (<3.5)">Düşük (&lt;3.5)</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <SkeletonTable rows={6} cols={8} />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-slate-500 text-sm">Personel bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2">
              <thead className="sticky top-0 bg-slate-50/80 backdrop-blur text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Ad Soyad</th>
                  <th className="px-3 py-2 text-left">Departman</th>
                  <th className="px-3 py-2 text-left">Pozisyon</th>
                  <th className="px-3 py-2 text-right">Maaş (TL)</th>
                  <th className="px-3 py-2 text-right">Kıdem</th>
                  <th className="px-3 py-2 text-right">İzin</th>
                  <th className="px-3 py-2 text-left">Doğum Tarihi</th>
                  <th className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Performans
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Target className="w-3 h-3" />
                      Potansiyel
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left">Yönetici 1</th>
                  <th className="px-3 py-2 text-left">Yönetici 2</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-700">
                {filteredData.map((person, idx) => {
                  const editIdx = editingData.findIndex(
                    (p) => p["Ad Soyad"] === person["Ad Soyad"] && p.Pozisyon === person.Pozisyon
                  );
                  const editPerson = editIdx >= 0 ? editingData[editIdx] : person;
                  const displayName = editPerson["Ad Soyad"] || person["Ad Soyad"] || "";
                  const photoUrl =
                    (editPerson as any).photo ||
                    (person as any).photo ||
                    (editPerson as any).avatar ||
                    (person as any).avatar ||
                    (editPerson as any).image ||
                    (person as any).image;
                  
                  return (
                    <tr key={`${person["Ad Soyad"]}-${idx}`} className="group">
                      <td className={`${rowCellClass} rounded-l-lg`}>
                        <div className="flex items-center gap-2">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={displayName}
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(displayName)} ring-2 ring-white`}>
                              {getInitials(displayName)}
                            </div>
                          )}
                          <input
                            type="text"
                            value={editPerson["Ad Soyad"] || ""}
                            onChange={(e) => {
                              const newData = [...editingData];
                              if (editIdx >= 0) {
                                newData[editIdx] = { ...newData[editIdx], "Ad Soyad": e.target.value };
                              } else {
                                newData.push({ ...person, "Ad Soyad": e.target.value });
                              }
                              setEditingData(newData);
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </td>
                      <td className={rowCellClass}>
                        <select
                          value={editPerson.Departman || ""}
                          onChange={(e) => {
                            const newData = [...editingData];
                            if (editIdx >= 0) {
                              newData[editIdx] = { ...newData[editIdx], Departman: e.target.value };
                            } else {
                              newData.push({ ...person, Departman: e.target.value });
                            }
                            setEditingData(newData);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={rowCellClass}>
                        <select
                          value={editPerson.Pozisyon || ""}
                          onChange={(e) => {
                            const newData = [...editingData];
                            if (editIdx >= 0) {
                              newData[editIdx] = { ...newData[editIdx], Pozisyon: e.target.value };
                            } else {
                              newData.push({ ...person, Pozisyon: e.target.value });
                            }
                            setEditingData(newData);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {positions.map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={rowCellClass}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatSalary(editPerson["Maaş (TL)"] || 0)}
                          onChange={(e) => {
                            const parsedValue = parseSalaryInput(e.target.value);
                            const newData = [...editingData];
                            if (editIdx >= 0) {
                              newData[editIdx] = { ...newData[editIdx], "Maaş (TL)": parsedValue };
                            } else {
                              newData.push({ ...person, "Maaş (TL)": parsedValue });
                            }
                            setEditingData(newData);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-right bg-white"
                        />
                      </td>
                      <td className={rowCellClass}>
                        <input
                          type="number"
                          step={0.5}
                          value={editPerson["Kıdem (Yıl)"] || editPerson.Calisma_Yili || 0}
                          onChange={(e) => {
                            const newData = [...editingData];
                            if (editIdx >= 0) {
                              newData[editIdx] = {
                                ...newData[editIdx],
                                "Kıdem (Yıl)": Number(e.target.value),
                                Calisma_Yili: Number(e.target.value),
                              };
                            } else {
                              newData.push({
                                ...person,
                                "Kıdem (Yıl)": Number(e.target.value),
                                Calisma_Yili: Number(e.target.value),
                              });
                            }
                            setEditingData(newData);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono bg-white"
                        />
                      </td>
                      <td className={rowCellClass}>
                        <input
                          type="number"
                          value={editPerson["İzin Hakkı (Gün)"] || editPerson.Izin_Hakki || 0}
                          onChange={(e) => {
                            const newData = [...editingData];
                            if (editIdx >= 0) {
                              newData[editIdx] = {
                                ...newData[editIdx],
                                "İzin Hakkı (Gün)": Number(e.target.value),
                                Izin_Hakki: Number(e.target.value),
                              };
                            } else {
                              newData.push({
                                ...person,
                                "İzin Hakkı (Gün)": Number(e.target.value),
                                Izin_Hakki: Number(e.target.value),
                              });
                            }
                            setEditingData(newData);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </td>
                      {/* Doğum Tarihi Kolonu */}
                      <td className={rowCellClass}>
                        {person.birth_date ? (() => {
                          // YYYY-MM-DD formatını GG.AA.YYYY formatına çevir
                          const [year, month, day] = person.birth_date.split("-");
                          return `${day}.${month}.${year}`;
                        })() : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      {/* Performans Kolonu */}
                      <td className={`${rowCellClass} text-center`}>
                        <div className="flex items-center justify-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold font-mono ${
                              (person.Performans || 0) >= 4.5
                                ? "bg-green-100 text-green-700"
                                : (person.Performans || 0) >= 4.0
                                ? "bg-blue-100 text-blue-700"
                                : (person.Performans || 0) >= 3.5
                                ? "bg-yellow-100 text-yellow-700"
                                : (person.Performans || 0) >= 3.0
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                            }`}
                            title={`Performans: ${(person.Performans || 0).toFixed(1)}`}
                          >
                            {(person.Performans || 0).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      {/* Potansiyel Kolonu */}
                      <td className={`${rowCellClass} text-center`}>
                        <div className="flex items-center justify-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold font-mono ${
                              (person.Potansiyel || 0) >= 4.5
                                ? "bg-purple-100 text-purple-700"
                                : (person.Potansiyel || 0) >= 4.0
                                ? "bg-indigo-100 text-indigo-700"
                                : (person.Potansiyel || 0) >= 3.5
                                ? "bg-slate-100 text-slate-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                            title={`Potansiyel: ${(person.Potansiyel || 0).toFixed(1)}`}
                          >
                            {(person.Potansiyel || 0).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className={rowCellClass}>
                        <select
                          value={editPerson["Yönetici 1"] || "-"}
                          onChange={(e) => {
                            const newData = [...editingData];
                            if (editIdx >= 0) {
                              newData[editIdx] = { ...newData[editIdx], "Yönetici 1": e.target.value };
                            } else {
                              newData.push({ ...person, "Yönetici 1": e.target.value });
                            }
                            setEditingData(newData);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {currentNames.map((name, idx) => (
                            <option key={`${name}-${idx}`} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`${rowCellClass} rounded-r-lg`}>
                        <select
                          value={editPerson["Yönetici 2"] || "-"}
                          onChange={(e) => {
                            const newData = [...editingData];
                            if (editIdx >= 0) {
                              newData[editIdx] = { ...newData[editIdx], "Yönetici 2": e.target.value };
                            } else {
                              newData.push({ ...person, "Yönetici 2": e.target.value });
                            }
                            setEditingData(newData);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {currentNames.map((name, idx) => (
                            <option key={`${name}-${idx}`} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
