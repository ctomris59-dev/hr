export type EvidenceSignal = { key:string; present:boolean; weight:number; label:string };
export type DecisionEvidence = { score:number; band:"düşük"|"orta"|"yüksek"|string; signals:EvidenceSignal[]; missing:string[] };
export type DecisionRecommendation = {
  title:string;
  next_step:string;
  decision_authority:"human"|string;
  autonomous_action:boolean;
  evidence_gaps:string[];
  risks:string[];
};
export type HumanReview = {
  id:string;
  decision_type:string;
  status:"ACKNOWLEDGED"|"NEEDS_EVIDENCE"|"APPROVED_FOR_NEXT_STEP"|"REJECTED";
  note?:string|null;
  reviewed_by?:string;
  reviewed_at?:string;
};
export type CompensationInsight = {
  employee_id:string;
  employee_name:string;
  salary_available:boolean;
  market_benchmark_available:boolean;
  market_average:number|null;
  compa_ratio:number|null;
  market_gap_pct:number|null;
  peer_median:number|null;
  peer_position_pct:number|null;
  compression_risk:boolean;
  compression_ratio:number|null;
  benchmark_source?:string|null;
};
export type DigitalTwin = {
  employee:{id:string;external_id?:string|null;full_name:string;department?:string|null;position?:string|null;job_family?:string|null;job_level?:string|null;manager_employee_id?:string|null;hire_date?:string|null;employment_type?:string|null;location?:string|null;source:string};
  performance:{score:number|null;kpi_score:number|null;manager_score:number|null;competency_score:number|null;evaluated_at?:string|null};
  skills:Record<string,number>;
  talent:{career_aspiration:number|null;mobility_willingness:number|null};
  development:{active_count:number;items:Array<{id:string;competency?:string|null;goal:string;status:string;due_date?:string|null}>};
  leave:{pending:number;approved_days:number};
  compensation:Omit<CompensationInsight,"employee_id"|"employee_name">;
  evidence:DecisionEvidence;
  decision:DecisionRecommendation;
  human_reviews:HumanReview[];
  generated_at:string;
};
export type DecisionProfile = {
  employee:DigitalTwin["employee"];
  recommendation:DecisionRecommendation;
  evidence:DecisionEvidence;
  explainability_chain:Array<{step:string;value:unknown}>;
  guardrail:string;
};
export type DecisionPriority = {employee_id:string;employee_name:string;department?:string|null;priority_score:number;reasons:string[];recommended_next_step:string;evidence_score:number};
export type SkillsGraph = {
  nodes:Array<{id:string;name?:string;label?:string;type?:string;department?:string|null;position?:string|null}>;
  edges:Array<{source:string;target:string;type:string;score?:number;target_score?:number}>;
  role_requirements:Array<{role:string;skill:string;target:number;sample_size:number;source:string}>;
  method:string;
};
export type TurkiyeComplianceStatus = {
  country_code:string;
  locale:string;
  checks:Array<{key:string;label:string;status:"ready"|"attention"|"not_configured"|string}>;
  connectors:Record<string,{enabled:boolean;mode:string;label?:string|null}>;
  notice:string;
};

async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const response=await fetch(`/api/saas/workforce/${path}`,{
    ...init,
    headers:{"Content-Type":"application/json",...(init?.headers||{})},
    cache:"no-store",
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok){
    const message=payload?.detail||payload?.error||"FutureHR karar zekâsı verisi alınamadı.";
    throw new Error(typeof message==="string"?message:"FutureHR karar zekâsı verisi alınamadı.");
  }
  return payload as T;
}

export function fetchDigitalTwin(employeeId:string){return request<DigitalTwin>(`digital-twin/${encodeURIComponent(employeeId)}`);}
export function fetchDecisionProfile(employeeId:string){return request<DecisionProfile>(`decision/employees/${encodeURIComponent(employeeId)}`);}
export function fetchDecisionPriorities(){return request<{items:DecisionPriority[];generated_at:string}>("decision/priorities");}
export function fetchSkillsGraph(){return request<SkillsGraph>("skills/graph");}
export function fetchCompensationInsight(employeeId:string){return request<CompensationInsight>(`compensation/insights/${encodeURIComponent(employeeId)}`);}
export function fetchTurkiyeComplianceStatus(){return request<TurkiyeComplianceStatus>("compliance/turkiye/status");}
export function recordHumanReview(employeeId:string,payload:{decision_type:string;status:HumanReview["status"];note?:string}){
  return request<HumanReview>(`decision/employees/${encodeURIComponent(employeeId)}/review`,{method:"POST",body:JSON.stringify(payload)});
}
export function convertCandidateToEmployee(payload:{candidate_source_id:string;full_name:string;email?:string|null;department?:string|null;position?:string|null;job_family?:string|null;job_level?:string|null;assessment_summary?:string|null;competency_signals?:Record<string,number>}){
  return request<{employee_id:string;full_name:string;lifecycle_source:string;candidate_source_id:string;next_step:string}>("lifecycle/candidates/convert",{method:"POST",body:JSON.stringify(payload)});
}
export function updateTurkiyeConnector(provider:"sgk"|"logo"|"mikro"|"netsis",payload:{enabled:boolean;mode:"file"|"api"|"manual";label?:string}){
  return request<{provider:string;enabled:boolean;mode:string;label?:string|null;secrets_stored:boolean}>(`compliance/turkiye/connectors/${provider}`,{method:"PATCH",body:JSON.stringify(payload)});
}
