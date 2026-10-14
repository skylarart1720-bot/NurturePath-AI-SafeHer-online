# NurturePath AI — SafeHer

Safe information. Safe choices. Safer futures.

See the [13 October implementation report](SAFEHER-IMPLEMENTATION-2026-10-13.md) for current engineering evidence and the [launch register](SAFEHER-LAUNCH-REGISTER.md) for outstanding external approvals. This setup guide describes the educational preview.

## Run the synthetic demonstration

Requirements: Node 24, npm, Docker Desktop with Linux containers. Keep the existing `.env` and database if upgrading. For a fresh checkout, copy `.env.example` to `.env`, configure random keys and passwords, or use the existing `node scripts/setup-local.mjs` helper. Set `SAFEHER_DEMO_PASSWORD` to a non-placeholder value of at least twelve characters; never commit `.env`.

```powershell
npm ci
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed:safeher
npm run directory:seed
npm run dev
```

Open http://localhost:3200. Use the exact origin configured in `APP_URL`. All basic information works without an account. The seed refuses non-demo mode and does not overwrite existing lessons, users, passwords, or directory entries. Synthetic accounts use `SAFEHER_DEMO_PASSWORD`:

| Email                    | Role             | Access                                                             |
| ------------------------ | ---------------- | ------------------------------------------------------------------ |
| learner@safeher.example  | Registered user  | Own completed lessons and data controls                            |
| reviewer@safeher.example | Content reviewer | Draft, review, publish demo lessons                                |
| partner@safeher.example  | Support partner  | Only explicitly assigned directory entries; initially none         |
| admin@safeher.example    | Administrator    | Content, directory verification, aggregate metrics, redacted audit |

The master request is implemented in the existing application. Next.js/TypeScript, PostgreSQL/Prisma, sessions, MFA and audit infrastructure are reused. [Migration assessment](SAFEHER-MIGRATION.md) explains preservation of maternal data. Existing clinical functionality remains at `/worker`, `/clinic`, `/admin`, with `/legacy-login` for regression testing. SafeHer roles cannot access the legacy API. Historical maternal documentation and screenshots describe the prior application, not SafeHer.

When upgrading an existing local demo without `SAFEHER_DEMO_PASSWORD`, seeding and browser tests use the existing `DEMO_PASSWORD`. This preserves the current environment without exposing or changing its credentials.

## Product and API

Public routes: `/`, `/ask-safeher`, `/learn`, `/learn/[slug]`, `/digital-safety`, `/find-support`, `/about`, `/privacy`, `/safety`, `/contact`, `/login`. `/dashboard` exposes only data authorized by its server API. `/offline` reads explicit device downloads.

SafeHer routes are handled by `/api/safeher/[...path]`. GET: `content`, `directory`, `me`, `admin`. POST: `ask`, `metrics`, `feedback`, `progress`, `logout`, and role-controlled `admin/content`, `admin/review`, `admin/service`, `admin/service-update`, `admin/verify`. DELETE: `progress`, `account`. Referral POST always rejects transmission. Mutations require the configured Origin and persistent rate limiting. Payload schemas reject unknown fields. Account deletion applies only to optional learner accounts; staff lifecycle remains an operator responsibility.

The assistant performs deterministic keyword retrieval and returns exact reviewed lesson excerpts with source attribution. It does not call an external language model. Unknown or unsupported clinical/credibility/risk requests return clear limitations. Retrieval matches topic words, not unrestricted natural-language reasoning; reformulate a question or open lessons when no answer is found. English is published; content storage has a locale field for future reviewed translations.

## Content and directory administration

The 13 October release adds protected `/dashboard/content`, `/dashboard/partners` and `/dashboard/metrics` pages, recorded content revisions/restoration, service review history/withdrawal, explicit expiry, confirmed accessibility filtering, translation drafts with qualified-review gates, actual answer/download review metadata, bounded streamed JSON, nonce script policy and authenticated Vercel maintenance. The [operations playbook](SAFEHER-OPERATIONS.md), [architecture](SAFEHER-ARCHITECTURE.md), [Vercel handoff](SAFEHER-VERCEL.md), and [launch register](SAFEHER-LAUNCH-REGISTER.md) describe the current implementation and remaining external evidence. Twelve demo lessons and eight synthetic service examples are seeded; four real public-source-checked contacts remain separate.

Content reviewers and administrators edit structured lesson JSON, validate allowed source domains and quiz choices, and save drafts. All edits unpublish the lesson. Approval uses an optimistic version check and a recorded review date. Demo approval cannot be mistaken for professional review. Real-pilot publication is disabled unless `SAFEHER_PILOT_REVIEW_ENABLED=true` after required external review. Do not toggle this as a substitute for actual review.

Administrators create service entries, record independently checked source URLs, and review public contact details. Synthetic entries cannot be verified. Any edit clears verification. Support partners may edit only assigned entries; they have no conversation, learner, or referral access. Opening hours and eligibility require provider confirmation; missing hours are explicitly unknown. `npm run directory:seed` imports four real Ghanaian organisations with dated authoritative-source checks; it preserves subsequent edits and never contacts the organisations. [Evidence and scope](GHANA-DIRECTORY-SOURCES.md) document the published numbers and disclosure limits. The directory defaults to real listings, exposes synthetic examples only when explicitly selected, and hides missing/future/expired contact reviews after 180 days.

The administrator editor uses structured JSON; use the displayed schema fields and an existing entry as a template. Translation drafts/review records are implemented, while the public language interface remains English and self-registration stays disabled. Seeded optional accounts demonstrate progress and deletion.

An operator with database access may change an existing same-organization account role or assign a directory entry using `npx tsx scripts/safeher-operator.ts`. Feed JSON through private stdin containing `actorEmail`, `actorPassword`, `actorCode`, `email`, `role`, and optional `serviceId`. The command requires an active administrator password and fresh MFA code, revokes sessions, and records redacted audit metadata. First-admin bootstrap, invitations, enrollment and reviewed recovery use `npm run safeher:enrollment`; see the [operations playbook](SAFEHER-OPERATIONS.md). Keep credentials out of shell arguments and shared logs.

## Offline learning

Visit a published lesson online and choose **Save for offline reading**. The app stores only that educational resource in browser local storage. Once the public offline shell is ready, refresh without connectivity to open `/offline` and read saved resources. Service-worker caches contain only the public offline shell and build/brand assets. Chat, directory, account/API responses, and referral details are not cached. Offline inference is not implemented. Use Privacy → Remove downloads, or Saved resources → Remove all downloads. A shared browser may reveal saved topics. Copies can become outdated.

## Testing

```powershell
npm run lint
npm run typecheck
npm test
npm run build
$env:PLAYWRIGHT_CHANNEL='chrome'
$env:PLAYWRIGHT_PRODUCTION='true'
npm run test:e2e:safeher
```

Use installed Chrome or Playwright Chromium. All integration tests require the seeded database. For full legacy regression coverage, additionally run `npm run db:seed` with an explicitly synthetic local database and `DEMO_PASSWORD`; this seed preserves existing data. Then run `npm run test:e2e`. Never run demonstration reset against an existing production database. Browser tests create labeled synthetic fixtures; the deletion fixture cleans itself up. Aggregate counters include test activity and must not be reported as real impact.

Tests cover source-grounded retrieval, unsupported advice, unknown topics, roles, thresholds, payload/origin checks, synthetic verification and referral gates, database cascade deletion, complete educational journeys, mobile overflow/navigation, keyboard skip link, offline downloads/cache exclusion, learner progress, account deletion and structured feedback. Accessibility automation supplements manual keyboard/screen-reader assessment; no certification is claimed.

## Deployment

Back up existing data using the existing reviewed backup runbook before additive migration. Deploy the existing Dockerfile or Node standalone build with PostgreSQL, run `prisma migrate deploy`, then seed only a dedicated synthetic demo database. Never run demo seed on a real-user deployment. Set exact HTTPS `APP_URL`, strong database/auth/encryption credentials and secure cookie transport. Supply environment values through the hosting secret manager. Do not expose PostgreSQL publicly.

Run `npm run safeher:maintenance` daily and alert on failure. It removes expired sessions, reset tokens and rate-limit rows; structured feedback older than 90 days; aggregates and SafeHer audit metadata older than 365 days. Optional progress is removed on request/account deletion. Configure encrypted volumes/backups, 30-day backup expiry, restore-time reapplication of deletion requests, restricted operator access, proxy log minimization and deletion procedures. These infrastructure requirements are not automatically implemented by application code.

Only enable `TRUST_PROXY=true` when a trusted reverse proxy strips inbound forwarded headers and supplies the client address. Public mutation categories use persistent limits of sixty requests per minute for a validated session or trusted address; unidentified traffic shares a category bucket of six hundred. Staff mutations share a bounded staff category. Authentication also has per-account limits. Hosted edge limits remain required for scale. Database outages reject mutations; Ask SafeHer can return static safety/limitations guidance without database content or an external call.

## Safeguarding and known limitations

This is an educational preview, not a sensitive-data service pilot. It includes source-grounded demonstration educational material; a qualified health/safeguarding reviewer must approve local applicability and wording before real use. Four real organisations have public contact details checked against authoritative sources. No calls were made, availability remains unconfirmed, no partner has authorised referrals, and no emergency response is available. The fifth scenario reads downloaded content offline; the healthcare-support scenario now reveals published provider contact options after an informed, deliberate user choice. Automated tests never call or email providers.

Quick Exit navigates to Wikipedia but does not erase history, network traces, screenshots, or downloads. External content/links are outside SafeHer control. No conversation training or external AI analytics exists. Host logs and shared devices can still reveal activity; no complete anonymity or confidentiality promise is made.

Complete a Ghana Act 843 assessment, data-controller/processor arrangements, relevant registration, child-protection procedures, named safeguarding lead, service partner authorization, local-language review, penetration testing, accessibility evaluation and restore/deletion rehearsal before real sensitive-data use. Professional review and partner approval are external requirements; code cannot grant them.

MIT license is retained. Original SVG SafeHer mark: `public/brand/safeher.svg`. No UNFPA, UNICEF, WHO or event endorsement is claimed.

Typography is self-hosted Inter Latin, distributed under the SIL Open Font License with its notice at `public/fonts/INTER-LICENSE.txt`. The font is bundled locally and included in the public offline shell cache. The earlier Geist asset/license are preserved as historical assets.

The production dependency audit has no known vulnerabilities at verification time. The development dependency audit reports a high-severity `braces` stack-exhaustion advisory through Next.js ESLint tooling. No compatible fixed version is offered by the current audit; its proposed fix downgrades ESLint’s Next.js configuration across a major framework version. Avoid untrusted patterns in development tooling and track upstream remediation. This is a development-tool limitation, not a production dependency finding.
