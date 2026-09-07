# Production Branch Protection

Target: `main`

The repository now contains the lightweight `FutureHR Fast Smoke` workflow. Apply these GitHub repository rules before treating `main` as protected production:

1. Require a pull request before merging.
2. Require status checks:
   - `frontend-smoke`
   - `backend-tenant-scope`
3. Require branches to be up to date before merging.
4. Block force pushes and branch deletion.
5. Do not allow bypass for ordinary contributors.
6. For a solo-maintainer repository, 0 required approvals is acceptable initially; increase to 1 when a second maintainer joins.

The connected GitHub App used by ChatGPT does not expose repository-administration write permission, so this rule cannot be switched on programmatically from this session. The workflow and exact required check names are committed and ready for the admin toggle.

## Release policy
- Small UI/copy changes: PR + fast smoke; no full quality chain required.
- Backend/security/data-model changes: PR + fast smoke and targeted backend tests; run the full quality chain when release risk warrants it.
- Production deploy only from `main`.
