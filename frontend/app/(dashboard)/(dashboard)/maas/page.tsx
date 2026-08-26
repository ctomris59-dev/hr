"use client";

import { useEffect, useState, useMemo } from "react";
import { getStorageData, STORAGE_KEYS, setStorageData } from "../../utils/storage";
import { Calculator, DollarSign, RefreshCw, TrendingUp, BarChart3, Save, ChevronDown, ChevronUp, Scale, Users, FileDown, FileSpreadsheet, Info, AlertCircle, Shield } from "lucide-react";
import { calculateNetSalary } from "../../utils/calculations";
import Skeleton, { SkeletonTable } from "@/components/ui/Skeleton";
import {
  processEmployeeData,
  calculateMarketAverages,
  runScenarioLogic,
  calculateCurrencyImpact,
  type EmployeeData,
  type SimulationResult,
  type MarketReference,
  type CurrencySimulationResult,
} from "../../utils/salarySimulation";
import CurrencySimulationModal from "../../../components/salary/CurrencySimulationModal";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  BarChart,
  Bar,
} from "@/components/charts/recharts";
import { API_BASE_URL } from "@/lib/apiConfig";

export default function MaasPage() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [marketRefs, setMarketRefs] = useState<MarketReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [inflationRate, setInflationRate] = useState(35);
  const [simResults, setSimResults] = useState<{ A: SimulationResult[]; B: SimulationResult[]; C: SimulationResult[]; D: SimulationResult[] } | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<"A" | "B" | "C" | "D">("A");
  const [activeTab, setActiveTab] = useState<"simulation" | "market" | "calculator">("simulation");
  const [grossInput, setGrossInput] = useState(30000);
  const [netResult, setNetResult] = useState<any>(null);
  const [benchmarkExpanded, setBenchmarkExpanded] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [currencyResult, setCurrencyResult] = useState<CurrencySimulationResult | null>(null);
  const [dollarIncrease, setDollarIncrease] = useState(20);
  const [budgetRequests, setBudgetRequests] = useState<any[]>([]);
  const [marketListFilter, setMarketListFilter] = useState<"all" | "below" | "above">("all");
  const [marketSearch, setMarketSearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [scenarioDStats, setScenarioDStats] = useState<{ totalDepartments: number; submittedDepartments: number; defaultCount: number } | null>(null);

  // Access Control: Only CEO, CFO, HR_EXEC can access
  useEffect(() => {
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setUser(currentUser);

    if (currentUser) {
      const userRole = (currentUser as any).role || "";
      const userDept = (currentUser as any).department || (currentUser as any).dept || "";
      
      // STRICT ACCESS CONTROL: Only CEO, Finance Director, Finance Manager
      const isCEO = userRole === "CEO" || userRole === "IK";
      const isFinanceDirector = userRole === "DIRECTOR" && ("Finans" in userDept || "Finance" in userDept);
      const isFinanceManager = userRole === "MANAGER" && ("Finans" in userDept || "Finance" in userDept);
      
      if (!isCEO && !isFinanceDirector && !isFinanceManager) {
        setAccessDenied(true);
        alert("Bu sayfaya erişim yetkiniz yok. Maaş Simülasyonu sadece CEO, Finans Direktörü ve Finans Müdürü için erişilebilir.");
        // Redirect to budget management page after 2 seconds
        setTimeout(() => {
          window.location.href = "/degerlendirme";
        }, 2000);
        return;
      }
    } else {
      setAccessDenied(true);
      return;
    }

    loadData();
    loadBudgetRequests();
    
    // Storage temizlendiğinde veya güncellendiğinde verileri yeniden yükle
    const handleStorageCleared = () => {
      // Direkt state'leri temizle
      setEmployees([]);
      setMarketRefs([]);
      setLoading(false);
      setBudgetRequests([]);
    };
    
    const handleDataUpdated = () => {
      // Veri güncellendiğinde yeniden yükle
      const dataCleared = localStorage.getItem("hr_data_cleared") === "true";
      if (!dataCleared) {
        loadData();
        loadBudgetRequests();
      }
    };
    
    window.addEventListener("storageCleared", handleStorageCleared);
    window.addEventListener("dataUpdated", handleDataUpdated);
    
    return () => {
      window.removeEventListener("storageCleared", handleStorageCleared);
      window.removeEventListener("dataUpdated", handleDataUpdated);
    };
  }, []);

  // Calculate Scenario D statistics
  useEffect(() => {
    if (simResults && employees.length > 0) {
      const departments = new Set(employees.map(e => e.Departman));
      const totalDepartments = departments.size;
      
      // Count employees with submitted budget requests
      const submittedEmployees = new Set<string>();
      budgetRequests.forEach(req => {
        if (req.status === "Gönderildi") {
          submittedEmployees.add(req.employee_id);
        }
      });
      
      // Count departments with at least one submitted request
      const submittedDepartments = new Set<string>();
      employees.forEach(emp => {
        if (submittedEmployees.has(emp["Ad Soyad"])) {
          submittedDepartments.add(emp.Departman);
        }
      });
      
      const defaultCount = totalDepartments - submittedDepartments.size;
      
      setScenarioDStats({
        totalDepartments,
        submittedDepartments: submittedDepartments.size,
        defaultCount,
      });
    }
  }, [simResults, employees, budgetRequests]);

  const loadBudgetRequests = async () => {
    try {
      // Get current period
      const now = new Date();
      const year = now.getFullYear();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      const currentPeriod = `${year}-Q${quarter}`;

      // Load all employees and check for budget requests
      const orgData = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
      const requests: any[] = [];

      for (const person of orgData) {
        try {
          const params = new URLSearchParams();
          params.append("period", currentPeriod);
          if (user?.role) params.append("manager_role", user.role);
          if (user?.dept || user?.department) {
            params.append("manager_dept", user?.dept || user?.department || "");
          }
          if (user?.name) params.append("manager_name", user.name);
          const reqRes = await fetch(
            `${API_BASE_URL}/api/budget/request/${encodeURIComponent(person["Ad Soyad"])}?${params.toString()}`
          );
          if (reqRes.ok) {
            const reqResult = await reqRes.json();
            if (reqResult.success && reqResult.data) {
              requests.push({
                employee_id: reqResult.data.employee_id,
                requested_rate: reqResult.data.requested_rate,
                status: reqResult.data.status,
              });
            }
          }
        } catch (error) {
          // Silently continue if request fails
        }
      }

      setBudgetRequests(requests);
    } catch (error) {
      console.error("Budget requests loading error:", error);
    }
  };

  const loadData = () => {
    const orgData = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    const data360 = getStorageData<any[]>(STORAGE_KEYS.HISTORY_360, []);
    
    // Verilerin temizlenip temizlenmediğini kontrol et
    const dataCleared = typeof window !== "undefined" && localStorage.getItem("hr_data_cleared") === "true";
    const orgKey = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.ORG_CHART) : null;
    
    // Eğer veriler açıkça temizlenmişse (boş array kaydedilmişse), boş array ile devam et
    if (dataCleared || orgKey === "[]") {
      setEmployees([]);
      setMarketRefs([]);
      setLoading(false);
      return;
    }

    if (orgData.length > 0) {
      const processed = processEmployeeData(orgData, data360);
      setEmployees(processed);

      // Market referanslarını yükle veya hesapla
      const storedMarket = getStorageData<MarketReference[]>("market_data_ref", []);
      if (storedMarket.length > 0) {
        setMarketRefs(storedMarket);
      } else {
        const calculated = calculateMarketAverages(processed);
        setMarketRefs(calculated);
        setStorageData("market_data_ref", calculated);
      }
    } else {
      setEmployees([]);
      setMarketRefs([]);
    }
    setLoading(false);
  };

  const handleRunSimulation = () => {
    if (employees.length === 0 || marketRefs.length === 0) {
      alert("Veri bulunamadı. Lütfen önce organizasyon verilerini yükleyin.");
      return;
    }

    // Market referanslarını employee'lara ekle
    const marketMap = new Map<string, number>();
    marketRefs.forEach((ref) => {
      marketMap.set(`${ref.Departman}|${ref.Pozisyon}`, ref["Piyasa Ortalaması"]);
    });

    const employeesWithMarket = employees.map((emp) => ({
      ...emp,
      "Piyasa Ortalaması": marketMap.get(`${emp.Departman}|${emp.Pozisyon}`) || 45000,
    }));

    const resultsA = runScenarioLogic(employeesWithMarket, marketRefs, inflationRate, "A");
    const resultsB = runScenarioLogic(employeesWithMarket, marketRefs, inflationRate, "B");
    const resultsC = runScenarioLogic(employeesWithMarket, marketRefs, inflationRate, "C");
    const resultsD = runScenarioLogic(employeesWithMarket, marketRefs, inflationRate, "D", budgetRequests);

    setSimResults({ A: resultsA, B: resultsB, C: resultsC, D: resultsD });
  };

  const handleSaveScenario = () => {
    if (!simResults) return;

    const selectedResults = simResults[selectedScenario];
    const orgData = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);

    const updated = orgData.map((person) => {
      const simRow = selectedResults.find((r) => r["Ad Soyad"] === person["Ad Soyad"]);
      if (simRow) {
        return {
          ...person,
          "Maaş (TL)": simRow["Yeni Maaş"],
          Maaş: simRow["Yeni Maaş"],
        };
      }
      return person;
    });

    setStorageData(STORAGE_KEYS.ORG_CHART, updated);

    // Market referanslarını güncelle (enflasyon ile)
    const updatedMarket = marketRefs.map((ref) => ({
      ...ref,
      "Piyasa Ortalaması": ref["Piyasa Ortalaması"] * (1 + inflationRate / 100),
    }));
    setMarketRefs(updatedMarket);
    setStorageData("market_data_ref", updatedMarket);

    const scenarioNames = {
      A: "A (Standart)",
      B: "B (Eşitlemeli)",
      C: "C (Dengeli)",
      D: "D (Yönetici Talepleri)"
    };
    alert(`✅ Senaryo ${scenarioNames[selectedScenario]} başarıyla uygulandı ve kaydedildi!`);
    setSimResults(null);
  };

  const handleExportToExcel = async () => {
    if (!simResults) {
      alert("Lütfen önce simülasyon çalıştırın.");
      return;
    }

    try {
      const ExcelJS = (await import("exceljs")).default;
      const selectedResults = simResults[selectedScenario];
      const scenarioNames = {
        A: "Standart",
        B: "Eşitlemeli",
        C: "Dengeli",
        D: "Yönetici Talepleri"
      };

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Senaryo ${selectedScenario} - ${scenarioNames[selectedScenario]}`);

      // Başlık satırı
      worksheet.mergeCells("A1:L1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `Maaş Simülasyonu - Senaryo ${selectedScenario}: ${scenarioNames[selectedScenario]}`;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      // Tarih ve parametreler
      worksheet.mergeCells("A2:L2");
      const infoCell = worksheet.getCell("A2");
      infoCell.value = `Oluşturulma Tarihi: ${new Date().toLocaleDateString("tr-TR")} | Enflasyon Oranı: %${inflationRate}`;
      infoCell.font = { size: 10, italic: true };
      infoCell.alignment = { horizontal: "center", vertical: "middle" };

      // Başlıklar
      const headers = [
        "Ad Soyad",
        "Departman",
        "Profil",
        "Performans",
        "Potansiyel",
        "Mevcut Maaş (₺)",
        "Yeni Maaş (₺)",
        "Zam Oranı (%)",
        "Zam Açıklaması",
        "Eski Risk",
        "Yeni Risk",
        "Risk Mesafesi"
      ];

      worksheet.addRow(headers);
      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF3B82F6" }
      };
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };

      // Veri satırları
      selectedResults.forEach((result, index) => {
        const row = worksheet.addRow([
          result["Ad Soyad"],
          result.Departman,
          result.Profil,
          result.Performans.toFixed(1),
          result.Potansiyel.toFixed(1),
          result["Mevcut Maaş"],
          result["Yeni Maaş"],
          result["Zam Oranı (%)"].toFixed(2),
          result["Zam Açıklaması"],
          result["Eski Risk"],
          result["Yeni Risk"],
          result["Risk Mesafesi"]
        ]);
        
        // Maaş sütunlarını sayı formatına çevir
        const mevcutMaaşCell = row.getCell(6);
        mevcutMaaşCell.value = result["Mevcut Maaş"];
        mevcutMaaşCell.numFmt = "#,##0.00";
        
        const yeniMaaşCell = row.getCell(7);
        yeniMaaşCell.value = result["Yeni Maaş"];
        yeniMaaşCell.numFmt = "#,##0.00";
      });

      // Sütun genişliklerini ayarla
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });

      // Toplam satırı
      const totalRowIndex = selectedResults.length + 4;
      worksheet.mergeCells(`A${totalRowIndex}:F${totalRowIndex}`);
      const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`);
      totalLabelCell.value = "TOPLAM";
      totalLabelCell.font = { bold: true };
      totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };

      const totalOld = selectedResults.reduce((sum, r) => sum + r["Mevcut Maaş"], 0);
      const totalNew = selectedResults.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
      const totalDiff = totalNew - totalOld;

      worksheet.getCell(`G${totalRowIndex}`).value = totalOld;
      worksheet.getCell(`G${totalRowIndex}`).numFmt = "#,##0.00";
      worksheet.getCell(`G${totalRowIndex}`).font = { bold: true };

      worksheet.getCell(`H${totalRowIndex}`).value = totalNew;
      worksheet.getCell(`H${totalRowIndex}`).numFmt = "#,##0.00";
      worksheet.getCell(`H${totalRowIndex}`).font = { bold: true };

      worksheet.getCell(`I${totalRowIndex}`).value = ((totalDiff / totalOld) * 100).toFixed(2);
      worksheet.getCell(`I${totalRowIndex}`).font = { bold: true };

      // Excel dosyasını indir
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Maas_Simulasyonu_Senaryo_${selectedScenario}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`✅ Excel dosyası başarıyla indirildi!`);
    } catch (error) {
      console.error("Excel export hatası:", error);
      alert("Excel dosyası oluşturulurken bir hata oluştu.");
    }
  };

  const handleExportToPDF = async () => {
    if (!simResults) {
      alert("Lütfen önce simülasyon çalıştırın.");
      return;
    }

    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const selectedResults = simResults[selectedScenario];
      const scenarioNames = {
        A: "Standart",
        B: "Eşitlemeli",
        C: "Dengeli",
        D: "Yönetici Talepleri"
      };

      const doc = new jsPDF("landscape", "mm", "a4");
      
      // Başlık
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Maaş Simülasyonu - Senaryo ${selectedScenario}: ${scenarioNames[selectedScenario]}`, 14, 15);

      // Tarih ve parametreler
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString("tr-TR")} | Enflasyon Oranı: %${inflationRate}`, 14, 22);

      // Tablo verileri
      const tableData = selectedResults.map((result) => [
        result["Ad Soyad"],
        result.Departman,
        result.Profil,
        result.Performans.toFixed(1),
        result.Potansiyel.toFixed(1),
        result["Mevcut Maaş"].toLocaleString("tr-TR"),
        result["Yeni Maaş"].toLocaleString("tr-TR"),
        result["Zam Oranı (%)"].toFixed(2) + "%",
        result["Zam Açıklaması"],
        result["Eski Risk"],
        result["Yeni Risk"],
        result["Risk Mesafesi"]
      ]);

      // Toplam satırı
      const totalOld = selectedResults.reduce((sum, r) => sum + r["Mevcut Maaş"], 0);
      const totalNew = selectedResults.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
      const totalDiff = totalNew - totalOld;
      const totalRow = [
        "TOPLAM",
        "",
        "",
        "",
        "",
        totalOld.toLocaleString("tr-TR"),
        totalNew.toLocaleString("tr-TR"),
        ((totalDiff / totalOld) * 100).toFixed(2) + "%",
        "",
        "",
        "",
        ""
      ];

      autoTable(doc, {
        head: [[
          "Ad Soyad",
          "Departman",
          "Profil",
          "Performans",
          "Potansiyel",
          "Mevcut Maaş",
          "Yeni Maaş",
          "Zam Oranı",
          "Zam Açıklaması",
          "Eski Risk",
          "Yeni Risk",
          "Risk Mesafesi"
        ]],
        body: [...tableData, totalRow],
        startY: 28,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          // Toplam satırını vurgula
          if (data.row.index === tableData.length) {
            data.cell.styles.fillColor = [255, 245, 238];
            data.cell.styles.fontStyle = "bold";
          }
        }
      });

      // PDF'i indir
      const fileName = `Maas_Simulasyonu_Senaryo_${selectedScenario}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      alert(`✅ PDF dosyası başarıyla indirildi!`);
    } catch (error) {
      console.error("PDF export hatası:", error);
      alert("PDF dosyası oluşturulurken bir hata oluştu.");
    }
  };

  const getRiskBadgeClass = (risk: string) => {
    const value = (risk || "").toLowerCase();
    if (value.includes("🔴") || value.includes("kritik")) return "bg-red-100 text-red-700";
    if (value.includes("🟠") || value.includes("yüksek")) return "bg-orange-100 text-orange-700";
    if (value.includes("🟡") || value.includes("orta")) return "bg-amber-100 text-amber-700";
    if (value.includes("🟢") || value.includes("dengeli") || value.includes("iyi")) return "bg-green-100 text-green-700";
    if (value.includes("🔵") || value.includes("düşük")) return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-600";
  };

  const getRiskDistanceClass = (distance: any) => {
    const numeric = typeof distance === "number"
      ? distance
      : parseFloat(String(distance).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(numeric)) return "text-slate-600";
    if (numeric < 0) return "text-red-600";
    if (numeric > 0) return "text-emerald-600";
    return "text-slate-600";
  };

  const avatarColors = [
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

  const getAvatarColorClass = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const rowCellClass =
    "bg-white px-4 py-3 align-middle shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5 border border-transparent group-hover:border-blue-200";

  const handleResetBenchmark = () => {
    const calculated = calculateMarketAverages(employees);
    setMarketRefs(calculated);
    setStorageData("market_data_ref", calculated);
    alert("✅ Benchmarklar güncel veriye göre sıfırlandı!");
  };

  const handleCalculateNet = () => {
    const result = calculateNetSalary(grossInput);
    setNetResult(result);
  };

  const handleCurrencySimulation = () => {
    if (employees.length === 0 || marketRefs.length === 0) {
      alert("Veri bulunamadı. Lütfen önce organizasyon verilerini yükleyin.");
      return;
    }

    // Market referanslarını employee'lara ekle
    const marketMap = new Map<string, number>();
    marketRefs.forEach((ref) => {
      marketMap.set(`${ref.Departman}|${ref.Pozisyon}`, ref["Piyasa Ortalaması"]);
    });

    const employeesWithMarket = employees.map((emp) => ({
      ...emp,
      "Piyasa Ortalaması": marketMap.get(`${emp.Departman}|${emp.Pozisyon}`) || 45000,
    }));

    const result = calculateCurrencyImpact(employeesWithMarket, marketRefs, dollarIncrease);
    setCurrencyResult(result);
    setCurrencyModalOpen(true);
  };

  // Market referanslarını düzenle
  const handleMarketEdit = (index: number, field: keyof MarketReference, value: any) => {
    const updated = [...marketRefs];
    updated[index] = { ...updated[index], [field]: value };
    setMarketRefs(updated);
    setStorageData("market_data_ref", updated);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4 mt-3" />
          <div className="mt-6">
            <SkeletonTable rows={6} cols={6} />
          </div>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Erişim Yetkisi Yok</h2>
            <p className="text-sm text-slate-600 mb-4">
              Bu sayfa sadece <strong>CEO</strong> ve <strong>İK Yöneticileri</strong> için erişilebilir.
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Maaş artış taleplerinizi girmek için <strong>Bütçe Yönetimi</strong> sayfasını kullanabilirsiniz.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4" />
              <span>Bütçe Yönetimi sayfasına yönlendiriliyorsunuz...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-4 h-4 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-800">Maaş Simülasyonu</h1>
        </div>
        <p className="text-xs text-slate-500">Maaş simülasyonu, piyasa analizi ve brüt-net hesaplayıcı</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-4">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("simulation")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "simulation"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Simülasyon
          </button>
          <button
            onClick={() => setActiveTab("market")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "market"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Piyasa Analizi
          </button>
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "calculator"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Brüt-Net Hesaplayıcı
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "simulation" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enflasyon Input */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                Enflasyon Öngörüsü (%)
              </label>
              <input
                type="number"
                value={inflationRate}
                onChange={(e) => {
                  setInflationRate(parseInt(e.target.value) || 35);
                  setSimResults(null);
                }}
                min="0"
                max="100"
                step="5"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">Tüm senaryolar için temel parametredir.</p>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={handleRunSimulation}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <TrendingUp size={16} />
                  Karşılaştır
                </button>
                <button
                  onClick={() => setSimResults(null)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Dolar/Kur Simülasyonu */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Enflasyon/Kur Simülasyonu
                </h3>
              </div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                Dolar Artışı (%)
              </label>
              <input
                type="number"
                value={dollarIncrease}
                onChange={(e) => setDollarIncrease(parseInt(e.target.value) || 20)}
                min="0"
                max="100"
                step="5"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleCurrencySimulation}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <DollarSign size={16} />
                  Dolar %{dollarIncrease} Artarsa Maaş Yüküm Ne Olur?
                </button>
              </div>
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Dolar %{dollarIncrease} artarsa maaş yüküm ne olur?</p>
                  <p className="text-emerald-600 mt-0.5">
                    Kur artışının enflasyona etkisini hesaplar ve maaş yükünüzü simüle eder.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Benchmark Yönetimi - Dropdown */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <button
              onClick={() => setBenchmarkExpanded(!benchmarkExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <h2 className="text-sm font-semibold text-slate-800">Piyasa Rakamlarını Düzenle</h2>
              <div className="flex items-center gap-3">
                {benchmarkExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                )}
              </div>
            </button>
            {benchmarkExpanded && (
              <div className="p-6 pt-0 border-t border-slate-200">
                <div className="flex items-center justify-end mb-4">
                  <button
                    onClick={handleResetBenchmark}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Benchmarkları Sıfırla
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-y-2">
                    <thead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="text-left py-2 px-4">Departman</th>
                        <th className="text-left py-2 px-4">Pozisyon</th>
                        <th className="text-left py-2 px-4">Piyasa Ortalaması (TL)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketRefs.map((ref, idx) => (
                        <tr key={idx} className="group">
                          <td className={`${rowCellClass} text-slate-800 rounded-l-lg`}>{ref.Departman}</td>
                          <td className={`${rowCellClass} text-slate-800`}>{ref.Pozisyon}</td>
                          <td className={`${rowCellClass} rounded-r-lg`}>
                            <input
                              type="number"
                              value={ref["Piyasa Ortalaması"]}
                              onChange={(e) => handleMarketEdit(idx, "Piyasa Ortalaması", parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Senaryo Karşılaştırması */}
          {simResults && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Senaryo A */}
                <div 
                  className={`bg-white rounded-xl shadow-md p-6 transition-all cursor-pointer ${
                    selectedScenario === "A" ? "ring-2 ring-offset-2 ring-blue-500" : ""
                  }`}
                  onClick={() => setSelectedScenario("A")}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold">A</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Senaryo A: Bütçe Dostu (Standart)</h3>
                  </div>
                  <div className="space-y-3 mb-4">
                    <p className="text-sm text-slate-600">
                      <strong>Mantık:</strong> Sadece matris kuralları.
                    </p>
                    <p className="text-sm text-slate-600">
                      <strong>Risk:</strong> Alt bantta kalanlar orada kalabilir.
                    </p>
                    <p className="text-sm text-slate-600">
                      <strong>Tavan:</strong> Kıdem limitleri katı uygulanır.
                    </p>
                  </div>
                  {(() => {
                    const totalOld = employees.reduce((sum, e) => sum + e["Mevcut Maaş"], 0);
                    const totalNew = simResults.A.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
                    const cost = totalNew - totalOld;
                    const avgRaise = (cost / totalOld) * 100;
                    return (
                      <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-xs text-blue-700 mb-1 uppercase tracking-wide">Toplam Maliyet (Fark)</p>
                          <p className="text-3xl font-bold text-blue-600">{cost.toLocaleString("tr-TR")} ₺</p>
                        </div>
                        <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4">
                          <p className="text-xs text-blue-700 mb-1 uppercase tracking-wide">Ortalama Zam</p>
                          <p className="text-3xl font-bold text-blue-600">%{avgRaise.toFixed(1)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Senaryo B */}
                <div 
                  className={`bg-white rounded-xl shadow-md p-6 transition-all cursor-pointer ${
                    selectedScenario === "B" ? "ring-2 ring-offset-2 ring-green-500" : ""
                  }`}
                  onClick={() => setSelectedScenario("B")}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-bold">B</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Senaryo B: Piyasa Eşitleme (Adil)</h3>
                  </div>
                  <div className="space-y-3 mb-4">
                    <p className="text-sm text-slate-600">
                      <strong>Mantık:</strong> Alt Banttaki Değerli Personeli Kurtarır.
                    </p>
                    <p className="text-sm text-slate-600">
                      <strong>Hedef:</strong> Kilit ve üstü profilleri Kıdem Tavanına (Ideal Konuma) taşır.
                    </p>
                    <p className="text-sm text-slate-600">
                      <strong>Sonuç:</strong> Alt bantta sadece düşük performanslılar kalır.
                    </p>
                  </div>
                  {(() => {
                    const totalOld = employees.reduce((sum, e) => sum + e["Mevcut Maaş"], 0);
                    const totalNewA = simResults.A.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
                    const totalNewB = simResults.B.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
                    const costA = totalNewA - totalOld;
                    const costB = totalNewB - totalOld;
                    const diffCost = costB - costA;
                    const avgRaise = ((costB / totalOld) * 100);
                    return (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-xs text-green-700 mb-1 uppercase tracking-wide">Toplam Maliyet (Fark)</p>
                          <p className="text-3xl font-bold text-green-600">{costB.toLocaleString("tr-TR")} ₺</p>
                          <p className="text-xs text-green-600 mt-1">A'dan {diffCost.toLocaleString("tr-TR")} ₺ fark</p>
                        </div>
                        <div className="bg-green-50/60 border border-green-200 rounded-lg p-4">
                          <p className="text-xs text-green-700 mb-1 uppercase tracking-wide">Ortalama Zam</p>
                          <p className="text-3xl font-bold text-green-600">%{avgRaise.toFixed(1)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Senaryo C */}
                <div 
                  className={`bg-white rounded-xl shadow-md p-6 transition-all cursor-pointer ${
                    selectedScenario === "C" ? "ring-2 ring-offset-2 ring-orange-500" : ""
                  }`}
                  onClick={() => setSelectedScenario("C")}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Scale className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Senaryo C: Dengeli Optimizasyon (Hibrit)</h3>
                  </div>
                  <div className="space-y-3 mb-4">
                    <p className="text-sm text-slate-600">
                      <strong>Kısa Açıklama:</strong> Bütçe disiplini ile çalışan memnuniyeti arasındaki en güvenli orta yoldur. Radikal artışlar yerine "Kademeli İyileştirme" yapar.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">
                        <strong>Nasıl Çalışır:</strong>
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1 ml-4 list-disc">
                        <li>Bandın çok altında kalanları (Kırmızı Bölge) sadece <strong>"Bandın Giriş Seviyesine" (Minimum)</strong> taşır.</li>
                        <li>İdeal noktaya (Mid-point) hemen taşımaz, bu süreci zamana yayar.</li>
                        <li>Yüksek performanslılara standart üzeri ama tavanı aşmayan ek zam yapar.</li>
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-sm text-slate-600">
                        <strong>Sonuç:</strong> Sürdürülebilir Bütçe, Kontrollü Risk.
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        <strong>Risk:</strong> Yıldız çalışanlar piyasa seviyesine tam ulaşamadığı için hala risk altında olabilir.
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const totalOld = employees.reduce((sum, e) => sum + e["Mevcut Maaş"], 0);
                    const totalNewC = simResults.C.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
                    const costC = totalNewC - totalOld;
                    const avgRaise = ((costC / totalOld) * 100);
                    return (
                      <>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                          <p className="text-xs text-orange-700 mb-1 uppercase tracking-wide">Toplam Maliyet (Fark)</p>
                          <p className="text-3xl font-bold text-orange-600">{costC.toLocaleString("tr-TR")} ₺</p>
                        </div>
                        <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-4">
                          <p className="text-xs text-orange-700 mb-1 uppercase tracking-wide">Ortalama Zam</p>
                          <p className="text-3xl font-bold text-orange-600">%{avgRaise.toFixed(1)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Senaryo D */}
                <div 
                  className={`bg-white rounded-xl shadow-md p-6 transition-all cursor-pointer ${
                    selectedScenario === "D" ? "ring-2 ring-offset-2 ring-purple-500" : ""
                  }`}
                  onClick={() => setSelectedScenario("D")}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800">Senaryo D: Yönetici Talepleri</h3>
                      {scenarioDStats && (
                        <div className="group relative inline-block ml-2">
                          <Info className="w-4 h-4 text-slate-400 hover:text-purple-600 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64">
                            <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
                              <div className="font-semibold mb-1">Veri Kaynağı</div>
                              <div className="text-slate-300">
                                {scenarioDStats.totalDepartments} departmandan {scenarioDStats.submittedDepartments} tanesi talep girdi.
                                {scenarioDStats.defaultCount > 0 && (
                                  <span className="block mt-1">
                                    {scenarioDStats.defaultCount} departman için varsayılan oran kullanılıyor.
                                  </span>
                                )}
                              </div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                                <div className="border-4 border-transparent border-t-slate-900"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <p className="text-sm text-slate-600">
                      <strong>Açıklama:</strong> Departman yöneticilerinin sahadaki gerçeğe göre talep ettiği artışlar.
                    </p>
                    <p className="text-sm text-slate-600">
                      <strong>Mantık:</strong> Yönetici önerisi varsa onu kullanır, yoksa varsayılan enflasyon oranını kullanır.
                    </p>
                    {scenarioDStats && scenarioDStats.submittedDepartments > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-xs text-purple-700">
                          <strong>📊 Veri Durumu:</strong> {scenarioDStats.submittedDepartments}/{scenarioDStats.totalDepartments} departmandan gerçek talep alındı.
                          {scenarioDStats.defaultCount > 0 && (
                            <span className="block mt-1">
                              {scenarioDStats.defaultCount} departman için varsayılan enflasyon oranı (%{inflationRate}) uygulanıyor.
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const totalOld = employees.reduce((sum, e) => sum + e["Mevcut Maaş"], 0);
                    const totalNewD = simResults.D.reduce((sum, r) => sum + r["Yeni Maaş"], 0);
                    const costD = totalNewD - totalOld;
                    const avgRaise = ((costD / totalOld) * 100);
                    
                    // Count employees with submitted budget requests
                    const submittedCount = simResults.D.filter(r => {
                      const request = budgetRequests.find(req => req.employee_id === r["Ad Soyad"] && req.status === "Gönderildi");
                      return request && request.requested_rate > 0;
                    }).length;
                    
                    return (
                      <>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                          <p className="text-xs text-purple-700 mb-1 uppercase tracking-wide">Toplam Maliyet (Fark)</p>
                          <p className="text-3xl font-bold text-purple-600">{costD.toLocaleString("tr-TR")} ₺</p>
                        </div>
                        <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-4">
                          <p className="text-xs text-purple-700 mb-1 uppercase tracking-wide">Ortalama Zam</p>
                          <p className="text-3xl font-bold text-purple-600">%{avgRaise.toFixed(1)}</p>
                          {submittedCount > 0 && (
                            <p className="text-xs text-purple-600 mt-1">
                              {submittedCount} personel için yönetici talebi uygulandı
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Görselleştirmeler */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Senaryo A: Risk Dağılımı</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="Performans"
                        name="Performans"
                        domain={[0, 5]}
                        label={{ value: "Performans", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="Yeni_CR"
                        name="CR"
                        domain={[0.5, 1.6]}
                        label={{ value: "Comp Ratio", angle: -90, position: "insideLeft" }}
                      />
                      <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload as SimulationResult;
                            return (
                              <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                <p className="font-bold text-slate-800">{data["Ad Soyad"]}</p>
                                <p className="text-sm text-slate-600">CR: {data["Yeni_CR"].toFixed(2)}</p>
                                <p className="text-sm text-slate-600">Risk: {data["Yeni Risk"]}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={simResults.A} fill="#3b82f6">
                        {simResults.A.map((entry, index) => {
                          let color = "#6b7280";
                          if (entry["Yeni Risk"].includes("🟢")) color = "#10b981";
                          else if (entry["Yeni Risk"].includes("🟡")) color = "#f59e0b";
                          else if (entry["Yeni Risk"].includes("🟠")) color = "#f97316";
                          else if (entry["Yeni Risk"].includes("🔵")) color = "#3b82f6";
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Senaryo B: Dengeli Dağılım</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="Performans"
                        name="Performans"
                        domain={[0, 5]}
                        label={{ value: "Performans", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="Yeni_CR"
                        name="CR"
                        domain={[0.5, 1.6]}
                        label={{ value: "Comp Ratio", angle: -90, position: "insideLeft" }}
                      />
                      <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload as SimulationResult;
                            return (
                              <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                <p className="font-bold text-slate-800">{data["Ad Soyad"]}</p>
                                <p className="text-sm text-slate-600">CR: {data["Yeni_CR"].toFixed(2)}</p>
                                <p className="text-sm text-slate-600">Risk: {data["Yeni Risk"]}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={simResults.B} fill="#10b981">
                        {simResults.B.map((entry, index) => {
                          let color = "#6b7280";
                          if (entry["Yeni Risk"].includes("🟢")) color = "#10b981";
                          else if (entry["Yeni Risk"].includes("🟡")) color = "#f59e0b";
                          else if (entry["Yeni Risk"].includes("🟠")) color = "#f97316";
                          else if (entry["Yeni Risk"].includes("🔵")) color = "#3b82f6";
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Senaryo C: Hibrit Dağılım</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="Performans"
                        name="Performans"
                        domain={[0, 5]}
                        label={{ value: "Performans", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="Yeni_CR"
                        name="CR"
                        domain={[0.5, 1.6]}
                        label={{ value: "Comp Ratio", angle: -90, position: "insideLeft" }}
                      />
                      <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" />
                      <ReferenceLine y={0.80} stroke="#f97316" strokeDasharray="2 2" strokeOpacity={0.5} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload as SimulationResult;
                            return (
                              <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                <p className="font-bold text-slate-800">{data["Ad Soyad"]}</p>
                                <p className="text-sm text-slate-600">CR: {data["Yeni_CR"].toFixed(2)}</p>
                                <p className="text-sm text-slate-600">Risk: {data["Yeni Risk"]}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={simResults.C} fill="#f97316">
                        {simResults.C.map((entry, index) => {
                          let color = "#6b7280";
                          if (entry["Yeni Risk"].includes("🟢")) color = "#10b981";
                          else if (entry["Yeni Risk"].includes("🟡")) color = "#f59e0b";
                          else if (entry["Yeni Risk"].includes("🟠")) color = "#f97316";
                          else if (entry["Yeni Risk"].includes("🔵")) color = "#3b82f6";
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Senaryo D: Yönetici Talepleri</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="Performans"
                        name="Performans"
                        domain={[0, 5]}
                        label={{ value: "Performans", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="Yeni_CR"
                        name="CR"
                        domain={[0.5, 1.6]}
                        label={{ value: "Comp Ratio", angle: -90, position: "insideLeft" }}
                      />
                      <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload as SimulationResult;
                            return (
                              <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                <p className="font-bold text-slate-800">{data["Ad Soyad"]}</p>
                                <p className="text-sm text-slate-600">CR: {data["Yeni_CR"].toFixed(2)}</p>
                                <p className="text-sm text-slate-600">Risk: {data["Yeni Risk"]}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={simResults.D} fill="#a855f7">
                        {simResults.D.map((entry, index) => {
                          let color = "#6b7280";
                          if (entry["Yeni Risk"].includes("🟢")) color = "#10b981";
                          else if (entry["Yeni Risk"].includes("🟡")) color = "#f59e0b";
                          else if (entry["Yeni Risk"].includes("🟠")) color = "#f97316";
                          else if (entry["Yeni Risk"].includes("🔵")) color = "#3b82f6";
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Senaryo Seçimi ve Kaydetme */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">✅ Karar ve Onay</h3>
                <div className="space-y-4">
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scenario"
                        value="A"
                        checked={selectedScenario === "A"}
                        onChange={(e) => setSelectedScenario(e.target.value as "A" | "B" | "C" | "D")}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium">Senaryo A (Standart)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scenario"
                        value="B"
                        checked={selectedScenario === "B"}
                        onChange={(e) => setSelectedScenario(e.target.value as "A" | "B" | "C" | "D")}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium">Senaryo B (Eşitlemeli)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scenario"
                        value="C"
                        checked={selectedScenario === "C"}
                        onChange={(e) => setSelectedScenario(e.target.value as "A" | "B" | "C" | "D")}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium">Senaryo C (Dengeli)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scenario"
                        value="D"
                        checked={selectedScenario === "D"}
                        onChange={(e) => setSelectedScenario(e.target.value as "A" | "B" | "C" | "D")}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium">Senaryo D (Yönetici Talepleri)</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      onClick={handleSaveScenario}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                    >
                      <Save size={20} />
                      Senaryoyu Uygula ve Kaydet
                    </button>
                    <button
                      onClick={handleExportToExcel}
                      className="px-5 py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <FileSpreadsheet size={20} />
                      Excel'e Aktar (.xlsx)
                    </button>
                    <button
                      onClick={handleExportToPDF}
                      className="px-5 py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <FileDown size={20} />
                      PDF'e Aktar (.pdf)
                    </button>
                  </div>
                </div>
              </div>

              {/* Detaylı Liste */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">
                  📋 Seçili Senaryo Detay Listesi (Tüm Veriler)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-y-2">
                    <thead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="text-left py-2 px-4">Ad Soyad</th>
                        <th className="text-left py-2 px-4">Departman</th>
                        <th className="text-left py-2 px-4">Profil</th>
                        <th className="text-left py-2 px-4">Performans</th>
                        <th className="text-left py-2 px-4">Potansiyel</th>
                        <th className="text-right py-2 px-4">Mevcut Maaş</th>
                        <th className="text-right py-2 px-4">Yeni Maaş</th>
                        <th className="text-left py-2 px-4">Zam Oranı (%)</th>
                        <th className="text-left py-2 px-4">Yıllık Bonus (TL)</th>
                        <th className="text-left py-2 px-4">Bonus Oranı (%)</th>
                        <th className="text-left py-2 px-4">Zam Açıklaması</th>
                        <th className="text-left py-2 px-4">Eski Risk</th>
                        <th className="text-left py-2 px-4">Yeni Risk</th>
                        <th className="text-left py-2 px-4">Risk Mesafesi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedScenario === "A" ? simResults.A : selectedScenario === "B" ? simResults.B : selectedScenario === "C" ? simResults.C : simResults.D).map((result, idx) => {
                        // Senaryo D için gap analizi
                        const isScenarioD = selectedScenario === "D";
                        const emp = employees.find(e => e["Ad Soyad"] === result["Ad Soyad"]);
                        const hasManagerProposal = emp?.manager_proposal !== undefined && emp.manager_proposal !== null;
                        let systemProposal = 0;
                        let gap = 0;
                        let gapPercentage = 0;
                        if (isScenarioD && hasManagerProposal) {
                          // Senaryo B'yi referans olarak kullan
                          const scenarioBResult = simResults.B.find(r => r["Ad Soyad"] === result["Ad Soyad"]);
                          if (scenarioBResult) {
                            systemProposal = scenarioBResult["Yeni Maaş"];
                            gap = result["Yeni Maaş"] - systemProposal;
                            gapPercentage = (gap / systemProposal) * 100;
                          }
                        }
                        const isHighGap = gapPercentage > 10; // %10'dan fazla fark varsa yüksek
                        const isLowGap = gapPercentage < -10; // %10'dan az fark varsa düşük
                        const displayName = result["Ad Soyad"] || "";
                        const avatarClass = getAvatarColorClass(displayName);
                        const initials = getInitials(displayName);
                        const photoUrl = (result as any).photo || (result as any).avatar || (result as any).image;
                        
                        return (
                        <tr key={idx} className="group">
                          <td className={`${rowCellClass} rounded-l-lg`}>
                            <div className="flex items-center gap-3">
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={displayName}
                                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                                />
                              ) : (
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${avatarClass} ring-2 ring-white`}>
                                  {initials}
                                </div>
                              )}
                              {result.is_star_performer && (
                                <span className="text-yellow-500 text-lg" title="🌟 Yüksek Performans (Star Performer) - +%10 ek zam alır">
                                  🌟
                                </span>
                              )}
                              <span className="text-slate-800 font-semibold">{displayName}</span>
                            </div>
                          </td>
                          <td className={`${rowCellClass} text-slate-600`}>{result.Departman}</td>
                          <td className={`${rowCellClass} text-slate-600 text-sm`}>{result.Profil}</td>
                          <td className={`${rowCellClass}`}>{result.Performans.toFixed(1)}</td>
                          <td className={`${rowCellClass}`}>{result.Potansiyel.toFixed(1)}</td>
                          <td className={`${rowCellClass} text-right font-semibold text-slate-800`}>
                            {result["Mevcut Maaş"].toLocaleString("tr-TR")} ₺
                          </td>
                          <td className={`${rowCellClass} text-right font-bold ${
                            isScenarioD && isHighGap ? "text-yellow-700 bg-yellow-100" : 
                            isScenarioD && isLowGap ? "text-red-700 bg-red-100" : 
                            "text-green-600"
                          }`}>
                            {result["Yeni Maaş"].toLocaleString("tr-TR")} ₺
                            {isScenarioD && hasManagerProposal && systemProposal > 0 && (
                              <div className="text-xs mt-1 font-normal">
                                <span className={isHighGap ? "text-yellow-700" : isLowGap ? "text-red-700" : "text-slate-500"}>
                                  Sistem: {systemProposal.toLocaleString("tr-TR")} ₺
                                  {gap !== 0 && (
                                    <span className={`ml-1 ${isHighGap ? "text-yellow-700 font-bold" : isLowGap ? "text-red-700 font-bold" : ""}`}>
                                      ({gap > 0 ? "+" : ""}{gap.toLocaleString("tr-TR")} ₺, {gapPercentage > 0 ? "+" : ""}{gapPercentage.toFixed(1)}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className={rowCellClass}>
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                result["Zam Oranı (%)"] > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {result["Zam Oranı (%)"].toFixed(2)}%
                            </span>
                          </td>
                          <td className={`${rowCellClass} text-slate-600 text-sm font-mono`}>
                            {result["Yıllık Bonus (TL)"] > 0 ? (
                              <span className="text-green-700 font-semibold">
                                {result["Yıllık Bonus (TL)"].toLocaleString("tr-TR")} ₺
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className={`${rowCellClass} text-slate-600 text-sm`}>
                            {result["Bonus Oranı (%)"] > 0 ? (
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                result["Bonus Oranı (%)"] >= 15
                                  ? "bg-green-100 text-green-700"
                                  : result["Bonus Oranı (%)"] >= 10
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                                %{result["Bonus Oranı (%)"]}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className={`${rowCellClass} text-slate-600 text-sm`}>{result["Zam Açıklaması"]}</td>
                          <td className={`${rowCellClass} text-sm`}>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskBadgeClass(result["Eski Risk"])}`}>
                              {result["Eski Risk"]}
                            </span>
                          </td>
                          <td className={`${rowCellClass} text-sm`}>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskBadgeClass(result["Yeni Risk"])}`}>
                              {result["Yeni Risk"]}
                            </span>
                          </td>
                          <td className={`${rowCellClass} rounded-r-lg text-sm font-semibold ${getRiskDistanceClass(result["Risk Mesafesi"])}`}>
                            {result["Risk Mesafesi"]}
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "market" && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">📊 Piyasa Konumlandırma Analizi</h2>
          {employees.length > 0 && marketRefs.length > 0 && (
            <div>
              {(() => {
                const marketMap = new Map<string, number>();
                marketRefs.forEach((ref) => {
                  marketMap.set(`${ref.Departman}|${ref.Pozisyon}`, ref["Piyasa Ortalaması"]);
                });

                const compRatios = employees.map((emp) => {
                  const marketKey = `${emp.Departman}|${emp.Pozisyon}`;
                  const marketAvg = marketMap.get(marketKey) || 45000;
                  const currentSalary = emp["Mevcut Maaş"] || 0;
                  const ratio = marketAvg > 0 ? currentSalary / marketAvg : 0;
                  return {
                    name: emp["Ad Soyad"],
                    Departman: emp.Departman,
                    Pozisyon: emp.Pozisyon,
                    currentSalary,
                    marketAvg,
                    ratio,
                    diffPct: marketAvg > 0 ? ((currentSalary - marketAvg) / marketAvg) * 100 : 0,
                  };
                });

                const belowCount = compRatios.filter((r) => r.ratio < 1).length;
                const aboveCount = compRatios.filter((r) => r.ratio > 1).length;

                const filteredList = compRatios
                  .filter((row) => {
                    if (marketListFilter === "below") return row.ratio < 1;
                    if (marketListFilter === "above") return row.ratio > 1;
                    return true;
                  })
                  .filter((row) => {
                    if (!marketSearch.trim()) return true;
                    const q = marketSearch.toLowerCase();
                    return (
                      row.name.toLowerCase().includes(q) ||
                      row.Departman.toLowerCase().includes(q) ||
                      row.Pozisyon.toLowerCase().includes(q)
                    );
                  })
                  .sort((a, b) => {
                    if (marketListFilter === "below") return a.ratio - b.ratio;
                    if (marketListFilter === "above") return b.ratio - a.ratio;
                    return a.name.localeCompare(b.name, "tr");
                  });

                return (
                  <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={compRatios.map((row) => ({
                      name: row.name,
                      Comp_Ratio: row.ratio,
                      Departman: row.Departman,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis label={{ value: "Comp Ratio", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" />
                      <Bar dataKey="Comp_Ratio" fill="#3b82f6">
                        {compRatios.map((entry, index) => {
                          let color = "#3b82f6";
                          if (entry.ratio < 0.8) color = "#ef4444";
                          else if (entry.ratio < 1.0) color = "#f59e0b";
                          else if (entry.ratio > 1.25) color = "#10b981";
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">Piyasa Altı:</span> {belowCount} kişi •{" "}
                        <span className="font-semibold text-slate-800">Piyasa Üstü:</span> {aboveCount} kişi
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={marketSearch}
                          onChange={(e) => setMarketSearch(e.target.value)}
                          placeholder="İsim / Departman / Pozisyon ara..."
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={marketListFilter}
                          onChange={(e) => setMarketListFilter(e.target.value as "all" | "below" | "above")}
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">Tümü</option>
                          <option value="below">Piyasa Altı</option>
                          <option value="above">Piyasa Üstü</option>
                        </select>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl bg-slate-50/60 p-2">
                      <table className="w-full border-separate border-spacing-y-2">
                        <thead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <tr>
                            <th className="text-left px-4 py-2">Personel</th>
                            <th className="text-left px-4 py-2">Departman</th>
                            <th className="text-left px-4 py-2">Pozisyon</th>
                            <th className="text-right px-4 py-2">Mevcut Maaş</th>
                            <th className="text-right px-4 py-2">Piyasa Ort.</th>
                            <th className="text-right px-4 py-2">Fark (%)</th>
                            <th className="text-right px-4 py-2">Comp Ratio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                                Filtreye uygun personel bulunamadı.
                              </td>
                            </tr>
                          ) : (
                            filteredList.map((row, idx) => (
                              <tr key={`${row.name}-${idx}`} className="group">
                                <td className={`${rowCellClass} rounded-l-lg`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColorClass(row.name)} ring-2 ring-white`}>
                                      {getInitials(row.name)}
                                    </div>
                                    <span className="text-slate-800 font-medium">{row.name}</span>
                                  </div>
                                </td>
                                <td className={`${rowCellClass} text-slate-600`}>{row.Departman}</td>
                                <td className={`${rowCellClass} text-slate-600`}>{row.Pozisyon}</td>
                                <td className={`${rowCellClass} text-right font-mono text-slate-700`}>
                                  {row.currentSalary.toLocaleString("tr-TR")} ₺
                                </td>
                                <td className={`${rowCellClass} text-right font-mono text-slate-700`}>
                                  {row.marketAvg.toLocaleString("tr-TR")} ₺
                                </td>
                                <td className={`${rowCellClass} text-right font-mono ${
                                  row.diffPct < 0 ? "text-red-600" : row.diffPct > 0 ? "text-emerald-600" : "text-slate-600"
                                }`}>
                                  {row.diffPct >= 0 ? "+" : ""}{row.diffPct.toFixed(1)}%
                                </td>
                                <td className={`${rowCellClass} rounded-r-lg text-right font-mono ${
                                  row.ratio < 1 ? "text-amber-600" : row.ratio > 1 ? "text-emerald-600" : "text-slate-600"
                                }`}>
                                  {row.ratio.toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === "calculator" && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">🧮 Hızlı Maaş Hesaplayıcı</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Brüt Maaş Giriniz (TL)
              </label>
              <input
                type="number"
                value={grossInput}
                onChange={(e) => setGrossInput(parseFloat(e.target.value) || 0)}
                min={17002}
                step={1000}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCalculateNet}
                className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Hesapla 🧮
              </button>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Bilgi: SGK, İşsizlik, Gelir Vergisi (1. Dilim) ve Damga Vergisi dahildir.
                </p>
              </div>
            </div>
            <div>
              {netResult && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                    <p className="text-sm text-green-700 mb-2">Net Maaş</p>
                    <p className="text-3xl font-bold text-green-600">
                      {netResult["Net Maaş"].toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ₺
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-red-50 rounded">
                      <span className="text-slate-700">SGK (%14)</span>
                      <span className="font-medium text-red-700">
                        {netResult["SGK (%14)"].toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ₺
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 rounded">
                      <span className="text-slate-700">İşsizlik (%1)</span>
                      <span className="font-medium text-red-700">
                        {netResult["İşsizlik (%1)"].toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ₺
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 rounded">
                      <span className="text-slate-700">Gelir Vergisi (%15)</span>
                      <span className="font-medium text-red-700">
                        {netResult["Gelir Vergisi (%15)"].toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ₺
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 rounded">
                      <span className="text-slate-700">Damga Vergisi</span>
                      <span className="font-medium text-red-700">
                        {netResult["Damga Vergisi"].toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ₺
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Currency Simulation Modal */}
      <CurrencySimulationModal
        isOpen={currencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        result={currencyResult}
      />
    </div>
  );
}
