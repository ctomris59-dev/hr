"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, CheckCircle2, Clock3, Plus } from "lucide-react";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { useNotifications } from "../../../context/NotificationContext";

interface TrainingAssignment {
  id: string;
  employee: string;
  trainingId: string;
  trainingName: string;
  source?: string;
  assignedBy?: string;
  assignedAt: string;
  dueDate?: string;
  status: "Atandı" | "Devam Ediyor" | "Tamamlandı";
  completedAt?: string;
}

const CATALOG = [
  { id:"digital", name:"Dijital Okuryazarlık ve Verimlilik", category:"Dijital", duration:"6 saat" },
  { id:"analytics", name:"Analitik Düşünme ve Problem Çözme", category:"Yetkinlik", duration:"8 saat" },
  { id:"communication", name:"Etkili İletişim ve Geri Bildirim", category:"Yetkinlik", duration:"6 saat" },
  { id:"leadership", name:"Yeni Nesil Liderlik", category:"Liderlik", duration:"10 saat" },
  { id:"strategy", name:"Stratejik Düşünme", category:"Liderlik", duration:"8 saat" },
  { id:"compliance", name:"Etik, Uyum ve Kurumsal Sorumluluk", category:"Uyum", duration:"4 saat" },
];

export default function EgitimPage() {
  const { addNotification, showToast } = useNotifications();
  const [user,setUser] = useState<any>(null);
  const [orgData,setOrgData] = useState<any[]>([]);
  const [assignments,setAssignments] = useState<TrainingAssignment[]>([]);
  const [tab,setTab] = useState<"mine"|"catalog"|"manage">("mine");
  const [form,setForm] = useState({employee:"",trainingId:"",dueDate:""});

  const reload=()=>{setUser(getStorageData(STORAGE_KEYS.CURRENT_USER,null));setOrgData(getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]));setAssignments(getStorageData<TrainingAssignment[]>(STORAGE_KEYS.TRAINING_ASSIGNMENTS,[]));};
  useEffect(()=>{reload();const h=()=>reload();window.addEventListener("dataUpdated",h);return()=>window.removeEventListener("dataUpdated",h)},[]);
  const name=user?.name||user?.username||"";
  const role=String(user?.role||"").toUpperCase();
  const manageable=useMemo(()=>{if(!user)return[];if(role==="CEO"||role==="IK")return orgData;try{return getManageableEmployees(user,orgData)}catch{return[]}},[user,orgData,role]);
  const myAssignments=assignments.filter((a)=>a.employee===name);
  const teamAssignments=assignments.filter((a)=>manageable.some((e:any)=>e["Ad Soyad"]===a.employee));
  const overdue=(a:TrainingAssignment)=>a.status!=="Tamamlandı"&&Boolean(a.dueDate)&&new Date(a.dueDate!)<new Date();

  const saveAssignments=(next:TrainingAssignment[])=>{setAssignments(next);setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS,next);window.dispatchEvent(new CustomEvent("dataUpdated"));};
  const assign=(event:FormEvent)=>{event.preventDefault();const training=CATALOG.find((item)=>item.id===form.trainingId);if(!training||!form.employee)return;const item:TrainingAssignment={id:`training-${Date.now()}`,employee:form.employee,trainingId:training.id,trainingName:training.name,assignedBy:name,assignedAt:new Date().toISOString(),dueDate:form.dueDate||undefined,status:"Atandı"};saveAssignments([item,...assignments]);addNotification(`${training.name} eğitimi atandı.`,"info",{targetUser:form.employee,link:"/egitim",source:"training"});setForm({employee:"",trainingId:"",dueDate:""});};
  const setStatus=(id:string,status:TrainingAssignment["status"])=>{const next=assignments.map((a)=>a.id===id?{...a,status,completedAt:status==="Tamamlandı"?new Date().toISOString():undefined}:a);saveAssignments(next);showToast("Eğitim durumu güncellendi.","success")};

  return <div className="space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Öğrenme operasyonları</p><h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Eğitim</h1><p className="mt-1 text-sm text-slate-500">Bu modül yalnızca eğitim kataloğu, atama, son tarih ve tamamlanma takibini yönetir. Yetkinlik açığı ve gelişim hedefleri Gelişim Planı'nda yönetilir.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Bana atanan" value={myAssignments.length} icon={BookOpen}/><Metric label="Devam eden" value={myAssignments.filter(a=>a.status!=="Tamamlandı").length} icon={Clock3}/><Metric label="Tamamlanan" value={myAssignments.filter(a=>a.status==="Tamamlandı").length} icon={CheckCircle2}/></div>
    <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">{[["mine","Eğitimlerim"],["catalog","Katalog"],...(manageable.length?[["manage","Ekip Eğitimleri"]]:[])].map(([key,label]:any)=><button key={key} onClick={()=>setTab(key)} className={`rounded-lg px-3 py-2 font-semibold ${tab===key?"bg-slate-900 text-white dark:bg-white dark:text-slate-900":"text-slate-500"}`}>{label}</button>)}</div>

    {tab==="mine"&&<AssignmentTable rows={myAssignments} editable onStatus={setStatus} overdue={overdue}/>} 
    {tab==="catalog"&&<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{CATALOG.map((training)=><div key={training.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">{training.category}</span><h3 className="mt-3 text-sm font-semibold">{training.name}</h3><p className="mt-1 text-xs text-slate-500">Süre: {training.duration}</p></div>)}</div>}
    {tab==="manage"&&<div className="grid gap-5 xl:grid-cols-[360px_1fr]"><form onSubmit={assign} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Plus className="h-4 w-4 text-violet-600"/><h2 className="text-sm font-semibold">Eğitim ata</h2></div><div className="mt-4 space-y-3"><select value={form.employee} onChange={(e)=>setForm({...form,employee:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Çalışan seçin</option>{manageable.map((e:any)=><option key={e.id??e["Ad Soyad"]}>{e["Ad Soyad"]}</option>)}</select><select value={form.trainingId} onChange={(e)=>setForm({...form,trainingId:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Eğitim seçin</option>{CATALOG.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</select><label className="block text-xs font-medium text-slate-600">Son tarih<input type="date" value={form.dueDate} onChange={(e)=>setForm({...form,dueDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></label><button className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Ata</button></div></form><AssignmentTable rows={teamAssignments} overdue={overdue}/></div>}
  </div>
}

function Metric({label,value,icon:Icon}:{label:string;value:number;icon:any}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className="h-4 w-4 text-violet-600"/></div><p className="mt-3 text-2xl font-semibold">{value}</p></div>}
function AssignmentTable({rows,editable=false,onStatus,overdue}:{rows:TrainingAssignment[];editable?:boolean;onStatus?:(id:string,status:TrainingAssignment["status"])=>void;overdue:(a:TrainingAssignment)=>boolean}){return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Çalışan</th><th>Eğitim</th><th>Atama</th><th>Son Tarih</th><th>Durum</th>{editable&&<th></th>}</tr></thead><tbody>{rows.length?rows.map((a)=><tr key={a.id}><td>{a.employee}</td><td>{a.trainingName}</td><td className="text-xs">{new Date(a.assignedAt).toLocaleDateString("tr-TR")}</td><td className={overdue(a)?"font-semibold text-red-600":""}>{a.dueDate||"—"}</td><td><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${a.status==="Tamamlandı"?"bg-emerald-50 text-emerald-700":overdue(a)?"bg-red-50 text-red-700":"bg-violet-50 text-violet-700"}`}>{overdue(a)?"Gecikti":a.status}</span></td>{editable&&<td><select value={a.status} onChange={(e)=>onStatus?.(a.id,e.target.value as any)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option>Atandı</option><option>Devam Ediyor</option><option>Tamamlandı</option></select></td>}</tr>):<tr><td colSpan={editable?6:5} className="py-8 text-center text-sm text-slate-500">Eğitim kaydı bulunmuyor.</td></tr>}</tbody></table></div></div>}
