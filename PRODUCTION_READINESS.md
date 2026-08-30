# FutureHR Production Readiness

This document is the release gate for moving FutureHR from the self-contained demo to real multi-tenant SaaS data.

## Current hardening baseline

Implemented in code:

- Resilient AI provider chain: Groq model failover -> OpenAI provider failover -> deterministic rule engine.
- Model-specific structured-output configuration, timeout and retry handling.
- `/api/ai/health` active provider probe and `/api/health` readiness surface.
- AI technical provider errors stay in server logs; raw provider errors are not shown to end users.
- SaaS AI calls require an authenticated backend session.
- HttpOnly, Secure (production), SameSite=Strict access/refresh cookies.
- Server-side dashboard session gate when SaaS mode is enabled.
- Client role context is derived from `/api/v1/auth/me` in SaaS mode rather than trusting localStorage.
- Frontend `proxy.ts` blocks demo login and legacy Next API routes in SaaS mode.
- Backend production configuration fails closed when database/auth/secret/hosts/origins are unsafe.
- Backend legacy `/api/*` endpoints are blocked in secure SaaS mode; tenant-aware `/api/v1/*` is the production boundary.
- Tenant-scoped employee APIs and same-tenant manager reference validation.
- Persistent account lockout after repeated failed password attempts.
- Backend JWT access/refresh token separation and token-version invalidation.
- CI includes frontend dependency audit, lint, build, E2E plus backend auth/tenant/security tests.

## Required production environment

### Frontend / Vercel

Use `frontend/.env.production.example` as the checklist. Required for real SaaS:

- `FUTUREHR_SAAS_MODE=true`
- `NEXT_PUBLIC_DATA_MODE=saas`
- `BACKEND_URL=https://<production-api-host>`
- `GROQ_API_KEY`
- `GROQ_MODEL=openai/gpt-oss-120b` (or a tested supported model)
- `OPENAI_API_KEY` for provider-level failover
- `OPENAI_MODEL=gpt-5.6-luna` (or another tested Responses API model)

Do not expose AI keys through `NEXT_PUBLIC_*` variables.

### Backend

Use `backend/.env.production.example`. Production startup intentionally fails when critical values are missing or unsafe.

Generate a strong secret, for example with a secure password/secret generator; use at least 32 random characters. Never reuse the database password as the JWT secret.

Before first launch:

```bash
alembic upgrade head
```

## Deployment gate

A release that will contain real customer/employee data must satisfy all of these:

1. Managed PostgreSQL is provisioned, encrypted at rest, backed up, and reachable only from the backend network boundary.
2. All Alembic migrations have completed successfully.
3. Backend `/health` reports `ready: true`.
4. Frontend `/api/health` reports `ready: true` in SaaS mode.
5. AI health succeeds and at least one provider is configured; two providers are recommended.
6. `ALLOW_LEGACY_API_IN_SAAS=false`.
7. Production hosts and CORS origins are explicit; no `*` host/origin.
8. Demo/localStorage data is not treated as a production source of truth.
9. Every production module reads/writes through tenant-scoped `/api/v1` APIs.
10. CI is green, including backend security tests and frontend E2E.

## Remaining migration work before real customer data

These are product/architecture tasks, not optional polish:

### P0 — Production blockers

- Migrate remaining modules from browser localStorage/demo JSON to relational tenant-scoped APIs. Employee master is the first `/api/v1` foundation; performance, talent, development, career, succession, compensation, recruiting, leave and employee-experience persistence still need full production API migration.
- Add tenant-isolation integration tests for every new `/api/v1` resource, including cross-tenant ID attempts.
- Add authorization tests for CEO, HR admin, director, manager and employee scopes for each sensitive resource.
- Deploy a managed backend/API runtime and PostgreSQL; Vercel currently hosts the Next.js frontend, not the full relational backend.
- Configure edge/gateway rate limiting for login, AI and public candidate endpoints. Account lockout is defense-in-depth, not a substitute for distributed rate limiting.
- Establish database backup + point-in-time recovery and perform a restore drill.

### P1 — Operational security

- Centralize immutable audit events for sensitive reads/writes: compensation, performance, talent, recruitment, role/permission changes and exports.
- Add production error monitoring and alerting for auth failures, elevated 4xx/5xx, AI provider degradation and database health.
- Add secret rotation procedure for JWT, database and AI provider credentials.
- Add data retention/deletion jobs and tenant offboarding workflow.
- Review uploaded Excel/file handling for MIME/type, size, formula injection and malware controls before production imports are enabled.

### P1 — Functional integrity

- Complete API-backed create/read/update/deactivate flows for employee master.
- Move module calculations to shared domain services so dashboard, reports and exports cannot calculate the same metric differently.
- Add idempotency for import/bulk mutation endpoints.
- Add optimistic concurrency/version checks for sensitive HR decisions so two managers cannot silently overwrite each other.
- Add explicit workflow states for finalization/locking of performance and compensation cycles.

### P2 — Scale and reliability

- Load-test key read paths and AI endpoints with realistic tenant sizes.
- Add database indexes based on query plans and production telemetry.
- Introduce distributed cache only for non-sensitive derived data where invalidation is well-defined.
- Define SLOs for API availability, p95 latency, AI degradation and recovery.

## Security principle

UI role visibility is not authorization. Production authorization must always be enforced at the backend using the authenticated user's tenant and role. Browser state may improve UX but must never grant data access.

## Release status

The current application is a hardened demo plus an emerging secure SaaS core. It should not yet be described as fully production-ready for real employee/customer data until the P0 migration items above are completed and verified in the target infrastructure.
