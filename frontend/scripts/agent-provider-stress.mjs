const key = process.env.GROQ_API_KEY;
const endpoint = "https://api.groq.com/openai/v1/chat/completions";
const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const actionKinds = ["open_employee","open_performance","open_development","open_training","open_career","open_talent","open_succession","open_compensation","open_recruitment","prepare_development_plan","prepare_training_assignment","prepare_reassessment","prepare_calibration_review","prepare_succession_review","prepare_compensation_review","prepare_recruitment_review","none"];
const schema = {
  type:"object",
  properties:{
    answer:{type:"string"}, executiveSummary:{type:"string"}, confidence:{type:"string",enum:["düşük","orta","yüksek"]}, confidenceReason:{type:"string"},
    recommendations:{type:"array",maxItems:5,items:{type:"object",properties:{title:{type:"string"},why:{type:"string"},evidence:{type:"string"},route:{type:"string"}},required:["title","why","evidence","route"],additionalProperties:false}},
    evidenceSources:{type:"array",maxItems:8,items:{type:"object",properties:{label:{type:"string"},detail:{type:"string"},route:{type:"string"},domain:{type:"string"},confidence:{type:"string",enum:["düşük","orta","yüksek"]},value:{type:"string"}},required:["label","detail","route","domain","confidence","value"],additionalProperties:false}},
    nextActions:{type:"array",maxItems:5,items:{type:"object",properties:{label:{type:"string"},route:{type:"string"},actionKind:{type:"string",enum:actionKinds}},required:["label","route","actionKind"],additionalProperties:false}},
    evidenceGaps:{type:"array",maxItems:6,items:{type:"string"}}, guardrail:{type:"string"}
  },
  required:["answer","executiveSummary","confidence","confidenceReason","recommendations","evidenceSources","nextActions","evidenceGaps","guardrail"], additionalProperties:false
};

const tests = [
  ["Maaş benchmark", "Seçili çalışanın maaşı piyasanın neresinde?", {compensation:{compaRatio:.94,benchmarkCoverage:100,cycleStage:"bütçe inceleme"}}],
  ["Performans", "Seçili çalışanın güncel performansı nasıl?", {performance:{score:4.2,evidenceScore:86,calibrationRequired:false}}],
  ["9-Box", "Seçili çalışan 9-Box'ta nerede?", {talentCareer:{performance:4.2,potential:4.3,nineBox:"Yıldız",evidenceScore:86}}],
  ["Eğitim", "Seçili çalışana hangi eğitimleri vermeliyiz ve neden?", {development:{competencyGaps:[{label:"Analitik Düşünme",actual:3.1,target:4,gap:.9}],completedTraining:["Temel Veri Okuryazarlığı"],recommendedInterventions:[{name:"İleri Analitik Problem Çözme",transferTask:"Gerçek iş problemi",reassessDays:60}]}}],
  ["Kariyer", "Seçili çalışan bir üst role hazır mı?", {talentCareer:{performance:4.2,potential:4.3,nineBox:"Yıldız",competencyGaps:[{label:"Stratejik Liderlik",gap:.7}],readiness:78}}],
  ["Halefiyet", "Seçili rol için halefiyet riski nedir?", {succession:{criticalRole:true,candidates:[{subjectAlias:"Çalışan-01",readiness:88},{subjectAlias:"Çalışan-02",readiness:72}]}}],
  ["Aday", "Teklif aşamasındaki adaylarda risk var mı?", {recruitment:{candidates:[{subjectAlias:"Aday-01",stage:"Teklif",evidenceScore:3},{subjectAlias:"Aday-02",stage:"Teklif",evidenceScore:1}]}}],
  ["Pipeline", "İşe alım pipeline'ındaki darboğaz nerede?", {recruitment:{stages:{Basvuru:42,OnEleme:18,Test:15,Mulakat:6,Teklif:2},medianDays:{Test:2,Mulakat:9,Teklif:3}}}],
  ["Kalibrasyon", "Ekibimde kalibrasyon gerektiren performans kararları var mı?", {performance:{employeeCount:18,averagePerformance:3.8,calibrationRequired:4,lowEvidenceCount:3}}],
  ["Gelişim etkisi", "Gelişim programlarının işe transfer etkisi nasıl?", {development:{assignmentCount:24,verified:15,measured:12,due:5,positiveRate:75,averageDelta:.4}}],
  ["Organizasyon", "Organizasyonda yönetici yükü açısından risk nerede?", {organization:{headcount:64,managers:[{unit:"Satış",span:11},{unit:"Operasyon",span:5},{unit:"Finans",span:4}]}}],
  ["Deneyim", "Bu hafta çalışan deneyiminde neye dikkat etmeliyiz?", {employeeExperience:{latest:{average_score:6.8,participation:72},latestDelta:-.6,lowestDriver:{label:"İş Yükü",average:2.9},strongestDriver:{label:"Yönetici Desteği",average:4.1}}}],
  ["CEO", "CEO olarak bu hafta dikkat etmem gereken 5 insan kararını söyle.", {executive:{calibrationRequired:4,lowEvidenceCount:3,successionGaps:2,reassessmentDue:5},employeeExperience:{latestDelta:-.6,lowestDriver:{label:"İş Yükü",average:2.9}},compensation:{benchmarkCoverage:100},recruitment:{openRoles:4,interviewBottleneckDays:9}}],
  ["Yetenek riski", "Şirket genelinde en kritik yetenek riski nedir?", {talentCareer:{employeeCount:64,highPotentialCount:9,starCount:5},succession:{criticalRolesWithoutReadySuccessor:2},performance:{lowEvidenceCount:3},development:{due:5}}],
  ["Tüm sistem", "Tüm sistem sinyallerini birleştirerek önümüzdeki ayın insan gündemini özetle.", {universalFutureHR:{datasetCoverage:Array.from({length:20},(_,i)=>({id:`d${i}`,count:50+i})),topMatches:Array.from({length:8},(_,i)=>({dataset:`d${i}`,score:20-i,subjectAlias:`Çalışan-${i+1}`,record:{metric:`m${i}`,value:i*3,note:"x".repeat(250)}}))},executive:{calibrationRequired:4,successionGaps:2,reassessmentDue:5},employeeExperience:{latestDelta:-.6},recruitment:{openRoles:4}}]
];

const cjk = /[\u3400-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
function prompt(question, context){return `Sen FutureHR Intelligence'sın. Yalnız verilen FutureHR kanıtlarına dayan. Türkçe cevap ver. Nihai işe alma/işten çıkarma/terfi/ücret/halef kararını verme. Kanıt yoksa uydurma. evidenceSources.value yoksa boş string, nextActions.actionKind yoksa none kullan.\nSORU:${question}\nKANIT:${JSON.stringify(context)}\nYalnız JSON schema ile uyumlu tek JSON nesnesi üret.`}
function valid(x){return x&&typeof x.answer==="string"&&typeof x.executiveSummary==="string"&&["düşük","orta","yüksek"].includes(x.confidence)&&Array.isArray(x.recommendations)&&Array.isArray(x.evidenceSources)&&Array.isArray(x.nextActions)&&Array.isArray(x.evidenceGaps)&&typeof x.guardrail==="string"&&!cjk.test(JSON.stringify(x));}

if(!key){console.log("AGENT_STRESS SKIP: GROQ_API_KEY build ortamında yok"); process.exit(0)}
let pass=0, fail=0;
for(let i=0;i<tests.length;i++){
  const [name,question,context]=tests[i];
  try{
    const response=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"user",content:prompt(question,context)}],max_completion_tokens:350,reasoning_effort:"low",include_reasoning:false,response_format:{type:"json_schema",json_schema:{name:"futurehr_intelligence_agent",strict:true,schema}}})});
    const raw=await response.text();
    if(!response.ok) throw new Error(`HTTP ${response.status} ${raw.slice(0,240)}`);
    const payload=JSON.parse(raw); const text=payload?.choices?.[0]?.message?.content||""; const parsed=JSON.parse(text);
    if(!valid(parsed)) throw new Error("schema/language validation failed");
    pass++; console.log(`AGENT_STRESS PASS ${i+1}/15 ${name} :: ${parsed.answer.slice(0,120).replace(/\n/g," ")}`);
  }catch(error){fail++; console.log(`AGENT_STRESS FAIL ${i+1}/15 ${name} :: ${String(error).slice(0,300)}`)}
  await new Promise(r=>setTimeout(r,250));
}
console.log(`AGENT_STRESS RESULT pass=${pass} fail=${fail} total=15 model=${model}`);
process.exit(0);
