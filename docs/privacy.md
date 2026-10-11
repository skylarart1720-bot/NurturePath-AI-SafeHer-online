# Privacy and threat model

This is a synthetic adult-only evaluation release. It does not assert compliance with any law. Real launch requires counsel, a partner/controller, data processing agreements, a data inventory, country transfer mapping, and an appropriate privacy impact assessment.

| Data                                          | Purpose                          | Access / safeguards                                  | Proposed retention                      |
| --------------------------------------------- | -------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| Minimal adult alias, stage, optional due date | Follow-up coordination           | Assigned worker / clinic; audited reads              | Partner/legal approval pending          |
| Phone                                         | Consented neutral reminders      | AES-256-GCM app encryption; no provider transmission | Partner/legal approval pending          |
| Consent receipts                              | Record granted/withdrawn choices | Versioned server-authoritative changes               | Counsel to determine evidence retention |
| Visits, tasks, referrals                      | Document continuity              | Tenant / clinic / assignment queries                 | Partner/legal approval pending          |
| Audit metadata                                | Access accountability            | Scoped admin/auditor; no names or notes              | Counsel/security approval pending       |
| Offline payload                               | Durable pending writes           | AES-GCM, tab-session key, actor binding              | 24 hours; logout wipe                   |
| Session/reset hashes                          | Access/recovery                  | HttpOnly cookies, bcrypt, hashed random tokens       | Session 8 hours; reset 15 minutes       |

Threats: cross-tenant IDOR, unassigned-worker access, replay-key substitution, stale consent restoration, concurrent version overwrite, CSRF, lost browser device, XSS stealing a tab key, patient data in AI prompts, sensitive lock-screen messages, and exports exposing small cohorts.

Implemented: server-side scope, strict input validation, serializable replay transaction, payload hashes, version checks, consent gate on every message, fixed neutral templates, constrained source-ID assistant, HttpOnly/SameSite cookies, origin protection, account/actor rate limits, generic error logs, CSP and security headers, no shared patient caches, no unrestricted export, aggregate suppression.

Limits requiring production remediation: privileged MFA, managed key service and rotation drill, tamper-evident off-host audit retention, independent security assessment, verified recovery provider, trusted-proxy IP controls, managed-device assessment, deletion and rights procedures. Browser storage encryption mitigates casual inspection but not malware/XSS or an unlocked browser. Registration withdrawal archives data rather than asserting lawful deletion.

Data flows: browser → authenticated server → private PostgreSQL; neutral local simulation only; no third-party AI, analytics, email or messaging flow. Any future third-party flow requires verified contracts, retention controls, regional assessment and re-testing.
