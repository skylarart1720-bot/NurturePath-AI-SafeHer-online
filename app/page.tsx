import Link from 'next/link';
import {
  CalendarDays,
  ClipboardCheck,
  GitBranch,
  ShieldCheck,
  WifiOff,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Brand } from '@/components/brand';
export default function Home() {
  return (
    <>
      <header className="public-header">
        <Brand />
        <nav>
          <a href="#how-it-works">How it works</a>
          <Link href="/privacy">Privacy & safety</Link>
          <Link className="button" href="/login">
            Open demo <ArrowRight size={16} />
          </Link>
        </nav>
      </header>
      <main id="main">
        <section className="hero">
          <div>
            <div className="eyebrow">Connected care. Wherever life happens.</div>
            <h1>
              Every mother deserves care that <em>follows her home.</em>
            </h1>
            <p>
              A clearer path from the next appointment to completed care. NurturePath helps health
              workers follow up, coordinate referrals, and keep the loop closed—even when
              connectivity is limited.
            </p>
            <div className="actions">
              <Link className="button" href="/login">
                Explore the working demo <ArrowRight size={17} />
              </Link>
              <a className="button secondary" href="#how-it-works">
                See how it works
              </a>
            </div>
            <p className="muted" style={{ marginTop: 20, fontSize: 13 }}>
              Built for community health workers. Ghana first.
              <br />
              Synthetic demonstration · no real patient data.
            </p>
          </div>
          <div
            className="hero-illustration"
            aria-label="Illustration of a health worker and a mother connected by a care pathway"
          >
            <svg
              viewBox="0 0 440 310"
              fill="none"
              role="img"
              aria-label="A shared path to follow-up"
            >
              <path
                d="M60 240C75 100 355 100 380 240"
                stroke="#b4dcd3"
                strokeWidth="3"
                strokeDasharray="8 10"
              />
              <circle cx="220" cy="81" r="39" fill="white" />
              <path
                d="M220 102s-26-17-26-31a14 14 0 0 1 26-8 14 14 0 0 1 26 8c0 14-26 31-26 31Z"
                stroke="#087E83"
                strokeWidth="2.5"
              />
              <path
                d="M200 80h12l6-10 6 20 5-10h12"
                stroke="#087E83"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path d="M51 279c1-62 12-106 60-106 48 0 56 47 60 106" fill="#087E83" />
              <circle cx="111" cy="135" r="38" fill="#bb8060" />
              <path
                d="M74 126c-1-44 74-51 77 0-14-17-42-12-56-24-2 11-11 21-21 24Z"
                fill="#123047"
              />
              <path d="M89 185h40l-19 40-21-40Z" fill="#fff" />
              <path d="M104 229h13v26h-13zM97 237h27v11H97z" fill="#e9f7f4" />
              <path d="M267 279c-8-46-7-102 49-102 50 0 67 48 76 102" fill="#f4a58a" />
              <circle cx="320" cy="138" r="38" fill="#7a4e36" />
              <path
                d="M283 148c-25-71 74-92 77-21-9-17-28-21-44-33-4 16-10 26-33 28v26Z"
                fill="#123047"
              />
              <path
                d="M280 245c17-7 53-3 80 7"
                stroke="#7a4e36"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M146 229c33-17 44-3 66-6"
                stroke="#bb8060"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <path d="M164 252h108" stroke="#123047" strokeWidth="2" />
              <circle cx="188" cy="252" r="8" fill="#087E83" />
              <circle cx="220" cy="252" r="8" fill="#087E83" />
              <circle cx="252" cy="252" r="8" fill="#fff" stroke="#087E83" strokeWidth="2" />
            </svg>
            <div className="illustration-note">
              <span className="feature-icon" style={{ margin: 0, width: 36, height: 36 }}>
                <Check size={18} />
              </span>
              <div>
                <strong style={{ color: 'var(--navy)' }}>A referral is more than a form.</strong>
                <br />
                <span className="muted">Track the journey all the way to completion.</span>
              </div>
            </div>
          </div>
        </section>
        <section className="public-section" id="how-it-works">
          <div className="section-intro">
            <div className="eyebrow">Continuity, made practical</div>
            <h2>Small actions. A connected journey.</h2>
            <p>
              Give trusted care teams one place to see what’s due, what happened, and what needs to
              happen next.
            </p>
          </div>
          <div className="three-grid">
            {[
              {
                icon: CalendarDays,
                n: '01',
                title: 'Plan the next touchpoint',
                body: 'Enroll a consenting adult, record communication choices, and schedule a visit with a clear follow-up task.',
              },
              {
                icon: ClipboardCheck,
                n: '02',
                title: 'Make follow-up visible',
                body: 'See due and overdue work. Record contact outcomes and arrange the next action, with offline capture when needed.',
              },
              {
                icon: GitBranch,
                n: '03',
                title: 'Close the referral loop',
                body: 'Track referral acceptance, attendance, and documented closure. Measure progress with explicit denominators.',
              },
            ].map((x) => (
              <article className="feature" key={x.n}>
                <div className="feature-icon">
                  <x.icon size={23} />
                </div>
                <div className="number">STEP {x.n}</div>
                <h3 style={{ marginTop: 10 }}>{x.title}</h3>
                <p className="muted">{x.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="public-section">
          <div className="safety-strip">
            <ShieldCheck size={55} aria-hidden="true" />
            <div>
              <h2>Trust belongs in the foundation.</h2>
              <p>
                Granular consent, clinic-scoped access, encrypted contacts, and human review of
                content. NurturePath coordinates care; it provides no diagnosis or medical advice
                and is not an emergency service.
              </p>
              <Link
                href="/safety"
                style={{ color: '#bfe7dc', display: 'inline-block', marginTop: 16 }}
              >
                Read our safety boundaries →
              </Link>
            </div>
          </div>
        </section>
        <section className="public-section" id="partners">
          <div className="three-grid">
            <div>
              <WifiOff color="#087E83" size={28} />
              <h3 style={{ marginTop: 15 }}>Designed for low connectivity</h3>
              <p className="muted">
                Capture synthetic registrations offline, then review and sync when your connection
                returns.
              </p>
            </div>
            <div>
              <h3>English at launch</h3>
              <p className="muted">
                Language preferences are ready for Twi, Ewe, and Dagbani. Translations require
                qualified review before use.
              </p>
            </div>
            <div>
              <h3>Interested in a supervised pilot?</h3>
              <p className="muted">
                Use the partnership checklist to prepare clinic, legal, and clinical approvals
                before any real-patient use.
              </p>
              <Link href="/partners">View partner requirements →</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <nav>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/accessibility">Accessibility</Link>
        </nav>
        <span className="muted">A synthetic-data prototype. Every next step matters.</span>
      </footer>
    </>
  );
}
