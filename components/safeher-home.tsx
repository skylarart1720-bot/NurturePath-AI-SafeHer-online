import Link from 'next/link';
import {
  ArrowRight,
  MessageCircle,
  BookOpen,
  ShieldCheck,
  MapPin,
  LockKeyhole,
  Heart,
  Sparkles,
  Download,
} from 'lucide-react';
import { SafeherShell } from './safeher-shell';
export function SafeherHome() {
  return (
    <SafeherShell>
      <main id="main">
        <section className="sh-hero">
          <div className="sh-hero-copy">
            <div className="sh-pill">
              <span /> YOUR SPACE. YOUR QUESTIONS. YOUR CHOICE.
            </div>
            <h1>
              A little knowledge.
              <br />A lot more <em>power.</em>
            </h1>
            <p>
              A safe starting point for questions about your body, your rights, your relationships,
              and your online world. Take things at your own pace.
            </p>
            <div className="sh-actions">
              <Link className="button" href="/ask-safeher">
                <MessageCircle size={19} /> Ask SafeHer <ArrowRight size={18} />
              </Link>
              <Link className="button secondary" href="/learn">
                Explore your rights <ArrowRight size={18} />
              </Link>
            </div>
            <div className="sh-hero-assurances">
              <span>
                <LockKeyhole size={15} /> No account needed
              </span>
              <span>
                <Heart size={15} /> Judgment-free information
              </span>
            </div>
          </div>
          <div
            className="sh-hero-art"
            aria-label="Illustration of a supportive pathway toward knowledge"
          >
            <div className="sh-art-orbit" />
            <div className="sh-art-tag">
              <ShieldCheck size={18} /> Your choices matter
            </div>
            <svg
              viewBox="0 0 460 390"
              role="img"
              aria-label="Two young women beside a growing plant and a pathway"
            >
              <path d="M80 355C30 220 65 55 227 48c192-9 225 164 137 306" fill="#c9eae2" />
              <path d="M204 358c-61-94 90-116 41-204" fill="none" stroke="#fff" strokeWidth="48" />
              <path
                d="M342 323v-83m0 20c-45-5-46-35-46-35 38-3 46 35 46 35m1 22c45-5 46-35 46-35-38-3-46 35-46 35"
                fill="#087e83"
                stroke="#087e83"
                strokeWidth="4"
              />
              <path d="M318 321h48l-8 35h-32Z" fill="#f4a58a" />
              <ellipse cx="157" cy="178" rx="31" ry="39" fill="#875238" />
              <path d="M126 179c-16-61 73-63 63 7l-17-34-45 21Z" fill="#123047" />
              <path d="M140 209c-40 8-46 67-43 103h106c1-44-11-92-41-103" fill="#f4a58a" />
              <path d="m132 307-9 49m59-49 9 49" stroke="#123047" strokeWidth="20" />
              <path
                d="m111 239-18 48 57 2"
                fill="none"
                stroke="#875238"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="m182 240 22 37 31-29"
                fill="none"
                stroke="#875238"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <ellipse cx="271" cy="181" rx="29" ry="36" fill="#ba7c53" />
              <path
                d="M240 192c-13-40-3-70 30-70 48 0 49 70 29 81l-9-47-36-6-6 43Z"
                fill="#123047"
              />
              <path d="M257 211c-29 0-38 50-38 103h101c0-49-12-99-38-103" fill="#087e83" />
              <path d="m246 306-4 50m50-50 9 50" stroke="#123047" strokeWidth="20" />
              <path
                d="m239 239-17 34-31-14m106-21 19 54-31-1"
                fill="none"
                stroke="#ba7c53"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <path d="M72 356h322" stroke="#123047" strokeWidth="3" strokeLinecap="round" />
              <path
                d="m82 122 4-12 4 12 12 4-12 4-4 12-4-12-12-4Zm286 27 3-9 3 9 9 3-9 3-3 9-3-9-9-3Z"
                fill="#087e83"
              />
            </svg>
            <div className="sh-art-note">
              <span className="sh-note-icon">
                <Sparkles size={21} />
              </span>
              <div>
                <strong>You deserve to feel informed.</strong>
                <small>One question. One small step at a time.</small>
              </div>
            </div>
          </div>
        </section>
        <div className="sh-trust-strip">
          <span>
            Built around <strong>you</strong>
          </span>
          <span>
            <ShieldCheck size={18} /> Source-grounded guidance
          </span>
          <span>
            <LockKeyhole size={18} /> Privacy-minded by design
          </span>
          <span>
            <Download size={18} /> Learning you can save offline
          </span>
        </div>
        <section className="sh-section">
          <div className="sh-section-heading">
            <div className="sh-eyebrow">WHERE WOULD YOU LIKE TO START?</div>
            <h2>Your next step is yours to choose.</h2>
            <p>You do not need to have all the answers. Start with what matters to you.</p>
          </div>
          <div className="sh-grid sh-home-grid">
            {[
              {
                href: '/ask-safeher',
                icon: MessageCircle,
                title: 'Ask a question',
                text: 'A plain-language starting point, grounded in reviewed educational resources.',
                label: 'Meet SafeHer',
                color: 'mint',
              },
              {
                href: '/learn',
                icon: BookOpen,
                title: 'Know your rights',
                text: 'Small lessons about consent, your body, and healthy relationships.',
                label: 'Explore the learning hub',
                color: 'peach',
              },
              {
                href: '/digital-safety',
                icon: ShieldCheck,
                title: 'Feel safer online',
                text: 'Practical guidance for privacy, account protection, and online harassment.',
                label: 'Visit digital safety',
                color: 'lavender',
              },
              {
                href: '/find-support',
                icon: MapPin,
                title: 'Find a next step',
                text: 'Explore how to look for healthcare, counselling, and protection services.',
                label: 'Explore support',
                color: 'blue',
              },
            ].map((item) => (
              <Link href={item.href} className="sh-feature" key={item.href}>
                <span className={'sh-feature-icon ' + item.color}>
                  <item.icon size={24} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="sh-card-link">
                  {item.label}
                  <ArrowRight size={17} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="sh-callout">
          <div className="sh-callout-icon">
            <Heart size={32} />
          </div>
          <div>
            <div className="sh-eyebrow">YOU SET THE PACE</div>
            <h2>Information without pressure.</h2>
            <p>
              Explore freely, skip a topic, or leave whenever you need to. Basic information is
              always available without signing in.
            </p>
          </div>
          <Link href="/safety" className="button secondary">
            How we put safety first <ArrowRight size={17} />
          </Link>
        </section>
        <section className="sh-section sh-bottom">
          <div>
            <div className="sh-eyebrow">A CLEAR STARTING POINT</div>
            <h2>
              Trusted sources. <br />
              Honest limits.
            </h2>
          </div>
          <p>
            Our learning resources reference WHO and UNICEF. Find support connects you with
            published contact information for real Ghanaian organisations, with sources and check
            dates you can inspect. SafeHer provides educational guidance and does not send emergency
            help. Professional review is required before a sensitive-data pilot.
            <Link href="/about">
              Learn about our approach <ArrowRight size={16} />
            </Link>
          </p>
        </section>
      </main>
    </SafeherShell>
  );
}
