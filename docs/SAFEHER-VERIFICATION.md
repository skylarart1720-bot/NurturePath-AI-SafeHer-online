# SafeHer verification

Latest engineering evidence and remaining external gates: [13 October implementation report](SAFEHER-IMPLEMENTATION-2026-10-13.md). The results below preserve the earlier implementation history.

Scope clarification: these results describe the earlier implementation. The newer three SafeHer PDFs require additional dashboard routes and other work. See the [12 October requirements audit](SAFEHER-PRODUCTION-READINESS.md); `/dashboard/content`, `/dashboard/partners` and `/dashboard/metrics` currently return 404. Earlier “all required routes” wording does not include these missing PDF requirements.

Verification uses synthetic accounts on the local PostgreSQL database. The initial release used seven synthetic organisations; the directory upgrade adds four real organisations with public-source contact checks. No provider calls, messages or referrals are made by automated tests. Existing maternal tables and records were preserved. The additive migrations and seeds preserve existing passwords and records.

Final verification, 12 October 2026:

| Check                                    | Result                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| ESLint                                   | Passed                                                                          |
| Next.js route generation and TypeScript  | Passed                                                                          |
| Unit and database integration tests      | 35 passed across six files                                                      |
| Production build                         | Passed; all required routes generated                                           |
| Functional desktop/mobile browser checks | 28 passed in the full suite                                                     |
| Automated accessibility                  | Two checks passed after fixes, scanning nine public pages on desktop and mobile |
| Production dependency audit              | Zero known vulnerabilities                                                      |

The full browser run initially reported two accessibility failures. The shared contrast and inline-link styling issues were fixed, the application rebuilt, and the two affected checks rerun successfully. All 30 browser cases have passing evidence; the 28 functional cases were not unnecessarily repeated after the CSS-only correction. An earlier transient fixture database connection failure did not recur in the full verification run.

Browser coverage includes all required routes, keyboard skip navigation, mobile overflow/navigation, harassment/consent/child-marriage journeys, attributed retrieval and refusal, educational quizzes, directory filtering, explicit synthetic labels, consent-based manual guidance, offline reload and cache exclusions, download removal, learner progress deletion, account deletion/session invalidation, reviewer and partner authorization, stale-review conflicts, editing/unpublishing, disabled synthetic verification/referral transmission, structured feedback, and preserved clinical/MFA regressions. Tests use installed Chrome and the production standalone build. No live provider or referral outcome is asserted.

Production dependency audit: zero known vulnerabilities. Full dependency audit: five high-severity findings in the development-only Next.js ESLint dependency chain rooted in `braces`; no compatible upstream fix is offered. See setup limitations.

Screenshots are generated at `docs/screenshots/safeher-home-desktop.png` and `docs/screenshots/safeher-home-mobile.png`. Automated accessibility results do not replace manual screen-reader, safeguarding, professional content, or infrastructure review. The legacy clinical offline test now verifies the already-loaded encrypted queue; clinical refresh caching is retired as documented in the migration assessment.

## Real Ghana directory upgrade — 12 October 2026

- Additive public-contact migration applied successfully. Four real listings imported; seven synthetic examples preserved and hidden by default.
- All 41 unit/integration tests passed across seven files, including source/phone fidelity, missing/future/expired reviews, example exclusion, regional enquiry coverage and service/contact-option filters.
- Production build, TypeScript, ESLint and formatting checks passed.
- Eight relevant desktop/mobile browser cases have passing evidence: published-source links, real reproductive-health contacts, consent before revealing contact links, revoking that choice, reporting-channel disclosure limits, explicit synthetic examples, responsive layout, and automated accessibility across nine public pages. The expanded call panel's contrast issue was fixed and its two affected cases rerun successfully.
- Updated local application left running at http://localhost:3200. Homepage and directory API return HTTP 200; the API returns four real public-contact records and seven preserved examples.
- Directory screenshots: `docs/screenshots/ghana-directory-desktop.png` and `docs/screenshots/ghana-directory-mobile.png`.

Source checks are limited to published contact information. Current service availability, opening hours, response times, eligibility and partnership/referral agreements are unconfirmed. See [source evidence and review scope](GHANA-DIRECTORY-SOURCES.md).
