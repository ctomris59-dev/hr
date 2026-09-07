# FutureHR Enterprise Readiness Evidence

Last reviewed: 2026-09-07

This document distinguishes implemented controls from provider/third-party evidence. A control is not called verified unless it can be demonstrated independently.

| Control | Status | Evidence / next proof |
|---|---|---|
| Tenant isolation | Implemented + automated regression | Secure `/api/v1` APIs scope by `tenant_id`; fast gate runs cross-tenant employee and dashboard tests. |
| Dashboard server calculation | Implemented | `/api/v1/dashboard/summary` calculates role-scoped counts on the server. |
| Audit immutability | Implemented for PostgreSQL | `audit_events_immutable`, PostgreSQL UPDATE/DELETE rejection trigger, SHA-256 chain and `/api/v1/audit/integrity`. |
| Database migrations | Implemented | SaaS startup upgrades Alembic to head before serving traffic. |
| Backup policy | **Not independently verified** | Render workspace exposes no Render Postgres instance; `DATABASE_URL` points to a database not observable through the current provider connector. Confirm provider, retention and PITR before a customer SLA. |
| Restore drill | **Pending** | Execute `BACKUP_RESTORE_RUNBOOK.md` against an isolated restore target and attach timestamps/evidence. |
| Backend data location | Partially verified | Render application service observed in Ohio. Database at-rest location remains unverified until DB provider is identified. |
| Frontend compute | Provider-managed | Vercel serves the Next.js application. Do not infer database residency from frontend region. |
| Incident response | Implemented as procedure | `INCIDENT_RESPONSE.md`. Needs named on-call owners before first external customer. |
| RTO/RPO | Targets defined, not guaranteed | See `SLO_RTO_RPO.md`; contractual values require restore evidence. |
| Penetration test | **Pending external test** | `PENETRATION_TEST_READINESS.md`; automated tests are not a penetration test. |
| Release gate | Implemented in repository | `FutureHR Fast Smoke`: TypeScript + desktop/mobile critical smoke + tenant-scope backend checks. |
| Protected main | **Admin action pending** | Connector can create PRs/workflows but cannot change repository administration rules. Apply `BRANCH_PROTECTION.md` in GitHub settings. |

## Rule

Never present **Pending**, **Target**, or **Implemented** as independently certified. Customer-facing security claims must link to concrete evidence and its date.
