"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, AlertTriangle, TrendingUp, ShieldCheck, UserCheck, 
  ArrowRight, Crown, BadgePercent 
} from 'lucide-react';
import { getStorageData, STORAGE_KEYS } from '../../utils/storage';
import Skeleton, { SkeletonTable } from '../../../components/ui/Skeleton';
import { API_BASE_URL } from "@/lib/apiConfig";

// Benchmark veri yapısı
interface MarketReference {
  Departman: string;
  Pozisyon: string;
  "Piyasa Ortalaması": number;
}

// --- HİYERARŞİ PUANLAMA MOTORU ---
const getHierarchyScore = (positionName: string): number => {
  const pos = (positionName || "").toLowerCase();
  if (['genel müdür', 'ceo', 'cfo', 'cto', 'başkan', 'board'].some(x => pos.includes(x))) return 90;
  if (pos.includes('direktör')) return 80;
  if (pos.includes('müdür')) return 60;
  if (['yönetici', 'manager', 'şef', 'lider', 'head'].some(x => pos.includes(x))) return 50;
  if (['kıdemli', 'senior', 'chief'].some(x => pos.includes(x))) return 40;
  if (['uzman', 'mühendis', 'analist', 'sorumlu'].some(x => pos.includes(x))) return 30;
  if (['asistan', 'yardımcı', 'stajyer'].some(x => pos.includes(x))) return 10;
  return 20;
};

// --- RİSK HESAPLAMA MOTORU (Benchmark Bazlı) ---
const calculateFlightRisk = (person: any, allEmployees: any[], marketRefs: MarketReference[]) => {
  let riskScore = 10;
  const reasons: string[] = [];
  
  const salary = Number(person.salary || 0);
  const tenure = 3; // Demo veri (Gerçek veride hesaplanmalı)
  const perf = Number(person.performance || 0);
  const pot = Number(person.potential || 0);
  const dept = person.department;
  const position = person.position;

  // A. MAAŞ RİSKİ (Benchmark Bazlı)
  if (salary > 0 && marketRefs.length > 0) {
    // Önce departman + pozisyon bazlı benchmark ara
    let benchmark = marketRefs.find(
      (ref) => ref.Departman === dept && ref.Pozisyon === position
    )?.["Piyasa Ortalaması"];

    // Bulunamazsa, sadece departman bazlı ara
    if (!benchmark) {
      const deptRefs = marketRefs.filter(ref => ref.Departman === dept);
      if (deptRefs.length > 0) {
        benchmark = deptRefs.reduce((sum, ref) => sum + ref["Piyasa Ortalaması"], 0) / deptRefs.length;
      }
    }

    // Hala bulunamazsa, aynı departmandaki çalışanların ortalamasını kullan (fallback)
    if (!benchmark || benchmark === 0) {
      const peers = allEmployees.filter(e => e.department === dept && e.salary > 0);
      benchmark = peers.length > 0 
        ? peers.reduce((sum, e) => sum + Number(e.salary || 0), 0) / peers.length
        : 0;
    }

    // Benchmark bulunduysa risk hesapla
    if (benchmark > 0) {
      const salaryRatio = salary / benchmark;
      
      if (salaryRatio < 0.85) {
        riskScore += 40;
        const gapPercent = ((benchmark - salary) / benchmark * 100).toFixed(0);
        reasons.push(`💰 Maaş piyasanın çok altında (Benchmark: ${benchmark.toLocaleString('tr-TR')} TL, Eksik: %${gapPercent})`);
      } else if (salaryRatio < 0.95) {
        riskScore += 15;
        const gapPercent = ((benchmark - salary) / benchmark * 100).toFixed(0);
        reasons.push(`📉 Maaş piyasanın hafif altında (Benchmark: ${benchmark.toLocaleString('tr-TR')} TL, Eksik: %${gapPercent})`);
      }
    }
  }

  // B. YILDIZ RİSKİ
  if (pot >= 4.5 && perf >= 4.0) {
    riskScore += 20;
    reasons.push("Yıldız Oyuncu (Transfer Riski)");
  }

  // C. PERFORMANS ETKİSİ
  if (perf < 3.0) {
    riskScore += 10;
    reasons.push("Düşük performans kaynaklı risk");
  }

  riskScore = Math.min(riskScore, 99);
  
  let level = "Düşük";
  let color = "text-green-600 bg-green-50 border-green-200";
  
  if (riskScore >= 70) {
    level = "KRİTİK";
    color = "text-red-600 bg-red-50 border-red-200";
  } else if (riskScore >= 40) {
    level = "Orta/Yüksek";
    color = "text-orange-600 bg-orange-50 border-orange-200";
  }

  // KAYIP ETKİSİ
  let impact = "Düşük";
  if (perf >= 4.0 || pot >= 4.0) impact = "YÜKSEK 🚨";
  else if (perf >= 3.0) impact = "Orta";

  return { riskScore, level, color, reasons, impact };
};

const getMatchScore = (candidate: any, target: any) => {
  const perf = Number(candidate?.performance || 0);
  const pot = Number(candidate?.potential || 0);
  const base = ((perf + pot) / 10) * 100;
  const targetPerf = Number(target?.performance || 0);
  const targetPot = Number(target?.potential || 0);
  const alignment = 100 - (Math.abs(targetPerf - perf) * 6 + Math.abs(targetPot - pot) * 6);
  const score = Math.round(base * 0.6 + alignment * 0.4);
  return Math.max(50, Math.min(95, score));
};

export default function YedeklemePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [marketRefs, setMarketRefs] = useState<MarketReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("Tümü");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Kullanıcı bilgisini yükle
  useEffect(() => {
    const storedUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
    setCurrentUser(storedUser);
  }, []);

  // VERİ ÇEKME
  useEffect(() => {
    async function fetchData() {
      try {
        // Kullanıcı bilgisini al
        const user = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
        const userRole = user?.role || "EMPLOYEE";
        const userDept = user?.dept || user?.department || "";
        
        // Backend'e kullanıcı bilgilerini gönder
        const params = new URLSearchParams();
        if (userRole) params.append('user_role', userRole);
        if (userDept) params.append('user_dept', userDept);
        
        const res = await fetch(`${API_BASE_URL}/api/talent-matrix?${params.toString()}`);
        if (!res.ok) throw new Error("Veri hatası");
        const json = await res.json();
        let empData = Array.isArray(json.data) ? json.data : [];
        
        // Hiyerarşi kontrolü: Frontend'de de filtreleme yap (ekstra güvenlik)
        if (userRole !== "CEO" && userRole !== "IK") {
          if (userRole === "DIRECTOR" || userRole === "MANAGER") {
            // Direktör ve Müdürler sadece kendi departmanlarını görebilir
            empData = empData.filter((emp: any) => {
              return emp.department === userDept;
            });
          } else {
            // Diğer roller hiçbir şey göremez
            empData = [];
          }
        }
        
        setEmployees(empData);
        
        // Benchmark verilerini hesapla (Departman + Pozisyon bazlı)
        if (empData.length > 0) {
          // Basit benchmark hesaplama (calculateMarketAverages benzeri mantık)
          const benchmarkMap = new Map<string, { total: number; count: number }>();
          
          empData.forEach((e: any) => {
            const key = `${e.department || 'Genel'}|${e.position || 'Belirsiz'}`;
            const existing = benchmarkMap.get(key) || { total: 0, count: 0 };
            benchmarkMap.set(key, {
              total: existing.total + (e.salary || 0),
              count: existing.count + 1,
            });
          });

          const benchmarks: MarketReference[] = [];
          benchmarkMap.forEach((value, key) => {
            const [dept, pos] = key.split("|");
            const avg = Math.round(value.total / value.count / 100) * 100; // Round to nearest 100
            benchmarks.push({
              Departman: dept,
              Pozisyon: pos,
              "Piyasa Ortalaması": avg || 45000,
            });
          });
          
          setMarketRefs(benchmarks);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ANALİZ VE HESAPLAMALAR
  const analyzedData = useMemo(() => {
    if (!employees.length || !marketRefs.length) return [];

    return employees.map(emp => {
      const risk = calculateFlightRisk(emp, employees, marketRefs);
      const rankScore = getHierarchyScore(emp.position);
      
      // Yedek Adayları Bul (Aynı departman, alt veya eş kademe, yüksek potansiyel)
      const successors = employees
        .filter(c => 
          c.department === emp.department && 
          c.id !== emp.id && 
          getHierarchyScore(c.position) <= rankScore &&
          Number(c.potential) >= 3.5
        )
        .sort((a, b) => Number(b.potential) - Number(a.potential)) // Potansiyele göre sırala
        .slice(0, 3) // İlk 3 adayı al
        .map(s => ({
            ...s,
            risk: calculateFlightRisk(s, employees, marketRefs) // Yedeklerin de riskini hesapla
        }));

      return { ...emp, ...risk, rankScore, successors };
    }).sort((a, b) => b.riskScore - a.riskScore); // En riskliler üstte
  }, [employees, marketRefs]);

  // FİLTRELEME
  const filteredList = useMemo(() => {
    if (deptFilter === "Tümü") return analyzedData;
    return analyzedData.filter(e => e.department === deptFilter);
  }, [analyzedData, deptFilter]);

  // İSTATİSTİKLER
  const stats = useMemo(() => {
    const critical = analyzedData.filter(e => e.level === "KRİTİK").length;
    const avgRisk = analyzedData.reduce((sum, e) => sum + e.riskScore, 0) / (analyzedData.length || 1);
    return { critical, avgRisk };
  }, [analyzedData]);

if (loading) return (
  <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
    <div className="w-full max-w-3xl bg-white rounded-2xl p-8 shadow-sm">
      <Skeleton className="h-6 w-1/3" />
      <div className="mt-4">
        <SkeletonTable rows={6} cols={5} />
      </div>
    </div>
  </div>
);

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen pb-20 bg-[#FAFAFA]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-2">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-600 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-orange-600" /> Yedekleme ve Risk Analizi
          </h2>
          <p className="text-zinc-500 mt-1">Kritik pozisyonların risk analizi ve yedekleme planlaması.</p>
        </div>
        
        {/* Filtre */}
        <div className="w-full md:w-64">
            <label className="text-xs font-bold text-zinc-400 mb-1 block uppercase">Departman Filtrele</label>
            <select 
                className="w-full p-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 outline-none focus:ring-2 focus:ring-orange-100"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
            >
                <option value="Tümü">Tümü</option>
                {Array.from(new Set(employees.map(e => e.department))).map((d:any) => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
        </div>
      </div>

      {/* METRİKLER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-full"><AlertTriangle className="w-6 h-6"/></div>
            <div>
                <span className="text-zinc-500 text-xs font-bold uppercase">Kritik Personel Riski</span>
                <div className="text-2xl font-black text-zinc-800">{stats.critical} Kişi</div>
            </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-full"><TrendingUp className="w-6 h-6"/></div>
            <div>
                <span className="text-zinc-500 text-xs font-bold uppercase">Ortalama Risk Skoru</span>
                <div className="text-2xl font-black text-zinc-800">%{stats.avgRisk.toFixed(1)}</div>
            </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Users className="w-6 h-6"/></div>
            <div>
                <span className="text-zinc-500 text-xs font-bold uppercase">Yedekleme Hazırlığı</span>
                <div className="text-2xl font-black text-zinc-800">%65</div>
            </div>
        </div>
      </div>

      {/* RİSK KARTLARI LİSTESİ */}
      <div className="space-y-4">
        {filteredList.map((emp) => (
            <div key={emp.id} className={`bg-white rounded-[1.5rem] border shadow-sm transition-all hover:shadow-md overflow-hidden ${emp.level === 'KRİTİK' ? 'border-red-200' : 'border-zinc-200'}`}>
              <div className="p-6">
                {/* ÜST KISIM: PERSONEL BİLGİLERİ */}
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            emp.level === 'KRİTİK' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                            {emp.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-zinc-800">{emp.name}</h3>
                            <p className="text-sm text-zinc-500">{emp.position} • {emp.department}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="text-right">
                            <span className="block text-[10px] text-zinc-400 font-bold uppercase">İstifa Riski</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${emp.color}`}>
                                %{emp.riskScore} - {emp.level}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] text-zinc-400 font-bold uppercase">Kayıp Etkisi</span>
                            <span className="font-bold text-zinc-700">{emp.impact}</span>
                        </div>
                    </div>
                </div>

                {/* ALT KISIM: DETAYLAR VE YEDEKLER */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* SOL: RİSK ANALİZİ */}
                    <div>
                        <h4 className="font-bold text-zinc-800 text-sm mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500"/> Risk Analizi
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                <span className="text-xs text-zinc-400">Performans</span>
                                <div className="font-bold text-zinc-700">{emp.performance} / 5.0</div>
                            </div>
                            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                <span className="text-xs text-zinc-400">Potansiyel</span>
                                <div className="font-bold text-zinc-700">{emp.potential} / 5.0</div>
                            </div>
                        </div>

                        {emp.reasons.length > 0 && (
                            <div className="space-y-2">
                                {emp.reasons.map((r: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                                        <span>{r}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SAĞ: ÖNERİLEN YEDEKLER */}
                    <div className="border-l border-zinc-100 pl-0 lg:pl-8">
                        <h4 className="font-bold text-zinc-800 text-sm mb-3 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-blue-500"/> Önerilen Yedekler
                        </h4>
                        
                        <div className="space-y-3">
                            {emp.successors.length > 0 ? (
                                emp.successors.map((succ: any) => {
                                    const matchScore = getMatchScore(succ, emp);
                                    const matchColor = matchScore >= 80 ? "bg-green-500" : matchScore >= 65 ? "bg-amber-500" : "bg-red-500";
                                    const matchTextColor = matchScore >= 80 ? "text-green-700" : matchScore >= 65 ? "text-amber-700" : "text-red-700";
                                    return (
                                      <div key={succ.id} className="flex items-center justify-between gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors">
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center text-xs font-bold shadow-sm">
                                                  {succ.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="text-sm font-bold text-zinc-700">{succ.name}</div>
                                                  <div className="text-[10px] text-zinc-500">{succ.position}</div>
                                              </div>
                                          </div>
                                          
                                          <div className="text-right min-w-[120px]">
                                              <div className={`text-[10px] font-semibold ${matchTextColor}`}>
                                                  %{matchScore} Uyumlu
                                              </div>
                                              <div className="mt-1 h-1.5 w-24 bg-zinc-200 rounded-full overflow-hidden ml-auto">
                                                  <div className={`h-full ${matchColor}`} style={{ width: `${matchScore}%` }} />
                                              </div>
                                              <div className="mt-1 flex items-center gap-2 justify-end">
                                                  <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-500 font-mono">
                                                      Pot: {succ.potential}
                                                  </span>
                                                  {succ.risk.level === "KRİTİK" && (
                                                      <span className="text-[10px] text-red-500 font-bold" title="Bu aday da riskli!">⚠️</span>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                    );
                                })
                            ) : (
                                <div className="text-center p-4 text-zinc-400 text-xs italic bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                    Uygun iç yedek bulunamadı.
                                </div>
                            )}
                            <button
                              type="button"
                              className="w-full mt-2 py-2.5 text-xs font-semibold text-zinc-600 border border-dashed border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors"
                            >
                              + Yeni Yedek Ekle
                            </button>
                        </div>
                    </div>

                </div>
              </div>
              <div className="border-t border-zinc-200 bg-zinc-50/80 px-6 py-3 flex justify-end gap-2">
                <button className="px-3 py-1.5 text-xs font-semibold text-zinc-700 border border-zinc-300 rounded-md hover:bg-white transition-colors">
                  Profili İncele
                </button>
                <button className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                  Elde Tutma Planı Oluştur
                </button>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
}