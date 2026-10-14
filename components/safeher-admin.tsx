'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from './safeher-tools';
import { type Lesson } from '@/lib/safeher-content';
type Content = {
  slug: string;
  lesson: Lesson;
  status: string;
  version: number;
  reviewScope: string;
  locale: string;
  reviewedAt: string | null;
  reviewExpiresAt: string | null;
};
type Service = {
  id: string;
  name: string;
  description: string;
  region: string;
  category: string;
  accessMethod: string;
  eligibility: string;
  hours: string | null;
  contactUrl: string | null;
  verificationSource: string | null;
  synthetic: boolean;
  referralInstructions: string;
  verifiedAt: string | null;
  publicationStatus: string;
};
type AdminData = {
  role: string;
  content: Content[];
  services: Service[];
  metrics: { day: string; event: string; count: string | number }[];
  feedback: { category: string; rating: string; _count: string | number }[];
  audit: { action: string; entityId: string; timestamp: string }[];
  health: Record<string, string>;
  translations: {
    id: string;
    sourceSlug: string;
    locale: string;
    version: number;
    status: string;
  }[];
  serviceReviews: { id: string; serviceId: string; action: string; createdAt: string }[];
};
export function SafeherAdmin({ section }: { section?: 'content' | 'partners' | 'metrics' }) {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [service, setService] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<
    { slug: string; version: number; action: string; createdAt: string }[]
  >([]);
  const [translation, setTranslation] = useState('');
  const [accessibilityDraft, setAccessibilityDraft] = useState('');
  const [me, setMe] = useState<{ role: string; progress: { slug: string }[] } | null>(null);
  async function load() {
    const me = await api('me');
    setMe(me);
    if (!me) throw new Error('Sign in to open your optional account or authorized administration.');
    if (me.role === 'REGISTERED_USER') {
      setData(null);
      return;
    }
    setData(await api('admin'));
  }
  useEffect(() => {
    Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
  }, []);
  async function action(path: string, body?: unknown) {
    setBusy(true);
    setError('');
    try {
      await api(path, body);
      setMessage('Change saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div role="alert" className="error">
          {error} <Link href="/login">Sign in</Link>
        </div>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {me && (
        <div className="sh-actions">
          <span className="sh-badge">{me.role.replaceAll('_', ' ')}</span>
          <Link className="button secondary" href="/privacy">
            Data & deletion controls
          </Link>
          <button
            className="secondary"
            onClick={async () => {
              await api('logout', {});
              router.push('/');
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      )}
      {me?.role === 'REGISTERED_USER' && (
        <section className="sh-saved">
          <h2>Your learning progress</h2>
          {me.progress.length ? (
            me.progress.map((p) => (
              <p key={p.slug}>
                <Link href={'/learn/' + p.slug}>{p.slug.replaceAll('-', ' ')} · completed</Link>
              </p>
            ))
          ) : (
            <p>No completed lessons yet. Explore the learning hub to get started.</p>
          )}
          <Link href="/learn">Explore learning →</Link>
        </section>
      )}
      {!data && !me && !error && <p role="status">Loading your workspace…</p>}
      {data && (
        <>
          <nav className="sh-actions" aria-label="Administration">
            {data.role !== 'SUPPORT_PARTNER' && (
              <Link className="button secondary" href="/dashboard/content">
                Content
              </Link>
            )}
            {data.role !== 'CONTENT_REVIEWER' && (
              <Link className="button secondary" href="/dashboard/partners">
                Partners
              </Link>
            )}
            {data.role === 'PLATFORM_ADMIN' && (
              <Link className="button secondary" href="/dashboard/metrics">
                Metrics
              </Link>
            )}
          </nav>
          <section className="sh-grid">
            {Object.entries(data.health).map(([key, value]) => (
              <article className="sh-feature" key={key}>
                <div className="sh-eyebrow">{key}</div>
                <h3>{value}</h3>
              </article>
            ))}
          </section>
          {data.role !== 'SUPPORT_PARTNER' && (!section || section === 'content') && (
            <section className="sh-saved">
              <h2>Educational content & knowledge base</h2>
              <p>
                Editing returns a lesson to draft. Only approved content with a recorded review date
                is publicly retrievable. English is the published language; translations require a
                separate reviewed release.
              </p>
              <div className="sh-table-wrap">
                <table>
                  <caption>Content review queue</caption>
                  <thead>
                    <tr>
                      <th>Lesson</th>
                      <th>Status / language</th>
                      <th>Review</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((c) => (
                      <tr key={c.slug}>
                        <td>{c.lesson.title}</td>
                        <td>
                          {c.status} / {c.locale}
                        </td>
                        <td>
                          {c.reviewScope} · v{c.version}
                          <br />
                          Reviewed: {c.reviewedAt?.slice(0, 10) ?? 'Pending'}
                          <br />
                          Expires: {c.reviewExpiresAt?.slice(0, 10) ?? 'Not published'}
                        </td>
                        <td>
                          <button
                            disabled={busy}
                            className="secondary"
                            onClick={() => setDraft(JSON.stringify(c.lesson, null, 2))}
                          >
                            Edit
                          </button>{' '}
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={async () => {
                              try {
                                setHistory(
                                  await api('admin/history?slug=' + encodeURIComponent(c.slug)),
                                );
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'History unavailable.');
                              }
                            }}
                          >
                            History
                          </button>{' '}
                          <button
                            disabled={busy}
                            onClick={() =>
                              action('admin/review', {
                                slug: c.slug,
                                version: c.version,
                                status: c.status === 'APPROVED' ? 'DRAFT' : 'APPROVED',
                                scope: 'DEMO_ONLY',
                              })
                            }
                          >
                            {c.status === 'APPROVED' ? 'Unpublish' : 'Approve demo'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details>
                <summary>Create or edit a lesson</summary>
                <p>
                  Use the existing structured lesson fields. Source URLs must use WHO, UNICEF, or
                  UNFPA. Quiz answer indices start at zero. Saving requires a new review.
                </p>
                <label htmlFor="lesson-json">Lesson JSON</label>
                <textarea
                  id="lesson-json"
                  rows={14}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  disabled={busy || !draft}
                  onClick={() => {
                    try {
                      const value = JSON.parse(draft);
                      action('admin/content', value);
                    } catch {
                      setError('Enter valid lesson JSON.');
                    }
                  }}
                >
                  Save draft
                </button>
              </details>
              {history.length > 0 && (
                <details open>
                  <summary>Recorded revisions</summary>
                  <p>Restoring creates a new draft and requires review before publication.</p>
                  {history.map((revision) => (
                    <p key={revision.slug + revision.version}>
                      {revision.slug} · v{revision.version} · {revision.action} ·{' '}
                      {revision.createdAt.slice(0, 10)}{' '}
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          action('admin/rollback', {
                            slug: revision.slug,
                            revision: revision.version,
                            version: data.content.find((c) => c.slug === revision.slug)?.version,
                          })
                        }
                      >
                        Restore as draft
                      </button>
                    </p>
                  ))}
                </details>
              )}
              <details>
                <summary>Translation review</summary>
                <p>
                  Provide sourceSlug, sourceVersion, locale, and lesson. Each translation has
                  separate history. Source changes require a new translation review. Publication
                  remains gated on qualified review.
                </p>
                <label htmlFor="translation-json">Translation JSON</label>
                <textarea
                  id="translation-json"
                  rows={10}
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                />
                <button
                  disabled={busy || !translation}
                  onClick={() => {
                    try {
                      action('admin/translation', JSON.parse(translation));
                    } catch {
                      setError('Enter valid translation JSON.');
                    }
                  }}
                >
                  Save translation draft
                </button>
                {data.translations.map((t) => (
                  <p key={t.id}>
                    {t.sourceSlug} · {t.locale} · v{t.version} · {t.status}{' '}
                    <button
                      disabled={busy}
                      onClick={() =>
                        action('admin/translation-review', {
                          id: t.id,
                          version: t.version,
                          status: t.status === 'APPROVED' ? 'DRAFT' : 'APPROVED',
                        })
                      }
                    >
                      {t.status === 'APPROVED' ? 'Unpublish' : 'Approve reviewed translation'}
                    </button>
                  </p>
                ))}
              </details>
            </section>
          )}
          {(!section || section === 'partners') && (
            <section className="sh-saved">
              <h2>Service directory & organization verification</h2>
              <p>
                Support partners can edit only entries explicitly assigned to their account. Any
                edit invalidates verification. No role can verify synthetic organizations.
              </p>
              {data.services.map((s) => (
                <article key={s.id} className="sh-admin-service">
                  <strong>{s.name}</strong>
                  <p>
                    {s.synthetic
                      ? 'Synthetic · cannot be verified'
                      : s.verifiedAt
                        ? 'Verified contact details'
                        : 'Awaiting verification'}
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      const {
                        id,
                        name,
                        description,
                        region,
                        category,
                        accessMethod,
                        eligibility,
                        hours,
                        contactUrl,
                        verificationSource,
                        synthetic,
                        referralInstructions,
                      } = s;
                      setService(
                        JSON.stringify(
                          {
                            id,
                            name,
                            description,
                            region,
                            category,
                            accessMethod,
                            eligibility,
                            hours,
                            contactUrl,
                            verificationSource,
                            synthetic,
                            referralInstructions,
                          },
                          null,
                          2,
                        ),
                      );
                    }}
                  >
                    Edit service
                  </button>{' '}
                  {data.role === 'PLATFORM_ADMIN' && (
                    <>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          action('admin/service-status', {
                            id: s.id,
                            status: s.publicationStatus === 'WITHDRAWN' ? 'PUBLISHED' : 'WITHDRAWN',
                          })
                        }
                      >
                        {s.publicationStatus === 'WITHDRAWN'
                          ? 'Return to review queue'
                          : 'Withdraw listing'}
                      </button>{' '}
                      <button
                        disabled={busy || s.synthetic}
                        onClick={() => action('admin/verify', { id: s.id })}
                      >
                        Verify confirmed details
                      </button>
                    </>
                  )}
                </article>
              ))}
              {!data.services.length && <p>No authorized service entries.</p>}
              <details>
                <summary>Service editor</summary>
                <p>
                  Supply name, description, region, category, accessMethod (Online, In person,
                  Telephone), eligibility, hours, contactUrl, verificationSource, synthetic,
                  referralInstructions, and an id for updates. URLs must use HTTPS. Confirm details
                  independently before verification.
                </p>
                <label htmlFor="service-json">Service JSON</label>
                <textarea
                  id="service-json"
                  rows={14}
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                />
                <button
                  disabled={busy || !service}
                  onClick={() => {
                    try {
                      const body = JSON.parse(service);
                      action(body.id ? 'admin/service-update' : 'admin/service', body);
                    } catch {
                      setError('Enter valid service JSON.');
                    }
                  }}
                >
                  Save service for review
                </button>
              </details>
              {data.role === 'PLATFORM_ADMIN' && (
                <details>
                  <summary>Accessibility evidence and verification history</summary>
                  <p>
                    Provide id, confirmed features, and evidence. Unknown accessibility stays
                    unconfirmed. Do not include personal information in evidence.
                  </p>
                  <label htmlFor="accessibility-json">Accessibility JSON</label>
                  <textarea
                    id="accessibility-json"
                    rows={6}
                    value={accessibilityDraft}
                    onChange={(e) => setAccessibilityDraft(e.target.value)}
                  />
                  <button
                    disabled={busy || !accessibilityDraft}
                    onClick={() => {
                      try {
                        action('admin/accessibility', JSON.parse(accessibilityDraft));
                      } catch {
                        setError('Enter valid accessibility JSON.');
                      }
                    }}
                  >
                    Record confirmed accessibility
                  </button>
                  {data.serviceReviews.map((r) => (
                    <p key={r.id}>
                      {r.createdAt.slice(0, 10)} · {r.serviceId} · {r.action}
                    </p>
                  ))}
                </details>
              )}
            </section>
          )}
          {data.role === 'PLATFORM_ADMIN' && (!section || section === 'metrics') && (
            <>
              <section className="sh-saved">
                <h2>Aggregate impact</h2>
                <p>
                  Counts below ten are suppressed. Events are not unique users and may include
                  synthetic demo activity. No questions, identities, or disclosures appear here.
                </p>
                <div className="sh-table-wrap">
                  <table>
                    <caption>Daily non-identifying event counts · English</caption>
                    <thead>
                      <tr>
                        <th>UTC day</th>
                        <th>Event</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.metrics.map((m, i) => (
                        <tr key={i}>
                          <td>{m.day}</td>
                          <td>{m.event.replaceAll('_', ' ')}</td>
                          <td>{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!data.metrics.length && <p>No events yet.</p>}
              </section>
              <section className="sh-saved">
                <h2>Accessibility & content feedback</h2>
                {data.feedback.map((f, i) => (
                  <p key={i}>
                    {f.category} · {f.rating}: {f._count}
                  </p>
                ))}
                {!data.feedback.length && <p>No structured feedback yet.</p>}
              </section>
              <section className="sh-saved">
                <h2>Access control & configuration</h2>
                <p>
                  Account roles are provisioned by the trusted operator; no user can promote
                  themselves. Existing clinical roles do not grant SafeHer reviewer or partner
                  access. Staff MFA is required outside demo mode. Partner assignment and account
                  provisioning use the audited operator command described in the setup guide.
                </p>
                <p>
                  Referral transmission: disabled. Pilot content publishing: gated by deployment
                  configuration and professional review. Translation publication: English only.
                </p>
              </section>
              <section className="sh-saved">
                <h2>Redacted audit records</h2>
                {data.audit.map((a, i) => (
                  <p key={i}>
                    {new Date(a.timestamp).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC ·{' '}
                    {a.action} · {a.entityId}
                  </p>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
