# FutureHR Intelligence Agent v1

## Product principle

FutureHR is the system of record for people data, evidence and HR workflows. FutureHR Intelligence is the natural-language reasoning layer on top of that system of record.

The agent does **not** browse rendered pages. It queries the same underlying data and domain engines used by the pages. This makes answers faster, auditable and permission-aware.

## End-to-end architecture

```text
User question
   ↓
Global FutureHR Intelligence panel
   ↓
RBAC / data scope resolution
   ↓
Employee matcher (optional)
   ↓
Employee 360 Context Engine
   ↓
Query planner
   ↓
FutureHR Agent Tool Registry
   ├─ performanceAnalytics
   ├─ developmentAdvisor / developmentAnalytics
   ├─ talentCareerAdvisor / talentPortfolio
   ├─ successionAdvisor
   ├─ compensationAdvisor
   ├─ recruitmentAdvisor
   ├─ organizationAnalytics
   └─ executiveBrief
   ↓
Evidence sources + evidence gaps + prepared actions
   ↓
PII-minimized external context
   ↓
Structured AI synthesis
   ↓
Answer + recommendations + evidence + deep links
   ↓
Optional controlled action draft
   ↓
Human review inside the target FutureHR module
```

## 1. Employee 360 Context Engine

Implemented in `frontend/lib/hr/employee360Context.ts`.

The context engine combines, for an authorized employee:

- organization identity and role,
- latest and historical performance evidence,
- talent decision snapshot,
- role competency target and measurable competency gaps,
- training assignment history,
- evidence-based training/development recommendations,
- development plans,
- verified learning-transfer / reassessment metrics,
- career profile,
- succession evidence when the user has access,
- compensation data-quality / benchmark evidence when the user has access.

Training recommendations use the existing FutureHR Development Library and explicitly avoid treating already completed interventions as new recommendations by default.

## 2. FutureHR Agent Tool Registry

Implemented in `frontend/lib/hr/futureHRAgent.ts`.

The query planner uses the question plus current page context to select only relevant domain tools. The LLM is not given unrestricted application access. Domain tools execute first, locally or against permission-filtered SaaS APIs, and only their bounded results are provided for synthesis.

Supported tools:

- `employee360`
- `performanceAnalytics`
- `developmentAdvisor`
- `developmentAnalytics`
- `talentCareerAdvisor`
- `talentPortfolio`
- `successionAdvisor`
- `compensationAdvisor`
- `recruitmentAdvisor`
- `organizationAnalytics`
- `executiveBrief`

## 3. Global AI panel

Implemented in `frontend/components/FutureHRIntelligenceAgent.tsx` and mounted globally from `ClientLayout.tsx`.

The panel is available from every authenticated FutureHR screen and receives current-page context automatically.

It supports:

- free-form natural-language questions,
- employee-specific questions,
- page-aware quick prompts,
- multi-tool evidence synthesis,
- conversation history within the current session,
- persistent recent query summaries in local demo storage.

## 4. Evidence sources and deep links

Each tool produces typed evidence sources with:

- source label,
- evidence summary,
- domain,
- FutureHR route,
- optional confidence/value.

The UI renders these as clickable evidence cards. Clicking a card deep-links to the relevant FutureHR module and stores the current AI focus so the module knows why the user arrived there.

`AgentActionHandoff.tsx` displays the handoff in the destination module.

## 5. Education / development agent

For questions such as:

> "Ayşe Kaya'ya hangi eğitimleri vermeliyiz?"

FutureHR Intelligence:

1. resolves the employee inside the user's authorized data scope,
2. reads role-target competency levels,
3. compares them with current measured competency levels,
4. reads existing training assignments and completion state,
5. reads development plans and learning-transfer evidence,
6. selects evidence-based interventions from the FutureHR Development Library,
7. prioritizes interventions that address the largest current gaps,
8. avoids presenting completed interventions as fresh recommendations by default,
9. proposes a transfer task, success metric and reassessment window.

## 6. Performance / talent / career agent

The agent combines:

- KPI evidence,
- manager observation,
- performance score,
- competency evidence,
- Evidence Score,
- potential / 9-Box signals,
- career profile,
- competency gaps.

It can explain readiness and evidence quality but does not make an autonomous promotion decision.

## 7. Compensation / succession / recruitment queries

Sensitive domains are tool-gated and route-gated.

- Compensation is available only where the user's role can access `/maas`.
- Succession is available only where the user's role can access `/yedekleme`.
- Recruitment is available only where the user's role can access `/ise-alim`.

If access is denied, the agent returns an access-boundary explanation instead of leaking or inferring restricted data.

Compensation context sent to external AI is intentionally aggregate/data-quality oriented; raw personal salary amounts are excluded.

## 8. CEO-level company questions

The `executiveBrief` tool synthesizes the user's authorized population and supports questions such as:

- What should management focus on this week?
- How many performance decisions need calibration?
- How many employees have low evidence confidence?
- How many verified development interventions are due for reassessment?
- What data gaps limit decision quality?

For managers/directors the same tool operates on their permitted team scope rather than the whole company.

## 9. Controlled “prepare action” capability

The agent may prepare drafts, never silently execute HR decisions.

Current draft action types include:

- training assignment draft,
- development plan draft,
- reassessment review,
- calibration review,
- succession review,
- compensation review,
- recruitment review.

Drafts are stored as `draft` state with `requiresConfirmation: true`. The target module shows an AI handoff banner with the payload. The user must review the module and perform the actual business action.

This design intentionally prevents excessive agency.

## Security and governance controls

### RBAC first

Authorization is applied before agent reasoning. The agent sees only the data scope the user can already access in FutureHR.

### PII minimization

For employee-focused questions, the employee name is replaced with `seçili çalışan` before the request reaches an external AI provider. The browser restores the display name locally after the structured response returns.

The server performs a second recursive redaction pass for names, contact details, protected attributes, credentials and raw salary fields.

### Prompt-injection resistance

Retrieved FutureHR data is explicitly treated as **evidence, never instructions**. Prompt-like strings inside notes or imported data must not alter system behavior.

### Human-in-the-loop

FutureHR Intelligence can summarize, explain and prepare drafts. It does not autonomously:

- hire or reject a candidate,
- terminate employment,
- promote an employee,
- change performance scores,
- change salary,
- apply discipline,
- appoint a successor.

### Evidence-first answers

Every important answer should expose:

- evidence sources,
- evidence gaps,
- confidence,
- relevant FutureHR deep links,
- human validation step.

## Demo and SaaS data modes

The agent supports both FutureHR data modes:

- Demo/local mode uses the shared FutureHR browser data store.
- SaaS mode gathers authorized employee, performance, talent, development and compensation workspaces from existing secure SaaS APIs. Endpoints remain responsible for tenant and role enforcement.

Recruitment evidence in SaaS mode will remain an evidence gap until a tenant-scoped recruitment workspace endpoint is exposed to the agent data adapter.

## Main implementation files

- `frontend/lib/hr/futureHRAgentTypes.ts`
- `frontend/lib/hr/employee360Context.ts`
- `frontend/lib/hr/futureHRAgent.ts`
- `frontend/app/api/ai/agent/route.ts`
- `frontend/components/FutureHRIntelligenceAgent.tsx`
- `frontend/components/AgentActionHandoff.tsx`
- `frontend/components/ClientLayout.tsx`
- `frontend/components/ModuleWorkspace.tsx`
- `frontend/app/utils/storage.ts`

## Suggested validation questions

1. `Ayşe Kaya'ya hangi eğitimleri vermeliyiz ve neden?`
2. `Ayşe Kaya'nın bir üst role hazırlanması için en kritik iki kanıt nedir?`
3. `Bu hafta yönetici olarak hangi performans kararlarını kalibre etmeliyim?`
4. `Hazır halefi olmayan kritik roller var mı?`
5. `Ücret benchmark kapsamımız ne durumda?`
6. `İşe alım pipeline'ında hangi veri eksikleri var?`
7. `Ekibimde gelişim müdahalelerinden hangileri yeniden ölçüm bekliyor?`
8. `CEO olarak bu ay dikkat etmem gereken insan kararlarını özetle.`

## Research rationale

The architecture deliberately minimizes autonomous write permissions and keeps approval in the business workflow. This aligns with current guidance emphasizing human oversight, documented provenance and constrained agent permissions. It also treats prompt injection, sensitive information disclosure and excessive agency as first-class application risks rather than model-only concerns.
