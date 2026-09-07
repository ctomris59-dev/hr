# FutureHR Service Targets (Internal)

These are engineering targets, **not a customer SLA** until infrastructure evidence and contracts support them.

- Availability SLO target: **99.5% monthly** for authenticated application/API availability.
- Initial recovery-time objective (RTO) target: **4 hours** for a recoverable database/service incident.
- Initial recovery-point objective (RPO) target: **24 hours or better**.

## Promotion to contractual SLA
Do not make these contractual until:
1. the production database provider and backup policy are verified;
2. at least one isolated restore drill meets the proposed RTO/RPO;
3. monitoring/alert ownership and escalation contacts are named;
4. planned maintenance and provider exclusions are defined.

After two successful restore drills, tighten the targets based on observed capability rather than aspiration.
