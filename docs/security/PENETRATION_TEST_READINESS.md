# Penetration Test Readiness

Status: **External penetration test pending.** Automated unit/E2E/security tests are not a penetration test and must never be represented as one.

## Minimum external scope
- Secure authentication, refresh/session revocation and lockout.
- Horizontal/vertical authorization and tenant isolation across `/api/v1`.
- IDOR/BOLA tests on employee, salary, talent, succession, recruitment and product-state resources.
- Injection, request smuggling, CORS/CSRF/origin controls and file/data imports.
- Sensitive data exposure in responses, logs, AI paths and exported files.
- Business-logic abuse of approvals, compensation, leave and role changes.
- Rate limiting / credential attack resilience.
- Dependency/configuration review for Vercel + backend hosting.

## Exit criteria
All Critical/High findings fixed and retested. Medium findings need owner, risk acceptance or due date. The final report and retest letter should be retained as customer security evidence.
