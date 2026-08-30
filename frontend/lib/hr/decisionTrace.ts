import { buildTalentDecisionSnapshot } from "./talentDecisionChain";
import { resolveTargetProfile } from "./careerArchitecture";
import { latestEvaluationForEmployee } from "./employeeIdentity";
import { learningEvidenceState } from "./learningEvidence";

const LABELS: Record<string,string> = { DIG:"Dijital Okuryazarlık",ANA:"Analitik Düşünme",RES:"Sonuç Odaklılık",DET:"Detaylara Özen",LRN:"Sürekli Öğrenme",ETH:"Etik ve Uyum",DIS:"Öz-Disiplin",STR:"Dayanıklılık & Stres Yönetimi",TEA:"Takım Çalışması",COM:"İletişim Becerileri" };
export interface DecisionTraceItem { label:string; value:string; meaning:string; status:"good"|"warn"|"info"; }
export interface DecisionTrace { title:string; summary:string; items:DecisionTraceItem[]; gaps:string[]; humanCheck:string[]; }

export function buildDecisionTrace(employee:any,history:any[],assignments:any[]=[]):DecisionTrace {
  const snapshot=buildTalentDecisionSnapshot(employee,history); const evaluation=latestEvaluationForEmployee(employee,history); const target=resolveTargetProfile(employee?.Pozisyon||"");
  const scores=evaluation?.manager_scores||{}; const gaps=Object.entries(LABELS).map(([code,label])=>{const current=Number(scores?.[code]||0);const targetValue=Number(target.profile?.[label]||0);return {code,label,current,target:targetValue,gap:current>0&&targetValue>0?Number((targetValue-current).toFixed(2)):null};}).filter(x=>x.gap!==null).sort((a,b)=>Number(b.gap)-Number(a.gap));
  const employeeName=String(employee?.["Ad Soyad"]||""); const learning=assignments.filter(item=>String(item?.employee||"")===employeeName); const verified=learning.filter(item=>learningEvidenceState(item)==="verified").length;
  const biggest=gaps[0]; const items:DecisionTraceItem[]=[
    {label:"Performans",value:snapshot.performance.score>0?`${snapshot.performance.score.toFixed(2)} / 5`:"Veri yok",meaning:"Son geçerli performans ölçümü; eksikse karar motoru ortalama varsaymaz.",status:snapshot.performance.score>0?"good":"warn"},
    {label:"Yetkinlik",value:snapshot.competency.score>0?`${snapshot.competency.score.toFixed(2)} / 5`:"Veri yok",meaning:"10 yetkinlikte mevcut ölçümün kapsama göre özeti.",status:snapshot.competency.score>0?"good":"warn"},
    {label:"Kanıt Güveni",value:`%${snapshot.evidence.score}`,meaning:"Kişinin kalitesi değil; kullanılan verinin kapsamı ve izlenebilirliği.",status:snapshot.evidence.score>=60?"good":"warn"},
    {label:"En büyük rol farkı",value:biggest?`${biggest.label}: ${biggest.current.toFixed(1)} → ${biggest.target.toFixed(1)} (${biggest.gap!>0?"-":"+"}${Math.abs(biggest.gap!).toFixed(1)})`:"Karşılaştırılabilir veri yok",meaning:"Gelişim önerisinin rol hedefi ile mevcut ölçüm arasındaki ana dayanağı.",status:biggest&&Number(biggest.gap)>0.5?"warn":"info"},
    {label:"Doğrulanmış gelişim kanıtı",value:String(verified),meaning:"Tamamlanan eğitim değil; işe transferi yönetici tarafından doğrulanmış gelişim kanıtı.",status:verified>0?"good":"info"},
  ];
  return { title:`${employeeName||"Seçili çalışan"} · Karar İzi`, summary:biggest&&Number(biggest.gap)>0?`${biggest.label} alanında rol hedefi ile mevcut ölçüm arasında ${Math.abs(Number(biggest.gap)).toFixed(1)} puan fark bulunuyor. Öneri bu farkı ve Evidence Graph kapsamını birlikte kullanır.`:"Belirgin rol farkı için yeterli karşılaştırılabilir veri bulunmuyor.", items, gaps:snapshot.evidence.missingSignals||[], humanCheck:["En güncel rol hedefi gerçekten bu çalışan için geçerli mi?","Son ölçüm somut davranış/çıktı kanıtıyla destekleniyor mu?","Gelişim aksiyonu gerçek işte uygulanabilir ve yeniden ölçülebilir mi?"] };
}
