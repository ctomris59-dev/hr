import { resolveTargetProfile } from "../../lib/hr/careerArchitecture";
import { buildTalentDecisionSnapshot } from "../../lib/hr/talentDecisionChain";
import { employeeName, latestEvaluationForEmployee } from "../../lib/hr/employeeIdentity";

export interface EmployeeData {
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  "Mevcut Maaş": number;
  Performans: number;
  Potansiyel: number;
  Yetkinlik: number | null;
  Rol_Uyumu: number | null;
  Calisma_Yili: number;
  Profil: string;
  "Piyasa Ortalaması"?: number;
  manager_proposal?: number;
  manager_note?: string;
  is_star_performer?: boolean;
  Kanıt_Güveni?: number;
  Veri_Uyarısı?: string;
}

export interface SimulationResult {
  "Ad Soyad": string;
  Departman: string;
  Pozisyon: string;
  Profil: string;
  Performans: number;
  Potansiyel: number;
  Yetkinlik: number | null;
  Rol_Uyumu: number | null;
  Calisma_Yili: number;
  "Mevcut Maaş": number;
  "Yeni Maaş": number;
  "Zam Tutarı": number;
  "Zam Oranı (%)": number;
  "Zam Açıklaması": string;
  "Yetkinlik Etkisi (puan)": number;
  "Eski_CR": number;
  "Yeni_CR": number;
  "Eski Risk": string;
  "Yeni Risk": string;
  "Risk Mesafesi": string;
  "Piyasa_Gelecek": number;
  "Yıllık Bonus (TL)": number;
  "Bonus Oranı (%)": number;
  is_star_performer?: boolean;
  Kanıt_Güveni?: number;
  Piyasa_Kaynağı?: string;
  Karar_Uyarısı?: string;
}

export interface MarketReference {
  Departman: string;
  Pozisyon: string;
  "Piyasa Ortalaması": number;
  Kaynak?: string;
}

const CODES: Record<string, string> = {
  "Dijital Okuryazarlık": "DIG", "Analitik Düşünme": "ANA", "Sonuç Odaklılık": "RES",
  "Detaylara Özen": "DET", "Sürekli Öğrenme": "LRN", "Etik ve Uyum": "ETH",
  "Öz-Disiplin": "DIS", "Dayanıklılık & Stres Yönetimi": "STR", "Takım Çalışması": "TEA",
  "İletişim Becerileri": "COM",
};
const clamp = (v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const round1 = (v:number)=>Math.round(v*10)/10;
const numericScore = (v:unknown)=>{ const n=Number(v); return Number.isFinite(n)&&n>=1&&n<=5?n:null; };

function parseMoney(v:unknown):number {
  if (typeof v === "number") return Number.isFinite(v)&&v>0?v:0;
  if (!v) return 0;
  const s=String(v).replace(/₺|\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(/,(?=\d{1,2}$)/,".");
  const n=Number(s); return Number.isFinite(n)&&n>0?n:0;
}

function roleFitScore(position:string,evaluation:any):number|null {
  const target=resolveTargetProfile(position).profile;
  const scores=evaluation?.manager_scores;
  if(!scores||typeof scores!=="object"||!Object.keys(target).length)return null;
  let total=0,count=0;
  Object.entries(target).forEach(([label,expectedRaw])=>{
    const expected=Number(expectedRaw), code=CODES[label]||label;
    const actual=numericScore(scores[code]??scores[label]);
    if(actual===null||!Number.isFinite(expected)||expected<=0)return;
    total+=clamp(actual/expected*100,0,120); count++;
  });
  return count?Math.round(total/count):null;
}

export function getCompetencyMeritModifier(competency:number|null,roleFit:number|null):number {
  if(competency===null&&roleFit===null)return 0;
  let m=0;
  if(roleFit!==null){ if(roleFit>=100)m+=1.5; else if(roleFit>=90)m+=1; else if(roleFit>=80)m+=.5; else if(roleFit<65)m-=1.5; else if(roleFit<75)m-=.5; }
  if(competency!==null){ if(competency>=4.5)m+=.5; else if(competency<3)m-=.5; }
  return round1(clamp(m,-2,2));
}

export function getTenureMaxCap(years:number):number {
  const y=Number.isFinite(years)&&years>=0?years:0;
  if(y<=2)return .75; if(y<=4)return .9; if(y<=9)return 1; if(y<=14)return 1.25; if(y<=19)return 1.35; return 1.5;
}

export function getEmployeeSegment(perf:number,pot:number,tenure:number):string {
  if(!(perf>0)||!(pot>0))return "⚪ VERİ EKSİK";
  if(perf>=4.5&&pot>=4)return "🌟 YILDIZ";
  if(perf>=4.5&&pot>=3)return "🚀 YÜKSEK PERFORMANS";
  if(perf>=4.5)return "⚡ PERFORMANS";
  if(perf>=4&&pot>=4)return tenure<=5?"🛡️ KİLİT OYUNCU":"⚓ KIDEMLİ KİLİT OYUNCU";
  if(perf>=4&&pot>=3)return "⚖️ STANDART";
  if(perf>=4)return "🌱 GELİŞTİRİLEBİLİR";
  if(perf>=3.5&&pot>=3)return "📉 VASAT PERFORMANS";
  if(perf>=3.5)return "⚠️ DÜŞÜK PERFORMANS";
  if(pot>=4)return "💎 POTANSİYEL YATIRIMI";
  return "⛔ KRİTİK ALTI";
}

export function analyzeStrategicStatus(cr:number,tenure:number):string {
  if(!Number.isFinite(cr)||cr<=0)return "⚪ Benchmark Yok";
  const limit=getTenureMaxCap(tenure);
  if(cr>limit+.02)return `🔵 Limit Üstü (> ${limit})`;
  if(tenure>2&&cr<.8)return "🟠 Kritik Düşük";
  if(cr<limit-.15)return "🟡 Alt Bant";
  return "🟢 Dengeli";
}

function tenureYears(row:any):number {
  const direct=Number(row?.Calisma_Yili??row?.["Kıdem (Yıl)"]);
  if(Number.isFinite(direct)&&direct>=0)return direct;
  const match=String(row?.kıdem||row?.kidem||row?.calisma||"").match(/\d+\.?\d*/);
  if(match)return Number(match[0])||0;
  const start=row?.["İşe Giriş Tarihi"]||row?.hireDate;
  if(!start)return 0; const d=new Date(start);
  return Number.isNaN(d.getTime())?0:Math.max(0,(Date.now()-d.getTime())/(365.25*86400000));
}

/**
 * Ücret motoru çalışan/değerlendirme eşleştirmesinde FutureHR V1 kimlik katmanını
 * kullanır. Böylece localStorage sırası değişse bile son değerlendirme deterministik
 * seçilir ve performans trendi/talent snapshot bütün geçmiş üzerinden hesaplanır.
 */
export function processEmployeeData(orgData:any[],data360:any[]):EmployeeData[] {
  return orgData.map(row=>{
    const name=employeeName(row)||"Bilinmeyen";
    const evaluation=latestEvaluationForEmployee(row,data360);
    const snapshot=buildTalentDecisionSnapshot(row,data360);
    const salary=parseMoney(row["Maaş (TL)"]??row.Maaş??row.salary), perf=snapshot.performance.score, pot=snapshot.talent.potential.score;
    const competency=snapshot.competency.score>0?snapshot.competency.score:null;
    const roleFit=snapshot.competency.currentRoleFit>0?snapshot.competency.currentRoleFit:roleFitScore(row.Pozisyon||"",evaluation);
    const warnings:string[]=[];
    if(!salary)warnings.push("Maaş verisi yok");
    if(!perf)warnings.push("Performans verisi yok");
    if(snapshot.performance.historyCount<1)warnings.push("Geçmiş performans ölçümü yok");
    if(snapshot.evidence.score<60)warnings.push(`Kanıt Güveni %${snapshot.evidence.score}`);
    return {
      "Ad Soyad":name, Departman:row.Departman||"Genel", Pozisyon:row.Pozisyon||"Personel", "Mevcut Maaş":salary,
      Performans:perf, Potansiyel:pot, Yetkinlik:competency, Rol_Uyumu:roleFit, Calisma_Yili:tenureYears(row),
      Profil:getEmployeeSegment(perf,pot,tenureYears(row)), manager_proposal:row.manager_proposal?Number(row.manager_proposal):undefined,
      manager_note:row.manager_note||undefined, is_star_performer:Boolean(evaluation?.is_star_performer||row?.is_star_performer),
      Kanıt_Güveni:snapshot.evidence.score, Veri_Uyarısı:warnings.join(" · ")||undefined,
    };
  });
}

export function calculateMarketAverages(employees:EmployeeData[]):MarketReference[] {
  const grouped=new Map<string,{total:number;count:number}>();
  employees.forEach(emp=>{const salary=emp["Mevcut Maaş"]; if(!(salary>0))return; const key=`${emp.Departman}|${emp.Pozisyon}`; const x=grouped.get(key)||{total:0,count:0}; grouped.set(key,{total:x.total+salary,count:x.count+1});});
  return Array.from(grouped.entries()).map(([key,v])=>{const [Departman,Pozisyon]=key.split("|"); return {Departman,Pozisyon,"Piyasa Ortalaması":Math.round(v.total/v.count/100)*100,Kaynak:"İç Ücret Referansı"};});
}

interface BudgetRequest { employee_id:string; requested_rate:number; status:"Taslak"|"Gönderildi"; }

function noSalaryResult(emp:EmployeeData):SimulationResult {
  return {"Ad Soyad":emp["Ad Soyad"],Departman:emp.Departman,Pozisyon:emp.Pozisyon,Profil:emp.Profil,Performans:emp.Performans,Potansiyel:emp.Potansiyel,Yetkinlik:emp.Yetkinlik,Rol_Uyumu:emp.Rol_Uyumu,Calisma_Yili:emp.Calisma_Yili,"Mevcut Maaş":0,"Yeni Maaş":0,"Zam Tutarı":0,"Zam Oranı (%)":0,"Zam Açıklaması":"Maaş verisi yok · simülasyon dışı","Yetkinlik Etkisi (puan)":0,Eski_CR:0,Yeni_CR:0,"Eski Risk":"⚪ Hesaplanmadı","Yeni Risk":"⚪ Hesaplanmadı","Risk Mesafesi":"-",Piyasa_Gelecek:0,"Yıllık Bonus (TL)":0,"Bonus Oranı (%)":0,is_star_performer:emp.is_star_performer,Kanıt_Güveni:emp.Kanıt_Güveni,Piyasa_Kaynağı:"Yok",Karar_Uyarısı:emp.Veri_Uyarısı||"Maaş verisi yok"};
}

export function runScenarioLogic(employees:EmployeeData[],marketRefs:MarketReference[],inflationRate:number,mode:"A"|"B"|"C"|"D"="A",budgetRequests?:BudgetRequest[]):SimulationResult[] {
  const refs=new Map<string,MarketReference>(); marketRefs.forEach(r=>{if(r["Piyasa Ortalaması"]>0)refs.set(`${r.Departman}|${r.Pozisyon}`,r);});
  return employees.map(emp=>{
    const current=emp["Mevcut Maaş"]; if(!(current>0))return noSalaryResult(emp);
    const ref=refs.get(`${emp.Departman}|${emp.Pozisyon}`), baseMarket=Number(ref?.["Piyasa Ortalaması"]||0), hasMarket=baseMarket>0;
    const futureMarket=hasMarket?baseMarket*(1+inflationRate/100):current, tenure=emp.Calisma_Yili, capCR=getTenureMaxCap(tenure);
    const oldCR=hasMarket?current/futureMarket:1, maxAllowed=hasMarket?futureMarket*capCR:Number.POSITIVE_INFINITY;
    const oldRisk=hasMarket?analyzeStrategicStatus(oldCR,tenure):"⚪ Benchmark Yok";
    const evidence=emp.Kanıt_Güveni??0, merit=evidence>=50?getCompetencyMeritModifier(emp.Yetkinlik,emp.Rol_Uyumu):0;
    const p=emp.Profil; let raise=inflationRate, desc="", potential=current;

    if(mode==="A"){
      if(p.includes("KRİTİK")||p.includes("DÜŞÜK"))raise=inflationRate*.25;
      else if(p.includes("VASAT")||p.includes("POTANSİYEL YATIRIMI"))raise=inflationRate*.5;
      else if(p.includes("GELİŞTİRİLEBİLİR"))raise=inflationRate*.75;
      else if(p.includes("KİLİT OYUNCU"))raise=inflationRate+2;
      else if(p.includes("YÜKSEK PERFORMANS")||p.includes("PERFORMANS"))raise=inflationRate+5;
      else if(p.includes("YILDIZ"))raise=inflationRate+7;
      desc="Bütçe dostu performans matrisi"; potential=current*(1+raise/100);
    } else if(mode==="B"){
      if(hasMarket&&oldCR<1){const target=Math.min(capCR,p.includes("YILDIZ")||p.includes("YÜKSEK")?1:.9); potential=Math.max(current*(1+inflationRate/100),futureMarket*target); desc=`Ücret referansı eşitleme · hedef CR ${target.toFixed(2)}`;}
      else {raise=p.includes("YILDIZ")?inflationRate+5:(p.includes("DÜŞÜK")||p.includes("KRİTİK")?inflationRate*.5:inflationRate); potential=current*(1+raise/100); desc=hasMarket?"Ücret referansı dengeli":"Benchmark yok · baz artış";}
    } else if(mode==="C"){
      if(hasMarket&&oldCR<.8){potential=Math.max(current,futureMarket*.8); desc="Dengeli · kritik düşük bandı %80 CR seviyesine taşıma";}
      else {const premium=p.includes("YILDIZ")?3:(p.includes("YÜKSEK PERFORMANS")||p==="⚡ PERFORMANS"?2:p.includes("KİLİT OYUNCU")?1:(p.includes("DÜŞÜK")||p.includes("KRİTİK")?-Math.min(10,inflationRate*.25):0)); raise=Math.max(0,inflationRate+premium); potential=current*(1+raise/100); desc=`Dengeli · baz %${inflationRate.toFixed(1)}${premium?` ${premium>0?"+":""}${premium.toFixed(1)} puan`:""}`;}
    } else {
      const req=budgetRequests?.find(r=>r.employee_id===emp["Ad Soyad"]&&r.requested_rate>0); raise=req?.requested_rate??inflationRate; potential=current*(1+raise/100); desc=req?`Yönetici talebi · %${raise.toFixed(1)}`:`Yönetici talebi yok · baz %${raise.toFixed(1)}`;
    }

    if(mode!=="D"&&potential>current&&merit!==0){const baseRaise=(potential/current-1)*100; potential=current*(1+Math.max(0,baseRaise+merit)/100); desc+=` · Yetkinlik/Rol ${merit>0?"+":""}${merit.toFixed(1)} puan`;}
    if((emp.Yetkinlik!==null||emp.Rol_Uyumu!==null)&&evidence<50)desc+=` · Merit uygulanmadı (Kanıt Güveni %${evidence})`;
    if(emp.is_star_performer)desc+=" · Yıldız etiketi otomatik +% üretmez";
    if(!hasMarket)desc+=" · Dış benchmark yok, CR limiti uygulanmadı";

    let final=potential;
    if(hasMarket&&potential>maxAllowed){final=current>maxAllowed?current:maxAllowed; desc+=current>maxAllowed?" · limit üstü dondurma":` · ${capCR} CR ile limitlendi`;}
    const newSalary=Math.ceil(final/100)*100, amount=newSalary-current, pct=current>0?amount/current*100:0, newCR=hasMarket?newSalary/futureMarket:1;
    const newRisk=hasMarket?analyzeStrategicStatus(newCR,tenure):"⚪ Benchmark Yok";
    let riskDistance="-"; if(hasMarket){const entry=capCR-.2; if(tenure>2&&newCR<.8)riskDistance=`📉 -%${((.8-newCR)*100).toFixed(1)} (Genel)`; else if(newCR<entry)riskDistance=`📉 -%${((entry-newCR)*100).toFixed(1)} (Kendi)`;}
    const warnings=[emp.Veri_Uyarısı,!hasMarket?"Dış piyasa benchmarkı doğrulanmalı":"",evidence<60?"Kanıt kalibrasyonu önerilir":"",emp.is_star_performer?"Yıldız etiketi yalnızca karar sinyalidir":""].filter(Boolean).join(" · ");

    return {"Ad Soyad":emp["Ad Soyad"],Departman:emp.Departman,Pozisyon:emp.Pozisyon,Profil:emp.Profil,Performans:emp.Performans,Potansiyel:emp.Potansiyel,Yetkinlik:emp.Yetkinlik,Rol_Uyumu:emp.Rol_Uyumu,Calisma_Yili:emp.Calisma_Yili,"Mevcut Maaş":current,"Yeni Maaş":newSalary,"Zam Tutarı":amount,"Zam Oranı (%)":pct,"Zam Açıklaması":desc,"Yetkinlik Etkisi (puan)":merit,Eski_CR:oldCR,Yeni_CR:newCR,"Eski Risk":oldRisk,"Yeni Risk":newRisk,"Risk Mesafesi":riskDistance,Piyasa_Gelecek:hasMarket?futureMarket:0,"Yıllık Bonus (TL)":0,"Bonus Oranı (%)":0,is_star_performer:emp.is_star_performer,Kanıt_Güveni:evidence,Piyasa_Kaynağı:ref?.Kaynak||(hasMarket?"Dış / Manuel Referans":"Yok"),Karar_Uyarısı:warnings};
  });
}

export interface CurrencySimulationResult {
  dollarIncrease:number; estimatedInflation:number; currentTotalSalary:number; newTotalSalary:number; salaryIncrease:number; salaryIncreasePercentage:number; monthlyIncrease:number; yearlyIncrease:number;
  scenarioResults:{A:{total:number;increase:number;percentage:number};B:{total:number;increase:number;percentage:number};C:{total:number;increase:number;percentage:number};D:{total:number;increase:number;percentage:number}};
}

export function calculateCurrencyImpact(employees:EmployeeData[],marketRefs:MarketReference[],dollarIncrease:number,inflationMultiplier:number=.6):CurrencySimulationResult {
  const estimatedInflation=dollarIncrease*inflationMultiplier, current=employees.reduce((s,e)=>s+e["Mevcut Maaş"],0);
  const totals=(['A','B','C','D'] as const).map(k=>runScenarioLogic(employees,marketRefs,estimatedInflation,k).reduce((s,r)=>s+r["Yeni Maaş"],0));
  const [a,b,c,d]=totals, increase=c-current, pct=current?increase/current*100:0;
  const row=(total:number)=>({total,increase:total-current,percentage:current?round1((total-current)/current*100):0});
  return {dollarIncrease,estimatedInflation:round1(estimatedInflation),currentTotalSalary:current,newTotalSalary:c,salaryIncrease:increase,salaryIncreasePercentage:round1(pct),monthlyIncrease:increase,yearlyIncrease:increase*12,scenarioResults:{A:row(a),B:row(b),C:row(c),D:row(d)}};
}
