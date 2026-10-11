# API contract

Authenticated JSON APIs return `{data: ...}` or `{error: {code, message, correlationId, fields?}}`. Auth endpoints return a generic message envelope. Writes require exact `Origin` matching `APP_URL`; all data operations re-check session status. Server validation uses strict Zod schemas, bounded text and controlled reasons/outcomes. Default page size is 50; `page` starts at 1. No unrestricted data export exists.

| Method / path                          | Purpose                                                            | Authorized roles             |
| -------------------------------------- | ------------------------------------------------------------------ | ---------------------------- |
| POST /api/auth/login                   | Email/password; role redirect                                      | Anonymous, rate limited      |
| POST /api/auth/logout                  | Revoke current session                                             | Current browser origin       |
| POST /api/auth/reset                   | Local simulated recovery / consume token                           | Anonymous, rate limited      |
| GET /api/session                       | Current minimal actor                                              | Authenticated                |
| GET, POST /api/mothers                 | Paginated assigned list / register consenting adult                | Worker / clinic              |
| GET, PATCH /api/mothers/:id            | Audited detail / versioned minimal update                          | Worker / clinic in scope     |
| POST /api/mothers/assign               | Versioned reassignment to active clinic worker                     | Clinic                       |
| POST /api/consents                     | Versioned grant/withdraw channel; registration withdrawal archives | Worker / clinic              |
| GET, POST, PATCH /api/appointments     | Schedule with automatic follow-up; versioned edit                  | Worker / clinic              |
| GET, POST, PATCH /api/followups        | Standalone task / record outcome and next action                   | Worker / clinic              |
| GET, POST, PATCH /api/referrals        | Create / versioned legal status transition                         | Worker / clinic              |
| GET /api/dashboard/metrics?start=&end= | Range-filtered operational ratios; end exclusive                   | All roles scoped             |
| POST /api/offline/sync                 | Single encrypted-client payload after decryption, UUID replay key  | Worker / clinic              |
| GET /api/audit                         | Paginated redacted action metadata                                 | Clinic / programme / auditor |
| GET /api/templates                     | Approved worker copy / admin draft library                         | Worker / clinic / programme  |
| POST /api/messages/preview             | Consent-gated neutral preview                                      | Worker / clinic              |
| POST /api/messages/send                | Simulated delivery only                                            | Worker / clinic              |
| POST /api/ai/simplify-approved-content | `{sourceId,locale}` only; stored unapproved draft                  | Clinic / programme           |
| POST /api/templates/approve            | English synthetic review only                                      | Clinic                       |
| GET, POST /api/clinics                 | Tenant facilities / add synthetic clinic                           | Programme; clinic read own   |
| GET /api/staff                         | Scoped minimal staff records                                       | Clinic / programme           |
| POST /api/users/status                 | Activate/deactivate, revoke sessions                               | Programme                    |
| GET /api/health                        | Public DB availability; no sensitive details                       | Anonymous                    |

The UI also uses explicit POST `/appointments/update`, `/followups/update`, and `/referrals/update` aliases. `version` is mandatory for appointment, referral, mother, reassignment and consent changes. Follow-up completion uses an atomic pending-state check. Offline replay accepts only registration, appointments, follow-up outcomes, and referrals. Consent and messaging are never queued.

Referral transitions: created → accepted / unable to contact; accepted → attended / unable to contact; unable to contact → accepted; attended → closed. Closure requires a non-clinical note. Created is never counted as closed.

Errors: 400 validation, 401 expired/no session, 403 unauthorized/origin, 404 out-of-scope record, 409 stale version/consent/replay conflict, 429 rate limit, 503 real-data block. Failed requests log only correlation/category, not request bodies or database error contents.
