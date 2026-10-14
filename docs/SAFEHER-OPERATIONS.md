# SafeHer release and operations playbook

Prepared 13 October 2026. This is an executable local release plan and an operator handoff. It does not record external approval or a hosted launch.

## Release procedure

Use Node 24. Preserve `.env`, existing data, and the maternal migration history. Create a database backup before additive migrations. Use a separate synthetic database for tests and seeds.

Local development uses `.next-dev`; production builds use `.next`, so their manifests do not overwrite each other. Generate Prisma before starting development. On Windows, stop servers before regenerating Prisma after a schema change. If the generated client is already current, `npx next build` can compile production while development remains running. Verify production on a separate free port with a matching APP_URL, then keep the user's development server at port 3200.

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed:safeher
npm run directory:seed
npm run lint
npm run typecheck
npm test
npm run build
$env:PLAYWRIGHT_CHANNEL='chrome'
$env:PLAYWRIGHT_PRODUCTION='true'
npm run test:e2e
npm audit --omit=dev --audit-level=high
```

The branch `feature/safeher-readiness` preserves earlier uncommitted SafeHer work. Create the release branch only after checks pass. Record its SHA, artifact digest, migration list, environment configuration review, and approver in the release evidence. Do not seed a real-user database.

## Content and translations

`/dashboard/content` is restricted to reviewers and platform administrators. Each save, review, and restoration records an immutable snapshot including source attribution. Restoring an earlier version creates a new draft; it never restores the old approval. Approved English lessons require a review date, expiry, and the applicable review scope. Demo review is not professional review.

Translation drafts reference an exact source version. Approval requires `SAFEHER_TRANSLATION_REVIEW_ENABLED=true`, current professionally approved source content, and an authorized reviewer. Source changes invalidate that basis. The public English interface remains the supported release; translation approval records do not automatically enable an untested language interface. Complete language-specific safety and accessibility evaluations before adding that interface.

Reviews expire after 180 days. Daily maintenance must report expired content and directory entries. Public content rejects expired records even before maintenance runs. Saved copies carry actual review metadata, reject expired or undated content, and reconcile withdrawal/version changes when connectivity returns. Offline revocation cannot be instantaneous. Operator clock synchronization and browser clock accuracy remain assumptions.

## Directory verification

`/dashboard/partners` is restricted to administrators and assigned support partners. Partners edit only their assigned entries; edits invalidate contact verification. Administrators record review history, withdraw entries immediately, and record accessibility evidence separately. Public-source checking does not prove availability or partnership. Never convert a synthetic service into a verified real contact without separate evidence and correct identity.

For each real provider, retain source URL, actual checker, check date, explicit expiry, confirmed contact fields, verification method, availability limits, confirmed hours if available, and accessibility evidence. Unknown values stay unknown. Review at least every 180 days and immediately after a complaint/change. Record complaint reference without personal disclosures, investigate through the operator channel, withdraw uncertain records, and republish only after a fresh review. Escalation owner and monitored channel must be supplied in the launch register.

## First administrator, invitations, recovery

Run `npm run safeher:enrollment` with a JSON object on standard input from a private file or secure tool. Never put passwords, bootstrap secrets, or invitation tokens in shell arguments, Git, tickets, screenshots, or shared logs.

Bootstrap input fields: `action: bootstrap`, `email`, `name`, `organizationId`, `role: PLATFORM_ADMIN`, `bootstrapSecret`, and `evidenceReference`. Supply an existing organization ID, or include `organizationName` to create the first organization during bootstrap. Configure a random `SAFEHER_BOOTSTRAP_SECRET` of at least 32 characters, perform bootstrap once on the trusted host, and remove it. The command refuses bootstrap if any platform administrator already exists, including a demo administrator. Production must use an independent database with no synthetic accounts.

Invite/recover input fields: `action: invite` or `recover`, target `email`, `name`, `organizationId`, target `role`, `actorEmail`, `actorPassword`, `actorCode`, and `evidenceReference`. The acting administrator must belong to the same organization and provide a fresh MFA code. Recovery requires existing organization and role to match, rotates away the old password/MFA, and revokes all sessions/reset/enrollment tokens. Identity verification and recovery approval happen through the designated operator process; evidenceReference points to that restricted record. Keep two enrolled administrators and practice recovery before launch.

Invitations also support optional `REGISTERED_USER` learner accounts. These use the same secure enrollment flow; educational guest access remains free of registration. Public self-registration stays disabled. Learner deletion removes any enrollment records as well as account/progress/session/reset data.

The command prints a private invitation URL with a fragment token, expires after 30 minutes, and stores only its hash. The `/enroll` page removes the fragment from browser history, sets up an authenticator, and requires password plus valid code to activate. The invitation is single-use. Privileged sign-in requires a fresh authenticator code outside demo mode.

## Deletion and restore

Learner account/progress deletion writes a minimal ledger entry in the same database transaction. IDs are pseudonymous personal data; protect the ledger and define its retention against the maximum backup lifetime. Export frequently and after rights requests into separately retained encrypted storage:

```powershell
npm run safeher:deletion-ledger -- export backups/deletions-unique-timestamp.json.enc
```

Exports use AES-256-GCM with the independent backup key and refuse overwrite. Database backups alone are insufficient: a backup made before deletion will omit that deletion. Retain the newest ledger outside the database backup schedule. On a quarantined restore, replay the latest authenticated export before exposing the application:

```powershell
$env:SAFEHER_RESTORE_REPLAY='true'
npm run safeher:deletion-ledger -- replay backups/deletions-unique-timestamp.json.enc
```

Replay deletes only learner accounts, revokes cascaded sessions, removes progress predating a progress-deletion event, and is idempotent. Validate counts and account absence, then unset the replay flag. Managed backup/PITR and externally retained ledger recovery require a hosted drill. The existing local scratch restore never overwrites the source database.

## Security, logs, incidents

Next.js Proxy supplies fresh script nonces; production script policy has no `unsafe-inline` or `unsafe-eval`. Inline styles remain allowed for existing UI style properties. HTML is dynamically rendered and uncached; only explicit public offline-shell/static assets are service-worker cached. Configure TLS/HSTS on the host after confirming domain and HTTPS. Validate forwarding behavior before enabling `TRUST_PROXY`: the edge must overwrite incoming forwarded headers. Application rate limits use a database bucket per endpoint and session or trusted address; anonymous traffic without a trusted proxy uses a bounded shared bucket. Edge rate limits are required for internet exposure.

All JSON readers bound streamed bytes, including auth and chunked requests. Never log request bodies, questions, authenticator keys, tokens, credentials, lesson interests, or provider-contact choices. Monitor health status, request error/latency counts, rate-limit events, scheduled maintenance, review queue ages, backup/ledger export freshness, and certificate expiry without identifying payloads.

Incident workflow: restrict access or disable affected feature, preserve redacted evidence, notify the named incident lead, assess impact with privacy/safeguarding/security leads, decide legally applicable notifications with counsel, remediate, rehearse rollback/restore, and approve reopening. No automatic emergency monitoring or referral transmission exists. Privacy-rights workflow: authenticate the requester proportionately, register a restricted case, assess scope/deadline with counsel, execute deletion/export where authorized, record minimal evidence, reconcile backup deletions, and confirm through the approved channel.

## Assistant gateway

Local extraction is the default. Optional HTTPS gateway settings are `SAFEHER_AI_ENABLED`, `SAFEHER_AI_VENDOR_APPROVED`, `SAFEHER_AI_ENDPOINT`, and vault-held `SAFEHER_AI_KEY`. Both flags default false. The server sends approved excerpts/source metadata only, never the original question or identity. Gateway requests reject redirects, time out after three seconds, cap response bytes, and accept only exact supplied paragraphs. Unsupported/error output falls back to local extraction. This is a constrained paragraph selector, not open-ended generation. Safety refusals run before any gateway call. Any wider generative adapter needs separate source-validation and safety work.

Before enabling a gateway obtain vendor/DPA/data-region review, notices, credential rotation, adversarial evaluation, and an approved change record. If the database is unavailable, Ask SafeHer returns static limitations/safety guidance without an external call. No clinical judgment, legal judgment, risk scoring, evidence collection, or automated referral is enabled.
