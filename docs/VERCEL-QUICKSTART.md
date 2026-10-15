# Host on Vercel and keep developing

## First deployment

1. Push this project to a private Git repository. Include all application files and `prisma/migrations`; exclude `.env`, backups, and credentials. From the Vercel dashboard, import that repository.
2. Choose **Next.js**, root directory **./**, and **Node.js 24.x**. The included `vercel.json` uses `npm ci` and `npm run build`. Leave Output Directory at its framework default.
3. Create hosted PostgreSQL using a Vercel Marketplace database integration or your existing provider. Use the provider's pooled, TLS runtime URL for `DATABASE_URL`. Keep a separate database for previews and development. Docker is only for local development.
4. Add server environment variables from [the environment manifest](SAFEHER-VERCEL.md#environment-manifest). Set `APP_URL` to your exact HTTPS domain, for example `https://your-project.vercel.app`, with no trailing slash. Include `CRON_SECRET`, `MESSAGE_PROVIDER=simulator`, `ALLOW_DEMO_RESET=false`, and `SAFEHER_RESTORE_REPLAY=false`. Keep review and AI flags false for the educational demo. Never prefix secrets with `NEXT_PUBLIC_`.
5. Before deploying, apply migrations to the intended hosted database from a trusted workstation. Prisma reads `.env`; temporarily supply the provider's direct migration connection through `DATABASE_URL` in your shell, then run `npm run db:migrate`. Keep that credential private. Do not put migrations in the Vercel build command.
6. For a dedicated synthetic demo database, also run `npm run db:seed:safeher` and `npm run directory:seed` using that database and your private `SAFEHER_DEMO_PASSWORD`. For real-user production, follow [operations](SAFEHER-OPERATIONS.md) and [the launch register](SAFEHER-LAUNCH-REGISTER.md).
7. Deploy, then check `/api/health` and run `npm run deploy:smoke -- https://your-project.vercel.app`. Protected deployments require authorized access; the smoke command currently expects direct access. Test login, learning, directory search, and account progress in the browser. Confirm the daily maintenance job succeeds in Vercel.

To check configuration locally, place the intended deployment values in a private, ignored `.env.local` and run `npm run deploy:check`. It checks required value formats without printing secrets or contacting the database. Remove that file after checking so local development uses its local database. This check is optional and does not run automatically during builds.

## Continue development

Keep local `.env` connected to the local database. Run `npm ci`, start Docker PostgreSQL, run `npm run db:migrate`, and start `npm run dev` at http://localhost:3200. See [README](../README.md) for first-time seeding.

Make changes on a feature branch, run `npm run lint`, `npm run typecheck`, the relevant tests, and `npm run build`, then push and open a pull request. Vercel creates a preview deployment; merge reviewed work into your production branch to deploy it. Configure that branch in Vercel project settings.

Give Preview its own database and secrets. This application validates write requests against `APP_URL` and, when hosted on Vercel, the exact platform-provided deployment and branch URLs. Production also accepts the platform-provided project production URL. Enable automatic system environment variables in Vercel settings. Set `APP_URL` for any custom domain and redeploy after changing it. Do not share the production database with previews. Database migrations require a deliberate release step before code that depends on them; use additive migrations compatible with the previous release so rollback remains possible.

The full [Vercel guide](SAFEHER-VERCEL.md) covers regions, protection, cron, and operational requirements. Environment changes apply to subsequent deployments: [Vercel environment variables](https://vercel.com/docs/environment-variables). Git deployments use separate Preview and Production environments: [Vercel environments](https://vercel.com/docs/deployments/environments).
