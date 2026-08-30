"use client";

import { useEffect } from "react";
import { getStorageData, setStorageData, STORAGE_KEYS } from "@/app/utils/storage";
import { ensurePerformanceCycle } from "@/lib/hr/performanceCycle";
import { createCompensationCycle } from "@/lib/hr/compensationWorkflow";

const COST_CENTERS: Record<string,string> = {
  "Genel Yönetim":"CC-100","İnsan Kaynakları":"CC-200","Finans & Muhasebe":"CC-300","Satış & Pazarlama":"CC-400","Operasyon & Üretim":"CC-500","BT & Dijital":"CC-600","Proje & İş Geliştirme":"CC-700",
};
function isV1Demo(org:any[]){const names=new Set(org.map(p=>String(p?.["Ad Soyad"]||"")));return org.length>=25&&names.has("Pelin Yılmaz")&&names.has("Emin Öncü");}

export default function DemoDataHardeningBridge(){
  useEffect(()=>{
    let applying=false;
    const harden=()=>{
      if(applying)return;const user=getStorageData<any>(STORAGE_KEYS.CURRENT_USER,null);if(user?.authMode==="secure")return;const org=getStorageData<any[]>(STORAGE_KEYS.ORG_CHART,[]);if(!isV1Demo(org))return;
      ensurePerformanceCycle();
      const cycles=getStorageData<any[]>(STORAGE_KEYS.COMPENSATION_CYCLES,[]);if(!cycles.length){const cycle=createCompensationCycle(`${new Date().getFullYear()} Ücret Dönemi`);setStorageData(STORAGE_KEYS.COMPENSATION_CYCLES,[{...cycle,stage:"MANAGER_INPUT",budgetLimit:30}]);}
      const needs=org.some(p=>!p.Lokasyon||!p["Maliyet Merkezi"]||!p["Çalışan Tipi"]||!p["İşgücü Tipi"]||!p["Kadro Durumu"]);if(!needs)return;
      applying=true;const next=org.map(person=>{const dept=String(person.Departman||"");const operation=dept==="Operasyon & Üretim";return{...person,Lokasyon:person.Lokasyon||(operation?"Çorlu":"İstanbul / Hibrit"),"Şube":person["Şube"]||(operation?"Çorlu Fabrika":"Merkez Ofis"),"Maliyet Merkezi":person["Maliyet Merkezi"]||COST_CENTERS[dept]||"CC-900","Çalışan Tipi":person["Çalışan Tipi"]||"Tam Zamanlı","İşgücü Tipi":person["İşgücü Tipi"]||"Beyaz Yaka","Kadro Durumu":person["Kadro Durumu"]||"Aktif"};});setStorageData(STORAGE_KEYS.ORG_CHART,next);applying=false;
    };
    harden();window.addEventListener("dataUpdated",harden);window.addEventListener("userChanged",harden);return()=>{window.removeEventListener("dataUpdated",harden);window.removeEventListener("userChanged",harden);};
  },[]);
  return null;
}
