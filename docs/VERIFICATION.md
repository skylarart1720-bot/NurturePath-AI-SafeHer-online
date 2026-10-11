# Verification evidence

Recorded 10 October 2026 (local timezone; UTC tools may show 11 October). All data used is synthetic. Tests ran against local PostgreSQL and the compiled Next.js standalone application on port 3200.

| Command / check           | Observed result                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`            | PASS, exit 0                                                                                                                                       |
| `npm run typecheck`       | PASS, exit 0                                                                                                                                       |
| `npm test`                | PASS, 17 tests across four files, exit 0                                                                                                           |
| `npm run build`           | PASS, Next.js 16.4.0 production build, exit 0                                                                                                      |
| `npm run db:migrate`      | PASS, no pending migrations                                                                                                                        |
| `npm audit --omit=dev`    | Zero runtime vulnerabilities                                                                                                                       |
| Full dependency audit     | Five high development-only lint-chain advisories; see DEPENDENCIES.md                                                                              |
| Desktop/mobile Playwright | PASS, final compiled-app run: 12 passed in 6.1 minutes, exit 0; clinic closure metrics verified                                                    |
| Encrypted backup/restore  | PASS; eight table counts matched in a separate scratch database, 15.436 seconds                                                                    |
| Local synthetic load      | 100 requests, concurrency five, zero failures; p50 485 ms, p95 1,036 ms, max 3,225 ms                                                              |
| Docker image build        | FAILED twice during dependency downloads; final attempt ECONNRESET at `npm ci` after approximately 903 seconds. No container smoke test completed. |

The 800 ms p95 target is unmet. Local results do not establish hosted capacity, availability, RPO/RTO, clinical validation or independent security/accessibility approval.

Browser suite covers worker registration, appointment, follow-up and referral closure; clinic closure metrics; tenant/role/origin boundaries; MFA password verification and one-use codes; full offline refresh, encrypted registration, reconnect synchronization and logout wiping; 360px/1440px layouts and mobile navigation. Screenshots are in `docs/screenshots`.

Database/unit coverage includes scoped access, consent enforcement, referral transitions, idempotency/version checks, contact encryption/key versions, approved-source input validation, TOTP vectors and session-revocation races/prefix tampering.

Run the compiled browser suite on Windows with installed Chrome:

```powershell
npm run start
# In a second terminal:
$env:PLAYWRIGHT_CHANNEL='chrome'
$env:PLAYWRIGHT_PRODUCTION='true'
npm run test:e2e
```

Stop the standalone server before rebuilding on Windows to release Prisma's DLL. [Backup evidence](BACKUP-RESTORE-EVIDENCE.json) and [load evidence](LOAD-TEST-EVIDENCE.json) contain measured results. Container failure output remains locally in ignored `test-results/docker-build.log`.
