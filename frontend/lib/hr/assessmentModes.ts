import type { AssessmentQuestion } from "@/app/data/questions";
import { buildControlledQuestionOrder } from "@/lib/hr/assessmentDesign";

export type AssessmentDepth = "quick" | "standard" | "deep";
export const ASSESSMENT_DEPTHS: Record<AssessmentDepth,{label:string;description:string;itemsPerCompetency:number;lieItems:number;durationMinutes:number;scenarios:number}> = {
  quick:{label:"Hızlı",description:"Ön eleme / kısa gelişim taraması",itemsPerCompetency:5,lieItems:5,durationMinutes:18,scenarios:2},
  standard:{label:"Standart",description:"Varsayılan işe alım ve yetkinlik değerlendirmesi",itemsPerCompetency:8,lieItems:8,durationMinutes:28,scenarios:3},
  deep:{label:"Derin",description:"Yüksek önem taşıyan roller için tam envanter",itemsPerCompetency:12,lieItems:20,durationMinutes:45,scenarios:4},
};

function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i+=1){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rank(seed:string,id:number){return hash(`${seed}|${id}`);}

export function selectAssessmentItems(questions:AssessmentQuestion[],seed:string,depth:AssessmentDepth){
  const config=ASSESSMENT_DEPTHS[depth];
  if(depth==="deep") return buildControlledQuestionOrder(questions,seed);
  const categories=["DIG","ANA","RES","DET","LRN","ETH","DIS","STR","TEA","COM"];
  const selected:AssessmentQuestion[]=[];
  categories.forEach(category=>{
    const pool=questions.filter(q=>q.category===category).sort((a,b)=>rank(`${seed}|${category}`,a.id)-rank(`${seed}|${category}`,b.id));
    const reverse=pool.filter(q=>q.type==="R");const straight=pool.filter(q=>q.type!=="R");
    const reverseCount=Math.min(reverse.length,Math.max(1,Math.round(config.itemsPerCompetency/3)));
    const part=[...reverse.slice(0,reverseCount),...straight.slice(0,config.itemsPerCompetency-reverseCount)];
    selected.push(...part);
  });
  selected.push(...questions.filter(q=>q.category==="LIE").sort((a,b)=>rank(`${seed}|LIE`,a.id)-rank(`${seed}|LIE`,b.id)).slice(0,config.lieItems));
  return buildControlledQuestionOrder(selected,`${seed}|mix`);
}
