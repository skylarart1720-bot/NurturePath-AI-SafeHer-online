# NurturePath AI

Every mother deserves care that follows her home.

Download the [user and completion guide PDF](docs/NurturePath-AI-User-Guide.pdf) for setup, a demo walkthrough, completed work and the production completion plan. Its editable source is `docs/USER-GUIDE.html`.

An offline-capable, Ghana-first maternal follow-up and closed-loop referral coordination prototype. Next.js App Router, TypeScript, PostgreSQL/Prisma, Dexie encrypted offline queue, and opaque database-backed sessions. **Synthetic adults only. No clinical advice, live messaging, or real-patient onboarding.**

## Local setup

Node 24, npm, Docker Desktop with Linux containers:

```powershell
npm ci
node scripts/setup-local.mjs
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3200**. Use the exact origin in `APP_URL`; the development server binds to the local interface only. Setup preserves existing `.env` files and generates local encryption keys. It sets the explicitly synthetic demo password **NurtureDemo!2026**. If you already supplied `.env`, use your configured `DEMO_PASSWORD`.

| Account                         | Role               | Scope                                     |
| ------------------------------- | ------------------ | ----------------------------------------- |
| worker@demo.nurturepath.test    | Health worker      | Assigned Adenta records                   |
| clinic@demo.nurturepath.test    | Clinic coordinator | Adenta clinic                             |
| admin@demo.nurturepath.test     | Programme admin    | Tenant settings and suppressed aggregates |
| auditor@demo.nurturepath.test   | Auditor            | Metadata and suppressed aggregates        |
| worker2@demo.nurturepath.test   | Health worker      | Assigned Tamale records                   |
| colleague@demo.nurturepath.test | Health worker      | Adenta assignment testing                 |

The seed preserves existing data. To reset **local demonstration mothers only**, explicitly set `ALLOW_DEMO_RESET=true` and run `npm run db:reset-demo`. The script refuses hosted databases and production mode.

## Demonstrate the workflow

1. Sign in as the worker. Enroll a fictional adult, confirm consent, and choose optional reminder channels.
2. Open Mothers, select the new record, and schedule a visit. A follow-up task is created automatically.
3. Record reached, no answer, rescheduled, or declined. No answer and rescheduled require a next action date.
4. Create a referral. Record acceptance, attendance, and closure with a coordination note.
5. Preview a neutral message and simulate delivery. Withdraw SMS consent and verify further simulation is rejected.
6. Sign in as the clinic coordinator to see clinic metrics. Programme admins cannot list patient records.
7. Open `/offline` while connected, disable networking, enroll a synthetic adult, reconnect, and use Offline queue → Sync now. Schedule the appointment after synchronization.

Offline changes are encrypted in IndexedDB; the key is held in tab-session storage. Pending changes expire after 24 hours and are wiped at logout. Closing the tab can lose access to the key. Only public shell/static assets are service-worker cached; no patient API or personalized HTML responses are cached. Existing records remain available in memory while a loaded tab loses connectivity; offline refresh supports registration only.

## Verify

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Database integration tests require the migrated and seeded local database. Browser tests use local synthetic accounts and leave clearly labeled E2E records for inspection; use the guarded demo reset to clear them. See [verification](docs/VERIFICATION.md) for actual run evidence.

## Architecture and production review

- [Architecture](docs/architecture.md), [API](docs/api.md), [privacy](docs/privacy.md), [safety](docs/safety.md)
- [Deployment](docs/deployment.md), [production gap audit](docs/PRODUCTION-READINESS.md), [operational runbooks](docs/operations.md)
- [Implementation checkpoint](docs/IMPLEMENTATION-PLAN.md)

The final production PDF requires external approvals and operational evidence. A deployable synthetic demo is distinct from approval to handle real maternal data. This release fails closed for real-patient onboarding; toggling `DEMO_MODE=false` does not grant production authorization.

Original SVG brand assets are in `public/brand`. No UNICEF endorsement or verified clinical translations are claimed.
