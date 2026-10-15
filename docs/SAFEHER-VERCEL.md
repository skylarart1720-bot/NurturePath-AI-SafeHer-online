# Vercel staging and production handoff

Hosting target selected by the user: Vercel, 13 October 2026. No project/account connection or hosted database was available when preparing this configuration. `vercel.json` selects Next.js and the reproducible install/build commands; `.vercelignore` excludes local credentials, backups, tests artifacts, and supplied PDFs.

Vercel supports this Next.js application directly: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs). PostgreSQL is supplied through a database provider/integration rather than the local Docker service: [Vercel storage](https://vercel.com/docs/storage). Select the provider and data region with the legal/security owners. Put functions near the approved database region through project settings: [function regions](https://vercel.com/docs/functions/configuring-functions/region). No region has been pre-approved in this repository.

## Concrete project setup

1. Create/link a Vercel project in the intended team with Node 24 and Next.js detection. Use the repository root. Keep automatic production promotion disabled until release evidence is accepted.
2. Provision an independent staging PostgreSQL database with TLS, appropriate connection pooling for functions, independent migration credentials, backups, and restore access. Never expose the local database or copy maternal records to a demonstration deployment.
3. Enable Deployment Protection for staging/previews before sharing links; confirm the team's available plan settings: [deployment protection](https://vercel.com/docs/deployment-protection).
4. Configure separate Preview and Production environment values. Do not copy `.env` wholesale. Use the exact intended HTTPS hostname for APP_URL for custom domains. On Vercel, the Origin check also accepts the exact server-provided VERCEL_URL and VERCEL_BRANCH_URL; production additionally accepts VERCEL_PROJECT_PRODUCTION_URL. Enable automatic system environment variables in project settings. Unrelated hosts remain rejected; request Host/forwarded headers never expand the allowlist.
5. Set function region, edge firewall/body/rate controls, trusted forwarded-header behavior, spend alerts, project access, protected Git branches and deployment environments. Keep TRUST_PROXY false until tested against the actual edge. Protect privileged interfaces with application MFA as well as platform access controls.
6. Run additive migrations with separately authorized migration credentials from the controlled release workstation/job. Builds must not mutate databases. Seed only the dedicated synthetic staging database. Record migration outcome and release SHA.
7. Deploy a protected preview, check health/HTTPS/cookies/Origin rejection/nonces/API cache exclusions, and run synthetic smoke/browser checks against the stable staging URL. These tests include destructive fixture operations; never run them against production users.
8. Complete the launch register and restore/ledger replay drill before production promotion or real-user enrollment. Configure the domain/TLS and verify renewal, rollback, health alerts, logs, database pool behavior, and queue review ownership.

## Environment manifest

| Setting                                         | Synthetic staging                                         | Real-user production                               |
| ----------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| DATABASE_URL                                    | Dedicated TLS staging database; pooled runtime connection | Separate approved private/TLS database connection  |
| APP_URL                                         | Exact protected HTTPS staging hostname                    | Exact owned HTTPS hostname                         |
| CONTACT_ENCRYPTION_KEY                          | Independent 64-hex staging key                            | Vault-controlled production key with rotation plan |
| AUTH_SECRET                                     | Independent random staging secret                         | Independent random production secret               |
| BACKUP_ENCRYPTION_KEY                           | Separate staging backup/ledger key                        | Separate production backup/ledger key              |
| DEMO_MODE                                       | true                                                      | false, after gates close                           |
| SAFEHER_DEMO_PASSWORD                           | Private synthetic password, at least 12 characters        | Unset; no seeded demo accounts                     |
| SAFEHER_PILOT_REVIEW_ENABLED                    | false                                                     | Only after professional review approval            |
| SAFEHER_TRANSLATION_REVIEW_ENABLED              | false                                                     | Only after language/safeguarding review            |
| SAFEHER_AI_ENABLED / SAFEHER_AI_VENDOR_APPROVED | false / false                                             | Default false; separate reviewed change            |
| SAFEHER_BOOTSTRAP_SECRET                        | Temporarily on trusted bootstrap workstation              | Temporarily on trusted bootstrap workstation       |
| TRUST_PROXY                                     | false until edge behavior proven                          | Enable only after forwarding validation            |

Use separate migration/direct database URLs as supported by the selected provider. Runtime credentials should lack schema-change privileges; migration approval/rollback occurs in a protected job. Bundled fonts/images need no public object storage.

Set a separate vault-held CRON_SECRET of at least 32 characters. The Vercel configuration schedules `/api/maintenance` daily at 03:00 UTC. It requires the platform-provided Bearer CRON_SECRET and rejects access if the secret is absent/short/incorrect. Monitor the actual job results and review-expiry counts after deployment. Vercel cron authorization guidance: [managing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs). This schedule does not replace an encrypted external deletion-ledger export or managed backups.

## Commands after account/database configuration

```powershell
npx vercel login
npx vercel link
# Configure project settings and environment values in the approved team dashboard.
# Use a private local env file for the dedicated staging database before migration/seed.
npm run db:migrate
npm run db:seed:safeher
npm run directory:seed
npx vercel deploy
```

Do not run `vercel --prod` until the protected staging result and launch gates are approved. Do not place secrets in command-line arguments. A completed local build is not a Vercel deployment. Final publish commands depend on the actual account, project, database, hostname, and approver.
