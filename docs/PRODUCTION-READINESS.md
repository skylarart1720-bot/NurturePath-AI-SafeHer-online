# Production PDF gap audit and launch gates

Review date: 10 October 2026. The production PDF was read after the overview and MVP specification to establish the final target. Initial repository contained backend helpers only.

This release is intended for **synthetic demonstration**. It cannot be described as approved for real maternal data. `DEMO_MODE=false` blocks care writes and patient enrolment; no environment flag self-certifies external approval.

| Priority | Requirement                                                 | Status / next evidence                                                                                    |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P0       | Partner/company/controller rights and processing agreements | Externally pending; named signatories and signed documents                                                |
| P0       | Legal review, residency/transfers, consent, DPIA            | Legally pending; qualified local counsel                                                                  |
| P0       | Clinical workflow/copy/referral/translation review          | Clinically pending; qualified reviewer and versioned approval                                             |
| P0       | Role/tenant/assignment scope and consent enforcement        | Implemented; verification report must show tests                                                          |
| P0       | Production identity controls and MFA                        | TOTP, replay protection and version-bound session revocation tested; verified recovery provider pending   |
| P0       | Independent security/access assessment                      | Pending; test findings, remediation, sign-off                                                             |
| P0       | Encrypted backup and restore evidence                       | Local encrypted restore matched eight table counts; approved-host recovery exercise pending               |
| P0       | Operational support, incident owner, SLOs                   | Runbooks/specification; named owner and exercises pending                                                 |
| P0       | Limited pilot protocol and monitoring                       | Partner/legal/clinical approval pending                                                                   |
| P1       | Managed keys and rotation                                   | Versioned encryption keyring and local rotation tooling implemented; KMS adapter/drill pending            |
| P1       | Tamper-evident off-host audit pipeline                      | Local audit metadata implemented; external immutable storage pending                                      |
| P1       | Recovery provider / verified email                          | Local simulator only; vendor configuration and contracts pending                                          |
| P1       | Reminder jobs, retries, quiet hours, STOP, signed webhooks  | Simulator implemented; live provider jobs remain disabled                                                 |
| P1       | Device loss/timeout/storage assessment                      | Actor-bound encrypted pending queue; managed-device assessment pending                                    |
| P1       | CI/reproducible deployment/health check                     | Configuration implemented; hosted pipeline and release evidence pending                                   |
| P1       | WCAG/mobile/load tests                                      | Desktop/mobile workflows tested; local p95 1,036 ms exceeds 800 ms target; independent assessment pending |
| P2       | Country/timezone/facility governance, RTL, partner APIs     | Ghana/English prototype; controlled expansion later                                                       |

## Mandatory written gates

| Gate           | Evidence                                                                     | Approver                     | Current state |
| -------------- | ---------------------------------------------------------------------------- | ---------------------------- | ------------- |
| A · Partner    | Company rights, health partner authorization, controller/processor contracts | Partner/legal lead           | Pending       |
| B · Legal      | Act 843 assessment, transfers, data inventory, DPIA/consent/retention        | Qualified counsel/controller | Pending       |
| C · Clinical   | Workflows, neutral copy, referrals, language, emergency guidance             | Qualified clinician          | Pending       |
| D · Security   | Threat scenarios, access review, assessment, encrypted restore drill         | Security owner               | Pending       |
| E · Operations | On-call, support, SLOs, incident and lost-device exercises                   | Operational owner            | Pending       |
| F · Pilot      | Limited protocol, monitoring, stop criteria, consent                         | Partner + clinical + legal   | Pending       |

Only a subsequent reviewed software release with verified sign-offs can enable real onboarding. Keep production data out of staging. No compliance, availability, recovery-time, clinical safety or impact claim is made from configuration alone.

## Prioritized next release

1. Configure verified recovery, managed keys and immutable audit infrastructure; independently assess the implemented identity controls.
2. Implement governed content review metadata and a durable live reminder job/provider workflow behind verified contracts.
3. Run security, restore, load/accessibility and operational exercises on approved staging infrastructure.
4. Obtain all six gates; launch a limited monitored partner pilot, with explicit stop criteria and rollback.
