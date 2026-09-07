# Backup & Restore Runbook

## Purpose
Prove that FutureHR can recover customer data, not merely that a backup setting exists.

## Preconditions
1. Identify the provider behind production `DATABASE_URL` without exposing credentials.
2. Record region, backup retention, point-in-time recovery capability and encryption status.
3. Create an isolated restore target that cannot send email/webhooks or connect to production integrations.

## Restore drill
1. Record drill start time and the production backup/PITR timestamp selected.
2. Restore into the isolated database.
3. Apply `alembic upgrade head`.
4. Start backend with production-like auth and the restored database.
5. Call `/health`; require `ready=true`, `database_ok=true`, `legacy_api_allowed=false`.
6. Verify tenant counts for at least two tenants using read-only SQL or approved admin evidence.
7. Run the cross-tenant regression suite; no tenant-A credential may retrieve tenant-B data.
8. Call `/api/v1/audit/integrity` with an authorized admin account; require `integrity=valid`.
9. Compare expected employee, leave, performance and product-state record counts.
10. Record end time, achieved RTO and observed data-loss window (RPO).
11. Destroy the isolated restore target after evidence is archived.

## Evidence record
- Drill date:
- Operator:
- Database provider/region:
- Backup timestamp:
- Restore start/end:
- Achieved RTO:
- Observed RPO:
- `/health` result:
- Audit-chain result:
- Tenant escape tests:
- Record-count checks:
- Issues / corrective actions:

A backup is considered **verified** only after this drill succeeds.
