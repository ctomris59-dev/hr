# FutureHR Incident Response Procedure

## Severity
- **SEV-1:** confirmed/likely data breach, tenant isolation failure, authentication bypass, widespread outage.
- **SEV-2:** major function unavailable or data integrity risk with contained scope.
- **SEV-3:** degraded non-critical feature with workaround.

## First 15 minutes
1. Open an incident record and timestamp detection.
2. Assign incident commander and technical lead.
3. Preserve logs/evidence; do not delete affected records.
4. For suspected tenant/security exposure, stop the affected write path or place the service in maintenance mode if containment requires it.
5. Revoke compromised sessions/tokens where applicable.

## Containment and recovery
- Identify affected tenant(s), users, endpoints and time window.
- Compare deploy SHA, audit chain, authentication events and database changes.
- Roll back application code only when schema compatibility is safe.
- Restore data only through the documented backup/restore procedure.
- Validate `/health`, tenant-scope tests and critical desktop/mobile smoke before reopening.

## Communication
- Keep factual internal updates with timestamps and impact; avoid speculation.
- Customer/regulatory notification timing and content must be determined with the controller's legal/KVKK obligations and confirmed facts.
- Never state that no data was accessed unless evidence supports that conclusion.

## Closure
A SEV-1/SEV-2 incident requires a written postmortem: root cause, impact, detection gap, corrective actions, owners and due dates. Security corrective actions become release blockers when recurrence could expose another tenant.
