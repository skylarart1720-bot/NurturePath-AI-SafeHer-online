import { SafeherPage } from '@/components/safeher-page';
import { PrivacyControls } from '@/components/safeher-account';
export default function Page() {
  return (
    <SafeherPage
      title="Your information deserves care."
      intro="Clear information about what this MVP processes, saves, and leaves up to you."
    >
      <article className="sh-reading">
        <h2>Educational access</h2>
        <p>
          No account, age, precise location, or identity is required. Ask SafeHer processes your
          question on our server and does not store conversations or send them to an external model.
          Questions remain in the page’s memory until cleared or you leave. We do not claim complete
          anonymity: network operators, browser history, hosting access logs, or shared devices may
          reveal activity.
        </p>
        <h2>Optional accounts and downloads</h2>
        <p>
          Optional accounts store an email, password hash, role, and completed lesson identifiers.
          Session tokens are hashed server-side and cookies are HTTP-only. Downloads are saved in
          your browser only when you choose; they may reveal your interests to someone using the
          same device. Account deletion removes your account, progress, sessions, and reset tokens
          from the active database. A minimal deletion record retains the account identifier,
          deletion scope, and time so an operator can reapply deletion after restoring a backup.
          Encrypted exports of this ledger must be retained separately and protected through the
          backup lifecycle.
        </p>
        <h2>Feedback and aggregate reporting</h2>
        <p>
          Feedback stores only a selected category and rating. Daily counters store an event
          category and English locale, without account, IP, question, module, or service
          identifiers. Cells below ten events are suppressed. Repeat events may come from the same
          person; counts are not unique people. No conversations are sent to analytics or used for
          training.
        </p>
        <h2>Retention</h2>
        <p>
          Expired sessions and rate-limit rows are cleaned daily by the maintenance command.
          Structured feedback is retained up to 90 days, aggregate counters up to 365 days, and
          staff audit metadata up to 365 days. Optional progress remains until removed or the
          account is deleted. Deployments must schedule maintenance and verify it runs. Backups must
          expire within 30 days; deletion requests must be reapplied before restoring. This
          operational process requires review before a pilot.
        </p>
        <h2>Infrastructure and Ghana requirements</h2>
        <p>
          HTTPS, encrypted storage volumes and backups, restricted database access, reviewed proxy
          logging, and an approved hosting region must be configured by the operator. Application
          code alone does not establish legal compliance. A Ghana Data Protection Act 2012 (Act 843)
          review, controller contact, safeguarding lead, and relevant registration must be completed
          before real-user deployment.
        </p>
        <p>
          <a href="https://dataprotection.org.gh/wp-content/uploads/2025/05/Data-Protection-Act-2012-Act-843.pdf">
            Ghana Data Protection Act (official source)
          </a>
        </p>
      </article>
      <PrivacyControls />
    </SafeherPage>
  );
}
