# Data Residency Evidence

Last reviewed: 2026-09-07

## Verified observations
- Backend Render service `hr` is currently configured in the **Ohio** region.
- The frontend is deployed on Vercel; frontend execution/delivery location must not be treated as database residency.

## Not yet verified
The current Render workspace exposes **no Render Postgres instance**. Production uses `DATABASE_URL`, so the actual database provider, at-rest region, backup retention and PITR policy are not observable through the current Render database inventory.

## Customer-contract rule
Before onboarding real customer personal data, record and approve:
- database provider and legal entity;
- physical/logical hosting region;
- subprocessors;
- encryption at rest/in transit;
- backup/PITR region and retention;
- any cross-border transfer mechanism required by the controller's KVKK assessment.

Do not state a specific database country/region until this evidence is completed.
