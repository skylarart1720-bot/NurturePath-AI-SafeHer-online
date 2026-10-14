# SafeHer implementation and release evidence — 13 October 2026

This report supersedes the engineering gap list in the 12 October audit. Existing maternal records, additive migration history, and prior SafeHer work are preserved. The result remains an educational preview; external launch gates are open.

## Implemented

| Earlier gap                             | Current implementation                                                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing named dashboard routes          | `/dashboard/content`, `/dashboard/partners`, `/dashboard/metrics`; database-backed sessions and role checks on each page and API                                                              |
| Required typography and resource counts | Licensed self-hosted Inter; 12 English demonstration lessons; 8 explicitly fictional service examples; 4 separate public-source-checked Ghana contacts                                        |
| Content history and source evidence     | Versioned immutable snapshots containing lesson/source metadata, review decisions, reviewer identifier, actual dates and expiry; restoration creates a fresh draft                            |
| Translation review architecture         | Exact source-version references, separate translation drafts/revisions, qualified review gate and expiry; English remains the supported public interface                                      |
| Directory review and delisting          | Explicit expiry/publication status, historical review snapshots, immediate withdrawal, edit invalidation, confirmed accessibility evidence/filter; unknown hours/accessibility remain unknown |
| Answer/offline review metadata          | Actual database version/date/scope/expiry; saved copies reject missing/expired reviews and reconcile withdrawal/version changes when connected                                                |
| Assistant safety and optional adapter   | Dedicated high-risk/refusal evaluations; static outage fallback; optional disabled HTTPS gateway receiving approved excerpts only and accepting exact supplied paragraphs                     |
| Request/session hardening               | Streaming byte limits across SafeHer/auth/MFA/clinical APIs, endpoint/session/trusted-address rate buckets, production staff MFA checks, fresh script nonces, uncached dynamic HTML           |
| Staff lifecycle                         | First-admin bootstrap, private expiring hashed invitations, password/authenticator enrollment, audited same-organization provisioning/recovery, token/session revocation                      |
| Restore deletion handling               | Transactional learner deletion ledger, authenticated encrypted exports, quarantined restore replay, repeat safety and privileged-account protection                                           |
| Operations/deployment preparation       | Vercel build configuration, protected cron endpoint, staging smoke script, architecture/playbook, timed demo and explicit launch owner/evidence register                                      |

Professional content review, emergency scripts, confirmed provider availability, actual accessibility services, translations, and AI vendor approval have not been manufactured. Referral transmission remains disabled. Demo review metadata is labeled as demonstration review.

## Verification

- Additive readiness and enrollment migrations applied to the local synthetic PostgreSQL database.
- Unit/integration baseline: **55 passed in nine files**, including streamed byte limits, high-risk handling, source-only adapter behavior, offline expiry/withdrawal and single-use MFA enrollment.
- Production Next.js build: passed, with all named dashboard routes, enrollment, maintenance and nonce Proxy generated.
- Production dependency audit retry: **zero reported vulnerabilities**. Development lint-chain advisories remain separately tracked; this is not penetration-test evidence.
- Encrypted scratch restore: **18 matching table counts**, including SafeHer revisions/services/enrollment/deletion; see [restore evidence](BACKUP-RESTORE-EVIDENCE.json).
- Encrypted deletion export/replay: restored learner/progress/sessions removed, repeated replay idempotent, privileged account rejected without partial deletion; see [drill evidence](SAFEHER-DELETION-REPLAY-EVIDENCE.json).
- Browser evidence is being finalized after a full desktop/mobile production run. A desktop network-change error and initial database startup failure require focused reruns. The staff-creation regression prompted moving password hashing outside the clinical transaction; final rebuild and focused MFA verification remain required before the release commit.
- Container verification attempted: Docker Hub base-image metadata timed out before compilation. Container packaging remains unverified. Vercel is the selected hosting target.

Some evidence timestamps use UTC and can fall on 14 October while the client's local calendar date is 13 October. Review dates shown in the product are actual stored UTC metadata.

## Required external inputs and evidence

Vercel CLI reported logged out; no Vercel team/project, hosted PostgreSQL database, stable staging hostname or domain is connected. [Vercel handoff](SAFEHER-VERCEL.md) contains the concrete setup and environment manifest. No public deployment was performed.

The [launch register](SAFEHER-LAUNCH-REGISTER.md) names outstanding operator/privacy/safeguarding/reviewer/security/accessibility/platform/database/release owner fields and required evidence. Before a real-user pilot, obtain professional/legal/safeguarding review, direct provider checks where availability is claimed, independent security assessment, consenting-adult physical-device/screen-reader evaluation, monitored rights/incident channels, approved region/contracts/budget, protected remote CI/releases, hosted backup/PITR plus external ledger storage and a restore rehearsal. These cannot be completed by setting application flags.

## Relevant guides

- [Operations and staff lifecycle](SAFEHER-OPERATIONS.md)
- [Architecture and data boundaries](SAFEHER-ARCHITECTURE.md)
- [Vercel staging and production](SAFEHER-VERCEL.md)
- [Launch evidence and manual assessment protocol](SAFEHER-LAUNCH-REGISTER.md)
- [Three-minute demo and five journeys](SAFEHER-DEMO.md)
