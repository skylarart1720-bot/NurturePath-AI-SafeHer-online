'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Phone, Mail, ShieldCheck, MapPin, Search } from 'lucide-react';
import { api } from '@/lib/safeher-client';
import {
  currentDirectoryCheck,
  filterDirectory,
  entryCategories,
  entryAccessMethods,
  type DirectoryEntry,
} from '@/lib/safeher-directory';
export function VerifiedDirectory() {
  const [items, setItems] = useState<DirectoryEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All regions');
  const [category, setCategory] = useState('All services');
  const [access, setAccess] = useState('Any access');
  const [accessibility, setAccessibility] = useState('Any accessibility');
  const [includeExamples, setIncludeExamples] = useState(false);
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    api('directory')
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const checked = items.filter((item) => currentDirectoryCheck(item));
  const filtered = filterDirectory(items, {
    query,
    region,
    category,
    access,
    includeExamples,
    accessibility,
  });
  const categories = ['All services', ...new Set(items.flatMap(entryCategories))];
  const expired = items.filter((item) => !item.synthetic && !currentDirectoryCheck(item)).length;
  function open(entry: DirectoryEntry) {
    setSelected(entry);
    setConsent(false);
    setReady(false);
    requestAnimationFrame(() => document.getElementById('support-next-steps')?.focus());
  }
  async function retry() {
    setLoading(true);
    setError('');
    try {
      setItems(await api('directory'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <div className="sh-directory-summary">
        <ShieldCheck size={26} aria-hidden="true" />
        <div>
          <strong>Real organisations. Traceable contact information.</strong>
          <p>
            Contact details are checked against official published sources. Source checks do not
            confirm current availability, response times, eligibility, or a partnership with
            SafeHer.
          </p>
        </div>
        <span>{checked.length} source-checked listings</span>
      </div>
      <form
        className="sh-filters"
        onSubmit={(e) => {
          e.preventDefault();
          api('metrics', { event: 'directory_search' }).catch(() => {});
        }}
      >
        <label>
          Search organizations
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Organisation, service, or support topic"
          />
        </label>
        <label>
          Region
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {['All regions', ...new Set(items.map((s) => s.region))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Service category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Access method
          <select value={access} onChange={(e) => setAccess(e.target.value)}>
            {['Any access', 'Online', 'In person', 'Telephone'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Confirmed accessibility
          <select value={accessibility} onChange={(e) => setAccessibility(e.target.value)}>
            {[
              'Any accessibility',
              'Step-free access',
              'Sign language support',
              'Accessible toilet',
              'Screen-reader accessible service',
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button>
          <Search size={17} aria-hidden="true" /> Search
        </button>
      </form>
      <p className="sh-small">
        Ghana-wide enquiry contacts remain visible when you select a region. Ask the provider to
        confirm services near you. These contacts are not a guarantee of emergency assistance.
      </p>
      <details className="sh-directory-options">
        <summary>Directory display options</summary>
        <label className="sh-option">
          <input
            type="checkbox"
            checked={includeExamples}
            onChange={(e) => setIncludeExamples(e.target.checked)}
          />{' '}
          Include synthetic examples
        </label>
        <p className="sh-small">
          Examples are preserved for evaluation. They are fictional and cannot receive a call or
          referral.
        </p>
      </details>
      {loading && <p role="status">Loading support information…</p>}
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button className="secondary" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && <p aria-live="polite">{filtered.length} matching entries</p>}
      <div className="sh-grid">
        {filtered.map((entry) => (
          <article className="sh-feature sh-provider-card" key={entry.id}>
            <span className={entry.synthetic ? 'sh-badge' : 'sh-badge sh-source-badge'}>
              {entry.synthetic ? 'SYNTHETIC EXAMPLE' : 'PUBLIC CONTACT DETAILS CHECKED'}
            </span>
            <h2>{entry.name}</h2>
            <p>{entry.description}</p>
            <div className="sh-provider-location">
              <MapPin size={15} aria-hidden="true" />
              {entry.region}
            </div>
            <dl>
              <dt>Services</dt>
              <dd>{entryCategories(entry).join(' · ')}</dd>
              <dt>Access</dt>
              <dd>{entryAccessMethods(entry).join(' · ')}</dd>
              <dt>Eligibility</dt>
              <dd>{entry.eligibility}</dd>
              <dt>Hours</dt>
              <dd>{entry.hours ?? 'Not confirmed — ask the provider'}</dd>
              <dt>Accessibility</dt>
              <dd>
                {entry.accessibilityConfirmedAt && entry.accessibility?.length
                  ? entry.accessibility.join(' · ')
                  : 'Not confirmed — ask the provider'}
              </dd>
              <dt>Checked</dt>
              <dd>
                {entry.synthetic
                  ? 'Not verified'
                  : new Date(entry.verifiedAt!).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
              </dd>
            </dl>
            {!entry.synthetic && (
              <div className="sh-provider-evidence">
                <a href={entry.verificationSource!} target="_blank" rel="noreferrer">
                  View the published source <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <small>
                  {entry.verificationMethod === 'OFFICIAL_PUBLICATION'
                    ? 'Official publication checked; no test call made.'
                    : 'Recorded contact review; availability unconfirmed.'}
                </small>
              </div>
            )}
            <button className="secondary" onClick={() => open(entry)}>
              {entry.synthetic ? 'View manual support steps' : 'Review contact options'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
      {!loading && !error && !filtered.length && (
        <div className="notice">
          <p>
            No matching source-checked services. Try another category or access method. You can ask
            an enquiry service about other local options.
          </p>
          {expired > 0 && (
            <p>
              {expired} real listing(s) are hidden because their contact review is missing or more
              than 180 days old.
            </p>
          )}
        </div>
      )}
      {selected && (
        <section className="sh-referral" aria-labelledby="support-next-steps">
          <h2 id="support-next-steps" tabIndex={-1}>
            {selected.name}: your next steps
          </h2>
          <p>{selected.referralInstructions}</p>
          <p>
            SafeHer does not contact this service or share your information. If you choose to call,
            email, or visit a provider’s page, the provider and your phone or network operator may
            receive information. Ask about confidentiality, safeguarding/reporting duties, costs,
            and what will be recorded before sharing details. Calls or emails may leave records on
            your device.
          </p>
          <label className="sh-option">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (!e.target.checked) setReady(false);
              }}
            />{' '}
            I understand these limitations and choose to view the contact guidance.
          </label>
          <div className="sh-actions">
            <button disabled={!consent} onClick={() => setReady(true)}>
              Continue to guidance
            </button>
            <button className="secondary" onClick={() => setSelected(null)}>
              Cancel
            </button>
          </div>
          {ready && (
            <div className="notice" role="status">
              {selected.synthetic ? (
                'This is a synthetic organization. No contact is available.'
              ) : !currentDirectoryCheck(selected) ? (
                'These contact details need another source check. Confirm the service independently before sharing information.'
              ) : (
                <>
                  <p>
                    Choose a contact method if it is safe. Nothing has been sent by SafeHer.
                    Availability and response times are unconfirmed.
                  </p>
                  <div className="sh-actions">
                    {selected.contactPhone && (
                      <a className="button" href={'tel:' + selected.contactPhone}>
                        <Phone size={16} aria-hidden="true" />
                        Call {selected.contactPhone}
                      </a>
                    )}
                    {selected.contactEmail && (
                      <a className="button secondary" href={'mailto:' + selected.contactEmail}>
                        <Mail size={16} aria-hidden="true" />
                        Email {selected.contactEmail}
                      </a>
                    )}
                    <a
                      className="button secondary"
                      href={selected.contactUrl!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Provider contact page <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </div>
                  <p>
                    Opening one of these links is your choice and can leave traces. SafeHer has no
                    referral agreement with this organisation.
                  </p>
                </>
              )}
            </div>
          )}
        </section>
      )}
      <p className="sh-small">
        Found a detail that needs checking?{' '}
        <Link href="/contact">Give feedback about service information.</Link> Contact details are
        reviewed on a 180-day cycle and may change sooner.
      </p>
    </>
  );
}
