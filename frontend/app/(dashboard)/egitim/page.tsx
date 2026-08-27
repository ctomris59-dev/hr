"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, Plus, Users } from "lucide-react";
import PremiumTrainingTable, { type PremiumTrainingRow } from "../../../components/PremiumTrainingTable";
import { getManageableEmployees } from "../../utils/hierarchy";
import { getStorageData, setStorageData, STORAGE_KEYS } from "../../utils/storage";
import { useNotifications } from "../../../context/NotificationContext";

interface TrainingAssignment extends PremiumTrainingRow {
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
  const overdue=(a:PremiumTrainingRow)=>a.status!=="Tamamlandı"&&Boolean(a.dueDate)&&new Date(a.dueDate!)<new Date();

  const saveAssignments=(next:TrainingAssignment[])=>{setAssignments(next);setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS,next);window.dispatchEvent(new CustomEvent("dataUpdated"));};
  const assign=(event:FormEvent)=>{event.preventDefault();const training=CATALOG.find((item)=>item.id===form.trainingId);if(!training||!form.employee)return;const item:TrainingAssignment={id:`training-${Date.now()}`,employee:form.employee,trainingId:training.id,trainingName:training.name,assignedBy:name,assignedAt:new Date().toISOString(),dueDate:form.dueDate||undefined,status:"Atandı"};saveAssignments([item,...assignments]);addNotification(`${training.name} eğitimi atandı.`,"info",{targetUser:form.employee,link:"/egitim",source:"training"});setForm({employee:"",trainingId:"",dueDate:""});};
  const setStatus=(id:string,status:TrainingAssignment["status"])=>{const next=assignments.map((a)=>a.id===id?{...a,status,completedAt:status==="Tamamlandı"?new Date().toISOString():undefined}:a);saveAssignments(next);showToast("Eğitim durumu güncellendi.","success")};

  const tabItems = [
    { key:"mine" as const, label:"Atanan Eğitimler", description:"Size atanan eğitimleri ve tamamlanma durumunu takip edin.", icon:CheckCircle2, count:myAssignments.length },
    { key:"catalog" as const, label:"Eğitim Kataloğu", description:"Mevcut eğitimleri kategori ve süre bilgisiyle inceleyin.", icon:BookOpen, count:CATALOG.length },
    ...(manageable.length ? [{ key:"manage" as const, label:"Ekip Eğitimleri", description:"Ekibinize eğitim atayın ve ilerlemeyi yönetin.", icon:Users, count:teamAssignments.length }] : []),
  ];

  return <div className="space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Öğrenme operasyonları</p><h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Eğitim</h1><p className="mt-1 text-sm text-slate-500">Bu modül yalnızca eğitim kataloğu, atama, son tarih ve tamamlanma takibini yönetir. Yetkinlik açığı ve gelişim hedefleri Gelişim Planı'nda yönetilir.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Bana atanan" value={myAssignments.length} icon={BookOpen}/><Metric label="Devam eden" value={myAssignments.filter(a=>a.status!=="Tamamlandı").length} icon={Clock3}/><Metric label="Tamamlanan" value={myAssignments.filter(a=>a.status==="Tamamlandı").length} icon={CheckCircle2}/></div>

    <div className="rounded-2xl border border-violet-200/80 bg-white p-2 shadow-[0_8px_30px_rgba(76,29,149,0.08)] dark:border-violet-900/50 dark:bg-slate-900">
      <div className="flex flex-col gap-1 px-2 pb-2 pt-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">Görünüm seçin</p><p className="mt-0.5 text-xs text-slate-500">Katalog ile size atanan eğitimler arasında buradan geçiş yapabilirsiniz.</p></div><span className="hidden rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700 sm:inline-flex dark:bg-violet-950/50 dark:text-violet-300">Aktif görünüm: {tabItems.find((item)=>item.key===tab)?.label}</span></div>
      <div className={`grid gap-2 ${tabItems.length===3?"md:grid-cols-3":"sm:grid-cols-2"}`}>{tabItems.map(({key,label,description,icon:Icon,count})=>{const active=tab===key;return <button key={key} type="button" onClick={()=>setTab(key)} aria-pressed={active} className={`group flex min-h-[76px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${active?"border-violet-600 bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.24)] ring-1 ring-violet-500":"border-slate-200 bg-slate-50/70 text-slate-700 hover:border-violet-300 hover:bg-violet-50/70 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active?"bg-white/15 text-white":"bg-white text-violet-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"}`}><Icon className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-sm">{label}</strong><span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active?"bg-white/15 text-white":"bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"}`}>{count}</span></span><span className={`mt-1 block text-[11px] leading-4 ${active?"text-violet-100":"text-slate-500 dark:text-slate-400"}`}>{description}</span></span><span className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${active?"border-white bg-white":"border-slate-300 bg-transparent"}`}/></button>})}</div>
    </div>

    {tab==="mine"&&<PremiumTrainingTable title="Atanan Eğitimler" description="Size atanan eğitimlerin son tarih ve tamamlanma durumunu yönetin." rows={myAssignments} editable onStatus={setStatus} overdue={overdue}/>} 
    {tab==="catalog"&&<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{CATALOG.map((training)=><div key={training.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">{training.category}</span><h3 className="mt-3 text-sm font-semibold">{training.name}</h3><p className="mt-1 text-xs text-slate-500">Süre: {training.duration}</p></div>)}</div>}
    {tab==="manage"&&<div className="grid items-start gap-5 xl:grid-cols-[360px_1fr]"><form onSubmit={assign} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Plus className="h-4 w-4 text-violet-600"/><h2 className="text-sm font-semibold">Eğitim ata</h2></div><div className="mt-4 space-y-3"><select value={form.employee} onChange={(e)=>setForm({...form,employee:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Çalışan seçin</option>{manageable.map((e:any)=><option key={e.id??e["Ad Soyad"]}>{e["Ad Soyad"]}</option>)}</select><select value={form.trainingId} onChange={(e)=>setForm({...form,trainingId:e.target.value})} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="">Eğitim seçin</option>{CATALOG.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</select><label className="block text-xs font-medium text-slate-600">Son tarih<input type="date" value={form.dueDate} onChange={(e)=>setForm({...form,dueDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"/></label><button className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Ata</button></div></form><PremiumTrainingTable title="Ekip Eğitim Takibi" description="Ekibe atanmış eğitimleri, son tarihleri ve ilerleme durumunu izleyin." rows={teamAssignments} overdue={overdue}/></div>}
  </div>
}

function Metric({label,value,icon:Icon}:{label:string;value:number;icon:any}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className="h-4 w-4 text-violet-600"/></div><p className="mt-3 text-2xl font-semibold">{value}</p></div>}
