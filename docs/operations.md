# Operations and recovery

## Targets, not proven service levels

Initial targets from the production specification: monthly availability 99.5%; p95 core-read latency under 800ms at documented tested load. Track eligible simulated/live reminder delivery, queue depth/oldest job, offline success and lag, referral transition integrity, DB connections, storage and backup age. Publish measured cohort/load windows; do not claim targets as achieved without monitoring.

Public `/api/health` runs a database probe and returns no PHI. API failures emit a correlation ID and error category only. Audit logs hold entity/action IDs rather than contacts, bodies or notes. Integrate a PHI-redacting collector and assign alert recipients before hosting real workflows.

## Incident runbooks

- Outage: incident owner acknowledges, checks health/DB/provider, pauses changes, communicates via agreed channel, rolls back application artifact if needed, restores only with verified evidence.
- Breach/suspected cross-tenant access: restrict sessions and affected routes, preserve redacted evidence, contact security/controller/counsel; use contract/legal guidance for notification deadlines. Do not copy records into support tickets.
- Lost device: deactivate or revoke worker sessions, reassess assignments, instruct logout/local wipe when reachable, evaluate exposure with privacy owner. Browser tab encryption is not remote device wipe.
- Consent or erroneous message: disable affected template/provider job, verify current consent, assess deliveries with authorized staff, escalate to clinical owner, correct/approve copy and record remediation.
- Sync conflict: refresh server record, confirm consent/assignment and version, reconcile with care team, discard obsolete pending payload, re-enter correct action. Never force overwrite consent.
- Deletion/rights request: verify requester via partner-approved process, legal owner determines deletion versus required preservation, limit access, track request metadata and approved action. No invented retention deadline.

## Backups and restore

Managed production: enable vendor-approved encrypted PITR and separate vault access; define RPO/RTO with the partner and prove restore regularly. Local synthetic exercise: use `scripts/backup-restore.mjs` with an independent disposable database; never restore over the source. Keep encrypted backup files and keys separate, ignored by Git.

Record exercise timestamp, source/target identity, checksums, table counts, failures and observed restoration duration. A command/config file is not restore proof. Do not test with real patient records in staging.

## Contact key rotation plan

Current ciphertext uses version `v1` AES-256-GCM. Before real launch, implement a KMS-backed key ring with explicit key IDs, deploy old/new decrypt support, re-encrypt contacts in bounded audited batches, compare decrypt checks without logging plaintext, verify backup recovery, switch write key, and retire the old key only after retention/restore requirements permit. Never rotate the sole key in place: existing contacts would be lost.

## Release ownership

Assign deployment, security, clinical, privacy, support and backup owners. Maintain protected branch review, staged migration checks, dependency/secret scans and release notes. Production deployment remains an approval-gated operational step; no hosting access or sign-off is inferred.
