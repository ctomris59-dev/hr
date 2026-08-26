"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus, Search, Users, X } from "lucide-react";
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

function tenureYears(employee: EmployeeRow): number {
  const direct = Number(employee["Kıdem (Yıl)"] ?? employee.Calisma_Yili ?? employee.tenure);
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct * 10) / 10;
  const value = employee["İşe Giriş Tarihi"] || employee.hireDate;
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : Math.round(((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

export default function OrganizasyonPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [tab, setTab] = useState<"chart" | "directory">("chart");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("Tümü");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState(emptyForm);

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
  const filtered = useMemo(() => employees.filter((employee) => {
    const q = search.toLocaleLowerCase("tr-TR");
    const matches = !q || [employee["Ad Soyad"], employee.Departman, employee.Pozisyon, employee["Yönetici 1"]].some((v) => String(v || "").toLocaleLowerCase("tr-TR").includes(q));
    return matches && (department === "Tümü" || employee.Departman === department);
  }), [employees, search, department]);

  const roots = useMemo(() => {
    const names = new Set(employees.map((employee) => employee["Ad Soyad"]));
    return filtered.filter((employee) => !employee["Yönetici 1"] || !names.has(employee["Yönetici 1"]));
  }, [employees, filtered]);

  const childrenOf = (name: string) => filtered.filter((employee) => employee["Yönetici 1"] === name);

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
    const next = existing ? employees.map((item) => (item.id ?? item["Ad Soyad"]) === editingId ? employee : item) : [employee, ...employees];
    setEmployees(next);
    setStorageData(STORAGE_KEYS.ORG_CHART, next);
    window.dispatchEvent(new CustomEvent("dataUpdated"));
    setFormOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">İnsan & organizasyon ana verisi</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Çalışanlar & Organizasyon</h1>
          <p className="mt-1 text-sm text-slate-500">Kim çalışıyor, hangi rolde, hangi departmanda, kime bağlı ve kıdemi ne? Ücret, performans ve potansiyel kendi uzman modüllerinde yönetilir.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"><Plus className="h-4 w-4"/>Çalışan ekle</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Toplam çalışan" value={employees.length} icon={Users}/>
        <Metric label="Departman" value={departments.length} icon={Building2}/>
        <Metric label="Yönetici rolü" value={employees.filter((e) => childrenOf(e["Ad Soyad"]).length > 0).length} icon={Users}/>
        <Metric label="Ort. kıdem" value={`${employees.length ? (employees.reduce((s,e)=>s+tenureYears(e),0)/employees.length).toFixed(1) : "0,0"} yıl`} icon={Building2}/>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><Search className="h-4 w-4 text-slate-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Çalışan, pozisyon veya yönetici ara" className="h-10 w-full bg-transparent text-sm outline-none"/></div>
        <select value={department} onChange={(e)=>setDepartment(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option>Tümü</option>{departments.map((d)=><option key={d}>{d}</option>)}</select>
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800"><button onClick={()=>setTab("chart")} className={`rounded-lg px-3 py-2 font-semibold ${tab === "chart" ? "bg-white shadow-sm dark:bg-slate-900" : "text-slate-500"}`}>Organizasyon Şeması</button><button onClick={()=>setTab("directory")} className={`rounded-lg px-3 py-2 font-semibold ${tab === "directory" ? "bg-white shadow-sm dark:bg-slate-900" : "text-slate-500"}`}>Çalışan Dizini</button></div>
      </div>

      {tab === "chart" ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="min-w-[720px] space-y-8">{roots.length ? roots.map((root)=><OrgNode key={root.id ?? root["Ad Soyad"]} employee={root} childrenOf={childrenOf} onEdit={openEdit}/>) : <p className="text-sm text-slate-500">Organizasyon şeması için çalışan ve yönetici ilişkisi ekleyin.</p>}</div></div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Çalışan</th><th>Departman</th><th>Pozisyon</th><th>1. Yönetici</th><th>2. Yönetici</th><th className="text-right">Kıdem</th><th></th></tr></thead><tbody>{filtered.map((employee)=><tr key={employee.id ?? employee["Ad Soyad"]}><td>{employee["Ad Soyad"]}</td><td>{employee.Departman}</td><td>{employee.Pozisyon}</td><td>{employee["Yönetici 1"] || "—"}</td><td>{employee["Yönetici 2"] || "—"}</td><td className="text-right font-mono">{tenureYears(employee).toFixed(1)} yıl</td><td className="text-right"><button onClick={()=>openEdit(employee)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4"/></button></td></tr>)}</tbody></table></div></div>}

      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><form onSubmit={save} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? "Çalışanı düzenle" : "Yeni çalışan"}</h2><button type="button" onClick={()=>setFormOpen(false)}><X className="h-5 w-5"/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Ad Soyad"><input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></Field><Field label="Departman"><select value={form.department} onChange={(e)=>setForm({...form,department:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Seçin</option>{DEPARTMENTS.map((d)=><option key={d}>{d}</option>)}</select></Field><Field label="Pozisyon"><select value={form.position} onChange={(e)=>setForm({...form,position:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Seçin</option>{POSITIONS.map((p)=><option key={p}>{p}</option>)}</select></Field><Field label="İşe giriş tarihi"><input type="date" value={form.hireDate} onChange={(e)=>setForm({...form,hireDate:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></Field><Field label="1. Yönetici"><select value={form.manager1} onChange={(e)=>setForm({...form,manager1:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Yok</option>{employees.filter((e)=>e["Ad Soyad"] !== form.name).map((e)=><option key={e.id ?? e["Ad Soyad"]}>{e["Ad Soyad"]}</option>)}</select></Field><Field label="2. Yönetici"><select value={form.manager2} onChange={(e)=>setForm({...form,manager2:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Yok</option>{employees.filter((e)=>e["Ad Soyad"] !== form.name).map((e)=><option key={e.id ?? e["Ad Soyad"]}>{e["Ad Soyad"]}</option>)}</select></Field></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Vazgeç</button><button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Kaydet</button></div></form></div>}
    </div>
  );
}

function Metric({label,value,icon:Icon}:{label:string;value:string|number;icon:any}) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{label}</p><Icon className="h-4 w-4 text-sky-600"/></div><p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p></div> }
function Field({label,children}:{label:string;children:any}) { return <label className="text-xs font-medium text-slate-600">{label}<div className="mt-1">{children}</div></label> }
function OrgNode({employee,childrenOf,onEdit,depth=0}:{employee:EmployeeRow;childrenOf:(name:string)=>EmployeeRow[];onEdit:(e:EmployeeRow)=>void;depth?:number}) {
  const children = childrenOf(employee["Ad Soyad"]);
  return <div className="flex flex-col items-center"><button onClick={()=>onEdit(employee)} className="min-w-[220px] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"><p className="font-semibold text-slate-900 dark:text-white">{employee["Ad Soyad"]}</p><p className="mt-1 text-xs text-sky-700">{employee.Pozisyon}</p><p className="mt-1 text-[11px] text-slate-500">{employee.Departman}</p></button>{children.length > 0 && <><div className="h-5 w-px bg-slate-300"/><div className="flex items-start justify-center gap-5 border-t border-slate-300 pt-5">{children.map((child)=><OrgNode key={child.id ?? child["Ad Soyad"]} employee={child} childrenOf={childrenOf} onEdit={onEdit} depth={depth+1}/>)}</div></>}</div>
}
