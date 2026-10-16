# Find Support experience and operations

## Visitor walkthrough

Choose Health support, Someone is hurting or threatening me, Legal help, or Online safety. Each starting point filters relevant service categories while keeping region and access preferences. Choosing a service category replaces the starting-point filter. Selected filter chips can be removed individually, or cleared together. Search text and selected filters are held on the page; SafeHer does not put them in the URL or submit their values with search metrics.

Results separate Ghana-wide enquiry contacts from regional listings. National enquiries remain visible when a region is selected; this is not a claim of a local branch or nearby availability. Empty results offer filter reset and national-enquiry alternatives where available.

Provider cards show services, region, access methods, and the actual contact-check date first. Expand Eligibility, hours, accessibility & sources for detail and evidence. Unknown information remains unconfirmed. Source checking is distinct from availability, accessibility, eligibility and partnership.

Review contact options opens guidance inside that provider's card, moves keyboard focus to its heading, and returns focus on Cancel. Calling, email and provider-page links remain hidden until the visitor acknowledges the limitations and chooses Continue to guidance. Revoking that choice hides the contact links. No referral is sent. Closing the panel or switching providers clears its consent state.

The preparation checklist offers five questions about eligibility, costs, hours, confidentiality/reporting duties, required information and accessibility. Ticks are optional, not submitted and not stored. No account is required.

## Incorrect-information reports

Each card has a Report incorrect information section. It accepts only a fixed issue choice and the public listing ID. There is no free-text story, contact-information field or attachment. Failed submissions show an error and allow retry; successful submissions clearly state that no provider was contacted and do not claim the listing changed.

`POST /api/safeher/directory/report` validates a strict payload, rejects arbitrary reason text and extra fields, checks the listing is real and published, checks request origin, and applies the dedicated reporting rate limit. It stores the organisation's current name and ID in the existing SafeherFeedback category, and the issue choice in its rating field. No schema migration is required. A report does not modify the provider, its review status or its contact details.

Platform administrators see these grouped reports under Service information & content feedback, with the existing privacy threshold for counts. Use the named organisation/ID and issue to investigate through the established directory review workflow. Verify evidence before changing a listing; withdraw uncertain contacts and republish only after a fresh review. Reports do not establish that a provider is unavailable. This form is not monitored for emergency help and makes no response-time promise.

## Verification

Run `npm run lint`, `npm run typecheck`, and `npm test -- tests/unit/safeher-directory.test.ts tests/unit/safeher-directory-report.test.ts`. The targeted tests cover shortcut/category combinations and publication exclusions, strict report validation, origin/rate-limit enforcement and storage shape using isolated mocks.

With the local server running, use `npx tsx scripts/verify-support-ui.ts`. It intercepts directory/report APIs with synthetic fixtures on localhost only. It checks shortcuts, chips, regional/national groups, missing results, preparation, consent/revocation, focus return, report error/retry, minimal report payload, network retry, mobile overflow and automated accessibility. Screenshots are saved to test-results/support-enhancement. These are fixture checks, not real provider availability checks or professional content approval.

The existing Ghana directory browser tests were updated for expandable evidence and scoped contact status. The database integration test records a structured report in a synthetic test database, checks the provider is unchanged, rejects extra fields and cross-origin requests, and removes its report. Do not run integration fixtures against a real-user database. Hosted smoke checks must not create invented “wrong number” reports.

Completed local checks: lint and TypeScript passed; all 12 targeted unit tests passed. The fixture browser run passed all four starting points, combined filters, removable chips, coverage groups, empty-state recovery, expired/example exclusion, five preparation questions, expandable evidence, inline consent/revocation, focus return, report error/retry and minimal payload, and directory network retry. At 1440px and 390px, no horizontal overflow or automated WCAG A/AA findings were detected within main content. Automated checks are not accessibility certification. Local database integration remains delegated to the synthetic-database CI workflow because the local database is unavailable.
