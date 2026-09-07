"use client";

import { useEffect } from "react";

const ACTION_WORDS=/işlem|aksiyon|eylem|action|düzenle|detay/i;

function enhance(table:HTMLTableElement){
  if(table.dataset.mobileCards||table.dataset.mobileTable==="scroll")return;
  const headers=Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
  if(!headers.length||headers.length>7||table.querySelector("[colspan]:not([colspan='1']),[rowspan]:not([rowspan='1'])")){
    table.dataset.mobileTable="scroll";return;
  }
  const labels=headers.map((cell,index)=>cell.textContent?.trim()||`Alan ${index+1}`);
  table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach(row=>{
    Array.from(row.children).forEach((cell,index)=>{
      if(!(cell instanceof HTMLTableCellElement))return;
      const label=labels[index]||`Alan ${index+1}`;
      cell.dataset.mobileLabel=label;
      if(ACTION_WORDS.test(label)||cell.querySelector("button,a[href]"))cell.dataset.mobileAction="true";
    });
  });
  table.classList.add("futurehr-mobile-record-table");
  table.dataset.mobileCards="ready";
}

export default function MobileTableCardRuntime(){
  useEffect(()=>{
    const scan=(root:ParentNode=document)=>root.querySelectorAll<HTMLTableElement>(".module-native-content table,.visualized-native-content table,[data-mobile-card-table]").forEach(enhance);
    scan();
    const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
      if(!(node instanceof HTMLElement))return;
      if(node.matches("table"))enhance(node as HTMLTableElement);
      scan(node);
    })));
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
