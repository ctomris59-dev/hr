"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, CheckCircle2, CircleGauge, Link2, Plus, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import {
  convertRecruitmentCandidate,
  createRecruitmentCandidate,
  fetchRecruitmentCandidates,
  updateRecruitmentCandidate,
  type RecruitmentCandidate,
  type RecruitmentStage,
} from "@/lib/hr/decisionIntelligenceClient";

const STAGES:RecruitmentStage[]=["Başvuru","Ön Eleme","Test","Mülakat","Teklif","İşe Alındı","Reddedildi"];

export default function RecruitmentSaasWorkspace(){
  const[candidates,setCandidates]=useState<RecruitmentCandidate[]>([]);
  const[selectedId,setSelectedId]=useState<string|null>(null);
  const[query,setQuery]=useState("");
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[showNew,setShowNew]=useState(false);
  const[saving,setSaving]=useState(false);
  const[form,setForm]=useState({full_name:"",email:"",phone:"",department:"",position:""});
  const[edit,setEdit]=useState({recruiter_note:"",structured_interview_notes:"",assessment_summary:"",interview_done:false,test_sent:false,reference_checked:false});

  const reload=async(preferId?:string)=>{
    setError("");
    try{
      const payload=await fetchRecruitmentCandidates();
      setCandidates(payload.items);
      const next=preferId||selectedId||payload.items[0]?.id||null;
      setSelectedId(next);
    }catch(err){setError(err instanceof Error?err.message:"Aday havuzu yüklenemedi.");}
    finally{setLoading(false);}
  };

  useEffect(()=>{void reload();},[]);
  const selected=candidates.find(row=>row.id===selectedId)||null;
  useEffect(()=>{
    if(!selected)return;
    setEdit({
      recruiter_note:selected.recruiter_note||"",
      structured_interview_notes:selected.structured_interview_notes||"",
      assessment_summary:selected.assessment_summary||"",
      interview_done:selected.interview_done,
      test_sent:selected.test_sent,
      reference_checked:selected.reference_checked,
    });
  },[selected?.id,selected?.updated_at]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("tr-TR");
    return candidates.filter(row=>!q||`${row.full_name} ${row.email||""} ${row.position||""} ${row.department||""}`.toLocaleLowerCase("tr-TR").includes(q));
  },[candidates,query]);

  const addCandidate=async(event:FormEvent)=>{
    event.preventDefault();
    if(!form.full_name.trim()||!form.email.trim())return;
    setSaving(true);setError("");
    try{
      const created=await createRecruitmentCandidate({
        full_name:form.full_name.trim(),email:form.email.trim(),phone:form.phone.trim()||null,
        department:form.department.trim()||null,position:form.position.trim()||null,
      });
      setForm({full_name:"",email:"",phone:"",department:"",position:""});setShowNew(false);
      await reload(created.id);
    }catch(err){setError(err instanceof Error?err.message:"Aday kaydedilemedi.");}
    finally{setSaving(false);}
  };

  const changeStage=async(candidate:RecruitmentCandidate,stage:RecruitmentStage)=>{
    setSaving(true);setError("");
    try{const updated=await updateRecruitmentCandidate(candidate.id,{status:stage});setCandidates(rows=>rows.map(row=>row.id===updated.id?updated:row));}
    catch(err){setError(err instanceof Error?err.message:"Aday aşaması güncellenemedi.");}
    finally{setSaving(false);}
  };

  const saveEvidence=async()=>{
    if(!selected)return;
    setSaving(true);setError("");
    try{
      const updated=await updateRecruitmentCandidate(selected.id,edit);
      setCandidates(rows=>rows.map(row=>row.id===updated.id?updated:row));
    }catch(err){setError(err instanceof Error?err.message:"Aday kanıtları kaydedilemedi.");}
    finally{setSaving(false);}
  };

  const convert=async()=>{
    if(!selected||selected.converted_employee_id)return;
    const approved=window.confirm(`${selected.full_name} için çalışan kaydı oluşturulsun mu? Bu işlem adayı İşe Alındı aşamasına taşır ve yaşam döngüsü kaynağını kalıcı olarak bağlar.`);
    if(!approved)return;
    setSaving(true);setError("");
    try{
      const result=await convertRecruitmentCandidate(selected.id,{department:selected.department,position:selected.position});
      await reload(selected.id);
      window.dispatchEvent(new CustomEvent("dataUpdated"));
      window.alert(`${result.employee.full_name} çalışan ana verisine aktarıldı. Digital Twin artık bu işe alım kaynağını gösterecek.`);
    }catch(err){setError(err instanceof Error?err.message:"Aday çalışan yaşam döngüsüne aktarılamadı.");}
    finally{setSaving(false);}
  };

  const evidence=evidenceScore(selected);

  return <div className="space-y-5">
    <header className="futurehr-page-header flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="futurehr-page-eyebrow">Talent Acquisition Lifecycle</p><h1 className="futurehr-page-title">İşe Alım</h1><p className="futurehr-page-lede">Adayı başvurudan işe alıma kadar tenant-scoped kayıtla yönetin. İşe alınan aday tek transaction ile çalışan ana verisine geçer ve kaynak izi Digital Twin&apos;de korunur.</p></div>
      <button type="button" onClick={()=>setShowNew(true)} className="h-10 shrink-0 rounded-lg bg-[#2f6664] px-4 text-xs font-semibold text-white hover:bg-[#255452]"><Plus className="mr-1.5 inline h-4 w-4"/>Başvuru ekle</button>
    </header>

    <div className="rounded-lg border border-[#cbdad8] bg-[#f1f6f5] px-4 py-3 text-[10.5px] leading-5 text-[#315f5c] dark:border-[#294643] dark:bg-[#172b2a] dark:text-[#a9cfcb]"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5"/>Production aday verisi browser storage&apos;a yazılmaz. İstihdam kararı otomatik verilmez; çalışan oluşturma yalnız yetkili insan kullanıcının açık onayıyla yapılır.</div>
    {error&&<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">{STAGES.map(stage=><div key={stage} className="enterprise-card px-3 py-3"><p className="text-[9.5px] font-semibold uppercase tracking-[.06em] text-slate-400">{stage}</p><p className="mt-2 text-xl font-semibold">{candidates.filter(row=>row.status===stage).length}</p></div>)}</div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className="enterprise-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"><div><p className="enterprise-eyebrow">Aday havuzu</p><h2 className="mt-1 text-sm font-semibold">Kanıt ve aşama odaklı ATS</h2></div><label className="flex h-9 w-full max-w-[320px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"><Search className="h-3.5 w-3.5 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Aday, rol veya departman ara" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"/></label></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map(candidate=><button type="button" key={candidate.id} onClick={()=>setSelectedId(candidate.id)} className={`grid w-full grid-cols-[minmax(0,1fr)_120px_84px] items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40 ${selectedId===candidate.id?"bg-[#f1f6f5] dark:bg-[#172b2a]":""}`}><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{candidate.full_name}</p>{candidate.converted_employee_id&&<Link2 className="h-3.5 w-3.5 shrink-0 text-[#2f6664]"/>}</div><p className="mt-0.5 truncate text-[10px] text-slate-400">{candidate.position||"Rol tanımlanmadı"} · {candidate.department||"Departman yok"}</p></div><span className="truncate text-[10px] font-medium text-slate-500">{candidate.status}</span><span className="text-right text-[10px] font-semibold tabular-nums text-slate-500">Kanıt {evidenceScore(candidate)}/100</span></button>)}
          {!loading&&!filtered.length&&<div className="px-4 py-10 text-center text-xs text-slate-500">Eşleşen aday bulunamadı.</div>}
          {loading&&<div className="px-4 py-10 text-center text-xs text-slate-500">Aday havuzu yükleniyor…</div>}
        </div>
      </section>

      <aside className="enterprise-card p-5">
        {!selected?<div className="flex min-h-[320px] items-center justify-center text-xs text-slate-500">İncelemek için bir aday seçin.</div>:<div className="space-y-5">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">{initials(selected.full_name)}</span><div><h2 className="text-sm font-semibold">{selected.full_name}</h2><p className="mt-0.5 text-[10px] text-slate-400">{selected.position||"Pozisyon yok"}</p></div></div></div><CircleGauge className="h-5 w-5 text-[#2f6664]"/></div>
          <div className="grid grid-cols-2 gap-2"><Mini label="Kanıt skoru" value={`${evidence}/100`}/><Mini label="Yetkinlik sinyali" value={String(Object.keys(selected.competency_signals||{}).length)}/></div>
          <label className="block"><span className="enterprise-eyebrow">Aşama</span><select value={selected.status} disabled={saving||Boolean(selected.converted_employee_id)} onChange={event=>void changeStage(selected,event.target.value as RecruitmentStage)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900">{STAGES.map(stage=><option key={stage}>{stage}</option>)}</select></label>
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800"><p className="enterprise-eyebrow">Kanıt zinciri</p><div className="mt-3 space-y-2"><Check checked={edit.test_sent} onChange={value=>setEdit(row=>({...row,test_sent:value}))} label="Yetkinlik/test süreci mevcut"/><Check checked={edit.interview_done} onChange={value=>setEdit(row=>({...row,interview_done:value}))} label="Yapılandırılmış mülakat tamamlandı"/><Check checked={edit.reference_checked} onChange={value=>setEdit(row=>({...row,reference_checked:value}))} label="Referans doğrulaması tamamlandı"/></div></div>
          <TextArea label="Yapılandırılmış mülakat notu" value={edit.structured_interview_notes} onChange={value=>setEdit(row=>({...row,structured_interview_notes:value}))} placeholder="STAR örneği, gözlenen davranış ve doğrulanabilir iş kanıtı…"/>
          <TextArea label="Değerlendirme özeti" value={edit.assessment_summary} onChange={value=>setEdit(row=>({...row,assessment_summary:value}))} placeholder="Test + mülakat + referans kanıtlarının kısa sentezi…"/>
          <TextArea label="Recruiter notu" value={edit.recruiter_note} onChange={value=>setEdit(row=>({...row,recruiter_note:value}))} placeholder="Sonraki adım ve açık kalan doğrulamalar…"/>
          <button type="button" disabled={saving} onClick={()=>void saveEvidence()} className="h-9 w-full rounded-lg border border-slate-200 text-[10.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Kanıtları kaydet</button>
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2f6664]"/><p className="text-[10.5px] leading-4 text-slate-500">FutureHR aday adına kabul/red kararı vermez. İşe alım dönüşümü insan onayı gerektirir ve kaynak izi çalışan yaşam döngüsünde saklanır.</p></div>{selected.converted_employee_id?<Link href="/ekip-yonetimi" className="mt-3 flex h-9 items-center justify-center rounded-lg bg-[#edf4f2] text-[10.5px] font-semibold text-[#2f6664]">Çalışan Digital Twin&apos;ini aç →</Link>:<button type="button" disabled={saving||selected.status!=="Teklif"} onClick={()=>void convert()} className="mt-3 h-10 w-full rounded-lg bg-[#2f6664] text-xs font-semibold text-white hover:bg-[#255452] disabled:cursor-not-allowed disabled:opacity-40"><UserPlus className="mr-1.5 inline h-4 w-4"/>{selected.status==="Teklif"?"Çalışan yaşam döngüsüne aktar":"Önce Teklif aşamasına getir"}</button>}</div>
        </div>}
      </aside>
    </div>

    {showNew&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4"><form onSubmit={addCandidate} className="w-full max-w-[520px] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="enterprise-eyebrow">Yeni başvuru</p><h2 className="mt-1 text-base font-semibold">Aday kaydı oluştur</h2></div><button type="button" onClick={()=>setShowNew(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-slate-700"><X className="h-4 w-4"/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input label="Ad soyad *" value={form.full_name} onChange={value=>setForm(row=>({...row,full_name:value}))}/><Input label="E-posta *" type="email" value={form.email} onChange={value=>setForm(row=>({...row,email:value}))}/><Input label="Telefon" value={form.phone} onChange={value=>setForm(row=>({...row,phone:value}))}/><Input label="Departman" value={form.department} onChange={value=>setForm(row=>({...row,department:value}))}/><div className="sm:col-span-2"><Input label="Pozisyon" value={form.position} onChange={value=>setForm(row=>({...row,position:value}))}/></div></div><button disabled={saving} className="mt-5 h-10 w-full rounded-lg bg-[#2f6664] text-xs font-semibold text-white disabled:opacity-50"><Plus className="mr-1.5 inline h-4 w-4"/>Adayı kaydet</button></form></div>}
  </div>;
}

function evidenceScore(candidate:RecruitmentCandidate|null){if(!candidate)return 0;let score=0;if(Object.keys(candidate.competency_signals||{}).length)score+=25;if(candidate.test_sent)score+=15;if(candidate.interview_done)score+=25;if(candidate.structured_interview_notes?.trim())score+=15;if(candidate.assessment_summary?.trim())score+=10;if(candidate.reference_checked)score+=10;return score}
function initials(name:string){return name.split(" ").filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")||"FH"}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[9.5px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1.5 text-lg font-semibold">{value}</p></div>}
function Check({checked,onChange,label}:{checked:boolean;onChange:(value:boolean)=>void;label:string}){return <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-[10.5px] text-slate-600 dark:border-slate-700 dark:text-slate-300"><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)}/><span>{label}</span></label>}
function TextArea({label,value,onChange,placeholder}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string}){return <label className="block"><span className="enterprise-eyebrow">{label}</span><textarea rows={3} maxLength={8000} value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-[10.5px] leading-4 outline-none focus:border-[#7da5a2] dark:border-slate-700 dark:bg-slate-900"/></label>}
function Input({label,value,onChange,type="text"}:{label:string;value:string;onChange:(value:string)=>void;type?:string}){return <label className="block"><span className="text-[10px] font-semibold text-slate-500">{label}</span><input required={label.includes("*")} type={type} value={value} onChange={event=>onChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#7da5a2] dark:border-slate-700 dark:bg-slate-950"/></label>}
