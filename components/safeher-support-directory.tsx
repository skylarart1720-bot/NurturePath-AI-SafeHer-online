'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, ShieldCheck, MapPin, Search, X } from 'lucide-react';
import { api } from '@/lib/safeher-client';
import {
  currentDirectoryCheck,
  filterDirectory,
  entryCategories,
  entryAccessMethods,
  supportStartingPoints,
  type DirectoryEntry,
} from '@/lib/safeher-directory';
import { SupportContactPanel, DirectoryReport, SupportPreparation } from './safeher-support-panel';

export function VerifiedDirectory() {
  const [items, setItems] = useState<DirectoryEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All regions');
  const [category, setCategory] = useState('All services');
  const [access, setAccess] = useState('Any access');
  const [accessibility, setAccessibility] = useState('Any accessibility');
  const [startingPoint, setStartingPoint] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    api('directory')
      .then(setItems)
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, []);
  const checked = items.filter((item) => currentDirectoryCheck(item));
  const filtered = filterDirectory(items, {
    query,
    region,
    category,
    access,
    accessibility,
    startingPoint,
  });
  const categories = ['All services', ...new Set(checked.flatMap(entryCategories))];
  const expired = items.filter((item) => !item.synthetic && !currentDirectoryCheck(item)).length;
  const national = checked.filter((entry) => entry.region === 'Ghana-wide enquiries');
  function clearFilters() {
    setQuery('');
    setRegion('All regions');
    setCategory('All services');
    setAccess('Any access');
    setAccessibility('Any accessibility');
    setStartingPoint('');
    setSelected(null);
  }
  function close(entry: DirectoryEntry) {
    setSelected(null);
    requestAnimationFrame(() => document.getElementById('contact-toggle-' + entry.id)?.focus());
  }
  async function retry() {
    setLoading(true);
    setError('');
    try {
      setItems(await api('directory'));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to connect.');
    } finally {
      setLoading(false);
    }
  }
  const chips = [
    ...(startingPoint
      ? [
          {
            label:
              supportStartingPoints.find((point) => point.id === startingPoint)?.title ??
              startingPoint,
            clear: () => setStartingPoint(''),
          },
        ]
      : []),
    ...(query ? [{ label: 'Search: ' + query, clear: () => setQuery('') }] : []),
    ...(region !== 'All regions' ? [{ label: region, clear: () => setRegion('All regions') }] : []),
    ...(category !== 'All services'
      ? [{ label: category, clear: () => setCategory('All services') }]
      : []),
    ...(access !== 'Any access' ? [{ label: access, clear: () => setAccess('Any access') }] : []),
    ...(accessibility !== 'Any accessibility'
      ? [{ label: accessibility, clear: () => setAccessibility('Any accessibility') }]
      : []),
  ];
  return (
    <>
      <section className="sh-support-start" aria-labelledby="support-start-title">
        <div className="sh-eyebrow">CHOOSE A STARTING POINT</div>
        <h2 id="support-start-title">What kind of support are you looking for?</h2>
        <p>You can explore a topic or use the filters below. No account is needed.</p>
        <div className="sh-support-shortcuts" role="group" aria-label="Support starting points">
          {supportStartingPoints.map((point) => (
            <button
              key={point.id}
              className="secondary"
              aria-pressed={startingPoint === point.id}
              onClick={() => {
                setStartingPoint(startingPoint === point.id ? '' : point.id);
                setCategory('All services');
                setQuery('');
                setSelected(null);
              }}
            >
              <strong>{point.title}</strong>
              <span>{point.description}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <SupportPreparation />
      <div className="sh-directory-summary">
        <ShieldCheck size={26} aria-hidden="true" />
        <div>
          <strong>Public contact details checked. Your choice comes next.</strong>
          <p>
            Source checks confirm what an organisation publishes. Availability, response times,
            eligibility, accessibility and SafeHer partnerships are separate and may be unconfirmed.
          </p>
        </div>
        <span>{loading ? 'Loading listings…' : `${checked.length} source-checked listings`}</span>
      </div>
      <form
        className="sh-filters sh-support-filters"
        onSubmit={(event) => {
          event.preventDefault();
          api('metrics', { event: 'directory_search' }).catch(() => {});
        }}
      >
        <label>
          Search organizations
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
            }}
            placeholder="Organisation, service, or support topic"
            maxLength={120}
          />
        </label>
        <label>
          Region
          <select
            aria-label="Region"
            value={region}
            onChange={(event) => {
              setRegion(event.target.value);
              setSelected(null);
            }}
          >
            {['All regions', ...new Set(checked.map((entry) => entry.region))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Service category
          <select
            aria-label="Service category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setStartingPoint('');
              setSelected(null);
            }}
          >
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Access method
          <select
            aria-label="Access method"
            value={access}
            onChange={(event) => {
              setAccess(event.target.value);
              setSelected(null);
            }}
          >
            {['Any access', 'Online', 'In person', 'Telephone'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Confirmed accessibility
          <select
            aria-label="Confirmed accessibility"
            value={accessibility}
            onChange={(event) => {
              setAccessibility(event.target.value);
              setSelected(null);
            }}
          >
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
          <Search size={17} aria-hidden="true" />
          Search
        </button>
      </form>
      {chips.length > 0 && (
        <div className="sh-support-filter-chips" role="group" aria-label="Selected filters">
          {chips.map((chip) => (
            <button
              className="secondary"
              key={chip.label}
              aria-label={'Remove filter: ' + chip.label}
              onClick={() => {
                chip.clear();
                setSelected(null);
              }}
            >
              {chip.label}
              <X size={14} aria-hidden="true" />
            </button>
          ))}
          <button className="text-button" onClick={clearFilters}>
            Clear all filters
          </button>
        </div>
      )}
      <p className="sh-small">
        Ghana-wide enquiry contacts remain visible alongside regional listings when you select a
        region. Ask the provider to confirm services near you; an enquiry contact is not a local
        branch or a guarantee of emergency assistance.
      </p>
      {loading && <p role="status">Loading support information…</p>}
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button className="secondary" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && (
        <p role="status" aria-atomic="true">
          {filtered.length} matching entries
        </p>
      )}
      {[
        {
          title: 'Ghana-wide enquiry contacts',
          description:
            'Ask these organisations about services and local options. National coverage does not confirm a nearby branch.',
          rows: filtered.filter((entry) => entry.region === 'Ghana-wide enquiries'),
        },
        {
          title: 'Regional listings',
          description:
            'These entries list a specific region. Confirm coverage and how to access services directly.',
          rows: filtered.filter((entry) => entry.region !== 'Ghana-wide enquiries'),
        },
      ]
        .filter((group) => group.rows.length)
        .map((group) => (
          <section className="sh-support-result-group" key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            <p className="sh-small">{group.description}</p>
            <div className="sh-grid">
              {group.rows.map((entry) => (
                <article
                  className={
                    'sh-feature sh-provider-card' +
                    (selected === entry.id ? ' sh-provider-card-open' : '')
                  }
                  key={entry.id}
                >
                  <span className="sh-badge sh-source-badge">PUBLIC CONTACT DETAILS CHECKED</span>
                  <h3>{entry.name}</h3>
                  <p>{entry.description}</p>
                  <div className="sh-provider-location">
                    <MapPin size={15} aria-hidden="true" />
                    {entry.region}
                  </div>
                  <dl className="sh-support-card-facts">
                    <dt>Services</dt>
                    <dd>{entryCategories(entry).join(' · ')}</dd>
                    <dt>Access</dt>
                    <dd>{entryAccessMethods(entry).join(' · ')}</dd>
                  </dl>
                  <p className="sh-small sh-support-check-date">
                    Contact details checked{' '}
                    {new Date(entry.verifiedAt!).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
                  </p>
                  <details className="sh-support-provider-details">
                    <summary>Eligibility, hours, accessibility & sources</summary>
                    <dl>
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
                      <dt>Availability & partnership</dt>
                      <dd>Availability unconfirmed. No SafeHer referral agreement.</dd>
                      {entry.reviewExpiresAt && (
                        <>
                          <dt>Contact review valid until</dt>
                          <dd>
                            {new Date(entry.reviewExpiresAt).toLocaleDateString('en-GB', {
                              timeZone: 'UTC',
                            })}
                          </dd>
                        </>
                      )}
                    </dl>
                    <div className="sh-provider-evidence">
                      <a href={entry.verificationSource!} rel="noreferrer">
                        View the published source <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                      <small>
                        {entry.verificationMethod === 'OFFICIAL_PUBLICATION'
                          ? 'Official publication checked; no test call made.'
                          : 'Recorded contact review; availability unconfirmed.'}
                      </small>
                    </div>
                  </details>
                  <button
                    className="secondary"
                    id={'contact-toggle-' + entry.id}
                    aria-expanded={selected === entry.id}
                    aria-controls={
                      selected === entry.id ? 'support-contact-' + entry.id : undefined
                    }
                    onClick={() => (selected === entry.id ? close(entry) : setSelected(entry.id))}
                  >
                    Review contact options
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                  {selected === entry.id && (
                    <SupportContactPanel
                      key={entry.id}
                      entry={entry}
                      onClose={() => close(entry)}
                    />
                  )}
                  <DirectoryReport entry={entry} />
                </article>
              ))}
            </div>
          </section>
        ))}
      {!loading && !error && !filtered.length && (
        <div className="sh-support-empty">
          <h2>No services match these filters</h2>
          <p>
            Try removing a filter, or explore Ghana-wide enquiry contacts to ask about other local
            options.
          </p>
          <div className="sh-actions">
            <button onClick={clearFilters}>Clear all filters</button>
            {national.length > 0 && (
              <button
                className="secondary"
                onClick={() => {
                  clearFilters();
                  setRegion('Ghana-wide enquiries');
                }}
              >
                Browse Ghana-wide enquiries
              </button>
            )}
          </div>
          {expired > 0 && (
            <p className="sh-small">
              {expired} listings are hidden because their contact review is missing, expired, or
              withdrawn.
            </p>
          )}
        </div>
      )}
      <p className="sh-small">
        Use “Report incorrect information” on a listing to flag a detail for checking. For other
        feedback, <Link href="/contact">visit our feedback page</Link>. Contact details are reviewed
        on a 180-day cycle and may change sooner.
      </p>
    </>
  );
}
