# Continuation checkpoint

Current SafeHer continuation: [13 October implementation report](SAFEHER-IMPLEMENTATION-2026-10-13.md), [operations](SAFEHER-OPERATIONS.md), and [Vercel handoff](SAFEHER-VERCEL.md). The checkpoint below preserves the earlier maternal application history.

Requirements: the overview, MVP, and production PDFs in the repository root were read. Initial code contained the Prisma schema and six library helpers only. Existing foundation was preserved.

Implemented: responsive public/legal pages; original brand/PWA assets; database migration; idempotent fictional seed; role-aware worker/clinic/admin/auditor workspaces; three-step adult enrolment/consent; appointment/follow-up/referral workflow; audited scoped APIs; contact encryption/key versions; neutral simulator; deterministic approved-source draft/review; encrypted actor-bound offline queue with replay/version checks; MFA setup/sign-in and one-use codes; staff/facility management; CI; standalone/container packaging; encrypted local backup/restore; documentation and screenshots.

Local origin is **http://localhost:3200** because 3000 and 3100 belong to unrelated apps. `scripts/run-next.mjs` reads the configured origin/PORT, binds locally, and serves the standalone build with copied static assets for `npm run start`. Stop the compiled server before rebuilding on Windows: the loaded Prisma DLL otherwise remains locked.

Verification is recorded in [VERIFICATION.md](VERIFICATION.md). Production-mode browser tests use installed Chrome via `PLAYWRIGHT_CHANNEL=chrome`. A new machine can install Chromium and omit that override.

Sessions are bound to the user's revocation version. Password reset, deactivation and MFA changes invalidate stale tokens, including sign-ins that race with those changes. Database regression coverage verifies stale issuance rejection and token-prefix tampering.

Container build was attempted twice; dependency download failed with ECONNRESET. Packaging remains unverified. The local synthetic load check had zero failures but p95 1,036 ms exceeds the 800 ms target. Local encrypted backup/restore matched eight table counts in 15.436 seconds; this is not hosted recovery evidence.

The public offline shell has direct Sync now controls and caches only its required static assets. It supports offline refresh with a remembered tab session. API/personalized HTML caches remain prohibited. Secure logout requires connectivity to revoke the server session, then wipes the encrypted queue, tab key and in-memory records.

Production gates A–F remain externally pending. Runtime dependency audit is clean; development-only upstream lint advisories are tracked in DEPENDENCIES.md. No real patient launch, qualified clinical validation, live provider connection, hosting project or public deployment is claimed. The production gap audit names remaining infrastructure/provider engineering and approvals explicitly.

Next continuation must preserve working behavior, inspect actual test evidence, resolve production gaps against the final PDF, and avoid toggling demo mode as a substitute for verified legal/clinical/partner/security/operational approvals.
