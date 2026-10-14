# NurturePath AI — SafeHer

**Safe information. Safe choices. Safer futures.**

A Ghana-first, youth-focused information platform with twelve learning modules, source-grounded Ask SafeHer, digital safety guidance, a searchable directory of real Ghanaian organisations with public-source contact checks, consent-aware manual support preparation, optional account progress, role-controlled administration, and offline educational downloads.

Built on the existing Next.js 16 / TypeScript / PostgreSQL / Prisma application. All existing maternal-care tables and records are preserved through additive migrations. **An educational preview with real public service contacts: no automated referrals, external AI model, emergency response, or claim of professional content validation. Source checks do not establish provider availability or partnerships.**

## Run

Use Node 24, npm and Docker Desktop. Keep existing environment/data when upgrading. For a fresh checkout, copy .env.example to .env and configure credentials. Set SAFEHER_DEMO_PASSWORD to at least twelve characters.

```powershell
npm ci
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed:safeher
npm run directory:seed
npm run dev
```

Open **http://localhost:3200**. Educational access needs no account. Optional synthetic accounts: learner@safeher.example, reviewer@safeher.example, partner@safeher.example, admin@safeher.example. Password: your configured SAFEHER_DEMO_PASSWORD. Existing passwords are never overwritten by seeding.

## Guides and verification

- [Start here: Vercel hosting and continued development](docs/VERCEL-QUICKSTART.md)

- [13 October implementation and release evidence](docs/SAFEHER-IMPLEMENTATION-2026-10-13.md)

- [SafeHer operations, staff enrollment/recovery, review expiry and restore deletion](docs/SAFEHER-OPERATIONS.md)
- [Vercel staging and production setup](docs/SAFEHER-VERCEL.md)
- [Current architecture and data boundaries](docs/SAFEHER-ARCHITECTURE.md)
- [External launch owners and evidence still needed](docs/SAFEHER-LAUNCH-REGISTER.md)

- [Requirements audit and production checklist against the three SafeHer PDFs](docs/SAFEHER-PRODUCTION-READINESS.md)
- [Full setup, API, deployment, privacy, and limitations](docs/SAFEHER-SETUP.md)
- [Architecture and data-preserving migration](docs/SAFEHER-MIGRATION.md)
- [Five presentation scenarios](docs/SAFEHER-DEMO.md)
- [Test evidence](docs/SAFEHER-VERIFICATION.md)
- [Ghanaian provider sources and verification scope](docs/GHANA-DIRECTORY-SOURCES.md)
- [Prior maternal application documentation](docs/LEGACY-README.md) — historical functionality, not SafeHer instructions

```powershell
npm run lint
npm run typecheck
npm test
npm run build
$env:PLAYWRIGHT_CHANNEL='chrome'
$env:PLAYWRIGHT_PRODUCTION='true'
npm run test:e2e:safeher
```

Integration tests require PostgreSQL and seeded synthetic fixtures. The full legacy suite additionally requires the existing clinical demonstration seed. Run retention maintenance daily in deployed environments. Read the setup guide before deployment or changing review gates.

Quick Exit does not erase browser/network traces. Offline downloads are explicit and visible to other users of the same browser; sensitive chat/API data is excluded from caching. Source-grounded demo lessons require professional review before a real pilot. No service-provider agreement or UN endorsement is claimed.

Original SVG logo: public/brand/safeher.svg. MIT [license](LICENSE).
