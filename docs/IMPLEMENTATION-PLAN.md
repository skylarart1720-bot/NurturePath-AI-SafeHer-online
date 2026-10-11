# NurturePath implementation checkpoint

Source requirements: all three supplied PDFs, read 10 October 2026.

Initial audit: Prisma schema and six library helpers exist. No application, routes, migrations, seed, tests, lockfile or deployment evidence exists.

Build sequence:

1. Preserve and harden schema/auth/encryption. Install and lock dependencies; migrate and seed two clinics, four roles and twenty fictional mothers.
2. Implement public site and responsive role dashboards; consent, scheduling, follow-up and closed-loop referral workflows.
3. Add authorized APIs, audit, aggregate reporting, approved-content drafting and neutral messaging simulator.
4. Add encrypted offline write queue, idempotent replay, consent/version conflict enforcement and installable safe-shell PWA.
5. Exercise tenant/role isolation, consent, workflow, offline replay, mobile and keyboard behavior. Record actual outputs.
6. Review production PDF gaps; add deployment configuration, operational runbooks and explicit real-patient launch gates. External legal/clinical/hosting approvals remain unverified until supplied.

Safe defaults: synthetic data only; English content only; no live messaging; no clinical claims; no emergency dispatch; no patient portal until core worker flow works. Production governance gates must be explicit and verified before patient onboarding.
