"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Pencil, Plus, Search, UserRoundCheck, Users, X } from "lucide-react";
import { DEPARTMENTS, POSITIONS } from "../../data/jobData";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";

interface EmployeeRow {
  id?: string | number;
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  "İşe Giriş Tarihi"?: string;
  "Kıdem (Yıl)"?: number;
  [key: string]: any;
}

const emptyForm = { name: "", department: "", position: "", manager1: "", manager2: "", hireDate: "" };
const PAGE_SIZE = 18;

function tenureYears(employee: EmployeeRow): number {
  const direct = Number(employee["Kıdem (Yıl)"] ?? employee.Calisma_Yili ?? employee.tenure);
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct * 10) / 10;
  const value = employee["İşe Giriş Tarihi"] || employee.hireDate;
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : Math.round(((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FH";
}

function departmentTone(index: number) {
  const tones = [
    "bg-blue-50 text-blue-700 ring-blue-100",
    "bg-violet-50 text-violet-700 ring-violet-100",
    "bg-emerald-50 text-emerald-700 ring-emerald-100",
    "bg-amber-50 text-amber-700 ring-amber-100",
    "bg-cyan-50 text-cyan-700 ring-cyan-100",
    "bg-rose-50 text-rose-700 ring-rose-100",
    "bg-slate-100 text-slate-700 ring-slate-200",
  ];
  return tones[index % tones.length];
}

export default function OrganizasyonPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("Tümü");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);

  const reload = () => setEmployees(getStorageData<EmployeeRow[]>(STORAGE_KEYS.ORG_CHART, []));
  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener("dataUpdated", handler);
    window.addEventListener("storageCleared", handler);
    return () => {
      window.removeEventListener("dataUpdated", handler);
      window.removeEventListener("storageCleared", handler);
    };
  }, []);

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.Departman).filter(Boolean))).sort(), [employees]);
  const departmentIndex = useMemo(() => new Map(departments.map((name, index) => [name, index])), [departments]);
  const managerNames = useMemo(() => new Set(employees.map((e) => e["Yönetici 1"]).filter(Boolean)), [employees]);
  const filtered = useMemo(() => employees.filter((employee) => {
    const q = search.toLocaleLowerCase("tr-TR").trim();
    const matches = !q || [employee["Ad Soyad"], employee.Departman, employee.Pozisyon, employee["Yönetici 1"], employee["Yönetici 2"]]
      .some((v) => String(v || "").toLocaleLowerCase("tr-TR").includes(q));
    return matches && (department === "Tümü" || employee.Departman === department);
  }), [employees, search, department]);

  useEffect(() => setPage(1), [search, department]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (employee: EmployeeRow) => {
    setEditingId(employee.id ?? employee["Ad Soyad"]);
    setForm({
      name: employee["Ad Soyad"] || "",
      department: employee.Departman || "",
      position: employee.Pozisyon || "",
      manager1: employee["Yönetici 1"] || "",
      manager2: employee["Yönetici 2"] || "",
      hireDate: employee["İşe Giriş Tarihi"] || employee.hireDate || "",
    });
    setFormOpen(true);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.department || !form.position) return;
    const existing = editingId === null ? null : employees.find((employee) => (employee.id ?? employee["Ad Soyad"]) === editingId);
    const employee: EmployeeRow = {
      ...(existing || {}),
      id: existing?.id ?? `emp-${Date.now()}`,
      "Ad Soyad": form.name.trim(),
      Departman: form.department,
      Pozisyon: form.position,
      "Yönetici 1": form.manager1 || undefined,
      "Yönetici 2": form.manager2 || undefined,
      "İşe Giriş Tarihi": form.hireDate || undefined,
    };
    const next = existing
      ? employees.map((item) => (item.id ?? item["Ad Soyad"]) === editingId ? employee : item)
      : [employee, ...employees];
    setEmployees(next);
    setStorageData(STORAGE_KEYS.ORG_CHART, next);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
    setFormOpen(false);
  };

  const avgTenure = employees.length ? employees.reduce((sum, employee) => sum + tenureYears(employee), 0) / employees.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-blue-600">Personel ana verisi</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">Çalışan Dizini</h2>
          <p className="mt-1 text-xs text-slate-500">Departman, pozisyon, bağlı yönetici ve kıdem bilgisinin tek doğruluk kaynağı.</p>
        </div>
        <button onClick={openNew} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(37,99,235,.22)] hover:from-blue-700 hover:to-indigo-700">
          <Plus className="h-4 w-4" /> Çalışan ekle
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Toplam çalışan" value={employees.length} icon={Users} accent="blue" />
        <Metric label="Departman" value={departments.length} icon={Building2} accent="violet" />
        <Metric label="Yönetici rolü" value={managerNames.size} icon={UserRoundCheck} accent="emerald" />
        <Metric label="Ort. kıdem" value={`${avgTenure.toFixed(1)} yıl`} icon={Building2} accent="amber" />
      </div>

      <section className="overflow-hidden rounded-[18px] border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03),0_14px_36px_rgba(15,23,42,.055)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/70 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Çalışan, pozisyon veya yönetici ara"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,.02)] outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="h-11 min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <option>Tümü</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </select>
            <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 md:inline-flex dark:border-slate-700 dark:bg-slate-950">{filtered.length} kayıt</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/95 dark:bg-slate-950/70">
                <th className="sticky top-0 z-10 w-[240px] border-b border-slate-200 px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:border-slate-800">Çalışan</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:border-slate-800">Departman</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:border-slate-800">Pozisyon</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:border-slate-800">1. Yönetici</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:border-slate-800">2. Yönetici</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:border-slate-800">Kıdem</th>
                <th className="sticky top-0 z-10 w-[82px] border-b border-slate-200 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:border-slate-800">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((employee) => {
                const deptIndex = departmentIndex.get(employee.Departman) ?? 0;
                return (
                  <tr key={employee.id ?? employee["Ad Soyad"]} className="group bg-white transition-colors hover:bg-blue-50/35 dark:bg-slate-900 dark:hover:bg-slate-800/60">
                    <td className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-blue-50 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200/80 group-hover:from-blue-100 group-hover:to-indigo-50 group-hover:text-blue-700 dark:from-slate-800 dark:to-slate-800 dark:text-slate-200 dark:ring-slate-700">{initials(employee["Ad Soyad"])}</div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">{employee["Ad Soyad"]}</p>
                          <p className="mt-0.5 truncate text-[10px] text-slate-400">{employee.id ? `ID ${employee.id}` : "Aktif çalışan"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${departmentTone(deptIndex)}`}>{employee.Departman || "—"}</span></td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-[12px] font-medium text-slate-700 dark:border-slate-800/80 dark:text-slate-300">{employee.Pozisyon || "—"}</td>
                    <td className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80"><ManagerChip name={employee["Yönetici 1"]} /></td>
                    <td className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80"><ManagerChip name={employee["Yönetici 2"]} /></td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-right font-mono text-[12px] font-semibold tabular-nums text-slate-700 dark:border-slate-800/80 dark:text-slate-300">{tenureYears(employee).toFixed(1)} yıl</td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-right dark:border-slate-800/80">
                      <button onClick={() => openEdit(employee)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-2.5 text-[11px] font-semibold text-slate-500 opacity-75 transition-all hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 group-hover:opacity-100 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-blue-300">
                        <Pencil className="h-3.5 w-3.5" /> Düzenle
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!visibleRows.length && (
                <tr><td colSpan={7} className="px-6 py-16 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-500">Aramanızla eşleşen çalışan bulunamadı.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/35">
          <p className="text-xs text-slate-400">{filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} / ${filtered.length} çalışan` : "0 çalışan"}</p>
          <div className="flex items-center gap-2">
            <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ChevronLeft className="h-3.5 w-3.5" /> Önceki</button>
            <span className="min-w-[58px] text-center text-xs font-semibold text-slate-500">{currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Sonraki <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </section>

      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"><form onSubmit={save} className="w-full max-w-xl rounded-2xl border border-white/50 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-blue-600">Çalışan kaydı</p><h2 className="mt-1 text-lg font-semibold">{editingId ? "Çalışanı düzenle" : "Yeni çalışan"}</h2></div><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Ad Soyad"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></Field><Field label="Departman"><select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Seçin</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></Field><Field label="Pozisyon"><select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Seçin</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></Field><Field label="İşe giriş tarihi"><input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></Field><Field label="1. Yönetici"><select value={form.manager1} onChange={(e) => setForm({ ...form, manager1: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Yok</option>{employees.filter((e) => e["Ad Soyad"] !== form.name).map((e) => <option key={e.id ?? e["Ad Soyad"]}>{e["Ad Soyad"]}</option>)}</select></Field><Field label="2. Yönetici"><select value={form.manager2} onChange={(e) => setForm({ ...form, manager2: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Yok</option>{employees.filter((e) => e["Ad Soyad"] !== form.name).map((e) => <option key={e.id ?? e["Ad Soyad"]}>{e["Ad Soyad"]}</option>)}</select></Field></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Vazgeç</button><button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Kaydet</button></div></form></div>}
    </div>
  );
}

function Metric({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent: "blue" | "violet" | "emerald" | "amber" }) {
  const styles = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
  }[accent];
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.025),0_8px_24px_rgba(15,23,42,.04)] dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div><p className="text-[11px] font-medium text-slate-500">{label}</p><p className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset ${styles}`}><Icon className="h-4 w-4" /></span></div></div>;
}

function ManagerChip({ name }: { name?: string }) {
  if (!name) return <span className="text-xs text-slate-300">—</span>;
  return <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[8px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{initials(name)}</span><span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{name}</span></div>;
}

function Field({ label, children }: { label: string; children: any }) {
  return <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}<div className="mt-1">{children}</div></label>;
}
