import Link from 'next/link';
import { ArrowRight, ShieldCheck, MessageCircle, Heart, BookOpen } from 'lucide-react';
import type { Lesson } from '@/lib/safeher-content';
import { readingMinutes } from '@/lib/safeher-learning';

const paths = [
  {
    id: 'protect-accounts',
    title: 'Protect my accounts',
    description: 'Explore passwords, privacy, and what you share.',
    icon: ShieldCheck,
    topics: [{ title: 'Accounts and privacy', slug: 'digital-privacy', context: '' }],
  },
  {
    id: 'handle-harm',
    title: 'Someone is bothering me',
    description: 'Understand harassment, pressure, and support options.',
    icon: MessageCircle,
    topics: [
      { title: 'Harassment and unwanted contact', slug: 'online-harassment', context: '' },
      {
        title: 'Worried about blackmail?',
        slug: 'trusted-support',
        context:
          'This related lesson helps you prepare to seek support. It does not assess blackmail or provide case-specific advice.',
      },
      {
        title: 'Pressure, control, or grooming concerns',
        slug: 'coercion',
        context:
          'This related lesson explains pressure and control. For a concern about grooming, a qualified protection professional can discuss your situation.',
      },
    ],
  },
  {
    id: 'help-friend',
    title: 'Help a friend',
    description: 'Offer support while respecting privacy and choices.',
    icon: Heart,
    topics: [
      { title: 'Support without sharing their story', slug: 'supporting-a-friend', context: '' },
      { title: 'Photos, messages, and consent', slug: 'consent', context: '' },
    ],
  },
];

export function DigitalSafetyCentre({
  items,
  unavailable = false,
}: {
  items: Lesson[];
  unavailable?: boolean;
}) {
  const bySlug = new Map(items.map((lesson) => [lesson.slug, lesson]));
  return (
    <>
      <aside className="sh-digital-pause" aria-labelledby="digital-pause-title">
        <ShieldCheck size={25} aria-hidden="true" />
        <div>
          <h2 id="digital-pause-title">Take a moment. Choose what feels safe.</h2>
          <p>
            If someone monitors your device, changes to settings may be noticed. Quick Exit opens
            Wikipedia, but does not erase browser history, downloads, screenshots, or network
            records.
          </p>
          <Link href="/safety">
            Understand privacy and safety limits <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <nav className="sh-digital-paths" aria-label="Choose a digital safety starting point">
        {paths.map((path, index) => (
          <a href={'#' + path.id} key={path.id} className="sh-digital-path">
            <path.icon size={25} aria-hidden="true" />
            <span className="sh-eyebrow">START HERE · 0{index + 1}</span>
            <strong>{path.title}</strong>
            <span>{path.description}</span>
            <span className="sh-card-link">
              Explore this topic <ArrowRight size={16} aria-hidden="true" />
            </span>
          </a>
        ))}
      </nav>
      <div className="sh-digital-intro">
        <h2>Information for your next step</h2>
        <p>
          Open a topic to read a short lesson here. You can continue to its reflection question or
          explore support services. No account is needed.
        </p>
      </div>
      {unavailable && (
        <p className="notice" role="alert">
          Learning guidance is temporarily unavailable. You can still explore safety information and
          support services below.
        </p>
      )}
      {paths.map((path, index) => (
        <section
          className="sh-digital-section"
          id={path.id}
          key={path.id}
          aria-labelledby={path.id + '-title'}
        >
          <div className="sh-digital-section-heading">
            <span className="sh-eyebrow">0{index + 1} · YOUR CHOICE</span>
            <h2 id={path.id + '-title'}>{path.title}</h2>
            <p>{path.description}</p>
          </div>
          <div className="sh-digital-topics">
            {path.topics.map((topic) => {
              const lesson = bySlug.get(topic.slug);
              return (
                <details className="sh-digital-topic" key={topic.title}>
                  <summary>
                    {topic.title}
                    <span>
                      {lesson ? `${readingMinutes(lesson)} min read` : 'Currently unavailable'}
                    </span>
                  </summary>
                  <div className="sh-digital-guidance">
                    {topic.context && <p className="notice">{topic.context}</p>}
                    {lesson ? (
                      <>
                        <h3>{lesson.title}</h3>
                        <p className="sh-small">{lesson.summary}</p>
                        {lesson.paragraphs.map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                        <div className="sh-sources">
                          <strong>About this lesson</strong>
                          <p>
                            <a href={lesson.source} rel="noreferrer">
                              {lesson.sourceName}
                            </a>
                          </p>
                          {lesson.review && (
                            <p>
                              Version {lesson.review.version} · Reviewed{' '}
                              {lesson.review.reviewedAt.slice(0, 10)} · Valid until{' '}
                              {lesson.review.expiresAt.slice(0, 10)}
                              <br />
                              {lesson.review.scope === 'DEMO_ONLY'
                                ? 'Demonstration review; professional review required.'
                                : 'Reviewed for pilot use.'}
                            </p>
                          )}
                          <p>
                            Review information applies to this lesson. Source references do not
                            imply endorsement.
                          </p>
                        </div>
                        <Link className="button secondary" href={'/learn/' + lesson.slug}>
                          Read lesson and check understanding{' '}
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </>
                    ) : (
                      <p>
                        This lesson is not currently available for publication.{' '}
                        <Link href="/learn">Explore available learning resources</Link> or use the
                        support links below.
                      </p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
      <section className="sh-digital-support" aria-labelledby="digital-support-title">
        <div>
          <span className="sh-eyebrow">YOU CAN CHOOSE YOUR NEXT STEP</span>
          <h2 id="digital-support-title">You do not have to figure it out alone.</h2>
          <p>
            Find public contact details for organisations in Ghana. Confirm availability and
            confidentiality directly. SafeHer does not contact anyone for you or collect private
            evidence.
          </p>
        </div>
        <div className="sh-actions">
          <Link href="/find-support" className="button">
            Find support <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/ask-safeher" className="button secondary">
            Ask a general question
          </Link>
        </div>
        <p className="sh-small">
          SafeHer cannot send emergency help. If you are in immediate danger, seek local emergency
          assistance if safe.
        </p>
      </section>
      <p className="sh-small sh-digital-footer">
        <BookOpen size={17} aria-hidden="true" />
        To save a lesson for offline reading, open its lesson page and choose “Save for offline
        reading”. Saved copies may be visible to others using the same browser.
      </p>
    </>
  );
}
