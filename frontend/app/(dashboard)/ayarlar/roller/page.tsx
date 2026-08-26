"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Save, Check, X, Info, AlertCircle } from 'lucide-react';
import Skeleton, { SkeletonTable } from '../../../../components/ui/Skeleton';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/lib/apiConfig";

// Modül Listesi (Sütunlar)
const MODULES = [
  { key: "budget", label: "Bütçe Yönetimi" },
  { key: "salary_sim", label: "Maaş Simülasyonu" },
  { key: "talent", label: "Yetenek & Kariyer" },
  { key: "org_chart", label: "Org. Şeması & İzin" },
];

export default function RolYonetimiPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 0. Kullanıcı Rolünü Kontrol Et
  useEffect(() => {
    const storedUser = localStorage.getItem("hr_current_user") || localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
        const userRole = parsed.role || "EMPLOYEE";
        setCurrentUserRole(userRole);
        
        // Sadece CEO erişebilir
        if (userRole !== "CEO") {
          alert("⚠️ Bu sayfaya sadece CEO erişebilir!");
          router.push("/dashboard");
          return;
        }
      } catch (e) {
        console.error("Kullanıcı bilgisi okunamadı:", e);
        router.push("/dashboard");
      }
    } else {
      router.push("/dashboard");
    }
  }, [router]);

  // 1. Verileri Backend'den Çek
  useEffect(() => {
    if (currentUserRole !== "CEO") return; // Sadece CEO için veri çek
    
    async function fetchRoles() {
      setError(null);
      try {
        const res = await fetch(API_BASE_URL + '/api/roles');
        if (res.ok) {
            const json = await res.json();
            console.log("Backend'den gelen roller:", json);
            if (json.success && json.data && Array.isArray(json.data)) {
              let rolesData = json.data;
              
              // Müdür rolünün olup olmadığını kontrol et
              const hasManager = rolesData.some((role: any) => role.id === "manager" || role.id === "role_manager");
              
              // Eğer Müdür yoksa veya 4'ten az rol varsa, varsayılan rolleri ekle
              if (!hasManager || rolesData.length < 4) {
                console.warn("Müdür rolü bulunamadı veya eksik roller var, varsayılan veri kullanılıyor");
                const defaultRoles = [
                  { id: "ceo", name: "CEO / Genel Müdür", rank: 1, permissions: { all_data_access: true } },
                  { id: "director", name: "Direktör", rank: 2, permissions: { budget: { view: true, edit: true }, talent: { view: true, edit: true } } },
                  { id: "manager", name: "Müdür", rank: 3, permissions: { talent: { view: true, edit: true }, org_chart: { view: true } } },
                  { id: "employee", name: "Personel", rank: 4, permissions: {} },
                ];
                
                // Mevcut rolleri koru, eksikleri ekle
                const existingIds = new Set(rolesData.map((r: any) => r.id));
                defaultRoles.forEach(defaultRole => {
                  if (!existingIds.has(defaultRole.id)) {
                    rolesData.push(defaultRole);
                  }
                });
                
                // Rank'e göre sırala
                rolesData.sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999));
              }
              
              setRoles(rolesData);
            } else {
              // Backend'den veri gelmediyse varsayılan veri göster
              console.warn("Backend'den geçerli veri gelmedi, varsayılan veri kullanılıyor");
              setRoles([
                { id: "ceo", name: "CEO / Genel Müdür", rank: 1, permissions: { all_data_access: true } },
                { id: "director", name: "Direktör", rank: 2, permissions: { budget: { view: true, edit: true }, talent: { view: true, edit: true } } },
                { id: "manager", name: "Müdür", rank: 3, permissions: { talent: { view: true, edit: true }, org_chart: { view: true } } },
                { id: "employee", name: "Personel", rank: 4, permissions: {} },
              ]);
            }
        } else {
            // Backend hazır değilse varsayılan demo veri göster
            console.warn("Backend yanıt vermedi, varsayılan veri kullanılıyor");
            setRoles([
                { id: "ceo", name: "CEO / Genel Müdür", rank: 1, permissions: { all_data_access: true } },
                { id: "director", name: "Direktör", rank: 2, permissions: { budget: { view: true, edit: true }, talent: { view: true, edit: true } } },
                { id: "manager", name: "Müdür", rank: 3, permissions: { talent: { view: true, edit: true }, org_chart: { view: true } } },
                { id: "employee", name: "Personel", rank: 4, permissions: {} },
            ]);
        }
      } catch (e: any) {
        console.error("Roller çekilemedi:", e);
        setError(`Veri yüklenirken hata oluştu: ${e.message || "Bilinmeyen hata"}`);
        // Hata durumunda da varsayılan veri göster
        setRoles([
          { id: "ceo", name: "CEO / Genel Müdür", rank: 1, permissions: { all_data_access: true } },
          { id: "director", name: "Direktör", rank: 2, permissions: { budget: { view: true, edit: true }, talent: { view: true, edit: true } } },
          { id: "manager", name: "Müdür", rank: 3, permissions: { talent: { view: true, edit: true }, org_chart: { view: true } } },
          { id: "employee", name: "Personel", rank: 4, permissions: {} },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchRoles();
  }, [currentUserRole]);

  // 2. Yetki Değiştirme (Toggle)
  const togglePermission = (roleIndex: number, moduleKey: string, type: 'view' | 'edit') => {
    const newRoles = [...roles];
    // Mevcut izinleri al yoksa boş obje oluştur
    if (!newRoles[roleIndex].permissions) newRoles[roleIndex].permissions = {};
    
    const currentPerm = newRoles[roleIndex].permissions[moduleKey] || { view: false, edit: false };
    
    // Eğer 'edit' (Düzenleme) açılırsa 'view' (Görme) de otomatik açılsın
    if (type === 'edit' && !currentPerm.edit) {
        newRoles[roleIndex].permissions[moduleKey] = { ...currentPerm, edit: true, view: true };
    } else {
        newRoles[roleIndex].permissions[moduleKey] = { ...currentPerm, [type]: !currentPerm[type] };
    }
    setRoles(newRoles);
  };

  // 3. "Tüm Veriyi Görür" Toggle
  const toggleDataAccess = (roleIndex: number) => {
    const newRoles = [...roles];
    if (!newRoles[roleIndex].permissions) newRoles[roleIndex].permissions = {};
    newRoles[roleIndex].permissions.all_data_access = !newRoles[roleIndex].permissions.all_data_access;
    setRoles(newRoles);
  };

  // 4. Rütbe Değiştirme
  const changeRank = (roleIndex: number, val: string) => {
    const newRoles = [...roles];
    newRoles[roleIndex].rank = Number(val);
    setRoles(newRoles);
  };

  // 5. Kaydetme İşlemi
  const handleSave = async () => {
    if (currentUserRole !== "CEO") {
      alert("⚠️ Bu işlemi sadece CEO yapabilir!");
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(API_BASE_URL + '/api/roles/update', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ roles })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        alert(`✅ ${result.message || "Rol ayarları başarıyla kaydedildi!"}`);
      } else {
        const errorMsg = result.error || "Kaydedilirken hata oluştu.";
        setError(errorMsg);
        alert(`❌ Hata: ${errorMsg}`);
      }
    } catch (e: any) {
      const errorMsg = `Sunucuya ulaşılamadı: ${e.message || "Bilinmeyen hata"}`;
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Erişim kontrolü - Sadece CEO görebilir
  if (currentUserRole !== "CEO") {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Erişim Reddedildi</h2>
          <p className="text-slate-600">Bu sayfaya sadece CEO erişebilir.</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-full max-w-3xl bg-white rounded-xl p-8 shadow-sm">
        <Skeleton className="h-6 w-1/3" />
        <div className="mt-4">
          <SkeletonTable rows={6} cols={4} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[#F8FAFC]">
      
      {/* BAŞLIK ALANI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                <Shield className="w-8 h-8 text-indigo-600" /> Rol ve Yetki Yönetimi
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Hangi rolün hangi modüle erişebileceğini ve hiyerarşi seviyesini buradan yönetin.</p>
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
        </div>
        <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
        >
            {saving ? <Skeleton variant="circular" width={20} height={20} /> : <Save className="w-5 h-5"/>}
            {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </button>
      </div>

      {/* TABLO KARTI */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Rol Adı</th>
                        <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider w-32 text-center">Hiyerarşi<br/>(1=En Üst)</th>
                        <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider w-40 text-center bg-slate-100/50 border-l border-r border-slate-200">Global Görüş<br/>(Tüm Şirket)</th>
                        {MODULES.map(m => (
                            <th key={m.key} className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider text-center min-w-[140px]">
                                {m.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {roles.map((role, idx) => (
                        <tr key={role.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            
                            {/* ROL İSMİ */}
                            <td className="p-5">
                                <div className="font-bold text-slate-800 text-base">{role.name}</div>
                                <div className="text-xs text-slate-400 font-mono mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">{role.id}</div>
                            </td>

                            {/* HİYERARŞİ SEVİYESİ */}
                            <td className="p-5 text-center">
                                <input 
                                    type="number" min="1" max="10"
                                    value={role.rank}
                                    onChange={(e) => changeRank(idx, e.target.value)}
                                    className="w-16 p-2 text-center font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                                />
                            </td>

                            {/* GLOBAL GÖRÜŞ (TOGGLE) */}
                            <td className="p-5 text-center border-l border-r border-slate-100 bg-slate-50/30">
                                <div className="flex flex-col items-center justify-center">
                                    <button 
                                        onClick={() => toggleDataAccess(idx)}
                                        className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 ${
                                            role.permissions?.all_data_access ? 'bg-indigo-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                                            role.permissions?.all_data_access ? 'translate-x-5' : 'translate-x-0'
                                        }`}/>
                                    </button>
                                    <span className={`text-[10px] mt-1 font-bold ${role.permissions?.all_data_access ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {role.permissions?.all_data_access ? 'Açık' : 'Kapalı'}
                                    </span>
                                </div>
                            </td>

                            {/* MODÜL YETKİLERİ */}
                            {MODULES.map(mod => {
                                const perm = role.permissions?.[mod.key] || { view: false, edit: false };
                                return (
                                    <td key={mod.key} className="p-5">
                                        <div className="flex flex-col gap-2">
                                            {/* Gör */}
                                            <div 
                                                onClick={() => togglePermission(idx, mod.key, 'view')}
                                                className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex justify-between items-center select-none ${
                                                    perm.view 
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <span>Gör</span>
                                                {perm.view ? <Check className="w-3.5 h-3.5"/> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>}
                                            </div>

                                            {/* Yönet */}
                                            <div 
                                                onClick={() => togglePermission(idx, mod.key, 'edit')}
                                                className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex justify-between items-center select-none ${
                                                    perm.edit 
                                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <span>Yönet</span>
                                                {perm.edit ? <Check className="w-3.5 h-3.5"/> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>}
                                            </div>
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      
      {/* BİLGİ KUTUSU */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm flex gap-3 items-start max-w-4xl">
        <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600"/>
        <div>
            <strong className="block mb-1 text-amber-900">Nasıl Çalışır?</strong>
            <ul className="list-disc pl-4 space-y-1 opacity-90">
                <li><strong>Hiyerarşi Seviyesi (Rank):</strong> Düşük sayı daha yüksek yetki demektir (1 = CEO). Bir yönetici, sadece kendi seviyesinden büyük (daha alt) çalışanları yönetebilir.</li>
                <li><strong>Global Görüş:</strong> Açık olduğunda (Örn: CEO), kişi departmanına bakılmaksızın tüm şirketi görür. Kapalıysa sadece kendi departmanını görür.</li>
                <li><strong>Gör / Yönet:</strong> "Yönet" yetkisi verildiğinde "Gör" otomatik olarak açılır.</li>
            </ul>
        </div>
      </div>

    </div>
  );
}