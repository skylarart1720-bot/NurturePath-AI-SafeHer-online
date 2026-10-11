# Deployment and environment matrix

| Environment             | Data                     | Database / keys                           | Messaging                | Access                       |
| ----------------------- | ------------------------ | ----------------------------------------- | ------------------------ | ---------------------------- |
| Local                   | Fictional adults         | Local Docker; generated local key         | Simulator                | Localhost                    |
| Hosted demo / staging   | Fictional adults only    | Separate managed test DB/key; TLS         | Simulator                | Partner evaluation access    |
| Real-patient production | Disabled in this release | Approved regional contract/private DB/KMS | Verified opt-in provider | Gated after reviewed release |

## Deploy a synthetic demo

Set `DEMO_MODE=true`, `MESSAGE_PROVIDER=simulator`, exact HTTPS `APP_URL`, a unique `DEMO_PASSWORD`, database connection with TLS, and a 64-hex contact encryption key. Use separate credentials from local/staging. Never expose `.env` or reuse the documented local password on a public host.

Vercel can build `npm run build`; run `npm run db:migrate` in a controlled release job and `npm run db:seed` only against the synthetic database. Hosting/database vendor suitability for actual health data is not inferred. No Vercel project or domain has been provisioned by this repository.

Container alternative:

```sh
docker build -t nurturepath-demo:reviewed .
docker run --env-file .env.hosted-demo -p 127.0.0.1:3000:3000 nurturepath-demo:reviewed
```

Place an HTTPS reverse proxy in front of the container. App runtime runs as a non-root user. Use a private database network, least-privilege application credentials, and separate migration credentials. Container build is configured, not claimed tested until recorded in verification.

For a local Docker smoke test, `node scripts/prepare-container-demo-env.mjs` creates an ignored, Docker-compatible `.env.container.local` without exposing secrets. Once the image builds, use the existing `nurturepathai_default` database network and map `127.0.0.1:3300:3000`. The current build attempts failed during npm downloads with ECONNRESET; no successful container runtime test is claimed.

## Release and rollback

1. Verify environment identity, backup age, release SHA, dependency scan and tests.
2. Take an encrypted backup; dry-run migrations on a restored staging snapshot of synthetic data.
3. Apply committed migrations with `npm run db:migrate`; never `migrate dev` in hosting.
4. Deploy the immutable build to staging, test `/api/health`, sign-in and referral completion.
5. Obtain release approval and deploy the same tested artifact. Configure TLS, HTTPS redirects and exact app origin; verify secure cookies, security headers and no PHI in logs.
6. Monitor errors, DB connections, availability and sync failures. If behavior fails, route traffic to the previous immutable artifact. Do not automatically undo schema changes; restore from backup only after reviewed recovery decision.

DNS/domain ownership, email SPF/DKIM/DMARC, WAF, monitoring and managed backup/PITR accounts need actual vendor access. No invented domain, quote, contract, or uptime evidence is provided.
