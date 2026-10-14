# SafeHer architecture and migration

Reuse Next.js 16, PostgreSQL/Prisma, hashed revocable sessions, password hashing, MFA, origin validation, persistent rate limits, encrypted contact infrastructure, and redacted audit records. The existing maternal appointment UI and APIs are legacy; SafeHer navigation does not expose them. Preserve their tables and records. Do not run `db:reset-demo` against existing data.

Add separate SafeHer content, directory, progress, feedback and aggregate tables and roles. No existing table is dropped or renamed. Back up the database before applying migrations. Roll back application code before considering schema rollback; added roles may already be referenced by users.

Public lessons and retrieval use only explicitly published English content. Seed content is source-grounded demonstration material, approved for synthetic demonstration only; professional safeguarding/content review remains required before a real pilot. Retrieval is deterministic extractive assistance, without an external model or user-conversation storage. No clinical diagnosis, credibility determination, or risk scoring is implemented.

Service examples are synthetic and have no contact numbers. Verification requires a non-synthetic entry, contact source, date and explicit administrator approval. Referral transmission is disabled; manual instructions explain consent and limitations.

The subsequent `202610120002_directory_contacts` migration adds public phone/email fields, contact/service tags and a verification-method field. The dated Ghana directory import adds four real organisations whose published contacts have been checked; it does not overwrite examples, later staff edits, or revoked reviews. This source-check scope and its 180-day freshness gate do not establish availability, partnerships or referral approval. See the [provider evidence](GHANA-DIRECTORY-SOURCES.md).

Public resources can be explicitly downloaded. Chat, account pages, referral details and API responses are excluded from service-worker caches. Users can remove downloads and progress. Aggregate daily counters contain no user, IP, query, module or service identifiers; cells below ten are suppressed. Public SafeHer rate-limit keys are pseudonymous and short-lived. Existing authentication limits use an account identifier; expired rows are removed by maintenance. Server/proxy logs require deployment review.

Implementation phases: public design and learning; API/RBAC/content management; privacy/offline; tests/documentation. Existing clinical tests remain regression coverage and require their own synthetic seed/database. SafeHer tests use separate fixtures.

The former clinical offline form is preserved at `/legacy-offline` for already-loaded encrypted-queue regression coverage. Refresh caches now serve only the public SafeHer educational shell. Clinical offline refresh is intentionally retired to avoid automatically caching sensitive workflows; this changes the former maternal offline-refresh journey without deleting its records or encryption implementation.
