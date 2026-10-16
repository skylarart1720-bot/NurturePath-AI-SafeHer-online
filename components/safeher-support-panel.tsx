'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Phone, Mail, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/safeher-client';
import {
  currentDirectoryCheck,
  directoryReportReasons,
  type DirectoryEntry,
} from '@/lib/safeher-directory';

export function SupportContactPanel({
  entry,
  onClose,
}: {
  entry: DirectoryEntry;
  onClose: () => void;
}) {
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section
      id={'support-contact-' + entry.id}
      className="sh-support-contact"
      aria-labelledby="support-next-steps"
    >
      <h4 id="support-next-steps" tabIndex={-1} ref={heading}>
        {entry.name}: your next steps
      </h4>
      <p>{entry.referralInstructions}</p>
      <p>
        SafeHer does not contact this service or share your information. Calls, emails, and provider
        websites may leave records on your device or network. Ask about confidentiality,
        safeguarding/reporting duties, costs, and what will be recorded before sharing details.
      </p>
      <a href="#support-preparation">Review the preparation checklist</a>
      <label className="sh-option">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            if (!event.target.checked) setReady(false);
          }}
        />
        I understand these limitations and choose to view the contact guidance.
      </label>
      <div className="sh-actions">
        <button disabled={!consent} onClick={() => setReady(true)}>
          Continue to guidance
        </button>
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
      {ready && (
        <div className="notice" role="status">
          {!currentDirectoryCheck(entry) ? (
            'These contact details need another source check. Confirm the service independently before sharing information.'
          ) : (
            <>
              <p>
                Choose a contact method if it is safe. Nothing has been sent by SafeHer.
                Availability and response times are unconfirmed.
              </p>
              <div className="sh-actions">
                {entry.contactPhone && (
                  <a className="button" href={'tel:' + entry.contactPhone}>
                    <Phone size={16} aria-hidden="true" />
                    Call {entry.contactPhone}
                  </a>
                )}
                {entry.contactEmail && (
                  <a className="button secondary" href={'mailto:' + entry.contactEmail}>
                    <Mail size={16} aria-hidden="true" />
                    Email {entry.contactEmail}
                  </a>
                )}
                <a className="button secondary" href={entry.contactUrl!} rel="noreferrer">
                  Provider contact page <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
              <p>
                Opening a link is your choice and can leave traces. SafeHer has no referral
                agreement with this organisation.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export function DirectoryReport({ entry }: { entry: DirectoryEntry }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason || busy || recorded) return;
    setBusy(true);
    setError('');
    try {
      await api('directory/report', { serviceId: entry.id, reason });
      setRecorded(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'The report could not be recorded. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="sh-support-report">
      <summary>Report incorrect information</summary>
      {recorded ? (
        <p role="status">
          Your listing report was recorded for checking. No provider was contacted. This does not
          confirm that the listing has changed.
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="sh-small">
            Report a detail about {entry.name}. Choose an issue only; do not send personal
            information. This form is not monitored for emergency help.
          </p>
          <label htmlFor={'report-' + entry.id}>What needs checking?</label>
          <select
            id={'report-' + entry.id}
            required
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
          >
            <option value="">Choose an issue</option>
            {directoryReportReasons.map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </select>
          <button className="secondary" disabled={!reason || busy}>
            {busy ? 'Recording report…' : 'Submit listing report'}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </details>
  );
}

export function SupportPreparation() {
  return (
    <details id="support-preparation" className="sh-support-preparation">
      <summary>
        Prepare to reach out <span>Five questions to ask before sharing details</span>
      </summary>
      <div>
        <p>
          Use this optional checklist to prepare. Your choices stay on this page and are not
          submitted or saved.
        </p>
        {[
          'What services are available, and am I eligible?',
          'What does it cost, including calls or appointments?',
          'What are your opening hours and expected response times?',
          'Who can see what I share, and when must you report a safeguarding concern?',
          'What information do you need, and are there accessible ways to contact you?',
        ].map((question) => (
          <label className="sh-option" key={question}>
            <input type="checkbox" />
            {question}
          </label>
        ))}
        <p className="sh-small">
          You decide what to share. SafeHer cannot send emergency help; seek local emergency
          assistance if safe when there is immediate danger.
        </p>
      </div>
    </details>
  );
}
